// An account's work kept in the browser is sealed with the account's key (lib/owned-storage.ts,
// lib/work-cipher.ts; the key is the `shcode_wk` cookie the server sets with the session).
// Every case runs the app's real modules, one process per browser tab, sharing one localStorage
// file and one cookie jar, with every request answered by the REAL functions/_middleware.ts.
//
// The same harness runs the stage 1-3 suites a second time with sealing on (SEALED=1 in npm test),
// so this file only holds what is specific to sealing.
//
// Run: node --import ./scripts/register-ts.mjs scripts/test-sealed-storage.mjs

import assert from 'node:assert/strict';
import { account, cleanup, createBrowser } from './owned-storage-harness.mjs';

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

const SECRET_TEXT = 'console.log("only Ana may read this");';
const WRITE = `
  M.vc.saveProgress('L1', { fileContents: { 'script.js': ${JSON.stringify(SECRET_TEXT)} }, commits: [], lastCommittedFileContents: {}, completedSteps: [] });
  M.records.saveWrittenRecord('W1', { response: 'Ana wrote this answer' });
  M.records.saveQuizRecord('Q1', { answers: { q1: 2 } });
  M.records.saveDiagramText('D1', '{"nodes":[{"id":"ana-node"}],"edges":[]}');
  M.history.keepInHistory('L1', { 'script.js': 'Ana history snapshot' }, 'Before something');
`;
const READ = `return {
  code: M.vc.loadProgress('L1')?.fileContents?.['script.js'] ?? null,
  written: M.records.loadWrittenRecord('W1').response,
  quiz: M.records.loadQuizRecord('Q1').answers,
  diagram: M.records.loadDiagramText('D1'),
};`;
const ANA = { code: SECRET_TEXT, written: 'Ana wrote this answer', quiz: { q1: 2 }, diagram: '{"nodes":[{"id":"ana-node"}],"edges":[]}' };
const NOTHING = { code: null, written: '', quiz: {}, diagram: null };
/** The kept-aside (or unreadable) copies of one record: [{ name, base }] where base is the key a page reads it by. */
const kept = (raw, wo, kind, t, key) => Object.keys(raw)
  .filter((k) => new RegExp(`^s1:${wo}:${kind}:${t}:[^:]+:${key}$`).test(k))
  .map((name) => ({ name, base: name.slice(`s1:${wo}:`.length) }));
const leaks = (raw) => Object.entries(raw).filter(([, v]) => /only Ana may read|Ana wrote this|ana-node|Ana history/.test(v)).map(([k]) => k);

await test('1. with the key: nothing readable is stored, everything reads back, stamps and key lists work', async () => {
  const A = await account('ana@school.org');
  const b = createBrowser({ sealing: true });
  await b.signIn(A);
  const t = await b.open('ana');
  await t.run(WRITE);
  assert.deepEqual(await t.run(READ), ANA);
  const raw = b.rawStorage();
  assert.deepEqual(leaks(raw), [], 'stored work is readable in the browser');
  const names = Object.keys(raw);
  assert.ok(names.length >= 5);
  assert.ok(names.every((k) => k.startsWith(`s1:${A.wo}:`)), `a record was stored outside the sealed space: ${names.filter((k) => !k.startsWith('s1:'))}`);
  // The same text sealed twice is different bytes; the stamp is readable and moves forward.
  const first = raw[`s1:${A.wo}:written:W1`];
  const s0 = await t.run(`return M.owned.ownedLocal.stamp('written:W1');`);
  await t.run(`M.records.saveWrittenRecord('W1', { response: 'Ana wrote this answer' });`);
  assert.notEqual(b.rawStorage()[`s1:${A.wo}:written:W1`], first);
  assert.ok(await t.run(`return M.owned.ownedLocal.stamp('written:W1');`) > s0);
  assert.deepEqual(await t.run(`return M.owned.ownedLocal.keys('written:');`), ['written:W1']);
  // A second tab (it reads the key from the same cookie) sees the same work.
  const t2 = await b.open('ana-2');
  assert.deepEqual(await t2.run(READ), ANA);
  // Removing a record removes it.
  await t2.run(`M.owned.ownedLocal.removeItem('written:W1');`);
  assert.equal(await t.run(`return M.records.loadWrittenRecord('W1').response;`), '');
  await b.close();
});

await test('2. after sign-out, and for the next student: the work is there, sealed, and nobody can open it', async () => {
  const A = await account('ana@school.org');
  const B = await account('ben@school.org');
  const b = createBrowser({ sealing: true });
  await b.signIn(A);
  const ta = await b.open('ana');
  await ta.run(WRITE);
  await ta.close();
  const before = b.rawStorage();
  // Signed out: the browser holds no key. A guest page sees nothing of Ana's and writes plain guest records.
  b.signOut();
  const g = await b.open('guest');
  assert.equal(await g.run(`return M.owned.pageWorkKey();`), null);
  assert.deepEqual(await g.run(READ), NOTHING);
  await g.run(`M.records.saveWrittenRecord('W1', { response: 'typed signed out' });`);
  assert.ok(b.rawStorage()['w1:guest:written:W1'].includes('typed signed out'), 'guest work is plain, as before');
  await g.close();
  // Ben signs in: Ben's key, Ben's records. Ana's are untouched and Ben's key does not open them.
  await b.signIn(B);
  const tb = await b.open('ben');
  assert.deepEqual(await tb.run(READ), NOTHING);
  await tb.run(`M.records.saveWrittenRecord('W1', { response: 'Ben answer' });`);
  const opened = await tb.run(`
    const raw = JSON.parse(localStorage.getItem(${JSON.stringify(`s1:${A.wo}:written:W1`)}));
    return M.cipher.openText(M.owned.pageWorkKey(), raw.e, ${JSON.stringify(`s1:${A.wo}:written:W1`)});
  `);
  assert.equal(opened, null, 'Ben\'s key opened Ana\'s record');
  // A sealed record moved under another name does not open there either (bound to its place).
  const moved = await tb.run(`
    const raw = JSON.parse(localStorage.getItem(${JSON.stringify(`s1:${B.wo}:written:W1`)}));
    return M.cipher.openText(M.owned.pageWorkKey(), raw.e, ${JSON.stringify(`s1:${B.wo}:written:W2`)});
  `);
  assert.equal(moved, null);
  await tb.close();
  const after = b.rawStorage();
  for (const k of Object.keys(before)) assert.equal(after[k], before[k], `Ana's record ${k} changed`);
  assert.deepEqual(leaks(after), []);
  // Ana signs in again: everything is back.
  await b.signIn(A);
  const ta2 = await b.open('ana-again');
  assert.deepEqual(await ta2.run(READ), ANA);
  await b.close();
});

