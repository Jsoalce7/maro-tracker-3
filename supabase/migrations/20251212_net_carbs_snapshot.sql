-- Add sugar alcohols to definitions (user_custom_foods only for now as requested)
ALTER TABLE user_custom_foods ADD COLUMN IF NOT EXISTS sugar_alcohols_per_100g numeric;

-- Add snapshot fields to logs (food_entries)
ALTER TABLE food_entries ADD COLUMN IF NOT EXISTS fiber_g numeric;
ALTER TABLE food_entries ADD COLUMN IF NOT EXISTS sugar_alcohols_g numeric;
ALTER TABLE food_entries ADD COLUMN IF NOT EXISTS net_carbs_g numeric;
