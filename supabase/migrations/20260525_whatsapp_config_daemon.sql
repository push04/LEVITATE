-- Add daemon-sync columns to company_whatsapp_config
alter table company_whatsapp_config
  add column if not exists qr_code text,
  add column if not exists daemon_last_ping timestamptz,
  add column if not exists whatsapp_number text;

-- Ensure RLS policies allow service role to write (daemon uses service key)
-- Service role bypasses RLS by default, so no policy needed for daemon writes.
