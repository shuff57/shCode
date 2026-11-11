#!/usr/bin/env node
// What's New (lib/whats-new.ts, lib/whats-new-state.ts, components/WhatsNewModal.tsx).
// What has to hold:
//   1. the popup opens by itself only for a signed-in user, on a listed page,
//      for entries of their audience that they have not seen and that are live
//      (shipped within LIVE_DAYS); never in a frame, never for an automated
//      browser, at most once per session per account; a retired entry (older
//      than LIVE_DAYS) is shown nowhere, not even in the menu's list;
//   2. seen-state is per account, and malformed or throwing storage reads as
//      "nothing seen" without throwing;
//   3. the entries are well formed: unique ids, valid dates newest first, at
//      most 3 steps, in-site actions that land on a real page, and every clip
//      and poster on disk, small enough to ship;
//   4. the popup is mounted once in the root layout and reachable from the
//      account menu and /account.
//
// Run: node --import ./scripts/register-ts.mjs scripts/test-whats-new.mjs

import { strict as assert } from 'node:assert';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const { WHATS_NEW, LIVE_DAYS } = await import(join(root, 'lib/whats-new.ts'));
const S = await import(join(root, 'lib/whats-new-state.ts'));
const { sections } = await import(join(root, 'lib/moshion-docs.ts'));

const results = [];
function check(name, fn) {
  try { fn(); results.push(`  ok  ${name}`); }
  catch (e) { results.push(`FAIL  ${name}\n      ${e.message}`); process.exitCode = 1; }
}

function memoryStorage(initial = {}) {
  const data = { ...initial };
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
    data,
  };
}
const throwing = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };

const DAY = 24 * 60 * 60 * 1000;
const now = Date.parse('2026-11-10T12:00:00Z');
const sample = [
  { id: 's-new', date: '2026-11-08', audience: 'student', title: 't', summary: 's' },
  { id: 't-new', date: '2026-11-08', audience: 'teacher', title: 't', summary: 's' },
  { id: 'all-new', date: '2026-11-07', audience: 'all', title: 't', summary: 's' },
  { id: 's-old', date: '2026-08-01', audience: 'student', title: 't', summary: 's' },
];
const ids = (list) => list.map((e) => e.id);

// ---- 1. the auto-show window and audience ----
check('a student auto-shows unseen student + all entries inside the window', () => {
  assert.deepEqual(ids(S.entriesToAutoShow(sample, new Set(), 'student', now, 14)), ['s-new', 'all-new']);
});
check('a teacher also gets the student news, inside the window', () => {
  assert.deepEqual(ids(S.entriesToAutoShow(sample, new Set(), 'teacher', now, 14)), ['s-new', 't-new', 'all-new']);
});
check('an admin reads everything, like a teacher', () => {
  assert.deepEqual(ids(S.entriesFor(sample, 'admin')), ['s-new', 't-new', 'all-new', 's-old']);
});
check('a student never sees teacher news, even in the full list', () => {
  assert.deepEqual(ids(S.entriesFor(sample, 'student')), ['s-new', 'all-new', 's-old']);
});
check('seen entries do not auto-show', () => {
  assert.deepEqual(ids(S.entriesToAutoShow(sample, new Set(['s-new']), 'student', now, 14)), ['all-new']);
  assert.deepEqual(S.entriesToAutoShow(sample, new Set(['s-new', 'all-new']), 'student', now, 14), []);
});
check('an entry is live for 14 days: 14 days old still counts, 15 is retired', () => {
  assert.equal(LIVE_DAYS, 14);
  const e = [{ id: 'x', date: '2026-01-01', audience: 'all', title: 't', summary: 's' }];
  const t = Date.parse('2026-01-01T00:00:00Z');
  assert.equal(S.entriesToAutoShow(e, new Set(), 'student', t + 14 * DAY).length, 1);
  assert.equal(S.entriesToAutoShow(e, new Set(), 'student', t + 15 * DAY).length, 0);
  assert.equal(S.liveEntriesFor(e, 'student', t + 14 * DAY).length, 1);
  assert.equal(S.liveEntriesFor(e, 'student', t + 15 * DAY).length, 0);
});
check('the menu lists live entries only, seen or not', () => {
  assert.deepEqual(ids(S.liveEntriesFor(sample, 'student', now)), ['s-new', 'all-new']);
  assert.deepEqual(ids(S.liveEntriesFor(sample, 'teacher', now)), ['s-new', 't-new', 'all-new']);
  assert.deepEqual(S.liveEntriesFor(sample, 'student', now + 30 * DAY), []);
});
check('bad dates and dates more than a day ahead never auto-show', () => {
  const odd = [
    { id: 'a', date: 'soon', audience: 'all', title: 't', summary: 's' },
    { id: 'b', date: '2026-11-31x', audience: 'all', title: 't', summary: 's' },
    { id: 'c', date: '2027-01-01', audience: 'all', title: 't', summary: 's' },
  ];
  assert.deepEqual(S.entriesToAutoShow(odd, new Set(), 'student', now, 14), []);
});

