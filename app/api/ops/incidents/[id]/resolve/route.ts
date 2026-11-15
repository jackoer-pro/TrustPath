// Security-sensitive (ai-workflow-rules.md): the only route that unlocks cards and lifts emergency restrictions.
// Bank staff only (demo key). Change only on explicit instruction.
import { z } from "zod";
import { checkDemoKey, fail, run } from "@/lib/http";
import { resolveIncident } from "@/lib/ops/staff";

export async function POST(req: Request, ctx: RouteContext<"/api/ops/incidents/[id]/resolve">) {
  const denied = checkDemoKey(req);
  if (denied) return denied;
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return fail("BAD_REQUEST", "Invalid request", 400);
  return run(() => resolveIncident(id));
}
