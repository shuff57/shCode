// Stage 2 of per-account storage: work kept on this computer uploads by itself
// (lib/outbox.ts, lib/outbox-senders.ts, the auto-upload half of lib/lesson-sync.ts).
// Every case DOES the thing with the app's real modules, one process per browser tab
// (scripts/owned-storage-harness.mjs), sharing one localStorage file, one cookie jar and one
// Web Locks manager, with every request answered by the REAL functions/_middleware.ts.
//
//   1. Offline edits, then back online: one upload, by itself, marked `auto`, no Cloud
//      history row; the entry is cleared and the chip says "Uploaded".
//   2. An edit typed while an upload is in flight is not dropped: the next upload sends it.
//   3. A's queue with B's cookie sends nothing; a send in flight when B signs in is refused
//      by the server (409 owner-mismatch), writes nothing, and this page stops sending.
//   4. A page that loaded as guest never queues or sends, even when the browser is signed in.
//   5. A 401 pauses ("Sign in again to upload"); the next confirmed page lifts it and uploads.
//   6. A file changed on both computers: paused, the other version in History, nothing
//      overwritten on either side; Keep mine; Open the other one (History first, read back,
//      and nothing changes when History cannot be written); the same on arrival.
//   7. Different files changed on each computer: merged cleanly, uploaded, the draft gets the
//      other computer's file.
//   8. A Save still writes a Cloud history row; an upload by itself does not; the Save body
//      is byte for byte what it was.
//   9. Two tabs of one student draining at once: one write per change (Web Locks), and
//      without Web Locks the server row still advances once.
//  10. (flowcharts joined the outbox in stage 3 through the guarded drafts route; see R4 and
//      scripts/test-draft-sync.mjs)
//  11. Closing the tab sends the last edit with fetch keepalive.
//  12. Loading the modules starts no timer or listener; stopping the outbox removes its own.
//  13. Offline, a hand-in says what to do instead of a generic error.
//
// Run: node --import ./scripts/register-ts.mjs scripts/test-outbox.mjs

import assert from 'node:assert/strict';
import { account, cleanup, createBrowser, warmDraftRoutes } from './owned-storage-harness.mjs';

let failed = 0;
let passed = 0;
async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`PASS  ${name}`);
  } catch (e) {
    failed++;
    console.error(`FAIL  ${name}\n  ${String(e && e.stack || e).split('\n').slice(0, 8).join('\n  ')}`);
  }
}

const LESSON = (id = 'L1', files = { 'script.js': 'start\n' }) =>
  `({ id: ${JSON.stringify(id)}, title: 'Lab', requirements: [], files: ${JSON.stringify(
    Object.entries(files).map(([path, content]) => ({ path, name: path, type: 'file', content })),
  )} })`;

/** Start the page parts a lab page has: the owner header, the outbox, and the open lesson. */
const START = (opts = {}) => `
  M.ownerFetch.installOwnerFetch();
  // Exactly what components/OutboxRunner.tsx does (senders by dynamic import, /api/me asked fresh).
  globalThis.stopOutbox = M.outboxPage.startOutboxForPage({ editDelayMs: ${opts.editDelay ?? 40}, retryBaseMs: ${opts.retryBase ?? 30} });
  globalThis.idle = async (ms = 4000) => {
    const end = Date.now() + ms;
    await T.sleep(15);
    while (Date.now() < end) {
      if (!M.outbox.outboxBusy()) { await T.sleep(60); if (!M.outbox.outboxBusy()) return true; }
      await T.sleep(15);
    }
    return false;
  };
  globalThis.type = (text, path = 'script.js') => {
    // What LessonWorkspace's autosave does: write the draft, then queue it.
    M.store.useLessonStore.getState().updateFile(path, text);
    M.store.saveOpenDraft(M.store.useLessonStore.getState().lesson.id);
    M.sync.noteDraftSaved(M.store.useLessonStore.getState().lesson.id);
  };
  globalThis.status = (id = 'L1') => { const s = M.outbox.uploadStatus('lab', id); return { state: s.state, text: M.outbox.uploadText(s) }; };
  await M.auth.getCurrentUser();
  await idle();
`;
const OPEN = (id = 'L1', files) => `
  globalThis.lesson = ${LESSON(id, files)};
  M.store.useLessonStore.getState().setLesson(lesson);
  await M.sync.restoreWorkspace(lesson);
  globalThis.offLive = M.sync.allowAutoUpload(lesson.id);
  M.sync.noteDraftSaved(lesson.id);
`;
const STOP = `stopOutbox();`;

const entryKeys = (b, wo) => Object.keys(b.storage()).filter((k) => k.startsWith(`w1:${wo}:outbox:`));
const draftOf = (b, wo, id = 'L1') => {
  const raw = b.storage()[`w1:${wo}:progress:${id}`];
  return raw ? JSON.parse(raw).d.fileContents : null;
};
const historyOf = (b, wo, id = 'L1') => {
  const raw = b.storage()[`w1:${wo}:local-history`];
  return raw ? (JSON.parse(raw).d[id] ?? []) : [];
};
/** Make the server's lesson-sync GET fail (so a copy cannot be fetched), or stop doing so. */
function T_offlineServer(b, on) {
  b.server.answer = on
    ? async (req) => (req.method === 'GET' && new URL(req.url).pathname.startsWith('/api/lesson-sync/') ? Response.json({ error: 'down' }, { status: 503 }) : null)
    : null;
}
const labPuts = (b) => b.server.puts.filter((p) => p.id === 'L1');

await test('1. offline edits, then online: one upload by itself, auto, no history row, entry cleared', async () => {
  const A = await account('a@school.org');
  const b = createBrowser();
  await b.signIn(A);
  const t = await b.open('A');
  await t.run(START() + OPEN());
  const offline = await t.run(`
    T.setOnline(false);
    type('let a = 1;'); await T.sleep(20);
    type('let a = 2;'); await T.sleep(20);
    type('let a = 3; // typed offline');
    await T.sleep(150); // past the edit delay: the timer fired, nothing could go
    await idle();
    return status();
  `);
  assert.deepEqual(offline, { state: 'offline', text: "Saved on this computer. Will upload when you're back online" });
  assert.equal(labPuts(b).length, 0, 'something was sent while offline');
  assert.equal(entryKeys(b, A.wo).length, 1);
  const after = await t.run(`T.setOnline(true); await idle(); return status();`);
  assert.equal(labPuts(b).length, 1, 'not exactly one upload');
  const put = labPuts(b)[0];
  assert.equal(put.auto, true);
  assert.deepEqual(put.keys, ['files', 'baseRevision', 'auto']);
  assert.deepEqual(put.files, { 'script.js': 'let a = 3; // typed offline' });
  assert.deepEqual(b.server.rows[A.email].L1.files, { 'script.js': 'let a = 3; // typed offline' });
  assert.equal(b.server.history[A.email], undefined, 'an upload by itself wrote a Cloud history row');
  assert.deepEqual(entryKeys(b, A.wo), [], 'the entry was not cleared');
  assert.equal(after.state, 'uploaded');
  assert.match(after.text, /^Uploaded \d{1,2}:\d{2}/);
  // The record of this computer's server row moved on, so a reload does not upload again.
  assert.equal(JSON.parse(b.storage()[`w1:${A.wo}:sync:L1`]).d.revision, 1);
  await t.run(STOP);
  await b.close();
});

