// Canonical action payload hash: binds an approval to the exact action. Pure.
import { createHash } from "node:crypto";

export type HashFields = {
  actionId: string;
  type: "transfer" | "purchase";
  fromAccountId: string;
  toAccountId?: string | null;
  payeeId?: string | null;
  productId?: string | null;
  amountCents: number;
};

export function payloadHash(f: HashFields): string {
  const canonical: Record<string, string | number | null> = {
    actionId: f.actionId,
    type: f.type,
    fromAccountId: f.fromAccountId,
    toAccountId: f.toAccountId ?? null,
    payeeId: f.payeeId ?? null,
    productId: f.productId ?? null,
    amountCents: f.amountCents,
    currency: "AUD",
  };
  const sorted = Object.fromEntries(Object.entries(canonical).sort(([a], [b]) => (a < b ? -1 : 1)));
  return createHash("sha256").update(JSON.stringify(sorted)).digest("hex");
}
