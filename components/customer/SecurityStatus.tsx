import { ShieldAlert, ShieldCheck, TriangleAlert } from "lucide-react";
import type { CustomerState } from "@/lib/banking/state";

const time = (iso: string) => new Date(iso).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" });

/** Protect tab hero: emergency beats a locked card beats protected. */
export function SecurityStatus({ state }: { state: CustomerState }) {
  const { outgoingPaused, emergencySince } = state.profile;
  const [Icon, title, body, tone] = outgoingPaused
    ? [ShieldAlert, "Emergency protection on", `${emergencySince ? `Since ${time(emergencySince)}. ` : ""}Only our team can lift this.`, "border-risk-critical/30 bg-risk-critical-bg text-risk-critical"]
    : state.cards.some((c) => c.status !== "active")
      ? [TriangleAlert, "Card locked", "We paused your card to protect you.", "border-risk-medium/30 bg-risk-medium-bg text-risk-medium"]
      : [ShieldCheck, "Protected", "No restrictions on your accounts.", "border-line bg-trust-bg text-trust"];
  return (
    <section aria-label="Security status" className={`flex items-center gap-3 rounded-xl border p-4 shadow-sm ${tone}`}>
      <Icon className="h-8 w-8 shrink-0" aria-hidden />
      <div>
        <p className="text-lg font-semibold">{title}</p>
        <p className="text-sm text-ink">{body}</p>
      </div>
    </section>
  );
}
