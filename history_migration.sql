-- Drop table if exists to ensure clean slate (since it was empty)
DROP TABLE IF EXISTS user_food_history;

-- Create user_food_history table
CREATE TABLE user_food_history (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
    food_id uuid REFERENCES food_items(id) ON DELETE CASCADE,
    custom_food_id uuid REFERENCES user_custom_foods(id) ON DELETE CASCADE,
    last_used_at timestamptz DEFAULT now() NOT NULL,
    -- Constraint: Either food_id or custom_food_id must be set
    CHECK (
        (food_id IS NOT NULL AND custom_food_id IS NULL) OR 
        (food_id IS NULL AND custom_food_id IS NOT NULL)
    ),
    -- Unique constraints for upsert
    UNIQUE (user_id, food_id),
    UNIQUE (user_id, custom_food_id)
);

-- RLS
ALTER TABLE user_food_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own food history"
ON user_food_history FOR ALL
USING (auth.uid() = user_id);

-- Migration: Populate from existing food_entries via Joins
-- Global Foods
INSERT INTO user_food_history (user_id, food_id, last_used_at)
SELECT 
    dl.user_id, 
    fe.food_id, 
    MAX(fe.created_at) as last_used_at
FROM food_entries fe
JOIN meals m ON fe.meal_id = m.id
JOIN day_logs dl ON m.day_log_id = dl.id
WHERE dl.user_id IS NOT NULL AND fe.food_id IS NOT NULL
GROUP BY dl.user_id, fe.food_id
ON CONFLICT (user_id, food_id) DO UPDATE SET last_used_at = EXCLUDED.last_used_at;

-- Custom Foods
INSERT INTO user_food_history (user_id, custom_food_id, last_used_at)
SELECT 
    dl.user_id, 
    fe.custom_food_id, 
    MAX(fe.created_at) as last_used_at
FROM food_entries fe
JOIN meals m ON fe.meal_id = m.id
JOIN day_logs dl ON m.day_log_id = dl.id
WHERE dl.user_id IS NOT NULL AND fe.custom_food_id IS NOT NULL
GROUP BY dl.user_id, fe.custom_food_id
ON CONFLICT (user_id, custom_food_id) DO UPDATE SET last_used_at = EXCLUDED.last_used_at;
