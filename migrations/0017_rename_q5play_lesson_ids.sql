-- 0017: the engine is moSHion, so the lesson ids should say so.
--
-- Five lesson folders still carried `q5play` in their id -- the name of the
-- upstream library moSHion reimplements, not the name of this engine. The
-- titles were already clean and `preview` already said `moshion`; the ids were
-- the last of it. The folders are renamed in the same change as this file.
--
--   5-1-11-q5play-intro            -> 5-1-11-moshion-intro
--   5-1-20-q5play-move-keys        -> 5-1-20-moshion-move-keys
--   5-3-14-q5play-sprite-showcase  -> 5-3-14-moshion-sprite-showcase
--   q5play-bounce                  -> moshion-bounce
--   q5play-gravity                 -> moshion-gravity
--
-- SECOND JOB: three sets of submissions were already orphaned before this.
-- An earlier renumber moved these lessons onto the title numbering in
-- lesson_state and commits but did NOT touch lesson_submissions, so prod still
-- holds 65 submission rows under the pre-numbering ids while the lessons
-- themselves have been `5-1-11-...` for months:
--
--   lesson_submissions  q5play-intro            29 rows
--   lesson_submissions  q5play-move-keys        35 rows
--   lesson_submissions  q5play-sprite-showcase   1 row
--
-- Those rows are a student's submit history for a lesson that can no longer
-- find it: GET /api/lesson-submissions?lessonId=5-1-11-... returns nothing.
-- Renaming the ids again without folding these in would strand them a second
-- time, so they are mapped onto the new ids here. Measured on prod
-- 2026-08-25: zero students hold BOTH an old and a new id, so nothing merges
-- two real histories into one.
--
-- Re-runnable: no source id is also a target id, so a second pass matches
-- nothing.
--
-- DEPLOY ORDER: ship the renamed folders FIRST, then apply this -- the same
-- order 0013 records the hard way. Reversed, D1 holds ids the deployed site
-- does not serve, and every lesson a student opens in the gap writes a fresh
-- row under the old id.
--
-- lesson_state and lesson_drafts are PRIMARY KEY (student_email, lesson_id),
-- so a bare UPDATE could violate the constraint if a student somehow held
-- both. Those two resolve the pair first. lesson_submissions and commits carry
-- their own id and cannot collide, so they just update.

-- lesson_state: drop the old row only where the new one already exists.
DELETE FROM lesson_state
WHERE lesson_id IN (
  '5-1-11-q5play-intro',
  '5-1-20-q5play-move-keys',
  '5-3-14-q5play-sprite-showcase',
  'q5play-bounce',
  'q5play-gravity',
  'q5play-intro',
  'q5play-move-keys',
  'q5play-sprite-showcase'
)
AND EXISTS (
  SELECT 1 FROM lesson_state n
  WHERE n.student_email = lesson_state.student_email
    AND n.lesson_id = CASE lesson_state.lesson_id
      WHEN '5-1-11-q5play-intro'           THEN '5-1-11-moshion-intro'
      WHEN '5-1-20-q5play-move-keys'       THEN '5-1-20-moshion-move-keys'
      WHEN '5-3-14-q5play-sprite-showcase' THEN '5-3-14-moshion-sprite-showcase'
      WHEN 'q5play-bounce'                 THEN 'moshion-bounce'
      WHEN 'q5play-gravity'                THEN 'moshion-gravity'
      WHEN 'q5play-intro'                  THEN '5-1-11-moshion-intro'
      WHEN 'q5play-move-keys'              THEN '5-1-20-moshion-move-keys'
      WHEN 'q5play-sprite-showcase'        THEN '5-3-14-moshion-sprite-showcase'
    END
);

