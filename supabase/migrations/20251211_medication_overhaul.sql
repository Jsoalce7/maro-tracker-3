-- Drop previous tables if they exist (Overhaul)
DROP TABLE IF EXISTS medication_logs CASCADE;
DROP TABLE IF EXISTS medication_schedules CASCADE;
DROP TABLE IF EXISTS medications CASCADE; -- Old table
DROP TABLE IF EXISTS medication_profiles CASCADE; -- New table name precaution

-- 1. Medication Profiles
CREATE TABLE medication_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  brand TEXT,
  category_tags TEXT[], -- Array of strings e.g. ['prescription', 'painkiller']
  strength_value NUMERIC, -- e.g. 500
  strength_unit TEXT, -- e.g. 'mg', 'ml'
  form TEXT, -- e.g. 'tablet', 'capsule'
  dose_quantity TEXT, -- e.g. '1 tablet' (human readable default dose)
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Medication Schedules
CREATE TABLE medication_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  medication_id UUID REFERENCES medication_profiles(id) ON DELETE CASCADE NOT NULL,
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('daily', 'specific_days', 'prn')),
  time_of_day TIME, -- NULL if PRN
  days_of_week INTEGER[], -- Array of 1-7, NULL if daily/prn
  anchor TEXT, -- e.g. 'breakfast', 'bedtime'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Medication Logs
CREATE TABLE medication_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  medication_id UUID REFERENCES medication_profiles(id) ON DELETE CASCADE NOT NULL,
  schedule_id UUID REFERENCES medication_schedules(id) ON DELETE SET NULL, -- Can be null for PRN ad-hoc logs
  date DATE NOT NULL, -- Logical date of the log
  status TEXT NOT NULL CHECK (status IN ('taken', 'missed', 'skipped')),
  planned_time TIMESTAMPTZ, -- The theoretical time it was due (for sorting)
  taken_at TIMESTAMPTZ, -- Actual timestamp when taken
  quantity_taken TEXT, -- e.g. '1 tablet'
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS medication_logs_unique_daily_idx 
ON medication_logs (user_id, schedule_id, date) 
WHERE schedule_id IS NOT NULL; -- Ensure only one log per schedule per day (unless PRN/ad-hoc)

-- RLS Policies
ALTER TABLE medication_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_logs ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Users can view their own profiles" ON medication_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profiles" ON medication_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profiles" ON medication_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own profiles" ON medication_profiles FOR DELETE USING (auth.uid() = user_id);

-- Schedules
CREATE POLICY "Users can view their own schedules" ON medication_schedules FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own schedules" ON medication_schedules FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own schedules" ON medication_schedules FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own schedules" ON medication_schedules FOR DELETE USING (auth.uid() = user_id);

-- Logs
CREATE POLICY "Users can view their own logs" ON medication_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own logs" ON medication_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own logs" ON medication_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own logs" ON medication_logs FOR DELETE USING (auth.uid() = user_id);
