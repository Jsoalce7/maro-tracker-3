-- Migration: Add Soft Delete Support
-- Adds `deleted_at` column to user_custom_foods and recipes tables

-- 1. Add deleted_at to user_custom_foods
ALTER TABLE user_custom_foods 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Add deleted_at to recipes
ALTER TABLE recipes 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 3. (Optional) Create indexes for performance if table grows large
CREATE INDEX IF NOT EXISTS idx_user_custom_foods_deleted_at ON user_custom_foods(deleted_at);
CREATE INDEX IF NOT EXISTS idx_recipes_deleted_at ON recipes(deleted_at);
