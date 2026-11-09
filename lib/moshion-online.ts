// The parent-page half of moSHion online play (Phase 6, the board games).
//
// A sketch runs in a sandboxed iframe with no same-origin access, so it cannot
// call /api/rooms itself (the session cookie never reaches it; see the uploads
// note in CLAUDE.md). The `online` object in public/moshion/extras.js posts
// requests up here instead, this hook calls the API as the signed-in student,
// and it polls the room about once a second and posts what changed back down.
//
// Every move, the sender's own included, comes back through the poll in seq
// order. Both sketches therefore apply the same list in the same order, which
// is what keeps two boards in step; after a send the hook polls at once, so a
// player's own move shows in a fraction of a second.
//
// Messages, iframe -> parent: { source: 'preview-online', run, id, op, ... }
//   op 'hello' (at load) | 'host' { game, seats } | 'join' { code } | 'send' { data } | 'leave'
//   | 'lobby' { mode, players }  (multiplayer('versus' | 'coop', n): show the lobby bar; no reply)
// parent -> iframe (each carries the run it answers):
//   { source: 'preview-online-reply', id, ok, result?, error? }
//   { source: 'preview-online-update', code, seat, seats, state, players, events }
//   { source: 'preview-online-room', code, codeIcons, seat, seats }  (the lobby bar put the run in a room; code null = out)
// A host/join reply's result and every room message carry codeIcons: the code's
// 4 picture names (lib/room-icons.ts, the one list), or null for an old 6-letter code.
//
// Real-time rooms (multiplayer(mode, n, { realtime: true }); REALTIME-SPEC.md):
// a room made with `live: true` is not polled. This hook opens a WebSocket to
// GET /api/live/<code>?device=<tab> instead (the iframe still never touches the
// network) and relays what arrives, in the protocol of lib/live-protocol.ts:
//   room 'hello' / 'players'  -> preview-online-update { code, seat, seats, state, players, live: true, seqBase? }
//   room 'move'               -> preview-online-update { code, events: [{ seq, seat, data }] }
//   room 'share' / 'unshare'  -> { source: 'preview-online-share' | 'preview-online-unshare', code, seat, list | id }
// and the iframe's ops 'send' (a move), 'share' { list } and 'unshare' { id? }
// go up the socket. A socket that drops is reopened (with backoff) while the
// route still says yes; the route's own words are shown when it says no.
//
// The lobby (components/MoshionLobby.tsx) drives the same room calls as the
// sketch's own online.host()/join(): this hook returns its view and actions.
// Rooms the lobby makes carry the page's game key (MoshionPreview's `gameKey`
// prop, through roomGameKey), and the open-rooms list shows only that key.

import { useEffect, useRef, useState, type RefObject } from 'react';
import { codeIcons } from './room-icons';
import { leaveOnUnload, leaveRoom as postLeave } from './room-leave';

const POLL_MS = 1000;
/**
 * While a lobby room is full the board is in play, so poll faster. Polling has
 * no server limit; moves stay inside send's 30 per 10 s per player.
 */
const POLL_READY_MS = 400;
export const GAME_KEY_MAX = 48;

/**
 * The room game key for a page: lowercase a-z, 0-9 and dashes, at most 48
 * characters (functions/_shared/rooms.ts GAME_RE). Lesson ids run to 65, so a
 * longer key keeps its first 39 characters and a dash plus an 8-hex hash of
 * the whole key: deterministic, so every student on one lesson gets the same
 * key and a different lesson cannot share it by accident. No key (or nothing
 * usable) is 'sandbox'. 'sandbox', 'game-<32 hex>' and a lesson id that fits
 * pass through unchanged.
 */
