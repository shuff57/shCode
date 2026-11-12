#!/usr/bin/env node
// The notification bell (#112): GET /api/notifications and the rules in lib/game-notices-core.ts.
// On a real SQLite with every migration applied, through the real handlers. What has to hold:
//   1. a proposal to my game is an item for me (from the proposer), never for the proposer;
//   2. the newest thing SOMEONE ELSE did in a conversation is the item, and my own comment never is;
//      a decision on my proposal reaches me; a conversation I only commented in reaches me;
//   3. a comment on my game and a reply to my comment are items; my own comments are not;
//      a reply to a classmate's thread I never wrote in is not mine;
//   4. once I can no longer open someone else's game (unshared), its items go;
//   5. the unread rule: seen times, Mark all as read, the never-opened rule; the words; the links;
//   6. no email in any answer.

import { join } from 'node:path';
import { compileHandler, makeD1, root } from './_d1-sqlite.mjs';

let passed = 0;
let failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log(`PASS  ${name}`); }
  else { failed++; console.error(`FAIL  ${name}${detail ? ` -- ${typeof detail === 'string' ? detail : JSON.stringify(detail)}` : ''}`); }
}

const out = join(root, '.tmp', 'game-notices-test');
const notices = compileHandler('api/notifications.ts', join(out, 'a'));
const comments = compileHandler('api/games/[id]/comments.ts', join(out, 'b'));
const changes = compileHandler('api/games/[id]/changes.ts', join(out, 'c'));
const changeOne = compileHandler('api/game-changes/[cid].ts', join(out, 'd'));
const core = compileHandler('../lib/game-notices-core.ts', join(out, 'e'));

const db = makeD1();
const env = { DB: db };
const now = Date.now();
const FAR = now + 1e10;
const sql = (q, ...a) => db.sqlite.prepare(q).run(...a);
for (const [email, first, last] of [['ana@s.test', 'Ana', 'Lopez'], ['ben@s.test', 'Ben', 'Diaz'], ['cat@s.test', 'Cat', 'Moss']]) {
  sql(`INSERT INTO students (email, password_hash, created_at, role, first_name, last_name) VALUES (?, 'x', ?, 'student', ?, ?)`, email, now, first, last);
}
sql(`INSERT INTO classes (id, name, code, owner_email, school_year, created_at) VALUES ('C1', 'Period 1', 'AAAAAA', 't1@s.test', '2026-2027', ?)`, now);
for (const e of ['ana@s.test', 'ben@s.test', 'cat@s.test']) {
  sql(`INSERT INTO enrollments (class_id, student_email, enrolled_at, expires_at) VALUES ('C1', ?, ?, ?)`, e, now, FAR);
}
const ANA = { email: 'ana@s.test', role: 'student' };
const BEN = { email: 'ben@s.test', role: 'student' };
const CAT = { email: 'cat@s.test', role: 'student' };

const G = 'a'.repeat(32);   // Ana's game
const H = 'b'.repeat(32);   // Cat's game
const CODE = 'function setup() { createCanvas(200, 200); }\n';
sql(`INSERT INTO library_games (id, owner_email, title, code, mode, players, created_at, updated_at) VALUES (?, 'ana@s.test', 'Dodge', ?, 'none', 1, ?, ?)`, G, CODE, now, now);
sql(`INSERT INTO library_games (id, owner_email, title, code, mode, players, created_at, updated_at) VALUES (?, 'cat@s.test', 'Maze', ?, 'none', 1, ?, ?)`, H, CODE, now, now);
sql(`INSERT INTO library_game_shares (game_id, class_id, shared_at) VALUES (?, 'C1', ?), (?, 'C1', ?)`, G, now, H, now);

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
const bell = async (u) => (await call(notices.onRequestGet, u, '/api/notifications', {})).body.items;
const propose = (u, gid, title) => call(changes.onRequestPost, u, `/api/games/${gid}/changes`, { id: gid }, 'POST', { title, code: CODE + `// ${title}\n`, baseVersion: 1 });
const act = (u, cid, body) => call(changeOne.onRequestPost, u, `/api/game-changes/${cid}`, { cid }, 'POST', body);
const comment = (u, gid, body, parentId) => call(comments.onRequestPost, u, `/api/games/${gid}/comments`, { id: gid }, 'POST', parentId ? { body, parentId } : { body });
// Rows written in one millisecond would tie; space them out so "newest" is well defined.
const tick = () => new Promise((r) => setTimeout(r, 3));