await test('3. work saved before sealing is sealed when a page starts, keeping its stamp; uploads carry on', async () => {
  const A = await account('ana@school.org');
  const b = createBrowser({ sealing: true });
  // A browser from before sealing: session and owner, no key. Records are plain.
  await b.signIn(A, { keyCookie: false });
  const old = await b.open('before');
  await old.run(WRITE);
  const stamp = await old.run(`return M.owned.ownedLocal.stamp('written:W1');`);
  await old.close();
  assert.ok(leaks(b.rawStorage()).length >= 4, 'the plain records should be readable before sealing');
  // The key arrives (the server sets it on the next page load). The page seals what is there.
  await b.signIn(A);
  const t = await b.open('after');
  const report = await t.run(`return M.owned.ownedLocal.sealPlainRecords();`);
  assert.equal(report.failed, 0);
  assert.ok(report.sealed >= 5);
  assert.deepEqual(leaks(b.rawStorage()), [], 'plain copies were left behind');
  assert.ok(Object.keys(b.rawStorage()).every((k) => k.startsWith(`s1:${A.wo}:`)));
  assert.deepEqual(await t.run(READ), ANA);
  assert.equal(await t.run(`return M.owned.ownedLocal.stamp('written:W1');`), stamp, 'sealing changed the stamp (the outbox would resend)');
  // Running it again does nothing.
  assert.deepEqual(await t.run(`return M.owned.ownedLocal.sealPlainRecords();`), { sealed: 0, setAside: 0, unreadable: 0, failed: 0 });
  await b.close();
});

