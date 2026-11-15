"use client";

import { ArrowRightLeft, CircleCheck, OctagonX, ShieldCheck, ShoppingBag, TriangleAlert, Zap } from "lucide-react";
import { WhyTrace } from "./WhyTrace";
import { Button } from "@/components/ui/Button";
import { Money } from "@/components/ui/Money";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { formatAUD } from "@/lib/money";
import type { PreparedAction } from "@/lib/banking/actions";

export type ReceiptStatus = "pending_approval" | "completed" | "cancelled" | "held" | "blocked" | "expired";

const time = new Intl.DateTimeFormat("en-AU", { hour: "numeric", minute: "2-digit" });
const at = (iso: string) => time.format(new Date(iso));

function whySentence(a: PreparedAction) {
  if (a.type === "purchase") return `You asked for this, the price comes from ${a.toName}'s catalogue, and your card is active.`;
  const recipient =
    a.recipientKind === "own_account"
      ? `${a.toName} is your own account`
      : a.recipientKind === "biller"
        ? `${a.toName} is a saved biller`
        : `${a.toName} is a saved payee`;
  return `You asked for this, ${recipient}, and the money is there.`;
}

export function TrustReceipt({
  action: a,
  status,
  completedAt,
  note,
  onApprove,
  onCancel,
}: {
  action: PreparedAction;
  status: ReceiptStatus;
  completedAt?: string | null;
  note?: string;
  onApprove: () => void;
  onCancel: () => void;
}) {
  const purchase = a.type === "purchase";
  const summary = `${formatAUD(a.amountCents)} ${purchase ? "at" : "to"} ${a.toName}`;

  if (status === "completed")
    return (
      <p className="flex animate-rise items-center gap-2 rounded-xl border border-line bg-surface px-4 py-3 text-sm shadow-sm">
        <CircleCheck className="h-4 w-4 shrink-0 text-risk-low" aria-hidden />
        <span>
          <span className="font-semibold tabular-nums">{summary}</span>
          {" · Completed"}
          {completedAt && ` ${at(completedAt)}`}
        </span>
      </p>
    );

  if (status === "cancelled" || status === "expired")
    return (
      <p className="animate-rise rounded-xl border border-line bg-surface px-4 py-3 text-sm text-muted">
        {summary} · {status === "cancelled" ? "Cancelled" : "Expired — ask again"}
        {note && <span className="block text-xs">{note}</span>}
      </p>
    );

  const blocked = status === "blocked";
  const isBill = a.recipientKind === "biller";
  const Icon = purchase ? ShoppingBag : isBill ? Zap : ArrowRightLeft;

  return (
    <article
      aria-label={blocked ? "Blocked action" : "Trust Receipt"}
      className={`animate-rise overflow-hidden rounded-xl border bg-surface shadow-sm ${blocked ? "border-risk-critical" : "border-line"}`}
    >
      <header
        className={`flex items-center justify-between gap-2 px-4 py-2 text-sm font-medium ${
          blocked ? "bg-risk-critical-bg text-risk-critical" : "bg-trust-bg text-trust"
        }`}
      >
        <span className="flex items-center gap-1.5">
          {blocked ? <OctagonX className="h-4 w-4" aria-hidden /> : <ShieldCheck className="h-4 w-4" aria-hidden />}
          {blocked ? "Blocked" : "TrustPath · Trust Receipt"}
        </span>
        <RiskBadge level={a.riskLevel} />
      </header>

      <div className="space-y-3 p-4">
        <div>
          <p className="flex items-center gap-1.5 text-sm text-muted">
            <Icon className="h-4 w-4" aria-hidden />
            {purchase ? "Purchase" : isBill ? "Bill payment" : "Transfer"}
          </p>
          <Money cents={a.amountCents} className="text-2xl" />
        </div>

        <dl className="grid grid-cols-[4rem_1fr] gap-x-2 gap-y-1 text-sm">
          <dt className="text-muted">To</dt>
          <dd>
            {a.toName}
            {purchase && ` — ${a.productName}`}
            {a.recipientKind === "own_account" && <span className="text-muted"> (your account)</span>}
          </dd>
          <dt className="text-muted">{purchase ? "Pay with" : "From"}</dt>
          <dd>{purchase ? `Debit card •••• ${a.cardLastFour} (${a.fromName})` : a.fromName}</dd>
          {!blocked && (
            <>
              <dt className="text-muted">Checks</dt>
              <dd>
                <ul className="space-y-0.5 text-trust">
                  {a.checks.requestedByYou && <Check>Requested by you</Check>}
                  {purchase ? (
                    <Check>{`Price from ${a.toName}'s catalogue`}</Check>
                  ) : (
                    a.checks.recipientKnown && <Check>{a.recipientKind === "own_account" ? "Recipient is yours" : "Saved payee"}</Check>
                  )}
                  {a.checks.cardActive && <Check>Card active</Check>}
                  {a.checks.fundsAvailable && <Check>Funds available</Check>}
                </ul>
              </dd>
            </>
          )}
        </dl>

        {a.reasons.length > 0 && (
          <ul
            className={`space-y-1 rounded-md p-2 text-sm ${
              blocked ? "bg-risk-critical-bg text-risk-critical" : status === "held" ? "bg-risk-high-bg text-risk-high" : "bg-risk-medium-bg text-risk-medium"
            }`}
          >
            {a.reasons.map((r) => (
              <li key={r} className="flex items-start gap-1.5">
                {blocked ? <OctagonX className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> : <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />}
                {r}
              </li>
            ))}
          </ul>
        )}

        {status === "held" && <p className="text-sm font-medium text-risk-high">Held for review by our team.</p>}

        {a.trace && <WhyTrace trace={a.trace} />}

        {status === "pending_approval" && (
          <>
            <p className="text-sm">
              <span className="font-medium">Why it can proceed: </span>
              {whySentence(a)}
            </p>
            {note && <p className="text-sm text-risk-critical">{note}</p>}
            <div className="flex justify-between gap-3">
              <Button variant="secondary" onClick={onCancel}>
                Cancel
              </Button>
              <Button onClick={onApprove}>Approve with PIN</Button>
            </div>
            <p className="text-xs text-muted">Simulated device check · expires at {at(a.expiresAt)}</p>
          </>
        )}
      </div>
    </article>
  );
}

function Check({ children }: { children: string }) {
  return (
    <li className="flex items-center gap-1.5">
      <CircleCheck className="h-4 w-4" aria-hidden />
      {children}
    </li>
  );
}
