// Who on a class roster is staff rather than a student (ux2 T6): the class owner, a co-teacher, or an
// account whose role is not 'student'. Such an account must not be counted in roster statistics or in
// "behind" lists: a teacher who sat in their own class at 0% topped every "worst first" list.
//
// How a teacher reaches a roster at all: in production every enrolling path (join-class, Add student, Bulk
// enroll) refuses a non-student role, so it happens only when a student account is promoted to teacher
// after enrolling, or when an owner/co-teacher also holds a student account under the same email. In the
// dev server it happened every time, because scripts/dev-demo-api.mjs enrolled every identity it saw
// (including the teacher); that is fixed there too. This check is the guard for the production cases.

export async function classStaffEmails(db: D1Database, classId: string): Promise<Set<string>> {
  const out = new Set<string>();
  try {
    const owner = await db.prepare('SELECT owner_email FROM classes WHERE id = ?').bind(classId).first<{ owner_email: string }>();
    if (owner?.owner_email) out.add(owner.owner_email);
    const co = await db.prepare('SELECT teacher_email FROM class_teachers WHERE class_id = ?').bind(classId).all<{ teacher_email: string }>();
    for (const r of co.results ?? []) out.add(r.teacher_email);
    const roles = await db
      .prepare(
        `SELECT s.email FROM students s
          WHERE s.role IS NOT NULL AND s.role <> 'student'
            AND s.email IN (SELECT student_email FROM enrollments WHERE class_id = ?)`,
      )
      .bind(classId)
      .all<{ email: string }>();
    for (const r of roles.results ?? []) out.add(r.email);
  } catch {
    /* a failed read marks nobody as staff: the roster is shown as it was */
  }
  return out;
}

/**
 * The one way a teacher route leaves staff out of a list of students: every per-student list or count that
 * describes how STUDENTS are doing (roster numbers, past due, inactive, stuck, failing submissions) goes
 * through this. Work waiting for a teacher's score (awaiting_grade, the review queue) is deliberately NOT
 * filtered: hiding a hand-in would strand it, and the "to grade" count and the queue must stay equal.
 */
export function withoutStaff<T extends { student_email: string }>(rows: T[], staff: ReadonlySet<string>): T[] {
  return staff.size === 0 ? rows : rows.filter((r) => !staff.has(r.student_email));
}
