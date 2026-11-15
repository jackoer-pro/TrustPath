import { z } from "zod";
import { fail, run } from "@/lib/http";
import { preparePurchase } from "@/lib/banking/actions";

// The customer tapped Buy (Shop tab or a deals card in chat). This only PREPARES a purchase: the trust engine still
// assesses it, and it needs the PIN on the Trust Receipt like everything else. The price comes from the catalogue.
const Body = z.object({ productId: z.string().regex(/^[a-z0-9-]{1,40}$/) });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("BAD_REQUEST", "Invalid request", 400);
  return run(() => preparePurchase({ productIdOrUrl: parsed.data.productId, userMessages: [], origin: "customer", confirmedInApp: true }));
}
