-- 0042: the Games library (Part B of codehs-review/MULTIPLAYER-SPEC.md). A
-- student publishes a moSHion sketch as a game from the sandbox; classmates
-- play it on /play?game=<id> and can remix it into their own sandbox.
--
-- The code is stored as text in D1 (at most 64 KB, checked in
-- functions/_shared/games.ts) and only ever runs inside the sandboxed moSHion
-- iframe (components/MoshionPreview.tsx, no allow-same-origin), exactly as any
-- sketch does. `mode` and `players` are what the code declares through
-- multiplayer('...', n), read by a regex at publish time; they are
-- informational only (the lobby badge on a card), never a rule.
--
-- A deleted game keeps its row with deleted_at set (a tombstone), and its
-- shares are removed at the same time. Rules mirror library_items /
-- library_shares (functions/_shared/libraryShare.ts): owner-only edit and
-- delete; sharing goes into the publisher's live classes; a class's teachers
-- can hide, unhide and remove; names show as first name + last initial.

CREATE TABLE IF NOT EXISTS library_games (
  id          TEXT PRIMARY KEY,              -- 32 hex chars, CSPRNG
  owner_email TEXT NOT NULL,
  title       TEXT NOT NULL,                 -- 1-60 characters, plain text
  code        TEXT NOT NULL,                 -- the sketch, at most 64 KB
  mode        TEXT NOT NULL DEFAULT 'none' CHECK (mode IN ('none', 'local', 'coop', 'versus')),
  players     INTEGER NOT NULL DEFAULT 1,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL,
  deleted_at  INTEGER                        -- NULL = live; set = tombstone
);
CREATE INDEX IF NOT EXISTS idx_library_games_owner ON library_games (owner_email, deleted_at);

CREATE TABLE IF NOT EXISTS library_game_shares (
  game_id    TEXT NOT NULL,
  class_id   TEXT NOT NULL,
  shared_at  INTEGER NOT NULL,
  hidden_at  INTEGER,
  hidden_by  TEXT,
  PRIMARY KEY (game_id, class_id)
);
CREATE INDEX IF NOT EXISTS idx_library_game_shares_class ON library_game_shares (class_id);
