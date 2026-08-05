-- Per-student per-unit per-UTC-day counter for AI Help requests, used by
-- functions/api/ai-help.ts to enforce a rate limit. The quota is scoped to
-- a unit so a student gets a fresh allotment when they move to a new unit.
--
-- Bucket strategy: one row per (student, unit, UTC day). The row is
-- upserted on every accepted request, so the count is the number of help
-- requests the student has made for that unit today. Old rows can be
-- pruned periodically; nothing relies on history.
--
-- `unit` is the lesson's unit string from curriculum frontmatter
-- (e.g. "2.1 shPlay Foundations"). Lessons without a unit bucket under ''.

CREATE TABLE IF NOT EXISTS ai_help_usage (
  student_email TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT '',
  day TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (student_email, unit, day)
);

CREATE INDEX IF NOT EXISTS idx_ai_help_day ON ai_help_usage(day);
