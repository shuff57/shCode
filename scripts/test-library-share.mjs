#!/usr/bin/env node
// Share-with-class (functions/api/library/[id]/share.ts, library/shared/*,
// classes/[id]/library-shares) on a real SQLite with every migration. What has
// to hold:
//   1. only the owner can share an item, only into classes they are in now;
//   2. a classmate sees it (first name + last initial, never the email) and can
//      fetch its content; a student in another class cannot;
//   3. a teacher of the class can hide it (students stop seeing it, the teacher
//      still does), unhide it, and remove it; a teacher of another class cannot;
//   4. re-sharing does not unhide what a teacher hid; the owner deleting the
//      item takes it out of every class.
// Run: node scripts/test-library-share.mjs

import { join } from 'node:path';
import { compileHandler, makeD1, root } from './_d1-sqlite.mjs';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log(`PASS  ${name}`); }
  else { failed++; console.error(`FAIL  ${name}${detail !== undefined ? ' -- ' + JSON.stringify(detail) : ''}`); }
}

const out = join(root, '.tmp', 'library-share-test');
const lib = compileHandler('api/library/index.ts', join(out, 'a'));
const one = compileHandler('api/library/[id].ts', join(out, 'b'));
const share = compileHandler('api/library/[id]/share.ts', join(out, 'c'));
const shared = compileHandler('api/library/shared/index.ts', join(out, 'd'));
const sharedOne = compileHandler('api/library/shared/[id].ts', join(out, 'e'));
const mod = compileHandler('api/classes/[id]/library-shares/index.ts', join(out, 'f'));

const db = makeD1();
const r2 = new Map();
const env = { DB: db, UPLOADS: {
  async put(k, v) { r2.set(k, String(v)); },
  async get(k) { return r2.has(k) ? { text: async () => r2.get(k) } : null; },
  async delete(k) { r2.delete(k); },
} };
const now = Date.now();
const FAR = now + 1e10;
const sql = (q, ...a) => db.sqlite.prepare(q).run(...a);
for (const [email, first, last] of [['ana@s.test', 'Ana', 'Lopez'], ['ben@s.test', 'Ben', null], ['cy@s.test', null, null], ['out@s.test', 'Out', 'Sider']]) {
  sql(`INSERT INTO students (email, password_hash, created_at, role, first_name, last_name) VALUES (?, 'x', ?, 'student', ?, ?)`, email, now, first, last);
}
sql(`INSERT INTO classes (id, name, code, owner_email, school_year, created_at) VALUES ('C1', 'Period 1', 'AAAAAA', 't1@s.test', '2026-2027', ?)`, now);
sql(`INSERT INTO classes (id, name, code, owner_email, school_year, created_at) VALUES ('C2', 'Period 2', 'BBBBBB', 't2@s.test', '2026-2027', ?)`, now);
for (const [c, e] of [['C1', 'ana@s.test'], ['C1', 'ben@s.test'], ['C1', 'cy@s.test'], ['C2', 'out@s.test']]) {
  sql(`INSERT INTO enrollments (class_id, student_email, enrolled_at, expires_at) VALUES (?, ?, ?, ?)`, c, e, now, FAR);
}
const ANA = { email: 'ana@s.test', role: 'student' };
const BEN = { email: 'ben@s.test', role: 'student' };
const CY = { email: 'cy@s.test', role: 'student' };
const OUT = { email: 'out@s.test', role: 'student' };
const T1 = { email: 't1@s.test', role: 'teacher' };
const T2 = { email: 't2@s.test', role: 'teacher' };

const req = (url, method = 'GET', body) => new Request(`https://x.test${url}`, {
  method, body: body === undefined ? undefined : JSON.stringify(body), headers: { 'Content-Type': 'application/json' },
});
async function call(fn, user, url, params = {}, method, body) {
  const res = await fn({ env, data: user, params, request: req(url, method, body) });
  return { status: res.status, body: await res.json() };
}
const PNG = 'data:image/png;base64,' + Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48]).toString('base64');

const saved = await call(lib.onRequestPut, ANA, '/api/library', {}, 'PUT', { kind: 'texture', name: 'dragon', dataUri: PNG, meta: null });
const id = saved.body.item.id;
check('Ana saves a texture', saved.status === 201);

let r = await call(share.onRequestPost, BEN, `/api/library/${id}/share`, { id }, 'POST', { share: true });
check("Ben cannot share Ana's item (404)", r.status === 404, r);
r = await call(share.onRequestPost, ANA, `/api/library/${id}/share`, { id }, 'POST', { share: 'yes' });
check('share must be a boolean', r.status === 400, r);
r = await call(share.onRequestPost, ANA, `/api/library/${id}/share`, { id }, 'POST', { share: true });
check('Ana shares it into her one class', r.status === 200 && r.body.classes === 1, r);
r = await call(lib.onRequestGet, ANA, '/api/library');
check("Ana's own list marks it shared", r.body.items.find((i) => i.id === id)?.shared === true, r.body.items);

r = await call(shared.onRequestGet, BEN, '/api/library/shared?kind=texture');
const seen = r.body.items[0];
check('Ben sees it, with first name and last initial, not the email',
  r.body.items.length === 1 && seen.owner === 'Ana L.' && !JSON.stringify(r.body).includes('ana@s.test') && seen.mine === false, r.body);
