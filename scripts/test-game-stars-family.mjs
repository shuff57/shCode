#!/usr/bin/env node
// Stars and the family tree on class games (migration 0052):
// GET|POST /api/games/[id]/star, GET /api/games/starred and
// GET /api/games/[id]/family, on a real SQLite with every migration applied.
// What has to hold:
//   stars (GitHub's starring, in plain words)
//   1. starring is a toggle, one star per person: starring twice is one row,
//      unstarring removes it; `on` must be a boolean;
//   2. anyone who may open the game stars it, the maker too; someone who cannot
//      open it gets 404; nobody stars a hidden game; names show as first name +
//      last initial, the caller as "You";
//   3. the lists carry the count and the caller's own star; the Starred list
//      holds only games the caller may still open, newest star first;
//   family
//   4. a remix chain (original -> remix -> remix of the remix) comes back with
//      parents, makers, dates, the version each started from, and the game being
//      played marked current;
//   5. a game the reader cannot open is never named by its own row: a leaf is
//      dropped and counted, a link in the chain is a plain box named only by a
//      visible remix's credit;
//   6. an accepted change from a remix shows as a merge arrow;
//   7. no email in any answer; the layout puts each remix one row below its parent.

import { join } from 'node:path';
import { compileHandler, makeD1, root } from './_d1-sqlite.mjs';

let passed = 0;
let failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log(`PASS  ${name}`); }
  else { failed++; console.error(`FAIL  ${name}${detail ? ` -- ${typeof detail === 'string' ? detail : JSON.stringify(detail)}` : ''}`); }
}

const out = join(root, '.tmp', 'game-stars-family-test');
const starRoute = compileHandler('api/games/[id]/star.ts', join(out, 'a'));
const starredRoute = compileHandler('api/games/starred/index.ts', join(out, 'd'));
const family = compileHandler('api/games/[id]/family.ts', join(out, 'b'));
const shared = compileHandler('api/games/shared/index.ts', join(out, 'c'));
const fam = await import(join(root, 'lib/game-family.ts'));

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
for (const [c, e] of [['C1', 'ana@s.test'], ['C1', 'ben@s.test'], ['C1', 'dan@s.test'], ['C2', 'cat@s.test']]) {
  sql(`INSERT INTO enrollments (class_id, student_email, enrolled_at, expires_at) VALUES (?, ?, ?, ?)`, c, e, now, FAR);
}
sql(`INSERT INTO class_teachers (class_id, teacher_email, added_at) VALUES ('C1', 't1@s.test', 0), ('C2', 't2@s.test', 0)`);
const ANA = { email: 'ana@s.test', role: 'student' };
const BEN = { email: 'ben@s.test', role: 'student' };
const CAT = { email: 'cat@s.test', role: 'student' };
const DAN = { email: 'dan@s.test', role: 'student' };
const OUT = { email: 'out@s.test', role: 'student' };

// Family: Ana's original G (C1) -> Cat's remix R1 in C2 (Ben cannot see it) -> Dan's remix R2 of R1 in C1.
// Ben's remix B1 of G in C1. Cat's second remix R3 of G, only in C2 (a leaf Ben cannot see).
const G = 'a'.repeat(32), R1 = 'b'.repeat(32), R2 = 'c'.repeat(32), B1 = 'd'.repeat(32), R3 = 'e'.repeat(32), H = 'f'.repeat(32);
const ins = (id, owner, title, at, parent, pTitle, pAuthor, origin, ver) => sql(
  `INSERT INTO library_games (id, owner_email, title, code, mode, players, created_at, updated_at, remixed_from_id, remixed_from_title, remixed_from_author, origin_id, origin_title, origin_author, remixed_from_version, version)
   VALUES (?, ?, ?, 'x', 'none', 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, 3)`,
  id, owner, title, at, at, parent, pTitle, pAuthor, origin, origin ? 'Spike Run' : null, origin ? 'Ana L.' : null, ver);
