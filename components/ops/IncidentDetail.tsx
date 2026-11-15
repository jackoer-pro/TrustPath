import { Bot, CircleCheck, FileText, Lock } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { caseNumber } from "@/lib/case-number";
import { formatAUD } from "@/lib/money";
import type { OpsState } from "@/lib/ops/state";
import { clock, LEVEL } from "./tone";

type Props = { incident: OpsState["incidents"][number]; event: OpsState["cardEvents"][number] | null };

export function IncidentDetail({ incident: i, event: e }: Props) {
  const b = i.brief;
  return (
    <div className="mt-3 grid gap-4 lg:grid-cols-[3fr_2fr]">
      <section aria-label="Case brief" className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={`capitalize ${LEVEL[i.severity].badge}`}>{i.severity}</Badge>
          <p className="font-semibold">{i.title}</p>
          <span className="text-sm text-muted">
            {caseNumber(i.id)} · {i.status} · {clock(i.createdAt)}
          </span>
        </div>

        {!b ? (
          <p className="mt-3 animate-pulse text-sm text-muted">Writing case brief…</p>
        ) : (
          <div className="mt-3 space-y-3 text-sm">
            <p className="flex items-center gap-1.5 text-xs text-muted">
              {b.source === "ai" ? <Bot className="h-3.5 w-3.5" aria-hidden /> : <FileText className="h-3.5 w-3.5" aria-hidden />}
              {b.source === "ai" ? "AI-generated summary · decisions are made by the rules engine" : "Template summary · AI unavailable"}
            </p>
            <p className="text-base text-ink">{b.summary}</p>
            <div>
              <h3 className="font-semibold">Timeline</h3>
              <ol className="mt-1 list-decimal space-y-1 pl-5 text-ink">
                {b.timeline.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ol>
            </div>
            {b.measures.length > 0 && (
              <div>
                <h3 className="font-semibold">Measures taken</h3>
                <ul className="mt-1 space-y-1">
                  {b.measures.map((m) => (
                    <li key={m} className="flex items-start gap-2">
                      <CircleCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-risk-low" aria-hidden />
                      {m}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="rounded-md border border-trust/30 bg-trust-bg p-3">
              <h3 className="font-semibold text-trust">Suggested next step</h3>
              <p className="mt-0.5 text-ink">{b.nextStep}</p>
            </div>
          </div>
        )}
      </section>

      <section aria-label="Related record" className="min-w-0 space-y-3 text-sm">
        {e && (
          <div className="rounded-md border border-line p-3">
            <h3 className="font-semibold">Related card event</h3>
            <p className="mt-1">
              {e.merchant} · <span className="font-semibold tabular-nums">{formatAUD(e.amountCents)}</span> · {e.channel === "ecommerce" ? "Online" : "In store"} · •••• {e.cardLastFour}
            </p>
            <p className="mt-0.5 font-medium uppercase">{e.decision}</p>
            {e.cardAction === "temporarily_locked" && (
              <p className="mt-0.5 inline-flex items-center gap-1 text-risk-critical">
                <Lock className="h-3 w-3" aria-hidden />
                Card locked
              </p>
            )}
            <ul className="mt-1 list-disc pl-5 text-muted">
              {e.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
        )}
        {i.action && (
          <div className="rounded-md border border-line p-3">
            <h3 className="font-semibold">Related action</h3>
            <p className="mt-1">
              {formatAUD(i.action.amountCents)} to {i.action.to} · <span className="uppercase">{i.action.status}</span>
            </p>
            <p className="text-xs text-muted">Origin: {i.action.origin.replaceAll("_", " ")}</p>
            <ul className="mt-1 list-disc pl-5 text-muted">
              {i.action.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="rounded-md border border-line p-3">
          <h3 className="font-semibold">Recorded description</h3>
          <p className="mt-1 text-muted">{i.description}</p>
        </div>
      </section>
    </div>
  );
}
