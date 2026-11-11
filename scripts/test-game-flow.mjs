#!/usr/bin/env node
// The Games library's change flow (migration 0048): versions, proposed changes and their conversations,
// on a real SQLite with every migration applied, through the real handlers. What has to hold:
//   1. every publish and update saves a version; an update's "What did you change?" is checked, a body
//      without one (a stale page) still saves; a game from before 0048 gets its old code as version 1;
//      only the newest 20 are kept; going back makes a NEW version and is maker-only;
//   2. history and proposals are seen by the maker, a classmate who may see the code, and the class's
//      teachers; a "just play" game's history is not; a stranger and another class get 404;
//   3. a classmate proposes a change; the maker cannot; the same code as the base is refused; proposing
//      again updates the open one; the open-per-game cap holds;
//   4. any classmate who can see the game can join the conversation; the maker or a teacher can close
//      it (teachers can still post); a comment's author or a teacher can delete it;
//   5. Accept merges and saves a new version credited to the proposer, only for the version the maker
//      looked at; a conflict is a 409 that leaves the game untouched; No thanks, Take it back, reopen;
//   6. a teacher can remove a proposal (gone for classmates, kept for its proposer); the class route
//      lists proposals and comments for the class's teachers only;
//   7. deleting a game closes its open proposals; Clear Library removes a student's open proposals;
//   8. no response carries an email.
// Run: node --import ./scripts/register-ts.mjs scripts/test-game-flow.mjs

import { join } from 'node:path';
import { compileHandler, makeD1, root } from './_d1-sqlite.mjs';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log(`PASS  ${name}`); }
  else { failed++; console.error(`FAIL  ${name}${detail !== undefined ? ' -- ' + JSON.stringify(detail).slice(0, 500) : ''}`); }
}

const out = join(root, '.tmp', 'game-flow-test');
const games = compileHandler('api/games/index.ts', join(out, 'a'));
const one = compileHandler('api/games/[id].ts', join(out, 'b'));
const share = compileHandler('api/games/[id]/share.ts', join(out, 'c'));
const versions = compileHandler('api/games/[id]/versions.ts', join(out, 'd'));
const changes = compileHandler('api/games/[id]/changes.ts', join(out, 'e'));
const change = compileHandler('api/game-changes/[cid].ts', join(out, 'f'));
const inbox = compileHandler('api/game-changes/index.ts', join(out, 'g'));
const classChanges = compileHandler('api/classes/[id]/game-changes.ts', join(out, 'h'));
const del = compileHandler('_shared/libraryDelete.ts', join(out, 'i'));
const core = compileHandler('../lib/game-flow-core.ts', join(out, 'j'));

const db = makeD1();
const env = { DB: db };
const now = Date.now();
const FAR = now + 1e10;
const sql = (q, ...a) => db.sqlite.prepare(q).run(...a);
const people = [
  ['ana@s.test', 'Ana', 'Lopez', 'student'], ['ben@s.test', 'Ben', 'Diaz', 'student'], ['cat@s.test', 'Cat', 'Moss', 'student'],
  ['dan@s.test', 'Dan', 'Wu', 'student'], ['out@s.test', 'Out', 'Sider', 'student'], ['t1@s.test', 'Tess', 'One', 'teacher'],
  ['t2@s.test', 'Tom', 'Two', 'teacher'],
];
for (const [email, first, last, role] of people) {
  sql(`INSERT INTO students (email, password_hash, created_at, role, first_name, last_name) VALUES (?, 'x', ?, ?, ?, ?)`, email, now, role, first, last);
}
sql(`INSERT INTO classes (id, name, code, owner_email, school_year, created_at) VALUES ('C1', 'Period 1', 'AAAAAA', 't1@s.test', '2026-2027', ?)`, now);
sql(`INSERT INTO classes (id, name, code, owner_email, school_year, created_at) VALUES ('C2', 'Period 2', 'BBBBBB', 't2@s.test', '2026-2027', ?)`, now);
for (const [c, e] of [['C1', 'ana@s.test'], ['C1', 'ben@s.test'], ['C1', 'cat@s.test'], ['C1', 'dan@s.test'], ['C2', 'out@s.test']]) {
  sql(`INSERT INTO enrollments (class_id, student_email, enrolled_at, expires_at) VALUES (?, ?, ?, ?)`, c, e, now, FAR);
}
const U = (email, role = 'student') => ({ email, role });
const ANA = U('ana@s.test'), BEN = U('ben@s.test'), CAT = U('cat@s.test'), DAN = U('dan@s.test'), OUT = U('out@s.test');
const T1 = U('t1@s.test', 'teacher'), T2 = U('t2@s.test', 'teacher');

