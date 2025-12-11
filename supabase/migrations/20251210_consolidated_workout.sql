-- CONSOLIDATED WORKOUT MIGRATIONS
-- Run this entire file in Supabase SQL Editor to create all workout tables

-- ============================================
-- 1. CORE WORKOUT TABLES
-- ============================================

-- Workout Templates
CREATE TABLE IF NOT EXISTS workout_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workout Template Exercises
CREATE TABLE IF NOT EXISTS workout_template_exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES workout_templates(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    muscle_group TEXT,
    order_index INTEGER NOT NULL,
    default_sets INTEGER,
    default_reps INTEGER,
    default_rest_seconds INTEGER,
    -- NEW: Exercise type fields
    exercise_type TEXT DEFAULT 'weight_reps' CHECK (exercise_type IN ('time', 'weight_reps', 'reps_only', 'time_and_weight')),
    default_target_reps INTEGER,
    default_target_weight NUMERIC,
    default_duration_seconds INTEGER,
    has_timer BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workout Sessions
CREATE TABLE IF NOT EXISTS workout_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    template_id UUID REFERENCES workout_templates(id) ON DELETE SET NULL,
    name TEXT,
    date DATE NOT NULL,
    status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    total_sets INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workout Session Exercises
CREATE TABLE IF NOT EXISTS workout_session_exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES workout_sessions(id) ON DELETE CASCADE,
    template_exercise_id UUID REFERENCES workout_template_exercises(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    muscle_group TEXT,
    order_index INTEGER NOT NULL,
    -- NEW: Exercise type fields (copied from template)
    exercise_type TEXT DEFAULT 'weight_reps',
    default_duration_seconds INTEGER,
    default_target_reps INTEGER,
    default_target_weight NUMERIC,
    has_timer BOOLEAN DEFAULT FALSE,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workout Sets
CREATE TABLE IF NOT EXISTS workout_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_exercise_id UUID REFERENCES workout_session_exercises(id) ON DELETE CASCADE,
    set_number INTEGER NOT NULL,
    weight NUMERIC,
    reps INTEGER,
    duration_seconds INTEGER,
    completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workout Schedule
CREATE TABLE IF NOT EXISTS workout_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    template_id UUID REFERENCES workout_templates(id) ON DELETE CASCADE,
    scheduled_date DATE NOT NULL,
    status TEXT DEFAULT 'scheduled',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_workout_templates_user ON workout_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_template_exercises_template ON workout_template_exercises(template_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_user ON workout_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_date ON workout_sessions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_workout_session_exercises_session ON workout_session_exercises(session_id);
CREATE INDEX IF NOT EXISTS idx_workout_sets_exercise ON workout_sets(session_exercise_id);
CREATE INDEX IF NOT EXISTS idx_workout_schedule_user_date ON workout_schedule(user_id, scheduled_date);

-- ============================================
-- 3. ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE workout_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_template_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_session_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_schedule ENABLE ROW LEVEL SECURITY;

-- Workout Templates Policies
CREATE POLICY IF NOT EXISTS "Users can view own templates" ON workout_templates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can insert own templates" ON workout_templates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can update own templates" ON workout_templates FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can delete own templates" ON workout_templates FOR DELETE USING (auth.uid() = user_id);

-- Template Exercises Policies (inherit from template)
CREATE POLICY IF NOT EXISTS "Users can view template exercises" ON workout_template_exercises FOR SELECT 
    USING (EXISTS (SELECT 1 FROM workout_templates WHERE id = template_id AND user_id = auth.uid()));
CREATE POLICY IF NOT EXISTS "Users can insert template exercises" ON workout_template_exercises FOR INSERT 
    WITH CHECK (EXISTS (SELECT 1 FROM workout_templates WHERE id = template_id AND user_id = auth.uid()));
CREATE POLICY IF NOT EXISTS "Users can update template exercises" ON workout_template_exercises FOR UPDATE 
    USING (EXISTS (SELECT 1 FROM workout_templates WHERE id = template_id AND user_id = auth.uid()));
CREATE POLICY IF NOT EXISTS "Users can delete template exercises" ON workout_template_exercises FOR DELETE 
    USING (EXISTS (SELECT 1 FROM workout_templates WHERE id = template_id AND user_id = auth.uid()));

-- Workout Sessions Policies
CREATE POLICY IF NOT EXISTS "Users can view own sessions" ON workout_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can insert own sessions" ON workout_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can update own sessions" ON workout_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can delete own sessions" ON workout_sessions FOR DELETE USING (auth.uid() = user_id);

-- Session Exercises Policies
CREATE POLICY IF NOT EXISTS "Users can view session exercises" ON workout_session_exercises FOR SELECT 
    USING (EXISTS (SELECT 1 FROM workout_sessions WHERE id = session_id AND user_id = auth.uid()));
CREATE POLICY IF NOT EXISTS "Users can insert session exercises" ON workout_session_exercises FOR INSERT 
    WITH CHECK (EXISTS (SELECT 1 FROM workout_sessions WHERE id = session_id AND user_id = auth.uid()));
CREATE POLICY IF NOT EXISTS "Users can update session exercises" ON workout_session_exercises FOR UPDATE 
    USING (EXISTS (SELECT 1 FROM workout_sessions WHERE id = session_id AND user_id = auth.uid()));
CREATE POLICY IF NOT EXISTS "Users can delete session exercises" ON workout_session_exercises FOR DELETE 
    USING (EXISTS (SELECT 1 FROM workout_sessions WHERE id = session_id AND user_id = auth.uid()));

-- Workout Sets Policies
CREATE POLICY IF NOT EXISTS "Users can view workout sets" ON workout_sets FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM workout_session_exercises se
        JOIN workout_sessions s ON s.id = se.session_id
        WHERE se.id = session_exercise_id AND s.user_id = auth.uid()
    ));
CREATE POLICY IF NOT EXISTS "Users can insert workout sets" ON workout_sets FOR INSERT 
    WITH CHECK (EXISTS (
        SELECT 1 FROM workout_session_exercises se
        JOIN workout_sessions s ON s.id = se.session_id
        WHERE se.id = session_exercise_id AND s.user_id = auth.uid()
    ));
CREATE POLICY IF NOT EXISTS "Users can update workout sets" ON workout_sets FOR UPDATE 
    USING (EXISTS (
        SELECT 1 FROM workout_session_exercises se
        JOIN workout_sessions s ON s.id = se.session_id
        WHERE se.id = session_exercise_id AND s.user_id = auth.uid()
    ));
CREATE POLICY IF NOT EXISTS "Users can delete workout sets" ON workout_sets FOR DELETE 
    USING (EXISTS (
        SELECT 1 FROM workout_session_exercises se
        JOIN workout_sessions s ON s.id = se.session_id
        WHERE se.id = session_exercise_id AND s.user_id = auth.uid()
    ));

-- Workout Schedule Policies
CREATE POLICY IF NOT EXISTS "Users can view own schedule" ON workout_schedule FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can insert own schedule" ON workout_schedule FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can update own schedule" ON workout_schedule FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can delete own schedule" ON workout_schedule FOR DELETE USING (auth.uid() = user_id);
