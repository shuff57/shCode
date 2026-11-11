#!/usr/bin/env node
// A teacher deleting what a student made (functions/api/classes/[id]/library-delete.ts,
// game-delete.ts, clear-library.ts; rules in functions/_shared/libraryDelete.ts), on a
// real SQLite with every migration and an R2 stub. What has to hold:
//   1. a teacher (owner or co-teacher) or an admin deletes a picture, sound or game ONLY
//      when it is shared into their class by a student enrolled in it now; a teacher of
//      another class, a student, an unshared item, a teacher's own item and a former
//      student's item are refused;
//   2. a delete is the owner's delete: a tombstone the student's other devices see, every
//      share gone, the R2 object removed;
//   3. clear-library tombstones every item and game, deletes every upload row, removes
//      every R2 object, unshares everything, answers the counts, and touches nobody else;
//      it refuses a teacher or admin account, a student not in the class, and a student caller;
//   4. the moderation lists say which rows can be deleted (canDelete).
// Run: node --import ./scripts/register-ts.mjs scripts/test-library-delete.mjs

import { join } from 'node:path';
import { compileHandler, makeD1, root } from './_d1-sqlite.mjs';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log(`PASS  ${name}`); }
  else { failed++; console.error(`FAIL  ${name}${detail !== undefined ? ' -- ' + JSON.stringify(detail) : ''}`); }
}

const out = join(root, '.tmp', 'library-delete-test');
const lib = compileHandler('api/library/index.ts', join(out, 'a'));
const libDel = compileHandler('api/classes/[id]/library-delete.ts', join(out, 'b'));
const gameDel = compileHandler('api/classes/[id]/game-delete.ts', join(out, 'c'));
const clear = compileHandler('api/classes/[id]/clear-library.ts', join(out, 'd'));
const libMod = compileHandler('api/classes/[id]/library-shares/index.ts', join(out, 'e'));
const gameMod = compileHandler('api/classes/[id]/game-shares/index.ts', join(out, 'f'));
const shared = compileHandler('api/library/shared/index.ts', join(out, 'g'));

const db = makeD1();
const r2 = new Map();
const r2Deletes = [];
const env = { DB: db, UPLOADS: {
  async put(k, v) { r2.set(k, String(v)); },
  async get(k) { return r2.has(k) ? { text: async () => r2.get(k) } : null; },
  // The real binding takes one key or an array of up to 1000.
  async delete(k) { for (const key of [].concat(k)) { r2Deletes.push(key); r2.delete(key); } },
} };
const now = Date.now();
const FAR = now + 1e10;
const sql = (q, ...a) => db.sqlite.prepare(q).run(...a);
const one = (q, ...a) => db.sqlite.prepare(q).get(...a);

for (const [email, role, first, last] of [
  ['sam@s.test', 'student', 'Sam', 'Wu'], ['ben@s.test', 'student', 'Ben', 'Ng'], ['old@s.test', 'student', 'Old', 'Timer'],
  ['out@s.test', 'student', 'Out', 'Sider'], ['t1@s.test', 'teacher', 'Tess', 'One'], ['co@s.test', 'teacher', 'Cole', 'Co'],
  ['t2@s.test', 'teacher', 'Tom', 'Two'], ['adm@s.test', 'admin', 'Ada', 'Min'], ['tst@s.test', 'teacher', 'Tina', 'Enrolled'],
]) {
  sql(`INSERT INTO students (email, password_hash, created_at, role, first_name, last_name) VALUES (?, 'x', ?, ?, ?, ?)`, email, now, role, first, last);
}
sql(`INSERT INTO classes (id, name, code, owner_email, school_year, created_at) VALUES ('C1', 'Period 1', 'AAAAAA', 't1@s.test', '2026-2027', ?)`, now);
sql(`INSERT INTO classes (id, name, code, owner_email, school_year, created_at) VALUES ('C2', 'Period 2', 'BBBBBB', 't2@s.test', '2026-2027', ?)`, now);
sql(`INSERT INTO class_teachers (class_id, teacher_email, added_at) VALUES ('C1', 'co@s.test', ?)`, now);
for (const [c, e, exp] of [['C1', 'sam@s.test', FAR], ['C1', 'ben@s.test', FAR], ['C1', 'old@s.test', now - 1000], ['C2', 'out@s.test', FAR], ['C1', 'tst@s.test', FAR]]) {
  sql(`INSERT INTO enrollments (class_id, student_email, enrolled_at, expires_at) VALUES (?, ?, ?, ?)`, c, e, now, exp);
}
const SAM = { email: 'sam@s.test', role: 'student' };
const BEN = { email: 'ben@s.test', role: 'student' };
const OLD = { email: 'old@s.test', role: 'student' };
const OUT = { email: 'out@s.test', role: 'student' };
const T1 = { email: 't1@s.test', role: 'teacher' };
const CO = { email: 'co@s.test', role: 'teacher' };
const T2 = { email: 't2@s.test', role: 'teacher' };
const ADM = { email: 'adm@s.test', role: 'admin' };
const TST = { email: 'tst@s.test', role: 'teacher' };

