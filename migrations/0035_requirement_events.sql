-- Per-student "most missed requirement" tracking for console labs (.gauntlet/SPEC-finish-remaining.md, P5).
--
-- One row per (student, lesson, requirement): `fails` is how many Runs the requirement was red
-- (batched and added by POST /api/requirement-events), `first_pass_at` is the first time the student
-- saw it green (NULL = still failing). Best effort and informational only: nothing that decides a
-- grade, completion or Submit reads this table. A teacher reads it, scoped to their own class's
-- enrolled students, through GET /api/classes/[id]/requirement-events.
CREATE TABLE IF NOT EXISTS requirement_events (
  student_email TEXT NOT NULL,
  lesson_id TEXT NOT NULL,
  req_id TEXT NOT NULL,
  fails INTEGER NOT NULL DEFAULT 0,
  first_pass_at INTEGER,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (student_email, lesson_id, req_id)
);
CREATE INDEX IF NOT EXISTS idx_requirement_events_lesson ON requirement_events (lesson_id);
