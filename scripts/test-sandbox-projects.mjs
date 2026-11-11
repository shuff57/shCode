#!/usr/bin/env node
// Sandbox projects (migration 0049, lib/sandbox-projects-core.ts,
// functions/api/sandbox-projects/*): a student keeps several sandbox programs,
// each with a name and a type. This pins:
//
//   1. the rules: lesson ids (the old four keep `sandbox-<mode>`), ids, names;
//   2. the routes against a real SQLite with every migration: seeding the old
//      sandboxes once, create (idempotent, 30 at most), rename, delete (a
//      tombstone plus the project's saved code and Cloud history), and that
//      one student never sees or touches another's;
//   3. that the lesson-sync route takes a project's lesson id;
//   4. the client wiring: the picker replaces the type tabs, Remix makes a
//      project, and a History restore keeps the code it replaces.
//
// Run: node --import ./scripts/register-ts.mjs scripts/test-sandbox-projects.mjs
import { compileHandler, makeD1, root } from './_d1-sqlite.mjs';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const C = await import(join(root, 'lib/sandbox-projects-core.ts'));

let n = 0;
function check(name, got, want) {
  if (JSON.stringify(got) === JSON.stringify(want)) { n++; console.log(`PASS  ${n}  ${name}`); }
  else { console.error(`FAIL: ${name} -- got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`); process.exitCode = 1; }
}

// ---- 1. rules ------------------------------------------------------------------
check('an old sandbox keeps its lesson id', C.projectLessonId({ id: 'moshion', mode: 'moshion' }), 'sandbox-moshion');
check('a new project gets its own', C.projectLessonId({ id: 'k3x9q0w2ab', mode: 'js' }), 'sandbox-js-k3x9q0w2ab');
check('lesson ids parse back', [C.parseProjectLessonId('sandbox-flow'), C.parseProjectLessonId('sandbox-reshape-k3x9q0w2ab')],
  [{ mode: 'flow', id: 'flow' }, { mode: 'reshape', id: 'k3x9q0w2ab' }]);
check('not a sandbox lesson id', ['lesson-a', 'sandbox', 'sandbox-moshion-x', 'sandbox-moshion-K3X9Q0W2AB', 'sandbox-jscad'].map(C.parseProjectLessonId), [null, null, null, null, null]);
check('an old id only goes with its own type', [C.isProjectId('moshion', 'moshion'), C.isProjectId('moshion', 'js'), C.isProjectId('js', 'js')], [true, false, true]);
check('a new id is 8-16 lowercase letters and digits', ['abcd1234', 'a'.repeat(16), 'abc', 'a'.repeat(17), 'ABCD1234', 'abcd-123'].map((id) => C.isProjectId(id, 'js')),
  [true, true, false, false, false, false]);
const ids = Array.from({ length: 50 }, () => C.newProjectId());
check('made ids are valid and different', [ids.every((id) => C.isProjectId(id, 'moshion')), new Set(ids).size], [true, 50]);
check('names are cleaned', [C.cleanName('  Space\tgame \n 2 '), C.cleanName('   '), C.cleanName(42), [...C.cleanName('x'.repeat(80))].length],
  ['Space game 2', null, null, C.MAX_NAME_CHARS]);
check('a default name skips the numbers in use', C.defaultName('moshion', 'moSHion', [{ name: 'moSHion project 1' }, { name: 'MOSHION PROJECT 2' }]), 'moSHion project 3');
check('a copy is named after the original', [C.copyName('Space', []), C.copyName('Space', [{ name: 'Space copy' }])], ['Space copy', 'Space copy 2']);
check('a copy of a long name stays within the limit', [...C.copyName('y'.repeat(40), [])].length <= C.MAX_NAME_CHARS, true);
check('a project read from storage is checked', [C.parseProject({ id: 'moshion', mode: 'js', name: 'x' }), C.parseProject({ id: 'abcd1234', mode: 'js', name: ' Hi ', createdAt: 5 })],
  [null, { id: 'abcd1234', mode: 'js', name: 'Hi', createdAt: 5, updatedAt: 0 }]);

