-- Web push subscriptions for the admin PWA (one row per browser/device the
-- admin has granted notification permission on). No RLS policies are added
-- since this table is only ever touched via the service-role client from
-- admin-authenticated API routes, same pattern as other admin-only tables.
create table if not exists admin_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists admin_push_subscriptions_created_idx on admin_push_subscriptions(created_at desc);
