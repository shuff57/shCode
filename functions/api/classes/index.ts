// GET  /api/classes       -> list classes for the signed-in teacher/admin
// POST /api/classes        -> create a new class (body: { name })

import { generateClassCode, getTeacherClasses, isTeacherOrAdmin } from '../../_shared/classAuth';
import { getSchoolYear } from '../../_shared/schoolYear';

interface Env {
  DB: D1Database;
}
type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, string, SessionData>;

export const onRequestGet: PagesFunction<Env, string, SessionData> = async (context: Ctx) => {
  const { request, env, data } = context;
  if (!isTeacherOrAdmin(data.role)) return json({ error: 'Teachers only' }, 403);

  const includeArchived = new URL(request.url).searchParams.get('includeArchived') === 'true';
  const classes = await getTeacherClasses(env.DB, data.email, includeArchived);
  return json({ classes });
};

export const onRequestPost: PagesFunction<Env, string, SessionData> = async (context: Ctx) => {
  const { request, env, data } = context;
  if (!isTeacherOrAdmin(data.role)) return json({ error: 'Teachers only' }, 403);

  let body: { name?: string };
  try {
    body = (await request.json()) as { name?: string };
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  const name = (body.name || '').trim();
  if (!name) return json({ error: 'Class name is required' }, 400);
  if (name.length > 100) return json({ error: 'Class name must be 100 characters or less' }, 400);
  if (!/^[a-zA-Z0-9\s\-_'.()&@]+$/.test(name)) {
    return json({ error: 'Class name contains invalid characters' }, 400);
  }

  const id = crypto.randomUUID();
  const code = await generateClassCode(env.DB);
  const schoolYear = getSchoolYear();
  const createdAt = Date.now();

  await env.DB.prepare(
    'INSERT INTO classes (id, name, code, owner_email, school_year, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  )
    .bind(id, name, code, data.email, schoolYear, createdAt)
    .run();

  return json(
    {
      class: {
        id,
        name,
        code,
        owner_email: data.email,
        school_year: schoolYear,
        created_at: createdAt,
        archived_at: null,
        role: 'owner',
        student_count: 0,
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
