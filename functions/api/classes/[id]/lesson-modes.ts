// GET  /api/classes/[id]/lesson-modes        — every override this class has set
// POST /api/classes/[id]/lesson-modes        — set or clear one
//
// Body: { lessonId: string, mode: 'visual' | 'code' | 'both' | null }
//   lessonId '*'  sets the class-wide default
//   mode     null clears the row, falling back to the next rule down

import { canManageClass } from '../../../_shared/classAuth';

interface Env {
  DB: D1Database;
}
type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, 'id', SessionData>;

const MODES = ['visual', 'code', 'both'] as const;
type Mode = (typeof MODES)[number];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function guard(context: Ctx) {
  const { env, data, params } = context;
  const classId = params.id;
  if (typeof classId !== 'string' || !classId) {
    return { error: json({ error: 'classId required' }, 400) };
  }
  const acl = await canManageClass(env.DB, data.email, classId);
  if (!acl.class) return { error: json({ error: 'Class not found' }, 404) };
  if (!acl.canManage && data.role !== 'admin') {
    return { error: json({ error: 'Not authorized for this class' }, 403) };
  }
  return { classId };
}

export const onRequestGet: PagesFunction<Env, 'id', SessionData> = async (context: Ctx) => {
  const g = await guard(context);
  if (g.error) return g.error;

  const rows = await context.env.DB.prepare(
    `SELECT lesson_id, mode, set_by_email, updated_at
       FROM lesson_modes
      WHERE class_id = ?
      ORDER BY lesson_id`
  )
    .bind(g.classId)
    .all<{ lesson_id: string; mode: string; set_by_email: string; updated_at: number }>();

  const list = rows.results ?? [];
  return json({
    // Split so the caller does not have to know that '*' is the sentinel.
    classDefault: list.find((r) => r.lesson_id === '*')?.mode ?? null,
    lessons: list.filter((r) => r.lesson_id !== '*'),
  });
};

export const onRequestPost: PagesFunction<Env, 'id', SessionData> = async (context: Ctx) => {
  const g = await guard(context);
  if (g.error) return g.error;

  let body: { lessonId?: unknown; mode?: unknown };
  try {
    body = await context.request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const lessonId = typeof body.lessonId === 'string' ? body.lessonId.trim() : '';
  if (!lessonId) return json({ error: 'lessonId required' }, 400);

  // null clears. Anything else must be a mode we actually honour, or a teacher
  // would set something the client silently ignores.
  if (body.mode === null) {
    await context.env.DB.prepare('DELETE FROM lesson_modes WHERE class_id = ? AND lesson_id = ?')
      .bind(g.classId, lessonId)
      .run();
    return json({ ok: true, lessonId, mode: null });
  }

  const mode = body.mode as Mode;
  if (!MODES.includes(mode)) {
    return json({ error: `mode must be one of ${MODES.join(', ')}, or null to clear` }, 400);
  }

  await context.env.DB.prepare(
    `INSERT INTO lesson_modes (class_id, lesson_id, mode, set_by_email, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(class_id, lesson_id)
     DO UPDATE SET mode = excluded.mode,
                   set_by_email = excluded.set_by_email,
                   updated_at = excluded.updated_at`
  )
    .bind(g.classId, lessonId, mode, context.data.email, Date.now())
    .run();

  return json({ ok: true, lessonId, mode });
};
