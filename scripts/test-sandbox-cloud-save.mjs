#!/usr/bin/env node
// The sandbox saves the same way a lesson does: Commit posts a snapshot to
// /api/commits and History reads it back. This pins the two halves that are
// easy to break without noticing:
//
//   1. the commits route accepts a sandbox-<mode> lesson id (it is not in the
//      lessons manifest, so the green-to-advance gate must fail open), and the
//      snapshot round-trips for the owning student only;
//   2. SandboxWorkspace still wires the lesson commit/history surface rather
//      than drifting back to a local-only draft.
//
// Run: node scripts/test-sandbox-cloud-save.mjs
import { compileHandler, makeD1, root } from './_d1-sqlite.mjs';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const out = join(root, '.tmp-sandbox-cloud-save-test');
const h = compileHandler('api/commits/index.ts', out);
let n = 0;
function check(name, got, want) {
  if (JSON.stringify(got) === JSON.stringify(want)) { n++; console.log(`PASS  ${n}  ${name}`); }
  else { console.error(`FAIL: ${name} -- got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`); process.exitCode = 1; }
}

const db = makeD1();
// A manifest that does not know about sandbox-<mode>: the green-to-advance
// gate looks the id up, finds no module siblings, and must let the write
// through. Without ASSETS the helper would fail open for a different reason
// and this test would not exercise the real branch.
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
const postCtx = (lessonId, email = 'kid@example.invalid') => ({
  request: new Request('http://x.invalid/api/commits', {
    method: 'POST',
    body: JSON.stringify({
      id: `commit-${lessonId}`,
      lessonId,
      message: 'sandbox snapshot',
      files,
      changedFileIds: ['sandbox-moshion-script'],
    }),
  }),
  env: { DB: db, ASSETS: assets },
  data: { email, role: 'student' },
});
const getCtx = (lessonId, email = 'kid@example.invalid') => ({
  request: new Request(`http://x.invalid/api/commits?lessonId=${lessonId}`),
  env: { DB: db, ASSETS: assets },
  data: { email, role: 'student' },
});

const posted = await h.onRequestPost(postCtx('sandbox-moshion'));
const postedBody = await posted.json();
check('sandbox commit is created', [posted.status, postedBody.commit?.id], [201, 'commit-sandbox-moshion']);
check('snapshot round-trips', postedBody.commit?.files, files);

const listed = await h.onRequestGet(getCtx('sandbox-moshion'));
const listedBody = await listed.json();
check('sandbox history lists the commit', [listed.status, listedBody.commits?.length, listedBody.commits?.[0]?.files], [200, 1, files]);

const other = await h.onRequestGet(getCtx('sandbox-moshion', 'other@example.invalid'));
check('another student sees no sandbox history', (await other.json()).commits, []);

// Modes are independent lesson ids, so a js commit must not appear under flow.
const otherMode = await h.onRequestGet(getCtx('sandbox-js'));
check('modes have separate histories', (await otherMode.json()).commits, []);

// The client half: the sandbox must use the lesson commit/history components
// and the same cross-device banner, not a bespoke save path.
const workspace = readFileSync(join(root, 'components', 'SandboxWorkspace.tsx'), 'utf8');
check('sandbox renders CommitDialog', workspace.includes('<CommitDialog'), true);
check('sandbox renders HistoryPanel', workspace.includes('<HistoryPanel'), true);
check('sandbox renders CrossDeviceSyncBanner', workspace.includes('<CrossDeviceSyncBanner'), true);
check('sandbox commits through the lesson store', workspace.includes('commitChanges(message)'), true);
check('history restore remounts a reSHape model', workspace.includes('onRestore={() =>'), true);

const modes = readFileSync(join(root, 'lib', 'sandbox-modes.ts'), 'utf8');
check('each mode is its own lesson id', /id: `sandbox-\$\{mode\.id\}`/.test(modes), true);

console.log(`test-sandbox-cloud-save: ${n} checks`);
rmSync(out, { recursive: true, force: true });
