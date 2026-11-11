#!/usr/bin/env node
// A published game's own pictures and sounds (GET /api/games/[id]/assets,
// lib/game-assets.ts, the string-literal rules in lib/games-core.ts) on a real
// SQLite with every migration applied. What has to hold:
//   1. a name counts only as a whole string literal in the code ('hero',
//      "coin", `anim`, 'sound:boom'); comments do not count, template pieces do;
//   2. the route has the game's own access rule: a stranger, a student in
//      another class and (once the teacher hides the game) a classmate get 404;
//   3. a classmate gets only the publisher's items that the code uses AND that
//      are shared, not hidden, into a class the classmate sees the game
//      through; a deleted item never comes back; the publisher gets every used
//      item of their own;
//   4. `missing` names each used item the caller cannot see, and the play page
//      leaves out a built-in picture name (the catalog still draws one);
//   5. the bytes come from R2 and an object over the per-item cap is skipped;
//   6. the overlay puts the game's item over the player's own (meta included)
//      and locks those keys, or with ownWins only fills gaps;
//   7. no response carries an email.
// Run: node --import ./scripts/register-ts.mjs scripts/test-game-assets.mjs

import { join } from 'node:path';
import { compileHandler, makeD1, root } from './_d1-sqlite.mjs';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log(`PASS  ${name}`); }
  else { failed++; console.error(`FAIL  ${name}${detail !== undefined ? ' -- ' + JSON.stringify(detail).slice(0, 400) : ''}`); }
}
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const out = join(root, '.tmp', 'game-assets-test');
const publish = compileHandler('api/games/index.ts', join(out, 'a'));
const assetsFn = compileHandler('api/games/[id]/assets.ts', join(out, 'b'));
const mod = compileHandler('api/classes/[id]/game-shares/index.ts', join(out, 'c'));
const core = compileHandler('../lib/games-core.ts', join(out, 'd'));
const ga = compileHandler('../lib/game-assets.ts', join(out, 'e'));

// ---- 1. the string-literal rules ------------------------------------------
check('stringLiterals: quotes of all three kinds', eq(core.stringLiterals(`a = 'x'; b = "y"; c = \`z\`;`), ['x', 'y', 'z']));
check('stringLiterals: comments are skipped', eq(core.stringLiterals(`// 'no'\n/* "nope" */ k = 'yes' // 'later'`), ['yes']));
check('stringLiterals: a quote inside a comment does not open a string', eq(core.stringLiterals(`// don't\nt = 'hero';`), ['hero']));
check('stringLiterals: // inside a string is not a comment', eq(core.stringLiterals(`u = 'http://x'; v = 'w';`), ['http://x', 'w']));
check('stringLiterals: escapes keep the next character', eq(core.stringLiterals(`a = 'it\\'s'; b = "q\\"q";`), ["it's", 'q"q']));
check('stringLiterals: template text pieces, and strings inside ${}', eq(core.stringLiterals('t = `a${f("in", {k: 1})}b`;'), ['a', 'in', 'b']));
check('stringLiterals: an unterminated quote stops at the line end', eq(core.stringLiterals(`r = /'/;\ns = 'ok';`), ['ok']));
const lits = new Set(core.stringLiterals(`loadSound('sound:boom'); s.texture = 'hero';`));
check('usesItem: a bare name or the explicit store key', core.usesItem(lits, 'texture', 'hero') && core.usesItem(lits, 'sound', 'boom') && !core.usesItem(lits, 'texture', 'boom'));
check('usesItem: part of a longer string does not count', !core.usesItem(new Set(['heroes']), 'texture', 'hero'));
check('usedItems leaves out built-in picture names, but not a sound of that name',
  eq(core.usedItems(`x('coin'); y('hero')`, [{ kind: 'texture', name: 'coin' }, { kind: 'sound', name: 'coin' }, { kind: 'texture', name: 'hero' }], new Set(['coin'])),
    [{ kind: 'sound', name: 'coin' }, { kind: 'texture', name: 'hero' }]));
check('usedItems: a font named in textFont() is used, and so is an explicit font: key (2026-11-12)',
  eq(core.usedItems(`textFont('BigBlock'); x('font:Title')`, [{ kind: 'font', name: 'BigBlock' }, { kind: 'font', name: 'Title' }, { kind: 'font', name: 'Unused' }]),
    [{ kind: 'font', name: 'BigBlock' }, { kind: 'font', name: 'Title' }]));

