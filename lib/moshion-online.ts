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
// parent -> iframe (each carries the run it answers):
//   { source: 'preview-online-reply', id, ok, result?, error? }
//   { source: 'preview-online-update', code, seat, seats, state, players, events }

import { useEffect, type RefObject } from 'react';

const POLL_MS = 1000;
const DEVICE_KEY = 'shcode.online.device';

/** A random id for this browser tab: a seat is an account in one tab (functions/api/rooms). */
function deviceId(): string {
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

export function useMoshionOnline(ref: RefObject<HTMLIFrameElement | null>): void {
  useEffect(() => {
    let code: string | null = null;
    let after = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let polling = false;
    let session = 0; // bumps on every host/join/leave/rerun, so a stale poll is dropped
    let run: string | null = null; // the sketch run being served
    const device = deviceId();

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
      if (!c) return;
      try {
        void fetch(`/api/rooms/${c}/leave`, {
          method: 'POST', credentials: 'same-origin', keepalive: true,
          headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ device }),
        }).catch(() => {});
      } catch { /* page going */ }
    }

    function stop() {
      session++;
      code = null;
      after = 0;
      if (timer) clearTimeout(timer);
      timer = null;
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
          post({ source: 'preview-online-update', code, state: r.status === 404 || r.status === 410 ? 'closed' : 'error', error: errorOf(r), events: [] });
          if (r.status === 404 || r.status === 401) { stop(); return; }
          schedule(POLL_HIDDEN_MS);
          return;
        }
        const b = r.body as { events: { seq: number }[]; more: boolean; state: string; mySeat: number; seats: number; players: unknown };
        if (b.events.length) after = b.events[b.events.length - 1].seq;
        post({ source: 'preview-online-update', code, seat: b.mySeat, seats: b.seats, state: b.state, players: b.players, events: b.events });
        if (b.state === 'closed') { stop(); return; }
        schedule(b.more ? 0 : document.hidden ? POLL_HIDDEN_MS : POLL_MS);
      } catch {
        if (mine === session) schedule(POLL_HIDDEN_MS); // offline for a moment: keep trying, slower
      } finally {
        polling = false;
      }
    }

    async function handle(op: string, d: Record<string, unknown>): Promise<Reply> {
      if (op === 'host') {
        stop();
        const r = await api('POST', '/api/rooms', { game: d.game, seats: d.seats, device });
        if (r.status !== 201) return { ok: false, error: errorOf(r) };
        code = String(r.body.code);
        hosted = code;
        void poll();
        return { ok: true, result: r.body };
      }
      if (op === 'join') {
        stop();
        const want = String(d.code ?? '').toUpperCase().replace(/[\s-]/g, '');
        const r = await api('POST', `/api/rooms/${encodeURIComponent(want)}/join`, { device });
        if (r.status !== 200) return { ok: false, error: errorOf(r) };
        code = String(r.body.code);
        joined = code;
        void poll();
        return { ok: true, result: r.body };
      }
      if (op === 'send') {
        if (!code) return { ok: false, error: 'Not in a room yet: call online.host() or online.join(code) first.' };
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
        if (was) await api('POST', `/api/rooms/${was}/leave`, { device }).catch(() => {});
        return { ok: true };
      }
      return { ok: false, error: `Unknown online request "${op}".` };
    }

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
        run = typeof d.run === 'string' ? d.run : null;
      }
      if (d.op === 'hello') return;
      const id = d.id;
      handle(d.op, d)
        .catch((err: unknown) => ({ ok: false as const, error: err instanceof Error ? err.message : String(err) }))
        .then((reply) => post({ source: 'preview-online-reply', id, ...reply }));
    }

    const onHide = () => { leaveRoom(hosted); leaveRoom(joined); hosted = joined = null; };
    window.addEventListener('message', onMessage);
    window.addEventListener('pagehide', onHide);
    return () => {
      window.removeEventListener('message', onMessage);
      window.removeEventListener('pagehide', onHide);
      stop();
      onHide();
    };
  }, [ref]);
}