UPDATE lesson_state
SET lesson_id = CASE lesson_id
  WHEN '5-1-11-q5play-intro'           THEN '5-1-11-moshion-intro'
  WHEN '5-1-20-q5play-move-keys'       THEN '5-1-20-moshion-move-keys'
  WHEN '5-3-14-q5play-sprite-showcase' THEN '5-3-14-moshion-sprite-showcase'
  WHEN 'q5play-bounce'                 THEN 'moshion-bounce'
  WHEN 'q5play-gravity'                THEN 'moshion-gravity'
  WHEN 'q5play-intro'                  THEN '5-1-11-moshion-intro'
  WHEN 'q5play-move-keys'              THEN '5-1-20-moshion-move-keys'
  WHEN 'q5play-sprite-showcase'        THEN '5-3-14-moshion-sprite-showcase'
END
WHERE lesson_id IN (
  '5-1-11-q5play-intro',
  '5-1-20-q5play-move-keys',
  '5-3-14-q5play-sprite-showcase',
  'q5play-bounce',
  'q5play-gravity',
  'q5play-intro',
  'q5play-move-keys',
  'q5play-sprite-showcase'
);

-- lesson_drafts: same shape. A draft is the student's unsubmitted work, so
-- where both rows exist the new-id draft is the live one and wins.
DELETE FROM lesson_drafts
WHERE lesson_id IN (
  '5-1-11-q5play-intro',
  '5-1-20-q5play-move-keys',
  '5-3-14-q5play-sprite-showcase',
  'q5play-bounce',
  'q5play-gravity',
  'q5play-intro',
  'q5play-move-keys',
  'q5play-sprite-showcase'
)
AND EXISTS (
  SELECT 1 FROM lesson_drafts n
  WHERE n.student_email = lesson_drafts.student_email
    AND n.lesson_id = CASE lesson_drafts.lesson_id
      WHEN '5-1-11-q5play-intro'           THEN '5-1-11-moshion-intro'
      WHEN '5-1-20-q5play-move-keys'       THEN '5-1-20-moshion-move-keys'
      WHEN '5-3-14-q5play-sprite-showcase' THEN '5-3-14-moshion-sprite-showcase'
      WHEN 'q5play-bounce'                 THEN 'moshion-bounce'
      WHEN 'q5play-gravity'                THEN 'moshion-gravity'
      WHEN 'q5play-intro'                  THEN '5-1-11-moshion-intro'
      WHEN 'q5play-move-keys'              THEN '5-1-20-moshion-move-keys'
      WHEN 'q5play-sprite-showcase'        THEN '5-3-14-moshion-sprite-showcase'
    END
);

UPDATE lesson_drafts
SET lesson_id = CASE lesson_id
  WHEN '5-1-11-q5play-intro'           THEN '5-1-11-moshion-intro'
  WHEN '5-1-20-q5play-move-keys'       THEN '5-1-20-moshion-move-keys'
  WHEN '5-3-14-q5play-sprite-showcase' THEN '5-3-14-moshion-sprite-showcase'
  WHEN 'q5play-bounce'                 THEN 'moshion-bounce'
  WHEN 'q5play-gravity'                THEN 'moshion-gravity'
  WHEN 'q5play-intro'                  THEN '5-1-11-moshion-intro'
  WHEN 'q5play-move-keys'              THEN '5-1-20-moshion-move-keys'
  WHEN 'q5play-sprite-showcase'        THEN '5-3-14-moshion-sprite-showcase'
END
WHERE lesson_id IN (
  '5-1-11-q5play-intro',
  '5-1-20-q5play-move-keys',
  '5-3-14-q5play-sprite-showcase',
  'q5play-bounce',
  'q5play-gravity',
  'q5play-intro',
  'q5play-move-keys',
  'q5play-sprite-showcase'
);

