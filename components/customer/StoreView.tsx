"use client";

import { useState } from "react";
import { BadgeCheck, Search, ShoppingBag, Star, TriangleAlert, Truck, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatAUD } from "@/lib/money";
import type { PreparedAction } from "@/lib/banking/actions";
import { CATEGORY_LABEL, MERCHANTS, PRODUCTS, type Category } from "@/lib/shop/products";
import { findDeals, recommendable } from "@/lib/shop/deals";
import { PinDialog, type ApproveResult } from "./PinDialog";
import { TrustReceipt, type ReceiptStatus } from "./TrustReceipt";

const CATEGORIES = Object.keys(CATEGORY_LABEL) as Category[];
// Badges come from the same deterministic deal finder the assistant uses.
const BADGES = new Map(
  CATEGORIES.flatMap((c) => findDeals(c === "kettle" ? "kettle" : c, null).picks.map((p) => [p.productId, p.badge] as const)),
);

type Pending = { action: PreparedAction; status: ReceiptStatus; completedAt?: string | null; note?: string };

/** In-app shop: browse, see the best deal per category, and buy through a Trust Receipt + PIN. */
export function StoreView() {
  const [category, setCategory] = useState<Category | "all">("all");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [pinOpen, setPinOpen] = useState(false);

  const q = query.trim().toLowerCase();
  const products = Object.values(PRODUCTS)
    .filter((p) => (category === "all" || p.category === category) && (!q || `${p.name} ${p.merchant} ${p.tags.join(" ")}`.toLowerCase().includes(q)))
    .sort((a, b) => Number(BADGES.get(b.id) === "Best overall") - Number(BADGES.get(a.id) === "Best overall") || a.priceCents - b.priceCents);

  async function buy(productId: string) {
    setBusy(productId);
    setError(null);
    const body = await fetch("/api/shop/buy", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId }),
    })
      .then((r) => r.json())
      .catch(() => null);
    setBusy(null);
    if (!body?.ok) return setError(body?.error?.message ?? "We couldn't prepare that just now. Please try again.");
    const action = body.data as PreparedAction;
    setPending({ action, status: action.status });
  }

  async function cancel() {
    if (!pending) return;
    const body = await fetch(`/api/actions/${pending.action.id}/cancel`, { method: "POST" })
      .then((r) => r.json())
      .catch(() => null);
    setPending((p) => p && (body?.ok ? { ...p, status: "cancelled" } : { ...p, note: body?.error?.message ?? "Couldn't cancel." }));
  }

  return (
    <div className="flex-1 space-y-4 overflow-y-auto bg-sunken p-4">
      <h1 className="font-display text-3xl text-navy">Shop</h1>

      {pending && (
        <section aria-label="Your purchase" className="space-y-2">
          <TrustReceipt
            action={pending.action}
            status={pending.status}
            completedAt={pending.completedAt}
            note={pending.note}
            onApprove={() => setPinOpen(true)}
            onCancel={cancel}
          />
          {pending.status !== "pending_approval" && (
            <button type="button" onClick={() => setPending(null)} className="text-sm text-navy underline">
              Back to shopping
            </button>
          )}
        </section>
      )}

      <label className="flex items-center gap-2 rounded-md border border-line bg-surface px-3">
        <Search className="h-4 w-4 text-muted" aria-hidden />
        <span className="sr-only">Search the shop</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search headphones, earbuds, kettles…"
          className="h-11 flex-1 bg-transparent text-base placeholder:text-muted"
        />
      </label>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Category">
        {(["all", ...CATEGORIES] as const).map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={category === c}
            onClick={() => setCategory(c)}
            className={`min-h-9 rounded-full border px-3 text-sm ${category === c ? "border-navy bg-navy text-white" : "border-line bg-surface text-ink hover:bg-sunken"}`}
          >
            {c === "all" ? "All" : CATEGORY_LABEL[c]}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-risk-critical">{error}</p>}

      {products.length === 0 ? (
        <p className="text-sm text-muted">Nothing matches that search.</p>
      ) : (
        <ul className="space-y-3">
          {products.map((p) => {
            const m = MERCHANTS[p.merchantId];
            const badge = BADGES.get(p.id);
            const risky = !recommendable(p);
            return (
              <li key={p.id}>
                <Card className="p-4">
                  {badge && (
                    <p className={`mb-1 flex items-center gap-1 text-xs font-semibold uppercase ${risky ? "text-risk-high" : "text-trust"}`}>
                      {risky ? <TriangleAlert className="h-3.5 w-3.5" aria-hidden /> : <BadgeCheck className="h-3.5 w-3.5" aria-hidden />}
                      {badge}
                    </p>
                  )}
                  <div className="flex items-baseline justify-between gap-2">
                    <h2 className="font-medium">{p.name}</h2>
                    <p className="shrink-0 font-semibold tabular-nums">{formatAUD(p.priceCents)}</p>
                  </div>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
                    <span>{m.name}</span>
                    <span className="inline-flex items-center gap-0.5">
                      <Star className="h-3 w-3" aria-hidden /> {m.rating.toFixed(1)} ({m.reviews.toLocaleString("en-AU")})
                    </span>
                    <span className={m.verifiedSeller ? "text-risk-low" : "text-risk-high"}>{m.verifiedSeller ? "Verified seller" : "Unverified seller"}</span>
                    <span className="inline-flex items-center gap-0.5">
                      <Undo2 className="h-3 w-3" aria-hidden /> {m.returnsDays ? `${m.returnsDays}-day returns` : "No returns"}
                    </span>
                    <span className="inline-flex items-center gap-0.5">
                      <Truck className="h-3 w-3" aria-hidden /> {m.deliveryDays} days
                    </span>
                  </p>
                  <p className="mt-2 text-sm text-ink">{p.description}</p>
                  <Button
                    size="sm"
                    variant={risky ? "secondary" : "primary"}
                    className="mt-3"
                    disabled={busy !== null || pending?.status === "pending_approval"}
                    onClick={() => buy(p.id)}
                  >
                    <ShoppingBag className="h-4 w-4" aria-hidden />
                    {busy === p.id ? "Preparing…" : `Buy for ${formatAUD(p.priceCents)}`}
                  </Button>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-xs text-muted">
        Merchants, ratings and reviews are simulated demo data. Buying prepares a Trust Receipt; nothing is paid until you approve with your PIN.
      </p>

      <PinDialog
        actionId={pinOpen && pending ? pending.action.id : null}
        payloadHash={pending?.action.payloadHash ?? ""}
        summary={pending ? `${formatAUD(pending.action.amountCents)} at ${pending.action.toName} with debit card •••• ${pending.action.cardLastFour}` : ""}
        onClose={() => setPinOpen(false)}
        onApproved={(r: ApproveResult) => {
          setPending((p) => p && { ...p, status: "completed", completedAt: r.action.completedAt });
          setPinOpen(false);
        }}
        onRefused={(code, message) => {
          setPending((p) => p && (code === "TOO_MANY_ATTEMPTS" ? { ...p, status: "cancelled", note: message } : { ...p, note: message }));
          setPinOpen(false);
        }}
      />
    </div>
  );
}
