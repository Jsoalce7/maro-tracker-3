-- Create user_food_history table (Fixes Recent Tab)
create table if not exists user_food_history (
  user_id uuid references user_profiles(id) on delete cascade not null,
  food_id uuid references food_items(id) on delete cascade,
  custom_food_id uuid references user_custom_foods(id) on delete cascade,
  last_used_at timestamptz default now(),
  primary key (user_id, last_used_at), -- weak pk, unique constraint below is better
  unique(user_id, food_id),
  unique(user_id, custom_food_id)
);

-- Enable RLS
alter table user_food_history enable row level security;

create policy "Users can view own history" on user_food_history
  for select using (auth.uid() = user_id);

create policy "Users can manage own history" on user_food_history
  for all using (auth.uid() = user_id);

-- Add Columns to Food Items (Fixes 400 Error and Filter Logic)
alter table food_items 
add column if not exists category text,
add column if not exists tags text[],
add column if not exists source text,
add column if not exists processing_level text,
add column if not exists caffeine_mg numeric default 0,
add column if not exists serving_unit text default 'g';

-- Ensure User Custom Foods has serving_unit (Fixes Create Food)
alter table user_custom_foods 
add column if not exists serving_unit text default 'g';

-- Ensure Food Entries has metric columns (Fixes Unit Display)
alter table food_entries
add column if not exists metric_quantity numeric,
add column if not exists metric_unit text,
add column if not exists caffeine_mg numeric default 0,
add column if not exists water_ml numeric default 0;