// ---- the world -------------------------------------------------------------
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
for (const [email, first, last] of [['ana@s.test', 'Ana', 'Lopez'], ['ben@s.test', 'Ben', 'Diaz'], ['out@s.test', 'Out', 'Sider'], ['lone@s.test', 'Lone', 'Wolf']]) {
  sql(`INSERT INTO students (email, password_hash, created_at, role, first_name, last_name) VALUES (?, 'x', ?, 'student', ?, ?)`, email, now, first, last);
}
for (const [id, name, code, owner] of [['C1', 'Period 1', 'AAAAAA', 't1@s.test'], ['C2', 'Period 2', 'BBBBBB', 't2@s.test'], ['C3', 'Club', 'CCCCCC', 't2@s.test']]) {
  sql(`INSERT INTO classes (id, name, code, owner_email, school_year, created_at) VALUES (?, ?, ?, ?, '2026-2027', ?)`, id, name, code, owner, now);
}
// Ana and Ben share Period 1 and the Club; the game is shared into Period 1 only.
for (const [c, e] of [['C1', 'ana@s.test'], ['C1', 'ben@s.test'], ['C3', 'ana@s.test'], ['C3', 'ben@s.test'], ['C2', 'out@s.test']]) {
  sql(`INSERT INTO enrollments (class_id, student_email, enrolled_at, expires_at) VALUES (?, ?, ?, ?)`, c, e, now, FAR);
}
const ANA = { email: 'ana@s.test', role: 'student' };
const BEN = { email: 'ben@s.test', role: 'student' };
const OUT = { email: 'out@s.test', role: 'student' };
const LONE = { email: 'lone@s.test', role: 'student' };
const T1 = { email: 't1@s.test', role: 'teacher' };

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAwS2OUAAAAABJRU5ErkJggg==';
const WAV = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
let n = 0;
const items = {};
function item(owner, kind, name, { shareIn = [], hiddenIn = [], deleted = false, meta = null, data } = {}) {
  const id = (++n).toString(16).padStart(32, '0');
  const uri = data ?? (kind === 'texture' ? PNG : WAV);
  sql(`INSERT INTO library_items (id, owner_email, kind, name, bytes, mime, meta, hash, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'h', ?, ?)`,
    id, owner, kind, name, uri.length, kind === 'texture' ? 'image/png' : 'audio/wav', meta, now, deleted ? now : null);
  r2.set(`library/${id}`, uri);
  for (const c of shareIn) sql(`INSERT INTO library_shares (item_id, class_id, shared_at, hidden_at) VALUES (?, ?, ?, ?)`, id, c, now, hiddenIn.includes(c) ? now : null);
  items[name] = id;
  return id;
}
const ANIM_META = JSON.stringify({ frames: 4, frameDelay: 6, delays: null });
item('ana@s.test', 'texture', 'hero', { shareIn: ['C1'] });
item('ana@s.test', 'texture', 'coinArt', { shareIn: ['C1'], hiddenIn: ['C1'] }); // a teacher hid it
item('ana@s.test', 'sound', 'jump');                                              // never shared
item('ana@s.test', 'texture', 'ghost', { shareIn: ['C1'], deleted: true });       // deleted
item('ana@s.test', 'texture', 'unused', { shareIn: ['C1'] });                     // not in the code
item('ana@s.test', 'texture', 'inComment', { shareIn: ['C1'] });                  // only in a comment
item('ana@s.test', 'sound', 'boom', { shareIn: ['C1'] });                         // used as 'sound:boom'
item('ana@s.test', 'texture', 'anim', { shareIn: ['C1'], meta: ANIM_META });      // an animation
item('ana@s.test', 'texture', 'player');                                          // a built-in name, not shared
item('ana@s.test', 'texture', 'side', { shareIn: ['C3'] });                       // shared, but not where the game is
item('ana@s.test', 'texture', 'big', { shareIn: ['C1'], data: 'data:image/png;base64,' + 'A'.repeat(70 * 1024) });
item('ben@s.test', 'texture', 'benHero', { shareIn: ['C1'] });                    // someone else's item

