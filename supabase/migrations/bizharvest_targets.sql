-- ============================================================
-- BizHarvest Integration Migration
-- Run in: Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- ── bizharvest_targets: cities + business types to scrape ─────────────────
CREATE TABLE IF NOT EXISTS bizharvest_targets (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  city          text NOT NULL,
  business_type text NOT NULL,
  is_active     boolean DEFAULT true,
  priority      integer DEFAULT 0,  -- higher = scraped first
  created_at    timestamptz DEFAULT now(),
  UNIQUE(city, business_type)
);

CREATE INDEX IF NOT EXISTS idx_bizharvest_active
  ON bizharvest_targets(is_active, priority DESC);

-- RLS: only service role can access (BizHarvest uses service key via API)
ALTER TABLE bizharvest_targets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages bizharvest_targets" ON bizharvest_targets;
CREATE POLICY "Service role manages bizharvest_targets"
  ON bizharvest_targets FOR ALL
  TO service_role USING (true) WITH CHECK (true);

-- Admins can read/write via dashboard
DROP POLICY IF EXISTS "Admins manage bizharvest_targets" ON bizharvest_targets;
CREATE POLICY "Admins manage bizharvest_targets"
  ON bizharvest_targets FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

-- ── Seed default targets (Levitate Labs key markets) ──────────────────────
INSERT INTO bizharvest_targets (city, business_type, priority) VALUES
  ('Vadodara',    'restaurants',           10),
  ('Vadodara',    'CA firm',               10),
  ('Vadodara',    'hospitals',              9),
  ('Vadodara',    'clinic',                 9),
  ('Vadodara',    'salon',                  8),
  ('Vadodara',    'kirana store',           8),
  ('Vadodara',    'gym',                    7),
  ('Vadodara',    'real estate agent',      7),
  ('Vadodara',    'coaching centre',        7),
  ('Surat',       'diamond trading',       10),
  ('Surat',       'textile shop',           9),
  ('Surat',       'restaurants',            8),
  ('Ahmedabad',   'CA firm',               10),
  ('Ahmedabad',   'hospitals',              9),
  ('Ahmedabad',   'restaurants',            8),
  ('Patna',       'hospitals',              8),
  ('Patna',       'kirana store',           7),
  ('Jamshedpur',  'CA firm',               8),
  ('Jamshedpur',  'restaurants',            7)
ON CONFLICT (city, business_type) DO NOTHING;

-- ── Add unique constraint on leads to prevent BizHarvest duplicates ───────
-- Safe: only adds if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'leads_name_city_source_unique'
  ) THEN
    ALTER TABLE leads
      ADD CONSTRAINT leads_name_city_source_unique
      UNIQUE (name, city, source);
  END IF;
EXCEPTION WHEN others THEN
  -- Table or columns may not exist in all deployments — skip safely
  NULL;
END $$;

-- Done.
-- After running:
--   1. Set BIZHARVEST_API_KEY in your Vercel/Netlify environment variables
--   2. Copy .env.example → .env in the bizharvest/ folder
--   3. Double-click Run_BizHarvest.bat to start scraping