await test('4. a page left open from before the update saves a plain copy: the sealed draft stays the record, the plain copy is kept where the student can find it', async () => {
  const A = await account('ana@school.org');
  const b = createBrowser({ sealing: true });
  await b.signIn(A);
  const t = await b.open('new-page');
  const LESSON = `({ id: 'L1', title: 'Lab', requirements: [], files: [{ path: 'script.js', name: 'script.js', type: 'file', content: 'starter' }] })`;
  // As components/OwnerNotices.tsx does: a lab's set-aside code is shown in History.
  await t.run(`M.owned.onSetAside((key, d) => M.history.showSetAsideInHistory(key, d));`);
  await t.run(`
    M.vc.saveProgress('L1', { fileContents: { 'script.js': 'ONLY UNSENT WORK' }, commits: [], lastCommittedFileContents: {}, completedSteps: [] });
    M.records.saveWrittenRecord('W1', { response: 'sealed answer' });
    M.owned.ownedLocal.sealPlainRecords();
  `);
  const PLAIN = `w1:${A.wo}:progress:L1`;
  // What an older bundle does: it cannot see the sealed draft, so it shows the starter and saves it
  // plain, with a NEWER stamp.
  const oldSave = (files, key = PLAIN, d = null) => t.run(`localStorage.setItem(${JSON.stringify(key)}, JSON.stringify({ v: 1, d: ${JSON.stringify(d ?? { fileContents: files, commits: [], lastCommittedFileContents: {}, completedSteps: [] })}, t: Date.now() + 500000, up: null }));`);
  await oldSave({ 'script.js': 'starter' });
  // (a) The review's sequence: the running keyed page opens the lesson and its autosave runs.
  const r = await t.run(`
    M.store.useLessonStore.getState().setLesson(${LESSON});
    const shown = M.store.useLessonStore.getState().fileContents['script.js'];
    const save = M.store.saveOpenDraft('L1');
    return { shown, save, now: M.vc.loadProgress('L1').fileContents['script.js'] };
  `);
  assert.equal(r.shown, 'ONLY UNSENT WORK', 'the starter an older page saved became the lesson');
  assert.equal(r.now, 'ONLY UNSENT WORK');
  let raw = b.rawStorage();
  assert.equal(raw[PLAIN], undefined, 'the plain copy was left behind');
  // The older page's copy is kept twice: sealed under aside:, and in the lesson's History.
  assert.equal(Object.keys(raw).filter((k) => /:aside:\d+:[^:]+:progress:L1$/.test(k)).length, 1);
  const hist = await t.run(`return (M.owned.ownedLocal.getJSON('local-history')?.L1 ?? []).map((x) => [x.message, x.files['script.js']]);`);
  assert.deepEqual(hist, [['From an older tab', 'starter']]);
  assert.deepEqual(leaks(raw), []);
  // (b) The older page had REAL newer typing (it was on that lesson all along): the sealed draft
  //     still stays the record, and that typing is in History, one click from being restored.
  await oldSave({ 'script.js': 'typed in the old tab after the update' });
  const sweep = await t.run(`return M.owned.ownedLocal.sealPlainRecords();`);
  assert.deepEqual([sweep.sealed, sweep.setAside, sweep.failed], [0, 1, 0]);
  assert.equal(await t.run(`return M.vc.loadProgress('L1').fileContents['script.js'];`), 'ONLY UNSENT WORK');
  const hist2 = await t.run(`return (M.owned.ownedLocal.getJSON('local-history')?.L1 ?? []).map((x) => x.files['script.js']);`);
  assert.ok(hist2.includes('typed in the old tab after the update') && hist2.includes('starter'));
  assert.equal(b.rawStorage()[PLAIN], undefined);
  // (c) A second set-aside with the very same stamp is kept beside the first, not over it.
  const WP = `w1:${A.wo}:written:W1`;
  await t.run(`localStorage.setItem(${JSON.stringify(WP)}, JSON.stringify({ v: 1, d: { response: 'old tab one' }, t: 5, up: null })); M.owned.ownedLocal.sealPlainRecords();`);
  await t.run(`localStorage.setItem(${JSON.stringify(WP)}, JSON.stringify({ v: 1, d: { response: 'old tab two' }, t: 5, up: null })); M.owned.ownedLocal.sealPlainRecords();`);
  raw = b.rawStorage();
  const asides = kept(raw, A.wo, 'aside', 5, 'written:W1');
  const texts = [];
  for (const a of asides) texts.push((await t.run(`return M.owned.ownedLocal.getJSON(${JSON.stringify(a.base)});`)).response);
  assert.deepEqual(texts.sort(), ['old tab one', 'old tab two']);
  assert.equal(await t.run(`return M.records.loadWrittenRecord('W1').response;`), 'sealed answer');
  assert.deepEqual(await t.run(`return M.owned.ownedLocal.keys('').filter((k) => k.includes('aside'));`), [], 'kept-aside copies are listed as records');
  // (d) The same content in both: the plain copy simply goes, nothing is set aside.
  await t.run(`localStorage.setItem(${JSON.stringify(WP)}, JSON.stringify({ v: 1, d: { response: 'sealed answer' }, t: 9, up: null }));`);
  assert.deepEqual(await t.run(`const r = M.owned.ownedLocal.sealPlainRecords(); return [r.setAside, r.failed];`), [0, 0]);
  assert.equal(b.rawStorage()[WP], undefined);
  // (e) The older copy cannot be kept (this browser refuses the write): nothing is saved over
  //     anything, and both copies are exactly where they were.
  await oldSave({ 'script.js': 'old tab, cannot be kept' });
  const before = b.rawStorage();
  const refused = await t.run(`T.failWrites(':aside:'); const res = M.vc.saveProgress('L1', { fileContents: { 'script.js': 'new typing' }, commits: [], lastCommittedFileContents: {}, completedSteps: [] }); const sw = M.owned.ownedLocal.sealPlainRecords(); T.failWrites(null); return { res, failed: sw.failed };`);
  assert.equal(refused.res === 'ok', false);
  assert.ok(refused.failed >= 1);
  const afterRefusal = b.rawStorage();
  assert.equal(afterRefusal[PLAIN], before[PLAIN]);
  assert.equal(afterRefusal[`s1:${A.wo}:progress:L1`], before[`s1:${A.wo}:progress:L1`]);
  // (f) Nothing here uploads a starter: the stored draft a send would read is still the real one.
  assert.equal(await t.run(`return M.vc.loadProgress('L1').fileContents['script.js'];`), 'ONLY UNSENT WORK');
  await b.close();
});

await test('5. sealed work and no key: locked. Reads answer nothing, writes and removes are refused, nothing changes', async () => {
  const A = await account('ana@school.org');
  const b = createBrowser({ sealing: true });
  await b.signIn(A);
  const t = await b.open('with-key');
  await t.run(WRITE);
  await t.close();
  const before = b.rawStorage();
  // The same account's page without the key cookie (it was cleared by hand, or the page came from a cache).
  await b.signIn(A, { keyCookie: false });
  const locked = await b.open('no-key');
  assert.equal(await locked.run(`return M.owned.ownedLocal.locked();`), true);
  assert.deepEqual(await locked.run(READ), NOTHING);
  const r = await locked.run(`
    const problems = [];
    M.owned.onStorageProblem((p) => problems.push(p.kind));
    const w = M.records.saveWrittenRecord('W1', { response: 'a starter, typed over locked work' });
    const w2 = M.vc.saveProgress('L1', { fileContents: { 'script.js': 'starter' }, commits: [], lastCommittedFileContents: {}, completedSteps: [] });
    M.owned.ownedLocal.removeItem('written:W1');
    return { w, w2, problems, seal: M.owned.ownedLocal.sealPlainRecords(), stamp: M.owned.ownedLocal.stamp('written:W1') };
  `);
  assert.equal(r.w, 'blocked');
  assert.equal(r.w2 === 'ok', false);
  assert.deepEqual(r.problems, ['locked'], 'locked is reported once, and not as a broken browser');
  assert.deepEqual(r.seal, { sealed: 0, setAside: 0, unreadable: 0, failed: 0 });
  assert.equal(typeof r.stamp, 'number');
  assert.deepEqual(b.rawStorage(), before, 'a locked record was changed');
  // A lesson with NO sealed record still works on that page (plain, as before sealing).
  assert.equal(await locked.run(`return M.records.saveWrittenRecord('W9', { response: 'new lesson' });`), 'ok');
  assert.equal(await locked.run(`return M.records.loadWrittenRecord('W9').response;`), 'new lesson');
  // The key comes back: everything opens, and the plain one is sealed at the next start.
  await b.signIn(A);
  const back = await b.open('key-back');
  assert.equal(await back.run(`return M.owned.ownedLocal.locked();`), false);
  assert.deepEqual(await back.run(READ), ANA);
  await back.run(`M.owned.ownedLocal.sealPlainRecords();`);
  assert.equal(await back.run(`return M.records.loadWrittenRecord('W9').response;`), 'new lesson');
  assert.ok(Object.keys(b.rawStorage()).every((k) => k.startsWith('s1:')));
  // The notice says locked, not lost, and the page reloads itself once when the key arrives.
  const fs = await import('node:fs');
  const src = fs.readFileSync(new URL('../components/OwnerNotices.tsx', import.meta.url), 'utf8');
  assert.ok(/data-owner-notice="locked"/.test(src) && /It is still there/.test(src) && /cannot be saved on this computer/.test(src));
  // The page never reloads itself out of the locked state: that dropped what was being typed.
  assert.ok(!/setInterval/.test(src) && !/keyReload/.test(src), 'the locked notice must not reload the page by itself');
  await b.close();
});

