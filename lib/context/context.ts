// Personal Context Engine (Unit 30): the customer's explicit, editable financial context and what follows from it.
// Server-only reads; every number comes from safeToSpend() (pure). Nothing is inferred from behaviour.
import "server-only";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { AppError } from "@/lib/http";
import { formatAUD } from "@/lib/money";
import { DEMO_PROFILE_ID, EVERYDAY_ACCOUNT_ID } from "@/lib/banking/constants";
import { prepareTransfer, type PreparedAction } from "@/lib/banking/actions";
import { safeToSpend, type ItemStatus, type SafeToSpend } from "./safe-to-spend";
import { buildBriefing } from "./briefing";
import { activity, learn, type CardEvent, type Stopped, type Txn } from "./insights";

export type Preferences = {
  nextPayday: string;
  expectedIncomeCents: number;
  savingsTargetCents: number;
  minBufferCents: number;
  preferredSavingsAccountId: string | null;
  aiMaxPrepareCents: number;
};
export type CommitmentView = {
  id: string;
  name: string;
  category: "rent" | "bill" | "subscription" | "other";
  amountCents: number;
  payeeId: string | null;
  payeeName: string | null;
  inPaydayPlan: boolean;
  status: ItemStatus;
};
export type FinancialContext = {
  preferences: Preferences;
  commitments: CommitmentView[];
  savings: { accountId: string; accountName: string; targetCents: number; status: ItemStatus } | null;
  accounts: { id: string; name: string; kind: string; balanceCents: number }[];
  payees: { id: string; name: string; kind: string; verified: boolean; aiApproved: boolean; addedDaysAgo: number; birthday: string | null }[];
  cycleStart: string;
  safe: SafeToSpend;
};

const DAY = 86_400_000;

export async function getFinancialContext(profileId = DEMO_PROFILE_ID): Promise<FinancialContext> {
  const sb = db();
  const [prefs, commitments, accounts, payees, pending, salary] = await Promise.all([
    sb.from("customer_preferences").select("*").eq("profile_id", profileId).single(),
    sb.from("commitments").select("*").eq("profile_id", profileId).order("amount_cents", { ascending: false }),
    sb.from("accounts").select("id, name, kind, balance_cents").eq("profile_id", profileId).order("name"),
    sb.from("payees").select("id, name, kind, verified, ai_approved, created_at, birthday").eq("profile_id", profileId).order("name"),
    sb
      .from("pending_actions")
      .select("id, amount_cents, payee_id, to_account_id")
      .eq("profile_id", profileId)
      .eq("status", "pending_approval")
      .eq("from_account_id", EVERYDAY_ACCOUNT_ID)
      .gt("expires_at", new Date().toISOString()),
    sb.from("transactions").select("created_at").eq("account_id", EVERYDAY_ACCOUNT_ID).eq("kind", "salary").order("created_at", { ascending: false }).limit(1),
  ]);
  for (const r of [prefs, commitments, accounts, payees, pending, salary]) if (r.error) throw r.error;

  // The pay cycle starts at the last salary credit (14 days ago if there isn't one).
  const cycleStart = salary.data![0]?.created_at ?? new Date(Date.now() - 14 * DAY).toISOString();
  const { data: spent, error } = await sb
    .from("transactions")
    .select("amount_cents, counterparty")
    .eq("account_id", EVERYDAY_ACCOUNT_ID)
    .lt("amount_cents", 0)
    .gte("created_at", cycleStart);
  if (error) throw error;

  const p = prefs.data!;
  const accts = accounts.data!.map((a) => ({ id: a.id as string, name: a.name as string, kind: a.kind as string, balanceCents: Number(a.balance_cents) }));
  const pays = payees.data!.map((y) => ({
    id: y.id as string,
    name: y.name as string,
    kind: y.kind as string,
    verified: y.verified as boolean,
    aiApproved: y.ai_approved as boolean,
    addedDaysAgo: Math.floor((Date.now() - Date.parse(y.created_at)) / DAY),
    birthday: (y.birthday as string | null) ?? null,
  }));
  const used = new Set<string>();
  const statusOf = (counterparty: string | null, match: (a: { payee_id: string | null; to_account_id: string | null }) => boolean, amount: number): ItemStatus => {
    if (counterparty && spent.some((t) => t.counterparty === counterparty && -Number(t.amount_cents) === amount)) return "paid";
    const a = pending.data!.find((x) => !used.has(x.id) && Number(x.amount_cents) === amount && match(x));
    if (a) {
      used.add(a.id);
      return "pending";
    }
    return "due";
  };

  const commitmentViews: CommitmentView[] = commitments.data!.map((c) => {
    const payee = pays.find((y) => y.id === c.payee_id) ?? null;
    return {
      id: c.id,
      name: c.name,
      category: c.category,
      amountCents: Number(c.amount_cents),
      payeeId: c.payee_id,
      payeeName: payee?.name ?? null,
      inPaydayPlan: c.in_payday_plan,
      // Commitments without a payee (e.g. card subscriptions) are always still to pay before payday.
      status: payee ? statusOf(payee.name, (a) => a.payee_id === payee.id, Number(c.amount_cents)) : "due",
    };
  });
  const savingsAccount = accts.find((a) => a.id === p.preferred_savings_account_id) ?? null;
  const target = Number(p.savings_target_cents);
  const savings =
    savingsAccount && target > 0
      ? { accountId: savingsAccount.id, accountName: savingsAccount.name, targetCents: target, status: statusOf(savingsAccount.name, (a) => a.to_account_id === savingsAccount.id, target) }
      : null;
  const otherPending = pending.data!.filter((a) => !used.has(a.id)).reduce((s, a) => s + Number(a.amount_cents), 0);

  const preferences: Preferences = {
    nextPayday: p.next_payday,
    expectedIncomeCents: Number(p.expected_income_cents),
    savingsTargetCents: target,
    minBufferCents: Number(p.min_buffer_cents),
    preferredSavingsAccountId: p.preferred_savings_account_id,
    aiMaxPrepareCents: Number(p.ai_max_prepare_cents),
  };
  const safe = safeToSpend({
    everydayBalanceCents: accts.find((a) => a.id === EVERYDAY_ACCOUNT_ID)?.balanceCents ?? 0,
    commitments: commitmentViews.map((c) => ({ label: c.payeeName ? `${c.name} → ${c.payeeName}` : c.name, amountCents: c.amountCents, status: c.status })),
    savings: savings && { label: `Savings goal → ${savings.accountName}`, amountCents: savings.targetCents, status: savings.status },
    bufferCents: preferences.minBufferCents,
    otherPendingCents: otherPending,
    nextPayday: preferences.nextPayday,
  });
  return { preferences, commitments: commitmentViews, savings, accounts: accts, payees: pays, cycleStart, safe };
}