const seenBodies = [];
async function call(fn, user, url, params = {}, method = 'GET', body) {
  const request = new Request(`https://x.test${url}`, {
    method, body: body === undefined ? undefined : JSON.stringify(body), headers: { 'Content-Type': 'application/json' },
  });
  const res = await fn({ env, data: user, params, request });
  const text = await res.text();
  seenBodies.push({ url, user: user.email, text });
  return { status: res.status, body: JSON.parse(text) };
}
const getChange = (u, cid) => call(change.onRequestGet, u, `/api/game-changes/${cid}`, { cid });
const act = (u, cid, body) => call(change.onRequestPost, u, `/api/game-changes/${cid}`, { cid }, 'POST', body);
const propose = (u, gid, body) => call(changes.onRequestPost, u, `/api/games/${gid}/changes`, { id: gid }, 'POST', body);

const CODE = [
  'function setup() {',
  '  new Canvas(400, 300);',
  '  player = new Sprite(50, 150, 20, 20);',
  '  speed = 3;',
  '}',
  'function draw() {',
  '  background(20);',
  '  text("score", 10, 20);',
  '}',
  '',
].join('\n');

// ---- pure rules ---------------------------------------------------------------
check('cleanMessage collapses spaces and refuses markup', core.cleanMessage('  added   a level ').message === 'added a level' && 'error' in core.cleanMessage('<b>'));
check('cleanMessage: 80 fine, 81 not, empty not', 'message' in core.cleanMessage('x'.repeat(80)) && 'error' in core.cleanMessage('x'.repeat(81)) && 'error' in core.cleanMessage('  '));
check('cleanComment keeps line breaks and < >, collapses blank runs', core.cleanComment('try `a < b`\n\n\n\nok').body === 'try `a < b`\n\nok');
check('cleanComment: 1000 fine, 1001 not, 31 lines not', 'body' in core.cleanComment('x'.repeat(1000)) && 'error' in core.cleanComment('x'.repeat(1001)) && 'error' in core.cleanComment(Array(31).fill('a').join('\n')));
check('cleanComment refuses control characters', 'error' in core.cleanComment('hi\u0007'));
const can = core.changeCan({ maker: false, proposer: false, teacher: false }, 'open', false);
check('changeCan: a classmate may only comment', can.comment && !can.accept && !can.withdraw && !can.lock && !can.remove);
const canLocked = core.changeCan({ maker: false, proposer: true, teacher: false }, 'open', true);
check('changeCan: locked stops a student comment, not Take it back', !canLocked.comment && canLocked.withdraw);
check('changeCan: a teacher can comment on a locked one', core.changeCan({ maker: false, proposer: false, teacher: true }, 'open', true).comment);
check('changeCan: accepted keeps the conversation; removed and closed do not', core.changeCan({ maker: false, proposer: false, teacher: false }, 'accepted', false).comment
  && !core.changeCan({ maker: false, proposer: false, teacher: false }, 'removed', false).comment
  && !core.changeCan({ maker: false, proposer: false, teacher: false }, 'closed', false).comment
  && !core.changeCan({ maker: true, proposer: false, teacher: false }, 'closed', false).lock);
check('changeCan: the maker reopens a declined one, the proposer a withdrawn one',
  core.changeCan({ maker: true, proposer: false, teacher: false }, 'declined', false).reopen
  && core.changeCan({ maker: false, proposer: true, teacher: false }, 'withdrawn', false).reopen
  && !core.changeCan({ maker: false, proposer: true, teacher: false }, 'declined', false).reopen);
check('contributorNames: accepted only, once each, in order',
  JSON.stringify(core.contributorNames([{ author: 'Ben D.', byChange: true }, { author: 'Ana L.', byChange: false }, { author: 'Cat M.', byChange: true }, { author: 'Ben D.', byChange: true }])) === '["Ben D.","Cat M."]');

