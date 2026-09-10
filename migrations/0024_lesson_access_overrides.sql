-- Per-student, per-lesson exception to the "available after" lock
-- (class_open_dates, 0023). A row here means: this one student gets into
-- this one lesson regardless of what the class-wide open date resolves to
-- for that lesson -- unlike class_open_dates/class_due_dates, this is never
-- inherited (unit/module/lesson), because the whole point is one named
-- student, not a scope.
--
-- Presence of a row is the grant -- there is no boolean column, deleting the
-- row revokes it. class_id is part of the key because the grant is made by
-- a teacher managing one class, but reading it (functions/_shared/dueDates.ts)
-- only checks "does a row exist for this student and this lesson", same as
-- class_open_dates being read per class then earliest-wins merged.
--
-- Same enforcement boundary as the open-date lock it exists to bypass: this
-- is checked client-side only (lib/due-dates.ts's lessonAvailability), not
-- server-side. A determined student could already reach a locked lesson's
-- data through the API before this table existed; granting a row here does
-- not change that boundary in either direction.
CREATE TABLE IF NOT EXISTS lesson_access_overrides (
  class_id       TEXT    NOT NULL,
  student_email  TEXT    NOT NULL,
  lesson_id      TEXT    NOT NULL,  -- lesson FOLDER id, e.g. '1-7-1-ch1-individual-pa-concepts'
  granted_by     TEXT    NOT NULL,  -- teacher email that granted it
  granted_at     INTEGER NOT NULL,  -- epoch ms
  PRIMARY KEY (class_id, student_email, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_lesson_access_overrides_class ON lesson_access_overrides (class_id);
-- The read side queries by student_email across every class they're enrolled
-- in (lib/due-dates.ts checks "is this lesson id anywhere in my overrides",
-- not "in class X specifically"), so it needs its own index rather than
-- riding the class_id one.
CREATE INDEX IF NOT EXISTS idx_lesson_access_overrides_student ON lesson_access_overrides (student_email);
