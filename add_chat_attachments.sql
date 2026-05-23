-- ADD ATTACHMENTS TO MESSAGES
-- Run this to support file sharing in chat.

ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::JSONB;

-- Example structure for attachments:
-- [
--   { "type": "image", "url": "...", "name": "image.png", "size": 1024 },
--   { "type": "file", "url": "...", "name": "doc.pdf", "size": 2048 }
-- ]
