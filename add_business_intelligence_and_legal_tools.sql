alter table onboarding_plans
add column if not exists feature_controls jsonb not null default '{
  "crm": true,
  "leads": true,
  "automations": true,
  "mailbox": true,
  "marketResearch": true,
  "legalTools": true,
  "reportHistory": true,
  "profileSettings": true
}'::jsonb;

update onboarding_plans
set feature_controls = '{
  "crm": true,
  "leads": true,
  "automations": true,
  "mailbox": true,
  "marketResearch": true,
  "legalTools": true,
  "reportHistory": true,
  "profileSettings": true
}'::jsonb
where feature_controls is null;

create table if not exists business_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid references companies(id) on delete set null,
  profile_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists business_research_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid references companies(id) on delete set null,
  status text not null default 'draft',
  target_name text not null,
  target_type text not null default 'market',
  target_url text,
  notes text,
  intelligence_score integer,
  report_summary text,
  selected_modules jsonb not null default '[]'::jsonb,
  business_profile jsonb not null default '{}'::jsonb,
  share_token text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists business_research_report_modules (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references business_research_reports(id) on delete cascade,
  module_id text not null,
  title text not null,
  status text not null default 'pending',
  provider text,
  generated_at timestamptz,
  error text,
  payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (report_id, module_id)
);

create table if not exists business_research_usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  report_id uuid references business_research_reports(id) on delete set null,
  local_timezone text not null default 'Asia/Kolkata',
  attempt_status text not null default 'reserved',
  created_at timestamptz not null default now()
);

create table if not exists business_legal_notices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid references companies(id) on delete set null,
  title text not null,
  notice_data jsonb not null default '{}'::jsonb,
  plain_text text,
  ai_provider text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_business_profiles_company_id on business_profiles(company_id);
create index if not exists idx_business_research_reports_user_id_created_at on business_research_reports(user_id, created_at desc);
create index if not exists idx_business_research_reports_share_token on business_research_reports(share_token);
create index if not exists idx_business_research_report_modules_report_id on business_research_report_modules(report_id);
create index if not exists idx_business_research_usage_logs_user_id_created_at on business_research_usage_logs(user_id, created_at desc);
create index if not exists idx_business_legal_notices_user_id_created_at on business_legal_notices(user_id, created_at desc);

alter table business_profiles enable row level security;
alter table business_research_reports enable row level security;
alter table business_research_report_modules enable row level security;
alter table business_research_usage_logs enable row level security;
alter table business_legal_notices enable row level security;

drop policy if exists "business profiles own rows" on business_profiles;
create policy "business profiles own rows"
on business_profiles
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "business reports own rows" on business_research_reports;
create policy "business reports own rows"
on business_research_reports
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "business report modules own rows" on business_research_report_modules;
create policy "business report modules own rows"
on business_research_report_modules
for all
using (
  exists (
    select 1
    from business_research_reports reports
    where reports.id = business_research_report_modules.report_id
      and reports.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from business_research_reports reports
    where reports.id = business_research_report_modules.report_id
      and reports.user_id = auth.uid()
  )
);

drop policy if exists "business usage logs own rows" on business_research_usage_logs;
create policy "business usage logs own rows"
on business_research_usage_logs
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "business legal notices own rows" on business_legal_notices;
create policy "business legal notices own rows"
on business_legal_notices
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
