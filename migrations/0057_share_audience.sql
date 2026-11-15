-- 0057: who a student's shared picture, sound, font or game goes to (owner's decision 2026-11-14).
--
-- A share is still one row per (item, class) in library_shares / library_game_shares: every reader and every
-- teacher-side hide keeps working. What a student now chooses is WHICH classes get a row:
--   - "My classes": the ones they tick (a student can be in several);
--   - "All of <teacher>'s classes": a row for every class that teacher owns or co-teaches, including classes
--     the student is not in. Students of those classes see it; nobody else does.
-- audience_teacher remembers the second case (the teacher's email; the page only ever gets a person key), so
-- a class that teacher creates, or co-teaches, later gets the item too. NULL = the first case: exactly the
-- rows present, which is also what every share made before this migration is.
--
-- No Public rung yet (audience spec, codehs-review/ASSET-AUDIENCE-SPEC.md).

ALTER TABLE library_items ADD COLUMN audience_teacher TEXT;
ALTER TABLE library_games ADD COLUMN audience_teacher TEXT;
CREATE INDEX IF NOT EXISTS idx_library_items_audience ON library_items (audience_teacher) WHERE audience_teacher IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_library_games_audience ON library_games (audience_teacher) WHERE audience_teacher IS NOT NULL;
