-- When (epoch ms) and which version of the Terms of Service / Privacy Policy
-- a student accepted. Set at signup, or the first time an older account signs
-- in after the terms were published. NULL = not yet accepted: login reports
-- needsTerms and the sign-in dialog asks once.
ALTER TABLE students ADD COLUMN terms_accepted_at INTEGER;
ALTER TABLE students ADD COLUMN terms_version TEXT;
