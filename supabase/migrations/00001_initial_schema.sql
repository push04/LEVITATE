-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. groq_rate_tracker
CREATE TABLE groq_rate_tracker (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    window_start timestamptz NOT NULL,
    request_count integer NOT NULL DEFAULT 0,
    rate_limit integer NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE groq_rate_tracker IS 'Tracks Groq API rate limit usage per window';
COMMENT ON COLUMN groq_rate_tracker.window_start IS 'Start timestamp of the rate limit window';
COMMENT ON COLUMN groq_rate_tracker.request_count IS 'Number of requests made in the current window';
COMMENT ON COLUMN groq_rate_tracker.rate_limit IS 'Maximum allowed requests per window';
COMMENT ON COLUMN groq_rate_tracker.user_id IS 'User associated with the rate limit (if applicable)';

CREATE INDEX idx_groq_rate_tracker_user_id ON groq_rate_tracker(user_id);
CREATE INDEX idx_groq_rate_tracker_window_start ON groq_rate_tracker(window_start);

CREATE TRIGGER update_groq_rate_tracker_updated_at
BEFORE UPDATE ON groq_rate_tracker
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE groq_rate_tracker ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to manage their own rate tracker"
ON groq_rate_tracker
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 2. groq_job_queue
CREATE TABLE groq_job_queue (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_type text NOT NULL,
    payload jsonb NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    error_message text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE groq_job_queue IS 'Queue for agent jobs to be processed';
COMMENT ON COLUMN groq_job_queue.job_type IS 'Type of job to process (e.g., summarize, generate)';
COMMENT ON COLUMN groq_job_queue.payload IS 'Job input data in JSON format';
COMMENT ON COLUMN groq_job_queue.status IS 'Job status: pending, processing, completed, failed';

CREATE INDEX idx_groq_job_queue_status ON groq_job_queue(status);
CREATE INDEX idx_groq_job_queue_user_id ON groq_job_queue(user_id);
CREATE INDEX idx_groq_job_queue_created_at ON groq_job_queue(created_at);

CREATE TRIGGER update_groq_job_queue_updated_at
BEFORE UPDATE ON groq_job_queue
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE groq_job_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to manage their own jobs"
ON groq_job_queue
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3. agent_schedules
CREATE TABLE agent_schedules (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_name text NOT NULL,
    cron_expression text NOT NULL,
    is_active boolean DEFAULT true,
    last_run_at timestamptz,
    next_run_at timestamptz,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE agent_schedules IS 'Cron schedules for agent execution';
COMMENT ON COLUMN agent_schedules.agent_name IS 'Name of the agent to schedule';
COMMENT ON COLUMN agent_schedules.cron_expression IS 'Cron string defining the schedule';
COMMENT ON COLUMN agent_schedules.is_active IS 'Whether the schedule is currently active';

CREATE INDEX idx_agent_schedules_agent_name ON agent_schedules(agent_name);
CREATE INDEX idx_agent_schedules_is_active ON agent_schedules(is_active);
CREATE INDEX idx_agent_schedules_user_id ON agent_schedules(user_id);

CREATE TRIGGER update_agent_schedules_updated_at
BEFORE UPDATE ON agent_schedules
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE agent_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to manage their own schedules"
ON agent_schedules
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4. agent_health_log
CREATE TABLE agent_health_log (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_name text NOT NULL,
    status text NOT NULL,
    response_time_ms integer,
    error_message text,
    logged_at timestamptz DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE agent_health_log IS 'Health and uptime logs for agents';
COMMENT ON COLUMN agent_health_log.agent_name IS 'Name of the agent being monitored';
COMMENT ON COLUMN agent_health_log.status IS 'Health status: healthy, degraded, down';
COMMENT ON COLUMN agent_health_log.response_time_ms IS 'Agent response time in milliseconds';

CREATE INDEX idx_agent_health_log_agent_name ON agent_health_log(agent_name);
CREATE INDEX idx_agent_health_log_status ON agent_health_log(status);
CREATE INDEX idx_agent_health_log_logged_at ON agent_health_log(logged_at);

ALTER TABLE agent_health_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to view health logs"
ON agent_health_log
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 5. conversion_events
CREATE TABLE conversion_events (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type text NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    metadata jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE conversion_events IS 'Analytics conversion events';
COMMENT ON COLUMN conversion_events.event_type IS 'Type of conversion event (e.g., signup, purchase)';
COMMENT ON COLUMN conversion_events.metadata IS 'Additional event metadata in JSON format';

CREATE INDEX idx_conversion_events_event_type ON conversion_events(event_type);
CREATE INDEX idx_conversion_events_user_id ON conversion_events(user_id);
CREATE INDEX idx_conversion_events_created_at ON conversion_events(created_at);

ALTER TABLE conversion_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to view their own events"
ON conversion_events
FOR SELECT
USING (auth.uid() = user_id);

-- 6. newsletter_subscribers
CREATE TABLE newsletter_subscribers (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    email text NOT NULL UNIQUE,
    subscribed_at timestamptz DEFAULT now(),
    is_active boolean DEFAULT true,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE
);

COMMENT ON TABLE newsletter_subscribers IS 'Newsletter subscription records';
COMMENT ON COLUMN newsletter_subscribers.email IS 'Subscriber email address (unique)';
COMMENT ON COLUMN newsletter_subscribers.is_active IS 'Whether the subscription is active';

CREATE INDEX idx_newsletter_subscribers_email ON newsletter_subscribers(email);
CREATE INDEX idx_newsletter_subscribers_is_active ON newsletter_subscribers(is_active);

ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to manage their own subscription"
ON newsletter_subscribers
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 7. business_finder_leads
CREATE TABLE business_finder_leads (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_name text NOT NULL,
    contact_email text,
    contact_phone text,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    status text DEFAULT 'new',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE business_finder_leads IS 'Leads generated by the business finder tool';
COMMENT ON COLUMN business_finder_leads.status IS 'Lead status: new, contacted, converted, rejected';

CREATE INDEX idx_business_finder_leads_user_id ON business_finder_leads(user_id);
CREATE INDEX idx_business_finder_leads_status ON business_finder_leads(status);
CREATE INDEX idx_business_finder_leads_created_at ON business_finder_leads(created_at);

CREATE TRIGGER update_business_finder_leads_updated_at
BEFORE UPDATE ON business_finder_leads
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE business_finder_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to manage their own leads"
ON business_finder_leads
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 8. referrals
CREATE TABLE referrals (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer_id uuid REFERENCES auth.users(id) NOT NULL,
    referred_user_id uuid REFERENCES auth.users(id),
    referral_code text UNIQUE NOT NULL,
    status text DEFAULT 'pending',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE referrals IS 'Referral system records';
COMMENT ON COLUMN referrals.referral_code IS 'Unique referral code for the referrer';
COMMENT ON COLUMN referrals.status IS 'Referral status: pending, completed, expired';

CREATE INDEX idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX idx_referrals_referral_code ON referrals(referral_code);
CREATE INDEX idx_referrals_status ON referrals(status);

CREATE TRIGGER update_referrals_updated_at
BEFORE UPDATE ON referrals
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to manage their own referrals"
ON referrals
FOR ALL
USING (auth.uid() = referrer_id)
WITH CHECK (auth.uid() = referrer_id);

-- 9. referral_rewards
CREATE TABLE referral_rewards (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    referral_id uuid REFERENCES referrals(id) ON DELETE CASCADE,
    reward_type text NOT NULL,
    amount numeric,
    status text DEFAULT 'unpaid',
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE referral_rewards IS 'Rewards earned through referrals';
COMMENT ON COLUMN referral_rewards.reward_type IS 'Type of reward (e.g., credit, cash)';
COMMENT ON COLUMN referral_rewards.amount IS 'Monetary value of the reward';

CREATE INDEX idx_referral_rewards_referral_id ON referral_rewards(referral_id);
CREATE INDEX idx_referral_rewards_user_id ON referral_rewards(user_id);
CREATE INDEX idx_referral_rewards_status ON referral_rewards(status);

CREATE TRIGGER update_referral_rewards_updated_at
BEFORE UPDATE ON referral_rewards
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE referral_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to view their own rewards"
ON referral_rewards
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 10. reseller_commissions
CREATE TABLE reseller_commissions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    reseller_id uuid REFERENCES auth.users(id) NOT NULL,
    order_id uuid,
    commission_amount numeric NOT NULL,
    status text DEFAULT 'pending',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE reseller_commissions IS 'Commission tracking for resellers';
COMMENT ON COLUMN reseller_commissions.commission_amount IS 'Amount of commission earned';
COMMENT ON COLUMN reseller_commissions.status IS 'Commission status: pending, paid, cancelled';

CREATE INDEX idx_reseller_commissions_reseller_id ON reseller_commissions(reseller_id);
CREATE INDEX idx_reseller_commissions_status ON reseller_commissions(status);
CREATE INDEX idx_reseller_commissions_created_at ON reseller_commissions(created_at);

CREATE TRIGGER update_reseller_commissions_updated_at
BEFORE UPDATE ON reseller_commissions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE reseller_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to manage their own commissions"
ON reseller_commissions
FOR ALL
USING (auth.uid() = reseller_id)
WITH CHECK (auth.uid() = reseller_id);

-- 11. agency_applications
CREATE TABLE agency_applications (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    agency_name text NOT NULL,
    contact_email text NOT NULL,
    status text DEFAULT 'pending',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE agency_applications IS 'Applications for agency partner program';
COMMENT ON COLUMN agency_applications.status IS 'Application status: pending, approved, rejected';

CREATE INDEX idx_agency_applications_user_id ON agency_applications(user_id);
CREATE INDEX idx_agency_applications_status ON agency_applications(status);
CREATE INDEX idx_agency_applications_contact_email ON agency_applications(contact_email);

CREATE TRIGGER update_agency_applications_updated_at
BEFORE UPDATE ON agency_applications
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE agency_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to manage their own applications"
ON agency_applications
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 12. ca_partner_applications
CREATE TABLE ca_partner_applications (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    firm_name text NOT NULL,
    contact_email text NOT NULL,
    status text DEFAULT 'pending',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE ca_partner_applications IS 'Applications for CA partner program';
COMMENT ON COLUMN ca_partner_applications.status IS 'Application status: pending, approved, rejected';

CREATE INDEX idx_ca_partner_applications_user_id ON ca_partner_applications(user_id);
CREATE INDEX idx_ca_partner_applications_status ON ca_partner_applications(status);
CREATE INDEX idx_ca_partner_applications_contact_email ON ca_partner_applications(contact_email);

CREATE TRIGGER update_ca_partner_applications_updated_at
BEFORE UPDATE ON ca_partner_applications
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE ca_partner_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to manage their own applications"
ON ca_partner_applications
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 13. drip_sequences
CREATE TABLE drip_sequences (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    trigger_event text,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE drip_sequences IS 'Email drip campaign sequences';
COMMENT ON COLUMN drip_sequences.trigger_event IS 'Event that triggers the drip sequence';
COMMENT ON COLUMN drip_sequences.is_active IS 'Whether the sequence is active';

CREATE INDEX idx_drip_sequences_user_id ON drip_sequences(user_id);
CREATE INDEX idx_drip_sequences_is_active ON drip_sequences(is_active);
CREATE INDEX idx_drip_sequences_trigger_event ON drip_sequences(trigger_event);

CREATE TRIGGER update_drip_sequences_updated_at
BEFORE UPDATE ON drip_sequences
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE drip_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to manage their own sequences"
ON drip_sequences
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 14. drip_templates
CREATE TABLE drip_templates (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    subject text NOT NULL,
    body text NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE drip_templates IS 'Templates for drip campaign emails';
COMMENT ON COLUMN drip_templates.subject IS 'Email subject line';
COMMENT ON COLUMN drip_templates.body IS 'Email body content (HTML or text)';

CREATE INDEX idx_drip_templates_user_id ON drip_templates(user_id);
CREATE INDEX idx_drip_templates_name ON drip_templates(name);

CREATE TRIGGER update_drip_templates_updated_at
BEFORE UPDATE ON drip_templates
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE drip_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to manage their own templates"
ON drip_templates
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 15. drip_emails_sent
CREATE TABLE drip_emails_sent (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    drip_sequence_id uuid REFERENCES drip_sequences(id) ON DELETE CASCADE,
    recipient_email text NOT NULL,
    sent_at timestamptz DEFAULT now(),
    status text DEFAULT 'sent',
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE drip_emails_sent IS 'Record of sent drip campaign emails';
COMMENT ON COLUMN drip_emails_sent.status IS 'Email status: sent, opened, clicked, bounced';

CREATE INDEX idx_drip_emails_sent_drip_sequence_id ON drip_emails_sent(drip_sequence_id);
CREATE INDEX idx_drip_emails_sent_recipient_email ON drip_emails_sent(recipient_email);
CREATE INDEX idx_drip_emails_sent_user_id ON drip_emails_sent(user_id);
CREATE INDEX idx_drip_emails_sent_sent_at ON drip_emails_sent(sent_at);

ALTER TABLE drip_emails_sent ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to view their own sent emails"
ON drip_emails_sent
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 16. do_not_contact
CREATE TABLE do_not_contact (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    email text NOT NULL UNIQUE,
    phone text,
    reason text,
    added_at timestamptz DEFAULT now(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE do_not_contact IS 'Do Not Contact list for email/phone outreach';
COMMENT ON COLUMN do_not_contact.email IS 'Email address to exclude from outreach';
COMMENT ON COLUMN do_not_contact.phone IS 'Phone number to exclude from outreach';

CREATE INDEX idx_do_not_contact_email ON do_not_contact(email);
CREATE INDEX idx_do_not_contact_phone ON do_not_contact(phone);
CREATE INDEX idx_do_not_contact_user_id ON do_not_contact(user_id);

ALTER TABLE do_not_contact ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to manage their own DNC entries"
ON do_not_contact
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 17. payment_events
CREATE TABLE payment_events (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id text UNIQUE NOT NULL,
    event_type text NOT NULL,
    payload jsonb NOT NULL,
    processed_at timestamptz,
    status text DEFAULT 'pending',
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE payment_events IS 'Razorpay webhook payment events';
COMMENT ON COLUMN payment_events.event_id IS 'Unique Razorpay event ID';
COMMENT ON COLUMN payment_events.payload IS 'Raw webhook payload from Razorpay';

CREATE INDEX idx_payment_events_event_id ON payment_events(event_id);
CREATE INDEX idx_payment_events_event_type ON payment_events(event_type);
CREATE INDEX idx_payment_events_user_id ON payment_events(user_id);
CREATE INDEX idx_payment_events_status ON payment_events(status);

ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to view their own payment events"
ON payment_events
FOR SELECT
USING (auth.uid() = user_id);

-- 18. website_templates
CREATE TABLE website_templates (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text NOT NULL UNIQUE,
    description text,
    thumbnail_url text,
    config jsonb NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE website_templates IS 'Templates for the website builder';
COMMENT ON COLUMN website_templates.config IS 'Template configuration in JSON format';
COMMENT ON COLUMN website_templates.is_active IS 'Whether the template is available for use';

CREATE INDEX idx_website_templates_name ON website_templates(name);
CREATE INDEX idx_website_templates_is_active ON website_templates(is_active);

CREATE TRIGGER update_website_templates_updated_at
BEFORE UPDATE ON website_templates
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE website_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon to view active templates"
ON website_templates
FOR SELECT
TO anon
USING (is_active = true);

-- 19. website_orders
CREATE TABLE website_orders (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES auth.users(id) NOT NULL,
    template_id uuid REFERENCES website_templates(id),
    order_status text DEFAULT 'pending',
    total_amount numeric NOT NULL,
    payment_id text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE website_orders IS 'Website deployment orders';
COMMENT ON COLUMN website_orders.order_status IS 'Order status: pending, processing, completed, cancelled';
COMMENT ON COLUMN website_orders.total_amount IS 'Total order amount in INR';

CREATE INDEX idx_website_orders_user_id ON website_orders(user_id);
CREATE INDEX idx_website_orders_order_status ON website_orders(order_status);
CREATE INDEX idx_website_orders_created_at ON website_orders(created_at);

CREATE TRIGGER update_website_orders_updated_at
BEFORE UPDATE ON website_orders
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE website_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to manage their own orders"
ON website_orders
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 20. vertical_configs
CREATE TABLE vertical_configs (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    vertical text NOT NULL UNIQUE,
    config jsonb NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE vertical_configs IS 'Vertical-specific agent configurations';
COMMENT ON COLUMN vertical_configs.vertical IS 'Industry vertical (e.g., healthcare, finance)';
COMMENT ON COLUMN vertical_configs.config IS 'Vertical-specific config in JSON format';

CREATE INDEX idx_vertical_configs_vertical ON vertical_configs(vertical);
CREATE INDEX idx_vertical_configs_is_active ON vertical_configs(is_active);

CREATE TRIGGER update_vertical_configs_updated_at
BEFORE UPDATE ON vertical_configs
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE vertical_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon to view active vertical configs"
ON vertical_configs
FOR SELECT
TO anon
USING (is_active = true);

-- 21. website_quality_log
CREATE TABLE website_quality_log (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    website_order_id uuid REFERENCES website_orders(id) ON DELETE CASCADE,
    lighthouse_score integer,
    accessibility_score integer,
    seo_score integer,
    performance_score integer,
    logged_at timestamptz DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE website_quality_log IS 'Lighthouse and accessibility scores for websites';
COMMENT ON COLUMN website_quality_log.lighthouse_score IS 'Google Lighthouse overall score (0-100)';
COMMENT ON COLUMN website_quality_log.accessibility_score IS 'Accessibility score (0-100)';

CREATE INDEX idx_website_quality_log_website_order_id ON website_quality_log(website_order_id);
CREATE INDEX idx_website_quality_log_logged_at ON website_quality_log(logged_at);

ALTER TABLE website_quality_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to view their own website quality logs"
ON website_quality_log
FOR SELECT
USING (auth.uid() = (SELECT user_id FROM website_orders WHERE id = website_order_id));

-- 22. github_actions_usage
CREATE TABLE github_actions_usage (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    repository text NOT NULL,
    minutes_used integer NOT NULL,
    billable_amount numeric,
    logged_at timestamptz DEFAULT now(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE github_actions_usage IS 'GitHub Actions minutes usage tracking';
COMMENT ON COLUMN github_actions_usage.repository IS 'Repository name (e.g., owner/repo)';
COMMENT ON COLUMN github_actions_usage.minutes_used IS 'Number of billable minutes used';

CREATE INDEX idx_github_actions_usage_repository ON github_actions_usage(repository);
CREATE INDEX idx_github_actions_usage_user_id ON github_actions_usage(user_id);
CREATE INDEX idx_github_actions_usage_logged_at ON github_actions_usage(logged_at);

ALTER TABLE github_actions_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to view their own usage"
ON github_actions_usage
FOR SELECT
USING (auth.uid() = user_id);

-- 23. system_alerts
CREATE TABLE system_alerts (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_type text NOT NULL,
    message text NOT NULL,
    severity text NOT NULL,
    is_resolved boolean DEFAULT false,
    resolved_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE system_alerts IS 'System-wide alerts and notifications';
COMMENT ON COLUMN system_alerts.severity IS 'Alert severity: info, warning, critical';
COMMENT ON COLUMN system_alerts.is_resolved IS 'Whether the alert has been resolved';

CREATE INDEX idx_system_alerts_severity ON system_alerts(severity);
CREATE INDEX idx_system_alerts_is_resolved ON system_alerts(is_resolved);
CREATE INDEX idx_system_alerts_created_at ON system_alerts(created_at);

CREATE TRIGGER update_system_alerts_updated_at
BEFORE UPDATE ON system_alerts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE system_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon to view unresolved alerts"
ON system_alerts
FOR SELECT
TO anon
USING (is_resolved = false);

-- 24. public_metrics (Materialized View)
CREATE MATERIALIZED VIEW public_metrics AS
SELECT
    (SELECT COUNT(*) FROM auth.users) AS total_users,
    (SELECT COUNT(*) FROM newsletter_subscribers WHERE is_active = true) AS active_subscribers,
    (SELECT COUNT(*) FROM website_orders WHERE order_status = 'completed') AS completed_orders,
    now() AS last_updated;

COMMENT ON MATERIALIZED VIEW public_metrics IS 'Publicly available aggregated metrics';
COMMENT ON COLUMN public_metrics.total_users IS 'Total number of registered users';
COMMENT ON COLUMN public_metrics.active_subscribers IS 'Number of active newsletter subscribers';

GRANT SELECT ON public_metrics TO anon;

-- 25. status_subscribers
CREATE TABLE status_subscribers (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    email text NOT NULL UNIQUE,
    subscribed_at timestamptz DEFAULT now(),
    is_active boolean DEFAULT true,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE
);

COMMENT ON TABLE status_subscribers IS 'Subscribers to status page notifications';
COMMENT ON COLUMN status_subscribers.email IS 'Subscriber email address (unique)';
COMMENT ON COLUMN status_subscribers.is_active IS 'Whether the subscription is active';

CREATE INDEX idx_status_subscribers_email ON status_subscribers(email);
CREATE INDEX idx_status_subscribers_is_active ON status_subscribers(is_active);

ALTER TABLE status_subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to manage their own status subscription"
ON status_subscribers
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 26. Auto-cleanup SQL (Section 33.2)
-- Clean up old rate tracker entries (older than 1 hour)
CREATE OR REPLACE FUNCTION cleanup_old_rate_tracker()
RETURNS void AS $$
BEGIN
  DELETE FROM groq_rate_tracker
  WHERE window_start < now() - interval '1 hour';
END;
$$ LANGUAGE plpgsql;

-- Clean up completed jobs older than 7 days
CREATE OR REPLACE FUNCTION cleanup_old_jobs()
RETURNS void AS $$
BEGIN
  DELETE FROM groq_job_queue
  WHERE status IN ('completed', 'failed')
    AND created_at < now() - interval '7 days';
END;
$$ LANGUAGE plpgsql;

-- Clean up old health logs older than 30 days
CREATE OR REPLACE FUNCTION cleanup_old_health_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM agent_health_log
  WHERE logged_at < now() - interval '30 days';
END;
$$ LANGUAGE plpgsql;

-- Master cleanup function
CREATE OR REPLACE FUNCTION run_scheduled_cleanup()
RETURNS void AS $$
BEGIN
  PERFORM cleanup_old_rate_tracker();
  PERFORM cleanup_old_jobs();
  PERFORM cleanup_old_health_logs();
END;
$$ LANGUAGE plpgsql;

-- Add day_start and runs_today columns to agent_schedules if not present
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='agent_schedules' AND column_name='day_start') THEN
    ALTER TABLE agent_schedules ADD COLUMN day_start date DEFAULT CURRENT_DATE;
    ALTER TABLE agent_schedules ADD COLUMN runs_today integer DEFAULT 0;
    ALTER TABLE agent_schedules ADD COLUMN max_runs_per_day integer DEFAULT 100;
  END IF;
END
$$;

-- Add workspace_id, scheduled_after, started_at, completed_at, response, error columns to groq_job_queue if not present
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='groq_job_queue' AND column_name='workspace_id') THEN
    ALTER TABLE groq_job_queue ADD COLUMN workspace_id uuid;
    ALTER TABLE groq_job_queue ADD COLUMN scheduled_after timestamptz DEFAULT now();
    ALTER TABLE groq_job_queue ADD COLUMN started_at timestamptz;
    ALTER TABLE groq_job_queue ADD COLUMN completed_at timestamptz;
    ALTER TABLE groq_job_queue ADD COLUMN response jsonb;
    ALTER TABLE groq_job_queue ADD COLUMN error text;
  END IF;
END
$$;

-- Add workspace_id to agent_health_log if not present
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='agent_health_log' AND column_name='workspace_id') THEN
    ALTER TABLE agent_health_log ADD COLUMN workspace_id uuid;
    ALTER TABLE agent_health_log ADD COLUMN job_id uuid;
    ALTER TABLE agent_health_log ADD COLUMN timestamp timestamptz DEFAULT now();
  END IF;
END
$$;

-- Add color_scheme, pages, live_url, netlify_site_id, website_url, website_status to relevant tables
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='website_orders' AND column_name='color_scheme') THEN
    ALTER TABLE website_orders ADD COLUMN color_scheme text DEFAULT 'blue';
    ALTER TABLE website_orders ADD COLUMN pages text[] DEFAULT ARRAY['home', 'about', 'contact'];
    ALTER TABLE website_orders ADD COLUMN live_url text;
    ALTER TABLE website_orders ADD COLUMN netlify_site_id text;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workspaces' AND column_name='website_url') THEN
    ALTER TABLE workspaces ADD COLUMN website_url text;
    ALTER TABLE workspaces ADD COLUMN website_status text DEFAULT 'none';
    ALTER TABLE workspaces ADD COLUMN netlify_site_id text;
    ALTER TABLE workspaces ADD COLUMN first_agent_output_at timestamptz;
  END IF;
END
$$;

-- Function to reset daily runs when day changes
CREATE OR REPLACE FUNCTION reset_daily_runs(day_start_param text)
RETURNS void AS $$
BEGIN
  UPDATE agent_schedules
  SET runs_today = 0, day_start = day_start_param::date
  WHERE day_start < day_start_param::date OR day_start IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to get next run time from cron expression (simplified - handles basic patterns)
CREATE OR REPLACE FUNCTION get_next_run_from_cron(cron_expr text, from_time timestamptz)
RETURNS timestamptz AS $$
DECLARE
  minute_part text;
  hour_part text;
  next_time timestamptz;
BEGIN
  -- Basic parsing for common patterns like "*/2 * * * *" or "0 * * * *"
  minute_part := split_part(cron_expr, ' ', 1);
  hour_part := split_part(cron_expr, ' ', 2);

  IF minute_part LIKE '*/%' THEN
    -- Every N minutes
    next_time := from_time + (substring(minute_part from '\d+')::integer || ' minutes')::interval;
  ELSE
    next_time := from_time + interval '1 hour';
  END IF;

  RETURN next_time;
END;
$$ LANGUAGE plpgsql;
