import "server-only";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";

export async function resetDemo() {
  const started = Date.now();
  const { error } = await db().rpc("reset_demo");
  if (error) throw error;
  await audit("system", "demo.reset", "demo", null);
  return { ms: Date.now() - started };
}
