-- Allow service role (agents) to insert email logs
-- Run this in Supabase SQL Editor

-- email_threads: service role insert
create policy if not exists "Service role insert threads"
  on email_threads for insert
  with check (true);

-- email_messages: service role insert  
create policy if not exists "Service role insert messages"
  on email_messages for insert
  with check (true);

-- email_threads: service role select (for join in dashboard)
create policy if not exists "Service role select threads"
  on email_threads for select
  using (true);

-- email_messages: service role select
create policy if not exists "Service role select messages"
  on email_messages for select
  using (true);

-- Also ensure realtime is enabled for admin dashboard live updates
alter publication supabase_realtime add table email_messages;
alter publication supabase_realtime add table email_threads;
