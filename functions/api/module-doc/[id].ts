// GET /api/module-doc/[id] — admin/teacher only.
// Returns { title, html } — the rendered teacher reference for a curriculum
// module. Reference material is excluded from the static client bundle, so
// this endpoint is the only path by which it reaches the browser. The static
// /module/[id] page must never embed it: TeacherOnly hides display, not
// shipment (measured leak on /module/2.7, 2026-09-18 — see
// scripts/generate-module-docs.mjs).

import { MODULE_DOCS } from '../../_shared/module-docs.generated';

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

  const doc = MODULE_DOCS[id];
  if (!doc) return json({ error: 'No module doc for this id' }, 404);

  return json(doc);
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    status,
  });
}