-- Add custom_event_titles column to profiles table
-- This column stores user-defined custom titles for different image categories
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS custom_event_titles JSONB DEFAULT '{}'::jsonb;

-- Add comment to explain the column structure
COMMENT ON COLUMN profiles.custom_event_titles IS 'Stores custom event titles mapped by image category. Structure: {"category_name": "custom_title", ...}. Example: {"shift_cafe": "バイト", "shift_school": "学校"}';

-- Create index for faster JSONB queries
CREATE INDEX IF NOT EXISTS idx_profiles_custom_event_titles ON profiles USING gin (custom_event_titles);
