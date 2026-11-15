import { after } from "next/server";
import { checkDemoKey, run } from "@/lib/http";
import { simulateCompromisedAgent } from "@/lib/demo/compromised-agent";
import { writeCaseBrief } from "@/lib/ai/case-brief";

export const maxDuration = 60;

export async function POST(req: Request) {
  return (
    checkDemoKey(req) ??
    run(async () => {
      const result = await simulateCompromisedAgent();
      if (result.incident) after(() => writeCaseBrief(result.incident!.id));
      return result;
    })
  );
}
