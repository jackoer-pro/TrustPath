import "server-only";
import { db } from "@/lib/db";
import { audit, type Actor } from "@/lib/audit";

export type IncidentFields = {
  profileId: string;
  type: "card_fraud" | "account_compromise" | "injection_blocked" | "scam_coaching";
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "contained";
  title: string;
  description: string;
  cardEventId?: string;
  actionId?: string;
  measures?: string[];
  coachingAssessmentId?: string;
};

export async function createIncident(f: IncidentFields, actor: Actor): Promise<{ id: string }> {
  const { data, error } = await db()
    .from("incidents")
    .insert({
      profile_id: f.profileId,
      type: f.type,
      severity: f.severity,
      status: f.status,
      title: f.title,
      description: f.description,
      card_event_id: f.cardEventId ?? null,
      action_id: f.actionId ?? null,
      measures: f.measures ?? [],
      coaching_assessment_id: f.coachingAssessmentId ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;
  await audit(actor, "incident.created", "incident", data.id, { type: f.type, severity: f.severity });
  return { id: data.id as string };
}
