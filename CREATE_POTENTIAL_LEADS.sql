-- Create a staging table for scrapped potential leads
create table if not exists potential_leads (
  id uuid default uuid_generate_v4() primary key,
  business_name text not null,
  address text,
  phone text,
  website text,
  city text,
  category text,
  ai_score int default 0,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  raw_data jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS
alter table potential_leads enable row level security;

-- Policy: Admin access only (simulated for this project as per existing patterns)
create policy "Allow all access to potential_leads for public" on potential_leads
  for all using (true) with check (true);
