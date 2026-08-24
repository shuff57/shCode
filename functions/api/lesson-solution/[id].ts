// GET /api/lesson-solution/[id] — admin/teacher only.
// Returns { files: Record<path, text>, solution: string } if a solution exists
// for the lesson, otherwise 404. Reference answers are excluded from the static
// client bundle, so this endpoint is the only path by which one reaches the
// browser.
//
// `solution` is the script.js text and is kept for callers that only ever
// wanted the code. `files` is the full set, which is what a multi-file
// assignment (script.js plus README.md, say) needs.

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

  const files = SOLUTIONS[id];
  if (!files || typeof files !== 'object' || Object.keys(files).length === 0) {
    return json({ error: 'No solution for this lesson' }, 404);
  }

  // Fall back to the first entry so a solution that names its code file
  // something other than script.js still populates the legacy field.
  const solution = files['script.js'] ?? files[Object.keys(files).sort()[0]];

  return json({ files, solution });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
