import { z } from "zod";
import { checkDemoKey, fail, run } from "@/lib/http";
import { toCents } from "@/lib/money";
import { DEBIT_CARD_ID } from "@/lib/banking/constants";
import { processAuthorization } from "@/lib/fraud/process-authorization";

const Body = z.object({
  cardId: z.uuid().default(DEBIT_CARD_ID),
  amount: z.union([z.string(), z.number()]),
  merchant: z.string().trim().min(1).max(80),
  channel: z.enum(["ecommerce", "in_store"]),
});

export async function POST(req: Request) {
  const denied = checkDemoKey(req);
  if (denied) return denied;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  let amountCents = 0;
  try {
    if (parsed.success) amountCents = toCents(parsed.data.amount);
  } catch {}
  if (!parsed.success || amountCents <= 0) return fail("BAD_REQUEST", "Invalid request", 400);
  const { cardId, merchant, channel } = parsed.data;
  return run(() => processAuthorization({ cardId, amountCents, merchant, channel }));
}
