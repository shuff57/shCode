-- Free-response drafts (one per student+lesson, overwritten on Save or Submit)
-- and append-only submission history (one row per graded Submit).
CREATE TABLE IF NOT EXISTS lesson_drafts (
  student_email TEXT NOT NULL,
  lesson_id     TEXT NOT NULL,
  response      TEXT NOT NULL,
  updated_at    INTEGER NOT NULL,
  PRIMARY KEY (student_email, lesson_id)
);

CREATE TABLE IF NOT EXISTS lesson_submissions (
  id             TEXT PRIMARY KEY,
  student_email  TEXT NOT NULL,
  lesson_id      TEXT NOT NULL,
  response       TEXT NOT NULL,
  grade_json     TEXT,
  score          REAL,
  possible       REAL,
  submitted_at   INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_lesson_submissions_lookup
  ON lesson_submissions (student_email, lesson_id, submitted_at DESC);