// ---- 1. versions ----------------------------------------------------------------
let r = await call(games.onRequestPost, ANA, '/api/games', {}, 'POST', { title: 'Dodge', code: CODE });
const gid = r.body.game?.id;
check('publish answers version 1', r.status === 201 && r.body.game.version === 1, r);
r = await call(versions.onRequestGet, ANA, `/api/games/${gid}/versions`, { id: gid });
check('a new game has one version, "First version", by its maker', r.status === 200 && r.body.versions.length === 1 && r.body.versions[0].message === 'First version' && r.body.versions[0].author === 'Ana L.', r.body);

const CODE_V2 = CODE.replace('background(20);', 'background(0);');
r = await call(games.onRequestPost, ANA, '/api/games', {}, 'POST', { id: gid, title: 'Dodge', code: CODE_V2, message: '  darker   background ' });
check('an update saves version 2 with its note', r.status === 200 && r.body.game.version === 2, r);
r = await call(games.onRequestPost, ANA, '/api/games', {}, 'POST', { id: gid, title: 'Dodge', code: CODE_V2, message: '<script>' });
check('a note with markup is refused (400) and nothing is saved', r.status === 400, r);
r = await call(games.onRequestPost, ANA, '/api/games', {}, 'POST', { id: gid, title: 'Dodge', code: CODE_V2 });
check('an update with no note (a stale page) still saves, as "Updated the game"', r.status === 200 && r.body.game.version === 3, r);
r = await call(versions.onRequestGet, ANA, `/api/games/${gid}/versions`, { id: gid });
check('history lists 3, 2, 1 with their notes', r.body.versions.map((v) => `${v.version}:${v.message}`).join('|') === '3:Updated the game|2:darker background|1:First version', r.body);
r = await call(versions.onRequestGet, ANA, `/api/games/${gid}/versions?v=2`, { id: gid });
check('one version comes with its code and the one before it', r.body.version?.code === CODE_V2 && r.body.version.previous?.code === CODE && r.body.current === 3, r.body);

// a game from before 0048: no version rows, version 1
sql(`INSERT INTO library_games (id, owner_email, title, code, mode, players, created_at, updated_at) VALUES (?, 'ana@s.test', 'Old', 'old();', 'none', 1, ?, ?)`, 'a'.repeat(32), now - 1000, now - 1000);
r = await call(games.onRequestPost, ANA, '/api/games', {}, 'POST', { id: 'a'.repeat(32), title: 'Old', code: 'new();', message: 'new code' });
const oldRows = db.sqlite.prepare(`SELECT version, code, message FROM library_game_versions WHERE game_id = ? ORDER BY version`).all('a'.repeat(32));
check('a game from before versions keeps its old code as version 1', r.body.game?.version === 2 && oldRows.length === 2 && oldRows[0].code === 'old();' && oldRows[0].message === 'First version' && oldRows[1].code === 'new();', oldRows);

// pruning
for (let i = 0; i < 22; i++) await call(games.onRequestPost, ANA, '/api/games', {}, 'POST', { id: 'a'.repeat(32), title: 'Old', code: `v${i}();`, message: `step ${i}` });
const kept = db.sqlite.prepare(`SELECT MIN(version) AS lo, MAX(version) AS hi, COUNT(*) AS n FROM library_game_versions WHERE game_id = ?`).get('a'.repeat(32));
check('only the newest 20 versions are kept', kept.n === 20 && kept.hi === 24 && kept.lo === 5, kept);

// revert
r = await call(versions.onRequestPost, ANA, `/api/games/${gid}/versions`, { id: gid }, 'POST', { revertTo: 1 });
check('going back to version 1 makes version 4', r.status === 200 && r.body.version === 4, r);
r = await call(one.onRequestGet, ANA, `/api/games/${gid}`, { id: gid });
check('the game has version 1\'s code again', r.body.game.code === CODE && r.body.game.version === 4, r.body.game);
r = await call(versions.onRequestPost, ANA, `/api/games/${gid}/versions`, { id: gid }, 'POST', { revertTo: 1 });
check('going back to the same code again is refused (400)', r.status === 400, r);
r = await call(versions.onRequestPost, BEN, `/api/games/${gid}/versions`, { id: gid }, 'POST', { revertTo: 2 });
check('a stranger cannot even see it (404)', r.status === 404, r);

