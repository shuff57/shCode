// POST /api/classes/[id]/delete
// Permanently removes the class row, its enrollments, class_teachers rows,
// and all progress data (lesson_state, commits, lesson_submissions,
// lesson_drafts) for students whose ONLY enrollment was in this class.
// Students enrolled in at least one other class keep their progress data.
//
// POST (not DELETE) because Cloudflare Pages Functions route body-carrying
// DELETEs inconsistently on some CDN paths; POST with an explicit "delete"
// action is safer and matches how archive.ts handles its toggle.

import { canManageClass } from '../../../_shared/classAuth';

interface Env {
  DB: D1Database;
}
type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, 'id', SessionData>;

// D1 batch result shape — each statement returns a result object with meta.
interface D1BatchResult {
  meta: { changes: number };
}

export const onRequestPost: PagesFunction<Env, 'id', SessionData> = async (context: Ctx) => {
  const { env, data, params } = context;
  const classId = params.id;
  if (typeof classId !== 'string' || !classId) return json({ error: 'classId required' }, 400);

  const acl = await canManageClass(env.DB, data.email, classId);
  if (!acl.class) return json({ error: 'Class not found' }, 404);
  if (!acl.isOwner && data.role !== 'admin') {
    return json({ error: 'Only the class owner can delete' }, 403);
  }

  // Subquery used in every progress-data DELETE:
  // selects students in this class who have NO other enrollment.
  const purgeWhere = `
    student_email IN (
      SELECT student_email FROM enrollments WHERE class_id = ?1
    )
    AND student_email NOT IN (
      SELECT student_email FROM enrollments WHERE class_id != ?1
    )
  `;

  const results = (await env.DB.batch([
    // 1–4: purge progress data for students whose only class this was
    env.DB.prepare(`DELETE FROM lesson_state WHERE ${purgeWhere}`).bind(classId),
    env.DB.prepare(`DELETE FROM commits WHERE ${purgeWhere}`).bind(classId),
    env.DB.prepare(`DELETE FROM lesson_submissions WHERE ${purgeWhere}`).bind(classId),
    env.DB.prepare(`DELETE FROM lesson_drafts WHERE ${purgeWhere}`).bind(classId),
    // 5: count students being purged (before deleting enrollments)
    //    We approximate via the enrollments delta — everyone in this class
    //    minus those also in another class.
    env.DB.prepare(`
      SELECT COUNT(*) AS cnt FROM enrollments
      WHERE class_id = ?1
        AND student_email NOT IN (
          SELECT student_email FROM enrollments WHERE class_id != ?1
        )
    `).bind(classId),
    // 6–8: remove the class itself
    env.DB.prepare('DELETE FROM enrollments WHERE class_id = ?').bind(classId),
    env.DB.prepare('DELETE FROM class_teachers WHERE class_id = ?').bind(classId),
    env.DB.prepare('DELETE FROM classes WHERE id = ?').bind(classId),
  ])) as unknown as D1BatchResult[];

  const studentsPurged =
    (results[4] as unknown as { results: { cnt: number }[] }).results[0]?.cnt ?? 0;

  return json({
    ok: true,
    purged: {
      students: studentsPurged,
      lesson_state: results[0].meta.changes,
      commits: results[1].meta.changes,
      lesson_submissions: results[2].meta.changes,
      lesson_drafts: results[3].meta.changes,
      enrollments: results[5].meta.changes,
    },
  });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
