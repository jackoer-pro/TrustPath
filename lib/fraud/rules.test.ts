import { test } from "node:test";
import assert from "node:assert/strict";
import { assessCardAttempt, type FraudContext } from "./rules.ts";

// Mirrors the reset_demo() card history: 15 approved in-store events, $8.50–$85.00.
const SEED: FraudContext["history"] = [
  ["Corner Grocer", 4250], ["Metro Café", 850], ["CityLink Transit", 1200], ["Metro Café", 1450], ["Corner Grocer", 6420],
  ["CityLink Transit", 1200], ["Metro Café", 920], ["Corner Grocer", 3815], ["CityLink Transit", 1600], ["Metro Café", 1275],
  ["Corner Grocer", 8500], ["CityLink Transit", 980], ["Metro Café", 1100], ["Corner Grocer", 2960], ["CityLink Transit", 2400],
].map(([merchant, amountCents]) => ({ merchant: merchant as string, amountCents: amountCents as number }));

const ctx = (over: Partial<FraudContext> = {}): FraudContext => ({
  card: { status: "active", reportedLost: false },
  history: SEED,
  recentAttempts: 0,
  ...over,
});
const codes = (r: ReturnType<typeof assessCardAttempt>) => r.signals.map((s) => s.code);

test("golden path: Nova $3,580 online → declined, temporarily locked, high", () => {
  const r = assessCardAttempt({ amountCents: 358000, merchant: "Nova Electronics Online", channel: "ecommerce" }, ctx());
  assert.equal(r.decision, "declined");
  assert.equal(r.cardAction, "temporarily_locked");
  assert.equal(r.riskLevel, "high");
  assert.deepEqual(codes(r), ["unusual_amount", "new_merchant", "card_not_present"]);
  assert.match(r.signals[0].reason, /\$3,580\.00 is over 10× this card's average of \$25\.95 \(threshold \$500\.00\)/);
});

test("golden path: Metro Café $14.50 in store → approved, no signals", () => {
  const r = assessCardAttempt({ amountCents: 1450, merchant: "Metro Café", channel: "in_store" }, ctx());
  assert.deepEqual(r, { decision: "approved", riskLevel: "low", cardAction: "none", newMerchant: false, signals: [] });
});

test("merchant matching is case-insensitive and trimmed", () => {
  assert.equal(assessCardAttempt({ amountCents: 1000, merchant: "  metro café ", channel: "ecommerce" }, ctx()).newMerchant, false);
});

test("critical: locked or lost card → declined, no further card action", () => {
  for (const card of [{ status: "temporarily_locked" as const, reportedLost: false }, { status: "locked" as const, reportedLost: false }, { status: "active" as const, reportedLost: true }]) {
    const r = assessCardAttempt({ amountCents: 1450, merchant: "Metro Café", channel: "in_store" }, ctx({ card }));
    assert.equal(r.decision, "declined");
    assert.equal(r.cardAction, "none");
    assert.equal(r.riskLevel, "critical");
  }
});

test("high alone → review (unusual amount at a known merchant, in store)", () => {
  const r = assessCardAttempt({ amountCents: 60000, merchant: "Corner Grocer", channel: "in_store" }, ctx());
  assert.deepEqual([r.decision, r.cardAction, codes(r)], ["review", "none", ["unusual_amount"]]);
});

test("high + medium → declined + temporarily locked", () => {
  const r = assessCardAttempt({ amountCents: 60000, merchant: "New Shop", channel: "in_store" }, ctx());
  assert.deepEqual([r.decision, r.cardAction], ["declined", "temporarily_locked"]);
});

test("medium only → approved with reasons", () => {
  const r = assessCardAttempt({ amountCents: 2000, merchant: "Bookworm Online", channel: "ecommerce" }, ctx());
  assert.equal(r.decision, "approved");
  assert.equal(r.riskLevel, "medium");
  assert.deepEqual(codes(r), ["new_merchant", "card_not_present"]);
});

test("card-not-present only fires at a new merchant", () => {
  assert.deepEqual(codes(assessCardAttempt({ amountCents: 2000, merchant: "Metro Café", channel: "ecommerce" }, ctx())), []);
});

test("rapid repeats counts the current attempt", () => {
  const known = { amountCents: 1000, merchant: "Metro Café", channel: "in_store" as const };
  assert.deepEqual(codes(assessCardAttempt(known, ctx({ recentAttempts: 1 }))), []);
  const r = assessCardAttempt(known, ctx({ recentAttempts: 2 }));
  assert.deepEqual([r.decision, codes(r)], ["review", ["rapid_repeats"]]);
});

test("$500 floor: empty history and cheap history", () => {
  assert.deepEqual(codes(assessCardAttempt({ amountCents: 50000, merchant: "X", channel: "in_store" }, ctx({ history: [] }))), ["new_merchant"]);
  const r = assessCardAttempt({ amountCents: 50001, merchant: "X", channel: "in_store" }, ctx({ history: [] }));
  assert.ok(codes(r).includes("unusual_amount"));
  assert.match(r.signals[0].reason, /no history/);
  // avg $1 → 10× = $10, but the floor keeps the threshold at $500
  assert.deepEqual(codes(assessCardAttempt({ amountCents: 40000, merchant: "Shop", channel: "in_store" }, ctx({ history: [{ merchant: "Shop", amountCents: 100 }] }))), []);
});