const req = (url, method = 'GET', body) => new Request(`https://x.test${url}`, {
  method, body: body === undefined ? undefined : JSON.stringify(body), headers: { 'Content-Type': 'application/json' },
});
async function call(fn, user, url, params = {}, method, body) {
  const res = await fn({ env, data: user, params, request: req(url, method, body) });
  return { status: res.status, body: await res.json() };
}
const PNG = 'data:image/png;base64,' + Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48]).toString('base64');
const WAV = 'data:audio/wav;base64,' + Buffer.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x41, 0x56, 0x45, 0, 0]).toString('base64');
let idSeq = 0;
const hexId = () => (++idSeq).toString(16).padStart(32, '0');

async function saveItem(user, kind, name) {
  const r = await call(lib.onRequestPut, user, '/api/library', {}, 'PUT', { kind, name, dataUri: kind === 'texture' ? PNG : WAV, meta: null });
  if (r.status !== 201 && r.status !== 200) throw new Error(`save failed ${JSON.stringify(r)}`);
  return r.body.item.id;
}
const shareItem = (id, cls) => sql(`INSERT OR IGNORE INTO library_shares (item_id, class_id, shared_at) VALUES (?, ?, ?)`, id, cls, now);
function makeGame(owner, title, cls) {
  const id = hexId();
  sql(`INSERT INTO library_games (id, owner_email, title, code, mode, players, created_at, updated_at) VALUES (?, ?, ?, 'x', 'none', 1, ?, ?)`, id, owner, title, now, now);
  if (cls) sql(`INSERT INTO library_game_shares (game_id, class_id, shared_at) VALUES (?, ?, ?)`, id, cls, now);
  return id;
}
function makeUpload(owner) {
  const id = hexId();
  sql(`INSERT INTO uploads (id, owner_email, filename, content_type, bytes, created_at) VALUES (?, ?, 'a.png', 'image/png', 10, ?)`, id, owner, now);
  r2.set(id, 'bytes');
  return id;
}
const libDelete = (user, cls, itemId) => call(libDel.onRequestPost, user, `/api/classes/${cls}/library-delete`, { id: cls }, 'POST', { itemId });
const gameDelete = (user, cls, gameId) => call(gameDel.onRequestPost, user, `/api/classes/${cls}/game-delete`, { id: cls }, 'POST', { gameId });
const clearLib = (user, cls, email) => call(clear.onRequestPost, user, `/api/classes/${cls}/clear-library`, { id: cls }, 'POST', { email });

// ---- one shared picture ---------------------------------------------------
const hero = await saveItem(SAM, 'texture', 'hero');
shareItem(hero, 'C1');
shareItem(hero, 'C2'); // a second class too: the delete must take it out of both
const unshared = await saveItem(SAM, 'texture', 'secret');

let r = await call(libMod.onRequestGet, T1, '/api/classes/C1/library-shares', { id: 'C1' });
check('the moderation list marks a student\'s share deletable', r.body.items.find((i) => i.id === hero)?.canDelete === true, r.body);

