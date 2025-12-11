-- Add rest between exercises configuration
-- Allows templates to define rest period after completing all sets of an exercise

ALTER TABLE workout_template_exercises
ADD COLUMN IF NOT EXISTS rest_between_exercises_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS rest_between_exercises_seconds INTEGER DEFAULT 90;

-- Also add to session exercises so they inherit this config
ALTER TABLE workout_session_exercises
ADD COLUMN IF NOT EXISTS rest_between_exercises_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS rest_between_exercises_seconds INTEGER DEFAULT 90;

COMMENT ON COLUMN workout_template_exercises.rest_between_exercises_enabled IS 
'If true, show rest timer after last set before moving to next exercise';

COMMENT ON COLUMN workout_template_exercises.rest_between_exercises_seconds IS 
'Duration of rest between exercises in seconds (default 90s)';
