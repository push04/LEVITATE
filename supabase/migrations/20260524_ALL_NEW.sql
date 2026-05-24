-- ============================================================
-- LEVITATE LABS — NEW MIGRATIONS (Run this entire file)
-- ============================================================

-- 1. API Keys table (for business users to access the API)
-- ============================================================
create table if not exists api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  key_hash text not null unique,
  key_prefix text not null,
  name text not null default 'Default Key',
  created_at timestamptz default now(),
  last_used_at timestamptz,
  requests_count integer default 0,
  is_active boolean default true,
  plan_id uuid,
  plan_override_limit integer
);
create index if not exists api_keys_user_id_idx on api_keys(user_id);
create index if not exists api_keys_key_hash_idx on api_keys(key_hash);
alter table api_keys enable row level security;
drop policy if exists "Users can manage own keys" on api_keys;
create policy "Users can manage own keys" on api_keys for all using (auth.uid() = user_id);


-- 2. API Plans table (admin configures plans/pricing)
-- ============================================================
create table if not exists api_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  price_monthly integer default 0,
  price_annual integer default 0,
  call_limit integer default 500,
  max_keys integer default 1,
  features text[] default '{}',
  badge text default '',
  tier text default 'starter' check (tier in ('starter','growth','scale','enterprise')),
  is_active boolean default true,
  created_at timestamptz default now()
);
alter table api_plans enable row level security;
drop policy if exists "Public can read active plans" on api_plans;
drop policy if exists "Admins can manage plans" on api_plans;
drop policy if exists "Service role manages plans" on api_plans;
create policy "Public can read active plans" on api_plans for select using (is_active = true);
create policy "Service role manages plans" on api_plans for all using (auth.role() = 'service_role');

insert into api_plans (name, slug, price_monthly, price_annual, call_limit, max_keys, features, badge, tier) values
  ('Starter', 'starter', 0, 0, 500, 1,
   '{"500 API calls/month","Lead capture widget","REST API access","Webhook support","Basic analytics","1 API key"}',
   '', 'starter'),
  ('Growth', 'growth', 999, 9990, 10000, 5,
   '{"10,000 API calls/month","Everything in Starter","CRM sync","Priority queue","Custom domain widget","5 API keys","Postman collection"}',
   'Most Popular', 'growth'),
  ('Scale', 'scale', 4999, 49990, 0, 20,
   '{"Unlimited API calls","Everything in Growth","White-label embed","Dedicated infra","99.9% SLA","Custom AI agents","Direct Slack support"}',
   'Best Value', 'scale')
on conflict (slug) do nothing;

-- FK from api_keys to api_plans
alter table api_keys add column if not exists plan_id uuid references api_plans(id) on delete set null;
alter table api_keys add column if not exists plan_override_limit integer;


-- 3. Published Sites table (website builder output)
-- ============================================================
create table if not exists published_sites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  slug text unique not null,
  business_name text not null,
  template_id text,
  sections jsonb default '[]',
  theme jsonb default '{}',
  font jsonb default '{}',
  integrations jsonb default '{}',
  seo jsonb default '{}',
  published_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists published_sites_slug_idx on published_sites(slug);
create index if not exists published_sites_user_id_idx on published_sites(user_id);
alter table published_sites enable row level security;
drop policy if exists "Public can view published sites" on published_sites;
drop policy if exists "Owners can manage their sites" on published_sites;
create policy "Public can view published sites" on published_sites for select using (true);
create policy "Owners can manage their sites" on published_sites for all using (auth.uid() = user_id);

-- ============================================================
-- DONE. All 3 tables created.
-- ============================================================

-- 4. Company CRM Tables (For Business Private CRM)
-- ============================================================
create table if not exists company_crm_pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  stage_key text not null,
  label text not null,
  color_token text,
  sort_order int default 0,
  is_default boolean default false,
  is_closed_stage boolean default false,
  created_at timestamptz default now()
);
alter table company_crm_pipeline_stages enable row level security;
drop policy if exists "Company owners can manage stages" on company_crm_pipeline_stages;
create policy "Company owners can manage stages" on company_crm_pipeline_stages for all using (
  exists (select 1 from companies where id = company_crm_pipeline_stages.company_id and owner_id = auth.uid())
);

create table if not exists company_crm_leads (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  owner_user_id uuid,
  source_lead_id uuid,
  copied_from text,
  source_snapshot jsonb,
  name text not null,
  email text,
  phone text,
  whatsapp text,
  company_name text,
  title text,
  city text,
  service_category text,
  status text,
  pipeline_stage text,
  tags text[] default array[]::text[],
  notes text,
  estimated_value numeric default 0,
  quoted_price numeric,
  negotiated_price numeric,
  currency text default 'INR',
  source_url text,
  priority text,
  assigned_to text,
  last_contacted_at timestamptz,
  copied_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists company_crm_leads_company_id_idx on company_crm_leads(company_id);
alter table company_crm_leads enable row level security;
drop policy if exists "Company owners can manage CRM leads" on company_crm_leads;
create policy "Company owners can manage CRM leads" on company_crm_leads for all using (
  exists (select 1 from companies where id = company_crm_leads.company_id and owner_id = auth.uid())
);

create table if not exists company_crm_lead_activity (
  id uuid primary key default gen_random_uuid(),
  crm_lead_id uuid not null references company_crm_leads(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  actor_user_id uuid,
  event_type text not null,
  event_label text,
  payload jsonb,
  created_at timestamptz default now()
);
alter table company_crm_lead_activity enable row level security;
drop policy if exists "Company owners can view CRM activity" on company_crm_lead_activity;
create policy "Company owners can view CRM activity" on company_crm_lead_activity for all using (
  exists (select 1 from companies where id = company_crm_lead_activity.company_id and owner_id = auth.uid())
);

