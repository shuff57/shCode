// Stage 3 of per-account storage: written answers and flowchart drafts upload by themselves
// (lib/draft-sync.ts, lib/draft-sync-core.ts, the guarded drafts route). Quiz picks are NOT
// uploaded (left out after six reviews; the quiz screen is as it was).
//
//  C*  the rules, pure (lib/draft-sync-core.ts)
//  H*  the REAL handler over a real SQLite with every migration applied
//  B*  the app's real modules, one process per browser tab, two browsers sharing one database
//      as two computers (scripts/owned-storage-harness.mjs), every request through the REAL
//      functions/_middleware.ts and the real route
//  V*, W*  the reproductions of the reviews (each was a defect)
//
// Run: node --import ./scripts/register-ts.mjs scripts/test-draft-sync.mjs

import assert from 'node:assert/strict';
import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { account, cleanup, createBrowser, sharedD1, warmDraftRoutes } from './owned-storage-harness.mjs';
import { compileHandler, makeD1, root } from './_d1-sqlite.mjs';
import { textArrival } from '../lib/draft-sync-core.ts';

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

// ---- C: the rules --------------------------------------------------------------------------



await test('C3. text arrival: the account\'s, this computer\'s, two versions, and work from before stage 3', () => {
  const srv = (text, updatedAt) => ({ text, updatedAt });
  // Nothing in the account.
  assert.deepEqual(textArrival({ local: 'mine', sync: null, server: null }), { use: 'local', upload: true, sync: { base: null, text: null } });
  assert.deepEqual(textArrival({ local: '', sync: null, server: null }), { use: 'local', upload: false, sync: { base: null, text: null } });
  // Nothing here.
  assert.deepEqual(textArrival({ local: null, sync: null, server: srv('theirs', 5) }), { use: 'server', upload: false, sync: { base: 5, text: 'theirs' } });
  // The same text.
  assert.equal(textArrival({ local: 'same', sync: null, server: srv('same', 5) }).use, 'server');
  // Not changed here since it last agreed; the account moved on.
  assert.deepEqual(textArrival({ local: 'v1', sync: { base: 5, text: 'v1' }, server: srv('v2', 9) }), { use: 'server', upload: false, sync: { base: 9, text: 'v2' } });
  // Changed here; the account is where this computer left it.
  assert.deepEqual(textArrival({ local: 'v1 more', sync: { base: 5, text: 'v1' }, server: srv('v1', 5) }), { use: 'local', upload: true, sync: { base: 5, text: 'v1' } });
  // Changed on both.
  assert.deepEqual(textArrival({ local: 'v1 mine', sync: { base: 5, text: 'v1' }, server: srv('v1 theirs', 9) }), { use: 'conflict', upload: false, sync: { base: 5, text: 'v1', other: { text: 'v1 theirs', updatedAt: 9 } } });
  // A choice already waiting stays a choice, now against the newest version.
  assert.equal(textArrival({ local: 'mine', sync: { base: 5, text: 'v1', other: { text: 'x', updatedAt: 7 } }, server: srv('y', 9) }).sync.other.text, 'y');
  // Work from before stage 3 (no record): the account's opens, as it did then, and this computer's is kept.
  assert.deepEqual(textArrival({ local: 'typed long ago', sync: null, server: srv('theirs', 5) }), { use: 'server', keepLocal: true, upload: false, sync: { base: 5, text: 'theirs' } });
  // A flowchart's untouched starter counts as nothing.
  assert.deepEqual(textArrival({ local: 'STARTER', blank: 'STARTER', sync: null, server: srv('theirs', 5) }), { use: 'server', upload: false, sync: { base: 5, text: 'theirs' } });
  assert.deepEqual(textArrival({ local: 'STARTER', blank: 'STARTER', sync: null, server: null }), { use: 'local', upload: false, sync: { base: null, text: null } });
});

// ---- H: the real handlers ------------------------------------------------------------------

const hdir = join(root, '.tmp-draft-sync-test');
const draftsH = compileHandler('api/lesson-drafts/[lessonId].ts', join(hdir, 'drafts'));
const call = async (fn, db, path, method, body, email = 'kid@example.invalid') => {
  const lessonId = path.split('/').pop();
  const r = await fn({
    request: new Request(`http://x.invalid${path}`, { method, body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body) }),
    env: { DB: db }, data: { email }, params: { lessonId },
  });
  return [r.status, await r.json()];
};


