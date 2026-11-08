// The dev server's stand-in for the real-time rooms (workers/live/, the
// LiveRoom Durable Object). Same protocol, same rules: it wraps the SAME
// LiveRoomCore (lib/live-protocol.ts) and lets sockets in through the SAME
// check (authorizeLive in functions/_shared/live.ts) on the dev server's
// in-memory SQLite, so the browser path is identical in dev and production.
//
//   const live = makeDevLive({ db, identity: (req) => ({ email, role }) });
//   env.LIVE = live.namespace;            // what leave.ts / POST /api/rooms see
//   env.LIVE_DOC = live.docNamespace;     // Code together sessions (LiveDoc)
//   httpServer.on('upgrade', live.onUpgrade);
//
// Code together (REALTIME-SPEC.md Part 2): a room of kind 'code' gets the SAME
// LiveDocCore (lib/live-doc-protocol.ts) the LiveDoc Durable Object runs, with
// its state in memory and the text for teachers written to code_sessions on
// this same database by the same writeCodeSession.
//
// The socket server is Next's own bundled copy of `ws` (next/dist/compiled/ws):
// no new dependency. onUpgrade only touches /api/live/<code>; every other
// upgrade (Next's dev HMR socket) is left alone.

import { createRequire } from 'node:module';
import { LiveRoomCore, CONTROL_HEADER } from '../lib/live-protocol.ts';
import { LiveDocCore, MAX_SEED_FRAME, memoryDocStore, writeCodeSession } from '../lib/live-doc-protocol.ts';
import { authorizeLive } from '../functions/_shared/live.ts';

const require = createRequire(import.meta.url);
const { WebSocketServer } = require('next/dist/compiled/ws');

const PATH_RE = /^\/api\/live\/([^/?#]+)\/?$/;

export function makeDevLive({ db, identity, now = Date.now }) {
  const wss = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024 });
  // A Code together seed carries the host's whole program.
  const docWss = new WebSocketServer({ noServer: true, maxPayload: MAX_SEED_FRAME * 3 });
  /** roomKey -> { core, sockets: Set<LiveSocket> } */
  const rooms = new Map();
  /** roomKey -> { core, sockets: Set<DocSocket>, timer, flushTimer } (Code together) */
  const docs = new Map();

  function docRoom(key) {
    let r = docs.get(key);
    if (!r) {
      const sockets = new Set();
      r = { sockets, timer: null, flushTimer: null };
      r.core = new LiveDocCore({
        sockets: () => [...sockets],
        store: memoryDocStore(),
        write: (row) => writeCodeSession(db, row, now()),
        schedule: (at) => {
          if (r.flushTimer) clearTimeout(r.flushTimer);
          r.flushTimer = setTimeout(() => { r.flushTimer = null; r.core.flush(); }, Math.max(0, Math.min(at - now(), 2 ** 31 - 1)));
          r.flushTimer.unref?.();
        },
        now,
      });
      docs.set(key, r);
    }
    return r;
  }

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
  const controlOf = (map) => ({
    idFromName: (name) => String(name),
    get: (id) => ({
      async fetch(_url, init = {}) {
        const h = new Headers(init.headers ?? {});
        const r = map.get(String(id));
        const ok = r ? r.core.control(h.get(CONTROL_HEADER)) : false;
        if (r?.core.idle) await r.core.idle();
        return new Response(JSON.stringify({ ok }), { headers: { 'Content-Type': 'application/json' } });
      },
    }),
  });
  const namespace = controlOf(rooms);
  const docNamespace = controlOf(docs);

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
      if (auth.kind === 'code') return acceptDoc(req, socket, head, auth);
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

  function acceptDoc(req, socket, head, auth) {
    const r = docRoom(auth.roomKey);
    if (r.core.closed || auth.ticket.expiresAt <= now()) return refuse(socket, 410, { error: 'That session has ended.' });
    docWss.handleUpgrade(req, socket, head, (ws) => {
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
        r.timer = setTimeout(() => r.core.closeRoom('expired'), Math.max(0, Math.min(ms, 2 ** 31 - 1)));
        r.timer.unref?.();
      }
    });
  }

  return { namespace, docNamespace, onUpgrade, rooms, docs, close: () => { wss.close(); docWss.close(); } };
}
