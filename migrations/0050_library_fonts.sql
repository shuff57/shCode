-- 0050: fonts in the student Library (moSHion textFont('name'), 2026-11-12).
--
-- library_items.kind was CHECK (kind IN ('texture', 'sound')) (0039), and
-- SQLite cannot change a CHECK constraint in place, so the table is rebuilt
-- with 'font' allowed and every row copied across unchanged: the same
-- columns (0039's, plus 0045's sharing choice and credit), the same ids, the
-- same UNIQUE (owner_email, kind, name) and the same index. Nothing refers to
-- library_items with a FOREIGN KEY (library_shares keys on item_id by value),
-- so dropping and renaming loses no link.
--
-- A font's bytes go to R2 under library/<id> like every other item; the row
-- holds the MIME the server sniffed (font/ttf, font/otf, font/woff,
-- font/woff2). Apply before deploying the code that saves fonts: until then
-- a font save is refused by this CHECK with a 500.

CREATE TABLE library_items_0050 (
  id                  TEXT PRIMARY KEY,
  owner_email         TEXT NOT NULL,
  kind                TEXT NOT NULL CHECK (kind IN ('texture', 'sound', 'font')),
  name                TEXT NOT NULL,
  bytes               INTEGER NOT NULL,
  mime                TEXT NOT NULL,
  meta                TEXT,
  hash                TEXT NOT NULL,
  updated_at          INTEGER NOT NULL,
  deleted_at          INTEGER,
  share_choice        TEXT NOT NULL DEFAULT 'credit',
  remixed_from_id     TEXT,
  remixed_from_title  TEXT,
  remixed_from_author TEXT,
  remixed_from_choice TEXT,
  origin_id           TEXT,
  origin_title        TEXT,
  origin_author       TEXT,
  UNIQUE (owner_email, kind, name)
);

INSERT INTO library_items_0050 (
  id, owner_email, kind, name, bytes, mime, meta, hash, updated_at, deleted_at,
  share_choice, remixed_from_id, remixed_from_title, remixed_from_author, remixed_from_choice,
  origin_id, origin_title, origin_author
)
SELECT
  id, owner_email, kind, name, bytes, mime, meta, hash, updated_at, deleted_at,
  share_choice, remixed_from_id, remixed_from_title, remixed_from_author, remixed_from_choice,
  origin_id, origin_title, origin_author
FROM library_items;

DROP TABLE library_items;
ALTER TABLE library_items_0050 RENAME TO library_items;
CREATE INDEX IF NOT EXISTS idx_library_items_owner ON library_items (owner_email, kind);
