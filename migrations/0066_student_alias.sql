-- Optional alias (a handle) a person picks for how classmates see them.
-- first_name / last_name stay the real name: grading, the gradebook, the roster and
-- every other teacher view keep reading them. Only the classmate-facing labels in
-- functions/_shared/libraryShare.ts (`ownerLabel`) prefer the alias when one is set.
-- NULL for every existing account, so this changes nothing until someone sets one.
ALTER TABLE students ADD COLUMN alias TEXT;

-- One alias per person across the site (case-insensitive), so a handle cannot be
-- used to pass as someone else's alias. Real names are not constrained.
CREATE UNIQUE INDEX IF NOT EXISTS idx_students_alias_lower
  ON students (lower(alias)) WHERE alias IS NOT NULL;
