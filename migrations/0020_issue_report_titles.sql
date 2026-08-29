-- A one-line title on every issue report.
--
-- Before this, the queue and the markdown export both derived a headline by
-- slicing the first line of `message`. That reads fine when a student happens
-- to open with a summary and badly when they open mid-thought ("so I clicked
-- the green button and then"), which is most of the time. A separate field
-- asks for the summary explicitly.
--
-- Nullable rather than NOT NULL DEFAULT '': the API requires a title on new
-- reports, but D1 has no way to invent one for a row already filed, and an
-- empty string would be indistinguishable from a real blank. NULL means
-- "filed before titles existed", and the UI falls back to the old first-line
-- slice for those.
ALTER TABLE issue_reports ADD COLUMN title TEXT;

-- Retroactive backfill: give every existing report the headline the UI was
-- already showing it, so the queue does not go blank for anything filed
-- before today. Same rule as the old client-side slice — first line, capped —
-- just computed once here instead of on every render.
--
-- char(10) is \n. INSTR returns 0 when there is no newline, hence the CASE
-- rather than a bare SUBSTR: SUBSTR(msg, 1, -1) would return an empty string
-- for every single-line message, which is every short report.
--
-- NULLIF, because a message that opens with a blank line slices to an empty
-- string, and '' would then be a title that exists and says nothing -- exactly
-- the state the nullable column above exists to avoid. NULL keeps those rows
-- on the first-line fallback in the UI.
UPDATE issue_reports
   SET title = NULLIF(TRIM(SUBSTR(
         CASE WHEN INSTR(message, char(10)) > 0
              THEN SUBSTR(message, 1, INSTR(message, char(10)) - 1)
              ELSE message
         END, 1, 120)), '')
 WHERE title IS NULL OR TRIM(title) = '';
