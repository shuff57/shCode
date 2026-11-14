-- 0054: a sandbox program sent in a message (owner's decision 2026-11-13, Stage B of messages).
--
-- From the sandbox's Share menu, "Send to..." puts a card in a conversation (0053). Three kinds:
--   'copy'      a copy of the program as it was when sent. The card opens /shared?id=<id>: it runs
--               there but cannot be edited, and Remix makes it a new project of the reader's own.
--   'together'  an invitation to the Code together session (0044) the sender is in. The card's Join
--               opens the sandbox with that session's code ready to join. The room's own rules still
--               decide (classmates only, seats, 3 hours); a card for a session that has closed says so.
--   'watch'     an invitation to WATCH that session live: /shared?id=<id> shows the program as it is
--               typed, read-only, and runs it. The reader holds no seat; the LiveDoc refuses its edits
--               (functions/_shared/live.ts mayWatch: this invitation, or a teacher of the class).
--
-- A share belongs to ONE message, so exactly the people who may read that message may open it: its
-- conversation's two people, and, for a conversation between two students, the class's teachers.
-- A teacher removing the message hides the card from the students too.
--
-- id is 128 random bits (hex). code is at most 64 KB (UTF-8) and is checked for personal details like
-- a message is. room_created_at tells a reused room code from the session that was shared.

CREATE TABLE IF NOT EXISTS message_shares (
  id              TEXT    PRIMARY KEY,
  message_id      TEXT    NOT NULL,
  thread_id       TEXT    NOT NULL,
  author_email    TEXT    NOT NULL,
  -- 'copy' | 'together' | 'watch'
  kind            TEXT    NOT NULL,
  -- the sandbox mode: 'js' | 'moshion'
  lang            TEXT    NOT NULL,
  -- the project's name when it was sent (at most 40 characters)
  title           TEXT    NOT NULL DEFAULT '',
  code            TEXT,
  room_code       TEXT,
  room_created_at INTEGER,
  created_at      INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_message_shares_thread ON message_shares (thread_id);
CREATE INDEX IF NOT EXISTS idx_message_shares_message ON message_shares (message_id);
