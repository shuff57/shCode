-- Private, account-scoped organization; editing an asset never replaces its category.
CREATE TABLE library_categories (
  owner_email TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('game', 'texture', 'sound', 'font', 'upload')),
  category_key TEXT NOT NULL,
  name TEXT NOT NULL,
  PRIMARY KEY (owner_email, kind, category_key)
);
CREATE TABLE library_category_items (
  owner_email TEXT NOT NULL,
  kind TEXT NOT NULL,
  item_key TEXT NOT NULL,
  category_key TEXT NOT NULL,
  PRIMARY KEY (owner_email, kind, item_key),
  FOREIGN KEY (owner_email, kind, category_key)
    REFERENCES library_categories(owner_email, kind, category_key) ON DELETE CASCADE
);