export type PaydayPlan = { items: { label: string; amountCents: number; to: string }[]; actions: PreparedAction[]; alreadyDone: string[] };

/** "Do my usual payday plan": prepare every planned commitment and the savings goal that are still due this cycle. */
export async function preparePaydayPlan(userMessages: string[]): Promise<PaydayPlan> {
  const ctx = await getFinancialContext();
  const items: PaydayPlan["items"] = [];
  const actions: PreparedAction[] = [];
  const alreadyDone: string[] = [];
  const todo = [
    ...ctx.commitments.filter((c) => c.inPaydayPlan && c.payeeName).map((c) => ({ label: c.name, to: c.payeeName!, amountCents: c.amountCents, status: c.status })),
    ...(ctx.savings ? [{ label: "Savings", to: ctx.savings.accountName, amountCents: ctx.savings.targetCents, status: ctx.savings.status }] : []),
  ];
  for (const t of todo) {
    if (t.status !== "due") {
      alreadyDone.push(`${t.label} (${t.status === "paid" ? "already paid" : "already waiting for approval"})`);
      continue;
    }
    items.push({ label: t.label, amountCents: t.amountCents, to: t.to });
    actions.push(
      await prepareTransfer({
        to: t.to,
        amountCents: t.amountCents,
        description: `${t.label} (payday plan)`,
        userMessages,
        origin: "customer",
        fromSavedPlan: true,
      }),
    );
  }
  return { items, actions, alreadyDone };
}

// ─── Customer edits (the "My Financial Context" screen and the assistant's narrow preference tool) ───

export type PreferencePatch = Partial<Pick<Preferences, "nextPayday" | "savingsTargetCents" | "minBufferCents" | "preferredSavingsAccountId" | "aiMaxPrepareCents">>;

