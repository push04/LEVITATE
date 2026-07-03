-- The original tenderpulse schema used a table named `clients`, which
-- collided with a pre-existing `clients` table already in this database
-- (different schema, unrelated feature) — `create table if not exists`
-- silently no-op'd against it instead of creating ours. Renaming to
-- `tender_clients` to avoid the collision entirely.

create table if not exists tender_clients (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  contact_name text,
  email text not null,
  phone_number text,
  districts text[] not null default '{}',
  categories tender_category[] not null default '{}',
  keywords text[] not null default '{}',
  min_value numeric,
  max_value numeric,
  delivery_frequency delivery_frequency not null default 'daily',
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tender_clients_email_idx on tender_clients (email);

-- deliveries.client_id pointed at the wrong `clients` table's id column by
-- coincidence of type (both uuid) — repoint the FK at tender_clients.
alter table deliveries drop constraint if exists deliveries_client_id_fkey;
alter table deliveries add constraint deliveries_client_id_fkey
  foreign key (client_id) references tender_clients(id) on delete set null;
