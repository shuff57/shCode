#!/usr/bin/env node
// The Games library (functions/api/games/*, classes/[id]/game-shares) on a real
// SQLite with every migration applied. What has to hold:
//   1. publish stores the code, reads mode/players from multiplayer('...', n),
//      refuses a bad title and code over 64 KB; re-publishing with the id updates
//      the same game, and only the owner can update or delete it;
//   2. "mine" lists the owner's live games only, with no code;
//   3. sharing puts a game into the owner's live classes; a classmate lists it and
//      can open it (code included) with the publisher as first name + last
//      initial; a student in another class and a stranger get 404;
//   4. a teacher of the class can hide, unhide and remove it; a teacher of another
//      class and a student cannot; re-sharing does not unhide;
//   5. a delete is a tombstone and takes the game out of every class;
//   6. no response a student or teacher sees carries an email.
// Run: node scripts/test-library-games.mjs

import { join } from 'node:path';
import { compileHandler, makeD1, root } from './_d1-sqlite.mjs';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log(`PASS  ${name}`); }
  else { failed++; console.error(`FAIL  ${name}${detail !== undefined ? ' -- ' + JSON.stringify(detail).slice(0, 400) : ''}`); }
}

const out = join(root, '.tmp', 'library-games-test');
const mine = compileHandler('api/games/index.ts', join(out, 'a'));
const one = compileHandler('api/games/[id].ts', join(out, 'b'));
const share = compileHandler('api/games/[id]/share.ts', join(out, 'c'));
const shared = compileHandler('api/games/shared/index.ts', join(out, 'd'));
const mod = compileHandler('api/classes/[id]/game-shares/index.ts', join(out, 'e'));
const core = compileHandler('../lib/games-core.ts', join(out, 'f'));

const db = makeD1();
const env = { DB: db };
const now = Date.now();
const FAR = now + 1e10;
const sql = (q, ...a) => db.sqlite.prepare(q).run(...a);
for (const [email, first, last] of [['ana@s.test', 'Ana', 'Lopez'], ['ben@s.test', 'Ben', 'Diaz'], ['out@s.test', 'Out', 'Sider'], ['lone@s.test', 'Lone', 'Wolf']]) {
  sql(`INSERT INTO students (email, password_hash, created_at, role, first_name, last_name) VALUES (?, 'x', ?, 'student', ?, ?)`, email, now, first, last);
}
sql(`INSERT INTO classes (id, name, code, owner_email, school_year, created_at) VALUES ('C1', 'Period 1', 'AAAAAA', 't1@s.test', '2026-2027', ?)`, now);
sql(`INSERT INTO classes (id, name, code, owner_email, school_year, created_at) VALUES ('C2', 'Period 2', 'BBBBBB', 't2@s.test', '2026-2027', ?)`, now);
for (const [c, e] of [['C1', 'ana@s.test'], ['C1', 'ben@s.test'], ['C2', 'out@s.test']]) {
  sql(`INSERT INTO enrollments (class_id, student_email, enrolled_at, expires_at) VALUES (?, ?, ?, ?)`, c, e, now, FAR);
}
const ANA = { email: 'ana@s.test', role: 'student' };
const BEN = { email: 'ben@s.test', role: 'student' };
const OUT = { email: 'out@s.test', role: 'student' };
const LONE = { email: 'lone@s.test', role: 'student' };
const T1 = { email: 't1@s.test', role: 'teacher' };
const T2 = { email: 't2@s.test', role: 'teacher' };

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

const CODE = `function setup() {\n  new Canvas(200, 200);\n  multiplayer('versus', 2);\n}\nfunction draw() { background(0); }\n`;

// ---- the pure rules --------------------------------------------------------
check("declaredMode reads multiplayer('versus', 2)", JSON.stringify(core.declaredMode(CODE)) === '{"mode":"versus","players":2}');
check('declaredMode: no call is none, 1 player', JSON.stringify(core.declaredMode('function setup(){}')) === '{"mode":"none","players":1}');
check('declaredMode: a commented-out call does not count', core.declaredMode("// multiplayer('coop', 3)\n/* multiplayer('versus', 4) */").mode === 'none');
check('declaredMode: players default to 2, double quotes, any case', JSON.stringify(core.declaredMode('multiplayer( "Coop" )')) === '{"mode":"coop","players":2}');
check('declaredMode: 4 players local', JSON.stringify(core.declaredMode("multiplayer('local', 4)")) === '{"mode":"local","players":4}');
check('cleanTitle collapses spaces', core.cleanTitle('  Pong   Duel ').title === 'Pong Duel');
check('cleanTitle refuses markup and empty', 'error' in core.cleanTitle('<b>x</b>') && 'error' in core.cleanTitle('   '));
check('cleanTitle: 60 is fine, 61 is not', 'title' in core.cleanTitle('x'.repeat(60)) && 'error' in core.cleanTitle('x'.repeat(61)));

