import "server-only";
import { db } from "@/lib/db";
import { DEMO_PROFILE_ID } from "./constants";

/** Everything the customer app shows, for the demo profile. Money stays integer cents. */
export async function getCustomerState() {
  const sb = db();
  const p = DEMO_PROFILE_ID;
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const [profile, accounts, cards, actions, notifications, incidents] = await Promise.all([
    sb.from("profiles").select("name, outgoing_paused, new_payees_blocked, emergency_since").eq("id", p).single(),
    sb.from("accounts").select("id, name, kind, bsb, number, balance_cents").eq("profile_id", p).order("kind"),
    sb.from("cards").select("id, account_id, last_four, status, reported_lost").eq("profile_id", p),
    sb.from("pending_actions").select("*").eq("profile_id", p).gte("created_at", hourAgo).order("created_at"),
    sb.from("notifications").select("*").eq("profile_id", p).is("response", null).order("created_at", { ascending: false }),
    sb.from("incidents").select("*").eq("profile_id", p).neq("status", "investigated").order("created_at", { ascending: false }),
  ]);
  for (const r of [profile, accounts, cards, actions, notifications, incidents]) if (r.error) throw r.error;

  const now = Date.now();
  return {
    profile: {
      name: profile.data!.name as string,
      outgoingPaused: profile.data!.outgoing_paused as boolean,
      newPayeesBlocked: profile.data!.new_payees_blocked as boolean,
      emergencySince: profile.data!.emergency_since as string | null,
    },
    accounts: accounts.data!.map((a) => ({
      id: a.id as string,
      name: a.name as string,
      kind: a.kind as "everyday" | "savings",
      bsb: a.bsb as string,
      lastFour: (a.number as string).slice(-4),
      balanceCents: Number(a.balance_cents),
    })),
    cards: cards.data!.map((c) => ({
      id: c.id as string,
      accountId: c.account_id as string,
      lastFour: c.last_four as string,
      status: c.status as "active" | "temporarily_locked" | "locked",
      reportedLost: c.reported_lost as boolean,
    })),
    actions: actions.data!.map((a) => ({
      id: a.id as string,
      type: a.type as "transfer" | "purchase",
      fromAccountId: a.from_account_id as string,
      toAccountId: a.to_account_id as string | null,
      payeeId: a.payee_id as string | null,
      recipientLabel: a.recipient_label as string | null,
      merchant: a.merchant as string | null,
      productId: a.product_id as string | null,
      amountCents: Number(a.amount_cents),
      description: a.description as string | null,
      payloadHash: a.payload_hash as string,
      // 'expired' is read-time only; complete_action() rejects it in the DB anyway.
      status: a.status === "pending_approval" && Date.parse(a.expires_at) <= now ? "expired" : (a.status as string),
      riskLevel: a.risk_level as "low" | "medium" | "high" | "critical",
      reasons: a.reasons as string[],
      origin: a.origin as string,
      createdAt: a.created_at as string,
      expiresAt: a.expires_at as string,
      completedAt: a.completed_at as string | null,
    })),
    notifications: notifications.data!.map((n) => ({
      id: n.id as string,
      kind: n.kind as string,
      title: n.title as string,
      body: n.body as string,
      cardEventId: n.card_event_id as string | null,
      createdAt: n.created_at as string,
    })),
    incidents: incidents.data!.map((i) => ({
      id: i.id as string,
      type: i.type as string,
      severity: i.severity as "low" | "medium" | "high" | "critical",
      status: i.status as string,
      title: i.title as string,
      description: i.description as string,
      measures: i.measures as string[],
      createdAt: i.created_at as string,
    })),
  };
}

export type CustomerState = Awaited<ReturnType<typeof getCustomerState>>;
