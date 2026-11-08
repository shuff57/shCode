#!/usr/bin/env node
// Headless checks for multiplayer(mode, players) in public/moshion/extras.js
// (codehs-review/MULTIPLAYER-SPEC.md, Part A):
//   1. it validates the mode and the count (2-4) and falls back to 'none'
//      with a readable console error; a second call is refused;
//   2. 'local': players, turn, nextTurn() wraps, myTurn() always true;
//   3. a sketch that never calls it gets none of the names, and a sketch's
//      own turn / nextTurn / players is left alone;
//   4. 'versus' / 'coop': the lobby message goes up to the page, the page's
//      room message puts the run in a room, myTurn() follows seat, turn and
//      a full room, and moves still arrive through online.onMove;
//   5. in the real engine (scripts/moshion-harness.mjs) a sketch calling it in
//      setup() runs, and turn helpers drive the drawing.
//
// Run: node scripts/test-moshion-multiplayer.mjs

import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { runSketch } from './moshion-harness.mjs';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(join(repo, 'public', 'moshion', 'extras.js'), 'utf8');

let passed = 0;
let failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log(`PASS  ${name}`); }
  else { failed++; console.error(`FAIL  ${name}${detail !== undefined ? ` -- ${typeof detail === 'string' ? detail : JSON.stringify(detail)}` : ''}`); }
}

/** A fresh context with extras.js loaded. withParent: a fake shCode page above it. */
function boot({ withParent = false, sketch = '' } = {}) {
  const logs = { error: [], warn: [], log: [] };
  const sent = [];
  const listeners = [];
  const parent = { postMessage: (m) => sent.push(m) };
  const sb = {
    console: {
      error: (...a) => logs.error.push(a.join(' ')),
      warn: (...a) => logs.warn.push(a.join(' ')),
      log: (...a) => logs.log.push(a.join(' ')),
    },
    Math, JSON, Object, Array, String, Number, Date,
    setTimeout: (fn) => { try { fn(); } catch { /* reported */ } },
  };
  sb.window = sb;
  sb.globalThis = sb;
  if (withParent) {
    sb.parent = parent;
    sb.addEventListener = (type, fn) => { if (type === 'message') listeners.push(fn); };
  }
  createContext(sb);
  runInContext(source, sb, { filename: 'extras.js' });
  if (sketch) runInContext(sketch, sb, { filename: 'sketch.js' });
  const deliver = (data) => { for (const fn of listeners) fn({ data, source: parent }); };
  const run = sent.find((m) => m.op === 'hello')?.run;
  return { sb, logs, sent, deliver, run, js: (code) => runInContext(code, sb) };
}

// ---- 1. validation ----
{
  const t = boot();
  check('multiplayer exists after load', typeof t.sb.multiplayer === 'function');
  t.js("multiplayer('battle', 2)");
  check('bad mode: readable console error', t.logs.error.length === 1 && /'none', 'local', 'coop' or 'versus'/.test(t.logs.error[0]) && /"battle"/.test(t.logs.error[0]), t.logs.error);
  check('bad mode: falls back to none', t.js('game.mode') === 'none' && t.js('game.players') === 1 && t.js('game.ready') === true);
  check("bad mode: 'none' adds no turn helpers", t.js("typeof nextTurn + typeof turn + typeof myTurn") === 'undefinedundefinedundefined');
  t.js("multiplayer('local', 3)");
  check('a second call is refused and the first stays', t.logs.error.length === 2 && /only be called once/.test(t.logs.error[1]) && t.js('game.mode') === 'none', t.logs.error);
}
for (const [n, label] of [[1, 'one player'], [5, 'five players'], [2.5, 'a fraction'], ['2', 'a string'], [NaN, 'NaN']]) {
  const t = boot();
  t.js(`multiplayer('versus', ${typeof n === 'string' ? JSON.stringify(n) : String(n)})`);
  check(`count ${label}: error and back to none`, t.logs.error.length === 1 && /2 to 4/.test(t.logs.error[0]) && t.js('game.mode') === 'none', t.logs.error);
}
{
  const t = boot();
  t.js("multiplayer('LOCAL')");
  check("mode is case-insensitive; players default to 2", t.js('game.mode') === 'local' && t.js('players') === 2 && t.logs.error.length === 0, t.logs.error);
}
{
  const t = boot();
  t.js("multiplayer('none')");
  check("'none' is one player, ready, no errors", t.js('game.mode') === 'none' && t.js('game.ready') === true && t.logs.error.length === 0);
}

