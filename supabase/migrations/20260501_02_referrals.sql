-- Referral System
CREATE TABLE IF NOT EXISTS referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_workspace_id uuid REFERENCES workspaces(id) ON DELETE SET NULL,
  referred_email text,
  referred_workspace_id uuid REFERENCES workspaces(id) ON DELETE SET NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending','converted','rewarded')),
  created_at timestamptz DEFAULT now(),
  converted_at timestamptz
);

CREATE TABLE IF NOT EXISTS referral_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  reward_type text CHECK (reward_type IN ('free_month','discount','reseller_commission')),
  months_credited int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reseller_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  referred_workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  commission_amount numeric(10,2),
  month_year text,
  paid boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
