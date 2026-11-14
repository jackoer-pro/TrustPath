// Card fraud signals and decision matrix (architecture.md → Fraud Rules).
// Pure: no DB, no framework, and never imports lib/ai — the fraud pathway is independent of chat (invariant 7).
import { formatAUD } from "../money.ts";

export type Channel = "ecommerce" | "in_store";
export type CardStatus = "active" | "temporarily_locked" | "locked";
export type SignalLevel = "medium" | "high" | "critical";
export type FraudDecision = "approved" | "declined" | "review";
export type CardAction = "none" | "temporarily_locked";

export type CardAttempt = { amountCents: number; merchant: string; channel: Channel };
export type FraudContext = {
  card: { status: CardStatus; reportedLost: boolean };
  /** The card's last 20 approved events. */
  history: { merchant: string; amountCents: number }[];
  /** Attempts on this card in the last 10 minutes, not counting this one. */
  recentAttempts: number;
};
export type Signal = {
  code: "card_unavailable" | "unusual_amount" | "rapid_repeats" | "new_merchant" | "card_not_present";
  level: SignalLevel;
  reason: string;
};
export type FraudAssessment = {
  decision: FraudDecision;
  riskLevel: "low" | SignalLevel;
  cardAction: CardAction;
  newMerchant: boolean;
  signals: Signal[];
};

export const UNUSUAL_MULTIPLIER = 10;
export const UNUSUAL_FLOOR_CENTS = 50_000;
export const RAPID_REPEAT_COUNT = 3;
const RANK = { low: 0, medium: 1, high: 2, critical: 3 } as const;

export function assessCardAttempt(attempt: CardAttempt, ctx: FraudContext): FraudAssessment {
  const signals: Signal[] = [];
  const recent = ctx.history.slice(0, 20);
  const avg = recent.length ? Math.round(recent.reduce((s, h) => s + h.amountCents, 0) / recent.length) : 0;
  const threshold = Math.max(UNUSUAL_MULTIPLIER * avg, UNUSUAL_FLOOR_CENTS);
  const known = new Set(ctx.history.map((h) => h.merchant.trim().toLowerCase()));
  const newMerchant = !known.has(attempt.merchant.trim().toLowerCase());

  if (ctx.card.status !== "active" || ctx.card.reportedLost)
    signals.push({
      code: "card_unavailable",
      level: "critical",
      reason: ctx.card.reportedLost ? "Card is reported lost." : `Card is ${ctx.card.status.replace("_", " ")}.`,
    });
  if (attempt.amountCents > threshold)
    signals.push({
      code: "unusual_amount",
      level: "high",
      reason: avg
        ? `Unusual amount: ${formatAUD(attempt.amountCents)} is over ${UNUSUAL_MULTIPLIER}× this card's average of ${formatAUD(avg)} (threshold ${formatAUD(threshold)}).`
        : `Unusual amount: ${formatAUD(attempt.amountCents)} is over the ${formatAUD(threshold)} threshold for a card with no history.`,
    });
  if (ctx.recentAttempts + 1 >= RAPID_REPEAT_COUNT)
    signals.push({ code: "rapid_repeats", level: "high", reason: `Rapid repeats: ${ctx.recentAttempts + 1} attempts on this card in 10 minutes.` });
  if (newMerchant) signals.push({ code: "new_merchant", level: "medium", reason: `New merchant: ${attempt.merchant} isn't in this card's history.` });
  if (newMerchant && attempt.channel === "ecommerce")
    signals.push({ code: "card_not_present", level: "medium", reason: "Card not present: online payment at a new merchant." });

  const has = (level: SignalLevel) => signals.some((s) => s.level === level);
  const highs = signals.filter((s) => s.level === "high").length;
  const [decision, cardAction]: [FraudDecision, CardAction] = has("critical")
    ? ["declined", "none"] // already locked or lost
    : highs > 0 && signals.length > 1
      ? ["declined", "temporarily_locked"]
      : highs > 0
        ? ["review", "none"]
        : ["approved", "none"];
  const riskLevel = signals.reduce<FraudAssessment["riskLevel"]>((max, s) => (RANK[s.level] > RANK[max] ? s.level : max), "low");
  return { decision, riskLevel, cardAction, newMerchant, signals };
}
