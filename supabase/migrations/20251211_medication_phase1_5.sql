-- Phase 1.5: Detailed Metadata & Schedule Definitions

-- 1. Schedule Definitions (Templates like "Morning", "Bedtime")
CREATE TABLE medication_schedule_definitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL, -- e.g. "Morning Code", "Sick Day"
  
  -- Defaults for applying this template
  default_time TIME, 
  default_anchor TEXT, 
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for Definitions
ALTER TABLE medication_schedule_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own definitions" ON medication_schedule_definitions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own definitions" ON medication_schedule_definitions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own definitions" ON medication_schedule_definitions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own definitions" ON medication_schedule_definitions FOR DELETE USING (auth.uid() = user_id);

-- 2. Extend Profiles with Tags & Ingredients
ALTER TABLE medication_profiles 
ADD COLUMN IF NOT EXISTS medication_tags TEXT[], -- ['Drowsy', 'Take with food']
ADD COLUMN IF NOT EXISTS active_ingredients JSONB; -- [{name: 'Ibuprofen', amount: 200, unit: 'mg'}]

-- 3. Extend Schedules to link to Definitions
ALTER TABLE medication_schedules
ADD COLUMN IF NOT EXISTS definition_id UUID REFERENCES medication_schedule_definitions(id) ON DELETE SET NULL;

-- 4. Create Index on definition_id for filtering
CREATE INDEX IF NOT EXISTS idx_medication_schedules_definition_id ON medication_schedules(definition_id);
