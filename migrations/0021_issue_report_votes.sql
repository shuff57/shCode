-- Thumbs up / thumbs down on an issue report, so the worst ones sort to the
-- top of the student-visible queue (GET /api/issue-reports) instead of
-- staying in strict filing order.
--
-- The PK is composite, not a surrogate id with a UNIQUE constraint: one vote
-- per person per report is the whole rule, and a composite PK makes changing
-- your mind an UPSERT on the existing row (ON CONFLICT(report_id,
-- voter_email) DO UPDATE) rather than a second row to reconcile against the
-- first. No AUTOINCREMENT id to ever expose or reason about.
--
-- No FK to issue_reports — D1 doesn't enforce them by default — so DELETE
-- /api/issue-reports/[id] deletes a report's votes itself, in the same
-- handler, before the row is gone. This is hygiene, not correctness: `id` is
-- INTEGER PRIMARY KEY AUTOINCREMENT (migrations/0018_issue_reports.sql), so
-- ids are never reused and an orphaned row can never resurface against a
-- different report. It also can't be made complete this way — vote.ts checks
-- the report exists and then inserts, and the delete removes the report
-- before its votes, so a vote landing in either window still orphans a row
-- permanently. Harmless: the tally fold in
-- functions/_shared/issue-reports.ts skips any report id it doesn't
-- recognize. Not worth locking to close.
CREATE TABLE IF NOT EXISTS issue_report_votes (
  report_id   INTEGER NOT NULL,
  voter_email TEXT    NOT NULL,
  vote        INTEGER NOT NULL CHECK (vote IN (-1, 1)),
  created_at  INTEGER NOT NULL,
  PRIMARY KEY (report_id, voter_email)
);

CREATE INDEX IF NOT EXISTS idx_issue_report_votes_report ON issue_report_votes(report_id);
