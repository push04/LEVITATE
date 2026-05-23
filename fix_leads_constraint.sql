-- Fix for 'service_category' null constraint violation
-- This ensures that if no category is provided, it defaults to 'General'

ALTER TABLE "leads" 
ALTER COLUMN "service_category" SET DEFAULT 'General';

-- Update existing NULL records (if any) to prevent future errors
UPDATE "leads" 
SET "service_category" = 'General' 
WHERE "service_category" IS NULL;

-- Verify table schema
SELECT column_name, column_default, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'leads';