await test('2. an edit typed while an upload is in flight is sent by the next upload', async () => {
  const A = await account('a@school.org');
  const b = createBrowser();
  await b.signIn(A);
  const t = await b.open('A');
  await t.run(START({ editDelay: 5000 }) + OPEN());
  const hold = b.hold(/^PUT \/api\/lesson-sync\//);
  await t.run(`type('first'); globalThis.sendDone = M.outbox.drain({ force: true });`);
  await hold.reached;
  await t.run(`type('second, typed during the send');`);
  assert.ok(entryKeys(b, A.wo).length === 1);
  hold.release();
  await t.run(`await sendDone; await idle(); await T.sleep(100); await idle();`);
  const puts = labPuts(b);
  assert.deepEqual(puts.map((p) => p.files['script.js']), ['first', 'second, typed during the send']);
  assert.deepEqual(b.server.rows[A.email].L1.files, { 'script.js': 'second, typed during the send' });
  assert.equal(b.server.rows[A.email].L1.revision, 2);
  assert.deepEqual(entryKeys(b, A.wo), []);
  await t.run(STOP);
  await b.close();
});

await test('3. A\'s queue with B\'s cookie sends nothing; a send in flight when B signs in writes nothing', async () => {
  const A = await account('a@school.org');
  const B = await account('b@school.org');
  const b = createBrowser();
  await b.signIn(A);
  const t = await b.open('A');
  await t.run(START() + OPEN());
  await t.run(`T.setOnline(false); type('A offline work'); await idle();`);
  await b.signIn(B);
  const st = await t.run(`T.setOnline(true); await M.outbox.drain({ force: true }); await idle(); return M.outbox.blockedReason();`);
  assert.equal(st, 'owner');
  assert.equal(labPuts(b).length, 0, 'A\'s work was sent with B signed in');
  assert.equal(b.server.rows[B.email]?.L1, undefined);
  assert.equal(entryKeys(b, A.wo).length, 1, 'A\'s entry was dropped');
  assert.deepEqual(draftOf(b, A.wo), { 'script.js': 'A offline work' });
  await t.run(STOP);
  await b.close();

  // In flight when the account changes: the server refuses it and the page stops.
  const b2 = createBrowser();
  await b2.signIn(A);
  const t2 = await b2.open('A');
  await t2.run(START({ editDelay: 5000 }) + OPEN());
  const hold = b2.hold(/^PUT \/api\/lesson-sync\//);
  await t2.run(`type('A work in flight'); globalThis.sendDone = M.outbox.drain({ force: true });`);
  await hold.reached;
  await b2.signIn(B);
  hold.release();
  const r = await t2.run(`await sendDone; await idle(); type('A types more'); await M.outbox.drain({ force: true }); await idle(); return M.outbox.blockedReason();`);
  assert.equal(r, 'owner');
  assert.equal(b2.server.refused.filter((x) => x.status === 409).length, 1);
  assert.equal(b2.server.rows[B.email]?.L1, undefined, 'A\'s code reached B\'s account');
  assert.equal(b2.server.rows[A.email]?.L1, undefined);
  assert.equal(entryKeys(b2, A.wo).length, 1);
  await t2.run(STOP);
  await b2.close();
});

await test('4. a page that loaded as guest never queues or sends, even with a session in the browser', async () => {
  const A = await account('a@school.org');
  for (const signedIn of [false, true]) {
    const b = createBrowser();
    if (signedIn) await b.signIn(A, { ownerCookie: false });
    const t = await b.open('guest');
    const r = await t.run(START() + OPEN() + `
      type('guest work');
      M.outbox.enqueue('lab', 'L1');
      await M.outbox.drain({ force: true });
      await idle();
      return { owner: M.owned.pageOwner(), why: M.outbox.blockedReason(), status: status() };
    `);
    assert.deepEqual(r, { owner: 'guest', why: 'guest', status: { state: 'none', text: null } });
    assert.equal(b.server.puts.length, 0);
    assert.equal(b.server.writes.filter((w) => w.path.startsWith('/api/lesson-sync')).length, 0);
    assert.deepEqual(Object.keys(b.storage()).filter((k) => k.includes(':outbox:')), []);
    await t.run(STOP);
    await b.close();
  }
});

await test('5. a 401 pauses with "Sign in again to upload"; the next confirmed page lifts it and uploads', async () => {
  const A = await account('a@school.org');
  const b = createBrowser();
  await b.signIn(A);
  const t = await b.open('A');
  await t.run(START() + OPEN());
  b.expireSession();
  const r = await t.run(`
    type('typed after the session ended');
    await M.outbox.drain({ force: true }); await idle();
    const first = status();
    type('and more'); await T.sleep(120); await M.outbox.drain({ force: true }); await idle();
    return { first, second: status() };
  `);
  assert.deepEqual(r.first, { state: 'auth', text: 'Sign in again to upload' });
  assert.deepEqual(r.second, { state: 'auth', text: 'Sign in again to upload' });
  assert.equal(b.server.refused.filter((x) => x.status === 401 && x.path.startsWith('/api/lesson-sync')).length, 1, 'sent again after the 401');
  const e = JSON.parse(b.storage()[`w1:${A.wo}:outbox:progress:L1`]).d;
  assert.equal(e.paused, 'auth');
  await t.run(STOP);
  await t.close();
  await b.signIn(A); // sign-in reloads the page
  const t2 = await b.open('A again');
  await t2.run(START());
  assert.deepEqual(b.server.rows[A.email].L1.files, { 'script.js': 'and more' });
  assert.deepEqual(entryKeys(b, A.wo), []);
  await t2.run(STOP);
  await b.close();
});

/** A on this computer and on "another computer" (straight into the server row). */
async function twoVersions(b, A, { mine, theirs, base }) {
  const t = await b.open('A');
  await t.run(`
    M.sync.writeRecord('L1', { base: ${JSON.stringify(base)}, revision: 1 });
    M.vc.saveProgress('L1', { fileContents: ${JSON.stringify(mine)}, commits: [], lastCommittedFileContents: ${JSON.stringify(base)}, completedSteps: [] });
  `);
  b.server.rows[A.email] = { L1: { files: theirs, revision: 2, updatedAt: Date.UTC(2026, 10, 12, 18, 42) } };
  return t;
}

await test('6a. a file changed on both computers: paused, the other version in History, nothing overwritten', async () => {
  const A = await account('a@school.org');
  const b = createBrowser();
  await b.signIn(A);
  const base = { 'script.js': 'start' };
  const t = await twoVersions(b, A, { mine: { 'script.js': 'mine' }, theirs: { 'script.js': 'theirs' }, base });
  await t.run(START() + `M.outbox.enqueue('lab', 'L1'); await M.outbox.drain({ force: true }); await idle();`);
  const st = await t.run(`await M.outbox.drain({ force: true }); await idle(); return status();`);
  assert.deepEqual(st, { state: 'conflict', text: 'Two versions. Choose' });
  assert.equal(labPuts(b).length, 1, 'a paused entry was sent again');
  assert.deepEqual(b.server.rows[A.email].L1, { files: { 'script.js': 'theirs' }, revision: 2, updatedAt: Date.UTC(2026, 10, 12, 18, 42) });
  assert.deepEqual(draftOf(b, A.wo), { 'script.js': 'mine' });
  const hist = historyOf(b, A.wo);
  assert.equal(hist.length, 1);
  assert.match(hist[0].message, /^From another computer, /);
  assert.deepEqual(hist[0].files, { 'script.js': 'theirs' });
  const e = JSON.parse(b.storage()[`w1:${A.wo}:outbox:progress:L1`]).d;
  assert.equal(e.paused, 'conflict');
  assert.equal(e.other.revision, 2);
  assert.equal(e.other.snap, hist[0].id);
  // Keep mine: this computer's version goes up as a Save (a Cloud history row), the other stays in History.
  assert.equal(await t.run(`const r = await M.sync.keepMine('L1'); await idle(); await M.outbox.drain({ force: true }); await idle(); return r;`), 'ok');
  assert.deepEqual(b.server.rows[A.email].L1.files, { 'script.js': 'mine' });
  assert.equal(b.server.rows[A.email].L1.revision, 3);
  assert.deepEqual(b.server.history[A.email].L1, [3]);
  assert.deepEqual(entryKeys(b, A.wo), []);
  assert.deepEqual(draftOf(b, A.wo), { 'script.js': 'mine' });
  await t.run(STOP);
  await b.close();
});

await test('6b. Open the other one: History first (read back), then the other version; nothing uploads', async () => {
  const A = await account('a@school.org');
  const b = createBrowser();
  await b.signIn(A);
  const base = { 'script.js': 'start' };
  const t = await twoVersions(b, A, { mine: { 'script.js': 'mine' }, theirs: { 'script.js': 'theirs' }, base });
  // Arrival: the lab opens and finds the newer copy. Nothing is merged or applied.
  const arrived = await t.run(START() + OPEN('L1', base) + `await idle(); return { editor: M.store.useLessonStore.getState().fileContents, status: status() };`);
  assert.deepEqual(arrived.editor, { 'script.js': 'mine' });
  assert.equal(arrived.status.state, 'conflict');
  assert.equal(JSON.parse(b.storage()[`w1:${A.wo}:sync:L1`]).d.revision, 1, 'arrival recorded the other version as seen');
  // With History refusing writes: nothing changes at all.
  const refused = await t.run(`
    T.failWrites('local-history');
    const r = await M.sync.openOtherVersion('L1');
    T.failWrites(null);
    return { r, editor: M.store.useLessonStore.getState().fileContents, status: status().state };
  `);
  assert.deepEqual(refused, { r: 'history', editor: { 'script.js': 'mine' }, status: 'conflict' });
  assert.deepEqual(draftOf(b, A.wo), { 'script.js': 'mine' });
  const opened = await t.run(`
    const r = await M.sync.openOtherVersion('L1');
    await idle();
    return { r, editor: M.store.useLessonStore.getState().fileContents, status: status().state };
  `);
  assert.equal(opened.r, 'ok');
  assert.deepEqual(opened.editor, { 'script.js': 'theirs' });
  assert.deepEqual(draftOf(b, A.wo), { 'script.js': 'theirs' });
  const hist = historyOf(b, A.wo).map((s) => [s.message.replace(/,.*/, ''), s.files['script.js']]);
  assert.deepEqual(hist, [['Yours', 'mine'], ['From another computer', 'theirs']]);
  assert.equal(labPuts(b).length, 0, 'something was uploaded');
  assert.deepEqual(b.server.rows[A.email].L1.files, { 'script.js': 'theirs' });
  assert.deepEqual(entryKeys(b, A.wo), []);
  await t.run(STOP);
  await b.close();
});

await test('7. different files changed on each computer: merged, uploaded, the draft gets the other file', async () => {
  const A = await account('a@school.org');
  const b = createBrowser();
  await b.signIn(A);
  const base = { 'a.js': 'a1', 'b.js': 'b1' };
  const t = await twoVersions(b, A, { mine: { 'a.js': 'a2 mine', 'b.js': 'b1' }, theirs: { 'a.js': 'a1', 'b.js': 'b2 theirs' }, base });
  await t.run(START() + `M.outbox.enqueue('lab', 'L1'); await M.outbox.drain({ force: true }); await idle(); await T.sleep(80); await idle();`);
  const merged = { 'a.js': 'a2 mine', 'b.js': 'b2 theirs' };
  assert.deepEqual(b.server.rows[A.email].L1.files, merged);
  assert.equal(b.server.rows[A.email].L1.revision, 3);
  assert.deepEqual(labPuts(b).map((p) => [p.baseRevision, p.auto]), [[1, true], [2, true]]);
  assert.deepEqual(draftOf(b, A.wo), merged);
  assert.deepEqual(historyOf(b, A.wo), []);
  assert.deepEqual(entryKeys(b, A.wo), []);
  await t.run(STOP);
  await b.close();
});

await test('8. a Save still writes a history row with the same body as before; an upload by itself does not', async () => {
  const A = await account('a@school.org');
  const b = createBrowser();
  await b.signIn(A);
  const t = await b.open('A');
  await t.run(START({ editDelay: 5000 }) + OPEN());
  await t.run(`type('auto one'); await M.outbox.drain({ force: true }); await idle();`);
  const saved = await t.run(`type('saved by hand'); return await M.sync.saveWorkspace(lesson);`);
  assert.equal(saved, 'saved');
  const puts = labPuts(b);
  assert.deepEqual(puts.map((p) => p.auto), [true, false]);
  assert.deepEqual(puts[1].keys, ['files', 'baseRevision'], 'the Save body changed');
  assert.deepEqual(b.server.history[A.email].L1, [2]);
  await t.run(`await idle(); await M.outbox.drain({ force: true }); await idle();`);
  assert.equal(labPuts(b).length, 2, 'the Save was uploaded again by itself');
  assert.deepEqual(entryKeys(b, A.wo), []);
  await t.run(STOP);
  await b.close();
});

await test('9. two tabs of one student drain at once: one write per change', async () => {
  const A = await account('a@school.org');
  for (const locks of [true, false]) {
    const b = createBrowser();
    await b.signIn(A);
    const t1 = await b.open('A1');
    const t2 = await b.open('A2');
    if (!locks) { await t1.run('T.noLocks();'); await t2.run('T.noLocks();'); }
    await t1.run(START({ editDelay: 5000 }) + OPEN());
    await t2.run(START({ editDelay: 5000 }));
    await t1.run(`T.setOnline(false); type('one change');`);
    await t1.run(`T.setOnline(true);`); // fires a drain in tab 1
    await Promise.all([t1.run(`await M.outbox.drain({ force: true }); await idle();`), t2.run(`await M.outbox.drain({ force: true }); await idle();`)]);
    await Promise.all([t1.run('await T.sleep(100); await idle();'), t2.run('await T.sleep(100); await idle();')]);
    assert.equal(b.server.rows[A.email].L1.revision, 1, `the change was written twice (locks: ${locks})`);
    if (locks) assert.equal(labPuts(b).length, 1, 'with Web Locks only one tab sends');
    assert.deepEqual(b.server.rows[A.email].L1.files, { 'script.js': 'one change' });
    assert.deepEqual(entryKeys(b, A.wo), []);
    await t1.run(STOP);
    await t2.run(STOP);
    await b.close();
  }
});

await test('11. closing the tab sends the last edit with fetch keepalive', async () => {
  const A = await account('a@school.org');
  const b = createBrowser();
  await b.signIn(A);
  const t = await b.open('A');
  await t.run(START({ editDelay: 60000 }) + OPEN() + `
    // The lab's autosave, still counting down when the tab closes.
    globalThis.saver = M.autosave.createDebouncedSave(() => { M.store.saveOpenDraft('L1'); M.sync.noteDraftSaved('L1'); }, 60000);
    M.store.useLessonStore.getState().updateFile('script.js', 'typed one second before closing');
    saver.schedule();
    T.hide();
    await idle();
  `);
  const w = b.server.writes.filter((x) => x.path === '/api/lesson-sync/L1' && x.method === 'PUT');
  assert.equal(w.length, 1);
  assert.equal(w[0].keepalive, true);
  assert.deepEqual(b.server.rows[A.email].L1.files, { 'script.js': 'typed one second before closing' });
  await t.run(STOP);
  await b.close();
});

await test('12. loading the modules starts no timer or listener; stopping the outbox removes its own', async () => {
  const b = createBrowser();
  const A = await account('a@school.org');
  await b.signIn(A);
  const t = await b.open('fresh');
  const r = await t.run(`
    const out = {};
    for (const m of ['lib/outbox.js', 'lib/outbox-senders.js', 'lib/outbox-page.js', 'lib/offline.js', 'lib/lesson-sync.js', 'lib/draft-autosave.js']) out[m] = T.freshLoad(m);
    const before = T.listenerCount();
    const stop = M.outbox.startOutbox({ me: M.auth.getCurrentUser, editDelayMs: 40 });
    M.outbox.enqueue('lab', 'X'); // arms the edit timer
    const during = T.listenerCount() - before;
    stop();
    const timers = process.getActiveResourcesInfo().filter((x) => x === 'Timeout').length;
    return { out, during, after: T.listenerCount() - before, timers };
  `);
  for (const [m, v] of Object.entries(r.out)) assert.deepEqual(v, { resources: [], listeners: 0 }, `${m} started something at import`);
  assert.ok(r.during >= 4, 'the outbox did not listen for online, offline, pagehide and visibility');
  assert.equal(r.after, 0, 'stopping left a listener behind');
  assert.equal(r.timers, 0, 'stopping left a timer behind');
  await b.close();
});

await test('13. offline, a hand-in that cannot be sent says what to do (and is not queued)', async () => {
  const { gradeFailureMessage, NETWORK_TEXT } = await import('../lib/grade-error.ts');
  const { OFFLINE_HANDIN_TEXT } = await import('../lib/offline.ts');
  const saved = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  try {
    Object.defineProperty(globalThis, 'navigator', { value: { onLine: false }, configurable: true });
    assert.equal(gradeFailureMessage({ kind: 'network' }), OFFLINE_HANDIN_TEXT);
    assert.equal(gradeFailureMessage({ kind: 'network', keepsTries: true }), OFFLINE_HANDIN_TEXT);
    Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, configurable: true });
    assert.equal(gradeFailureMessage({ kind: 'network' }), NETWORK_TEXT);
  } finally {
    if (saved) Object.defineProperty(globalThis, 'navigator', saved); else delete globalThis.navigator;
  }
  assert.equal(OFFLINE_HANDIN_TEXT, "You're offline. Your answer is saved on this computer. Hand it in when you're back online.");
  assert.ok(!/[–—]/.test(OFFLINE_HANDIN_TEXT), 'no dashes in student words');
});

