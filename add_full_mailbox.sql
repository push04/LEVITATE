-- Contacts (The "People") - Unifies leads and users
create table if not exists contacts (
    id uuid default uuid_generate_v4() primary key,
    email text unique not null,
    full_name text,
    company_name text,
    phone text,
    status text default 'new', -- new, contacted, negotiating, closed, lost
    tags text[], -- e.g. ['vip', 'healthcare']
    ai_summary text,
    ai_score integer, -- 0-100 lead score
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Email Threads (Conversations)
create table if not exists email_threads (
    id uuid default uuid_generate_v4() primary key,
    subject text,
    snippet text,
    last_message_at timestamp with time zone default timezone('utc'::text, now()) not null,
    status text default 'inbox', -- inbox, archived, trash, spam
    category text, -- lead, support, inquiry, other (AI predicted)
    contact_id uuid references contacts(id) on delete set null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Email Messages (Individual emails in a thread)
create table if not exists email_messages (
    id uuid default uuid_generate_v4() primary key,
    thread_id uuid references email_threads(id) on delete cascade not null,
    from_email text not null,
    from_name text,
    to_email text[] not null,
    subject text,
    body_text text, -- Plain text for AI
    body_html text, -- HTML for display
    direction text not null, -- 'inbound' or 'outbound'
    is_read boolean default false,
    ai_suggested_reply text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
alter table contacts enable row level security;
alter table email_threads enable row level security;
alter table email_messages enable row level security;

-- Admin Access Policy (Admins see everything)
create policy "Admins full access contacts" on contacts for all using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('admin', 'super_admin'))
);
create policy "Admins full access threads" on email_threads for all using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('admin', 'super_admin'))
);
create policy "Admins full access messages" on email_messages for all using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('admin', 'super_admin'))
);

-- Public Insert (For webhooks/contact form) - restricted appropriately in real prod, but open for now for simplicity
create policy "Public insert contacts" on contacts for insert with check (true);
create policy "Public insert threads" on email_threads for insert with check (true);
create policy "Public insert messages" on email_messages for insert with check (true);
