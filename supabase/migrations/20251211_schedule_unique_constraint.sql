-- Remove duplicate schedule entries, keeping the most recent one
DELETE FROM workout_schedule a
USING workout_schedule b
WHERE a.id < b.id
AND a.user_id = b.user_id
AND a.scheduled_date = b.scheduled_date;

-- Now add the unique constraint
ALTER TABLE workout_schedule 
ADD CONSTRAINT workout_schedule_user_date_unique 
UNIQUE (user_id, scheduled_date);
