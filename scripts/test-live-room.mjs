#!/usr/bin/env node
// Tests real-time rooms (codehs-review/REALTIME-SPEC.md):
//   1. the shared protocol (lib/live-protocol.ts): move data is checkGameData,
//      the shared-sprite shape, unknown / oversized frames, tickets, the rate bucket;
//   2. LiveRoomCore (what the Durable Object AND the dev stand-in run): the seat
//      is stamped from the ticket, never the client; moves reach everyone in seq
//      order, shared sprites everyone else; one socket per seat; the rate limit
//      drops and says so once; an expired / closed room refuses; control ops;
//   3. the Pages route GET /api/live/[code] (functions/api/live/[code].ts):
//      no binding -> 503 (fails closed); a non-player, a stranger, another tab
//      -> 404; closed -> 410; a polling room -> 409; another origin -> 403; a
//      player's upgrade is forwarded with the ticket and without the cookie;
//   4. the rooms routes: POST {live:true} needs the binding, the lobby lists
//      live rooms only with live=1, the host leaving tells the room to close;
//      the leave a closing tab sends (lib/room-leave.ts: a text/plain beacon)
//      is accepted with the session and the device id;
//   5. the dev stand-in (scripts/dev-live.mjs) end to end over real sockets;
//   6. the host-gone rule (HOST_GONE_MS, on a fake clock): a room whose host has
//      had no socket for 60 s closes, D1 first (closeRoomRow), then the sockets;
//      a reconnect within 60 s keeps it; a woken room still knows; the same rule
//      on the dev stand-in.
//
// Run: node scripts/test-live-room.mjs

import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { compileHandler, makeD1, root } from './_d1-sqlite.mjs';

const require = createRequire(import.meta.url);
const { WebSocket } = require('next/dist/compiled/ws');
const P = await import(join(root, 'lib/live-protocol.ts'));
const { makeDevLive } = await import(join(root, 'scripts/dev-live.mjs'));

let passed = 0;
let failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log(`PASS  ${name}`); }
  else { failed++; console.error(`FAIL  ${name}${detail !== undefined ? ` -- ${typeof detail === 'string' ? detail : JSON.stringify(detail)}` : ''}`); }
}

// ---- 1. protocol ----
const parse = (o) => P.parseClientMessage(typeof o === 'string' ? o : JSON.stringify(o));
check('move: game data accepted', parse({ t: 'move', data: { dx: 1, dy: -1 } }).ok);
check('move: a sentence refused (checkGameData)', !parse({ t: 'move', data: { say: 'meet me at lunch' } }).ok);
check('move: over 1 KB refused', !parse({ t: 'move', data: { a: Array.from({ length: 64 }, () => 123456789.123), b: Array.from({ length: 64 }, () => 123456789.123) } }).ok);
check('move: missing data refused', !parse({ t: 'move' }).ok);
check('move: client seat is not part of the message', parse({ t: 'move', seat: 3, data: 1 }).ok && !('seat' in parse({ t: 'move', seat: 3, data: 1 }).msg));
const sprite = { id: 0, x: 10, y: 20, r: 45, vx: 1, vy: 0, w: 40, h: 40, c: 'gold', tx: 'coin', v: true };
check('share: a sprite state accepted', parse({ t: 'share', list: [sprite] }).ok);
check('share: rgba colour accepted', P.checkShared([{ ...sprite, c: 'rgba(255, 0, 0, 0.5)' }]) === null);
check('share: a colour with words refused', P.checkShared([{ ...sprite, c: 'meet me at lunch' }]) !== null);
check('share: an extra field refused (no room for words)', P.checkShared([{ ...sprite, note: 'hi' }]) !== null);
check('share: a texture with spaces refused', P.checkShared([{ ...sprite, tx: 'two words' }]) !== null);
check('share: NaN / Infinity refused', P.checkShared([{ ...sprite, x: 1e400 }]) !== null && parse('{"t":"share","list":[{"id":0,"x":null,"y":1}]}').ok === false);
check('share: x and y required', P.checkShared([{ id: 0, x: 1 }]) !== null);
check('share: ids 0-7 and distinct', P.checkShared([{ id: 8, x: 1, y: 1 }]) !== null && P.checkShared([{ id: 1, x: 1, y: 1 }, { id: 1, x: 2, y: 2 }]) !== null);
check('share: at most 8', P.checkShared(Array.from({ length: 9 }, (_, i) => ({ id: i % 8, x: 1, y: 1 }))) !== null);
check('share: empty refused', P.checkShared([]) !== null);
check('unshare / ping parse', parse({ t: 'unshare' }).ok && parse({ t: 'unshare', id: 2 }).ok && !parse({ t: 'unshare', id: 9 }).ok && parse({ t: 'ping' }).ok);
check('unknown type refused', !parse({ t: 'chat', text: 'hi' }).ok);
check('not JSON refused', !parse('hello').ok);
check('oversized frame refused', !P.parseClientMessage(JSON.stringify({ t: 'move', data: 'x'.repeat(P.MAX_FRAME_BYTES) })).ok);
check('binary (non-string) refused', !P.parseClientMessage(null).ok);
const t0 = { code: 'BHKE', seat: 1, seats: 2, name: 'Bo N.', expiresAt: Date.now() + 60000 };
check('ticket round trip', JSON.stringify(P.decodeTicket(P.encodeTicket(t0))) === JSON.stringify(t0));
check('ticket: seat outside the room refused', P.decodeTicket(JSON.stringify({ ...t0, seat: 2 })) === null);
check('ticket: junk refused', P.decodeTicket('{') === null && P.decodeTicket(null) === null && P.decodeTicket(JSON.stringify({ ...t0, code: 'bad code' })) === null);
{
  const b = P.newBucket(0);
  let n = 0;
  for (let i = 0; i < 100; i++) if (P.takeToken(b, 0)) n++;
  check(`bucket: burst of ${P.LIVE_BURST} then empty`, n === P.LIVE_BURST, n);
  let m = 0;
  for (let i = 0; i < 100; i++) if (P.takeToken(b, 1000)) m++;
  check(`bucket: refills ${P.LIVE_RATE_PER_SEC} a second`, m === P.LIVE_RATE_PER_SEC, m);
}

