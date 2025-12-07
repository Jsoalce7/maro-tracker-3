alter table food_items 
add column if not exists ingredient_type text;

alter table user_custom_foods 
add column if not exists ingredient_type text;

-- Optional: You could add a check constraint if desired, but text is flexible
-- alter table food_items add constraint check_ingredient_type check (ingredient_type in ('Protein', 'Dairy', 'Carbs', 'Fats', 'Misc'));
