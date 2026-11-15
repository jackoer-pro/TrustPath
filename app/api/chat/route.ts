import { after } from "next/server";
import { z } from "zod";
import { writeCaseBrief } from "@/lib/ai/case-brief";
import { fail, run } from "@/lib/http";
import { runAgent, HISTORY_LIMIT } from "@/lib/ai/agent";

// Worst case: 4 model rounds × 12 s timeout + tools. Every other route finishes in about 1 s.
export const maxDuration = 60;

// ponytail: input caps + 4 tool rounds only, no rate limiter; add one before a wider public launch.
const Body = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(2000) }))
    .min(1)
    .max(HISTORY_LIMIT)
    .refine((m) => m.at(-1)?.role === "user", "The last message must be from the customer."),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("BAD_REQUEST", "Invalid request", 400);
  return run(async () => {
    const result = await runAgent(parsed.data.messages);
    // Case briefs for incidents this turn created or escalated, written after the reply is sent.
    const ids = result.cards.flatMap((c) => (c.type === "emergency" ? [c.incidentId] : c.type === "shield" ? [c.id] : []));
    if (ids.length) after(() => Promise.all(ids.map(writeCaseBrief)));
    return result;
  });
}
