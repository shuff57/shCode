// POST /api/classes/[id]/tries-reset
//   body { studentEmail, lessonId, action: 'give-back-one' | 'reset' }
//   -> { ok: true, action, rowsRemoved, triesLeft }
//
// A teacher gives tries back on ANY capped performance-assessment part (the three-tries
// rule, .gauntlet/SPEC-attempt-caps.md). lesson-unsubmit only ever handled multiple-choice
// quizzes, so on the other capped parts a student who burned a try on a grader outage, a
// wrong problem or a misclick had no remedy short of editing the database.
//
//   give-back-one  removes the student's NEWEST counted try. The earlier tries and their
//                  best score stay; the part has one more try.
//   reset          removes every submission row for the part (counted tries, the server's
//                  outage markers, rows from before go-live). The part is as if never sat:
//                  state 'started', score cleared, every try back.
//
// WHY ROWS ARE DELETED AND NOT FLAGGED. Every reader of lesson_submissions (the
// gradebook, the review queue, the drawer, score-quiz.mjs) reads "the latest row", and a
// flag would need a filter in each of them. So the rows go -- but never silently: the
// removed rows are copied, as JSON, into lesson_try_resets (migration 0033) with who, when,
// the class and the best score before, in the same batch. That is the audit trail
// lesson-unsubmit deliberately did not have.
//
// lesson_state follows: after a reset it is 'started' with no score. After a give-back it
// keeps its state and takes the best score over the rows that remain (the same per-row
// rule as the server's own derivation, rowScore in functions/_shared/attempts.ts); with no
// counted row left it is 'started' with no score. A capped quiz's draft is rewritten to
// graded:false (answers kept), as lesson-unsubmit does, so the radios unlock.
//
// Auth: owner / co-teacher of the class, or an admin; the student must be actively
// enrolled in that class (or any teacher could reset any student by naming their own).
// Only the rows this request READ are deleted (by id), so a try the student submits while
// the teacher is clicking is never swept up by it.

import { canManageClass } from '../../../../_shared/classAuth';
import { normalizeEmail } from '../../../../_shared/auth';
import { capFor, kindFor, rowScore } from '../../../../_shared/attempts';
import { COUNT_SINCE, countAttempts } from '../../../../../lib/attempt-cap';

interface Env {
  DB: D1Database;
}
type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, 'id', SessionData>;

interface Row {
  id: string;
  response: string;
  grade_json: string | null;
  score: number | null;
  possible: number | null;
  submitted_at: number;
}

