"use client";

import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";

type Props = {
  title: string;
  body: string;
  busy: boolean;
  error?: string;
  onAnswer: (response: "confirmed" | "denied") => void;
  /** Label for "No" (session alerts: "No, secure my account"). */
  denyLabel?: string;
};

/** "Was this you?" — stays until answered (ui-context.md → AlertBanner). */
export function AlertBanner({ title, body, busy, error, onAnswer, denyLabel = "No, it wasn't me" }: Props) {
  return (
    <div role="alert" className="mx-4 my-3 animate-rise rounded-xl border border-risk-high/30 bg-risk-high-bg p-4 shadow-sm">
      <p className="flex items-center gap-2 font-semibold text-risk-high">
        <TriangleAlert className="h-5 w-5 shrink-0" aria-hidden />
        {title}
      </p>
      <p className="mt-1 text-sm text-ink">{body}</p>
      <div className="mt-3 flex gap-2">
        <Button size="sm" variant="secondary" disabled={busy} onClick={() => onAnswer("confirmed")}>
          Yes, it was me
        </Button>
        <Button size="sm" variant="danger" disabled={busy} onClick={() => onAnswer("denied")}>
          {denyLabel}
        </Button>
      </div>
      {error && <p className="mt-2 text-xs text-risk-critical">{error}</p>}
    </div>
  );
}
