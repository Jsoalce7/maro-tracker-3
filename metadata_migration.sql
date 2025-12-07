-- Add metadata columns to user_custom_foods
ALTER TABLE user_custom_foods 
ADD COLUMN IF NOT EXISTS category text,
ADD COLUMN IF NOT EXISTS source text,
ADD COLUMN IF NOT EXISTS processing_level text,
ADD COLUMN IF NOT EXISTS tags text[];

-- Add metadata columns to recipes
ALTER TABLE recipes 
ADD COLUMN IF NOT EXISTS category text,
ADD COLUMN IF NOT EXISTS source text,
ADD COLUMN IF NOT EXISTS processing_level text,
ADD COLUMN IF NOT EXISTS tags text[];

-- Create indexes for filtering performance
CREATE INDEX IF NOT EXISTS idx_custom_foods_category ON user_custom_foods(category);
CREATE INDEX IF NOT EXISTS idx_custom_foods_tags ON user_custom_foods USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_recipes_category ON recipes(category);
CREATE INDEX IF NOT EXISTS idx_recipes_tags ON recipes USING GIN(tags);

-- Reload Schema Cache
NOTIFY pgrst, 'reload schema';
