-- Outreach email templates (admin-saved, used by automated outreach trigger)
-- Variables supported in subject/body: {business_name}, {category}, {city}

CREATE TABLE IF NOT EXISTS outreach_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  subject     TEXT NOT NULL,
  body        TEXT NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT false,
  use_ai      BOOLEAN NOT NULL DEFAULT false,  -- if true, AI generates body using this subject as a hint
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only one template can be active at a time — enforced in the API layer
CREATE INDEX IF NOT EXISTS outreach_templates_active_idx ON outreach_templates(is_active) WHERE is_active = true;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_outreach_template_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS outreach_templates_updated_at ON outreach_templates;
CREATE TRIGGER outreach_templates_updated_at
  BEFORE UPDATE ON outreach_templates
  FOR EACH ROW EXECUTE FUNCTION update_outreach_template_updated_at();

ALTER TABLE outreach_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage outreach_templates" ON outreach_templates;
CREATE POLICY "Admins manage outreach_templates"
  ON outreach_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);
