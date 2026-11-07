#!/usr/bin/env node
// Tests the texture and sound library routes (functions/api/library/*) against
// every migration on a real SQLite and an in-memory R2. What has to hold:
//   1. the type comes from the bytes: a renamed HTML or SVG is refused as a
//      texture, a PNG is refused as a sound, WAV/MP3/OGG are accepted;
//   2. per-item and per-account caps, per kind;
//   3. owner only: another student's id answers 404 on GET and DELETE, and the
//      list never shows another student's items;
//   4. a save over a name another device changed is a 409 with the current item
//      (so the browser can keep both), and the same bytes saved twice is a no-op;
//   5. a delete leaves a tombstone, removes the bytes and the class shares, and a
//      later save of the same name brings it back.
//
// Run: node scripts/test-library.mjs

import { join } from 'node:path';
import { compileHandler, makeD1, root } from './_d1-sqlite.mjs';

let passed = 0;
let failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log(`PASS  ${name}`); }
  else { failed++; console.error(`FAIL  ${name}${detail ? ` -- ${typeof detail === 'string' ? detail : JSON.stringify(detail)}` : ''}`); }
}

const out = join(root, '.tmp', 'library-test');
const list = compileHandler('api/library/index.ts', out);
const one = compileHandler('api/library/[id].ts', join(out, 'id'));
const shared = await import(join(root, 'functions/_shared/library.ts'));

function makeR2() {
  const m = new Map();
  return {
    m,
    async put(k, v) { m.set(k, String(v)); },
    async get(k) { return m.has(k) ? { text: async () => m.get(k) } : null; },
    async delete(k) { m.delete(k); },
  };
}
const db = makeD1();
const r2 = makeR2();
const env = { DB: db, UPLOADS: r2 };
const A = { email: 'a@school.test', role: 'student' };
const B = { email: 'b@school.test', role: 'student' };

