import { CircleCheck, ShieldAlert } from "lucide-react";
import type { EmergencyCardData } from "@/lib/ai/tools";
import { caseNumber } from "@/lib/case-number";

/** Ticked list of emergency measures (ui-context.md → EmergencyCard). */
export function EmergencyCard({ card }: { card: EmergencyCardData }) {
  return (
    <article
      aria-label="Emergency protection is on"
      className="animate-rise rounded-xl border border-risk-critical/30 bg-risk-critical-bg p-4 shadow-sm"
    >
      <p className="flex items-center gap-2 font-semibold text-risk-critical">
        <ShieldAlert className="h-5 w-5 shrink-0" aria-hidden />
        Emergency protection is on
      </p>
      <ul className="mt-3 space-y-2">
        {card.measures.map((m) => (
          <li key={m.label} className="flex items-start gap-2 text-sm text-ink">
            <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-risk-low" aria-hidden />
            {m.label}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm text-muted">
        Case {caseNumber(card.incidentId)}. Only our team can lift these. We&apos;ll contact you.
      </p>
    </article>
  );
}