await test('6. a key that no longer opens the records (the secret was changed): they are moved aside whole, and new work saves', async () => {
  const A = await account('ana@school.org');
  const b = createBrowser({ sealing: true });
  await b.signIn(A);
  const t = await b.open('old-key');
  await t.run(WRITE);
  const stamp = await t.run(`return M.owned.ownedLocal.stamp('written:W1');`);
  await t.close();
  const before = b.rawStorage();
  // The same owner id with a different key (what a changed secret would give if the id stayed).
  const other = await account('someone-else@school.org');
  b.jar.key = `${A.wo}.${other.wk}`;
  const t2 = await b.open('new-key');
  // Before the page-start sweep: unreadable means locked, so nothing is written over it.
  assert.deepEqual(await t2.run(READ), NOTHING);
  assert.equal(await t2.run(`return M.records.saveWrittenRecord('W1', { response: 'new work' });`), 'blocked');
  const rep = await t2.run(`return M.owned.ownedLocal.sealPlainRecords();`);
  assert.equal(rep.failed, 0);
  assert.equal(rep.unreadable, Object.keys(before).length);
  const raw = b.rawStorage();
  const moved = kept(raw, A.wo, 'unreadable', stamp, 'written:W1');
  assert.equal(moved.length, 1);
  assert.equal(raw[moved[0].name], before[`s1:${A.wo}:written:W1`], 'the unreadable record was not kept byte for byte');
  assert.equal(Object.keys(raw).length, Object.keys(before).length, 'something was dropped');
  // New work saves in its place, and a second sweep leaves the moved records alone.
  assert.equal(await t2.run(`return M.records.saveWrittenRecord('W1', { response: 'new work' });`), 'ok');
  assert.equal(await t2.run(`return M.records.loadWrittenRecord('W1').response;`), 'new work');
  assert.deepEqual(await t2.run(`return M.owned.ownedLocal.sealPlainRecords();`), { sealed: 0, setAside: 0, unreadable: 0, failed: 0 });
  await b.close();
});

await test('7. the owner and the key are taken from one reading of the cookies; a stale tab keeps its own key', async () => {
  const A = await account('ana@school.org');
  const B = await account('ben@school.org');
  const b = createBrowser({ sealing: true });
  await b.signIn(A);
  const ta = await b.open('ana');
  // Ana's tab has not touched storage yet. Ben signs in in another tab; the cookies change under it.
  await b.signIn(B);
  await ta.run(`M.records.saveWrittenRecord('W1', { response: 'whose is this' });`);
  const who = await ta.run(`return { owner: M.owned.pageOwner(), key: Array.from(M.owned.pageWorkKey()).join(',') };`);
  const tb = await b.open('ben');
  const ben = await tb.run(`return { owner: M.owned.pageOwner(), key: Array.from(M.owned.pageWorkKey()).join(',') };`);
  // Whichever account the tab became, its key is THAT account's: the record opens for a page of that account.
  const mine = who.owner === A.wo ? A : B;
  assert.equal(who.owner === ben.owner, who.key === ben.key, 'a page holds one account\'s name and another account\'s key');
  await b.signIn(mine);
  const check = await b.open('check');
  assert.equal(await check.run(`return M.records.loadWrittenRecord('W1').response;`), 'whose is this');
  // A tab that DID load as Ana keeps Ana's key after Ben signs in (the page never re-reads it).
  await b.signIn(A);
  const ta2 = await b.open('ana-loaded');
  await ta2.run(`M.owned.pageOwner();`);
  await b.signIn(B);
  await ta2.run(`M.records.saveWrittenRecord('W2', { response: 'Ana, after Ben signed in' });`);
  await b.signIn(A);
  const ta3 = await b.open('ana-later');
  assert.equal(await ta3.run(`return M.records.loadWrittenRecord('W2').response;`), 'Ana, after Ben signed in');
  await b.close();
});

await test('8. a malformed or missing key cookie means no key, never a wrong one; a full store keeps the old record', async () => {
  const A = await account('ana@school.org');
  const b = createBrowser({ sealing: true });
  await b.signIn(A);
  // Malformed, bare (no account in front), or made for ANOTHER account: no key.
  const B = await account('ben@school.org');
  for (const bad of ['short', `${A.wo}.${'x'.repeat(42)}!`, '', A.wk, `${B.wo}.${A.wk}`, `${B.wo}.${B.wk}`, `${A.wo}.${'A'.repeat(44)}`]) {
    b.jar.key = bad || null;
    const t = await b.open(`bad-${bad.length}`);
    assert.equal(await t.run(`return M.owned.pageWorkKey();`), null, `"${bad}" was taken as a key`);
    await t.close();
  }
  const q = createBrowser({ sealing: true, quota: 6000 });
  await q.signIn(A);
  const t = await q.open('small');
  assert.equal(await t.run(`return M.records.saveWrittenRecord('W1', { response: 'fits' });`), 'ok');
  const r = await t.run(`return { res: M.records.saveWrittenRecord('W1', { response: 'x'.repeat(8000) }), now: M.records.loadWrittenRecord('W1').response };`);
  assert.deepEqual(r, { res: 'full', now: 'fits' });
  await b.close(); await q.close();
});

