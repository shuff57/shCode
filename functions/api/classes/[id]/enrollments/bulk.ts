// POST /api/classes/[id]/enrollments/bulk  body { emails: string[] }
// Teacher-initiated bulk add. Validates that each email belongs to a registered
// student account and is not already enrolled. Collects per-email results.

import { canManageClass } from '../../../../_shared/classAuth';
import { getCurrentExpirationDate } from '../../../../_shared/schoolYear';
import { normalizeEmail } from '../../../../_shared/auth';

interface Env {
  DB: D1Database;
}
type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, 'id', SessionData>;

interface BulkResult {
  email: string;
  status: 'enrolled' | 'already_enrolled' | 'no_account' | 'error';
  message?: string;
}

interface BulkSummary {
  enrolled: number;
  already_enrolled: number;
  no_account: number;
  error: number;
}

export const onRequestPost: PagesFunction<Env, 'id', SessionData> = async (context: Ctx) => {
  const { request, env, data, params } = context;
  const classId = params.id;
  if (typeof classId !== 'string' || !classId) return json({ error: 'classId required' }, 400);

  const acl = await canManageClass(env.DB, data.email, classId);
  if (!acl.class) return json({ error: 'Class not found' }, 404);
  if (!acl.canManage && data.role !== 'admin') {
    return json({ error: 'Not authorized for this class' }, 403);
  }
  if (acl.class.archived_at) return json({ error: 'Class is archived' }, 400);

  let body: { emails?: string[] };
  try {
    body = (await request.json()) as { emails?: string[] };
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const rawEmails = Array.isArray(body.emails) ? body.emails : [];
  if (rawEmails.length === 0) return json({ error: 'emails array required' }, 400);

  const now = Date.now();
  const expiresAt = getCurrentExpirationDate();

  const results: BulkResult[] = [];
  const summary: BulkSummary = { enrolled: 0, already_enrolled: 0, no_account: 0, error: 0 };

  for (const raw of rawEmails) {
    const email = normalizeEmail(raw || '');
    if (!email) {
      results.push({ email: raw || '(empty)', status: 'no_account' });
      summary.no_account++;
      continue;
    }

    const student = await env.DB.prepare('SELECT email, role FROM students WHERE email = ?')
      .bind(email)
      .first<{ email: string; role: string }>();
    if (!student) {
      results.push({ email, status: 'no_account' });
      summary.no_account++;
      continue;
    }
    if (student.role !== 'student') {
      results.push({ email, status: 'no_account' });
      summary.no_account++;
      continue;
    }

    const existing = await env.DB.prepare(
      'SELECT 1 FROM enrollments WHERE class_id = ? AND student_email = ? AND expires_at > ?',
    )
      .bind(classId, email, now)
      .first();
    if (existing) {
      results.push({ email, status: 'already_enrolled' });
      summary.already_enrolled++;
      continue;
    }

    try {
      await env.DB.prepare(
        `INSERT INTO enrollments (class_id, student_email, enrolled_at, enrolled_by, expires_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
        .bind(classId, email, now, data.email, expiresAt)
        .run();
      results.push({ email, status: 'enrolled' });
      summary.enrolled++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('UNIQUE')) {
        results.push({ email, status: 'already_enrolled' });
        summary.already_enrolled++;
      } else {
        results.push({ email, status: 'error', message: msg });
        summary.error++;
      }
    }
  }

  return json({ results, summary });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
