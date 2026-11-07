-- 0039: a student's own texture and sound library, synced across devices.
--
-- Until now saved textures and mixer sounds lived only in one browser's
-- localStorage (moshion.store.v1). This table is the account copy; the bytes
-- go to R2 (binding UPLOADS) under library/<id>, and D1 holds ownership, size,
-- the opaque meta string the browser stores beside the item (texmeta:/sndmeta:)
-- and a hash the sync uses to tell "changed here" from "changed there".
--
-- A deleted item keeps its row with deleted_at set (a tombstone) so a second
-- device learns the delete instead of uploading its stale copy again. The
-- bytes are removed from R2 at delete time; only the row stays.
--
-- Unlike /uploads/*, nothing here is public: the content route is owner-only.
-- A sketch never fetches it; the host page copies it into the store and the
-- preview bridge hands the frame a data URI (lib/moshion-storage.ts).

CREATE TABLE IF NOT EXISTS library_items (
  id          TEXT PRIMARY KEY,              -- 32 hex chars, CSPRNG
  owner_email TEXT NOT NULL,
  kind        TEXT NOT NULL CHECK (kind IN ('texture', 'sound')),
  name        TEXT NOT NULL,
  bytes       INTEGER NOT NULL,              -- size of the stored data URI
  mime        TEXT NOT NULL,                 -- from the byte sniff, never the client
  meta        TEXT,                          -- the browser's texmeta:/sndmeta: value, opaque
  hash        TEXT NOT NULL,                 -- sha-256 hex of data URI + NUL + meta
  updated_at  INTEGER NOT NULL,
  deleted_at  INTEGER,                       -- NULL = live; set = tombstone
  UNIQUE (owner_email, kind, name)
);
CREATE INDEX IF NOT EXISTS idx_library_items_owner ON library_items (owner_email, kind);

-- Phase 3 (share with my class): a student opts one item into one class's
-- shared library; classmates see it at once, and a teacher of that class can
-- hide it (hidden_at) or the owner can unshare it (row deleted).
CREATE TABLE IF NOT EXISTS library_shares (
  item_id    TEXT NOT NULL,
  class_id   TEXT NOT NULL,
  shared_at  INTEGER NOT NULL,
  hidden_at  INTEGER,
  hidden_by  TEXT,
  PRIMARY KEY (item_id, class_id)
);
CREATE INDEX IF NOT EXISTS idx_library_shares_class ON library_shares (class_id);
