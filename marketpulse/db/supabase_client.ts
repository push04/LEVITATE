import { createClient } from "@supabase/supabase-js";

// Same shared Supabase project as levitatelabs and tenderpulse-bj.
// Fails loudly (not offline-first like tenderpulse-bj) because this run's
// only job is to push data - there is nothing useful to do without it.
export function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (see .env.example)");
  }
  return createClient(url, key);
}
