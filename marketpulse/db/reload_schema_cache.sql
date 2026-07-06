-- Run this alone if marketpulse tables exist but inserts fail with
-- "Could not find the table 'public.X' in the schema cache" - it broadcasts
-- a reload to every PostgREST replica behind Supabase's connection pooler.
NOTIFY pgrst, 'reload schema';
