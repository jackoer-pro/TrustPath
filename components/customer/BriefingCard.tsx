"use client";

import { useState } from "react";
import { Gift, Sun, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { BriefingCardData } from "@/lib/ai/tools";
import { speak } from "./speech";

/** The morning briefing: suggestions from Alex's own context. Tapping one sends a normal request (receipt + PIN). */
export function BriefingCard({ card, onSend }: { card: BriefingCardData; onSend: (message: string) => void }) {
  const [done, setDone] = useState(false);
  return (
    <article aria-label="Morning briefing" className="animate-rise rounded-xl border border-trust/30 bg-trust-bg p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 font-semibold text-trust">
          <Sun className="h-5 w-5" aria-hidden />
          {card.greeting}
        </p>
        <button type="button" aria-label="Listen" onClick={() => speak(card.speech)} className="rounded-full p-2 text-trust hover:bg-surface/60">
          <Volume2 className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <ul className="mt-2 space-y-1.5 text-sm text-ink">
        {card.lines.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
      {card.suggestion && !done && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() => {
              setDone(true);
              onSend(card.suggestion!.message);
            }}
          >
            <Gift className="h-4 w-4" aria-hidden />
            {card.suggestion.label}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setDone(true)}>
            Not now
          </Button>
        </div>
      )}
      <p className="mt-2 text-xs text-muted">From your own context and history. Nothing is sent without your approval.</p>
    </article>
  );
}