// ---- 2. LiveRoomCore with fake sockets ----
function fakeRoom(now = () => clock, opts = {}, socks = new Set()) {
  const core = new P.LiveRoomCore(() => [...socks], now, opts);
  const connect = (ticket) => {
    let att = null;
    const s = {
      got: [], closedWith: null,
      send(t) { this.got.push(JSON.parse(t)); },
      close(code) { this.closedWith = code; socks.delete(s); },
      attachment: () => att,
      attach: (a) => { att = a; },
    };
    socks.add(s);
    core.accept(s, ticket);
    return s;
  };
  /** The socket dropped (the tab closed): what the Durable Object's webSocketClose does. */
  const drop = (s) => { core.left(s); s.attach(null); socks.delete(s); };
  return { core, connect, socks, drop };
}
let clock = 1_000_000;
const exp = clock + 3_600_000;
{
  const { core, connect } = fakeRoom();
  const a = connect({ code: 'BHKE', seat: 0, seats: 2, name: 'Ann L.', expiresAt: exp });
  check('core: hello carries seat, seats, waiting', a.got[0]?.t === 'hello' && a.got[0].seat === 0 && a.got[0].seats === 2 && a.got[0].state === 'waiting', a.got[0]);
  const b = connect({ code: 'BHKE', seat: 1, seats: 2, name: 'Bo N.', expiresAt: exp });
  check('core: the room is ready when every seat is connected', b.got[0]?.state === 'ready' && a.got.at(-1)?.t === 'players' && a.got.at(-1).state === 'ready');
  check('core: players are names, never emails', JSON.stringify(a.got.at(-1).players) === JSON.stringify([{ seat: 0, name: 'Ann L.', left: false }, { seat: 1, name: 'Bo N.', left: false }]));
  a.got.length = 0; b.got.length = 0;
  core.message(b, JSON.stringify({ t: 'move', seat: 0, data: { dx: 1 } }));
  check('core: a move reaches everyone, the sender too', a.got[0]?.t === 'move' && b.got[0]?.t === 'move');
  check('core: the seat is stamped from the ticket, not the client', a.got[0]?.seat === 1, a.got[0]);
  core.message(a, JSON.stringify({ t: 'move', data: 2 }));
  check('core: seq counts up in order', a.got[0].seq === 1 && a.got[1].seq === 2 && b.got[1].seq === 2);
  a.got.length = 0; b.got.length = 0;
  core.message(a, JSON.stringify({ t: 'share', list: [sprite] }));
  check('core: a share reaches the others, not the sender', b.got[0]?.t === 'share' && b.got[0].seat === 0 && a.got.length === 0);
  core.message(a, JSON.stringify({ t: 'move', data: 'two words' }));
  check('core: bad data answers an error, nothing relayed', a.got.at(-1)?.t === 'error' && b.got.length === 1);
  check('core: the socket stays open after a refusal', a.closedWith === null);
  // Rate limit: a burst, then drops with ONE error a second.
  a.got.length = 0; b.got.length = 0;
  for (let i = 0; i < 100; i++) core.message(a, '{"t":"ping"}');
  const pongs = a.got.filter((m) => m.t === 'pong').length;
  const errs = a.got.filter((m) => m.t === 'error').length;
  check(`core: rate limit lets ${P.LIVE_BURST} through, then drops`, pongs <= P.LIVE_BURST && pongs >= P.LIVE_BURST - 5, pongs);
  check('core: the rate limit says so once, not per frame', errs === 1, errs);
  clock += 1000;
  a.got.length = 0;
  core.message(a, '{"t":"ping"}');
  check('core: a second later the bucket has refilled', a.got[0]?.t === 'pong');
  // Hibernation: a new core over the same sockets carries the seq on.
  const core2 = new P.LiveRoomCore(() => [a, b], () => clock);
  a.got.length = 0;
  core2.message(a, JSON.stringify({ t: 'move', data: 1 }));
  check('core: a woken room carries on the seq from the attachments', a.got[0]?.seq === 3, a.got[0]);
  // One socket per seat.
  const b2 = connect({ code: 'BHKE', seat: 1, seats: 2, name: 'Bo N.', expiresAt: exp });
  check('core: the same seat connecting again replaces the old socket', b.closedWith === P.LIVE_REPLACED && b2.got[0]?.t === 'hello');
  // A seat leaves (control from leave.ts).
  a.got.length = 0;
  check('core: control leave', core.control(JSON.stringify({ op: 'leave', seat: 1 })) && b2.closedWith === P.LIVE_CLOSED);
  check('core: the others see the seat go (unshare + players)', a.got.some((m) => m.t === 'unshare' && m.seat === 1) && a.got.at(-1).t === 'players' && a.got.at(-1).players.length === 1);
  check('core: junk control refused', core.control('nope') === false && core.control(JSON.stringify({ op: 'drop' })) === false);
  core.control(JSON.stringify({ op: 'close' }));
  check('core: the host closing closes every socket', a.closedWith === P.LIVE_CLOSED && a.got.some((m) => m.t === 'closed'));
  const late = connect({ code: 'BHKE', seat: 1, seats: 2, name: 'Bo N.', expiresAt: exp });
  check('core: a closed room refuses a new socket', late.closedWith === P.LIVE_CLOSED);
}
{
  const { connect, core } = fakeRoom();
  const old = connect({ code: 'BHKE', seat: 0, seats: 2, name: 'Ann L.', expiresAt: clock - 1 });
  check('core: an expired ticket is refused', old.closedWith === P.LIVE_CLOSED && old.got[0]?.t === 'closed');
  const ok = connect({ code: 'BHKE', seat: 0, seats: 2, name: 'Ann L.', expiresAt: clock + 10 });
  clock += 20;
  core.message(ok, '{"t":"ping"}');
  check('core: a room that expires closes on the next frame', ok.closedWith === P.LIVE_CLOSED);
}

