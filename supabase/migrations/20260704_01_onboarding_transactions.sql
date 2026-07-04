-- Per-charge transaction ledger for SaaS subscription billing (onboarding_subscriptions).
-- Previously, subscription.activated/subscription.charged webhooks only updated the
-- subscription's status/notes — there was no per-charge audit trail, so recurring
-- monthly/annual charges could not be reconciled against Razorpay from the DB.
-- Run this in the Supabase SQL editor (or `supabase db push`), then the code in
-- src/app/api/webhook/razorpay/route.ts will start writing rows here automatically.

CREATE TABLE IF NOT EXISTS onboarding_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid REFERENCES onboarding_subscriptions(id) ON DELETE SET NULL,
  company_id uuid,
  razorpay_subscription_id text,
  razorpay_payment_id text,
  event_type text NOT NULL,
  amount numeric,
  currency text DEFAULT 'INR',
  status text DEFAULT 'captured',
  created_at timestamptz DEFAULT now(),
  -- A given Razorpay payment should only ever produce one ledger row, even if the
  -- webhook is redelivered.
  CONSTRAINT onboarding_transactions_payment_id_unique UNIQUE (razorpay_payment_id)
);

CREATE INDEX IF NOT EXISTS onboarding_transactions_subscription_id_idx
  ON onboarding_transactions(subscription_id);

CREATE INDEX IF NOT EXISTS onboarding_transactions_company_id_idx
  ON onboarding_transactions(company_id);

ALTER TABLE onboarding_transactions ENABLE ROW LEVEL SECURITY;

-- Service role (used by the webhook + admin routes) bypasses RLS by default;
-- no anon/authenticated policy is defined since this table is never queried
-- directly from the browser.
