// The real-time rooms' Durable Object (codehs-review/REALTIME-SPEC.md).
//
// All the rules are in lib/live-protocol.ts (LiveRoomCore), shared with the dev
// server's stand-in; this file only adapts Cloudflare's hibernatable sockets to
// it. A socket's seat, name and room size arrive in the ticket the Pages
// Function (functions/api/live/[code].ts) put on the upgrade, and are kept with
// serializeAttachment so they survive the room hibernating. Nothing is written
// to storage per message: moves and shared sprites are relayed, not kept.

import { DurableObject } from 'cloudflare:workers';
import {
  CONTROL_HEADER, LiveRoomCore, TICKET_HEADER, decodeTicket,
  type LiveAttachment, type LiveSocket,
} from '../../../lib/live-protocol';

export class LiveRoom extends DurableObject {
  private readonly core: LiveRoomCore;
  private readonly wrapped = new WeakMap<WebSocket, LiveSocket>();

  constructor(ctx: DurableObjectState, env: Record<string, unknown>) {
    super(ctx, env);
    this.core = new LiveRoomCore(() => this.ctx.getWebSockets().map((ws) => this.wrap(ws)));
    // A client's keep-alive is answered without waking the room.
    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('{"t":"ping"}', '{"t":"pong"}'));
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
    if ((await this.ctx.storage.getAlarm()) === null) await this.ctx.storage.setAlarm(ticket.expiresAt);
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    this.core.message(this.wrap(ws), typeof message === 'string' ? message : null);
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string): Promise<void> {
    this.core.left(this.wrap(ws));
    ws.serializeAttachment(null);
    try { ws.close(code === 1005 ? 1000 : code, reason); } catch { /* already closed */ }
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    this.core.left(this.wrap(ws));
    ws.serializeAttachment(null);
  }

  async alarm(): Promise<void> {
    this.core.closeRoom('That room has closed (rooms last 3 hours).');
  }
}

// No HTTP surface: the Pages Function reaches LiveRoom through its binding.
export default {
  async fetch(): Promise<Response> {
    return new Response('Not found', { status: 404 });
  },
};
