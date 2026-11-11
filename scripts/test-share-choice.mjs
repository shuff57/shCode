#!/usr/bin/env node
// Sharing choices and remix credit (lib/share-choice.ts, migration 0045) on a
// real SQLite with every migration applied. What has to hold:
//   1. the pure rules: a missing or unknown choice is 'credit'; only 'play'
//      blocks remixing; only 'open' holds a remix to 'open'; the credit chain
//      keeps the FIRST original; the last-choice memory is per account and
//      never stores an email;
//   2. games: the default is 'credit'; a "just play" game still hands its code
//      to a classmate (it must run) but says canRemix:false, and publishing a
//      remix of it is refused (403); a remix of a "keep remixes open" game is
//      'open' by default and any other choice is refused (400) on publish, on
//      update and on share; provenance comes from the original's row (title,
//      first name + last initial, choice), a remix of a remix keeps the first;
//      an unknown or own id records nothing;
//   3. pictures and sounds: GET /api/library/shared/[id] refuses a "just use"
//      item to a classmate (403 + a plain sentence) but serves ?preview=1, its
//      owner and a teacher of the class; GET /api/games/[id]/assets still
//      serves it for the author's game; a copy's first upload records the
//      provenance, a later save keeps it, a fresh save after a delete drops it;
//      a copy of a "keep remixes open" item is held to 'open' on share;
//   4. rows made the old way (no choice written) behave as 'credit';
//   5. no response carries an email.
// Run: node --import ./scripts/register-ts.mjs scripts/test-share-choice.mjs

import { join } from 'node:path';
import { compileHandler, makeD1, root } from './_d1-sqlite.mjs';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log(`PASS  ${name}`); }
  else { failed++; console.error(`FAIL  ${name}${detail !== undefined ? ' -- ' + JSON.stringify(detail).slice(0, 500) : ''}`); }
}
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const out = join(root, '.tmp', 'share-choice-test');
const sc = compileHandler('../lib/share-choice.ts', join(out, 'a'));
const games = compileHandler('api/games/index.ts', join(out, 'b'));
const game = compileHandler('api/games/[id].ts', join(out, 'c'));
const gameShare = compileHandler('api/games/[id]/share.ts', join(out, 'd'));
const gamesShared = compileHandler('api/games/shared/index.ts', join(out, 'e'));
const assets = compileHandler('api/games/[id]/assets.ts', join(out, 'f'));
const lib = compileHandler('api/library/index.ts', join(out, 'g'));
const libOne = compileHandler('api/library/[id].ts', join(out, 'h'));
const libShare = compileHandler('api/library/[id]/share.ts', join(out, 'i'));
const libShared = compileHandler('api/library/shared/index.ts', join(out, 'j'));
const libSharedOne = compileHandler('api/library/shared/[id].ts', join(out, 'k'));

// ---- 1. the pure rules -------------------------------------------------------
check('choiceOf: missing, null and unknown are credit', sc.choiceOf(undefined) === 'credit' && sc.choiceOf(null) === 'credit' && sc.choiceOf('banana') === 'credit');
check('choiceOf keeps the four', ['play', 'credit', 'open', 'free'].every((c) => sc.choiceOf(c) === c));
check('canRemix: only play blocks', !sc.canRemix('play') && sc.canRemix('credit') && sc.canRemix('open') && sc.canRemix('free') && sc.canRemix(undefined));
check('requiredChoice: only open holds a remix', sc.requiredChoice('open') === 'open' && sc.requiredChoice('credit') === null && sc.requiredChoice(null) === null);
const P = { id: 'p1', title: 'Plane', author: 'Sam W.', choice: 'open', first: null };
check('decideChoice: nothing asked, no remix -> credit', eq(sc.decideChoice(undefined, null), { choice: 'credit' }));
check('decideChoice: nothing asked, remix of open -> open', eq(sc.decideChoice(undefined, P), { choice: 'open' }));
check('decideChoice: remix of open asking free -> the plain reason, locked to open',
  eq(sc.decideChoice('free', P), { error: 'This is a remix of Plane by Sam W., who asked that remixes stay open.', lockedTo: 'open' }));