// ---- 2. local ----
{
  const t = boot();
  t.js("multiplayer('local', 3)");
  check('local: players and turn', t.js('players') === 3 && t.js('turn') === 0 && t.js('game.turn') === 0);
  check('local: myTurn() always true', t.js('myTurn()') === true);
  const seq = t.js('[nextTurn(), nextTurn(), nextTurn(), nextTurn()].join()');
  check('local: nextTurn() goes 1, 2, 0, 1', seq === '1,2,0,1', seq);
  check('local: turn and game.turn follow', t.js('turn') === 1 && t.js('game.turn') === 1);
  check('local: ready, no seat, status ready', t.js('game.ready') === true && t.js('game.seat') === null && t.js('game.status') === 'ready');
  check('local: no seat global, nothing sent anywhere', t.js('typeof seat') === 'undefined');
  t.js('turn = 7');
  check("local: `turn = 7` makes it the sketch's own variable", t.js('turn') === 7 && t.js('nextTurn()') === 2, t.js('turn'));
}

// ---- 3. untouched sketches ----
{
  const t = boot();
  check('never called: no game, players, turn, nextTurn, myTurn, seat', t.js("[typeof game, typeof players, typeof turn, typeof nextTurn, typeof myTurn, typeof seat].join()") === 'undefined,undefined,undefined,undefined,undefined,undefined');
}
{
  const t = boot({ sketch: 'let turn = 5; function nextTurn() { turn = turn + 10; return turn; } var players = ["a", "b"];' });
  t.js("multiplayer('local', 2)");
  check("the sketch's own turn / nextTurn / players are left alone", t.js('turn') === 5 && t.js('nextTurn()') === 15 && t.js('players.length') === 2, [t.js('turn'), t.js('players')]);
  check('...with a warning for each, not an error', t.logs.warn.length === 3 && t.logs.error.length === 0 && t.logs.warn.every((w) => /already has its own/.test(w)), t.logs.warn);
  check('...and myTurn() still added', t.js('myTurn()') === true);
}