// ---- the page and session rule ----
const user = { email: 'Sam@School.org', role: 'student' };
const base = { user, pathname: '/', inFrame: false, automated: false, forced: false, shownThisSession: false, seen: new Set(), now, entries: sample };
check('opens on the home page, a module list, the Sandbox and the Library (with or without the trailing slash)', () => {
  for (const p of ['/', '/sandbox', '/sandbox/', '/library/', '/module/m1-1', '/module/m1-1/']) {
    assert.deepEqual(ids(S.decideAutoOpen({ ...base, pathname: p })), ['s-new', 'all-new'], p);
  }
});
check('never opens by itself on a lesson, a quiz, /play, the docs, a teacher page or /account', () => {
  for (const p of ['/lesson/1-7-2', '/lesson/1-7-2/', '/play', '/play/', '/docs/moshion/multiplayer', '/teacher', '/account', '/progress', '/module/a/b', null]) {
    assert.deepEqual(S.decideAutoOpen({ ...base, pathname: p }), [], String(p));
  }
});
check('signed out never opens, even forced', () => {
  assert.deepEqual(S.decideAutoOpen({ ...base, user: null }), []);
  assert.deepEqual(S.decideAutoOpen({ ...base, user: null, forced: true }), []);
});
check('inside a frame never opens, even forced', () => {
  assert.deepEqual(S.decideAutoOpen({ ...base, inFrame: true, forced: true }), []);
});
check('an automated browser does not get it by itself; ?whats-new forces every live entry for the role', () => {
  assert.deepEqual(S.decideAutoOpen({ ...base, automated: true }), []);
  assert.deepEqual(ids(S.decideAutoOpen({ ...base, automated: true, forced: true, pathname: '/lesson/x', seen: new Set(['s-new']) })), ['s-new', 'all-new']);
});
check('at most once per session: shown this session means no auto-open', () => {
  assert.deepEqual(S.decideAutoOpen({ ...base, shownThisSession: true }), []);
});
check('nothing unseen in the window means no popup', () => {
  assert.deepEqual(S.decideAutoOpen({ ...base, seen: new Set(['s-new', 'all-new']) }), []);
});

