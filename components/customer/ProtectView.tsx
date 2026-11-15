"use client";

import Link from "next/link";
import { Bell, ChevronRight, CircleCheck, CreditCard, Lock, LockOpen } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { caseNumber } from "@/lib/case-number";
import type { CustomerState } from "@/lib/banking/state";
import { SecurityStatus } from "./SecurityStatus";
import { useCustomerState } from "./useCustomerState";

type Incident = CustomerState["incidents"][number];

const CARD_STATUS = {
  active: { label: "Active", Icon: LockOpen, tone: "text-risk-low" },
  temporarily_locked: { label: "Temporarily locked", Icon: Lock, tone: "text-risk-medium" },
  locked: { label: "Locked", Icon: Lock, tone: "text-risk-critical" },
} as const;

const caseTitle = (i: Incident) =>
  i.type === "account_compromise" ? "Account protection case" : i.type === "injection_blocked" ? "Hidden instructions blocked" : i.title;

const when = (iso: string) => new Date(iso).toLocaleString("en-AU", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export function ProtectView() {
  const { state, error } = useCustomerState();

  return (
    <div className="flex-1 space-y-4 overflow-y-auto bg-sunken p-4">
      <h1 className="font-display text-3xl text-navy">Protect</h1>

      {!state ? (
        error ? (
          <p className="text-sm text-muted">Can&apos;t load your security status right now.</p>
        ) : (
          <div aria-hidden className="h-20 rounded-xl bg-surface/60" />
        )
      ) : (
        <>
          {error && <p className="text-xs text-muted">Reconnecting…</p>}

          {state.notifications.some((n) => n.kind === "card_alert") && (
            <Link
              href="/"
              className="flex items-center gap-3 rounded-xl border border-risk-high/30 bg-risk-high-bg p-4 text-risk-high shadow-sm"
            >
              <Bell className="h-5 w-5 shrink-0" aria-hidden />
              <span className="flex-1 font-semibold">You have a security alert</span>
              <span className="text-sm">Answer on Home</span>
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Link>
          )}

          <SecurityStatus state={state} />

          <Card className="p-4">
            <h2 className="text-lg font-semibold">Cards</h2>
            <ul className="mt-3 space-y-3">
              {state.cards.map((c) => {
                const s = CARD_STATUS[c.status];
                return (
                  <li key={c.id}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-navy" aria-hidden />
                        Debit •••• {c.lastFour}
                      </span>
                      <span className={`flex items-center gap-1 text-sm font-medium ${s.tone}`}>
                        <s.Icon className="h-4 w-4" aria-hidden />
                        {s.label}
                      </span>
                    </div>
                    {c.status !== "active" && (
                      <p className="mt-1 text-xs text-muted">Only our team can unlock it. We&apos;ll contact you.</p>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>

          {(state.profile.outgoingPaused || state.profile.newPayeesBlocked) && (
            <Card className="p-4">
              <h2 className="text-lg font-semibold">Restrictions</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {state.profile.outgoingPaused && (
                  <li className="flex items-center gap-2">
                    <CircleCheck className="h-4 w-4 shrink-0 text-risk-critical" aria-hidden />
                    New outgoing transfers paused
                  </li>
                )}
                {state.profile.newPayeesBlocked && (
                  <li className="flex items-center gap-2">
                    <CircleCheck className="h-4 w-4 shrink-0 text-risk-critical" aria-hidden />
                    New payees blocked
                  </li>
                )}
              </ul>
            </Card>
          )}

          <Card className="p-4">
            <h2 className="text-lg font-semibold">Cases</h2>
            {state.incidents.length === 0 ? (
              <p className="mt-2 text-sm text-muted">No open cases.</p>
            ) : (
              <ul className="mt-3 divide-y divide-line">
                {state.incidents.map((i) => (
                  <li key={i.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium">{caseTitle(i)}</p>
                      <Badge className={`shrink-0 ${i.status === "open" ? "bg-risk-medium-bg text-risk-medium" : "bg-trust-bg text-trust"}`}>
                        {i.status === "open" ? "Open" : "We're on it"}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted">
                      Case {caseNumber(i.id)} · {when(i.createdAt)}
                    </p>
                    {i.measures.length > 0 && (
                      <ul className="mt-2 space-y-1 text-sm text-ink">
                        {i.measures.map((m) => (
                          <li key={m} className="flex items-start gap-2">
                            <CircleCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-risk-low" aria-hidden />
                            {m}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
