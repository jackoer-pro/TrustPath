import { connection } from "next/server";
import { run } from "@/lib/http";
import { getOpsState } from "@/lib/ops/state";

// Open in the demo (architecture.md → bank staff): read only, mock data. Staff actions need the demo key (Unit 25).
export async function GET() {
  await connection();
  return run(getOpsState);
}
