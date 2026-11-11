-- 0048: versions, proposed changes and their conversations for the Games library
-- (codehs-review/GAME-FLOW-SPEC.md, lib/game-flow-core.ts). A small GitHub flow:
-- every Update saves a version with a note (a commit), a classmate who remixed a
-- game can propose their change back to its maker (a pull request), and the
-- proposal has a conversation anyone who can see the game may join (owner
-- decision 2026-11-10: free text, long, classmates can join; teachers read
-- everything and can remove a comment, lock a conversation or remove a proposal).
--
-- Numbered 0048 because 0046 (sketch_saves) and 0047 (game_suggestions, #96's
-- fixed-list feedback, a different feature) were written in parallel.
--
-- library_games.version is the game's current version number. A game published
-- before this has version 1 and no version rows: its first save writes the old
-- code as version 1 ("First version") before the new one. Only the newest 20
-- versions are kept.
--
-- game_changes holds the proposed code AND the code it started from (base_code),
-- so "See the changes" keeps working after old versions are pruned. Emails are
-- server-only; every name shown is first name + last initial, written at the
-- time (from_name, author_name).
--
-- game_change_comments is the conversation: kind 'comment' (body is what was
-- typed, shown as plain text) or 'event' (body is an event id such as
-- 'accepted', `extra` its number). A deleted comment keeps its row with
-- deleted_at and deleted_by ('author' | 'teacher') so the thread can say so, and
-- its body is blanked.
--
-- SQLite has no ADD COLUMN IF NOT EXISTS; like 0043-0045 this runs once through
-- the migrations table.

ALTER TABLE library_games ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS library_game_versions (
  game_id      TEXT    NOT NULL,
  version      INTEGER NOT NULL,
  code         TEXT    NOT NULL,
  message      TEXT    NOT NULL,
  author_email TEXT    NOT NULL,
  author_name  TEXT    NOT NULL,
  change_id    TEXT,                       -- set when the version is an accepted proposal
  created_at   INTEGER NOT NULL,
  PRIMARY KEY (game_id, version)
);

CREATE TABLE IF NOT EXISTS game_changes (
  id               TEXT    PRIMARY KEY,    -- 32 hex chars, CSPRNG
  game_id          TEXT    NOT NULL,
  from_email       TEXT    NOT NULL,
  from_name        TEXT    NOT NULL,
  title            TEXT    NOT NULL,       -- "What did you change?", 1-80 characters
  base_version     INTEGER NOT NULL,
  base_code        TEXT    NOT NULL,
  code             TEXT    NOT NULL,
  status           TEXT    NOT NULL DEFAULT 'open'
                   CHECK (status IN ('open', 'accepted', 'declined', 'withdrawn', 'removed', 'closed')),
  locked_at        INTEGER,
  created_at       INTEGER NOT NULL,
  updated_at       INTEGER NOT NULL,
  decided_at       INTEGER,
  accepted_version INTEGER
);
CREATE INDEX IF NOT EXISTS idx_game_changes_game ON game_changes (game_id, status);
CREATE INDEX IF NOT EXISTS idx_game_changes_from ON game_changes (from_email, created_at);

CREATE TABLE IF NOT EXISTS game_change_comments (
  id           TEXT    PRIMARY KEY,
  change_id    TEXT    NOT NULL,
  kind         TEXT    NOT NULL DEFAULT 'comment' CHECK (kind IN ('comment', 'event')),
  author_email TEXT    NOT NULL,
  author_name  TEXT    NOT NULL,
  body         TEXT    NOT NULL,
  extra        INTEGER,
  created_at   INTEGER NOT NULL,
  deleted_at   INTEGER,
  deleted_by   TEXT
);
CREATE INDEX IF NOT EXISTS idx_game_change_comments_change ON game_change_comments (change_id, created_at);
CREATE INDEX IF NOT EXISTS idx_game_change_comments_author ON game_change_comments (author_email, created_at);
