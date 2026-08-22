-- Per-class due dates. One row per (class, scope, scope_id); a lesson row
-- overrides its module row, which overrides its unit row. Absence of every
-- row = no due date at all, which is the default for the whole course.
--
-- scope_id by scope:
--   'unit'   -> lesson.json `category`, e.g. 'Unit 1: JavaScript Fundamentals'
--   'module' -> dotted module id, e.g. '1.1' (curriculum/modules/1.1_*.md `id:`)
--   'lesson' -> lesson FOLDER id, e.g. '1-1-4-sdlc-overview' -- the same key
--               lesson_state.lesson_id uses, NOT the numbered title '1.1.4'.
--
-- DIRECTIVE: 0011_rename_chapter1_lesson_ids.sql renamed lesson folder ids.
-- Any future rename migration MUST also UPDATE class_due_dates.scope_id
-- WHERE scope = 'lesson', or these rows orphan silently with no error.
--
-- Setting a module date writes ONE row, never one row per child lesson.
-- "Mixed" in the UI is computed at render time from the children's resolved
-- dates, so clearing a lesson override just deletes that row and the lesson
-- re-inherits.
CREATE TABLE IF NOT EXISTS class_due_dates (
  class_id  TEXT    NOT NULL,
  scope     TEXT    NOT NULL CHECK (scope IN ('unit','module','lesson')),
  scope_id  TEXT    NOT NULL,
  due_at    INTEGER NOT NULL,   -- epoch ms, 23:59:59.999 in the school timezone
  set_by    TEXT    NOT NULL,   -- teacher email that last wrote this row
  set_at    INTEGER NOT NULL,   -- epoch ms
  PRIMARY KEY (class_id, scope, scope_id)
);

CREATE INDEX IF NOT EXISTS idx_due_dates_class ON class_due_dates (class_id);

-- The due date in force when this submission was recorded, resolved through
-- the module/lesson inheritance chain at write time. NULL = no due date was
-- set for that lesson (or the row predates this migration).
--
-- Stored as the resolved timestamp rather than an is_late boolean on purpose:
-- changing a due date later must not rewrite what already happened, and the
-- gradebook wants to show "due" and "submitted" side by side.
--
-- D1/SQLite has no ADD COLUMN IF NOT EXISTS. Same shape as 0007/0008.
ALTER TABLE lesson_submissions ADD COLUMN due_at_submit INTEGER;
