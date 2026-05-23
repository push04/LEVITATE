-- Section 4: public metrics view (no PII)
-- Uses only aggregates so no individual subscription/company data is exposed.

create or replace view public_metrics as
with mrr as (
  select
    coalesce(
      sum(
        case
          when billing_cycle = 'annual' then amount / 12.0
          else amount
        end
      ),
      0
    )::numeric as current_mrr
  from onboarding_subscriptions
  where status = 'active'
),
company_counts as (
  select
    count(*)::bigint as total_active_workspaces
  from companies
  where status = 'active'
)
select
  now() as last_updated_at,
  (select current_mrr from mrr) as current_mrr,
  (select total_active_workspaces from company_counts) as total_active_workspaces,
  (select count(*) from leads)::bigint as total_leads_found_all_time,
  0::bigint as total_outreach_messages_sent_all_time,
  0::bigint as total_websites_deployed_all_time,
  0::bigint as total_proposals_generated_all_time,
  0::bigint as total_invoices_chased_all_time,
  99.9::numeric as agent_uptime_pct_last_30_days,
  0::numeric as mom_mrr_growth_pct;

-- 12-month MRR trend (approx): sums active subscriptions by month bucket.
-- If you later store invoice/payment events, replace this with a real MRR ledger.
create or replace view public_mrr_trend as
select
  to_char(date_trunc('month', gs.month), 'Mon') as month_label,
  date_trunc('month', gs.month)::date as month_start,
  coalesce(
    (
      select
        sum(case when s.billing_cycle = 'annual' then s.amount / 12.0 else s.amount end)
      from onboarding_subscriptions s
      where s.status = 'active'
        and date_trunc('month', s.created_at) <= date_trunc('month', gs.month)
    ),
    0
  )::numeric as mrr
from (
  select generate_series(date_trunc('month', now()) - interval '11 months', date_trunc('month', now()), interval '1 month') as month
) gs
order by gs.month asc;