// ---- 3/4. the Pages routes on a real SQLite ----
const out = join(root, '.tmp', 'live-test');
const liveR = compileHandler('api/live/[code].ts', join(out, 'live'));
const create = compileHandler('api/rooms/index.ts', join(out, 'create'));
const joinR = compileHandler('api/rooms/[code]/join.ts', join(out, 'join'));
const leaveR = compileHandler('api/rooms/[code]/leave.ts', join(out, 'leave'));
const sendR = compileHandler('api/rooms/[code]/send.ts', join(out, 'send'));

const db = makeD1();
const sql = (q, ...a) => db.sqlite.prepare(q).run(...a);
const FUTURE = 4102444800000;
sql(`INSERT INTO classes (id, name, code, owner_email, school_year, created_at) VALUES ('c1', 'P1', 'AAAAAA', 'teach@s.test', '2026-2027', 0)`);
sql(`INSERT INTO classes (id, name, code, owner_email, school_year, created_at) VALUES ('c2', 'P2', 'BBBBBB', 'other@s.test', '2026-2027', 0)`);
const student = (email, first, last, cls) => {
  sql(`INSERT INTO students (email, password_hash, created_at, role, first_name, last_name) VALUES (?, 'x', 0, 'student', ?, ?)`, email, first, last);
  sql(`INSERT INTO enrollments (class_id, student_email, enrolled_at, expires_at) VALUES (?, ?, 0, ?)`, cls, email, FUTURE);
};
student('ann@s.test', 'Ann', 'Lee', 'c1');
student('bo@s.test', 'Bo', 'Ng', 'c1');
student('cy@s.test', 'Cy', 'Ray', 'c1');
student('dee@s.test', 'Dee', 'Fox', 'c2');
const S = (email) => ({ email, role: 'student' });
const ANN = S('ann@s.test'), BO = S('bo@s.test'), CY = S('cy@s.test'), DEE = S('dee@s.test');
const DEV_A = 'tabaaaaaaaa1', DEV_B = 'tabbbbbbbbb2';

/** A fake env.LIVE that records what the route forwarded. */
function fakeNs() {
  const calls = [];
  return {
    calls,
    idFromName: (n) => `id:${n}`,
    get: (id) => ({ fetch: async (input, init) => { const r = input instanceof Request ? input : new Request(input, init); calls.push({ id, req: r }); return new Response('{"ok":true}', { status: 200 }); } }),
  };
}
const req = (method, path, body, headers = {}) => new Request(`https://shcode.test${path}`, {
  method, body: body === undefined ? undefined : JSON.stringify(body), headers: { 'Content-Type': 'application/json', ...headers },
});
async function call(h, fn, env, user, method, path, params, body, headers) {
  const res = await h[fn]({ env, data: user, params: params ?? {}, request: req(method, path, body, headers) });
  let b = null;
  try { b = await res.json(); } catch { /* none */ }
  return { status: res.status, body: b };
}
const ns = fakeNs();
const ENV = { DB: db, LIVE: ns };
const NOLIVE = { DB: db };

