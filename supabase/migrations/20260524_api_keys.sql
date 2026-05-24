create table if not exists api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  key_hash text not null unique,
  key_prefix text not null,
  name text not null default 'Default Key',
  created_at timestamptz default now(),
  last_used_at timestamptz,
  requests_count integer default 0,
  is_active boolean default true
);
create index on api_keys(user_id);
create index on api_keys(key_hash);
alter table api_keys enable row level security;
create policy "Users can manage own keys" on api_keys for all using (auth.uid() = user_id);
