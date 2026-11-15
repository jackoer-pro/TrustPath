import { CalendarClock, CircleCheck, Wallet } from "lucide-react";
import { formatAUD } from "@/lib/money";
import type { SafeToSpendCardData } from "@/lib/ai/tools";

/** Personalised safe-to-spend with every line of the calculation (computed by the bank, not the AI). */
export function SafeToSpendCard({ card }: { card: SafeToSpendCardData }) {
  const { safe, afford, changed } = card;
  const until = new Date(`${safe.nextPayday}T00:00:00`).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
  return (
    <article aria-label="Safe to spend" className="animate-rise rounded-xl border border-trust/30 bg-surface p-4 shadow-sm">
      {changed && (
        <p className="mb-2 flex items-center gap-1.5 rounded-md bg-trust-bg px-2 py-1 text-sm text-trust">
          <CircleCheck className="h-4 w-4" aria-hidden /> Updated · {changed}
        </p>
      )}
      <p className="flex items-center gap-2 text-sm font-medium text-muted">
        <Wallet className="h-4 w-4 text-trust" aria-hidden />
        Safe to spend until payday
      </p>
      <p className="mt-1 font-display text-4xl text-navy tabular-nums">{formatAUD(safe.amountCents)}</p>
      <p className="flex items-center gap-1 text-xs text-muted">
        <CalendarClock className="h-3.5 w-3.5" aria-hidden /> Next payday {until}
      </p>
      {afford && (
        <p className={`mt-3 rounded-md px-3 py-2 text-sm font-medium ${afford.fits ? "bg-risk-low-bg text-risk-low" : "bg-risk-high-bg text-risk-high"}`}>{afford.sentence}</p>
      )}
      <details className="mt-3 text-sm" open={!afford}>
        <summary className="cursor-pointer font-medium text-navy">How we worked it out</summary>
        <table className="mt-2 w-full">
          <tbody>
            {safe.lines.map((l) => (
              <tr key={l.label} className="border-b border-line last:border-0">
                <td className="py-1 pr-2">
                  {l.label}
                  {l.note && <span className="block text-xs text-muted">{l.note}</span>}
                </td>
                <td className={`py-1 text-right tabular-nums ${l.cents < 0 ? "text-ink" : "font-medium"}`}>
                  {l.cents === 0 ? "✓" : `${l.cents < 0 ? "−" : ""}${formatAUD(Math.abs(l.cents))}`}
                </td>
              </tr>
            ))}
            <tr>
              <td className="pt-2 font-semibold">Safe to spend</td>
              <td className="pt-2 text-right font-semibold tabular-nums">{formatAUD(safe.amountCents)}</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-2 text-xs text-muted">From your own settings in My Financial Context. Change them anytime.</p>
      </details>
    </article>
  );
}
