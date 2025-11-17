-- Add username column to profiles table
-- Username must be unique and is required for new users
-- This migration adds the username column for the new multi-step signup flow

-- Add username column
ALTER TABLE profiles
ADD COLUMN username TEXT UNIQUE;

-- Create index for faster username lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- Add comment for documentation
COMMENT ON COLUMN profiles.username IS 'Unique username for the user. Must be 3-20 characters, lowercase alphanumeric only.';