// ---- 2. routes -----------------------------------------------------------------
const out = join(root, '.tmp-sandbox-projects-test');
const list = compileHandler('api/sandbox-projects/index.ts', join(out, 'a'));
const one = compileHandler('api/sandbox-projects/[id].ts', join(out, 'b'));
const sync = compileHandler('api/lesson-sync/[lessonId].ts', join(out, 'c'));
const db = makeD1();
const KID = 'kid@example.invalid';
const OTHER = 'other@example.invalid';
const ctx = (method, url, body, email, params = {}) => ({
  request: new Request(`http://x.invalid${url}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  }),
  env: { DB: db },
  data: { email, role: 'student' },
  params,
});
const res = async (r) => [r.status, await r.json()];
const getList = async (email = KID) => res(await list.onRequestGet(ctx('GET', '/api/sandbox-projects', null, email)));
const create = async (body, email = KID) => res(await list.onRequestPost(ctx('POST', '/api/sandbox-projects', body, email)));
const rename = async (id, name, email = KID) => res(await one.onRequestPatch(ctx('PATCH', `/api/sandbox-projects/${id}`, { name }, email, { id })));
const del = async (id, email = KID) => res(await one.onRequestDelete(ctx('DELETE', `/api/sandbox-projects/${id}`, null, email, { id })));
const strip = (ps) => ps.map((p) => `${p.id}:${p.mode}:${p.name}`).sort();

let [st, body] = await getList();
check('a new account gets the moSHion sandbox', [st, strip(body.projects), body.deleted, body.max], [200, ['moshion:moshion:moSHion sandbox'], [], 30]);

// A student who had saved code in two of the old sandboxes keeps exactly those two.
const gz = new Uint8Array([1]);
for (const id of ['sandbox-js', 'sandbox-reshape']) {
  db.sqlite.prepare('INSERT INTO lesson_sync (student_email, lesson_id, files_gz, revision, updated_at) VALUES (?, ?, ?, 1, 1)').run(OTHER, id, gz);
}
[st, body] = await getList(OTHER);
check('the old sandboxes with saved code become projects', strip(body.projects), ['js:js:JavaScript sandbox', 'reshape:reshape:reSHape sandbox']);
[st, body] = await getList(OTHER);
check('seeding happens once', body.projects.length, 2);

[st, body] = await create({ id: 'abcd1234ef', mode: 'moshion', name: '  Space   game ' });
check('make a project', [st, body.project?.id, body.project?.name], [201, 'abcd1234ef', 'Space game']);
[st, body] = await create({ id: 'abcd1234ef', mode: 'moshion', name: 'Again' });
check('making the same id again returns it unchanged', [st, body.project?.name], [200, 'Space game']);
check('a bad type is refused', (await create({ id: 'zzzz1234ef', mode: 'jscad', name: 'x' }))[0], 400);
check('a bad id is refused', (await create({ id: 'NOPE', mode: 'js', name: 'x' }))[0], 400);
check('an old id of another type is refused', (await create({ id: 'flow', mode: 'js', name: 'x' }))[0], 400);
check('a project needs a name', (await create({ id: 'zzzz1234ef', mode: 'js', name: ' \n ' }))[0], 400);
check('an old sandbox can be added by its id', (await create({ id: 'js', mode: 'js', name: 'JavaScript sandbox' }))[0], 201);
[st, body] = await getList(OTHER);
check('another student does not see them', strip(body.projects), ['js:js:JavaScript sandbox', 'reshape:reshape:reSHape sandbox']);

[st, body] = await rename('abcd1234ef', 'Rocket\u0000 race');
check('rename', [st, body.project?.name], [200, 'Rocket race']);
check('rename needs a name', (await rename('abcd1234ef', ''))[0], 400);
check('another student cannot rename it', (await rename('abcd1234ef', 'Mine now', OTHER))[0], 404);

// Delete removes the project's saved code and Cloud history, and only that project's.
const projLesson = 'sandbox-moshion-abcd1234ef';
const syncCtx = (lessonId, body) => ({
  request: new Request(`http://x.invalid/api/lesson-sync/${lessonId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  env: { DB: db }, data: { email: KID, role: 'student' }, params: { lessonId },
});
const put = await sync.onRequestPut(syncCtx(projLesson, { files: { 'script.js': 'circle(1)' }, baseRevision: 0 }));
check('lesson-sync saves a project\'s code under its lesson id', put.status, 200);
await sync.onRequestPut(syncCtx('sandbox-js', { files: { 'script.js': 'x' }, baseRevision: 0 }));
const count = (table, lessonId, email = KID) => db.sqlite.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE student_email = ? AND lesson_id = ?`).get(email, lessonId).n;
check('before delete: a saved copy and a history row', [count('lesson_sync', projLesson), count('lesson_sync_history', projLesson)], [1, 1]);
check('another student cannot delete it', (await del('abcd1234ef', OTHER))[0], 404);
check('delete', await del('abcd1234ef'), [200, { ok: true }]);
check('its saved code and Cloud history are gone', [count('lesson_sync', projLesson), count('lesson_sync_history', projLesson)], [0, 0]);
check('another project\'s code is untouched', [count('lesson_sync', 'sandbox-js'), count('lesson_sync_history', 'sandbox-js')], [1, 1]);
[st, body] = await getList();
check('the list says it was deleted', [strip(body.projects).includes('abcd1234ef:moshion:Rocket race'), body.deleted], [false, [{ id: 'abcd1234ef', mode: 'moshion' }]]);
check('a deleted project cannot come back', (await create({ id: 'abcd1234ef', mode: 'moshion', name: 'Back' }))[0], 409);
check('deleting twice is 404', (await del('abcd1234ef'))[0], 404);

// Deleting every project does not seed the old sandbox again.
await del('moshion');
await del('js');
[st, body] = await getList();
check('no projects left, and none seeded', [body.projects, body.deleted.length], [[], 3]);

// 30 at most; deleted ones do not count.
for (let i = 0; i < C.MAX_PROJECTS; i++) {
  const r = await create({ id: `limit${String(i).padStart(4, '0')}`, mode: 'js', name: `P${i}` });
  if (r[0] !== 201) { check(`project ${i} of 30`, r[0], 201); break; }
}
[st, body] = await create({ id: 'onetoomany', mode: 'js', name: 'One too many' });
check('the 31st is refused in plain words', [st, body.limit, /30 projects/.test(body.error)], [409, true, true]);
await del('limit0000');
check('deleting one makes room', (await create({ id: 'onetoomany', mode: 'js', name: 'Now it fits' }))[0], 201);

// ---- 3./4. client wiring -----------------------------------------------------------
const read = (p) => readFileSync(join(root, p), 'utf8');
const ws = read('components/SandboxWorkspace.tsx');
check('the sandbox follows the open project', [ws.includes('useSandboxProjects()'), ws.includes('<SandboxProjectPicker')], [true, true]);
check('the type tabs are gone', /data-sandbox-mode=/.test(ws), false);
check('switching projects is locked in Code together', /<SandboxProjectPicker[\s\S]{0,80}locked=\{together\}/.test(ws), true);
check('a reSHape model and a chart remount per project', [ws.includes('key={`${lesson.id}-${reshapeResetKey}`}'), ws.includes('<DiagramEditor key={lesson.id}')], [true, true]);
const games = read('lib/games-client.ts');
check('Remix makes a new project', /export async function remixIntoSandbox[\s\S]*createProject\('moshion'/.test(games), true);
check('the published-as record is per project', games.includes('sandboxGameKey(lessonId)'), true);
const hp = read('components/HistoryPanel.tsx');
const restoreAt = hp.indexOf('const restore = async');
const keepAt = hp.indexOf('addLocalSnapshot(lessonId, current', restoreAt);
const replaceAt = hp.indexOf('useLessonStore.setState({ fileContents: { ...snapshot } })', restoreAt);
check('a restore keeps the code it replaces before replacing it', keepAt > restoreAt && replaceAt > keepAt, true);
check('signed in, the replaced code goes to Cloud history too', /restoreVersionToCloud\(lessonId, current\)/.test(hp), true);
const ai = read('functions/api/ai-help.ts');
check('CODY knows a project is the sandbox', ai.includes('(?:-[a-z0-9]{8,16})?$/'), true);

console.log(`test-sandbox-projects: ${n} checks`);
rmSync(out, { recursive: true, force: true });
