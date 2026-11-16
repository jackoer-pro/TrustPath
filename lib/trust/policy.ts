// Deterministic trust policy (architecture.md → Trust Engine Rules). Pure: no DB, no framework imports.
// Every rule that fires is recorded with its id, so the customer and staff see the same explanation ("Why?").
import type { Provenance } from "./provenance.ts";
import { formatAUD } from "../money.ts";

export type Decision = "allow" | "step_up" | "hold" | "block";
export type RiskLevel = "low" | "medium" | "high" | "critical";

export type PolicyAction = { type: "transfer" | "purchase"; amountCents: number };

/** Synthetic session facts for the demo (never real device fingerprinting or biometrics). */
export type SessionInfo = { deviceKnown: boolean; newSession: boolean; label: string };

export type PolicyContext = {
  outgoingPaused: boolean;
  sourceBalanceCents: number;
  /** Transfers: the resolved recipient, or null when `to` didn't resolve. Purchases: null. */
  recipient: { kind: "own_account" | "person" | "biller"; verified: boolean; addedDaysAgo?: number } | null;
  /** Purchases only. */
  cardStatus?: "active" | "temporarily_locked" | "locked";
  provenance: Provenance;
  /** CoachGuard: a recent assessment of a message the customer shared. Evidence only; the decision is made here. */
  coaching?: { strong: boolean; summary: string } | null;
  /** R9 AI mandate: only when the assistant (or an agent) prepares the action, not when the customer taps it themselves. */
  mandate?: { agent: boolean; maxPrepareCents: number; recipientApproved: boolean | null } | null;
  /** R9 buffer: when paying from the account the customer set a minimum buffer on. */
  buffer?: { bufferCents: number; balanceAfterCents: number } | null;
  /** R10 session trust. */
  session?: SessionInfo | null;
  /** The customer's usual largest outgoing payment (R10 "unusual amount"). */
  usualMaxCents?: number;
  /** R11: this biller was already paid this calendar month, or a payment to it is already waiting for approval. */
  duplicateBill?: { payeeName: string; paid?: { amountCents: number; on: string }; pending?: boolean } | null;
};

export type RuleId = "R1" | "R2" | "R3" | "R4" | "R5" | "R6" | "R7" | "R8" | "R9" | "R10" | "R11";
export type RuleHit = { id: RuleId; decision: Decision; risk: RiskLevel; reason: string };

export type Assessment = {
  decision: Decision;
  riskLevel: RiskLevel;
  reasons: string[];
  flags: "injection_suspected"[];
  /** Every rule that fired, in order (for the decision trace). */
  rules: RuleHit[];
  /** R10 session-risk signals, in plain words (empty when the session looks normal). */
  sessionSignals: string[];
};

export const LARGE_AMOUNT_CENTS = 200_000;
/** A payee added within this many days counts as new (R8, R10). */
export const NEW_PAYEE_DAYS = 7;
/** R10: an amount this many times the customer's usual largest payment is unusual. */
export const UNUSUAL_MULTIPLE = 3;

const RANK: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2, critical: 3 };

type Hit = Omit<RuleHit, "id">;

/** R8 on its own, so CoachGuard can re-check payments that were prepared before the message was shared. */
export function coachingHit(action: PolicyAction, ctx: Pick<PolicyContext, "recipient" | "coaching">): Hit | null {
  if (action.type !== "transfer" || !ctx.coaching?.strong || ctx.recipient?.kind === "own_account") return null;
  const isNew = !ctx.recipient || (ctx.recipient.addedDaysAgo ?? Infinity) < NEW_PAYEE_DAYS;
  return isNew
    ? {
        decision: "hold",
        risk: "high",
        reason: `Possible scam coaching: ${ctx.coaching.summary}. This payee is new, so our team will check with you before it goes ahead.`,
      }
    : { decision: "step_up", risk: "medium", reason: `Possible scam coaching: ${ctx.coaching.summary}. Only approve if you're sure.` };
}

/**
 * R10 session trust. Proportionate: an unfamiliar device alone only asks for an extra check (it never proves a
 * compromise); several signals together hold the payment. Never claims who is using the device.
 */
export function sessionRisk(action: PolicyAction, ctx: Pick<PolicyContext, "session" | "recipient" | "usualMaxCents">): { hit: Hit | null; signals: string[] } {
  const s = ctx.session;
  if (!s) return { hit: null, signals: [] };
  const signals: string[] = [];
  let score = 0;
  if (!s.deviceKnown) {
    score += 2;
    signals.push(`a device we don't recognise (${s.label})`);
  }
  if (s.newSession) {
    score += 1;
    signals.push("a brand-new sign-in");
  }
  const payeeAge = ctx.recipient && ctx.recipient.kind !== "own_account" ? ctx.recipient.addedDaysAgo : undefined;
  if (payeeAge !== undefined && payeeAge < NEW_PAYEE_DAYS) {
    score += 2;
    signals.push(`a payee added ${payeeAge < 1 ? "today" : `${Math.floor(payeeAge)} day${Math.floor(payeeAge) === 1 ? "" : "s"} ago`}`);
  }
  if (ctx.usualMaxCents && action.amountCents > UNUSUAL_MULTIPLE * ctx.usualMaxCents) {
    score += 2;
    signals.push(`${(action.amountCents / ctx.usualMaxCents).toFixed(0)}× your usual largest payment of ${formatAUD(ctx.usualMaxCents)}`);
  }
  const list = signals.length < 2 ? signals.join("") : `${signals.slice(0, -1).join(", ")} and ${signals.at(-1)}`;
  if (score >= 5)
    return {
      signals,
      hit: { decision: "hold", risk: "high", reason: `Unusual sign-in activity: ${list}. We've put this on hold until we hear from you.` },
    };
  if (score >= 2) return { signals, hit: { decision: "step_up", risk: "medium", reason: `Extra check needed: ${list}.` } };
  return { signals, hit: null };
}