check('decideChoice: a bad value is refused', 'error' in sc.decideChoice('banana', null));
check('decideChoice: remix of credit may pick anything', eq(sc.decideChoice('play', { ...P, choice: 'credit' }), { choice: 'play' }));
const second = sc.provenanceOf({ id: 'g2', title: 'Plane 2', author: 'Ben D.', choice: 'open', provenance: P });
check('provenanceOf: a remix of a remix keeps the first credit', eq(second.first, { id: 'p1', title: 'Plane', author: 'Sam W.' }) && second.id === 'g2');
const third = sc.provenanceOf({ id: 'g3', title: 'Plane 3', author: 'Cy K.', choice: 'credit', provenance: second });
check('provenanceOf: the first stays the first after three steps', eq(third.first, { id: 'p1', title: 'Plane', author: 'Sam W.' }));
check('creditLine with and without a first', sc.creditLine(P) === 'Remixed from Plane by Sam W.'
  && sc.creditLine(second) === 'Remixed from Plane 2 by Ben D. (first made as Plane by Sam W.)', sc.creditLine(second));
check('provenanceFromRow: an old row (no columns) is not a remix', sc.provenanceFromRow({}) === null && sc.provenanceFromRow(null) === null);
check('provenanceToRow / FromRow round trip', eq(sc.provenanceFromRow(sc.provenanceToRow(second)), second));
check('parseProvenance refuses junk', sc.parseProvenance('x') === null && sc.parseProvenance({ id: 'a' }) === null);
const mem = new Map();
const store = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
check('last choice: credit until one is made', sc.readLastChoice('game', 'ana@s.test', store) === 'credit');
sc.writeLastChoice('game', 'ana@s.test', 'free', store);
sc.writeLastChoice('art', 'ben@s.test', 'play', store);
check('last choice: per account and per kind', sc.readLastChoice('game', 'ana@s.test', store) === 'free'
  && sc.readLastChoice('art', 'ana@s.test', store) === 'credit' && sc.readLastChoice('art', 'ben@s.test', store) === 'play'
  && sc.readLastChoice('game', 'ben@s.test', store) === 'credit');
check('last choice: no email is stored', ![...mem.values()].some((v) => v.includes('@')));
check('the UI words have no licence jargon', !/licen[cs]e|creative commons|copyleft|cc by/i.test(JSON.stringify([sc.CHOICE_TEXT, sc.OPEN_SOURCE_LINE, sc.JUST_PLAY_NOTE])));

// ---- the world -------------------------------------------------------------------
const db = makeD1();
const r2 = new Map();
const env = { DB: db, UPLOADS: {
  async put(k, v) { r2.set(k, String(v)); },
  async get(k) { return r2.has(k) ? { text: async () => r2.get(k) } : null; },
  async delete(k) { r2.delete(k); },
} };
const now = Date.now();
const FAR = now + 1e10;
const sql = (q, ...a) => db.sqlite.prepare(q).run(...a);
for (const [email, first, last] of [['ana@s.test', 'Ana', 'Lopez'], ['ben@s.test', 'Ben', 'Diaz'], ['cy@s.test', 'Cy', 'Kim']]) {
  sql(`INSERT INTO students (email, password_hash, created_at, role, first_name, last_name) VALUES (?, 'x', ?, 'student', ?, ?)`, email, now, first, last);
}
sql(`INSERT INTO classes (id, name, code, owner_email, school_year, created_at) VALUES ('C1', 'Period 1', 'AAAAAA', 't1@s.test', '2026-2027', ?)`, now);
for (const e of ['ana@s.test', 'ben@s.test', 'cy@s.test']) {
  sql(`INSERT INTO enrollments (class_id, student_email, enrolled_at, expires_at) VALUES ('C1', ?, ?, ?)`, e, now, FAR);
}
const ANA = { email: 'ana@s.test', role: 'student' };
const BEN = { email: 'ben@s.test', role: 'student' };
const CY = { email: 'cy@s.test', role: 'student' };
const T1 = { email: 't1@s.test', role: 'teacher' };

const bodies = [];
const req = (url, method = 'GET', body) => new Request(`https://x.test${url}`, {
  method, body: body === undefined ? undefined : JSON.stringify(body), headers: { 'Content-Type': 'application/json' },
});
async function call(fn, user, url, params = {}, method, body) {
  const res = await fn({ env, data: user, params, request: req(url, method, body) });
  const text = await res.text();
  bodies.push({ url, user: user.email, text });
  return { status: res.status, body: JSON.parse(text) };
}
const CODE = `function setup() { new Canvas(200, 200); s = new Sprite(); s.texture = 'hero'; }\n`;
const publish = (u, body) => call(games.onRequestPost, u, '/api/games', {}, 'POST', { code: CODE, ...body });
const getG = (u, id) => call(game.onRequestGet, u, `/api/games/${id}`, { id });
const shareG = (u, id, body) => call(gameShare.onRequestPost, u, `/api/games/${id}/share`, { id }, 'POST', body);

