// AI case brief for bank staff (architecture.md → Case brief). Written after the decision, in the background;
// it only ever writes incidents.ai_brief and can never change a decision (invariant 7).
import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { chat } from "./deepseek";
import { templateBrief, type CaseBrief, type CaseFacts } from "./case-brief-template";

const BRIEF_TIMEOUT_MS = 20_000;

const AiBrief = z.object({
  summary: z.string().min(1).max(600),
  timeline: z.array(z.string().min(1).max(300)).min(1).max(8),
  nextStep: z.string().min(1).max(400),
});

const SYSTEM = `You write case briefs for a bank's fraud specialists. Use only the facts in the user's message; never invent amounts, names, times or events. Australian English, plain and factual.
Base nextStep on suggestedNextStep (you may reword it, but keep its meaning).
Reply with json only, in exactly this shape:
{"summary": "One or two sentences on what happened.", "timeline": ["Short step in order.", "Next step in order."], "nextStep": "One concrete action for the specialist."}`;

async function buildFacts(incidentId: string): Promise<CaseFacts | null> {
  const sb = db();
  const { data: i, error } = await sb.from("incidents").select("*").eq("id", incidentId).maybeSingle();
  if (error) throw error;
  if (!i) return null;

  const facts: CaseFacts = {
    incident: { type: i.type, severity: i.severity, status: i.status, title: i.title, description: i.description, measures: i.measures as string[] },
    related: [],
  };
  if (i.card_event_id) {
    const [{ data: e, error: eErr }, { data: n, error: nErr }] = await Promise.all([
      sb.from("card_events").select("*, cards(last_four)").eq("id", i.card_event_id).single(),
      sb.from("notifications").select("response").eq("card_event_id", i.card_event_id).maybeSingle(),
    ]);
    if (eErr) throw eErr;
    if (nErr) throw nErr;
    facts.cardEvent = {
      merchant: e.merchant,
      amountCents: Number(e.amount_cents),
      channel: e.channel,
      decision: e.decision,
      reasons: (e.reasons as { reason: string }[]).map((r) => r.reason),
      cardAction: e.card_action,
      cardLastFour: (e.cards as { last_four: string } | null)?.last_four ?? "????",
    };
    facts.customerResponse = n?.response ?? null;
  }
  if (i.action_id) {
    const { data: a, error: aErr } = await sb.from("pending_actions").select("*").eq("id", i.action_id).single();
    if (aErr) throw aErr;
    facts.action = { amountCents: Number(a.amount_cents), to: a.recipient_label ?? a.merchant ?? "a saved payee", status: a.status, origin: a.origin, reasons: a.reasons as string[] };
  }
  const hourBefore = new Date(Date.parse(i.created_at) - 3600_000).toISOString();
  const { data: rel, error: rErr } = await sb
    .from("incidents")
    .select("type, title, severity")
    .eq("profile_id", i.profile_id)
    .neq("id", i.id)
    .gte("created_at", hourBefore)
    .lte("created_at", i.created_at)
    .order("created_at");
  if (rErr) throw rErr;
  facts.related = rel;
  return facts;
}

async function aiBrief(facts: CaseFacts): Promise<CaseBrief | null> {
  try {
    const msg = await chat({
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: JSON.stringify({ ...facts, suggestedNextStep: templateBrief(facts).nextStep }) },
      ],
      jsonMode: true,
      timeoutMs: BRIEF_TIMEOUT_MS,
    });
    const parsed = AiBrief.safeParse(JSON.parse(msg.content ?? ""));
    // Measures are facts, never model output.
    return parsed.success ? { ...parsed.data, measures: facts.incident.measures, source: "ai" } : null;
  } catch (e) {
    console.error("case brief:", (e as Error).message);
    return null;
  }
}

/** Never throws: a brief failure must not affect anything else. */
export async function writeCaseBrief(incidentId: string): Promise<void> {
  try {
    const facts = await buildFacts(incidentId);
    if (!facts) return;
    const brief = (await aiBrief(facts)) ?? templateBrief(facts);
    const { error } = await db().from("incidents").update({ ai_brief: JSON.stringify(brief) }).eq("id", incidentId);
    if (error) throw error;
    await audit("ai_agent", "incident.brief_written", "incident", incidentId, { source: brief.source });
  } catch (e) {
    console.error("case brief failed:", e);
  }
}

export const parseBrief = (text: string | null): CaseBrief | null => {
  if (!text) return null;
  try {
    return JSON.parse(text) as CaseBrief;
  } catch {
    return null;
  }
};
