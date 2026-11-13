#!/usr/bin/env node
// Cross-device workspace sync.
//
// Server: GET/PUT /api/lesson-sync/[lessonId] -- the revision guard is the
// whole correctness story, so a stale baseRevision must return the live row
// (409) rather than overwrite it, and two students must not see each other.
// GET /api/lesson-sync-history is the Cloud tab: one row per successful save,
// scoped to the caller and capped at 20 per lesson.
//
// Client: lib/lesson-sync-merge.ts -- a file this device did not change takes
// the server's copy (including a deletion); a file it did change stays this
// device's, which is the per-file version of the old Pull button's
// last-writer-wins outcome.
//
// Run: node --import ./scripts/register-ts.mjs scripts/test-lesson-sync.mjs
import { compileHandler, makeD1, root } from './_d1-sqlite.mjs';
import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { mergeSyncFiles, filesEqual } from '../lib/lesson-sync-merge.ts';

const h = compileHandler('api/lesson-sync/[lessonId].ts', join(root, '.tmp-lesson-sync-test'));
const hist = compileHandler('api/lesson-sync-history/index.ts', join(root, '.tmp-lesson-sync-history-test'));
let n = 0;
function check(name, got, want) {
  if (JSON.stringify(got) === JSON.stringify(want)) {
    n++;
    console.log(`PASS  ${n}  ${name}`);
  } else {
    console.error(`FAIL: ${name}\n  got  ${JSON.stringify(got)}\n  want ${JSON.stringify(want)}`);
    process.exitCode = 1;
  }
}

