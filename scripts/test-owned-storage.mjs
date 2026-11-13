// Per-account browser storage, stage 1 (lib/owned-storage.ts; design
// .ui-hill-climb/ux1/option2-design.md). Each guarantee below is checked by DOING the
// thing with the app's real modules in real separate processes (one per browser tab,
// scripts/owned-storage-harness.mjs), sharing one localStorage file and one cookie jar,
// with every fetch answered by the real functions/_middleware.ts.
//
//   1. Two tabs with different owners never write into each other's space, including a
//      debounced lab save still pending when the first tab's lesson unmounts.
//   2. A then B on one browser (signing out first or not; online and offline): B sees
//      none of A's lab, quiz picks, written text, Try-it code, starter pick, history,
//      pictures or sandbox game, and what B hands in is B's; A comes back to everything
//      exactly as left, unsaved work included.
//   3. The 409: A's stale tab, after B signed in, is refused by the server, says so once,
//      sends nothing more, and keeps A's work. A request with no header (an old cached
//      bundle) still works as before.
//   4. Work from before this change is set aside, never shown to anyone, and a lab comes
//      back only when the account's own server copy matches exactly.
//   5. A full store answers 'full', tells the page, and never destroys what was there.
//   6. Work typed while signed out is OFFERED after signing in, never merged on its own.
//   7. Loading the modules opens no timer, listener or channel.
//
// Run: node --import ./scripts/register-ts.mjs scripts/test-owned-storage.mjs

import assert from 'node:assert/strict';
import { account, cleanup, createBrowser } from './owned-storage-harness.mjs';
import {
  createOwnedStorage, parseOwnerCookie, quarantineLegacy, readLegacy, GUEST,
} from '../lib/owned-storage.ts';
import { createDebouncedSave } from '../lib/draft-autosave.ts';
import { ownerFetch, wantsOwnerHeader, onOwnerMismatch, __resetOwnerFetchForTests } from '../lib/owner-fetch.ts';

let failed = 0;
let passed = 0;
async function test(name, fn) {
  try {
    await fn();
    passed++;
  } catch (e) {
    failed++;
    console.error(`FAIL ${name}\n  ${String(e && e.stack || e).split('\n').slice(0, 6).join('\n  ')}`);
  }
}

// ---------------------------------------------------------------------------
// In-process units
// ---------------------------------------------------------------------------

function memKV({ quota = Infinity, fail = null } = {}) {
  const m = new Map();
  const size = () => [...m].reduce((n, [k, v]) => n + (k.length + v.length) * 2, 0);
  return {
    m,
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem(k, v) {
      if (fail && fail.test(k)) { const e = new Error('blocked'); e.name = 'SecurityError'; throw e; }
      const old = m.get(k);
      m.set(k, String(v));
      if (size() > quota) {
        if (old === undefined) m.delete(k); else m.set(k, old);
        const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e;
      }
    },
    removeItem: (k) => { m.delete(k); },
    key: (i) => [...m.keys()][i] ?? null,
    get length() { return m.size; },
  };
}

await test('owner cookie: missing or malformed is guest; a 16-char base32 id is that owner', () => {
  assert.equal(parseOwnerCookie(''), GUEST);
  assert.equal(parseOwnerCookie(undefined), GUEST);
  assert.equal(parseOwnerCookie('shcode_owner='), GUEST);
  assert.equal(parseOwnerCookie('shcode_owner=ABCDEFGHIJKLMNOP'), GUEST); // upper case is not ours
  assert.equal(parseOwnerCookie('shcode_owner=abc'), GUEST);
  assert.equal(parseOwnerCookie('shcode_owner=abcdefghijklmnop1'), GUEST); // 1 is not base32
  assert.equal(parseOwnerCookie('x=1; shcode_owner=abcdefghijklmn23; y=2'), 'abcdefghijklmn23');
  assert.equal(parseOwnerCookie('not_shcode_owner=abcdefghijklmn23'), GUEST);
});

await test('two owners on one store: neither reads, lists or overwrites the other', () => {
  const kv = memKV();
  const a = createOwnedStorage({ owner: 'aaaaaaaaaaaaaaaa', storage: () => kv });
  const b = createOwnedStorage({ owner: 'bbbbbbbbbbbbbbbb', storage: () => kv });
  for (const k of ['progress:L', 'sync:L', 'quiz:L', 'written:L', 'diagram:L', 'flowblock:L:b', 'liveBlock:L:b', 'starter:L',
    'carry-dismissed:L<-K', 'sandbox-game', 'local-history', 'moshion-store', 'library-deleted', 'library-origin', 'library-base']) {
    assert.equal(a.setJSON(k, { who: 'A', k }), 'ok');
    assert.equal(b.getItem(k), null, `B read A's ${k}`);
    assert.equal(b.getJSON(k), null);
  }
  assert.equal(b.keys().length, 0);
  b.setJSON('quiz:L', { who: 'B' });
  assert.deepEqual(a.getJSON('quiz:L'), { who: 'A', k: 'quiz:L' });
  assert.ok([...kv.m.keys()].every((k) => k.startsWith('w1:aaaaaaaaaaaaaaaa:') || k.startsWith('w1:bbbbbbbbbbbbbbbb:')));
});

