import "server-only";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { AppError } from "@/lib/http";
import { formatAUD } from "@/lib/money";
import { assess } from "@/lib/trust/policy";
import { checkProvenance } from "@/lib/trust/provenance";
import { payloadHash } from "@/lib/trust/hash";
import { createIncident } from "@/lib/protect/incidents";
import { DEMO_PROFILE_ID } from "./constants";

export type Origin = "customer" | "simulated_compromised_agent";

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

/** Resolve, assess, hash, store and audit a candidate transfer. Never moves money. */
export async function prepareTransfer(input: PrepareTransferInput) {
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
  const status = STATUS[verdict.decision];
  const row = {
    id,
    profile_id: DEMO_PROFILE_ID,
    type: "transfer",
    from_account_id: from.id,
    to_account_id: toAccount?.id ?? null,
    payee_id: payee?.id ?? null,
    recipient_label: recipient ? null : input.to,
    amount_cents: input.amountCents,
    description: input.description ?? null,
    payload_hash: payloadHash({
      actionId: id,
      type: "transfer",
      fromAccountId: from.id,
      toAccountId: toAccount?.id,
      payeeId: payee?.id,
      amountCents: input.amountCents,
    }),
    status,
    risk_level: verdict.riskLevel,
    reasons: verdict.reasons,
    origin: input.origin,
  };
  const { data: stored, error } = await sb.from("pending_actions").insert(row).select("created_at, expires_at").single();
  if (error) throw error;

  await audit(input.origin === "customer" ? "ai_agent" : "system", "action.prepared", "pending_action", id, {
    type: "transfer",
    amountCents: input.amountCents,
    to: input.to,
    origin: input.origin,
  });
  await audit("trust_engine", "action.assessed", "pending_action", id, {
    decision: verdict.decision,
    riskLevel: verdict.riskLevel,
    reasons: verdict.reasons,
  });

  const toName = recipient?.name ?? input.to;
  if (verdict.flags.includes("injection_suspected")) {
    await createIncident(
      {
        profileId: DEMO_PROFILE_ID,
        type: "injection_blocked",
        severity: "high",
        status: "contained",
        title: "Injection blocked",
        description: `A ${formatAUD(input.amountCents)} transfer to ${toName} was blocked because it didn't come from the customer's own words.`,
        actionId: id,
      },
      "trust_engine",
    );
  }

  return {
    id,
    type: "transfer" as const,
    status,
    riskLevel: verdict.riskLevel,
    reasons: verdict.reasons,
    amountCents: input.amountCents,
    description: row.description,
    payloadHash: row.payload_hash,
    origin: input.origin,
    fromAccountId: from.id,
    fromName: from.name,
    toName,
    recipientKind: recipient?.kind ?? ("unknown" as const),
    checks: {
      requestedByYou: provenance.amountOk && provenance.recipientOk,
      recipientKnown: recipient !== null,
      fundsAvailable: input.amountCents <= balance,
    },
    createdAt: stored.created_at as string,
    expiresAt: stored.expires_at as string,
  };
}

export type PreparedAction = Awaited<ReturnType<typeof prepareTransfer>>;
