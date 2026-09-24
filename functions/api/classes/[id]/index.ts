// GET /api/classes/[id] -> class detail + active roster. Viewable by the
// owner, any co-teacher, or an admin.

import { canManageClass } from '../../../_shared/classAuth';

interface Env {
  DB: D1Database;
}
type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, 'id', SessionData>;

interface EnrollmentRow {
  student_email: string;
  enrolled_at: number;
  enrolled_by: string | null;
  expires_at: number;
}

export const onRequestGet: PagesFunction<Env, 'id', SessionData> = async (context: Ctx) => {
  const { env, data, params } = context;
  const classId = params.id;
  if (typeof classId !== 'string' || !classId) return json({ error: 'classId required' }, 400);

  const acl = await canManageClass(env.DB, data.email, classId);
  if (!acl.class) return json({ error: 'Class not found' }, 404);
  if (!acl.canManage && data.role !== 'admin') {
    return json({ error: 'Not authorized for this class' }, 403);
  }

  const now = Date.now();
  const enrollments = await env.DB.prepare(
    `SELECT student_email, enrolled_at, enrolled_by, expires_at
       FROM enrollments
      WHERE class_id = ? AND expires_at > ?
      ORDER BY enrolled_at ASC`,
  )
    .bind(classId, now)
    .all<EnrollmentRow>();

  const coTeachers = await env.DB.prepare(
    `SELECT teacher_email, added_at, added_by
       FROM class_teachers
      WHERE class_id = ?
      ORDER BY added_at ASC`,
  )
    .bind(classId)
    .all<{ teacher_email: string; added_at: number; added_by: string | null }>();

  return json({
    class: acl.class,
    isOwner: acl.isOwner,
    roster: enrollments.results ?? [],
    coTeachers: coTeachers.results ?? [],
  });
};

// PATCH /api/classes/[id] -> rename a class.
//
// WHY THIS EXISTS (2026-09-23): the external gradebook-sync tool pairs each
// Aeries gradebook with a source course by an explicit leading period number in
// the class name ("5 Intro Prog 2627"). shCode classes had no such prefix and
// there was NO way to add one: the schema supports `name`, but nothing ever
// UPDATEd it (only archive and regenerate-code exist), and there is no rename UI.
// So the name was effectively immutable after creation, and once classes move
// period in a new school year they could not be re-paired.
//
// Shaped as PATCH on the class resource rather than a bespoke /rename route: it
// is a partial update of an existing resource, which is exactly what PATCH means.
//
// Auth mirrors onRequestGet above (same canManageClass check, same admin bypass).
// Validation mirrors the CREATE path in functions/api/classes/index.ts exactly —
// the same rules, deliberately, so a rename can never accept a name that creation
// would have rejected and leave the class in a state the rest of the app assumes
// cannot exist.
export const onRequestPatch: PagesFunction<Env, 'id', SessionData> = async (context: Ctx) => {
  const { request, env, data, params } = context;
  const classId = params.id;
  if (typeof classId !== 'string' || !classId) return json({ error: 'classId required' }, 400);
  if (data.role !== 'teacher' && data.role !== 'admin') return json({ error: 'Teachers only' }, 403);

  const acl = await canManageClass(env.DB, data.email, classId);
  if (!acl.class) return json({ error: 'Class not found' }, 404);
  if (!acl.canManage && data.role !== 'admin') {
    return json({ error: 'Not authorized for this class' }, 403);
  }

  let body: { name?: string };
  try {
    body = (await request.json()) as { name?: string };
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const name = (body.name || '').trim();
  if (!name) return json({ error: 'Class name is required' }, 400);
  if (name.length > 100) return json({ error: 'Class name must be 100 characters or less' }, 400);
  if (!/^[a-zA-Z0-9\s\-_'.()&@]+$/.test(name)) return json({ error: 'Class name contains invalid characters' }, 400);

  // A no-op rename returns the class unchanged rather than issuing a pointless
  // write, so a caller re-sending the same name is not treated as an error.
  if (name === acl.class.name) return json({ class: acl.class, changed: false });

  await env.DB.prepare('UPDATE classes SET name = ? WHERE id = ?').bind(name, classId).run();
  return json({ class: { ...acl.class, name }, changed: true });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
