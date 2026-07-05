-- Reddit ingestion — run once in the Supabase SQL editor.
-- Posts from Indian stock-market subreddits, pulled via Reddit's official
-- OAuth REST API (config/subreddits.json). Feeds into sentiment_scores the
-- same way news_articles does (source_type = 'reddit').

create table if not exists reddit_posts (
  id text primary key, -- Reddit's own post id (e.g. "t3_abc123"), naturally dedupes on re-ingestion
  subreddit text not null,
  title text not null,
  selftext text,
  score int not null default 0,
  upvote_ratio numeric,
  num_comments int not null default 0,
  permalink text,
  flair text,
  created_utc timestamptz,
  ingested_at timestamptz not null default now()
);
create index if not exists reddit_posts_created_utc_idx on reddit_posts(created_utc desc);

NOTIFY pgrst, 'reload schema';
