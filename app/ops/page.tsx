import { Activity, ScrollText, ShieldAlert } from "lucide-react";
import { Card } from "@/components/ui/Card";

const nav = [
  { label: "Live", Icon: Activity },
  { label: "Incidents", Icon: ShieldAlert },
  { label: "Audit", Icon: ScrollText },
];

const stats = ["Declined", "Open", "Injection"];

// ponytail: empty skeleton until Units 23–25 wire live events, incidents and the audit log.
export default function OpsPage() {
  return (
    <div className="flex min-h-dvh flex-1">
      <aside className="w-48 shrink-0 bg-navy p-4 text-white">
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

      <main className="flex min-w-0 flex-1 flex-col gap-4 p-6">
        <header className="flex items-center justify-between">
          <h1 className="font-display text-3xl text-navy">Fraud Operations (demo)</h1>
          <div className="flex gap-2">
            {stats.map((s) => (
              <span key={s} className="rounded-full border border-line bg-surface px-3 py-1 text-sm">
                {s} <span className="font-semibold tabular-nums">0</span>
              </span>
            ))}
          </div>
        </header>

        <div className="grid grid-cols-2 gap-4">
          <Card id="live" className="p-4">
            <h2 className="text-lg font-semibold">Live card events</h2>
            <p className="mt-2 text-sm text-muted">No card events yet.</p>
          </Card>
          <Card id="incidents" className="p-4">
            <h2 className="text-lg font-semibold">Incidents</h2>
            <p className="mt-2 text-sm text-muted">No incidents.</p>
          </Card>
        </div>

        <Card className="p-4">
          <h2 className="text-lg font-semibold">Incident detail</h2>
          <p className="mt-2 text-sm text-muted">Select an incident to see its case brief.</p>
        </Card>

        <Card id="audit" className="p-4">
          <h2 className="text-lg font-semibold">Audit log</h2>
          <p className="mt-2 font-mono text-sm text-muted">No entries.</p>
        </Card>
      </main>
    </div>
  );
}
