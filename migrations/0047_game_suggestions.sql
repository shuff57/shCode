-- 0047: suggestions on class games (#96). A classmate picks from a fixed list
-- (lib/game-suggestions.ts) to help a game's author: "Add more levels", "Make it
-- harder". Never free text: games carry game data, not chat (owner, 2026-11-10).
-- One row per game, person and suggestion; picking again removes it. Who can
-- see the game is visibleGame()'s rule; the author and the class's teachers see
-- names (first name + last initial), everyone else sees counts. A teacher can
-- clear the rows that came from their class's students (game-shares,
-- action 'clear-suggestions').

CREATE TABLE IF NOT EXISTS game_suggestions (
  game_id        TEXT    NOT NULL,
  from_email     TEXT    NOT NULL,
  suggestion_id  TEXT    NOT NULL,
  created_at     INTEGER NOT NULL,
  PRIMARY KEY (game_id, from_email, suggestion_id)
);

CREATE INDEX IF NOT EXISTS idx_game_suggestions_game ON game_suggestions (game_id);
