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
import { DEBIT_CARD_ID, DEMO_PROFILE_ID } from "./constants";

export type Origin = "customer" | "simulated_compromised_agent";

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
};

type Named = { id: string; name: string; aliases: string[] };
type AccountRow = Named & { balance_cents: number };
type PayeeRow = Named & { kind: "person" | "biller"; verified: boolean };

/** "My savings account" → "savings". Exact matching only — no fuzzy guesses. */
const normalise = (s: string) =>
  s.trim().toLowerCase().replace(/^my\s+/, "").replace(/\s+account$/, "");
const matches = (row: Named, text: string) =>
  row.name.toLowerCase() === text || row.aliases.includes(text);

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

  await audit(origin === "customer" ? "ai_agent" : "system", "action.prepared", "pending_action", row.id, { ...auditDetails, origin });
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
  const [profile, accounts, payees] = await Promise.all([
    sb.from("profiles").select("outgoing_paused, default_account_id").eq("id", DEMO_PROFILE_ID).single(),
    sb.from("accounts").select("id, name, aliases, balance_cents").eq("profile_id", DEMO_PROFILE_ID),
    sb.from("payees").select("id, name, aliases, kind, verified").eq("profile_id", DEMO_PROFILE_ID),
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
      ? { kind: payee.kind, verified: payee.verified, name: payee.name, aliases: payee.aliases }
      : null;

  const provenance = checkProvenance(
    { type: "transfer", amountCents: input.amountCents, rawTo: input.to, recipientAliases: recipient?.aliases ?? [] },
    input.userMessages,
  );
  const balance = Number(from.balance_cents);
  const verdict = assess(
    { type: "transfer", amountCents: input.amountCents },
    { outgoingPaused: profile.data!.outgoing_paused, sourceBalanceCents: balance, recipient, provenance },
  );

  const id = randomUUID();
  const toName = recipient?.name ?? input.to;
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
    },
    verdict,
    input.origin,
    { type: "transfer", amountCents: input.amountCents, to: input.to },
    toName,
  );

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
  };
}

/** Purchase with the demo debit card. The price always comes from the catalogue, never from the model (invariant 5). */
export async function preparePurchase(input: { productIdOrUrl: string; userMessages: string[]; origin: Origin }): Promise<PreparedAction> {
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

  const provenance = checkProvenance(
    { type: "purchase", productTerms: [product.id, product.name.toLowerCase(), `/shop/${product.id}`] },
    input.userMessages,
  );
  const balance = Number(account.balance_cents);
  const verdict = assess(
    { type: "purchase", amountCents: product.priceCents },
    {
      outgoingPaused: profile.data!.outgoing_paused,
      sourceBalanceCents: balance,
      recipient: null,
      cardStatus: card.data!.status,
      provenance,
    },
  );

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
    },
    verdict,
    input.origin,
    { type: "purchase", amountCents: product.priceCents, productId: product.id },
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
  };
}
