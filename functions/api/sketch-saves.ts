// GET /api/sketch-saves?key=<sketch key> -- the caller's 'remote' saves for one
// sketch ({ data, updatedAt }); an empty map with updatedAt null when none.
// PUT /api/sketch-saves -- { key, data } replaces that sketch's saves whole.
//
// #97: save(key, value, 'remote') in moSHion. The page (lib/moshion-storage.ts)
// loads a sketch's map before the sketch runs and writes the whole map back a
// moment after it changes, so one row per account per sketch is the unit. Email
// from the session only; the values are opaque JSON text, never parsed here.
// Rules and limits: lib/sketch-saves-core.ts.

import { checkSketchData, isSketchKey, MAX_SKETCHES, MAX_TOTAL_BYTES } from '../../lib/sketch-saves-core';

interface Env {
  DB: D1Database;
}

type Session = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, string, Session>;

// The data map plus its key and the JSON around it.
const MAX_BODY = MAX_TOTAL_BYTES * 2 + 1024;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

export const onRequestGet: PagesFunction<Env, string, Session> = async (context: Ctx) => {
  const { request, env, data } = context;
  const key = new URL(request.url).searchParams.get('key');
  if (!isSketchKey(key)) return json({ error: 'Unknown sketch.' }, 400);
  const row = await env.DB.prepare('SELECT data_json, updated_at FROM sketch_saves WHERE email = ? AND sketch_key = ?')
    .bind(data.email, key)
    .first<{ data_json: string; updated_at: number }>();
  if (!row) return json({ data: {}, updatedAt: null });
  let stored: unknown = {};
  try { stored = JSON.parse(row.data_json); } catch { /* a bad row reads as empty */ }
  const checked = checkSketchData(stored);
  return json({ data: checked.ok ? checked.data : {}, updatedAt: row.updated_at });
};

export const onRequestPut: PagesFunction<Env, string, Session> = async (context: Ctx) => {
  const { request, env, data } = context;
  const text = await request.text();
  if (text.length > MAX_BODY) return json({ error: `This sketch's online saves are over ${MAX_TOTAL_BYTES / 1024} KB in total.` }, 413);
  let body: { key?: unknown; data?: unknown };
  try { body = JSON.parse(text); } catch { return json({ error: 'Invalid JSON body' }, 400); }
  if (!isSketchKey(body?.key)) return json({ error: 'Unknown sketch.' }, 400);
  const checked = checkSketchData(body.data);
  if (!checked.ok) return json({ error: checked.error }, 400);

  const exists = await env.DB.prepare('SELECT 1 AS x FROM sketch_saves WHERE email = ? AND sketch_key = ?')
    .bind(data.email, body.key)
    .first();
  if (!exists) {
    const n = await env.DB.prepare('SELECT COUNT(*) AS n FROM sketch_saves WHERE email = ?')
      .bind(data.email)
      .first<{ n: number }>();
    if ((n?.n ?? 0) >= MAX_SKETCHES) {
      return json({ error: `You have online saves in ${MAX_SKETCHES} sketches already, which is the most allowed.` }, 409);
    }
  }

  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO sketch_saves (email, sketch_key, data_json, updated_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(email, sketch_key) DO UPDATE SET data_json = excluded.data_json, updated_at = excluded.updated_at`,
  )
    .bind(data.email, body.key, JSON.stringify(checked.data), now)
    .run();
  return json({ ok: true, updatedAt: now });
};