ins(G, 'ana@s.test', 'Spike Run', now - 5000, null, null, null, null, null);
ins(R1, 'cat@s.test', 'Spike Run Turbo', now - 4000, G, 'Spike Run', 'Ana L.', null, 2);
ins(R2, 'dan@s.test', 'Turbo Night', now - 3000, R1, 'Spike Run Turbo', 'Cat M.', G, 1);
ins(B1, 'ben@s.test', 'Spike Run Easy', now - 2000, G, 'Spike Run', 'Ana L.', null, 3);
ins(R3, 'cat@s.test', 'Cat Secret', now - 1000, G, 'Spike Run', 'Ana L.', null, null);
ins(H, 'ana@s.test', 'Hidden One', now, null, null, null, null, null);
sql(`INSERT INTO library_game_shares (game_id, class_id, shared_at) VALUES (?, 'C1', ?), (?, 'C2', ?), (?, 'C2', ?), (?, 'C1', ?), (?, 'C1', ?), (?, 'C2', ?)`,
  G, now, G, now, R1, now, R2, now, B1, now, R3, now);
sql(`INSERT INTO library_game_shares (game_id, class_id, shared_at, hidden_at, hidden_by) VALUES (?, 'C1', ?, ?, 't1@s.test')`, H, now, now);
// Ben's change to G, accepted as version 3.
sql(`INSERT INTO game_changes (id, game_id, from_email, from_name, title, base_version, base_code, code, status, created_at, updated_at, decided_at, accepted_version)
     VALUES (?, ?, 'ben@s.test', 'Ben D.', 'Easier start', 2, 'x', 'y', 'accepted', ?, ?, ?, 3)`, '1'.repeat(32), G, now, now, now);

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
const getS = (u, id = G) => call(starRoute.onRequestGet, u, `/api/games/${id}/star`, { id });
const star = (u, on, id = G) => call(starRoute.onRequestPost, u, `/api/games/${id}/star`, { id }, 'POST', { on });
const getF = (u, id) => call(family.onRequestGet, u, `/api/games/${id}/family`, { id });
const starredOf = (u) => call(starredRoute.onRequestGet, u, '/api/games/starred', {});

// 1-2. stars
let r = await getS(BEN);
check('a classmate reads: no stars yet, can star', r.status === 200 && r.body.count === 0 && r.body.starred === false && r.body.canStar === true, r);
r = await star(BEN, true);
check('a classmate stars it', r.status === 200 && r.body.starred === true && r.body.count === 1 && r.body.by[0] === 'You', r);
r = await star(BEN, true);
check('starring twice is still one star', r.status === 200 && r.body.count === 1, r);
r = await star(DAN, true);
check('a second star: count 2, names as first name + last initial', r.status === 200 && r.body.count === 2 && r.body.by.includes('Ben D.') && r.body.by[0] === 'You', r);
r = await star(ANA, true);
check('the maker may star their own game, as on GitHub', r.status === 200 && r.body.count === 3, r);
r = await star(BEN, 'yes');
check('on must be a boolean', r.status === 400, r);
r = await getS(OUT);
check('someone in no class of the game gets 404', r.status === 404, r);
r = await star(OUT, true);
check('...and cannot star it (404)', r.status === 404, r);
r = await star(BEN, true, H);
check('a hidden game cannot be starred by a student (404)', r.status === 404, r);
r = await star(DAN, false);
check('unstar takes it back', r.status === 200 && r.body.starred === false && r.body.count === 2, r);

// 3. lists
r = await call(shared.onRequestGet, BEN, '/api/games/shared', {});
const listed = r.body.games.find((g) => g.id === G);
check('the class list carries the count and your own star', listed && listed.stars === 2 && listed.starred === true, listed);
r = await call(shared.onRequestGet, DAN, '/api/games/shared', {});
check('...and not starred for someone who unstarred', r.body.games.find((g) => g.id === G)?.starred === false, r.body);
await star(BEN, true, B1);
sql(`UPDATE game_stars SET created_at = ? WHERE game_id = ? AND from_email = 'ben@s.test'`, now - 100, G); // so 'newest first' is decided
r = await starredOf(BEN);
check('Starred lists what Ben starred, newest first', r.status === 200 && r.body.games.map((g) => g.id).join() === [B1, G].join(), r.body);
check('...with its star count', r.body.games.find((g) => g.id === G)?.stars === 2, r.body);
sql(`INSERT INTO game_stars (game_id, from_email, created_at) VALUES (?, 'ben@s.test', ?)`, R3, now);
r = await starredOf(BEN);
check('a star on a game Ben can no longer open is not listed', !r.body.games.some((g) => g.id === R3), r.body);
sql(`DELETE FROM game_stars WHERE game_id = ?`, R3);

