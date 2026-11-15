import { CircleCheck, Hand, ShieldAlert, TriangleAlert } from "lucide-react";
import type { CoachingCardData } from "@/lib/ai/tools";

const TITLE = {
  strong_signs: { text: "Strong signs of scam coaching", Icon: ShieldAlert, tone: "border-risk-high/30 bg-risk-high-bg text-risk-high" },
  some_signs: { text: "Some warning signs", Icon: TriangleAlert, tone: "border-risk-medium/30 bg-risk-medium-bg text-risk-medium" },
  no_signs: { text: "No signs of scam coaching found", Icon: CircleCheck, tone: "border-line bg-risk-low-bg text-risk-low" },
} as const;

const NAME: Record<CoachingCardData["signals"][number]["type"], string> = {
  coached_bank_response: "Tells you what to say to the bank",
  concealment: "Tells you to hide something",
  third_party_influence: "Someone else is directing you",
  safe_account_transfer: "\"Safe account\" transfer",
  urgency_or_pressure: "Pressure to act fast",
  credential_request: "Asks for a code or password",
  remote_access_request: "Remote-access software",
  secrecy_instruction: "Told to keep it secret",
};

/** CoachGuard result: evidence quoted from the shared message, a plain explanation and the safe next step. */
export function CoachingCard({ card }: { card: Omit<CoachingCardData, "type"> }) {
  const t = TITLE[card.assessment];
  return (
    <article aria-label={t.text} className={`animate-rise rounded-xl border p-4 shadow-sm ${t.tone}`}>
      <p className="flex items-center gap-2 font-semibold">
        <t.Icon className="h-5 w-5 shrink-0" aria-hidden />
        {t.text}
      </p>
      {card.signals.length > 0 && (
        <ul className="mt-3 space-y-2">
          {card.signals.map((s) => (
            <li key={s.type} className="text-sm text-ink">
              <span className="font-medium">{NAME[s.type]}</span>
              <blockquote className="mt-0.5 border-l-2 border-current/30 pl-2 text-muted italic">“{s.evidence}”</blockquote>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-sm text-ink">{card.explanation}</p>
      {card.heldPayments.map((h) => (
        <p key={`${h.amount}-${h.to}`} className="mt-2 flex items-center gap-2 text-sm font-medium text-ink">
          <Hand className="h-4 w-4 shrink-0" aria-hidden />
          {h.amount} to {h.to} is on hold until our team speaks with you.
        </p>
      ))}
      <div className="mt-3 rounded-md bg-surface/70 p-3 text-sm text-ink">
        <p className="font-semibold">What to do now</p>
        <p className="mt-0.5">{card.nextAction}</p>
      </div>
      <p className="mt-2 text-xs text-muted">
        CoachGuard looks for common scam-coaching patterns{card.source === "rules" ? " (rule-based check; AI unavailable)" : ""}. It can&apos;t prove
        who sent a message.
      </p>
    </article>
  );
}