r = await libDelete(SAM, 'C1', hero);
check('a student cannot call library-delete (403)', r.status === 403, r);
r = await libDelete(T2, 'C1', hero);
check('a teacher of another class cannot (403)', r.status === 403, r);
r = await libDelete(T2, 'C2', unshared);
check("a teacher cannot delete an item not shared into their class (404)", r.status === 404, r);
r = await libDelete(T1, 'C1', unshared);
check('the class teacher cannot delete an unshared item either (404)', r.status === 404, r);
r = await libDelete(T1, 'C1', 'nope');
check('a malformed id is 404', r.status === 404, r);
r = await libDelete(T1, 'C9', hero);
check('a missing class is 404', r.status === 404, r);
check('nothing was deleted by the refusals', one(`SELECT deleted_at FROM library_items WHERE id = ?`, hero).deleted_at == null && r2.has(`library/${hero}`));

r = await libDelete(T2, 'C2', hero);
check("C2's teacher is refused: Sam is not enrolled in C2 (403)", r.status === 403, r);

r = await libDelete(T1, 'C1', hero);
check('the class owner deletes it', r.status === 200 && r.body.name === 'hero' && r.body.kind === 'texture', r);
const heroRow = one(`SELECT deleted_at, updated_at FROM library_items WHERE id = ?`, hero);
check('a tombstone is written', heroRow.deleted_at != null && heroRow.updated_at === heroRow.deleted_at, heroRow);
check('the R2 object is removed', !r2.has(`library/${hero}`) && r2Deletes.includes(`library/${hero}`));
check('every share of it is gone (both classes)', one(`SELECT COUNT(*) AS n FROM library_shares WHERE item_id = ?`, hero).n === 0);
r = await call(lib.onRequestGet, SAM, '/api/library');
check("Sam's own list shows the tombstone, so his other computers drop it", r.body.items.find((i) => i.id === hero)?.deletedAt != null, r.body.items);
r = await call(shared.onRequestGet, BEN, '/api/library/shared');
check('classmates no longer see it', !r.body.items.some((i) => i.id === hero), r.body);
r = await libDelete(T1, 'C1', hero);
check('deleting it again is 404', r.status === 404, r);
check("Sam's unshared item is untouched", one(`SELECT deleted_at FROM library_items WHERE id = ?`, unshared).deleted_at == null && r2.has(`library/${unshared}`));

// co-teacher, admin, sounds
const boop = await saveItem(SAM, 'sound', 'boop');
shareItem(boop, 'C1');
r = await libDelete(CO, 'C1', boop);
check('a co-teacher may delete a shared sound', r.status === 200 && r.body.kind === 'sound', r);
const zap = await saveItem(BEN, 'sound', 'zap');
shareItem(zap, 'C1');
r = await libDelete(ADM, 'C1', zap);
check('an admin may delete one too', r.status === 200, r);

// a teacher's own item, an enrolled teacher's item, a former student's item
const starter = await saveItem(T1, 'texture', 'starter_tile');
shareItem(starter, 'C1');
const tstItem = await saveItem(TST, 'texture', 'teachers_pic');
shareItem(tstItem, 'C1');
const oldItem = await saveItem(OLD, 'texture', 'old_pic');
shareItem(oldItem, 'C1');
r = await call(libMod.onRequestGet, T1, '/api/classes/C1/library-shares', { id: 'C1' });
const byId = Object.fromEntries(r.body.items.map((i) => [i.id, i]));
check('the list marks a teacher\'s and a former student\'s items not deletable',
  byId[starter]?.canDelete === false && byId[tstItem]?.canDelete === false && byId[oldItem]?.canDelete === false, r.body.items);
r = await libDelete(T1, 'C1', starter);
check("a teacher's own shared item is refused (403)", r.status === 403, r);
r = await libDelete(T1, 'C1', tstItem);
check('a teacher account enrolled as a student is still refused (403)', r.status === 403, r);
r = await libDelete(T1, 'C1', oldItem);
check("a former student's (expired enrollment) item is refused (403)", r.status === 403, r);
check('none of those were touched',
  [starter, tstItem, oldItem].every((id) => one(`SELECT deleted_at FROM library_items WHERE id = ?`, id).deleted_at == null));

// ---- one shared game ------------------------------------------------------
const maze = makeGame('sam@s.test', 'Maze', 'C1');
sql(`INSERT INTO library_game_shares (game_id, class_id, shared_at) VALUES (?, 'C2', ?)`, maze, now);
const privateGame = makeGame('sam@s.test', 'Private', null);
const teacherGame = makeGame('t1@s.test', 'Demo', 'C1');
r = await call(gameMod.onRequestGet, T1, '/api/classes/C1/game-shares', { id: 'C1' });
const games = Object.fromEntries(r.body.games.map((g) => [g.id, g]));
check('the games list marks deletable rows and carries no email',
  games[maze]?.canDelete === true && games[teacherGame]?.canDelete === false && !JSON.stringify(r.body).includes('@'), r.body);