const db = makeD1();
// An empty catalog is enough: isLessonAccessible fails open when it finds no
// sibling list for the lesson, which keeps this test off the network.
const ASSETS = {
  fetch: async () =>
    new Response(JSON.stringify({ lessons: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
};
const ctx = (method, lessonId, body, email = 'kid@example.invalid') => ({
  request: new Request(`http://x.invalid/api/lesson-sync/${lessonId}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  }),
  env: { DB: db, ASSETS },
  data: { email, role: 'student' },
  params: { lessonId },
});

const get = async (lessonId, email) => {
  const r = await h.onRequestGet(ctx('GET', lessonId, null, email));
  return [r.status, await r.json()];
};
const put = async (lessonId, files, baseRevision, email) => {
  const r = await h.onRequestPut(ctx('PUT', lessonId, { files, baseRevision }, email));
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

// ---- server: absent, create, read, conflict, advance --------------------
check('no row: 200 with nulls', await get('L1'), [
  200,
  { files: null, revision: 0, updatedAt: null },
]);

const created = await put('L1', { 'script.js': 'first' }, 0);
check('first write creates revision 1', [created[0], created[1].revision], [200, 1]);
check('read returns the workspace', await get('L1'), [
  200,
  { files: { 'script.js': 'first' }, revision: 1, updatedAt: created[1].updatedAt, versioned: true },
]);

const conflict = await put('L1', { 'script.js': 'stale' }, 0);
check('stale baseRevision is refused', conflict[0], 409);
check('conflict carries the live row', [conflict[1].conflict, conflict[1].files, conflict[1].revision], [
  true,
  { 'script.js': 'first' },
  1,
]);
check('refused write left the row untouched', (await get('L1'))[1].files, { 'script.js': 'first' });

const advanced = await put('L1', { 'script.js': 'second' }, 1);
check('current baseRevision advances', [advanced[0], advanced[1].revision], [200, 2]);
check('second write is visible', (await get('L1'))[1].files, { 'script.js': 'second' });

check('another student is isolated', await get('L1', 'other@example.invalid'), [
  200,
  { files: null, revision: 0, updatedAt: null },
]);

const bad = await put('L1', { 'script.js': 42 }, 2);
check('non-text file is a 400', bad[0], 400);

// ---- server: cloud save history -------------------------------------------
const histList = await histGet({ lessonId: 'L1' });
check('history list answers 200', histList[0], 200);
check(
  'history lists the create and the advance, newest first (the 409 added none)',
  histList[1].saves.map((s) => s.revision),
  [2, 1],
);

const newestId = histList[1].saves[0].id;
const newest = await histGet({ id: newestId });
check(
  'a history save carries its files and lesson',
  [newest[0], newest[1].save.files, newest[1].save.lessonId],
  [200, { 'script.js': 'second' }, 'L1'],
);

const oldestId = histList[1].saves[1].id;
check('an older save keeps the older copy', (await histGet({ id: oldestId }))[1].save.files, {
  'script.js': 'first',
});
check('another student cannot read a save id', (await histGet({ id: newestId }, 'other@example.invalid'))[0], 404);
check('another student has no history', (await histGet({ lessonId: 'L1' }, 'other@example.invalid'))[1].saves, []);
check('history needs a lessonId or id', (await histGet({}))[0], 400);

// An upload the page made by itself (`auto: true`, lib/outbox.ts) advances the row exactly
// like a Save but writes no history row; anything but the boolean true is an ordinary Save.
const putRaw = async (lessonId, body, email) => {
  const r = await h.onRequestPut(ctx('PUT', lessonId, body, email));
  return [r.status, await r.json()];
};
const autoCreate = await putRaw('L3', { files: { 'script.js': 'auto 1' }, baseRevision: 0, auto: true });
check('auto: the first write creates revision 1', [autoCreate[0], autoCreate[1].revision], [200, 1]);
const autoAdvance = await putRaw('L3', { files: { 'script.js': 'auto 2' }, baseRevision: 1, auto: true });
check('auto: a later write advances the row', [autoAdvance[0], autoAdvance[1].revision], [200, 2]);
check('auto: the row holds the newest upload', (await get('L3'))[1].files, { 'script.js': 'auto 2' });
check('auto: no history row for either', (await histGet({ lessonId: 'L3' }))[1].saves, []);
const autoStale = await putRaw('L3', { files: { 'script.js': 'stale' }, baseRevision: 1, auto: true });
check('auto: a stale revision is still refused with the live row', [autoStale[0], autoStale[1].files], [409, { 'script.js': 'auto 2' }]);
const notAuto = await putRaw('L3', { files: { 'script.js': 'by hand' }, baseRevision: 2, auto: 'true' });
check('auto: only the boolean true skips history (a string is a Save)', notAuto[0], 200);
const saveAfter = await put('L3', { 'script.js': 'saved' }, 3);
check('a Save after uploads writes its history row', saveAfter[0], 200);
check('history lists only the two Saves', (await histGet({ lessonId: 'L3' }))[1].saves.map((x) => x.revision), [4, 3]);

// A Save of files the row already holds, at the current revision (the student pressed Save after
// an upload by itself): the handler does not answer "unchanged"; it advances the revision and
// writes the history row, which is what makes that Save a Cloud history version.
const sameAgain = await putRaw('L3', { files: { 'script.js': 'saved' }, baseRevision: 4 });
check('a Save of identical files advances the revision', [sameAgain[0], sameAgain[1].revision], [200, 5]);
check('and writes its history row', (await histGet({ lessonId: 'L3' }))[1].saves.map((x) => x.revision), [5, 4, 3]);
// `versioned`: whether this very revision is a Saved version (has a Cloud history row).
check('versioned: a row written by a Save says true', (await get('L3'))[1].versioned, true);
const autoAgain = await putRaw('L3', { files: { 'script.js': 'auto 3' }, baseRevision: 5, auto: true });
check('versioned: a row written by an upload by itself says false', [autoAgain[0], (await get('L3'))[1].versioned], [200, false]);
const staleAgain = await putRaw('L3', { files: { 'script.js': 'stale' }, baseRevision: 1 });
check('versioned: the 409 carries it too', [staleAgain[0], staleAgain[1].versioned], [409, false]);

// The newest 20 survive; the six oldest are pruned.
for (let i = 1; i <= 25; i++) {
  await put('L2', { 'script.js': `v${i}` }, i - 1);
}
const pruned = await histGet({ lessonId: 'L2' });
check('history is capped at 20', pruned[1].saves.length, 20);
check(
  'the newest twenty survived (revisions 25 down to 6)',
  [pruned[1].saves[0].revision, pruned[1].saves[19].revision],
  [25, 6],
);

// ---- client: per-file merge ------------------------------------------------
const remoteWinsUntouched = mergeSyncFiles(
  { 'a.js': 'old', 'b.js': 'old' },
  { 'a.js': 'old', 'b.js': 'old' },
  { 'a.js': 'new', 'b.js': 'old' },
);
check('untouched file takes the server copy', remoteWinsUntouched.files, { 'a.js': 'new', 'b.js': 'old' });
check('tookRemote names the file', remoteWinsUntouched.tookRemote, ['a.js']);

const localWinsEdited = mergeSyncFiles(
  { 'a.js': 'mine', 'b.js': 'old' },
  { 'a.js': 'old', 'b.js': 'old' },
  { 'a.js': 'theirs', 'b.js': 'new' },
);
check('edited file stays local, untouched file follows server', localWinsEdited.files, {
  'a.js': 'mine',
  'b.js': 'new',
});
check('keptLocal names the contested file', localWinsEdited.keptLocal, ['a.js']);

const remoteAdds = mergeSyncFiles({ 'a.js': 'same' }, { 'a.js': 'same' }, { 'a.js': 'same', 'b.js': 'new' });
check('server-only file is adopted', remoteAdds.files, { 'a.js': 'same', 'b.js': 'new' });

const remoteDeletes = mergeSyncFiles({ 'a.js': 'same', 'b.js': 'same' }, { 'a.js': 'same', 'b.js': 'same' }, { 'a.js': 'same' });
check('server deletion applies to an untouched file', remoteDeletes.files, { 'a.js': 'same' });

const localDeletes = mergeSyncFiles({}, { 'a.js': 'old' }, { 'a.js': 'theirs' });
check('local deletion of an edited file stays a deletion', localDeletes.files, {});
check('local deletion is reported as kept', localDeletes.keptLocal, ['a.js']);

// Both sides changed the SAME file: the editor holding unsaved keystrokes is
// the authority. This is the old Pull button's last-writer-wins, minus the
// button and minus throwing away every other file.
const bothChanged = mergeSyncFiles({ 'a.js': 'mine' }, { 'a.js': 'old' }, { 'a.js': 'theirs' });
check('same file changed twice: this device wins', bothChanged.files, { 'a.js': 'mine' });

check('filesEqual ignores key order', filesEqual({ 'a.js': 'x', 'b.js': 'y' }, { 'b.js': 'y', 'a.js': 'x' }), true);
check('filesEqual notices a deleted key', filesEqual({ 'a.js': 'x' }, { 'a.js': 'x', 'b.js': 'y' }), false);

console.log(`test-lesson-sync: ${n} checks`);
rmSync(join(root, '.tmp-lesson-sync-test'), { recursive: true, force: true });
rmSync(join(root, '.tmp-lesson-sync-history-test'), { recursive: true, force: true });
