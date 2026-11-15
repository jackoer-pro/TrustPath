"use client";

import { useState } from "react";
import { BadgeCheck, ShoppingBag, Star, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatAUD } from "@/lib/money";
import type { DealPick } from "@/lib/shop/deals";

/** Deal picks ranked by the bank's rules (seller reliability first, then price). Buy only prepares a Trust Receipt. */
export function DealsCard({ picks, note, onBuy }: { picks: DealPick[]; note: string | null; onBuy: (productId: string) => Promise<string | null> }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function buy(id: string) {
    setBusy(id);
    setError(await onBuy(id));
    setBusy(null);
  }

  return (
    <article aria-label="Deals" className="animate-rise rounded-xl border border-line bg-surface p-4 shadow-sm">
      <p className="flex items-center gap-2 font-semibold text-navy">
        <ShoppingBag className="h-5 w-5 shrink-0" aria-hidden />
        Best deals
      </p>
      {note && <p className="mt-2 text-sm text-muted">{note}</p>}
      <ul className="mt-3 space-y-3">
        {picks.map((p) => {
          const risky = p.badge === "Not recommended";
          return (
            <li key={p.productId} className={`rounded-lg border p-3 ${risky ? "border-risk-high/30 bg-risk-high-bg" : "border-line"}`}>
              <p className={`flex items-center gap-1 text-xs font-semibold uppercase ${risky ? "text-risk-high" : "text-trust"}`}>
                {risky ? <TriangleAlert className="h-3.5 w-3.5" aria-hidden /> : <BadgeCheck className="h-3.5 w-3.5" aria-hidden />}
                {p.badge}
              </p>
              <div className="mt-1 flex items-baseline justify-between gap-2">
                <p className="font-medium">{p.name}</p>
                <p className="shrink-0 font-semibold tabular-nums">{formatAUD(p.priceCents)}</p>
              </div>
              <p className="flex items-center gap-1 text-xs text-muted">
                {p.merchant} · <Star className="h-3 w-3" aria-hidden /> {p.rating.toFixed(1)} ({p.reviews.toLocaleString("en-AU")})
              </p>
              <p className="mt-1 text-sm text-ink">{p.why}</p>
              {!risky && (
                <Button size="sm" className="mt-2" disabled={busy !== null} onClick={() => buy(p.productId)}>
                  {busy === p.productId ? "Preparing…" : `Buy for ${formatAUD(p.priceCents)}`}
                </Button>
              )}
            </li>
          );
        })}
      </ul>
      {error && <p className="mt-2 text-sm text-risk-critical">{error}</p>}
      <p className="mt-3 text-xs text-muted">Seller ratings are simulated demo data. Buying prepares a Trust Receipt; nothing is paid until you approve with your PIN.</p>
    </article>
  );
}