const b64 = (bytes) => Buffer.from(bytes).toString('base64');
const PNG = 'data:image/png;base64,' + b64([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
const PNG2 = 'data:image/png;base64,' + b64([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x53]);
const WAV = 'data:audio/wav;base64,' + b64([0x52, 0x49, 0x46, 0x46, 4, 0, 0, 0, 0x57, 0x41, 0x56, 0x45, 0x66, 0x6d, 0x74, 0x20]);
const MP3 = 'data:audio/mpeg;base64,' + b64([0x49, 0x44, 0x33, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
const MP3SYNC = 'data:audio/mpeg;base64,' + b64([0xff, 0xfb, 0x90, 0x64, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
const OGG = 'data:audio/ogg;base64,' + b64([0x4f, 0x67, 0x67, 0x53, 0, 2, 0, 0, 0, 0, 0, 0, 0]);
const HTML = 'data:image/png;base64,' + b64(Buffer.from('<html><script>alert(1)</script></html>'));
const SVG = 'data:image/png;base64,' + b64(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>'));

async function put(user, body) {
  const res = await list.onRequestPut({
    env, data: user, params: {},
    request: new Request('https://x.test/api/library', { method: 'PUT', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }),
  });
  return { status: res.status, body: await res.json() };
}
async function get(user) {
  const res = await list.onRequestGet({ env, data: user, params: {}, request: new Request('https://x.test/api/library') });
  return { status: res.status, body: await res.json() };
}
async function getOne(user, id) {
  const res = await one.onRequestGet({ env, data: user, params: { id }, request: new Request(`https://x.test/api/library/${id}`) });
  return { status: res.status, body: await res.json() };
}
async function del(user, id, baseHash) {
  const q = baseHash ? `?baseHash=${baseHash}` : '';
  const res = await one.onRequestDelete({ env, data: user, params: { id }, request: new Request(`https://x.test/api/library/${id}${q}`, { method: 'DELETE' }) });
  return { status: res.status, body: await res.json() };
}

// 1. sniffing
check('sniff: WAV, MP3 (ID3), MP3 (frame sync), OGG are sounds',
  shared.sniffLibraryItem('sound', WAV) === 'audio/wav' && shared.sniffLibraryItem('sound', MP3) === 'audio/mpeg'
    && shared.sniffLibraryItem('sound', MP3SYNC) === 'audio/mpeg' && shared.sniffLibraryItem('sound', OGG) === 'audio/ogg');
check('sniff: a PNG is not a sound, a WAV is not a texture',
  shared.sniffLibraryItem('sound', PNG) === null && shared.sniffLibraryItem('texture', WAV) === null);
let r = await put(A, { kind: 'texture', name: 'evil', dataUri: HTML, meta: null });
check('a renamed HTML file is refused as a texture (415)', r.status === 415, r);
r = await put(A, { kind: 'texture', name: 'evil', dataUri: SVG, meta: null });
check('an SVG is refused as a texture (415)', r.status === 415, r);
r = await put(A, { kind: 'sound', name: 'zap', dataUri: PNG, meta: null });
check('a PNG is refused as a sound (415)', r.status === 415, r);
r = await put(A, { kind: 'texture', name: '1bad', dataUri: PNG, meta: null });
check('a name that is not code is refused (400)', r.status === 400, r);

// 2. save, list, read
r = await put(A, { kind: 'texture', name: 'hero', dataUri: PNG, meta: '{"frames":1}' });
check('A saves a texture (201)', r.status === 201 && r.body.item.mime === 'image/png', r);
const hero = r.body.item;
check('the hash is sha-256 of data URI + NUL + meta', hero.hash === await shared.itemHash(PNG, '{"frames":1}'), hero);
r = await put(A, { kind: 'sound', name: 'zap', dataUri: WAV, meta: '{"kind":"sfx"}' });
const zap = r.body.item;
check('A saves a WAV sound (201)', r.status === 201 && zap.mime === 'audio/wav', r);
r = await put(A, { kind: 'sound', name: 'song', dataUri: MP3, meta: null });
check('A saves an MP3 sound', r.status === 201 && r.body.item.mime === 'audio/mpeg', r);
r = await put(A, { kind: 'texture', name: 'hero', dataUri: PNG, meta: '{"frames":1}' });
check('the same bytes saved again is a no-op 200 with the same id', r.status === 200 && r.body.item.id === hero.id, r);
r = await get(A);
check('A lists three items and a quota per kind',
  r.body.items.length === 3 && r.body.quota.texture.maxBytes === 1024 * 1024 && r.body.quota.sound.maxBytes === 2 * 1024 * 1024, r.body);
r = await getOne(A, hero.id);
check('A reads its texture back byte for byte', r.status === 200 && r.body.dataUri === PNG && r.body.meta === '{"frames":1}', r);

// 3. owner only
r = await get(B);
check("B's list is empty", r.body.items.length === 0, r.body);
r = await getOne(B, hero.id);
check("B gets 404 on A's id", r.status === 404, r);
r = await del(B, hero.id);
check("B cannot delete A's item (404)", r.status === 404 && (await getOne(A, hero.id)).status === 200, r);
r = await getOne(A, 'not-an-id');
check('a malformed id is 404', r.status === 404, r);
r = await put(B, { kind: 'texture', name: 'hero', dataUri: PNG2, meta: null });
check('B can use the same name in its own library', r.status === 201, r);

// 4. conflicts
r = await put(A, { kind: 'texture', name: 'hero', dataUri: PNG2, meta: '{"frames":1}', baseHash: hero.hash });
check('a save on top of the version the browser last saw is accepted', r.status === 200 && r.body.item.id === hero.id, r);
const hero2 = r.body.item;
r = await put(A, { kind: 'texture', name: 'hero', dataUri: PNG, meta: null, baseHash: hero.hash });
check('a save from a device that missed that change is a 409 with the current item',
  r.status === 409 && r.body.conflict === true && r.body.item.hash === hero2.hash, r);
r = await put(A, { kind: 'texture', name: 'hero', dataUri: PNG, meta: null });
check('a save with no baseHash over an existing different item is also a 409', r.status === 409, r);

// caps
const big = 'data:image/png;base64,' + b64([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...new Array(50 * 1024).fill(7)]);
r = await put(A, { kind: 'texture', name: 'huge', dataUri: big, meta: null });
check('a texture over 64 KB is refused (413)', r.status === 413, r.status);
const t60 = 'data:image/png;base64,' + b64([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...new Array(45 * 1024).fill(1)]);
let lastOk = 0;
for (let i = 0; i < 30; i++) {
  const s = await put(A, { kind: 'texture', name: `tile${i}`, dataUri: t60, meta: null });
  if (s.status === 201) lastOk = i + 1; else { r = s; break; }
}
check('textures stop at the 1 MB account total, with a plain reason', r.status === 413 && /full/.test(r.body.error) && lastOk > 10 && lastOk < 18, { lastOk, r });
r = await put(A, { kind: 'sound', name: 'zap2', dataUri: OGG, meta: null });
check('a full texture budget does not block sounds', r.status === 201, r);

// 5. delete and tombstones
r = await del(A, zap.id, 'stale-hash');
check('a delete from a device that missed a change is a 409', r.status === 409, r);
db.prepare(`INSERT INTO library_shares (item_id, class_id, shared_at) VALUES (?, 'C1', 1)`).bind(zap.id).run();
r = await del(A, zap.id, zap.hash);
check('A deletes its sound', r.status === 200, r);
const row = db.sqlite.prepare('SELECT deleted_at FROM library_items WHERE id = ?').get(zap.id);
check('the row stays as a tombstone', row && row.deleted_at > 0, row);
check('the bytes are gone from R2', !r2.m.has(`library/${zap.id}`));
check('its class shares are gone', db.sqlite.prepare('SELECT COUNT(*) n FROM library_shares WHERE item_id = ?').get(zap.id).n === 0);
r = await getOne(A, zap.id);
check('a deleted item reads as 404', r.status === 404, r);
r = await get(A);
check('the list carries the tombstone so other devices learn of the delete',
  r.body.items.some((i) => i.id === zap.id && i.deletedAt > 0), r.body.items.map((i) => [i.name, i.deletedAt]));
r = await put(A, { kind: 'sound', name: 'zap', dataUri: WAV, meta: '{"kind":"sfx"}', baseHash: 'anything' });
check('saving the name again brings it back, same id', r.status === 200 && r.body.item.id === zap.id && r.body.item.deletedAt === null, r);

console.log(`\ntest-library: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
