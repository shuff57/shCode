// GET /api/classes/[id]/grading-weights
//   -> { weights: [{ category, weight, isDefault, setBy, setAt }] } -- always
//      all 8 GRADE_CATEGORIES, using lib/grading-weights.ts DEFAULT_WEIGHTS
//      for any category this class has never overridden.
// PUT /api/classes/[id]/grading-weights
//   body { entries: [{ category, weight: number (0-100) | null }] }
//   `weight: null` DELETES that class's override row, reverting to the
//   curriculum default -- same convention as due-dates' `date: null`.
//
// Teacher-only (owner, co-teacher, or admin) via canManageClass. See
// functions/api/classes/[id]/due-dates/index.ts, whose shape this mirrors.

import { canManageClass } from '../../../../_shared/classAuth';
import { DEFAULT_WEIGHTS, GRADE_CATEGORIES, type GradeCategory } from '../../../../../lib/grading-weights';

interface Env {
  DB: D1Database;
}
type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, 'id', SessionData>;

const CATEGORY_SET = new Set<string>(GRADE_CATEGORIES);
// One PUT covers at most all 8 categories at once.
const MAX_ENTRIES = GRADE_CATEGORIES.length;

interface Entry {
  category: string;
  weight: number | null;
}

interface Row {
  category: string;
  weight: number;
  set_by: string;
  set_at: number;
}

async function loadWeights(env: Env, classId: string) {
  const result = await env.DB
    .prepare('SELECT category, weight, set_by, set_at FROM class_grading_weights WHERE class_id = ?')
    .bind(classId)
    .all<Row>();
  const rows = new Map((result.results ?? []).map((r) => [r.category, r]));
  return GRADE_CATEGORIES.map((category) => {
    const row = rows.get(category);
    return {
      category,
      weight: row ? row.weight : DEFAULT_WEIGHTS[category as GradeCategory],
      isDefault: !row,
      setBy: row?.set_by ?? null,
      setAt: row?.set_at ?? null,
    };
  });
}

export const onRequestGet: PagesFunction<Env, 'id', SessionData> = async (context: Ctx) => {
  const { env, data, params } = context;
  const classId = params.id;
  if (typeof classId !== 'string' || !classId) return json({ error: 'classId required' }, 400);

  const acl = await canManageClass(env.DB, data.email, classId);
  if (!acl.class) return json({ error: 'Class not found' }, 404);
  if (!acl.canManage && data.role !== 'admin') return json({ error: 'Not authorized' }, 403);

  return json({ weights: await loadWeights(env, classId) });
};

export const onRequestPut: PagesFunction<Env, 'id', SessionData> = async (context: Ctx) => {
  const { request, env, data, params } = context;
  const classId = params.id;
  if (typeof classId !== 'string' || !classId) return json({ error: 'classId required' }, 400);

  const acl = await canManageClass(env.DB, data.email, classId);
  if (!acl.class) return json({ error: 'Class not found' }, 404);
  if (!acl.canManage && data.role !== 'admin') return json({ error: 'Not authorized' }, 403);

  let body: { entries?: Entry[] };
  try {
    body = (await request.json()) as { entries?: Entry[] };
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const entries = body.entries;
  if (!Array.isArray(entries)) return json({ error: 'entries array required' }, 400);
  if (entries.length === 0) {
    return json({ ok: true, written: 0, cleared: 0, weights: await loadWeights(env, classId) });
  }
  if (entries.length > MAX_ENTRIES) return json({ error: `At most ${MAX_ENTRIES} entries per request` }, 400);

  const now = Date.now();
  const statements: D1PreparedStatement[] = [];
  let written = 0;
  let cleared = 0;

  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') return json({ error: 'Malformed entry' }, 400);
    if (!CATEGORY_SET.has(entry.category)) {
      return json({ error: `Unknown category ${JSON.stringify(entry.category)}` }, 400);
    }

    if (entry.weight === null) {
      statements.push(
        env.DB
          .prepare('DELETE FROM class_grading_weights WHERE class_id = ? AND category = ?')
          .bind(classId, entry.category),
      );
      cleared++;
      continue;
    }

    if (typeof entry.weight !== 'number' || !Number.isFinite(entry.weight) || entry.weight < 0 || entry.weight > 100) {
      return json({ error: `weight must be 0-100 or null, got ${JSON.stringify(entry.weight)}` }, 400);
    }

    statements.push(
      env.DB
        .prepare(
          `INSERT INTO class_grading_weights (class_id, category, weight, set_by, set_at)
             VALUES (?, ?, ?, ?, ?)
           ON CONFLICT (class_id, category)
             DO UPDATE SET weight = excluded.weight, set_by = excluded.set_by, set_at = excluded.set_at`,
        )
        .bind(classId, entry.category, entry.weight, data.email, now),
    );
    written++;
  }

  // One batch, same reason as due-dates: a half-applied write would leave
  // the panel showing a partially-saved, non-100 total for no visible reason.
  await env.DB.batch(statements);

  return json({ ok: true, written, cleared, weights: await loadWeights(env, classId) });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
