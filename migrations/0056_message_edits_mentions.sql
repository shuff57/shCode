-- 0056: a person may edit or delete their own message, and @mention classmates (owner's decision 2026-11-14).
--
-- EDIT. messages.body is always the CURRENT words. Each time the author edits, the words being replaced go
-- into message_edits first, so the FIRST row of a message is the original. Classmates see the current words
-- and an "(edited)" tag; the class's teachers (and only they) can open the original and every earlier version.
--
-- DELETE. A student deleting their own message sets messages.retracted_at; the words STAY in messages.body.
-- Everyone but the class's teachers sees "Message deleted" with no words and no program; a teacher sees the
-- words struck through, marked as deleted by the author. This is separate from deleted_at/deleted_by, which is
-- a TEACHER's Remove ("Removed by a teacher") and is undone by Put back. Neither undoes the other.
--
-- MENTION. message_mentions holds who a message @mentioned, written by the server from the person keys the page
-- sends (only people who may read that conversation, and only when `@<their name>` is really in the words).
-- created_at is when the person was first mentioned (an edit that adds a mention makes a new row; one that keeps
-- it leaves its row alone), which is what the unread count compares with the reader's read_at.

ALTER TABLE messages ADD COLUMN edited_at INTEGER;
ALTER TABLE messages ADD COLUMN retracted_at INTEGER;

CREATE TABLE IF NOT EXISTS message_edits (
  id          TEXT    PRIMARY KEY,
  message_id  TEXT    NOT NULL,
  thread_id   TEXT    NOT NULL,
  -- the words that were replaced
  body        TEXT    NOT NULL,
  -- when they were replaced
  replaced_at INTEGER NOT NULL,
  edited_by   TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_message_edits_message ON message_edits (message_id, replaced_at);
CREATE INDEX IF NOT EXISTS idx_message_edits_by ON message_edits (edited_by, replaced_at);

CREATE TABLE IF NOT EXISTS message_mentions (
  message_id TEXT    NOT NULL,
  thread_id  TEXT    NOT NULL,
  email      TEXT    NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (message_id, email)
);
CREATE INDEX IF NOT EXISTS idx_message_mentions_email ON message_mentions (email, thread_id, created_at);
CREATE INDEX IF NOT EXISTS idx_message_mentions_thread ON message_mentions (thread_id);
