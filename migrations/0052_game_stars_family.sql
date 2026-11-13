-- 0052: stars on class games, and what the family tree needs
-- (owner's request 2026-11-12: "a GitHub starring system", in line with the
-- simplified GitHub flow of 0048: plain words on the button, the GitHub term in
-- one small line).
--
-- game_stars: one row per (game, person). Starring is a toggle, exactly as on
-- GitHub: it says "I like this" and keeps the game in your Starred list in the
-- Library. Anyone who may open the game (visibleGame()) may star it, the maker
-- included; nobody stars a hidden game. A star carries no words, so it does not
-- follow the feedback switches of 0051.
--
-- library_games.remixed_from_version: which version of the original a remix
-- started from, so the family tree (GET /api/games/[id]/family) can say "from
-- version 3". NULL for every remix made before this migration and for a remix
-- of a built-in game (built-ins have no versions).
--
-- The indexes let the family route find a game's remixes without a scan, and
-- the Starred list find a person's stars.

CREATE TABLE IF NOT EXISTS game_stars (
  game_id     TEXT    NOT NULL,
  from_email  TEXT    NOT NULL,
  created_at  INTEGER NOT NULL,
  PRIMARY KEY (game_id, from_email)
);
CREATE INDEX IF NOT EXISTS idx_game_stars_from ON game_stars (from_email, created_at);

ALTER TABLE library_games ADD COLUMN remixed_from_version INTEGER;
CREATE INDEX IF NOT EXISTS idx_library_games_remixed_from ON library_games (remixed_from_id);
CREATE INDEX IF NOT EXISTS idx_library_games_origin ON library_games (origin_id);