// ---- 1. a proposal ------------------------------------------------------------------------------
check('nothing yet: an empty list', (await bell(ANA)).length === 0);
const p = await propose(BEN, G, 'Added a score');
check('Ben proposes a change to Dodge', p.status < 300 && !!p.body.id, p.body);
const cid = p.body.id;
let a = await bell(ANA);
check('Ana (the maker) gets it, from Ben, waiting on her',
  a.length === 1 && a[0].kind === 'change' && a[0].changeId === cid && a[0].who === 'Ben D.' && a[0].event === 'opened' && a[0].waiting === true && a[0].game === 'Dodge', a);
check('Ben gets nothing for his own proposal', (await bell(BEN)).length === 0);

// ---- 2. conversations ---------------------------------------------------------------------------
await tick();
await act(ANA, cid, { action: 'comment', body: 'Nice! Can the score go in the corner?' });
a = await bell(BEN);
check('Ana comments: Ben gets her comment, with its first words, pointing at it',
  a.length === 1 && a[0].event === 'comment' && a[0].who === 'Ana L.' && a[0].snippet.startsWith('Nice!') && a[0].waiting === false, a);
const anaCommentId = a[0].targetId;
a = await bell(ANA);
check('Ana\'s own comment is not her item: it still shows Ben proposing', a.length === 1 && a[0].event === 'opened', a);
await tick();
await act(CAT, cid, { action: 'comment', body: 'I like it too' });
await tick();
const acc = await act(ANA, cid, { action: 'accept', expectVersion: 1 });
check('Ana accepts it', acc.status === 200, acc.body);
a = await bell(BEN);
check('Ana accepts: Ben\'s item is the decision', a.length === 1 && a[0].event === 'accepted' && a[0].who === 'Ana L.' && a[0].targetId !== anaCommentId, a);
a = await bell(CAT);
check('Cat, who only commented, hears about the decision too', a.length === 1 && a[0].event === 'accepted', a);
a = await bell(ANA);
check('Ana\'s item is Cat\'s comment (newest by someone else), no longer waiting', a.length === 1 && a[0].event === 'comment' && a[0].who === 'Cat M.' && a[0].waiting === false, a);

// ---- 3. comments on games -----------------------------------------------------------------------
await tick();
const c1 = await comment(BEN, G, 'The spikes are too fast on level 2!');
check('Ben comments on Dodge', c1.status < 300, c1.body);
const topId = c1.body.comments.find((c) => c.body?.startsWith('The spikes')).id;
a = await bell(ANA);
check('Ana gets "commented on your game"', a[0].kind === 'comment' && a[0].who === 'Ben D.' && !a[0].reply && a[0].myGame && a[0].gameId === G, a[0]);
check('Ben gets nothing for his own comment', !(await bell(BEN)).some((i) => i.kind === 'comment'));
await tick();
await comment(ANA, G, 'Thanks, I will slow them down', topId);
a = await bell(BEN);
check('Ana replies: Ben gets "replied to your comment"', a[0].kind === 'comment' && a[0].reply && a[0].toMe && a[0].who === 'Ana L.', a[0]);
await tick();
await comment(CAT, G, 'Agreed', topId);
a = await bell(ANA);
check('Cat replies in the thread on Ana\'s game: Ana gets it as the maker', a[0].kind === 'comment' && a[0].reply && !a[0].toMe && a[0].myGame && a[0].who === 'Cat M.', a[0]);
a = await bell(BEN);
check('...and Ben, who started that thread, gets it too', a[0].kind === 'comment' && a[0].who === 'Cat M.' && a[0].toMe, a[0]);
await tick();
const c2 = await comment(BEN, H, 'Cool maze');
const mazeTop = c2.body.comments[0].id;
await tick();
await comment(CAT, H, 'Thanks Ben', mazeTop);
a = await bell(ANA);
check('a reply in a thread on Cat\'s game Ana never wrote in is not Ana\'s', !a.some((i) => i.gameId === H), a.map((i) => i.game));

