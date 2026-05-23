-- Add name column to invitations table
alter table invitations 
add column if not exists name text;

-- Allow public access to view invitations by token (if not already handled by function/API)
-- The API uses service role, so RLS on invitations mostly matters if we use client SDK.
-- But let's ensure the table structure is correct.
