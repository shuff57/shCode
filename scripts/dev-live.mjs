// The dev server's stand-in for the real-time rooms (workers/live/, the
// LiveRoom Durable Object). Same protocol, same rules: it wraps the SAME
// LiveRoomCore (lib/live-protocol.ts) and lets sockets in through the SAME
// check (authorizeLive in functions/_shared/live.ts) on the dev server's
// in-memory SQLite, so the browser path is identical in dev and production.
//
//   const live = makeDevLive({ db, identity: (req) => ({ email, role }) });
//   env.LIVE = live.namespace;            // what leave.ts / POST /api/rooms see
//   httpServer.on('upgrade', live.onUpgrade);
//
// The socket server is Next's own bundled copy of `ws` (next/dist/compiled/ws):
// no new dependency. onUpgrade only touches /api/live/<code>; every other
// upgrade (Next's dev HMR socket) is left alone.

import { createRequire } from 'node:module';
import { LiveRoomCore, CONTROL_HEADER } from '../lib/live-protocol.ts';
import { authorizeLive } from '../functions/_shared/live.ts';

const require = createRequire(import.meta.url);
const { WebSocketServer } = require('next/dist/compiled/ws');

const PATH_RE = /^\/api\/live\/([^/?#]+)\/?$/;

export function makeDevLive({ db, identity, now = Date.now }) {
  const wss = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024 });
  /** roomKey -> { core, sockets: Set<LiveSocket> } */
  const rooms = new Map();

  function room(key) {
    let r = rooms.get(key);
    if (!r) {
      const sockets = new Set();
      r = { sockets, core: new LiveRoomCore(() => [...sockets], now) };
      rooms.set(key, r);
    }
    return r;
  }

  // What the Pages Functions get as env.LIVE: idFromName/get/fetch, control only.
  const namespace = {
    idFromName: (name) => String(name),
    get: (id) => ({
      async fetch(_url, init = {}) {
        const h = new Headers(init.headers ?? {});
        const r = rooms.get(String(id));
        const ok = r ? r.core.control(h.get(CONTROL_HEADER)) : false;
        return new Response(JSON.stringify({ ok }), { headers: { 'Content-Type': 'application/json' } });
      },
    }),
  };

  function refuse(socket, status, body) {
    const text = JSON.stringify(body);
    try {
      socket.write(`HTTP/1.1 ${status} ${status === 404 ? 'Not Found' : 'Refused'}\r\nContent-Type: application/json\r\nContent-Length: ${Buffer.byteLength(text)}\r\nConnection: close\r\n\r\n${text}`);
    } catch { /* gone */ }
    socket.destroy();
  }

  async function onUpgrade(req, socket, head) {
    const url = new URL(req.url, 'http://localhost');
    const m = PATH_RE.exec(url.pathname);
    if (!m) return; // not ours (Next's HMR socket)
    try {
      const origin = req.headers.origin;
      if (origin && new URL(origin).host !== req.headers.host) return refuse(socket, 403, { error: 'Wrong origin.' });
      const who = identity(req);
      if (!who) return refuse(socket, 401, { error: 'Not signed in' });
      const auth = await authorizeLive(db, who.email, who.role, decodeURIComponent(m[1]), url.searchParams.get('device'), now());
      if (!auth.ok) return refuse(socket, auth.status, { error: auth.error });
      wss.handleUpgrade(req, socket, head, (ws) => {
        const r = room(auth.roomKey);
        let att = null;
        const s = {
          send: (text) => { if (ws.readyState === 1) ws.send(text); },
          close: (code, reason) => { try { ws.close(code, reason); } catch { /* gone */ } },
          attachment: () => att,
          attach: (a) => { att = a; },
        };
        r.sockets.add(s);
        ws.on('message', (data, isBinary) => r.core.message(s, isBinary ? null : data.toString()));
        ws.on('close', () => { r.core.left(s); att = null; r.sockets.delete(s); });
        ws.on('error', () => { /* close follows */ });
        r.core.accept(s, auth.ticket);
        if (!r.timer && auth.ticket.expiresAt) {
          const ms = auth.ticket.expiresAt - now();
          r.timer = setTimeout(() => r.core.closeRoom('That room has closed (rooms last 3 hours).'), Math.max(0, Math.min(ms, 2 ** 31 - 1)));
          r.timer.unref?.();
        }
      });
    } catch (e) {
      refuse(socket, 500, { error: String(e?.message ?? e) });
    }
  }

  return { namespace, onUpgrade, rooms, close: () => wss.close() };
}
