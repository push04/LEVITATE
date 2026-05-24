-- Busy Software Integration sync log table
create table if not exists busy_sync_logs (
  id uuid primary key default gen_random_uuid(),
  sync_type text not null check (sync_type in ('api', 'csv_upload', 'webhook')),
  entity_type text,
  status text not null check (status in ('success', 'partial', 'failed')),
  records_total integer default 0,
  records_imported integer default 0,
  records_skipped integer default 0,
  records_failed integer default 0,
  error_log text,
  metadata jsonb,
  created_at timestamptz default now()
);

create index if not exists busy_sync_logs_created_at_idx on busy_sync_logs(created_at desc);
alter table busy_sync_logs enable row level security;
create policy "Service role manages busy sync logs" on busy_sync_logs for all using (auth.role() = 'service_role');
