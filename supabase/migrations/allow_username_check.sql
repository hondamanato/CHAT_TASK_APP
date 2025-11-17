-- Allow anonymous users to check username availability
-- This migration creates a secure RPC function for checking username availability
-- without exposing other profile data

-- Create a function to check if a username is available
-- This function bypasses RLS and only returns a boolean
CREATE OR REPLACE FUNCTION check_username_available(username_to_check TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Return true if username doesn't exist, false if it does
  RETURN NOT EXISTS (
    SELECT 1 FROM profiles WHERE username = username_to_check
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to anonymous and authenticated users
GRANT EXECUTE ON FUNCTION check_username_available(TEXT) TO anon, authenticated;

-- Add a comment for documentation
COMMENT ON FUNCTION check_username_available(TEXT) IS 
'Securely checks if a username is available without exposing other profile data. Returns true if available, false if taken. Can be called by anonymous users during signup.';

