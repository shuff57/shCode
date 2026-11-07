// Share-with-class for the texture and sound library (migration 0039
// `library_shares`). A student opts one of their own items into the classes
// they are in; classmates see it at once ("From your class"), and a teacher of
// the class can hide it or take it out of the class library. Hiding never
// touches the owner's own copy.
//
// Who sees what is decided here and nowhere else:
//   - a student sees items shared into a class they are ENROLLED in (unexpired,
//     class not archived), never hidden ones;
//   - a teacher or co-teacher of the class (or an admin) sees every item shared
//     into it, hidden ones included and marked.

export interface SharedRow {
  id: string;
  kind: 'texture' | 'sound';
  name: string;
  bytes: number;
  owner_email: string;
  first_name: string | null;
  last_name: string | null;
  class_id: string;
  class_name: string;
  shared_at: number;
  hidden_at: number | null;
}

/** Classes a student is in right now: unexpired enrollment, class not archived. */
export async function studentClassIds(db: D1Database, email: string, now = Date.now()): Promise<string[]> {
  const r = await db.prepare(
    `SELECT e.class_id AS id FROM enrollments e JOIN classes c ON c.id = e.class_id
      WHERE e.student_email = ? AND e.expires_at > ? AND c.archived_at IS NULL`,
  ).bind(email, now).all<{ id: string }>();
  return (r.results ?? []).map((x) => x.id);
}

/** Classes the caller teaches (owner or co-teacher), not archived. */
export async function teacherClassIds(db: D1Database, email: string): Promise<string[]> {
  const r = await db.prepare(
    `SELECT c.id AS id FROM classes c
      WHERE c.archived_at IS NULL
        AND (c.owner_email = ?1 OR EXISTS (SELECT 1 FROM class_teachers t WHERE t.class_id = c.id AND t.teacher_email = ?1))`,
  ).bind(email).all<{ id: string }>();
  return (r.results ?? []).map((x) => x.id);
}

/** How a classmate's name shows: first name and last initial, never the email. */
export function ownerLabel(first: string | null, last: string | null): string {
  const f = (first ?? '').trim();
  const l = (last ?? '').trim();
  if (f && l) return `${f} ${l[0].toUpperCase()}.`;
  if (f) return f;
  if (l) return `${l[0].toUpperCase()}.`;
  return 'A classmate';
}

/** Every live item shared into any of `classIds`. */
export async function sharedInto(db: D1Database, classIds: string[]): Promise<SharedRow[]> {
  if (!classIds.length) return [];
  const marks = classIds.map(() => '?').join(',');
  const r = await db.prepare(
    `SELECT i.id, i.kind, i.name, i.bytes, i.owner_email, st.first_name, st.last_name,
            s.class_id, c.name AS class_name, s.shared_at, s.hidden_at
       FROM library_shares s
       JOIN library_items i ON i.id = s.item_id AND i.deleted_at IS NULL
       JOIN classes c ON c.id = s.class_id
       LEFT JOIN students st ON st.email = i.owner_email
      WHERE s.class_id IN (${marks})
      ORDER BY s.shared_at DESC`,
  ).bind(...classIds).all<SharedRow>();
  return r.results ?? [];
}
