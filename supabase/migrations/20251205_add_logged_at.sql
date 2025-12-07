-- Add logged_at column to food_entries
alter table food_entries add column if not exists logged_at timestamptz default now();

-- Create index for faster sorting of recents/history
create index if not exists food_entries_logged_at_idx on food_entries(logged_at desc);

-- Force schema cache reload (Supabase sometimes caches schema)
notify pgrst, 'reload schema';
