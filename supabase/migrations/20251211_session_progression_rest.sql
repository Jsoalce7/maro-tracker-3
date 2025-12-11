-- Add progression_type and rest_seconds to workout_session_exercises if missing
-- These fields are required for displaying correct progression in session UI

ALTER TABLE workout_session_exercises
ADD COLUMN IF NOT EXISTS progression_type TEXT DEFAULT 'none' 
    CHECK (progression_type IN ('none', 'increase', 'decrease', 'pyramid')),
ADD COLUMN IF NOT EXISTS rest_seconds INTEGER DEFAULT 60;

COMMENT ON COLUMN workout_session_exercises.progression_type IS 
'Progression type copied from template at session start - determines UI display';

COMMENT ON COLUMN workout_session_exercises.rest_seconds IS 
'Rest between sets in seconds, copied from template at session start';
