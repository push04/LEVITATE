-- Onboarding Coupons for plan discounts
create table if not exists onboarding_coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  status text not null default 'draft' check (status in ('draft', 'active', 'expired', 'disabled')),
  discount_type text not null default 'percentage' check (discount_type in ('percentage', 'flat')),
  discount_value numeric not null default 0,
  max_redemptions int,
  redemption_count int not null default 0,
  min_order_amount numeric,
  max_discount_amount numeric,
  valid_from timestamptz,
  valid_until timestamptz,
  applies_to_all_plans boolean not null default true,
  eligible_plan_ids uuid[] default '{}',
  usage_scope text not null default 'per_user' check (usage_scope in ('per_user', 'global')),
  is_stackable boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists onboarding_coupons_code_idx on onboarding_coupons(code);
create index if not exists onboarding_coupons_status_idx on onboarding_coupons(status);

alter table onboarding_coupons enable row level security;
-- Only service role (admin) can manage coupons; public can only validate via server-side logic
create policy "Service role manages coupons" on onboarding_coupons
  for all using (auth.role() = 'service_role');
