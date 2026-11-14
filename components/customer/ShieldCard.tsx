import { ShieldAlert } from "lucide-react";
import type { ShieldCardData } from "@/lib/ai/tools";

const MAX_QUOTE = 120;

export function ShieldCard({ card }: { card: ShieldCardData }) {
  const quote = card.removed.length > MAX_QUOTE ? `${card.removed.slice(0, MAX_QUOTE - 1).trimEnd()}…` : card.removed;
  return (
    <article
      aria-label="Hidden instructions ignored"
      className="animate-rise rounded-xl border border-l-4 border-line border-l-trust bg-trust-bg p-4 shadow-sm"
    >
      <p className="flex items-center gap-2 font-semibold text-trust">
        <ShieldAlert className="h-5 w-5 shrink-0" aria-hidden />
        Hidden instructions ignored
      </p>
      <blockquote className="mt-2 border-l-2 border-trust/30 pl-3 text-sm text-ink italic">“{quote}”</blockquote>
      <p className="mt-2 text-xs text-muted">Source: {card.source}</p>
      <p className="mt-2 text-sm">Nothing was done. These instructions didn&apos;t come from you.</p>
    </article>
  );
}
