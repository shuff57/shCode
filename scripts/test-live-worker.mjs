#!/usr/bin/env node
// The REAL LiveRoom and LiveDoc Durable Objects (workers/live/) under
// `wrangler dev` (miniflare, local only, deploys nothing). Not in npm test: it
// needs the Worker running. LiveDoc (Code together) is checked last: seed,
// relay of an update stamped with the seat, a stale push caught up, presence,
// the frame limit, the rate limit, each class refusing the other kind's ticket,
// and the text written to the local D1 code_sessions on close.
//
//   cd workers/live && npx wrangler dev -c wrangler.test.toml --port 8799
//   node scripts/test-live-worker.mjs http://127.0.0.1:8799
//
// wrangler.test.toml's gateway plays the Pages Function (it mints the ticket);
// everything after the upgrade is the production class.

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { WebSocket } = require('next/dist/compiled/ws');
const base = (process.argv[2] || 'http://127.0.0.1:8799').replace(/\/$/, '');
const wsBase = base.replace(/^http/, 'ws');
const key = `TEST-${Date.now()}`;

let passed = 0;
let failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log(`PASS  ${name}`); }
  else { failed++; console.error(`FAIL  ${name}${detail !== undefined ? ` -- ${JSON.stringify(detail)}` : ''}`); }
}

function open(path) {
  return new Promise((resolve) => {
    const ws = new WebSocket(`${wsBase}${path}`);
    const got = [];
    let closed = null;
    ws.on('message', (d) => got.push(JSON.parse(String(d))));
    ws.on('close', (code) => { closed = code; });
    const next = (pred, ms = 3000) => new Promise((ok) => {
      const t0 = Date.now();
      const look = () => { const m = got.find(pred); if (m) return ok(m); if (Date.now() - t0 > ms) return ok(null); setTimeout(look, 20); };
      look();
    });
    ws.on('open', () => resolve({ ws, got, next, status: 101, closed: () => closed }));
    ws.on('unexpected-response', (_q, res) => resolve({ status: res.statusCode }));
    ws.on('error', (e) => resolve({ status: 0, error: e.message }));
  });
}
const wait = (ms) => new Promise((ok) => setTimeout(ok, ms));

const A = await open(`/room/${key}?code=BHKE&seat=0&seats=2&name=Ann%20L.`);
const B = await open(`/room/${key}?code=BHKE&seat=1&seats=2&name=Bo%20N.`);
check('worker: two sockets open on the real Durable Object', A.status === 101 && B.status === 101, [A.status, B.status, A.error]);
const hello = await B.next((m) => m.t === 'hello');
check('worker: hello names seat 1 and a ready room', hello?.seat === 1 && hello.state === 'ready', hello);
const players = await A.next((m) => m.t === 'players' && m.state === 'ready');
check('worker: the host hears the room fill', players?.players?.length === 2, players);

const t0 = Date.now();
B.ws.send(JSON.stringify({ t: 'move', seat: 0, data: { dx: 1 } }));
const mv = await A.next((m) => m.t === 'move');
check(`worker: relay of a move (${Date.now() - t0} ms)`, mv?.data?.dx === 1, mv);
check('worker: the move is stamped with the sender\'s seat, not the client\'s', mv?.seat === 1, mv);
const own = await B.next((m) => m.t === 'move');
check('worker: the sender gets its own move back in the same order', own?.seq === mv?.seq);

A.ws.send(JSON.stringify({ t: 'share', list: [{ id: 0, x: 12.5, y: 40, r: 0, w: 40, h: 40, c: 'gold' }] }));
const sh = await B.next((m) => m.t === 'share');
check('worker: a shared sprite reaches the other socket', sh?.seat === 0 && sh.list[0].x === 12.5, sh);
await wait(100);
check('worker: ...and not the sharer', !A.got.some((m) => m.t === 'share'));

A.ws.send(JSON.stringify({ t: 'move', data: 'a whole sentence here' }));
const bad = await A.next((m) => m.t === 'error');
check('worker: bad data refused with the course\'s words', bad && /spaces/.test(bad.error), bad);
A.ws.send(JSON.stringify({ t: 'chat', text: 'hi' }));
await wait(100);
check('worker: an unknown message is refused, not relayed', !B.got.some((m) => m.t === 'chat'));

for (let i = 0; i < 120; i++) B.ws.send(JSON.stringify({ t: 'move', data: i }));
const limited = await B.next((m) => m.t === 'error' && /Too many/.test(m.error));
await wait(300);
const relayed = A.got.filter((m) => m.t === 'move').length - 1;
check('worker: the rate limit drops a flood and says so', !!limited && relayed < 120 && relayed >= 50, relayed);

const N = await open(`/room/${key}?noticket=1`);
check('worker: an upgrade without a ticket is refused (403)', N.status === 403, N.status);
const root = await fetch(`${base}/`);
check('worker: the Worker\'s own fetch has no surface', root.status === 404);

const res = await fetch(`${base}/control/${key}`, { method: 'POST', headers: { 'X-Shcode-Live-Control': JSON.stringify({ op: 'close' }) } });
check('worker: control close accepted', res.status === 200 && (await res.json()).ok === true);
await wait(300);
check('worker: the host closing closes every socket with 4000', A.closed() === 4000 && B.closed() === 4000, [A.closed(), B.closed()]);
check('worker: they were told why', A.got.some((m) => m.t === 'closed') && B.got.some((m) => m.t === 'closed'));
const late = await open(`/room/${key}?code=BHKE&seat=1&seats=2&name=Bo%20N.`);
await wait(200);
check('worker: a closed room refuses a new socket (410)', late.status === 410, late.status);
try { late.ws?.terminate(); } catch { /* gone */ }