// ---- 2. who sees ----------------------------------------------------------------
r = await call(share.onRequestPost, ANA, `/api/games/${gid}/share`, { id: gid }, 'POST', { share: true });
check('Ana shares Dodge with her class', r.status === 200 && r.body.shared === true, r);
r = await call(versions.onRequestGet, BEN, `/api/games/${gid}/versions`, { id: gid });
check('a classmate sees the history (no emails, mine false)', r.status === 200 && r.body.mine === false && r.body.versions.length === 4, r.body);
r = await call(versions.onRequestPost, BEN, `/api/games/${gid}/versions`, { id: gid }, 'POST', { revertTo: 2 });
check('a classmate cannot go back (403)', r.status === 403, r);
r = await call(versions.onRequestGet, OUT, `/api/games/${gid}/versions`, { id: gid });
check('a student in another class gets 404', r.status === 404, r);
r = await call(versions.onRequestGet, T1, `/api/games/${gid}/versions`, { id: gid });
check('the class teacher sees the history', r.status === 200, r);
r = await call(versions.onRequestGet, T2, `/api/games/${gid}/versions`, { id: gid });
check('another class\'s teacher gets 404', r.status === 404, r);

// ---- 3. propose ------------------------------------------------------------------
const BEN_CODE = CODE.replace('speed = 3;', 'speed = 5;');
r = await propose(ANA, gid, { title: 'faster', code: BEN_CODE, baseVersion: 4 });
check('the maker cannot propose to their own game (400)', r.status === 400 && /your own game/.test(r.body.error), r);
r = await propose(BEN, gid, { title: 'nothing', code: CODE + '\n\n', baseVersion: 4 });
check('the same code as the base (bar blank lines) is refused (400)', r.status === 400 && /Nothing has changed/.test(r.body.error), r);
r = await propose(BEN, gid, { title: '', code: BEN_CODE, baseVersion: 4 });
check('a proposal needs a title (400)', r.status === 400, r);
r = await propose(OUT, gid, { title: 'x', code: BEN_CODE, baseVersion: 4 });
check('a student in another class cannot propose (404)', r.status === 404, r);
r = await propose(BEN, gid, { title: 'faster player', code: BEN_CODE, baseVersion: 4, note: 'It felt slow.\nI tried 5 and it is better.' });
const cid = r.body.id;
check('Ben proposes a change (201)', r.status === 201 && /^[0-9a-f]{32}$/.test(cid) && r.body.created === true && r.body.baseVersion === 4, r);
r = await propose(BEN, gid, { title: 'faster player', code: CODE.replace('speed = 3;', 'speed = 6;'), baseVersion: 4 });
check('proposing again updates the open one', r.status === 200 && r.body.created === false && r.body.id === cid, r);
r = await propose(BEN, gid, { title: 'faster player', code: BEN_CODE, baseVersion: 4 });
r = await propose(CAT, gid, { title: 'unknown base', code: CODE.replace('text("score", 10, 20);', 'text("SCORE", 10, 20);'), baseVersion: 99 });
const catCid = r.body.id;
check('a base that does not exist falls back to the game now', r.status === 201 && r.body.rebased === true && r.body.baseVersion === 4, r);

r = await call(changes.onRequestGet, DAN, `/api/games/${gid}/changes`, { id: gid });
check('a classmate lists the game\'s proposals with sizes', r.status === 200 && r.body.changes.length === 2 && r.body.changes.every((c) => c.status === 'open' && c.size.added >= 1), r.body);

// ---- 4. the conversation ----------------------------------------------------------
r = await getChange(CAT, cid);
check('a classmate opens Ben\'s proposal and may comment, not accept', r.status === 200 && r.body.can.comment && !r.body.can.accept && !r.body.can.withdraw, r.body.can);
check('the conversation starts with "opened", Ben\'s note, "updated" x2', r.body.conversation.map((c) => c.kind === 'event' ? c.body : 'comment').join(',') === 'opened,comment,updated,updated', r.body.conversation);
check('Ben\'s note is kept with its line break and badged proposer', r.body.conversation[1].body === 'It felt slow.\nI tried 5 and it is better.' && r.body.conversation[1].badge === 'proposer', r.body.conversation[1]);
check('"after accepting" is the proposal (the game did not move)', r.body.after?.ok === true && r.body.after.code === BEN_CODE, r.body.after);
r = await act(CAT, cid, { action: 'comment', body: 'Nice! Maybe 4?' });
check('Cat joins the conversation', r.status === 200, r);
r = await act(DAN, cid, { action: 'comment', body: '   ' });
check('an empty comment is refused (400)', r.status === 400, r);
r = await act(ANA, cid, { action: 'comment', body: 'Trying it now.' });
r = await getChange(ANA, cid);
check('the maker\'s comment is badged maker', r.body.conversation.at(-1).badge === 'maker' && r.body.conversation.at(-1).author === 'Ana L.', r.body.conversation.at(-1));
r = await getChange(OUT, cid);
check('a student in another class cannot open the conversation (404)', r.status === 404, r);
r = await getChange(T2, cid);
check('another class\'s teacher cannot either (404)', r.status === 404, r);

