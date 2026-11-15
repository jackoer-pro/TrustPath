// Case brief shape, facts and the deterministic template. Pure: no DB, no framework.
import { formatAUD } from "../money.ts";

export type CaseBrief = { summary: string; timeline: string[]; measures: string[]; nextStep: string; source: "ai" | "template" };

export type CaseFacts = {
  incident: { type: "card_fraud" | "account_compromise" | "injection_blocked"; severity: string; status: string; title: string; description: string; measures: string[] };
  cardEvent?: { merchant: string; amountCents: number; channel: string; decision: string; reasons: string[]; cardAction: string; cardLastFour: string };
  action?: { amountCents: number; to: string; status: string; origin: string; reasons: string[] };
  customerResponse?: "confirmed" | "denied" | null;
  /** Other incidents for the same customer in the last hour, oldest first. */
  related: { type: string; title: string; severity: string }[];
};

const NEXT_STEP = {
  card_fraud: {
    denied: "Customer says it wasn't them: keep the card locked, issue a replacement card and check for other attempts on the account.",
    confirmed: "Customer confirmed the payment: review the event and unlock the card if you're satisfied.",
    none: "Wait for the customer's answer to \"Was this you?\", or call them on their registered number.",
  },
  account_compromise:
    "Call the customer on their registered number, confirm their identity, reset their credentials, then lift the restrictions once the account is safe.",
  injection_blocked: "No customer action needed. Review the merchant's page content and consider flagging the merchant.",
};

export function templateBrief(f: CaseFacts): CaseBrief {
  const { incident: i, cardEvent: e, action: a } = f;
  const timeline: string[] = [];
  for (const r of f.related) timeline.push(`Earlier: ${r.title} (${r.severity}).`);

  let summary: string;
  let nextStep: string;
  if (i.type === "card_fraud" && e) {
    summary = `The fraud engine ${e.decision} a ${formatAUD(e.amountCents)} ${e.channel === "ecommerce" ? "online" : "in-store"} payment at ${e.merchant} on card •••• ${e.cardLastFour}.`;
    timeline.push(`Card attempt: ${e.merchant} ${formatAUD(e.amountCents)} → ${e.decision}. ${e.reasons.join(" ")}`);
    if (e.cardAction === "temporarily_locked") timeline.push("Card temporarily locked by the fraud engine.");
    timeline.push("Customer sent \"Was this you?\".");
    if (f.customerResponse) timeline.push(f.customerResponse === "denied" ? "Customer said it wasn't them." : "Customer confirmed the payment.");
    nextStep = NEXT_STEP.card_fraud[f.customerResponse ?? "none"];
  } else if (i.type === "account_compromise") {
    summary = `The customer reported a possible account compromise and emergency protection was applied. ${i.description}`;
    timeline.push("Customer reported the compromise in chat; the assistant turned on emergency protection.");
    nextStep = NEXT_STEP.account_compromise;
  } else {
    summary = a
      ? `A ${formatAUD(a.amountCents)} transfer to ${a.to} was ${a.status} because it didn't come from the customer (${a.origin.replaceAll("_", " ")}).`
      : i.description;
    if (a) timeline.push(`Prepared ${formatAUD(a.amountCents)} to ${a.to} → ${a.status}. ${a.reasons.join(" ")}`);
    else timeline.push("Hidden instructions were removed before the assistant read the page.");
    nextStep = NEXT_STEP.injection_blocked;
  }
  return { summary, timeline, measures: i.measures, nextStep, source: "template" };
}
