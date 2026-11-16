"use client";

import { useEffect, useState } from "react";
import { Briefcase, Cake, CreditCard, House, ShieldCheck, ShoppingBasket, Smartphone, type LucideIcon } from "lucide-react";
import { Money } from "@/components/ui/Money";
import { formatAUD } from "@/lib/money";
import type { Insights } from "@/lib/context/context";

// Laptop only (lg+): balances, what TrustPath has learned about Alex, and live activity. Polls like the chat state.
const POLL_MS = 3000;
const ICONS: Record<string, LucideIcon> = { birthday: Cake, pay: Briefcase, bills: House, habit: ShoppingBasket, usual: CreditCard, device: Smartphone };
const when = (at: string) => new Date(at).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
const payday = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });

export function InsightsPanel() {
  const [data, setData] = useState<Insights | null>(null);
  const [fresh, setFresh] = useState(0); // rows newer than this get a "New" badge

  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (document.visibilityState === "hidden") return;
      try {
        const body = await (await fetch("/api/customer/insights", { cache: "no-store" })).json();
        if (alive && body.ok) {
          setData(body.data);
          setFresh(Date.now() - 2 * 60_000);
        }
      } catch {
        /* keep the last good data */
      }
    };
    load();
    const t = setInterval(load, POLL_MS);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  if (!data) return <div aria-hidden className="hidden flex-1 bg-canvas lg:block" />;

  return (
    <div className="hidden min-h-0 flex-1 flex-col gap-5 overflow-y-auto bg-canvas p-6 lg:flex xl:p-8">
      <section aria-label="Your accounts" className="grid grid-cols-3 gap-4">
        {data.accounts
          .toSorted((a, b) => (a.kind === "everyday" ? -1 : b.kind === "everyday" ? 1 : 0))
          .map((a) => (
            <div key={a.id} className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
              <p className="text-sm text-muted">{a.name}</p>
              <Money cents={a.balanceCents} className="font-display text-4xl text-navy" />
            </div>
          ))}
        <div className="rounded-2xl bg-trust p-5 text-white shadow-sm">
          <p className="text-sm text-white/85">Safe to spend until {payday(data.safe.nextPayday)}</p>
          <p className="font-display text-4xl">{formatAUD(data.safe.amountCents)}</p>
          {data.safe.status !== "ok" && <p className="text-xs text-white/85">{data.safe.status === "buffer" ? "Bills covered · under your buffer" : "Short for what's still to pay"}</p>}
        </div>
      </section>

      <div className="grid min-h-0 flex-1 grid-cols-2 gap-6">
        <section aria-labelledby="knows" className="flex flex-col gap-3">
          <div>
            <h2 id="knows" className="font-display text-2xl text-navy">TrustPath knows you</h2>
            <p className="text-sm text-muted">Learned from your own history. Used to protect you, never shared.</p>
          </div>
          <ul className="flex flex-col gap-2">
            {data.knows.map((k) => {
              const Icon = ICONS[k.id] ?? ShieldCheck;
              return (
                <li key={k.id} className={`flex gap-3 rounded-xl border px-4 py-3 ${k.id === "birthday" ? "border-brand/30 bg-surface" : "border-line bg-surface"}`}>
                  <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${k.id === "birthday" ? "bg-risk-critical-bg text-brand" : "bg-trust-bg text-trust"}`}>
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <div>
                    <p className="font-semibold text-ink">{k.title}</p>
                    <p className="text-sm text-muted">{k.detail}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-labelledby="activity" className="flex min-h-0 flex-col gap-3">
          <h2 id="activity" className="font-display text-2xl text-navy">Recent activity</h2>
          <ol className="min-h-0 flex-1 divide-y divide-line overflow-y-auto rounded-xl border border-line bg-surface">
            {data.activity.map((r) => (
              <li key={`${r.at}-${r.label}-${r.amountCents}`} className={`flex items-center justify-between gap-3 px-4 py-3 ${r.status ? "bg-risk-critical-bg" : ""}`}>
                <div className="min-w-0">
                  <p className="flex items-center gap-2 truncate font-medium text-ink">
                    {r.label}
                    {Date.parse(r.at) > fresh && <span className="rounded-full bg-navy px-2 text-[11px] font-semibold text-white">New</span>}
                  </p>
                  <p className={`truncate text-xs ${r.status ? "font-semibold text-risk-critical" : "text-muted"}`}>
                    {when(r.at)} · {r.detail}
                  </p>
                </div>
                <span className={`shrink-0 tabular-nums ${r.status ? "text-risk-critical line-through" : r.amountCents > 0 ? "font-semibold text-risk-low" : "text-ink"}`}>
                  {r.amountCents > 0 ? "+" : "−"}
                  {formatAUD(Math.abs(r.amountCents))}
                </span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
