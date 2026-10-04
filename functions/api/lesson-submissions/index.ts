// GET  /api/lesson-submissions?lessonId=X -> list the student's graded submissions
// POST /api/lesson-submissions            -> record one, body:
//   { id, lessonId, response, gradeJson?, score?, possible? }
//
// Append-only history. WrittenGrader POSTs here after each successful grade,
// and also when grading FAILS — that row carries score/possible NULL and a
// gradingFailed marker in gradeJson, so the answer survives an Ollama outage
// and reaches the teacher's review queue instead of dying in localStorage.

import { resolveDueForStudent } from '../../_shared/dueDates';
import { assignVariant, hashSeed } from '../../../lib/quiz-variant';
import { QUIZ_KEYS } from '../../_shared/quiz-keys.generated';
import { scoreQuiz, capFor, kindFor, insertCounted, findMarkerKey, effectiveCap, stripOverrideKeys } from '../../_shared/attempts';

interface Env {
  DB: D1Database;
  ASSETS?: Fetcher;
}
type Ctx = EventContext<Env, string, { email: string; role?: string }>;

interface Row {
  id: string;
  lesson_id: string;
  response: string;
  grade_json: string | null;
  score: number | null;
  possible: number | null;
  submitted_at: number;
}

interface CreateBody {
  id: string;
  lessonId: string;
  response: string;
  gradeJson?: unknown;
  score?: number;
  possible?: number;
}

export const onRequestGet: PagesFunction<Env, string, { email: string; role?: string }> = async (context: Ctx) => {
  const { request, env, data } = context;
  const lessonId = new URL(request.url).searchParams.get('lessonId');
  if (!lessonId) return json({ error: 'lessonId required' }, 400);

  const result = await env.DB.prepare(
    'SELECT id, lesson_id, response, grade_json, score, possible, submitted_at FROM lesson_submissions WHERE student_email = ? AND lesson_id = ? ORDER BY submitted_at DESC',
  )
    .bind(data.email, lessonId)
    .all<Row>();

  return json({
    submissions: (result.results ?? []).map((r) => ({
      id: r.id,
      lessonId: r.lesson_id,
      response: r.response,
      gradeJson: r.grade_json ? JSON.parse(r.grade_json) : null,
      score: r.score,
      possible: r.possible,
      submittedAt: r.submitted_at,
    })),
  });
};

