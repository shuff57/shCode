// Code together's Durable Object (codehs-review/REALTIME-SPEC.md, Part 2): one
// shared sandbox program per session.
//
// All the rules are in lib/live-doc-protocol.ts (LiveDocCore), shared with the
// dev server's stand-in; this file only adapts Cloudflare's hibernatable
// sockets, the object's own SQLite and the D1 binding to it. A socket's seat,
// name and account arrive in the DocTicket the Pages Function
// (functions/api/live/[code].ts) put on the upgrade and are kept with
// serializeAttachment. The text and version are written to this object's own
// SQLite on every accepted push, so a woken object rebuilds from them; the
// text for teachers goes to D1 code_sessions through env.DB, written by this
// object itself (never a client's copy).
//
// One alarm does two jobs: the session's end (expiresAt) and the next write
// for teachers (at most every 2 minutes while the text changes).

import { DurableObject } from 'cloudflare:workers';
import { CONTROL_HEADER, TICKET_HEADER, decodeDocTicket, type DocTicket } from '../../../lib/live-protocol';
import {
  LiveDocCore, writeCodeSession, type DocSocket, type DocStored,
} from '../../../lib/live-doc-protocol';

interface Env { DB: D1Database }

export class LiveDoc extends DurableObject<Env> {
  private readonly core: LiveDocCore;
  private readonly wrapped = new WeakMap<WebSocket, DocSocket>();
  private expiresAt = 0;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    const sql = ctx.storage.sql;
    sql.exec('CREATE TABLE IF NOT EXISTS doc_state (id INTEGER PRIMARY KEY CHECK (id = 1), state TEXT NOT NULL)');
    this.core = new LiveDocCore({
      sockets: () => this.ctx.getWebSockets().map((ws) => this.wrap(ws)),
      store: {
        load: () => {
          const row = sql.exec<{ state: string }>('SELECT state FROM doc_state WHERE id = 1').toArray()[0];
          if (!row) return null;
          try {
            const s = JSON.parse(row.state) as DocStored;
            this.expiresAt = s.meta?.expiresAt ?? 0;
            return s;
          } catch { return null; }
        },
        save: (s) => {
          if (s.meta) this.expiresAt = s.meta.expiresAt;
          sql.exec('INSERT INTO doc_state (id, state) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET state = excluded.state', JSON.stringify(s));
        },
      },
      write: (row) => writeCodeSession(this.env.DB, row),
      schedule: (at) => { void this.arm(at); },
    });
    // A client's keep-alive is answered without waking the object.
    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('{"t":"ping"}', '{"t":"pong"}'));
  }

  /** The alarm at the earlier of `at` and the session's end. */
  private async arm(at: number): Promise<void> {
    const end = this.expiresAt || at;
    const want = Math.min(at, end);
    const now = await this.ctx.storage.getAlarm();
    if (now === null || want < now) await this.ctx.storage.setAlarm(want);
  }

  private wrap(ws: WebSocket): DocSocket {
    let w = this.wrapped.get(ws);
    if (!w) {
      w = {
        send: (text) => ws.send(text),
        close: (code, reason) => ws.close(code, reason),
        attachment: () => (ws.deserializeAttachment() as DocTicket | null) ?? null,
        attach: (a) => ws.serializeAttachment(a),
      };
      this.wrapped.set(ws, w);
    }
    return w;
  }

  async fetch(request: Request): Promise<Response> {
    const control = request.headers.get(CONTROL_HEADER);
    if (control !== null) {
      const ok = this.core.control(control);
      await this.core.idle();
      return new Response(JSON.stringify({ ok }), { headers: { 'Content-Type': 'application/json' } });
    }
    if ((request.headers.get('Upgrade') ?? '').toLowerCase() !== 'websocket') return new Response('Expected a WebSocket', { status: 426 });
    const ticket = decodeDocTicket(request.headers.get(TICKET_HEADER));
    if (!ticket) return new Response('No ticket', { status: 403 });
    if (this.core.closed || ticket.expiresAt <= Date.now()) return new Response('That session has ended.', { status: 410 });

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    this.expiresAt = ticket.expiresAt;
    this.core.accept(this.wrap(server), ticket);
    await this.arm(ticket.expiresAt);
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    this.core.message(this.wrap(ws), typeof message === 'string' ? message : null);
    await this.core.idle();
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string): Promise<void> {
    this.core.left(this.wrap(ws));
    ws.serializeAttachment(null);
    try { ws.close(code === 1005 ? 1000 : code, reason); } catch { /* already closed */ }
    await this.core.idle();
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    this.core.left(this.wrap(ws));
    ws.serializeAttachment(null);
    await this.core.idle();
  }

  async alarm(): Promise<void> {
    const now = Date.now();
    if (this.expiresAt && now >= this.expiresAt - 1000) {
      this.core.closeRoom('expired');
    } else {
      // Re-arm for the end first; a write that is not due yet arms an earlier one through arm().
      if (this.expiresAt) await this.ctx.storage.setAlarm(this.expiresAt);
      this.core.flush();
    }
    await this.core.idle();
  }
}