r = await call(shared.onRequestGet, BEN, '/api/library/shared?kind=sound');
check('the kind filter applies', r.body.items.length === 0, r.body);
r = await call(shared.onRequestGet, ANA, '/api/library/shared');
check('Ana sees her own share, marked mine', r.body.items[0]?.mine === true, r.body);
r = await call(sharedOne.onRequestGet, BEN, `/api/library/shared/${id}`, { id });
check('Ben can fetch its content to copy it', r.status === 200 && r.body.dataUri === PNG && r.body.owner === 'Ana L.', r.status);
r = await call(shared.onRequestGet, OUT, '/api/library/shared');
check('a student in another class does not see it', r.body.items.length === 0, r.body);
r = await call(sharedOne.onRequestGet, OUT, `/api/library/shared/${id}`, { id });
check('nor fetch it (404)', r.status === 404, r);
r = await call(one.onRequestGet, BEN, `/api/library/${id}`, { id });
check("the owner-only route still refuses Ben", r.status === 404, r);

// moderation
r = await call(mod.onRequestPost, BEN, '/api/classes/C1/library-shares', { id: 'C1' }, 'POST', { itemId: id, action: 'hide' });
check('a student cannot moderate (403)', r.status === 403, r);
r = await call(mod.onRequestPost, T2, '/api/classes/C1/library-shares', { id: 'C1' }, 'POST', { itemId: id, action: 'hide' });
check('a teacher of another class cannot (403)', r.status === 403, r);
r = await call(mod.onRequestPost, T1, '/api/classes/C1/library-shares', { id: 'C1' }, 'POST', { itemId: id, action: 'hide' });
check('the class teacher hides it', r.status === 200, r);
r = await call(shared.onRequestGet, BEN, '/api/library/shared');
check('Ben no longer sees it', r.body.items.length === 0, r.body);
r = await call(sharedOne.onRequestGet, CY, `/api/library/shared/${id}`, { id });
check('nor can another classmate fetch it', r.status === 404, r);
r = await call(mod.onRequestGet, T1, '/api/classes/C1/library-shares', { id: 'C1' });
check('the teacher still sees it, marked hidden, with the owner', r.body.items[0]?.hidden === true && r.body.items[0]?.owner === 'Ana L.', r.body);
r = await call(shared.onRequestGet, T1, '/api/library/shared');
check("the teacher's own class library view shows the hidden item", r.body.items[0]?.hidden === true, r.body);
r = await call(share.onRequestPost, ANA, `/api/library/${id}/share`, { id }, 'POST', { share: true });
r = await call(shared.onRequestGet, BEN, '/api/library/shared');
check('sharing again does not unhide it', r.body.items.length === 0, r.body);
r = await call(mod.onRequestPost, T1, '/api/classes/C1/library-shares', { id: 'C1' }, 'POST', { itemId: id, action: 'unhide' });
r = await call(shared.onRequestGet, BEN, '/api/library/shared');
check('unhide brings it back for students', r.body.items.length === 1, r.body);
r = await call(mod.onRequestPost, T1, '/api/classes/C1/library-shares', { id: 'C1' }, 'POST', { itemId: id, action: 'remove' });
r = await call(shared.onRequestGet, BEN, '/api/library/shared');
check('remove takes it out of the class library', r.status === 200 && r.body.items.length === 0, r.body);
r = await call(one.onRequestGet, ANA, `/api/library/${id}`, { id });
check("…and Ana's own copy is untouched", r.status === 200 && r.body.dataUri === PNG, r.status);

// unshare and delete
await call(share.onRequestPost, ANA, `/api/library/${id}/share`, { id }, 'POST', { share: true });
r = await call(share.onRequestPost, ANA, `/api/library/${id}/share`, { id }, 'POST', { share: false });
check('Ana unshares it', r.status === 200 && (await call(shared.onRequestGet, BEN, '/api/library/shared')).body.items.length === 0, r);
await call(share.onRequestPost, ANA, `/api/library/${id}/share`, { id }, 'POST', { share: true });
await call(one.onRequestDelete, ANA, `/api/library/${id}`, { id }, 'DELETE');
r = await call(shared.onRequestGet, BEN, '/api/library/shared');
check('deleting the item takes it out of every class', r.body.items.length === 0, r.body);
r = await call(share.onRequestPost, OUT, `/api/library/${id}/share`, { id }, 'POST', { share: true });
check('a deleted item cannot be shared', r.status === 404, r);

// no class
sql(`INSERT INTO students (email, password_hash, created_at, role) VALUES ('solo@s.test', 'x', ?, 'student')`, now);
const SOLO = { email: 'solo@s.test', role: 'student' };
const s2 = await call(lib.onRequestPut, SOLO, '/api/library', {}, 'PUT', { kind: 'texture', name: 'mine', dataUri: PNG, meta: null });
r = await call(share.onRequestPost, SOLO, `/api/library/${s2.body.item.id}/share`, { id: s2.body.item.id }, 'POST', { share: true });
check('a student in no class is told to join one first (409)', r.status === 409 && /Join a class/.test(r.body.error), r);

console.log(`\ntest-library-share: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