await test('a full store answers full, keeps the old value, and never throws; blocked is not full', () => {
  const kv = memKV({ quota: 600 });
  const seen = [];
  const a = createOwnedStorage({ owner: 'aaaaaaaaaaaaaaaa', storage: () => kv });
  assert.equal(a.setItem('written:L', 'first draft'), 'ok');
  assert.equal(a.setItem('written:L', 'x'.repeat(2000)), 'full');
  assert.equal(a.getItem('written:L'), 'first draft');
  const blocked = createOwnedStorage({ owner: 'aaaaaaaaaaaaaaaa', storage: () => memKV({ fail: /./ }) });
  assert.equal(blocked.setItem('k', 'v'), 'blocked');
  const none = createOwnedStorage({ owner: 'aaaaaaaaaaaaaaaa', storage: () => { throw new Error('opaque origin'); } });
  assert.equal(none.setItem('k', 'v'), 'blocked');
  assert.equal(none.getItem('k'), null);
  void seen;
});

await test('quarantine: copies verbatim, removes the original, keeps a second copy, survives a failure', () => {
  const kv = memKV();
  kv.setItem('shCode:progress', '{"L":1}');
  kv.setItem('shCode:quiz:Q', '{"answers":{"a":1}}');
  kv.setItem('liveCodeBlock:L:b', 'code');
  kv.setItem('shcode.prefs', '{"theme":"light"}'); // not personal work: left alone
  kv.setItem('w1:aaaaaaaaaaaaaaaa:quiz:Q', 'mine'); // already owned: left alone
  const moved = quarantineLegacy(kv, () => 1000);
  assert.deepEqual(moved.sort(), ['liveCodeBlock:L:b', 'shCode:progress', 'shCode:quiz:Q']);
  assert.equal(kv.getItem('shCode:progress'), null);
  assert.equal(kv.getItem('w1:legacy:shCode:progress'), '{"L":1}');
  assert.equal(kv.getItem('w1:legacy:shCode:quiz:Q'), '{"answers":{"a":1}}');
  assert.equal(kv.getItem('shcode.prefs'), '{"theme":"light"}');
  assert.equal(kv.getItem('w1:aaaaaaaaaaaaaaaa:quiz:Q'), 'mine');
  assert.deepEqual(quarantineLegacy(kv, () => 2000), []); // nothing left: idempotent
  // An old tab writes the old key again: the second copy is kept beside the first.
  kv.setItem('shCode:progress', '{"L":2}');
  quarantineLegacy(kv, () => 3000);
  assert.deepEqual(readLegacy(kv, 'shCode:progress').map(([, v]) => v).sort(), ['{"L":1}', '{"L":2}']);
  // A copy that cannot be written leaves the original where it was; a later run moves it.
  const bad = memKV({ fail: /^w1:legacy:/ });
  bad.setItem('shCode:sync', '{"L":{"revision":1}}');
  assert.deepEqual(quarantineLegacy(bad, () => 0), []);
  assert.equal(bad.getItem('shCode:sync'), '{"L":{"revision":1}}');
  const good = memKV();
  for (const [k, v] of bad.m) good.setItem(k, v);
  assert.deepEqual(quarantineLegacy(good, () => 86_400_000 * 2), ['shCode:sync']);
  assert.equal(good.getItem('w1:legacy:shCode:sync'), '{"L":{"revision":1}}');
});

await test('debounced save: flush runs a pending save once, cancel drops it, no timer until scheduled', () => {
  const timers = [];
  const fake = { setTimeout: (fn) => { timers.push(fn); return timers.length; }, clearTimeout: (h) => { timers[h - 1] = null; } };
  let saves = 0;
  const d = createDebouncedSave(() => { saves++; }, 2000, fake);
  assert.equal(timers.length, 0);
  d.flush(); assert.equal(saves, 0);
  d.schedule(); d.schedule(); assert.equal(d.pending(), true);
  d.flush(); assert.equal(saves, 1); assert.equal(d.pending(), false);
  d.flush(); assert.equal(saves, 1);
  d.schedule(); d.cancel(); d.flush(); assert.equal(saves, 1);
  assert.ok(timers.every((t) => t === null));
});

await test('owner header: same-origin /api/ only, never /api/auth/ or another site; one refusal latches', async () => {
  assert.equal(wantsOwnerHeader('/api/lesson-sync/x', 'http://h'), true);
  assert.equal(wantsOwnerHeader('http://h/api/me', 'http://h'), false); // who is signed in: lib/owner-guard.ts needs it
  assert.equal(wantsOwnerHeader('http://h/api/me', 'http://h', 'PUT'), true); // changing the name is the account's
  assert.equal(wantsOwnerHeader('/api/my-gradebook', 'http://h'), true);
  assert.equal(wantsOwnerHeader('/api/auth/login', 'http://h'), false);
  assert.equal(wantsOwnerHeader('/lessons/x', 'http://h'), false);
  assert.equal(wantsOwnerHeader('https://ollama.com/api/chat', 'http://h'), false);
  __resetOwnerFetchForTests();
  const sent = [];
  const base = async (input, init) => {
    sent.push({ url: String(input), owner: new Headers(init?.headers).get('X-Work-Owner') });
    return new Response('{}', { status: 409, headers: { 'X-Owner-Mismatch': '1' } });
  };
  let cookie = 'bbbbbbbbbbbbbbbb';
  const f = ownerFetch(base, 'http://h', () => 'aaaaaaaaaaaaaaaa', () => cookie);
  let told = 0;
  onOwnerMismatch(() => { told++; });
  assert.equal((await f('/api/x', { headers: { 'Content-Type': 'application/json' } })).status, 409);
  assert.equal(sent[0].owner, 'aaaaaaaaaaaaaaaa');
  for (let i = 0; i < 5; i++) assert.equal((await f('/api/x')).status, 409);
  assert.equal(sent.length, 1, 'refused requests after the first must not be sent');
  assert.equal(told, 1);
  await f('/api/auth/login', { method: 'POST' });
  assert.equal(sent.length, 2, 'signing in is never held back');
  assert.equal(sent[1].owner, null);
  cookie = 'aaaaaaaaaaaaaaaa'; // the page's own account is back
  await f('/api/x');
  assert.equal(sent.length, 3);
  __resetOwnerFetchForTests();
});

