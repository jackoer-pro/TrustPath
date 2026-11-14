import { checkDemoKey, run } from "@/lib/http";
import { simulateCompromisedAgent } from "@/lib/demo/compromised-agent";

export async function POST(req: Request) {
  return checkDemoKey(req) ?? run(simulateCompromisedAgent);
}
