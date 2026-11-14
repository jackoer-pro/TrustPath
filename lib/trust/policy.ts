// Deterministic trust policy (architecture.md → Trust Engine Rules). Pure: no DB, no framework imports.
import type { Provenance } from "./provenance.ts";

export type Decision = "allow" | "step_up" | "hold" | "block";
export type RiskLevel = "low" | "medium" | "high" | "critical";

export type PolicyAction = { type: "transfer" | "purchase"; amountCents: number };

export type PolicyContext = {
  outgoingPaused: boolean;
  sourceBalanceCents: number;
  /** Transfers: the resolved recipient, or null when `to` didn't resolve. Purchases: null. */
  recipient: { kind: "own_account" | "person" | "biller"; verified: boolean } | null;
  /** Purchases only. */
  cardStatus?: "active" | "temporarily_locked" | "locked";
  provenance: Provenance;
};

export type Assessment = {
  decision: Decision;
  riskLevel: RiskLevel;
  reasons: string[];
  flags: "injection_suspected"[];
};

export const LARGE_AMOUNT_CENTS = 200_000;

const RANK: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2, critical: 3 };

/** Every rule is evaluated so reasons are complete; any block wins, then any hold, else step-up (every action needs approval). */
export function assess(action: PolicyAction, ctx: PolicyContext): Assessment {
  const hits: { decision: Decision; risk: RiskLevel; reason: string }[] = [];
  const flags: Assessment["flags"] = [];
  const own = ctx.recipient?.kind === "own_account";

  // R1 Emergency mode
  if (ctx.outgoingPaused)
    hits.push({ decision: "block", risk: "critical", reason: "Outgoing payments are paused while emergency protection is on." });
  // R2 Intent provenance
  if (!ctx.provenance.amountOk || !ctx.provenance.recipientOk) {
    hits.push({ decision: "block", risk: "high", reason: "This instruction didn't come from you." });
    flags.push("injection_suspected");
  }
  // R3 Unknown recipient
  if (action.type === "transfer" && !ctx.recipient)
    hits.push({ decision: "block", risk: "high", reason: "New payees can't be added by the assistant." });
  // R4 Card unavailable
  if (action.type === "purchase" && ctx.cardStatus !== "active")
    hits.push({ decision: "block", risk: "high", reason: "Your card is locked, so purchases can't go through." });
  // R5 Insufficient funds
  if (action.amountCents > ctx.sourceBalanceCents)
    hits.push({ decision: "block", risk: "medium", reason: "There isn't enough money in that account." });
  // R6 Large amount (own-account transfers exempt)
  if (!own && (action.amountCents > LARGE_AMOUNT_CENTS || action.amountCents * 2 > ctx.sourceBalanceCents))
    hits.push({ decision: "hold", risk: "high", reason: "This is a large payment, so our team will review it first." });
  // R7 Unverified payee
  if (ctx.recipient && !ctx.recipient.verified)
    hits.push({ decision: "step_up", risk: "medium", reason: "This payee hasn't been verified yet." });

  const decision: Decision = hits.some((h) => h.decision === "block")
    ? "block"
    : hits.some((h) => h.decision === "hold")
      ? "hold"
      : "step_up";
  const riskLevel = hits.reduce<RiskLevel>((max, h) => (RANK[h.risk] > RANK[max] ? h.risk : max), "low");
  return { decision, riskLevel, reasons: hits.map((h) => h.reason), flags };
}
