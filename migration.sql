-- Migration Script for jsolace7@gmail.com (Attempt 2)
-- New User ID: 849033a5-2f39-430b-836c-77e66a647687
-- Profile Source: 1e94cc4c-3697-40de-a4c8-cdbf9ac86083
-- Logs Source: 7c5be609-f494-4301-839a-717dc6fd0966 (Primary) + 1e94 (Secondary)

BEGIN;

-- 1. Ensure new user doesn't have a profile yet
DELETE FROM user_profiles WHERE id = '849033a5-2f39-430b-836c-77e66a647687';

-- 2. Create profile for new user copying from '1e94...' (The one with 104kg stats)
INSERT INTO user_profiles (
    id, height_cm, weight_kg, goal_weight_kg, age, sex, activity_level, goal_type, 
    use_custom_targets, custom_calories, custom_protein, custom_carbs, custom_fat, created_at, updated_at
)
SELECT 
    '849033a5-2f39-430b-836c-77e66a647687', height_cm, weight_kg, goal_weight_kg, age, sex, activity_level, goal_type,
    use_custom_targets, custom_calories, custom_protein, custom_carbs, custom_fat, created_at, updated_at
FROM user_profiles 
WHERE id = '1e94cc4c-3697-40de-a4c8-cdbf9ac86083';

-- 3. Resolve Duplicate Logs: 
-- Delete logs from 1e94 that overlap with 7c5b (Priorimize 7c5b)
DELETE FROM day_logs 
WHERE user_id = '1e94cc4c-3697-40de-a4c8-cdbf9ac86083'
AND date IN (SELECT date FROM day_logs WHERE user_id = '7c5be609-f494-4301-839a-717dc6fd0966');

-- 4. Move all logs to New User
UPDATE day_logs 
SET user_id = '849033a5-2f39-430b-836c-77e66a647687'
WHERE user_id IN (
    '1e94cc4c-3697-40de-a4c8-cdbf9ac86083', 
    '7c5be609-f494-4301-839a-717dc6fd0966', 
    '65003f16-718f-45db-8b7f-a0ee7f3c58ab', 
    'e9407ba1-2e8a-4c81-b2ab-dbe6dad0c3bd'
);

-- 5. Move Targets (Prioritize 1e94)
DELETE FROM user_targets WHERE user_id = '849033a5-2f39-430b-836c-77e66a647687';
-- Update 1e94 target to new user
UPDATE user_targets 
SET user_id = '849033a5-2f39-430b-836c-77e66a647687'
WHERE user_id = '1e94cc4c-3697-40de-a4c8-cdbf9ac86083';
-- Update 7c5b target IF not exists (conflict handling via distinct check or just delete old)
DELETE FROM user_targets WHERE user_id IN ('7c5be609-f494-4301-839a-717dc6fd0966', '65003f16-718f-45db-8b7f-a0ee7f3c58ab', 'e9407ba1-2e8a-4c81-b2ab-dbe6dad0c3bd');

-- 6. Move Foods & Favorites (Merge all)
UPDATE user_custom_foods 
SET user_id = '849033a5-2f39-430b-836c-77e66a647687'
WHERE user_id IN ('1e94cc4c-3697-40de-a4c8-cdbf9ac86083', '7c5be609-f494-4301-839a-717dc6fd0966', '65003f16-718f-45db-8b7f-a0ee7f3c58ab', 'e9407ba1-2e8a-4c81-b2ab-dbe6dad0c3bd');

UPDATE favorites 
SET user_id = '849033a5-2f39-430b-836c-77e66a647687'
WHERE user_id IN ('1e94cc4c-3697-40de-a4c8-cdbf9ac86083', '7c5be609-f494-4301-839a-717dc6fd0966', '65003f16-718f-45db-8b7f-a0ee7f3c58ab', 'e9407ba1-2e8a-4c81-b2ab-dbe6dad0c3bd');

-- 7. Cleanup Old Profiles
DELETE FROM user_profiles WHERE id IN ('1e94cc4c-3697-40de-a4c8-cdbf9ac86083', '7c5be609-f494-4301-839a-717dc6fd0966', '65003f16-718f-45db-8b7f-a0ee7f3c58ab', 'e9407ba1-2e8a-4c81-b2ab-dbe6dad0c3bd');

COMMIT;