export async function updatePreferences(patch: PreferencePatch, actor: "customer" | "ai_agent") {
  // The assistant may only change the buffer and savings target, and only on the customer's own words (see the tool).
  if (actor === "ai_agent" && Object.keys(patch).some((k) => k !== "minBufferCents" && k !== "savingsTargetCents"))
    throw new AppError("NOT_PERMITTED", "Your assistant can't change that. Use My AI Permissions.", 403);
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.nextPayday) row.next_payday = patch.nextPayday;
  if (patch.savingsTargetCents !== undefined) row.savings_target_cents = patch.savingsTargetCents;
  if (patch.minBufferCents !== undefined) row.min_buffer_cents = patch.minBufferCents;
  if (patch.preferredSavingsAccountId !== undefined) row.preferred_savings_account_id = patch.preferredSavingsAccountId;
  if (patch.aiMaxPrepareCents !== undefined) row.ai_max_prepare_cents = patch.aiMaxPrepareCents;
  const { data: before, error: bErr } = await db().from("customer_preferences").select("*").eq("profile_id", DEMO_PROFILE_ID).single();
  if (bErr) throw bErr;
  const { error } = await db().from("customer_preferences").update(row).eq("profile_id", DEMO_PROFILE_ID);
  if (error) throw error;
  const changes = Object.fromEntries(
    Object.entries(row)
      .filter(([k]) => k !== "updated_at")
      .map(([k, v]) => [k, { from: before[k], to: v }]),
  );
  await audit(actor, "preferences.updated", "customer_preferences", DEMO_PROFILE_ID, changes);
  return getFinancialContext();
}

export async function addCommitment(c: { name: string; category: CommitmentView["category"]; amountCents: number; payeeId: string | null; inPaydayPlan: boolean }) {
  const { data, error } = await db()
    .from("commitments")
    .insert({ profile_id: DEMO_PROFILE_ID, name: c.name, category: c.category, amount_cents: c.amountCents, payee_id: c.payeeId, in_payday_plan: c.inPaydayPlan && !!c.payeeId })
    .select("id")
    .single();
  if (error) throw error;
  await audit("customer", "commitment.added", "commitment", data.id, { name: c.name, amountCents: c.amountCents });
  return getFinancialContext();
}

export async function updateCommitment(id: string, patch: { amountCents?: number; inPaydayPlan?: boolean }) {
  const row: Record<string, unknown> = {};
  if (patch.amountCents !== undefined) row.amount_cents = patch.amountCents;
  if (patch.inPaydayPlan !== undefined) row.in_payday_plan = patch.inPaydayPlan;
  const { data, error } = await db().from("commitments").update(row).eq("id", id).eq("profile_id", DEMO_PROFILE_ID).select("id, payee_id");
  if (error) throw error;
  if (!data.length) throw new AppError("NOT_FOUND", "Commitment not found.", 404);
  await audit("customer", "commitment.updated", "commitment", id, patch);
  return getFinancialContext();
}

export async function removeCommitment(id: string) {
  const { data, error } = await db().from("commitments").delete().eq("id", id).eq("profile_id", DEMO_PROFILE_ID).select("id, name");
  if (error) throw error;
  if (!data.length) throw new AppError("NOT_FOUND", "Commitment not found.", 404);
  await audit("customer", "commitment.removed", "commitment", id, { name: data[0].name });
  return getFinancialContext();
}

export async function setPayeeAiApproved(id: string, aiApproved: boolean) {
  const { data, error } = await db().from("payees").update({ ai_approved: aiApproved }).eq("id", id).eq("profile_id", DEMO_PROFILE_ID).select("name");
  if (error) throw error;
  if (!data.length) throw new AppError("NOT_FOUND", "Payee not found.", 404);
  await audit("customer", aiApproved ? "payee.ai_allowed" : "payee.ai_blocked", "payee", id, { name: data[0].name });
  return getFinancialContext();
}

export const describeSavings = (ctx: FinancialContext) =>
  ctx.savings
    ? `You set a savings goal of ${formatAUD(ctx.savings.targetCents)} into ${ctx.savings.accountName} every payday. You can change or remove it in My Financial Context.`
    : "You haven't set a savings goal.";

// ─── Morning briefing (Unit 35) ───

