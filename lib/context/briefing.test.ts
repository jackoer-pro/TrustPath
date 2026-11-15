import { test } from "node:test";
import assert from "node:assert/strict";
import { buildBriefing, type BriefingInput } from "./briefing.ts";

const seed: BriefingInput = {
  name: "Alex",
  hour: 7,
  birthdaysToday: [{ display: "Mum", payeeAlias: "mum", pronoun: "her", lastGiftCents: 5000 }],
  dueBeforePayday: [
    { name: "Rent", amountCents: 50000 },
    { name: "Electricity", amountCents: 12000 },
  ],
  nextPayday: "2026-11-20",
  safeToSpendCents: 34500,
};

test("seeded morning: Mum's birthday with last year's gift, rent before Friday's payday, $345 safe to spend", () => {
  const b = buildBriefing(seed);
  assert.equal(b.greeting, "Good morning, Alex.");
  assert.deepEqual(b.lines, [
    "It's Mum's birthday today. Last year you sent her $50.00. Want to send her something?",
    "Rent of $500.00 is still to pay before payday on Friday.",
    "You can safely spend $345.00 until then.",
  ]);
  assert.deepEqual(b.suggestion, { label: "Send Mum $50", message: "Send $50 to Mum" });
  assert.match(b.speech, /^Good morning, Alex\. It's Mum's birthday today\./);
});

test("no birthday, nothing due: just safe-to-spend until payday; evening greeting; no suggestion", () => {
  const b = buildBriefing({ ...seed, hour: 19, birthdaysToday: [], dueBeforePayday: [] });
  assert.equal(b.greeting, "Good evening, Alex.");
  assert.deepEqual(b.lines, ["You can safely spend $345.00 until payday on Friday."]);
  assert.equal(b.suggestion, null);
});

test("a birthday with no gift history asks, but doesn't invent an amount", () => {
  const b = buildBriefing({ ...seed, birthdaysToday: [{ display: "Sam", payeeAlias: "sam", pronoun: "them", lastGiftCents: null }] });
  assert.equal(b.lines[0], "It's Sam's birthday today. Want to send them something?");
  assert.equal(b.suggestion, null);
});
