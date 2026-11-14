// Card authorisation pipeline (Unit 18). Never imports lib/ai: the fraud pathway is independent of chat (invariant 7).
// Approved simulated events never change balances; settlement is out of scope.
import "server-only";
import { db } from "@/lib/db";
import { AppError } from "@/lib/http";
import { audit } from "@/lib/audit";
import { formatAUD } from "@/lib/money";
import { createIncident } from "@/lib/protect/incidents";
import { assessCardAttempt, type CardStatus, type Channel } from "./rules";

export type Authorization = { cardId: string; amountCents: number; merchant: string; channel: Channel };

export async function processAuthorization({ cardId, amountCents, merchant, channel }: Authorization) {
  const sb = db();
  const { data: card, error } = await sb.from("cards").select("id, profile_id, status, reported_lost").eq("id", cardId).maybeSingle();
  if (error) throw error;
  if (!card) throw new AppError("UNKNOWN_CARD", "Unknown card.", 404);

  const since = new Date(Date.now() - 10 * 60_000).toISOString();
  const [history, recent] = await Promise.all([
    sb.from("card_events").select("merchant, amount_cents").eq("card_id", cardId).eq("decision", "approved").order("created_at", { ascending: false }).limit(20),
    sb.from("card_events").select("id", { count: "exact", head: true }).eq("card_id", cardId).gte("created_at", since),
  ]);
  if (history.error) throw history.error;
  if (recent.error) throw recent.error;

  const assessment = assessCardAttempt(
    { amountCents, merchant, channel },
    {
      card: { status: card.status as CardStatus, reportedLost: card.reported_lost },
      history: history.data.map((h) => ({ merchant: h.merchant, amountCents: Number(h.amount_cents) })),
      recentAttempts: recent.count ?? 0,
    },
  );
  const { decision, riskLevel, cardAction, newMerchant, signals } = assessment;

  const { data: event, error: evErr } = await sb
    .from("card_events")
    .insert({ card_id: cardId, merchant, amount_cents: amountCents, channel, new_merchant: newMerchant, decision, risk_level: riskLevel, reasons: signals, card_action: cardAction })
    .select("*")
    .single();
  if (evErr) throw evErr;
  await audit("fraud_engine", "card_event.assessed", "card_event", event.id, { decision, riskLevel, cardAction, signals: signals.map((s) => s.code) });

  if (cardAction === "temporarily_locked") {
    // Only active → temporarily_locked, so an emergency lock is never downgraded.
    const { data: locked, error: lockErr } = await sb.from("cards").update({ status: "temporarily_locked" }).eq("id", cardId).eq("status", "active").select("id");
    if (lockErr) throw lockErr;
    if (locked.length) await audit("fraud_engine", "card.temporarily_locked", "card", cardId, { cardEventId: event.id });
  }

  if (decision === "approved") return { event, assessment };

  const amount = formatAUD(amountCents);
  const { id: incidentId } = await createIncident(
    {
      profileId: card.profile_id,
      type: "card_fraud",
      severity: riskLevel,
      status: cardAction === "temporarily_locked" ? "contained" : "open",
      title: `${decision === "declined" ? "Declined" : "Held"} ${amount} at ${merchant}`,
      description: signals.map((s) => s.reason).join(" "),
      cardEventId: event.id,
      measures: [decision === "declined" ? "Payment declined" : "Payment held for review", ...(cardAction === "temporarily_locked" ? ["Card temporarily locked"] : [])],
    },
    "fraud_engine",
  );

  const body =
    decision === "declined"
      ? `We declined ${amount} at ${merchant}. Was this you?`
      : `We've paused a ${amount} payment at ${merchant} while we check it. Was this you?`;
  const { data: note, error: noteErr } = await sb
    .from("notifications")
    .insert({ profile_id: card.profile_id, kind: "card_alert", title: "Was this you?", body, card_event_id: event.id })
    .select("id")
    .single();
  if (noteErr) throw noteErr;
  await audit("fraud_engine", "notification.sent", "notification", note.id, { cardEventId: event.id });

  return { event, assessment, incidentId, notificationId: note.id as string };
}
