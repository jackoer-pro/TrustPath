import { z } from "zod";
import { fail, run } from "@/lib/http";
import { addCommitment } from "@/lib/context/context";

const Body = z.object({
  name: z.string().trim().min(1).max(60),
  category: z.enum(["rent", "bill", "subscription", "other"]),
  amountCents: z.number().int().min(1).max(10_000_000),
  payeeId: z.uuid().nullable().default(null),
  inPaydayPlan: z.boolean().default(false),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("BAD_REQUEST", "Invalid request", 400);
  return run(() => addCommitment(parsed.data));
}
