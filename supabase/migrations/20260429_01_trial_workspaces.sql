-- Section 3: Trial workspaces (implemented on top of existing `companies` table)

create extension if not exists "uuid-ossp";

-- Companies: add plan + trial window fields.
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'companies' and column_name = 'plan') then
    alter table companies add column plan text default 'trial';
  end if;

  if not exists (select 1 from information_schema.columns where table_name = 'companies' and column_name = 'trial') then
    alter table companies add column trial boolean default true;
  end if;

  if not exists (select 1 from information_schema.columns where table_name = 'companies' and column_name = 'trial_start') then
    alter table companies add column trial_start timestamptz;
  end if;

  if not exists (select 1 from information_schema.columns where table_name = 'companies' and column_name = 'trial_end') then
    alter table companies add column trial_end timestamptz;
  end if;
end $$;

-- Leads: scope by company/workspace.
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'leads' and column_name = 'company_id') then
    alter table leads add column company_id uuid references companies(id) on delete cascade;
  end if;
end $$;

create index if not exists leads_company_id_created_at_idx on leads(company_id, created_at desc);

