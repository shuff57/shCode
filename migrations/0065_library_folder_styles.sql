-- Folder appearance is account-scoped; the admin's built-in catalog uses its shared owner.
ALTER TABLE library_categories ADD COLUMN icon TEXT NOT NULL DEFAULT 'folder'
  CHECK (icon IN ('folder', 'star', 'sparkles', 'rocket', 'gamepad', 'music', 'image', 'heart', 'book', 'code'));
ALTER TABLE library_categories ADD COLUMN color TEXT NOT NULL DEFAULT 'purple'
  CHECK (color IN ('purple', 'pink', 'cyan', 'green', 'orange', 'yellow', 'red', 'gray'));
