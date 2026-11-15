import { after } from "next/server";
import { z } from "zod";
import { writeCaseBrief } from "@/lib/ai/case-brief";
import { fail, run } from "@/lib/http";
import { respondToNotification } from "@/lib/protect/respond";

const Body = z.object({ response: z.enum(["confirmed", "denied"]) });

export async function POST(req: Request, ctx: RouteContext<"/api/notifications/[id]/respond">) {
  const { id } = await ctx.params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!z.uuid().safeParse(id).success || !parsed.success) return fail("BAD_REQUEST", "Invalid request", 400);
  return run(async () => {
    const result = await respondToNotification(id, parsed.data.response);
    // The customer's answer changes the case's next step: rewrite the brief in the background.
    if (result.incidentId) after(() => writeCaseBrief(result.incidentId!));
    return result;
  });
}