let r = await call(create, 'onRequestPost', NOLIVE, ANN, 'POST', '/api/rooms', {}, { game: 'race', seats: 2, device: DEV_A, live: true });
check('rooms: a live room needs the binding (503, offline)', r.status === 503 && r.body.offline === true, r);
r = await call(create, 'onRequestPost', ENV, ANN, 'POST', '/api/rooms', {}, { game: 'race', seats: 2, device: DEV_A, live: true });
check('rooms: a live room is made through the same POST', r.status === 201 && r.body.live === true, r);
const LIVE_CODE = r.body.code;
r = await call(create, 'onRequestPost', ENV, ANN, 'POST', '/api/rooms', {}, { game: 'race', seats: 2, device: DEV_A });
check('rooms: without the flag a room is a polling room', r.status === 201 && r.body.live === false);
const POLL_CODE = r.body.code;
const listed = async (live) => (await call(create, 'onRequestGet', ENV, BO, 'GET', `/api/rooms?game=race&device=${DEV_B}${live ? '&live=1' : ''}`)).body.rooms.map((x) => x.code);
check('rooms: a real-time lobby lists live rooms only', JSON.stringify(await listed(true)) === JSON.stringify([LIVE_CODE]));
check('rooms: every other lobby lists polling rooms only (unchanged)', JSON.stringify(await listed(false)) === JSON.stringify([POLL_CODE]));
r = await call(joinR, 'onRequestPost', ENV, BO, 'POST', `/api/rooms/${LIVE_CODE}/join`, { code: LIVE_CODE }, { device: DEV_B });
check('rooms: join answers live: true', r.status === 200 && r.body.live === true && r.body.seat === 1, r);
r = await call(sendR, 'onRequestPost', ENV, BO, 'POST', `/api/rooms/${LIVE_CODE}/send`, { code: LIVE_CODE }, { data: { n: 1 }, device: DEV_B });
check('rooms: the polling send route refuses a live room (nothing stored per move)', r.status === 409 && db.sqlite.prepare('SELECT COUNT(*) AS n FROM game_room_events WHERE code = ?').get(LIVE_CODE).n === 0, r);

const live = (env, user, code, device, headers) => call(liveR, 'onRequestGet', env, user, 'GET', `/api/live/${code}?device=${device}`, { code }, undefined, headers);
const UP = { Upgrade: 'websocket', Cookie: 'session=secret', 'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==', 'Sec-WebSocket-Version': '13' };
r = await live(NOLIVE, ANN, LIVE_CODE, DEV_A, UP);
check('route: no LIVE binding -> 503 JSON (fails closed)', r.status === 503 && r.body.offline === true && /not switched on/.test(r.body.error), r);
r = await live(ENV, ANN, LIVE_CODE, DEV_A);
check('route: a player without Upgrade gets the check as JSON', r.status === 200 && r.body.ok === true && r.body.seat === 0, r);
r = await live(ENV, CY, LIVE_CODE, DEV_A, UP);
check('route: a classmate who is not a player -> 404', r.status === 404, r);
r = await live(ENV, DEE, LIVE_CODE, DEV_A, UP);
check('route: a stranger (another class) -> 404, same words', r.status === 404 && r.body.error === 'You are not in that room.', r);
r = await live(ENV, ANN, LIVE_CODE, 'othertab0000', UP);
check('route: the same account in another tab holds no seat -> 404', r.status === 404, r);
r = await live(ENV, ANN, 'ZZZZ', DEV_A, UP);
check('route: a code that does not exist -> 404', r.status === 404 || r.status === 400, r);
r = await live(ENV, ANN, 'bad!', DEV_A, UP);
check('route: a malformed code -> 400', r.status === 400, r);
r = await live(ENV, ANN, POLL_CODE, DEV_A, UP);
check('route: a polling room -> 409', r.status === 409, r);
r = await live(ENV, ANN, LIVE_CODE, DEV_A, { ...UP, Origin: 'https://evil.test' });
check('route: another site\'s page -> 403', r.status === 403, r);
ns.calls.length = 0;
r = await live(ENV, BO, LIVE_CODE, DEV_B, { ...UP, Origin: 'https://shcode.test', [P.TICKET_HEADER]: '{"forged":true}' });
const fwd = ns.calls[0]?.req;
const ticket = fwd ? P.decodeTicket(fwd.headers.get(P.TICKET_HEADER)) : null;
check('route: a player\'s upgrade is forwarded to the room', ns.calls.length === 1 && fwd.headers.get('Upgrade') === 'websocket', ns.calls.length);
check('route: the room is keyed by code and creation time (a reused code is a new room)', ns.calls[0]?.id?.startsWith(`id:${LIVE_CODE}-`));
check('route: the ticket names the seat from D1, not the client', ticket && ticket.seat === 1 && ticket.seats === 2 && ticket.name === 'Bo N.' && ticket.code === LIVE_CODE, ticket);
check('route: the cookie is not passed to the room', fwd && !fwd.headers.get('Cookie'));
// leave: the host leaving tells the room to close; a joiner leaving drops its seat.
ns.calls.length = 0;
r = await call(leaveR, 'onRequestPost', ENV, BO, 'POST', `/api/rooms/${LIVE_CODE}/leave`, { code: LIVE_CODE }, { device: DEV_B });
const ctl1 = ns.calls[0]?.req.headers.get(P.CONTROL_HEADER);
check('leave: a joiner leaving drops its seat in the room', r.status === 200 && ctl1 && JSON.parse(ctl1).op === 'leave' && JSON.parse(ctl1).seat === 1, ctl1);
r = await live(ENV, BO, LIVE_CODE, DEV_B, UP);
check('route: a player who left must join again -> 404', r.status === 404, r);
ns.calls.length = 0;
r = await call(leaveR, 'onRequestPost', ENV, ANN, 'POST', `/api/rooms/${LIVE_CODE}/leave`, { code: LIVE_CODE }, { device: DEV_A });
const ctl2 = ns.calls[0]?.req.headers.get(P.CONTROL_HEADER);
check('leave: the host leaving tells the room to close', ctl2 && JSON.parse(ctl2).op === 'close', ctl2);
r = await call(joinR, 'onRequestPost', ENV, BO, 'POST', `/api/rooms/${LIVE_CODE}/join`, { code: LIVE_CODE }, { device: DEV_B });
r = await live(ENV, ANN, LIVE_CODE, DEV_A, UP);
check('route: a closed room -> 410', r.status === 410, r);
ns.calls.length = 0;
await call(leaveR, 'onRequestPost', ENV, ANN, 'POST', `/api/rooms/${POLL_CODE}/leave`, { code: POLL_CODE }, { device: DEV_A });
check('leave: a polling room never calls the binding', ns.calls.length === 0);

