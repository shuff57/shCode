-- 0040: Appearance settings per account (#73, #77): theme, accent colour, body
-- font and the home page's background. One JSON row per account, validated by
-- lib/prefs-core.ts parsePrefs() on every write; every value is an id from a
-- fixed list (never CSS), and an uploaded background must be the caller's own
-- upload. The browser keeps a copy in localStorage (shcode.prefs) so the theme
-- is applied before first paint; this row is what follows the student to
-- another computer.

CREATE TABLE IF NOT EXISTS user_prefs (
  email       TEXT    PRIMARY KEY,
  prefs_json  TEXT    NOT NULL,
  updated_at  INTEGER NOT NULL
);
