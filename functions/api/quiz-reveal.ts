// GET /api/quiz-reveal?lessonId=X -> the answer key for the caller's OWN form
// of a summative quiz, handed back only after they have submitted it.
//
// WHY THIS IS GUARDED. A summative quiz reaches the browser with its key
// stripped (lib/quiz-redact.ts) — View Source must never show it. This route
// is the narrow exception: server-side, per request, per student, and only
// after a lesson_submissions row proves the attempt happened. Every path that
// returns key text sits BELOW the submission check.
//
// The key itself is never read from the request. It comes from
// functions/_shared/quiz-keys.generated.ts (baked from lessons/*/lesson.json
// by scripts/generate-quiz-keys.mjs), the same trust rule as
// functions/_shared/aiGraders.ts: authored config is server-side or it is not
// trusted. Unlike that file's public/ JSON, the key store is bundled into the
// worker, because a public asset is fetchable by anyone.
//
// Auth is the middleware at functions/_middleware.ts: every /api/* route but
// /api/auth/* arrives with a verified session, and this handler also refuses
// a missing email itself so it is safe when driven directly in tests.

import { assignVariant, hashSeed } from '../../lib/quiz-variant';
import { QUIZ_KEYS } from '../_shared/quiz-keys.generated';

interface Env {
  DB: D1Database;
}
type Ctx = EventContext<Env, string, { email: string }>;

export const onRequestGet: PagesFunction<Env, string, { email: string }> = async (context: Ctx) => {
  const { request, env, data } = context;
  if (!data.email) return json({ error: 'Not signed in' }, 401);

  const lessonId = new URL(request.url).searchParams.get('lessonId');
  if (!lessonId) return json({ error: 'lessonId required' }, 400);

  // Absent from the store = not a summative quiz (the store only carries
  // summative ones), so there is no reveal to hand out for it. Fails closed.
  const key = QUIZ_KEYS[lessonId];
  if (!key) return json({ error: 'No reveal exists for this lesson.' }, 403);

  // The whole gate: no recorded attempt, no marking. One row is enough —
  // a partial hand-in is a row too, and the paper stays open by design.
  const row = await env.DB.prepare(
    'SELECT id FROM lesson_submissions WHERE student_email = ? AND lesson_id = ? LIMIT 1',
  )
    .bind(data.email, lessonId)
    .first<{ id: string }>();
  if (!row) return json({ error: 'The answers appear after you hand in the test.' }, 403);

  // The form this student sat, resolved exactly as the client does — same
  // lib, same seed — so the marking is against their own paper.
  const variant = assignVariant(key.variants, hashSeed(`${lessonId}:${data.email}`));
  const mine = variant === null ? key.questions : key.questions.filter((q) => !q.variant || q.variant === variant);
  return json({
    variant,
    answers: mine.map((q) => ({
      id: q.id,
      answer: q.answer,
      optionText: q.optionText,
      explanation: q.explanation,
    })),
  });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
