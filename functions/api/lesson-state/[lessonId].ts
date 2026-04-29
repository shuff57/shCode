// POST   /api/lesson-state/[lessonId]  body { state: 'started' | 'completed', score? }
// DELETE /api/lesson-state/[lessonId]
//
// 'started' is sticky: if a row is already 'completed', a POST with 'started'
// is a no-op (we don't downgrade on mount re-fires).
// 'completed' always upserts, setting completed_at and optional score.
// DELETE removes the row entirely (back to not_opened).
//
// Both verbs are gated by isLessonAccessible — students can't fabricate
// completion on a lesson whose prior siblings aren't done.

import { isLessonAccessible, lockedResponse, type SessionData } from '../../_shared/lessonAccess';

interface Env {
  DB: D1Database;
  ASSETS?: Fetcher;
}
type Ctx = EventContext<Env, 'lessonId', SessionData>;

interface PostBody {
  state: 'started' | 'completed';
  score?: number;
}

export const onRequestPost: PagesFunction<Env, 'lessonId', SessionData> = async (context: Ctx) => {
  const { request, env, data, params } = context;
  const lessonId = params.lessonId;
  if (typeof lessonId !== 'string' || !lessonId) return json({ error: 'lessonId required' }, 400);

  if (!(await isLessonAccessible(env, request, data.role, data.email, lessonId))) {
    return lockedResponse();
  }

  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  if (body.state !== 'started' && body.state !== 'completed') {
    return json({ error: "state must be 'started' or 'completed'" }, 400);
  }

  const now = Date.now();

  if (body.state === 'started') {
    // Insert only if no row exists — keeps 'completed' sticky, keeps started_at stable.
    await env.DB.prepare(
      'INSERT OR IGNORE INTO lesson_state (student_email, lesson_id, state, started_at) VALUES (?, ?, ?, ?)',
    )
      .bind(data.email, lessonId, 'started', now)
      .run();
  } else {
    // Upsert to completed. Preserve started_at if a prior row exists.
    await env.DB.prepare(
      `INSERT INTO lesson_state (student_email, lesson_id, state, started_at, completed_at, score)
       VALUES (?, ?, 'completed', ?, ?, ?)
       ON CONFLICT(student_email, lesson_id) DO UPDATE SET
         state = 'completed',
         completed_at = excluded.completed_at,
         score = excluded.score`,
    )
      .bind(data.email, lessonId, now, now, body.score ?? null)
      .run();
  }

  return json({ ok: true });
};

export const onRequestDelete: PagesFunction<Env, 'lessonId', SessionData> = async (context: Ctx) => {
  const { request, env, data, params } = context;
  const lessonId = params.lessonId;
  if (typeof lessonId !== 'string' || !lessonId) return json({ error: 'lessonId required' }, 400);

  if (!(await isLessonAccessible(env, request, data.role, data.email, lessonId))) {
    return lockedResponse();
  }

  await env.DB.prepare(
    'DELETE FROM lesson_state WHERE student_email = ? AND lesson_id = ?',
  )
    .bind(data.email, lessonId)
    .run();

  return json({ ok: true });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