// ---- the first review's reproductions (each was a defect) -----------------------------------

await test('9. a key that arrived for another account is never this page\'s key; an API answer never sets one', async () => {
  const A = await account('ana@school.org');
  const B = await account('ben@school.org');
  const b = createBrowser({ sealing: true });
  // The mixed state a late answer used to produce: Ben's owner cookie with Ana's key.
  await b.signIn(B);
  b.jar.key = `${A.wo}.${A.wk}`;
  const t = await b.open('ben-with-anas-key');
  assert.equal(await t.run(`return M.owned.pageOwner();`), B.wo);
  assert.equal(await t.run(`return M.owned.pageWorkKey();`), null, 'the page took another account\'s key');
  // It works in plain records (nothing of Ben's exists sealed), so nothing is sealed with the wrong key.
  await t.run(`M.records.saveWrittenRecord('W1', { response: 'Ben typed' });`);
  assert.ok(b.rawStorage()[`w1:${B.wo}:written:W1`].includes('Ben typed'));
  // With Ben's real key, the next page seals it and reads it.
  await b.signIn(B);
  const t2 = await b.open('ben');
  await t2.run(`M.owned.ownedLocal.sealPlainRecords();`);
  assert.equal(await t2.run(`return M.records.loadWrittenRecord('W1').response;`), 'Ben typed');
  // The real middleware: an /api answer to a session with no key cookie sets no key.
  b.jar.key = null;
  const t3 = await b.open('no-key');
  await t3.run(`await fetch('/api/me');`);
  assert.equal(b.jar.key, null, 'an API answer put a key in the browser');
  await b.close();
});

await test('10. a save another tab makes while old work is being sealed is not replaced; a save never removes plain work it did not read', async () => {
  const A = await account('ana@school.org');
  const b = createBrowser({ sealing: true });
  await b.signIn(A, { keyCookie: false });
  const old = await b.open('before');
  await old.run(`M.records.saveWrittenRecord('W1', { response: 'old plain draft' });`);
  await old.close();
  await b.signIn(A);
  const t = await b.open('sweeper');
  const SEALED = `s1:${A.wo}:written:W1`;
  const PLAIN = `w1:${A.wo}:written:W1`;
  // "Another tab" saves newer work into the sealed place the moment the sweep first looks at the
  // sealed place for this record: BEFORE the sweep's final check. The sweep must then leave it.
  const r = await t.run(`
    const other = M.owned.createOwnedStorage({ owner: M.owned.pageOwner(), storage: () => localStorage, key: M.owned.pageWorkKey });
    const real = localStorage.getItem;
    let fired = 0;
    localStorage.getItem = function (k) {
      if (k === ${JSON.stringify(SEALED)} && fired === 0) { fired = 1; localStorage.getItem = real; const v = real.call(localStorage, k); other.setJSON('written:W1', { response: 'NEW saved in second tab' }); localStorage.getItem = function (k2) { return real.call(localStorage, k2); }; return v; }
      return real.call(localStorage, k);
    };
    const rep = M.owned.ownedLocal.sealPlainRecords();
    localStorage.getItem = real;
    return { rep, fired, now: M.records.loadWrittenRecord('W1').response };
  `);
  assert.equal(r.fired, 1, 'the other tab\'s save was never injected: this test proved nothing');
  assert.equal(r.rep.sealed, 0, 'the sweep sealed its old copy over the other tab\'s save');
  assert.equal(r.now, 'NEW saved in second tab');
  // The same, later: the other tab's save lands after the sweep's first look (the place was empty)
  // and is there when the sweep makes its FINAL check, just before it would write.
  await t.run(`localStorage.setItem(${JSON.stringify(`w1:${A.wo}:written:W2`)}, JSON.stringify({ v: 1, d: { response: 'old plain W2' }, t: 7, up: null }));`);
  const r2 = await t.run(`
    const other = M.owned.createOwnedStorage({ owner: M.owned.pageOwner(), storage: () => localStorage, key: M.owned.pageWorkKey });
    const real = localStorage.getItem;
    let looks = 0; let fired = 0;
    localStorage.getItem = function (k) {
      if (k === ${JSON.stringify(`s1:${A.wo}:written:W2`)} && ++looks === 2 && fired === 0) {
        fired = 1; localStorage.getItem = real;
        other.setJSON('written:W2', { response: 'NEW W2 saved in second tab' });
        localStorage.getItem = function (k2) { return real.call(localStorage, k2); };
      }
      return real.call(localStorage, k);
    };
    const rep = M.owned.ownedLocal.sealPlainRecords();
    localStorage.getItem = real;
    return { rep, fired, now: M.records.loadWrittenRecord('W2').response };
  `);
  // (Without the final check the sweep writes first and this save lands on its read-back: failed = 1.)
  assert.deepEqual([r2.rep.sealed, r2.rep.failed], [0, 0], 'the sweep wrote before the other tab\'s save was seen');
  assert.equal(r2.fired, 1, 'the final check was never reached with the other tab\'s save in place: this test proved nothing');
  assert.equal(r2.now, 'NEW W2 saved in second tab', 'the sweep wrote its old copy over the other tab\'s save');
  // A save: the page READS a plain copy beside its sealed record; an older page then writes a
  // DIFFERENT plain copy between this page's sealed write and its cleanup. That one must stay.
  await t.run(`localStorage.setItem(${JSON.stringify(PLAIN)}, JSON.stringify({ v: 1, d: { response: 'old tab, first' }, t: Date.now() + 1000, up: null }));`);
  const w = await t.run(`
    const real = localStorage.setItem;
    let fired = 0;
    localStorage.setItem = function (k, v) {
      real.call(localStorage, k, v);
      if (k === ${JSON.stringify(SEALED)} && fired === 0) { fired = 1; real.call(localStorage, ${JSON.stringify(PLAIN)}, JSON.stringify({ v: 1, d: { response: 'old tab, typed later' }, t: Date.now() + 999999, up: null })); }
    };
    const res = M.records.saveWrittenRecord('W1', { response: 'this page saves' });
    localStorage.setItem = real;
    return { res, fired, plain: localStorage.getItem(${JSON.stringify(PLAIN)}), now: M.records.loadWrittenRecord('W1').response };
  `);
  assert.equal(w.fired, 1, 'the older page\'s save was never injected: this test proved nothing');
  assert.equal(w.res, 'ok');
  assert.ok(w.plain && w.plain.includes('old tab, typed later'), 'plain work this save never read was removed');
  assert.equal(w.now, 'this page saves');
  // The plain copy it DID read was kept aside before it went; the later one is kept at the next start.
  const texts = async () => {
    const out = [];
    for (const k of Object.keys(b.rawStorage()).filter((n) => /:aside:\d+:[^:]+:written:W1$/.test(n))) {
      out.push((await t.run(`return M.owned.ownedLocal.getJSON(${JSON.stringify(k.slice(`s1:${A.wo}:`.length))});`)).response);
    }
    return out.sort();
  };
  assert.ok((await texts()).includes('old tab, first'));
  await t.run(`M.owned.ownedLocal.sealPlainRecords();`);
  assert.ok((await texts()).includes('old tab, typed later'));
  assert.equal(b.rawStorage()[PLAIN], undefined);
  await b.close();
});

