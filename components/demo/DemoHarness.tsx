"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { saveStaffKey, useStaffKey } from "@/components/ops/staffKey";
import { Slides, type SlideId } from "./Slides";
import { speak } from "@/components/customer/speech";

// Filming harness (ui-context.md → Demo harness), target 1920×1080.
const PHONE_W = 420;
const PHONE_H = 860;
const SCALE = 1.2; // ≈1032 px tall in a 1080 recording

type Action = { label: string; path: string; body?: object };
const ACTIONS: Action[] = [
  { label: "Good morning (briefing)", path: "/api/demo/briefing" },
  { label: "Inject card attempt ($3,580)", path: "/api/simulate/card-authorization", body: { amount: 3580, merchant: "Nova Electronics Online", channel: "ecommerce" } },
  { label: "Inject normal purchase ($14.50)", path: "/api/simulate/card-authorization", body: { amount: "14.50", merchant: "Metro Café", channel: "in_store" } },
  { label: "Simulate compromised agent", path: "/api/demo/compromised-agent" },
  { label: "Simulate unfamiliar device attack", path: "/api/demo/unfamiliar-device" },
  { label: "Reset demo", path: "/api/demo/reset" },
];

/** Outside the component: timing a request isn't render work. */
async function timedPost(a: Action, key: string) {
  const t0 = performance.now();
  const res = await fetch(a.path, {
    method: "POST",
    headers: { "content-type": "application/json", "x-demo-key": key },
    ...(a.body && { body: JSON.stringify(a.body) }),
  });
  const body = await res.json().catch(() => null);
  return { res, body, ms: Math.round(performance.now() - t0) };
}

export function DemoHarness() {
  const key = useStaffKey();
  const [busy, setBusy] = useState<string | null>(null);
  const [last, setLast] = useState("");
  const [frames, setFrames] = useState(0); // bump to reload both iframes
  const [slide, setSlide] = useState<SlideId | null>(null);

  async function run(a: Action) {
    setBusy(a.label);
    let text: string;
    try {
      const { res, body, ms } = await timedPost(a, key);
      text = `${a.label} → ${res.status} in ${ms} ms\n${JSON.stringify(body, null, 2)}`;
      // The customer chat lives in page memory, so a reset must reload both views.
      if (res.ok && a.path === "/api/demo/reset") setFrames((n) => n + 1);
      // The phone pane shows the briefing; this page has the click, so it speaks it.
      if (res.ok && a.path === "/api/demo/briefing") speak(body.data.speech);
    } catch {
      text = `${a.label} → network error`;
    }
    setLast(text.length > 2000 ? `${text.slice(0, 2000)}…` : text);
    setBusy(null);
  }

  return (
    <div className="flex h-dvh gap-4 overflow-hidden p-4">
      <div
        className="shrink-0 overflow-hidden rounded-[3rem] border-8 border-ink bg-surface shadow-xl"
        style={{ width: PHONE_W * SCALE + 16, height: PHONE_H * SCALE + 16 }}
      >
        <iframe
          key={`c${frames}`}
          src="/"
          title="Customer app"
          style={{ width: PHONE_W, height: PHONE_H, transform: `scale(${SCALE})`, transformOrigin: "top left" }}
        />
      </div>

      <iframe key={`o${frames}`} src="/ops" title="Bank console" className="h-full min-w-0 flex-1 rounded-xl border border-line bg-surface" />

      <aside className="flex w-[280px] shrink-0 flex-col gap-3 rounded-xl border border-line bg-surface p-4">
        <h1 className="font-display text-xl text-navy">Demo controls</h1>
        <label className="text-sm text-muted">
          Demo key
          <input
            type="password"
            autoComplete="off"
            value={key}
            onChange={(e) => saveStaffKey(e.target.value)}
            className="mt-1 h-9 w-full rounded-md border border-line bg-surface px-2 text-ink"
          />
        </label>
        <p className="text-xs text-muted">Simulated events · the key is shared with the console&apos;s staff key.</p>
        {ACTIONS.map((a) => (
          <Button key={a.label} variant={a.path === "/api/demo/reset" ? "primary" : "secondary"} size="sm" disabled={busy !== null} onClick={() => run(a)}>
            {busy === a.label ? "Working…" : a.label}
          </Button>
        ))}
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" className="flex-1 border border-line" onClick={() => setSlide("opening")}>
            Opening slide
          </Button>
          <Button size="sm" variant="ghost" className="flex-1 border border-line" onClick={() => setSlide("closing")}>
            Closing slide
          </Button>
        </div>
        <pre aria-live="polite" className="min-h-0 flex-1 overflow-auto rounded-md bg-sunken p-2 font-mono text-[11px] leading-snug whitespace-pre-wrap text-ink">
          {last || "Responses appear here."}
        </pre>
      </aside>
      {slide && <Slides slide={slide} onClose={() => setSlide(null)} />}
    </div>
  );
}
