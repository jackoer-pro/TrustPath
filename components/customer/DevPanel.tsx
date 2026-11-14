"use client";

// ponytail: temporary dev-only trigger for Units 06–08. Unit 11 deletes this file and /api/dev/prepare-transfer.
import { useEffect, useRef, useState } from "react";
import type { PreparedAction } from "@/lib/banking/actions";

const ACT1 = "I just got paid $1,500. Move $300 into savings, pay my $120 electricity bill and tell me what I have left.";
const presets = [
  { label: "Act 1: $300 → savings", body: { to: "savings", amountCents: 30000, userMessages: [ACT1] } },
  { label: "Act 1: $120 → electricity", body: { to: "electricity", amountCents: 12000, userMessages: [ACT1] } },
  {
    label: "Hijack: $500 → J. Smith",
    body: { to: "J. Smith", amountCents: 50000, userMessages: ["Buy these headphones for $129 https://trustpath.example/shop/aurora-anc"] },
  },
];

export function DevPanel({ onPrepared }: { onPrepared: (a: PreparedAction) => void }) {
  const keyRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState("");

  // Filled after mount (not during render) so server and client HTML match.
  useEffect(() => {
    try {
      if (keyRef.current) keyRef.current.value = sessionStorage.getItem("demoKey") ?? "";
    } catch {}
  }, []);

  async function run(body: object) {
    const key = keyRef.current?.value ?? "";
    try {
      sessionStorage.setItem("demoKey", key);
    } catch {}
    const res = await fetch("/api/dev/prepare-transfer", {
      method: "POST",
      headers: { "content-type": "application/json", "x-demo-key": key },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    setMsg(json.ok ? "" : json.error.message);
    if (json.ok) onPrepared(json.data);
  }

  return (
    <details className="rounded-xl border border-dashed border-line p-2 text-xs text-muted">
      <summary className="cursor-pointer">Dev panel (temporary, not in production)</summary>
      <input
        aria-label="Demo key"
        type="password"
        ref={keyRef}
        placeholder="Demo key"
        className="mt-2 h-9 w-full rounded-md bg-surface px-2"
      />
      <div className="mt-2 flex flex-wrap gap-1">
        {presets.map((p) => (
          <button key={p.label} type="button" onClick={() => run(p.body)} className="rounded-md border border-line bg-surface px-2 py-1">
            {p.label}
          </button>
        ))}
      </div>
      {msg && <p role="alert">{msg}</p>}
    </details>
  );
}