// The leave a closing tab sends (lib/room-leave.ts): navigator.sendBeacon, a text/plain body.
{
  const RL = await import(join(root, 'lib/room-leave.ts'));
  const sent = [];
  const nav = { sendBeacon(url, body) { sent.push({ url, body, self: this }); return true; } };
  const fetched = [];
  const f = async (url, init) => { fetched.push({ url, init }); return {}; };
  check('unload: a beacon to the leave route with this tab\'s device', RL.leaveOnUnload('BHKE', DEV_A, nav, f) === true
    && sent.length === 1 && sent[0].url === '/api/rooms/BHKE/leave' && JSON.parse(sent[0].body).device === DEV_A && sent[0].self === nav && fetched.length === 0, sent);
  const refusing = { sendBeacon() { return false; } };
  check('unload: a refused beacon falls back to a keepalive fetch', RL.leaveOnUnload('BHKE', DEV_A, refusing, f) === false
    && fetched.length === 1 && fetched[0].init.keepalive === true && JSON.parse(fetched[0].init.body).device === DEV_A, fetched);
  const throwing = { sendBeacon() { throw new Error('no'); } };
  check('unload: a beacon that throws falls back too', RL.leaveOnUnload('BHKE', DEV_A, throwing, f) === false && fetched.length === 2);
  check('unload: no navigator at all still sends the fetch', RL.leaveOnUnload('BHKE', DEV_A, null, f) === false && fetched.length === 3);
  let done = false;
  await RL.leaveRoom('BHKE', DEV_A, async () => { throw new Error('offline'); }).then(() => { done = true; });
  check('leaveRoom: resolves (never rejects) when the network is down', done);

  // The route reads the beacon's text/plain body as JSON, with the session from the cookie.
  r = await call(create, 'onRequestPost', ENV, ANN, 'POST', '/api/rooms', {}, { game: 'race', seats: 2, device: DEV_A, live: true });
  const BEACON_CODE = r.body.code;
  await call(joinR, 'onRequestPost', ENV, BO, 'POST', `/api/rooms/${BEACON_CODE}/join`, { code: BEACON_CODE }, { device: DEV_B });
  const beacon = (user, device) => leaveR.onRequestPost({
    env: ENV, data: user, params: { code: BEACON_CODE },
    request: new Request(`https://shcode.test${RL.leaveUrl(BEACON_CODE)}`, {
      method: 'POST', body: JSON.stringify({ device }), headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    }),
  }).then(async (res) => ({ status: res.status, body: await res.json() }));
  r = await beacon(BO, DEV_B);
  check('beacon: a joiner\'s text/plain leave is accepted (left, seat kept for a rejoin)', r.status === 200 && r.body.left === true
    && db.sqlite.prepare('SELECT left_at FROM game_room_players WHERE code = ? AND seat = 1').get(BEACON_CODE).left_at !== null, r);
  r = await call(joinR, 'onRequestPost', ENV, BO, 'POST', `/api/rooms/${BEACON_CODE}/join`, { code: BEACON_CODE }, { device: DEV_B });
  check('beacon: a reload in the same tab gets its seat back (same device)', r.status === 200 && r.body.seat === 1, r);
  ns.calls.length = 0;
  r = await beacon(ANN, DEV_A);
  const ctl = ns.calls[0]?.req.headers.get(P.CONTROL_HEADER);
  check('beacon: the host\'s closing tab closes the room, in D1 and in the live room', r.status === 200
    && db.sqlite.prepare('SELECT closed_at FROM game_rooms WHERE code = ?').get(BEACON_CODE).closed_at !== null && ctl && JSON.parse(ctl).op === 'close', [r, ctl]);
  r = await beacon(BO, 'othertab0000');
  check('beacon: another tab\'s device leaves nothing', r.status === 200 && r.body.left === false, r);
}

