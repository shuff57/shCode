// POST /api/requirement-events
// Body: { lessonId, results: [{ reqId, fails, passed }] } -- what happened over several Runs of a
// console lab, batched by the browser (lib/requirement-batch.ts). Feeds the teacher's "Most missed"
// panel (GET /api/classes/[id]/requirement-events). Best effort and informational: nothing that
// decides a grade, completion or Submit reads requirement_events.
//
// The student email comes from the session only. A teacher or admin posting (previewing a lab) is
// accepted but nothing is stored, so previews cannot pollute the data.

import { lessonInCatalog } from '../_shared/lessonUnit';

interface Env {
  DB: D1Database;
  ASSETS?: Fetcher;
}
type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };

const MAX_RESULTS = 60;
const MAX_REQ_ID = 80;
const MAX_FAILS_PER_RESULT = 50;
const MAX_STORED_FAILS = 10_000;
/** Distinct requirement rows one student may hold for one lesson (real labs have a handful). */
const MAX_ROWS_PER_LESSON = 200;
const MAX_BODY_BYTES = 16_000;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

export const onRequestPost: PagesFunction<Env, any, SessionData> = async (context) => {
  const { env, data, request } = context;

  const text = await request.text().catch(() => '');
  if (text.length > MAX_BODY_BYTES) return json({ error: 'Body too large' }, 400);
  let body: any;
  try {
    body = JSON.parse(text);
  } catch {
    return json({ error: 'Body must be JSON' }, 400);
  }
  if (!body || typeof body !== 'object') return json({ error: 'Body must be an object' }, 400);

  const { lessonId, results } = body as { lessonId?: unknown; results?: unknown };
  if (typeof lessonId !== 'string' || !lessonId || lessonId.length > 200) {
    return json({ error: 'lessonId is required' }, 400);
  }
  if (!Array.isArray(results) || results.length === 0) return json({ error: 'results is required' }, 400);
  if (results.length > MAX_RESULTS) return json({ error: `At most ${MAX_RESULTS} results per request` }, 400);

  const clean: { reqId: string; fails: number; passed: boolean }[] = [];
  for (const r of results) {
    if (!r || typeof r !== 'object') return json({ error: 'Each result must be an object' }, 400);
    const { reqId, fails, passed } = r as { reqId?: unknown; fails?: unknown; passed?: unknown };
    if (typeof reqId !== 'string' || !reqId || reqId.length > MAX_REQ_ID) {
      return json({ error: `reqId must be 1-${MAX_REQ_ID} characters` }, 400);
    }
    if (typeof fails !== 'number' || !Number.isInteger(fails) || fails < 0 || fails > MAX_FAILS_PER_RESULT) {
      return json({ error: `fails must be an integer from 0 to ${MAX_FAILS_PER_RESULT}` }, 400);
    }
    if (typeof passed !== 'boolean') return json({ error: 'passed must be true or false' }, 400);
    clean.push({ reqId, fails, passed });
  }

  const known = await lessonInCatalog(env, request, lessonId);
  if (known === null) return json({ error: 'Lesson catalog unavailable' }, 503);
  if (!known) return json({ error: 'Unknown lesson' }, 400);

  // A teacher previewing a lab must not pollute the numbers.
  if (data.role !== 'student') return json({ ok: true, stored: false });

  const email = data.email;
  const have = await env.DB
    .prepare('SELECT COUNT(*) AS n FROM requirement_events WHERE student_email = ?1 AND lesson_id = ?2')
    .bind(email, lessonId)
    .first<{ n: number }>();
  if ((have?.n ?? 0) >= MAX_ROWS_PER_LESSON) return json({ error: 'Too many requirements recorded for this lesson' }, 429);

  const now = Date.now();
  const upsert = () => env.DB.prepare(
    `INSERT INTO requirement_events (student_email, lesson_id, req_id, fails, first_pass_at, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6)
     ON CONFLICT (student_email, lesson_id, req_id) DO UPDATE SET
       fails = MIN(?7, requirement_events.fails + excluded.fails),
       first_pass_at = COALESCE(requirement_events.first_pass_at, excluded.first_pass_at),
       updated_at = excluded.updated_at`,
  );
  await env.DB.batch(
    clean.map((r) => upsert().bind(email, lessonId, r.reqId, r.fails, r.passed ? now : null, now, MAX_STORED_FAILS)),
  );
  return json({ ok: true, stored: true });
};
