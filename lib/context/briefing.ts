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
  safeToSpendCents: number;
};
export type Briefing = {
  greeting: string;
  lines: string[];
  /** The same words, as one paragraph for speech. */
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
    lines.push(
      `It's ${b.display}'s birthday today.${b.lastGiftCents ? ` Last year you sent ${b.pronoun} ${formatAUD(b.lastGiftCents)}.` : ""} Want to send ${b.pronoun} something?`,
    );
    if (b.lastGiftCents) {
      const amount = formatAUD(b.lastGiftCents).replace(/\.00$/, "");
      suggestion = { label: `Send ${b.display} ${amount}`, message: `Send ${amount} to ${capitalise(b.payeeAlias)}` };
    }
  }
  const day = new Date(`${i.nextPayday}T00:00:00`).toLocaleDateString("en-AU", { weekday: "long" });
  const due = i.dueBeforePayday[0];
  if (due) lines.push(`${due.name} of ${formatAUD(due.amountCents)} is still to pay before payday on ${day}.`);
  lines.push(`You can safely spend ${formatAUD(i.safeToSpendCents)} until ${due ? "then" : `payday on ${day}`}.`);

  return { greeting, lines, speech: [greeting, ...lines].join(" "), suggestion };
}
