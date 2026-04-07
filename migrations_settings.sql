create table if not exists settings (
  key text primary key,
  value text not null
);

alter table settings enable row level security;

do $$ begin
  drop policy if exists "Admins can manage settings" on settings;
  create policy "Admins can manage settings" on settings for all using (auth.role() = 'authenticated');
end $$;

-- Insert default empty config
insert into settings (key, value) values ('linkedin_target_urn', '') on conflict do nothing;
