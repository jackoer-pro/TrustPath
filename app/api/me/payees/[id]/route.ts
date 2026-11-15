import { z } from "zod";
import { fail, run } from "@/lib/http";
import { setPayeeAiApproved, setPayeeBirthday } from "@/lib/context/context";

// My AI Permissions: whether the assistant may prepare payments to this payee (checked server-side by rule R9).
const Body = z.union([z.object({ aiApproved: z.boolean() }), z.object({ birthday: z.iso.date().nullable() })]);

export async function PATCH(req: Request, ctx: RouteContext<"/api/me/payees/[id]">) {
  const { id } = await ctx.params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!z.uuid().safeParse(id).success || !parsed.success) return fail("BAD_REQUEST", "Invalid request", 400);
  const b = parsed.data;
  return run(() => ("aiApproved" in b ? setPayeeAiApproved(id, b.aiApproved) : setPayeeBirthday(id, b.birthday)));
}
