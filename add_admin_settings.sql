-- 1. Create a table for global platform settings (Singleton Pattern)
CREATE TABLE IF NOT EXISTS platform_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1), -- Ensure only one row exists
    maintenance_mode BOOLEAN DEFAULT false,
    allow_new_registrations BOOLEAN DEFAULT true,
    platform_name TEXT DEFAULT 'Levitate Labs',
    support_email TEXT DEFAULT 'admin@levitatelabs.online',
    default_trial_days INTEGER DEFAULT 14,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed the initial row if it doesn't exist
INSERT INTO platform_settings (id, maintenance_mode, allow_new_registrations)
VALUES (1, false, true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read public settings (you might want to restrict this later, but for now we need it for the app to know if maintenance mode is on)
CREATE POLICY "Everyone can read platform settings" 
ON platform_settings FOR SELECT 
USING (true);

-- Policy: Only Admins can update settings
CREATE POLICY "Admins can update platform settings" 
ON platform_settings FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND (profiles.role = 'admin' OR profiles.role = 'super_admin')
    )
);

-- 2. Add preferences column to profiles for User-specific settings (if not exists)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{"theme": "system", "email_notifications": true}';

-- 3. Create a function to update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for platform_settings
DROP TRIGGER IF EXISTS update_platform_settings_updated_at ON platform_settings;
CREATE TRIGGER update_platform_settings_updated_at
    BEFORE UPDATE ON platform_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
