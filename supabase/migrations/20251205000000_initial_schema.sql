-- Create tables
create table if not exists user_profiles (
  id uuid references auth.users on delete cascade primary key,
  height_cm numeric,
  weight_kg numeric,
  goal_weight_kg numeric,
  age integer,
  sex text check (sex in ('male', 'female')),
  activity_level text check (activity_level in ('sedentary', 'light', 'moderate', 'active', 'very_active')),
  goal_type text check (goal_type in ('lose', 'maintain', 'gain')),
  
  -- Custom Targets
  use_custom_targets boolean default false,
  custom_calories integer,
  custom_protein integer,
  custom_carbs integer,
  custom_fat integer,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists user_targets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references user_profiles(id) on delete cascade not null,
  calories_per_day integer not null,
  protein_g integer not null,
  carbs_g integer not null,
  fat_g integer not null,
  bmr numeric,
  tdee numeric,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists day_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references user_profiles(id) on delete cascade not null,
  date date not null,
  total_calories integer default 0,
  total_protein numeric default 0,
  total_carbs numeric default 0,
  total_fat numeric default 0,
  created_at timestamptz default now(),
  unique(user_id, date)
);

create table if not exists meals (
  id uuid default gen_random_uuid() primary key,
  day_log_id uuid references day_logs(id) on delete cascade not null,
  meal_type text check (meal_type in ('breakfast', 'lunch', 'dinner', 'snacks')) not null,
  created_at timestamptz default now()
);

-- Global food database (shared)
create table if not exists food_items (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  brand text,
  barcode text,
  calories_per_100g numeric not null,
  protein_per_100g numeric not null,
  carbs_per_100g numeric not null,
  fat_per_100g numeric not null,
  serving_size_g numeric default 100,
  created_at timestamptz default now()
);

-- User custom foods
create table if not exists user_custom_foods (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references user_profiles(id) on delete cascade not null,
  name text not null,
  brand text,
  calories_per_100g numeric not null,
  protein_per_100g numeric not null,
  carbs_per_100g numeric not null,
  fat_per_100g numeric not null,
  serving_size_g numeric default 100,
  created_at timestamptz default now()
);

create table if not exists food_entries (
  id uuid default gen_random_uuid() primary key,
  meal_id uuid references meals(id) on delete cascade not null,
  
  -- Can reference either global food or custom food
  food_id uuid, 
  custom_food_id uuid references user_custom_foods(id),
  
  quantity_g numeric not null,
  calories numeric not null,
  protein numeric not null,
  carbs numeric not null,
  fat numeric not null,
  
  created_at timestamptz default now()
);

create table if not exists favorites (
  user_id uuid references user_profiles(id) on delete cascade not null,
  food_id uuid references food_items(id) on delete cascade not null,
  created_at timestamptz default now(),
  primary key (user_id, food_id)
);


-- Row Level Security (RLS)
alter table user_profiles enable row level security;
alter table user_targets enable row level security;
alter table day_logs enable row level security;
alter table meals enable row level security;
alter table food_items enable row level security;
alter table user_custom_foods enable row level security;
alter table food_entries enable row level security;
alter table favorites enable row level security;

-- Policies

-- user_profiles: Users can only see and edit their own profile
create policy "Users can view own profile" on user_profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on user_profiles
  for update using (auth.uid() = id);

create policy "Users can insert own profile" on user_profiles
  for insert with check (auth.uid() = id);

-- user_targets: Users can only see/edit their own targets
create policy "Users can view own targets" on user_targets
  for select using (auth.uid() = user_id);

create policy "Users can update own targets" on user_targets
  for all using (auth.uid() = user_id);

-- day_logs
create policy "Users can view own logs" on day_logs
  for select using (auth.uid() = user_id);

create policy "Users can manage own logs" on day_logs
  for all using (auth.uid() = user_id);

-- meals: Implicit ownership via day_logs -> user_id
create policy "Users can view own meals" on meals
  for select using (
    exists (
      select 1 from day_logs
      where day_logs.id = meals.day_log_id
      and day_logs.user_id = auth.uid()
    )
  );

create policy "Users can manage own meals" on meals
  for all using (
    exists (
      select 1 from day_logs
      where day_logs.id = meals.day_log_id
      and day_logs.user_id = auth.uid()
    )
  );

-- food_items: Publicly readable, admin writable (or open for now)
create policy "Public food items are readable" on food_items
  for select using (true);
  
-- user_custom_foods
create policy "Users can manage own custom foods" on user_custom_foods
  for all using (auth.uid() = user_id);

-- food_entries: Implicit ownership via meals -> day_logs -> user_id
create policy "Users can view own entries" on food_entries
  for select using (
    exists (
      select 1 from meals
      join day_logs on meals.day_log_id = day_logs.id
      where meals.id = food_entries.meal_id
      and day_logs.user_id = auth.uid()
    )
  );

create policy "Users can manage own entries" on food_entries
  for all using (
    exists (
      select 1 from meals
      join day_logs on meals.day_log_id = day_logs.id
      where meals.id = food_entries.meal_id
      and day_logs.user_id = auth.uid()
    )
  );

-- favorites
create policy "Users can manage own favorites" on favorites
  for all using (auth.uid() = user_id);

-- Functions
-- Function to automatically handle updated_at
create or replace function handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Triggers
create trigger on_profile_updated
  before update on user_profiles
  for each row execute procedure handle_updated_at();

create trigger on_targets_updated
  before update on user_targets
  for each row execute procedure handle_updated_at();