await test('H2. lesson-drafts: baseUpdatedAt refuses a late upload; without it a hand-in still overwrites', async () => {
  const db = makeD1();
  const get = () => call(draftsH.onRequestGet, db, '/api/lesson-drafts/W1', 'GET');
  const post = (body) => call(draftsH.onRequestPost, db, '/api/lesson-drafts/W1', 'POST', body);
  const [s1, r1] = await post({ response: 'one', baseUpdatedAt: null });
  assert.equal(s1, 200);
  assert.deepEqual(await get(), [200, { response: 'one', updatedAt: r1.updatedAt }]);
  // Another computer that never saw the row: refused with the row.
  assert.deepEqual(await post({ response: 'late', baseUpdatedAt: null }), [409, { conflict: true, response: 'one', updatedAt: r1.updatedAt }]);
  assert.equal((await post({ response: 'late', baseUpdatedAt: r1.updatedAt - 5 }))[0], 409);
  assert.equal((await get())[1].response, 'one');
  const [s2, r2] = await post({ response: 'two', baseUpdatedAt: r1.updatedAt });
  assert.equal(s2, 200);
  assert.ok(r2.updatedAt > r1.updatedAt);
  // A hand-in (no baseUpdatedAt, the body every existing caller sends): overwrites, as before.
  const [s3, r3] = await post({ response: 'handed in' });
  assert.equal(s3, 200);
  assert.ok(r3.updatedAt > r2.updatedAt);
  assert.equal((await get())[1].response, 'handed in');
  // ...and the upload that was based on the row before it is refused.
  assert.equal((await post({ response: 'late again', baseUpdatedAt: r2.updatedAt }))[0], 409);
  assert.equal((await post({ response: 'x', baseUpdatedAt: 'yesterday' }))[0], 400);
  // A base for a row that no longer exists: refused with nulls.
  const empty = makeD1();
  assert.deepEqual(await call(draftsH.onRequestPost, empty, '/api/lesson-drafts/W1', 'POST', { response: 'x', baseUpdatedAt: 7 }), [409, { conflict: true, response: null, updatedAt: null }]);
});
rmSync(hdir, { recursive: true, force: true });

// ---- B: the real modules, two computers ---------------------------------------------------
warmDraftRoutes();

const START = (opts = {}) => `
  M.ownerFetch.installOwnerFetch();
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
  // What WrittenGrader does: ask the account, decide, then write the record on every change.
  globalThis.openWritten = async (id = 'W1') => {
    const token = M.draftSync.textToken('written', id);
    const a = M.draftSync.arriveText('written', id, await M.draftSync.askDraft(id), undefined, token);
    return a;
  };
  globalThis.write = (text, id = 'W1') => {
    M.records.saveWrittenRecord(id, { ...M.records.loadWrittenRecord(id), response: text });
    M.draftSync.noteTextSaved('written', id);
  };
  globalThis.wstatus = (id = 'W1', kind = 'written') => ({
    state: M.outbox.uploadStatus(kind, id).state,
    entry: !!M.outbox.readEntry(kind, id),
    stored: kind === 'written' ? M.records.loadWrittenRecord(id).response : null,
    kept: M.draftSync.loadKept(kind, id),
    keptAll: M.draftSync.loadKeptList(kind, id).map((k) => k.text),
    sync: M.draftSync.loadTextSync(kind, id),
  });
  await idle();
`;
const STOP = `globalThis.stopOutbox && globalThis.stopOutbox();`;
const draftRow = (db, email, id) => db.sqlite.prepare('SELECT response, updated_at FROM lesson_drafts WHERE student_email = ? AND lesson_id = ?').get(email, id) ?? null;

await test('B1. a written answer typed offline uploads by itself when the connection is back', async () => {
  const A = await account('a@school.org');
  const b = createBrowser();
  await b.signIn(A);
  const t = await b.open('lab');
  await t.run(START());
  const offline = await t.run(`T.setOnline(false); await openWritten(); write('typed with no connection'); await idle(); return wstatus();`);
  assert.equal(offline.state, 'offline');
  assert.equal(draftRow(b.d1, A.email, 'W1'), null);
  const after = await t.run(`T.setOnline(true); await idle(); return wstatus();`);
  assert.equal(after.state, 'uploaded');
  assert.equal(after.entry, false);
  assert.equal(draftRow(b.d1, A.email, 'W1').response, 'typed with no connection');
  const posts = b.server.drafts[A.email].map((d) => JSON.parse(d.body));
  assert.deepEqual(posts, [{ response: 'typed with no connection', baseUpdatedAt: null }]);
  // More typing: one more upload, based on the row this computer now knows.
  await t.run(`write('typed with no connection, and more'); await idle();`);
  assert.equal(draftRow(b.d1, A.email, 'W1').response, 'typed with no connection, and more');
  assert.equal(b.server.drafts[A.email].length, 2);
  // Nothing changed: nothing is sent.
  await t.run(`write('typed with no connection, and more'); await M.outbox.drain({ force: true }); await idle();`);
  assert.equal(b.server.drafts[A.email].length, 2);
  await t.run(STOP);
  await b.close();
});

