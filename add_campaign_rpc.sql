-- Function to safely increment stats
CREATE OR REPLACE FUNCTION increment_campaign_sent(campaign_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE campaigns
  SET stats_sent = stats_sent + 1
  WHERE id = campaign_id;
END;
$$ LANGUAGE plpgsql;

-- Add missing columns/policies if needed in future