await test('11. what a read hands out is the caller\'s own copy: changing it changes nothing stored', async () => {
  const A = await account('ana@school.org');
  const b = createBrowser({ sealing: true });
  await b.signIn(A);
  const t = await b.open('ana');
  const r = await t.run(`
    M.owned.ownedLocal.setJSON('library-base', { items: ['secret', 'other'] });
    const first = M.owned.ownedLocal.getJSON('library-base');
    first.items.length = 0;                    // a caller changes what it was handed...
    T.failWrites('library-base');
    const failed = M.owned.ownedLocal.setJSON('library-base', first);   // ...and its save fails
    T.failWrites(null);
    const again = M.owned.ownedLocal.getJSON('library-base');
    return { failed, again: again.items, sameObject: first === again };
  `);
  assert.deepEqual(r, { failed: 'blocked', again: ['secret', 'other'], sameObject: false });
  await b.close();
});

await test('12. a tab left open after sign-out keeps working with its own account\'s work until it is closed: nothing is lost there', async () => {
  // (Stated as a limit in CLAUDE.md. A version where such a tab read nothing but could still save
  // was reviewed and removed: a blank screen was then saved over real drafts and over History.)
  const A = await account('ana@school.org');
  const B = await account('ben@school.org');
  const b = createBrowser({ sealing: true });
  await b.signIn(A);
  const t = await b.open('ana-left-open');
  await t.run(WRITE);
  await t.run(`
    M.vc.saveProgress('L2', { fileContents: { 'script.js': 'second lesson draft' }, commits: [], lastCommittedFileContents: {}, completedSteps: [] });
    M.history.keepInHistory('L2', { 'script.js': 'second lesson history' }, 'Earlier');
  `);
  for (const then of ['signed out', 'ben signed in']) {
    if (then === 'signed out') b.signOut(); else await b.signIn(B);
    // The review's sequence: open another lesson, come back, let the autosave run, add to History.
    const r = await t.run(`
      const l2 = M.vc.loadProgress('L2').fileContents['script.js'];
      const l1 = M.vc.loadProgress('L1').fileContents['script.js'];
      M.vc.saveProgress('L1', { ...M.vc.loadProgress('L1') });
      M.history.keepInHistory('L1', { 'script.js': 'typed after: ${then}' }, 'Later');
      M.records.saveWrittenRecord('W1', { response: 'typed in the open tab, ${then}' });
      return { l1, l2 };
    `);
    assert.deepEqual(r, { l1: SECRET_TEXT, l2: 'second lesson draft' }, `the open tab lost sight of its work after: ${then}`);
    assert.ok(!Object.values(b.rawStorage()).some((v) => v.includes('typed in the open tab') || v.includes('typed after')), 'what the open tab saved is readable');
    await b.signIn(A);
    const back = await b.open(`ana-back-${then.length}`);
    const after = await back.run(`return {
      l1: M.vc.loadProgress('L1').fileContents['script.js'],
      l2: M.vc.loadProgress('L2').fileContents['script.js'],
      written: M.records.loadWrittenRecord('W1').response,
      history: JSON.stringify(M.owned.ownedLocal.getJSON('local-history')),
    };`);
    assert.deepEqual([after.l1, after.l2, after.written], [SECRET_TEXT, 'second lesson draft', `typed in the open tab, ${then}`]);
    for (const snap of ['Ana history snapshot', 'second lesson history', `typed after: ${then}`]) {
      assert.ok(after.history.includes(snap), `History lost "${snap}" (${then})`);
    }
    await back.close();
  }
  // A page that LOADS after the sign-out is the one that has no key (cases 2 and 5).
  b.signOut();
  const fresh = await b.open('after-sign-out');
  assert.equal(await fresh.run(`return M.owned.pageWorkKey();`), null);
  await b.close();
});