// ---------------------------------------------------------------------------
// Real modules, one process per tab
// ---------------------------------------------------------------------------

const LESSON = (id = 'L1', start = '// start here\n') =>
  `({ id: ${JSON.stringify(id)}, title: 'Lab', files: [{ path: 'script.js', name: 'script.js', type: 'file', content: ${JSON.stringify(start)} }], requirements: [] })`;

/** Everything personal a page shows, read through the same functions the components use. */
const VIEW = `
  const lab = M.vc.loadProgress('L1');
  return {
    lab: lab ? lab.fileContents : null,
    sandbox: M.vc.loadProgress('sandbox-js')?.fileContents ?? null,
    quiz: M.records.loadQuizRecord('Q1'),
    written: M.records.loadWrittenRecord('W1'),
    diagram: M.records.loadDiagramText('D1'),
    tryIt: M.owned.ownedLocal.getItem('liveBlock:R1:b1'),
    starter: M.starter.rememberedStarterId('L1'),
    carry: M.carry.isCarryDismissed('L2', 'L1'),
    history: M.history.listLocalHistory('L1').map((s) => s.message),
    pictures: M.moshion.localLibraryItems().map((i) => i.name),
    game: M.games.readSandboxGame().title,
    sync: M.sync.readRecord('L1'),
  };`;

const EMPTY_VIEW = {
  lab: null, sandbox: null, quiz: { answers: {} }, written: { response: '' }, diagram: null, tryIt: null,
  starter: null, carry: false, pictures: [], game: '', sync: null,
};

/** A's unsaved work in every kind of record, typed in tab `t`. */
async function typeEverything(t, who) {
  await t.run(`
    M.store.useLessonStore.getState().setLesson(${LESSON()});
    M.store.useLessonStore.getState().updateFile('script.js', 'let me = "${who}";');
    M.store.saveOpenDraft('L1');
    M.vc.saveProgress('sandbox-js', { fileContents: { 'script.js': '${who} sandbox' }, commits: [], lastCommittedFileContents: {}, completedSteps: [] });
    M.records.saveQuizRecord('Q1', { answers: { q1: 2, q2: 0 } , graded: false });
    M.records.saveWrittenRecord('W1', { response: '${who} wrote this' });
    M.records.saveDiagramText('D1', JSON.stringify({ who: '${who}' }));
    M.owned.ownedLocal.setItem('liveBlock:R1:b1', '${who} tried this');
    M.starter.rememberStarter('L1', 'lap-times');
    M.carry.dismissCarry('L2', 'L1');
    M.history.addLocalSnapshot('L1', { 'script.js': '${who} v1' }, '${who} saved');
    M.moshion.addToLibrary({ kind: 'texture', name: '${who.toLowerCase()}pic', dataUri: 'data:image/png;base64,AAAA', meta: null });
    M.games.writeSandboxGame({ id: null, title: '${who} game', from: null });
    M.sync.writeRecord('L1', { base: { 'script.js': '${who} saved' }, revision: 4 });
  `);
}

await test('local-history exposes a list function the view can read', async () => {
  const b = createBrowser();
  const t = await b.open();
  const names = await t.run('return Object.keys(M.history).filter((k) => typeof M.history[k] === "function");');
  await b.close();
  assert.ok(names.includes('addLocalSnapshot'));
  if (!names.includes('listLocalHistory')) throw new Error(`local-history exports ${names.join(', ')}; update VIEW`);
});

await test('1. two tabs, A and B open at once: neither writes into the other, pending saves included', async () => {
  const A = await account('a@school.org');
  const B = await account('b@school.org');
  const b = createBrowser();
  await b.signIn(A);
  const tabA = await b.open('A');
  await tabA.run(`
    M.ownerFetch.installOwnerFetch();
    M.store.useLessonStore.getState().setLesson(${LESSON()});
    globalThis.saver = M.autosave.createDebouncedSave(() => { M.store.saveOpenDraft('L1'); }, 60000);
    M.store.useLessonStore.getState().updateFile('script.js', 'A typed this');
    saver.schedule();
  `);
  // B signs in in another tab: the cookie every tab sees is now B's.
  await b.signIn(B);
  const tabB = await b.open('B');
  assert.equal(await tabB.run('M.ownerFetch.installOwnerFetch(); return M.owned.pageOwner();'), B.wo);
  assert.equal(await tabA.run('return [M.owned.pageOwner(), M.owned.readOwnerCookie()].join(" ");'), `${A.wo} ${B.wo}`);
  await tabB.run(`
    M.store.useLessonStore.getState().setLesson(${LESSON()});
    M.store.useLessonStore.getState().updateFile('script.js', 'B typed this');
    M.store.saveOpenDraft('L1');
    M.records.saveQuizRecord('Q1', { answers: { q1: 1 } });
  `);
  // A keeps typing, then A's lesson unmounts: the pending save is flushed, into A's space.
  await tabA.run(`
    M.store.useLessonStore.getState().updateFile('script.js', 'A typed this, and more');
    M.records.saveQuizRecord('Q1', { answers: { q1: 3 } });
    saver.flush();
  `);
  const s = b.storage();
  const draft = (o) => JSON.parse(s[`w1:${o}:progress:L1`]).d.fileContents['script.js'];
  assert.equal(draft(A.wo), 'A typed this, and more');
  assert.equal(draft(B.wo), 'B typed this');
  assert.deepEqual(JSON.parse(s[`w1:${A.wo}:quiz:Q1`]).d.answers, { q1: 3 });
  assert.deepEqual(JSON.parse(s[`w1:${B.wo}:quiz:Q1`]).d.answers, { q1: 1 });
  for (const k of Object.keys(s)) assert.ok(k.startsWith(`w1:${A.wo}:`) || k.startsWith(`w1:${B.wo}:`), `stray key ${k}`);
  // And through the page: each tab reads its own.
  assert.equal(await tabB.run(`return M.vc.loadProgress('L1').fileContents['script.js'];`), 'B typed this');
  await b.close();
});

