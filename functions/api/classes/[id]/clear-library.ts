// POST /api/classes/[id]/clear-library  { email }
//
// A teacher clears one student's whole Library: every picture, sound, uploaded
// image and published game, on every computer. Owner, co-teacher or admin of
// the class only, and only for a role='student' account enrolled in this class
// now (a teacher or an admin is refused, whatever class they sit in).
// Library items and games become tombstones so the student's other computers
// drop them on the next sync; their class shares go; upload rows are deleted;
// every R2 object behind them is removed. Answers the counts.
// Rules: functions/_shared/libraryDelete.ts.

import { normalizeEmail } from '../../../_shared/auth';
import { clearLibraryOf, json, refuseUnlessClassTeacher, studentStanding, type SessionData } from '../../../_shared/libraryDelete';

interface Env {
  DB: D1Database;
  UPLOADS: R2Bucket;
}
type Ctx = EventContext<Env, 'id', SessionData>;

export const onRequestPost: PagesFunction<Env, 'id', SessionData> = async ({ params, env, data, request }: Ctx) => {
  const classId = String(params.id);
  const refused = await refuseUnlessClassTeacher(env.DB, data, classId);
  if (refused) return refused;
  let body: { email?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  const email = normalizeEmail(typeof body.email === 'string' ? body.email : '');
  if (!email) return json({ error: 'email required' }, 400);
  const standing = await studentStanding(env.DB, classId, email);
  if (standing === 'not-enrolled') return json({ error: 'That student is not in this class.' }, 404);
  if (standing === 'no-account') return json({ error: 'That student has not made an account yet, so there is nothing to clear.' }, 404);
  if (standing === 'not-student') return json({ error: "Only a student's Library can be cleared." }, 403);
  const counts = await clearLibraryOf(env.DB, env.UPLOADS, email);
  return json({ ok: true, ...counts });
};
