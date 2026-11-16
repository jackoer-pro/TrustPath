// Morning briefing (Unit 35). Pure and deterministic: every sentence comes from the customer's own context and history.
// It only SUGGESTS; tapping the suggestion sends a normal chat request, which still needs a Trust Receipt and PIN.
import { formatAUD } from "../money.ts";

export type BriefingInput = {
  name: string;
  /** Local hour (Australia/Sydney) for the greeting. */
  hour: number;
  /** Saved people whose birthday is today, with what Alex sent on their last birthday (if anything). */
  birthdaysToday: { display: string; payeeAlias: string; pronoun: "her" | "him" | "them"; lastGiftCents: number | null }[];
  /** Commitments still to pay before payday, largest first. */
  dueBeforePayday: { name: string; amountCents: number }[];
  nextPayday: string; // YYYY-MM-DD
  /** From safeToSpend(): the amount, and which situation applies. */
  safe: { amountCents: number; status: "ok" | "buffer" | "short"; shortfallCents: number; bufferCents: number };
};
export type Briefing = {
  greeting: string;
  lines: string[];
  /** What's read aloud: the greeting and the birthday nudge only. Balances and bills stay on screen, never spoken. */
  speech: string;
  suggestion: { label: string; message: string } | null;
};

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function buildBriefing(i: BriefingInput): Briefing {
  const greeting = `Good ${i.hour < 12 ? "morning" : i.hour < 18 ? "afternoon" : "evening"}, ${i.name}.`;
  const lines: string[] = [];
  let suggestion: Briefing["suggestion"] = null;

  const b = i.birthdaysToday[0];
  if (b) {
    const amount = b.lastGiftCents ? formatAUD(b.lastGiftCents).replace(/\.00$/, "") : null;
    lines.push(
      amount
        ? `It's ${b.display}'s birthday today. Last time you sent ${b.pronoun} ${amount}. Want to send ${b.pronoun} ${amount} again now?`
        : `It's ${b.display}'s birthday today. Want to send ${b.pronoun} something?`,
    );
    if (amount) suggestion = { label: `Send ${b.display} ${amount}`, message: `Send ${amount} to ${capitalise(b.payeeAlias)}` };
  }
  const nudge = lines[0];
  const day = new Date(`${i.nextPayday}T00:00:00`).toLocaleDateString("en-AU", { weekday: "long" });
  const due = i.dueBeforePayday[0];
  if (due) lines.push(`${due.name} of ${formatAUD(due.amountCents)} is still to pay before payday on ${day}.`);
  const when = due ? "then" : `payday on ${day}`;
  const s = i.safe;
  lines.push(
    s.status === "ok"
      ? `You can safely spend ${formatAUD(s.amountCents)} until ${when}.`
      : s.status === "buffer"
        ? `Your bills are covered, but you're ${formatAUD(s.shortfallCents)} under your ${formatAUD(s.bufferCents)} buffer, so go easy until ${when}.`
        : `Heads up: you're ${formatAUD(s.shortfallCents)} short of what's still to pay before payday on ${day}.`,
  );

  return { greeting, lines, speech: nudge ? `${greeting} ${nudge}` : `${greeting} Your day is on screen.`, suggestion };
}
