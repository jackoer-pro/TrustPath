import { z } from "zod";
import { fail, run } from "@/lib/http";
import { cancelAction } from "@/lib/banking/approve";

export async function POST(_req: Request, ctx: RouteContext<"/api/actions/[id]/cancel">) {
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return fail("BAD_REQUEST", "Invalid request", 400);
  return run(() => cancelAction(id));
}
