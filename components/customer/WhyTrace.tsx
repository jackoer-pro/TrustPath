import { HelpCircle } from "lucide-react";
import type { DecisionTrace } from "@/lib/banking/trace";

const DECISION = { allow: "Allowed", step_up: "Needs your PIN", hold: "Held", block: "Blocked" } as const;

/** "Why?" — the same decision timeline the bank's staff see, in plain words. */
export function WhyTrace({ trace }: { trace: DecisionTrace }) {
  const steps: [string, string][] = [
    ["What was asked", `${trace.intent.label}${trace.intent.text ? `: “${trace.intent.text}”` : ""}`],
    ["Session", `${trace.session.label}${trace.session.newSession ? " · new sign-in" : ""}`],
    ["Payment", `${trace.transaction.amount} from ${trace.transaction.from} to ${trace.transaction.to}${trace.transaction.notes.length ? ` · ${trace.transaction.notes.join(" · ")}` : ""}`],
    ...(trace.signals.length ? ([["Signals", trace.signals.join("; ")]] as [string, string][]) : []),
    ["Checks that fired", trace.rules.length ? trace.rules.map((r) => `${r.id} ${DECISION[r.decision as keyof typeof DECISION] ?? r.decision}: ${r.reason}`).join("\n") : "None: everything matched what you asked."],
    ["Decision", `${DECISION[trace.decision]} · ${trace.outcome}`],
  ];
  return (
    <details className="group text-sm">
      <summary className="inline-flex cursor-pointer items-center gap-1 font-medium text-navy">
        <HelpCircle className="h-4 w-4" aria-hidden /> Why?
      </summary>
      <ol className="mt-2 space-y-1.5 border-l-2 border-trust/30 pl-3">
        {steps.map(([k, v], i) => (
          <li key={k}>
            <span className="text-xs font-semibold text-muted uppercase">
              {i + 1}. {k}
            </span>
            <span className="block whitespace-pre-line text-ink">{v}</span>
          </li>
        ))}
      </ol>
      <p className="mt-2 text-xs text-muted">Decided by the bank&apos;s rules, not the AI. Our team sees this same explanation.</p>
    </details>
  );
}
