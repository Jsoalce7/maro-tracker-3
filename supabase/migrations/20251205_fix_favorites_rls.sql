-- Fix Favorites RLS Policy
-- Drop the generic "manage" policy if it exists to avoid conflicts or confusion
drop policy if exists "Users can manage own favorites" on favorites;

-- Explicitly allow INSERT
create policy "Users can insert own favorites" on favorites
  for insert with check (auth.uid() = user_id);

-- Explicitly allow SELECT
create policy "Users can view own favorites" on favorites
  for select using (auth.uid() = user_id);

-- Explicitly allow DELETE
create policy "Users can delete own favorites" on favorites
  for delete using (auth.uid() = user_id);

-- Explicitly allow UPDATE (though not strictly needed for favorites usually)
create policy "Users can update own favorites" on favorites
  for update using (auth.uid() = user_id);

-- Verify Recents (Food Entries) are accessible
-- Ensure that food_entries allow select based on user_id context
-- The existing complex join policies can be fragile if permissions on joined tables are missing.
-- If recents are still not showing, consider simplifying the policy for debugging:
-- create policy "Debug entries" on food_entries for select using (true);
