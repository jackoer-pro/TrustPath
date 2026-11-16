"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { saveStaffKey, useStaffKey } from "@/components/ops/staffKey";
import { ACTIONS, timedPost, type Action } from "./DemoHarness";

// Phone-sized remote for a helper on another device: fires the simulated events while the audience watches the
// laptop at the normal address. The laptop shows (and speaks) what happens; this page only reports done / failed.
export function DemoRemote() {
  const key = useStaffKey();
  const [busy, setBusy] = useState<string | null>(null);
  const [last, setLast] = useState("");

  async function run(a: Action) {
    setBusy(a.label);
    try {
      const { res, ms } = await timedPost(a, key);
      setLast(res.ok ? `✓ ${a.label} (${ms} ms)` : res.status === 401 ? "✗ Wrong demo key" : `✗ ${a.label} failed (${res.status})`);
    } catch {
      setLast(`✗ ${a.label}: network error`);
    }
    setBusy(null);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-3 bg-surface p-4">
      <h1 className="font-display text-2xl text-navy">Demo remote</h1>
      <label className="text-sm text-muted">
        Demo key
        <input type="password" autoComplete="off" value={key} onChange={(e) => saveStaffKey(e.target.value)} className="mt-1 h-11 w-full rounded-md border border-line bg-surface px-3 text-ink" />
      </label>
      {ACTIONS.map((a) => (
        <Button key={a.label} variant={a.path === "/api/demo/reset" ? "primary" : "secondary"} className="h-14" disabled={busy !== null} onClick={() => run(a)}>
          {busy === a.label ? "Working…" : a.label}
        </Button>
      ))}
      <p aria-live="polite" className="min-h-6 text-sm font-medium text-ink">{last}</p>
      <p className="text-xs text-muted">After Reset demo, refresh the laptop so its chat starts empty.</p>
    </main>
  );
}
