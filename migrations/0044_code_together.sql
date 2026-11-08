-- 0044: Code together (codehs-review/REALTIME-SPEC.md, Part 2). 2-4 classmates
-- edit ONE sandbox program at the same time.
--
-- A session is a room in game_rooms (same codes, seats per account + tab,
-- classmates only, 3 hours, 3 open per host, host leaving closes it) whose kind
-- is 'code'. A code room is always live: its socket goes to the LiveDoc Durable
-- Object (workers/live/), never to the polling routes or to LiveRoom. Game
-- lobbies list kind 'game' only and the Code together bar kind 'code' only, so
-- one never joins the other. Every row before this is a game room.
ALTER TABLE game_rooms ADD COLUMN kind TEXT NOT NULL DEFAULT 'game';

-- The shared program is free text (it could carry messages in comments), so
-- it is KEPT and a teacher can read it. The LiveDoc writes its own text here
-- (never a client's copy) at most every 2 minutes while it changes, and when
-- the session closes or the last person leaves. Rows older than 30 days are
-- deleted on the next write. Read by GET /api/classes/[id]/code-sessions for
-- the class's owner, co-teachers and admins.
CREATE TABLE IF NOT EXISTS code_sessions (
  -- The Durable Object's name: room code + room creation time (a reused code is a new session).
  id            TEXT    PRIMARY KEY,
  code          TEXT    NOT NULL,
  host_email    TEXT    NOT NULL,
  -- The sandbox mode: 'js' | 'moshion'.
  kind          TEXT    NOT NULL,
  -- JSON array of the emails of everyone who connected (from the tickets).
  participants  TEXT    NOT NULL DEFAULT '[]',
  text          TEXT    NOT NULL DEFAULT '',
  started_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL,
  closed_at     INTEGER
);
CREATE INDEX IF NOT EXISTS idx_code_sessions_updated ON code_sessions(updated_at);
CREATE INDEX IF NOT EXISTS idx_code_sessions_host ON code_sessions(host_email, updated_at DESC);
