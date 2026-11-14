import "server-only";
import { timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { AppError } from "@/lib/http";
import { DEMO_PROFILE_ID } from "./constants";

export const MAX_PIN_ATTEMPTS = 3;

const pinMatches = (pin: string) => {
  const expected = Buffer.from(process.env.DEMO_PIN || "1234");
  const given = Buffer.from(pin);
  return given.length === expected.length && timingSafeEqual(given, expected);
};

async function loadAction(id: string) {
  const { data, error } = await db()
    .from("pending_actions")
    .select("id, status, payload_hash, expires_at")
    .eq("id", id)
    .eq("profile_id", DEMO_PROFILE_ID)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new AppError("NOT_FOUND", "We couldn't find that request.", 404);
  return data as { id: string; status: string; payload_hash: string; expires_at: string };
}

/** Set a pending action to cancelled; false if it wasn't pending. */
async function cancelPending(id: string): Promise<boolean> {
  const { data, error } = await db()
    .from("pending_actions")
    .update({ status: "cancelled" })
    .eq("id", id)
    .eq("status", "pending_approval")
    .select("id");
  if (error) throw error;
  return data.length > 0;
}

const NOT_APPROVABLE: Record<string, string> = {
  completed: "Already approved.",
  cancelled: "This request was cancelled — ask again.",
  held: "This payment is held for review by our team.",
  blocked: "This action was blocked, so it can't be approved.",
};

/**
 * The only caller of complete_action() (invariant 2): PIN → state checks → atomic DB completion.
 * The pre-read only chooses a helpful message; complete_action() enforces status, hash and expiry itself.
 */
export async function approveAction(id: string, input: { pin: string; payloadHash: string }) {
  const action = await loadAction(id);

  if (!pinMatches(input.pin)) {
    await audit("customer", "action.approval_failed", "pending_action", id, { reason: "bad_pin" });
    const { count, error } = await db()
      .from("audit_logs")
      .select("id", { count: "exact", head: true })
      .eq("entity_id", id)
      .eq("action", "action.approval_failed");
    if (error) throw error;
    if ((count ?? 0) >= MAX_PIN_ATTEMPTS && (await cancelPending(id))) {
      await audit("system", "action.cancelled", "pending_action", id, { reason: "too_many_pin_attempts" });
      throw new AppError("TOO_MANY_ATTEMPTS", "Too many attempts — ask again.", 403);
    }
    throw new AppError("BAD_PIN", "That PIN didn't match. Try again.", 403);
  }

  const { data: profile, error: pErr } = await db()
    .from("profiles")
    .select("outgoing_paused")
    .eq("id", DEMO_PROFILE_ID)
    .single();
  if (pErr) throw pErr;
  if (profile.outgoing_paused)
    throw new AppError("OUTGOING_PAUSED", "Outgoing payments are paused while emergency protection is on.", 409);

  if (action.status !== "pending_approval")
    throw new AppError("ACTION_NOT_APPROVABLE", NOT_APPROVABLE[action.status] ?? "This request can't be approved.", 409);
  if (Date.parse(action.expires_at) <= Date.now())
    throw new AppError("ACTION_NOT_APPROVABLE", "This request expired — ask again.", 409);
  if (action.payload_hash !== input.payloadHash)
    throw new AppError("ACTION_NOT_APPROVABLE", "This action changed since you saw it.", 409);

  const { data: completed, error } = await db().rpc("complete_action", {
    p_action_id: id,
    p_payload_hash: input.payloadHash,
  });
  if (error) {
    if (error.message.includes("accounts_balance_nonnegative"))
      throw new AppError("INSUFFICIENT_FUNDS", "There isn't enough money in that account any more.", 409);
    if (error.message.includes("ACTION_NOT_APPROVABLE"))
      throw new AppError("ACTION_NOT_APPROVABLE", "This request can't be approved.", 409);
    throw error;
  }

  await audit("customer", "action.approved", "pending_action", id, { amountCents: Number(completed.amount_cents) });

  const { data: accounts, error: aErr } = await db()
    .from("accounts")
    .select("id, balance_cents")
    .eq("profile_id", DEMO_PROFILE_ID);
  if (aErr) throw aErr;

  return {
    action: { id, status: "completed" as const, completedAt: completed.completed_at as string },
    accounts: accounts.map((a) => ({ id: a.id as string, balanceCents: Number(a.balance_cents) })),
  };
}

export async function cancelAction(id: string) {
  await loadAction(id);
  if (!(await cancelPending(id)))
    throw new AppError("ACTION_NOT_CANCELLABLE", "This request can't be cancelled any more.", 409);
  await audit("customer", "action.cancelled", "pending_action", id);
  return { id, status: "cancelled" as const };
}
