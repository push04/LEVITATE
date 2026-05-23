-- OPTIONAL: Run this ONLY if you get an error saying "update or delete on table email_threads violates foreign key constraint"
-- This ensures that deleting an email thread automatically deletes all its messages.

-- 1. Drop existing constraint (if any) to prevent conflicts
alter table email_messages 
drop constraint if exists email_messages_thread_id_fkey;

-- 2. Re-add constraint with ON DELETE CASCADE
alter table email_messages 
add constraint email_messages_thread_id_fkey 
foreign key (thread_id) 
references email_threads(id) 
on delete cascade;
