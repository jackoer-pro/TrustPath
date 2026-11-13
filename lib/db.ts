import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | undefined;

/** The only Supabase client. Secret key, server only — bypasses RLS, so never expose it to the browser. */
export function db(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url) throw new Error("Missing env SUPABASE_URL");
  if (!key) throw new Error("Missing env SUPABASE_SECRET_KEY");
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}
