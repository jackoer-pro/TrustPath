import { Badge } from "@/components/ui/Badge";
import type { OpsState } from "@/lib/ops/state";
import type { IntentSource } from "@/lib/banking/trace";
import { clock } from "./tone";

const SOURCE: Record<IntentSource, { label: string; tone: string }> = {
  customer: { label: "Customer instruction", tone: "bg-navy text-white" },
  app: { label: "Customer tap", tone: "bg-navy text-white" },
  saved_plan: { label: "Customer's saved plan", tone: "bg-trust-bg text-trust" },
  external: { label: "External content", tone: "bg-risk-critical-bg text-risk-critical" },
  unfamiliar_session: { label: "Unfamiliar session (simulated)", tone: "bg-risk-high-bg text-risk-high" },
};
const DECISION_TONE: Record<string, string> = {
  allow: "bg-risk-low-bg text-risk-low",
  step_up: "bg-risk-low-bg text-risk-low",
  hold: "bg-risk-high-bg text-risk-high",
  block: "bg-risk-critical-bg text-risk-critical",
};
const DECISION = { allow: "ALLOWED", step_up: "NEEDS PIN", hold: "HELD", block: "BLOCKED" } as Record<string, string>;
const STATUS: Record<string, string> = {
  pending_approval: "Waiting for the customer's PIN",
  completed: "Approved by the customer with PIN; executed",
  cancelled: "Cancelled",
  held: "Held; not approvable",
  blocked: "Blocked; never executed",
  expired: "Expired",
};

/** Session Trust timeline: for every decision, the 8 facts staff need (same trace the customer sees under "Why?"). */
export function DecisionTimeline({ decisions, fresh }: { decisions: OpsState["decisions"]; fresh: Set<string> }) {
  if (!decisions.length) return <p className="mt-2 text-sm text-muted">No decisions yet.</p>;
  return (
    <ul className="mt-2 space-y-2">
      {decisions.map((d) => {
        const t = d.trace;
        const src = SOURCE[t.intent.source];
        return (
          <li key={d.id} className={`rounded-md border border-line ${fresh.has(d.id) ? "animate-flash" : ""}`} style={fresh.has(d.id) ? ({ "--flash": "var(--color-sunken)" } as React.CSSProperties) : undefined}>
            <details>
              <summary className="flex cursor-pointer flex-wrap items-center gap-2 px-3 py-2 text-sm">
                <span className="font-mono text-xs text-muted tabular-nums">{clock(d.createdAt)}</span>
                <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${src.tone}`}>{src.label}</span>
                <span className="min-w-0 flex-1 truncate font-medium">
                  {t.transaction.amount} → {t.transaction.to}
                </span>
                {t.signals.length > 0 && <span className="text-xs text-risk-high">{t.signals.length} session signal{t.signals.length > 1 ? "s" : ""}</span>}
                <Badge className={`text-xs ${DECISION_TONE[t.decision]}`}>{DECISION[t.decision]}</Badge>
              </summary>
              <dl className="grid gap-x-3 gap-y-1 border-t border-line px-3 py-2 text-sm sm:grid-cols-[11rem_1fr]">
                <dt className="font-semibold text-muted">1. Original intention</dt>
                <dd>
                  {t.intent.label}
                  {t.intent.text && <span className="block text-muted italic">“{t.intent.text}”</span>}
                </dd>
                <dt className="font-semibold text-muted">2. Session</dt>
                <dd>
                  {t.session.label}
                  {t.session.newSession ? " · new sign-in" : ""}
                </dd>
                <dt className="font-semibold text-muted">3. Transaction</dt>
                <dd>
                  {t.transaction.type} · {t.transaction.amount} from {t.transaction.from} to {t.transaction.to}
                  {t.transaction.notes.length > 0 && <span className="block text-muted">{t.transaction.notes.join(" · ")}</span>}
                </dd>
                <dt className="font-semibold text-muted">4. Risk signals</dt>
                <dd>{t.signals.length ? t.signals.join("; ") : "None"}</dd>
                <dt className="font-semibold text-muted">5. Rules triggered</dt>
                <dd>
                  {t.rules.length ? (
                    <ul className="space-y-0.5">
                      {t.rules.map((r, i) => (
                        <li key={i}>
                          <span className="font-mono text-xs font-semibold">{r.id}</span> {r.decision}: {r.reason}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    "None"
                  )}
                </dd>
                <dt className="font-semibold text-muted">6. Decision</dt>
                <dd>{DECISION[t.decision]}</dd>
                <dt className="font-semibold text-muted">7. Action taken</dt>
                <dd>{STATUS[d.status] ?? d.status}</dd>
                <dt className="font-semibold text-muted">8. Timestamp</dt>
                <dd className="font-mono text-xs">{new Date(t.at).toLocaleString("en-AU")}</dd>
              </dl>
            </details>
          </li>
        );
      })}
    </ul>
  );
}
