create table if not exists api_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  price_monthly integer default 0,
  price_annual integer default 0,
  call_limit integer default 500,
  max_keys integer default 1,
  features text[] default '{}',
  badge text default '',
  tier text default 'starter' check (tier in ('starter','growth','scale','enterprise')),
  is_active boolean default true,
  created_at timestamptz default now()
);
alter table api_plans enable row level security;
create policy "Public can read active plans" on api_plans for select using (is_active = true);
create policy "Admins can manage plans" on api_plans for all using (auth.role() = 'service_role');

insert into api_plans (name, slug, price_monthly, price_annual, call_limit, max_keys, features, badge, tier) values
  ('Starter', 'starter', 0, 0, 500, 1, '{"500 API calls/month","Lead capture widget","REST API access","Webhook support","Basic analytics","1 API key"}', '', 'starter'),
  ('Growth', 'growth', 999, 9990, 10000, 5, '{"10,000 API calls/month","Everything in Starter","CRM sync","Priority queue","Custom domain widget","5 API keys","Postman collection"}', 'Most Popular', 'growth'),
  ('Scale', 'scale', 4999, 49990, 0, 20, '{"Unlimited API calls","Everything in Growth","White-label embed","Dedicated infra","99.9% SLA","Custom AI agents","Direct Slack support"}', 'Best Value', 'scale')
on conflict (slug) do nothing;

alter table api_keys add column if not exists plan_id uuid references api_plans(id) on delete set null;
alter table api_keys add column if not exists plan_override_limit integer;
