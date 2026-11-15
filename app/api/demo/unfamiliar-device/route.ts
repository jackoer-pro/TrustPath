import { after } from "next/server";
import { checkDemoKey, run } from "@/lib/http";
import { simulateUnfamiliarDevice } from "@/lib/protect/session";
import { writeCaseBrief } from "@/lib/ai/case-brief";

// Demo operator only: a synthetic unfamiliar-device session tries to send money. The trust engine decides.
export const maxDuration = 60;

export async function POST(req: Request) {
  return (
    checkDemoKey(req) ??
    run(async () => {
      const result = await simulateUnfamiliarDevice();
      if (result.incidentId) after(() => writeCaseBrief(result.incidentId!));
      return result;
    })
  );
}
