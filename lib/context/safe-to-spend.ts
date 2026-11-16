// Personalised safe-to-spend (Unit 30). Pure and deterministic: the backend owns every number, the LLM only explains.
//
//   left after bills = Everyday balance − commitments not yet paid this pay cycle − planned savings not yet made
//                      − other payments waiting for approval
//   safe to spend    = left after bills − the customer's minimum buffer   (never below $0)
//
// A commitment that is paid (or waiting for approval) this cycle is never counted twice, so approving the payday plan
// doesn't change the answer: the money simply moves from "still to pay" to "paid".
//
// Three situations, worded differently so the customer always knows what's really going on:
//   "ok"     — money to spend;
//   "buffer" — everything still to pay is covered, but Alex is dipping into the cushion they chose (their own setting);
//   "short"  — the balance doesn't cover what's still to pay before payday.
import { formatAUD } from "../money.ts";

export type ItemStatus = "due" | "pending" | "paid";
export type ContextItem = { label: string; amountCents: number; status: ItemStatus };
export type SafeToSpendInput = {
  everydayBalanceCents: number;
  commitments: ContextItem[];
  savings: ContextItem | null;
  bufferCents: number;
  /** Waiting-for-approval payments from Everyday that aren't one of the items above. */
  otherPendingCents: number;
  nextPayday: string; // YYYY-MM-DD
};
export type Line = { label: string; cents: number; note?: string; subtotal?: boolean };
export type SafeToSpendStatus = "ok" | "buffer" | "short";
export type SafeToSpend = {
  amountCents: number;
  status: SafeToSpendStatus;
  /** What's left once everything still to pay before payday is covered (can be negative). */
  afterBillsCents: number;
  bufferCents: number;
  /** "buffer": how far below the buffer; "short": how much more is needed for the bills. 0 when "ok". */
  shortfallCents: number;
  /** Planned savings not yet made this cycle (the first thing Alex could skip if short). */
  savingsDueCents: number;
  lines: Line[];
  nextPayday: string;
  explanation: string;
};

const until = (nextPayday: string) => new Date(`${nextPayday}T00:00:00`).toLocaleDateString("en-AU", { day: "numeric", month: "long" });

export function safeToSpend(i: SafeToSpendInput): SafeToSpend {
  const lines: Line[] = [{ label: "Everyday balance", cents: i.everydayBalanceCents }];
  const items = [...i.commitments, ...(i.savings ? [i.savings] : [])];
  for (const c of items)
    lines.push(
      c.status === "paid"
        ? { label: c.label, cents: 0, note: "paid this pay cycle" }
        : { label: c.label, cents: -c.amountCents, note: c.status === "pending" ? "waiting for your approval" : "still to pay before payday" },
    );
  if (i.otherPendingCents > 0) lines.push({ label: "Other payments waiting for approval", cents: -i.otherPendingCents });

  const afterBills = lines.reduce((s, l) => s + l.cents, 0);
  lines.push({ label: "Left after what's still to pay", cents: afterBills, subtotal: true });
  lines.push({ label: "Your minimum buffer", cents: -i.bufferCents, note: "you chose this" });

  const savingsDue = i.savings && i.savings.status !== "paid" ? i.savings.amountCents : 0;
  const status: SafeToSpendStatus = afterBills < 0 ? "short" : afterBills < i.bufferCents ? "buffer" : "ok";
  const amountCents = status === "ok" ? afterBills - i.bufferCents : 0;
  const shortfallCents = status === "short" ? -afterBills : status === "buffer" ? i.bufferCents - afterBills : 0;
  const day = until(i.nextPayday);

  const explanation = {
    ok: `You can safely spend ${formatAUD(amountCents)} until payday on ${day}. That's your Everyday balance minus what's still to pay, your savings goal and your ${formatAUD(i.bufferCents)} buffer.`,
    buffer: `Everything still to pay before payday is covered, leaving ${formatAUD(afterBills)}. That's ${formatAUD(shortfallCents)} under the ${formatAUD(i.bufferCents)} buffer you chose, so there's nothing extra to spend until payday on ${day}. The buffer is your own setting: the money is still yours if you need it.`,
    short: `You're ${formatAUD(shortfallCents)} short of what's still to pay before payday on ${day}.${savingsDue ? ` Skipping this payday's ${formatAUD(savingsDue)} savings would ${savingsDue >= shortfallCents ? "cover it" : "help"}.` : ""} You could also move money from Goal Saver.`,
  }[status];

  return { amountCents, status, afterBillsCents: afterBills, bufferCents: i.bufferCents, shortfallCents, savingsDueCents: savingsDue, lines, nextPayday: i.nextPayday, explanation };
}

export type Affordability = { amountCents: number; fits: boolean; remainingCents: number; sentence: string };

export function canAfford(s: SafeToSpend, amountCents: number): Affordability {
  const remaining = s.amountCents - amountCents;
  const amount = formatAUD(amountCents);
  let sentence: string;
  if (remaining >= 0) sentence = `Yes: ${amount} fits. You'd still have ${formatAUD(remaining)} safe to spend until payday.`;
  else if (s.afterBillsCents - amountCents >= 0)
    // Bills stay covered; only the buffer (Alex's own cushion) would shrink.
    sentence = `Your bills would still be covered, but ${amount} would take you ${formatAUD(s.bufferCents - (s.afterBillsCents - amountCents))} under your ${formatAUD(s.bufferCents)} buffer until payday.`;
  else sentence = `Not before payday: ${amount} would leave you ${formatAUD(amountCents - s.afterBillsCents)} short of what's still to pay.`;
  return { amountCents, fits: remaining >= 0, remainingCents: remaining, sentence };
}
