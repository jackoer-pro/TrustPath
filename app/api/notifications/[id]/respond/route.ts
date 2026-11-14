import { z } from "zod";
import { fail, run } from "@/lib/http";
import { respondToNotification } from "@/lib/protect/respond";

const Body = z.object({ response: z.enum(["confirmed", "denied"]) });

export async function POST(req: Request, ctx: RouteContext<"/api/notifications/[id]/respond">) {
  const { id } = await ctx.params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!z.uuid().safeParse(id).success || !parsed.success) return fail("BAD_REQUEST", "Invalid request", 400);
  return run(() => respondToNotification(id, parsed.data.response));
}
