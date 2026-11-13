import { connection } from "next/server";
import { run } from "@/lib/http";
import { getCustomerState } from "@/lib/banking/state";

export async function GET() {
  await connection(); // live data: always render at request time, never at build
  return run(getCustomerState);
}
