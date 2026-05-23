-- Vertical Configs Table
CREATE TABLE IF NOT EXISTS vertical_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical text UNIQUE NOT NULL,
  display_name text NOT NULL,
  bizdev_search_queries jsonb NOT NULL,
  bizdev_lead_scoring_criteria jsonb NOT NULL,
  bizdev_system_prompt text NOT NULL,
  outreach_system_prompt text NOT NULL,
  outreach_message_templates jsonb NOT NULL,
  outreach_hinglish_phrases jsonb NOT NULL,
  followup_system_prompt text NOT NULL,
  followup_message_templates jsonb NOT NULL,
  proposal_system_prompt text NOT NULL,
  proposal_section_structure jsonb NOT NULL,
  proposal_value_props jsonb NOT NULL,
  retention_system_prompt text NOT NULL,
  retention_checkin_templates jsonb NOT NULL,
  reporter_metrics_to_highlight jsonb NOT NULL,
  website_system_prompt text NOT NULL,
  website_default_pages jsonb NOT NULL,
  website_default_color_scheme jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Website Templates Table
CREATE TABLE IF NOT EXISTS website_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical text UNIQUE NOT NULL,
  system_prompt text NOT NULL,
  base_files jsonb NOT NULL,
  page_configs jsonb NOT NULL,
  default_color_scheme jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
