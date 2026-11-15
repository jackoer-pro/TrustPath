import { Lock } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { formatAUD } from "@/lib/money";
import type { OpsState } from "@/lib/ops/state";
import { clock, flash, type Level } from "./tone";

const DECISION: Record<OpsState["cardEvents"][number]["decision"], { label: string; level: Level }> = {
  approved: { label: "APPROVED", level: "low" },
  declined: { label: "DECLINED", level: "critical" },
  review: { label: "REVIEW", level: "medium" },
};
const BADGE = { low: "bg-risk-low-bg text-risk-low", medium: "bg-risk-medium-bg text-risk-medium", critical: "bg-risk-critical-bg text-risk-critical", high: "" };

export function CardEventList({ events, fresh }: { events: OpsState["cardEvents"]; fresh: Set<string> }) {
  if (!events.length) return <p className="mt-2 text-sm text-muted">No card events yet.</p>;
  return (
    <ul className="mt-2 divide-y divide-line">
      {events.map((e) => {
        const d = DECISION[e.decision];
        const f = flash(fresh.has(e.id), d.level);
        return (
          <li key={e.id} className={`-mx-2 rounded-md px-2 py-2 ${f.className}`} style={f.style}>
            <div className="flex items-center gap-3 text-sm">
              <span className="min-w-0 flex-1 truncate font-medium">{e.merchant}</span>
              <span className="shrink-0 text-right font-semibold tabular-nums">{formatAUD(e.amountCents)}</span>
              <Badge className={`w-24 shrink-0 justify-center text-xs ${BADGE[d.level]}`}>{d.label}</Badge>
            </div>
            <div className="mt-0.5 text-xs text-muted">
              <span className="font-mono tabular-nums">{clock(e.createdAt)}</span> · {e.channel === "ecommerce" ? "Online" : "In store"} · ••••{" "}
              {e.cardLastFour}
              {(e.reasons.length > 0 || e.cardAction === "temporarily_locked") && <span className="mx-1">·</span>}
              {e.cardAction === "temporarily_locked" && (
                <span className="mr-2 inline-flex items-center gap-1 font-medium text-risk-critical">
                  <Lock className="h-3 w-3" aria-hidden />
                  Card locked
                </span>
              )}
              {e.reasons.join(" ")}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
