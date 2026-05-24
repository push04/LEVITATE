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

create policy "Public can view published sites"
  on published_sites for select
  using (true);

create policy "Owners can manage their sites"
  on published_sites for all
  using (auth.uid() = user_id);