r = await act(CAT, cid, { action: 'lock' });
check('a classmate cannot close the conversation (403)', r.status === 403, r);
r = await act(ANA, cid, { action: 'lock' });
check('the maker closes the conversation', r.status === 200, r);
r = await act(CAT, cid, { action: 'comment', body: 'one more' });
check('a closed conversation refuses a student comment (403)', r.status === 403, r);
r = await act(T1, cid, { action: 'comment', body: 'Let\'s keep it about the code, please.' });
check('a teacher can still post in a closed one', r.status === 200, r);
r = await act(T1, cid, { action: 'unlock' });
check('a teacher opens it again', r.status === 200, r);

r = await getChange(CAT, cid);
const catComment = r.body.conversation.find((c) => c.author === 'Cat M.' && c.kind === 'comment');
const benNote = r.body.conversation.find((c) => c.author === 'Ben D.' && c.kind === 'comment');
check('Cat may delete her own comment, not Ben\'s', catComment.canDelete === true && benNote.canDelete === false);
r = await act(BEN, cid, { action: 'delete-comment', commentId: catComment.id });
check('Ben cannot delete Cat\'s comment (403)', r.status === 403, r);
r = await act(CAT, cid, { action: 'delete-comment', commentId: catComment.id });
check('Cat deletes her comment', r.status === 200, r);
r = await act(T1, cid, { action: 'delete-comment', commentId: benNote.id });
check('a teacher deletes Ben\'s note', r.status === 200, r);
r = await getChange(DAN, cid);
const gone = r.body.conversation.filter((c) => c.deleted);
check('deleted comments stay as markers with no text (author / teacher)', gone.length === 2 && gone.every((c) => c.body === '') && gone.map((c) => c.deleted).sort().join() === 'author,teacher', gone);
const teacherPost = r.body.conversation.find((c) => c.author === 'Tess O.');
check('the teacher\'s comment is badged teacher', teacherPost?.badge === 'teacher', teacherPost);

