// POST /api/leave-class  body { classId }
//
// A student leaves one of their own classes (the mirror of POST /api/join-class). Like a teacher removing a
// student (DELETE /api/classes/[id]/enrollments/[email]) it deletes only the enrollment: lesson progress, drafts
// and submissions are keyed to the student, not the class, so they are kept, and the class's code lets them back in.
//
// What else stops, because it would otherwise outlive the membership:
//   - their pictures, sounds, fonts and games shared with JUST this class (a share row per class, audience_teacher
//     NULL) leave this class's Library;
//   - a share made with "all of <teacher>'s classes" (migration 0057) stays while they still have another class
//     with that teacher, and ends (every row, and the remembered teacher) when this was their last one.
// Their messages in the class are left as they are (a teacher can still read them; they cannot send any more).
// Students only: a teacher is removed from a class by its owner, and has no enrollment to leave.

interface Env {
  DB: D1Database;
}
type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, string, SessionData>;

export const onRequestPost: PagesFunction<Env, string, SessionData> = async ({ request, env, data }: Ctx) => {
  if (data.role !== 'student') return json({ error: 'Only students leave a class this way.' }, 403);

  let body: { classId?: unknown };
  try {
    body = (await request.json()) as { classId?: unknown };
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  if (typeof body.classId !== 'string' || !body.classId || body.classId.length > 80) return json({ error: 'Choose a class to leave.' }, 400);
  const classId = body.classId;
  const now = Date.now();

  // An enrollment that is over (or never was) reads the same as no such class: nothing to leave.
  const cls = await env.DB.prepare(
    `SELECT c.id, c.name, c.owner_email FROM enrollments e JOIN classes c ON c.id = e.class_id
      WHERE e.class_id = ? AND e.student_email = ? AND e.expires_at > ?`,
  ).bind(classId, data.email, now).first<{ id: string; name: string; owner_email: string }>();
  if (!cls) return json({ error: 'You are not in that class.' }, 404);

  const others = await env.DB.prepare(
    `SELECT 1 AS x FROM enrollments e JOIN classes c ON c.id = e.class_id
      WHERE e.student_email = ? AND e.class_id != ? AND e.expires_at > ? AND c.owner_email = ? LIMIT 1`,
  ).bind(data.email, classId, now, cls.owner_email).first();

  const steps = [
    env.DB.prepare('DELETE FROM enrollments WHERE class_id = ? AND student_email = ?').bind(classId, data.email),
    // Shared with just some classes: out of this one.
    env.DB.prepare(
      `DELETE FROM library_shares WHERE class_id = ? AND item_id IN (SELECT id FROM library_items WHERE owner_email = ? AND audience_teacher IS NULL)`,
    ).bind(classId, data.email),
    env.DB.prepare(
      `DELETE FROM library_game_shares WHERE class_id = ? AND game_id IN (SELECT id FROM library_games WHERE owner_email = ? AND audience_teacher IS NULL)`,
    ).bind(classId, data.email),
  ];
  // That was their last class with this teacher: a share with "all of their classes" has no footing left.
  if (!others) {
    steps.push(
      env.DB.prepare(`DELETE FROM library_shares WHERE item_id IN (SELECT id FROM library_items WHERE owner_email = ?1 AND audience_teacher = ?2)`).bind(data.email, cls.owner_email),
      env.DB.prepare(`UPDATE library_items SET audience_teacher = NULL WHERE owner_email = ?1 AND audience_teacher = ?2`).bind(data.email, cls.owner_email),
      env.DB.prepare(`DELETE FROM library_game_shares WHERE game_id IN (SELECT id FROM library_games WHERE owner_email = ?1 AND audience_teacher = ?2)`).bind(data.email, cls.owner_email),
      env.DB.prepare(`UPDATE library_games SET audience_teacher = NULL WHERE owner_email = ?1 AND audience_teacher = ?2`).bind(data.email, cls.owner_email),
    );
  }
  await env.DB.batch(steps);

  return json({ ok: true, left: { class_id: cls.id, class_name: cls.name } });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
