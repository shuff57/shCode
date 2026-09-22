-- Failed-login lockout, scoped by email. POST /api/auth/login increments
-- fail_count on every wrong password (or unknown email -- same response
-- either way, so this can't be used to probe which emails exist), and locks
-- the email out for LOCKOUT_MS once fail_count crosses the threshold. A
-- successful login deletes the row. Nothing prunes old rows; a stale
-- unlocked row is harmless and small.
CREATE TABLE IF NOT EXISTS login_attempts (
  email TEXT PRIMARY KEY,
  fail_count INTEGER NOT NULL DEFAULT 0,
  locked_until INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL DEFAULT 0
);
