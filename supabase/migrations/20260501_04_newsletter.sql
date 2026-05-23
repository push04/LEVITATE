-- Newsletter System
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  source text CHECK (source IN ('homepage','blog','footer','tool','comparison','onboarding')),
  subscribed_at timestamptz DEFAULT now(),
  confirmed boolean DEFAULT false,
  confirmation_token text,
  unsubscribed_at timestamptz
);

-- Website Orders
CREATE TABLE IF NOT EXISTS website_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  vertical text NOT NULL,
  business_name text NOT NULL,
  city text NOT NULL,
  status text DEFAULT 'queued' CHECK (status IN ('queued','building','deployed','failed','blocked_security')),
  live_url text,
  netlify_site_id text,
  ordered_at timestamptz DEFAULT now(),
  build_started_at timestamptz,
  build_completed_at timestamptz,
  error_message text
);

-- Conversion Events
CREATE TABLE IF NOT EXISTS conversion_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE SET NULL,
  session_id text,
  page_url text,
  referrer_url text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  created_at timestamptz DEFAULT now()
);

-- Payment Events
CREATE TABLE IF NOT EXISTS payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  razorpay_payment_id text UNIQUE,
  event_type text,
  raw_payload jsonb,
  processed boolean DEFAULT false,
  processed_at timestamptz,
  created_at timestamptz DEFAULT now()
);
