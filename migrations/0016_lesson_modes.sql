-- Teacher control over whether a lesson is worked with the shape tools, with
-- code, or either.
--
-- BOTH gates live in this one table. A row with lesson_id = '*' is the class
-- default ("period 3 uses the toolbar"); a row with a real lesson id is a
-- per-assignment override on top of it ("everyone does 3.2 visually"). Two
-- tables would have needed the same resolution logic written twice.
--
-- Resolution, most specific first:
--   1. (class_id, lesson_id)   -- this assignment, this class
--   2. (class_id, '*')         -- this class, everything else
--   3. the lesson's own model.mode in lesson.json
--   4. 'both'
--
-- A student in several active classes is rare but real (the Legacy class means
-- most students are in two). Ties break on updated_at DESC: the teacher who
-- most recently said something wins, which is the only rule that explains
-- itself to the person who just changed it.

CREATE TABLE IF NOT EXISTS lesson_modes (
  class_id     TEXT NOT NULL,
  -- '*' for the class-wide default, otherwise a lesson id.
  lesson_id    TEXT NOT NULL,
  -- 'visual' | 'code' | 'both'. Checked in the route, not here, so adding a
  -- mode later does not need a table rebuild.
  mode         TEXT NOT NULL,
  set_by_email TEXT NOT NULL,
  updated_at   INTEGER NOT NULL,
  PRIMARY KEY (class_id, lesson_id)
);

-- Student resolution reads by lesson across a handful of classes.
CREATE INDEX IF NOT EXISTS idx_lesson_modes_lesson ON lesson_modes (lesson_id);
