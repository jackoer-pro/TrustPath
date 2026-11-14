// Security-sensitive (ai-workflow-rules.md): the only route that moves money. Change only on explicit instruction.
import { z } from "zod";
import { fail, run } from "@/lib/http";
import { approveAction } from "@/lib/banking/approve";

const Body = z.object({
  pin: z.string().regex(/^\d{4}$/),
  payloadHash: z.string().regex(/^[0-9a-f]{64}$/),
});

export async function POST(req: Request, ctx: RouteContext<"/api/actions/[id]/approve">) {
  const { id } = await ctx.params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!z.uuid().safeParse(id).success || !parsed.success) return fail("BAD_REQUEST", "Invalid request", 400);
  return run(() => approveAction(id, parsed.data));
}
