-- Add index for faster barcode lookups
CREATE INDEX IF NOT EXISTS idx_user_custom_foods_barcode ON user_custom_foods(barcode);