await test('B2. changed on two computers: paused, nothing overwritten, Keep mine keeps the other first', async () => {
  const A = await account('a@school.org');
  const d1 = sharedD1();
  const c1 = createBrowser({ d1 });
  const c2 = createBrowser({ d1 });
  await c1.signIn(A);
  await c2.signIn(A);
  const t1 = await c1.open('computer-1');
  const t2 = await c2.open('computer-2');
  await t1.run(START());
  await t2.run(START());
  await t1.run(`await openWritten(); write('first draft'); await idle();`);
  // Computer 2 opens: it gets the account's text.
  const arrived = await t2.run(`const a = await openWritten(); return a.use;`);
  assert.equal(arrived, 'server');
  await t2.run(`write('first draft'); T.setOnline(false); write('first draft, changed on computer 2'); await idle();`);
  await t1.run(`write('first draft, changed on computer 1'); await idle();`);
  assert.equal(draftRow(d1, A.email, 'W1').response, 'first draft, changed on computer 1');
  const paused = await t2.run(`T.setOnline(true); await idle(); return wstatus();`);
  assert.equal(paused.state, 'conflict');
  assert.equal(paused.stored, 'first draft, changed on computer 2');
  assert.equal(paused.sync.other.text, 'first draft, changed on computer 1');
  assert.equal(draftRow(d1, A.email, 'W1').response, 'first draft, changed on computer 1', 'the account was overwritten');
  // Typing more while paused uploads nothing.
  await t2.run(`write('first draft, changed on computer 2!'); await M.outbox.drain({ force: true }); await idle();`);
  assert.equal(draftRow(d1, A.email, 'W1').response, 'first draft, changed on computer 1');
  // Keep mine: when the other version cannot be stored, nothing changes.
  const refused = await t2.run(`T.failWrites('draft-kept'); const r = M.draftSync.keepMineText('written', 'W1'); T.failWrites(null); await idle(); return { r, s: wstatus() };`);
  assert.deepEqual(refused.r, { ok: false, why: 'not-kept' });
  assert.equal(refused.s.state, 'conflict');
  assert.equal(draftRow(d1, A.email, 'W1').response, 'first draft, changed on computer 1');
  // Keep mine: the other version is on this computer, then mine goes up.
  const kept = await t2.run(`const r = M.draftSync.keepMineText('written', 'W1'); await idle(); return { r, s: wstatus() };`);
  assert.equal(kept.r.ok, true);
  assert.equal(kept.s.kept.text, 'first draft, changed on computer 1');
  assert.equal(kept.s.kept.which, 'other');
  assert.equal(kept.s.state, 'uploaded');
  assert.equal(draftRow(d1, A.email, 'W1').response, 'first draft, changed on computer 2!');
  // Computer 1 opens again with nothing new of its own: it takes the account's text.
  assert.equal(await t1.run(`const a = await openWritten(); return a.use;`), 'server');
  await t1.run(STOP); await t2.run(STOP);
  await c1.close(); await c2.close();
});

await test('B3. Use the other one: mine is kept first, the record becomes the account\'s, nothing uploads; and back', async () => {
  const A = await account('a@school.org');
  const d1 = sharedD1();
  const c1 = createBrowser({ d1 });
  const c2 = createBrowser({ d1 });
  await c1.signIn(A); await c2.signIn(A);
  const t1 = await c1.open('computer-1');
  const t2 = await c2.open('computer-2');
  await t1.run(START()); await t2.run(START());
  await t1.run(`await openWritten(); write('base'); await idle();`);
  await t2.run(`await openWritten(); write('base'); T.setOnline(false); write('mine'); await idle();`);
  await t1.run(`write('theirs'); await idle();`);
  // This time the two versions are found when computer 2 opens the lesson again (arrival).
  const arrived = await t2.run(`T.setOnline(true, { silent: true }); const a = await openWritten(); return { use: a.use, s: wstatus() };`);
  assert.equal(arrived.use, 'conflict');
  assert.equal(arrived.s.state, 'conflict');
  const sentBefore = c2.server.drafts[A.email]?.length ?? 0;
  // Cannot keep mine first: nothing changes.
  const refused = await t2.run(`T.failWrites('draft-kept'); const r = M.draftSync.useOtherText('written', 'W1'); T.failWrites(null); return { r, s: wstatus() };`);
  assert.deepEqual(refused.r, { ok: false, why: 'not-kept' });
  assert.equal(refused.s.stored, 'mine');
  const used = await t2.run(`const r = M.draftSync.useOtherText('written', 'W1'); await idle(); await M.outbox.drain({ force: true }); await idle(); return { r, s: wstatus() };`);
  assert.deepEqual(used.r, { ok: true, text: 'theirs' });
  assert.equal(used.s.stored, 'theirs');
  assert.deepEqual([used.s.kept.text, used.s.kept.which], ['mine', 'mine']);
  assert.equal(used.s.entry, false);
  assert.equal(c2.server.drafts[A.email]?.length ?? 0, sentBefore, 'something was uploaded');
  assert.equal(draftRow(d1, A.email, 'W1').response, 'theirs');
  // Changed their mind: Switch to it stores what is open as the kept one first, and mine uploads normally.
  const back = await t2.run(`const r = M.draftSync.swapWithKept('written', 'W1', 'theirs', 'mine'); write(r.text); await idle(); return { r, s: wstatus() };`);
  assert.deepEqual(back.r, { ok: true, text: 'mine' });
  assert.deepEqual([back.s.kept.text, back.s.kept.which], ['theirs', 'other']);
  assert.equal(draftRow(d1, A.email, 'W1').response, 'mine');
  await t1.run(STOP); await t2.run(STOP);
  await c1.close(); await c2.close();
});

