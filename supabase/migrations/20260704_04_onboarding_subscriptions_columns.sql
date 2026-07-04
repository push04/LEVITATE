-- CRITICAL FIX: onboarding_subscriptions was missing columns that
-- src/app/api/onboard/checkout/route.ts was inserting into directly
-- (company_id, user_id, coupon_id, coupon_code, coupon_discount_type,
-- coupon_discount_value, discount_amount, final_amount, workspace_path,
-- workspace_mode, backlink_enabled). Every real checkout attempt failed at
-- the final database write (AFTER the Razorpay subscription was already
-- created), so no new customer could complete signup. The code has been
-- fixed to read/write this data via the `notes` JSON column instead (which
-- already existed and is what business-portal.ts and the webhook already
-- treat as the source of truth) — so this migration is not required for the
-- app to work again. It's here so these become real, indexable columns
-- going forward, backfilled from the existing `notes` data.

ALTER TABLE onboarding_subscriptions ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE onboarding_subscriptions ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE onboarding_subscriptions ADD COLUMN IF NOT EXISTS coupon_id uuid;
ALTER TABLE onboarding_subscriptions ADD COLUMN IF NOT EXISTS coupon_code text;
ALTER TABLE onboarding_subscriptions ADD COLUMN IF NOT EXISTS coupon_discount_type text;
ALTER TABLE onboarding_subscriptions ADD COLUMN IF NOT EXISTS coupon_discount_value numeric;
ALTER TABLE onboarding_subscriptions ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0;
ALTER TABLE onboarding_subscriptions ADD COLUMN IF NOT EXISTS final_amount numeric;
ALTER TABLE onboarding_subscriptions ADD COLUMN IF NOT EXISTS workspace_path text;
ALTER TABLE onboarding_subscriptions ADD COLUMN IF NOT EXISTS workspace_mode text DEFAULT 'backlink';
ALTER TABLE onboarding_subscriptions ADD COLUMN IF NOT EXISTS backlink_enabled boolean DEFAULT true;

-- Backfill existing rows from notes so historical signups aren't left null.
UPDATE onboarding_subscriptions
SET
  company_id = COALESCE(company_id, (notes->>'company_id')::uuid),
  user_id = COALESCE(user_id, (notes->>'user_id')::uuid),
  discount_amount = COALESCE(discount_amount, (notes->>'discount_amount')::numeric, 0),
  final_amount = COALESCE(final_amount, (notes->>'final_amount')::numeric, amount)
WHERE notes IS NOT NULL;

CREATE INDEX IF NOT EXISTS onboarding_subscriptions_company_id_idx ON onboarding_subscriptions(company_id);
CREATE INDEX IF NOT EXISTS onboarding_subscriptions_user_id_idx ON onboarding_subscriptions(user_id);

-- After running this, ask PostgREST to pick up the new columns immediately
-- instead of waiting for its next auto-reload:
NOTIFY pgrst, 'reload schema';