for (const signOut of [true, false]) {
  for (const offline of [false, true]) {
    const how = `${signOut ? 'signing out' : 'without signing out'}, ${offline ? 'offline' : 'online'}`;
    await test(`2. A then B on one browser (${how}): B sees nothing of A's, hands in B's own; A finds everything as left`, async () => {
      const A = await account('a@school.org');
      const B = await account('b@school.org');
      const b = createBrowser();
      await b.signIn(A);
      const a1 = await b.open('A1');
      await a1.run(`M.ownerFetch.installOwnerFetch(); T.setOnline(${!offline});`);
      await typeEverything(a1, 'Ana');
      const asLeft = await a1.run(VIEW);
      assert.equal(asLeft.lab['script.js'], 'let me = "Ana";');
      assert.deepEqual(asLeft.pictures, ['anapic']);
      await a1.close();

      if (signOut) {
        b.signOut();
        const g = await b.open('guest');
        const gv = await g.run(VIEW);
        await g.close();
        assert.deepEqual({ ...gv, history: undefined }, { ...EMPTY_VIEW, history: undefined }, 'a signed-out page showed A\'s work');
      }
      await b.signIn(B);
      const b1 = await b.open('B1');
      await b1.run(`M.ownerFetch.installOwnerFetch(); T.setOnline(${!offline});`);
      const bv = await b1.run(VIEW);
      assert.deepEqual({ ...bv, history: undefined }, { ...EMPTY_VIEW, history: undefined }, 'B saw A\'s work');
      assert.deepEqual(bv.history, []);
      // B opens the lab: the editor shows the starter, not A's code.
      assert.equal(await b1.run(`M.store.useLessonStore.getState().setLesson(${LESSON()}); return M.store.useLessonStore.getState().fileContents['script.js'];`), '// start here\n');
      if (!offline) {
        // B hands in: what reaches the server is B's picks, under B.
        await b1.run(`
          const picks = M.records.loadQuizRecord('Q1').answers;
          await fetch('/api/lesson-submissions', { method: 'POST', body: JSON.stringify({ lessonId: 'Q1', picks }) });
        `);
        assert.deepEqual(b.server.drafts[B.email].map((d) => JSON.parse(d.body).picks), [{}]);
        assert.equal(b.server.drafts[A.email], undefined);
      }
      await typeEverything(b1, 'Ben');
      await b1.close();

      if (signOut) b.signOut();
      await b.signIn(A);
      const a2 = await b.open('A2');
      const back = await a2.run(VIEW);
      assert.deepEqual(back, asLeft, 'A did not find everything exactly as left');
      assert.equal(await a2.run(`M.store.useLessonStore.getState().setLesson(${LESSON()}); return M.store.useLessonStore.getState().fileContents['script.js'];`), 'let me = "Ana";');
      await b.close();
    });
  }
}

await test('3. a stale tab after another account signed in: refused with 409, told once, nothing sent, work kept', async () => {
  const A = await account('a@school.org');
  const B = await account('b@school.org');
  const b = createBrowser();
  await b.signIn(A);
  const tabA = await b.open('A');
  await tabA.run(`
    M.ownerFetch.installOwnerFetch();
    globalThis.told = 0;
    M.ownerFetch.onOwnerMismatch(() => { told++; });
    M.store.useLessonStore.getState().setLesson(${LESSON()});
    M.store.useLessonStore.getState().updateFile('script.js', 'A work, not saved');
    M.store.saveOpenDraft('L1');
    M.records.saveQuizRecord('Q1', { answers: { q1: 2 } });
    // setLesson fires a background GET of the lesson's commits: let it land (as A, before B
    // signs in) so it is not counted against what happens after the account changes.
    await new Promise((r) => setTimeout(r, 100));
  `);
  const writesBefore = b.server.writes.length;
  const refusedBefore = b.server.refused.length;
  await b.signIn(B);
  const result = await tabA.run(`
    const r = await fetch('/api/lesson-submissions', { method: 'POST', body: JSON.stringify({ picks: M.records.loadQuizRecord('Q1').answers }) });
    const push = await M.sync.pushWorkspace('L1', M.store.useLessonStore.getState().fileContents, 0);
    const again = await fetch('/api/lesson-drafts/W1', { method: 'POST', body: '{"response":"x"}' });
    return { status: r.status, mark: r.headers.get('X-Owner-Mismatch'), body: await r.json(), push, again: again.status, told };
  `);
  assert.equal(result.status, 409);
  assert.equal(result.mark, '1');
  assert.equal(result.body.error, 'owner-mismatch');
  assert.deepEqual(result.push, { ok: false, owner: true });
  assert.equal(result.again, 409);
  assert.equal(result.told, 1);
  assert.equal(b.server.refused.length - refusedBefore, 1, 'only the first refused request reached the server');
  assert.deepEqual(b.server.writes.slice(writesBefore), [], 'nothing reached a route');
  assert.ok(b.server.writes.every((w) => w.email === A.email), 'a request ran as B');
  assert.equal(b.server.drafts[B.email], undefined, 'A\'s answer was handed in to B');
  assert.equal(b.server.rows[B.email], undefined, 'A\'s code was saved to B');
  // A's work is where A left it.
  // (Read from storage, not through A's stale tab: with sealing on, a tab whose account is no longer
  // the signed-in one opens nothing. scripts/test-sealed-storage.mjs case 12.)
  const s = b.storage();
  assert.equal(JSON.parse(s[`w1:${A.wo}:progress:L1`]).d.fileContents['script.js'], 'A work, not saved');
  assert.deepEqual(JSON.parse(s[`w1:${A.wo}:quiz:Q1`]).d.answers, { q1: 2 });
  assert.equal(s[`w1:${B.wo}:quiz:Q1`], undefined);
  // A signs back in: the same tab may send again, as A.
  await b.signIn(A);
  assert.equal(await tabA.run(`return (await fetch('/api/lesson-drafts/W1', { method: 'POST', body: '{"response":"x"}' })).status;`), 200);
  assert.equal(b.server.drafts[A.email].length, 1);
  await b.close();
});

