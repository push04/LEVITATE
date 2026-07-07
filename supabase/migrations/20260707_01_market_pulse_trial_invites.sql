-- Extends the existing demo-invite system (BizHarvest/TenderPulse) to also
-- cover a time-based, invite-only free trial of the real Market Pulse
-- business dashboard experience - not a query-capped demo like the other
-- two, so it needs a day count instead of a try count. The trial clock
-- starts at first_redeemed_at (already on this table), not at creation.
alter table demo_invites drop constraint if exists demo_invites_tool_check;
alter table demo_invites add constraint demo_invites_tool_check
  check (tool in ('bizharvest', 'tenderpulse', 'both', 'market_pulse'));

alter table demo_invites add column if not exists trial_days int;
