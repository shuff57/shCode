-- Split the single display_name column into first_name + last_name.
-- Only shuff57@gmail.com carries a non-null display_name in production
-- ("Steven Huff") -- split on the first space, remainder (if any) into
-- last_name. Every other account is NULL/NULL before and after this
-- migration, so this changes no existing display behavior for them.
ALTER TABLE students ADD COLUMN first_name TEXT;
ALTER TABLE students ADD COLUMN last_name TEXT;

UPDATE students
   SET first_name = CASE
         WHEN instr(display_name, ' ') > 0 THEN substr(display_name, 1, instr(display_name, ' ') - 1)
         ELSE display_name
       END,
       last_name = CASE
         WHEN instr(display_name, ' ') > 0 THEN trim(substr(display_name, instr(display_name, ' ') + 1))
         ELSE NULL
       END
 WHERE display_name IS NOT NULL;

-- display_name is dead weight introduced this same session -- backfilled
-- above, safe to drop rather than carry three overlapping name columns.
ALTER TABLE students DROP COLUMN display_name;
