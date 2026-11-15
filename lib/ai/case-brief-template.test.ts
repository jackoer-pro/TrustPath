import { test } from "node:test";
import assert from "node:assert/strict";
import { templateBrief, type CaseFacts } from "./case-brief-template.ts";

const nova: NonNullable<CaseFacts["cardEvent"]> = {
  merchant: "Nova Electronics Online",
  amountCents: 358000,
  channel: "ecommerce",
  decision: "declined",
  reasons: ["Unusual amount: $3,580.00 is over 10× this card's average."],
  cardAction: "temporarily_locked",
  cardLastFour: "4821",
};

test("card fraud: event, lock, response and a next step that follows the answer", () => {
  const facts: CaseFacts = {
    incident: { type: "card_fraud", severity: "high", status: "contained", title: "Declined $3,580.00 at Nova Electronics Online", description: "", measures: ["Payment declined", "Card temporarily locked"] },
    cardEvent: nova,
    customerResponse: "denied",
    related: [],
  };
  const b = templateBrief(facts);
  assert.match(b.summary, /declined a \$3,580\.00 online payment at Nova Electronics Online on card •••• 4821/);
  assert.ok(b.timeline.some((t) => /Card temporarily locked/.test(t)));
  assert.ok(b.timeline.includes("Customer said it wasn't them."));
  assert.deepEqual(b.measures, ["Payment declined", "Card temporarily locked"]);
  assert.match(b.nextStep, /issue a replacement card/);
  assert.equal(b.source, "template");
  assert.match(templateBrief({ ...facts, customerResponse: null }).nextStep, /Was this you/);
});

test("account compromise: statement, related Nova incident, five measures", () => {
  const measures = ["All cards locked", "New outgoing transfers paused", "New payees blocked", "No pending approvals to cancel", "Critical case opened with our fraud team"];
  const b = templateBrief({
    incident: { type: "account_compromise", severity: "critical", status: "contained", title: "Possible account compromise", description: 'Customer said: "I gave someone my code"', measures },
    related: [{ type: "card_fraud", title: "Declined $3,580.00 at Nova Electronics Online", severity: "high" }],
  });
  assert.match(b.summary, /I gave someone my code/);
  assert.match(b.timeline[0], /Nova Electronics Online/);
  assert.equal(b.measures.length, 5);
  assert.match(b.nextStep, /lift the restrictions/);
});

test("injection: blocked action with its origin", () => {
  const b = templateBrief({
    incident: { type: "injection_blocked", severity: "high", status: "contained", title: "Injection blocked", description: "x", measures: [] },
    action: { amountCents: 50000, to: "J. Smith", status: "blocked", origin: "simulated_compromised_agent", reasons: ["This instruction didn't come from you."] },
    related: [],
  });
  assert.match(b.summary, /\$500\.00 transfer to J\. Smith was blocked .*simulated compromised agent/);
  assert.match(b.nextStep, /No customer action needed/);
});

test("scam coaching: evidence quoted in the timeline, safe next step", () => {
  const b = templateBrief({
    incident: { type: "scam_coaching", severity: "high", status: "open", title: "Possible scam coaching", description: "d", measures: ["$400.00 to D. Mercer held for review"] },
    coaching: { assessment: "strong_signs", signals: [{ type: "coached_bank_response", evidence: "If the bank asks, say it's for a car." }], explanation: "This message shows strong signs of scam coaching." },
    related: [],
  });
  assert.match(b.summary, /strong signs/);
  assert.ok(b.timeline.includes(`Evidence (coached bank response): "If the bank asks, say it's for a car."`));
  assert.deepEqual(b.measures, ["$400.00 to D. Mercer held for review"]);
  assert.match(b.nextStep, /never a number from the message/);
});
