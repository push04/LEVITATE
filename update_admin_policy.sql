-- Allow Admins and Super Admins to update any profile (e.g. changing roles/departments)

do $$ begin
  drop policy if exists "Admins can update any profile" on profiles;
  create policy "Admins can update any profile" on profiles 
    for update 
    using (
      auth.uid() in (
        select id from profiles where role in ('super_admin', 'admin')
      )
    );
exception when others then null; end $$;