await test('B4. the account could not be asked: this computer\'s text opens and nothing remembered changes', async () => {
  const A = await account('a@school.org');
  const b = createBrowser();
  await b.signIn(A);
  const t = await b.open('lab');
  await t.run(START());
  await t.run(`await openWritten(); write('uploaded text'); await idle();`);
  const before = await t.run(`return wstatus().sync;`);
  const r = await t.run(`T.setOnline(false); write('typed offline'); const a = await openWritten(); return { use: a.use, sync: wstatus().sync, s: wstatus() };`);
  assert.equal(r.use, 'local');
  assert.deepEqual(r.sync, before);
  assert.equal(r.s.stored, 'typed offline');
  // A server error is the same: not "the account has nothing".
  b.server.answer = async (req) => (req.method === 'GET' && new URL(req.url).pathname.startsWith('/api/lesson-drafts/') ? new Response('{"error":"boom"}', { status: 500 }) : null);
  const r2 = await t.run(`T.setOnline(true, { silent: true }); const a = await openWritten(); return { use: a.use, sync: wstatus().sync };`);
  b.server.answer = null;
  assert.equal(r2.use, 'local');
  assert.deepEqual(r2.sync, before);
  await t.run(STOP);
  await b.close();
});

await test('B5. work from before stage 3 (no record): the account\'s opens, this computer\'s is kept; kept or it asks', async () => {
  const A = await account('a@school.org');
  const d1 = sharedD1();
  const other = createBrowser({ d1 });
  await other.signIn(A);
  const to = await other.open('another-computer');
  await to.run(START());
  await to.run(`await openWritten(); write('saved to the account'); await idle();`);
  for (const canKeep of [true, false]) {
    const b = createBrowser({ d1 });
    await b.signIn(A);
    const t = await b.open('old-computer');
    await t.run(START());
    // The record as stage 1-2 left it: text, no draft-sync record.
    await t.run(`M.records.saveWrittenRecord('W1', { response: 'typed here before the update' });`);
    const r = await t.run(`${canKeep ? '' : "T.failWrites('draft-kept');"} const a = await openWritten(); T.failWrites(null); await idle(); return { use: a.use, s: wstatus() };`);
    if (canKeep) {
      assert.equal(r.use, 'server');
      assert.deepEqual([r.s.kept.text, r.s.kept.which], ['typed here before the update', 'mine']);
      assert.equal(r.s.state === 'conflict', false);
    } else {
      assert.equal(r.use, 'conflict');
      assert.equal(r.s.state, 'conflict');
      assert.equal(r.s.stored, 'typed here before the update');
    }
    assert.equal(draftRow(d1, A.email, 'W1').response, 'saved to the account');
    await t.run(STOP);
    await b.close();
  }
  await to.run(STOP);
  await other.close();
});



await test('B8. A\'s queued answer is never sent as B; a guest page queues nothing', async () => {
  const A = await account('a@school.org');
  const B = await account('b@school.org');
  const b = createBrowser();
  await b.signIn(A);
  const t = await b.open('a-tab');
  await t.run(START());
  await t.run(`T.setOnline(false); await openWritten(); write('A, offline'); await idle();`);
  await b.signIn(B);
  const st = await t.run(`T.setOnline(true); await M.outbox.drain({ force: true }); await idle(); return M.outbox.blockedReason();`);
  assert.equal(st, 'owner');
  assert.equal(draftRow(b.d1, B.email, 'W1'), null);
  assert.equal(draftRow(b.d1, A.email, 'W1'), null);
  // B's own page sees none of it and uploads only B's.
  const tb = await b.open('b-tab');
  await tb.run(START());
  const seen = await tb.run(`const a = await openWritten(); return { use: a.use, text: M.records.loadWrittenRecord('W1').response };`);
  assert.deepEqual(seen, { use: 'local', text: '' });
  await tb.run(`write('B writes'); await idle();`);
  assert.equal(draftRow(b.d1, B.email, 'W1').response, 'B writes');
  assert.equal(draftRow(b.d1, A.email, 'W1'), null);
  // A signs back in: A's waiting work goes up, as A.
  await b.signIn(A);
  await t.run(`await M.outbox.drain({ force: true }); await idle();`);
  assert.equal(draftRow(b.d1, A.email, 'W1').response, 'A, offline');
  await t.run(STOP); await tb.run(STOP);
  await b.close();

  const g = createBrowser();
  const tg = await g.open('guest');
  await tg.run(START());
  await g.signIn(A);
  const r = await tg.run(`write('typed signed out'); await idle(); await M.outbox.drain({ force: true }); await idle(); return { w: M.outbox.readEntry('written', 'W1') };`);
  assert.deepEqual(r, { w: null });
  assert.equal(draftRow(g.d1, A.email, 'W1'), null);
  await tg.run(STOP);
  await g.close();
});

