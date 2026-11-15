import { checkDemoKey, run } from "@/lib/http";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { DEMO_PROFILE_ID } from "@/lib/banking/constants";
import { getBriefing } from "@/lib/context/context";

// Demo operator: "Good morning". Puts the briefing on the phone (via its 2 s poll) and returns the words, so the
// /demo page (which has the user's click) can speak them aloud.
export async function POST(req: Request) {
  return (
    checkDemoKey(req) ??
    run(async () => {
      const briefing = await getBriefing();
      const { data, error } = await db()
        .from("notifications")
        .insert({ profile_id: DEMO_PROFILE_ID, kind: "briefing", title: briefing.greeting, body: briefing.lines.join(" ") })
        .select("id")
        .single();
      if (error) throw error;
      await audit("system", "briefing.sent", "notification", data.id, { lines: briefing.lines.length });
      return briefing;
    })
  );
}
