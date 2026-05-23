-- ============================================================
-- LevitateOS business platform follow-up schema upgrades
-- Covers database support for:
-- 1. Path/backlink-based workspaces instead of subdomain-only URLs
-- 2. Coupon creation + redemption for onboarding plans
-- 3. Multi-module market research selection + richer AI generation metadata
-- 4. Shareable reports + shareable legal notices with backlink fields
-- 5. CRM lead copy/edit tables for subscribed businesses
-- 6. Live automation metric source columns + aggregate view
-- 7. Helper validation functions for mandatory business/legal form fields
--
-- Notes:
-- - This file is intentionally idempotent.
-- - This file does NOT implement UI-only items like red borders, animations,
--   theme redesigns, mobile layout fixes, or refined prompts by itself.
-- - Run this after add_business_intelligence_and_legal_tools.sql.
-- ============================================================

create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

-- ============================================================
-- Shared helper: company access check for business/admin users
-- ============================================================
create or replace function public.user_can_access_company(p_company_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_company_id is null then
    return false;
  end if;

  return exists (
    select 1
    from companies c
    where c.id = p_company_id
      and c.owner_id = auth.uid()
  )
  or exists (
    select 1
    from business_profiles bp
    where bp.company_id = p_company_id
      and bp.user_id = auth.uid()
  )
  or exists (
    select 1
    from profiles p
    where p.id = auth.uid()
      and p.role in ('super_admin', 'admin')
  );
end;
$$;

-- ============================================================
-- Research module catalog so businesses can select multiple modules
-- with explicit metadata instead of relying only on hardcoded arrays
-- ============================================================
create table if not exists public.business_research_module_catalog (
  module_id text primary key,
  title text not null,
  short_label text not null,
  description text,
  anchor text,
  category text not null default 'market_research',
  is_active boolean not null default true,
  is_default boolean not null default true,
  is_premium boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.business_research_module_catalog enable row level security;

drop policy if exists "module catalog readable by authenticated users" on public.business_research_module_catalog;
create policy "module catalog readable by authenticated users"
on public.business_research_module_catalog
for select
using (auth.role() = 'authenticated');

drop policy if exists "module catalog manageable by admins" on public.business_research_module_catalog;
create policy "module catalog manageable by admins"
on public.business_research_module_catalog
for all
using (
  exists (
    select 1
    from profiles
    where profiles.id = auth.uid()
      and profiles.role in ('super_admin', 'admin')
  )
)
with check (
  exists (
    select 1
    from profiles
    where profiles.id = auth.uid()
      and profiles.role in ('super_admin', 'admin')
  )
);

insert into public.business_research_module_catalog (
  module_id,
  title,
  short_label,
  description,
  anchor,
  sort_order
)
values
  ('business_profile', 'Business Profile Analyser', 'Profile', 'Core business identity, differentiation, and maturity.', 'business-profile', 1),
  ('competitor_intelligence', 'Competitor Intelligence Engine', 'Competitors', 'Direct and indirect competitor positioning, strengths, gaps, and threat scores.', 'competitor-intelligence', 2),
  ('market_sizing', 'Market Sizing - TAM SAM SOM', 'Market Size', 'Addressable market sizing, segment splits, and growth potential.', 'market-sizing', 3),
  ('future_growth', 'Future Growth Projector', 'Growth', '1, 3, and 5-year opportunity scenarios and catalysts.', 'future-growth', 4),
  ('swot_analysis', 'SWOT Analysis', 'SWOT', 'Detailed strengths, weaknesses, opportunities, and threats.', 'swot-analysis', 5),
  ('pestle_analysis', 'PESTLE Analysis', 'PESTLE', 'Political, economic, social, technological, legal, and environmental forces.', 'pestle-analysis', 6),
  ('customer_personas', 'Customer Persona Builder', 'Personas', 'Audience segments, motivations, objections, and alternatives.', 'customer-personas', 7),
  ('pricing_intelligence', 'Pricing Intelligence Analyser', 'Pricing', 'Pricing models, market gaps, and pricing strategy recommendations.', 'pricing-intelligence', 8),
  ('technology_landscape', 'Technology and Innovation Landscape', 'Technology', 'Industry tools, AI adoption, and disruption risk.', 'technology-landscape', 9),
  ('go_to_market', 'Go-To-Market Strategy Analyser', 'GTM', 'Positioning, acquisition channels, and phased launch recommendations.', 'go-to-market', 10),
  ('funding_landscape', 'Investment and Funding Landscape', 'Funding', 'Deal activity, investor appetite, and fundability signals.', 'funding-landscape', 11),
  ('risk_matrix', 'Risk Assessment Matrix', 'Risk', 'Probability-impact risk mapping and mitigation priorities.', 'risk-assessment', 12),
  ('industry_benchmarking', 'Industry Benchmarking', 'Benchmarking', 'KPI ranges and target-versus-industry benchmarking.', 'industry-benchmarking', 13),
  ('regulatory_landscape', 'Regulatory and Compliance Landscape', 'Compliance', 'Applicable Indian regulations, compliance checkpoints, and scheme opportunities.', 'regulatory-landscape', 14)
on conflict (module_id) do update
set
  title = excluded.title,
  short_label = excluded.short_label,
  description = excluded.description,
  anchor = excluded.anchor,
  category = excluded.category,
  is_active = excluded.is_active,
  is_default = excluded.is_default,
  is_premium = excluded.is_premium,
  sort_order = excluded.sort_order,
  updated_at = now();

-- ============================================================
-- Onboarding plan enhancements:
-- - richer module controls
-- - coupon capability flag
-- - backlink-first workspace mode
-- ============================================================
alter table if exists public.onboarding_plans
  add column if not exists research_module_access jsonb not null default '[
    "business_profile",
    "competitor_intelligence",
    "market_sizing",
    "future_growth",
    "swot_analysis",
    "pestle_analysis",
    "customer_personas",
    "pricing_intelligence",
    "technology_landscape",
    "go_to_market",
    "funding_landscape",
    "risk_matrix",
    "industry_benchmarking",
    "regulatory_landscape"
  ]'::jsonb,
  add column if not exists legal_tool_access jsonb not null default '{
    "noticeDrafter": true,
    "delayedPaymentAdvisor": true,
    "sharedLegalNotices": true
  }'::jsonb,
  add column if not exists couponing_enabled boolean not null default true,
  add column if not exists workspace_mode text not null default 'backlink';