await test('3b. a request with no X-Work-Owner header (an old cached bundle) works exactly as before', async () => {
  const B = await account('b@school.org');
  const b = createBrowser();
  await b.signIn(B);
  const t = await b.open('old-bundle');
  // No installOwnerFetch: the page sends what an old bundle sends.
  const st = await t.run(`return (await fetch('/api/lesson-drafts/W1', { method: 'POST', body: '{"response":"x"}' })).status;`);
  assert.equal(st, 200);
  assert.equal(b.server.drafts[B.email].length, 1);
  assert.equal(b.server.writes[0].owner, null);
  await b.close();
});

await test('4. work from before is set aside and NEVER handed to anyone, even on an identical base', async () => {
  const A = await account('a@school.org');
  const B = await account('b@school.org');
  const b = createBrowser();
  // Both students at revision 1 of the SAME starter: a matching server copy proves nothing.
  const START = { 'script.js': 'starter' };
  b.setStorage({
    'shCode:progress': JSON.stringify({
      L1: { fileContents: { 'script.js': 'A typed this on the old version' }, commits: [{ id: 'c' }], lastCommittedFileContents: START, completedSteps: [] },
    }),
    'shCode:sync': JSON.stringify({ L1: { base: START, revision: 1 } }),
    'shCode:quiz:Q1': JSON.stringify({ answers: { q1: 1 } }),
    'shCode:written:W1': JSON.stringify({ response: 'someone wrote' }),
    'moshion.store.v1': JSON.stringify({ 'texture:old': '"data:image/png;base64,AA"' }),
    'shcode.prefs': '{"theme":"light"}',
  });
  b.server.rows[A.email] = { L1: { files: START, revision: 1 } };
  b.server.rows[B.email] = { L1: { files: START, revision: 1 } };
  const before = b.storage();
  for (const who of [B, A]) {
    await b.signIn(who);
    const t = await b.open(who.email);
    await t.run('M.ownerFetch.installOwnerFetch();');
    const v = await t.run(VIEW);
    assert.deepEqual({ ...v, history: undefined }, { ...EMPTY_VIEW, history: undefined }, `set-aside work was shown to ${who.email}`);
    // The real arrival path, exactly as a lab opening runs it.
    const got = await t.run(`
      const lesson = ${LESSON('L1', 'starter')};
      M.store.useLessonStore.getState().setLesson(lesson);
      await M.sync.restoreWorkspace(lesson);
      return { editor: M.store.useLessonStore.getState().fileContents, draft: M.vc.loadProgress('L1') };
    `);
    assert.deepEqual(got.editor, START, `${who.email} received the set-aside draft`);
    assert.equal(got.draft, null);
    await t.close();
  }
  const s = b.storage();
  for (const k of ['shCode:progress', 'shCode:sync', 'shCode:quiz:Q1', 'shCode:written:W1', 'moshion.store.v1']) {
    assert.equal(s[k], undefined, `${k} still unprefixed`);
    assert.equal(s[`w1:legacy:${k}`], before[k], `${k} not set aside verbatim, or changed afterwards`);
  }
  assert.equal(s['shcode.prefs'], '{"theme":"light"}');
  await b.close();
});

await test('5. a full store: the save says full, the page is told, and nothing already saved is lost', async () => {
  const A = await account('a@school.org');
  const B = await account('b@school.org');
  const b = createBrowser({ quota: 6000 });
  await b.signIn(B);
  const tB = await b.open('B');
  await tB.run(`M.records.saveWrittenRecord('W1', { response: 'B essay' });`);
  await tB.close();
  await b.signIn(A);
  const tA = await b.open('A');
  const r = await tA.run(`
    globalThis.problems = [];
    M.owned.onStorageProblem((p) => problems.push(p.kind));
    M.store.useLessonStore.getState().setLesson(${LESSON()});
    M.store.useLessonStore.getState().updateFile('script.js', 'small draft');
    const first = M.store.saveOpenDraft('L1');
    M.store.useLessonStore.getState().updateFile('script.js', 'y'.repeat(5000));
    const second = M.store.saveOpenDraft('L1');
    const hist = M.history.addLocalSnapshot('L1', { 'script.js': 'z'.repeat(5000) }, 'big');
    return { first, second, kept: M.vc.loadProgress('L1').fileContents['script.js'], problems };
  `);
  assert.equal(r.first, 'ok');
  assert.equal(r.second, 'full');
  assert.equal(r.kept, 'small draft');
  assert.ok(r.problems.includes('full'));
  assert.equal(JSON.parse(b.storage()[`w1:${B.wo}:written:W1`]).d.response, 'B essay', 'another account\'s work was touched');
  await b.close();
});