export function roomGameKey(raw?: string | null): string {
  let k = String(raw ?? '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/-{2,}/g, '-').replace(/^-+|-+$/g, '');
  if (!k) return 'sandbox';
  if (k.length <= GAME_KEY_MAX) return k;
  let h = 0x811c9dc5;
  for (let i = 0; i < k.length; i++) { h ^= k.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  k = k.slice(0, GAME_KEY_MAX - 9).replace(/-+$/, '');
  return `${k}-${h.toString(16).padStart(8, '0')}`;
}

export type LobbyMode = 'versus' | 'coop';
export interface LobbyPlayer { seat: number; name: string; left: boolean }
export interface LobbyRoom {
  code: string;
  seat: number;
  seats: number;
  state: 'waiting' | 'ready' | 'closed' | 'error';
  players: LobbyPlayer[];
  hosting: boolean;
}
/** What the lobby bar shows. null while the running sketch has not asked for one. */
export interface LobbyView {
  mode: LobbyMode;
  /** multiplayer(mode, n, { realtime: true }): live rooms over a WebSocket. */
  realtime: boolean;
  players: number;
  room: LobbyRoom | null;
  busy: boolean;
  error: string | null;
  /** Said once after a room went away ("Room ABC123 closed."). */
  notice: string | null;
}
export interface LobbyActions {
  host(): void;
  join(code: string): void;
  leave(): void;
}
export interface MoshionOnline {
  lobby: LobbyView | null;
  actions: LobbyActions;
  /** This tab's id (a seat is an account in a tab), for the open-rooms list. */
  device: string;
  gameKey: string;
}
const DEVICE_KEY = 'shcode.online.device';

/** A random id for this browser tab: a seat is an account in one tab (functions/api/rooms). Code together uses the same one. */
export function deviceId(): string {
  try {
    let d = sessionStorage.getItem(DEVICE_KEY);
    if (!d || !/^[a-z0-9]{8,32}$/.test(d)) {
      d = Array.from(crypto.getRandomValues(new Uint8Array(12)), (n) => (n % 36).toString(36)).join('');
      sessionStorage.setItem(DEVICE_KEY, d);
    }
    return d;
  } catch {
    return '';
  }
}
const POLL_HIDDEN_MS = 4000;
/** A live socket that dropped is reopened after this, doubling to LIVE_RETRY_MAX_MS. */
const LIVE_RETRY_MS = 500;
const LIVE_RETRY_MAX_MS = 8000;
/** Keep-alive ping: answered by the Durable Object without waking it. */
const LIVE_PING_MS = 25_000;
const LIVE_CLOSED = 4000;
const LIVE_REPLACED = 4001;

type Reply = { ok: true; result?: unknown } | { ok: false; error: string };

async function api(method: string, path: string, body?: unknown): Promise<{ status: number; body: Record<string, unknown> }> {
  const res = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let b: Record<string, unknown> = {};
  try { b = await res.json(); } catch { /* empty */ }
  return { status: res.status, body: b };
}

function errorOf(r: { status: number; body: Record<string, unknown> }): string {
  if (r.status === 401) return 'Sign in to play online.';
  return typeof r.body.error === 'string' ? r.body.error : `Online play failed (${r.status}).`;
}

export function useMoshionOnline(ref: RefObject<HTMLIFrameElement | null>, gameKey?: string | null): MoshionOnline {
  const key = roomGameKey(gameKey);
  const keyRef = useRef(key);
  keyRef.current = key;
  const [lobby, setLobby] = useState<LobbyView | null>(null);
  const [device] = useState(() => (typeof window === 'undefined' ? '' : deviceId()));
  const actionsRef = useRef<LobbyActions>({ host() {}, join() {}, leave() {} });
  const actions = useRef<LobbyActions>({
    host: () => actionsRef.current.host(),
    join: (c: string) => actionsRef.current.join(c),
    leave: () => actionsRef.current.leave(),
  }).current;

  useEffect(() => {
    let code: string | null = null;
    let after = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let polling = false;
    let session = 0; // bumps on every host/join/leave/rerun, so a stale poll is dropped
    let ws: WebSocket | null = null; // the live room's socket, when `code` is a live room
    let isLive = false; // `code` is a live room (its socket may be reconnecting)
    let liveTries = 0;
    let liveTimer: ReturnType<typeof setTimeout> | null = null;
    let pingTimer: ReturnType<typeof setInterval> | null = null;
    let run: string | null = null; // the sketch run being served
    const device = deviceId();

    // The lobby bar's state. `view` mirrors what React shows; `lobbyRoom` is
    // the room the lobby (not the sketch) put this run in, and `rejoin` is a
    // lobby-joined room to take again when a rerun asks for the lobby (the
    // seat is still ours: a joiner's rerun keeps it).
    let view: LobbyView | null = null;
    let lobbyRoom: string | null = null;
    let rejoin: string | null = null;
    const show = (next: LobbyView | null) => { view = next; setLobby(next); };
    const patch = (p: Partial<LobbyView>) => { if (view) show({ ...view, ...p }); };
    const patchRoom = (p: Partial<LobbyRoom>) => { if (view?.room) show({ ...view, room: { ...view.room, ...p } }); };

    const post = (msg: Record<string, unknown>) => {
      try { ref.current?.contentWindow?.postMessage({ ...msg, run }, '*'); } catch { /* frame gone */ }
    };

    // The room this run HOSTS: when the run ends (a rerun, leaving the page)
    // it is left, which closes it, so a classmate's board says "closed"
    // instead of waiting for a host who is gone. A joiner's rerun keeps its
    // seat and rejoins, so a joined room is only left when the page goes.
    let hosted: string | null = null;
    let joined: string | null = null;
    function leaveRoom(c: string | null) {
      if (c) void postLeave(c, device);
    }

    function closeLive() {
      const s = ws;
      ws = null;
      if (liveTimer) clearTimeout(liveTimer);
      liveTimer = null;
      if (pingTimer) clearInterval(pingTimer);
      pingTimer = null;
      liveTries = 0;
      if (s) { try { s.close(1000, 'done'); } catch { /* gone */ } }
    }

    function stop() {
      session++;
      code = null;
      after = 0;
      if (timer) clearTimeout(timer);
      timer = null;
      isLive = false;
      closeLive();
    }

    /** Start following the room just entered: a socket for a live room, the poll otherwise. */
    function follow(live: boolean) {
      isLive = live;
      if (live && code) connectLive(code);
      else void poll();
    }

    function liveSend(msg: unknown): boolean {
      if (!ws || ws.readyState !== 1) return false;
      try { ws.send(JSON.stringify(msg)); return true; } catch { return false; }
    }

    function connectLive(c: string) {
      if (ws) { const old = ws; ws = null; try { old.close(1000, 'again'); } catch { /* gone */ } }
      const mine = session;
      let sock: WebSocket;
      try {
        const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
        sock = new WebSocket(`${proto}//${location.host}/api/live/${encodeURIComponent(c)}?device=${device}`);
      } catch {
        void liveProblem(c, mine);
        return;
      }
      ws = sock;
      sock.onopen = () => {
        liveTries = 0;
        if (pingTimer) clearInterval(pingTimer);
        pingTimer = setInterval(() => { liveSend({ t: 'ping' }); }, LIVE_PING_MS);
      };
      sock.onmessage = (e) => {
        if (mine !== session || ws !== sock) return;
        let m: Record<string, unknown>;
        try { m = JSON.parse(String(e.data)); } catch { return; }
        onLive(c, m);
      };
      sock.onclose = (e) => {
        if (ws !== sock) return; // replaced or closed on purpose
        ws = null;
        if (pingTimer) { clearInterval(pingTimer); pingTimer = null; }
        if (mine !== session) return;
        if (e.code === LIVE_CLOSED) { liveClosed(c, 'closed'); return; }
        if (e.code === LIVE_REPLACED) {
          post({ source: 'preview-online-update', code: c, state: 'error', error: 'This seat connected again somewhere else.', events: [] });
          if (view?.room?.code === c) patch({ error: 'This seat connected again in another place.' });
          return;
        }
        void liveProblem(c, mine);
      };
    }

    /** The socket would not open or dropped: ask the route why, then retry or say so. */
    async function liveProblem(c: string, mine: number) {
      let r: { status: number; body: Record<string, unknown> } | null = null;
      try { r = await api('GET', `/api/live/${encodeURIComponent(c)}?device=${device}`); } catch { r = null; }
      if (mine !== session) return;
      if (r && (r.status === 404 || r.status === 410)) { liveClosed(c, errorOf(r)); return; }
      if (r && r.status !== 200) {
        // 503 (not switched on), 401, 403: retrying will not help.
        post({ source: 'preview-online-update', code: c, state: 'error', error: errorOf(r), events: [] });
        if (view?.room?.code === c) patchRoom({ state: 'error' });
        if (view?.room?.code === c) patch({ error: errorOf(r) });
        return;
      }
      // The route says yes (or the network is down for a moment): try again, slower each time.
      const wait = Math.min(LIVE_RETRY_MAX_MS, LIVE_RETRY_MS * 2 ** liveTries);
      liveTries++;
      post({ source: 'preview-online-update', code: c, state: 'connecting', events: [] });
      if (liveTimer) clearTimeout(liveTimer);
      liveTimer = setTimeout(() => { liveTimer = null; if (mine === session && code === c) connectLive(c); }, wait);
    }

    function liveClosed(c: string, why: string) {
      post({ source: 'preview-online-update', code: c, state: 'closed', error: why === 'closed' ? undefined : why, events: [] });
      if (view?.room && view.room.code === c) roomGone(c);
      stop();
    }

    function onLive(c: string, m: Record<string, unknown>) {
      if (m.t === 'hello' || m.t === 'players') {
        const msg: Record<string, unknown> = { source: 'preview-online-update', code: c, state: m.state, players: m.players, live: true, events: [] };
        if (m.t === 'hello') { msg.seat = m.seat; msg.seats = m.seats; msg.seqBase = m.seq; }
        post(msg);
        if (view?.room && view.room.code === c) {
          const p: Partial<LobbyRoom> = { state: m.state as LobbyRoom['state'], players: m.players as LobbyPlayer[] };
          if (m.t === 'hello') { p.seat = Number(m.seat); p.seats = Number(m.seats); }
          patchRoom(p);
          if (view?.error) patch({ error: null });
        }
        return;
      }
      if (m.t === 'move') {
        post({ source: 'preview-online-update', code: c, events: [{ seq: m.seq, seat: m.seat, data: m.data }] });
        return;
      }
      if (m.t === 'share') { post({ source: 'preview-online-share', code: c, seat: m.seat, list: m.list }); return; }
      if (m.t === 'unshare') { post({ source: 'preview-online-unshare', code: c, seat: m.seat, id: m.id }); return; }
      if (m.t === 'error') { post({ source: 'preview-online-update', code: c, error: m.error, events: [] }); return; }
      if (m.t === 'closed') { liveClosed(c, 'closed'); }
    }

    function schedule(ms: number) {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void poll(), ms);
    }

    async function poll() {
      if (!code || polling) return;
      polling = true;
      const mine = session;
      try {
        const r = await api('GET', `/api/rooms/${code}?after=${after}&device=${device}`);
        if (mine !== session) return;
        if (r.status !== 200) {
          const st = r.status === 404 || r.status === 410 ? 'closed' : 'error';
          post({ source: 'preview-online-update', code, state: st, error: errorOf(r), events: [] });
          if (view?.room && view.room.code === code) {
            if (st === 'closed') roomGone(code);
            else patch({ error: errorOf(r) });
          }
          if (r.status === 404 || r.status === 401) { stop(); return; }
          schedule(POLL_HIDDEN_MS);
          return;
        }
        const b = r.body as { events: { seq: number }[]; more: boolean; state: string; mySeat: number; seats: number; players: unknown };
        if (b.events.length) after = b.events[b.events.length - 1].seq;
        post({ source: 'preview-online-update', code, seat: b.mySeat, seats: b.seats, state: b.state, players: b.players, events: b.events });
        if (view?.room && view.room.code === code) {
          if (b.state === 'closed') roomGone(code);
          else patchRoom({ seat: b.mySeat, seats: b.seats, state: b.state as LobbyRoom['state'], players: b.players as LobbyPlayer[] });
          if (view?.error) patch({ error: null });
        }
        if (b.state === 'closed') { stop(); return; }
        const fast = lobbyRoom === code && b.state === 'ready';
        schedule(b.more ? 0 : document.hidden ? POLL_HIDDEN_MS : fast ? POLL_READY_MS : POLL_MS);
      } catch {
        if (mine === session) schedule(POLL_HIDDEN_MS); // offline for a moment: keep trying, slower
      } finally {
        polling = false;
      }
    }

    async function handle(op: string, d: Record<string, unknown>): Promise<Reply> {
      if (op === 'host') {
        stop();
        const r = await api('POST', '/api/rooms', { game: d.game, seats: d.seats, device, ...(d.live === true ? { live: true } : {}) });
        if (r.status !== 201) return { ok: false, error: errorOf(r) };
        code = String(r.body.code);
        hosted = code;
        lobbyRoom = null;
        enteredView(code, Number(r.body.seat), Number(r.body.seats), true);
        follow(r.body.live === true);
        return { ok: true, result: { ...r.body, codeIcons: codeIcons(code) } };
      }
      if (op === 'join') {
        stop();
        const want = String(d.code ?? '').toUpperCase().replace(/[\s-]/g, '');
        const r = await api('POST', `/api/rooms/${encodeURIComponent(want)}/join`, { device });
        if (r.status !== 200) return { ok: false, error: errorOf(r) };
        code = String(r.body.code);
        joined = code;
        lobbyRoom = null;
        enteredView(code, Number(r.body.seat), Number(r.body.seats), false);
        follow(r.body.live === true);
        return { ok: true, result: { ...r.body, codeIcons: codeIcons(code) } };
      }
      if (op === 'send') {
        if (!code) return { ok: false, error: 'Not in a room yet: call online.host() or online.join(code) first.' };
        if (isLive) {
          // A live room: the move goes up the socket and comes back to everyone (this tab too) as a 'move'.
          if (!liveSend({ t: 'move', data: d.data === undefined ? null : d.data })) return { ok: false, error: 'Still connecting to the room: try again in a moment.' };
          return { ok: true, result: {} };
        }
        const r = await api('POST', `/api/rooms/${code}/send`, { data: d.data, device });
        if (r.status !== 200) return { ok: false, error: errorOf(r) };
        if (!polling) { if (timer) clearTimeout(timer); void poll(); }
        return { ok: true, result: r.body };
      }
      if (op === 'leave') {
        const was = code;
        if (was === hosted) hosted = null;
        if (was === joined) joined = null;
        stop();
        if (was === lobbyRoom) { lobbyRoom = null; rejoin = null; }
        if (view) patch({ room: null });
        if (was) await api('POST', `/api/rooms/${was}/leave`, { device }).catch(() => {});
        return { ok: true };
      }
      return { ok: false, error: `Unknown online request "${op}".` };
    }

    function enteredView(c: string, seat: number, seats: number, hosting: boolean) {
      if (!view) return;
      show({ ...view, busy: false, error: null, notice: null, room: { code: c, seat, seats, state: 'waiting', players: [], hosting } });
    }

    /** The lobby's room closed (the host left, or it expired): back to Host / Join. */
    function roomGone(c: string) {
      if (lobbyRoom === c) lobbyRoom = null;
      if (rejoin === c) rejoin = null;
      if (hosted === c) hosted = null;
      if (joined === c) joined = null;
      patch({ room: null, notice: `Room ${c} closed.` });
    }

    // ---- the lobby bar's own actions (it, not the sketch, makes the room) ----
    async function lobbyEnter(make: () => Promise<{ status: number; body: Record<string, unknown> }>, ok: number, hosting: boolean, forRun: string | null) {
      if (!view || view.busy) return;
      patch({ busy: true, error: null, notice: null });
      const old = code;
      try {
        const r = await make();
        if (forRun !== run) return; // a rerun happened meanwhile
        if (r.status !== ok) { patch({ busy: false, error: errorOf(r) }); if (!hosting) rejoin = null; return; }
        // Leaving the room this run was in first: one room per run.
        if (old && old !== String(r.body.code)) {
          if (old === hosted) { leaveRoom(old); hosted = null; }
          else if (old === joined) { leaveRoom(old); joined = null; }
        }
        stop();
        code = String(r.body.code);
        lobbyRoom = code;
        if (hosting) { hosted = code; rejoin = null; } else { joined = code; rejoin = code; }
        const seat = Number(r.body.seat);
        const seats = Number(r.body.seats);
        const live = r.body.live === true;
        post({ source: 'preview-online-room', code, codeIcons: codeIcons(code), seat, seats, live });
        enteredView(code, seat, seats, hosting);
        follow(live);
      } catch (err) {
        if (forRun === run) patch({ busy: false, error: err instanceof Error ? err.message : 'Online play failed.' });
      }
    }

    actionsRef.current = {
      host() {
        if (!view) return;
        const body: Record<string, unknown> = { game: keyRef.current, seats: view!.players, device };
        if (view.realtime) body.live = true;
        void lobbyEnter(() => api('POST', '/api/rooms', body), 201, true, run);
      },
      join(raw: string) {
        if (!view) return;
        const want = String(raw ?? '').toUpperCase().replace(/[\s-]/g, '');
        if (!codeIcons(want) && !/^[A-Z0-9]{6}$/.test(want)) { patch({ error: 'A room code is 4 pictures (4 letters, like BHKE).' }); return; }
        void lobbyEnter(() => api('POST', `/api/rooms/${encodeURIComponent(want)}/join`, { device }), 200, false, run);
      },
      leave() {
        const was = lobbyRoom ?? view?.room?.code ?? null;
        if (!was) return;
        if (was === hosted) hosted = null;
        if (was === joined) joined = null;
        lobbyRoom = null;
        rejoin = null;
        stop();
        post({ source: 'preview-online-room', code: null });
        patch({ room: null, busy: false, error: null, notice: null });
        void api('POST', `/api/rooms/${was}/leave`, { device }).catch(() => {});
      },
    };

    function onMessage(e: MessageEvent) {
      const frame = ref.current;
      if (!frame || !frame.contentWindow || e.source !== frame.contentWindow) return;
      const d = e.data as Record<string, unknown> | null;
      if (!d || typeof d !== 'object') return;
      if (d.source !== 'preview-online' || typeof d.op !== 'string') return;
      // Every run of the sketch has its own id (extras.js says hello as it
      // loads). A new run starts from nothing: stop polling the old room,
      // without leaving it, so a rerun that joins again keeps its seat.
      if (d.run !== run) {
        stop();
        leaveRoom(hosted);
        hosted = null;
        lobbyRoom = null;
        run = typeof d.run === 'string' ? d.run : null;
        if (view) show(null); // the new run asks for a lobby again if it wants one
      }
      if (d.op === 'hello') return;
      // Shared sprites (online.share): fire and forget, live rooms only, never answered.
      if (d.op === 'share') { if (ws) liveSend({ t: 'share', list: d.list }); return; }
      if (d.op === 'unshare') { if (ws) liveSend(d.id === undefined ? { t: 'unshare' } : { t: 'unshare', id: d.id }); return; }
      if (d.op === 'lobby') {
        const mode = d.mode === 'versus' || d.mode === 'coop' ? d.mode : null;
        const n = Number(d.players);
        if (!mode || !Number.isInteger(n) || n < 2 || n > 4) return;
        show({ mode, realtime: d.realtime === true, players: n, room: null, busy: false, error: null, notice: null });
        // A joiner's rerun: take the same seat again without asking.
        if (rejoin) { const c = rejoin; void lobbyEnter(() => api('POST', `/api/rooms/${c}/join`, { device }), 200, false, run); }
        return;
      }
      const id = d.id;
      handle(d.op, d)
        .catch((err: unknown) => ({ ok: false as const, error: err instanceof Error ? err.message : String(err) }))
        .then((reply) => post({ source: 'preview-online-reply', id, ...reply }));
    }

    // The page going (the tab closing, a reload, another page): a beacon, which
    // still gets out after the tab has gone (lib/room-leave.ts). A joiner's seat
    // stays theirs in this tab, so Rejoin after a reload gives it back.
    const onHide = () => {
      for (const c of [hosted, joined]) if (c) leaveOnUnload(c, device);
      hosted = joined = null;
    };
    // Unmounting with the page still here (another page in the app): an ordinary leave.
    const onUnmount = () => { leaveRoom(hosted); leaveRoom(joined); hosted = joined = null; };
    window.addEventListener('message', onMessage);
    window.addEventListener('pagehide', onHide);
    return () => {
      window.removeEventListener('message', onMessage);
      window.removeEventListener('pagehide', onHide);
      stop();
      onUnmount();
      actionsRef.current = { host() {}, join() {}, leave() {} };
      setLobby(null);
    };
  }, [ref]);

  return { lobby, actions, device, gameKey: key };
}