// ---------------------------------------------------------------------------
// Review round 1 (each reproduced the defect before its fix)
// ---------------------------------------------------------------------------

await test('R1. two tabs hold the lesson; the untouched (stale) tab drains: the other tab\'s text is uploaded, never erased', async () => {
  const A = await account('a@school.org');
  const b = createBrowser();
  await b.signIn(A);
  const t1 = await b.open('A1');
  const t2 = await b.open('A2');
  await t1.run(START({ editDelay: 60000 }) + OPEN());
  await t2.run(START({ editDelay: 60000 }) + OPEN());
  await t1.run(`type('typed in tab one');`);
  assert.equal(entryKeys(b, A.wo).length, 1);
  await t2.run(`await M.outbox.drain({ force: true }); await idle();`);
  assert.deepEqual(draftOf(b, A.wo), { 'script.js': 'typed in tab one' }, 'the stale tab wrote its editor over the draft');
  assert.deepEqual(b.server.rows[A.email]?.L1?.files, { 'script.js': 'typed in tab one' }, 'tab one\'s text was not uploaded');
  assert.equal(await t2.run(`return M.store.useLessonStore.getState().fileContents['script.js'];`), 'start\n');
  await t1.run(STOP);
  await t2.run(STOP);
  await b.close();
});

await test('R2. Save pressed while an upload is in flight, then the student opens another lesson: no lesson gets the other\'s files', async () => {
  const A = await account('a@school.org');
  const b = createBrowser();
  await b.signIn(A);
  const t = await b.open('A');
  await t.run(START({ editDelay: 60000 }) + OPEN());
  const hold = b.hold(/^PUT \/api\/lesson-sync\/L1$/);
  await t.run(`type('L1 work'); globalThis.sendDone = M.outbox.drain({ force: true });`);
  await hold.reached;
  await t.run(`
    // Save is pressed while the upload is on its way; then the student opens L2 and types.
    globalThis.l1 = lesson;
    globalThis.saveP = M.sync.saveWorkspace(l1);
    await T.sleep(10);
    M.store.useLessonStore.getState().setLesson(${LESSON('L2', { 'script.js': 'L2 starter' })});
    M.store.useLessonStore.getState().updateFile('script.js', 'L2 typed');
  `);
  hold.release();
  const r = await t.run(`const r = await saveP; await sendDone; await idle(); return r;`);
  const bad = b.server.puts.filter((p) => p.id === 'L1' && p.files['script.js'] === 'L2 typed');
  assert.deepEqual(bad, [], 'Save sent L2\'s files under L1');
  assert.notEqual(r, 'saved');
  assert.deepEqual(b.server.rows[A.email].L1.files, { 'script.js': 'L1 work' });
  await t.run(STOP);
  await b.close();
});

