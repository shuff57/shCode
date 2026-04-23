-- Migrate commits.files_json (TEXT NOT NULL) to allow NULL,
-- and add files_gz (BLOB) for gzip-compressed snapshots going forward.
--
-- SQLite does not support ALTER COLUMN, so we do the standard
-- CREATE-new + INSERT…SELECT + DROP + RENAME dance.
-- All existing data and the covering index are preserved.

PRAGMA foreign_keys = OFF;

-- 1. New table with the updated schema.
CREATE TABLE commits_new (
  id                TEXT PRIMARY KEY,
  student_email     TEXT NOT NULL,
  lesson_id         TEXT NOT NULL,
  message           TEXT NOT NULL,
  files_json        TEXT,          -- nullable: populated on legacy rows
  files_gz          BLOB,          -- nullable: populated on new rows
  changed_file_ids  TEXT NOT NULL,
  created_at        INTEGER NOT NULL
);

-- 2. Copy all existing rows (files_gz will be NULL for all of them).
INSERT INTO commits_new
  (id, student_email, lesson_id, message, files_json, files_gz, changed_file_ids, created_at)
SELECT
  id, student_email, lesson_id, message, files_json, NULL,     changed_file_ids, created_at
FROM commits;

-- 3. Drop the old table and rename the new one.
DROP TABLE commits;
ALTER TABLE commits_new RENAME TO commits;

-- 4. Recreate the index (was dropped with the old table).
CREATE INDEX IF NOT EXISTS idx_commits_student_lesson_created
  ON commits (student_email, lesson_id, created_at DESC);

PRAGMA foreign_keys = ON;
