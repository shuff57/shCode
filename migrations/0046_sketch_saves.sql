-- 0046: a sketch's 'remote' saves (#97): save(key, value, 'remote'),
-- load(key, 'remote') and saved(name, defaults, 'remote').save() in moSHion.
-- One row per account per sketch: `sketch_key` is the preview's game key (the
-- lesson id, 'sandbox', 'game-<id>' on /play, 'demo-<fence>'), so a game
-- played from the Library keeps each PLAYER's progress in the player's own
-- account. `data_json` is a JSON object of name -> the value's JSON text,
-- exactly the shape of the browser store, validated by lib/sketch-saves-core.ts
-- (key count, sizes) on every write. Nothing else reads it: a teacher does not
-- see a student's game saves.

CREATE TABLE IF NOT EXISTS sketch_saves (
  email       TEXT    NOT NULL,
  sketch_key  TEXT    NOT NULL,
  data_json   TEXT    NOT NULL,
  updated_at  INTEGER NOT NULL,
  PRIMARY KEY (email, sketch_key)
);
