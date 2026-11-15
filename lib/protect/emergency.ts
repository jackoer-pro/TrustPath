// Emergency protection (architecture.md → Emergency Protection). Security-sensitive.
// Only ever restricts: it can lock and pause, never unlock, approve or move money.
// Lifting is staff-only via the resolve route (invariant 8).
import "server-only";
import { db } from "@/lib/db";
import { audit, type Actor } from "@/lib/audit";
import { createIncident } from "@/lib/protect/incidents";

export type EmergencyResult = {
  incidentId: string;
  cardsLocked: number;
  actionsCancelled: number;
  measures: { label: string; done: boolean }[];
};

const LINKED = "Linked to emergency case";

export async function activate(profileId: string, statement: string, actor: Actor = "ai_agent"): Promise<EmergencyResult> {
  const sb = db();

  const { data: profile, error: pErr } = await sb.from("profiles").select("emergency_since").eq("id", profileId).single();
  if (pErr) throw pErr;
  const { error: fErr } = await sb
    .from("profiles")
    .update({ outgoing_paused: true, new_payees_blocked: true, emergency_since: profile.emergency_since ?? new Date().toISOString() })
    .eq("id", profileId);
  if (fErr) throw fErr;

  const { data: cards, error: cErr } = await sb.from("cards").update({ status: "locked" }).eq("profile_id", profileId).neq("status", "locked").select("id");
  if (cErr) throw cErr;
  const { data: actions, error: aErr } = await sb
    .from("pending_actions")
    .update({ status: "cancelled" })
    .eq("profile_id", profileId)
    .eq("status", "pending_approval")
    .select("id");
  if (aErr) throw aErr;

  const measures = [
    "All cards locked",
    "New outgoing transfers paused",
    "New payees blocked",
    actions.length ? `Pending approvals cancelled (${actions.length})` : "No pending approvals to cancel",
    "Critical case opened with our fraud team",
  ];

  // One open account_compromise case per profile: escalate it rather than open a second.
  const { data: existing, error: eErr } = await sb
    .from("incidents")
    .select("id, measures")
    .eq("profile_id", profileId)
    .eq("type", "account_compromise")
    .neq("status", "investigated")
    .maybeSingle();
  if (eErr) throw eErr;
  let incidentId: string;
  if (existing) {
    incidentId = existing.id;
    const { error } = await sb
      .from("incidents")
      .update({ severity: "critical", status: "contained", measures: [...(existing.measures as string[]), "Emergency protection re-applied"] })
      .eq("id", incidentId);
    if (error) throw error;
    await audit(actor, "incident.escalated", "incident", incidentId, { statement });
  } else {
    const created = await createIncident(
      {
        profileId,
        type: "account_compromise",
        severity: "critical",
        status: "contained",
        title: "Possible account compromise",
        description: `Customer said: "${statement.slice(0, 500)}"`,
        measures,
      },
      actor,
    );
    incidentId = created.id;
  }

  // Link open card-fraud cases to the emergency case.
  const { data: fraud, error: frErr } = await sb
    .from("incidents")
    .select("id, measures")
    .eq("profile_id", profileId)
    .eq("type", "card_fraud")
    .neq("status", "investigated");
  if (frErr) throw frErr;
  for (const f of fraud) {
    const m = f.measures as string[];
    if (m.includes(LINKED)) continue;
    const { error } = await sb.from("incidents").update({ measures: [...m, LINKED] }).eq("id", f.id);
    if (error) throw error;
  }

  await audit(actor, "emergency.activated", "profile", profileId, { incidentId, cardsLocked: cards.length, actionsCancelled: actions.length });
  for (const c of cards) await audit(actor, "card.locked", "card", c.id, { reason: "emergency" });
  for (const a of actions) await audit(actor, "action.cancelled", "pending_action", a.id, { reason: "emergency" });

  return { incidentId, cardsLocked: cards.length, actionsCancelled: actions.length, measures: measures.map((label) => ({ label, done: true })) };
}