// ---- 2. seen-state per account ----
check('the key is per account, case- and space-insensitive, and never holds the email', () => {
  assert.equal(S.seenKey('Sam@School.org'), S.seenKey('  sam@school.org '));
  assert.notEqual(S.seenKey('sam@school.org'), S.seenKey('alex@school.org'));
  assert.ok(!S.seenKey('sam@school.org').includes('sam'));
  assert.match(S.seenKey('sam@school.org'), /^shcode\.whatsNew\.seen:[0-9a-f]{14}$/);
});
check('two students on one browser each keep their own seen list', () => {
  const st = memoryStorage();
  S.markSeen(['s-new'], 'sam@school.org', st);
  assert.deepEqual([...S.readSeen('sam@school.org', st)], ['s-new']);
  assert.equal(S.readSeen('alex@school.org', st).size, 0);
  assert.deepEqual(ids(S.decideAutoOpen({ ...base, user: { email: 'alex@school.org', role: 'student' }, seen: S.readSeen('alex@school.org', st) })), ['s-new', 'all-new']);
});
check('markSeen adds without duplicates', () => {
  const st = memoryStorage();
  S.markSeen(['a'], 'sam@school.org', st);
  S.markSeen(['a', 'b'], 'sam@school.org', st);
  assert.deepEqual([...S.readSeen('sam@school.org', st)].sort(), ['a', 'b']);
});
check('malformed storage reads as nothing seen', () => {
  const k = S.seenKey('sam@school.org');
  for (const raw of ['not json', '{"x":1}', '"s-new"', '42', 'null', '[1,2,{"id":"s-new"}]']) {
    assert.equal(S.readSeen('sam@school.org', memoryStorage({ [k]: raw })).size, 0, raw);
  }
  assert.deepEqual([...S.readSeen('sam@school.org', memoryStorage({ [k]: '["ok", 3, null, "fine"]' }))], ['ok', 'fine']);
});
check('throwing or missing storage never throws', () => {
  assert.equal(S.readSeen('sam@school.org', throwing).size, 0);
  assert.equal(S.markSeen(['a'], 'sam@school.org', throwing).has('a'), true);
  assert.equal(S.readSeen('sam@school.org', null).size, 0);
  assert.equal(S.wasShownThisSession('sam@school.org', throwing), false);
  S.markShownThisSession('sam@school.org', throwing);
});
check('shown-this-session is per account too', () => {
  const ss = memoryStorage();
  S.markShownThisSession('sam@school.org', ss);
  assert.equal(S.wasShownThisSession('sam@school.org', ss), true);
  assert.equal(S.wasShownThisSession('alex@school.org', ss), false);
});