r = await gameDelete(BEN, 'C1', maze);
check('a student cannot call game-delete (403)', r.status === 403, r);
r = await gameDelete(T2, 'C1', maze);
check('a teacher of another class cannot (403)', r.status === 403, r);
r = await gameDelete(T2, 'C2', maze);
check("C2's teacher is refused: Sam is not in C2 (403)", r.status === 403, r);
r = await gameDelete(T1, 'C1', privateGame);
check('an unshared game is 404', r.status === 404, r);
r = await gameDelete(T1, 'C1', teacherGame);
check("a teacher's own game is refused (403)", r.status === 403, r);
r = await gameDelete(CO, 'C1', maze);
check('a co-teacher deletes the shared game', r.status === 200 && r.body.title === 'Maze', r);
check('the game is a tombstone', one(`SELECT deleted_at FROM library_games WHERE id = ?`, maze).deleted_at != null);
check('every share of the game is gone', one(`SELECT COUNT(*) AS n FROM library_game_shares WHERE game_id = ?`, maze).n === 0);
check('the unshared and teacher games are untouched',
  one(`SELECT deleted_at FROM library_games WHERE id = ?`, privateGame).deleted_at == null && one(`SELECT deleted_at FROM library_games WHERE id = ?`, teacherGame).deleted_at == null);

// ---- clear a whole library --------------------------------------------------
// Sam has: 'secret' (texture, unshared). Add more of everything.
const p2 = await saveItem(SAM, 'texture', 'p2'); shareItem(p2, 'C1');
await saveItem(SAM, 'texture', 'p3');
await saveItem(SAM, 'sound', 's1');
const s2 = await saveItem(SAM, 'sound', 's2'); shareItem(s2, 'C1');
const g1 = makeGame('sam@s.test', 'G1', 'C1');
const up1 = makeUpload('sam@s.test');
const up2 = makeUpload('sam@s.test');
// Ben's things must survive.
const benPic = await saveItem(BEN, 'texture', 'ben_pic'); shareItem(benPic, 'C1');
const benGame = makeGame('ben@s.test', 'BenGame', 'C1');
const benUp = makeUpload('ben@s.test');

r = await clearLib(SAM, 'C1', 'ben@s.test');
check('a student cannot call clear-library (403)', r.status === 403, r);
r = await clearLib(T2, 'C1', 'sam@s.test');
check('a teacher of another class cannot (403)', r.status === 403, r);
r = await clearLib(T2, 'C2', 'sam@s.test');
check('a teacher cannot clear a student not in their class (404)', r.status === 404, r);
r = await clearLib(T1, 'C1', 'out@s.test');
check('nor a student of another class (404)', r.status === 404, r);
r = await clearLib(T1, 'C1', 'old@s.test');
check('nor a former student (expired enrollment) (404)', r.status === 404, r);
r = await clearLib(T1, 'C1', 'tst@s.test');
check('a teacher account enrolled in the class is refused (403)', r.status === 403, r);
r = await clearLib(T1, 'C1', '');
check('an empty email is 400', r.status === 400, r);
check('the refusals touched nothing', one(`SELECT COUNT(*) AS n FROM library_items WHERE owner_email = 'sam@s.test' AND deleted_at IS NULL`).n === 5);

r = await clearLib(T1, 'C1', '  SAM@s.test ');
check('the owner clears Sam\'s Library and gets the counts (email normalised)',
  r.status === 200 && r.body.pictures === 3 && r.body.sounds === 2 && r.body.images === 2 && r.body.games === 2, r);
check('every item of Sam is a tombstone', one(`SELECT COUNT(*) AS n FROM library_items WHERE owner_email = 'sam@s.test' AND deleted_at IS NULL`).n === 0);
check('every game of Sam is a tombstone', one(`SELECT COUNT(*) AS n FROM library_games WHERE owner_email = 'sam@s.test' AND deleted_at IS NULL`).n === 0);
check("Sam's shares are gone", one(`SELECT COUNT(*) AS n FROM library_shares WHERE item_id IN (?, ?)`, p2, s2).n === 0
  && one(`SELECT COUNT(*) AS n FROM library_game_shares WHERE game_id = ?`, g1).n === 0);
