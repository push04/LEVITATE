-- Create table for persistent social posts
CREATE TABLE IF NOT EXISTS social_posts (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    text TEXT,
    link TEXT,
    author TEXT,
    platform TEXT, -- 'Reddit' only for now
    score INTEGER DEFAULT 0,
    intent_score INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_lead BOOLEAN DEFAULT FALSE, -- If AI verified it as a lead
    hidden BOOLEAN DEFAULT FALSE -- To 'dismiss' posts
);

-- Enable RLS
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users
CREATE POLICY "Allow read access to authenticated users" ON social_posts
    FOR SELECT TO authenticated USING (true);

-- Allow insert access to authenticated users (or service role)
CREATE POLICY "Allow insert access to authenticated users" ON social_posts
    FOR INSERT TO authenticated WITH CHECK (true);

-- Allow update
CREATE POLICY "Allow update access to authenticated users" ON social_posts
    FOR UPDATE TO authenticated USING (true);
