#!/usr/bin/env node
// Who a shared picture or game goes to (migration 0057, functions/_shared/audience.ts), on a real SQLite with
// every migration applied, through the real handlers. What has to hold:
//   1. the picker's options: a student's classes and one entry per teacher with a class COUNT, never another
//      class's name, never an email;
//   2. no audience = every class the student is in (a page from before this still works);
//   3. a ticked subset shares into exactly those classes, never one the student is not in; narrowing removes
//      the rest; an empty or made-up list is refused and changes nothing;
//   4. "all of a teacher's classes" reaches students of that teacher's OTHER classes (and no one else), only for
//      a teacher the student has a class with, only for a student, and remembers the teacher;
//   5. a share a teacher hid stays hidden when the owner changes the audience;
//   6. a class that teacher creates, or co-teaches later, gets the item; unsharing forgets the teacher;
//   7. the same for games; no answer carries an email.

import { join } from 'node:path';
import { compileHandler, makeD1, root } from './_d1-sqlite.mjs';

let passed = 0;
let failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log(`PASS  ${name}`); }
  else { failed++; console.error(`FAIL  ${name}${detail !== undefined ? ` -- ${JSON.stringify(detail).slice(0, 500)}` : ''}`); }
}

const out = join(root, '.tmp', 'audience-test');
const aud = compileHandler('api/audiences.ts', join(out, 'a'));
const lib = compileHandler('api/library/index.ts', join(out, 'b'));
const share = compileHandler('api/library/[id]/share.ts', join(out, 'c'));
const shared = compileHandler('api/library/shared/index.ts', join(out, 'd'));
const games = compileHandler('api/games/index.ts', join(out, 'e'));
const gone = compileHandler('api/games/[id].ts', join(out, 'j'));
const gshare = compileHandler('api/games/[id]/share.ts', join(out, 'f'));
const gshared = compileHandler('api/games/shared/index.ts', join(out, 'g'));
const classes = compileHandler('api/classes/index.ts', join(out, 'h'));
const coteach = compileHandler('api/classes/[id]/teachers/index.ts', join(out, 'i'));

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
const all = (q, ...a) => db.sqlite.prepare(q).all(...a);
for (const [email, first, last, role] of [
  ['ana@s.test', 'Ana', 'Lopez', 'student'], ['ben@s.test', 'Ben', 'Diaz', 'student'], ['cy@s.test', 'Cy', 'Moss', 'student'],
  ['dee@s.test', 'Dee', 'Hill', 'student'], ['out@s.test', 'Out', 'Sider', 'student'],
  ['t1@s.test', 'Tess', 'Ward', 'teacher'], ['t2@s.test', 'Tom', 'Reed', 'teacher'], ['t3@s.test', 'Uma', 'Park', 'teacher'],
]) {
  sql(`INSERT INTO students (email, password_hash, created_at, role, first_name, last_name) VALUES (?, 'x', ?, ?, ?, ?)`, email, now, role, first, last);
}
const mkClass = (id, name, owner) => sql(`INSERT INTO classes (id, name, code, owner_email, school_year, created_at) VALUES (?, ?, ?, ?, '2026-2027', ?)`, id, name, id.padEnd(6, 'X').slice(0, 6), owner, now);
mkClass('C1', 'Period 1', 't1@s.test');
mkClass('C3', 'Period 3 Secret', 't1@s.test'); // t1's other period: Ana is NOT in it
mkClass('C2', 'Robotics', 't2@s.test');
mkClass('C4', 'Elsewhere', 't3@s.test');
for (const [c, e] of [['C1', 'ana@s.test'], ['C2', 'ana@s.test'], ['C1', 'ben@s.test'], ['C3', 'cy@s.test'], ['C2', 'dee@s.test'], ['C4', 'out@s.test']]) {
  sql(`INSERT INTO enrollments (class_id, student_email, enrolled_at, expires_at) VALUES (?, ?, ?, ?)`, c, e, now, FAR);
}
const U = (email, role = 'student') => ({ email, role });
const ANA = U('ana@s.test'), BEN = U('ben@s.test'), CY = U('cy@s.test'), DEE = U('dee@s.test'), OUT = U('out@s.test');
const T1 = U('t1@s.test', 'teacher'), T2 = U('t2@s.test', 'teacher');

