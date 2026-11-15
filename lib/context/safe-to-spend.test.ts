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
  assert.deepEqual(s.lines.map((l) => l.cents), [150000, -50000, -12000, -3500, -30000, -20000]);
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
  assert.deepEqual([short.amountCents, short.shortfallCents], [0, 35500]);
  assert.match(short.explanation, /\$355\.00 short/);
});

test("affordability: $280 fits ($65 left); $400 doesn't", () => {
  const s = safeToSpend(seed(150000, "due", "due", "due"));
  assert.deepEqual([canAfford(s, 28000).fits, canAfford(s, 28000).remainingCents], [true, 6500]);
  assert.match(canAfford(s, 28000).sentence, /Yes: \$280\.00 fits\. You'd still have \$65\.00/);
  assert.equal(canAfford(s, 40000).fits, false);
  assert.match(canAfford(s, 40000).sentence, /\$55\.00 more than your \$345\.00/);
});