// ---- 2. games ------------------------------------------------------------------------
let r = await publish(ANA, { title: 'Kite' });
const kite = r.body.game.id;
check('a game with no choice is credit', r.status === 201 && r.body.game.choice === 'credit' && r.body.game.remixedFrom === null, r);
r = await publish(ANA, { title: 'Bad', choice: 'banana' });
check('an unknown choice is refused (400)', r.status === 400, r);

r = await publish(ANA, { title: 'Plane', choice: 'open' });
const plane = r.body.game.id;
check('Ana publishes Plane as keep-remixes-open', r.status === 201 && r.body.game.choice === 'open', r);
r = await shareG(ANA, plane, { share: true });
check('sharing keeps the choice when none is sent', r.status === 200 && r.body.choice === 'open', r);
await shareG(ANA, kite, { share: true });

r = await getG(BEN, plane);
check('Ben opens Plane: open, remixable, code included', r.status === 200 && r.body.game.choice === 'open' && r.body.game.canRemix === true && r.body.game.code === CODE, r);

r = await publish(BEN, { title: 'Plane remix', remixedFrom: plane, choice: 'credit' });
check('a remix of an open game asking credit is refused (400) with the reason', r.status === 400
  && r.body.error === 'This is a remix of Plane by Ana L., who asked that remixes stay open.' && r.body.lockedTo === 'open', r);
r = await publish(BEN, { title: 'Plane 2', remixedFrom: plane });
const plane2 = r.body.game.id;
check('a remix of an open game with no choice is open, with the credit from the original',
  r.status === 201 && r.body.game.choice === 'open'
  && eq(r.body.game.remixedFrom, { id: plane, title: 'Plane', author: 'Ana L.', choice: 'open', first: null }), r);
r = await call(games.onRequestPost, BEN, '/api/games', {}, 'POST', { id: plane2, title: 'Plane 2', code: CODE, choice: 'free' });
check('updating that remix to free is refused (400)', r.status === 400 && r.body.lockedTo === 'open', r);
r = await call(games.onRequestPost, BEN, '/api/games', {}, 'POST', { id: plane2, title: 'Plane 2!', code: CODE, remixedFrom: kite });
check('an update keeps its credit and its choice (remixedFrom is ignored)', r.status === 200 && r.body.game.choice === 'open' && r.body.game.remixedFrom.id === plane, r);
r = await shareG(BEN, plane2, { share: true, choice: 'credit' });
check('sharing that remix as credit is refused (400)', r.status === 400 && r.body.lockedTo === 'open', r);
r = await shareG(BEN, plane2, { share: true, choice: 'open' });
check('sharing it as open is fine', r.status === 200 && r.body.choice === 'open', r);

r = await publish(CY, { title: 'Plane 3', remixedFrom: plane2 });
check('a remix of a remix keeps the first credit (and stays open)', r.status === 201 && r.body.game.choice === 'open'
  && r.body.game.remixedFrom.title === 'Plane 2!' && r.body.game.remixedFrom.author === 'Ben D.'
  && eq(r.body.game.remixedFrom.first, { id: plane, title: 'Plane', author: 'Ana L.' }), r);

r = await publish(BEN, { title: 'Kite remix', remixedFrom: kite, choice: 'free' });
check('a remix of a credit game may pick any choice', r.status === 201 && r.body.game.choice === 'free' && r.body.game.remixedFrom.choice === 'credit', r);
r = await publish(BEN, { title: 'Stray', remixedFrom: 'f'.repeat(32) });
check('an unknown original records nothing', r.status === 201 && r.body.game.remixedFrom === null && r.body.game.choice === 'credit', r);
// A remix of a built-in course game (lib/builtin-games.ts): the credit comes from that list, in full.
r = await publish(BEN, { title: 'Paddle Rally remix', remixedFrom: 'builtin-paddle-rally' });
check('a remix of a built-in course game is credited to its author from the built-in list',
  r.status === 201 && r.body.game.choice === 'credit'
  && eq(r.body.game.remixedFrom, { id: 'builtin-paddle-rally', title: 'Paddle Rally', author: 'Steven Huff', choice: 'credit', first: null }), r);
r = await publish(BEN, { title: 'Trail remix', remixedFrom: 'builtin-trail' });
check('a play-only lesson game or an unknown built-in records nothing', r.status === 201 && r.body.game.remixedFrom === null, r);
r = await publish(BEN, { title: 'Fake', remixedFrom: 'builtin-nope' });
check('an unknown built-in records nothing', r.status === 201 && r.body.game.remixedFrom === null, r);
r = await publish(ANA, { title: 'Kite again', remixedFrom: kite });
check('your own game is not a remix of someone else', r.status === 201 && r.body.game.remixedFrom === null, r);

