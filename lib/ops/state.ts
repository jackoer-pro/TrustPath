// Bank console read model (GET /api/ops/state). Read only; staff actions are Unit 25.
import "server-only";
import { db } from "@/lib/db";

const LIMIT = 50;

export async function getOpsState() {
  const sb = db();
  const dayAgo = new Date(Date.now() - 24 * 3600_000).toISOString();
  const [events, incidents, audit] = await Promise.all([
    sb.from("card_events").select("*, cards(last_four)").order("created_at", { ascending: false }).limit(LIMIT),
    sb.from("incidents").select("*").order("created_at", { ascending: false }),
    sb.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(LIMIT),
  ]);
  for (const r of [events, incidents, audit]) if (r.error) throw r.error;

  const cardEvents = events.data!.map((e) => ({
    id: e.id as string,
    cardLastFour: (e.cards as { last_four: string } | null)?.last_four ?? "????",
    merchant: e.merchant as string,
    amountCents: Number(e.amount_cents),
    channel: e.channel as "ecommerce" | "in_store",
    decision: e.decision as "approved" | "declined" | "review",
    riskLevel: e.risk_level as "low" | "medium" | "high" | "critical",
    reasons: (e.reasons as { reason: string }[]).map((r) => r.reason),
    cardAction: e.card_action as "none" | "temporarily_locked",
    createdAt: e.created_at as string,
  }));
  const incidentRows = incidents.data!.map((i) => ({
    id: i.id as string,
    type: i.type as "card_fraud" | "account_compromise" | "injection_blocked",
    severity: i.severity as "low" | "medium" | "high" | "critical",
    status: i.status as "open" | "contained" | "investigated",
    title: i.title as string,
    description: i.description as string,
    measures: i.measures as string[],
    cardEventId: i.card_event_id as string | null,
    actionId: i.action_id as string | null,
    aiBrief: i.ai_brief as string | null,
    reviewedBy: i.reviewed_by as string | null,
    createdAt: i.created_at as string,
  }));

  return {
    stats: {
      // ponytail: "today" = last 24 h, add a timezone-aware day boundary if the console is used across days.
      declined: cardEvents.filter((e) => e.decision === "declined" && e.createdAt >= dayAgo).length,
      open: incidentRows.filter((i) => i.status !== "investigated").length,
      injection: incidentRows.filter((i) => i.type === "injection_blocked").length,
    },
    cardEvents,
    incidents: incidentRows,
    audit: audit.data!.map((a) => ({
      id: a.id as string,
      actor: a.actor as string,
      action: a.action as string,
      entityType: a.entity_type as string,
      entityId: a.entity_id as string | null,
      details: a.details as Record<string, unknown>,
      createdAt: a.created_at as string,
    })),
  };
}

export type OpsState = Awaited<ReturnType<typeof getOpsState>>;
