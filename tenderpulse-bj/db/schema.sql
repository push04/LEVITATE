-- TenderPulse BJ — Supabase/Postgres schema
-- Run this whole file once in the Supabase SQL editor (Project > SQL Editor > New query).
-- Safe to re-run on a fresh project; drops nothing on an existing one.

create extension if not exists "pgcrypto";

do $$ begin
  create type source_family as enum ('gepnic', 'eproc2_bihar', 's3waas', 'gem', 'standalone', 'ireps');
exception when duplicate_object then null; end $$;

do $$ begin
  create type org_type as enum ('state_dept', 'psu', 'hospital', 'district', 'municipal', 'railway', 'mining');
exception when duplicate_object then null; end $$;

do $$ begin
  create type tender_category as enum ('civil_works', 'supply', 'services', 'it', 'mining', 'health', 'education', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type tender_status as enum ('active', 'cancelled', 'corrigendum_issued', 'closed', 'awarded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type crawl_status as enum ('success', 'partial', 'failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type delivery_channel as enum ('email', 'pdf', 'csv', 'xlsx', 'doc', 'manual_download', 'whatsapp');
exception when duplicate_object then null; end $$;

do $$ begin
  create type delivery_status as enum ('pending', 'sent', 'failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type delivery_frequency as enum ('instant', 'daily', 'weekly');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Core scraping data
-- ---------------------------------------------------------------------------

create table if not exists sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  family source_family not null,
  base_url text not null,
  state text not null,
  district text,
  org_type org_type not null,
  poll_frequency_minutes int not null default 60,
  last_crawled_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists tenders (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references sources(id),
  external_ref text not null,
  title text not null,
  organization text,
  district text,
  category tender_category,
  estimated_value_inr numeric,
  emd_amount_inr numeric,
  publish_date date,
  bid_submission_deadline timestamptz,
  nit_document_url text,
  nit_document_text text,
  ai_summary text,
  ai_eligibility_notes text,
  status tender_status not null default 'active',
  raw_scraped_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_id, external_ref)
);

create index if not exists tenders_district_idx on tenders (district);
create index if not exists tenders_category_idx on tenders (category);
create index if not exists tenders_deadline_idx on tenders (bid_submission_deadline);
create index if not exists tenders_status_idx on tenders (status);

-- Full-text search backing the admin panel's "type a query, get related
-- tenders" filter. Weighted so title/organization outrank incidental matches
-- inside the raw NIT text dump.
alter table tenders add column if not exists search_vector tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(organization, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(district, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(ai_summary, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(nit_document_text, '')), 'D')
  ) stored;

create index if not exists tenders_search_idx on tenders using gin (search_vector);

create table if not exists corrigenda (
  id uuid primary key default gen_random_uuid(),
  tender_id uuid not null references tenders(id) on delete cascade,
  description text not null,
  new_deadline timestamptz,
  published_at timestamptz not null default now(),
  ai_summary text
);

create table if not exists crawl_runs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references sources(id),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  tenders_found int not null default 0,
  tenders_new int not null default 0,
  tenders_updated int not null default 0,
  status crawl_status not null default 'success',
  error_log text
);

-- ---------------------------------------------------------------------------
-- Client delivery model — you (the admin) curate tenders and hand them to
-- client companies via email digests or one-off exported files.
-- `tender_clients` replaces the earlier WhatsApp-only "subscribers" concept:
-- email is the primary channel, phone stays optional for a future WhatsApp
-- add-on. Named `tender_clients` (not `clients`) because this schema shares
-- a database with the rest of Levitate Labs, which already has an unrelated
-- `clients` table — `create table if not exists` would otherwise silently
-- no-op against that one instead of creating this one.
-- ---------------------------------------------------------------------------

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

-- Every time you send tenders out — an automatic filtered email digest, or a
-- manual "export these 12 selected rows to XLSX and email to this client" —
-- it's logged here. Doubles as an audit trail for what each client was sent.
create table if not exists deliveries (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references tender_clients(id) on delete set null,
  tender_ids uuid[] not null default '{}',
  channel delivery_channel not null,
  recipient_email text,
  file_format text,
  status delivery_status not null default 'pending',
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists deliveries_client_idx on deliveries (client_id);

-- Reusable filter presets for the admin panel's search bar (category,
-- district, keywords, value range) — save a search once, reuse or turn it
-- into a client's standing alert filter later.
create table if not exists saved_filters (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  query_text text,
  categories tender_category[] not null default '{}',
  districts text[] not null default '{}',
  keywords text[] not null default '{}',
  min_value numeric,
  max_value numeric,
  created_at timestamptz not null default now()
);
