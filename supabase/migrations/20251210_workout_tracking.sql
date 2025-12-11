-- 1. Workout Templates
CREATE TABLE workout_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Workout Template Exercises
CREATE TABLE workout_template_exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES workout_templates(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    muscle_group TEXT,
    order_index INTEGER NOT NULL,
    default_sets INTEGER,
    default_reps INTEGER,
    default_rest_seconds INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Workout Sessions
CREATE TABLE workout_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    template_id UUID REFERENCES workout_templates(id) ON DELETE SET NULL,
    name TEXT,
    date DATE NOT NULL,
    status TEXT CHECK (status IN ('in_progress', 'completed', 'abandoned')),
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    total_sets INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Workout Session Exercises
CREATE TABLE workout_session_exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES workout_sessions(id) ON DELETE CASCADE,
    template_exercise_id UUID REFERENCES workout_template_exercises(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    muscle_group TEXT,
    order_index INTEGER NOT NULL,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Workout Sets
CREATE TABLE workout_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_exercise_id UUID REFERENCES workout_session_exercises(id) ON DELETE CASCADE,
    set_number INTEGER NOT NULL,
    weight NUMERIC,
    reps INTEGER,
    duration_seconds INTEGER,
    completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_workout_templates_user_id ON workout_templates(user_id);
CREATE INDEX idx_workout_sessions_user_id_date ON workout_sessions(user_id, date);
CREATE INDEX idx_workout_session_exercises_session_id ON workout_session_exercises(session_id);
CREATE INDEX idx_workout_sets_session_exercise_id ON workout_sets(session_exercise_id);

-- RLS Policies
ALTER TABLE workout_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_template_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_session_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sets ENABLE ROW LEVEL SECURITY;

-- Policies for Templates
CREATE POLICY "Users can manage own templates" ON workout_templates
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own template exercises" ON workout_template_exercises
    USING (EXISTS (
        SELECT 1 FROM workout_templates
        WHERE workout_templates.id = workout_template_exercises.template_id
        AND workout_templates.user_id = auth.uid()
    ));

-- Policies for Sessions
CREATE POLICY "Users can manage own sessions" ON workout_sessions
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own session exercises" ON workout_session_exercises
    USING (EXISTS (
        SELECT 1 FROM workout_sessions
        WHERE workout_sessions.id = workout_session_exercises.session_id
        AND workout_sessions.user_id = auth.uid()
    ));

CREATE POLICY "Users can manage own sets" ON workout_sets
    USING (EXISTS (
        SELECT 1 FROM workout_session_exercises
        JOIN workout_sessions ON workout_sessions.id = workout_session_exercises.session_id
        WHERE workout_session_exercises.id = workout_sets.session_exercise_id
        AND workout_sessions.user_id = auth.uid()
    ));