await test('B9. a hand-in while two versions wait keeps the other one on this computer; Save draft is guarded too', async () => {
  const A = await account('a@school.org');
  const d1 = sharedD1();
  const c1 = createBrowser({ d1 });
  const c2 = createBrowser({ d1 });
  await c1.signIn(A); await c2.signIn(A);
  const t1 = await c1.open('computer-1');
  const t2 = await c2.open('computer-2');
  await t1.run(START()); await t2.run(START({ editDelay: 60000 }));
  await t1.run(`await openWritten(); write('base'); await idle();`);
  await t2.run(`await openWritten(); write('base'); write('mine');`);
  await t1.run(`write('theirs'); await idle();`);
  // Save draft on computer 2: refused by the base check, it asks instead of overwriting.
  assert.equal(await t2.run(`return await M.draftSync.saveTextNow('written', 'W1');`), 'two-versions');
  assert.equal(draftRow(d1, A.email, 'W1').response, 'theirs');
  assert.equal(await t2.run(`return wstatus().state;`), 'conflict');
  // Submit (a hand-in: it writes the row whatever is there). The waiting version is kept here first.
  assert.equal(await t2.run(`return await M.draftSync.handInText('written', 'W1', 'mine');`), true);
  const s = await t2.run(`await idle(); return wstatus();`);
  assert.equal(draftRow(d1, A.email, 'W1').response, 'mine');
  assert.deepEqual([s.kept.text, s.kept.which], ['theirs', 'other']);
  assert.equal(s.state === 'conflict', false);
  assert.equal(s.sync.other, undefined);
  // Save draft with nothing in the way says saved.
  assert.equal(await t2.run(`write('mine, more'); return await M.draftSync.saveTextNow('written', 'W1');`), 'saved');
  assert.equal(draftRow(d1, A.email, 'W1').response, 'mine, more');
  await t1.run(STOP); await t2.run(STOP);
  await c1.close(); await c2.close();
});

await test('B10. a flowchart: an untouched starter is not uploaded, an edited chart is, a failed upload is tried again', async () => {
  const A = await account('a@school.org');
  const b = createBrowser();
  await b.signIn(A);
  const t = await b.open('lab');
  await t.run(START({ retryBase: 30 }));
  const STARTER = JSON.stringify({ nodes: [], edges: [] });
  const EDITED = JSON.stringify({ nodes: [{ id: 'n1' }], edges: [] });
  await t.run(`
    globalThis.draw = (text) => { M.records.saveDiagramText('D1', text); M.draftSync.noteTextSaved('diagram', 'D1', ${JSON.stringify(STARTER)}); };
    M.draftSync.arriveText('diagram', 'D1', await M.draftSync.askDraft('D1'), ${JSON.stringify(STARTER)});
    draw(${JSON.stringify(STARTER)}); await idle();
  `);
  assert.equal(draftRow(b.d1, A.email, 'D1'), null);
  assert.equal(await t.run(`return M.outbox.readEntry('diagram', 'D1');`), null);
  // The first upload fails (the save that used to be dropped): it is tried again.
  let failedOnce = false;
  b.server.answer = async (req) => {
    if (!failedOnce && req.method === 'POST' && new URL(req.url).pathname === '/api/lesson-drafts/D1') { failedOnce = true; return new Response('{"error":"boom"}', { status: 500 }); }
    return null;
  };
  await t.run(`draw(${JSON.stringify(EDITED)}); await idle(); await T.sleep(200); await idle();`);
  b.server.answer = null;
  assert.equal(failedOnce, true);
  assert.equal(draftRow(b.d1, A.email, 'D1').response, EDITED);
  assert.equal(await t.run(`return M.outbox.uploadStatus('diagram', 'D1').state;`), 'uploaded');
  await t.run(STOP);
  await b.close();
});

await test('B11. a lost answer: the account already has this text, so nothing is asked and nothing is sent twice', async () => {
  const A = await account('a@school.org');
  const b = createBrowser();
  await b.signIn(A);
  const t = await b.open('lab');
  await t.run(START());
  await t.run(`await openWritten();`);
  // The upload reaches the account but its answer never comes back.
  let dropped = false;
  const real = b.server.answer;
  b.server.answer = async (req) => {
    if (!dropped && req.method === 'POST' && new URL(req.url).pathname === '/api/lesson-drafts/W1') {
      dropped = true;
      const body = await req.json();
      b.d1.sqlite.prepare('INSERT INTO lesson_drafts (student_email, lesson_id, response, updated_at) VALUES (?, ?, ?, ?)').run(A.email, 'W1', body.response, 1234);
      return new Response('{"error":"gateway"}', { status: 502 });
    }
    return null;
  };
  const s = await t.run(`write('sent, answer lost'); await idle(); await T.sleep(200); await idle(); return wstatus();`);
  b.server.answer = real;
  assert.equal(s.state, 'uploaded');
  assert.equal(s.entry, false);
  assert.deepEqual(s.sync, { base: 1234, text: 'sent, answer lost' });
  assert.equal(draftRow(b.d1, A.email, 'W1').response, 'sent, answer lost');
  await t.run(STOP);
  await b.close();
});

// ---- V: the first review's reproductions (each was a defect) ---------------------------------

