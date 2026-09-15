-- Optional student-chosen display name. NULL for every existing account and
-- for any signup that leaves it blank -- every display site falls back to
-- email when this is NULL, so this migration changes no existing behavior.
ALTER TABLE students ADD COLUMN display_name TEXT;
