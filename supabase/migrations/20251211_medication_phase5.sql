-- Phase 5: Advanced Scheduling & Favorites

-- 1. Add is_favorite to medication_profiles
ALTER TABLE medication_profiles
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false;

-- 2. Update Custom Schedules (for Description)
ALTER TABLE medication_custom_schedules
ADD COLUMN IF NOT EXISTS description TEXT;

-- 3. Create Schedule Entries table (Granular Weekly Schedule)
-- This replaces the simple time/days array for complex use cases.
-- We will keep the old columns on custom_schedules for now or simple use cases, 
-- but this table allows multiple events per schedule.
CREATE TABLE IF NOT EXISTS medication_schedule_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID REFERENCES medication_custom_schedules(id) ON DELETE CASCADE,
    medication_id UUID REFERENCES medication_profiles(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sun
    time TIME NOT NULL,
    dose_override TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Index for faster lookup by schedule
    CONSTRAINT fk_schedule FOREIGN KEY (schedule_id) REFERENCES medication_custom_schedules(id) ON DELETE CASCADE
);

CREATE INDEX idx_schedule_entries_schedule_id ON medication_schedule_entries(schedule_id);

-- 4. RLS for Entries
ALTER TABLE medication_schedule_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage entries via schedule ownership"
ON medication_schedule_entries FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM medication_custom_schedules s
        WHERE s.id = medication_schedule_entries.schedule_id
        AND s.user_id = auth.uid()
    )
);
