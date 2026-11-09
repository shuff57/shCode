// The real-time rooms' Durable Object (codehs-review/REALTIME-SPEC.md).
//
// All the rules are in lib/live-protocol.ts (LiveRoomCore), shared with the dev
// server's stand-in; this file only adapts Cloudflare's hibernatable sockets to
// it. A socket's seat, name and room size arrive in the ticket the Pages
// Function (functions/api/live/[code].ts) put on the upgrade, and are kept with
// serializeAttachment so they survive the room hibernating. Nothing is written
// to storage per message: moves and shared sprites are relayed, not kept.
//
// The room's own SQLite holds one small row (RoomStored): its code and end, and
// when the host's last socket went. A room whose host has been gone
// HOST_GONE_MS (60 s) closes itself (LiveRoomCore.checkHost): game_rooms.closed_at
// in D1 through env.DB first (closeRoomRow, what leave.ts does), then every
// socket. One alarm serves both the host-gone check and the room's end.
//
// The same Worker also runs Code together's LiveDoc (src/live-doc.ts), bound to
// the Pages project as LIVE_DOC.

import { DurableObject } from 'cloudflare:workers';
import {
  CONTROL_HEADER, LiveRoomCore, TICKET_HEADER, closeRoomRow, decodeTicket,
  type LiveAttachment, type LiveSocket, type RoomStored,
} from '../../../lib/live-protocol';

export { LiveDoc } from './live-doc';

interface Env { DB?: D1Database }

export class LiveRoom extends DurableObject<Env> {
  private readonly core: LiveRoomCore;
  private readonly wrapped = new WeakMap<WebSocket, LiveSocket>();
  /** Alarm changes still on their way to storage (awaited before each handler returns). */
  private readonly arms = new Set<Promise<void>>();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    const sql = ctx.storage.sql;
    sql.exec('CREATE TABLE IF NOT EXISTS room_state (id INTEGER PRIMARY KEY CHECK (id = 1), state TEXT NOT NULL)');
    this.core = new LiveRoomCore(() => this.ctx.getWebSockets().map((ws) => this.wrap(ws)), Date.now, {
      store: {
        load: () => {
          const row = sql.exec<{ state: string }>('SELECT state FROM room_state WHERE id = 1').toArray()[0];
          if (!row) return null;
          try { return JSON.parse(row.state) as RoomStored; } catch { return null; }
        },
        save: (st) => {
          sql.exec('INSERT INTO room_state (id, state) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET state = excluded.state', JSON.stringify(st));
        },
      },
      schedule: (at) => this.arm(at),
      closeRow: async (room) => { if (this.env.DB) await closeRoomRow(this.env.DB, room.code, room.expiresAt, Date.now()); },
    });
    // A client's keep-alive is answered without waking the room.
    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('{"t":"ping"}', '{"t":"pong"}'));
  }

  /** The alarm at the earlier of `at` and what is set already (the room's end is always set). */
  private arm(at: number) {
    const p: Promise<void> = (async () => {
      const end = this.core.expiresAt();
      const want = end ? Math.min(at, end) : at;
      const cur = await this.ctx.storage.getAlarm();
      if (cur === null || want < cur) await this.ctx.storage.setAlarm(want);
    })().catch(() => { /* the room's end alarm still stands */ }).finally(() => { this.arms.delete(p); });
    this.arms.add(p);
  }

  /** Wait for alarm changes and the D1 write a host-gone close started. */
  private async settle(): Promise<void> {
    while (this.arms.size) await Promise.all([...this.arms]);
    await this.core.idle();
  }

  private wrap(ws: WebSocket): LiveSocket {
    let w = this.wrapped.get(ws);
    if (!w) {
      w = {
        send: (text) => ws.send(text),
        close: (code, reason) => ws.close(code, reason),
        attachment: () => (ws.deserializeAttachment() as LiveAttachment | null) ?? null,
        attach: (a) => ws.serializeAttachment(a),
      };
      this.wrapped.set(ws, w);
    }
    return w;
  }

  async fetch(request: Request): Promise<Response> {
    const control = request.headers.get(CONTROL_HEADER);
    if (control !== null) {
      return new Response(JSON.stringify({ ok: this.core.control(control) }), { headers: { 'Content-Type': 'application/json' } });
    }
    if ((request.headers.get('Upgrade') ?? '').toLowerCase() !== 'websocket') return new Response('Expected a WebSocket', { status: 426 });
    const ticket = decodeTicket(request.headers.get(TICKET_HEADER));
    if (!ticket) return new Response('No ticket', { status: 403 });
    // A closed or expired room says so before any socket exists (the Function
    // also refuses it from D1; this covers the moments in between).
    if (this.core.closed || ticket.expiresAt <= Date.now()) return new Response('That room has closed.', { status: 410 });

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    this.core.accept(this.wrap(server), ticket);
    // The room shuts itself when it expires, even with nobody sending.
    this.arm(ticket.expiresAt);
    await this.settle();
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    this.core.message(this.wrap(ws), typeof message === 'string' ? message : null);
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string): Promise<void> {
    this.core.left(this.wrap(ws));
    ws.serializeAttachment(null);
    try { ws.close(code === 1005 ? 1000 : code, reason); } catch { /* already closed */ }
    await this.settle();
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    this.core.left(this.wrap(ws));
    ws.serializeAttachment(null);
    await this.settle();
  }

  async alarm(): Promise<void> {
    const end = this.core.expiresAt();
    // No end known (a room from before the room kept its own row): an alarm was only ever the end.
    if (!end || Date.now() >= end - 1000) {
      this.core.closeRoom('That room has closed (rooms last 3 hours).');
    } else {
      // Re-arm for the end first; a host still being waited for arms an earlier one through arm().
      await this.ctx.storage.setAlarm(end);
      this.core.checkHost();
    }
    await this.settle();
  }
}

// No HTTP surface: the Pages Function reaches LiveRoom and LiveDoc through their bindings.
export default {
  async fetch(): Promise<Response> {
    return new Response('Not found', { status: 404 });
  },
};
