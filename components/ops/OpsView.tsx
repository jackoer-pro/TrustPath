"use client";

import { useState } from "react";
import { Activity, ScrollText, ShieldAlert } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { AuditLog } from "./AuditLog";
import { CardEventList } from "./CardEventList";
import { IncidentDetail } from "./IncidentDetail";
import { IncidentList } from "./IncidentList";
import { useOpsState } from "./useOpsState";

const nav = [
  { label: "Live", Icon: Activity },
  { label: "Incidents", Icon: ShieldAlert },
  { label: "Audit", Icon: ScrollText },
];

export function OpsView() {
  const { state, fresh, error } = useOpsState();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = state?.incidents.find((i) => i.id === selectedId) ?? null;

  const stats = [
    { label: "Declined", value: state?.stats.declined },
    { label: "Open", value: state?.stats.open },
    { label: "Injection", value: state?.stats.injection },
  ];

  return (
    <div className="flex min-h-dvh flex-1">
      <aside className="hidden w-48 shrink-0 bg-navy p-4 text-white md:block">
        <p className="font-display text-xl">TrustPath Ops</p>
        <nav aria-label="Console" className="mt-6 space-y-1">
          {nav.map(({ label, Icon }) => (
            <a key={label} href={`#${label.toLowerCase()}`} className="flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-navy-strong">
              <Icon className="h-5 w-5" aria-hidden />
              {label}
            </a>
          ))}
        </nav>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col gap-4 p-4 md:p-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-3xl text-navy">Fraud Operations (demo)</h1>
          <div className="flex flex-wrap gap-2" aria-label="Stats">
            {stats.map((s) => (
              <span key={s.label} className="rounded-full border border-line bg-surface px-3 py-1 text-sm">
                {s.label} <span className="font-semibold tabular-nums">{s.value ?? "–"}</span>
              </span>
            ))}
          </div>
        </header>
        {error && <p className="text-sm text-muted">{state ? "Reconnecting…" : "Can't load the console right now."}</p>}

        <div className="grid gap-4 xl:grid-cols-2">
          <Card id="live" className="min-w-0 overflow-x-auto p-4">
            <h2 className="text-lg font-semibold">Live card events</h2>
            {state && <CardEventList events={state.cardEvents} fresh={fresh} />}
          </Card>
          <Card id="incidents" className="min-w-0 overflow-x-auto p-4">
            <h2 className="text-lg font-semibold">Incidents</h2>
            {state && <IncidentList incidents={state.incidents} fresh={fresh} selectedId={selectedId} onSelect={setSelectedId} />}
          </Card>
        </div>

        <Card className="p-4">
          <h2 className="text-lg font-semibold">Incident detail</h2>
          {selected ? (
            <IncidentDetail incident={selected} event={state?.cardEvents.find((e) => e.id === selected.cardEventId) ?? null} />
          ) : (
            <p className="mt-2 text-sm text-muted">Select an incident to see its case brief.</p>
          )}
        </Card>

        <Card id="audit" className="min-w-0 overflow-x-auto p-4">
          <h2 className="text-lg font-semibold">Audit log</h2>
          {state && <AuditLog rows={state.audit} fresh={fresh} />}
        </Card>
      </main>
    </div>
  );
}
