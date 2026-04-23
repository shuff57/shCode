// Class-level authorization + utility helpers. Ported from raSHio,
// simplified for shCode (no seats, no tutors, email-keyed instead of UUIDs).

export interface ClassRow {
  id: string;
  name: string;
  code: string;
  owner_email: string;
  school_year: string;
  created_at: number;
  archived_at: number | null;
}

export interface ClassRowWithMeta extends ClassRow {
  role: 'owner' | 'co-teacher';
  student_count: number;
}

type Role = 'admin' | 'teacher' | 'student';

export function isTeacherOrAdmin(role: Role): boolean {
  return role === 'admin' || role === 'teacher';
}

// Owner OR listed in class_teachers = can manage. Admin bypass is
// handled by the caller so this helper stays focused on class ACL.
export async function canManageClass(
  db: D1Database,
  email: string,
  classId: string,
): Promise<{ canManage: boolean; isOwner: boolean; class: ClassRow | null }> {
  const classInfo = await db
    .prepare('SELECT * FROM classes WHERE id = ?')
    .bind(classId)
    .first<ClassRow>();
  if (!classInfo) return { canManage: false, isOwner: false, class: null };

  if (classInfo.owner_email === email) {
    return { canManage: true, isOwner: true, class: classInfo };
  }

  const coTeacher = await db
    .prepare('SELECT 1 FROM class_teachers WHERE class_id = ? AND teacher_email = ?')
    .bind(classId, email)
    .first();
  return { canManage: !!coTeacher, isOwner: false, class: classInfo };
}

// Classes the teacher owns OR co-teaches. student_count counts active
// enrollments (not-yet-expired). includeArchived gates the archived filter.
export async function getTeacherClasses(
  db: D1Database,
  email: string,
  includeArchived: boolean,
): Promise<ClassRowWithMeta[]> {
  const archivedFilter = includeArchived ? '' : 'AND c.archived_at IS NULL';
  const now = Date.now();
  const query = `
    SELECT
      c.*,
      CASE WHEN c.owner_email = ?1 THEN 'owner' ELSE 'co-teacher' END AS role,
      (SELECT COUNT(*) FROM enrollments e
        WHERE e.class_id = c.id AND e.expires_at > ?2) AS student_count
    FROM classes c
    LEFT JOIN class_teachers ct
      ON c.id = ct.class_id AND ct.teacher_email = ?1
    WHERE (c.owner_email = ?1 OR ct.teacher_email = ?1)
      ${archivedFilter}
    GROUP BY c.id
    ORDER BY c.created_at DESC
  `;
  const result = await db.prepare(query).bind(email, now).all<ClassRowWithMeta>();
  return result.results ?? [];
}

// Exclude O/0, I/1, L/l from the alphabet so students can type the code
// without having to guess which character they're looking at.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export async function generateClassCode(db: D1Database): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    let code = '';
    const bytes = crypto.getRandomValues(new Uint8Array(6));
    for (let i = 0; i < 6; i++) {
      code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
    }
    const existing = await db
      .prepare('SELECT 1 FROM classes WHERE code = ?')
      .bind(code)
      .first();
    if (!existing) return code;
  }
  // Fallback — vanishingly unlikely to be reached given the 30^6 keyspace.
  const ts = Date.now().toString(36).toUpperCase().slice(-6).padStart(6, 'A');
  return ts;
}
