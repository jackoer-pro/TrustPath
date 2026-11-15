import { test } from "node:test";
import assert from "node:assert/strict";
import { assess, type PolicyContext } from "./policy.ts";

const ok = { amountOk: true, recipientOk: true };
const base: PolicyContext = {
  outgoingPaused: false,
  sourceBalanceCents: 150000,
  recipient: { kind: "biller", verified: true },
  provenance: ok,
};
const transfer = (amountCents: number) => ({ type: "transfer" as const, amountCents });
// The original four fields (rules and sessionSignals were added later for the decision trace).
const core = ({ decision, riskLevel, reasons, flags }: ReturnType<typeof assess>) => ({ decision, riskLevel, reasons, flags });

test("default: step_up, low, no reasons", () => {
  assert.deepEqual(core(assess(transfer(12000), base)), { decision: "step_up", riskLevel: "low", reasons: [], flags: [] });
});

test("golden path Act 1: $300 to savings and $120 electricity are low risk", () => {
  const savings = assess(transfer(30000), { ...base, recipient: { kind: "own_account", verified: true } });
  assert.equal(savings.decision, "step_up");
  assert.equal(savings.riskLevel, "low");
  assert.equal(assess(transfer(12000), base).riskLevel, "low");
});

test("R1 emergency mode blocks, critical, beats everything", () => {
  const r = assess(transfer(5000), { ...base, outgoingPaused: true, recipient: { kind: "person", verified: true } });
  assert.equal(r.decision, "block");
  assert.equal(r.riskLevel, "critical");
  assert.match(r.reasons[0], /paused/);
});

test("R2 provenance blocks, high, flags injection", () => {
  const r = assess(transfer(5000), { ...base, provenance: { amountOk: false, recipientOk: true } });
  assert.equal(r.decision, "block");
  assert.equal(r.riskLevel, "high");
  assert.deepEqual(r.flags, ["injection_suspected"]);
  assert.equal(r.reasons[0], "This instruction didn't come from you.");
});

test("hijack: $500 to J. Smith → block, both R2 and R3 reasons", () => {
  const r = assess(transfer(50000), { ...base, recipient: null, provenance: { amountOk: false, recipientOk: false } });
  assert.equal(r.decision, "block");
  assert.deepEqual(r.flags, ["injection_suspected"]);
  assert.ok(r.reasons.includes("This instruction didn't come from you."));
  assert.ok(r.reasons.includes("New payees can't be added by the assistant."));
});

test("R3 unknown recipient blocks, high", () => {
  const r = assess(transfer(5000), { ...base, recipient: null });
  assert.equal(r.decision, "block");
  assert.equal(r.riskLevel, "high");
  assert.deepEqual(r.reasons, ["New payees can't be added by the assistant."]);
});

test("$10,000 to a new recipient: block (R3), with R5 and R6 listed", () => {
  const r = assess(transfer(1_000_000), { ...base, recipient: null });
  assert.equal(r.decision, "block");
  assert.equal(r.riskLevel, "high");
  assert.ok(r.reasons.includes("New payees can't be added by the assistant."));
  assert.ok(r.reasons.some((x) => /large payment/.test(x)));
  assert.deepEqual(r.flags, []);
});

test("R4 purchase with a locked card blocks", () => {
  for (const cardStatus of ["temporarily_locked", "locked"] as const) {
    const r = assess({ type: "purchase", amountCents: 12900 }, { ...base, recipient: null, cardStatus });
    assert.equal(r.decision, "block");
    assert.match(r.reasons[0], /card is locked/);
  }
  const fine = assess({ type: "purchase", amountCents: 12900 }, { ...base, recipient: null, cardStatus: "active" });
  assert.equal(fine.decision, "step_up");
  assert.equal(fine.riskLevel, "low");
});

test("R5 insufficient funds blocks, medium (own transfer, so no R6)", () => {
  const r = assess(transfer(200000), { ...base, recipient: { kind: "own_account", verified: true } });
  assert.deepEqual(core(r), { decision: "block", riskLevel: "medium", reasons: ["There isn't enough money in that account."], flags: [] });
});

test("R6 large amount holds: over $2,000 or over half the balance", () => {
  const rich = { ...base, sourceBalanceCents: 1_000_000, recipient: { kind: "person" as const, verified: true } };
  assert.equal(assess(transfer(200001), rich).decision, "hold");
  assert.equal(assess(transfer(200000), rich).decision, "step_up");
  const half = assess(transfer(80000), { ...base, recipient: { kind: "person", verified: true } });
  assert.equal(half.decision, "hold");
  assert.equal(half.riskLevel, "high");
});

test("R6 skips own-account transfers", () => {
  const r = assess(transfer(400000), { ...base, sourceBalanceCents: 420000, recipient: { kind: "own_account", verified: true } });
  assert.equal(r.decision, "step_up");
});

test("R7 unverified payee: step_up, medium warning", () => {
  const r = assess(transfer(5000), { ...base, recipient: { kind: "person", verified: false } });
  assert.deepEqual(core(r), { decision: "step_up", riskLevel: "medium", reasons: ["This payee hasn't been verified yet."], flags: [] });
});

