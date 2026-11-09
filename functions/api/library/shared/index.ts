// GET /api/library/shared[?kind=texture|sound]  — the caller's class library
//
// Items classmates (or the caller) shared into a class the caller is in. A
// student never sees hidden ones; a teacher of the class sees them, marked.
// One entry per item even when it is shared into two of the caller's classes.
// Names show as first name and last initial (ownerLabel), never an email.
// Each item carries its `choice` (lib/share-choice.ts) and, when it is itself a
// copy of a classmate's, `remixedFrom`; `canCopy` is false for a "just use"
// item that is not the caller's (GET /api/library/shared/[id] refuses the copy).

import { ownerLabel, sharedInto, studentClassIds, teacherClassIds } from '../../../_shared/libraryShare';
import { itemChoices } from '../../../_shared/shareChoice';
import { canRemix } from '../../../../lib/share-choice';

interface Env {
  DB: D1Database;
}
type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, string, SessionData>;

export const onRequestGet: PagesFunction<Env, string, SessionData> = async ({ env, data, request }: Ctx) => {
  const kind = new URL(request.url).searchParams.get('kind');
  const asStudent = await studentClassIds(env.DB, data.email);
  const asTeacher = data.role === 'student' ? [] : await teacherClassIds(env.DB, data.email);
  const teaches = new Set(asTeacher);
  const rows = await sharedInto(env.DB, [...new Set([...asStudent, ...asTeacher])]);

  const seen = new Map<string, Record<string, unknown>>();
  for (const r of rows) {
    if (kind && r.kind !== kind) continue;
    const canModerate = teaches.has(r.class_id) || data.role === 'admin';
    if (r.hidden_at != null && !canModerate) continue;
    if (seen.has(r.id)) continue;
    seen.set(r.id, {
      id: r.id, kind: r.kind, name: r.name, bytes: r.bytes,
      owner: ownerLabel(r.first_name, r.last_name),
      mine: r.owner_email === data.email,
      classId: r.class_id, className: r.class_name,
      sharedAt: r.shared_at, hidden: r.hidden_at != null,
    });
  }
  const choices = await itemChoices(env.DB, [...seen.keys()]);
  for (const [id, it] of seen) {
    const c = choices.get(id);
    it.choice = c?.choice ?? 'credit';
    it.remixedFrom = c?.remixedFrom ?? null;
    it.canCopy = !!it.mine || canRemix(it.choice);
  }
  return json({ items: [...seen.values()] });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