// ---- 4. online modes ----
{
  const t = boot({ withParent: true });
  check('hello at load', !!t.run);
  t.js("multiplayer('versus', 2)");
  const lobby = t.sent.find((m) => m.op === 'lobby');
  check('versus: lobby message to the page', lobby && lobby.source === 'preview-online' && lobby.run === t.run && lobby.mode === 'versus' && lobby.players === 2, t.sent);
  check('versus: not ready, not my turn before a room', t.js('game.ready') === false && t.js('myTurn()') === false && t.js('game.status') === 'off');
  // The lobby puts this run in a room as seat 1 (the guest).
  t.deliver({ source: 'preview-online-room', run: t.run, code: 'BHKE', codeIcons: ['star', 'bat', 'fish', 'key'], seat: 1, seats: 2 });
  check('room message: code, picture names, seat, waiting', t.js('online.code') === 'BHKE' && t.js('online.codeIcons.join()') === 'star,bat,fish,key' && t.js('seat') === 1 && t.js('game.seat') === 1 && t.js('game.status') === 'waiting');
  t.deliver({ source: 'preview-online-room', run: 'someone-else', code: 'CCCC', seat: 0, seats: 2 });
  check("another run's room message is ignored", t.js('online.code') === 'BHKE');
  t.js('var got = []; online.onMove(function (m, s) { got.push(s + ":" + m.n); nextTurn(); });');
  t.deliver({ source: 'preview-online-update', run: t.run, code: 'BHKE', seat: 1, seats: 2, state: 'ready', players: [{ seat: 0, name: 'Ann L.', left: false }, { seat: 1, name: 'Bo N.', left: false }], events: [] });
  check('full room: ready; turn 0 is not seat 1', t.js('game.ready') === true && t.js('myTurn()') === false);
  t.deliver({ source: 'preview-online-update', run: t.run, code: 'BHKE', state: 'ready', events: [{ seq: 1, seat: 0, data: { n: 4 } }] });
  check('a move arrives through onMove; nextTurn inside it: my turn now', t.js('got.join()') === '0:4' && t.js('turn') === 1 && t.js('myTurn()') === true);
  t.deliver({ source: 'preview-online-update', run: t.run, code: 'BHKE', state: 'ready', events: [{ seq: 1, seat: 0, data: { n: 4 } }] });
  check('the same move twice is applied once', t.js('got.length') === 1);
  t.deliver({ source: 'preview-online-update', run: t.run, code: 'BHKE', state: 'waiting', events: [] });
  check('someone left: not my turn while the room is not full', t.js('myTurn()') === false && t.js('game.ready') === false);
  t.js("online.send({ n: 2 })");
  const s = t.sent.find((m) => m.op === 'send');
  check('online.send works in the lobby room', s && s.data.n === 2 && s.run === t.run, t.sent);
  t.deliver({ source: 'preview-online-room', run: t.run, code: null });
  check('room message with no code: out of the room', t.js('online.status') === 'off' && t.js('online.code') === null && t.js('online.codeIcons') === null && t.js('game.ready') === false);
  // The sketch's own online.host(): the page's reply carries the picture names too.
  t.js('online.host(2)');
  const h = t.sent.filter((m) => m.op === 'host').pop();
  check('online.host() still asks for game moshion', h && h.game === 'moshion' && h.seats === 2, h);
  t.deliver({ source: 'preview-online-reply', run: t.run, id: h.id, ok: true, result: { code: 'CDEF', seat: 0, seats: 2, codeIcons: ['heart', 'gem', 'key', 'slime'] } });
  check('online.host() reply: 4-letter code and codeIcons', t.js('online.code') === 'CDEF' && t.js('online.codeIcons[0]') === 'heart' && t.js('online.status') === 'waiting');
}
{
  const t = boot({ withParent: true });
  t.js("multiplayer('coop', 3)");
  check('coop: lobby message for 3', t.sent.some((m) => m.op === 'lobby' && m.mode === 'coop' && m.players === 3));
  t.deliver({ source: 'preview-online-room', run: t.run, code: 'QRS234', seat: 0, seats: 3 });
  t.deliver({ source: 'preview-online-update', run: t.run, code: 'QRS234', state: 'waiting', players: [{ seat: 0, name: 'A', left: false }, { seat: 1, name: 'B', left: false }], events: [] });
  check('coop: 2 of 3 is not ready', t.js('game.ready') === false && t.js('myTurn()') === false);
  t.deliver({ source: 'preview-online-update', run: t.run, code: 'QRS234', state: 'ready', events: [] });
  check('coop: full room, anyone may move', t.js('game.ready') === true && t.js('myTurn()') === true && t.js('players') === 3);
}
{
  const t = boot();
  t.js("multiplayer('versus', 2)");
  check('versus with no page above (headless): no crash, not ready', t.js('game.ready') === false && t.logs.error.length === 0);
}

// ---- 5. the real engine ----
{
  const code = `
    let shown = [];
    function setup() {
      new Canvas(200, 100);
      multiplayer('local', 2);
    }
    function draw() {
      if (frameCount % 10 === 0) { nextTurn(); shown.push(turn); }
    }
  `;
  const h = runSketch(code, { frames: 45 });
  const ev = (x) => runInContext(x, h.box.sandbox);
  const shown = ev('shown');
  check('engine: multiplayer() in setup runs with no errors', h.ok, String(h.error));
  check('engine: turns alternate in draw()', Array.isArray(shown) && shown.length >= 3 && shown.slice(0, 3).join() === '1,0,1', shown);
  check('engine: game.mode reads local', ev('game.mode') === 'local' && ev('players') === 2);
}
{
  const h = runSketch(`let turn = 0; function setup() { new Canvas(100, 100); } function draw() { turn = turn + 1; }`, { frames: 5 });
  check('engine: a sketch with its own turn and no multiplayer() is unchanged', h.ok && runInContext('typeof game + turn', h.box.sandbox) === 'undefined5', String(h.error));
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
