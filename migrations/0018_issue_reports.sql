-- Student issue reports — bugs, quirks, and enhancement requests filed while
-- working. Written by POST /api/issue-reports (any signed-in user), triaged
-- by teachers/admins via POST /api/issue-reports/[id]/status, and exported as
-- a markdown handoff file by GET /api/issue-reports?format=md.
--
-- No class scoping: a report is a note from a person about the site, so any
-- staff member can see and triage all of them. context_json holds whatever
-- the client auto-captured (path, lesson id, user agent, code snapshot) so
-- the shape can grow without a migration each time.

CREATE TABLE IF NOT EXISTS issue_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reporter_email TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('bug', 'quirk', 'enhancement')),
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in-progress', 'fixed', 'deferred')),
  triaged_by TEXT,
  triaged_at INTEGER,
  context_json TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_issue_reports_status ON issue_reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_issue_reports_reporter ON issue_reports(reporter_email, created_at DESC);