await test('13. the tab\'s own storage is sealed too; the sketch store is the one stated exception', async () => {
  const A = await account('ana@school.org');
  const b = createBrowser({ sealing: true });
  await b.signIn(A);
  const t = await b.open('ana');
  const r = await t.run(`
    M.owned.ownedSession.setJSON('shcode.texture.frameClipboard', { w: 1, h: 1, cells: ['#secret-cell'] });
    const back = M.owned.ownedSession.getJSON('shcode.texture.frameClipboard');
    const raw = [];
    for (let i = 0; i < sessionStorage.length; i++) raw.push(sessionStorage.key(i) + '=' + sessionStorage.getItem(sessionStorage.key(i)));
    M.owned.ownedLocal.setJSON('moshion-store', { 'texture:hero': 'data:plain-picture' });
    return { back, leaked: raw.some((x) => x.includes('#secret-cell')), names: raw.map((x) => x.split('=')[0]) };
  `);
  assert.deepEqual(r.back, { w: 1, h: 1, cells: ['#secret-cell'] });
  assert.equal(r.leaked, false, 'the copied frame is readable in the tab\'s storage');
  assert.ok(r.names.every((n) => n.startsWith(`s1:${A.wo}:`)));
  // A frame copied BEFORE sealing (plain, in the tab's storage) is sealed at page start too.
  const t9 = await b.open('ana-old-clipboard');
  const swept = await t9.run(`
    sessionStorage.setItem(${JSON.stringify(`w1:${A.wo}:shcode.texture.frameClipboard`)}, JSON.stringify({ v: 1, d: { w: 1, h: 1, cells: ['#old-plain-cell'] }, t: 5, up: null }));
    const rep = M.owned.ownedSession.sealPlainRecords();
    const raw = [];
    for (let i = 0; i < sessionStorage.length; i++) raw.push(sessionStorage.getItem(sessionStorage.key(i)));
    return { rep, leaked: raw.some((x) => x.includes('#old-plain-cell')), back: M.owned.ownedSession.getJSON('shcode.texture.frameClipboard') };
  `);
  assert.deepEqual([swept.rep.sealed, swept.rep.failed, swept.leaked, swept.back], [1, 0, false, { w: 1, h: 1, cells: ['#old-plain-cell'] }]);
  const src = (await import('node:fs')).readFileSync(new URL('../components/OwnerNotices.tsx', import.meta.url), 'utf8');
  assert.ok(/ownedLocal\.sealPlainRecords\(\)/.test(src) && /ownedSession\.sealPlainRecords\(\)/.test(src));
  // Rewritten up to sixty times a second by a running sketch: stored plain, on purpose, and said so.
  assert.ok(b.rawStorage()[`w1:${A.wo}:moshion-store`].includes('data:plain-picture'));
  assert.equal(await t.run(`return M.owned.ownedLocal.sealPlainRecords().sealed;`), 0);
  await b.close();
});

await test('14. the server says nobody is signed in: the key cookie leaves the browser, this page keeps saving, the next page has no key', async () => {
  const A = await account('ana@school.org');
  const B = await account('ben@school.org');
  const b = createBrowser({ sealing: true });
  await b.signIn(A);
  const t = await b.open('ana');
  await t.run(WRITE);
  // The harness tab's document.cookie setter does nothing; give it one that removes a cookie on Max-Age=0.
  const FAKE_COOKIE = `
    let jar = document.cookie;
    Object.defineProperty(document, 'cookie', { configurable: true, get: () => jar, set: (v) => {
      const m = /^([^=]+)=[^;]*;.*Max-Age=0/.exec(v);
      if (m) jar = jar.split(/;\\s*/).filter((p) => !p.startsWith(m[1] + '=')).join('; ');
    } });
  `;
  const r = await t.run(FAKE_COOKIE + `
    M.owned.dropWorkKeyCookie();
    const gone = !/shcode_wk=/.test(document.cookie);
    const ownerStays = /shcode_owner=/.test(document.cookie);
    const saved = M.records.saveWrittenRecord('W1', { response: 'still typing' });
    return { gone, ownerStays, saved, read: M.records.loadWrittenRecord('W1').response };
  `);
  assert.deepEqual(r, { gone: true, ownerStays: true, saved: 'ok', read: 'still typing' });
  // Another account's key is not this page's to remove.
  const t2 = await b.open('ana-2');
  await t2.run(`M.owned.pageOwner();`);
  await b.signIn(B);
  assert.equal(await t2.run(FAKE_COOKIE + `M.owned.dropWorkKeyCookie(); return /shcode_wk=/.test(document.cookie);`), true);
  // OwnerNotices does it only on a real "not signed in" answer, never on a failed request.
  const fs = await import('node:fs');
  const notices = fs.readFileSync(new URL('../components/OwnerNotices.tsx', import.meta.url), 'utf8');
  assert.ok(/lastMeAnswer\(\) === 'signed-out' && pageOwner\(\) !== GUEST\) dropWorkKeyCookie\(\)/.test(notices));
  const auth = fs.readFileSync(new URL('../lib/auth.ts', import.meta.url), 'utf8');
  assert.ok(/res\.status === 401 \? 'signed-out' : 'unknown'/.test(auth));
  await b.close();
});

