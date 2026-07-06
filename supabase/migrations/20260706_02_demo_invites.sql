-- Invite-code-gated access to the public BizHarvest/TenderPulse AI query
-- demos. Admin creates one invite per prospective business (with their name
-- and contact details) and shares the code; the visitor enters it on the
-- demo page to unlock a personal welcome and a limited number of AI queries
-- per tool before being asked to purchase.
create table if not exists demo_invites (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  business_name text not null,
  contact_name text,
  contact_email text,
  contact_phone text,
  tool text not null default 'both' check (tool in ('bizharvest', 'tenderpulse', 'both')),
  max_tries int not null default 3,
  is_active boolean not null default true,
  expires_at timestamptz,
  notes text,
  created_by text,
  created_at timestamptz not null default now(),
  first_redeemed_at timestamptz,
  last_used_at timestamptz
);

-- One row per AI query attempt made against an invite code - enforces the
-- per-tool try limit and doubles as a read on what each prospect actually
-- asked about.
create table if not exists demo_invite_usage (
  id uuid primary key default gen_random_uuid(),
  invite_id uuid not null references demo_invites(id) on delete cascade,
  tool text not null check (tool in ('bizharvest', 'tenderpulse')),
  query text not null,
  result_count int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists demo_invite_usage_invite_idx on demo_invite_usage (invite_id, tool);
create index if not exists demo_invites_active_idx on demo_invites (is_active);
