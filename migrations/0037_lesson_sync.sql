-- Cross-device workspace sync: the student's CURRENT files for one lesson,
-- one row per (student, lesson), overwritten in place as they type.
--
-- Deliberately separate from `commits` (an explicit, append-only history) and
-- from `lesson_drafts` (the graded response text / diagram a lesson submits).
-- A commit is a named save-point; this is the live document every device
-- converges on, so it must not fill the History panel or the submission
-- readers.
--
-- `revision` is the optimistic-concurrency token. A PUT names the revision it
-- read; a mismatch returns the newer row instead of overwriting it, and the
-- client merges before retrying (lib/lesson-sync.ts).
-- `files_gz` is the same gzipped JSON file map the commits table stores.
--
-- If a lesson id is ever renamed, update lesson_sync too, alongside
-- lesson_state / lesson_drafts / lesson_submissions / commits (the renames in
-- 0011 and 0017 are the pattern); an orphaned row is a workspace no device
-- will ever pull.
CREATE TABLE IF NOT EXISTS lesson_sync (
  student_email TEXT NOT NULL,
  lesson_id     TEXT NOT NULL,
  files_gz      BLOB NOT NULL,
  revision      INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL,
  PRIMARY KEY (student_email, lesson_id)
);
