-- WhatsApp Business: per-company config, campaigns, templates, conversations

create table if not exists company_whatsapp_config (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  -- Meta Cloud API credentials (provided by business)
  phone_number_id text,
  access_token text,
  app_secret text,
  verify_token text,
  -- AI agent settings
  ai_agent_enabled boolean not null default false,
  ai_agent_name text not null default 'Assistant',
  ai_agent_tone text not null default 'professional', -- professional | friendly | casual
  ai_agent_system_prompt text,
  ai_agent_faq jsonb default '[]'::jsonb, -- [{q, a}]
  ai_agent_escalation_keywords text[] default '{}',
  ai_agent_escalation_email text,
  -- status
  connected boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id)
);

create table if not exists company_whatsapp_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  body text not null,
  variables text[] default '{}', -- placeholder names like ['name', 'company']
  category text not null default 'outreach', -- outreach | followup | announcement
  created_at timestamptz not null default now()
);

create table if not exists company_whatsapp_campaigns (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  template_id uuid references company_whatsapp_templates(id) on delete set null,
  custom_message text,
  -- targeting: json array of lead IDs or segment filter
  target_type text not null default 'leads', -- leads | manual
  target_lead_ids uuid[] default '{}',
  target_manual_numbers text[] default '{}',
  -- scheduling
  status text not null default 'draft', -- draft | scheduled | running | completed | failed
  scheduled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  -- stats
  total_recipients int not null default 0,
  sent_count int not null default 0,
  delivered_count int not null default 0,
  failed_count int not null default 0,
  reply_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists company_whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  campaign_id uuid references company_whatsapp_campaigns(id) on delete set null,
  -- contact info
  to_number text,
  from_number text,
  contact_name text,
  lead_id uuid,
  -- message
  direction text not null default 'outbound', -- outbound | inbound
  message text not null,
  -- meta
  wa_message_id text, -- WhatsApp message ID for tracking
  status text not null default 'pending', -- pending | sent | delivered | read | failed
  error text,
  -- ai agent
  is_ai_response boolean not null default false,
  created_at timestamptz not null default now()
);

-- RLS: companies can only see their own data
alter table company_whatsapp_config enable row level security;
alter table company_whatsapp_templates enable row level security;
alter table company_whatsapp_campaigns enable row level security;
alter table company_whatsapp_messages enable row level security;

create policy "company_whatsapp_config_owner" on company_whatsapp_config
  using (company_id in (select id from companies where owner_id = auth.uid()));

create policy "company_whatsapp_templates_owner" on company_whatsapp_templates
  using (company_id in (select id from companies where owner_id = auth.uid()));

create policy "company_whatsapp_campaigns_owner" on company_whatsapp_campaigns
  using (company_id in (select id from companies where owner_id = auth.uid()));

create policy "company_whatsapp_messages_owner" on company_whatsapp_messages
  using (company_id in (select id from companies where owner_id = auth.uid()));
