// Customer answer to "Was this you?" (architecture.md → Customer response). Never imports lib/ai.
// Only staff unlock cards (invariant 8): neither answer ever unlocks.
import "server-only";
import { db } from "@/lib/db";
import { AppError } from "@/lib/http";
import { audit } from "@/lib/audit";

export type Answer = "confirmed" | "denied";

export async function respondToNotification(id: string, response: Answer) {
  const sb = db();
  const { data: existing, error: findErr } = await sb.from("notifications").select("id, response, card_event_id").eq("id", id).maybeSingle();
  if (findErr) throw findErr;
  if (!existing) throw new AppError("NOT_FOUND", "Notification not found.", 404);

  // Conditional update: a second answer (or a race) matches no row.
  const { data: rows, error: updErr } = await sb.from("notifications").update({ response }).eq("id", id).is("response", null).select("*");
  if (updErr) throw updErr;
  if (!rows.length) throw new AppError("ALREADY_ANSWERED", "You've already answered this.", 409);
  const notification = rows[0];
  await audit("customer", "notification.answered", "notification", id, { response });

  let card: { id: string; status: string } | null = null;
  if (!existing.card_event_id) return { notification, card, incidentId: null };

  const { data: event, error: evErr } = await sb.from("card_events").select("card_id").eq("id", existing.card_event_id).single();
  if (evErr) throw evErr;

  const measures: string[] = [];
  if (response === "denied") {
    const { data: locked, error: lockErr } = await sb
      .from("cards")
      .update({ status: "locked" })
      .eq("id", event.card_id)
      .in("status", ["active", "temporarily_locked"])
      .select("id, status");
    if (lockErr) throw lockErr;
    measures.push("Customer said it wasn't them");
    if (locked.length) {
      measures.push("Card locked");
      await audit("customer", "card.locked", "card", event.card_id, { notificationId: id });
    }
  } else measures.push("Customer confirmed the payment");

  const { data: incident, error: incErr } = await sb
    .from("incidents")
    .select("id, severity, measures")
    .eq("card_event_id", existing.card_event_id)
    .eq("type", "card_fraud")
    .maybeSingle();
  if (incErr) throw incErr;
  if (incident) {
    const severity = response === "denied" && ["low", "medium"].includes(incident.severity) ? "high" : incident.severity;
    const { error } = await sb.from("incidents").update({ severity, measures: [...(incident.measures as string[]), ...measures] }).eq("id", incident.id);
    if (error) throw error;
    await audit("customer", "incident.updated", "incident", incident.id, { response, severity, measures });
  }

  const { data: c, error: cardErr } = await sb.from("cards").select("id, status").eq("id", event.card_id).single();
  if (cardErr) throw cardErr;
  card = c;
  return { notification, card, incidentId: (incident?.id as string | undefined) ?? null };
}
