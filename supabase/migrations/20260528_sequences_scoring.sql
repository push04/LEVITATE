-- ── 1. Scheduled sends support in whatsapp_queue ────────────────────────────
alter table whatsapp_queue
  add column if not exists scheduled_at timestamptz;

-- ── 2. WhatsApp Drip Sequences ───────────────────────────────────────────────
create table if not exists company_whatsapp_sequences (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  -- steps: [{day: 0, message: "..."}, {day: 3, message: "..."}, ...]
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

-- ── 3. Sequence enrollments ─────────────────────────────────────────────────
create table if not exists company_whatsapp_sequence_contacts (
  id uuid primary key default gen_random_uuid(),
  sequence_id uuid not null references company_whatsapp_sequences(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  phone text not null,
  contact_name text,
  variables jsonb default '{}'::jsonb,       -- {name, city, category, ...}
  current_step int not null default 0,       -- index into steps array
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

-- ── 4. AI Lead Scoring ───────────────────────────────────────────────────────
alter table company_crm_leads
  add column if not exists ai_score int check (ai_score between 0 and 100),
  add column if not exists ai_score_reason text,
  add column if not exists ai_scored_at timestamptz;