// ---- 5. the dev stand-in over real sockets ----
const dev = makeDevLive({ db, identity: (rq) => { const e = rq.headers['x-test-user']; return e ? { email: e, role: 'student' } : null; } });
const DEVENV = { DB: db, LIVE: dev.namespace };
const server = createServer((_q, s) => { s.statusCode = 404; s.end(); });
server.on('upgrade', dev.onUpgrade);
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const port = server.address().port;
r = await call(create, 'onRequestPost', DEVENV, ANN, 'POST', '/api/rooms', {}, { game: 'race', seats: 2, device: DEV_A, live: true });
const DEV_CODE = r.body.code;
await call(joinR, 'onRequestPost', DEVENV, BO, 'POST', `/api/rooms/${DEV_CODE}/join`, { code: DEV_CODE }, { device: DEV_B });

function open(email, code, device) {
  return new Promise((resolve) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/api/live/${code}?device=${device}`, { headers: { 'x-test-user': email } });
    const got = [];
    const waiters = [];
    ws.on('message', (d) => { const m = JSON.parse(String(d)); got.push(m); for (const w of waiters.splice(0)) w(); });
    ws.on('open', () => resolve({ ws, got, status: 101, next: (pred, ms = 2000) => new Promise((ok) => {
      const t0 = Date.now();
      const look = () => { const m = got.find(pred); if (m) return ok(m); if (Date.now() - t0 > ms) return ok(null); waiters.push(look); setTimeout(look, 50); };
      look();
    }) }));
    ws.on('unexpected-response', (_q, res) => { let body = ''; res.on('data', (c) => { body += c; }); res.on('end', () => resolve({ status: res.statusCode, body })); });
    ws.on('error', () => resolve({ status: 0 }));
  });
}
const A = await open('ann@s.test', DEV_CODE, DEV_A);
const B = await open('bo@s.test', DEV_CODE, DEV_B);
check('dev: both players connect (101)', A.status === 101 && B.status === 101, [A.status, B.status]);
const helloB = await B.next((m) => m.t === 'hello');
check('dev: hello with seat 1 and a ready room', helloB?.seat === 1 && helloB.state === 'ready', helloB);
B.ws.send(JSON.stringify({ t: 'move', seat: 0, data: { dx: -1 } }));
const mvA = await A.next((m) => m.t === 'move');
check('dev: a move arrives on the other socket, stamped with the sender\'s seat', mvA?.seat === 1 && mvA.data.dx === -1, mvA);
A.ws.send(JSON.stringify({ t: 'share', list: [sprite] }));
const shB = await B.next((m) => m.t === 'share');
check('dev: a shared sprite arrives on the other socket', shB?.seat === 0 && shB.list[0].x === 10, shB);
A.ws.send(JSON.stringify({ t: 'move', data: 'no spaces allowed' }));
const errA = await A.next((m) => m.t === 'error');
check('dev: bad data refused on the socket with the course\'s words', errA && /spaces/.test(errA.error), errA);
const C = await open('cy@s.test', DEV_CODE, DEV_A);
check('dev: a classmate without a seat is refused at the upgrade (404)', C.status === 404 && /not in that room/.test(C.body), C);
const D = await open('dee@s.test', DEV_CODE, DEV_A);
check('dev: a stranger is refused at the upgrade (404)', D.status === 404, D.status);
const N = await open('', DEV_CODE, DEV_A);
check('dev: no identity is refused (401)', N.status === 401, N.status);
for (let i = 0; i < 80; i++) B.ws.send('{"t":"ping"}');
await B.next((m) => m.t === 'error' && /Too many/.test(m.error));
check('dev: the rate limit holds on a real socket', B.got.some((m) => m.t === 'error' && /Too many/.test(m.error)));
const closedB = new Promise((ok) => B.ws.on('close', (code) => ok(code)));
await call(leaveR, 'onRequestPost', DEVENV, ANN, 'POST', `/api/rooms/${DEV_CODE}/leave`, { code: DEV_CODE }, { device: DEV_A });
const code = await Promise.race([closedB, new Promise((ok) => setTimeout(() => ok('timeout'), 2000))]);
check('dev: the host leaving closes the other socket with the room-closed code', code === P.LIVE_CLOSED, code);
const late = await open('bo@s.test', DEV_CODE, DEV_B);
check('dev: a closed room refuses (410)', late.status === 410, late.status);
const other = await new Promise((resolve) => {
  const ws = new WebSocket(`ws://127.0.0.1:${port}/_next/webpack-hmr`);
  const t = setTimeout(() => { resolve('left alone'); ws.on('error', () => {}); ws.terminate(); }, 300);
  ws.on('unexpected-response', () => { clearTimeout(t); resolve('answered'); });
  ws.on('error', (e) => { clearTimeout(t); resolve(`error ${e.message}`); });
});
check('dev: other upgrade paths (Next\'s HMR) are not touched', other === 'left alone', other);
for (const x of [A, B]) try { x.ws.terminate(); } catch { /* gone */ }
dev.close();
server.close();

