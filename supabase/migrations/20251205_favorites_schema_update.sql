-- Corrected Migration for Favorites
-- 1. Drop the Primary Key constraint FIRST (because it uses food_id)
-- Note: The PK name is usually "favorites_pkey" but might vary.
alter table favorites drop constraint if exists favorites_pkey;
-- Also drop any other unique constraints that might reference food_id
alter table favorites drop constraint if exists favorites_user_id_food_id_key;

-- 2. Now we can safely make food_id nullable
alter table favorites alter column food_id drop not null;

-- 3. Add custom_food_id column
alter table favorites add column if not exists custom_food_id uuid references user_custom_foods(id) on delete cascade;

-- 4. Add constraint to ensure exactly one of food_id or custom_food_id is set
-- Drop it first if it exists to avoid errors on re-run
alter table favorites drop constraint if exists favorites_check_food_ref;
alter table favorites add constraint favorites_check_food_ref check (
  (food_id is not null and custom_food_id is null) or
  (food_id is null and custom_food_id is not null)
);

-- 5. Create unique indexes to replace the Primary Key functionality
-- (We can't have a single PK because one column is always NULL)
drop index if exists favorites_user_food_idx;
create unique index favorites_user_food_idx on favorites (user_id, food_id) where food_id is not null;

drop index if exists favorites_user_custom_food_idx;
create unique index favorites_user_custom_food_idx on favorites (user_id, custom_food_id) where custom_food_id is not null;

-- 6. Update RLS policies
drop policy if exists "Users can insert own favorites" on favorites;
create policy "Users can insert own favorites" on favorites
  for insert with check (auth.uid() = user_id);
