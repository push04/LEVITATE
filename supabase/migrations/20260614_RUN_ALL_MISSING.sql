-- ============================================================
-- LEVITATE LABS — RUN ALL MISSING MIGRATIONS
-- Paste this entire file into Supabase SQL Editor and run.
-- Safe to re-run: uses CREATE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS
-- ============================================================


-- ── 1. whatsapp_queue: add campaign/sequence tracking columns ───────────────
alter table whatsapp_queue add column if not exists company_id uuid references companies(id) on delete set null;
alter table whatsapp_queue add column if not exists campaign_id uuid;
alter table whatsapp_queue add column if not exists contact_name text;
alter table whatsapp_queue add column if not exists scheduled_at timestamptz;

create index if not exists idx_whatsapp_queue_company_id on whatsapp_queue(company_id);
create index if not exists idx_whatsapp_queue_status on whatsapp_queue(status);


-- ── 2. company_whatsapp_config ───────────────────────────────────────────────
create table if not exists company_whatsapp_config (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  phone_number_id text,
  access_token text,
  app_secret text,
  verify_token text,
  ai_agent_enabled boolean not null default false,
  ai_agent_name text not null default 'Assistant',
  ai_agent_tone text not null default 'professional',
  ai_agent_system_prompt text,
  ai_agent_faq jsonb default '[]'::jsonb,
  ai_agent_escalation_keywords text[] default '{}',
  ai_agent_escalation_email text,
  connected boolean not null default false,
  qr_code text,
  daemon_last_ping timestamptz,
  whatsapp_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id)
);
alter table company_whatsapp_config enable row level security;
drop policy if exists "company_whatsapp_config_owner" on company_whatsapp_config;
create policy "company_whatsapp_config_owner" on company_whatsapp_config
  for all using (company_id in (select id from companies where owner_id = auth.uid()));


-- ── 3. company_whatsapp_templates ───────────────────────────────────────────
create table if not exists company_whatsapp_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  body text not null,
  variables text[] default '{}',
  category text not null default 'outreach',
  created_at timestamptz not null default now()
);
alter table company_whatsapp_templates enable row level security;
drop policy if exists "company_whatsapp_templates_owner" on company_whatsapp_templates;
create policy "company_whatsapp_templates_owner" on company_whatsapp_templates
  for all using (company_id in (select id from companies where owner_id = auth.uid()));


-- ── 4. company_whatsapp_campaigns ───────────────────────────────────────────
create table if not exists company_whatsapp_campaigns (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  template_id uuid references company_whatsapp_templates(id) on delete set null,
  custom_message text,
  target_type text not null default 'leads',
  target_lead_ids uuid[] default '{}',
  target_manual_numbers text[] default '{}',
  status text not null default 'draft',
  scheduled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  total_recipients int not null default 0,
  sent_count int not null default 0,
  delivered_count int not null default 0,
  failed_count int not null default 0,
  reply_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table company_whatsapp_campaigns enable row level security;
drop policy if exists "company_whatsapp_campaigns_owner" on company_whatsapp_campaigns;
create policy "company_whatsapp_campaigns_owner" on company_whatsapp_campaigns
  for all using (company_id in (select id from companies where owner_id = auth.uid()));


-- ── 5. company_whatsapp_messages ────────────────────────────────────────────
create table if not exists company_whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  campaign_id uuid references company_whatsapp_campaigns(id) on delete set null,
  to_number text,
  from_number text,
  contact_name text,
  lead_id uuid,
  direction text not null default 'outbound',
  message text not null,
  wa_message_id text,
  status text not null default 'pending',
  error text,
  is_ai_response boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_wa_messages_company on company_whatsapp_messages(company_id);
alter table company_whatsapp_messages enable row level security;
drop policy if exists "company_whatsapp_messages_owner" on company_whatsapp_messages;
create policy "company_whatsapp_messages_owner" on company_whatsapp_messages
  for all using (company_id in (select id from companies where owner_id = auth.uid()));


-- ── 6. company_whatsapp_sequences ───────────────────────────────────────────
create table if not exists company_whatsapp_sequences (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  steps jsonb not null default '[]'::jsonb,
  status text not null default 'active' check (status in ('active', 'paused', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_wa_sequences_company on company_whatsapp_sequences(company_id);
alter table company_whatsapp_sequences enable row level security;
drop policy if exists "Company owner sequences" on company_whatsapp_sequences;
create policy "Company owner sequences" on company_whatsapp_sequences
  for all using (exists (
    select 1 from companies where id = company_whatsapp_sequences.company_id and owner_id = auth.uid()
  ));


-- ── 7. company_whatsapp_sequence_contacts ───────────────────────────────────
create table if not exists company_whatsapp_sequence_contacts (
  id uuid primary key default gen_random_uuid(),
  sequence_id uuid not null references company_whatsapp_sequences(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  phone text not null,
  contact_name text,
  variables jsonb default '{}'::jsonb,
  current_step int not null default 0,
  status text not null default 'active' check (status in ('active', 'completed', 'unsubscribed', 'failed')),
  next_send_at timestamptz not null default now(),
  enrolled_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists idx_wa_seq_contacts_seq on company_whatsapp_sequence_contacts(sequence_id);
create index if not exists idx_wa_seq_contacts_next on company_whatsapp_sequence_contacts(next_send_at) where status = 'active';
alter table company_whatsapp_sequence_contacts enable row level security;
drop policy if exists "Company owner seq contacts" on company_whatsapp_sequence_contacts;
create policy "Company owner seq contacts" on company_whatsapp_sequence_contacts
  for all using (exists (
    select 1 from companies where id = company_whatsapp_sequence_contacts.company_id and owner_id = auth.uid()
  ));


-- ── 8. Company CRM tables ────────────────────────────────────────────────────
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
  updated_at timestamptz default now(),
  ai_score int check (ai_score between 0 and 100),
  ai_score_reason text,
  ai_scored_at timestamptz
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


-- ── 9. onboarding_coupons ────────────────────────────────────────────────────
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
alter table onboarding_coupons enable row level security;
drop policy if exists "Service role manages coupons" on onboarding_coupons;
create policy "Service role manages coupons" on onboarding_coupons
  for all using (auth.role() = 'service_role');
