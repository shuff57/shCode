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
import { capFor, bestScoreOverAllRows, scoreOverride, hasAnyRow } from '../../_shared/attempts';

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
    //
    // On a CAPPED part the best try counts (spec: .gauntlet/SPEC-attempt-caps.md)
    // and the score is NOT the browser's: it is the best score over the student's rows
    // (or the teacher's persisted override), read here from the server's own tables. `body.score` is ignored. A
    // number the browser sent could not be checked, and because a capped score
    // can only rise, a forged one would have been permanent. The stored value
    // still only ever goes up (a failed grade or an unsubmit-less re-completion
    // leaves it alone). Uncapped lessons keep `score = excluded.score`, because a
    // formative retake may legitimately replace its score -- but a score must be
    // a finite number >= 0 there too.
    const capped = capFor(lessonId) !== undefined;
    const staff = data.role === 'teacher' || data.role === 'admin';
    let score: number | null;
    if (capped) {
      // A capped part is completed by HANDING SOMETHING IN, never by asking. With no
      // row at all there is nothing to complete: the old path stored a NULL score,
      // and lessonPercent() reads a completed lesson with no score as 100, so a
      // student who never sat the part outscored one who sat it and lost points.
      // A teacher or admin previewing the part has no hand-in to make.
      if (!staff && !(await hasAnyRow(env.DB, data.email, lessonId))) {
        return json({ error: 'Hand in a try before this part can be completed.', needsTry: true }, 409);
      }
      // A teacher's "use this as the score" (replaceBest) is persisted in
      // lesson_state.score_override and WINS: a student's completion request must not undo it
      // (round 5 finding 1: a 0 the teacher set was back to 4 after one curl). Otherwise the
      // best score over EVERY row (tries, the pre-go-live best, a teacher's mark on an
      // outage row), 0 -- never NULL -- when none carries a score. NULL would grade as 100;
      // the teacher's mark from the review queue, or the next real try, replaces the 0.
      score = (await scoreOverride(env.DB, data.email, lessonId))
        ?? (await bestScoreOverAllRows(env.DB, data.email, lessonId))
        ?? 0;
    } else if (body.score === undefined || body.score === null) {
      score = null;
    } else if (typeof body.score === 'number' && Number.isFinite(body.score) && body.score >= 0 && body.score <= 100000) {
      score = body.score;
    } else {
      return json({ error: 'score must be a finite number between 0 and 100000' }, 400);
    }
    const scoreSql = capped
      ? `CASE
           WHEN lesson_state.score_override IS NOT NULL THEN lesson_state.score_override
           WHEN excluded.score IS NULL THEN lesson_state.score
           WHEN lesson_state.score IS NULL THEN excluded.score
           ELSE MAX(lesson_state.score, excluded.score)
         END`
      : 'excluded.score';
    await env.DB.prepare(
      `INSERT INTO lesson_state (student_email, lesson_id, state, started_at, completed_at, score)
       VALUES (?, ?, 'completed', ?, ?, ?)
       ON CONFLICT(student_email, lesson_id) DO UPDATE SET
         state = 'completed',
         completed_at = excluded.completed_at,
         score = ${scoreSql}`,
    )
      .bind(data.email, lessonId, now, now, score)
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

  // A capped part is reopened by the teacher (lesson-unsubmit), not by the student.
  // The row may carry a mark the teacher wrote from the review queue, and deleting
  // it let a student erase that mark and then re-complete the part (see POST).
  if (capFor(lessonId) !== undefined && data.role !== 'teacher' && data.role !== 'admin') {
    return json({ error: 'Ask your teacher to reopen this part.' }, 409);
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
