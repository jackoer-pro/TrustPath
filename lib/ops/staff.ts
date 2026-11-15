// Bank staff actions (architecture.md → Bank staff). Security-sensitive: the ONLY code that unlocks cards or lifts
// emergency restrictions (invariant 8). Never imported by lib/ai; routes require the demo key.
import "server-only";
import { db } from "@/lib/db";
import { AppError } from "@/lib/http";
import { audit } from "@/lib/audit";

export const REVIEWER = "demo-specialist";
const LINK_WINDOW_MS = 3600_000;

async function loadIncident(id: string) {
  const { data, error } = await db().from("incidents").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) throw new AppError("NOT_FOUND", "Incident not found.", 404);
  return data;
}

const reviewed = () => ({ status: "investigated", reviewed_by: REVIEWER, reviewed_at: new Date().toISOString() });

export async function reviewIncident(id: string) {
  await loadIncident(id);
  const { data, error } = await db().from("incidents").update(reviewed()).eq("id", id).neq("status", "investigated").select("*");
  if (error) throw error;
  if (!data.length) throw new AppError("ALREADY_INVESTIGATED", "This case is already marked investigated.", 409);
  await audit("bank_staff", "incident.reviewed", "incident", id, { reviewedBy: REVIEWER });
  return { incident: data[0] };
}

export async function resolveIncident(id: string) {
  const sb = db();
  const incident = await loadIncident(id);
  if (incident.type !== "card_fraud" && incident.type !== "account_compromise")
    throw new AppError("NOT_RESOLVABLE", "Only card fraud and account compromise cases have restrictions to lift.", 409);
  const profileId = incident.profile_id as string;

  const { data: profile, error: pErr } = await sb.from("profiles").select("outgoing_paused, new_payees_blocked").eq("id", profileId).single();
  if (pErr) throw pErr;
  const restrictionsLifted = profile.outgoing_paused || profile.new_payees_blocked;
  const { error: fErr } = await sb.from("profiles").update({ outgoing_paused: false, new_payees_blocked: false, emergency_since: null }).eq("id", profileId);
  if (fErr) throw fErr;
  if (restrictionsLifted) await audit("bank_staff", "restrictions.lifted", "profile", profileId, { incidentId: id });

  // Lost cards stay locked: they need a replacement, not an unlock.
  const { data: cards, error: cErr } = await sb
    .from("cards")
    .update({ status: "active" })
    .eq("profile_id", profileId)
    .neq("status", "active")
    .eq("reported_lost", false)
    .select("id, last_four");
  if (cErr) throw cErr;
  for (const c of cards) await audit("bank_staff", "card.unlocked", "card", c.id, { incidentId: id });

  // Close this case and the open cases around it (same customer, within an hour either side).
  const at = Date.parse(incident.created_at);
  const { data: closed, error: iErr } = await sb
    .from("incidents")
    .update(reviewed())
    .eq("profile_id", profileId)
    .neq("status", "investigated")
    .gte("created_at", new Date(at - LINK_WINDOW_MS).toISOString())
    .lte("created_at", new Date(at + LINK_WINDOW_MS).toISOString())
    .select("id");
  if (iErr) throw iErr;
  await audit("bank_staff", "incident.resolved", "incident", id, { reviewedBy: REVIEWER, casesClosed: closed.map((c) => c.id), cardsUnlocked: cards.length });

  return { incidentId: id, cardsUnlocked: cards.map((c) => c.last_four as string), restrictionsLifted, casesClosed: closed.length };
}