-- ============================================================
-- Coupons for admin-controlled business subscription discounts
-- ============================================================
create table if not exists public.onboarding_coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  status text not null default 'draft',
  discount_type text not null default 'percentage',
  discount_value numeric(12,2) not null default 0,
  max_redemptions integer,
  redemption_count integer not null default 0,
  min_order_amount numeric(12,2),
  max_discount_amount numeric(12,2),
  valid_from timestamptz,
  valid_until timestamptz,
  applies_to_all_plans boolean not null default true,
  eligible_plan_ids jsonb not null default '[]'::jsonb,
  usage_scope text not null default 'per_user',
  is_stackable boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_onboarding_coupons_status on public.onboarding_coupons(status);
create index if not exists idx_onboarding_coupons_valid_until on public.onboarding_coupons(valid_until);

alter table public.onboarding_coupons enable row level security;

drop policy if exists "coupons readable by authenticated users" on public.onboarding_coupons;
create policy "coupons readable by authenticated users"
on public.onboarding_coupons
for select
  using (
  (
    auth.role() = 'authenticated'
    and status = 'active'
  )
  or exists (
    select 1
    from profiles
    where profiles.id = auth.uid()
      and profiles.role in ('super_admin', 'admin')
  )
);

drop policy if exists "coupons manageable by admins" on public.onboarding_coupons;
create policy "coupons manageable by admins"
on public.onboarding_coupons
for all
using (
  exists (
    select 1
    from profiles
    where profiles.id = auth.uid()
      and profiles.role in ('super_admin', 'admin')
  )
)
with check (
  exists (
    select 1
    from profiles
    where profiles.id = auth.uid()
      and profiles.role in ('super_admin', 'admin')
  )
);

