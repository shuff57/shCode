// GET /api/lesson-sync-history?lessonId=X -> { saves: [{ id, revision, updatedAt }] }
// GET /api/lesson-sync-history?id=Y         -> { save: { id, lessonId, revision, updatedAt, files } }
//
// The Cloud tab of the History panel. Rows are written by the PUT in
// api/lesson-sync/[lessonId].ts (the row and its history entry go together);
// this route only reads. Every query is scoped to the session email, so an id
// belonging to someone else answers exactly like a missing one.

import { gunzipJson } from '../../_shared/gzip';

interface Env {
  DB: D1Database;
}
// A local type alias (not the shared `interface`) so it satisfies
// PagesFunction's `Record<string, unknown>` data constraint.
type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };

interface SaveRow {
  id: string;
  lesson_id: string;
  files_gz: ArrayBuffer | null;
  revision: number;
  created_at: number;
}

export const onRequestGet: PagesFunction<Env, string, SessionData> = async (context) => {
  const { env, data } = context;
  const url = new URL(context.request.url);

  // One save, with its files. This is what a restore reads.
  const id = url.searchParams.get('id');
  if (id) {
    const row = await env.DB.prepare(
      'SELECT id, lesson_id, files_gz, revision, created_at FROM lesson_sync_history WHERE id = ? AND student_email = ?',
    )
      .bind(id, data.email)
      .first<SaveRow>();
    if (!row) return json({ error: 'Save not found' }, 404);

    const files = row.files_gz ? await gunzipJson<Record<string, string>>(row.files_gz) : {};
    return json({
      save: {
        id: row.id,
        lessonId: row.lesson_id,
        revision: row.revision,
        updatedAt: row.created_at,
        files,
      },
    });
  }

  // The list. Metadata only: a page of full workspaces would be needlessly
  // large, and the panel fetches one save when a row is clicked.
  const lessonId = url.searchParams.get('lessonId');
  if (!lessonId) return json({ error: 'lessonId or id required' }, 400);

  const result = await env.DB.prepare(
    `SELECT id, revision, created_at FROM lesson_sync_history
      WHERE student_email = ? AND lesson_id = ?
      ORDER BY created_at DESC, revision DESC, id DESC
      LIMIT 50`,
  )
    .bind(data.email, lessonId)
    .all<{ id: string; revision: number; created_at: number }>();

  return json({
    saves: (result.results ?? []).map((r) => ({
      id: r.id,
      revision: r.revision,
      updatedAt: r.created_at,
    })),
  });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
