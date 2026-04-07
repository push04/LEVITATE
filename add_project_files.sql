-- Add project_id to files table
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'files' and column_name = 'project_id') then
        alter table files add column project_id uuid references projects(id) on delete cascade;
    end if;
end $$;

-- Update RLS for files to allow project members to view/upload
drop policy if exists "Project members can view project files" on files;
create policy "Project members can view project files"
  on files for select
  using (
    project_id is not null and (
      exists (
        select 1 from project_assignments
        where project_assignments.project_id = files.project_id
        and project_assignments.user_id = auth.uid()
      )
      or exists (
        select 1 from projects
        where projects.id = files.project_id
        and projects.assigned_to = auth.uid()
      )
      or exists (
        select 1 from profiles
        where profiles.id = auth.uid()
        and profiles.role in ('admin', 'super_admin', 'manager')
      )
    )
  );

drop policy if exists "Project members can upload project files" on files;
create policy "Project members can upload project files"
  on files for insert
  with check (
    project_id is not null and (
      exists (
        select 1 from project_assignments
        where project_assignments.project_id = files.project_id
        and project_assignments.user_id = auth.uid()
      )
      or exists (
        select 1 from projects
        where projects.id = files.project_id
        and projects.assigned_to = auth.uid()
      )
      or exists (
        select 1 from profiles
        where profiles.id = auth.uid()
        and profiles.role in ('admin', 'super_admin', 'manager')
      )
    )
  );