function parse(raw: string | null): unknown | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export const onRequestPost: PagesFunction<Env, 'id', SessionData> = async (context: Ctx) => {
  const { request, env, data, params } = context;
  const classId = params.id;
  if (typeof classId !== 'string' || !classId) return json({ error: 'classId required' }, 400);

  const acl = await canManageClass(env.DB, data.email, classId);
  if (!acl.class) return json({ error: 'Class not found' }, 404);
  if (!acl.canManage && data.role !== 'admin') return json({ error: 'Not authorized' }, 403);

  let body: { studentEmail?: unknown; lessonId?: unknown; action?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  const email = typeof body.studentEmail === 'string' ? normalizeEmail(body.studentEmail) : '';
  if (!email) return json({ error: 'studentEmail required' }, 400);
  const lessonId = body.lessonId;
  if (typeof lessonId !== 'string' || lessonId.length === 0 || lessonId.length > 200) {
    return json({ error: 'lessonId must be a non-empty string' }, 400);
  }
  const action = body.action;
  if (action !== 'give-back-one' && action !== 'reset') {
    return json({ error: "action must be 'give-back-one' or 'reset'" }, 400);
  }
  const cap = capFor(lessonId);
  if (cap === undefined) return json({ error: 'That part has no try limit, so there are no tries to give back.' }, 400);

  const enrolled = await env.DB
    .prepare('SELECT 1 FROM enrollments WHERE class_id = ? AND student_email = ? AND expires_at > ?')
    .bind(classId, email, Date.now())
    .first();
  if (!enrolled) return json({ error: 'Student not found in this class' }, 404);

  const res = await env.DB
    .prepare(
      `SELECT id, response, grade_json, score, possible, submitted_at FROM lesson_submissions
        WHERE student_email = ? AND lesson_id = ? ORDER BY submitted_at ASC`,
    )
    .bind(email, lessonId)
    .all<Row>();
  const all = res.results ?? [];
  if (all.length === 0) return json({ error: 'No submission to give back' }, 404);

  const counted = all.filter(
    (r) => countAttempts([{ submittedAt: r.submitted_at, gradeJson: parse(r.grade_json) }], COUNT_SINCE) === 1,
  );
  const removed: Row[] = action === 'reset' ? all : counted.slice(-1);
  if (removed.length === 0) return json({ error: 'No counted try to give back' }, 409);
  const removedIds = new Set(removed.map((r) => r.id));
  const remaining = counted.filter((r) => !removedIds.has(r.id));

  let bestBefore: number | null = null;
  for (const r of counted) {
    const sc = rowScore({ score: r.score, possible: r.possible, gradeJson: parse(r.grade_json) });
    if (sc !== null && (bestBefore === null || sc > bestBefore)) bestBefore = sc;
  }
  let bestAfter: number | null = null;
  for (const r of remaining) {
    const sc = rowScore({ score: r.score, possible: r.possible, gradeJson: parse(r.grade_json) });
    if (sc !== null && (bestAfter === null || sc > bestAfter)) bestAfter = sc;
  }

  const now = Date.now();
  const placeholders = removed.map(() => '?').join(', ');
  const statements: D1PreparedStatement[] = [
    env.DB
      .prepare(
        `INSERT INTO lesson_try_resets
           (id, class_id, student_email, lesson_id, action, rows_removed, best_score_before, rows_json, reset_by, reset_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        `tr-${crypto.randomUUID()}`, classId, email, lessonId, action, removed.length, bestBefore,
        JSON.stringify(removed), data.email, now,
      ),
    env.DB
      .prepare(`DELETE FROM lesson_submissions WHERE student_email = ? AND lesson_id = ? AND id IN (${placeholders})`)
      .bind(email, lessonId, ...removed.map((r) => r.id)),
  ];

  if (action === 'reset' || remaining.length === 0) {
    statements.push(
      env.DB
        .prepare(
          `UPDATE lesson_state SET state = 'started', completed_at = NULL, score = NULL
            WHERE student_email = ? AND lesson_id = ?`,
        )
        .bind(email, lessonId),
    );
  } else {
    statements.push(
      env.DB
        .prepare('UPDATE lesson_state SET score = ? WHERE student_email = ? AND lesson_id = ?')
        .bind(bestAfter ?? 0, email, lessonId),
    );
  }

  // A capped quiz hydrates from its draft: unlock the radios, keep the answers.
  if (kindFor(lessonId) === 'quiz') {
    const source = action === 'reset' ? all[all.length - 1] : removed[0];
    const quizRow = [source, ...all.slice().reverse()].find((r) => Array.isArray((parse(r.grade_json) as { quiz?: unknown } | null)?.quiz));
    if (quizRow) {
      statements.push(
        env.DB
          .prepare(
            `INSERT INTO lesson_drafts (student_email, lesson_id, response, updated_at)
               VALUES (?, ?, ?, ?)
             ON CONFLICT(student_email, lesson_id)
               DO UPDATE SET response = excluded.response, updated_at = excluded.updated_at`,
          )
          .bind(email, lessonId, JSON.stringify({ answers: savedAnswers(quizRow.response), graded: false }), now),
      );
    }
  }

  await env.DB.batch(statements);
  return json({ ok: true, action, rowsRemoved: removed.length, triesLeft: Math.max(0, cap - remaining.length) });
};

function savedAnswers(response: string): unknown {
  try {
    const answers = (JSON.parse(response) as { answers?: unknown } | null)?.answers;
    if (answers && typeof answers === 'object') return answers;
  } catch {
    return {};
  }
  return {};
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
