-- ============================================================
-- LEVITATE — Missing columns & tables migration
-- Run this in: Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- ── leads: add company_id and user_id ────────────────────────
-- CRITICAL: without these, Busy sync inserts fail and
-- businesses cannot see their own leads in the dashboard.
ALTER TABLE leads ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS user_id     uuid;
CREATE INDEX IF NOT EXISTS idx_leads_company_id ON leads(company_id);
CREATE INDEX IF NOT EXISTS idx_leads_user_id    ON leads(user_id);

-- ── companies: add plan and trial columns ────────────────────
-- Used by getBusinessPortalState() to determine access level.
ALTER TABLE companies ADD COLUMN IF NOT EXISTS plan        text DEFAULT 'starter';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS trial       boolean DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS trial_start timestamp with time zone;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS trial_end   timestamp with time zone;

-- ── onboarding_subscriptions: add workspace fields ───────────
-- Used by [companySlug]/page.tsx OR query to find workspace.
ALTER TABLE onboarding_subscriptions ADD COLUMN IF NOT EXISTS workspace_slug         text;
ALTER TABLE onboarding_subscriptions ADD COLUMN IF NOT EXISTS workspace_backlink_url text;
CREATE INDEX IF NOT EXISTS idx_onboarding_workspace_slug
  ON onboarding_subscriptions(workspace_slug);

-- ── busy_sync_logs: create table ─────────────────────────────
-- Written by /api/busy/ingest after every sync.
CREATE TABLE IF NOT EXISTS busy_sync_logs (
  id               uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  sync_type        text,
  entity_type      text,
  status           text,
  records_total    integer DEFAULT 0,
  records_imported integer DEFAULT 0,
  records_skipped  integer DEFAULT 0,
  records_failed   integer DEFAULT 0,
  metadata         jsonb,
  created_at       timestamp with time zone DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_busy_sync_logs_created
  ON busy_sync_logs(created_at DESC);

-- ── newsletter_subscribers ───────────────────────────────────
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email        text UNIQUE NOT NULL,
  name         text,
  status       text DEFAULT 'active',
  source       text,
  confirmed_at timestamp with time zone,
  created_at   timestamp with time zone DEFAULT now()
);

-- ── newsletter_subscriptions ─────────────────────────────────
CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email      text UNIQUE NOT NULL,
  status     text DEFAULT 'subscribed',
  created_at timestamp with time zone DEFAULT now()
);

-- ── groq_rate_tracker ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS groq_rate_tracker (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        uuid,
  endpoint       text,
  tokens_used    integer DEFAULT 0,
  requests_count integer DEFAULT 0,
  window_start   timestamp with time zone DEFAULT now(),
  created_at     timestamp with time zone DEFAULT now()
);

-- ── conversion_events ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversion_events (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid,
  company_id uuid,
  event_type text,
  source     text,
  metadata   jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- ── webhooks ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS webhooks (
  id         uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid,
  company_id uuid,
  url        text    NOT NULL,
  events     text[],
  is_active  boolean DEFAULT true,
  secret     text,
  created_at timestamp with time zone DEFAULT now()
);

-- ── clients ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid,
  name       text NOT NULL,
  email      text,
  phone      text,
  status     text DEFAULT 'active',
  notes      text,
  created_at timestamp with time zone DEFAULT now()
);

-- ── referrals ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referrals (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id uuid,
  referred_id uuid,
  code        text UNIQUE,
  status      text DEFAULT 'pending',
  created_at  timestamp with time zone DEFAULT now()
);

-- ── referral_rewards ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referral_rewards (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  referral_id uuid REFERENCES referrals(id),
  user_id     uuid,
  amount      numeric DEFAULT 0,
  status      text DEFAULT 'pending',
  created_at  timestamp with time zone DEFAULT now()
);

-- ── workspaces ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workspaces (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid,
  name       text,
  slug       text UNIQUE,
  config     jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Done.
-- After running, refresh your Supabase schema cache:
-- Supabase Dashboard → Settings → API → "Reload schema"