r = await publish(ANA, { title: 'Secret', choice: 'play' });
const secret = r.body.game.id;
await shareG(ANA, secret, { share: true });
r = await getG(BEN, secret);
check('a just-play game still gives a classmate its code, with canRemix false', r.status === 200 && r.body.game.code === CODE
  && r.body.game.canRemix === false && r.body.game.choice === 'play', r);
r = await getG(ANA, secret);
check('the owner of a just-play game may still remix it', r.body.game.canRemix === true, r);
r = await publish(BEN, { title: 'Secret remix', remixedFrom: secret });
check('publishing a remix of a just-play game is refused (403) in plain words', r.status === 403
  && r.body.error === 'Ana L. asked that "Secret" be just played, so it can\'t be remixed.', r);

r = await call(gamesShared.onRequestGet, CY, '/api/games/shared');
const byTitle = Object.fromEntries(r.body.games.map((g) => [g.title, g]));
check('the class list carries each choice and credit', byTitle.Secret?.choice === 'play' && byTitle['Plane 2!']?.choice === 'open'
  && byTitle['Plane 2!']?.remixedFrom?.author === 'Ana L.' && byTitle.Kite?.choice === 'credit', r.body.games.map((g) => [g.title, g.choice]));
r = await call(games.onRequestGet, BEN, '/api/games');
check('My games carries each choice and credit', r.body.games.some((g) => g.id === plane2 && g.choice === 'open' && g.remixedFrom?.title === 'Plane'), r);

// ---- 4. a row made the old way -------------------------------------------------------
sql(`INSERT INTO library_games (id, owner_email, title, code, mode, players, created_at, updated_at) VALUES (?, 'ana@s.test', 'Old', ?, 'none', 1, ?, ?)`, 'a'.repeat(32), CODE, now, now);
sql(`INSERT INTO library_game_shares (game_id, class_id, shared_at) VALUES (?, 'C1', ?)`, 'a'.repeat(32), now);
r = await getG(BEN, 'a'.repeat(32));
check('a game written without a choice is credit, remixable, not a remix', r.body.game.choice === 'credit' && r.body.game.canRemix === true && r.body.game.remixedFrom === null, r);
r = await publish(BEN, { title: 'Old remix', remixedFrom: 'a'.repeat(32) });
check('a remix of an old game records it and defaults to credit', r.status === 201 && r.body.game.choice === 'credit' && r.body.game.remixedFrom.choice === 'credit', r);

// ---- 3. pictures and sounds ----------------------------------------------------------
const PNG = 'data:image/png;base64,' + Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48]).toString('base64');
const PNG2 = 'data:image/png;base64,' + Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]).toString('base64');
const put = (u, body) => call(lib.onRequestPut, u, '/api/library', {}, 'PUT', { kind: 'texture', dataUri: PNG, meta: null, ...body });
const shareI = (u, id, body) => call(libShare.onRequestPost, u, `/api/library/${id}/share`, { id }, 'POST', body);
const sharedOne = (u, id, q = '') => call(libSharedOne.onRequestGet, u, `/api/library/shared/${id}${q}`, { id });

r = await put(ANA, { name: 'hero' });
const hero = r.body.item.id;
check('a new picture is credit', r.status === 201 && r.body.item.choice === 'credit' && r.body.item.remixedFrom === null, r);
r = await shareI(ANA, hero, { share: true, choice: 'play' });
check('Ana shares hero as just use', r.status === 200 && r.body.choice === 'play', r);
r = await call(libShared.onRequestGet, BEN, '/api/library/shared');
const heroRow = r.body.items.find((i) => i.id === hero);
check('the class list marks it: just use, cannot copy', heroRow?.choice === 'play' && heroRow?.canCopy === false, r);
r = await sharedOne(BEN, hero);
check('Copy to mine of a just-use item is refused (403) in plain words', r.status === 403 && r.body.justUse === true
  && r.body.error === 'Ana L. asked that "hero" be just used in their games, so it can\'t be copied.' && !('dataUri' in r.body), r);
