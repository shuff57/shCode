-- Per-class release of a capped performance-assessment part's solution: the
-- pseudocode shown after the last try, and a capped quiz's answer key
-- (.gauntlet/SPEC-attempt-caps.md, "Release").
--
-- A student sees the solution only when BOTH hold: every try is spent AND this
-- table says one of their classes has released that part. The release is an
-- instant, not a flag, and it is compared with the server clock on every
-- request -- "release now" is release_at = now, "release on Fri 3 PM" is a
-- future release_at, and nothing needs a cron to flip. Absence of a row means
-- NOT released (the opposite default to class_open_dates, where absence means
-- open: a solution is closed until a teacher says otherwise).
--
-- Same (class, scope, scope_id) key and lesson > module inheritance as
-- class_due_dates / class_open_dates (0012, 0023). A module row releases every
-- part of that test unless a lesson row overrides it. `unit` is deliberately not
-- a scope here: the parts live in six test modules and a unit-wide release would
-- open tests that have not been sat.
--
-- "Take back" on a part that inherits its module's release is a lesson row whose
-- release_at is HELD_BACK (year 9999, see lib/solution-release-core.ts), because
-- deleting the row would just fall back to the module date. Taking back at the
-- level that set the date is a DELETE.
--
-- scope_id by scope:
--   'module' -> dotted module id, e.g. '3.10'
--   'lesson' -> lesson FOLDER id, e.g. '3-10-2-ch3-individual-pa-own-words'
--
-- DIRECTIVE: a lesson-id rename migration MUST update class_due_dates,
-- class_open_dates AND class_solution_releases WHERE scope = 'lesson'. An
-- orphaned release row quietly withholds a solution nobody can find the row for.
CREATE TABLE IF NOT EXISTS class_solution_releases (
  class_id   TEXT    NOT NULL,
  scope      TEXT    NOT NULL CHECK (scope IN ('module','lesson')),
  scope_id   TEXT    NOT NULL,
  release_at INTEGER NOT NULL,   -- epoch ms; the solution is released once release_at <= now
  set_by     TEXT    NOT NULL,   -- teacher email that last wrote this row
  set_at     INTEGER NOT NULL,   -- epoch ms
  PRIMARY KEY (class_id, scope, scope_id)
);

CREATE INDEX IF NOT EXISTS idx_solution_releases_class ON class_solution_releases (class_id);