await test('V1. a second choice ADDS to the kept versions; one the student never removed is still there', async () => {
  const A = await account('a@school.org');
  const d1 = sharedD1();
  const c1 = createBrowser({ d1 }); const c2 = createBrowser({ d1 });
  await c1.signIn(A); await c2.signIn(A);
  const t1 = await c1.open('computer-1'); const t2 = await c2.open('computer-2');
  await t1.run(START()); await t2.run(START());
  await t1.run(`await openWritten(); write('base'); await idle();`);
  await t2.run(`await openWritten(); write('base'); T.setOnline(false); write('A'); await idle();`);
  await t1.run(`write('B'); await idle();`);
  await t2.run(`T.setOnline(true); await idle(); M.draftSync.keepMineText('written', 'W1'); await idle();`);
  // A second conflict: computer 1 takes A, writes C; computer 2 changes A offline.
  await t1.run(`await openWritten(); write('C'); await idle();`);
  await t2.run(`T.setOnline(false); write('A2'); await idle(); T.setOnline(true); await idle();`);
  const s = await t2.run(`const r = M.draftSync.keepMineText('written', 'W1'); await idle(); return { r, s: wstatus() };`);
  assert.equal(s.r.ok, true);
  assert.deepEqual(s.s.keptAll, ['B', 'C']);
  assert.equal(draftRow(d1, A.email, 'W1').response, 'A2');
  // Use the other one, and Switch to it, add too.
  await t1.run(`await openWritten(); write('D'); await idle();`);
  await t2.run(`T.setOnline(false); write('A3'); await idle(); T.setOnline(true); await idle(); M.draftSync.useOtherText('written', 'W1'); await idle();`);
  assert.deepEqual((await t2.run(`return wstatus();`)).keptAll, ['B', 'C', 'A3']);
  const sw = await t2.run(`const r = M.draftSync.swapWithKept('written', 'W1', 'D', 'B'); return { r, s: wstatus() };`);
  assert.deepEqual(sw.r, { ok: true, text: 'B' });
  assert.deepEqual([sw.s.keptAll, sw.s.stored], [['C', 'A3', 'D'], 'B']);
  // Removing one removes only that one.
  assert.deepEqual(await t2.run(`M.draftSync.dismissKept('written', 'W1', 'A3'); return wstatus().keptAll;`), ['C', 'D']);
  // A version that cannot be added leaves the old ones exactly as they were.
  const refused = await t2.run(`T.failWrites('draft-kept'); const ok = M.draftSync.keepText('written', 'W1', { text: 'Z', which: 'other', at: 1 }); T.failWrites(null); return { ok, all: wstatus().keptAll };`);
  assert.deepEqual(refused, { ok: false, all: ['C', 'D'] });
  await t1.run(STOP); await t2.run(STOP);
  await c1.close(); await c2.close();
});

await test('V2. a hand-in never overwrites another computer\'s version unseen: kept first, or the row is left alone', async () => {
  const A = await account('a@school.org');
  const d1 = sharedD1();
  const c1 = createBrowser({ d1 }); const c2 = createBrowser({ d1 });
  await c1.signIn(A); await c2.signIn(A);
  const t1 = await c1.open('computer-1'); const t2 = await c2.open('computer-2');
  await t1.run(START()); await t2.run(START({ editDelay: 60000 }));
  await t1.run(`await openWritten(); write('base'); await idle();`);
  await t2.run(`await openWritten(); write('base'); write('mine');`);
  await t1.run(`write('other'); await idle();`);
  // (a) the version is already waiting for a choice, and this browser cannot keep it.
  await t2.run(`await M.draftSync.saveTextNow('written', 'W1');`);
  const a = await t2.run(`T.failWrites('draft-kept'); const ok = await M.draftSync.handInText('written', 'W1', 'mine'); T.failWrites(null); return { ok, s: wstatus() };`);
  assert.equal(a.ok, false);
  assert.equal(draftRow(d1, A.email, 'W1').response, 'other', 'the account was overwritten though its version could not be kept');
  assert.equal(a.s.state, 'conflict');
  assert.equal(a.s.sync.other.text, 'other');
  // ...and when it can: kept, then written.
  const b = await t2.run(`const ok = await M.draftSync.handInText('written', 'W1', 'mine'); await idle(); return { ok, s: wstatus() };`);
  assert.equal(b.ok, true);
  assert.deepEqual(b.s.keptAll, ['other']);
  assert.equal(draftRow(d1, A.email, 'W1').response, 'mine');
  // (b) a version this computer has NOT seen yet (no choice waiting): found by the guarded write.
  await t1.run(`await openWritten(); write('other, later'); await idle();`);
  const c = await t2.run(`write('mine 2'); T.failWrites('draft-kept'); const ok = await M.draftSync.handInText('written', 'W1', 'mine 2'); T.failWrites(null); return { ok, s: wstatus() };`);
  assert.equal(c.ok, false);
  assert.equal(draftRow(d1, A.email, 'W1').response, 'other, later');
  assert.equal(c.s.state, 'conflict');
  const d = await t2.run(`const ok = await M.draftSync.handInText('written', 'W1', 'mine 2'); await idle(); return { ok, s: wstatus() };`);
  assert.equal(d.ok, true);
  assert.deepEqual(d.s.keptAll, ['other', 'other, later']);
  assert.equal(draftRow(d1, A.email, 'W1').response, 'mine 2');
  assert.equal(d.s.state === 'conflict', false);
  await t1.run(STOP); await t2.run(STOP);
  await c1.close(); await c2.close();
});

