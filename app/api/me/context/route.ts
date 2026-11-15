import { connection } from "next/server";
import { run } from "@/lib/http";
import { getFinancialContext } from "@/lib/context/context";

export async function GET() {
  await connection();
  return run(() => getFinancialContext());
}
