// GET /api/lesson-solution/[id] — admin/teacher only.
// Returns { solution: string } if a solution exists for the lesson, otherwise
// 404. solution.js files are excluded from the static client bundle, so this
// endpoint is the only path by which a reference answer reaches the browser.

import { SOLUTIONS } from '../../_shared/solutions.generated';

type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };
interface Env {}
type Ctx = EventContext<Env, 'id', SessionData>;

export const onRequestGet: PagesFunction<Env, 'id', SessionData> = async (context: Ctx) => {
  const { data, params } = context;

  if (data.role !== 'admin' && data.role !== 'teacher') {
    return json({ error: 'Forbidden' }, 403);
  }

  const id = typeof params.id === 'string' ? decodeURIComponent(params.id) : '';
  if (!id) return json({ error: 'id required' }, 400);

  const solution = SOLUTIONS[id];
  if (typeof solution !== 'string') {
    return json({ error: 'No solution for this lesson' }, 404);
  }

  return json({ solution });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