await test('V3. the account\'s newer text arrives but the record cannot be written: nothing is remembered, nothing overwrites it', async () => {
  const A = await account('a@school.org');
  const d1 = sharedD1();
  const c1 = createBrowser({ d1 }); const c2 = createBrowser({ d1 });
  await c1.signIn(A); await c2.signIn(A);
  const t1 = await c1.open('computer-1'); const t2 = await c2.open('computer-2');
  await t1.run(START()); await t2.run(START());
  await t1.run(`await openWritten(); write('v1'); await idle();`);
  await t2.run(`await openWritten(); write('v1'); await idle();`);
  await t1.run(`write('v2 from other computer'); await idle();`);
  const before = await t2.run(`return wstatus().sync;`);
  // The arrival, with this browser refusing to write the answer record (the component's save fails too).
  const r = await t2.run(`
    T.failWrites('written:W1');
    const a = await openWritten();
    M.records.saveWrittenRecord('W1', { response: 'v2 from other computer' });
    M.draftSync.noteTextSaved('written', 'W1');
    T.failWrites(null);
    await idle(); await M.outbox.drain({ force: true }); await idle();
    return { use: a.use, s: wstatus() };
  `);
  assert.equal(r.use, 'local');
  assert.deepEqual(r.s.sync, before);
  assert.equal(r.s.stored, 'v1');
  assert.equal(draftRow(d1, A.email, 'W1').response, 'v2 from other computer', 'the old record overwrote the newer account text');
  // Once the browser can write again, the next open takes the account's text.
  assert.equal(await t2.run(`const a = await openWritten(); return a.use + '|' + wstatus().stored;`), 'server|v2 from other computer');
  await t1.run(STOP); await t2.run(STOP);
  await c1.close(); await c2.close();
});

await test('V4. the screens read this computer\'s copy AFTER the account answers, not a snapshot from before the request', async () => {
  const fs = await import('node:fs');
  const read = (f) => fs.readFileSync(new URL(`../components/${f}`, import.meta.url), 'utf8');
  const w = read('WrittenGrader.tsx');
  assert.ok(!/setResponse\(local\.response\)/.test(w), 'WrittenGrader puts back the text it read before the request');
  assert.ok(/setResponse\(loadState\(lessonId\)\.response\)/.test(w));
  assert.ok(/const fresh = server \? parseDoc\(loadDiagramText\(lessonId\)\) : local;/.test(read('DiagramAssignmentView.tsx')));
  // The quiz screen is not part of this: it must not import the draft sync at all.
  assert.ok(!/draft-sync/.test(read('QuizView.tsx')));
  // And the modules do what that relies on: the arrival reads the record as it is at that moment.
  const A = await account('a@school.org');
  const b = createBrowser();
  await b.signIn(A);
  const t = await b.open('lab');
  await t.run(START());
  await t.run(`await openWritten(); write('old'); await idle();`);
  const hold = b.hold(/^GET \/api\/lesson-drafts\/W1$/);
  await t.run(`globalThis.arriving = openWritten();`);
  await hold.reached;
  await t.run(`write('new typing during request');`);
  hold.release();
  const r = await t.run(`const a = await arriving; await idle(); return { use: a.use, stored: M.records.loadWrittenRecord('W1').response };`);
  assert.deepEqual(r, { use: 'local', stored: 'new typing during request' });
  assert.equal(draftRow(b.d1, A.email, 'W1').response, 'new typing during request');
  await t.run(STOP);
  await b.close();
});


// ---- W: the second review's reproductions ---------------------------------------------------

await test('W1. two tabs keeping a version at the same moment: both survive (one key per version, no shared list)', async () => {
  const A = await account('a@school.org');
  const b = createBrowser();
  await b.signIn(A);
  const ta = await b.open('tab-a'); const tb = await b.open('tab-b');
  await ta.run(START()); await tb.run(START());
  // Tab A has read "nothing kept" before tab B keeps; then both write.
  await ta.run(`globalThis.seenBefore = M.draftSync.loadKeptList('written', 'W1').length;`);
  assert.equal(await tb.run(`return M.draftSync.keepText('written', 'W1', { text: 'B', which: 'other', at: 2 });`), true);
  assert.equal(await ta.run(`return M.draftSync.keepText('written', 'W1', { text: 'A', which: 'mine', at: 1 });`), true);
  assert.deepEqual((await tb.run(`return M.draftSync.loadKeptList('written', 'W1').map((k) => k.text);`)).sort(), ['A', 'B']);
  // (The harness's localStorage is one JSON file rewritten whole by each process, so truly
  // simultaneous writes from two processes collide THERE; a browser's setItem on two different
  // keys does not. The interleaving above is the one the review reproduced.)
  // Tab A removes one while tab B has just added another: the new one stays.
  await tb.run(`M.draftSync.keepText('written', 'W1', { text: 'late', which: 'other', at: 9 });`);
  await ta.run(`M.draftSync.dismissKept('written', 'W1', 'A');`);
  assert.deepEqual((await tb.run(`return M.draftSync.loadKeptList('written', 'W1').map((k) => k.text);`)).sort(), ['B', 'late']);
  // Another lesson (an id this one is a prefix of) and another kind are not listed or touched.
  assert.deepEqual(await ta.run(`M.draftSync.keepText('written', 'W10', { text: 'x', which: 'mine', at: 1 }); return [M.draftSync.loadKeptList('written', 'W10').length, M.draftSync.loadKeptList('diagram', 'W1').length, M.draftSync.loadKeptList('written', 'W1').length];`), [1, 0, 2]);
  await ta.run(STOP); await tb.run(STOP);
  await b.close();
});

