#!/usr/bin/env node
// A sketch's 'remote' saves (#97): save/load/saved in public/moshion/extras.js,
// GET|PUT /api/sketch-saves, migration 0046, rules in lib/sketch-saves-core.ts.
// What has to hold:
//   1. the rules: a sketch key is a game key; a map is name -> JSON text, at
//      most 100 names, 16 KB a value and 64 KB in all; wantsRemote() sees a
//      quoted 'remote' and nothing else;
//   2. the route, on a real SQLite with every migration applied: a missing row
//      reads as {}, a write replaces the map whole, each account sees only its
//      own saves and each sketch only its own, a bad key or map is refused,
//      and a new sketch past the per-account cap is refused (409);
//   3. the sketch side, extras.js in a VM: 'local' is storeItem/getItem;
//      'remote' with the page's map reads synchronously and posts every change
//      up marked remote (never into the local store); 'remote' with no account
//      falls back to local and warns ONCE; saved() lays saved fields over the
//      defaults and its .save() is not part of what is saved; a bad `where`
//      and an oversize value throw in plain words.

import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { compileHandler, makeD1, root } from './_d1-sqlite.mjs';

let passed = 0;
let failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log(`PASS  ${name}`); }
  else { failed++; console.error(`FAIL  ${name}${detail ? ` -- ${typeof detail === 'string' ? detail : JSON.stringify(detail)}` : ''}`); }
}

// ---- 1. rules ----
const core = await import(join(root, 'lib/sketch-saves-core.ts'));
const { checkSketchData, isSketchKey, wantsRemote, MAX_SKETCHES } = core;
for (const k of ['sandbox', 'game-12ab', '5-3-pinball-7-lab-three-bumpers-three-values', 'demo-x_1']) check(`key ok: ${k}`, isSketchKey(k));
for (const k of ['', '-lead', '../x', 'a b', 'x'.repeat(101), 7, null]) check(`key refused: ${JSON.stringify(k)}`, !isSketchKey(k));
check('map ok', checkSketchData({ best: '12', player: '{"coins":3}' }).ok);
check('map: value must be JSON text', !checkSketchData({ best: 12 }).ok);
check('map: not an array', !checkSketchData(['1']).ok);
check('map: 101 names refused', !checkSketchData(Object.fromEntries(Array.from({ length: 101 }, (_, i) => [`n${i}`, '1']))).ok);
check('map: 16 KB value refused', !checkSketchData({ big: '"' + 'x'.repeat(16 * 1024) + '"' }).ok);
check('map: 64 KB total refused', !checkSketchData(Object.fromEntries(Array.from({ length: 5 }, (_, i) => [`n${i}`, 'x'.repeat(15 * 1024)]))).ok);
check('map: bytes, not characters', !checkSketchData({ e: 'é'.repeat(9 * 1024) }).ok);
check("wantsRemote: save('k', v, 'remote')", wantsRemote("save('best', score, 'remote')"));
check('wantsRemote: "remote" and `remote`', wantsRemote('p.save("remote")') && wantsRemote('load(`best`, `remote`)'));
check('wantsRemote: a word in a comment is not a call', !wantsRemote('// remote control\nlet remoteId = 1'));

// ---- 2. route ----
const route = compileHandler('api/sketch-saves.ts', join(root, '.tmp', 'sketch-saves-test'));
const db = makeD1();
const env = { DB: db };
const A = { email: 'a@school.test', role: 'student' };
const B = { email: 'b@school.test', role: 'student' };
async function get(user, key) {
  const res = await route.onRequestGet({ env, data: user, params: {}, request: new Request(`https://x.test/api/sketch-saves?key=${encodeURIComponent(key)}`) });
  return { status: res.status, body: await res.json() };
}
async function put(user, body, raw) {
  const res = await route.onRequestPut({
    env, data: user, params: {},
    request: new Request('https://x.test/api/sketch-saves', { method: 'PUT', body: raw ?? JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }),
  });
  return { status: res.status, body: await res.json() };
}
let r = await get(A, 'game-1');
check('no row -> {} and updatedAt null', r.status === 200 && JSON.stringify(r.body.data) === '{}' && r.body.updatedAt === null, r);
r = await put(A, { key: 'game-1', data: { best: '7', player: '{"coins":2}' } });
check('write', r.status === 200 && r.body.updatedAt > 0, r);
r = await get(A, 'game-1');
check('read back', r.body.data.best === '7' && r.body.data.player === '{"coins":2}', r);
r = await put(A, { key: 'game-1', data: { best: '9' } });
r = await get(A, 'game-1');
check('a write replaces the map whole', r.body.data.best === '9' && !('player' in r.body.data), r);
check('another account sees nothing', JSON.stringify((await get(B, 'game-1')).body.data) === '{}');
check('another sketch sees nothing', JSON.stringify((await get(A, 'game-2')).body.data) === '{}');
check('bad key on GET 400', (await get(A, '../x')).status === 400);
check('bad key on PUT 400', (await put(A, { key: 'a b', data: {} })).status === 400);
check('bad map 400', (await put(A, { key: 'game-1', data: { best: 9 } })).status === 400);
check('bad JSON 400', (await put(A, null, '{nope')).status === 400);
check('huge body 413', (await put(A, null, 'x'.repeat(200 * 1024))).status === 413);
for (let i = 0; i < MAX_SKETCHES - 1; i++) {
  db.sqlite.prepare('INSERT INTO sketch_saves (email, sketch_key, data_json, updated_at) VALUES (?, ?, ?, 0)').run(A.email, `fill-${i}`, '{}');
}
r = await put(A, { key: 'one-too-many', data: { a: '1' } });
check('a new sketch past the cap is refused 409', r.status === 409 && /200/.test(r.body.error), r);
check('an existing sketch still saves at the cap', (await put(A, { key: 'game-1', data: { best: '10' } })).status === 200);

