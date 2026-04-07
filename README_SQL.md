# Database Setup Guide

Follow these steps to initialize your Supabase database for LevitateOS.

## 1. Apply Schema
1. Open your **Supabase Dashboard**.
2. Go to the **SQL Editor**.
3. Open or copy the contents of `levitate_os.sql` from your project root.
4. Click **Run**.
   - *Note: This script uses `IF NOT EXISTS` so it is safe to run even if some tables already exist.*

## 2. Create Your Admin Account
1. Start the application (`npm run dev`).
2. Navigate to the login page (e.g., `http://localhost:3000/admin`).
3. **Sign Up** for a new account using your email.
   - *The system works with Supabase Auth, so you need a real auth user.*

## 3. Promote to Admin
By default, new users have the `employee` role. To make yourself a Super Admin:

1. Open `make_admin.sql` file in your project.
2. Replace `'YOUR_EMAIL'` with the email you just signed up with.
3. Copy the code.
4. Paste it into the **Supabase SQL Editor** and click **Run**.

## 4. Verify
Run this query in SQL Editor to confirm:
```sql
select * from profiles where role = 'super_admin';
```

---
**Files Overview:**
- `levitate_os.sql`: Main schema (Tables, RLS, Triggers)
- `make_admin.sql`: Helper to update user role
- `migrations.sql`: Legacy policies (included in main schema)
- `migrations_settings.sql`: Legacy settings (included in main schema)
