-- Phase 1: Workout System Overhaul - Schema Updates
-- Adds support for per-set configuration, progression types, and session state tracking

-- 1. Update workout_template_exercises for flexible set configuration
ALTER TABLE workout_template_exercises
ADD COLUMN IF NOT EXISTS per_set_config JSONB,
ADD COLUMN IF NOT EXISTS progression_type TEXT DEFAULT 'none' 
    CHECK (progression_type IN ('none', 'increase', 'decrease', 'pyramid')),
ADD COLUMN IF NOT EXISTS rest_seconds INTEGER DEFAULT 60;

COMMENT ON COLUMN workout_template_exercises.per_set_config IS 
'Array of set configurations: [{ set: 1, reps: 10, weight: 135, duration_seconds: null }, ...]';

COMMENT ON COLUMN workout_template_exercises.progression_type IS 
'How sets progress: none (fixed), increase (add weight), decrease (drop sets), pyramid (up then down)';

-- 2. Update workout_sessions for session state tracking
ALTER TABLE workout_sessions
ADD COLUMN IF NOT EXISTS session_snapshot JSONB,
ADD COLUMN IF NOT EXISTS current_exercise_index INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_set_index INTEGER DEFAULT 0;

COMMENT ON COLUMN workout_sessions.session_snapshot IS 
'Snapshot of template data at session start - prevents bugs if template edited mid-session';

-- 3. Backfill per_set_config for existing exercises (optional - for backward compat)
UPDATE workout_template_exercises
SET per_set_config = jsonb_build_array(
    jsonb_build_object(
        'set', 1,
        'reps', COALESCE(default_target_reps, default_reps, 0),
        'weight', COALESCE(default_target_weight, 0),
        'duration_seconds', default_duration_seconds
    )
)
WHERE per_set_config IS NULL AND default_sets = 1;

-- For multi-set exercises, create array with repeated config
UPDATE workout_template_exercises
SET per_set_config = (
    SELECT jsonb_agg(
        jsonb_build_object(
            'set', generate_series,
            'reps', COALESCE(default_target_reps, default_reps, 0),
            'weight', COALESCE(default_target_weight, 0),
            'duration_seconds', default_duration_seconds
        )
    )
    FROM generate_series(1, GREATEST(default_sets, 1))
)
WHERE per_set_config IS NULL AND default_sets > 1;
