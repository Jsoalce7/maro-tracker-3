-- Add exercise type configuration to workout_template_exercises
-- This allows templates to support time-based, weight+reps, and reps-only exercises

-- Add new columns
ALTER TABLE workout_template_exercises
ADD COLUMN IF NOT EXISTS exercise_type TEXT DEFAULT 'weight_reps' 
    CHECK (exercise_type IN ('time', 'weight_reps', 'reps_only', 'time_and_weight')),
ADD COLUMN IF NOT EXISTS default_target_reps INTEGER,
ADD COLUMN IF NOT EXISTS default_target_weight NUMERIC,
ADD COLUMN IF NOT EXISTS default_duration_seconds INTEGER,
ADD COLUMN IF NOT EXISTS has_timer BOOLEAN DEFAULT FALSE;

-- Backfill existing exercises with defaults (backward compatibility)
UPDATE workout_template_exercises
SET 
    exercise_type = 'weight_reps',
    default_target_reps = COALESCE(default_reps, 10),
    default_target_weight = 0,
    has_timer = FALSE
WHERE exercise_type IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN workout_template_exercises.exercise_type IS 
    'Type of exercise: time (timer-based), weight_reps (traditional strength), reps_only (bodyweight), time_and_weight (mixed)';
COMMENT ON COLUMN workout_template_exercises.default_duration_seconds IS 
    'Target duration for time-based exercises (e.g., 120 seconds for 2-minute sprint)';
COMMENT ON COLUMN workout_template_exercises.has_timer IS 
    'Whether to show timer UI alongside weight/reps for this exercise';
