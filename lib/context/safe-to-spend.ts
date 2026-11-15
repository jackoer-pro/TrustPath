// Personalised safe-to-spend (Unit 30). Pure and deterministic: the backend owns every number, the LLM only explains.
// Safe-to-spend = Everyday balance − commitments not yet paid this pay cycle − planned savings not yet made
//                 − the customer's minimum buffer − other payments waiting for approval.
// A commitment that is paid (or waiting for approval) this cycle is never counted twice, so approving the payday plan
// doesn't change the answer: the money simply moves from "still to pay" to "paid".
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
export type Line = { label: string; cents: number; note?: string };
export type SafeToSpend = {
  amountCents: number;
  shortfallCents: number;
  lines: Line[];
  nextPayday: string;
  explanation: string;
};

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
  lines.push({ label: "Your minimum buffer", cents: -i.bufferCents, note: "you chose this" });

  const total = lines.reduce((s, l) => s + l.cents, 0);
  const amountCents = Math.max(total, 0);
  const shortfallCents = Math.max(-total, 0);
  const until = new Date(`${i.nextPayday}T00:00:00`).toLocaleDateString("en-AU", { day: "numeric", month: "long" });
  const explanation = shortfallCents
    ? `You're ${formatAUD(shortfallCents)} short of covering everything before payday on ${until}.`
    : `You can safely spend ${formatAUD(amountCents)} until payday on ${until}. That's your Everyday balance minus what's still to pay, your savings goal and your ${formatAUD(i.bufferCents)} buffer.`;
  return { amountCents, shortfallCents, lines, nextPayday: i.nextPayday, explanation };
}

export type Affordability = { amountCents: number; fits: boolean; remainingCents: number; sentence: string };

export function canAfford(s: SafeToSpend, amountCents: number): Affordability {
  const remaining = s.amountCents - amountCents;
  return {
    amountCents,
    fits: remaining >= 0,
    remainingCents: remaining,
    sentence:
      remaining >= 0
        ? `Yes: ${formatAUD(amountCents)} fits. You'd still have ${formatAUD(remaining)} safe to spend until payday.`
        : `Not comfortably: ${formatAUD(amountCents)} is ${formatAUD(-remaining)} more than your ${formatAUD(s.amountCents)} safe to spend. It would eat into your bills, savings or buffer.`,
  };
}
