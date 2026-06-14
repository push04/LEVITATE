-- Lead filter preferences per business user (all their API keys inherit this)
CREATE TABLE IF NOT EXISTS api_key_lead_preferences (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  cities     TEXT[] NOT NULL DEFAULT '{}',
  categories TEXT[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE api_key_lead_preferences ENABLE ROW LEVEL SECURITY;

-- Only the owning user can read/write their preferences
CREATE POLICY "lead_prefs_owner_rw"
  ON api_key_lead_preferences
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Service role bypasses RLS (used by API routes + admin)
GRANT ALL ON api_key_lead_preferences TO service_role;
GRANT SELECT, INSERT, UPDATE ON api_key_lead_preferences TO authenticated;
