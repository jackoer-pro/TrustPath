import { z } from "zod";
import { fail, run } from "@/lib/http";
import { removeCommitment, updateCommitment } from "@/lib/context/context";

const Patch = z
  .object({ amountCents: z.number().int().min(1).max(10_000_000).optional(), inPaydayPlan: z.boolean().optional() })
  .refine((b) => Object.keys(b).length > 0);

export async function PATCH(req: Request, ctx: RouteContext<"/api/me/commitments/[id]">) {
  const { id } = await ctx.params;
  const parsed = Patch.safeParse(await req.json().catch(() => null));
  if (!z.uuid().safeParse(id).success || !parsed.success) return fail("BAD_REQUEST", "Invalid request", 400);
  return run(() => updateCommitment(id, parsed.data));
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/me/commitments/[id]">) {
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return fail("BAD_REQUEST", "Invalid request", 400);
  return run(() => removeCommitment(id));
}
