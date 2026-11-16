import "server-only";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { AppError } from "@/lib/http";
import { formatAUD } from "@/lib/money";
import { assess, type Assessment, type RiskLevel } from "@/lib/trust/policy";
import { checkProvenance } from "@/lib/trust/provenance";
import { payloadHash } from "@/lib/trust/hash";
import { createIncident } from "@/lib/protect/incidents";
import { getProduct } from "@/lib/shop/products";
import { noteCoachingHold, recentCoaching } from "@/lib/protect/coaching/analyse";
import { DEBIT_CARD_ID, DEMO_PROFILE_ID, EVERYDAY_ACCOUNT_ID } from "./constants";
import { buildTrace, REGISTERED_SESSION, type DecisionTrace, type IntentSource } from "./trace";
import type { SessionInfo } from "@/lib/trust/policy";

export type Origin = "customer" | "simulated_compromised_agent" | "simulated_unfamiliar_device";

export type PreparedAction = {
  id: string;
  type: "transfer" | "purchase";
  status: "pending_approval" | "held" | "blocked";
  riskLevel: RiskLevel;
  reasons: string[];
  amountCents: number;
  description: string | null;
  payloadHash: string;
  origin: Origin;
  fromAccountId: string;
  fromName: string;
  /** Recipient display name; the merchant for purchases. */
  toName: string;
  recipientKind: "own_account" | "person" | "biller" | "merchant" | "unknown";
  productName?: string;
  cardLastFour?: string;
  checks: { requestedByYou: boolean; recipientKnown: boolean; fundsAvailable: boolean; cardActive?: boolean };
  /** Why the trust engine decided what it did (shown under "Why?" and in the console). */
  trace?: DecisionTrace;
  createdAt: string;
  expiresAt: string;
};

export type PrepareTransferInput = {
  to: string;
  amountCents: number;
  fromAccount?: string;
  description?: string;
  userMessages: string[];
  origin: Origin;
  /** An item of the customer's saved payday plan (exact payee and amount from their context): the plan is the intent record. */
  fromSavedPlan?: boolean;
  /** Synthetic session facts (demo); defaults to Alex's registered phone. */
  session?: SessionInfo;
};

/** Personal facts for R9/R10: the AI mandate and buffer, and the usual largest payment to others (last 90 days). */
async function personalFacts(ownAccountNames: string[]) {
  const sb = db();
  const [prefs, tx] = await Promise.all([
    sb.from("customer_preferences").select("min_buffer_cents, ai_max_prepare_cents").eq("profile_id", DEMO_PROFILE_ID).maybeSingle(),
    sb
      .from("transactions")
      .select("amount_cents, counterparty, accounts!inner(profile_id)")
      .eq("accounts.profile_id", DEMO_PROFILE_ID)
      .lt("amount_cents", 0)
      .gte("created_at", new Date(Date.now() - 90 * 86_400_000).toISOString()),
  ]);
  if (prefs.error) throw prefs.error;
  if (tx.error) throw tx.error;
  const usualMaxCents = Math.max(0, ...tx.data.filter((t) => !ownAccountNames.includes(t.counterparty ?? "")).map((t) => -Number(t.amount_cents)));
  return {
    bufferCents: prefs.data ? Number(prefs.data.min_buffer_cents) : null,
    maxPrepareCents: prefs.data ? Number(prefs.data.ai_max_prepare_cents) : null,
    usualMaxCents,
  };
}

/** R11: was this biller already paid this calendar month (Sydney), or is a payment to it waiting for approval? */
async function billThisMonth(payee: { id: string; name: string }, accountIds: string[]) {
  const sb = db();
  const ym = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney", year: "numeric", month: "2-digit" }).format(new Date());
  const monthStart = new Date(`${ym}-01T00:00:00+10:00`).toISOString();
  const [paid, pending] = await Promise.all([
    sb
      .from("transactions")
      .select("amount_cents, created_at")
      .in("account_id", accountIds)
      .eq("counterparty", payee.name)
      .lt("amount_cents", 0)
      .gte("created_at", monthStart)
      .order("created_at", { ascending: false })
      .limit(1),
    sb.from("pending_actions").select("id").eq("payee_id", payee.id).eq("status", "pending_approval").gt("expires_at", new Date().toISOString()).limit(1),
  ]);
  if (paid.error) throw paid.error;
  if (pending.error) throw pending.error;
  if (paid.data[0])
    return {
      payeeName: payee.name,
      paid: {
        amountCents: -Number(paid.data[0].amount_cents),
        on: new Date(paid.data[0].created_at).toLocaleDateString("en-AU", { timeZone: "Australia/Sydney", day: "numeric", month: "short" }),
      },
    };
  return pending.data.length ? { payeeName: payee.name, pending: true } : null;
}

