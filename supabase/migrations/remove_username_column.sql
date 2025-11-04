-- Remove username column from profiles table
-- This migration removes the username feature completely
-- Date: 2025-11-04

-- Drop index first
DROP INDEX IF EXISTS idx_profiles_username;

-- Drop username column
ALTER TABLE profiles
DROP COLUMN IF EXISTS username;

-- Add comment for documentation
COMMENT ON TABLE profiles IS 'User profiles table. Username feature has been removed. Only name column is used for display.';
