import { Button } from "@/components/ui/Button";

const actions = ["Inject card attempt ($3,580)", "Inject normal purchase ($14.50)", "Simulate compromised agent", "Reset demo"];

// ponytail: buttons are inert until Unit 26 wires the control panel.
export default function DemoPage() {
  return (
    <div className="flex h-dvh gap-4 p-4">
      <iframe
        src="/"
        title="Customer app"
        className="h-full w-[420px] shrink-0 rounded-[2.75rem] border border-line bg-surface shadow-xl"
      />
      <iframe src="/ops" title="Bank console" className="h-full min-w-0 flex-1 rounded-xl border border-line bg-surface" />
      <aside className="flex w-[280px] shrink-0 flex-col gap-3 rounded-xl border border-line bg-surface p-4">
        <h1 className="font-display text-xl text-navy">Demo controls</h1>
        <p className="text-xs text-muted">Simulated events · wired up in Unit 26</p>
        {actions.map((a) => (
          <Button key={a} variant="secondary" size="sm" disabled>
            {a}
          </Button>
        ))}
      </aside>
    </div>
  );
}
