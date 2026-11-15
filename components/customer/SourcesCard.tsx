import { BookOpen } from "lucide-react";
import type { SourcesCardData } from "@/lib/ai/tools";

/** Quiet citation line under a reply that used the safety guide. */
export function SourcesCard({ card }: { card: SourcesCardData }) {
  return (
    <p className="flex items-start gap-2 px-1 text-xs text-muted">
      <BookOpen className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>From our safety guide: {card.items.join(" · ")}</span>
    </p>
  );
}
