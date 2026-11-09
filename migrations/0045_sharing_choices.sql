-- 0045: who may do what with a shared game, picture or sound, and where a
-- remix came from (lib/share-choice.ts).
--
-- share_choice is one of 'play' | 'credit' | 'open' | 'free':
--   play   classmates play the game (or see the picture/sound inside the
--          author's games) but get no Remix, View code or Copy to mine;
--   credit remix it, give me credit (the default, and what every row before
--          this means);
--   open   remix it, give me credit, and keep remixes open: a remix of it may
--          only be shared as 'open' too;
--   free   no credit needed.
-- It lives on the item itself (library_games, library_items), not on the share
-- rows: one item is shared into every class the owner is in with ONE choice,
-- unsharing deletes the share rows (the choice must survive that), and the
-- "keep remixes open" rule follows the item, not a class.
--
-- The remixed_from_* columns record a remix's direct original: its id, its
-- title (a game) or name (a picture or sound), its author as first name + last
-- initial (never an email), and its choice when it was remixed. origin_* is
-- the first item of the chain when the original was itself a remix (NULL
-- otherwise). All are written by the server from the original's own row; a
-- client only ever sends the original's id.
--
-- SQLite has no ADD COLUMN IF NOT EXISTS; like 0043 and 0044 this runs once
-- through the migrations table.

ALTER TABLE library_games ADD COLUMN share_choice TEXT NOT NULL DEFAULT 'credit';
ALTER TABLE library_games ADD COLUMN remixed_from_id TEXT;
ALTER TABLE library_games ADD COLUMN remixed_from_title TEXT;
ALTER TABLE library_games ADD COLUMN remixed_from_author TEXT;
ALTER TABLE library_games ADD COLUMN remixed_from_choice TEXT;
ALTER TABLE library_games ADD COLUMN origin_id TEXT;
ALTER TABLE library_games ADD COLUMN origin_title TEXT;
ALTER TABLE library_games ADD COLUMN origin_author TEXT;

ALTER TABLE library_items ADD COLUMN share_choice TEXT NOT NULL DEFAULT 'credit';
ALTER TABLE library_items ADD COLUMN remixed_from_id TEXT;
ALTER TABLE library_items ADD COLUMN remixed_from_title TEXT;
ALTER TABLE library_items ADD COLUMN remixed_from_author TEXT;
ALTER TABLE library_items ADD COLUMN remixed_from_choice TEXT;
ALTER TABLE library_items ADD COLUMN origin_id TEXT;
ALTER TABLE library_items ADD COLUMN origin_title TEXT;
ALTER TABLE library_items ADD COLUMN origin_author TEXT;