const CODE = `// s.texture = 'inComment'
/* loadSound('unused') */
function setup() {
  new Canvas(200, 200);
  let s = new Sprite();
  s.texture = 'hero';
  s.texture = "coinArt";
  loadSound('jump').play();
  loadSound('sound:boom');
  s.texture = \`anim\`;
  s.texture = 'ghost'; s.texture = 'player'; s.texture = 'side'; s.texture = 'big'; s.texture = 'benHero';
}
`;

const req = (url, method = 'GET', body) => new Request(`https://x.test${url}`, {
  method, body: body === undefined ? undefined : JSON.stringify(body), headers: { 'Content-Type': 'application/json' },
});
const seenBodies = [];
async function call(fn, user, url, params = {}, method, body) {
  const res = await fn({ env, data: user, params, request: req(url, method, body) });
  const text = await res.text();
  seenBodies.push({ url, user: user.email, text });
  return { status: res.status, body: JSON.parse(text) };
}
const get = (user, id) => call(assetsFn.onRequestGet, user, `/api/games/${id}/assets`, { id });
const names = (b) => (b.assets ?? []).map((a) => `${a.kind}:${a.name}`).sort();

let r = await call(publish.onRequestPost, ANA, '/api/games', {}, 'POST', { title: 'Hero Run', code: CODE });
const gid = r.body.game?.id;
check('Ana publishes the game', r.status === 201 && /^[0-9a-f]{32}$/.test(gid), r);

// ---- 2. access, before the game is shared ---------------------------------
r = await get(BEN, gid);
check('an unshared game is 404 to a classmate', r.status === 404, r);
r = await get(ANA, 'nothex');
check('a malformed id is 404', r.status === 404, r);

sql(`INSERT INTO library_game_shares (game_id, class_id, shared_at) VALUES (?, 'C1', ?)`, gid, now);

r = await get(OUT, gid);
check('a student in another class gets 404', r.status === 404, r);
r = await get(LONE, gid);
check('a stranger in no class gets 404', r.status === 404, r);

// ---- 3 + 4. a classmate -----------------------------------------------------
r = await get(BEN, gid);
check('a classmate gets only shared, used, live items of the publisher',
  r.status === 200 && eq(names(r.body), ['sound:boom', 'texture:anim', 'texture:hero']), r.body.assets?.map((a) => a.name));
check('missing: hidden, never shared, and shared only where the game is not',
  eq(r.body.missing, ['coinArt', 'jump', 'player', 'side']), r.body.missing);
check('missingItems carries each kind',
  r.body.missingItems.some((m) => m.kind === 'sound' && m.name === 'jump') && r.body.missingItems.some((m) => m.kind === 'texture' && m.name === 'player'), r.body.missingItems);
check('a deleted item is neither served nor missing', !names(r.body).includes('texture:ghost') && !r.body.missing.includes('ghost'));
check('an item only in a comment, or not in the code, is not served', !names(r.body).some((x) => /inComment|unused/.test(x)));
check("another student's item of a used name is never served", !names(r.body).includes('texture:benHero') && !r.body.missing.includes('benHero'));
check('an R2 object over the per-item cap is skipped', !names(r.body).includes('texture:big'));
const hero = r.body.assets.find((a) => a.name === 'hero');
const anim = r.body.assets.find((a) => a.name === 'anim');
check('bytes come from R2 as the data URI, with the sniffed type', hero?.data === PNG && hero?.type === 'image/png' && hero?.meta === null && hero?.frames === undefined, hero);
check('an animation carries its meta and frame count', anim?.meta === ANIM_META && anim?.frames === 4, anim);
check('the play note leaves out a built-in picture name',
  eq(ga.missingToShow(r.body.missingItems, new Set(['player', 'coin'])), ['coinArt', 'jump', 'side']));
check('listWords reads as a sentence', ga.listWords(['a']) === 'a' && ga.listWords(['a', 'b']) === 'a and b' && ga.listWords(['a', 'b', 'c']) === 'a, b, and c');

