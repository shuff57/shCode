#!/usr/bin/env node
// GET /api/lesson-drafts/[lessonId]: no saved draft is 200 {response:null,updatedAt:null} (a 404 was a
// red console error on every first visit), a saved one comes back, and the client's fetchDraft reads
// null as "no draft". Run: node scripts/test-lesson-drafts.mjs
import { compileHandler, makeD1, root } from './_d1-sqlite.mjs';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const h = compileHandler('api/lesson-drafts/[lessonId].ts', join(root, '.tmp-lesson-drafts-test'));
let n = 0;
function check(name, got, want) {
  if (JSON.stringify(got) === JSON.stringify(want)) { n++; console.log(`PASS  ${n}  ${name}`); }
  else { console.error(`FAIL: ${name} -- got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`); process.exitCode = 1; }
}
const db = makeD1();
const ctx = (method, lessonId, body, email = 'kid@example.invalid') => ({
  request: new Request(`http://x.invalid/api/lesson-drafts/${lessonId}`, { method, body: body ? JSON.stringify(body) : undefined }),
  env: { DB: db }, data: { email }, params: { lessonId },
});
const get = async (id, email) => { const r = await h.onRequestGet(ctx('GET', id, null, email)); return [r.status, await r.json()]; };

check('no draft: 200 with nulls', await get('L1'), [200, { response: null, updatedAt: null }]);
const saved = await h.onRequestPost(ctx('POST', 'L1', { response: 'hello' }));
const { updatedAt } = await saved.json();
check('saved draft comes back', await get('L1'), [200, { response: 'hello', updatedAt }]);
check('another student still sees none', await get('L1', 'other@example.invalid'), [200, { response: null, updatedAt: null }]);
const del = await h.onRequestDelete(ctx('DELETE', 'L1'));
check('after delete, none again', [del.status, (await get('L1'))[1].response], [200, null]);

// client side: fetchDraft treats response==null (and a legacy 404) as no draft
const store = readFileSync(join(root, 'lib/written-grader-store.ts'), 'utf8');
check('fetchDraft maps a null response to null', /body\.response == null\) return null/.test(store), true);
check('fetchDraft still maps 404 to null', /res\.status === 404 \|\| res\.status === 401\) return null/.test(store), true);
console.log(`test-lesson-drafts: ${n} checks`);
rmSync(join(root, '.tmp-lesson-drafts-test'), { recursive: true, force: true });
