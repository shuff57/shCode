// POST /api/join-class  body { code }
// Student self-enrolls into a class by its 6-char join code. Teachers
// and admins don't use this path — they're either the owner or a
// co-teacher of the class.

import { getCurrentExpirationDate } from '../_shared/schoolYear';

interface Env {
  DB: D1Database;
}
type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, string, SessionData>;

interface ClassRow {
  id: string;
  name: string;
  code: string;
  owner_email: string;
  archived_at: number | null;
}

export const onRequestPost: PagesFunction<Env, string, SessionData> = async (context: Ctx) => {
  const { request, env, data } = context;
  if (data.role !== 'student') {
    return json({ error: 'Only students can join a class by code' }, 403);
  }

  let body: { code?: string };
  try {
    body = (await request.json()) as { code?: string };
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  const code = (body.code || '').trim().toUpperCase();
  if (!code) return json({ error: 'Class code is required' }, 400);
  if (code.length !== 6) return json({ error: 'Class code must be 6 characters' }, 400);

  const classInfo = await env.DB.prepare(
    'SELECT id, name, code, owner_email, archived_at FROM classes WHERE code = ?',
  )
    .bind(code)
    .first<ClassRow>();
  if (!classInfo) return json({ error: 'Class not found — check the code and try again' }, 404);
  if (classInfo.archived_at) {
    return json({ error: 'This class is no longer accepting students' }, 400);
  }

  const now = Date.now();
  const expiresAt = getCurrentExpirationDate();
  try {
    await env.DB.prepare(
      `INSERT INTO enrollments (class_id, student_email, enrolled_at, enrolled_by, expires_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
      .bind(classInfo.id, data.email, now, null, expiresAt)
      .run();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('UNIQUE')) {
      return json({ error: 'You are already enrolled in this class' }, 409);
    }
    throw err;
  }

  return json(
    {
      ok: true,
      enrollment: {
        class_id: classInfo.id,
        class_name: classInfo.name,
        class_code: classInfo.code,
        enrolled_at: now,
        expires_at: expiresAt,
      },
    },
    201,
  );
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
