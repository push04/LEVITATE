create table if not exists leads (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  email text,
  phone text,
  service_category text,
  message text,
  budget text,
  file_url text,
  status text default 'New' check (status in ('New', 'Contacted', 'Follow Up', 'Closed')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  business_type text,
  city text,
  google_map_link text,
  website_link text,
  is_followup boolean default false,
  notes text,
  deal_value numeric,
  source text
);

alter table leads enable row level security;
do $$ begin
  drop policy if exists "Leads manageable by authenticated users" on leads;
  create policy "Leads manageable by authenticated users" on leads for all using (auth.role() = 'authenticated');
end $$;

create table if not exists posts (
  id uuid default gen_random_uuid() primary key,
  slug text unique not null,
  title text not null,
  excerpt text,
  content text,
  cover_image text,
  category text,
  published boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  read_time text,
  author_id uuid references auth.users(id)
);

alter table posts enable row level security;
do $$ begin
  drop policy if exists "Public posts are viewable by everyone" on posts;
  create policy "Public posts are viewable by everyone" on posts for select using (true);
end $$;
do $$ begin
  drop policy if exists "Admins can manage posts" on posts;
  create policy "Admins can manage posts" on posts for all using (auth.role() = 'authenticated');
end $$;
