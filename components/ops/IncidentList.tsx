import { caseNumber } from "@/lib/case-number";
import type { OpsState } from "@/lib/ops/state";
import { clock, flash, LEVEL } from "./tone";

const TYPE = { card_fraud: "Card fraud", account_compromise: "Account compromise", injection_blocked: "Injection blocked", scam_coaching: "Scam coaching", session_risk: "Session risk" } as const;
const STATUS = { open: "Open", contained: "Contained", investigated: "Investigated" } as const;

type Props = { incidents: OpsState["incidents"]; fresh: Set<string>; selectedId: string | null; onSelect: (id: string) => void };

export function IncidentList({ incidents, fresh, selectedId, onSelect }: Props) {
  if (!incidents.length) return <p className="mt-2 text-sm text-muted">No incidents.</p>;
  return (
    <ul className="mt-2 space-y-1">
      {incidents.map((i) => {
        const f = flash(fresh.has(i.id), i.severity);
        const selected = i.id === selectedId;
        return (
          <li key={i.id}>
            <button
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(i.id)}
              className={`w-full rounded-md border px-3 py-2 text-left text-sm ${selected ? "border-navy bg-sunken" : "border-transparent hover:bg-sunken"} ${f.className}`}
              style={f.style}
            >
              <span className="flex items-center gap-2">
                <span className={`h-2 w-2 shrink-0 rounded-full ${LEVEL[i.severity].dot}`} aria-hidden />
                <span className={`w-16 shrink-0 text-xs font-semibold capitalize ${LEVEL[i.severity].text}`}>{i.severity}</span>
                <span className="min-w-0 flex-1 truncate font-medium">{i.title}</span>
                <span className="text-xs text-muted">{STATUS[i.status]}</span>
              </span>
              <span className="mt-0.5 block pl-[5.25rem] text-xs text-muted">
                {TYPE[i.type]} · {caseNumber(i.id)} · {clock(i.createdAt)}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
