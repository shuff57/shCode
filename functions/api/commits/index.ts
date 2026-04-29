// GET  /api/commits?lessonId=X   -> list the signed-in student's commits for a lesson
// POST /api/commits              -> create a new commit (body: CreateBody)
//
// POST is gated by isLessonAccessible — students can't push commits to a
// locked lesson via curl/devtools.

import { gzipJson, gunzipJson } from '../../_shared/gzip';
import { isLessonAccessible, lockedResponse, type SessionData } from '../../_shared/lessonAccess';

interface Env {
  DB: D1Database;
  ASSETS?: Fetcher;
}
type Ctx = EventContext<Env, string, SessionData>;

interface CreateBody {
  id: string;
  lessonId: string;
  message: string;
  files: Record<string, string>;
  changedFileIds?: string[];
}

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

export const onRequestGet: PagesFunction<Env, string, SessionData> = async (context: Ctx) => {
  const { request, env, data } = context;
  const lessonId = new URL(request.url).searchParams.get('lessonId');
  if (!lessonId) return json({ error: 'lessonId required' }, 400);

  const result = await env.DB.prepare(
    'SELECT id, lesson_id, message, files_json, files_gz, changed_file_ids, created_at, authored_by_email FROM commits WHERE student_email = ? AND lesson_id = ? ORDER BY created_at DESC',
  )
    .bind(data.email, lessonId)
    .all<CommitRow>();

  return json({
    commits: await Promise.all((result.results ?? []).map((r) => rowToCommit(r, data.email))),
  });
};

export const onRequestPost: PagesFunction<Env, string, SessionData> = async (context: Ctx) => {
  const { request, env, data } = context;
  let body: CreateBody;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  if (!body.id || !body.lessonId || !body.message) {
    return json({ error: 'id, lessonId, and message required' }, 400);
  }
  if (!body.files || typeof body.files !== 'object') {
    return json({ error: 'files object required' }, 400);
  }

  if (!(await isLessonAccessible(env, request, data.role, data.email, body.lessonId))) {
    return lockedResponse();
  }

  const filesGz = await gzipJson(body.files);
  const createdAt = Date.now();
  await env.DB.prepare(
    'INSERT INTO commits (id, student_email, lesson_id, message, files_json, files_gz, changed_file_ids, created_at, authored_by_email) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
  )
    .bind(
      body.id,
      data.email,
      body.lessonId,
      body.message,
      null,
      filesGz,
      JSON.stringify(body.changedFileIds ?? []),
      createdAt,
      data.email,
    )
    .run();

  return json(
    {
      commit: {
        id: body.id,
        lessonId: body.lessonId,
        message: body.message,
        files: body.files,
        changedFileIds: body.changedFileIds ?? [],
        createdAt,
        authoredByEmail: data.email,
      },
    },
    201,
  );
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
