-- ============================================================
-- LEVITATE LABS — Intake Form Schema
-- Run this entire file in your Supabase SQL Editor
-- ============================================================

-- ── Personalised intake links (admin-generated, shareable) ───────────────

CREATE TABLE IF NOT EXISTS intake_links (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token        TEXT UNIQUE NOT NULL,          -- short slug used in URL ?ref=<token>

  -- Company context pre-filled by admin
  company_name TEXT,
  company_website TEXT,
  company_type TEXT,                          -- e.g. 'E-commerce', 'SaaS', 'Agency'
  company_city TEXT,
  admin_notes  TEXT,                          -- internal note for admin

  -- Tracking
  view_count   INTEGER DEFAULT 0,
  submit_count INTEGER DEFAULT 0,
  created_by   TEXT,                          -- admin email
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  expires_at   TIMESTAMPTZ                    -- null = never expires
);

CREATE INDEX IF NOT EXISTS idx_intake_links_token ON intake_links(token);

ALTER TABLE intake_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage intake_links" ON intake_links;
CREATE POLICY "Admins manage intake_links"
  ON intake_links FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── Intake submissions table ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS intake_submissions (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Contact
  business_name             TEXT NOT NULL,
  contact_name              TEXT NOT NULL,
  email                     TEXT NOT NULL,
  phone                     TEXT,
  website                   TEXT,
  referral                  TEXT,

  -- AI qualification outputs
  qualification_messages    JSONB,           -- full [{role, content}] chat log
  selected_service_slugs    TEXT[],          -- slugs the user selected
  recommended_service_slugs TEXT[],          -- slugs Groq recommended
  ai_qualification_summary  TEXT,            -- internal Groq note
  ai_proposal_snippet       TEXT,            -- personalised outreach message
  ai_lead_score             INTEGER,         -- 1–100
  ai_lead_tier              TEXT,            -- 'hot' | 'warm' | 'cold'
  ai_recommendation_reason  TEXT,            -- one-sentence recommendation rationale

  -- Link tracking
  ref_token                 TEXT REFERENCES intake_links(token) ON DELETE SET NULL,

  -- Status tracking
  status                    TEXT DEFAULT 'new',
  -- valid: 'new', 'contacted', 'qualified', 'proposal_sent', 'converted', 'lost'

  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_intake_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS intake_submissions_updated_at ON intake_submissions;
CREATE TRIGGER intake_submissions_updated_at
  BEFORE UPDATE ON intake_submissions
  FOR EACH ROW EXECUTE FUNCTION update_intake_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_intake_status     ON intake_submissions(status);
CREATE INDEX IF NOT EXISTS idx_intake_tier       ON intake_submissions(ai_lead_tier);
CREATE INDEX IF NOT EXISTS idx_intake_created    ON intake_submissions(created_at DESC);

-- RLS
ALTER TABLE intake_submissions ENABLE ROW LEVEL SECURITY;

-- Anyone (even unauthenticated) can INSERT (the public intake form)
DROP POLICY IF EXISTS "Anyone can insert intake" ON intake_submissions;
CREATE POLICY "Anyone can insert intake"
  ON intake_submissions FOR INSERT TO anon WITH CHECK (true);

-- Authenticated users (admin) can read, update, delete
DROP POLICY IF EXISTS "Admins read intake" ON intake_submissions;
CREATE POLICY "Admins read intake"
  ON intake_submissions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins update intake" ON intake_submissions;
CREATE POLICY "Admins update intake"
  ON intake_submissions FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins delete intake" ON intake_submissions;
CREATE POLICY "Admins delete intake"
  ON intake_submissions FOR DELETE TO authenticated USING (true);
