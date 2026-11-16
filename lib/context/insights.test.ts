import { test } from "node:test";
import assert from "node:assert/strict";
import { activity, learn, type CardEvent, type Txn } from "./insights.ts";

const now = "2026-11-16T09:00:00.000Z";
const ago = (d: number) => new Date(Date.parse(now) - d * 86_400_000).toISOString();
const txns: Txn[] = [
  { amountCents: 150000, counterparty: "Harbour Logistics Pty Ltd", description: "Salary", kind: "salary", account: "Everyday", at: ago(0) },
  { amountCents: -6420, counterparty: "Corner Grocer", description: "Groceries", kind: "card", account: "Everyday", at: ago(5) },
  { amountCents: -5000, counterparty: "Linh Nguyen", description: "Happy birthday Mum", kind: "transfer", account: "Everyday", at: ago(365) },
];
const cards: CardEvent[] = [
  { merchant: "Metro Café", amountCents: 850, decision: "approved", at: ago(2) },
  { merchant: "Metro Café", amountCents: 1450, decision: "approved", at: ago(5) },
  { merchant: "Corner Grocer", amountCents: 6420, decision: "approved", at: ago(5) },
  { merchant: "Nova Electronics Online", amountCents: 358000, decision: "declined", at: ago(0) },
];

test("learned facts come from history: Mum's birthday + last gift, pay, bills, habit, biggest approved card spend", () => {
  const k = learn({ now, today: "2026-11-16", txns, cardEvents: cards, birthdays: [{ name: "Linh Nguyen", display: "Mum", birthday: "1968-11-16" }], commitments: [{ name: "Rent", amountCents: 50000, payeeName: "Sam Patel" }], nextPayday: "2026-11-30" });
  const by = Object.fromEntries(k.map((x) => [x.id, x]));
  assert.equal(by.birthday.title, "Mum's birthday is today");
  assert.match(by.birthday.detail, /Last time you sent \$50/);
  assert.equal(by.pay.title, "Paid $1,500 every fortnight");
  assert.match(by.bills.detail, /\$500 to Sam Patel/);
  assert.equal(by.habit.title, "Metro Café about 2 times a month");
  assert.equal(by.usual.title, "Your biggest card payment this month: $64.20"); // the declined $3,580 doesn't count
});

test("activity: newest first, card rows not doubled, declined attempt flagged", () => {
  const a = activity(txns, cards);
  assert.equal(a.filter((r) => r.label === "Corner Grocer").length, 1);
  assert.equal(a[0].at >= a[1].at, true);
  assert.equal(a.find((r) => r.label === "Nova Electronics Online")?.status, "declined");
});
