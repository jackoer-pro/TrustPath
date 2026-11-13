import { checkDemoKey, run } from "@/lib/http";
import { resetDemo } from "@/lib/demo/reset";

export async function POST(req: Request) {
  return checkDemoKey(req) ?? run(resetDemo);
}
