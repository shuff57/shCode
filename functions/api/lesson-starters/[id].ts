// GET /api/lesson-starters/[id] — admin/teacher only.
// Returns { files: Record<string, string> } with the original starter file tree
// for the given lesson, so the teacher-edit page can diff student work against
// what the student started with.

import { STARTERS } from '../../_shared/lesson-starters.generated';

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

  const files = STARTERS[id];
  if (!files) {
    return json({ error: 'No starter files for this lesson' }, 404);
  }

  return json({ files });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