const bodies = [];
async function call(fn, user, url, params = {}, method = 'GET', body) {
  const res = await fn({
    env, data: user, params,
    request: new Request(`https://x.test${url}`, { method, body: body === undefined ? undefined : JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }),
  });
  const text = await res.text();
  if (!url.startsWith('/api/classes')) bodies.push(text); // creating a class answers with its own owner_email, as before
  return { status: res.status, body: JSON.parse(text) };
}
const PNG = 'data:image/png;base64,' + Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48]).toString('base64');
const rowsFor = (id) => all(`SELECT class_id, hidden_at FROM library_shares WHERE item_id = ? ORDER BY class_id`, id).map((r) => r.class_id).join(',');
const gRowsFor = (id) => all(`SELECT class_id FROM library_game_shares WHERE game_id = ? ORDER BY class_id`, id).map((r) => r.class_id).join(',');
// How many times the item (or game) under test is in what this person sees (0 or 1), so other shares in the
// same classes, like the teacher's own picture below, do not count.
let ITEM_ID = null;
const GAME_ID = 'a'.repeat(32);
const sees = async (u, kind = 'item') => kind === 'item'
  ? ((await call(shared.onRequestGet, u, '/api/library/shared')).body.items ?? []).filter((i) => i.id === ITEM_ID).length
  : ((await call(gshared.onRequestGet, u, '/api/games/shared')).body.games ?? []).filter((g) => g.id === GAME_ID).length;

// ---- 1. the picker's options ----
let r = await call(aud.onRequestGet, ANA, '/api/audiences');
const opts = r.body;
check('a student with two classes is offered both, each with its teacher', opts.classes.map((c) => c.name).join('|') === 'Period 1|Robotics' && opts.classes[0].teacherName === 'Tess W.', opts);
check('...and one entry per teacher with how many live classes they have', opts.teachers.length === 2 && opts.teachers.find((t) => t.name === 'Tess W.')?.classCount === 2 && opts.teachers.find((t) => t.name === 'Tom R.')?.classCount === 1, opts.teachers);
check("...never another class's name, never an email", !JSON.stringify(opts).includes('Secret') && !JSON.stringify(opts).includes('@s.test'));
const T1_K = opts.teachers.find((t) => t.name === 'Tess W.').key;
const T2_K = opts.teachers.find((t) => t.name === 'Tom R.').key;
r = await call(aud.onRequestGet, T1, '/api/audiences');
check('a teacher is offered the classes they teach and no teacher-wide rung', r.body.classes.map((c) => c.id).sort().join() === 'C1,C3' && r.body.teachers.length === 0, r.body);

// ---- 2. no audience = every class (the old behaviour) ----
const saved = await call(lib.onRequestPut, ANA, '/api/library', {}, 'PUT', { kind: 'texture', name: 'dragon', dataUri: PNG, meta: null });
const ID = saved.body.item.id;
ITEM_ID = ID;
const share$ = (u, id, body) => call(share.onRequestPost, u, `/api/library/${id}/share`, { id }, 'POST', body);
r = await share$(ANA, ID, { share: true });
check('sharing with no audience goes to every class she is in', r.status === 200 && rowsFor(ID) === 'C1,C2' && r.body.classes === 2, r);
check('...Ben (C1) and Dee (C2) both see it', (await sees(BEN)) === 1 && (await sees(DEE)) === 1);
r = await call(lib.onRequestGet, ANA, '/api/library');
check("her list reports the audience: the classes, not a teacher", r.body.items[0].audience?.kind === 'classes' && r.body.items[0].audience.classes.sort().join() === 'C1,C2', r.body.items[0]);

// ---- 3. a ticked subset ----
r = await share$(ANA, ID, { share: true, audience: { classes: ['C1'] } });
check('ticking only Period 1 leaves exactly that row', r.status === 200 && rowsFor(ID) === 'C1' && r.body.audience?.classes?.join() === 'C1', r);
check('...Dee (Robotics) no longer sees it, Ben still does', (await sees(DEE)) === 0 && (await sees(BEN)) === 1);
r = await share$(ANA, ID, { share: true, audience: { classes: ['C1', 'C3'] } });
check("a class she is not in is refused (400), nothing changes", r.status === 400 && rowsFor(ID) === 'C1', r);
r = await share$(ANA, ID, { share: true, audience: { classes: [] } });
check('an empty list is refused', r.status === 400 && rowsFor(ID) === 'C1', r);
r = await share$(ANA, ID, { share: true, audience: { classes: 'C1' } });
check('a list that is not a list is refused', r.status === 400);
r = await share$(ANA, ID, { share: true, audience: 'everyone' });
check('an audience that is not an object is refused', r.status === 400);
r = await share$(ANA, ID, { share: true, audience: { classes: ['C1', 'C2'] } });
check('ticking both works again', r.status === 200 && rowsFor(ID) === 'C1,C2' && (await sees(DEE)) === 1);

