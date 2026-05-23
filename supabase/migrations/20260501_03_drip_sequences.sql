-- Drip Sequence System
CREATE TABLE IF NOT EXISTS drip_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  current_step int DEFAULT 1 CHECK (current_step BETWEEN 1 AND 7),
  status text DEFAULT 'active' CHECK (status IN ('active','paused','completed','unsubscribed')),
  started_at timestamptz DEFAULT now(),
  next_send_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS drip_emails_sent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drip_sequence_id uuid REFERENCES drip_sequences(id) ON DELETE CASCADE,
  step_number int NOT NULL,
  sent_at timestamptz DEFAULT now(),
  opened_at timestamptz,
  replied_at timestamptz,
  subject text,
  body_preview text
);

CREATE TABLE IF NOT EXISTS drip_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  step_number int NOT NULL CHECK (step_number BETWEEN 1 AND 7),
  subject text NOT NULL,
  body_template text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS do_not_contact (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  reason text,
  created_at timestamptz DEFAULT now()
);
