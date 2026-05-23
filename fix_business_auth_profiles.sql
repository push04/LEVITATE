-- Fix Business auth profile roles.
-- Run this after add_business_role_read_only.sql on existing deployments.

-- 1) Let profiles store the dedicated business role.
do $$ begin
  alter table profiles drop constraint if exists profiles_role_check;
exception when undefined_object then null; end $$;

alter table profiles
  add constraint profiles_role_check
  check (role in ('super_admin', 'admin', 'manager', 'employee', 'sales', 'client', 'company_admin', 'business'));

-- 2) Backfill already-created business accounts that were stuck as employee.
update profiles
set role = 'business'
where role = 'employee'
  and (
    id in (
      select owner_id
      from companies
      where owner_id is not null
    )
    or lower(email) in (
      select lower(email)
      from invitations
      where role = 'business'
    )
    or lower(email) in (
      select lower(email)
      from onboarding_subscriptions
    )
  );

-- 3) Keep future auth-created users aligned with metadata from the app.
create or replace function public.handle_new_user()
returns trigger as $$
declare
  requested_role text := lower(coalesce(new.raw_user_meta_data->>'role', ''));
  requested_full_name text := coalesce(
    nullif(new.raw_user_meta_data->>'full_name', ''),
    nullif(new.raw_user_meta_data->>'name', '')
  );
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    requested_full_name,
    case
      when requested_role in ('super_admin', 'admin', 'manager', 'employee', 'sales', 'client', 'company_admin', 'business')
        then requested_role
      else 'employee'
    end
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = coalesce(nullif(excluded.full_name, ''), profiles.full_name),
      role = excluded.role;

  return new;
end;
$$ language plpgsql security definer;
