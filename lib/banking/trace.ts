// The decision trace (Unit 34): one explanation shared by the customer ("Why?") and staff (Session Trust timeline).
// Pure: no DB, no framework. Built when an action is assessed and stored on pending_actions.trace.
import type { Assessment, SessionInfo } from "../trust/policy.ts";

export type IntentSource = "customer" | "app" | "saved_plan" | "external" | "unfamiliar_session";
export type DecisionTrace = {
  /** Where the request came from: the customer's own words, a tap, the saved plan, external content or another session. */
  intent: { source: IntentSource; label: string; text: string | null };
  session: SessionInfo;
  transaction: { type: "transfer" | "purchase"; amount: string; from: string; to: string; notes: string[] };
  signals: string[];
  rules: { id: string; decision: string; reason: string }[];
  decision: Assessment["decision"];
  outcome: string;
  at: string;
};

export const REGISTERED_SESSION: SessionInfo = { deviceKnown: true, newSession: false, label: "Alex's iPhone (registered, simulated)" };

const OUTCOME: Record<Assessment["decision"], string> = {
  allow: "Ready for your approval",
  step_up: "Waiting for your approval with your PIN",
  hold: "Held for review by our team; it can't be approved",
  block: "Blocked; it can't go ahead",
};

export const INTENT_LABEL: Record<IntentSource, string> = {
  customer: "Your own words in chat",
  app: "You tapped Buy in the app",
  saved_plan: "Your saved payday plan",
  external: "Instruction from external content (not from you)",
  unfamiliar_session: "A session on a device we don't recognise",
};

export function buildTrace(input: {
  source: IntentSource;
  text: string | null;
  session: SessionInfo;
  transaction: DecisionTrace["transaction"];
  verdict: Assessment;
}): DecisionTrace {
  return {
    intent: { source: input.source, label: INTENT_LABEL[input.source], text: input.text },
    session: input.session,
    transaction: input.transaction,
    signals: input.verdict.sessionSignals,
    rules: input.verdict.rules.map((r) => ({ id: r.id, decision: r.decision, reason: r.reason })),
    decision: input.verdict.decision,
    outcome: OUTCOME[input.verdict.decision],
    at: new Date().toISOString(),
  };
}