/** Every rule is evaluated so reasons are complete; any block wins, then any hold, else step-up (every action needs approval). */
export function assess(action: PolicyAction, ctx: PolicyContext): Assessment {
  const hits: RuleHit[] = [];
  const flags: Assessment["flags"] = [];
  const own = ctx.recipient?.kind === "own_account";
  const add = (id: RuleId, h: Hit) => hits.push({ id, ...h });

  // R1 Emergency mode (always takes precedence: it blocks)
  if (ctx.outgoingPaused) add("R1", { decision: "block", risk: "critical", reason: "Outgoing payments are paused while emergency protection is on." });
  // R2 Intent provenance (no customer intent record → rejected)
  if (!ctx.provenance.amountOk || !ctx.provenance.recipientOk) {
    add("R2", { decision: "block", risk: "high", reason: "This instruction didn't come from you." });
    flags.push("injection_suspected");
  }
  // R3 Unknown recipient
  if (action.type === "transfer" && !ctx.recipient) add("R3", { decision: "block", risk: "high", reason: "New payees can't be added by the assistant." });
  // R4 Card unavailable
  if (action.type === "purchase" && ctx.cardStatus !== "active")
    add("R4", { decision: "block", risk: "high", reason: "Your card is locked, so purchases can't go through." });
  // R5 Insufficient funds
  if (action.amountCents > ctx.sourceBalanceCents) add("R5", { decision: "block", risk: "medium", reason: "There isn't enough money in that account." });
  // R6 Large amount (own-account transfers exempt)
  if (!own && (action.amountCents > LARGE_AMOUNT_CENTS || action.amountCents * 2 > ctx.sourceBalanceCents))
    add("R6", {
      decision: "hold",
      risk: "high",
      // Say which condition fired: a $120 bill isn't "large", but it can be more than half of what's left.
      reason:
        action.amountCents > LARGE_AMOUNT_CENTS
          ? "This is a large payment, so our team will review it first."
          : "This is more than half of what's in the account, so our team will check it with you first.",
    });
  // R7 Unverified payee
  if (ctx.recipient && !ctx.recipient.verified) add("R7", { decision: "step_up", risk: "medium", reason: "This payee hasn't been verified yet." });
  // R8 Scam coaching (CoachGuard): strong signs + a new or unknown recipient → hold; an established payee → warning.
  const coaching = coachingHit(action, ctx);
  if (coaching) add("R8", coaching);
  // R9 AI mandate (customer-controlled, enforced here, not in the interface)
  const m = ctx.mandate;
  if (m?.agent && action.amountCents > m.maxPrepareCents)
    add("R9", {
      decision: "block",
      risk: "high",
      reason: `This is above the ${formatAUD(m.maxPrepareCents)} limit you set for your assistant. Raise it in My AI Permissions, or make the payment yourself.`,
    });
  if (m?.agent && !own && m.recipientApproved === false)
    add("R9", { decision: "block", risk: "high", reason: "You haven't allowed your assistant to pay this payee. You can change that in My AI Permissions." });
  if (ctx.buffer && ctx.buffer.balanceAfterCents < ctx.buffer.bufferCents)
    add("R9", {
      decision: "step_up",
      risk: "medium",
      reason: `This would leave ${formatAUD(Math.max(ctx.buffer.balanceAfterCents, 0))} in the account, below your ${formatAUD(ctx.buffer.bufferCents)} minimum buffer.`,
    });
  // R11 Bills once a month: a second payment to the same biller in a calendar month is almost always a mistake.
  const dup = ctx.duplicateBill;
  if (action.type === "transfer" && dup)
    add("R11", {
      decision: "block",
      risk: "medium",
      reason: dup.paid
        ? `Already paid this month: you paid ${dup.payeeName} ${formatAUD(dup.paid.amountCents)} on ${dup.paid.on}. Bills are paid once a month, so this second payment is stopped.`
        : `A payment to ${dup.payeeName} is already waiting for your approval. Bills are paid once a month, so this second one is stopped.`,
    });
  // R10 Session trust
  const session = sessionRisk(action, ctx);
  if (session.hit) add("R10", session.hit);

  const decision: Decision = hits.some((h) => h.decision === "block")
    ? "block"
    : hits.some((h) => h.decision === "hold")
      ? "hold"
      : "step_up";
  const riskLevel = hits.reduce<RiskLevel>((max, h) => (RANK[h.risk] > RANK[max] ? h.risk : max), "low");
  // The customer reads reasons most-decisive first (blocks, then holds, then warnings); the trace keeps rule order.
  const WEIGHT: Record<Decision, number> = { block: 0, hold: 1, step_up: 2, allow: 3 };
  const reasons = [...hits].sort((a, b) => WEIGHT[a.decision] - WEIGHT[b.decision]).map((h) => h.reason);
  return { decision, riskLevel, reasons, flags, rules: hits, sessionSignals: session.signals };
}
