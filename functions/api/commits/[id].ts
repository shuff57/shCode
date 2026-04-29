// GET    /api/commits/:id — single commit, 404 if not the caller's
// DELETE /api/commits/:id — remove a commit you own
//
// DELETE is gated by isLessonAccessible against the commit's own
// lesson_id — defense in depth. A student can't curl to delete commit
// rows on a lesson their progression doesn't entitle them to.

import { gunzipJson } from '../../_shared/gzip';
import { isLessonAccessible, lockedResponse, type SessionData } from '../../_shared/lessonAccess';

interface Env {
  DB: D1Database;
  ASSETS?: Fetcher;
}
type Ctx = EventContext<Env, 'id', SessionData>;

interface CommitRow {
  id: string;
  lesson_id: string;
  message: string;
  files_json: string | null;
  files_gz: ArrayBuffer | null;
  changed_file_ids: string;
  created_at: number;
  authored_by_email: string | null;
}

export const onRequestGet: PagesFunction<Env, 'id', SessionData> = async (context: Ctx) => {
  const { env, params, data } = context;
  const row = await env.DB.prepare(
    'SELECT id, lesson_id, message, files_json, files_gz, changed_file_ids, created_at, authored_by_email FROM commits WHERE id = ? AND student_email = ?',
  )
    .bind(params.id, data.email)
    .first<CommitRow>();
  if (!row) return json({ error: 'Not found' }, 404);
  return json({ commit: await rowToCommit(row, data.email) });
};

export const onRequestDelete: PagesFunction<Env, 'id', SessionData> = async (context: Ctx) => {
  const { request, env, params, data } = context;

  // Look up the commit's lesson_id so we can run the access gate against
  // it before letting the delete proceed. The same WHERE clause guards
  // ownership — a student can never see / delete another student's row.
  const row = await env.DB
    .prepare('SELECT lesson_id FROM commits WHERE id = ? AND student_email = ?')
    .bind(params.id, data.email)
    .first<{ lesson_id: string }>();
  if (!row) return json({ error: 'Not found' }, 404);

  if (!(await isLessonAccessible(env, request, data.role, data.email, row.lesson_id))) {
    return lockedResponse();
  }

  const result = await env.DB.prepare('DELETE FROM commits WHERE id = ? AND student_email = ?')
    .bind(params.id, data.email)
    .run();
  if (result.meta.changes === 0) return json({ error: 'Not found' }, 404);
  return json({ ok: true });
};

async function rowToCommit(row: CommitRow, studentEmail: string) {
  let files: Record<string, string>;
  if (row.files_gz != null) {
    files = await gunzipJson<Record<string, string>>(row.files_gz);
  } else {
    files = JSON.parse(row.files_json!) as Record<string, string>;
  }
  return {
    id: row.id,
    lessonId: row.lesson_id,
    message: row.message,
    files,
    changedFileIds: JSON.parse(row.changed_file_ids) as string[],
    createdAt: row.created_at,
    authoredByEmail: row.authored_by_email ?? studentEmail,
  };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
