-- Add color column to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS color TEXT;