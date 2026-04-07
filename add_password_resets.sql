create table if not exists password_resets (
  id uuid default uuid_generate_v4() primary key,
  email text not null,
  token text not null,
  expires_at timestamp with time zone not null,
  used boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index for faster lookups
create index if not exists idx_password_resets_token on password_resets(token);
create index if not exists idx_password_resets_email on password_resets(email);
