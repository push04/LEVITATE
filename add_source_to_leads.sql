-- Add source column to campaign_leads table
ALTER TABLE campaign_leads 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'Manual';