create table if not exists public.onboarding_coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.onboarding_coupons(id) on delete cascade,
  subscription_id uuid references public.onboarding_subscriptions(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  coupon_code text not null,
  original_amount numeric(12,2) not null default 0,
  discount_amount numeric(12,2) not null default 0,
  final_amount numeric(12,2) not null default 0,
  status text not null default 'applied',
  metadata jsonb not null default '{}'::jsonb,
  redeemed_at timestamptz not null default now(),
  reversed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_coupon_redemptions_coupon_id on public.onboarding_coupon_redemptions(coupon_id);
create index if not exists idx_coupon_redemptions_subscription_id on public.onboarding_coupon_redemptions(subscription_id);
create index if not exists idx_coupon_redemptions_user_id on public.onboarding_coupon_redemptions(user_id);
create index if not exists idx_coupon_redemptions_company_id on public.onboarding_coupon_redemptions(company_id);

alter table public.onboarding_coupon_redemptions enable row level security;

drop policy if exists "coupon redemptions readable by owners or admins" on public.onboarding_coupon_redemptions;
create policy "coupon redemptions readable by owners or admins"
on public.onboarding_coupon_redemptions
for select
using (
  auth.uid() = user_id
  or public.user_can_access_company(company_id)
  or exists (
    select 1
    from profiles
    where profiles.id = auth.uid()
      and profiles.role in ('super_admin', 'admin')
  )
);

drop policy if exists "coupon redemptions manageable by admins" on public.onboarding_coupon_redemptions;
create policy "coupon redemptions manageable by admins"
on public.onboarding_coupon_redemptions
for all
using (
  exists (
    select 1
    from profiles
    where profiles.id = auth.uid()
      and profiles.role in ('super_admin', 'admin')
  )
)
with check (
  exists (
    select 1
    from profiles
    where profiles.id = auth.uid()
      and profiles.role in ('super_admin', 'admin')
  )
);

-- ============================================================
-- Onboarding subscription upgrades:
-- - explicit user/company linkage
-- - backlink-first workspace fields
-- - coupon tracking
-- - per-business module overrides
-- ============================================================
alter table if exists public.onboarding_subscriptions
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists company_id uuid references public.companies(id) on delete set null,
  add column if not exists workspace_slug text,
  add column if not exists workspace_path text,
  add column if not exists workspace_backlink_url text,
  add column if not exists workspace_mode text not null default 'backlink',
  add column if not exists backlink_enabled boolean not null default true,
  add column if not exists coupon_id uuid references public.onboarding_coupons(id) on delete set null,
  add column if not exists coupon_code text,
  add column if not exists coupon_discount_type text,
  add column if not exists coupon_discount_value numeric(12,2),
  add column if not exists discount_amount numeric(12,2) not null default 0,
  add column if not exists final_amount numeric(12,2),
  add column if not exists feature_controls_override jsonb not null default '{}'::jsonb,
  add column if not exists research_module_access jsonb not null default '[
    "business_profile",
    "competitor_intelligence",
    "market_sizing",
    "future_growth",
    "swot_analysis",
    "pestle_analysis",
    "customer_personas",
    "pricing_intelligence",
    "technology_landscape",
    "go_to_market",
    "funding_landscape",
    "risk_matrix",
    "industry_benchmarking",
    "regulatory_landscape"
  ]'::jsonb,
  add column if not exists legal_tool_access jsonb not null default '{
    "noticeDrafter": true,
    "delayedPaymentAdvisor": true,
    "sharedLegalNotices": true
  }'::jsonb;

update public.onboarding_subscriptions
set user_id = nullif(notes ->> 'user_id', '')::uuid
where user_id is null
  and notes ? 'user_id'
  and (notes ->> 'user_id') ~* '^[0-9a-f-]{36}$';

update public.onboarding_subscriptions
set company_id = nullif(notes ->> 'company_id', '')::uuid
where company_id is null
  and notes ? 'company_id'
  and (notes ->> 'company_id') ~* '^[0-9a-f-]{36}$';

update public.onboarding_subscriptions
set workspace_slug = coalesce(workspace_slug, subdomain_slug)
where workspace_slug is null;

update public.onboarding_subscriptions
set workspace_path = coalesce(workspace_path, '/' || coalesce(workspace_slug, subdomain_slug))
where workspace_path is null;

update public.onboarding_subscriptions
set workspace_backlink_url = coalesce(
  workspace_backlink_url,
  'https://levitatelabs.online/' || coalesce(workspace_slug, subdomain_slug)
)
where workspace_backlink_url is null;

update public.onboarding_subscriptions
set final_amount = greatest(coalesce(amount, 0) - coalesce(discount_amount, 0), 0)
where final_amount is null;

create unique index if not exists idx_onboarding_subscriptions_workspace_slug
  on public.onboarding_subscriptions(workspace_slug)
  where workspace_slug is not null;

create unique index if not exists idx_onboarding_subscriptions_workspace_path
  on public.onboarding_subscriptions(workspace_path)
  where workspace_path is not null;

