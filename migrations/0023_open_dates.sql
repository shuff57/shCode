-- Per-class "available after" dates. The mirror image of class_due_dates
-- (0012): same (class, scope, scope_id) key, same lesson > module > unit
-- inheritance, same school-timezone rule. Absence of every row = the lesson
-- has always been available, which is the default for the whole course.
--
-- Two tables rather than an open_at column on class_due_dates, because
-- class_due_dates.due_at is NOT NULL and SQLite cannot relax that without a
-- full table rebuild. A lesson that opens Monday but is never due would have
-- had no legal row.
--
-- scope_id by scope is IDENTICAL to class_due_dates -- see 0012 for the
-- authoritative description:
--   'unit'   -> lesson.json `category`
--   'module' -> dotted module id, e.g. '1.1'
--   'lesson' -> lesson FOLDER id, e.g. '1-1-4-sdlc-overview'
--
-- DIRECTIVE: any future lesson-id rename migration MUST update BOTH
-- class_due_dates AND class_open_dates WHERE scope = 'lesson'. 0012's
-- directive named only one table; there are two now, and an orphaned open
-- row fails silently the same way -- except the failure mode here is worse.
-- An orphaned due row loses a badge; an orphaned open row leaves a lesson
-- locked with no teacher able to find the date holding it shut.
--
-- open_at carries a real time of day, unlike due_at which was written at
-- 23:59:59.999 every time. "Opens Monday at 8:00 AM" is the whole point of
-- the feature -- a first-period class should not see Monday's work at
-- midnight Sunday.
CREATE TABLE IF NOT EXISTS class_open_dates (
  class_id  TEXT    NOT NULL,
  scope     TEXT    NOT NULL CHECK (scope IN ('unit','module','lesson')),
  scope_id  TEXT    NOT NULL,
  open_at   INTEGER NOT NULL,   -- epoch ms, a wall-clock time in the school timezone
  set_by    TEXT    NOT NULL,   -- teacher email that last wrote this row
  set_at    INTEGER NOT NULL,   -- epoch ms
  PRIMARY KEY (class_id, scope, scope_id)
);

CREATE INDEX IF NOT EXISTS idx_open_dates_class ON class_open_dates (class_id);
