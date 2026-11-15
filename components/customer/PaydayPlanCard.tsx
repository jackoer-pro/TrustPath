import { CalendarCheck2 } from "lucide-react";
import { formatAUD } from "@/lib/money";
import type { PaydayPlanCardData } from "@/lib/ai/tools";

/** The customer's saved payday plan, prepared as separate Trust Receipts (shown below this card). */
export function PaydayPlanCard({ card }: { card: PaydayPlanCardData }) {
  const total = card.items.reduce((s, i) => s + i.amountCents, 0);
  return (
    <article aria-label="Your payday plan" className="animate-rise rounded-xl border border-trust/30 bg-trust-bg p-4 shadow-sm">
      <p className="flex items-center gap-2 font-semibold text-trust">
        <CalendarCheck2 className="h-5 w-5" aria-hidden />
        Your usual payday plan
      </p>
      {card.items.length > 0 ? (
        <ol className="mt-3 space-y-1.5 text-sm">
          {card.items.map((i, n) => (
            <li key={i.label} className="flex justify-between gap-2">
              <span>
                {n + 1}. {i.label} → {i.to}
              </span>
              <span className="tabular-nums">{formatAUD(i.amountCents)}</span>
            </li>
          ))}
          <li className="flex justify-between gap-2 border-t border-trust/20 pt-1.5 font-semibold">
            <span>Total</span>
            <span className="tabular-nums">{formatAUD(total)}</span>
          </li>
        </ol>
      ) : (
        <p className="mt-2 text-sm">Nothing left to prepare this pay cycle.</p>
      )}
      {card.alreadyDone.length > 0 && <p className="mt-2 text-xs text-muted">Skipped: {card.alreadyDone.join(", ")}.</p>}
      <p className="mt-3 text-sm text-ink">
        Approve each receipt below with your PIN. Safe to spend stays <strong className="tabular-nums">{formatAUD(card.safeToSpendCents)}</strong>: these
        were already counted.
      </p>
    </article>
  );
}