-- lesson_submissions: append-only history, own id, no collision possible.
-- This is where the 65 orphaned rows come home.
UPDATE lesson_submissions
SET lesson_id = CASE lesson_id
  WHEN '5-1-11-q5play-intro'           THEN '5-1-11-moshion-intro'
  WHEN '5-1-20-q5play-move-keys'       THEN '5-1-20-moshion-move-keys'
  WHEN '5-3-14-q5play-sprite-showcase' THEN '5-3-14-moshion-sprite-showcase'
  WHEN 'q5play-bounce'                 THEN 'moshion-bounce'
  WHEN 'q5play-gravity'                THEN 'moshion-gravity'
  WHEN 'q5play-intro'                  THEN '5-1-11-moshion-intro'
  WHEN 'q5play-move-keys'              THEN '5-1-20-moshion-move-keys'
  WHEN 'q5play-sprite-showcase'        THEN '5-3-14-moshion-sprite-showcase'
END
WHERE lesson_id IN (
  '5-1-11-q5play-intro',
  '5-1-20-q5play-move-keys',
  '5-3-14-q5play-sprite-showcase',
  'q5play-bounce',
  'q5play-gravity',
  'q5play-intro',
  'q5play-move-keys',
  'q5play-sprite-showcase'
);

-- commits: own id, no collision possible.
UPDATE commits
SET lesson_id = CASE lesson_id
  WHEN '5-1-11-q5play-intro'           THEN '5-1-11-moshion-intro'
  WHEN '5-1-20-q5play-move-keys'       THEN '5-1-20-moshion-move-keys'
  WHEN '5-3-14-q5play-sprite-showcase' THEN '5-3-14-moshion-sprite-showcase'
  WHEN 'q5play-bounce'                 THEN 'moshion-bounce'
  WHEN 'q5play-gravity'                THEN 'moshion-gravity'
  WHEN 'q5play-intro'                  THEN '5-1-11-moshion-intro'
  WHEN 'q5play-move-keys'              THEN '5-1-20-moshion-move-keys'
  WHEN 'q5play-sprite-showcase'        THEN '5-3-14-moshion-sprite-showcase'
END
WHERE lesson_id IN (
  '5-1-11-q5play-intro',
  '5-1-20-q5play-move-keys',
  '5-3-14-q5play-sprite-showcase',
  'q5play-bounce',
  'q5play-gravity',
  'q5play-intro',
  'q5play-move-keys',
  'q5play-sprite-showcase'
);

-- class_due_dates: a lesson-scoped due date names the lesson in scope_id, not
-- in a lesson_id column -- which is why a grep for lesson_id does not find this
-- table. Empty on prod as of 2026-08-25, but a due date set before this ships
-- would otherwise point at a lesson that no longer exists.
-- PRIMARY KEY (class_id, scope, scope_id), so resolve the pair first.

DELETE FROM class_due_dates
WHERE scope = 'lesson'
AND scope_id IN (
  '5-1-11-q5play-intro',
  '5-1-20-q5play-move-keys',
  '5-3-14-q5play-sprite-showcase',
  'q5play-bounce',
  'q5play-gravity',
  'q5play-intro',
  'q5play-move-keys',
  'q5play-sprite-showcase'
)
AND EXISTS (
  SELECT 1 FROM class_due_dates n
  WHERE n.class_id = class_due_dates.class_id
    AND n.scope = 'lesson'
    AND n.scope_id = CASE class_due_dates.scope_id
        WHEN '5-1-11-q5play-intro'           THEN '5-1-11-moshion-intro'
        WHEN '5-1-20-q5play-move-keys'       THEN '5-1-20-moshion-move-keys'
        WHEN '5-3-14-q5play-sprite-showcase' THEN '5-3-14-moshion-sprite-showcase'
        WHEN 'q5play-bounce'                 THEN 'moshion-bounce'
        WHEN 'q5play-gravity'                THEN 'moshion-gravity'
        WHEN 'q5play-intro'                  THEN '5-1-11-moshion-intro'
        WHEN 'q5play-move-keys'              THEN '5-1-20-moshion-move-keys'
        WHEN 'q5play-sprite-showcase'        THEN '5-3-14-moshion-sprite-showcase'
      END
);

