import { timingSafeEqual } from "node:crypto";

export class AppError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

export const ok = (data: unknown) => Response.json({ ok: true, data });

export const fail = (code: string, message: string, status: number) =>
  Response.json({ ok: false, error: { code, message } }, { status });

/** Runs a service call: AppError → its own response; anything else is logged and becomes a generic 500. */
export async function run(fn: () => Promise<unknown>): Promise<Response> {
  try {
    return ok(await fn());
  } catch (e) {
    if (e instanceof AppError) return fail(e.code, e.message, e.status);
    console.error(e);
    return fail("INTERNAL", "Something went wrong. Please try again.", 500);
  }
}

/** Demo and simulate routes only. Returns a 401 response when the x-demo-key header is wrong, otherwise null. */
export function checkDemoKey(req: Request): Response | null {
  const expected = Buffer.from(process.env.DEMO_ADMIN_KEY ?? "");
  const given = Buffer.from(req.headers.get("x-demo-key") ?? "");
  const valid = expected.length > 0 && given.length === expected.length && timingSafeEqual(given, expected);
  return valid ? null : fail("DEMO_KEY_REQUIRED", "A valid demo key is required.", 401);
}