// changing only "who may do what" must never change who it goes to
await share$(ANA, ID, { share: true, audience: { classes: ['C1'] } });
r = await share$(ANA, ID, { share: true, choice: 'open' });
check('a re-share with no audience keeps a narrowed share narrow (the choice still changes)', r.status === 200 && rowsFor(ID) === 'C1' && r.body.choice === 'open' && r.body.audience?.classes?.join() === 'C1', r);
await share$(ANA, ID, { share: true, audience: { classes: ['C1', 'C2'] } });

// ---- 4. all of a teacher's classes ----
r = await share$(ANA, ID, { share: true, audience: { teacher: T1_K } });
check("all of Tess's classes: Period 1 AND Period 3, and Robotics goes", r.status === 200 && rowsFor(ID) === 'C1,C3' && r.body.audience?.kind === 'teacher' && r.body.audience.teacher === T1_K, r);
check("...Cy, who is only in Tess's other period, now sees it; Dee does not", (await sees(CY)) === 1 && (await sees(DEE)) === 0 && (await sees(BEN)) === 1);
check("...someone with no link to Tess's classes does not", (await sees(OUT)) === 0);
check("...and the answer never names Period 3", !JSON.stringify(r.body).includes('Secret'));
r = await call(lib.onRequestGet, ANA, '/api/library');
check('her list says it is teacher-wide, by key', r.body.items[0].audience?.kind === 'teacher' && r.body.items[0].audience.teacher === T1_K, r.body.items[0]);
check('...and the teacher is remembered server-side', all(`SELECT audience_teacher FROM library_items WHERE id = ?`, ID)[0].audience_teacher === 't1@s.test');
r = await call(aud.onRequestGet, OUT, '/api/audiences');
const T3_K = r.body.teachers[0].key;
r = await share$(ANA, ID, { share: true, audience: { teacher: T3_K } });
check('a teacher she has no class with is refused', r.status === 400 && rowsFor(ID) === 'C1,C3', r);
r = await share$(ANA, ID, { share: true, audience: { teacher: 'p' + 'ab'.repeat(10) } });
check('a made-up key is refused', r.status === 400);
r = await share$(ANA, ID, { share: true, audience: { teacher: 'not a key' } });
check('a malformed key is refused', r.status === 400);
r = await share$(ANA, ID, { share: true, choice: 'credit' });
check('...and keeps a teacher-wide share teacher-wide', r.status === 200 && rowsFor(ID) === 'C1,C3' && r.body.audience?.kind === 'teacher' && all(`SELECT audience_teacher FROM library_items WHERE id = ?`, ID)[0].audience_teacher === 't1@s.test', r);
const tsaved = await call(lib.onRequestPut, T1, '/api/library', {}, 'PUT', { kind: 'texture', name: 'tpic', dataUri: PNG, meta: null });
r = await share$(T1, tsaved.body.item.id, { share: true, audience: { teacher: T1_K } });
check('a teacher cannot use the teacher-wide rung', r.status === 400, r);
r = await share$(T1, tsaved.body.item.id, { share: true, audience: { classes: ['C1', 'C3'] } });
check('...a teacher ticks classes they teach', r.status === 200 && rowsFor(tsaved.body.item.id) === 'C1,C3', r);

// ---- 5. a share a teacher hid stays hidden ----
sql(`UPDATE library_shares SET hidden_at = ?, hidden_by = 't1@s.test' WHERE item_id = ? AND class_id = 'C3'`, now, ID);
check('Cy no longer sees it once Period 3 hid it', (await sees(CY)) === 0);
await share$(ANA, ID, { share: true, audience: { teacher: T1_K } });
check('choosing the same audience again does not unhide it', all(`SELECT hidden_at FROM library_shares WHERE item_id = ? AND class_id = 'C3'`, ID)[0].hidden_at !== null && (await sees(CY)) === 0);

