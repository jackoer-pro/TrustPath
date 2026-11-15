import { after } from "next/server";
import { z } from "zod";
import { fail, run } from "@/lib/http";
import { DEMO_PROFILE_ID } from "@/lib/banking/constants";
import { analyseMessage } from "@/lib/protect/coaching/analyse";
import { writeCaseBrief } from "@/lib/ai/case-brief";

// CoachGuard from the Protect tab: the customer pastes a message or call transcript. The customer's own action
// (single demo profile), so no demo key. It can hold a payment to a new payee; it never locks accounts.
// ponytail: input cap only, no rate limiter (same as /api/chat); add one before a wider launch.
export const maxDuration = 60;

const Body = z.object({ text: z.string().trim().min(1).max(4000) });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("BAD_REQUEST", "Paste a message of up to 4,000 characters.", 400);
  return run(async () => {
    const result = await analyseMessage(parsed.data.text, DEMO_PROFILE_ID, "customer");
    if (result.incidentId) after(() => writeCaseBrief(result.incidentId!));
    return result;
  });
}
