#!/usr/bin/env node
// Tests Appearance settings (#73, #77): lib/prefs-core.ts parsePrefs() and the
// route functions/api/prefs.ts on a real SQLite with every migration. What has
// to hold:
//   1. only ids from the fixed lists are accepted -- nothing stored can carry
//      CSS, a URL or markup into the page;
//   2. an uploaded background must be the caller's own upload, and the stored
//      extension is the one the image is served under, not the client's;
//   3. each account reads only its own row; no row reads as the defaults;
//   4. the boot script (lib/prefs.ts) only ever sets listed values.
//
// Run: node scripts/test-prefs.mjs

import { join } from 'node:path';
import vm from 'node:vm';
import { compileHandler, makeD1, root } from './_d1-sqlite.mjs';

let passed = 0;
let failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log(`PASS  ${name}`); }
  else { failed++; console.error(`FAIL  ${name}${detail ? ` -- ${typeof detail === 'string' ? detail : JSON.stringify(detail)}` : ''}`); }
}

const core = await import(join(root, 'lib/prefs-core.ts'));
const { parsePrefs, DEFAULT_PREFS } = core;

// ---- parsePrefs ----
check('defaults from {}', JSON.stringify(parsePrefs({}).prefs) === JSON.stringify(DEFAULT_PREFS));
check('full valid', parsePrefs({ theme: 'retro', accent: 'pink', font: 'sans', homeBg: { kind: 'preset', id: 'glow' } }).ok);
for (const [name, raw] of [
  ['unknown theme', { theme: 'neon' }],
  ['CSS in theme', { theme: 'light;}body{display:none' }],
  ['unknown accent', { accent: '#ff0000' }],
  ['unknown font', { font: 'Comic Sans' }],
  ['preset not listed', { homeBg: { kind: 'preset', id: 'url(x)' } }],
  ['upload id not hex', { homeBg: { kind: 'upload', id: '../../etc/passwd', ext: 'png' } }],
  ['upload ext not listed', { homeBg: { kind: 'upload', id: 'a'.repeat(32), ext: 'svg' } }],
  ['url kind', { homeBg: { kind: 'url', url: 'https://evil.test/x.png' } }],
  ['array', []],
  ['string', 'dark'],
]) check(`refuses ${name}`, parsePrefs(raw).ok === false, parsePrefs(raw));
check('drops unknown keys', !('evil' in parsePrefs({ evil: '<script>' }).prefs));
check('accent null ok', parsePrefs({ accent: null }).prefs.accent === null);

// ---- route ----
const out = join(root, '.tmp', 'prefs-test');
const route = compileHandler('api/prefs.ts', out);
const db = makeD1();
const env = { DB: db };
const A = { email: 'a@school.test', role: 'student' };
const B = { email: 'b@school.test', role: 'student' };
const idA = 'a'.repeat(32);
const idB = 'b'.repeat(32);
db.sqlite.prepare(`INSERT INTO uploads (id, owner_email, filename, content_type, bytes, created_at) VALUES (?, ?, 'cat.jpg', 'image/jpeg', 10, 0)`).run(idA, A.email);
db.sqlite.prepare(`INSERT INTO uploads (id, owner_email, filename, content_type, bytes, created_at) VALUES (?, ?, 'dog.png', 'image/png', 10, 0)`).run(idB, B.email);

async function get(user) {
  const res = await route.onRequestGet({ env, data: user, params: {}, request: new Request('https://x.test/api/prefs') });
  return { status: res.status, body: await res.json() };
}
async function put(user, body, raw) {
  const res = await route.onRequestPut({
    env, data: user, params: {},
    request: new Request('https://x.test/api/prefs', { method: 'PUT', body: raw ?? JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }),
  });
  return { status: res.status, body: await res.json() };
}

let r = await get(A);
check('no row -> defaults, updatedAt null', r.status === 200 && r.body.updatedAt === null && r.body.prefs.theme === 'dark', r);
r = await put(A, { prefs: { theme: 'candy', accent: 'green', font: 'modern' } });
check('save', r.status === 200 && r.body.prefs.theme === 'candy' && r.body.updatedAt > 0, r);
r = await get(A);
check('read back', r.body.prefs.theme === 'candy' && r.body.prefs.accent === 'green' && r.body.prefs.font === 'modern', r);
r = await get(B);
check('other account unaffected', r.body.prefs.theme === 'dark' && r.body.updatedAt === null, r);
r = await put(A, { prefs: { theme: 'nope' } });
check('bad theme 400', r.status === 400, r);
r = await get(A);
check('refused save leaves row', r.body.prefs.theme === 'candy', r);
r = await put(A, {}, '{not json');
check('bad json 400', r.status === 400, r);
r = await put(A, null, JSON.stringify({ prefs: { theme: 'dark' }, pad: 'x'.repeat(5000) }));
check('oversize 413', r.status === 413, r);

r = await put(A, { prefs: { homeBg: { kind: 'upload', id: idA, ext: 'png' } } });
check('own upload ok, ext from the stored type', r.status === 200 && r.body.prefs.homeBg?.ext === 'jpg', r);
r = await put(A, { prefs: { homeBg: { kind: 'upload', id: idB, ext: 'png' } } });
check("someone else's upload 404", r.status === 404, r);
r = await put(A, { prefs: { homeBg: { kind: 'upload', id: 'c'.repeat(32), ext: 'png' } } });
check('missing upload 404 (same answer)', r.status === 404, r);
r = await put(A, { prefs: { homeBg: { kind: 'preset', id: 'waves' } } });
check('preset ok', r.status === 200 && r.body.prefs.homeBg.id === 'waves', r);

db.sqlite.prepare(`UPDATE user_prefs SET prefs_json = '{"theme":"x"' WHERE email = ?`).run(A.email);
r = await get(A);
check('corrupt row reads as defaults', r.status === 200 && r.body.prefs.theme === 'dark', r);

// ---- boot script ----
const { PREFS_BOOT_SCRIPT } = await import(join(root, 'lib/prefs.ts'));
function boot(stored, old) {
  const attrs = {};
  const store = { 'shcode.prefs': stored, 'shcode.theme': old };
  vm.runInNewContext(PREFS_BOOT_SCRIPT, {
    localStorage: { getItem: (k) => store[k] ?? null },
    document: { documentElement: { setAttribute: (k, v) => { attrs[k] = v; } } },
    JSON,
  });
  return attrs;
}
let a = boot(JSON.stringify({ theme: 'forest', accent: 'red', font: 'sans' }));
check('boot applies all three', a['data-theme'] === 'forest' && a['data-accent'] === 'red' && a['data-font'] === 'sans', a);
a = boot(JSON.stringify({ theme: 'dark', font: 'classic' }));
check('boot sets nothing for defaults', Object.keys(a).length === 0, a);
a = boot(JSON.stringify({ theme: 'x" onload="alert(1)', accent: 'url(x)', font: 'evil' }));
check('boot ignores unlisted values', Object.keys(a).length === 0, a);
a = boot(null, 'light');
check('boot reads the old theme key', a['data-theme'] === 'light', a);
a = boot('{broken');
check('boot survives bad JSON', Object.keys(a).length === 0, a);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
