-- Replace 'YOUR_EMAIL' with your actual email address
update profiles 
set role = 'super_admin' 
where email = 'YOUR_EMAIL';

-- Verify the change
select * from profiles where email = 'YOUR_EMAIL';
