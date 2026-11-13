import "server-only";
import { db } from "./db";

export type Actor = "customer" | "ai_agent" | "trust_engine" | "fraud_engine" | "bank_staff" | "system";

/** The single way to write audit rows (invariant 9). */
export async function audit(
  actor: Actor,
  action: string,
  entityType: string,
  entityId: string | null,
  details: Record<string, unknown> = {},
): Promise<void> {
  const { error } = await db()
    .from("audit_logs")
    .insert({ actor, action, entity_type: entityType, entity_id: entityId, details });
  if (error) throw error;
}
