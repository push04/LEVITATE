-- Create whatsapp_queue table for local desktop bridge
create table if not exists public.whatsapp_queue (
  id              uuid primary key default gen_random_uuid(),
  to_number       text not null,
  message         text not null,
  status          text not null default 'pending', -- pending | sent | failed
  error           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Index to quickly find pending messages
create index if not exists whatsapp_queue_status_idx on public.whatsapp_queue(status);

-- Enable RLS
alter table public.whatsapp_queue enable row level security;

-- Allow service role access
create policy "service_role_all" on public.whatsapp_queue for all using (true);