// ---- LiveDoc (Code together) ----
const setup = await fetch(`${base}/setup`);
check('doc: the local D1 has migrations 0041, 0043 and 0044', setup.status === 200, setup.status);
const dkey = `DOCK-${Date.now()}`;
const started = Date.now();
const dq = (seat, name, email, extra = '') => `/doc/${dkey}?code=DOCK&seat=${seat}&seats=2&name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}&host=ann%40s.test&hostName=Ann%20L.&lang=moshion&started=${started}${extra}`;
const DA = await open(dq(0, 'Ann L.', 'ann@s.test'));
const DBo = await open(dq(1, 'Bo N.', 'bo@s.test'));
check('doc: two sockets open on the real LiveDoc', DA.status === 101 && DBo.status === 101, [DA.status, DBo.status, DA.error]);
const dh = await DA.next((m) => m.t === 'hello');
check('doc: hello at version 0, an empty program, the room\'s client id', dh?.version === 0 && dh.doc === '' && dh.clientID === 's0', dh);
check('doc: no email in hello', dh && !JSON.stringify(dh).includes('@'));
DA.ws.send(JSON.stringify({ t: 'seed', doc: 'circle(1);\n' }));
const seeded = await DBo.next((m) => m.t === 'updates' && m.version === 0);
check('doc: the host\'s seed reaches the joiner as update 1', seeded?.updates?.[0]?.seat === 0, seeded);
DBo.ws.send(JSON.stringify({ t: 'seed', doc: 'mine now' }));
const noSeed = await DBo.next((m) => m.t === 'error');
check('doc: a seed from seat 1 is refused', noSeed && /started the session/.test(noSeed.error), noSeed);
const t1 = Date.now();
DBo.ws.send(JSON.stringify({ t: 'push', version: 1, updates: [{ changes: [11, [0, 'square();']], clientID: 'evil' }] }));
const up = await DA.next((m) => m.t === 'updates' && m.version === 1);
check(`doc: an update reaches the host (${Date.now() - t1} ms), stamped s1 / seat 1 by the room`, up?.updates?.[0]?.seat === 1 && up.updates[0].clientID === 's1', up);
DA.ws.send(JSON.stringify({ t: 'push', version: 1, updates: [{ changes: [11, [0, 'stale']] }] }));
await wait(200);
const caught = DA.got.filter((m) => m.t === 'updates' && m.version === 1);
check('doc: a stale push is answered with the updates since its version', caught.length >= 2, caught.length);
DBo.ws.send(JSON.stringify({ t: 'cursor', anchor: 2, head: 5 }));
const cur = await DA.next((m) => m.t === 'cursor');
check('doc: a cursor is relayed with the seat', cur?.seat === 1 && cur.head === 5, cur);
DBo.got.length = 0;
DBo.ws.send(JSON.stringify({ t: 'push', version: 2, updates: [{ changes: [[0, 'y'.repeat(17000)], 20] }] }));
const tooBig = await DBo.next((m) => m.t === 'error' && m.code === 'too-big');
const reset = await DBo.next((m) => m.t === 'reset');
check('doc: a frame over 16 KB is refused and the pusher reset', !!tooBig && reset?.doc === 'circle(1);\nsquare();', [tooBig, reset]);
// A flood of frames the room answers with nothing (an out-of-range cursor), so
// the room is not slowed by its own replies and the bucket really runs dry.
for (let i = 0; i < 400; i++) DBo.ws.send('{"t":"cursor","anchor":-1,"head":-1}');
const docLimited = await DBo.next((m) => m.t === 'error' && m.code === 'rate', 10000);
check('doc: the rate limit drops a flood and says so', !!docLimited);
const wrongDoc = await open(`/doc/${dkey}?code=DOCK&seat=1&seats=2&wrong=1`);
check('doc: LiveDoc refuses a game room\'s ticket (403)', wrongDoc.status === 403, wrongDoc.status);
const wrongRoom = await open(`/room/${key}-x?code=BHKE&seat=0&seats=2&wrong=1`);
check('doc: LiveRoom refuses a code room\'s ticket (403)', wrongRoom.status === 403, wrongRoom.status);
const dres = await fetch(`${base}/doc-control/${dkey}`, { method: 'POST', headers: { 'X-Shcode-Live-Control': JSON.stringify({ op: 'close' }) } });
check('doc: control close accepted', dres.status === 200 && (await dres.json()).ok === true);
await wait(300);
check('doc: the host ending it closes every socket with 4000', DA.closed() === 4000 && DBo.closed() === 4000, [DA.closed(), DBo.closed()]);
check('doc: they were told who ended it', DBo.got.some((m) => m.t === 'closed' && m.why === 'host' && /Ann L\. ended the session/.test(m.reason)));
const rows = await (await fetch(`${base}/sessions`)).json();
const row = rows.find((x) => x.id === dkey);
check('doc: LiveDoc wrote its own text to D1 code_sessions, closed', row && row.text === 'circle(1);\nsquare();' && row.closed_at !== null && row.kind === 'moshion' && row.host_email === 'ann@s.test', row);
check('doc: participants are the accounts from the tickets', row && JSON.stringify(JSON.parse(row.participants)) === JSON.stringify(['ann@s.test', 'bo@s.test']), row?.participants);
const dlate = await open(dq(1, 'Bo N.', 'bo@s.test'));
await wait(200);
check('doc: a closed session refuses a new socket (410)', dlate.status === 410, dlate.status);
try { dlate.ws?.terminate(); } catch { /* gone */ }

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
