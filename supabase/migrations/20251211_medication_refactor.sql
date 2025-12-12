-- Refactor: Take Daily & Custom Schedules

-- 1. Add take_daily to profiles
ALTER TABLE medication_profiles
ADD COLUMN IF NOT EXISTS take_daily BOOLEAN DEFAULT false;

-- 2. Create Custom Schedules table
CREATE TABLE IF NOT EXISTS medication_custom_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    time TIME NOT NULL, -- e.g. '08:00:00'
    days_of_week INTEGER[], -- Array of 0-6 [0=Sun, 6=Sat], null means daily
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Assignments table (Junction)
CREATE TABLE IF NOT EXISTS medication_schedule_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID REFERENCES medication_custom_schedules(id) ON DELETE CASCADE,
    medication_id UUID REFERENCES medication_profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(schedule_id, medication_id)
);

-- 4. RLS Policies
ALTER TABLE medication_custom_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_schedule_assignments ENABLE ROW LEVEL SECURITY;

-- Custom Schedules Policies
CREATE POLICY "Users can select own schedules"
ON medication_custom_schedules FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own schedules"
ON medication_custom_schedules FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own schedules"
ON medication_custom_schedules FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own schedules"
ON medication_custom_schedules FOR DELETE
USING (auth.uid() = user_id);

-- Assignments Policies
-- Start Simple: Allow if user owns the schedule
CREATE POLICY "Users can manage assignments via schedule"
ON medication_schedule_assignments FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM medication_custom_schedules s
        WHERE s.id = medication_schedule_assignments.schedule_id
        AND s.user_id = auth.uid()
    )
);
