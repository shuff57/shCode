// GET    /api/lesson-drafts/[lessonId] -> { response, updatedAt }; no draft yet is 200 { response: null, updatedAt: null }
//                                       (a 404 shows as a red console error on every first visit)
// POST   /api/lesson-drafts/[lessonId] body { response, baseUpdatedAt? } -> upsert; with baseUpdatedAt (a number,
//                                       or null for "no row") a different stored row answers 409 { conflict, response, updatedAt }
// DELETE /api/lesson-drafts/[lessonId] -> remove
//
// One draft per student+lesson. The Save button on WrittenGrader POSTs here;
// Submit also syncs the draft so resuming shows the most recent text.

interface Env {
  DB: D1Database;
}
type Ctx = EventContext<Env, 'lessonId', { email: string }>;

interface DraftRow {
  response: string;
  updated_at: number;
}

export const onRequestGet: PagesFunction<Env, 'lessonId', { email: string }> = async (context: Ctx) => {
  const { env, data, params } = context;
  const lessonId = params.lessonId;
  if (typeof lessonId !== 'string' || !lessonId) return json({ error: 'lessonId required' }, 400);

  const row = await env.DB.prepare(
    'SELECT response, updated_at FROM lesson_drafts WHERE student_email = ? AND lesson_id = ?',
  )
    .bind(data.email, lessonId)
    .first<DraftRow>();
  if (!row) return json({ response: null, updatedAt: null });
  return json({ response: row.response, updatedAt: row.updated_at });
};

export const onRequestPost: PagesFunction<Env, 'lessonId', { email: string }> = async (context: Ctx) => {
  const { request, env, data, params } = context;
  const lessonId = params.lessonId;
  if (typeof lessonId !== 'string' || !lessonId) return json({ error: 'lessonId required' }, 400);

  let body: { response?: string; baseUpdatedAt?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  if (typeof body.response !== 'string') {
    return json({ error: 'response (string) required' }, 400);
  }

  // An upload by itself (lib/draft-sync.ts) says which row this browser last saw: a number, or
  // null for "none". When the stored row is a different one, nothing is written and the answer
  // is 409 with that row, so a late upload never overwrites work from another computer. A body
  // without the field (a hand-in, Save on an older page) overwrites as it always has.
  const guarded = Object.prototype.hasOwnProperty.call(body, 'baseUpdatedAt');
  const base = body.baseUpdatedAt;
  if (guarded && base !== null && !(typeof base === 'number' && Number.isFinite(base))) {
    return json({ error: 'baseUpdatedAt must be a number or null' }, 400);
  }

  const read = () => env.DB.prepare(
    'SELECT response, updated_at FROM lesson_drafts WHERE student_email = ? AND lesson_id = ?',
  ).bind(data.email, lessonId).first<DraftRow>();
  const row = await read();
  const conflict = (r: DraftRow | null) =>
    json({ conflict: true, response: r?.response ?? null, updatedAt: r?.updated_at ?? null }, 409);
  if (guarded && (row?.updated_at ?? null) !== base) return conflict(row);

  // Strictly after the row it replaces: two writes in one millisecond are still two versions.
  const now = Math.max(Date.now(), (row?.updated_at ?? 0) + 1);
  if (guarded) {
    // The check and the write are one statement, so two uploads racing cannot both win.
    const res = base === null
      ? await env.DB.prepare(
        `INSERT INTO lesson_drafts (student_email, lesson_id, response, updated_at) VALUES (?, ?, ?, ?)
         ON CONFLICT(student_email, lesson_id) DO NOTHING`,
      ).bind(data.email, lessonId, body.response, now).run()
      : await env.DB.prepare(
        'UPDATE lesson_drafts SET response = ?, updated_at = ? WHERE student_email = ? AND lesson_id = ? AND updated_at = ?',
      ).bind(body.response, now, data.email, lessonId, base).run();
    if (!res.meta.changes) return conflict(await read());
    return json({ ok: true, updatedAt: now });
  }

  // The stamp is decided INSIDE the write, from the row that is there at that moment: two
  // hand-ins racing in one millisecond must not leave different texts under one stamp, because a
  // guarded upload treats the stamp as "exactly the version I saw".
  const written = await env.DB.prepare(
    `INSERT INTO lesson_drafts (student_email, lesson_id, response, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(student_email, lesson_id) DO UPDATE SET
       response = excluded.response,
       updated_at = MAX(excluded.updated_at, lesson_drafts.updated_at + 1)
     RETURNING updated_at`,
  )
    .bind(data.email, lessonId, body.response, now)
    .first<{ updated_at: number }>();

  return json({ ok: true, updatedAt: written?.updated_at ?? now });
};

export const onRequestDelete: PagesFunction<Env, 'lessonId', { email: string }> = async (context: Ctx) => {
  const { env, data, params } = context;
  const lessonId = params.lessonId;
  if (typeof lessonId !== 'string' || !lessonId) return json({ error: 'lessonId required' }, 400);

  await env.DB.prepare(
    'DELETE FROM lesson_drafts WHERE student_email = ? AND lesson_id = ?',
  )
    .bind(data.email, lessonId)
    .run();
  return json({ ok: true });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
