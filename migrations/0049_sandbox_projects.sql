-- 0049: sandbox projects. A student keeps several sandbox programs at once,
-- each with a name and a type (js | moshion | reshape | flow).
--
-- This table holds only the list: the name and type of each project. The code
-- is where every sandbox draft already is, keyed by lesson id: lesson_sync (the
-- current saved copy), lesson_sync_history (Cloud history) and the browser's
-- draft. A project's lesson id is `sandbox-<mode>` for the four sandboxes that
-- existed before projects (their `id` is the mode's own id, so nobody's code
-- moves) and `sandbox-<mode>-<id>` for a new one (lib/sandbox-projects-core.ts).
--
-- `deleted_at` is a tombstone: a deleted project stays as a row so another
-- device learns it is gone instead of putting it back, and so an old
-- sandbox the student deleted is not seeded again. Deleting also removes that
-- lesson id's lesson_sync and lesson_sync_history rows. At most 30 live rows an
-- account, enforced by the route.

CREATE TABLE IF NOT EXISTS sandbox_projects (
  student_email TEXT    NOT NULL,
  id            TEXT    NOT NULL,
  mode          TEXT    NOT NULL,
  name          TEXT    NOT NULL,
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL,
  deleted_at    INTEGER,
  PRIMARY KEY (student_email, id)
);
