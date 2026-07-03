import { createClient } from "@supabase/supabase-js";

// Supabase push is opt-in: the crawler runs fully offline (local JSON store
// in data/) until SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set, so the
// scraping loop never blocks on credentials that haven't been provisioned.
export function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}