await test('R3. History cannot keep the other version: Keep mine changes nothing, stays paused, and says why', async () => {
  const A = await account('a@school.org');
  for (const how of ['never kept', 'kept, then gone']) {
    const b = createBrowser();
    await b.signIn(A);
    const t = await twoVersions(b, A, { mine: { 'script.js': 'mine' }, theirs: { 'script.js': 'theirs' }, base: { 'script.js': 'start' } });
    await t.run(START({ editDelay: 60000 }));
    if (how === 'never kept') await t.run(`T.failWrites('local-history');`);
    await t.run(`M.outbox.enqueue('lab', 'L1'); await M.outbox.drain({ force: true }); await idle();`);
    if (how === 'kept, then gone') await t.run(`M.history.clearLocalHistory('L1'); T.failWrites('local-history');`);
    T_offlineServer(b, true); // the server copy cannot be fetched to keep it now either
    const r = await t.run(`const r = await M.sync.keepMine('L1'); await idle(); await M.outbox.drain({ force: true }); await idle(); T.failWrites(null); return { r, status: status() };`);
    T_offlineServer(b, false);
    assert.equal(r.r, 'history', `Keep mine went ahead (${how})`);
    assert.equal(r.status.state, 'conflict');
    assert.deepEqual(b.server.rows[A.email].L1.files, { 'script.js': 'theirs' }, `the other version was overwritten (${how})`);
    assert.equal(b.server.rows[A.email].L1.revision, 2);
    assert.deepEqual(draftOf(b, A.wo), { 'script.js': 'mine' });
    await t.run(STOP);
    await b.close();
  }
});