await test('6. work typed signed out is offered after sign-in, never merged; Use it / No thanks behave', async () => {
  const A = await account('a@school.org');
  const b = createBrowser();
  const g = await b.open('guest');
  await g.run(`M.vc.saveProgress('L1', { fileContents: { 'script.js': 'guest work' }, commits: [], lastCommittedFileContents: {}, completedSteps: [] });`);
  assert.equal(await g.run('return M.guest.guestWorkOffer("L1", { "script.js": "x" }, { "script.js": "s" });'), null, 'a guest page offers to itself');
  await g.close();
  await b.signIn(A);
  const t = await b.open('A');
  await t.run(`M.vc.saveProgress('L1', { fileContents: { 'script.js': 'A own work' }, commits: [], lastCommittedFileContents: {}, completedSteps: [] });`);
  const offered = await t.run(`
    const o = M.guest.guestWorkOffer('L1', { 'script.js': 'A own work' }, { 'script.js': 'starter' });
    return { files: o && o.files, mine: M.vc.loadProgress('L1').fileContents };
  `);
  assert.deepEqual(offered.files, { 'script.js': 'guest work' });
  assert.deepEqual(offered.mine, { 'script.js': 'A own work' }, 'merged without asking');
  // No thanks: not offered again for that same guest draft, and the guest copy is left alone.
  assert.equal(await t.run(`
    M.guest.declineGuestWork('L1', M.guest.guestWorkOffer('L1', { 'script.js': 'A own work' }, { 'script.js': 'starter' }));
    return M.guest.guestWorkOffer('L1', { 'script.js': 'A own work' }, { 'script.js': 'starter' });
  `), null);
  assert.ok(b.storage()['w1:guest:progress:L1']);
  // Not offered when it is the starter or what is already open.
  assert.equal(await t.run(`return M.guest.guestWorkOffer('L1', { 'script.js': 'guest work' }, { 'script.js': 'starter' });`), null);
  await t.close();
  // A new guest draft is offered again; Use it keeps A's version in History and moves the guest one in.
  b.signOut();
  const g2 = await b.open('guest2');
  await g2.run(`M.vc.saveProgress('L1', { fileContents: { 'script.js': 'newer guest work' }, commits: [], lastCommittedFileContents: {}, completedSteps: [] });`);
  await g2.close();
  await b.signIn(A);
  const t2 = await b.open('A2');
  const used = await t2.run(`
    const current = M.vc.loadProgress('L1').fileContents;
    const o = M.guest.guestWorkOffer('L1', current, { 'script.js': 'starter' });
    const files = M.guest.acceptGuestWork('L1', o, current, { 'script.js': 'starter' }).files;
    return { files, draft: M.vc.loadProgress('L1').fileContents, history: M.history.listLocalHistory('L1').map((s) => s.files['script.js']) };
  `);
  assert.deepEqual(used.files, { 'script.js': 'newer guest work' });
  assert.deepEqual(used.draft, { 'script.js': 'newer guest work' });
  assert.deepEqual(used.history, ['A own work']);
  // The guest copy is left where it was (never removed), and is not offered to A again
  // once A's code moves on from it.
  assert.equal(JSON.parse(b.storage()['w1:guest:progress:L1']).d.fileContents['script.js'], 'newer guest work');
  assert.equal(await t2.run(`return M.guest.guestWorkOffer('L1', { 'script.js': 'A edited further' }, { 'script.js': 'starter' });`), null);
  await b.close();
});

await test('6b. Use that work with History unable to write: the account draft and the guest copy are untouched', async () => {
  const A = await account('a@school.org');
  const b = createBrowser();
  const g = await b.open('guest');
  await g.run(`M.vc.saveProgress('L1', { fileContents: { 'script.js': 'guest work' }, commits: [], lastCommittedFileContents: {}, completedSteps: [] });`);
  await g.close();
  await b.signIn(A);
  const t = await b.open('A');
  const r = await t.run(`
    M.vc.saveProgress('L1', { fileContents: { 'script.js': 'A unsaved work' }, commits: [], lastCommittedFileContents: {}, completedSteps: [] });
    const current = M.vc.loadProgress('L1').fileContents;
    const o = M.guest.guestWorkOffer('L1', current, { 'script.js': 'starter' });
    T.failWrites('local-history');
    const res = M.guest.acceptGuestWork('L1', o, current, { 'script.js': 'starter' });
    T.failWrites(null);
    return { res, draft: M.vc.loadProgress('L1').fileContents, history: M.history.listLocalHistory('L1').length };
  `);
  assert.deepEqual(r.res, { ok: false, reason: 'history' });
  assert.deepEqual(r.draft, { 'script.js': 'A unsaved work' }, 'the account draft was overwritten');
  assert.equal(r.history, 0);
  assert.ok(b.storage()['w1:guest:progress:L1'], 'the guest copy was removed');
  // Remix promises the same: with History failing it changes nothing.
  const remix = await t.run(`
    M.vc.saveProgress('sandbox-moshion', { fileContents: { 'script.js': 'my own game' }, commits: [], lastCommittedFileContents: {}, completedSteps: [] });
    T.failWrites('local-history');
    let told = '';
    const ok = M.games.remixIntoSandbox({ id: 'g1', title: 'Their game', code: 'their code', mine: true, choice: 'free' }, () => true, (m) => { told = m; });
    T.failWrites(null);
    return { ok, told, draft: M.vc.loadProgress('sandbox-moshion').fileContents['script.js'] };
  `);
  assert.equal(remix.ok, false);
  assert.match(remix.told, /Nothing was changed/);
  assert.equal(remix.draft, 'my own game');
  await b.close();
});