// "Just use" (share_choice 'play', migration 0045) stops a copy, never the author's game.
sql(`UPDATE library_items SET share_choice = 'play' WHERE owner_email = 'ana@s.test'`);
r = await get(BEN, gid);
check('just-use items are still served for the author\'s game', r.status === 200 && eq(names(r.body), ['sound:boom', 'texture:anim', 'texture:hero']), r.body.assets?.map((a) => a.name));
sql(`UPDATE library_items SET share_choice = 'credit' WHERE owner_email = 'ana@s.test'`);

// ---- the publisher ----------------------------------------------------------
r = await get(ANA, gid);
check('the publisher gets every used live item of their own, shared or not',
  r.status === 200 && eq(names(r.body), ['sound:boom', 'sound:jump', 'texture:anim', 'texture:coinArt', 'texture:hero', 'texture:player', 'texture:side']) && r.body.missing.length === 0, r.body);

// ---- the teacher, and a hidden game ----------------------------------------
r = await get(T1, gid);
check('the class teacher sees the shared items (a hidden item stays out)', r.status === 200 && eq(names(r.body), ['sound:boom', 'texture:anim', 'texture:hero']) && r.body.missing.includes('coinArt'), r.body);
r = await call(mod.onRequestPost, T1, '/api/classes/C1/game-shares', { id: 'C1' }, 'POST', { gameId: gid, action: 'hide' });
check('the teacher hides the game', r.status === 200, r);
r = await get(BEN, gid);
check('then the classmate gets 404 for its assets too', r.status === 404, r);
r = await get(T1, gid);
check('the teacher still gets them for the hidden game', r.status === 200 && names(r.body).includes('texture:hero'), r.body);

// ---- a game with no own items ----------------------------------------------
r = await call(publish.onRequestPost, ANA, '/api/games', {}, 'POST', { title: 'Plain', code: "function setup(){ new Sprite().texture = 'coin'; }" });
r = await get(ANA, r.body.game.id);
check('a game that uses none answers empty lists', r.status === 200 && eq(r.body, { assets: [], missing: [], missingItems: [] }), r.body);

// ---- 6. the overlay ---------------------------------------------------------
const own = {
  'texture:hero': JSON.stringify('data:image/png;base64,MINE'),
  'texmeta:hero': JSON.stringify({ frames: 3, frameDelay: 4 }),
  'save:score': '12',
};
const gameAssets = [
  { kind: 'texture', name: 'hero', type: 'image/png', data: PNG, meta: null },
  { kind: 'sound', name: 'boom', type: 'audio/wav', data: WAV, meta: '{"kind":"sfx"}' },
];
let m = ga.mergeAssets(own, gameAssets);
check("the game's picture wins over the player's own of the same name", m.store['texture:hero'] === JSON.stringify(PNG));
check("and the player's animation meta is dropped for the game's still", !('texmeta:hero' in m.store));
check('sounds go under sound: with their meta', m.store['sound:boom'] === JSON.stringify(WAV) && m.store['sndmeta:boom'] === '{"kind":"sfx"}');
check("the player's own saves are untouched", m.store['save:score'] === '12');
check('the store passed in is not changed', own['texture:hero'] === JSON.stringify('data:image/png;base64,MINE') && !('sound:boom' in own));
check('every game key is locked against saves', eq([...m.locked].sort(), ['sndmeta:boom', 'sound:boom', 'texmeta:hero', 'texture:hero']));
m = ga.mergeAssets(own, gameAssets, true);
check("ownWins: the publisher's own copy here stays", m.store['texture:hero'] === own['texture:hero'] && m.store['texmeta:hero'] === own['texmeta:hero']);
check('ownWins: a missing one is filled in, and only it is locked', m.store['sound:boom'] === JSON.stringify(WAV) && eq([...m.locked].sort(), ['sndmeta:boom', 'sound:boom']));
m = ga.mergeAssets(own, undefined);
check('no assets: the store is exactly the player\'s', eq(m.store, own) && m.locked.size === 0);
check('metaFrames reads a double-encoded meta', ga.metaFrames(JSON.stringify(ANIM_META)) === 4 && ga.metaFrames(null) === undefined && ga.metaFrames('junk') === undefined);

// ---- 7. no emails -----------------------------------------------------------
const leaks = seenBodies.filter((b) => /@s\.test/.test(b.text));
check('no response carries an email', leaks.length === 0, leaks.slice(0, 2));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