// ---- 3. the sketch side ----
function sketchWorld({ remoteState, remote } = {}) {
  const local = {};
  const posted = [];
  const warnings = [];
  const listeners = [];
  const win = {
    storeItem(k, v) { local[k] = JSON.stringify(v); },
    getItem(k) { return k in local ? JSON.parse(local[k]) : null; },
    parent: { postMessage(m) { posted.push(m); } },
    addEventListener(type, fn) { if (type === 'message') listeners.push(fn); },
    console: { warn: (m) => warnings.push(m), log() {} },
    Object, JSON, Error, Array,
  };
  win.globalThis = win;
  if (remoteState) { win.__moshionRemoteState = remoteState; win.__moshionRemote = remote ?? {}; }
  vm.createContext(win);
  vm.runInContext(readFileSync(join(root, 'public/moshion/extras.js'), 'utf8'), win);
  return { win, local, posted, warnings, listeners };
}

let w = sketchWorld();
w.win.save('best', 5);
check("local save is storeItem", w.local.best === '5' && w.posted.length === 0);
check('local load is getItem', w.win.load('best') === 5 && w.win.load('missing') === null);
check("'local' spelled out is the same", w.win.load('best', 'local') === 5);
let threw = '';
try { w.win.save('best', 1, 'cloud'); } catch (e) { threw = e.message; }
check('a bad where throws in plain words', /'local' or 'remote'/.test(threw), threw);
try { threw = ''; w.win.save(12, 1); } catch (e) { threw = e.message; }
check('a missing name throws', /name in quotes/.test(threw), threw);

w = sketchWorld({ remoteState: 'ready', remote: { best: '3' } });
check('remote load reads the page map synchronously', w.win.load('best', 'remote') === 3);
check('remote and local are separate', w.win.load('best') === null);
w.win.save('best', 8, 'remote');
check('remote save posts up, marked remote', w.posted.length === 1 && w.posted[0].remote === true && w.posted[0].key === 'best' && w.posted[0].value === '8' && w.posted[0].source === 'preview-storage');
check('remote save never lands in the local store', !('best' in w.local));
check('remote save is read back at once', w.win.load('best', 'remote') === 8);
try { threw = ''; w.win.save('big', 'x'.repeat(17 * 1024), 'remote'); } catch (e) { threw = e.message; }
check('an oversize remote value throws', /too big/.test(threw) && w.win.load('big', 'remote') === null, threw);

const p = w.win.saved('player', { best: 0, coins: 0 }, 'remote');
check('saved(): defaults when nothing saved', p.best === 0 && p.coins === 0);
p.coins = 4;
p.save();
const sent = JSON.parse(w.posted.at(-1).value);
check('saved().save() sends the fields, not the method', sent.coins === 4 && sent.best === 0 && !('save' in sent) && w.posted.at(-1).remote === true);
const p2 = w.win.saved('player', { best: 0, coins: 0, lives: 3 }, 'remote');
check('saved(): saved fields over defaults, new defaults kept', p2.coins === 4 && p2.lives === 3);
p2.save('local');
check('saved().save(where) can pick the other place', JSON.parse(w.local.player).coins === 4);

w = sketchWorld({ remoteState: 'signed-out', remote: {} });
w.win.save('best', 2, 'remote');
w.win.save('best', 3, 'remote');
check('signed out: remote falls back to this browser', w.local.best === '3' && w.posted.length === 0 && w.win.load('best', 'remote') === 3);
check('signed out: warns once, in plain words', w.warnings.length === 1 && /signed in/.test(w.warnings[0]), w.warnings);
w = sketchWorld();
w.win.save('x', 1, 'remote');
check('no remote at all: falls back and warns', w.local.x === '1' && w.warnings.length === 1);
w.listeners.forEach((fn) => fn({ data: { source: 'preview-storage-remote-error', message: 'Your online save did not go through: nope' } }));
check("the page's write errors reach the sketch console", w.warnings.at(-1) === 'Your online save did not go through: nope');

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
