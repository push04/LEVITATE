-- Add missing columns to workspaces table
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS business_city text;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS business_category text;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS referral_code text UNIQUE;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS first_agent_output_at timestamptz;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS first_agent_output_type text;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS website_live_url text;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS website_netlify_site_id text;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS website_deployed_at timestamptz;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS daily_quota_remaining int DEFAULT 0;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS custom_domain text;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS subdomain text;

-- Add website_deployments table if not exists
CREATE TABLE IF NOT EXISTS website_deployments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  deployed_at timestamptz DEFAULT now(),
  month_year text
);
