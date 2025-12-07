-- Add missing columns to user_custom_foods
ALTER TABLE user_custom_foods 
ADD COLUMN IF NOT EXISTS barcode text,
ADD COLUMN IF NOT EXISTS sugar_per_100g numeric,
ADD COLUMN IF NOT EXISTS fiber_per_100g numeric,
ADD COLUMN IF NOT EXISTS saturated_fat_per_100g numeric,
ADD COLUMN IF NOT EXISTS sodium_per_100g numeric;

-- Also verify if we need to add index or anything?
-- For now just columns.
