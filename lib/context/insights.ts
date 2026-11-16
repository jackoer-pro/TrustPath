// Laptop insights panel (Unit 42). Pure and deterministic: every sentence is worked out from Alex's own history,
// so "TrustPath knows you" is backed by real rows, never by the LLM.
import { formatAUD } from "../money.ts";

export type Txn = { amountCents: number; counterparty: string | null; description: string; kind: string; account: string; at: string };
export type CardEvent = { merchant: string; amountCents: number; decision: string; at: string };
export type InsightInput = {
  now: string;
  /** Today in Sydney, YYYY-MM-DD. */
  today: string;
  txns: Txn[];
  cardEvents: CardEvent[];
  /** Saved people with a birthday (YYYY-MM-DD) and how Alex refers to them. */
  birthdays: { name: string; display: string; birthday: string }[];
  commitments: { name: string; amountCents: number; payeeName: string | null }[];
  nextPayday: string;
};
export type Insight = { id: string; title: string; detail: string };
export type Activity = { id: string; at: string; label: string; detail: string; amountCents: number; status?: "declined" | "held" | "blocked" };
/** A payment TrustPath stopped before any money moved (held for review, blocked, or cancelled after a simulated attack). */
export type Stopped = { label: string; amountCents: number; status: "held" | "blocked" | "cancelled"; at: string };

const DAY = 86_400_000;
const money = (c: number) => formatAUD(c).replace(/\.00$/, "");
const dayName = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "short" });

export function learn(i: InsightInput): Insight[] {
  const now = Date.parse(i.now);
  const out: Insight[] = [];

  // Birthdays: today first, otherwise the next one, with what Alex sent last time.
  const today = i.today.slice(5);
  const days = (b: string) => {
    const next = new Date(`${i.today.slice(0, 4)}-${b.slice(5)}T00:00:00Z`).getTime();
    const d = Math.round((next - Date.parse(`${i.today}T00:00:00Z`)) / DAY);
    return d < 0 ? d + 365 : d;
  };
  const b = [...i.birthdays].sort((x, y) => days(x.birthday) - days(y.birthday))[0];
  if (b) {
    const gift = i.txns.find((t) => t.counterparty === b.name && t.amountCents < 0 && now - Date.parse(t.at) > 300 * DAY);
    out.push({
      id: "birthday",
      title: b.birthday.slice(5) === today ? `${b.display}'s birthday is today` : `${b.display}'s birthday is in ${days(b.birthday)} days`,
      detail: gift ? `Last time you sent ${money(-gift.amountCents)} (“${gift.description}”).` : "No gift on record yet.",
    });
  }

  const salary = i.txns.find((t) => t.kind === "salary");
  if (salary) out.push({ id: "pay", title: `Paid ${money(salary.amountCents)} every fortnight`, detail: `From ${salary.counterparty}. Next payday ${dayName(i.nextPayday)}.` });

  const bills = i.commitments.filter((c) => c.payeeName).slice(0, 2);
  if (bills.length)
    out.push({ id: "bills", title: `${bills.map((c) => c.name).join(" and ")} on schedule`, detail: bills.map((c) => `${money(c.amountCents)} to ${c.payeeName}`).join(" · ") + ". Paid once each cycle, never twice." });

  // Card habits over the last 30 days (approved only).
  const recent = i.cardEvents.filter((e) => e.decision === "approved" && now - Date.parse(e.at) <= 30 * DAY);
  const byMerchant = new Map<string, number[]>();
  for (const e of recent) byMerchant.set(e.merchant, [...(byMerchant.get(e.merchant) ?? []), e.amountCents]);
  const [fav, amounts] = [...byMerchant].sort((x, y) => y[1].length - x[1].length)[0] ?? [];
  if (fav && amounts) {
    const avg = Math.round(amounts.reduce((s, a) => s + a, 0) / amounts.length);
    out.push({ id: "habit", title: `${fav} about ${amounts.length} times a month`, detail: `Usually around ${formatAUD(avg)}.` });
  }
  if (recent.length) {
    const max = Math.max(...recent.map((e) => e.amountCents));
    out.push({ id: "usual", title: `Card spending tops out around ${money(max)}`, detail: "Anything far above that, or at a shop you've never used, gets a second look." });
  }

  out.push({ id: "device", title: "You bank from your registered iPhone", detail: "A new device or a new payee asking for a big amount is held until you confirm." });
  return out;
}

/** One newest-first list: transactions, card activity (card rows in `txns` are already in card events) and stopped payments. */
export function activity(txns: Txn[], cardEvents: CardEvent[], stopped: Stopped[] = [], limit = 25): Activity[] {
  const rows: Activity[] = [
    ...stopped.map((s, n) => ({
      id: `s${n}`,
      at: s.at,
      label: s.label,
      detail: s.status === "held" ? "Payment · waiting for your answer" : s.status === "cancelled" ? "Payment · cancelled" : "Payment · not from you",
      amountCents: -s.amountCents,
      status: s.status === "held" ? ("held" as const) : ("blocked" as const),
    })),
    ...txns
      .filter((t) => t.kind !== "card")
      .map((t, n) => ({ id: `t${n}`, at: t.at, label: t.counterparty ?? t.description, detail: `${t.description} · ${t.account}`, amountCents: t.amountCents })),
    ...cardEvents.map((e, n) => ({
      id: `c${n}`,
      at: e.at,
      label: e.merchant,
      detail: e.decision === "approved" ? "Card" : e.decision === "declined" ? "Card · unusual for you" : "Card · checking",
      amountCents: -e.amountCents,
      ...(e.decision === "declined" ? { status: "declined" as const } : e.decision !== "approved" ? { status: "held" as const } : {}),
    })),
  ];
  return rows.sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, limit);
}
