import { z } from "zod";
import { fail, run } from "@/lib/http";
import { setPayeeAiApproved } from "@/lib/context/context";

// My AI Permissions: whether the assistant may prepare payments to this payee (checked server-side by rule R9).
const Body = z.object({ aiApproved: z.boolean() });

export async function PATCH(req: Request, ctx: RouteContext<"/api/me/payees/[id]">) {
  const { id } = await ctx.params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!z.uuid().safeParse(id).success || !parsed.success) return fail("BAD_REQUEST", "Invalid request", 400);
  return run(() => setPayeeAiApproved(id, parsed.data.aiApproved));
}
