// LOCAL TESTING ONLY (wrangler.test.toml). Plays the Pages Function's part so
// scripts/test-live-worker.mjs can reach the real LiveRoom and LiveDoc under miniflare:
//   /room/<key>?code=ABCD&seat=0&seats=2&name=Ann%20L.&expires=<ms>   upgrade (LiveRoom)
//   /control/<key>  with the control header                              control (LiveRoom)
//   /doc/<key>?code=ABCD&seat=0&seats=2&name=..&email=..&host=..&lang=moshion&started=<ms>   upgrade (LiveDoc)
//   /doc-control/<key>  with the control header                          control (LiveDoc)
//   /setup     apply migrations 0041, 0043 and 0044 to the local D1
//   /sessions  every code_sessions row (what LiveDoc wrote for teachers)
// Never deployed: production's wrangler.toml points at src/index.ts.

import { CONTROL_HEADER, TICKET_HEADER, encodeDocTicket, encodeTicket } from '../../../lib/live-protocol';
import m0041 from '../../../migrations/0041_game_rooms.sql';
import m0043 from '../../../migrations/0043_game_rooms_live.sql';
import m0044 from '../../../migrations/0044_code_together.sql';

export { LiveRoom, LiveDoc } from '../src/index';

interface Env { LIVE_ROOM: DurableObjectNamespace; LIVE_DOC: DurableObjectNamespace; DB: D1Database }

/** A migration's statements, comments dropped. */
function statements(sql: string): string[] {
  return sql.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n')
    .split(';').map((s) => s.trim()).filter(Boolean);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/setup') {
      for (const s of [m0041, m0043, m0044].flatMap(statements)) {
        try { await env.DB.prepare(s).run(); } catch (e) { if (!/duplicate column/i.test(String(e))) throw e; }
      }
      return new Response('{"ok":true}', { headers: { 'Content-Type': 'application/json' } });
    }
    if (url.pathname === '/sessions') {
      const r = await env.DB.prepare('SELECT * FROM code_sessions ORDER BY updated_at').all();
      return new Response(JSON.stringify(r.results ?? []), { headers: { 'Content-Type': 'application/json' } });
    }
    const m = /^\/(room|control|doc|doc-control)\/([A-Za-z0-9-]+)$/.exec(url.pathname);
    if (!m) return new Response('Not found', { status: 404 });
    const doc = m[1] === 'doc' || m[1] === 'doc-control';
    const ns = doc ? env.LIVE_DOC : env.LIVE_ROOM;
    const stub = ns.get(ns.idFromName(m[2]));
    if (m[1] === 'control' || m[1] === 'doc-control') {
      return stub.fetch('https://live.internal/control', { method: 'POST', headers: { [CONTROL_HEADER]: request.headers.get(CONTROL_HEADER) ?? '' } });
    }
    const q = url.searchParams;
    const headers = new Headers(request.headers);
    if (q.get('noticket') !== '1') {
      const base = {
        code: q.get('code') ?? 'ABCD', seat: Number(q.get('seat') ?? 0), seats: Number(q.get('seats') ?? 2),
        name: q.get('name') ?? 'Test P.', expiresAt: Number(q.get('expires') ?? Date.now() + 3_600_000),
      };
      // ?wrong=1 sends the other kind's ticket, to check each class refuses it.
      const asDoc = q.get('wrong') === '1' ? !doc : doc;
      headers.set(TICKET_HEADER, asDoc
        ? encodeDocTicket({
          ...base, kind: 'code', email: q.get('email') ?? 'test@s.test', host: q.get('host') ?? 'host@s.test',
          hostName: q.get('hostName') ?? 'Ann L.', lang: q.get('lang') === 'js' ? 'js' : 'moshion',
          roomKey: m[2], startedAt: Number(q.get('started') ?? Date.now()),
        })
        : encodeTicket(base));
    }
    return stub.fetch(new Request('https://live.internal/connect', { headers }));
  },
};
