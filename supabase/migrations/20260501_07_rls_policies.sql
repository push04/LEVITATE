-- Enable RLS on all new tables
ALTER TABLE groq_rate_tracker ENABLE ROW LEVEL SECURITY;
ALTER TABLE groq_job_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE reseller_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE drip_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE drip_emails_sent ENABLE ROW LEVEL SECURITY;
ALTER TABLE drip_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE do_not_contact ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversion_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE vertical_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_health_log ENABLE ROW LEVEL SECURITY;

-- Public read policies for public metrics
CREATE POLICY "Public can read agent_health_log" ON agent_health_log FOR SELECT USING (true);
CREATE POLICY "Public can read website_deployments" ON website_deployments FOR SELECT USING (true);

-- Service role has full access
CREATE POLICY "Service role full access on groq_rate_tracker" ON groq_rate_tracker FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on groq_job_queue" ON groq_job_queue FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on agent_schedules" ON agent_schedules FOR ALL USING (auth.role() = 'service_role');

-- Workspace owners can access their own data
CREATE POLICY "Users can access own workspace referrals" ON referrals FOR ALL USING (referrer_workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
CREATE POLICY "Users can access own workspace rewards" ON referral_rewards FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
CREATE POLICY "Users can access own website_orders" ON website_orders FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
CREATE POLICY "Users can access own conversion_events" ON conversion_events FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- Public tables (anyone can insert newsletter signup)
CREATE POLICY "Anyone can subscribe to newsletter" ON newsletter_subscribers FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role can manage newsletter" ON newsletter_subscribers FOR ALL USING (auth.role() = 'service_role');
