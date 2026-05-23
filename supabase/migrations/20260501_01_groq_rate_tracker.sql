-- Groq Rate Tracker Table
CREATE TABLE IF NOT EXISTS groq_rate_tracker (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name text NOT NULL UNIQUE,
  requests_this_minute int DEFAULT 0,
  tokens_this_minute int DEFAULT 0,
  requests_today int DEFAULT 0,
  minute_window_start timestamptz DEFAULT now(),
  day_window_start date DEFAULT CURRENT_DATE,
  last_429_at timestamptz,
  backoff_until timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Groq Job Queue Table
CREATE TABLE IF NOT EXISTS groq_job_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name text NOT NULL,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE SET NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  model_name text NOT NULL,
  priority int DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  status text DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed','rate_limited')),
  created_at timestamptz DEFAULT now(),
  scheduled_after timestamptz DEFAULT now(),
  attempts int DEFAULT 0,
  error_message text,
  processed_at timestamptz
);

CREATE INDEX idx_groq_queue_status ON groq_job_queue(status, priority DESC, scheduled_after);
CREATE INDEX idx_groq_queue_workspace ON groq_job_queue(workspace_id);

-- Agent Schedules Table
CREATE TABLE IF NOT EXISTS agent_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name text NOT NULL,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  cron_expression text NOT NULL,
  last_run_at timestamptz,
  next_run_at timestamptz NOT NULL,
  enabled boolean DEFAULT true,
  run_count_today int DEFAULT 0,
  day_start date DEFAULT CURRENT_DATE,
  priority int DEFAULT 5,
  vertical text,
  config_overrides jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_agent_schedules_next_run ON agent_schedules(next_run_at) WHERE enabled = true;
