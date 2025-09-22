-- Add recurrence_series_id column to events table for grouping recurring events
ALTER TABLE events ADD COLUMN IF NOT EXISTS recurrence_series_id TEXT;