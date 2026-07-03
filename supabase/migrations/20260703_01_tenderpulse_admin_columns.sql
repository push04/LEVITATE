-- TenderPulse BJ — admin-only columns not covered by the base tenderpulse
-- schema (category correction, notes, tags, hide/archive). Additive, safe
-- to run once.

alter table tenders add column if not exists notes text;
alter table tenders add column if not exists tags text[] not null default '{}';
alter table tenders add column if not exists is_hidden boolean not null default false;

create index if not exists tenders_is_hidden_idx on tenders (is_hidden);
