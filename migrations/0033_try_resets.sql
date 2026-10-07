-- Audit trail for a teacher giving tries back on a capped performance-assessment part
-- (.gauntlet/SPEC-attempt-caps.md, round 4 finding 7).
--
-- `POST /api/classes/[id]/tries-reset` deletes the student's counted lesson_submissions
-- rows (the newest one, or all of them) so the part has tries left again. Every reader of
-- lesson_submissions (the gradebook, the review queue, the drawer, score-quiz.mjs) then
-- reads the part as it now is. What the deletion would lose is kept HERE: who did it, when,
-- for which class, how many rows, the best score the student had, and the removed rows
-- themselves as JSON, so a teacher can see what was reset and nothing a student wrote is
-- gone for good. This is the audit trail lesson-unsubmit (quiz-only) deliberately never had.
CREATE TABLE IF NOT EXISTS lesson_try_resets (
  id                TEXT PRIMARY KEY,
  class_id          TEXT NOT NULL,
  student_email     TEXT NOT NULL,
  lesson_id         TEXT NOT NULL,
  action            TEXT NOT NULL,        -- 'give-back-one' | 'reset'
  rows_removed      INTEGER NOT NULL,
  best_score_before REAL,
  rows_json         TEXT,
  reset_by          TEXT NOT NULL,
  reset_at          INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_lesson_try_resets_student
  ON lesson_try_resets (student_email, lesson_id, reset_at);
