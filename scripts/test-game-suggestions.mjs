#!/usr/bin/env node
// Suggestions on class games (#96): GET|POST /api/games/[id]/suggestions and the
// teacher's clear-suggestions in /api/classes/[id]/game-shares, on a real SQLite
// with every migration applied (0047 game_suggestions). What has to hold:
//   1. only ids from the fixed list (lib/game-suggestions.ts) are stored; there
//      is no way to send text;
//   2. access is visibleGame()'s: a classmate in a class the game is shared into
//      reads and picks; someone in no such class, or a game hidden from the
//      class, gets 404 for a student; picking twice is one row, unpicking
//      removes it;
//   3. the author reads and cannot pick (403); the author and the class's
//      teacher see names as first name + last initial; a classmate sees counts
//      and their own picks, never names; no email is ever in an answer;
//   4. a teacher clears ONLY their own class's students' suggestions, and the
//      class's game list carries that count.

import { join } from 'node:path';
import { compileHandler, makeD1, root } from './_d1-sqlite.mjs';

let passed = 0;
let failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log(`PASS  ${name}`); }
  else { failed++; console.error(`FAIL  ${name}${detail ? ` -- ${typeof detail === 'string' ? detail : JSON.stringify(detail)}` : ''}`); }
}

const out = join(root, '.tmp', 'game-suggestions-test');
const route = compileHandler('api/games/[id]/suggestions.ts', join(out, 'a'));
const mod = compileHandler('api/classes/[id]/game-shares/index.ts', join(out, 'b'));
const lib = await import(join(root, 'lib/game-suggestions.ts'));

const db = makeD1();
const env = { DB: db };
const now = Date.now();
const FAR = now + 1e10;
const sql = (q, ...a) => db.sqlite.prepare(q).run(...a);
for (const [email, first, last] of [['ana@s.test', 'Ana', 'Lopez'], ['ben@s.test', 'Ben', 'Diaz'], ['cat@s.test', 'Cat', 'Moss'], ['out@s.test', 'Out', 'Sider'], ['dan@s.test', 'Dan', 'Ray']]) {
  sql(`INSERT INTO students (email, password_hash, created_at, role, first_name, last_name) VALUES (?, 'x', ?, 'student', ?, ?)`, email, now, first, last);
}
sql(`INSERT INTO classes (id, name, code, owner_email, school_year, created_at) VALUES ('C1', 'Period 1', 'AAAAAA', 't1@s.test', '2026-2027', ?)`, now);
sql(`INSERT INTO classes (id, name, code, owner_email, school_year, created_at) VALUES ('C2', 'Period 2', 'BBBBBB', 't2@s.test', '2026-2027', ?)`, now);
for (const [c, e] of [['C1', 'ana@s.test'], ['C1', 'ben@s.test'], ['C2', 'cat@s.test'], ['C2', 'ana@s.test']]) {
  sql(`INSERT INTO enrollments (class_id, student_email, enrolled_at, expires_at) VALUES (?, ?, ?, ?)`, c, e, now, FAR);
}
sql(`INSERT INTO class_teachers (class_id, teacher_email, added_at) VALUES ('C1', 't1@s.test', 0), ('C2', 't2@s.test', 0)`);
const ANA = { email: 'ana@s.test', role: 'student' };
const BEN = { email: 'ben@s.test', role: 'student' };
const CAT = { email: 'cat@s.test', role: 'student' };
const OUT = { email: 'out@s.test', role: 'student' };
const T1 = { email: 't1@s.test', role: 'teacher' };
const T2 = { email: 't2@s.test', role: 'teacher' };

// Ana's game, shared into both her classes.
const G = 'a'.repeat(32);
const H = 'b'.repeat(32); // shared into C1 but hidden there
sql(`INSERT INTO library_games (id, owner_email, title, code, mode, players, created_at, updated_at) VALUES (?, 'ana@s.test', 'Spike Run', 'x', 'none', 1, ?, ?)`, G, now, now);
sql(`INSERT INTO library_games (id, owner_email, title, code, mode, players, created_at, updated_at) VALUES (?, 'ana@s.test', 'Hidden One', 'x', 'none', 1, ?, ?)`, H, now, now);
sql(`INSERT INTO library_game_shares (game_id, class_id, shared_at) VALUES (?, 'C1', ?), (?, 'C2', ?)`, G, now, G, now);
sql(`INSERT INTO library_game_shares (game_id, class_id, shared_at, hidden_at, hidden_by) VALUES (?, 'C1', ?, ?, 't1@s.test')`, H, now, now);