// ---- publish ---------------------------------------------------------------
let r = await call(mine.onRequestPost, ANA, '/api/games', {}, 'POST', { title: 'Pong Duel', code: CODE });
const id = r.body.game?.id;
check('Ana publishes a game (201) with the declared mode', r.status === 201 && /^[0-9a-f]{32}$/.test(id) && r.body.game.mode === 'versus' && r.body.game.players === 2, r);
r = await call(mine.onRequestPost, ANA, '/api/games', {}, 'POST', { title: 'Sneaky', code: CODE, mode: 'coop', players: 4 });
check('mode and players come from the code, never the body', r.body.game?.mode === 'versus' && r.body.game?.players === 2, r);
const id2 = r.body.game?.id;
r = await call(mine.onRequestPost, ANA, '/api/games', {}, 'POST', { title: '', code: CODE });
check('an empty title is refused (400)', r.status === 400, r);
r = await call(mine.onRequestPost, ANA, '/api/games', {}, 'POST', { title: 'x'.repeat(61), code: CODE });
check('a 61-character title is refused (400)', r.status === 400, r);
r = await call(mine.onRequestPost, ANA, '/api/games', {}, 'POST', { title: 'Empty', code: '   ' });
check('empty code is refused (400)', r.status === 400, r);
r = await call(mine.onRequestPost, ANA, '/api/games', {}, 'POST', { title: 'Huge', code: '// ' + 'x'.repeat(64 * 1024) });
check('code over 64 KB is refused (413)', r.status === 413 && /64 KB/.test(r.body.error), r);
r = await call(mine.onRequestPost, ANA, '/api/games', {}, 'POST', { title: 'Exact', code: 'x'.repeat(64 * 1024) });
check('exactly 64 KB is accepted', r.status === 201, r.status);
r = await call(mine.onRequestPost, ANA, '/api/games', {}, 'POST', { title: 'Wide', code: 'é'.repeat(33 * 1024) });
check('the cap counts UTF-8 bytes, not characters', r.status === 413, r.status);

// ---- update ----------------------------------------------------------------
const CODE2 = CODE.replace("'versus', 2", "'coop', 3");
r = await call(mine.onRequestPost, ANA, '/api/games', {}, 'POST', { id, title: 'Pong Duel 2', code: CODE2 });
check('re-publishing with the id updates the same game', r.status === 200 && r.body.game.id === id && r.body.created === false && r.body.game.mode === 'coop' && r.body.game.players === 3, r);
r = await call(mine.onRequestPost, BEN, '/api/games', {}, 'POST', { id, title: 'Mine now', code: 'hacked()' });
check("Ben cannot update Ana's game (404)", r.status === 404, r);
r = await call(mine.onRequestPost, ANA, '/api/games', {}, 'POST', { id: 'nope', title: 'x', code: CODE });
check('a malformed id is 404', r.status === 404, r);
r = await call(one.onRequestGet, ANA, `/api/games/${id}`, { id });
check('the update stuck and Ben did not change it', r.body.game?.title === 'Pong Duel 2' && r.body.game?.code === CODE2 && r.body.game?.mine === true, r.body);

// ---- list mine -------------------------------------------------------------
r = await call(mine.onRequestGet, ANA, '/api/games');
check('Ana lists her three games, without code', r.body.games.length === 3 && r.body.games.every((g) => g.code === undefined) && r.body.games[0].id === id, r.body);
r = await call(mine.onRequestGet, BEN, '/api/games');
check('Ben has none of his own', r.body.games.length === 0, r.body);

// ---- before sharing: classmates only once shared ---------------------------
r = await call(one.onRequestGet, BEN, `/api/games/${id}`, { id });
check('an unshared game is 404 even to a classmate', r.status === 404, r);

