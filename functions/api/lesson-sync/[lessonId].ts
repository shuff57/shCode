// GET /api/lesson-sync/[lessonId]
//   -> { files: null, revision: 0, updatedAt: null } when this device has no
//      workspace yet, else { files, revision, updatedAt }
// PUT /api/lesson-sync/[lessonId]  body { files, baseRevision }
//   -> 200 { revision, updatedAt }
//   -> 409 { conflict: true, files, revision, updatedAt } when another device
//      advanced the row first (a normal sync outcome, not an error)
//
// The student's CURRENT workspace for one lesson, shared across their devices.
// Separate from /api/commits: a commit is a named history entry, this is the
// live document that every device converges on. The server only refuses a
// write that started from an old revision, so a slow request cannot erase a
// newer one; per-file merging and the retry live in lib/lesson-sync.ts.
//
// PUT is gated by isLessonAccessible, like the commits POST: a student cannot
// write a locked lesson's workspace through curl either.

import { gzipJson, gunzipJson } from '../../_shared/gzip';
import { isLessonAccessible, lockedResponse } from '../../_shared/lessonAccess';

interface Env {
  DB: D1Database;
  ASSETS?: Fetcher;
}
// A local type alias (not the shared `interface`) so it satisfies
// PagesFunction's `Record<string, unknown>` data constraint.
type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, 'lessonId', SessionData>;

interface SyncRow {
  files_gz: ArrayBuffer | null;
  revision: number;
  updated_at: number;
}

// A workspace is a handful of text files (student code is kilobytes). This
// cap only stops a crafted request from filling a D1 row.
const MAX_FILES_JSON_BYTES = 4 * 1024 * 1024;

function lessonIdOf(context: Ctx): string | null {
  const id = context.params.lessonId;
  return typeof id === 'string' && id ? id : null;
}

export const onRequestGet: PagesFunction<Env, 'lessonId', SessionData> = async (context: Ctx) => {
  const lessonId = lessonIdOf(context);
  if (!lessonId) return json({ error: 'lessonId required' }, 400);

  const { env, data } = context;
  const row = await env.DB.prepare(
    'SELECT files_gz, revision, updated_at FROM lesson_sync WHERE student_email = ? AND lesson_id = ?',
  )
    .bind(data.email, lessonId)
    .first<SyncRow>();

  if (!row) return json({ files: null, revision: 0, updatedAt: null });
  const files = row.files_gz
    ? await gunzipJson<Record<string, string>>(row.files_gz)
    : {};
  return json({ files, revision: row.revision, updatedAt: row.updated_at });
};

export const onRequestPut: PagesFunction<Env, 'lessonId', SessionData> = async (context: Ctx) => {
  const lessonId = lessonIdOf(context);
  if (!lessonId) return json({ error: 'lessonId required' }, 400);

  const { request, env, data } = context;

  let body: { files?: unknown; baseRevision?: unknown };
  try {
    body = (await request.json()) as { files?: unknown; baseRevision?: unknown };
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  if (!body.files || typeof body.files !== 'object' || Array.isArray(body.files)) {
    return json({ error: 'files object required' }, 400);
  }
  const files: Record<string, string> = {};
  for (const [path, text] of Object.entries(body.files as Record<string, unknown>)) {
    if (typeof text !== 'string') {
      return json({ error: 'files must map each path to its text' }, 400);
    }
    files[path] = text;
  }

  const baseRevision =
    typeof body.baseRevision === 'number' &&
    Number.isInteger(body.baseRevision) &&
    body.baseRevision >= 0
      ? body.baseRevision
      : 0;

  if (JSON.stringify(files).length > MAX_FILES_JSON_BYTES) {
    return json({ error: 'Workspace too large to sync' }, 413);
  }

  if (!(await isLessonAccessible(env, request, data.role, data.email, lessonId))) {
    return lockedResponse();
  }

  const filesGz = await gzipJson(files);
  const now = Date.now();

  // Guarded UPDATE: only the device that read `baseRevision` may advance it.
  // D1 is a single writer, so this is atomic with respect to another PUT.
  const updated = await env.DB.prepare(
    `UPDATE lesson_sync
        SET files_gz = ?, revision = revision + 1, updated_at = ?
      WHERE student_email = ? AND lesson_id = ? AND revision = ?`,
  )
    .bind(filesGz, now, data.email, lessonId, baseRevision)
    .run();
  if (changedRows(updated) > 0) {
    await recordHistory(env, data.email, lessonId, filesGz, baseRevision + 1, now);
    return json({ revision: baseRevision + 1, updatedAt: now });
  }

  // No row yet, or the revision the client named no longer exists. A fresh
  // insert is safe: INSERT OR IGNORE means a simultaneous first-write loses
  // cleanly and falls through to the conflict response below.
  const inserted = await env.DB.prepare(
    `INSERT OR IGNORE INTO lesson_sync
       (student_email, lesson_id, files_gz, revision, updated_at)
     VALUES (?, ?, ?, 1, ?)`,
  )
    .bind(data.email, lessonId, filesGz, now)
    .run();
  if (changedRows(inserted) > 0) {
    await recordHistory(env, data.email, lessonId, filesGz, 1, now);
    return json({ revision: 1, updatedAt: now });
  }

  // Another device got there first. Hand back its live row so the client can
  // merge and retry with the revision it just learned.
  const current = await env.DB.prepare(
    'SELECT files_gz, revision, updated_at FROM lesson_sync WHERE student_email = ? AND lesson_id = ?',
  )
    .bind(data.email, lessonId)
    .first<SyncRow>();
  if (!current) return json({ error: 'Sync state unavailable' }, 409);

  const currentFiles = current.files_gz
    ? await gunzipJson<Record<string, string>>(current.files_gz)
    : {};
  return json(
    {
      conflict: true,
      files: currentFiles,
      revision: current.revision,
      updatedAt: current.updated_at,
    },
    409,
  );
};

function changedRows(result: { meta?: { changes?: number } }): number {
  return Number(result?.meta?.changes ?? 0);
}

const HISTORY_LIMIT = 20;

/**
 * Mirror a successful save into the Cloud history and prune its old end.
 * The current row is already committed, so a history miss is logged and
 * swallowed rather than failing the student's Save.
 */
async function recordHistory(
  env: Env,
  studentEmail: string,
  lessonId: string,
  filesGz: Uint8Array,
  revision: number,
  now: number,
): Promise<void> {
  try {
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO lesson_sync_history
           (id, student_email, lesson_id, files_gz, revision, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).bind(crypto.randomUUID(), studentEmail, lessonId, filesGz, revision, now),
      env.DB.prepare(
        `DELETE FROM lesson_sync_history
          WHERE student_email = ? AND lesson_id = ?
            AND id NOT IN (
              SELECT id FROM lesson_sync_history
               WHERE student_email = ? AND lesson_id = ?
               ORDER BY created_at DESC, id DESC
               LIMIT ?
            )`,
      ).bind(studentEmail, lessonId, studentEmail, lessonId, HISTORY_LIMIT),
    ]);
  } catch (err) {
    console.warn('lesson_sync_history: save recorded without a history row', err);
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