check("Sam's upload rows are gone", one(`SELECT COUNT(*) AS n FROM uploads WHERE owner_email = 'sam@s.test'`).n === 0);
check("Sam's R2 objects are removed (library and uploads)",
  !r2.has(up1) && !r2.has(up2) && !r2.has(`library/${p2}`) && !r2.has(`library/${unshared}`) && r2Deletes.includes(up1));
check("Ben's picture, game, share and upload are untouched",
  one(`SELECT deleted_at FROM library_items WHERE id = ?`, benPic).deleted_at == null && r2.has(`library/${benPic}`)
  && one(`SELECT deleted_at FROM library_games WHERE id = ?`, benGame).deleted_at == null
  && one(`SELECT COUNT(*) AS n FROM library_shares WHERE item_id = ?`, benPic).n === 1
  && one(`SELECT COUNT(*) AS n FROM uploads WHERE id = ?`, benUp).n === 1 && r2.has(benUp));
check("the teacher's own item and game are untouched",
  one(`SELECT deleted_at FROM library_items WHERE id = ?`, starter).deleted_at == null
  && one(`SELECT deleted_at FROM library_games WHERE id = ?`, teacherGame).deleted_at == null);
r = await call(lib.onRequestGet, SAM, '/api/library');
check("Sam's sync sees tombstones only", r.body.items.length > 0 && r.body.items.every((i) => i.deletedAt != null), r.body.items);
r = await clearLib(CO, 'C1', 'sam@s.test');
check('clearing an empty library again is fine, all zeros (co-teacher)', r.status === 200 && r.body.pictures === 0 && r.body.games === 0 && r.body.images === 0, r);
r = await clearLib(ADM, 'C1', 'ben@s.test');
check('an admin may clear one too', r.status === 200 && r.body.pictures === 1 && r.body.games === 1 && r.body.images === 1, r);

// ---- the words the teacher reads (lib/library-delete-words.ts) ----------------
const words = await import('../lib/library-delete-words.ts');
let w = words.deleteItemConfirm('Sam W.', 'texture', 'hero');
check('the item confirm names the student, the picture and what is lost',
  w.title === `Delete Sam W.'s picture "hero"?` && w.message.startsWith("It is gone from Sam's Library too, on every computer, and from any game that used it. Sam is not told why."), w);
w = words.deleteItemConfirm('A classmate', 'sound', 'boop');
check('with no name on the account it says "the student"', w.title.includes('sound "boop"') && w.message.includes("the student's Library") && w.message.includes('The student is not told why.'), w);
w = words.deleteGameConfirm('Sam W.', 'Maze');
check('the game confirm says classmates can no longer play it', w.title === `Delete Sam W.'s game "Maze"?` && /no longer play or remix it\. Sam is not told why\./.test(w.message), w);
check('the clear toast says the counts with plurals',
  words.clearedSentence('Sam W.', { pictures: 12, sounds: 3, images: 2, games: 1 }) === "Cleared Sam W.'s Library: 12 pictures, 3 sounds, 2 images, 1 game.");
check('an empty clear says so', words.clearedSentence('Sam W.', { pictures: 0, sounds: 0, images: 0, games: 0 }) === "Sam W.'s Library was already empty.");
w = words.clearLibraryConfirm('Sam W.', 'Sam');
check('the clear confirm lists every kind and says it cannot be undone',
  w.title === "Clear Sam W.'s Library?" && /picture, sound, font, uploaded image and published game/.test(w.message) && /can't be undone/.test(w.message), w);
check('the clear toast names fonts only when there were some',
  words.clearedSentence('Sam W.', { pictures: 1, sounds: 0, fonts: 2, images: 0, games: 0 }) === "Cleared Sam W.'s Library: 1 picture, 0 sounds, 2 fonts, 0 images, 0 games."
  && words.clearedSentence('Sam W.', { pictures: 1, sounds: 0, fonts: 0, images: 0, games: 0 }) === "Cleared Sam W.'s Library: 1 picture, 0 sounds, 0 images, 0 games.");

console.log(`\ntest-library-delete: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