UPDATE class_due_dates
SET scope_id = CASE scope_id
  WHEN '5-1-11-q5play-intro'           THEN '5-1-11-moshion-intro'
  WHEN '5-1-20-q5play-move-keys'       THEN '5-1-20-moshion-move-keys'
  WHEN '5-3-14-q5play-sprite-showcase' THEN '5-3-14-moshion-sprite-showcase'
  WHEN 'q5play-bounce'                 THEN 'moshion-bounce'
  WHEN 'q5play-gravity'                THEN 'moshion-gravity'
  WHEN 'q5play-intro'                  THEN '5-1-11-moshion-intro'
  WHEN 'q5play-move-keys'              THEN '5-1-20-moshion-move-keys'
  WHEN 'q5play-sprite-showcase'        THEN '5-3-14-moshion-sprite-showcase'
END
WHERE scope = 'lesson'
AND scope_id IN (
  '5-1-11-q5play-intro',
  '5-1-20-q5play-move-keys',
  '5-3-14-q5play-sprite-showcase',
  'q5play-bounce',
  'q5play-gravity',
  'q5play-intro',
  'q5play-move-keys',
  'q5play-sprite-showcase'
);


-- lesson_modes: per-class visual/code override. '*' is the class-wide default
-- and is never a lesson id, so it is untouched.
-- PRIMARY KEY (class_id, lesson_id), so resolve the pair first.

DELETE FROM lesson_modes
WHERE lesson_id IN (
  '5-1-11-q5play-intro',
  '5-1-20-q5play-move-keys',
  '5-3-14-q5play-sprite-showcase',
  'q5play-bounce',
  'q5play-gravity',
  'q5play-intro',
  'q5play-move-keys',
  'q5play-sprite-showcase'
)
AND EXISTS (
  SELECT 1 FROM lesson_modes n
  WHERE n.class_id = lesson_modes.class_id
    AND n.lesson_id = CASE lesson_modes.lesson_id
        WHEN '5-1-11-q5play-intro'           THEN '5-1-11-moshion-intro'
        WHEN '5-1-20-q5play-move-keys'       THEN '5-1-20-moshion-move-keys'
        WHEN '5-3-14-q5play-sprite-showcase' THEN '5-3-14-moshion-sprite-showcase'
        WHEN 'q5play-bounce'                 THEN 'moshion-bounce'
        WHEN 'q5play-gravity'                THEN 'moshion-gravity'
        WHEN 'q5play-intro'                  THEN '5-1-11-moshion-intro'
        WHEN 'q5play-move-keys'              THEN '5-1-20-moshion-move-keys'
        WHEN 'q5play-sprite-showcase'        THEN '5-3-14-moshion-sprite-showcase'
      END
);

UPDATE lesson_modes
SET lesson_id = CASE lesson_id
  WHEN '5-1-11-q5play-intro'           THEN '5-1-11-moshion-intro'
  WHEN '5-1-20-q5play-move-keys'       THEN '5-1-20-moshion-move-keys'
  WHEN '5-3-14-q5play-sprite-showcase' THEN '5-3-14-moshion-sprite-showcase'
  WHEN 'q5play-bounce'                 THEN 'moshion-bounce'
  WHEN 'q5play-gravity'                THEN 'moshion-gravity'
  WHEN 'q5play-intro'                  THEN '5-1-11-moshion-intro'
  WHEN 'q5play-move-keys'              THEN '5-1-20-moshion-move-keys'
  WHEN 'q5play-sprite-showcase'        THEN '5-3-14-moshion-sprite-showcase'
END
WHERE lesson_id IN (
  '5-1-11-q5play-intro',
  '5-1-20-q5play-move-keys',
  '5-3-14-q5play-sprite-showcase',
  'q5play-bounce',
  'q5play-gravity',
  'q5play-intro',
  'q5play-move-keys',
  'q5play-sprite-showcase'
);
