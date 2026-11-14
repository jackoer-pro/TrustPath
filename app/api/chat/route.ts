import { z } from "zod";
import { fail, run } from "@/lib/http";
import { runAgent, HISTORY_LIMIT } from "@/lib/ai/agent";

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
  return run(() => runAgent(parsed.data.messages));
}
