-- Add Water Logging Table
create table if not exists water_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references user_profiles(id) on delete cascade not null,
  date date not null,
  amount_ml integer not null,
  created_at timestamptz default now()
);

-- RLS for water_logs
alter table water_logs enable row level security;

create policy "Users can view own water logs" on water_logs
  for select using (auth.uid() = user_id);

create policy "Users can manage own water logs" on water_logs
  for all using (auth.uid() = user_id);

-- Add Columns to Food Items (Global)
alter table food_items 
add column if not exists caffeine_mg numeric default 0,
add column if not exists serving_unit text default 'g'; -- 'g', 'ml', 'oz', 'serving'

-- Add Columns to User Custom Foods
alter table user_custom_foods 
add column if not exists caffeine_mg numeric default 0,
add column if not exists serving_unit text default 'g';

-- Add Columns to Food Entries (The actual log)
alter table food_entries
add column if not exists caffeine_mg numeric default 0,
add column if not exists water_ml numeric default 0,
add column if not exists metric_quantity numeric, -- The user-facing quantity (e.g. 1.5)
add column if not exists metric_unit text;         -- The user-facing unit (e.g. 'bottle', 'oz')

-- Add Columns to Day Logs (Daily totals cache)
alter table day_logs
add column if not exists total_caffeine_mg numeric default 0,
add column if not exists total_water_ml numeric default 0;
