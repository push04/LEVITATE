create table if not exists onboarding_plans (
  id uuid default gen_random_uuid() primary key,
  slug text not null unique,
  name text not null,
  tagline text,
  description text,
  monthly_price numeric not null default 0,
  annual_price numeric not null default 0,
  monthly_setup_fee numeric not null default 0,
  annual_setup_fee numeric not null default 0,
  monthly_razorpay_plan_id text,
  annual_razorpay_plan_id text,
  features jsonb not null default '[]'::jsonb,
  highlights jsonb not null default '[]'::jsonb,
  deliverables jsonb not null default '[]'::jsonb,
  is_featured boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  cta_label text not null default 'Start onboarding',
  support_level text not null default 'Standard support',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists onboarding_subscriptions (
  id uuid default gen_random_uuid() primary key,
  plan_id uuid references onboarding_plans(id) on delete set null,
  company_name text not null,
  owner_name text not null,
  email text not null,
  phone text,
  billing_cycle text not null check (billing_cycle in ('monthly', 'annual')),
  amount numeric not null default 0,
  currency text not null default 'INR',
  status text not null default 'pending' check (status in ('pending', 'active', 'cancelled', 'failed')),
  subdomain_slug text not null unique,
  subdomain_url text not null,
  razorpay_plan_id text,
  razorpay_subscription_id text,
  razorpay_short_url text,
  notes jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table onboarding_plans enable row level security;
alter table onboarding_subscriptions enable row level security;

drop policy if exists "Admins can manage onboarding plans" on onboarding_plans;
create policy "Admins can manage onboarding plans" on onboarding_plans for all using (auth.role() = 'authenticated');

drop policy if exists "Admins can manage onboarding subscriptions" on onboarding_subscriptions;
create policy "Admins can manage onboarding subscriptions" on onboarding_subscriptions for all using (auth.role() = 'authenticated');

insert into onboarding_plans (
  slug,
  name,
  tagline,
  description,
  monthly_price,
  annual_price,
  monthly_setup_fee,
  annual_setup_fee,
  features,
  highlights,
  deliverables,
  is_featured,
  sort_order,
  support_level
)
values
  (
    'starter',
    'Starter CRM',
    'For small businesses that need a clean system fast',
    'A focused launch package with CRM, lead capture, custom subdomain, and the automations needed to start converting inbound leads reliably.',
    12999,
    129990,
    9999,
    0,
    '[
      "CRM for leads and clients",
      "Auto lead generator",
      "Custom subdomain on *.levitatelabs.online",
      "Email automation setup",
      "WhatsApp automation setup",
      "Admin-controlled pricing and plan content"
    ]'::jsonb,
    '[
      "Best for solo founders and small teams",
      "Launch fast without hiring an in-house tech team",
      "Simple, clear setup with room to grow"
    ]'::jsonb,
    '[
      "Lead inbox",
      "Simple CRM pipeline",
      "Lead generator",
      "Email follow-up workflow",
      "WhatsApp workflow",
      "Subdomain landing page"
    ]'::jsonb,
    false,
    1,
    'Standard support'
  ),
  (
    'growth',
    'Growth OS',
    'The recommended plan for service businesses that want more leads and follow-up',
    'Everything in Starter plus stronger automation, better reporting, and a more polished client acquisition system for growing businesses.',
    22999,
    229990,
    14999,
    0,
    '[
      "Everything in Starter",
      "Advanced CRM pipeline",
      "Campaign manager",
      "Reporting dashboard",
      "Priority onboarding",
      "Workflow templates"
    ]'::jsonb,
    '[
      "Best value for most businesses",
      "Recommended default",
      "Balanced between price and automation depth"
    ]'::jsonb,
    '[
      "Full CRM",
      "Lead generator",
      "Automated email sequences",
      "WhatsApp broadcast setup",
      "Campaign manager",
      "Revenue dashboard"
    ]'::jsonb,
    true,
    2,
    'Priority support'
  ),
  (
    'scale',
    'Scale Suite',
    'For businesses that want custom workflows and more hands-on support',
    'A premium rollout for teams that need tailored automations, advanced admin controls, and more direct implementation support.',
    39999,
    399990,
    19999,
    0,
    '[
      "Everything in Growth",
      "Custom workflows",
      "Dedicated rollout",
      "Custom reporting",
      "Team roles and permissions",
      "Strategic support"
    ]'::jsonb,
    '[
      "Best for larger teams",
      "More hands-on implementation",
      "Ideal when you want a custom operating layer"
    ]'::jsonb,
    '[
      "Advanced CRM",
      "Lead engine",
      "WhatsApp automation",
      "Email automation",
      "Custom domain setup",
      "Admin-editable website content"
    ]'::jsonb,
    false,
    3,
    'Dedicated support'
  ),
  (
    'enterprise',
    'Enterprise Build',
    'For teams that want a bespoke rollout with custom integrations',
    'A custom-priced implementation for larger businesses, multi-location operations, or teams that need deep integrations and tailored onboarding.',
    0,
    0,
    0,
    0,
    '[
      "Custom CRM and workflow design",
      "Advanced integrations",
      "Multi-team access",
      "Bespoke onboarding",
      "Dedicated success support",
      "Custom pricing available"
    ]'::jsonb,
    '[
      "Quote-based engagement",
      "Best for larger operations",
      "Use when a standard tier is not enough"
    ]'::jsonb,
    '[
      "Discovery workshop",
      "Custom implementation plan",
      "Priority rollout",
      "Integration scoping",
      "Dedicated support channel"
    ]'::jsonb,
    false,
    4,
    'Dedicated support'
  )
on conflict (slug) do update set
  name = excluded.name,
  tagline = excluded.tagline,
  description = excluded.description,
  monthly_price = excluded.monthly_price,
  annual_price = excluded.annual_price,
  monthly_setup_fee = excluded.monthly_setup_fee,
  annual_setup_fee = excluded.annual_setup_fee,
  features = excluded.features,
  highlights = excluded.highlights,
  deliverables = excluded.deliverables,
  is_featured = excluded.is_featured,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  cta_label = excluded.cta_label,
  support_level = excluded.support_level,
  updated_at = timezone('utc'::text, now());
