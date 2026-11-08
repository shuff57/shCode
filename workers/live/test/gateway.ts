// LOCAL TESTING ONLY (wrangler.test.toml). Plays the Pages Function's part so
// scripts/test-live-worker.mjs can reach the real LiveRoom under miniflare:
//   /room/<key>?code=ABCD&seat=0&seats=2&name=Ann%20L.&expires=<ms>   upgrade
//   /control/<key>  with the control header                              control
// Never deployed: production's wrangler.toml points at src/index.ts.

import { CONTROL_HEADER, TICKET_HEADER, encodeTicket } from '../../../lib/live-protocol';

export { LiveRoom } from '../src/index';

interface Env { LIVE_ROOM: DurableObjectNamespace }

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const m = /^\/(room|control)\/([A-Za-z0-9-]+)$/.exec(url.pathname);
    if (!m) return new Response('Not found', { status: 404 });
    const stub = env.LIVE_ROOM.get(env.LIVE_ROOM.idFromName(m[2]));
    if (m[1] === 'control') {
      return stub.fetch('https://live.internal/control', { method: 'POST', headers: { [CONTROL_HEADER]: request.headers.get(CONTROL_HEADER) ?? '' } });
    }
    const q = url.searchParams;
    const headers = new Headers(request.headers);
    if (q.get('noticket') !== '1') {
      headers.set(TICKET_HEADER, encodeTicket({
        code: q.get('code') ?? 'ABCD', seat: Number(q.get('seat') ?? 0), seats: Number(q.get('seats') ?? 2),
        name: q.get('name') ?? 'Test P.', expiresAt: Number(q.get('expires') ?? Date.now() + 3_600_000),
      }));
    }
    return stub.fetch(new Request('https://live.internal/connect', { headers }));
  },
};