export const onRequestPost: PagesFunction<Env, string, { email: string; role?: string }> = async (context: Ctx) => {
  const { request, env, data } = context;
  let body: CreateBody;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  if (!body.id || !body.lessonId || typeof body.response !== 'string') {
    return json({ error: 'id, lessonId, and response required' }, 400);
  }
  // Teacher marks, AI scores and overrides are the server's to write: whatever the browser sends
  // that looks like one is removed before anything reads or stores it (round 6).
  if (body.gradeJson !== undefined) body.gradeJson = stripOverrideKeys(body.gradeJson);

  const now = Date.now();

  // Stamp the due date that was in force at this instant. Stored as the
  // resolved timestamp, not an is_late flag, so moving a due date later never
  // rewrites what already happened. Never blocks the submit — a resolution
  // failure just records NULL.
  let dueAtSubmit: number | null = null;
  try {
    dueAtSubmit = await resolveDueForStudent(env, request, data.email, body.lessonId);
  } catch {
    dueAtSubmit = null;
  }

  const cap = capFor(body.lessonId);
  // A teacher or admin previewing a capped part is never refused (see effectiveCap).
  if (cap !== undefined) return recordCapped(env, data.email, body, effectiveCap(cap, data.role), now, dueAtSubmit);

  await env.DB.prepare(
    `INSERT INTO lesson_submissions
       (id, student_email, lesson_id, response, grade_json, score, possible, submitted_at, due_at_submit)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      body.id,
      data.email,
      body.lessonId,
      body.response,
      body.gradeJson !== undefined ? JSON.stringify(body.gradeJson) : null,
      body.score ?? null,
      body.possible ?? null,
      now,
      dueAtSubmit,
    )
    .run();

  return json({ ok: true, submittedAt: now, dueAtSubmit, late: dueAtSubmit !== null && now > dueAtSubmit }, 201);
};

// ---------------------------------------------------------------------------
// A CAPPED part (maxSubmissions; .gauntlet/SPEC-attempt-caps.md). Everything the
// browser could use to buy a try, a score or a peek is decided here.
//
// What the browser may NOT do on a capped part:
//   * mark a row as a grading failure and thereby make it free. Such a row is
//     stored as a bare marker with NULL score, so it can be neither a probe nor
//     a mark; the server never scores it.
//   * supply a score the server cannot re-derive. A quiz is scored from the
//     baked key; an AI-graded part's counted row is written by
//     functions/api/grade-written.ts with the grader's own totals, so the
//     browser's relay of it is acknowledged and dropped; a deterministic
//     console part ('client') has no server-side check to re-run -- its report
//     is the only score there is, so it is clamped to a sane range and
//     nothing more. That is the limit of what the server can know there.
//   * make a fourth row: the insert is one conditional statement (see
//     insertCounted), so the cap holds under races and stale tabs.
async function recordCapped(
  env: Env,
  email: string,
  body: CreateBody,
  cap: number,
  now: number,
  dueAtSubmit: number | null,
): Promise<Response> {
  const g = body.gradeJson && typeof body.gradeJson === 'object' ? (body.gradeJson as Record<string, unknown>) : null;
  const row = (gradeJson: unknown, score: number | null, possible: number | null) => ({
    id: body.id,
    email,
    lessonId: body.lessonId,
    response: body.response,
    gradeJson: gradeJson === undefined ? null : JSON.stringify(gradeJson),
    score,
    possible,
    at: now,
    dueAt: dueAtSubmit,
  });
  const done = { ok: true, submittedAt: now, dueAtSubmit, late: dueAtSubmit !== null && now > dueAtSubmit };

  // The grading-failure marker is the SERVER's to write, and only on a capped part's
  // real grader failure (functions/api/grade-written.ts, recordOutage). A marker the
  // browser posts is a free row a student can send at will: each one reaches the
  // review queue as "AI grading failed, needs a manual grade", turns the gradebook
  // cell pending and lets the teacher's override write lesson_state.score, which is
  // a hand-graded extra try. So on a capped part the browser's marker is refused:
  // acknowledged and dropped for an AI part (the server already wrote its own if the
  // grader failed, so a stale page is not an error), a 400 for a quiz or a
  // deterministic part, where no grader exists to fail.
  if (g && (g.gradingFailed === true || findMarkerKey(g))) {
    if (kindFor(body.lessonId) === 'ai' && g.gradingFailed === true) {
      return json({ ...done, recorded: 'server' }, 200);
    }
    return json({ error: 'A grading failure on this part is recorded by the server, not the browser.' }, 400);
  }

  // Past this point a row is never a marker, so no key anywhere in what the
  // browser sent may LOOK like one ("GRADINGFAILED", a fullwidth letter, a nested
  // copy). The count's rule is exact, so a lookalike would be free to one reader
  // and a counted try to another. No honest report carries such a key.
  if (body.gradeJson !== undefined && findMarkerKey(body.gradeJson)) {
    return json({ error: 'gradeJson may not carry a gradingFailed-style key.' }, 400);
  }

  const kind = kindFor(body.lessonId);

  if (kind === 'ai') {
    // grade-written recorded this try itself, with the grader's score.
    return json({ ...done, recorded: 'server' }, 200);
  }

  let stored: ReturnType<typeof row>;
  if (kind === 'quiz') {
    const key = Object.prototype.hasOwnProperty.call(QUIZ_KEYS, body.lessonId) ? QUIZ_KEYS[body.lessonId] : undefined;
    if (!key || !g || !Array.isArray(g.quiz)) return json({ error: 'A hand-in for this quiz must carry its answers.' }, 400);
    // Only the picks are kept: nothing else in the browser's gradeJson is a fact.
    const picks = g.quiz
      .filter((p): p is { id: unknown; picked: unknown } => !!p && typeof p === 'object')
      .slice(0, 200)
      .map((p) => ({ id: String(p.id).slice(0, 80), picked: typeof p.picked === 'number' || typeof p.picked === 'string' ? p.picked : null }));
    const clean = { quiz: picks };
    const marks = scoreQuiz(key, assignVariant(key.variants, hashSeed(`${body.lessonId}:${email}`)), clean);
    stored = row(clean, marks.correct, marks.total);
  } else {
    const ok = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 10000;
    const score = ok(body.score) && ok(body.possible) && body.score <= body.possible ? body.score : null;
    stored = row(body.gradeJson, score, score === null ? null : (body.possible as number));
  }

  if (!(await insertCounted(env.DB, stored, cap))) {
    return json({ error: `All ${cap} tries are already used.`, capReached: true, cap }, 409);
  }
  return json(done, 201);
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
