-- Class announcements — teacher/owner pinned messages shown to enrolled students.
-- Used by functions/api/classes/[id]/announcements/index.ts

CREATE TABLE IF NOT EXISTS class_announcements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id TEXT NOT NULL REFERENCES classes(id),
  content TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  pinned INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_announcements_class ON class_announcements(class_id, created_at DESC);
