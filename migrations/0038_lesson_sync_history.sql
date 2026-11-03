-- Cloud save history: one row per successful PUT to lesson_sync.
--
-- `lesson_sync` stays the single current workspace every device converges on.
-- This table is the list the History panel's Cloud tab shows and restores from,
-- so an older save can be brought back on any device.
--
-- Pruned to the newest 20 rows per (student, lesson) on every insert, in the
-- same D1 batch as the insert. The History panel's local ("This device") tab
-- is localStorage, not this table.
CREATE TABLE IF NOT EXISTS lesson_sync_history (
  id            TEXT PRIMARY KEY,
  student_email TEXT NOT NULL,
  lesson_id     TEXT NOT NULL,
  files_gz      BLOB NOT NULL,
  revision      INTEGER NOT NULL,
  created_at    INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_lesson_sync_history_student_lesson_created
  ON lesson_sync_history (student_email, lesson_id, created_at DESC);
