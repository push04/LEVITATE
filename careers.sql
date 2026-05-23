-- CAREERS SCHEMA

-- 1. Create table for applications
CREATE TABLE IF NOT EXISTS career_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    portfolio_link TEXT,
    resume_link TEXT,
    
    -- Interview Data
    interview_transcript JSONB DEFAULT '[]'::JSONB, -- Stores the chat history
    ai_summary TEXT, -- AI's assessment of the candidate
    rating INTEGER, -- 1-10 Score
    
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'interviewing', 'reviewed', 'shortlisted', 'rejected', 'hired')),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE career_applications ENABLE ROW LEVEL SECURITY;

-- 3. Policies

-- Public: Anyone can submit an application (INSERT)
CREATE POLICY "Public Application Submission" ON career_applications
    FOR INSERT
    WITH CHECK (true);

-- Public: No one can read applications publicly (SELECT)
-- (We might allow a user to see their own if we had auth, but these are guests)

-- Admin: Admins/Managers can VIEW all applications
CREATE POLICY "Admins View Applications" ON career_applications
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('super_admin', 'admin', 'manager')
        )
    );

-- Admin: Admins/Managers can UPDATE applications (Status, Rating)
CREATE POLICY "Admins Update Applications" ON career_applications
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('super_admin', 'admin', 'manager')
        )
    );

-- Admin: Admins/Managers can DELETE applications
CREATE POLICY "Admins Delete Applications" ON career_applications
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('super_admin', 'admin', 'manager')
        )
    );

-- 4. Notification / Real-time
-- (Optional: Trigger hook for email sending would go here or be handled by the API)
