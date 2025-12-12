-- Phase 3: Inventory Tracking

-- Extend Profiles with Stock fields
ALTER TABLE medication_profiles 
ADD COLUMN IF NOT EXISTS current_stock INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 5;
