-- Per-student lesson state. Absence of a row = not_opened.
-- state transitions:
--   not_opened -> started    (auto on lesson page mount)
--   started    -> completed  (CompletionPanel button, WrittenGrader pass)
--   completed  -> <sticky>   (no automatic downgrade)
-- DELETE clears the row back to not_opened (used by explicit "Undo complete").
CREATE TABLE IF NOT EXISTS lesson_state (
  student_email TEXT NOT NULL,
  lesson_id     TEXT NOT NULL,
  state         TEXT NOT NULL CHECK (state IN ('started','completed')),
  started_at    INTEGER NOT NULL,
  completed_at  INTEGER,
  score         REAL,
  PRIMARY KEY (student_email, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_lesson_state_student
  ON lesson_state (student_email);