const bodies = [];
async function call(fn, user, url, params, method = 'GET', body) {
  const res = await fn({
    env, data: user, params,
    request: new Request(`https://x.test${url}`, { method, body: body === undefined ? undefined : JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }),
  });
  const text = await res.text();
  bodies.push(text);
  return { status: res.status, body: JSON.parse(text) };
}
const get = (u, id = G) => call(route.onRequestGet, u, `/api/games/${id}/suggestions`, { id });
const pick = (u, suggestion, on = true, id = G) => call(route.onRequestPost, u, `/api/games/${id}/suggestions`, { id }, 'POST', { suggestion, on });

// 1. the list
check('the list has unique ids', new Set(lib.SUGGESTIONS.map((s) => s.id)).size === lib.SUGGESTIONS.length);
check('isSuggestionId refuses free text', !lib.isSuggestionId('please add spikes') && lib.isSuggestionId('more-obstacles'));

// 2. access and picking
let r = await get(BEN);
check('a classmate reads: all options, no counts yet, can suggest', r.status === 200 && r.body.options.length === lib.SUGGESTIONS.length && r.body.canSuggest === true && !r.body.who, r);
r = await pick(BEN, 'more-obstacles');
check('pick', r.status === 200 && r.body.counts['more-obstacles'] === 1 && r.body.mine.includes('more-obstacles'), r);
r = await pick(BEN, 'more-obstacles');
check('picking twice is one row', r.body.counts['more-obstacles'] === 1);
await pick(BEN, 'fun');
await pick(CAT, 'fun');
r = await get(CAT);
check('another class sees combined counts and only its own picks', r.body.counts.fun === 2 && JSON.stringify(r.body.mine) === '["fun"]' && !r.body.who, r);
r = await pick(BEN, 'fun', false);
check('unpick removes it', r.body.counts.fun === 1 && !r.body.mine.includes('fun'), r);
check('free text is refused 400', (await pick(BEN, 'please add spikes')).status === 400);
check("'on' must be a boolean", (await call(route.onRequestPost, BEN, `/api/games/${G}/suggestions`, { id: G }, 'POST', { suggestion: 'fun', on: 'yes' })).status === 400);
check('outsider GET 404', (await get(OUT)).status === 404);
check('outsider POST 404', (await pick(OUT, 'fun')).status === 404);
check('a hidden game is 404 to a student', (await get(BEN, H)).status === 404 && (await pick(BEN, 'fun', true, H)).status === 404);
r = await get(T1, H);
check('its teacher reads a hidden game but cannot pick on it', r.status === 200 && r.body.canSuggest === false && (await pick(T1, 'fun', true, H)).status === 403, r);
check('a bad id is 404', (await get(BEN, 'nope')).status === 404);

// 3. the author and names
r = await get(ANA);
check('the author reads with names and cannot suggest', r.status === 200 && r.body.canSuggest === false
  && JSON.stringify(r.body.who['more-obstacles']) === '["Ben D."]' && JSON.stringify(r.body.who.fun) === '["Cat M."]', r);
check('the author cannot pick on their own game (403)', (await pick(ANA, 'fun')).status === 403);
r = await get(T1);
check("the class's teacher sees names", JSON.stringify(r.body.who?.['more-obstacles']) === '["Ben D."]', r);
check('no email in any answer', bodies.every((b) => !/@s\.test/.test(b)), bodies.find((b) => /@s\.test/.test(b)));

// 4. teacher clear, own class only
r = await call(mod.onRequestGet, T1, '/api/classes/C1/game-shares', { id: 'C1' });
check("C1's list counts C1's suggestions only (Ben: 1)", r.body.games.find((g) => g.id === G)?.suggestions === 1, r.body.games);
r = await call(mod.onRequestPost, T1, '/api/classes/C1/game-shares', { id: 'C1' }, 'POST', { gameId: G, action: 'clear-suggestions' });
check('clear', r.status === 200 && r.body.cleared === 1, r);
r = await get(ANA);
check("another class's suggestions survive a clear", r.body.counts.fun === 1 && !r.body.counts['more-obstacles'], r.body.counts);
check('a student cannot clear', (await call(mod.onRequestPost, BEN, '/api/classes/C1/game-shares', { id: 'C1' }, 'POST', { gameId: G, action: 'clear-suggestions' })).status === 403);
check("another class's teacher cannot clear here", (await call(mod.onRequestPost, T2, '/api/classes/C1/game-shares', { id: 'C1' }, 'POST', { gameId: G, action: 'clear-suggestions' })).status === 403);
check('clearing a game not shared into the class is 404', (await call(mod.onRequestPost, T2, '/api/classes/C2/game-shares', { id: 'C2' }, 'POST', { gameId: H, action: 'clear-suggestions' })).status === 404);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