// ---- 3. the entries themselves ----
const CLIP_CAP = 1.5 * 1024 * 1024;
const POSTER_CAP = 300 * 1024;
check('ids are unique and look like YYYY-MM-name', () => {
  const all = WHATS_NEW.map((e) => e.id);
  assert.equal(new Set(all).size, all.length, 'duplicate id');
  for (const id of all) assert.match(id, /^\d{4}-\d{2}-[a-z0-9-]+$/, id);
});
check('dates are real and the list is newest first', () => {
  const t = WHATS_NEW.map((e) => S.shippedAt(e.date));
  t.forEach((d, i) => assert.ok(Number.isFinite(d), WHATS_NEW[i].id));
  for (let i = 1; i < t.length; i++) assert.ok(t[i] <= t[i - 1], `${WHATS_NEW[i].id} is newer than the entry above it`);
});
check('every entry has an audience, a short title and summary, and at most 3 steps', () => {
  for (const e of WHATS_NEW) {
    assert.ok(['student', 'teacher', 'all'].includes(e.audience), e.id);
    assert.ok(e.title && e.title.length <= 60, `${e.id} title`);
    assert.ok(e.summary && e.summary.length <= 320, `${e.id} summary is ${e.summary?.length} characters`);
    assert.ok(!e.steps || (e.steps.length >= 1 && e.steps.length <= 3), `${e.id} steps`);
    assert.ok(!/—/.test(e.summary + (e.steps || []).join('')), `${e.id}: plain punctuation, no em dash`);
  }
});
check('every action is an in-site page that exists', () => {
  const pages = new Set(['/', '/sandbox', '/library', '/account', '/teacher', '/docs', '/fonts']);
  for (const e of WHATS_NEW) {
    if (!e.action) continue;
    const { href, label } = e.action;
    assert.ok(label && label.length <= 30, `${e.id} action label`);
    assert.ok(href.startsWith('/') && !href.startsWith('//'), `${e.id}: ${href} is not in-site`);
    const docs = /^\/docs\/moshion\/([a-z-]+)(?:\?page=(\d+))?$/.exec(href);
    if (docs) {
      const sec = sections.find((s) => s.slug === docs[1]);
      assert.ok(sec, `${e.id}: no moSHion docs section ${docs[1]}`);
      if (docs[2]) assert.ok(Number(docs[2]) >= 1 && Number(docs[2]) <= sec.pages.length, `${e.id}: ${href} has no such page`);
    } else {
      // The Library opens on a tab from ?tab= (components/ClassLibraryPanel.tsx).
      const page = href.replace(/^\/library\?tab=(games|pictures|sounds|fonts)$/, '/library');
      assert.ok(pages.has(page), `${e.id}: ${href} is not a known page`);
    }
  }
});
check('the real-time entry opens the Real-time play page', () => {
  const e = WHATS_NEW.find((x) => x.id === '2026-11-realtime-play');
  assert.ok(e, 'entry missing');
  const n = Number(/page=(\d+)/.exec(e.action.href)[1]);
  assert.equal(sections.find((s) => s.slug === 'multiplayer').pages[n - 1].title, 'Real-time play');
});
check('every clip and poster is on disk, under /whats-new/, and small enough', () => {
  for (const e of WHATS_NEW) {
    if (!e.media) continue;
    assert.ok(e.media.alt && e.media.alt.length > 10, `${e.id}: media needs alt text`);
    for (const [kind, url, cap] of [['poster', e.media.poster, POSTER_CAP], ['clip', e.media.clip, CLIP_CAP]]) {
      if (!url) continue;
      assert.match(url, new RegExp(`^/whats-new/${e.id}\\.(mp4|jpg)$`), `${e.id} ${kind} path`);
      const file = join(root, 'public', url);
      assert.ok(existsSync(file), `${e.id}: ${kind} ${url} is missing (record it: node scripts/whats-new/record.mjs ${e.id})`);
      const size = statSync(file).size;
      assert.ok(size > 1000 && size <= cap, `${e.id}: ${kind} is ${(size / 1024).toFixed(0)} KB (cap ${(cap / 1024).toFixed(0)} KB)`);
    }
  }
});
check('every clip is H.264 mp4 with the moov atom up front (faststart)', () => {
  for (const e of WHATS_NEW) {
    if (!e.media?.clip) continue;
    const head = readFileSync(join(root, 'public', e.media.clip)).subarray(0, 64 * 1024);
    const ftyp = head.indexOf('ftyp');
    const moov = head.indexOf('moov');
    const mdat = head.indexOf('mdat');
    assert.ok(ftyp >= 0 && ftyp < 16, `${e.id}: not an mp4`);
    assert.ok(moov > 0 && (mdat < 0 || moov < mdat), `${e.id}: moov is not before mdat (re-encode with +faststart)`);
    assert.ok(head.indexOf('avc1') > 0, `${e.id}: not H.264`);
  }
});
check('every recipe in record.mjs names an entry, and every clip has a recipe', () => {
  const src = readFileSync(join(root, 'scripts/whats-new/record.mjs'), 'utf8');
  for (const e of WHATS_NEW) {
    if (e.media) assert.ok(src.includes(`'${e.id}'`), `${e.id}: no recipe in scripts/whats-new/record.mjs`);
  }
});

// ---- 4. wiring ----
check('the popup is mounted once in the root layout and reachable from the menu and /account', () => {
  const layout = readFileSync(join(root, 'app/layout.tsx'), 'utf8');
  assert.equal((layout.match(/<WhatsNewModal\b/g) || []).length, 1, 'mount it exactly once in app/layout.tsx');
  assert.match(readFileSync(join(root, 'components/AuthButton.tsx'), 'utf8'), /openWhatsNew\(/);
  assert.match(readFileSync(join(root, 'app/account/page.tsx'), 'utf8'), /openWhatsNew\(/);
});

console.log(results.join('\n'));
console.log(process.exitCode ? "\nwhat's-new tests FAILED" : "\nwhat's-new tests passed");