await test('8. a page that loaded as guest but is signed in: saves everything waiting, reloads once, then is the account\'s', async () => {
  const A = await account('a@school.org');
  const b = createBrowser();
  // An earlier signed-out visitor's draft of this very lesson.
  b.setStorage({ 'w1:guest:progress:L1': JSON.stringify({ v: 1, d: { fileContents: { 'script.js': 'PREVIOUS STUDENT' }, commits: [], lastCommittedFileContents: {}, completedSteps: [] }, t: 1, up: null }) });
  await b.signIn(A, { ownerCookie: false }); // the session is there, the owner cookie is not
  const t = await b.open('cached-page');
  const r = await t.run(`
    M.ownerFetch.installOwnerFetch();
    const owner = M.owned.pageOwner();
    const q1 = M.records.saveQuizRecord('Q1', { answers: { q1: 1 } });
    // Two saves still counting down when the answer arrives: the shared kind and a page part's own timer.
    let late = null, own = null;
    const pending = M.autosave.createDebouncedSave(() => { late = M.records.saveQuizRecord('Q3', { answers: { q1: 2 } }); }, 2000);
    pending.schedule();
    M.autosave.registerFlush(() => { own = M.owned.ownedLocal.setItem('liveBlock:B1', 'typed in a Try-it block'); });
    const me = async () => { const u = await M.auth.getCurrentUser(); await new Promise((r) => setTimeout(r, 50)); return u; };
    const result = await M.guard.guardSignedInGuest({ me, reload: () => location.reload(), session: T.session });
    // Until the reload happens the page still saves (nothing is refused).
    const after = M.records.saveQuizRecord('Q4', { answers: { q1: 0 } });
    // Asked again in the same tab within a minute: no second reload (no loop).
    const again = await M.guard.guardSignedInGuest({ me: M.auth.getCurrentUser, reload: () => location.reload(), session: T.session });
    return { owner, q1, late, own, result, after, again, reloads: T.reloads, stillPending: pending.pending() };
  `);
  assert.deepEqual(r, { owner: 'guest', q1: 'ok', late: 'ok', own: 'ok', result: 'reloading', after: 'ok', again: 'stuck', reloads: 1, stillPending: false });
  const st = b.storage();
  // Nothing was moved into the account, least of all the earlier visitor's draft; nothing was removed.
  assert.deepEqual(Object.keys(st).filter((k) => k.startsWith(`w1:${A.wo}:`)), []);
  assert.equal(JSON.parse(st['w1:guest:progress:L1']).d.fileContents['script.js'], 'PREVIOUS STUDENT');
  assert.deepEqual(JSON.parse(st['w1:guest:quiz:Q3']).d.answers, { q1: 2 });
  assert.equal(JSON.parse(st['w1:guest:liveBlock:B1']).d, 'typed in a Try-it block');
  assert.equal(b.jar.owner, A.wo, '/api/me did not give the browser the owner cookie');
  await t.close();
  // The reload: the page is now the account's, saves there, and is OFFERED the guest lab draft (never given it).
  const t2 = await b.open('reloaded');
  const r2 = await t2.run(`
    const result = await M.guard.guardSignedInGuest({ me: M.auth.getCurrentUser, reload: () => location.reload(), session: T.session });
    const mine = M.vc.loadProgress('L1');
    const offer = M.guest.guestWorkOffer('L1', { 'script.js': 'starter' }, { 'script.js': 'starter' });
    M.store.useLessonStore.getState().setLesson(${LESSON()});
    M.store.useLessonStore.getState().updateFile('script.js', 'typed after the reload');
    return { owner: M.owned.pageOwner(), result, mine: mine && mine.fileContents, offered: offer && offer.files['script.js'], saved: M.store.saveOpenDraft('L1'), reloads: T.reloads };
  `);
  assert.deepEqual(r2, { owner: A.wo, result: 'account', mine: null, offered: 'PREVIOUS STUDENT', saved: 'ok', reloads: 0 });
  assert.equal(JSON.parse(b.storage()[`w1:${A.wo}:progress:L1`]).d.fileContents['script.js'], 'typed after the reload');
  // A real guest (no session) is left alone: no reload, guest saves work.
  b.signOut();
  const g = await b.open('guest');
  const r3 = await g.run(`
    const result = await M.guard.guardSignedInGuest({ me: M.auth.getCurrentUser, reload: () => location.reload(), session: T.session });
    return { result, saved: M.vc.saveProgress('L9', { fileContents: { 'script.js': 'g' }, commits: [], lastCommittedFileContents: {}, completedSteps: [] }), reloads: T.reloads };
  `);
  assert.deepEqual(r3, { result: 'guest', saved: 'ok', reloads: 0 });
  await b.close();
});

