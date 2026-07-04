-- Marketplace listing service: businesses pay to have their products listed on
-- Amazon / Flipkart / Meesho, with optional photography and tagging add-ons.
-- Admin fulfills each listing manually and updates status per marketplace;
-- businesses see live status on their own dashboard.

CREATE TABLE IF NOT EXISTS marketplace_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  marketplaces text[] NOT NULL DEFAULT '{}',
  addon_photography boolean DEFAULT false,
  addon_tagging boolean DEFAULT false,
  product_count integer NOT NULL DEFAULT 0,
  subtotal_amount numeric NOT NULL DEFAULT 0,
  discount_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  currency text DEFAULT 'INR',
  payment_status text NOT NULL DEFAULT 'pending_payment'
    CHECK (payment_status IN ('pending_payment', 'paid', 'failed', 'cancelled')),
  razorpay_payment_link_id text,
  razorpay_payment_link_url text,
  razorpay_payment_id text,
  status text NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'in_progress', 'completed', 'rejected')),
  admin_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS marketplace_request_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES marketplace_requests(id) ON DELETE CASCADE,
  company_id uuid NOT NULL,
  product_name text NOT NULL,
  description text,
  category text,
  tags text[] DEFAULT '{}',
  image_urls text[] DEFAULT '{}',
  -- e.g. {"amazon": "listed", "flipkart": "in_progress", "meesho": "pending"}
  marketplace_status jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS marketplace_requests_company_id_idx ON marketplace_requests(company_id);
CREATE INDEX IF NOT EXISTS marketplace_request_products_request_id_idx ON marketplace_request_products(request_id);
CREATE INDEX IF NOT EXISTS marketplace_request_products_company_id_idx ON marketplace_request_products(company_id);

ALTER TABLE marketplace_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_request_products ENABLE ROW LEVEL SECURITY;

-- Only accessed via service role from server API routes (src/app/api/business/marketplace/*
-- and src/app/api/admin/marketplace/*), never directly from the browser client — same
-- pattern as company_emails, to avoid repeating the agent_emails RLS leak.
