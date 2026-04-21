// GET    /api/commits/:id — single commit, 404 if not the caller's
// DELETE /api/commits/:id — remove a commit you own

interface Env {
  DB: D1Database;
}
type Ctx = EventContext<Env, 'id', { email: string }>;

interface CommitRow {
  id: string;
  lesson_id: string;
  message: string;
  files_json: string;
  changed_file_ids: string;
  created_at: number;
}

export const onRequestGet: PagesFunction<Env, 'id', { email: string }> = async (context: Ctx) => {
  const { env, params, data } = context;
  const row = await env.DB.prepare(
    'SELECT id, lesson_id, message, files_json, changed_file_ids, created_at FROM commits WHERE id = ? AND student_email = ?',
  )
    .bind(params.id, data.email)
    .first<CommitRow>();
  if (!row) return json({ error: 'Not found' }, 404);
  return json({ commit: rowToCommit(row) });
};

export const onRequestDelete: PagesFunction<Env, 'id', { email: string }> = async (context: Ctx) => {
  const { env, params, data } = context;
  const result = await env.DB.prepare('DELETE FROM commits WHERE id = ? AND student_email = ?')
    .bind(params.id, data.email)
    .run();
  if (result.meta.changes === 0) return json({ error: 'Not found' }, 404);
  return json({ ok: true });
};

function rowToCommit(row: CommitRow) {
  return {
    id: row.id,
    lessonId: row.lesson_id,
    message: row.message,
    files: JSON.parse(row.files_json) as Record<string, string>,
    changedFileIds: JSON.parse(row.changed_file_ids) as string[],
    createdAt: row.created_at,
  };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
