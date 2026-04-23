-- Track who authored each commit so students can distinguish teacher
-- pushes from their own work. NULL = legacy rows (always student-authored).
-- New rows always populate authored_by_email: same as student_email for
-- student commits, the teacher's email for teacher pushes.

ALTER TABLE commits ADD COLUMN authored_by_email TEXT;

CREATE INDEX IF NOT EXISTS idx_commits_authored_by
  ON commits (authored_by_email);
