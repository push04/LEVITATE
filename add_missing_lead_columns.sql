-- ============================================================
-- Levitate Labs — Add missing columns to leads table
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/eelwkowdkpmobbudqqlb/sql/new
-- ============================================================

-- Columns needed by the outreach + followup agents
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS outreach_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS last_outreach_at timestamptz;

-- Columns inserted by the bizdev agent
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS has_website boolean DEFAULT false;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS source_data jsonb;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS whatsapp text;

-- Verify all columns
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'leads' AND table_schema = 'public'
ORDER BY ordinal_position;
