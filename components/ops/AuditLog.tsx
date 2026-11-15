import type { OpsState } from "@/lib/ops/state";
import { clock } from "./tone";

const ACTOR: Record<string, string> = {
  customer: "bg-navy text-white",
  ai_agent: "bg-trust-bg text-trust",
  trust_engine: "bg-risk-low-bg text-risk-low",
  fraud_engine: "bg-risk-high-bg text-risk-high",
  bank_staff: "bg-risk-medium-bg text-risk-medium",
  system: "bg-sunken text-muted",
};

const short = (d: Record<string, unknown>) => {
  const s = JSON.stringify(d);
  return s === "{}" ? "" : s.length > 110 ? `${s.slice(0, 109)}…` : s;
};

export function AuditLog({ rows, fresh }: { rows: OpsState["audit"]; fresh: Set<string> }) {
  if (!rows.length) return <p className="mt-2 font-mono text-sm text-muted">No entries.</p>;
  return (
    <ol className="mt-2 space-y-0.5 font-mono text-xs">
      {rows.map((r) => (
        <li
          key={r.id}
          className={`flex items-baseline gap-2 rounded px-1 py-0.5 ${fresh.has(r.id) ? "animate-flash" : ""}`}
          style={fresh.has(r.id) ? ({ "--flash": "var(--color-sunken)" } as React.CSSProperties) : undefined}
        >
          <span className="w-16 shrink-0 text-muted tabular-nums">{clock(r.createdAt)}</span>
          <span className={`w-24 shrink-0 rounded px-1.5 text-center ${ACTOR[r.actor] ?? ACTOR.system}`}>{r.actor}</span>
          <span className="shrink-0 font-semibold text-ink">{r.action}</span>
          <span className="shrink-0 text-muted">{r.entityType}</span>
          <span className="min-w-0 truncate text-muted">{short(r.details)}</span>
        </li>
      ))}
    </ol>
  );
}
