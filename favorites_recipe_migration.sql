-- Add recipe_id to favorites table
ALTER TABLE favorites 
ADD COLUMN IF NOT EXISTS recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE;

-- Update constraint to allow recipe_id
ALTER TABLE favorites 
DROP CONSTRAINT IF EXISTS favorites_check;

ALTER TABLE favorites 
ADD CONSTRAINT favorites_check 
CHECK (
    (food_id IS NOT NULL AND custom_food_id IS NULL AND recipe_id IS NULL) OR 
    (food_id IS NULL AND custom_food_id IS NOT NULL AND recipe_id IS NULL) OR
    (food_id IS NULL AND custom_food_id IS NULL AND recipe_id IS NOT NULL)
);

-- Separate index for recipe_id lookups
CREATE INDEX IF NOT EXISTS favorites_recipe_id_idx ON favorites(recipe_id);
