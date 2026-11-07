// GET /api/prefs -- the caller's Appearance settings ({ prefs, updatedAt });
// DEFAULT_PREFS with updatedAt null when none are saved.
// PUT /api/prefs -- { prefs } replaces them. Validated by parsePrefs() (ids from
// fixed lists only, so nothing stored can carry CSS or a URL), and an uploaded
// home background must be one of the caller's own uploads: the upload URL is
// public, but saving someone else's id as "my background" is still refused so
// ids cannot be probed through this route. Email from the session only.

import { parsePrefs, DEFAULT_PREFS } from '../../lib/prefs-core';

interface Env {
  DB: D1Database;
}

type Session = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, string, Session>;

const MAX_BODY = 4096;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

export const onRequestGet: PagesFunction<Env, string, Session> = async (context: Ctx) => {
  const { env, data } = context;
  const row = await env.DB.prepare('SELECT prefs_json, updated_at FROM user_prefs WHERE email = ?')
    .bind(data.email)
    .first<{ prefs_json: string; updated_at: number }>();
  if (!row) return json({ prefs: DEFAULT_PREFS, updatedAt: null });
  let stored: unknown = null;
  try { stored = JSON.parse(row.prefs_json); } catch { /* a bad row reads as defaults */ }
  const parsed = parsePrefs(stored);
  return json({ prefs: parsed.ok ? parsed.prefs : DEFAULT_PREFS, updatedAt: row.updated_at });
};

export const onRequestPut: PagesFunction<Env, string, Session> = async (context: Ctx) => {
  const { request, env, data } = context;
  const text = await request.text();
  if (text.length > MAX_BODY) return json({ error: 'Settings are too large.' }, 413);
  let body: { prefs?: unknown };
  try { body = JSON.parse(text); } catch { return json({ error: 'Invalid JSON body' }, 400); }
  const parsed = parsePrefs(body?.prefs);
  if (!parsed.ok) return json({ error: parsed.error }, 400);
  const prefs = parsed.prefs;

  if (prefs.homeBg?.kind === 'upload') {
    const own = await env.DB.prepare('SELECT content_type FROM uploads WHERE id = ? AND owner_email = ?')
      .bind(prefs.homeBg.id, data.email)
      .first<{ content_type: string }>();
    if (!own) return json({ error: 'That image is not one of your uploads. Upload it again and pick it.' }, 404);
    // The extension is the one the image is actually served under, not the client's.
    const ext = ({ 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp' } as const)[
      own.content_type as 'image/png'
    ];
    if (!ext) return json({ error: 'That upload is not an image.' }, 400);
    prefs.homeBg = { kind: 'upload', id: prefs.homeBg.id, ext };
  }

  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO user_prefs (email, prefs_json, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(email) DO UPDATE SET prefs_json = excluded.prefs_json, updated_at = excluded.updated_at`,
  )
    .bind(data.email, JSON.stringify(prefs), now)
    .run();
  return json({ prefs, updatedAt: now });
};
