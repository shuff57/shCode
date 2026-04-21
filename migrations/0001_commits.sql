-- Per-student lesson commits. One row per save-point.
-- files_json stores the full fileContentsSnapshot (lib/types.ts Commit).
-- changed_file_ids is stored as a JSON array string, not a separate table,
-- because it is only read back whole.
CREATE TABLE IF NOT EXISTS commits (
  id                TEXT PRIMARY KEY,
  student_email     TEXT NOT NULL,
  lesson_id         TEXT NOT NULL,
  message           TEXT NOT NULL,
  files_json        TEXT NOT NULL,
  changed_file_ids  TEXT NOT NULL,
  created_at        INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_commits_student_lesson_created
  ON commits (student_email, lesson_id, created_at DESC);
