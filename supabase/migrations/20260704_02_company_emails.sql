-- Per-company mailbox + branded business email addresses.
--
-- Fixes a real data leak: the business dashboard Mailbox page was querying the
-- global `agent_emails` table directly from the browser with no company scoping
-- and no RLS — it was showing Levitate's own internal admin sales inbox (every
-- lead/client conversation, across all customers) to every signed-in business
-- customer, and (since RLS wasn't enforcing anything) to unauthenticated anon
-- key requests too. `agent_emails` has no company_id column at all, so it could
-- never have been scoped correctly — it's the wrong table for this feature.
--
-- This migration adds a real per-company table. Each paying business on a
-- qualifying plan gets a branded address `business.<workspace_slug>@levitatelabs.online`.
-- Outbound send is fully wired in code (src/app/api/business/mailbox/route.ts).
-- Inbound receiving additionally requires your mail host (wherever
-- @levitatelabs.online mail is hosted) to route/forward mail addressed to
-- business.*@levitatelabs.online into the same inbox the existing IMAP sync
-- polls (src/lib/imap-client.ts) — e.g. a catch-all/wildcard alias rule. Once
-- that's enabled, src/app/api/admin/mailbox/sync/route.ts already parses the
-- recipient address and will file matching mail into this table automatically.

CREATE TABLE IF NOT EXISTS company_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  from_email text,
  to_email text,
  subject text,
  body text,
  status text DEFAULT 'sent',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS company_emails_company_id_idx ON company_emails(company_id);
CREATE INDEX IF NOT EXISTS company_emails_created_at_idx ON company_emails(created_at DESC);

ALTER TABLE company_emails ENABLE ROW LEVEL SECURITY;

-- This table is only ever read/written via the service role from server API
-- routes (src/app/api/business/mailbox/route.ts), never directly from the
-- browser client, so no anon/authenticated policy is defined — service role
-- bypasses RLS. This is the pattern the rest of the business dashboard already
-- follows; the old agent_emails-in-the-browser approach is what caused the leak.
