#!/usr/bin/env node
// The REAL LiveRoom Durable Object (workers/live/) under `wrangler dev`
// (miniflare, local only, deploys nothing). Not in npm test: it needs the
// Worker running.
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

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
