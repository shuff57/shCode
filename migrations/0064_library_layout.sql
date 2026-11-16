-- Folder keys stay stable when labels change. Hidden defaults do not reappear.
ALTER TABLE library_categories ADD COLUMN position INTEGER NOT NULL DEFAULT 0;
ALTER TABLE library_categories ADD COLUMN hidden INTEGER NOT NULL DEFAULT 0;
CREATE TABLE library_item_layout (
  owner_email TEXT NOT NULL,
  kind TEXT NOT NULL,
  item_key TEXT NOT NULL,
  label TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  hidden INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (owner_email, kind, item_key)
);