r = await sharedOne(BEN, hero, '?preview=1');
check('?preview=1 still shows it, marked canCopy false', r.status === 200 && r.body.dataUri === PNG && r.body.canCopy === false, r);
r = await sharedOne(T1, hero);
check('a teacher of the class still gets it (moderation)', r.status === 200 && r.body.dataUri === PNG, r);
r = await sharedOne(ANA, hero);
check('the owner still gets it', r.status === 200 && r.body.canCopy === true, r);
r = await call(assets.onRequestGet, BEN, `/api/games/${kite}/assets`, { id: kite });
check("a just-use picture is still served for the author's game", r.status === 200 && r.body.assets.some((a) => a.name === 'hero' && a.data === PNG), r);
r = await put(BEN, { name: 'heroCopy', remixedFrom: hero });
check('an upload naming a just-use original still saves (the copy was refused earlier, not the sync)', r.status === 201, r);

r = await put(ANA, { name: 'coin' });
const coin = r.body.item.id;
await shareI(ANA, coin, { share: true, choice: 'open' });
r = await sharedOne(BEN, coin);
check('an open item can be copied', r.status === 200 && r.body.canCopy === true && r.body.choice === 'open', r);
r = await put(BEN, { name: 'coin', remixedFrom: coin });
const bcoin = r.body.item.id;
const bcoinHash = r.body.item.hash;
check("the copy's first upload records the credit from the original and is held open",
  r.status === 201 && r.body.item.choice === 'open'
  && eq(r.body.item.remixedFrom, { id: coin, title: 'coin', author: 'Ana L.', choice: 'open', first: null }), r);
r = await shareI(BEN, bcoin, { share: true, choice: 'credit' });
check('sharing that copy as credit is refused (400)', r.status === 400 && r.body.lockedTo === 'open'
  && r.body.error === 'This is a remix of coin by Ana L., who asked that remixes stay open.', r);
r = await shareI(BEN, bcoin, { share: true });
check('sharing it with no choice keeps open', r.status === 200 && r.body.choice === 'open', r);
r = await put(BEN, { name: 'coin', dataUri: PNG2, baseHash: bcoinHash });
check('a later save keeps the credit (and ignores a missing remixedFrom)', r.status === 200 && r.body.item.remixedFrom?.id === coin && r.body.item.choice === 'open', r);
r = await call(lib.onRequestGet, BEN, '/api/library');
check('the account list carries the credit to every device', r.body.items.some((i) => i.name === 'coin' && i.remixedFrom?.author === 'Ana L.' && i.choice === 'open'), r);
r = await put(CY, { name: 'coin', remixedFrom: bcoin });
check('a copy of a copy keeps the first credit', r.status === 201 && r.body.item.remixedFrom.author === 'Ben D.'
  && eq(r.body.item.remixedFrom.first, { id: coin, title: 'coin', author: 'Ana L.' }) && r.body.item.choice === 'open', r);
r = await call(libShared.onRequestGet, CY, '/api/library/shared');
check('the class list shows a shared copy with its credit', r.body.items.some((i) => i.id === bcoin && i.remixedFrom?.title === 'coin'), r);

const cur = (await call(lib.onRequestGet, BEN, '/api/library')).body.items.find((i) => i.name === 'coin');
r = await call(libOne.onRequestDelete, BEN, `/api/library/${bcoin}`, { id: bcoin }, 'DELETE');
check('Ben deletes his copy', r.status === 200 && !!cur, r);
r = await put(BEN, { name: 'coin' });
check('a fresh save under that name is his own work again', r.body.item.remixedFrom === null && r.body.item.choice === 'credit', r);

r = await put(ANA, { name: 'gem' });
const gem = r.body.item.id;
await shareI(ANA, gem, { share: true });
r = await put(BEN, { name: 'gem', remixedFrom: gem });
check('a copy of a credit item defaults to credit and may be free', r.body.item.choice === 'credit'
  && (await shareI(BEN, r.body.item.id, { share: true, choice: 'free' })).body.choice === 'free', r);

sql(`INSERT INTO library_items (id, owner_email, kind, name, bytes, mime, meta, hash, updated_at) VALUES (?, 'ana@s.test', 'texture', 'oldpic', 10, 'image/png', NULL, 'h', ?)`, 'b'.repeat(32), now);
r2.set('library/' + 'b'.repeat(32), PNG);
sql(`INSERT INTO library_shares (item_id, class_id, shared_at) VALUES (?, 'C1', ?)`, 'b'.repeat(32), now);
r = await sharedOne(BEN, 'b'.repeat(32));
check('an item written without a choice is credit and copyable', r.status === 200 && r.body.choice === 'credit' && r.body.canCopy === true && r.body.remixedFrom === null, r);

// ---- 5. no emails -------------------------------------------------------------------
const leaked = bodies.filter((b) => /@s\.test/.test(b.text));
check('no response carries an email', leaked.length === 0, leaked.map((b) => b.url));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
