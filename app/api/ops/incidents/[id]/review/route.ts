import { z } from "zod";
import { checkDemoKey, fail, run } from "@/lib/http";
import { reviewIncident } from "@/lib/ops/staff";

// Bank staff action: demo key required.
export async function POST(req: Request, ctx: RouteContext<"/api/ops/incidents/[id]/review">) {
  const denied = checkDemoKey(req);
  if (denied) return denied;
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return fail("BAD_REQUEST", "Invalid request", 400);
  return run(() => reviewIncident(id));
}
