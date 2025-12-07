-- Drop the conflicting legacy constraint
ALTER TABLE favorites DROP CONSTRAINT IF EXISTS favorites_check_food_ref;

-- Drop the newer constraint just in case to ensure clean slate
ALTER TABLE favorites DROP CONSTRAINT IF EXISTS favorites_check;

-- Add the correct constraint that allows recipe_id
ALTER TABLE favorites 
ADD CONSTRAINT favorites_check 
CHECK (
    (food_id IS NOT NULL AND custom_food_id IS NULL AND recipe_id IS NULL) OR 
    (food_id IS NULL AND custom_food_id IS NOT NULL AND recipe_id IS NULL) OR
    (food_id IS NULL AND custom_food_id IS NULL AND recipe_id IS NOT NULL)
);

-- Reload Schema Cache
NOTIFY pgrst, 'reload schema';
