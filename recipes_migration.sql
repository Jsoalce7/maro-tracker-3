-- Create recipes table
CREATE TABLE IF NOT EXISTS recipes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    description text,
    total_calories numeric NOT NULL DEFAULT 0,
    total_protein numeric NOT NULL DEFAULT 0,
    total_carbs numeric NOT NULL DEFAULT 0,
    total_fat numeric NOT NULL DEFAULT 0,
    servings_per_recipe numeric NOT NULL DEFAULT 1,
    serving_unit text DEFAULT 'serving',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS for recipes
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own recipes"
ON recipes FOR ALL
USING (auth.uid() = user_id);


-- Create recipe_ingredients table
CREATE TABLE IF NOT EXISTS recipe_ingredients (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    recipe_id uuid REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
    food_id uuid REFERENCES food_items(id) ON DELETE CASCADE,
    custom_food_id uuid REFERENCES user_custom_foods(id) ON DELETE CASCADE,
    quantity numeric NOT NULL,
    unit text NOT NULL DEFAULT 'g',
    display_order serial, -- Simple auto-increment for order
    
    -- Constraints
    CHECK (
        (food_id IS NOT NULL AND custom_food_id IS NULL) OR 
        (food_id IS NULL AND custom_food_id IS NOT NULL)
    ),
    CHECK (quantity > 0)
);

-- Enable RLS for recipe_ingredients
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;

-- Policy: Users can manage ingredients if they own the recipe.
-- This requires a join check.
CREATE POLICY "Users can manage own recipe ingredients"
ON recipe_ingredients FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM recipes
        WHERE recipes.id = recipe_ingredients.recipe_id
        AND recipes.user_id = auth.uid()
    )
);


-- Modify food_entries table
ALTER TABLE food_entries
ADD COLUMN IF NOT EXISTS recipe_id uuid REFERENCES recipes(id) ON DELETE CASCADE;

-- Add constraint to ensure mutual exclusivity: food, custom_food, OR recipe
-- Note: existing data has food_id or custom_food_id. New data might have recipe_id.
-- We verify that if recipe_id is set, the others are null.
-- But standard food entries still set food_id.
-- The rule is: (food_id IS NOT NULL AND custom_food_id IS NULL AND recipe_id IS NULL) OR ... etc
-- This might be hard to enforce with ALREADY existing optional columns without a complex check.
-- Let's add a check for the new condition at least.

ALTER TABLE food_entries
ADD CONSTRAINT food_entries_recipe_check 
CHECK (
    (recipe_id IS NOT NULL AND food_id IS NULL AND custom_food_id IS NULL) OR
    (recipe_id IS NULL) -- If recipe is null, fall back to existing checks (or lack thereof)
);
