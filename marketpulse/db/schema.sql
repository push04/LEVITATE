-- MarketPulse — Supabase/Postgres schema
-- Run this whole file once in the Supabase SQL editor (Project > SQL Editor > New query).
-- Safe to re-run on a fresh project; drops nothing on an existing one.

create extension if not exists "pgcrypto";

-- Dynamic watchlist: Groq reviews the last ~48h of ingested news each run and
-- picks which tickers (from config/nse_universe.json, a curated known-valid
-- universe) are actually trending right now. `pinned` rows (the Nifty/Sensex
-- indices) are always active regardless of what Groq returns — everything
-- else ages out (active=false) if it stops showing up in the trend pass.
create table if not exists watchlist (
  ticker text primary key,
  yahoo_symbol text not null,
  company_name text,
  sector text,
  pinned boolean not null default false,
  active boolean not null default true,
  trend_reason text,
  added_at timestamptz not null default now(),
  last_confirmed_at timestamptz not null default now()
);

create table if not exists news_articles (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  title text not null,
  link text unique not null,
  published_at timestamptz,
  raw_summary text,
  ingested_at timestamptz not null default now()
);
create index if not exists news_articles_published_at_idx on news_articles(published_at desc);

create table if not exists sentiment_scores (
  id uuid primary key default gen_random_uuid(),
  source_type text not null default 'news',
  source_id uuid references news_articles(id) on delete cascade,
  ticker text,
  sector text,
  sentiment text not null check (sentiment in ('bullish', 'bearish', 'neutral')),
  confidence numeric not null default 0,
  summary text,
  scored_at timestamptz not null default now()
);
create index if not exists sentiment_scores_ticker_idx on sentiment_scores(ticker);
create index if not exists sentiment_scores_source_id_idx on sentiment_scores(source_id);

create table if not exists price_data (
  ticker text not null,
  company_name text,
  sector text,
  date date not null,
  open numeric,
  high numeric,
  low numeric,
  close numeric,
  volume bigint,
  primary key (ticker, date)
);
create index if not exists price_data_date_idx on price_data(date desc);

create table if not exists technical_indicators (
  ticker text not null,
  date date not null,
  rsi_14 numeric,
  macd numeric,
  macd_signal numeric,
  macd_hist numeric,
  sma_20 numeric,
  sma_50 numeric,
  ema_20 numeric,
  bb_upper numeric,
  bb_middle numeric,
  bb_lower numeric,
  atr_14 numeric,
  trend_signal text, -- 'bullish' | 'bearish' | 'neutral'
  primary key (ticker, date)
);

create table if not exists daily_digest (
  id uuid primary key default gen_random_uuid(),
  digest_date date not null,
  ticker text not null,
  company_name text,
  sector text,
  sentiment_trend text,
  avg_confidence numeric,
  news_count int not null default 0,
  price_change_pct numeric,
  rsi_14 numeric,
  trend_signal text,
  divergence_flag boolean not null default false,
  summary_text text,
  created_at timestamptz not null default now(),
  unique (digest_date, ticker)
);
create index if not exists daily_digest_date_idx on daily_digest(digest_date desc);

-- Broadcasts to every PostgREST replica behind Supabase's connection pooler —
-- without this, some requests (reads) can succeed against an already-synced
-- replica while others (writes) hit a stale one and fail with "table not
-- found in schema cache" even though the table exists.
NOTIFY pgrst, 'reload schema';