// ---- share -----------------------------------------------------------------
r = await call(share.onRequestPost, BEN, `/api/games/${id}/share`, { id }, 'POST', { share: true });
check("Ben cannot share Ana's game (404)", r.status === 404, r);
r = await call(share.onRequestPost, ANA, `/api/games/${id}/share`, { id }, 'POST', { share: 'yes' });
check('share must be a boolean (400)', r.status === 400, r);
r = await call(share.onRequestPost, ANA, `/api/games/${id}/share`, { id }, 'POST', { share: true });
check('Ana shares it into her one class', r.status === 200 && r.body.classes === 1, r);
r = await call(mine.onRequestPost, LONE, '/api/games', {}, 'POST', { title: 'Alone', code: CODE });
const loneId = r.body.game.id;
r = await call(share.onRequestPost, LONE, `/api/games/${loneId}/share`, { id: loneId }, 'POST', { share: true });
check('a student in no class cannot share (409, says to join a class)', r.status === 409 && /Join a class/.test(r.body.error), r);
r = await call(mine.onRequestGet, ANA, '/api/games');
check("Ana's list marks it shared", r.body.games.find((g) => g.id === id)?.shared === true && r.body.games.find((g) => g.id === id2)?.shared === false, r.body);

r = await call(shared.onRequestGet, BEN, '/api/games/shared');
check('Ben sees it with first name + last initial', r.body.games.length === 1 && r.body.games[0].owner === 'Ana L.' && r.body.games[0].mine === false && r.body.games[0].modeLabel === 'Co-op, 3 players', r.body);
r = await call(one.onRequestGet, BEN, `/api/games/${id}`, { id });
check('Ben can open it to play or remix (code included)', r.status === 200 && r.body.game.code === CODE2 && r.body.game.owner === 'Ana L.' && r.body.game.mine === false && r.body.game.shared === undefined, r);
r = await call(shared.onRequestGet, OUT, '/api/games/shared');
check('a student in another class does not see it', r.body.games.length === 0, r.body);
r = await call(one.onRequestGet, OUT, `/api/games/${id}`, { id });
check('nor open it (404)', r.status === 404, r);
r = await call(one.onRequestGet, LONE, `/api/games/${id}`, { id });
check('a stranger in no class gets 404', r.status === 404, r);
r = await call(one.onRequestGet, BEN, `/api/games/${id2}`, { id: id2 });
check("Ana's other, unshared game stays 404 for Ben", r.status === 404, r);

// ---- owner-only delete -----------------------------------------------------
r = await call(one.onRequestDelete, BEN, `/api/games/${id}`, { id }, 'DELETE');
check("Ben cannot delete Ana's game (404)", r.status === 404, r);
r = await call(one.onRequestDelete, T1, `/api/games/${id}`, { id }, 'DELETE');
check('nor can her teacher (moderation is hide/remove, not delete)', r.status === 404, r);

