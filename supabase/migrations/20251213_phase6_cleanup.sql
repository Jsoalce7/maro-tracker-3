-- Phase 6: Catch-up Schema, Backfill, and Cleanup

-- 0. CATCH-UP SCHEMA: Add missing columns to food_items and user_custom_foods
-- Fiber was apparently missing or missed in initial schema.
-- Phase 4 & 5 fields are also seemingly missing on this instance.

DO $$
BEGIN
    -- 1. Fiber & Sugar Alcohols (Core Net Carb fields)
    -- food_items
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'food_items' AND column_name = 'fiber_per_100g') THEN
        ALTER TABLE food_items ADD COLUMN fiber_per_100g numeric DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'food_items' AND column_name = 'sugar_alcohols_per_100g') THEN
        ALTER TABLE food_items ADD COLUMN sugar_alcohols_per_100g numeric DEFAULT 0;
    END IF;
    -- user_custom_foods
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_custom_foods' AND column_name = 'fiber_per_100g') THEN
        ALTER TABLE user_custom_foods ADD COLUMN fiber_per_100g numeric DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_custom_foods' AND column_name = 'sugar_alcohols_per_100g') THEN
        ALTER TABLE user_custom_foods ADD COLUMN sugar_alcohols_per_100g numeric DEFAULT 0;
    END IF;

    -- 2. Phase 4 Fields (US Label Micros)
    -- food_items
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'food_items' AND column_name = 'trans_fat_per_100g') THEN
        ALTER TABLE food_items ADD COLUMN trans_fat_per_100g numeric DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'food_items' AND column_name = 'added_sugar_per_100g') THEN
        ALTER TABLE food_items ADD COLUMN added_sugar_per_100g numeric DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'food_items' AND column_name = 'cholesterol_per_100g') THEN
        ALTER TABLE food_items ADD COLUMN cholesterol_per_100g numeric DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'food_items' AND column_name = 'potassium_per_100g') THEN
        ALTER TABLE food_items ADD COLUMN potassium_per_100g numeric DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'food_items' AND column_name = 'calcium_per_100g') THEN
        ALTER TABLE food_items ADD COLUMN calcium_per_100g numeric DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'food_items' AND column_name = 'iron_per_100g') THEN
        ALTER TABLE food_items ADD COLUMN iron_per_100g numeric DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'food_items' AND column_name = 'vitamin_d_per_100g') THEN
        ALTER TABLE food_items ADD COLUMN vitamin_d_per_100g numeric DEFAULT 0;
    END IF;

    -- user_custom_foods same fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_custom_foods' AND column_name = 'trans_fat_per_100g') THEN
        ALTER TABLE user_custom_foods ADD COLUMN trans_fat_per_100g numeric DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_custom_foods' AND column_name = 'added_sugar_per_100g') THEN
        ALTER TABLE user_custom_foods ADD COLUMN added_sugar_per_100g numeric DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_custom_foods' AND column_name = 'cholesterol_per_100g') THEN
        ALTER TABLE user_custom_foods ADD COLUMN cholesterol_per_100g numeric DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_custom_foods' AND column_name = 'potassium_per_100g') THEN
        ALTER TABLE user_custom_foods ADD COLUMN potassium_per_100g numeric DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_custom_foods' AND column_name = 'calcium_per_100g') THEN
        ALTER TABLE user_custom_foods ADD COLUMN calcium_per_100g numeric DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_custom_foods' AND column_name = 'iron_per_100g') THEN
        ALTER TABLE user_custom_foods ADD COLUMN iron_per_100g numeric DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_custom_foods' AND column_name = 'vitamin_d_per_100g') THEN
        ALTER TABLE user_custom_foods ADD COLUMN vitamin_d_per_100g numeric DEFAULT 0;
    END IF;
    
    -- 3. Food Entries Snapshot Columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'food_entries' AND column_name = 'fiber_g') THEN
        ALTER TABLE food_entries ADD COLUMN fiber_g numeric;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'food_entries' AND column_name = 'sugar_alcohols_g') THEN
        ALTER TABLE food_entries ADD COLUMN sugar_alcohols_g numeric;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'food_entries' AND column_name = 'net_carbs_g') THEN
        ALTER TABLE food_entries ADD COLUMN net_carbs_g numeric;
    END IF;

END $$;

-- 4. BACKFILL NET CARBS (Global Foods)
DO $$
BEGIN
    UPDATE food_entries fe
    SET
        fiber_g = CASE 
            WHEN fe.fiber_g IS NOT NULL THEN fe.fiber_g
            ELSE (COALESCE(fi.fiber_per_100g, 0) * fe.quantity_g / 100)
        END,
        sugar_alcohols_g = CASE 
            WHEN fe.sugar_alcohols_g IS NOT NULL THEN fe.sugar_alcohols_g
            ELSE (COALESCE(fi.sugar_alcohols_per_100g, 0) * fe.quantity_g / 100)
        END,
        net_carbs_g = GREATEST(0, fe.carbs - (
            CASE 
                WHEN fe.fiber_g IS NOT NULL THEN fe.fiber_g
                ELSE (COALESCE(fi.fiber_per_100g, 0) * fe.quantity_g / 100)
            END
        ) - (
            CASE 
                WHEN fe.sugar_alcohols_g IS NOT NULL THEN fe.sugar_alcohols_g
                ELSE (COALESCE(fi.sugar_alcohols_per_100g, 0) * fe.quantity_g / 100)
            END
        ))
    FROM food_items fi
    WHERE fe.food_id = fi.id
      AND fe.net_carbs_g IS NULL;
END $$;

-- 5. BACKFILL NET CARBS (Custom Foods)
DO $$
BEGIN
    UPDATE food_entries fe
    SET
        fiber_g = CASE 
            WHEN fe.fiber_g IS NOT NULL THEN fe.fiber_g
            ELSE (COALESCE(ucf.fiber_per_100g, 0) * fe.quantity_g / 100)
        END,
        sugar_alcohols_g = CASE 
            WHEN fe.sugar_alcohols_g IS NOT NULL THEN fe.sugar_alcohols_g
            ELSE (COALESCE(ucf.sugar_alcohols_per_100g, 0) * fe.quantity_g / 100)
        END,
        net_carbs_g = GREATEST(0, fe.carbs - (
            CASE 
                WHEN fe.fiber_g IS NOT NULL THEN fe.fiber_g
                ELSE (COALESCE(ucf.fiber_per_100g, 0) * fe.quantity_g / 100)
            END
        ) - (
             CASE 
                WHEN fe.sugar_alcohols_g IS NOT NULL THEN fe.sugar_alcohols_g
                ELSE (COALESCE(ucf.sugar_alcohols_per_100g, 0) * fe.quantity_g / 100)
            END
        ))
    FROM user_custom_foods ucf
    WHERE fe.custom_food_id = ucf.id
      AND fe.net_carbs_g IS NULL;
END $$;

-- 6. DEDUPE BARCODES (Keep Latest Created)
DELETE FROM food_items
WHERE id IN (
    SELECT id
    FROM (
        SELECT id,
               ROW_NUMBER() OVER (PARTITION BY barcode ORDER BY created_at DESC) as rnum
        FROM food_items
        WHERE barcode IS NOT NULL AND barcode != ''
    ) t
    WHERE t.rnum > 1
);

-- 7. ADD UNIQUE CONSTRAINT
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'food_items_barcode_key'
    ) THEN
        ALTER TABLE food_items ADD CONSTRAINT food_items_barcode_key UNIQUE (barcode);
    END IF;
END $$;