const intentOf = (origin: Origin, opts: { fromSavedPlan?: boolean; confirmedInApp?: boolean }): IntentSource =>
  origin === "simulated_compromised_agent"
    ? "external"
    : origin === "simulated_unfamiliar_device"
      ? "unfamiliar_session"
      : opts.fromSavedPlan
        ? "saved_plan"
        : opts.confirmedInApp
          ? "app"
          : "customer";

type Named = { id: string; name: string; aliases: string[] };
type AccountRow = Named & { balance_cents: number };
type PayeeRow = Named & { kind: "person" | "biller"; verified: boolean; created_at: string; ai_approved: boolean };

/** "My savings account" → "savings". Exact matching only — no fuzzy guesses. */
const normalise = (s: string) =>
  s.trim().toLowerCase().replace(/^my\s+/, "").replace(/\s+account$/, "");
const matches = (row: Named, text: string) =>
  row.name.toLowerCase() === text || row.aliases.includes(text);

export const daysSince = (iso: string) => (Date.now() - Date.parse(iso)) / 86_400_000;
const ago = (days: number) => (days < 1 ? "today" : `${Math.floor(days)} day${Math.floor(days) === 1 ? "" : "s"} ago`);

const STATUS = { allow: "pending_approval", step_up: "pending_approval", hold: "held", block: "blocked" } as const;

/** Shared tail of every prepare: store the assessed action, audit it, and open an incident when R2 flags injection. */
async function store(
  row: Record<string, unknown> & { id: string; amount_cents: number },
  verdict: Assessment,
  origin: Origin,
  auditDetails: Record<string, unknown>,
  targetName: string,
) {
  const { data, error } = await db()
    .from("pending_actions")
    .insert({ ...row, profile_id: DEMO_PROFILE_ID, status: STATUS[verdict.decision], risk_level: verdict.riskLevel, reasons: verdict.reasons, origin })
    .select("created_at, expires_at")
    .single();
  if (error) throw error;

  // A Buy tap in the app is the customer's own action; anything else was prepared by the assistant (or a simulation).
  const actor = auditDetails.via === "app" ? "customer" : origin === "customer" ? "ai_agent" : "system";
  await audit(actor, "action.prepared", "pending_action", row.id, { ...auditDetails, origin });
  await audit("trust_engine", "action.assessed", "pending_action", row.id, {
    decision: verdict.decision,
    riskLevel: verdict.riskLevel,
    reasons: verdict.reasons,
  });
  if (verdict.flags.includes("injection_suspected")) {
    await createIncident(
      {
        profileId: DEMO_PROFILE_ID,
        type: "injection_blocked",
        severity: "high",
        status: "contained",
        title: "Injection blocked",
        description: `A ${formatAUD(row.amount_cents)} ${row.type === "purchase" ? "purchase at" : "transfer to"} ${targetName} was blocked because it didn't come from the customer's own words.`,
        actionId: row.id,
      },
      "trust_engine",
    );
  }
  return { status: STATUS[verdict.decision], createdAt: data.created_at as string, expiresAt: data.expires_at as string };
}

