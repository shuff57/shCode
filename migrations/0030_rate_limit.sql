-- IP-scoped request counters for brute-force protection. Ported from
-- raSHio's functions/utils/rateLimit.js / migrations/0011_rate_limit.sql —
-- same shape, same (ip, action) key, so the logic in
-- functions/_shared/rateLimit.ts could be lifted verbatim.
CREATE TABLE IF NOT EXISTS rate_limit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip TEXT NOT NULL,
  action TEXT NOT NULL,
  count INTEGER DEFAULT 1,
  window_start INTEGER NOT NULL,
  UNIQUE(ip, action)
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_window ON rate_limit(window_start);
