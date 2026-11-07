-- 0041: online game rooms (Phase 6, the board games). A student's sketch hosts
-- a room, a classmate joins it with its 6-letter code, and the two sketches
-- pass moves through it. The browser polls for new events about once a
-- second (functions/api/rooms/*), which is plenty for turn-based games.
--
-- Rules, enforced in functions/_shared/rooms.ts:
--   * classmates only: to join you must share a live class with the host
--     (enrolled, or a teacher of it);
--   * game data only: an event is a small JSON value of numbers, booleans and
--     strings of at most 20 characters (1 KB in all), so a room cannot be
--     used as a chat;
--   * a room lives 3 hours. Rooms a day past expiry are deleted on the next
--     room created anywhere.

CREATE TABLE IF NOT EXISTS game_rooms (
  code        TEXT    PRIMARY KEY,
  game        TEXT    NOT NULL,
  host_email  TEXT    NOT NULL,
  seats       INTEGER NOT NULL,
  created_at  INTEGER NOT NULL,
  expires_at  INTEGER NOT NULL,
  closed_at   INTEGER
);
CREATE INDEX IF NOT EXISTS idx_game_rooms_host ON game_rooms(host_email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_rooms_expires ON game_rooms(expires_at);

CREATE TABLE IF NOT EXISTS game_room_players (
  code       TEXT    NOT NULL,
  seat       INTEGER NOT NULL,
  email      TEXT    NOT NULL,
  -- One browser tab (lib/moshion-online.ts keeps a random id per tab in
  -- sessionStorage). A seat belongs to an account in a tab: rerunning the
  -- sketch keeps it, and a second tab takes the next seat, so a student can
  -- test a two-player game alone.
  device     TEXT    NOT NULL DEFAULT '',
  joined_at  INTEGER NOT NULL,
  left_at    INTEGER,
  PRIMARY KEY (code, seat),
  UNIQUE (code, email, device)
);

CREATE TABLE IF NOT EXISTS game_room_events (
  code        TEXT    NOT NULL,
  seq         INTEGER NOT NULL,
  seat        INTEGER NOT NULL,
  data_json   TEXT    NOT NULL,
  created_at  INTEGER NOT NULL,
  PRIMARY KEY (code, seq)
);
