"use client";

import { useState, type FormEvent } from "react";
import { ScanSearch } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { CoachingCardData } from "@/lib/ai/tools";
import { CoachingCard } from "./CoachingCard";

/** CoachGuard on the Protect tab: paste a message or call transcript and get the evidence and a safe next step. */
export function CheckMessage() {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<Omit<CoachingCardData, "type">>();

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim() || busy) return;
    setBusy(true);
    setError(undefined);
    const body = await fetch("/api/protect/check-message", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
    })
      .then((r) => r.json())
      .catch(() => null);
    setBusy(false);
    if (body?.ok) setResult(body.data);
    else setError(body?.error?.message ?? "We couldn't check that just now. Please try again.");
  }

  return (
    <Card className="p-4">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <ScanSearch className="h-5 w-5 text-trust" aria-hidden />
        Check a message
      </h2>
      <p className="mt-1 text-sm text-muted">Paste a text, email or what a caller told you. We&apos;ll look for signs of scam coaching.</p>
      <form onSubmit={submit} className="mt-3 space-y-2">
        <label htmlFor="check-text" className="sr-only">
          Message or call transcript
        </label>
        <textarea
          id="check-text"
          rows={4}
          maxLength={4000}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. “If the bank asks, say it's for a car…”"
          className="w-full rounded-md border border-line bg-sunken p-2 text-sm placeholder:text-muted"
        />
        <Button type="submit" size="sm" disabled={busy || !text.trim()}>
          {busy ? "Checking…" : "Check message"}
        </Button>
        {error && <p className="text-sm text-risk-critical">{error}</p>}
      </form>
      {result && (
        <div className="mt-3" aria-live="polite">
          <CoachingCard card={result} />
        </div>
      )}
    </Card>
  );
}
