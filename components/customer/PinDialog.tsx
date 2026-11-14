"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";

export type ApproveResult = {
  action: { id: string; status: "completed"; completedAt: string };
  accounts: { id: string; balanceCents: number }[];
};

/** Simulated device check. The PIN lives only in this component's state and is sent once per attempt. */
export function PinDialog({
  actionId,
  payloadHash,
  summary,
  onClose,
  onApproved,
  onRefused,
}: {
  actionId: string | null;
  payloadHash: string;
  summary: string;
  onClose: () => void;
  onApproved: (r: ApproveResult) => void;
  /** Terminal refusal (too many attempts, expired, already approved…): the dialog closes. */
  onRefused: (code: string, message: string) => void;
}) {
  return (
    <Dialog open={actionId !== null} onClose={onClose} labelledBy="pin-title">
      {actionId && (
        <PinForm
          actionId={actionId}
          payloadHash={payloadHash}
          summary={summary}
          onClose={onClose}
          onApproved={onApproved}
          onRefused={onRefused}
        />
      )}
    </Dialog>
  );
}

function PinForm({
  actionId,
  payloadHash,
  summary,
  onClose,
  onApproved,
  onRefused,
}: {
  actionId: string;
  payloadHash: string;
  summary: string;
  onClose: () => void;
  onApproved: (r: ApproveResult) => void;
  onRefused: (code: string, message: string) => void;
}) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!/^\d{4}$/.test(pin)) return setError("Enter your 4-digit PIN.");
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/actions/${actionId}/approve`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pin, payloadHash }),
      });
      const body = await res.json();
      if (body.ok) return onApproved(body.data);
      if (body.error.code === "BAD_PIN") {
        setPin("");
        return setError(body.error.message);
      }
      onRefused(body.error.code, body.error.message);
    } catch {
      setError("We couldn't reach the bank. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <h2 id="pin-title" className="font-display text-xl text-navy">
        Verify on this device
      </h2>
      <p className="text-sm">{summary}</p>
      <div>
        <label htmlFor="pin" className="text-sm text-muted">
          PIN
        </label>
        <input
          id="pin"
          data-autofocus
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={4}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          aria-invalid={error !== ""}
          aria-describedby={error ? "pin-error" : undefined}
          className="mt-1 h-11 w-full rounded-md border border-line bg-sunken px-3 text-center text-2xl tracking-[0.5em]"
        />
        {error && (
          <p id="pin-error" role="alert" className="mt-1 text-sm text-risk-critical">
            {error}
          </p>
        )}
      </div>
      <div className="flex justify-between gap-3">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy}>
          Verify
        </Button>
      </div>
      <p className="text-xs text-muted">Simulated device check. Production would use passkeys.</p>
    </form>
  );
}
