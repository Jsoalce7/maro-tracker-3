-- Workout Schedule Table
CREATE TABLE IF NOT EXISTS workout_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    template_id UUID REFERENCES workout_templates(id) ON DELETE CASCADE,
    scheduled_date DATE NOT NULL,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE workout_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own schedule" ON workout_schedule
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_workout_schedule_date ON workout_schedule(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_workout_schedule_user ON workout_schedule(user_id);
