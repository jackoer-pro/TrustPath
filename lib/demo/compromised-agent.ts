import "server-only";
import { db } from "@/lib/db";
import { prepareTransfer } from "@/lib/banking/actions";

/**
 * Demo only: behave as if the AI were fully hijacked by the merchant page and called prepare_transfer itself.
 * No customer words back it (userMessages: []), so intent provenance (R2) must block it every time.
 */
export async function simulateCompromisedAgent() {
  const action = await prepareTransfer({
    to: "J. Smith",
    amountCents: 50000,
    userMessages: [],
    origin: "simulated_compromised_agent",
  });
  const { data: incident, error } = await db().from("incidents").select("id, severity").eq("action_id", action.id).maybeSingle();
  if (error) throw error;
  return { action, incident };
}
