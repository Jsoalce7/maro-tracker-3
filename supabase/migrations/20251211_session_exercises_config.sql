-- Add per_set_config and default_sets to workout_session_exercises
-- This allows sessions to store per-set configuration independently

ALTER TABLE workout_session_exercises
ADD COLUMN IF NOT EXISTS per_set_config JSONB,
ADD COLUMN IF NOT EXISTS default_sets INTEGER DEFAULT 3;

COMMENT ON COLUMN workout_session_exercises.per_set_config IS 
'Per-set configuration copied from template at session start';
