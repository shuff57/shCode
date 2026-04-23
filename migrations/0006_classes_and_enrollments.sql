-- Classes, enrollments, and co-teachers. Ported from raSHio minus seats,
-- billing, tutors, stripe, and user-category distinctions. Uses the
-- existing students.email as the natural key rather than UUIDs.

CREATE TABLE IF NOT EXISTS classes (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  code          TEXT NOT NULL UNIQUE,       -- 6-char alphanumeric join code
  owner_email   TEXT NOT NULL,              -- teacher who owns the class
  school_year   TEXT NOT NULL,              -- e.g. '2025-2026'
  created_at    INTEGER NOT NULL,           -- epoch ms
  archived_at   INTEGER                     -- epoch ms, NULL = active
);

-- Student -> class. Composite PK enforces one enrollment per (class,
-- student); a student can still be in multiple classes over time.
CREATE TABLE IF NOT EXISTS enrollments (
  class_id        TEXT NOT NULL,
  student_email   TEXT NOT NULL,
  enrolled_at     INTEGER NOT NULL,
  enrolled_by     TEXT,                     -- email of enroller, NULL = self via code
  expires_at      INTEGER NOT NULL,         -- epoch ms, June 30 cutoff
  PRIMARY KEY (class_id, student_email)
);

-- Optional co-teachers; owner is the class.owner_email, not listed here.
CREATE TABLE IF NOT EXISTS class_teachers (
  class_id        TEXT NOT NULL,
  teacher_email   TEXT NOT NULL,
  added_at        INTEGER NOT NULL,
  added_by        TEXT,
  PRIMARY KEY (class_id, teacher_email)
);

CREATE INDEX IF NOT EXISTS idx_classes_owner   ON classes(owner_email);
CREATE INDEX IF NOT EXISTS idx_classes_code    ON classes(code);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_email);
CREATE INDEX IF NOT EXISTS idx_enrollments_expires ON enrollments(expires_at);

-- Seed a Legacy class so pre-existing students aren't stranded by the
-- structure change. Owned by shuff57@gmail.com (the current admin); the
-- owner can rename / reassign / archive it from the teacher dashboard
-- once that ships. Code is the literal string "LEGACY" — legal under the
-- safe-alphabet generator, and memorable.
INSERT OR IGNORE INTO classes (id, name, code, owner_email, school_year, created_at)
  VALUES (
    'legacy',
    'Legacy (pre-classes)',
    'LEGACY',
    'shuff57@gmail.com',
    '2025-2026',
    CAST(strftime('%s', 'now') AS INTEGER) * 1000
  );

-- Bulk-enroll every existing student into the Legacy class. Expires
-- 2100-01-01 so these rows survive the normal June-30 auto-rollover.
INSERT OR IGNORE INTO enrollments (class_id, student_email, enrolled_at, enrolled_by, expires_at)
  SELECT
    'legacy',
    email,
    CAST(strftime('%s', 'now') AS INTEGER) * 1000,
    'system',
    4102444800000
  FROM students
  WHERE role = 'student';
