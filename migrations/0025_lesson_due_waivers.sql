-- Per-student, per-lesson waiver of the DUE date's "late" status. The mirror
-- of lesson_access_overrides (0024) but for the other lock: 0024 bypasses
-- the Opens date (which actually blocks access); this clears the Due date
-- for one student on one lesson so nothing about it reads as late for them
-- -- no red badge, no "past due" flag -- even though Due never blocked
-- submission for anyone to begin with (see lib/due-dates-core.ts:
-- "a past-due lesson still opens and still submits").
--
-- A separate table rather than a `kind` column on lesson_access_overrides,
-- same reasoning as class_due_dates/class_open_dates staying two tables
-- (0023's own comment): the two ideas are genuinely different axes that
-- could both apply to the same (student, lesson) pair, and conflating them
-- under one flag is exactly the "the wrong one is silently inert" failure
-- 52fd116 called out for `summative` living in four separate config blocks.
--
-- Presence of a row = waived. No inheritance (unit/module/lesson) — like
-- 0024, a teacher grants this to a named student on a named lesson, not a
-- scope.
CREATE TABLE IF NOT EXISTS lesson_due_waivers (
  class_id       TEXT    NOT NULL,
  student_email  TEXT    NOT NULL,
  lesson_id      TEXT    NOT NULL,  -- lesson FOLDER id
  granted_by     TEXT    NOT NULL,  -- teacher email that granted it
  granted_at     INTEGER NOT NULL,  -- epoch ms
  PRIMARY KEY (class_id, student_email, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_lesson_due_waivers_class ON lesson_due_waivers (class_id);
-- Read side queries by student_email across every enrolled class, same
-- reason 0024 has its own student index rather than riding the class one.
CREATE INDEX IF NOT EXISTS idx_lesson_due_waivers_student ON lesson_due_waivers (student_email);
