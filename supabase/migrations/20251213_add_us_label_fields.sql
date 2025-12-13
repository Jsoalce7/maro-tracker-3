-- Add US Nutrition Label fields to food_items
ALTER TABLE food_items
ADD COLUMN IF NOT EXISTS trans_fat_per_100g NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS added_sugar_per_100g NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS cholesterol_per_100g NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS potassium_per_100g NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS calcium_per_100g NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS iron_per_100g NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS vitamin_d_per_100g NUMERIC DEFAULT 0;

-- Add US Nutrition Label fields to user_custom_foods (User Created items)
ALTER TABLE user_custom_foods
ADD COLUMN IF NOT EXISTS trans_fat_per_100g NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS added_sugar_per_100g NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS cholesterol_per_100g NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS potassium_per_100g NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS calcium_per_100g NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS iron_per_100g NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS vitamin_d_per_100g NUMERIC DEFAULT 0;

-- Optional: Comments for clarity
COMMENT ON COLUMN food_items.trans_fat_per_100g IS 'Trans Fat in grams per 100g';
COMMENT ON COLUMN food_items.added_sugar_per_100g IS 'Included Added Sugars in grams per 100g';
COMMENT ON COLUMN food_items.cholesterol_per_100g IS 'Cholesterol in milligrams (mg) per 100g';
COMMENT ON COLUMN food_items.potassium_per_100g IS 'Potassium in milligrams (mg) per 100g';
COMMENT ON COLUMN food_items.calcium_per_100g IS 'Calcium in milligrams (mg) per 100g';
COMMENT ON COLUMN food_items.iron_per_100g IS 'Iron in milligrams (mg) per 100g';
COMMENT ON COLUMN food_items.vitamin_d_per_100g IS 'Vitamin D in micrograms (mcg) per 100g';
