// Session Trust demo (Unit 33): a SIMULATED unfamiliar device tries to move money. Synthetic only: no real device
// fingerprinting or biometrics. The real trust engine (R10) decides; this just creates the event and its follow-up.
import "server-only";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { formatAUD } from "@/lib/money";
import { prepareTransfer } from "@/lib/banking/actions";
import { DEMO_PROFILE_ID } from "@/lib/banking/constants";
import { createIncident } from "@/lib/protect/incidents";

export const ATTACK = {
  to: "D. Mercer",
  fromAccount: "Goal Saver",
  amountCents: 250_000,
  session: { deviceKnown: false, newSession: true, label: "Android phone · Melbourne (simulated)" },
};

export async function simulateUnfamiliarDevice() {
  const request = `Send ${formatAUD(ATTACK.amountCents)} from ${ATTACK.fromAccount} to ${ATTACK.to}`;
  const action = await prepareTransfer({
    to: ATTACK.to,
    amountCents: ATTACK.amountCents,
    fromAccount: ATTACK.fromAccount,
    userMessages: [request], // what was typed in that session (not the customer's own chat)
    origin: "simulated_unfamiliar_device",
    session: ATTACK.session,
  });
  await audit("system", "session.flagged", "pending_action", action.id, { session: ATTACK.session.label, decision: action.status, signals: action.trace?.signals });

  if (action.status === "pending_approval") return { action, incidentId: null, notificationId: null };

  const what = `${formatAUD(ATTACK.amountCents)} from ${ATTACK.fromAccount} to ${ATTACK.to}`;
  const { id: incidentId } = await createIncident(
    {
      profileId: DEMO_PROFILE_ID,
      type: "session_risk",
      severity: "high",
      status: "open",
      title: `Unusual sign-in tried to send ${what}`,
      description: `A session on a device we don't recognise (${ATTACK.session.label}) tried to send ${what}. Signals: ${(action.trace?.signals ?? []).join("; ")}. Decision: ${action.status}.`,
      actionId: action.id,
      measures: [`Payment ${action.status === "held" ? "held" : "blocked"}`, "Customer asked to confirm"],
    },
    "trust_engine",
  );
  const { data: note, error } = await db()
    .from("notifications")
    .insert({
      profile_id: DEMO_PROFILE_ID,
      kind: "session_alert",
      title: "Was this you?",
      body: `A device we don't recognise (${ATTACK.session.label}) tried to send ${what}. We've put it on hold.`,
    })
    .select("id")
    .single();
  if (error) throw error;
  await audit("trust_engine", "notification.sent", "notification", note.id, { kind: "session_alert", actionId: action.id });
  return { action, incidentId, notificationId: note.id as string };
}