await test('8c. a save failed on the signed-in guest page: no reload (the edit may be in memory only)', async () => {
  const A = await account('a@school.org');
  const b = createBrowser();
  await b.signIn(A, { ownerCookie: false });
  const t = await b.open('cached-page');
  const r = await t.run(`
    T.failWrites('.');
    const q = M.records.saveQuizRecord('Q1', { answers: { q1: 1 } });
    const result = await M.guard.guardSignedInGuest({ me: M.auth.getCurrentUser, reload: () => location.reload(), session: T.session });
    return { q, result, reloads: T.reloads };
  `);
  assert.deepEqual(r, { q: 'blocked', result: 'stuck', reloads: 0 });
  await b.close();
});

await test('9. sign in from a page that loaded signed out, accept the terms, reload: the terms are recorded and the page is the account\'s', async () => {
  const A = await account('old@school.org');
  const b = createBrowser();
  const t = await b.open('signed-out page');
  await t.run('M.ownerFetch.installOwnerFetch();');
  await b.signIn(A); // POST /api/auth/login answered with both cookies
  const st = await t.run(`
    const r = await fetch('/api/accept-terms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"confirmedAge13":true,"acceptedTerms":true}' });
    const other = await fetch('/api/lesson-drafts/W1', { method: 'POST', body: '{"response":"x"}' });
    return { terms: r.status, other: other.status, owner: M.owned.pageOwner() };
  `);
  assert.equal(st.owner, 'guest');
  assert.equal(st.terms, 200, 'accepting the terms was refused for the owner');
  assert.equal(st.other, 409, 'only accept-terms is exempt');
  assert.deepEqual(b.server.terms, [A.email]);
  await t.close();
  const t2 = await b.open('after reload');
  assert.equal(await t2.run('return M.owned.pageOwner();'), A.wo);
  await b.close();
});

await test('6c. Use that work does not delete a NEWER guest draft another tab saved since the offer', async () => {
  const A = await account('a@school.org');
  const b = createBrowser();
  const g = await b.open('guest');
  await g.run(`M.vc.saveProgress('L1', { fileContents: { 'script.js': 'guest X' }, commits: [], lastCommittedFileContents: {}, completedSteps: [] });`);
  await b.signIn(A);
  const t = await b.open('A');
  const offered = await t.run(`
    globalThis.cur = { 'script.js': 'starter' };
    globalThis.offer = M.guest.guestWorkOffer('L1', cur, { 'script.js': 'starter' });
    return offer.files['script.js'];
  `);
  assert.equal(offered, 'guest X');
  await g.run(`M.vc.saveProgress('L1', { fileContents: { 'script.js': 'guest Y, newer' }, commits: [], lastCommittedFileContents: {}, completedSteps: [] });`);
  const res = await t.run(`return M.guest.acceptGuestWork('L1', offer, cur, { 'script.js': 'starter' }).ok;`);
  assert.equal(res, true);
  const st = b.storage();
  assert.equal(JSON.parse(st['w1:guest:progress:L1']).d.fileContents['script.js'], 'guest Y, newer');
  assert.equal(JSON.parse(st[`w1:${A.wo}:progress:L1`]).d.fileContents['script.js'], 'guest X');
  await b.close();
});

await test('9b. after one refused request, accepting the terms still reaches the server', async () => {
  const A = await account('old2@school.org');
  const b = createBrowser();
  const t = await b.open('signed-out page');
  await t.run('M.ownerFetch.installOwnerFetch();');
  await b.signIn(A);
  const st = await t.run(`
    const other = await fetch('/api/lesson-drafts/W1', { method: 'POST', body: '{"response":"x"}' });
    const latched = M.ownerFetch.ownerMismatched();
    const r = await fetch('/api/accept-terms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"confirmedAge13":true,"acceptedTerms":true}' });
    return { other: other.status, latched, terms: r.status };
  `);
  assert.deepEqual(st, { other: 409, latched: true, terms: 200 });
  assert.deepEqual(b.server.terms, [A.email]);
  await b.close();
});

await test('10. storage that refuses writes: told once per page, and Save to cloud still works', async () => {
  const A = await account('a@school.org');
  const b = createBrowser();
  await b.signIn(A);
  const t = await b.open('A');
  const r = await t.run(`
    M.ownerFetch.installOwnerFetch();
    globalThis.problems = [];
    M.owned.onStorageProblem((p) => problems.push(p.kind));
    const lesson = ${LESSON()};
    M.store.useLessonStore.getState().setLesson(lesson);
    T.failWrites('.');
    M.store.useLessonStore.getState().updateFile('script.js', 'cannot be kept here');
    const results = [M.store.saveOpenDraft('L1'), M.records.saveQuizRecord('Q1', { answers: { q1: 1 } }), M.store.saveOpenDraft('L1')];
    const cloud = await M.sync.saveWorkspace(lesson);
    return { results, problems, cloud };
  `);
  assert.deepEqual(r.results, ['blocked', 'blocked', 'blocked']);
  assert.deepEqual(r.problems, ['blocked'], 'blocked must be reported exactly once per page');
  assert.equal(r.cloud, 'saved');
  assert.deepEqual(b.server.rows[A.email].L1.files, { 'script.js': 'cannot be kept here' });
  await b.close();
});

await test('7. loading the storage modules starts no timer, listener or channel', async () => {
  const before = new Set(process.getActiveResourcesInfo());
  await import('../lib/owned-storage.ts?fresh');
  await import('../lib/owner-guard.ts?fresh');
  await import('../lib/owner-fetch.ts?fresh');
  await import('../lib/work-records.ts?fresh');
  const after = process.getActiveResourcesInfo().filter((r) => !before.has(r));
  assert.deepEqual(after, []);
  const BroadcastChannel = globalThis.BroadcastChannel;
  void BroadcastChannel;
});

cleanup();
console.log(`owned storage: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