const SYDNEY = "Australia/Sydney";
const sydneyDate = (d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: SYDNEY, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
const sydneyHour = (d = new Date()) => Number(new Intl.DateTimeFormat("en-AU", { timeZone: SYDNEY, hour: "numeric", hourCycle: "h23" }).format(d));

/** The briefing, from the customer's own context: birthdays saved on payees, last year's gift, what's due, safe-to-spend. */
export async function getBriefing() {
  const sb = db();
  const [ctx, payees] = await Promise.all([
    getFinancialContext(),
    sb.from("payees").select("name, aliases, birthday").eq("profile_id", DEMO_PROFILE_ID).not("birthday", "is", null),
  ]);
  if (payees.error) throw payees.error;
  const today = sydneyDate().slice(5); // MM-DD
  const birthdaysToday = [];
  for (const p of payees.data.filter((y) => String(y.birthday).slice(5) === today)) {
    // What Alex sent on this person's last birthday (300–430 days ago), from real history.
    const { data: gifts, error } = await sb
      .from("transactions")
      .select("amount_cents")
      .eq("account_id", EVERYDAY_ACCOUNT_ID)
      .eq("counterparty", p.name)
      .lt("amount_cents", 0)
      .gte("created_at", new Date(Date.now() - 430 * DAY).toISOString())
      .lte("created_at", new Date(Date.now() - 300 * DAY).toISOString())
      .limit(1);
    if (error) throw error;
    const alias = ((p.aliases as string[])[0] ?? p.name) as string;
    const family = ["mum", "mom", "dad"].includes(alias);
    birthdaysToday.push({
      display: family ? alias.charAt(0).toUpperCase() + alias.slice(1) : (p.name as string),
      payeeAlias: alias,
      pronoun: (alias === "dad" ? "him" : family ? "her" : "them") as "her" | "him" | "them",
      lastGiftCents: gifts[0] ? -Number(gifts[0].amount_cents) : null,
    });
  }
  return buildBriefing({
    name: "Alex",
    hour: sydneyHour(),
    birthdaysToday,
    dueBeforePayday: ctx.commitments.filter((c) => c.status === "due" && c.payeeName).map((c) => ({ name: c.name, amountCents: c.amountCents })),
    nextPayday: ctx.preferences.nextPayday,
    safe: ctx.safe,
  });
}

export async function setPayeeBirthday(id: string, birthday: string | null) {
  const { data, error } = await db().from("payees").update({ birthday }).eq("id", id).eq("profile_id", DEMO_PROFILE_ID).select("name");
  if (error) throw error;
  if (!data.length) throw new AppError("NOT_FOUND", "Payee not found.", 404);
  await audit("customer", "payee.birthday_set", "payee", id, { name: data[0].name, birthday });
  return getFinancialContext();
}

/** Laptop insights panel (Unit 42): balances, what TrustPath has learned from Alex's history, and recent activity. */
export async function getInsights() {
  const sb = db();
  const since = new Date(Date.now() - 400 * DAY).toISOString();
  const [ctx, txns, cards, payees, stopped] = await Promise.all([
    getFinancialContext(),
    sb.from("transactions").select("amount_cents, counterparty, description, kind, created_at, accounts!inner(name, profile_id)").eq("accounts.profile_id", DEMO_PROFILE_ID).gte("created_at", since).order("created_at", { ascending: false }).limit(200),
    sb.from("card_events").select("merchant, amount_cents, decision, created_at, cards!inner(profile_id)").eq("cards.profile_id", DEMO_PROFILE_ID).order("created_at", { ascending: false }).limit(100),
    sb.from("payees").select("name, aliases, birthday").eq("profile_id", DEMO_PROFILE_ID).not("birthday", "is", null),
    // Stopped payments: held/blocked, or cancelled after a simulated attack (the customer said "secure my account").
    sb.from("pending_actions").select("amount_cents, status, origin, recipient_label, merchant, created_at, payees(name)").eq("profile_id", DEMO_PROFILE_ID).in("status", ["held", "blocked", "cancelled"]).gte("created_at", new Date(Date.now() - DAY).toISOString()),
  ]);
  for (const r of [txns, cards, payees, stopped]) if (r.error) throw r.error;
  const s: Stopped[] = stopped.data!
    .filter((r) => r.status !== "cancelled" || String(r.origin).startsWith("simulated"))
    .map((r) => ({
      label: (r.payees as unknown as { name: string } | null)?.name ?? r.recipient_label ?? r.merchant ?? "Unknown recipient",
      amountCents: Number(r.amount_cents),
      status: r.status as Stopped["status"],
      at: r.created_at,
    }));
  const t: Txn[] = txns.data!.map((r) => ({
    amountCents: Number(r.amount_cents),
    counterparty: r.counterparty,
    description: r.description,
    kind: r.kind,
    account: (r.accounts as unknown as { name: string }).name,
    at: r.created_at,
  }));
  const c: CardEvent[] = cards.data!.map((r) => ({ merchant: r.merchant, amountCents: Number(r.amount_cents), decision: r.decision, at: r.created_at }));
  const birthdays = payees.data!.map((p) => {
    const alias = ((p.aliases as string[])[0] ?? "") as string;
    return { name: p.name as string, display: ["mum", "mom", "dad"].includes(alias) ? alias.charAt(0).toUpperCase() + alias.slice(1) : (p.name as string), birthday: p.birthday as string };
  });
  return {
    accounts: ctx.accounts,
    safe: { amountCents: ctx.safe.amountCents, status: ctx.safe.status, nextPayday: ctx.safe.nextPayday },
    knows: learn({ now: new Date().toISOString(), today: sydneyDate(), txns: t, cardEvents: c, birthdays, commitments: ctx.commitments, nextPayday: ctx.preferences.nextPayday }),
    activity: activity(t, c, s),
  };
}
export type Insights = Awaited<ReturnType<typeof getInsights>>;