await test('R4. flowcharts upload through the guarded drafts route (stage 3), never as a blind retry', async () => {
  // Stage 2 kept flowcharts out because a retried POST could not tell whether the account's copy was
  // newer. Stage 3 sends `baseUpdatedAt`; the full cases are scripts/test-draft-sync.mjs (B10, H2).
  const fs = await import('node:fs');
  const src = fs.readFileSync(new URL('../components/DiagramAssignmentView.tsx', import.meta.url), 'utf8');
  assert.ok(!/saveDraft\(/.test(src), 'DiagramAssignmentView still posts a draft with no base check');
  assert.ok(/noteTextSaved\('diagram'/.test(src), 'DiagramAssignmentView does not queue its draft');
  // The real route is compiled on first use (seconds): do it before the page's wait starts.
  warmDraftRoutes();
  const A = await account('a@school.org');
  const b = createBrowser();
  await b.signIn(A);
  const t = await b.open('A');
  await t.run(START() + `
    M.records.saveDiagramText('D1', '{"nodes":[{"id":"n1"}],"edges":[]}');
    M.draftSync.noteTextSaved('diagram', 'D1');
    await idle();
  `);
  assert.deepEqual(entryKeys(b, A.wo), [], 'the entry was not cleared after the upload');
  assert.deepEqual(b.server.drafts[A.email].map((d) => Object.keys(JSON.parse(d.body)).sort()), [['baseUpdatedAt', 'response']]);
  await t.run(STOP);
  await b.close();
});

await test('R5. a page opened offline uploads once the connection is back (online event, and tab visible)', async () => {
  const A = await account('a@school.org');
  for (const via of ['online', 'visible']) {
    const b = createBrowser();
    await b.signIn(A);
    const t = await b.open('A');
    await t.run(`T.setOnline(false);` + START() + OPEN() + `type('typed on a page opened offline'); await idle();`);
    assert.equal(labPuts(b).length, 0);
    if (via === 'online') await t.run(`T.setOnline(true); await T.sleep(150); await idle();`);
    else await t.run(`T.setOnline(true, { silent: true }); T.setVisible(false); T.setVisible(true); await T.sleep(150); await idle();`);
    assert.deepEqual(b.server.rows[A.email]?.L1?.files, { 'script.js': 'typed on a page opened offline' }, `not uploaded after ${via}`);
    await t.run(STOP);
    await b.close();
  }
});

await test('R6. Save right after an upload by itself is still a Cloud history version; Save with nothing new is not', async () => {
  const A = await account('a@school.org');
  const b = createBrowser();
  await b.signIn(A);
  const t = await b.open('A');
  await t.run(START({ editDelay: 60000 }) + OPEN());
  await t.run(`type('uploaded by itself'); await M.outbox.drain({ force: true }); await idle();`);
  assert.equal(b.server.history[A.email], undefined);
  const r = await t.run(`return [await M.sync.saveWorkspace(lesson), await M.sync.saveWorkspace(lesson)];`);
  assert.deepEqual(r, ['saved', 'unchanged']);
  assert.deepEqual(b.server.history[A.email].L1, [2], 'Save after the upload wrote no history row');
  assert.deepEqual(b.server.rows[A.email].L1.files, { 'script.js': 'uploaded by itself' });
  // Exactly as before when nothing uploaded in between: Save, then Save again is "unchanged".
  const r2 = await t.run(`M.store.useLessonStore.getState().updateFile('script.js', 'by hand only'); return [await M.sync.saveWorkspace(lesson), await M.sync.saveWorkspace(lesson)];`);
  assert.deepEqual(r2, ['saved', 'unchanged']);
  assert.deepEqual(b.server.history[A.email].L1, [2, 3]);
  await t.run(STOP);
  await b.close();
});

await test('R5b. the senders failed to load and /api/me named another account: nothing sent until both are right', async () => {
  const A = await account('a@school.org');
  const b = createBrowser();
  await b.signIn(A);
  const t = await b.open('A');
  const r = await t.run(`
    M.ownerFetch.installOwnerFetch();
    globalThis.loads = 0;
    globalThis.meAnswers = [{ email: 'a@school.org', wo: 'zzzzzzzzzzzzzzzz' }, null];
    globalThis.stopOutbox = M.outboxPage.startOutboxForPage({
      editDelayMs: 40, retryBaseMs: 30,
      // The first page load could not fetch the senders' chunk (offline first visit).
      loadSenders: async () => { loads++; if (loads === 1) throw new Error('chunk failed'); return M.senders.installOutboxSenders(); },
      // /api/me first names a different work owner, then fails, then answers for this account.
      me: async () => (meAnswers.length ? meAnswers.shift() : M.auth.refreshCurrentUser()),
    });
    globalThis.idle = async () => { await T.sleep(20); while (M.outbox.outboxBusy()) await T.sleep(15); await T.sleep(60); };
    await idle();
    M.store.useLessonStore.getState().setLesson(${LESSON()});
    globalThis.offLive = M.sync.allowAutoUpload('L1');
    M.store.useLessonStore.getState().updateFile('script.js', 'waiting for the account');
    M.store.saveOpenDraft('L1'); M.sync.noteDraftSaved('L1');
    await M.outbox.drain({ force: true }); await idle();
    const first = { confirmed: M.outbox.outboxConfirmed(), loads };
    T.setVisible(false); T.setVisible(true); await idle();       // me: null
    const second = { confirmed: M.outbox.outboxConfirmed(), loads };
    T.setOnline(false); T.setOnline(true); await idle();          // me: this account
    return { first, second, third: { confirmed: M.outbox.outboxConfirmed(), loads } };
  `);
  assert.deepEqual(r.first, { confirmed: false, loads: 1 }, 'a different work owner was accepted');
  assert.equal(r.second.confirmed, false);
  assert.equal(r.second.loads, 2, 'the senders were not loaded again');
  assert.equal(r.third.confirmed, true);
  assert.deepEqual(b.server.rows[A.email]?.L1?.files, { 'script.js': 'waiting for the account' });
  assert.equal(b.server.puts.filter((p) => p.id === 'L1').length, 1);
  await t.run(STOP);
  await b.close();
});

await test('R3b. the other version\'s snapshot is gone: Keep mine keeps the account\'s copy of exactly that version first', async () => {
  const A = await account('a@school.org');
  const b = createBrowser();
  await b.signIn(A);
  const t = await twoVersions(b, A, { mine: { 'script.js': 'mine' }, theirs: { 'script.js': 'theirs' }, base: { 'script.js': 'start' } });
  await t.run(START({ editDelay: 60000 }) + `M.outbox.enqueue('lab', 'L1'); await M.outbox.drain({ force: true }); await idle(); M.history.clearLocalHistory('L1');`);
  const r = await t.run(`const r = await M.sync.keepMine('L1'); await idle(); await M.outbox.drain({ force: true }); await idle(); return r;`);
  assert.equal(r, 'ok');
  assert.deepEqual(historyOf(b, A.wo).map((x) => x.files['script.js']), ['theirs'], 'the other version was not kept before it was replaced');
  assert.deepEqual(b.server.rows[A.email].L1.files, { 'script.js': 'mine' });
  // A newer other version than the one shown: not kept, not replaced.
  const b2 = createBrowser();
  await b2.signIn(A);
  const t2 = await twoVersions(b2, A, { mine: { 'script.js': 'mine' }, theirs: { 'script.js': 'theirs' }, base: { 'script.js': 'start' } });
  await t2.run(START({ editDelay: 60000 }) + `M.outbox.enqueue('lab', 'L1'); await M.outbox.drain({ force: true }); await idle(); M.history.clearLocalHistory('L1');`);
  b2.server.rows[A.email].L1 = { files: { 'script.js': 'even newer' }, revision: 3, updatedAt: 5 };
  assert.equal(await t2.run(`return await M.sync.keepMine('L1');`), 'history');
  assert.deepEqual(b2.server.rows[A.email].L1.files, { 'script.js': 'even newer' });
  await t.run(STOP);
  await t2.run(STOP);
  await b.close();
  await b2.close();
});

await test('R1b. only saves that are really waiting are run before a drain', async () => {
  const b = createBrowser();
  const t = await b.open('x');
  const r = await t.run(`
    let a = 0, c = 0, d = 0;
    const offA = M.autosave.registerFlush(() => { a++; }, () => false);   // open, nothing waiting
    const offC = M.autosave.registerFlush(() => { c++; }, () => true);    // waiting
    const offD = M.autosave.registerFlush(() => { d++; });                // no pending check
    const saver = M.autosave.createDebouncedSave(() => {}, 60000);
    const before = M.autosave.hasPendingSaves();
    saver.schedule();
    const during = M.autosave.hasPendingSaves();
    M.autosave.flushPendingSaves();
    offA(); offC(); offD();
    return { a, c, d, before, during, after: saver.pending() };
  `);
  assert.deepEqual(r, { a: 0, c: 1, d: 0, before: true, during: true, after: false });
  await b.close();
});

cleanup();
// ---------------------------------------------------------------------------
// Review round 2 (each reproduced the defect before its fix)
// ---------------------------------------------------------------------------

await test('R7. an untouched, older tab presses Save after another tab uploaded newer work: the newer work is not overwritten', async () => {
  const A = await account('a@school.org');
  const b = createBrowser();
  await b.signIn(A);
  const t1 = await b.open('A1');
  const t2 = await b.open('A2');
  await t1.run(START({ editDelay: 60000 }) + OPEN());
  await t2.run(START({ editDelay: 60000 }) + OPEN());
  await t1.run(`type('newer work'); await M.outbox.drain({ force: true }); await idle();`);
  assert.deepEqual(b.server.rows[A.email].L1.files, { 'script.js': 'newer work' });
  const r = await t2.run(`return await M.sync.saveWorkspace(lesson);`);
  assert.equal(r, 'unchanged', 'a tab with nothing of its own has nothing to save');
  assert.deepEqual(b.server.rows[A.email].L1.files, { 'script.js': 'newer work' }, 'the stale tab\'s Save overwrote the newer work');
  assert.equal(b.server.rows[A.email].L1.revision, 1);
  assert.deepEqual(draftOf(b, A.wo), { 'script.js': 'newer work' });
  await t1.run(STOP);
  await t2.run(STOP);
  await b.close();
});

await test('R7b. both tabs changed the file: Save keeps this tab\'s, and the other tab\'s version is in History first', async () => {
  const A = await account('a@school.org');
  const b = createBrowser();
  await b.signIn(A);
  const t1 = await b.open('A1');
  const t2 = await b.open('A2');
  await t1.run(START({ editDelay: 60000 }) + OPEN());
  await t2.run(START({ editDelay: 60000 }) + OPEN());
  await t1.run(`type('from tab one'); await M.outbox.drain({ force: true }); await idle();`);
  const r = await t2.run(`M.store.useLessonStore.getState().updateFile('script.js', 'from tab two'); return await M.sync.saveWorkspace(lesson);`);
  assert.equal(r, 'saved');
  assert.deepEqual(b.server.rows[A.email].L1.files, { 'script.js': 'from tab two' });
  const kept = historyOf(b, A.wo).filter((x) => x.files['script.js'] === 'from tab one');
  assert.equal(kept.length, 1, 'tab one\'s version was not kept in History before tab two\'s Save replaced it');
  assert.match(kept[0].message, /^From another computer or tab, /);
  await t1.run(STOP);
  await t2.run(STOP);
  await b.close();
});

await test('R7c. the stale tab itself drains the other tab\'s text, then presses Save: still nothing overwritten', async () => {
  const A = await account('a@school.org');
  const b = createBrowser();
  await b.signIn(A);
  const t1 = await b.open('A1');
  const t2 = await b.open('A2');
  await t1.run(START({ editDelay: 60000 }) + OPEN());
  await t2.run(START({ editDelay: 60000 }) + OPEN());
  await t1.run(`type('precious newer work');`);
  await t2.run(`await M.outbox.drain({ force: true }); await idle();`);
  assert.deepEqual(b.server.rows[A.email].L1.files, { 'script.js': 'precious newer work' });
  const r = await t2.run(`return await M.sync.saveWorkspace(lesson);`);
  assert.equal(r, 'unchanged');
  assert.deepEqual(b.server.rows[A.email].L1.files, { 'script.js': 'precious newer work' }, 'the stale tab\'s Save overwrote the text it had just uploaded');
  assert.deepEqual(draftOf(b, A.wo), { 'script.js': 'precious newer work' });
  // The tab that typed it is in step: its own Save is the Cloud history version.
  assert.equal(await t1.run(`return await M.sync.saveWorkspace(lesson);`), 'saved');
  assert.deepEqual(b.server.rows[A.email].L1.files, { 'script.js': 'precious newer work' });
  assert.equal(b.server.history[A.email].L1.length, 1);
  await t1.run(STOP);
  await t2.run(STOP);
  await b.close();
});

await test('R7d. a draft typed after the last upload survives a stale tab\'s Save (the tab that typed it is closed)', async () => {
  const A = await account('a@school.org');
  const b = createBrowser();
  await b.signIn(A);
  const t1 = await b.open('A1');
  const t2 = await b.open('A2');
  await t1.run(START({ editDelay: 60000 }) + OPEN());
  await t2.run(START({ editDelay: 60000 }) + OPEN());
  await t1.run(`type('uploaded v1'); await M.outbox.drain({ force: true }); await idle(); type('unsynced v2');`);
  await t1.run(STOP);
  await t1.close();
  const r = await t2.run(`return await M.sync.saveWorkspace(lesson);`);
  assert.equal(r, 'unchanged');
  // The autosave runs only when the editor's files change (LessonWorkspace's effect), so an
  // editor the Save left alone writes nothing, and the newer draft stays.
  assert.equal(await t2.run(`return M.store.useLessonStore.getState().fileContents['script.js'];`), 'start\n', 'the stale editor was changed, so its autosave would write over the draft');
  assert.deepEqual(draftOf(b, A.wo), { 'script.js': 'unsynced v2' });
  assert.deepEqual(b.server.rows[A.email].L1.files, { 'script.js': 'uploaded v1' });
  await t2.run(STOP);
  await b.close();
});

await test('R8. a Code together session in one tab: no other tab uploads the shared text; uploads resume when it ends', async () => {
  const A = await account('a@school.org');
  const b = createBrowser();
  await b.signIn(A);
  const t1 = await b.open('session');
  await t1.run(START({ editDelay: 60000 }) + OPEN());
  await t1.run(`type('personal draft');`);
  assert.equal(entryKeys(b, A.wo).length, 1);
  // What useCloudWorkspace does when the session starts, then the sandbox's autosave of the shared text.
  await t1.run(`offLive(); globalThis.offHold = M.sync.holdAutoUpload('L1'); type('shared live code');`);
  const t2 = await b.open('other page');
  await t2.run(START({ editDelay: 60000 }) + `await M.outbox.drain({ force: true }); await idle();`);
  assert.equal(labPuts(b).length, 0, 'another tab uploaded during the session');
  assert.equal(entryKeys(b, A.wo).length, 1, 'the waiting upload was dropped');
  await t1.run(`offHold(); globalThis.offLive = M.sync.allowAutoUpload('L1'); type('kept after leaving');`);
  await t2.run(`await M.outbox.drain({ force: true }); await idle();`);
  assert.deepEqual(b.server.rows[A.email].L1.files, { 'script.js': 'kept after leaving' });
  await t1.run(STOP);
  await t2.run(STOP);
  await b.close();
});

await test('R8b. two session tabs: one leaving does not lift the other\'s hold', async () => {
  const A = await account('a@school.org');
  const b = createBrowser();
  await b.signIn(A);
  const t1 = await b.open('session one');
  const t2 = await b.open('session two');
  const t3 = await b.open('other page');
  await t1.run(START({ editDelay: 60000 }) + OPEN());
  await t1.run(`type('personal'); offLive(); globalThis.undo = M.sync.holdAutoUpload('L1'); type('shared text');`);
  await t2.run(`globalThis.undo = M.sync.holdAutoUpload('L1');`);
  await t3.run(START({ editDelay: 60000 }));
  await t2.run(`undo();`);
  await t3.run(`await M.outbox.drain({ force: true }); await idle();`);
  assert.equal(labPuts(b).length, 0, 'the shared text was uploaded while a session was still on');
  await t1.run(`undo();`);
  await t3.run(`await M.outbox.drain({ force: true }); await idle();`);
  assert.equal(labPuts(b).length, 1);
  await t1.run(STOP);
  await t3.run(STOP);
  await b.close();
});

await test('R9b. the answer was lost and Save is pressed BEFORE the retry: still a Cloud history version', async () => {
  const A = await account('a@school.org');
  const b = createBrowser();
  await b.signIn(A);
  const t = await b.open('A');
  await t.run(START({ editDelay: 60000, retryBase: 60000 }) + OPEN());
  await t.run(`
    const realFetch = window.fetch; let lost = false;
    window.fetch = async (...args) => { const r = await realFetch(...args); if (args[1]?.method === 'PUT' && !lost) { lost = true; throw new Error('answer lost'); } return r; };
    type('sent, answer lost');
    await M.outbox.drain({ force: true }); await idle();
  `);
  assert.deepEqual(b.server.rows[A.email].L1.files, { 'script.js': 'sent, answer lost' });
  assert.equal(b.server.history[A.email], undefined);
  const r = await t.run(`return [await M.sync.saveWorkspace(lesson), await M.sync.saveWorkspace(lesson)];`);
  assert.deepEqual(r, ['saved', 'unchanged']);
  assert.equal(b.server.history[A.email].L1.length, 1, 'Save before the retry wrote no history row');
  await t.run(`await M.outbox.drain({ force: true }); await idle();`);
  assert.equal(entryKeys(b, A.wo).length, 0);
  // The lost upload, the Save's refused PUT, the Save itself: the later drain sends nothing more.
  assert.equal(labPuts(b).length, 3, 'the retry sent it again although the Save had');
  await t.run(STOP);
  await b.close();
});

await test('R9. an upload by itself reached the account but its answer was lost: the next Save is still a Cloud history version', async () => {
  const A = await account('a@school.org');
  const b = createBrowser();
  await b.signIn(A);
  const t = await b.open('A');
  await t.run(START({ editDelay: 60000 }) + OPEN());
  await t.run(`
    const realFetch = window.fetch; let lost = false;
    window.fetch = async (...args) => { const r = await realFetch(...args); if (args[1]?.method === 'PUT' && !lost) { lost = true; throw new Error('answer lost'); } return r; };
    type('sent, answer lost');
    await M.outbox.drain({ force: true }); await idle();
    await M.outbox.drain({ force: true }); await idle();
  `);
  assert.deepEqual(b.server.rows[A.email].L1.files, { 'script.js': 'sent, answer lost' });
  assert.equal(entryKeys(b, A.wo).length, 0);
  assert.equal(b.server.history[A.email], undefined);
  const r = await t.run(`return [await M.sync.saveWorkspace(lesson), await M.sync.saveWorkspace(lesson)];`);
  assert.deepEqual(r, ['saved', 'unchanged']);
  assert.equal(b.server.history[A.email].L1.length, 1, 'Save after the lost answer wrote no history row');
  await t.run(STOP);
  await b.close();
});

// ---------------------------------------------------------------------------
// Review round 4
// ---------------------------------------------------------------------------

await test('R10. restoring a Cloud version over a row that was only uploaded by itself keeps that row in History first', async () => {
  const A = await account('a@school.org');
  const b = createBrowser();
  await b.signIn(A);
  const t1 = await b.open('A1');
  const t2 = await b.open('A2');
  await t1.run(START({ editDelay: 60000 }) + OPEN());
  await t1.run(`type('old saved version'); await M.sync.saveWorkspace(lesson);`);
  await t2.run(START({ editDelay: 60000 }) + OPEN());
  await t2.run(`type('newer, uploaded by itself'); await M.outbox.drain({ force: true }); await idle();`);
  await t2.run(STOP);
  await t2.close();
  assert.deepEqual(b.server.rows[A.email].L1.files, { 'script.js': 'newer, uploaded by itself' });
  const r = await t1.run(`return await M.sync.restoreVersionToCloud('L1', { 'script.js': 'an older version' });`);
  assert.equal(r, 'saved');
  assert.deepEqual(b.server.rows[A.email].L1.files, { 'script.js': 'an older version' });
  const kept = historyOf(b, A.wo).filter((x) => x.files['script.js'] === 'newer, uploaded by itself');
  assert.equal(kept.length, 1, 'the replaced upload is kept nowhere');
  // History cannot be written: the restore is refused and the row stays.
  const t3 = await b.open('A3');
  await t3.run(START({ editDelay: 60000 }) + OPEN());
  await t3.run(`type('uploaded again'); await M.outbox.drain({ force: true }); await idle();`);
  await t1.run(`T.failWrites('local-history');`);
  const r2 = await t1.run(`return await M.sync.restoreVersionToCloud('L1', { 'script.js': 'old saved version' });`);
  await t1.run(`T.failWrites(null);`);
  assert.equal(r2, 'error');
  assert.deepEqual(b.server.rows[A.email].L1.files, { 'script.js': 'uploaded again' });
  await t1.run(STOP);
  await t3.run(STOP);
  await b.close();
});

await test('R11. answer lost, page reloaded, arrival read before the retry: Save is still a Cloud history version', async () => {
  const A = await account('a@school.org');
  const b = createBrowser();
  await b.signIn(A);
  const t = await b.open('A');
  await t.run(START({ editDelay: 60000, retryBase: 60000 }) + OPEN());
  await t.run(`
    const realFetch = window.fetch; let lost = false;
    window.fetch = async (...args) => { const r = await realFetch(...args); if (args[1]?.method === 'PUT' && !lost) { lost = true; throw new Error('answer lost'); } return r; };
    type('sent, answer lost');
    await M.outbox.drain({ force: true }); await idle();
  `);
  await t.run(STOP);
  await t.close();
  assert.equal(b.server.history[A.email], undefined);
  const t2 = await b.open('A reloaded');
  // Arrival first (OPEN), the outbox only afterwards.
  await t2.run(`M.ownerFetch.installOwnerFetch();` + OPEN());
  const r = await t2.run(`return [await M.sync.saveWorkspace(lesson), await M.sync.saveWorkspace(lesson)];`);
  assert.deepEqual(r, ['saved', 'unchanged']);
  assert.equal(b.server.history[A.email].L1.length, 1, 'Save after the reload wrote no history row');
  assert.deepEqual(b.server.rows[A.email].L1.files, { 'script.js': 'sent, answer lost' });
  await b.close();
});

await test('R12. two tabs writing one record never leave the same stamp on different contents', async () => {
  const A = await account('a@school.org');
  const b = createBrowser();
  await b.signIn(A);
  const t1 = await b.open('A1');
  const t2 = await b.open('A2');
  // Tab two's clock is far behind tab one's: its own counter alone would repeat tab one's stamp.
  const s1 = await t1.run(`M.owned.ownedLocal.setJSON('probe', { v: 'one' }); return M.owned.ownedLocal.stamp('probe');`);
  const s2 = await t2.run(`const real = Date.now; Date.now = () => 1000; try { M.owned.ownedLocal.setJSON('probe', { v: 'two' }); } finally { Date.now = real; } return M.owned.ownedLocal.stamp('probe');`);
  assert.ok(s2 > s1, `second writer's stamp ${s2} is not above the first's ${s1}`);
  await b.close();
});

// ---------------------------------------------------------------------------
// Review round 5
// ---------------------------------------------------------------------------

await test('R13. History restore: everything it replaces is kept first; if it cannot be, nothing is restored (and nothing uploads over it)', async () => {
  const A = await account('a@school.org');
  const b = createBrowser();
  await b.signIn(A);
  const t = await b.open('A');
  await t.run(START({ editDelay: 60000 }) + OPEN());
  await t.run(`type('version A'); await M.sync.saveWorkspace(lesson); type('version B'); await M.outbox.drain({ force: true }); await idle();`);
  assert.deepEqual(b.server.rows[A.email].L1.files, { 'script.js': 'version B' });
  // What components/HistoryPanel.tsx does: keep first, and only then replace the editor.
  const refused = await t.run(`
    T.failWrites('local-history');
    const r = await M.sync.keepBeforeRestore('L1', { 'script.js': 'version A' }, true);
    T.failWrites(null);
    return r;
  `);
  assert.equal(refused, 'history');
  await t.run(`await M.outbox.drain({ force: true }); await idle();`);
  assert.deepEqual(b.server.rows[A.email].L1.files, { 'script.js': 'version B' });
  assert.deepEqual(draftOf(b, A.wo), { 'script.js': 'version B' });
  const ok = await t.run(`
    const r = await M.sync.keepBeforeRestore('L1', { 'script.js': 'version A' }, true);
    if (r === 'ok') { M.store.useLessonStore.setState({ fileContents: { 'script.js': 'version A' } }); type('version A'); }
    return [r, await M.sync.restoreVersionToCloud('L1', { 'script.js': 'version A' })];
  `);
  assert.deepEqual(ok, ['ok', 'saved']);
  assert.deepEqual(b.server.rows[A.email].L1.files, { 'script.js': 'version A' });
  assert.equal(historyOf(b, A.wo).filter((x) => x.files['script.js'] === 'version B').length, 1, 'version B is kept once');
  await t.run(STOP);
  await b.close();
});

await test('R13b. a live row the server does not vouch for (no `versioned` in the answer) is kept before a restore replaces it', async () => {
  const A = await account('a@school.org');
  const b = createBrowser();
  await b.signIn(A);
  const t = await b.open('A');
  await t.run(START({ editDelay: 60000 }) + OPEN());
  await t.run(`type('mine');`);
  b.server.rows[A.email] = { L1: { files: { 'script.js': 'from elsewhere' }, revision: 7, updatedAt: 5 } };
  b.server.answer = async (req) => (req.method === 'GET' && new URL(req.url).pathname === '/api/lesson-sync/L1'
    ? Response.json({ files: { 'script.js': 'from elsewhere' }, revision: 7, updatedAt: 5 }) : null);
  const r = await t.run(`return await M.sync.restoreVersionToCloud('L1', { 'script.js': 'old one' });`);
  b.server.answer = null;
  assert.equal(r, 'saved');
  assert.equal(historyOf(b, A.wo).filter((x) => x.files['script.js'] === 'from elsewhere').length, 1);
  await t.run(STOP);
  await b.close();
});

await test('R14. Open the other one, then Save: the other version (uploaded by itself there) becomes a Cloud history version', async () => {
  const A = await account('a@school.org');
  const b = createBrowser();
  await b.signIn(A);
  const base = { 'script.js': 'start' };
  const t = await twoVersions(b, A, { mine: { 'script.js': 'mine' }, theirs: { 'script.js': 'theirs' }, base });
  await t.run(START() + OPEN('L1', base) + `await idle();`);
  const r = await t.run(`return [await M.sync.openOtherVersion('L1'), await M.sync.saveWorkspace(lesson), await M.sync.saveWorkspace(lesson)];`);
  assert.deepEqual(r, ['ok', 'saved', 'unchanged']);
  assert.equal(b.server.history[A.email].L1.length, 1);
  assert.deepEqual(b.server.rows[A.email].L1.files, { 'script.js': 'theirs' });
  await t.run(STOP);
  await b.close();
});

// ---------------------------------------------------------------------------
// Review round 6
// ---------------------------------------------------------------------------

await test('R15. Reset after an upload by itself: the code it replaces is in History first; if it cannot be, nothing is reset', async () => {
  const A = await account('a@school.org');
  const b = createBrowser();
  await b.signIn(A);
  const t = await b.open('A');
  await t.run(START({ editDelay: 60000 }) + OPEN());
  await t.run(`type('unique code, never Saved'); await M.outbox.drain({ force: true }); await idle();`);
  const refused = await t.run(`
    T.failWrites('local-history');
    const r = M.store.useLessonStore.getState().resetLesson(lesson);
    T.failWrites(null);
    return [r, M.store.useLessonStore.getState().fileContents['script.js']];
  `);
  assert.deepEqual(refused, [false, 'unique code, never Saved']);
  assert.deepEqual(draftOf(b, A.wo), { 'script.js': 'unique code, never Saved' });
  const done = await t.run(`
    const r = M.store.useLessonStore.getState().resetLesson(lesson);
    type('start\\n');
    await M.outbox.drain({ force: true }); await idle();
    return r;
  `);
  assert.equal(done, true);
  assert.deepEqual(b.server.rows[A.email].L1.files, { 'script.js': 'start\n' });
  const kept = historyOf(b, A.wo).filter((x) => x.files['script.js'] === 'unique code, never Saved');
  assert.equal(kept.length, 1, 'the code Reset replaced is kept nowhere');
  // A reference solution on screen is not the person's work: Reset discards it, History is untouched.
  const before = historyOf(b, A.wo).length;
  const r3 = await t.run(`
    M.store.useLessonStore.getState().updateFile('script.js', 'REFERENCE SOLUTION');
    return M.store.useLessonStore.getState().resetLesson(lesson, { discard: true });
  `);
  assert.equal(r3, true);
  assert.equal(historyOf(b, A.wo).length, before);
  assert.ok(!historyOf(b, A.wo).some((x) => x.files['script.js'] === 'REFERENCE SOLUTION'));
  await t.run(STOP);
  await b.close();
});

await test('R16. History restore: typing while the account is being read is kept before the restore replaces it', async () => {
  const A = await account('a@school.org');
  const b = createBrowser();
  await b.signIn(A);
  const t = await b.open('A');
  await t.run(START({ editDelay: 60000 }) + OPEN());
  await t.run(`type('initial');`);
  const r = await t.run(`
    const realFetch = window.fetch; let release; const gate = new Promise((res) => { release = res; });
    window.fetch = async (...args) => { if ((args[1]?.method ?? 'GET') === 'GET' && String(args[0]).includes('/api/lesson-sync/')) await gate; return realFetch(...args); };
    const p = M.sync.keepBeforeRestore('L1', { 'script.js': 'restored' }, true);
    await T.sleep(30);
    type('typed after closing History');
    release();
    const out = await p;
    window.fetch = realFetch;
    return out;
  `);
  assert.equal(r, 'ok');
  const texts = historyOf(b, A.wo).map((x) => x.files['script.js']);
  assert.ok(texts.includes('typed after closing History'), 'the later typing is kept nowhere');
  assert.ok(texts.includes('initial'));
  await t.run(STOP);
  await b.close();
});

console.log(`outbox: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