create unique index if not exists idx_onboarding_subscriptions_workspace_backlink_url
  on public.onboarding_subscriptions(workspace_backlink_url)
  where workspace_backlink_url is not null;

create index if not exists idx_onboarding_subscriptions_user_id
  on public.onboarding_subscriptions(user_id);

create index if not exists idx_onboarding_subscriptions_company_id
  on public.onboarding_subscriptions(company_id);

create index if not exists idx_onboarding_subscriptions_coupon_id
  on public.onboarding_subscriptions(coupon_id);

-- ============================================================
-- Business research report upgrades:
-- - actual AI generation metadata
-- - backlink/share metadata
-- - export metadata
-- - explicit module ordering and traceability
-- ============================================================
alter table if exists public.business_research_reports
  add column if not exists generation_provider text,
  add column if not exists generation_model text,
  add column if not exists prompt_version text,
  add column if not exists generation_mode text not null default 'ai',
  add column if not exists selection_mode text not null default 'custom',
  add column if not exists report_theme text not null default 'light',
  add column if not exists share_slug text,
  add column if not exists share_path text,
  add column if not exists share_backlink_url text,
  add column if not exists shared_cta jsonb not null default '{
    "headline": "Want a report for your business?",
    "label": "Subscribe to LevitateOS",
    "url": "https://levitatelabs.online/onboard"
  }'::jsonb,
  add column if not exists source_links jsonb not null default '[]'::jsonb,
  add column if not exists render_manifest jsonb not null default '{}'::jsonb,
  add column if not exists generation_started_at timestamptz,
  add column if not exists generation_completed_at timestamptz,
  add column if not exists groq_request_id text,
  add column if not exists is_mock boolean not null default false;

update public.business_research_reports
set share_slug = coalesce(share_slug, share_token)
where share_slug is null
  and share_token is not null;

update public.business_research_reports
set share_path = coalesce(share_path, '/shared/report/' || coalesce(share_slug, share_token))
where share_path is null
  and (share_slug is not null or share_token is not null);

update public.business_research_reports
set share_backlink_url = coalesce(share_backlink_url, 'https://levitatelabs.online' || share_path)
where share_backlink_url is null
  and share_path is not null;

create unique index if not exists idx_business_research_reports_share_slug
  on public.business_research_reports(share_slug)
  where share_slug is not null;

create unique index if not exists idx_business_research_reports_share_backlink_url
  on public.business_research_reports(share_backlink_url)
  where share_backlink_url is not null;

alter table if exists public.business_research_report_modules
  add column if not exists sort_order integer not null default 0,
  add column if not exists is_selected boolean not null default true,
  add column if not exists model_name text,
  add column if not exists prompt_version text,
  add column if not exists generation_ms integer,
  add column if not exists prompt_input jsonb not null default '{}'::jsonb,
  add column if not exists raw_response jsonb,
  add column if not exists citations jsonb not null default '[]'::jsonb,
  add column if not exists charts jsonb not null default '[]'::jsonb,
  add column if not exists render_theme text not null default 'light',
  add column if not exists is_mock boolean not null default false;

create index if not exists idx_business_research_report_modules_sort_order
  on public.business_research_report_modules(report_id, sort_order);

