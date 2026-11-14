// ponytail: temporary dev-only trigger to verify Units 06–08 before the chat exists. Unit 11 deletes this route.
import { z } from "zod";
import { checkDemoKey, fail, run } from "@/lib/http";
import { prepareTransfer } from "@/lib/banking/actions";

const Body = z.object({
  to: z.string().trim().min(1).max(100),
  amountCents: z.number().int().positive().max(100_000_000),
  fromAccount: z.string().trim().min(1).max(100).optional(),
  description: z.string().max(140).optional(),
  userMessages: z.array(z.string().max(2000)).max(12),
  origin: z.enum(["customer", "simulated_compromised_agent"]).default("customer"),
});

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") return fail("NOT_FOUND", "Not found", 404);
  const denied = checkDemoKey(req);
  if (denied) return denied;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("BAD_REQUEST", "Invalid request", 400);
  return run(() => prepareTransfer(parsed.data));
}
