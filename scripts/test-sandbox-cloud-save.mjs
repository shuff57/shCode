#!/usr/bin/env node
// The sandbox saves the same way a lesson does on cs-3d: one deliberate Save
// writes the live workspace to lesson_sync (with a Cloud history row), and
// arrival reads it back. This pins the two halves:
//
//   1. the lesson-sync routes accept a sandbox-<mode> lesson id (it is not in
//      the lessons manifest, so the green-to-advance gate must fail open), and
//      the workspace and history stay scoped to the owning student and mode;
//   2. SandboxWorkspace still uses the lesson-sync hook and the History panel,
//      rather than drifting back to a local-only draft or the retired commit UI.
//
// Run: node scripts/test-sandbox-cloud-save.mjs
import { compileHandler, makeD1, root } from './_d1-sqlite.mjs';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const out = join(root, '.tmp-sandbox-cloud-save-test');
const histOut = join(root, '.tmp-sandbox-cloud-save-history-test');
const h = compileHandler('api/lesson-sync/[lessonId].ts', out);
const hist = compileHandler('api/lesson-sync-history/index.ts', histOut);
let n = 0;
function check(name, got, want) {
  if (JSON.stringify(got) === JSON.stringify(want)) { n++; console.log(`PASS  ${n}  ${name}`); }
  else { console.error(`FAIL: ${name} -- got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`); process.exitCode = 1; }
}

const db = makeD1();
// A manifest that does not know about sandbox-<mode>: the gate finds no
// sibling list for the id and lets the write through. Without ASSETS it would
// fail open for a different reason and this test would not exercise the real
// branch.
const manifest = {
  lessons: [
    { id: 'lesson-a', title: '1.1.1 First', category: 'Demo' },
    { id: 'lesson-b', title: '1.1.2 Second', category: 'Demo' },
  ],
};
const assets = {
  fetch: async () => new Response(JSON.stringify(manifest), {
    headers: { 'Content-Type': 'application/json' },
  }),
};
const files = { 'script.js': 'console.log("sandbox");' };
const syncCtx = (method, lessonId, body, email = 'kid@example.invalid') => ({
  request: new Request(`http://x.invalid/api/lesson-sync/${lessonId}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  }),
  env: { DB: db, ASSETS: assets },
  data: { email, role: 'student' },
  params: { lessonId },
});
const get = async (lessonId, email) => {
  const r = await h.onRequestGet(syncCtx('GET', lessonId, null, email));
  return [r.status, await r.json()];
};
const put = async (lessonId, baseRevision, email) => {
  const r = await h.onRequestPut(syncCtx('PUT', lessonId, { files, baseRevision }, email));
  return [r.status, await r.json()];
};
const histGet = async (params, email = 'kid@example.invalid') => {
  const request = new Request(`http://x.invalid/api/lesson-sync-history?${new URLSearchParams(params)}`);
  const r = await hist.onRequestGet({
    request,
    env: { DB: db },
    data: { email, role: 'student' },
    params: {},
  });
  return [r.status, await r.json()];
};

check('no sandbox row: 200 with nulls', await get('sandbox-moshion'), [
  200,
  { files: null, revision: 0, updatedAt: null },
]);

const created = await put('sandbox-moshion', 0);
check('sandbox save creates revision 1', [created[0], created[1].revision], [200, 1]);
check('sandbox workspace reads back', await get('sandbox-moshion'), [
  200,
  { files, revision: 1, updatedAt: created[1].updatedAt, versioned: true },
]);
check('another student sees none', await get('sandbox-moshion', 'other@example.invalid'), [
  200,
  { files: null, revision: 0, updatedAt: null },
]);
check('another mode has its own row', await get('sandbox-js'), [
  200,
  { files: null, revision: 0, updatedAt: null },
]);

const list = await histGet({ lessonId: 'sandbox-moshion' });
check('sandbox save appears in Cloud history', [list[0], list[1].saves?.length], [200, 1]);
const save = await histGet({ id: list[1].saves[0].id });
check('Cloud history carries the sandbox files', [save[0], save[1].save?.files], [200, files]);

// The client half: the sandbox must use the lesson-sync hook and the same
// History panel a lesson uses, and Save must be the deliberate action.
const workspace = readFileSync(join(root, 'components', 'SandboxWorkspace.tsx'), 'utf8');
check('sandbox uses the lesson-sync hook', workspace.includes('useCloudWorkspace(lesson, lessonProgress.authed'), true);
check('sandbox records a device snapshot on Save', workspace.includes('addLocalSnapshot('), true);
check('sandbox renders HistoryPanel', workspace.includes('<HistoryPanel'), true);
check('HistoryPanel gets the sandbox lesson id', workspace.includes('lessonId={lesson.id}'), true);
check('Save is gated on being signed in', workspace.includes('lessonProgress.authed &&'), true);
check('history restore remounts a reSHape model', workspace.includes('onRestore={() =>'), true);

const modes = readFileSync(join(root, 'lib', 'sandbox-modes.ts'), 'utf8');
check('an old sandbox keeps its lesson id; a project brings its own', /lessonId = `sandbox-\$\{mode\.id\}`/.test(modes) && /id: lessonId,/.test(modes), true);
check('the sandbox opens the project\'s lesson id', workspace.includes('sandboxLesson(mode, lessonId)'), true);

console.log(`test-sandbox-cloud-save: ${n} checks`);
rmSync(out, { recursive: true, force: true });
rmSync(histOut, { recursive: true, force: true });
