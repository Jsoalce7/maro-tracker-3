-- Add ingredients column to user_custom_foods
ALTER TABLE user_custom_foods ADD COLUMN IF NOT EXISTS ingredients text;
