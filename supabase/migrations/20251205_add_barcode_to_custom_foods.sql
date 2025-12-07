-- Add barcode column to user_custom_foods
alter table user_custom_foods add column if not exists barcode text;

-- Add index for faster barcode lookups
create index if not exists user_custom_foods_barcode_idx on user_custom_foods(barcode);
