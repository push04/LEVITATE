-- Migration: WhatsApp Agent Link Codes
-- Stores short-lived codes for linking the Electron EXE to a business account

CREATE TABLE IF NOT EXISTS wa_link_codes (
  company_id  uuid PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
  code        text        NOT NULL,
  expires_at  timestamptz NOT NULL,
  used        boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Index for fast code lookup
CREATE INDEX IF NOT EXISTS idx_wa_link_codes_code ON wa_link_codes(code);

-- RLS: only service role can read/write (EXE calls via API routes, not direct)
ALTER TABLE wa_link_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_only" ON wa_link_codes
  USING (false)
  WITH CHECK (false);

-- Auto-cleanup: delete expired codes older than 1 hour
-- (run periodically via pg_cron or Supabase scheduled functions)
-- DELETE FROM wa_link_codes WHERE expires_at < now() - interval '1 hour';

COMMENT ON TABLE wa_link_codes IS
  'Short-lived 8-character codes used to link the Levitate Electron agent to a business account';