// ---- 4. visibility ------------------------------------------------------------------------------
check('Ben sees the reply on Maze while it is shared', (await bell(BEN)).some((i) => i.gameId === H));
sql(`DELETE FROM library_game_shares WHERE game_id = ?`, H);
check('once Maze is unshared, its items go from Ben\'s bell', !(await bell(BEN)).some((i) => i.gameId === H));

// ---- 5. the rules -------------------------------------------------------------------------------
const items = await bell(ANA);
const empty = { changes: {}, games: {}, readAllAt: null };
const t = Date.now();
check('never opened here and recent: unread', core.unreadCount(items, empty, t) === items.length);
const old = { ...items[0], at: t - 8 * 24 * 3600_000 };
check('never opened here and over a week old: read', !core.isUnread(old, empty, t));
const oldWaiting = { kind: 'change', changeId: 'x', waiting: true, at: t - 30 * 24 * 3600_000 };
check('...unless it is a proposal still waiting on me', core.isUnread(oldWaiting, empty, t));
check('Mark all as read clears everything up to then', core.unreadCount(items, { ...empty, readAllAt: t }, t) === 0);
const ch = items.find((i) => i.kind === 'change');
const cm = items.find((i) => i.kind === 'comment');
check('opening the conversation reads its item', !core.isUnread(ch, { ...empty, changes: { [ch.changeId]: ch.at } }, t));
check('a newer thing in it is unread again', core.isUnread({ ...ch, at: ch.at + 1 }, { ...empty, changes: { [ch.changeId]: ch.at } }, t));
check('showing the game\'s comments reads its comment items', !core.isUnread(cm, { ...empty, games: { [cm.gameId]: cm.at } }, t));
check('words: a proposal', core.noticeAction({ kind: 'change', event: 'opened', title: 'Added a score', game: 'Dodge', who: 'Ben D.' }) === 'proposed a change to Dodge: “Added a score”');
check('words: an acceptance names the change',
  core.noticeAction({ kind: 'change', event: 'accepted', extra: 2, title: 'Added a score', game: 'Dodge', who: 'Ana L.' }) === 'accepted the change “Added a score” (Dodge). It is version 2 of the game now',
  core.noticeAction({ kind: 'change', event: 'accepted', extra: 2, title: 'Added a score', game: 'Dodge', who: 'Ana L.' }));
check('words: comments and replies', core.noticeAction({ kind: 'comment', reply: false, game: 'Dodge' }) === 'commented on your game Dodge'
  && core.noticeAction({ kind: 'comment', reply: true, toMe: true, game: 'Dodge' }) === 'replied to your comment on Dodge');
check('links: the conversation at the entry, the game at the comment',
  core.noticeHref(ch) === `/changes/?id=${ch.changeId}#c-${ch.targetId}` && core.noticeHref(cm) === `/play/?game=${cm.gameId}#comment-${cm.commentId}`);
check('snippets are one line and cut at 100 characters', core.snippetOf('a\n\nb') === 'a b' && core.snippetOf('x'.repeat(150)).length === 100);

// ---- 6. no emails -------------------------------------------------------------------------------
check('no answer carries an email', !bodies.some((b) => /@s\.test/.test(b)));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