// ---- 6. a class that gains the teacher gets the item ----
r = await call(classes.onRequestPost, T1, '/api/classes', {}, 'POST', { name: 'Period 5' });
const C5 = r.body.class.id;
check('a class the teacher creates later receives a teacher-wide item', r.status === 201 && rowsFor(ID).split(',').includes(C5), rowsFor(ID));
check("...but not one that was shared with just some classes", rowsFor(tsaved.body.item.id) === 'C1,C3');
r = await call(coteach.onRequestPost, T2, '/api/classes/C2/teachers', { id: 'C2' }, 'POST', { email: 't1@s.test' });
check('a class the teacher is made co-teacher of receives it too', r.status === 201 && rowsFor(ID).split(',').includes('C2'), { s: r.status, rows: rowsFor(ID) });
check('...so Dee (Robotics) sees it now', (await sees(DEE)) === 1);
r = await share$(ANA, ID, { share: true, audience: { classes: ['C1'] } });
check('narrowing to Period 1 removes every other row', rowsFor(ID) === 'C1' && all(`SELECT audience_teacher FROM library_items WHERE id = ?`, ID)[0].audience_teacher === null);
r = await call(classes.onRequestPost, T1, '/api/classes', {}, 'POST', { name: 'Period 6' });
check('...and a later class no longer gets it', !rowsFor(ID).includes(r.body.class.id));

// unsharing forgets the teacher
await share$(ANA, ID, { share: true, audience: { teacher: T1_K } });
r = await share$(ANA, ID, { share: false });
check('stopping the share clears every row and the teacher', r.status === 200 && rowsFor(ID) === '' && all(`SELECT audience_teacher FROM library_items WHERE id = ?`, ID)[0].audience_teacher === null);
r = await call(classes.onRequestPost, T1, '/api/classes', {}, 'POST', { name: 'Period 7' });
check('...so a new class gets nothing', rowsFor(ID) === '');

// ---- 7. games ----
const GID = GAME_ID;
sql(`INSERT INTO library_games (id, owner_email, title, code, mode, players, created_at, updated_at) VALUES (?, 'ana@s.test', 'Dodge', 'let x = 1;', 'none', 1, ?, ?)`, GID, now, now);
const g$ = (u, body) => call(gshare.onRequestPost, u, `/api/games/${GID}/share`, { id: GID }, 'POST', body);
r = await g$(ANA, { share: true });
check('a game with no audience goes to every class she is in', r.status === 200 && gRowsFor(GID) === 'C1,C2');
r = await g$(ANA, { share: true, audience: { classes: ['C2'] } });
check('a ticked subset works for a game', r.status === 200 && gRowsFor(GID) === 'C2' && (await sees(BEN, 'game')) === 0 && (await sees(DEE, 'game')) === 1);
r = await g$(ANA, { share: true, audience: { classes: ['C3'] } });
check('a game cannot go into a class she is not in', r.status === 400 && gRowsFor(GID) === 'C2');
r = await g$(ANA, { share: true, audience: { teacher: T1_K } });
check("a game goes to all of the teacher's classes; Cy sees it", r.status === 200 && ['C1', 'C3'].every((c) => gRowsFor(GID).split(',').includes(c)) && !gRowsFor(GID).split(',').includes('C4') && (await sees(CY, 'game')) === 1);
r = await g$(ANA, { share: true, choice: 'open' });
check('a game re-shared with no audience keeps its teacher-wide audience', r.status === 200 && r.body.audience?.kind === 'teacher' && all(`SELECT audience_teacher FROM library_games WHERE id = ?`, GID)[0].audience_teacher === 't1@s.test', r);
r = await call(gone.onRequestGet, ANA, `/api/games/${GID}`, { id: GID });
check("the owner's single-game answer reports the audience too", r.status === 200 && r.body.game.audience?.kind === 'teacher' && r.body.game.audience.teacher === T1_K, r.body.game);
r = await call(gone.onRequestGet, CY, `/api/games/${GID}`, { id: GID });
check('...but a classmate is not told how it was shared', r.status === 200 && r.body.game.audience === undefined && r.body.game.shared === undefined);
r = await call(games.onRequestGet, ANA, '/api/games');
check("her games list reports the audience", r.body.games[0].audience?.kind === 'teacher' && r.body.games[0].audience.teacher === T1_K, r.body.games[0]);
r = await call(classes.onRequestPost, T1, '/api/classes', {}, 'POST', { name: 'Period 8' });
check('a new class of that teacher receives the game too', gRowsFor(GID).includes(r.body.class.id));
r = await g$(ANA, { share: false });
check('stopping the share of a game clears everything', gRowsFor(GID) === '' && all(`SELECT audience_teacher FROM library_games WHERE id = ?`, GID)[0].audience_teacher === null);
r = await call(gshare.onRequestPost, BEN, `/api/games/${GID}/share`, { id: GID }, 'POST', { share: true });
check("nobody shares someone else's game (404)", r.status === 404);

check('no answer names an email', !bodies.some((b) => /@s\.test/.test(b)));
void T2_K; void BEN;

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
