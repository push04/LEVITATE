-- Convert the legacy portal role to the new dedicated business role.
update profiles
set role = 'business'
where role = 'company_admin';

update invitations
set role = 'business'
where role = 'company_admin';

-- Keep company owners readable, but stop the read-only business role from editing company records.
do $$ begin
  drop policy if exists "Owners and Admins can update company" on companies;
exception when others then null; end $$;

create policy "Owners and Admins can update company"
  on companies for update
  using (
    (
      owner_id = auth.uid()
      and not exists (
        select 1 from profiles
        where profiles.id = auth.uid()
          and profiles.role = 'business'
      )
    )
    or exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role in ('super_admin', 'admin')
    )
  );

-- Prevent read-only business users from creating, editing, or deleting projects.
do $$ begin
  drop policy if exists "Enable insert for authenticated users" on projects;
  drop policy if exists "Enable update for stakeholders" on projects;
  drop policy if exists "Enable delete for owners and admins" on projects;
exception when others then null; end $$;

create policy "Enable insert for authenticated users"
  on projects for insert
  with check (
    auth.role() = 'authenticated'
    and not exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role = 'business'
    )
  );

create policy "Enable update for stakeholders"
  on projects for update
  using (
    (
      (
        created_by = auth.uid()
        or assigned_to = auth.uid()
        or exists (
          select 1 from companies
          where companies.id = projects.company_id
            and companies.owner_id = auth.uid()
        )
      )
      and not exists (
        select 1 from profiles
        where profiles.id = auth.uid()
          and profiles.role = 'business'
      )
    )
    or exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role in ('super_admin', 'admin', 'manager')
    )
  );

create policy "Enable delete for owners and admins"
  on projects for delete
  using (
    (
      exists (
        select 1 from companies
        where companies.id = projects.company_id
          and companies.owner_id = auth.uid()
      )
      and not exists (
        select 1 from profiles
        where profiles.id = auth.uid()
          and profiles.role = 'business'
      )
    )
    or exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role in ('super_admin', 'admin', 'manager')
    )
  );