await test('W2. two hand-ins in the same millisecond never share a stamp, so a guarded upload cannot replace the unseen one', async () => {
  const hdir2 = join(root, '.tmp-draft-sync-test-2');
  const h = compileHandler('api/lesson-drafts/[lessonId].ts', hdir2);
  const db = makeD1();
  const post = (body) => call(h.onRequestPost, db, '/api/lesson-drafts/W1', 'POST', body);
  const realNow = Date.now;
  Date.now = () => 1000;
  try {
    await post({ response: 'start' });
    // Both requests read the row before either writes (the facade's SELECT is async, the writes follow).
    const [a, b2] = await Promise.all([post({ response: 'first' }), post({ response: 'second unseen' })]);
    assert.equal(a[0], 200); assert.equal(b2[0], 200);
    assert.notEqual(a[1].updatedAt, b2[1].updatedAt, 'two different texts under one stamp');
    const row = db.sqlite.prepare('SELECT response, updated_at FROM lesson_drafts').get();
    const [winner, loser] = row.response === 'first' ? [a, b2] : [b2, a];
    assert.equal(row.updated_at, winner[1].updatedAt);
    // The computer whose write is NOT the stored one uploads with the stamp it was given: refused.
    const late = await post({ response: 'third', baseUpdatedAt: loser[1].updatedAt });
    assert.equal(late[0], 409);
    assert.equal(db.sqlite.prepare('SELECT response FROM lesson_drafts').get().response, row.response);
  } finally {
    Date.now = realNow;
    rmSync(hdir2, { recursive: true, force: true });
  }
});

await test('W3. an answer that was overtaken by an upload changes nothing', async () => {
  const A = await account('a@school.org');
  const b = createBrowser();
  await b.signIn(A);
  const t = await b.open('lab');
  await t.run(START());
  await t.run(`await openWritten(); write('base'); await idle();`);
  const holdAnswer = (path, row) => {
    let release; let caught = false;
    const gate = new Promise((r) => { release = r; });
    b.server.answer = async (req) => {
      if (!caught && req.method === 'GET' && new URL(req.url).pathname === path) { caught = true; const body = row(); await gate; return Response.json(body); }
      return null;
    };
    return { release: () => release(), reached: async () => { while (!caught) await new Promise((r) => setTimeout(r, 10)); } };
  };
  // Text: the GET is answered with 'base' but held back; meanwhile newer typing uploads.
  let h = holdAnswer('/api/lesson-drafts/W1', () => { const r = draftRow(b.d1, A.email, 'W1'); return { response: r.response, updatedAt: r.updated_at }; });
  await t.run(`globalThis.arriving = openWritten();`);
  await h.reached();
  assert.equal(await t.run(`write('new typing'); return await M.draftSync.saveTextNow('written', 'W1');`), 'saved');
  h.release();
  const r = await t.run(`const a = await arriving; await idle(); return { use: a.use, s: wstatus() };`);
  b.server.answer = null;
  assert.equal(r.use, 'local');
  assert.deepEqual([r.s.stored, r.s.sync.text], ['new typing', 'new typing']);
  assert.equal(draftRow(b.d1, A.email, 'W1').response, 'new typing');

  await t.run(STOP);
  await b.close();
});


await test('W5. rows purged with a class: this computer forgets them and takes what the account has now; ids never share kept versions', async () => {
  const A = await account('a@school.org');
  const b = createBrowser();
  await b.signIn(A);
  const t = await b.open('lab');
  await t.run(START());
  await t.run(`await openWritten(); write('three'); await idle();`);
  // The class is deleted (lesson_drafts purged), then new work reaches the account
  // from another computer, with stamps that are NOT newer than the ones this computer remembers.
  b.d1.sqlite.exec('DELETE FROM lesson_drafts;');
  b.d1.sqlite.prepare('INSERT INTO lesson_drafts (student_email, lesson_id, response, updated_at) VALUES (?, ?, ?, ?)').run(A.email, 'W1', 'new account text', 5);
  // The written answer was not changed here since it last agreed with the account: the account's opens.
  const w = await t.run(`const a = await openWritten(); return { use: a.use, s: wstatus() };`);
  assert.deepEqual([w.use, w.s.stored, w.s.sync], ['server', 'new account text', { base: 5, text: 'new account text' }]);
  // Kept versions: an id that is a prefix of another's (with a colon) lists and removes only its own.
  const k = await t.run(`
    M.draftSync.keepText('written', 'part:child', { text: 'child only', which: 'mine', at: 1 });
    const seenInParent = M.draftSync.loadKeptList('written', 'part');
    M.draftSync.dismissKept('written', 'part', 'child only');
    return { seenInParent, child: M.draftSync.loadKeptList('written', 'part:child').map((x) => x.text) };
  `);
  assert.deepEqual(k, { seenInParent: [], child: ['child only'] });
  await t.run(STOP);
  await b.close();
});


// ---- X: the fourth review's reproductions ---------------------------------------------------



cleanup();
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
