-- Student accounts for simple email + password auth.
-- password_hash is "saltHex:iterations:hashHex" (PBKDF2-SHA256, 256-bit key).
-- email is used verbatim as the owner key on rows in `commits`.
CREATE TABLE IF NOT EXISTS students (
  email          TEXT PRIMARY KEY,
  password_hash  TEXT NOT NULL,
  created_at     INTEGER NOT NULL
);
