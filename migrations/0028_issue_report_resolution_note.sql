-- A staff reply attached to a triage decision -- why a report was deferred,
-- what changed to fix it, what "in progress" actually means right now.
-- Shown next to the status badge to whoever can see the report at all
-- (student and staff alike): a status alone answers "what happened", this
-- answers "why".
--
-- Nullable, and written by the same route that flips status
-- (POST /api/issue-reports/[id]/status) rather than a separate endpoint, so
-- the two can never point at different triage moments.
ALTER TABLE issue_reports ADD COLUMN resolution_note TEXT;