/** Resolve, assess, hash, store and audit a candidate transfer. Never moves money. */
export async function prepareTransfer(input: PrepareTransferInput): Promise<PreparedAction> {
  const sb = db();
  const [profile, accounts, payees, coaching] = await Promise.all([
    sb.from("profiles").select("outgoing_paused, default_account_id").eq("id", DEMO_PROFILE_ID).single(),
    sb.from("accounts").select("id, name, aliases, balance_cents").eq("profile_id", DEMO_PROFILE_ID),
    sb.from("payees").select("id, name, aliases, kind, verified, created_at, ai_approved").eq("profile_id", DEMO_PROFILE_ID),
    recentCoaching(DEMO_PROFILE_ID),
  ]);
  for (const r of [profile, accounts, payees]) if (r.error) throw r.error;
  const accts = accounts.data as AccountRow[];
  const pays = payees.data as PayeeRow[];

  const from = input.fromAccount
    ? accts.find((a) => matches(a, normalise(input.fromAccount!)))
    : accts.find((a) => a.id === profile.data!.default_account_id);
  if (!from) throw new AppError("UNKNOWN_ACCOUNT", `I couldn't find an account called "${input.fromAccount}".`);

  const to = normalise(input.to);
  const toAccount = accts.find((a) => matches(a, to));
  const payee = toAccount ? undefined : pays.find((p) => matches(p, to));
  if (toAccount?.id === from.id) throw new AppError("SAME_ACCOUNT", "The money is already in that account.");

  const recipient = toAccount
    ? { kind: "own_account" as const, verified: true, name: toAccount.name, aliases: toAccount.aliases }
    : payee
      ? { kind: payee.kind, verified: payee.verified, name: payee.name, aliases: payee.aliases, addedDaysAgo: daysSince(payee.created_at) }
      : null;

  const provenance = input.fromSavedPlan
    ? { amountOk: true, recipientOk: true }
    : checkProvenance({ type: "transfer", amountCents: input.amountCents, rawTo: input.to, recipientAliases: recipient?.aliases ?? [] }, input.userMessages);
  const balance = Number(from.balance_cents);
  const facts = await personalFacts(accts.map((a) => a.name));
  const duplicateBill = payee?.kind === "biller" ? await billThisMonth(payee, accts.map((a) => a.id)) : null;
  const session = input.session ?? REGISTERED_SESSION;
  const intent = intentOf(input.origin, input);
  const verdict = assess(
    { type: "transfer", amountCents: input.amountCents },
    {
      outgoingPaused: profile.data!.outgoing_paused,
      sourceBalanceCents: balance,
      recipient,
      provenance,
      coaching,
      // The mandate covers anything an assistant or agent prepares; a person on another device is session risk (R10).
      mandate:
        facts.maxPrepareCents !== null && intent !== "unfamiliar_session"
          ? { agent: true, maxPrepareCents: facts.maxPrepareCents, recipientApproved: payee ? payee.ai_approved : null }
          : null,
      buffer: facts.bufferCents !== null && from.id === EVERYDAY_ACCOUNT_ID ? { bufferCents: facts.bufferCents, balanceAfterCents: balance - input.amountCents } : null,
      session,
      usualMaxCents: facts.usualMaxCents,
      duplicateBill,
    },
  );

  const id = randomUUID();
  const toName = recipient?.name ?? input.to;
  const trace = buildTrace({
    source: intent,
    text: intent === "external" ? null : (input.userMessages.at(-1) ?? input.description ?? null),
    session,
    transaction: {
      type: "transfer",
      amount: formatAUD(input.amountCents),
      from: from.name,
      to: toName,
      notes: [
        recipient ? (recipient.kind === "own_account" ? "Your own account" : `Saved payee${payee ? ` · added ${ago(daysSince(payee.created_at))}` : ""}${recipient.verified ? "" : " · not verified"}`) : "Not a saved payee",
        ...(facts.usualMaxCents ? [`Your usual largest payment: ${formatAUD(facts.usualMaxCents)}`] : []),
      ],
    },
    verdict,
  });
  const hash = payloadHash({ actionId: id, type: "transfer", fromAccountId: from.id, toAccountId: toAccount?.id, payeeId: payee?.id, amountCents: input.amountCents });
  const stored = await store(
    {
      id,
      type: "transfer",
      from_account_id: from.id,
      to_account_id: toAccount?.id ?? null,
      payee_id: payee?.id ?? null,
      recipient_label: recipient ? null : input.to,
      amount_cents: input.amountCents,
      description: input.description ?? null,
      payload_hash: hash,
      trace,
    },
    verdict,
    input.origin,
    { type: "transfer", amountCents: input.amountCents, to: input.to, intent, ...(input.session && { session: input.session.label }) },
    toName,
  );

  if (stored.status === "held" && verdict.reasons.some((r) => r.startsWith("Possible scam coaching")))
    await noteCoachingHold(DEMO_PROFILE_ID, `${formatAUD(input.amountCents)} to ${toName} held for review`);

  return {
    id,
    type: "transfer",
    ...stored,
    riskLevel: verdict.riskLevel,
    reasons: verdict.reasons,
    amountCents: input.amountCents,
    description: input.description ?? null,
    payloadHash: hash,
    origin: input.origin,
    fromAccountId: from.id,
    fromName: from.name,
    toName,
    recipientKind: recipient?.kind ?? "unknown",
    checks: {
      requestedByYou: provenance.amountOk && provenance.recipientOk,
      recipientKnown: recipient !== null,
      fundsAvailable: input.amountCents <= balance,
    },
    trace,
  };
}

