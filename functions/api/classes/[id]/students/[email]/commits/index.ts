// GET  /api/classes/[id]/students/[email]/commits?lessonId=X
// POST /api/classes/[id]/students/[email]/commits        body: { id, lessonId, message, files, changedFileIds? }
//
// Teacher-scoped views/writes into a specific student's commit pool.
// POST stamps `authored_by_email` with the session (teacher's) email so
// the student can tell teacher pushes apart from their own commits.
//
// Auth: caller must be an owner / co-teacher of the class OR an admin.
// The student must be actively enrolled in the class.

import { canManageClass } from '../../../../../../_shared/classAuth';
import { normalizeEmail } from '../../../../../../_shared/auth';
import { gzipJson, gunzipJson } from '../../../../../../_shared/gzip';

interface Env {
  DB: D1Database;
}
type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, 'id' | 'email', SessionData>;

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

interface CreateBody {
  id: string;
  lessonId: string;
  message: string;
  files: Record<string, string>;
  changedFileIds?: string[];
}

async function resolveStudent(context: Ctx): Promise<
  { ok: true; classId: string; studentEmail: string }
  | { ok: false; response: Response }
> {
  const { env, data, params } = context;
  const classId = params.id;
  const rawEmail = params.email;
  if (typeof classId !== 'string' || !classId) {
    return { ok: false, response: json({ error: 'classId required' }, 400) };
  }
  if (typeof rawEmail !== 'string' || !rawEmail) {
    return { ok: false, response: json({ error: 'student email required' }, 400) };
  }
  const studentEmail = normalizeEmail(decodeURIComponent(rawEmail));

  const acl = await canManageClass(env.DB, data.email, classId);
  if (!acl.class) return { ok: false, response: json({ error: 'Class not found' }, 404) };
  if (!acl.canManage && data.role !== 'admin') {
    return { ok: false, response: json({ error: 'Not authorized for this class' }, 403) };
  }

  const now = Date.now();
  const enrollment = await env.DB.prepare(
    `SELECT 1 FROM enrollments
      WHERE class_id = ? AND student_email = ? AND expires_at > ?`,
  )
    .bind(classId, studentEmail, now)
    .first();
  if (!enrollment) {
    return { ok: false, response: json({ error: 'Student not found in this class' }, 404) };
  }

  return { ok: true, classId, studentEmail };
}

export const onRequestGet: PagesFunction<Env, 'id' | 'email', SessionData> = async (
  context: Ctx,
) => {
  const resolved = await resolveStudent(context);
  if (!resolved.ok) return resolved.response;
  const { env, request } = context;
  const lessonId = new URL(request.url).searchParams.get('lessonId');
  if (!lessonId) return json({ error: 'lessonId required' }, 400);

  const result = await env.DB.prepare(
    'SELECT id, lesson_id, message, files_json, files_gz, changed_file_ids, created_at, authored_by_email FROM commits WHERE student_email = ? AND lesson_id = ? ORDER BY created_at DESC',
  )
    .bind(resolved.studentEmail, lessonId)
    .all<CommitRow>();

  return json({
    commits: await Promise.all(
      (result.results ?? []).map((r) => rowToCommit(r, resolved.studentEmail)),
    ),
  });
};

export const onRequestPost: PagesFunction<Env, 'id' | 'email', SessionData> = async (
  context: Ctx,
) => {
  const resolved = await resolveStudent(context);
  if (!resolved.ok) return resolved.response;
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

  const filesGz = await gzipJson(body.files);
  const createdAt = Date.now();
  await env.DB.prepare(
    'INSERT INTO commits (id, student_email, lesson_id, message, files_json, files_gz, changed_file_ids, created_at, authored_by_email) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
  )
    .bind(
      body.id,
      resolved.studentEmail,
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
