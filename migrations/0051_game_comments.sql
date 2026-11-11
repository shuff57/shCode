-- 0051: comments on class games, with replies, and switches to turn feedback off
-- (owner's decision 2026-11-12).
--
-- Until now a game's play page took only fixed-list suggestions (0047, "games
-- carry game data, not chat"). The owner decided classmates may now write
-- comments in their own words and reply to them, under the same rules as the
-- proposed-change conversations (0048): only people who can open the game read
-- or write, names are first name + last initial, every comment is kept for the
-- class's teachers, who can delete any of them.
--
-- A reply is a comment with a parent_id, one level deep: a reply to a reply
-- hangs off the same top comment. A deleted comment keeps its row (deleted_at,
-- deleted_by) so its replies still have somewhere to hang; its words are never
-- sent again.
--
-- Three switches, all "feedback on" by default, all of which must be on for a
-- classmate to see or add feedback (comments AND suggestions):
--   library_games.feedback_on            the game's creator
--   library_game_shares.feedback_off_at  a teacher, for this game in their class
--   classes.game_feedback_off            a teacher, for every game in their class
-- With feedback off the creator and the class's teachers still read what was
-- written; nobody adds to it.

CREATE TABLE IF NOT EXISTS game_comments (
  id           TEXT    PRIMARY KEY,
  game_id      TEXT    NOT NULL,
  parent_id    TEXT,
  author_email TEXT    NOT NULL,
  author_name  TEXT    NOT NULL,
  body         TEXT    NOT NULL,
  created_at   INTEGER NOT NULL,
  deleted_at   INTEGER,
  deleted_by   TEXT
);
CREATE INDEX IF NOT EXISTS idx_game_comments_game ON game_comments (game_id, created_at);
CREATE INDEX IF NOT EXISTS idx_game_comments_author ON game_comments (author_email, created_at);

ALTER TABLE library_games ADD COLUMN feedback_on INTEGER NOT NULL DEFAULT 1;
ALTER TABLE library_game_shares ADD COLUMN feedback_off_at INTEGER;
ALTER TABLE library_game_shares ADD COLUMN feedback_off_by TEXT;
ALTER TABLE classes ADD COLUMN game_feedback_off INTEGER NOT NULL DEFAULT 0;
