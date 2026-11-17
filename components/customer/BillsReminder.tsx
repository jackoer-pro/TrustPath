"use client";

import { useEffect, useState } from "react";
import { CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatAUD } from "@/lib/money";
import type { FinancialContext } from "@/lib/context/context";

type Due = { name: string; to: string | null; amountCents: number };

/** Opening nudge: the assistant brings up what's still to pay before payday, so Alex doesn't have to ask.
 *  "Get them ready" runs the normal payday plan (Trust Receipts + PIN); nothing moves without approval. */
export function BillsReminder({ onSend }: { onSend: (message: string) => void }) {
  const [state, setState] = useState<{ due: Due[]; payday: string } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/me/context", { cache: "no-store" })
      .then((r) => r.json())
      .then((b) => {
        if (!alive || !b.ok) return;
        const ctx = b.data as FinancialContext;
        const due: Due[] = ctx.commitments
          .filter((c) => c.status === "due" && c.inPaydayPlan && c.payeeName)
          .map((c) => ({ name: c.name, to: c.payeeName, amountCents: c.amountCents }));
        if (ctx.savings?.status === "due") due.push({ name: "Savings", to: ctx.savings.accountName, amountCents: ctx.savings.targetCents });
        setState({ due, payday: ctx.preferences.nextPayday });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (!state?.due.length || dismissed) return null;
  const total = state.due.reduce((s, d) => s + d.amountCents, 0);
  const day = new Date(`${state.payday}T00:00:00`).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });

  return (
    <article aria-label="Bills before payday" className="animate-rise rounded-xl border border-line bg-surface p-4 shadow-sm">
      <p className="flex items-center gap-2 font-semibold text-navy">
        <CalendarClock className="h-5 w-5 text-trust" aria-hidden />
        Still to pay before payday ({day})
      </p>
      <ul className="mt-2 divide-y divide-line text-sm">
        {state.due.map((d) => (
          <li key={d.name} className="flex justify-between gap-3 py-1.5">
            <span className="text-ink">
              {d.name}
              {d.to && <span className="text-muted"> → {d.to}</span>}
            </span>
            <span className="tabular-nums text-ink">{formatAUD(d.amountCents)}</span>
          </li>
        ))}
        <li className="flex justify-between gap-3 py-1.5 font-semibold">
          <span>Total</span>
          <span className="tabular-nums">{formatAUD(total)}</span>
        </li>
      </ul>
      <p className="mt-2 text-sm text-ink">I can get them all ready in one go. You just check and approve.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          size="sm"
          onClick={() => {
            setDismissed(true);
            onSend("Do my usual payday plan");
          }}
        >
          Get them ready
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setDismissed(true)}>
          Remind me later
        </Button>
      </div>
    </article>
  );
}