await test('15. step one of the rollout (what ships now): a page with the key saves plain as before, and keeps sealed what is sealed', async () => {
  const A = await account('ana@school.org');
  const b = createBrowser({ sealing: true, sealWrites: false });
  await b.signIn(A);
  const t = await b.open('step-one');
  assert.ok(await t.run(`return M.owned.pageWorkKey() !== null;`));
  await t.run(WRITE);
  assert.deepEqual(await t.run(READ), ANA);
  let raw = b.rawStorage();
  assert.ok(Object.keys(raw).every((k) => k.startsWith(`w1:${A.wo}:`)), 'step one sealed something');
  assert.deepEqual(await t.run(`return M.owned.ownedLocal.sealPlainRecords();`), { sealed: 0, setAside: 0, unreadable: 0, failed: 0 });
  assert.deepEqual(b.rawStorage(), raw, 'the sweep changed something in step one');
  // Step two goes live elsewhere: a newer page seals this record. The step-one tab, still open,
  // reads the sealed record and KEEPS it sealed when it saves (no plain copy beside it).
  const two = createBrowser({ sealing: true });
  two.setStorage(raw); two.jar.session = b.jar.session; two.jar.owner = b.jar.owner; two.jar.key = b.jar.key;
  const t2 = await two.open('step-two');
  await t2.run(`M.owned.ownedLocal.sealPlainRecords(); M.records.saveWrittenRecord('W1', { response: 'saved by the step-two page' });`);
  b.setStorage(two.rawStorage());
  assert.equal(await t.run(`return M.records.loadWrittenRecord('W1').response;`), 'saved by the step-two page');
  assert.equal(await t.run(`return M.records.saveWrittenRecord('W1', { response: 'saved by the step-one tab' });`), 'ok');
  raw = b.rawStorage();
  assert.equal(raw[`w1:${A.wo}:written:W1`], undefined, 'a step-one tab wrote a plain copy beside a sealed record');
  assert.ok(!Object.values(raw).some((v) => v.includes('saved by the step-one tab')));
  assert.equal(await t.run(`return M.records.loadWrittenRecord('W1').response;`), 'saved by the step-one tab');
  // A record that is NOT sealed yet is still saved plain by the step-one tab.
  await t.run(`M.records.saveWrittenRecord('W5', { response: 'new in step one' });`);
  assert.ok(b.rawStorage()[`w1:${A.wo}:written:W5`].includes('new in step one'));
  // The shipped default is step one.
  const src = (await import('node:fs')).readFileSync(new URL('../lib/owned-storage.ts', import.meta.url), 'utf8');
  // STEP TWO: change this assertion together with the flag and the CLAUDE.md rollout note.
  assert.ok(/let SEAL_NEW_RECORDS = false;/.test(src), 'sealing new records must stay off until the second deploy');
  // While it is off, loading the layout's chunk touches no storage (a guest's old unprefixed keys stay put).
  const g = createBrowser({ sealing: true, sealWrites: false });
  g.setStorage({ 'shCode:quiz:OLD': '{"answers":{"q1":2}}' });
  const tg = await g.open('guest');
  await tg.run(`M.owned.ownedLocal.sealPlainRecords(); M.owned.ownedSession.sealPlainRecords();`);
  assert.deepEqual(g.rawStorage(), { 'shCode:quiz:OLD': '{"answers":{"q1":2}}' });
  await g.close();
  await b.close(); await two.close();
});

await test('16. Reset (removing a record) keeps a differing plain copy an older page left beside it', async () => {
  const A = await account('ana@school.org');
  const b = createBrowser({ sealing: true });
  await b.signIn(A);
  const t = await b.open('ana');
  const r = await t.run(`
    M.owned.onSetAside((key, d) => M.history.showSetAsideInHistory(key, d));
    M.vc.saveProgress('L1', { fileContents: { 'script.js': 'SEALED DRAFT' }, commits: [], lastCommittedFileContents: {}, completedSteps: [] });
    localStorage.setItem(${JSON.stringify(`w1:${A.wo}:progress:L1`)}, JSON.stringify({ v: 1, d: { fileContents: { 'script.js': 'UNSENT OLD TAB TYPING' } }, t: Date.now() + 99999, up: null }));
    M.owned.ownedLocal.removeItem('progress:L1');
    const hist = (M.owned.ownedLocal.getJSON('local-history')?.L1 ?? []).map((x) => x.files['script.js']);
    return { draft: M.vc.loadProgress('L1'), hist };
  `);
  assert.equal(r.draft, null);
  assert.deepEqual(r.hist, ['UNSENT OLD TAB TYPING']);
  // Twenty-five old-tab autosaves take THREE History slots, not all twenty (the student's own snapshots stay).
  const h = await t.run(`
    M.history.keepInHistory('L2', { 'script.js': 'ONLY DELIBERATE SNAPSHOT' }, 'Mine');
    M.vc.saveProgress('L2', { fileContents: { 'script.js': 'sealed L2' }, commits: [], lastCommittedFileContents: {}, completedSteps: [] });
    for (let i = 0; i < 25; i++) {
      localStorage.setItem(${JSON.stringify(`w1:${A.wo}:progress:L2`)}, JSON.stringify({ v: 1, d: { fileContents: { 'script.js': 'old tab ' + i } }, t: Date.now() + 99999 + i, up: null }));
      M.vc.saveProgress('L2', { fileContents: { 'script.js': 'sealed L2 ' + i }, commits: [], lastCommittedFileContents: {}, completedSteps: [] });
    }
    return (M.owned.ownedLocal.getJSON('local-history')?.L2 ?? []).map((x) => x.files['script.js']);
  `);
  assert.deepEqual(h, ['old tab 2', 'old tab 1', 'old tab 0', 'ONLY DELIBERATE SNAPSHOT']);
  assert.equal(Object.keys(b.rawStorage()).filter((k) => /:aside:\d+:[^:]+:progress:L2$/.test(k)).length, 25, 'every set-aside copy is still stored');
  await b.close();
});

cleanup();
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