// ---- 5. accept, conflicts, no thanks ------------------------------------------------
r = await act(BEN, cid, { action: 'accept', expectVersion: 4 });
check('the proposer cannot accept (403)', r.status === 403, r);
r = await act(ANA, cid, { action: 'accept', expectVersion: 3 });
check('accepting a version the maker did not look at is refused (409)', r.status === 409 && r.body.moved === true, r);
// Ana changes a different line first: the merge must carry both.
await call(games.onRequestPost, ANA, '/api/games', {}, 'POST', { id: gid, title: 'Dodge', code: CODE.replace('background(20);', 'background(5);'), message: 'nearly black' });
r = await getChange(ANA, cid);
check('after Ana\'s own edit, "after accepting" carries both', r.body.after?.ok && r.body.after.code.includes('speed = 5;') && r.body.after.code.includes('background(5);') && r.body.game.version === 5, r.body.after);
r = await act(ANA, cid, { action: 'accept', expectVersion: 5 });
check('Ana accepts: version 6', r.status === 200 && r.body.version === 6, r);
r = await call(one.onRequestGet, CAT, `/api/games/${gid}`, { id: gid });
check('the game has both changes and credits Ben', r.body.game.version === 6 && r.body.game.code.includes('speed = 5;') && r.body.game.code.includes('background(5);') && JSON.stringify(r.body.game.contributors) === '["Ben D."]', r.body.game);
r = await call(versions.onRequestGet, CAT, `/api/games/${gid}/versions`, { id: gid });
check('version 6 is Ben\'s, marked as an accepted change', r.body.versions[0].version === 6 && r.body.versions[0].author === 'Ben D.' && r.body.versions[0].byChange === true && /^Ben D\.'s change: faster player/.test(r.body.versions[0].message), r.body.versions[0]);
r = await getChange(BEN, cid);
check('the proposal reads accepted, version 6, with an event', r.body.change.status === 'accepted' && r.body.change.acceptedVersion === 6 && r.body.conversation.at(-1).body === 'accepted' && r.body.conversation.at(-1).extra === 6 && !r.body.can.accept, r.body.change);
r = await act(ANA, cid, { action: 'accept', expectVersion: 6 });
check('accepting twice is refused (403)', r.status === 403, r);

// Cat's proposal changed the score text from version 4; Dan proposes the same line differently.
r = await getChange(ANA, catCid);
check('Cat\'s change still merges after Ben\'s (different line)', r.body.after?.ok === true, r.body.after);
r = await propose(DAN, gid, { title: 'bigger score', code: r.body.game.code.replace('text("score", 10, 20);', 'text("score", 10, 30);'), baseVersion: 6 });
const danCid = r.body.id;
r = await act(ANA, catCid, { action: 'accept', expectVersion: 6 });
check('Ana accepts Cat\'s: version 7', r.status === 200 && r.body.version === 7, r);
const before = (await call(one.onRequestGet, ANA, `/api/games/${gid}`, { id: gid })).body.game;
r = await getChange(DAN, danCid);
check('Dan\'s now clashes: no "after" code, a plain sentence for the proposer', r.body.after?.ok === false && /Bring in the newest version/.test(r.body.after.text) && r.body.after.lines[0] === 8, r.body.after);
r = await act(ANA, danCid, { action: 'accept', expectVersion: 7 });
check('accepting a conflict is a 409 with conflict: true', r.status === 409 && r.body.conflict === true, r);
const afterConflict = (await call(one.onRequestGet, ANA, `/api/games/${gid}`, { id: gid })).body.game;
check('...and the game is untouched', afterConflict.version === 7 && afterConflict.code === before.code);

r = await act(ANA, danCid, { action: 'decline', reply: 'Thanks, but Cat already changed that line.' });
check('No thanks with a reply', r.status === 200, r);
r = await getChange(DAN, danCid);
check('it reads "Not taken" with the reply then the event; the conversation stays open', r.body.change.status === 'declined' && r.body.conversation.at(-2).body.startsWith('Thanks, but') && r.body.conversation.at(-1).body === 'declined' && r.body.can.comment, r.body.conversation.slice(-2));
r = await act(DAN, danCid, { action: 'comment', body: 'Fair, thanks!' });
check('a decided change still takes comments, as a closed pull request does', r.status === 200, r);
r = await act(DAN, danCid, { action: 'reopen' });
check('the proposer cannot reopen what the maker said no to (403)', r.status === 403, r);
r = await act(ANA, danCid, { action: 'reopen' });
check('the maker can', r.status === 200, r);
r = await act(DAN, danCid, { action: 'withdraw' });
check('Dan takes it back', r.status === 200, r);
r = await act(DAN, danCid, { action: 'reopen' });
check('and opens it again himself', r.status === 200, r);

// the open-per-game cap
const g2 = (await call(games.onRequestPost, BEN, '/api/games', {}, 'POST', { title: 'Cap', code: CODE })).body.game.id;
await call(share.onRequestPost, BEN, `/api/games/${g2}/share`, { id: g2 }, 'POST', { share: true });
for (let i = 0; i < 10; i++) sql(`INSERT INTO game_changes (id, game_id, from_email, from_name, title, base_version, base_code, code, status, created_at, updated_at) VALUES (?, ?, ?, 'X Y.', 't', 1, '', 'x', 'open', ?, ?)`, String(i).padStart(32, '0'), g2, `x${i}@s.test`, now, now);
r = await propose(CAT, g2, { title: 'one more', code: CODE + 'more();', baseVersion: 1 });
check('an 11th open proposal on one game is refused (429)', r.status === 429, r);

// ---- 6. teachers ---------------------------------------------------------------------
r = await act(CAT, danCid, { action: 'remove' });
check('a student cannot remove a proposal (403)', r.status === 403, r);
r = await act(T1, danCid, { action: 'remove' });
check('the class teacher removes Dan\'s proposal', r.status === 200, r);
r = await getChange(CAT, danCid);
check('a removed proposal is gone for classmates (404)', r.status === 404, r);
r = await getChange(DAN, danCid);
check('its proposer still sees it, marked removed', r.status === 200 && r.body.change.status === 'removed', r.body.change);
r = await call(changes.onRequestGet, CAT, `/api/games/${gid}/changes`, { id: gid });
check('the game\'s list leaves it out for classmates', !r.body.changes.some((c) => c.id === danCid), r.body.changes);

r = await call(classChanges.onRequestGet, T1, '/api/classes/C1/game-changes', { id: 'C1' });
check('the class route lists every proposal and the newest comments', r.status === 200 && r.body.changes.some((c) => c.id === danCid && c.status === 'removed') && r.body.recentComments.length >= 3, r.body);
check('deleted comments show there as markers', r.body.recentComments.some((c) => c.deleted === 'teacher' && c.body === ''), r.body.recentComments);
r = await call(classChanges.onRequestGet, CAT, '/api/classes/C1/game-changes', { id: 'C1' });
check('a student cannot use the class route (403)', r.status === 403, r);
r = await call(classChanges.onRequestGet, T2, '/api/classes/C1/game-changes', { id: 'C1' });
check('another class\'s teacher cannot (403)', r.status === 403, r);

// ---- inbox -----------------------------------------------------------------------------
r = await call(inbox.onRequestGet, ANA, '/api/game-changes');
check('Ana\'s inbox: received Ben\'s and Cat\'s, not the removed one', r.body.received.some((c) => c.id === cid) && r.body.received.some((c) => c.id === catCid) && !r.body.received.some((c) => c.id === danCid), r.body.received);
r = await call(inbox.onRequestGet, BEN, '/api/game-changes');
check('Ben\'s inbox: sent his, accepted', r.body.sent.some((c) => c.id === cid && c.status === 'accepted'), r.body.sent);
r = await call(inbox.onRequestGet, CAT, '/api/game-changes');
check('Cat\'s inbox: joined Ben\'s conversation', r.body.joined.some((c) => c.id === cid), r.body);

// ---- "just play" -------------------------------------------------------------------------
const g3 = (await call(games.onRequestPost, CAT, '/api/games', {}, 'POST', { title: 'Secret', code: CODE, choice: 'play' })).body.game.id;
await call(share.onRequestPost, CAT, `/api/games/${g3}/share`, { id: g3 }, 'POST', { share: true, choice: 'play' });
r = await call(versions.onRequestGet, BEN, `/api/games/${g3}/versions`, { id: g3 });
check('a "just play" game\'s history is not shown to classmates (404)', r.status === 404, r);
r = await propose(BEN, g3, { title: 'x', code: CODE + 'x();', baseVersion: 1 });
check('...and cannot get a proposal (404)', r.status === 404, r);

// ---- 7. deletes ----------------------------------------------------------------------------
const g4 = (await call(games.onRequestPost, DAN, '/api/games', {}, 'POST', { title: 'Temp', code: CODE })).body.game.id;
await call(share.onRequestPost, DAN, `/api/games/${g4}/share`, { id: g4 }, 'POST', { share: true });
const onTemp = (await propose(BEN, g4, { title: 'tweak', code: CODE + 'tweak();', baseVersion: 1 })).body.id;
r = await call(one.onRequestDelete, DAN, `/api/games/${g4}`, { id: g4 }, 'DELETE');
r = await getChange(BEN, onTemp);
check('deleting a game closes its open proposals, with an event', r.status === 200 && r.body.change.status === 'closed' && r.body.conversation.at(-1).body === 'closed', r.body);

const onDodge = (await propose(DAN, gid, { title: 'last one', code: CODE + 'last();', baseVersion: 7 })).body.id;
await del.clearLibraryOf(db, undefined, 'dan@s.test');
r = await getChange(ANA, onDodge);
check('Clear Library removes the student\'s open proposals', r.status === 404, r);
r = await getChange(T1, onDodge);
check('...which the teacher still sees as removed', r.status === 200 && r.body.change.status === 'removed', r.body.change);

// ---- 8. no emails ---------------------------------------------------------------------------
const leaks = seenBodies.filter((b) => /@s\.test/.test(b.text));
check('no response carries an email', leaks.length === 0, leaks.slice(0, 2).map((l) => l.url + ' ' + l.text.slice(0, 200)));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