// ---- moderation ------------------------------------------------------------
const M = '/api/classes/C1/game-shares';
r = await call(mod.onRequestPost, BEN, M, { id: 'C1' }, 'POST', { gameId: id, action: 'hide' });
check('a student cannot moderate (403)', r.status === 403, r);
r = await call(mod.onRequestPost, T2, M, { id: 'C1' }, 'POST', { gameId: id, action: 'hide' });
check('a teacher of another class cannot (403)', r.status === 403, r);
r = await call(mod.onRequestGet, T2, M, { id: 'C1' });
check('nor list it (403)', r.status === 403, r);
r = await call(mod.onRequestPost, T1, M, { id: 'C1' }, 'POST', { gameId: id, action: 'explode' });
check('an unknown action is 400', r.status === 400, r);
r = await call(mod.onRequestPost, T1, M, { id: 'C1' }, 'POST', { gameId: id, action: 'hide' });
check('the class teacher hides it', r.status === 200, r);
r = await call(shared.onRequestGet, BEN, '/api/games/shared');
check('Ben no longer sees it', r.body.games.length === 0, r.body);
r = await call(one.onRequestGet, BEN, `/api/games/${id}`, { id });
check('nor can he open it (404)', r.status === 404, r);
r = await call(one.onRequestGet, ANA, `/api/games/${id}`, { id });
check('the owner still can', r.status === 200 && r.body.game.mine === true, r.status);
r = await call(mod.onRequestGet, T1, M, { id: 'C1' });
check('the teacher still lists it, marked hidden, with the owner', r.body.games[0]?.hidden === true && r.body.games[0]?.owner === 'Ana L.', r.body);
r = await call(shared.onRequestGet, T1, '/api/games/shared');
check("the teacher's own Games view shows it marked hidden", r.body.games[0]?.hidden === true, r.body);
r = await call(one.onRequestGet, T1, `/api/games/${id}`, { id });
check('and the teacher can open it, marked hidden', r.status === 200 && r.body.game.hidden === true, r);
r = await call(share.onRequestPost, ANA, `/api/games/${id}/share`, { id }, 'POST', { share: true });
r = await call(shared.onRequestGet, BEN, '/api/games/shared');
check('sharing again does not unhide it', r.body.games.length === 0, r.body);
r = await call(mod.onRequestPost, T1, M, { id: 'C1' }, 'POST', { gameId: id, action: 'unhide' });
r = await call(shared.onRequestGet, BEN, '/api/games/shared');
check('unhide brings it back for students', r.body.games.length === 1, r.body);
r = await call(mod.onRequestPost, T1, M, { id: 'C1' }, 'POST', { gameId: id, action: 'remove' });
check('the teacher removes it from the class', r.status === 200, r);
r = await call(shared.onRequestGet, BEN, '/api/games/shared');
check('it is gone from the class Games', r.body.games.length === 0, r.body);
r = await call(mod.onRequestPost, T1, M, { id: 'C1' }, 'POST', { gameId: id, action: 'remove' });
check('removing it twice is 404', r.status === 404, r);
r = await call(one.onRequestGet, ANA, `/api/games/${id}`, { id });
check("…and Ana's own game is untouched", r.status === 200 && r.body.game.code === CODE2 && r.body.game.shared === false, r.body);

// ---- unshare and delete ----------------------------------------------------
await call(share.onRequestPost, ANA, `/api/games/${id}/share`, { id }, 'POST', { share: true });
r = await call(share.onRequestPost, ANA, `/api/games/${id}/share`, { id }, 'POST', { share: false });
check('the owner unshares it', r.status === 200 && r.body.shared === false, r);
r = await call(one.onRequestGet, BEN, `/api/games/${id}`, { id });
check('then Ben gets 404 again', r.status === 404, r);
await call(share.onRequestPost, ANA, `/api/games/${id}/share`, { id }, 'POST', { share: true });
r = await call(one.onRequestDelete, ANA, `/api/games/${id}`, { id }, 'DELETE');
check('Ana deletes her game', r.status === 200, r);
const tomb = db.sqlite.prepare(`SELECT deleted_at FROM library_games WHERE id = ?`).get(id);
check('the row stays as a tombstone', tomb && tomb.deleted_at != null, tomb);
const shares = db.sqlite.prepare(`SELECT COUNT(*) AS n FROM library_game_shares WHERE game_id = ?`).get(id);
check('and its shares are gone', shares.n === 0, shares);
r = await call(one.onRequestGet, ANA, `/api/games/${id}`, { id });
check('a deleted game is 404 even to its owner', r.status === 404, r);
r = await call(mine.onRequestPost, ANA, '/api/games', {}, 'POST', { id, title: 'Back', code: CODE });
check('and cannot be updated back to life', r.status === 404, r);
r = await call(one.onRequestDelete, ANA, `/api/games/${id}`, { id }, 'DELETE');
check('deleting twice is 404', r.status === 404, r);
r = await call(mine.onRequestGet, ANA, '/api/games');
check('"mine" no longer lists it', !r.body.games.some((g) => g.id === id) && r.body.games.length === 2, r.body);

// ---- per-owner cap ---------------------------------------------------------
for (let i = 0; i < 30; i++) await call(mine.onRequestPost, BEN, '/api/games', {}, 'POST', { title: `G${i}`, code: CODE });
r = await call(mine.onRequestPost, BEN, '/api/games', {}, 'POST', { title: 'One too many', code: CODE });
check('a 31st live game is refused (409)', r.status === 409, r);

// ---- no emails anywhere ----------------------------------------------------
const leaks = seenBodies.filter((b) => /@s\.test/.test(b.text));
check('no response carries an email', leaks.length === 0, leaks.slice(0, 2));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
