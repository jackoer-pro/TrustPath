"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Ban, Bot, CalendarClock, CircleCheck, PiggyBank, ReceiptText, Trash2, UserRound, Users, Wallet } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatAUD } from "@/lib/money";
import type { FinancialContext } from "@/lib/context/context";

const toCents = (s: string) => {
  const t = s.replace(/[$,\s]/g, "");
  return /^\d+(\.\d{1,2})?$/.test(t) ? Math.round(Number(t) * 100) : null;
};
const dollars = (c: number) => (c / 100).toFixed(c % 100 ? 2 : 0);

/** A dollar amount the customer can edit; saves only when changed and valid. */
function MoneyField({ label, cents, onSave, hint }: { label: string; cents: number; onSave: (c: number) => Promise<void>; hint?: string }) {
  const [value, setValue] = useState(dollars(cents));
  const [busy, setBusy] = useState(false);
  const next = toCents(value);
  const dirty = next !== null && next !== cents;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 py-2">
      <label className="min-w-0 flex-1 text-sm">
        {label}
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </label>
      <span className="flex items-center gap-1">
        <span className="text-muted">$</span>
        <input
          inputMode="decimal"
          aria-label={label}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-9 w-24 rounded-md border border-line bg-surface px-2 text-right tabular-nums"
        />
        {dirty && (
          <Button
            size="sm"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await onSave(next!);
              setBusy(false);
            }}
          >
            Save
          </Button>
        )}
      </span>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <Card className="p-4">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        {icon}
        {title}
      </h2>
      <div className="mt-1">{children}</div>
    </Card>
  );
}

const ALLOWED = [
  "Read your accounts and transactions",
  "Analyse your spending and safe-to-spend",
  "Prepare payments and purchases for you to approve",
  "Start protective workflows (lock cards, pause payments) when you ask",
];
const RESTRICTED = [
  "Approve payments or bypass your PIN",
  "Move money without a request from you",
  "Unlock cards or close fraud cases",
  "Change security rules or these permissions",
];