create table if not exists public.business_research_report_exports (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.business_research_reports(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  export_type text not null,
  status text not null default 'pending',
  theme text not null default 'light',
  file_name text,
  file_url text,
  page_count integer,
  preview_image_url text,
  chart_manifest jsonb not null default '[]'::jsonb,
  generated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_business_research_report_exports_report_id
  on public.business_research_report_exports(report_id);

create index if not exists idx_business_research_report_exports_user_id
  on public.business_research_report_exports(user_id, created_at desc);

alter table public.business_research_report_exports enable row level security;

drop policy if exists "business research exports own rows" on public.business_research_report_exports;
create policy "business research exports own rows"
on public.business_research_report_exports
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- ============================================================
-- Legal notice upgrades:
-- - actual AI generation metadata
-- - shareable backlinks
-- - export metadata
-- ============================================================
alter table if exists public.business_legal_notices
  add column if not exists status text not null default 'draft',
  add column if not exists notice_type text not null default 'payment_recovery',
  add column if not exists generation_model text,
  add column if not exists prompt_version text,
  add column if not exists groq_request_id text,
  add column if not exists cited_laws jsonb not null default '[]'::jsonb,
  add column if not exists legal_sections jsonb not null default '[]'::jsonb,
  add column if not exists share_token text,
  add column if not exists share_slug text,
  add column if not exists share_path text,
  add column if not exists share_backlink_url text,
  add column if not exists shared_cta jsonb not null default '{
    "headline": "Need a professionally drafted legal notice for your business?",
    "label": "Subscribe to LevitateOS",
    "url": "https://levitatelabs.online/onboard"
  }'::jsonb,
  add column if not exists export_theme text not null default 'legal_paper',
  add column if not exists rendered_html text,
  add column if not exists render_manifest jsonb not null default '{}'::jsonb,
  add column if not exists generation_started_at timestamptz,
  add column if not exists generation_completed_at timestamptz,
  add column if not exists is_mock boolean not null default false;

update public.business_legal_notices
set share_slug = coalesce(share_slug, share_token)
where share_slug is null
  and share_token is not null;

update public.business_legal_notices
set share_path = coalesce(share_path, '/shared/legal-notice/' || coalesce(share_slug, share_token))
where share_path is null
  and (share_slug is not null or share_token is not null);

update public.business_legal_notices
set share_backlink_url = coalesce(share_backlink_url, 'https://levitatelabs.online' || share_path)
where share_backlink_url is null
  and share_path is not null;

create unique index if not exists idx_business_legal_notices_share_token
  on public.business_legal_notices(share_token)
  where share_token is not null;

create unique index if not exists idx_business_legal_notices_share_slug
  on public.business_legal_notices(share_slug)
  where share_slug is not null;

create unique index if not exists idx_business_legal_notices_share_backlink_url
  on public.business_legal_notices(share_backlink_url)
  where share_backlink_url is not null;

create table if not exists public.business_legal_notice_exports (
  id uuid primary key default gen_random_uuid(),
  notice_id uuid not null references public.business_legal_notices(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  export_type text not null,
  status text not null default 'pending',
  theme text not null default 'legal_paper',
  file_name text,
  file_url text,
  page_count integer,
  preview_image_url text,
  manifest jsonb not null default '{}'::jsonb,
  generated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_business_legal_notice_exports_notice_id
  on public.business_legal_notice_exports(notice_id);

create index if not exists idx_business_legal_notice_exports_user_id
  on public.business_legal_notice_exports(user_id, created_at desc);

alter table public.business_legal_notice_exports enable row level security;

drop policy if exists "business legal exports own rows" on public.business_legal_notice_exports;
create policy "business legal exports own rows"
on public.business_legal_notice_exports
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- ============================================================
-- Validation helper functions for mandatory field highlighting
-- App can call these and mark missing required fields in red
-- ============================================================
create or replace function public.business_profile_missing_required_fields(p_profile jsonb)
returns jsonb
language plpgsql
immutable
as $$
declare
  missing text[] := array[]::text[];
begin
  if coalesce(trim(p_profile ->> 'businessName'), '') = '' then
    missing := array_append(missing, 'businessName');
  end if;

  if coalesce(trim(p_profile ->> 'oneLineDescription'), '') = '' then
    missing := array_append(missing, 'oneLineDescription');
  end if;

  if coalesce(trim(p_profile ->> 'industry'), '') = '' then
    missing := array_append(missing, 'industry');
  end if;

  if coalesce(trim(p_profile ->> 'subIndustry'), '') = '' then
    missing := array_append(missing, 'subIndustry');
  end if;

  if coalesce(trim(p_profile ->> 'businessModelType'), '') = '' then
    missing := array_append(missing, 'businessModelType');
  end if;

  if jsonb_typeof(p_profile -> 'primaryGeographies') <> 'array'
     or jsonb_array_length(coalesce(p_profile -> 'primaryGeographies', '[]'::jsonb)) = 0 then
    missing := array_append(missing, 'primaryGeographies');
  end if;

  if coalesce(trim(p_profile ->> 'companyStage'), '') = '' then
    missing := array_append(missing, 'companyStage');
  end if;

  if coalesce(trim(p_profile ->> 'teamSizeRange'), '') = '' then
    missing := array_append(missing, 'teamSizeRange');
  end if;

  if coalesce(trim(p_profile ->> 'registrationStatus'), '') = '' then
    missing := array_append(missing, 'registrationStatus');
  end if;

  if not (p_profile ? 'isMsmeRegistered') then
    missing := array_append(missing, 'isMsmeRegistered');
  end if;

  if coalesce(trim(p_profile ->> 'annualRevenueBracket'), '') = '' then
    missing := array_append(missing, 'annualRevenueBracket');
  end if;

  if jsonb_typeof(p_profile -> 'primarySalesChannels') <> 'array'
     or jsonb_array_length(coalesce(p_profile -> 'primarySalesChannels', '[]'::jsonb)) = 0 then
    missing := array_append(missing, 'primarySalesChannels');
  end if;

  return to_jsonb(missing);
end;
$$;

create or replace function public.research_intent_missing_required_fields(p_intent jsonb)
returns jsonb
language plpgsql
immutable
as $$
declare
  missing text[] := array[]::text[];
begin
  if coalesce(trim(p_intent ->> 'intentType'), '') = '' then
    missing := array_append(missing, 'intentType');
  end if;

  if coalesce(trim(p_intent ->> 'targetName'), '') = '' then
    missing := array_append(missing, 'targetName');
  end if;

  return to_jsonb(missing);
end;
$$;

create or replace function public.legal_notice_missing_required_fields(p_notice jsonb)
returns jsonb
language plpgsql
immutable
as $$
declare
  missing text[] := array[]::text[];
begin
  if coalesce(trim(p_notice ->> 'senderName'), '') = '' then
    missing := array_append(missing, 'senderName');
  end if;

  if coalesce(trim(p_notice ->> 'senderAddress'), '') = '' then
    missing := array_append(missing, 'senderAddress');
  end if;

  if coalesce(trim(p_notice ->> 'senderContact'), '') = '' then
    missing := array_append(missing, 'senderContact');
  end if;

  if coalesce(trim(p_notice ->> 'senderEntityType'), '') = '' then
    missing := array_append(missing, 'senderEntityType');
  end if;

  if coalesce(trim(p_notice ->> 'recipientName'), '') = '' then
    missing := array_append(missing, 'recipientName');
  end if;

  if coalesce(trim(p_notice ->> 'recipientAddress'), '') = '' then
    missing := array_append(missing, 'recipientAddress');
  end if;

  if coalesce(trim(p_notice ->> 'recipientContact'), '') = '' then
    missing := array_append(missing, 'recipientContact');
  end if;

  if coalesce(trim(p_notice ->> 'recipientEntityType'), '') = '' then
    missing := array_append(missing, 'recipientEntityType');
  end if;

  if coalesce(trim(p_notice ->> 'transactionNature'), '') = '' then
    missing := array_append(missing, 'transactionNature');
  end if;

  if coalesce(trim(p_notice ->> 'agreementDate'), '') = '' then
    missing := array_append(missing, 'agreementDate');
  end if;

  if coalesce(trim(p_notice ->> 'breachType'), '') = '' then
    missing := array_append(missing, 'breachType');
  end if;

  if coalesce(trim(p_notice ->> 'noticeObjective'), '') = '' then
    missing := array_append(missing, 'noticeObjective');
  end if;

  return to_jsonb(missing);
end;
$$;

create or replace view public.business_profile_completion_status as
select
  bp.user_id,
  bp.company_id,
  public.business_profile_missing_required_fields(bp.profile_data) as missing_required_fields,
  jsonb_array_length(public.business_profile_missing_required_fields(bp.profile_data)) as missing_required_count,
  case
    when jsonb_array_length(public.business_profile_missing_required_fields(bp.profile_data)) = 0 then 'complete'
    else 'incomplete'
  end as completion_status,
  bp.updated_at
from public.business_profiles bp;

-- ============================================================
-- Separate CRM tables so businesses can copy leads into their own
-- editable CRM instead of being locked to the source lead record
-- ============================================================
create table if not exists public.company_crm_pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  stage_key text not null,
  label text not null,
  color_token text,
  sort_order integer not null default 0,
  is_default boolean not null default false,
  is_closed_stage boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, stage_key)
);

create index if not exists idx_company_crm_pipeline_stages_company_id
  on public.company_crm_pipeline_stages(company_id, sort_order);

create table if not exists public.company_crm_leads (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  owner_user_id uuid references auth.users(id) on delete set null,
  source_lead_id uuid references public.leads(id) on delete set null,
  copied_from text not null default 'global_leads',
  source_snapshot jsonb not null default '{}'::jsonb,
  name text not null,
  email text,
  phone text,
  whatsapp text,
  company_name text,
  title text,
  city text,
  service_category text,
  status text not null default 'new',
  pipeline_stage text not null default 'new',
  tags jsonb not null default '[]'::jsonb,
  notes text,
  estimated_value numeric(12,2) not null default 0,
  quoted_price numeric(12,2),
  negotiated_price numeric(12,2),
  currency text not null default 'INR',
  source_url text,
  priority text,
  assigned_to uuid references auth.users(id) on delete set null,
  last_contacted_at timestamptz,
  copied_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_company_crm_leads_source_unique
  on public.company_crm_leads(company_id, source_lead_id)
  where source_lead_id is not null;

create index if not exists idx_company_crm_leads_company_id
  on public.company_crm_leads(company_id, created_at desc);

create index if not exists idx_company_crm_leads_status
  on public.company_crm_leads(company_id, status, pipeline_stage);

create table if not exists public.company_crm_lead_activity (
  id uuid primary key default gen_random_uuid(),
  crm_lead_id uuid not null references public.company_crm_leads(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  event_label text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_company_crm_lead_activity_crm_lead_id
  on public.company_crm_lead_activity(crm_lead_id, created_at desc);

alter table public.company_crm_pipeline_stages enable row level security;
alter table public.company_crm_leads enable row level security;
alter table public.company_crm_lead_activity enable row level security;

drop policy if exists "crm pipeline stages by company access" on public.company_crm_pipeline_stages;
create policy "crm pipeline stages by company access"
on public.company_crm_pipeline_stages
for all
using (public.user_can_access_company(company_id))
with check (public.user_can_access_company(company_id));

drop policy if exists "crm leads by company access" on public.company_crm_leads;
create policy "crm leads by company access"
on public.company_crm_leads
for all
using (public.user_can_access_company(company_id))
with check (public.user_can_access_company(company_id));

drop policy if exists "crm lead activity by company access" on public.company_crm_lead_activity;
create policy "crm lead activity by company access"
on public.company_crm_lead_activity
for all
using (public.user_can_access_company(company_id))
with check (public.user_can_access_company(company_id));

create or replace function public.seed_company_crm_pipeline_stages(p_company_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.user_can_access_company(p_company_id) then
    raise exception 'Forbidden';
  end if;

  insert into public.company_crm_pipeline_stages (
    company_id,
    stage_key,
    label,
    color_token,
    sort_order,
    is_default,
    is_closed_stage
  )
  values
    (p_company_id, 'new', 'New', 'status-new', 1, true, false),
    (p_company_id, 'contacted', 'Contacted', 'status-progress', 2, true, false),
    (p_company_id, 'proposal', 'Proposal Sent', 'gold-base', 3, true, false),
    (p_company_id, 'won', 'Won', 'status-closed', 4, true, true),
    (p_company_id, 'lost', 'Lost', 'status-warn', 5, true, true)
  on conflict (company_id, stage_key) do nothing;
end;
$$;

create or replace function public.copy_lead_to_company_crm(p_company_id uuid, p_lead_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_crm_lead_id uuid;
begin
  if not public.user_can_access_company(p_company_id) then
    raise exception 'Forbidden';
  end if;

  perform public.seed_company_crm_pipeline_stages(p_company_id);

  insert into public.company_crm_leads (
    company_id,
    owner_user_id,
    source_lead_id,
    copied_from,
    source_snapshot,
    name,
    email,
    phone,
    company_name,
    city,
    service_category,
    status,
    pipeline_stage,
    notes,
    estimated_value,
    source_url,
    priority
  )
  select
    p_company_id,
    auth.uid(),
    l.id,
    'global_leads',
    to_jsonb(l),
    l.name,
    l.email,
    l.phone,
    null,
    l.city,
    l.service_category,
    lower(coalesce(l.status, 'new')),
    case
      when lower(coalesce(l.status, 'new')) in ('closed', 'won') then 'won'
      when lower(coalesce(l.status, 'new')) in ('contacted', 'follow up', 'follow_up') then 'contacted'
      else 'new'
    end,
    l.notes,
    coalesce(l.deal_value, 0),
    l.website_link,
    null
  from public.leads l
  where l.id = p_lead_id
  on conflict (company_id, source_lead_id) do update
  set
    updated_at = now(),
    source_snapshot = excluded.source_snapshot
  returning id into v_crm_lead_id;

  insert into public.company_crm_lead_activity (
    crm_lead_id,
    company_id,
    actor_user_id,
    event_type,
    event_label,
    payload
  )
  values (
    v_crm_lead_id,
    p_company_id,
    auth.uid(),
    'lead_copied',
    'Lead copied into company CRM',
    jsonb_build_object('sourceLeadId', p_lead_id, 'copiedFrom', 'global_leads')
  );

  return v_crm_lead_id;
end;
$$;

-- ============================================================
-- Live metrics support columns for business dashboard automation stats
-- ============================================================
alter table if exists public.leads
  add column if not exists company_id uuid references public.companies(id) on delete set null;

alter table if exists public.agent_logs
  add column if not exists company_id uuid references public.companies(id) on delete set null;

alter table if exists public.agent_emails
  add column if not exists company_id uuid references public.companies(id) on delete set null;

alter table if exists public.tasks
  add column if not exists company_id uuid references public.companies(id) on delete set null;

alter table if exists public.email_threads
  add column if not exists company_id uuid references public.companies(id) on delete set null;

alter table if exists public.email_messages
  add column if not exists company_id uuid references public.companies(id) on delete set null;

create index if not exists idx_agent_logs_company_id_created_at
  on public.agent_logs(company_id, created_at desc);

create index if not exists idx_agent_emails_company_id_created_at
  on public.agent_emails(company_id, created_at desc);

create index if not exists idx_tasks_company_id_created_at
  on public.tasks(company_id, created_at desc);

create index if not exists idx_leads_company_id_created_at
  on public.leads(company_id, created_at desc);

create or replace view public.business_live_automation_metrics as
with company_scope as (
  select company_id from public.agent_logs where company_id is not null
  union
  select company_id from public.agent_emails where company_id is not null
  union
  select coalesce(t.company_id, p.company_id) as company_id
  from public.tasks t
  left join public.projects p on p.id = t.project_id
  where coalesce(t.company_id, p.company_id) is not null
)
select
  cs.company_id,
  coalesce((
    select count(distinct al.agent_name)
    from public.agent_logs al
    where al.company_id = cs.company_id
      and al.created_at >= now() - interval '24 hours'
  ), 0)::integer as active_agents_24h,
  coalesce((
    select count(*)
    from public.tasks t
    left join public.projects p on p.id = t.project_id
    where coalesce(t.company_id, p.company_id) = cs.company_id
      and t.created_at >= now() - interval '24 hours'
  ), 0)::integer as tasks_last_24h,
  coalesce((
    select count(*)
    from public.agent_emails ae
    where ae.company_id = cs.company_id
      and ae.direction = 'outbound'
  ), 0)::integer as outbound_messages_total,
  coalesce((
    select round(
      100.0 * count(*) filter (
        where lower(coalesce(al.status, '')) in ('success', 'sent', 'accepted')
      ) / nullif(count(*), 0),
      2
    )
    from public.agent_logs al
    where al.company_id = cs.company_id
      and al.created_at >= now() - interval '30 days'
  ), 0)::numeric(5,2) as avg_success_30d,
  greatest(
    coalesce((select max(created_at) from public.agent_logs al where al.company_id = cs.company_id), to_timestamp(0)),
    coalesce((select max(created_at) from public.agent_emails ae where ae.company_id = cs.company_id), to_timestamp(0)),
    coalesce((
      select max(t.created_at)
      from public.tasks t
      left join public.projects p on p.id = t.project_id
      where coalesce(t.company_id, p.company_id) = cs.company_id
    ), to_timestamp(0))
  ) as last_activity_at
from company_scope cs;

-- ============================================================
-- Helpful backlink overview for future UI/API usage
-- ============================================================
create or replace view public.business_backlink_inventory as
select
  'workspace'::text as entity_type,
  s.id as entity_id,
  s.company_id,
  s.workspace_slug as slug,
  s.workspace_path as path,
  s.workspace_backlink_url as url,
  s.created_at
from public.onboarding_subscriptions s
where s.workspace_slug is not null

union all

select
  'report'::text as entity_type,
  r.id as entity_id,
  r.company_id,
  r.share_slug as slug,
  r.share_path as path,
  r.share_backlink_url as url,
  r.created_at
from public.business_research_reports r
where r.share_slug is not null

union all

select
  'legal_notice'::text as entity_type,
  n.id as entity_id,
  n.company_id,
  n.share_slug as slug,
  n.share_path as path,
  n.share_backlink_url as url,
  n.created_at
from public.business_legal_notices n
where n.share_slug is not null;