/** Purchase with the demo debit card. The price always comes from the catalogue, never from the model (invariant 5). */
export async function preparePurchase(input: {
  productIdOrUrl: string;
  userMessages: string[];
  origin: Origin;
  /** The customer tapped Buy in the app (Shop tab or a deals card): an explicit request, so provenance is met. */
  confirmedInApp?: boolean;
}): Promise<PreparedAction> {
  const product = getProduct(input.productIdOrUrl);
  if (!product) throw new AppError("UNKNOWN_PRODUCT", "I couldn't find that product in the store.");

  const sb = db();
  const [profile, card] = await Promise.all([
    sb.from("profiles").select("outgoing_paused").eq("id", DEMO_PROFILE_ID).single(),
    sb.from("cards").select("last_four, status, account_id").eq("id", DEBIT_CARD_ID).single(),
  ]);
  for (const r of [profile, card]) if (r.error) throw r.error;
  const { data: account, error } = await sb.from("accounts").select("id, name, balance_cents").eq("id", card.data!.account_id).single();
  if (error) throw error;

  const provenance = input.confirmedInApp
    ? { amountOk: true, recipientOk: true }
    : checkProvenance({ type: "purchase", productTerms: [product.id, product.name.toLowerCase(), `/shop/${product.id}`] }, input.userMessages);
  const balance = Number(account.balance_cents);
  const facts = await personalFacts([]);
  const intent = intentOf(input.origin, input);
  const verdict = assess(
    { type: "purchase", amountCents: product.priceCents },
    {
      outgoingPaused: profile.data!.outgoing_paused,
      sourceBalanceCents: balance,
      recipient: null,
      cardStatus: card.data!.status,
      provenance,
      // A Buy tap is the customer's own action: the AI limit doesn't apply. The buffer warning always does.
      mandate: facts.maxPrepareCents !== null && !input.confirmedInApp ? { agent: true, maxPrepareCents: facts.maxPrepareCents, recipientApproved: null } : null,
      buffer: facts.bufferCents !== null && account.id === EVERYDAY_ACCOUNT_ID ? { bufferCents: facts.bufferCents, balanceAfterCents: balance - product.priceCents } : null,
      session: REGISTERED_SESSION,
    },
  );
  const trace = buildTrace({
    source: intent,
    text: intent === "app" ? `Buy ${product.name}` : (input.userMessages.at(-1) ?? null),
    session: REGISTERED_SESSION,
    transaction: { type: "purchase", amount: formatAUD(product.priceCents), from: account.name as string, to: product.merchant, notes: [product.name, "Price from the shop catalogue"] },
    verdict,
  });

  const id = randomUUID();
  const hash = payloadHash({ actionId: id, type: "purchase", fromAccountId: account.id, productId: product.id, amountCents: product.priceCents });
  const stored = await store(
    {
      id,
      type: "purchase",
      from_account_id: account.id,
      merchant: product.merchant,
      product_id: product.id,
      amount_cents: product.priceCents,
      description: product.name,
      payload_hash: hash,
      trace,
    },
    verdict,
    input.origin,
    { type: "purchase", amountCents: product.priceCents, productId: product.id, via: input.confirmedInApp ? "app" : "chat" },
    product.merchant,
  );

  return {
    id,
    type: "purchase",
    ...stored,
    riskLevel: verdict.riskLevel,
    reasons: verdict.reasons,
    amountCents: product.priceCents,
    description: product.name,
    payloadHash: hash,
    origin: input.origin,
    fromAccountId: account.id,
    fromName: account.name as string,
    toName: product.merchant,
    recipientKind: "merchant",
    productName: product.name,
    cardLastFour: card.data!.last_four as string,
    checks: {
      requestedByYou: provenance.recipientOk,
      recipientKnown: true,
      fundsAvailable: product.priceCents <= balance,
      cardActive: card.data!.status === "active",
    },
    trace,
  };
}
