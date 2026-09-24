-- Per-class override of the curriculum's grade-category weights (see
-- curriculum-plan.md GRADING STRUCTURE, adopted 2026-09-23). Absence of a
-- class's row for a category = use lib/grading-weights.ts DEFAULT_WEIGHTS
-- for that category untouched.
--
-- `category` is one of the fixed keys in lib/grading-weights.ts
-- GRADE_CATEGORIES ('lab' | 'written' | 'quiz' | 'chapterTest' | 'finalExam'
-- | 'q1' | 'q2' | 'q4') -- never free text -- so a typo can't silently
-- create a ninth bucket that never sums into anyone's grade.
--
-- Same shape as class_due_dates (0012): a dedicated table keyed by class,
-- not a JSON blob on `classes` -- there is no such column and no precedent
-- for one (see CLAUDE.md's survey of this table).
CREATE TABLE IF NOT EXISTS class_grading_weights (
  class_id TEXT    NOT NULL,
  category TEXT    NOT NULL,
  weight   REAL    NOT NULL,  -- percentage points, e.g. 30 for 30%. Rows for
                              -- one class should sum to 100 but nothing
                              -- enforces that server-side; the UI does.
  set_by   TEXT    NOT NULL,  -- teacher email that last wrote this row
  set_at   INTEGER NOT NULL,  -- epoch ms
  PRIMARY KEY (class_id, category)
);

CREATE INDEX IF NOT EXISTS idx_grading_weights_class ON class_grading_weights (class_id);