// 4-6. family, as Ben (C1: sees G, R2, B1; not R1 or R3)
r = await getF(BEN, R2);
check('family answers for a game Ben can open', r.status === 200, r);
const nodes = r.body.nodes;
const byTitle = (t) => nodes.find((n) => n.title === t);
const g = byTitle('Spike Run'), r2 = byTitle('Turbo Night'), b1 = byTitle('Spike Run Easy');
check('the original, both visible remixes are there', g && r2 && b1, nodes);
check('the original has no parent and a link', g && g.parent === null && g.gameId === G, g);
check('the game being played is marked current', r2 && r2.current === true && !g.current, r2);
check('Ben\'s own remix is mine, from v3, with a date', b1 && b1.mine && b1.fromVersion === 3 && b1.createdAt > 0 && b1.parent === G, b1);
const link = nodes.find((n) => n.key === r2.parent);
check('the invisible link in the chain is a plain box, no game id', link && link.gameId === null && link.closed === 'hidden', link);
check('...named only by the visible remix\'s credit', link && link.title === 'Spike Run Turbo' && link.author === 'Cat M.' && link.createdAt === null && link.fromVersion === null, link);
check('...and it hangs from the original', link && link.parent === G, link);
check('the invisible leaf (Cat Secret) is dropped and counted', !nodes.some((n) => n.title === 'Cat Secret') && r.body.unseen === 1, r.body);
check('no invisible game id leaks', !JSON.stringify(r.body).includes(R1) && !JSON.stringify(r.body).includes(R3), r.body);
check('the accepted change is a merge arrow from Ben\'s remix to the original',
  r.body.merges.length === 1 && r.body.merges[0].from === B1 && r.body.merges[0].to === G && r.body.merges[0].version === 3 && r.body.merges[0].by === 'Ben D.', r.body.merges);

// As Cat (C2: sees G, R1, R3; not R2 or B1)
r = await getF(CAT, G);
check('Cat sees her two remixes and not Dan\'s or Ben\'s', r.status === 200 && r.body.nodes.length === 3 && r.body.unseen === 2, r.body);
check('a merge from a remix Cat cannot see is not shown', r.body.merges.length === 0, r.body.merges);
r = await getF(OUT, G);
check('family 404s for someone who cannot open the game', r.status === 404, r);

// 7. layout and emails
const lay = fam.layoutFamily([
  { key: 'a', parent: null, createdAt: 1 }, { key: 'b', parent: 'a', createdAt: 2 },
  { key: 'c', parent: 'b', createdAt: 3 }, { key: 'd', parent: 'a', createdAt: 4 },
]);
const at = Object.fromEntries(lay.placed.map((p) => [p.key, p]));
check('layout: each remix one row below its parent', at.b.row === 1 && at.c.row === 2 && at.d.row === 1 && at.a.row === 0, lay);
check('layout: older remix to the left, parent centred', at.b.col < at.d.col && at.a.col === (at.b.col + at.d.col) / 2, lay);
check('layout: a parent loop in bad data does not spin', fam.layoutFamily([{ key: 'x', parent: 'y', createdAt: 1 }, { key: 'y', parent: 'x', createdAt: 2 }]).placed.length <= 2);
// The family as a course flowchart (what GameFamilyTree draws).
{
  const v = (await getF(BEN, R2)).body;
  const { doc, links } = fam.familyToDiagram(v);
  const shapeOf = (title) => doc.nodes.find((n) => n.label.startsWith(title))?.shape;
  check('flowchart: the original is the Start oval', shapeOf('Spike Run\n') === 'terminal', doc.nodes);
  check('flowchart: a remix is a Task box', shapeOf('Spike Run Easy') === 'process', doc.nodes);
  check('flowchart: the current game says so', doc.nodes.find((n) => n.id === R2)?.label.includes('you are here'), doc.nodes);
  check('flowchart: every remix has an arrow down from its parent', doc.edges.filter((e) => e.id.startsWith('r-')).length === v.nodes.filter((n) => n.parent).length, doc.edges);
  check('flowchart: the version is on the arrow', doc.edges.some((e) => e.to === B1 && e.label === 'from v3'), doc.edges);
  check('flowchart: the accepted change is an arrow back up', doc.edges.some((e) => e.from === B1 && e.to === G && /Ben D\.'s change · v3/.test(e.label)), doc.edges);
  check('flowchart: a child sits below its parent', doc.nodes.find((n) => n.id === B1).y > doc.nodes.find((n) => n.id === G).y);
  check('flowchart: links open visible games only, never the current one', links[G] === G && links[B1] === B1 && !(R2 in links) && Object.keys(links).length === 2, links);
}
check('no email in any answer', !bodies.some((b) => /@s\.test/.test(b)));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
