-- Drop existing policies if any, then create new ones
-- RLS Policies for Workout Tables (without IF NOT EXISTS)

-- Workout Templates
DROP POLICY IF EXISTS "Users can view own templates" ON workout_templates;
DROP POLICY IF EXISTS "Users can insert own templates" ON workout_templates;
DROP POLICY IF EXISTS "Users can update own templates" ON workout_templates;
DROP POLICY IF EXISTS "Users can delete own templates" ON workout_templates;

CREATE POLICY "Users can view own templates" ON workout_templates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own templates" ON workout_templates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own templates" ON workout_templates FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own templates" ON workout_templates FOR DELETE USING (auth.uid() = user_id);

-- Template Exercises
DROP POLICY IF EXISTS "Users can view template exercises" ON workout_template_exercises;
DROP POLICY IF EXISTS "Users can insert template exercises" ON workout_template_exercises;
DROP POLICY IF EXISTS "Users can update template exercises" ON workout_template_exercises;
DROP POLICY IF EXISTS "Users can delete template exercises" ON workout_template_exercises;

CREATE POLICY "Users can view template exercises" ON workout_template_exercises FOR SELECT 
    USING (EXISTS (SELECT 1 FROM workout_templates WHERE id = template_id AND user_id = auth.uid()));
CREATE POLICY "Users can insert template exercises" ON workout_template_exercises FOR INSERT 
    WITH CHECK (EXISTS (SELECT 1 FROM workout_templates WHERE id = template_id AND user_id = auth.uid()));
CREATE POLICY "Users can update template exercises" ON workout_template_exercises FOR UPDATE 
    USING (EXISTS (SELECT 1 FROM workout_templates WHERE id = template_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete template exercises" ON workout_template_exercises FOR DELETE 
    USING (EXISTS (SELECT 1 FROM workout_templates WHERE id = template_id AND user_id = auth.uid()));

-- Workout Sessions
DROP POLICY IF EXISTS "Users can view own sessions" ON workout_sessions;
DROP POLICY IF EXISTS "Users can insert own sessions" ON workout_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON workout_sessions;
DROP POLICY IF EXISTS "Users can delete own sessions" ON workout_sessions;

CREATE POLICY "Users can view own sessions" ON workout_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sessions" ON workout_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sessions" ON workout_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sessions" ON workout_sessions FOR DELETE USING (auth.uid() = user_id);

-- Session Exercises
DROP POLICY IF EXISTS "Users can view session exercises" ON workout_session_exercises;
DROP POLICY IF EXISTS "Users can insert session exercises" ON workout_session_exercises;
DROP POLICY IF EXISTS "Users can update session exercises" ON workout_session_exercises;
DROP POLICY IF EXISTS "Users can delete session exercises" ON workout_session_exercises;

CREATE POLICY "Users can view session exercises" ON workout_session_exercises FOR SELECT 
    USING (EXISTS (SELECT 1 FROM workout_sessions WHERE id = session_id AND user_id = auth.uid()));
CREATE POLICY "Users can insert session exercises" ON workout_session_exercises FOR INSERT 
    WITH CHECK (EXISTS (SELECT 1 FROM workout_sessions WHERE id = session_id AND user_id = auth.uid()));
CREATE POLICY "Users can update session exercises" ON workout_session_exercises FOR UPDATE 
    USING (EXISTS (SELECT 1 FROM workout_sessions WHERE id = session_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete session exercises" ON workout_session_exercises FOR DELETE 
    USING (EXISTS (SELECT 1 FROM workout_sessions WHERE id = session_id AND user_id = auth.uid()));

-- Workout Sets
DROP POLICY IF EXISTS "Users can view workout sets" ON workout_sets;
DROP POLICY IF EXISTS "Users can insert workout sets" ON workout_sets;
DROP POLICY IF EXISTS "Users can update workout sets" ON workout_sets;
DROP POLICY IF EXISTS "Users can delete workout sets" ON workout_sets;

CREATE POLICY "Users can view workout sets" ON workout_sets FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM workout_session_exercises se
        JOIN workout_sessions s ON s.id = se.session_id
        WHERE se.id = session_exercise_id AND s.user_id = auth.uid()
    ));
CREATE POLICY "Users can insert workout sets" ON workout_sets FOR INSERT 
    WITH CHECK (EXISTS (
        SELECT 1 FROM workout_session_exercises se
        JOIN workout_sessions s ON s.id = se.session_id
        WHERE se.id = session_exercise_id AND s.user_id = auth.uid()
    ));
CREATE POLICY "Users can update workout sets" ON workout_sets FOR UPDATE 
    USING (EXISTS (
        SELECT 1 FROM workout_session_exercises se
        JOIN workout_sessions s ON s.id = se.session_id
        WHERE se.id = session_exercise_id AND s.user_id = auth.uid()
    ));
CREATE POLICY "Users can delete workout sets" ON workout_sets FOR DELETE 
    USING (EXISTS (
        SELECT 1 FROM workout_session_exercises se
        JOIN workout_sessions s ON s.id = se.session_id
        WHERE se.id = session_exercise_id AND s.user_id = auth.uid()
    ));

-- Workout Schedule
DROP POLICY IF EXISTS "Users can view own schedule" ON workout_schedule;
DROP POLICY IF EXISTS "Users can insert own schedule" ON workout_schedule;
DROP POLICY IF EXISTS "Users can update own schedule" ON workout_schedule;
DROP POLICY IF EXISTS "Users can delete own schedule" ON workout_schedule;

CREATE POLICY "Users can view own schedule" ON workout_schedule FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own schedule" ON workout_schedule FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own schedule" ON workout_schedule FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own schedule" ON workout_schedule FOR DELETE USING (auth.uid() = user_id);