// ---- 6. the host-gone rule on a fake clock ----
{
  const memStore = () => {
    const st = { state: null, saves: 0 };
    st.load = () => (st.state ? JSON.parse(JSON.stringify(st.state)) : null);
    st.save = (v) => { st.state = JSON.parse(JSON.stringify(v)); st.saves++; };
    return st;
  };
  const store = memStore();
  const scheduled = [];
  const rows = [];
  const socks = new Set();
  let joiner = null;
  const opts = {
    store,
    schedule: (at) => scheduled.push(at),
    // D1 first: when the row is written, the joiner must not have been told yet.
    closeRow: async (room) => { rows.push({ ...room, toldFirst: !!joiner?.got.some((m) => m.t === 'closed') }); },
  };
  const end = clock + 3_600_000;
  const { core, connect, drop } = fakeRoom(() => clock, opts, socks);
  const host = connect({ code: 'HKGN', seat: 0, seats: 2, name: 'Ann L.', expiresAt: end });
  joiner = connect({ code: 'HKGN', seat: 1, seats: 2, name: 'Bo N.', expiresAt: end });
  check('host-gone: nothing counts while the host is here', store.state?.hostGoneAt === null && scheduled.length === 0, [store.state, scheduled]);
  check('host-gone: the room keeps its code and end in its own storage', store.state?.code === 'HKGN' && store.state.expiresAt === end && core.expiresAt() === end, store.state);
  drop(host);
  const left = clock;
  check('host-gone: the host\'s socket going starts the clock (kept in storage)', store.state.hostGoneAt === left, store.state);
  check(`host-gone: a check is asked for ${P.HOST_GONE_MS / 1000} s later`, scheduled.at(-1) === left + P.HOST_GONE_MS, scheduled);
  check('host-gone: the others see the host go', joiner.got.at(-1)?.t === 'players' && joiner.got.at(-1).players.length === 1);
  clock = left + P.HOST_GONE_MS - 1000;
  check('host-gone: 59 s on, the room stays open', core.checkHost() === false && !core.closed && joiner.closedWith === null);
  check('host-gone: an early check asks again at the deadline', scheduled.at(-1) === left + P.HOST_GONE_MS);
  // The host comes back within 60 s (a dropped connection, the socket reopening).
  const host2 = connect({ code: 'HKGN', seat: 0, seats: 2, name: 'Ann L.', expiresAt: end });
  check('host-gone: the host back within 60 s stops the clock', store.state.hostGoneAt === null && host2.got[0]?.t === 'hello', store.state);
  clock = left + P.HOST_GONE_MS + 5000;
  check('host-gone: ...and the room stays open past the old deadline', core.checkHost() === false && !core.closed && joiner.closedWith === null && rows.length === 0);
  // The host goes again; a room that hibernated meanwhile (a new core over the same storage and sockets) still knows.
  drop(host2);
  const left2 = clock;
  const woke = new P.LiveRoomCore(() => [...socks], () => clock, opts);
  check('host-gone: a woken room reads when the host went', woke.expiresAt() === end && store.state.hostGoneAt === left2);
  clock = left2 + P.HOST_GONE_MS;
  check('host-gone: 60 s on, the room closes', woke.checkHost() === true && woke.closed);
  await woke.idle();
  check('host-gone: the D1 row is closed first (code and end name it)', rows.length === 1 && rows[0].code === 'HKGN' && rows[0].expiresAt === end && rows[0].toldFirst === false, rows);
  check('host-gone: then every socket is told and closed', joiner.got.some((m) => m.t === 'closed' && m.reason === P.HOST_GONE_ROOM) && joiner.closedWith === P.LIVE_CLOSED, joiner.got.at(-1));
  check('host-gone: the closed room says so in storage', store.state.closed === true);
  const late = new P.LiveRoomCore(() => [], () => clock, opts);
  check('host-gone: a room woken after it closed stays closed', late.closed === true && late.checkHost() === false);
  check('host-gone: it closes once', woke.checkHost() === false && rows.length === 1);
}
{
  // A joiner connected before the host (or with no host at all) starts the clock too.
  const scheduled = [];
  const { core, connect } = fakeRoom(() => clock, { schedule: (at) => scheduled.push(at) });
  const end = clock + 3_600_000;
  const bo = connect({ code: 'NOHS', seat: 1, seats: 2, name: 'Bo N.', expiresAt: end });
  check('host-gone: a joiner alone starts the clock', scheduled.at(-1) === clock + P.HOST_GONE_MS);
  connect({ code: 'NOHS', seat: 0, seats: 2, name: 'Ann L.', expiresAt: end });
  clock += P.HOST_GONE_MS + 1;
  check('host-gone: the host arriving stops it (no store: memory only)', core.checkHost() === false && bo.closedWith === null);
  check('host-gone: the host pressing Leave still closes at once (control)', core.control(JSON.stringify({ op: 'close' })) && bo.closedWith === P.LIVE_CLOSED);
}
{
  // closeRoomRow on a real SQLite: the row with this code AND end, once.
  r = await call(create, 'onRequestPost', ENV, ANN, 'POST', '/api/rooms', {}, { game: 'race', seats: 2, device: DEV_A, live: true });
  const C = r.body.code;
  const rowOf = () => db.sqlite.prepare('SELECT closed_at, expires_at FROM game_rooms WHERE code = ?').get(C);
  await P.closeRoomRow(db, C, rowOf().expires_at + 1, 123);
  check('closeRoomRow: another room\'s end (a reused code) is left alone', rowOf().closed_at === null);
  await P.closeRoomRow(db, C, rowOf().expires_at, 456);
  check('closeRoomRow: marks the room closed', rowOf().closed_at === 456);
  await P.closeRoomRow(db, C, rowOf().expires_at, 789);
  check('closeRoomRow: a closed_at already written stays', rowOf().closed_at === 456);
  const listedNow = (await call(create, 'onRequestGet', ENV, BO, 'GET', `/api/rooms?game=race&device=${DEV_B}&live=1`)).body.rooms.map((x) => x.code);
  check('closeRoomRow: the open list no longer offers it', !listedNow.includes(C), listedNow);
}
{
  // The same rule on the dev stand-in: its timer is set, and the check closes the row in its database.
  let devClock = Date.now();
  const dev2 = makeDevLive({ db, identity: (rq) => { const e = rq.headers['x-test-user']; return e ? { email: e, role: 'student' } : null; }, now: () => devClock });
  const ENV2 = { DB: db, LIVE: dev2.namespace };
  const srv = createServer((_q, s) => { s.statusCode = 404; s.end(); });
  srv.on('upgrade', dev2.onUpgrade);
  await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
  const p2 = srv.address().port;
  r = await call(create, 'onRequestPost', ENV2, ANN, 'POST', '/api/rooms', {}, { game: 'race', seats: 2, device: DEV_A, live: true });
  const C2 = r.body.code;
  await call(joinR, 'onRequestPost', ENV2, BO, 'POST', `/api/rooms/${C2}/join`, { code: C2 }, { device: DEV_B });
  const sock = (email, device) => new Promise((resolve) => {
    const ws = new WebSocket(`ws://127.0.0.1:${p2}/api/live/${C2}?device=${device}`, { headers: { 'x-test-user': email } });
    const got = [];
    ws.on('message', (d) => got.push(JSON.parse(String(d))));
    ws.on('open', () => resolve({ ws, got }));
    ws.on('error', () => resolve(null));
  });
  const HA = await sock('ann@s.test', DEV_A);
  const HB = await sock('bo@s.test', DEV_B);
  await new Promise((ok) => setTimeout(ok, 100));
  const closedB = new Promise((ok) => HB.ws.on('close', (code) => ok(code)));
  HA.ws.terminate(); // the host's tab died: no leave request at all
  await new Promise((ok) => setTimeout(ok, 150));
  const devRoom = [...dev2.rooms.values()][0];
  check('dev: the host\'s socket going sets the room\'s timer', !!devRoom?.hostTimer && devRoom.hostTimerAt === devClock + P.HOST_GONE_MS, devRoom && devRoom.hostTimerAt);
  devClock += P.HOST_GONE_MS;
  devRoom.core.checkHost();
  await devRoom.core.idle();
  const code2 = await Promise.race([closedB, new Promise((ok) => setTimeout(() => ok('timeout'), 2000))]);
  check('dev: a minute on, the joiner is told the room closed', code2 === P.LIVE_CLOSED && HB.got.some((m) => m.t === 'closed'), code2);
  check('dev: ...and the row is closed in the dev database', db.sqlite.prepare('SELECT closed_at FROM game_rooms WHERE code = ?').get(C2).closed_at !== null);
  const relist = (await call(create, 'onRequestGet', ENV2, S('cy@s.test'), 'GET', `/api/rooms?game=race&device=${DEV_A}&live=1`)).body.rooms.map((x) => x.code);
  check('dev: the dead room is gone from the open list', !relist.includes(C2), relist);
  for (const x of [HA, HB]) try { x.ws.terminate(); } catch { /* gone */ }
  dev2.close();
  srv.close();
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