/** "Me": My Financial Context (explicit, editable, nothing inferred) and My AI Permissions (enforced server-side). */
export function MeView() {
  const [ctx, setCtx] = useState<FinancialContext | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newAmount, setNewAmount] = useState("");

  useEffect(() => {
    fetch("/api/me/context", { cache: "no-store" })
      .then((r) => r.json())
      .then((b) => (b.ok ? setCtx(b.data) : setError("Can't load your context right now.")))
      .catch(() => setError("Can't load your context right now."));
  }, []);

  async function call(path: string, method: string, body?: object) {
    setError(null);
    const r = await fetch(path, { method, headers: { "content-type": "application/json" }, body: body && JSON.stringify(body) })
      .then((x) => x.json())
      .catch(() => null);
    if (r?.ok) setCtx(r.data);
    else setError(r?.error?.message ?? "That didn't save. Please try again.");
  }
  const pref = (patch: object) => call("/api/me/preferences", "PATCH", patch);

  if (!ctx)
    return (
      <div className="flex-1 bg-sunken p-4">
        <h1 className="font-display text-3xl text-navy">Me</h1>
        <p className="mt-4 text-sm text-muted">{error ?? "Loading…"}</p>
      </div>
    );

  const p = ctx.preferences;
  const until = new Date(`${p.nextPayday}T00:00:00`).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" });
  const newCents = toCents(newAmount);

  return (
    <div className="flex-1 space-y-4 overflow-y-auto bg-sunken p-4">
      <h1 className="font-display text-3xl text-navy">Me</h1>
      {error && <p className="text-sm text-risk-critical">{error}</p>}

      <Card className="border-trust/30 bg-trust-bg p-4">
        <p className="flex items-center gap-2 text-sm font-medium text-trust">
          <Wallet className="h-4 w-4" aria-hidden /> Safe to spend until payday
        </p>
        <p className="mt-1 font-display text-4xl text-navy tabular-nums">{formatAUD(ctx.safe.amountCents)}</p>
        <p className="text-sm text-ink">{ctx.safe.explanation}</p>
      </Card>

      <p className="text-xs text-muted">
        <strong>My Financial Context.</strong> Everything here is something you told us. We never guess sensitive preferences. Change or remove anything.
      </p>

      <Section title="Payday" icon={<CalendarClock className="h-5 w-5 text-navy" aria-hidden />}>
        <div className="flex flex-wrap items-center justify-between gap-2 py-2">
          <label htmlFor="payday" className="text-sm">
            Next payday <span className="block text-xs text-muted">{until}</span>
          </label>
          <input
            id="payday"
            type="date"
            value={p.nextPayday}
            onChange={(e) => e.target.value && pref({ nextPayday: e.target.value })}
            className="h-9 rounded-md border border-line bg-surface px-2"
          />
        </div>
        <p className="py-1 text-sm">
          Expected income <span className="float-right tabular-nums">{formatAUD(p.expectedIncomeCents)}</span>
        </p>
      </Section>

      <Section title="Commitments" icon={<ReceiptText className="h-5 w-5 text-navy" aria-hidden />}>
        <ul className="divide-y divide-line">
          {ctx.commitments.map((c) => (
            <li key={c.id} className="py-2">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">
                  {c.name}
                  <span className="block text-xs font-normal text-muted">
                    {c.payeeName ? `to ${c.payeeName}` : "by card"} ·{" "}
                    {c.status === "paid" ? "paid this cycle" : c.status === "pending" ? "waiting for approval" : "due before payday"}
                  </span>
                </p>
                <button type="button" aria-label={`Remove ${c.name}`} onClick={() => call(`/api/me/commitments/${c.id}`, "DELETE")} className="rounded p-2 text-muted hover:bg-sunken">
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </div>
              <MoneyField label="Amount" cents={c.amountCents} onSave={(amountCents) => call(`/api/me/commitments/${c.id}`, "PATCH", { amountCents })} />
              {c.payeeId && (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={c.inPaydayPlan} onChange={(e) => call(`/api/me/commitments/${c.id}`, "PATCH", { inPaydayPlan: e.target.checked })} />
                  Part of my payday plan
                </label>
              )}
            </li>
          ))}
        </ul>
        <form
          className="mt-2 flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!newName.trim() || !newCents) return;
            call("/api/me/commitments", "POST", { name: newName.trim(), category: "other", amountCents: newCents });
            setNewName("");
            setNewAmount("");
          }}
        >
          <input aria-label="New commitment name" placeholder="Add a commitment (e.g. Gym)" value={newName} onChange={(e) => setNewName(e.target.value)} className="h-9 min-w-0 flex-1 rounded-md border border-line bg-surface px-2 text-sm" />
          <input aria-label="New commitment amount" placeholder="$" inputMode="decimal" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} className="h-9 w-20 rounded-md border border-line bg-surface px-2 text-right text-sm" />
          <Button size="sm" type="submit" variant="secondary" disabled={!newName.trim() || !newCents}>
            Add
          </Button>
        </form>
      </Section>

      <Section title="Savings and buffer" icon={<PiggyBank className="h-5 w-5 text-navy" aria-hidden />}>
        <MoneyField label="Savings goal each payday" cents={p.savingsTargetCents} onSave={(savingsTargetCents) => pref({ savingsTargetCents })} hint="0 to remove" />
        <div className="flex items-center justify-between gap-2 py-2">
          <label htmlFor="saver" className="text-sm">
            Preferred savings account
          </label>
          <select id="saver" value={p.preferredSavingsAccountId ?? ""} onChange={(e) => pref({ preferredSavingsAccountId: e.target.value || null })} className="h-9 rounded-md border border-line bg-surface px-2 text-sm">
            {ctx.accounts
              .filter((a) => a.kind === "savings")
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            <option value="">None</option>
          </select>
        </div>
        <MoneyField label="Minimum Everyday buffer" cents={p.minBufferCents} onSave={(minBufferCents) => pref({ minBufferCents })} hint="Never plan below this" />
      </Section>

      <h2 className="flex items-center gap-2 pt-2 font-display text-2xl text-navy">
        <Bot className="h-6 w-6" aria-hidden /> My AI Permissions
      </h2>
      <p className="text-xs text-muted">Your assistant works within these limits. They&apos;re checked by the bank&apos;s systems, not by the AI.</p>

      <Card className="p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <h3 className="font-semibold text-risk-low">Allowed</h3>
            <ul className="mt-1 space-y-1 text-sm">
              {ALLOWED.map((a) => (
                <li key={a} className="flex items-start gap-2">
                  <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-risk-low" aria-hidden />
                  {a}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-risk-critical">Never allowed</h3>
            <ul className="mt-1 space-y-1 text-sm">
              {RESTRICTED.map((a) => (
                <li key={a} className="flex items-start gap-2">
                  <Ban className="mt-0.5 h-4 w-4 shrink-0 text-risk-critical" aria-hidden />
                  {a}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-3 border-t border-line pt-2">
          <MoneyField label="Most the assistant can prepare at once" cents={p.aiMaxPrepareCents} onSave={(aiMaxPrepareCents) => pref({ aiMaxPrepareCents })} hint="Bigger payments: do them yourself" />
        </div>
      </Card>

      <Section title="Who the assistant can pay" icon={<Users className="h-5 w-5 text-navy" aria-hidden />}>
        <ul className="divide-y divide-line">
          {ctx.payees.map((y) => (
            <li key={y.id} className="flex items-center justify-between gap-2 py-2">
              <p className="text-sm">
                <UserRound className="mr-1 inline h-4 w-4 text-muted" aria-hidden />
                {y.name}
                <span className="block text-xs text-muted">
                  {y.verified ? "Verified" : "Not verified"} · {y.addedDaysAgo < 7 ? <span className="font-medium text-risk-high">added {y.addedDaysAgo === 0 ? "today" : `${y.addedDaysAgo} day${y.addedDaysAgo === 1 ? "" : "s"} ago`}</span> : `saved ${y.addedDaysAgo} days ago`}
                </span>
              </p>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={y.aiApproved} onChange={(e) => call(`/api/me/payees/${y.id}`, "PATCH", { aiApproved: e.target.checked })} />
                Allowed
              </label>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