test("R8 CoachGuard: strong coaching + payee added yesterday → hold, high, exact reason", () => {
  const coaching = { strong: true, summary: 'a message you shared tells you to hide something from the bank ("Don\'t tell the bank")' };
  const r = assess({ type: "transfer", amountCents: 40000 }, { ...base, recipient: { kind: "person", verified: false, addedDaysAgo: 1 }, coaching });
  assert.equal(r.decision, "hold");
  assert.equal(r.riskLevel, "high");
  assert.ok(r.reasons.includes(`Possible scam coaching: ${coaching.summary}. This payee is new, so our team will check with you before it goes ahead.`));
  assert.ok(r.reasons.includes("This payee hasn't been verified yet."));
});

test("R8: established payee → warning only; own account, purchases and weak signals → nothing", () => {
  const coaching = { strong: true, summary: "x" };
  const mum = assess({ type: "transfer", amountCents: 5000 }, { ...base, recipient: { kind: "person", verified: true, addedDaysAgo: 400 }, coaching });
  assert.equal(mum.decision, "step_up");
  assert.ok(mum.reasons.some((x) => x.startsWith("Possible scam coaching: x. Only approve if you're sure.")));
  const own = assess({ type: "transfer", amountCents: 5000 }, { ...base, recipient: { kind: "own_account", verified: true }, coaching });
  assert.deepEqual(own.reasons, []);
  const buy = assess({ type: "purchase", amountCents: 5000 }, { ...base, recipient: null, cardStatus: "active", coaching });
  assert.ok(!buy.reasons.some((x) => /coaching/.test(x)));
  const weak = assess({ type: "transfer", amountCents: 40000 }, { ...base, recipient: { kind: "person", verified: false, addedDaysAgo: 1 }, coaching: { strong: false, summary: "x" } });
  assert.equal(weak.decision, "step_up");
});

test("R8: unknown recipient stays blocked (R3 wins) but the coaching reason is shown too", () => {
  const r = assess({ type: "transfer", amountCents: 40000 }, { ...base, recipient: null, coaching: { strong: true, summary: "x" } });
  assert.equal(r.decision, "block");
  assert.ok(r.reasons.some((x) => x.startsWith("Possible scam coaching")));
});

test("R9 mandate: over the AI limit or an un-allowed payee → block; customer taps are exempt", () => {
  const over = assess(transfer(120000), { ...base, mandate: { agent: true, maxPrepareCents: 100000, recipientApproved: true } });
  assert.equal(over.decision, "block");
  assert.ok(over.reasons.some((r) => r.startsWith("This is above the $1,000.00 limit you set for your assistant.")));
  assert.equal(over.rules.find((r) => r.id === "R9")?.decision, "block");
  const notAllowed = assess(transfer(5000), { ...base, mandate: { agent: true, maxPrepareCents: 100000, recipientApproved: false } });
  assert.ok(notAllowed.reasons.includes("You haven't allowed your assistant to pay this payee. You can change that in My AI Permissions."));
  const tap = assess(transfer(120000), { ...base, mandate: { agent: false, maxPrepareCents: 100000, recipientApproved: false } });
  assert.ok(!tap.rules.some((r) => r.id === "R9"));
});

test("R9 buffer: dropping below the minimum buffer → extra check (step_up), not a block", () => {
  const r = assess(transfer(140000), { ...base, buffer: { bufferCents: 20000, balanceAfterCents: 10000 } });
  assert.ok(r.reasons.includes("This would leave $100.00 in the account, below your $200.00 minimum buffer."));
  assert.equal(r.rules.find((x) => x.id === "R9")?.decision, "step_up");
});

test("R10 unfamiliar-device attack: $2,500 to a payee added yesterday from a new device → hold with every signal", () => {
  const r = assess(transfer(250000), {
    ...base,
    sourceBalanceCents: 420000,
    recipient: { kind: "person", verified: false, addedDaysAgo: 1 },
    session: { deviceKnown: false, newSession: true, label: "Android phone · Melbourne (simulated)" },
    usualMaxCents: 50000,
  });
  assert.equal(r.decision, "hold");
  const reason = r.rules.find((x) => x.id === "R10")!.reason;
  assert.match(reason, /^Unusual sign-in activity: a device we don't recognise \(Android phone · Melbourne \(simulated\)\), a brand-new sign-in, a payee added 1 day ago and 5× your usual largest payment of \$500\.00\./);
  assert.doesNotMatch(reason, /fraudster|criminal|hacker|not you/i, "never claims who is using the device");
  assert.equal(r.sessionSignals.length, 4);
});

test("R10 proportionate: an unfamiliar device alone → extra check only; a known device → nothing; emergency still wins", () => {
  const dev = { deviceKnown: false, newSession: false, label: "Laptop" };
  const alone = assess(transfer(5000), { ...base, session: dev, usualMaxCents: 50000 });
  assert.equal(alone.decision, "step_up");
  assert.match(alone.reasons.at(-1)!, /^Extra check needed: a device we don't recognise \(Laptop\)\.$/);
  const known = assess(transfer(5000), { ...base, session: { deviceKnown: true, newSession: false, label: "Alex's iPhone" }, usualMaxCents: 50000 });
  assert.deepEqual(known.sessionSignals, []);
  const paused = assess(transfer(250000), { ...base, outgoingPaused: true, session: { ...dev, newSession: true }, recipient: { kind: "person", verified: false, addedDaysAgo: 1 }, usualMaxCents: 50000 });
  assert.equal(paused.decision, "block");
  assert.equal(paused.rules[0].id, "R1");
});
