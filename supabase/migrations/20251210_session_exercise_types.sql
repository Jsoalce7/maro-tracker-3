-- Add exercise type configuration to workout_session_exercises
-- This allows sessions to remember the exercise type from the template

ALTER TABLE workout_session_exercises
ADD COLUMN IF NOT EXISTS exercise_type TEXT DEFAULT 'weight_reps' 
    CHECK (exercise_type IN ('time', 'weight_reps', 'reps_only', 'time_and_weight')),
ADD COLUMN IF NOT EXISTS default_duration_seconds INTEGER,
ADD COLUMN IF NOT EXISTS default_target_reps INTEGER,
ADD COLUMN IF NOT EXISTS default_target_weight NUMERIC,
ADD COLUMN IF NOT EXISTS has_timer BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN workout_session_exercises.exercise_type IS 
    'Type of exercise copied from template: time, weight_reps, reps_only, time_and_weight';
