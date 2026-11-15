import { z } from "zod";
import { fail, run } from "@/lib/http";
import { updatePreferences } from "@/lib/context/context";

// The customer's own edits (My Financial Context / My AI Permissions). Validated here; audited as "customer".
const cents = z.number().int().min(0).max(10_000_000);
const Body = z
  .object({
    nextPayday: z.iso.date().optional(),
    savingsTargetCents: cents.optional(),
    minBufferCents: cents.optional(),
    preferredSavingsAccountId: z.uuid().nullable().optional(),
    aiMaxPrepareCents: cents.min(100).optional(),
  })
  .refine((b) => Object.keys(b).length > 0);

export async function PATCH(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("BAD_REQUEST", "Invalid request", 400);
  return run(() => updatePreferences(parsed.data, "customer"));
}
