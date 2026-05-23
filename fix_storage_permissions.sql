-- FIX STORAGE PERMISSIONS
-- Run this to enable the 'vault' storage bucket and allow uploads.

-- 1. Create the bucket if it doesn't exist (this might need to be done in dashboard, but we try here)
insert into storage.buckets (id, name, public)
values ('vault', 'vault', true)
on conflict (id) do nothing;

-- 2. Enable RLS on objects (Commented out to avoid ownership errors - usually enabled by default)
-- alter table storage.objects enable row level security;

-- 3. Drop old policies (Safely)
-- If this fails, you may need to delete policies via the Supabase Dashboard > Storage > Policies
do $$ begin
  drop policy if exists "Authenticated users can upload objects" on storage.objects;
  drop policy if exists "Anyone can view objects" on storage.objects;
  drop policy if exists "Owners and Admins can delete objects" on storage.objects;
exception when others then null; end $$;

-- 4. Create Policies

-- VIEWING: Allow public access to the vault bucket
create policy "Anyone can view objects"
  on storage.objects for select
  using ( bucket_id = 'vault' );

-- UPLOADING: Allow authenticated users to upload
create policy "Authenticated users can upload objects"
  on storage.objects for insert
  with check (
    bucket_id = 'vault' AND
    auth.role() = 'authenticated'
  );

-- DELETING: Owners or Admins
create policy "Owners and Admins can delete objects"
  on storage.objects for delete
  using (
    bucket_id = 'vault' AND
    (
      auth.uid() = owner OR
      auth.uid() in (
        select id from public.profiles 
        where role in ('super_admin', 'admin', 'manager')
      )
    )
  );
