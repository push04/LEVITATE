-- Enable UUID extension if not enabled
create extension if not exists "uuid-ossp";

-- 1. Create Companies Table
create table if not exists companies (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  logo_url text,
  website text,
  address text,
  status text default 'active',
  owner_id uuid references auth.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Projects Table - Ensure it exists and has company_id
create table if not exists projects (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add columns to projects if they don't exist
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'projects' and column_name = 'company_id') then
        alter table projects add column company_id uuid references companies(id) on delete cascade;
    end if;

    if not exists (select 1 from information_schema.columns where table_name = 'projects' and column_name = 'title') then
        alter table projects add column title text;
    end if;

    if not exists (select 1 from information_schema.columns where table_name = 'projects' and column_name = 'description') then
        alter table projects add column description text;
    end if;

    if not exists (select 1 from information_schema.columns where table_name = 'projects' and column_name = 'status') then
        alter table projects add column status text default 'new';
    end if;

    if not exists (select 1 from information_schema.columns where table_name = 'projects' and column_name = 'priority') then
        alter table projects add column priority text default 'medium';
    end if;

    if not exists (select 1 from information_schema.columns where table_name = 'projects' and column_name = 'start_date') then
        alter table projects add column start_date date;
    end if;

    if not exists (select 1 from information_schema.columns where table_name = 'projects' and column_name = 'due_date') then
        alter table projects add column due_date date;
    end if;

    if not exists (select 1 from information_schema.columns where table_name = 'projects' and column_name = 'budget') then
        alter table projects add column budget numeric;
    end if;

    if not exists (select 1 from information_schema.columns where table_name = 'projects' and column_name = 'currency') then
        alter table projects add column currency text default 'USD';
    end if;

    if not exists (select 1 from information_schema.columns where table_name = 'projects' and column_name = 'assigned_to') then
        alter table projects add column assigned_to uuid references profiles(id);
    end if;
end $$;

-- 3. Project Assignments Table
create table if not exists project_assignments (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references projects(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  role text default 'contributor',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(project_id, user_id)
);

-- 4. Enable RLS
alter table companies enable row level security;
alter table projects enable row level security;
alter table project_assignments enable row level security;

-- 5. Drop existing policies to avoid conflicts
drop policy if exists "Admins can do everything on companies" on companies;
drop policy if exists "Company owners can view own company" on companies;
drop policy if exists "Company owners can update own company" on companies;

drop policy if exists "Admins can do everything on projects" on projects;
drop policy if exists "Company users can view their company projects" on projects;

drop policy if exists "Admins can do everything on project_assignments" on project_assignments;
drop policy if exists "Employees can view their assignments" on project_assignments;

-- 6. Re-create Policies

-- Companies Policies
create policy "Admins can do everything on companies"
  on companies for all
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'super_admin')
    )
  );

create policy "Company owners can view own company"
  on companies for select
  using ( owner_id = auth.uid() );
  
create policy "Company owners can update own company"
  on companies for update
  using ( owner_id = auth.uid() );

-- Projects Policies
create policy "Admins can do everything on projects"
  on projects for all
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'super_admin')
    )
  );

create policy "Company users can view their company projects"
  on projects for select
  using (
    exists (
      select 1 from companies
      where companies.id = projects.company_id
      and (companies.owner_id = auth.uid())
    )
  );

-- Project Assignments Policies
create policy "Admins can do everything on project_assignments"
  on project_assignments for all
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'super_admin')
    )
  );

create policy "Employees can view their assignments"
  on project_assignments for select
  using ( user_id = auth.uid() );
