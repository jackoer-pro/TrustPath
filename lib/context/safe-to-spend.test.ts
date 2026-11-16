import { test } from "node:test";
import assert from "node:assert/strict";
import { canAfford, safeToSpend, type ItemStatus, type SafeToSpendInput } from "./safe-to-spend.ts";

const seed = (balance: number, rent: ItemStatus, power: ItemStatus, save: ItemStatus, otherPending = 0): SafeToSpendInput => ({
  everydayBalanceCents: balance,
  commitments: [
    { label: "Rent", amountCents: 50000, status: rent },
    { label: "Electricity", amountCents: 12000, status: power },
    { label: "Subscriptions", amountCents: 3500, status: "due" },
  ],
  savings: { label: "Savings goal → Goal Saver", amountCents: 30000, status: save },
  bufferCents: 20000,
  otherPendingCents: otherPending,
  nextPayday: "2026-11-20",
});

test("seeded demo: $1,500 − $500 − $120 − $35 − $300 − $200 = $345", () => {
  const s = safeToSpend(seed(150000, "due", "due", "due"));
  assert.equal(s.amountCents, 34500);
  assert.deepEqual(s.lines.map((l) => l.cents), [150000, -50000, -12000, -3500, -30000, 54500, -20000]);
  assert.equal(s.lines.at(-2)?.subtotal, true);
  assert.equal(s.status, "ok");
  assert.match(s.explanation, /You can safely spend \$345\.00 until payday on 20 November/);
});

test("payday plan waiting for approval: still $345 (no double counting)", () => {
  assert.equal(safeToSpend(seed(150000, "pending", "pending", "pending")).amountCents, 34500);
});

test("payday plan approved: balance $580, items paid → still $345", () => {
  const s = safeToSpend(seed(58000, "paid", "paid", "paid"));
  assert.equal(s.amountCents, 34500);
  assert.equal(s.lines.find((l) => l.label === "Rent")?.note, "paid this pay cycle");
});

test("other pending payments reduce it; a shortfall is reported, never negative", () => {
  assert.equal(safeToSpend(seed(150000, "due", "due", "due", 12900)).amountCents, 21600);
  const short = safeToSpend(seed(80000, "due", "due", "due"));
  assert.deepEqual([short.amountCents, short.status, short.shortfallCents], [0, "short", 15500]);
  assert.match(short.explanation, /^You're \$155\.00 short of what's still to pay before payday on 20 November\. Skipping this payday's \$300\.00 savings would cover it\./);
});

test("affordability: $280 fits ($65 left); $400 doesn't", () => {
  const s = safeToSpend(seed(150000, "due", "due", "due"));
  assert.deepEqual([canAfford(s, 28000).fits, canAfford(s, 28000).remainingCents], [true, 6500]);
  assert.match(canAfford(s, 28000).sentence, /Yes: \$280\.00 fits\. You'd still have \$65\.00/);
  assert.equal(canAfford(s, 40000).fits, false);
  assert.match(canAfford(s, 40000).sentence, /^Your bills would still be covered, but \$400\.00 would take you \$55\.00 under your \$200\.00 buffer until payday\.$/);
});

test("everything paid, $145 left: bills covered, $90 under the buffer → $0, worded as the buffer (not 'short')", () => {
  const s = safeToSpend(seed(14500, "paid", "paid", "paid"));
  assert.deepEqual([s.amountCents, s.status, s.afterBillsCents, s.shortfallCents], [0, "buffer", 11000, 9000]);
  assert.equal(
    s.explanation,
    "Everything still to pay before payday is covered, leaving $110.00. That's $90.00 under the $200.00 buffer you chose, so there's nothing extra to spend until payday on 20 November. The buffer is your own setting: the money is still yours if you need it.",
  );
  assert.doesNotMatch(s.explanation, /short/);
  assert.match(canAfford(s, 2000).sentence, /^Your bills would still be covered, but \$20\.00 would take you \$110\.00 under your \$200\.00 buffer/);
  assert.match(canAfford(s, 20000).sentence, /^Not before payday: \$200\.00 would leave you \$90\.00 short of what's still to pay\./);
});
