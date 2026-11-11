// PATCH  /api/sandbox-projects/[id] { name } -> { project }   rename
// DELETE /api/sandbox-projects/[id]          -> { ok: true }   delete
//
// One of the signed-in student's sandbox projects (migration 0049). A missing
// id and someone else's id both answer 404: the WHERE carries the session email.
//
// Delete leaves a tombstone row (so another device drops the project rather
// than putting it back) and removes the project's saved code: its lesson_sync
// row and its Cloud history. One batch, so a project cannot be left half
// deleted. The browser clears its own draft and This-device history.

import { cleanName, isModeId, projectLessonId } from '../../../lib/sandbox-projects-core';
import { json, toProject, type ProjectRow } from '../../_shared/sandboxProjects';

interface Env {
  DB: D1Database;
}
type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, 'id', SessionData>;

async function liveRow(context: Ctx): Promise<ProjectRow | null> {
  const id = context.params.id;
  if (typeof id !== 'string' || !id) return null;
  return context.env.DB.prepare(
    `SELECT id, mode, name, created_at, updated_at, deleted_at FROM sandbox_projects
      WHERE student_email = ? AND id = ? AND deleted_at IS NULL`,
  ).bind(context.data.email, decodeURIComponent(id)).first<ProjectRow>();
}

export const onRequestPatch: PagesFunction<Env, 'id', SessionData> = async (context: Ctx) => {
  let body: { name?: unknown };
  try {
    body = (await context.request.json()) as typeof body;
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  const name = cleanName(body?.name);
  if (!name) return json({ error: 'Give the project a name.' }, 400);
  const row = await liveRow(context);
  if (!row) return json({ error: 'Project not found' }, 404);
  const now = Date.now();
  await context.env.DB.prepare(
    'UPDATE sandbox_projects SET name = ?, updated_at = ? WHERE student_email = ? AND id = ?',
  ).bind(name, now, context.data.email, row.id).run();
  return json({ project: toProject({ ...row, name, updated_at: now }) });
};

export const onRequestDelete: PagesFunction<Env, 'id', SessionData> = async (context: Ctx) => {
  const row = await liveRow(context);
  if (!row || !isModeId(row.mode)) return json({ error: 'Project not found' }, 404);
  const { DB } = context.env;
  const email = context.data.email;
  const lessonId = projectLessonId({ id: row.id, mode: row.mode });
  const now = Date.now();
  await DB.batch([
    DB.prepare('UPDATE sandbox_projects SET deleted_at = ?, updated_at = ? WHERE student_email = ? AND id = ?')
      .bind(now, now, email, row.id),
    DB.prepare('DELETE FROM lesson_sync WHERE student_email = ? AND lesson_id = ?').bind(email, lessonId),
    DB.prepare('DELETE FROM lesson_sync_history WHERE student_email = ? AND lesson_id = ?').bind(email, lessonId),
  ]);
  return json({ ok: true });
};
