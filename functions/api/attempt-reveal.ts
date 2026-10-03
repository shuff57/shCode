// GET /api/attempt-reveal?lessonId=X -> the solution to a capped performance-
// assessment part, as pseudocode, once THIS student has spent every try.
//
// WHY THIS IS GUARDED. The pseudocode is the answer. It is baked into the worker
// (functions/_shared/pa-pseudocode.generated.ts), never served as a static asset,
// and every path that returns it sits BELOW the attempt count. The count is read
// from lesson_submissions for the session's email, with the rule in
// lib/attempt-cap.ts (a row written because grading failed spends nothing, and
// nothing before COUNT_SINCE counts). The cap itself is the server's own copy,
// never a number from the request. Fails closed: an unknown or uncapped lesson
// is 404 and a lesson with no pseudocode written yet is 404, none of them 200.
//
// Sibling of functions/api/quiz-reveal.ts. A quiz's answer key is released there.
// Both are released the same way: every try spent AND the teacher's per-class release
// (spec "Release"), and a 403 here carries a machine-readable `reason`:
// 'enrollment' | 'tries' | 'not-released'.

import { decideReveal } from '../../lib/attempt-cap';
import { ATTEMPT_CAPS, PA_PSEUDOCODE } from '../_shared/pa-pseudocode.generated';
import { attemptsUsed, mayReadAnswer } from '../_shared/attempts';
import { studentReleaseStatus } from '../_shared/solutionRelease';

interface Env {
  DB: D1Database;
  ASSETS?: Fetcher;
}
type Ctx = EventContext<Env, string, { email: string; role?: string }>;

export const onRequestGet: PagesFunction<Env, string, { email: string; role?: string }> = async (context: Ctx) => {
  const { request, env, data } = context;
  if (!data.email) return json({ error: 'Not signed in' }, 401);

  const lessonId = new URL(request.url).searchParams.get('lessonId');
  if (!lessonId) return json({ error: 'lessonId required' }, 400);

  const cap = Object.prototype.hasOwnProperty.call(ATTEMPT_CAPS, lessonId) ? ATTEMPT_CAPS[lessonId] : undefined;
  const text = Object.prototype.hasOwnProperty.call(PA_PSEUDOCODE, lessonId) ? PA_PSEUDOCODE[lessonId] : undefined;

  // Not capped, or no pseudocode written: nothing to reveal, and no count is
  // read, so the response says nothing about the student's attempts either.
  if (decideReveal(cap, Number.MAX_SAFE_INTEGER, text !== undefined) !== 'open') {
    return json({ error: 'No solution is available for this part.' }, 404);
  }

  // A teacher or admin can always preview: neither the tries nor the release applies,
  // so a teacher (or a self-hosting teacher with no class) can read what a student
  // will see.
  if (data.role === 'teacher' || data.role === 'admin') return json({ pseudocode: text });

  // Who may be handed an answer at all: a student enrolled in a live class that has
  // this lesson open (mayReadAnswer). Checked before the count, so an account that is
  // not in a class learns nothing about its tries.
  if (!(await mayReadAnswer(env, request, data.email, data.role, lessonId))) {
    return json({
      error: 'The solution is shown to students enrolled in a class that has opened this part.',
      reason: 'enrollment',
    }, 403);
  }

  // Two conditions, both required. First every try is spent...
  const used = await attemptsUsed(env.DB, data.email, lessonId);
  if (decideReveal(cap, used, true) !== 'open') {
    return json({ error: 'The solution appears after your last try.', reason: 'tries' }, 403);
  }

  // ...then one of the student's live classes must have released this part
  // (class_solution_releases, migration 0032: "release now" or a date that has
  // arrived, compared with the server clock here on every request). A database error
  // fails closed: no solution and no guess about why.
  const now = Date.now();
  let release;
  try {
    release = await studentReleaseStatus(env, request, data.email, lessonId, now);
  } catch {
    return json({ error: 'Could not check whether your teacher has released this. Try again.' }, 503);
  }
  if (!release.released) {
    return json({
      error: 'Your teacher has not released the solution yet.',
      reason: 'not-released',
      scheduledAt: release.scheduledAt,
      now,
      cap,
    }, 403);
  }
  return json({ pseudocode: text });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
