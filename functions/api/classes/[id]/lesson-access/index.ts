// GET /api/classes/[id]/lesson-access?lessonId=<id>
//   -> { studentEmails: string[] } -- who has a standing early-access grant
//      for that one lesson. lessonId is required: this is read by a
//      per-lesson checkbox popover, never a whole-class dump the way
//      due-dates/open-dates are, because a class's roster times its lesson
//      count is a much bigger response for a UI that only ever needs one
//      lesson's slice of it.
//
// PUT /api/classes/[id]/lesson-access
//   body { entries: [{ studentEmail, lessonId, granted: boolean }] }
//   `granted: true` inserts (or no-ops if already granted), `false` deletes.
//   Batched the same way due-dates/open-dates are: a teacher checking three
//   boxes in the same popover should not risk two landing and one failing
//   silently.
//
// Both are teacher-only (owner, co-teacher, or admin) via canManageClass,
// same as every other class-scoped route here.
//
// This does NOT enforce anything server-side. Same boundary the open-date
// lock itself already has -- see migrations/0024's comment and
// lib/due-dates.ts's lessonAvailability, which is where a grant here
// actually takes effect for a student.

import { canManageClass } from '../../../../_shared/classAuth';
import { normalizeEmail } from '../../../../_shared/auth';

interface Env {
  DB: D1Database;
}
type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, 'id', SessionData>;

const MAX_ENTRIES = 200; // one class roster's worth, generously

interface Entry {
  studentEmail: string;
  lessonId: string;
  granted: boolean;
}

interface Row {
  student_email: string;
}

export const onRequestGet: PagesFunction<Env, 'id', SessionData> = async (context: Ctx) => {
  const { request, env, data, params } = context;
  const classId = params.id;
  if (typeof classId !== 'string' || !classId) return json({ error: 'classId required' }, 400);

  const acl = await canManageClass(env.DB, data.email, classId);
  if (!acl.class) return json({ error: 'Class not found' }, 404);
  if (!acl.canManage && data.role !== 'admin') return json({ error: 'Not authorized' }, 403);

  const lessonId = new URL(request.url).searchParams.get('lessonId');
  if (!lessonId) return json({ error: 'lessonId query param required' }, 400);

  const result = await env.DB
    .prepare(
      'SELECT student_email FROM lesson_access_overrides WHERE class_id = ? AND lesson_id = ? ORDER BY student_email',
    )
    .bind(classId, lessonId)
    .all<Row>();

  return json({ studentEmails: (result.results ?? []).map((r) => r.student_email) });
};

export const onRequestPut: PagesFunction<Env, 'id', SessionData> = async (context: Ctx) => {
  const { request, env, data, params } = context;
  const classId = params.id;
  if (typeof classId !== 'string' || !classId) return json({ error: 'classId required' }, 400);

  const acl = await canManageClass(env.DB, data.email, classId);
  if (!acl.class) return json({ error: 'Class not found' }, 404);
  if (!acl.canManage && data.role !== 'admin') return json({ error: 'Not authorized' }, 403);

  let body: { entries?: Entry[] };
  try {
    body = (await request.json()) as { entries?: Entry[] };
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const entries = body.entries;
  if (!Array.isArray(entries)) return json({ error: 'entries array required' }, 400);
  if (entries.length === 0) return json({ ok: true, granted: 0, revoked: 0 });
  if (entries.length > MAX_ENTRIES) return json({ error: `At most ${MAX_ENTRIES} entries per request` }, 400);

  const now = Date.now();
  const statements: D1PreparedStatement[] = [];
  let granted = 0;
  let revoked = 0;

  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') return json({ error: 'Malformed entry' }, 400);
    const email = normalizeEmail(entry.studentEmail || '');
    if (!email) return json({ error: 'studentEmail required' }, 400);
    if (typeof entry.lessonId !== 'string' || entry.lessonId.length === 0 || entry.lessonId.length > 200) {
      return json({ error: 'lessonId must be a non-empty string' }, 400);
    }
    if (typeof entry.granted !== 'boolean') return json({ error: 'granted must be a boolean' }, 400);

    if (entry.granted) {
      statements.push(
        env.DB
          .prepare(
            `INSERT INTO lesson_access_overrides (class_id, student_email, lesson_id, granted_by, granted_at)
               VALUES (?, ?, ?, ?, ?)
             ON CONFLICT (class_id, student_email, lesson_id)
               DO UPDATE SET granted_by = excluded.granted_by, granted_at = excluded.granted_at`,
          )
          .bind(classId, email, entry.lessonId, data.email, now),
      );
      granted++;
    } else {
      statements.push(
        env.DB
          .prepare(
            'DELETE FROM lesson_access_overrides WHERE class_id = ? AND student_email = ? AND lesson_id = ?',
          )
          .bind(classId, email, entry.lessonId),
      );
      revoked++;
    }
  }

  await env.DB.batch(statements);

  return json({ ok: true, granted, revoked });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
