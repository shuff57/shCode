// GET /api/admin/users — list accounts with class/enrollment counts.
// Admin-only. Non-admin callers receive 403.
//
// ?scope=active   (default) students with a live enrollment in one of the
//                 caller's own non-archived classes
// ?scope=all      every account, including past years and never-enrolled
// ?scope=<id>     students with a live enrollment in that one class
//
// Staff (teacher/admin) are returned under every scope. A roster filter that
// hides the admin hides the only row that can hand out a role, and co-teachers
// have no enrollments at all — so scoping applies to students only.

import { canManageClass } from '../../../_shared/classAuth';

interface Env {
  DB: D1Database;
}

type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, string, SessionData>;

interface UserRow {
  email: string;
  role: string;
  created_at: number;
  classes_owned: number;
  active_enrollments: number;
  active_classes: string | null;
}

export const onRequestGet: PagesFunction<Env, string, SessionData> = async (context: Ctx) => {
  const { request, env, data } = context;

  if (data.role !== 'admin') {
    return json({ error: 'Admin only' }, 403);
  }

  const scope = new URL(request.url).searchParams.get('scope') || 'active';
  const now = Date.now();

  // A specific class is only listable by someone who can manage it, so an
  // admin cannot read another teacher's roster by pasting an id.
  if (scope !== 'active' && scope !== 'all') {
    const { canManage } = await canManageClass(env.DB, data.email, scope);
    if (!canManage) return json({ error: 'Not your class' }, 403);
  }

  // Live enrollment in a class the caller teaches. Narrowed to one class when
  // the scope names one.
  const enrolledHere = `
    EXISTS (
      SELECT 1 FROM enrollments e
      JOIN classes c ON c.id = e.class_id
      WHERE e.student_email = s.email
        AND e.expires_at > ?1
        AND c.archived_at IS NULL
        AND (c.owner_email = ?2 OR c.id IN (
          SELECT class_id FROM class_teachers WHERE teacher_email = ?2
        ))
        ${scope === 'active' ? '' : 'AND c.id = ?3'}
    )`;

  const where =
    scope === 'all'
      ? ''
      : `WHERE s.role != 'student' OR ${enrolledHere}`;

  const query = `
    SELECT
      s.email, s.role, s.created_at,
      (SELECT COUNT(*) FROM classes c WHERE c.owner_email = s.email) AS classes_owned,
      (SELECT COUNT(*) FROM enrollments e
        WHERE e.student_email = s.email AND e.expires_at > ?1) AS active_enrollments,
      (SELECT GROUP_CONCAT(c2.name, ', ') FROM enrollments e2
        JOIN classes c2 ON c2.id = e2.class_id
        WHERE e2.student_email = s.email
          AND e2.expires_at > ?1
          AND c2.archived_at IS NULL) AS active_classes
    FROM students s
    ${where}
    ORDER BY s.created_at DESC`;

  const stmt = env.DB.prepare(query);
  const bound =
    scope === 'all'
      ? stmt.bind(now)
      : scope === 'active'
        ? stmt.bind(now, data.email)
        : stmt.bind(now, data.email, scope);

  const result = await bound.all<UserRow>();

  return json({ users: result.results ?? [], scope });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
