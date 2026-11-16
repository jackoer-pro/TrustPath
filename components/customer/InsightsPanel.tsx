"use client";

import { useEffect, useState } from "react";
import { Briefcase, Cake, CreditCard, House, ShieldAlert, ShieldCheck, ShoppingBasket, Smartphone, type LucideIcon } from "lucide-react";
import { Money } from "@/components/ui/Money";
import type { Insights } from "@/lib/context/context";

// Laptop only (lg+). One story, top to bottom: who you are → your money → what TrustPath has learned → what it's
// doing right now. Polls like the chat state, so events fired from another device appear by themselves.
const POLL_MS = 3000;
const ICONS: Record<string, LucideIcon> = { birthday: Cake, pay: Briefcase, bills: House, habit: ShoppingBasket, usual: CreditCard, device: Smartphone };
const STOPPED_LABEL = { declined: "Declined", held: "Held", blocked: "Blocked" } as const;
const SYDNEY = "Australia/Sydney";
const PANEL = "rounded-2xl bg-surface shadow-[0_1px_3px_rgb(22_22_25/0.08)]";
const fmt = (c: number) => new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(c / 100);
const day = (at: string) => new Date(at).toLocaleDateString("en-AU", { day: "numeric", month: "short", timeZone: SYDNEY });
const payday = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });

type Clock = { fresh: number; greeting: string; today: string };

function clock(): Clock {
  const now = new Date();
  const hour = Number(new Intl.DateTimeFormat("en-AU", { hour: "numeric", hourCycle: "h23", timeZone: SYDNEY }).format(now));
  return {
    fresh: now.getTime() - 2 * 60_000, // rows newer than this are "new"
    greeting: hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening",
    today: now.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", timeZone: SYDNEY }),
  };
}

export function InsightsPanel() {
  const [data, setData] = useState<Insights | null>(null);
  const [time, setTime] = useState<Clock | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (document.visibilityState === "hidden") return;
      try {
        const body = await (await fetch("/api/customer/insights", { cache: "no-store" })).json();
        if (alive && body.ok) {
          setData(body.data);
          setTime(clock());
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

  if (!data || !time) return <div aria-hidden className="hidden flex-1 bg-canvas lg:block" />;

  const stopped = data.activity.filter((r) => r.status).length;
  const everyday = data.accounts.find((a) => a.kind === "everyday");
  const saver = data.accounts.find((a) => a.kind !== "everyday");

  return (
    <div className="hidden min-h-0 flex-1 flex-col gap-6 overflow-y-auto bg-canvas px-8 py-7 lg:flex xl:px-10">
      <header className="flex items-center justify-between gap-6">
        <div>
          <h1 className="font-display text-[2rem] leading-tight text-navy">{time.greeting}, Alex</h1>
          <p className="mt-1 text-muted">{time.today}</p>
        </div>
        <p
          role="status"
          className={`flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold ${stopped ? "bg-risk-critical-bg text-risk-critical" : "bg-risk-low-bg text-risk-low"}`}
        >
          {stopped ? <ShieldAlert className="size-4" aria-hidden /> : <ShieldCheck className="size-4" aria-hidden />}
          {stopped ? `${stopped} ${stopped === 1 ? "payment" : "payments"} stopped today` : "Protected · watching every payment"}
        </p>
      </header>

      <section aria-label="Your money" className={`grid shrink-0 grid-cols-3 divide-x divide-line ${PANEL}`}>
        {[everyday, saver].map(
          (a) =>
            a && (
              <div key={a.id} className="px-6 py-5">
                <p className="text-sm text-muted">{a.name}</p>
                <Money cents={a.balanceCents} className="font-display text-[2rem] leading-tight text-navy tabular-nums" />
              </div>
            ),
        )}
        <div className="px-6 py-5">
          <p className="text-sm text-muted">Safe to spend</p>
          <p className="font-display text-[2rem] leading-tight text-trust tabular-nums">{fmt(data.safe.amountCents)}</p>
          <p className="text-xs text-muted">
            {data.safe.status === "ok" ? "until payday" : data.safe.status === "buffer" ? "bills covered, under your buffer" : "short for what's still to pay"} · {payday(data.safe.nextPayday)}
          </p>
        </div>
      </section>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] gap-6">
        <section aria-labelledby="learned" className={`flex flex-col ${PANEL}`}>
          <div className="px-6 pt-5 pb-2">
            <h2 id="learned" className="font-display text-xl text-navy">What TrustPath has learned</h2>
            <p className="text-sm text-muted">From your own history. Used to protect you, never shared.</p>
          </div>
          <ul className="divide-y divide-line px-6 pb-2">
            {data.knows.map((k) => {
              const Icon = ICONS[k.id] ?? ShieldCheck;
              const lead = k.id === "birthday";
              return (
                <li key={k.id} className="flex gap-3.5 py-3.5">
                  <span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${lead ? "bg-risk-critical-bg text-brand" : "bg-trust-bg text-trust"}`}>
                    <Icon className="size-[18px]" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className={`text-ink ${lead ? "font-semibold" : "font-medium"}`}>{k.title}</p>
                    <p className="text-sm text-muted">{k.detail}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-labelledby="activity" className={`flex min-h-0 flex-col ${PANEL}`}>
          <div className="flex items-baseline justify-between px-6 pt-5 pb-2">
            <h2 id="activity" className="font-display text-xl text-navy">Live activity</h2>
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted">
              <span aria-hidden className="size-2 rounded-full bg-risk-low motion-safe:animate-pulse" />
              Updating live
            </span>
          </div>
          <ol className="min-h-0 flex-1 divide-y divide-line overflow-y-auto pb-2">
            {data.activity.slice(0, 14).map((r) => {
              const isNew = Date.parse(r.at) > time.fresh;
              return (
                <li
                  key={`${r.at}-${r.label}-${r.amountCents}`}
                  className={`flex items-center justify-between gap-4 px-6 py-3 ${r.status ? "bg-risk-critical-bg/60" : ""} ${isNew ? "motion-safe:animate-rise" : ""}`}
                >
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-medium text-ink">
                      <span className="truncate">{r.label}</span>
                      {r.status && <span className="shrink-0 rounded-full bg-risk-critical px-2 py-px text-[11px] font-semibold text-white">{STOPPED_LABEL[r.status]}</span>}
                      {isNew && !r.status && <span className="shrink-0 rounded-full bg-navy px-2 py-px text-[11px] font-semibold text-white">New</span>}
                    </p>
                    <p className={`truncate text-xs ${r.status ? "text-risk-critical" : "text-muted"}`}>
                      {day(r.at)} · {r.detail}
                    </p>
                  </div>
                  <span className={`shrink-0 tabular-nums ${r.status ? "text-risk-critical line-through" : r.amountCents > 0 ? "font-semibold text-risk-low" : "text-ink"}`}>
                    {r.amountCents > 0 ? "+" : "−"}
                    {fmt(Math.abs(r.amountCents))}
                  </span>
                </li>
              );
            })}
          </ol>
        </section>
      </div>
    </div>
  );
}
