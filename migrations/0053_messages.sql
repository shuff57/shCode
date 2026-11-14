-- 0053: messages between a teacher and their students, and between classmates
-- (owner's decision 2026-11-13).
--
-- A conversation is between two people in ONE class: a student and a teacher of
-- the class, or two students enrolled in it. The class decides who may read it
-- besides the two of them: that class's teachers read every conversation between
-- two of its students (students are told so above each one). A conversation
-- between a teacher and a student is read by those two only.
--
-- pair_key is "<class id>|<email>|<email>" with the two emails sorted, so a
-- second "New message" to the same person in the same class reopens the same
-- conversation instead of starting another.
--
-- A message is never really deleted: a teacher removing one sets deleted_at and
-- deleted_by, and its words are never sent again ("Removed by a teacher").
--
-- person_keys gives each account a random public id, so the page can name the
-- person a message goes to without ever being sent an email.
--
-- Two teacher controls per class:
--   classes.student_messages_off   1 = students cannot message each other in
--                                  this class (they can still message a teacher)
--   class_message_mutes            one student cannot message classmates in this
--                                  class (they can still message a teacher)

CREATE TABLE IF NOT EXISTS message_threads (
  id         TEXT    PRIMARY KEY,
  class_id   TEXT    NOT NULL,
  pair_key   TEXT    NOT NULL,
  -- 'teacher' when one of the two teaches the class, else 'students'
  kind       TEXT    NOT NULL,
  created_by TEXT    NOT NULL,
  created_at INTEGER NOT NULL,
  last_at    INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_message_threads_pair ON message_threads (pair_key);
CREATE INDEX IF NOT EXISTS idx_message_threads_class ON message_threads (class_id, last_at);

CREATE TABLE IF NOT EXISTS message_members (
  thread_id TEXT    NOT NULL,
  email     TEXT    NOT NULL,
  -- first name + last initial, written down when the conversation starts
  name      TEXT    NOT NULL,
  teacher   INTEGER NOT NULL DEFAULT 0,
  read_at   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (thread_id, email)
);
CREATE INDEX IF NOT EXISTS idx_message_members_email ON message_members (email);

CREATE TABLE IF NOT EXISTS messages (
  id           TEXT    PRIMARY KEY,
  thread_id    TEXT    NOT NULL,
  author_email TEXT    NOT NULL,
  body         TEXT    NOT NULL,
  created_at   INTEGER NOT NULL,
  deleted_at   INTEGER,
  deleted_by   TEXT
);
CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages (thread_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_author ON messages (author_email, created_at);

CREATE TABLE IF NOT EXISTS person_keys (
  email TEXT PRIMARY KEY,
  key   TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS class_message_mutes (
  class_id      TEXT    NOT NULL,
  student_email TEXT    NOT NULL,
  muted_at      INTEGER NOT NULL,
  muted_by      TEXT    NOT NULL,
  PRIMARY KEY (class_id, student_email)
);

ALTER TABLE classes ADD COLUMN student_messages_off INTEGER NOT NULL DEFAULT 0;
