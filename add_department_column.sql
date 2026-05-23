-- Add department column to career_applications table
ALTER TABLE career_applications 
ADD COLUMN IF NOT EXISTS department TEXT;

-- Comment on column
COMMENT ON COLUMN career_applications.department IS 'The track/role the candidate applied for (e.g., Frontend, Backend, Design)';
