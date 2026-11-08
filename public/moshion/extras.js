// shCode's local colour helpers for moSHion.
//
// NOT upstream: `public/moshion/moshion.js` is vendored from shuff57/moshion and
// is replaced wholesale on a sync. This file is ours, and it is loaded after the
// engine by BOTH public/moshion/runner.html and scripts/moshion-harness.mjs, so
// a sketch that uses these calls behaves the same headless as in the browser.
//
// Why it exists. `fill()` and a sprite's `.color` take ONE CSS colour string.
// The p5 form `fill(0, 0, 0, 120)` silently paints solid black, and building an
// rgba string by hand is a lot of concatenation for a beginner:
//
//   sprite.color = 'rgba(' + r + ', ' + g + ', ' + b + ', ' + a + ')';
//
// So: rgba() and randomColor(). Both return a plain CSS string, which is what
// fill(), stroke(), background() and .color already accept.
(function () {
  'use strict';

  function channel(n) {
    var v = Math.round(Number(n));
    if (!isFinite(v)) return 0;
    return Math.max(0, Math.min(255, v));
  }

  function alpha(n) {
    var v = Number(n);
    if (!isFinite(v)) return 1;
    return Math.max(0, Math.min(1, v));
  }

  /** random() from the engine when it exists (seeded, deterministic), else Math.random. */
  function roll() {
    return typeof random === 'function' ? random() : Math.random();
  }

  /**
   * rgba(r, g, b, a) -> 'rgba(r, g, b, a)'
   * rgba([r, g, b], a) also works. Channels are rounded and clamped to 0-255;
   * alpha is clamped to 0-1 and defaults to 1. Accepts expressions, so
   * rgba(255, 99, 71, random(0.2, 0.8)) is one call.
   */
  function rgba(r, g, b, a) {
    if (Array.isArray(r)) {
      var triple = r;
      // rgba([r, g, b], a): the alpha arrives in the second parameter, which is
      // about to be overwritten by the green channel, so take it first.
      var alphaArg = a !== undefined ? a : (typeof g === 'number' ? g : triple[3]);
      r = triple[0];
      g = triple[1];
      b = triple[2];
      a = alphaArg;
    }
    if (a === undefined) a = 1;
    return 'rgba(' + channel(r) + ', ' + channel(g) + ', ' + channel(b) + ', ' + alpha(a) + ')';
  }

  /**
   * randomColor()            -> random rgb, fully opaque
   * randomColor(a)           -> random rgb at alpha a
   * randomColor(minA, maxA)  -> random rgb, random alpha in the range
   */
  function randomColor(minA, maxA) {
    if (minA === undefined) minA = 1;
    if (maxA === undefined) maxA = minA;
    var lo = alpha(minA);
    var hi = alpha(maxA);
    if (hi < lo) { var t = lo; lo = hi; hi = t; }
    var a = lo === hi ? lo : lo + roll() * (hi - lo);
    return rgba(
      Math.floor(roll() * 256),
      Math.floor(roll() * 256),
      Math.floor(roll() * 256),
      a,
    );
  }

  var g = typeof globalThis !== 'undefined' ? globalThis : this;
  g.rgba = rgba;
  g.randomColor = randomColor;
  if (typeof window !== 'undefined' && window !== g) {
    window.rgba = rgba;
    window.randomColor = randomColor;
  }
})();

// ---------------------------------------------------------------------------
// online: play a turn-based game with a classmate on another computer.
//
//   online.host()          start a room; online.code becomes its 4-letter room code
//   online.host(3)         a room for 3 players (2 to 4)
//   online.join('BHKE')    join a classmate's room with their code
//   online.send(move)      send a move: numbers, true/false, one-word labels
//   online.onMove(fn)      fn(move, seat) runs for EVERY move, yours included,
//                          in the same order on every computer
//   online.leave()
//
//   online.status   'off' | 'connecting' | 'waiting' | 'ready' | 'closed' | 'error'
//   online.seat     your seat: 0 is the host, then 1, 2, 3
//   online.codeIcons  the code as 4 picture names (Library textures), e.g.
//                   ['star', 'bat', 'fish', 'key'] for 'BHKE'; null for an old code
//   online.players  [{ seat, name, left }]   online.error   the last problem
//
// Apply a move inside onMove, not where you send it: then both computers run
// the same moves in the same order and the two boards cannot drift apart.
//
// The sketch's iframe cannot reach the server itself, so each request goes up
// to the shCode page (lib/moshion-online.ts), which calls /api/rooms as the
// signed-in student. Rooms are for classmates only and carry game data only
// (functions/_shared/rooms.ts).
(function () {
  'use strict';
  var g = typeof globalThis !== 'undefined' ? globalThis : this;
  var hasHost = typeof window !== 'undefined' && window.parent && window.parent !== window;
  var run = Math.random().toString(36).slice(2) + Date.now().toString(36);
  var nextId = 1;
  var pending = {};
  var moveFns = [];
  var lastSeq = 0;

  var online = {
    status: 'off',
    code: null,
    codeIcons: null,
    seat: null,
    seats: 0,
    players: [],
    error: null,
    host: function (seats) {
      online.status = 'connecting';
      online.error = null;
      ask('host', { game: 'moshion', seats: seats === undefined ? 2 : seats }, function (r) {
        lastSeq = 0;
        online.code = r.code;
        online.codeIcons = r.codeIcons || null;
        online.seat = r.seat;
        online.seats = r.seats;
        online.status = 'waiting';
      });
    },
    join: function (code) {
      online.status = 'connecting';
      online.error = null;
      ask('join', { code: String(code) }, function (r) {
        lastSeq = 0;
        online.code = r.code;
        online.codeIcons = r.codeIcons || null;
        online.seat = r.seat;
        online.seats = r.seats;
        online.status = 'waiting';
      });
    },
    send: function (move) {
      if (!online.code) {
        fail('online.send(): not in a room yet. Call online.host() or online.join(code) first.');
        return;
      }
      ask('send', { data: move === undefined ? null : move });
    },
    onMove: function (fn) {
      if (typeof fn !== 'function') { fail('online.onMove() needs a function: online.onMove((move, seat) => { ... })'); return; }
      moveFns.push(fn);
    },
    leave: function () {
      ask('leave', {}, function () {
        online.status = 'off';
        online.code = null;
        online.codeIcons = null;
        online.seat = null;
        online.players = [];
      });
    },
  };

  function fail(msg) {
    online.error = msg;
    try { console.error(msg); } catch (e) { /* no console */ }
  }

  function ask(op, body, done) {
    if (!hasHost) {
      online.status = 'error';
      fail('Online play only works in the shCode preview.');
      return;
    }
    var id = nextId++;
    pending[id] = function (reply) {
      if (reply.ok) { if (done) done(reply.result || {}); }
      else {
        if (op === 'host' || op === 'join') online.status = 'error';
        fail(reply.error || 'Online play failed.');
      }
    };
    var msg = { source: 'preview-online', run: run, id: id, op: op };
    for (var k in body) if (Object.prototype.hasOwnProperty.call(body, k)) msg[k] = body[k];
    try { window.parent.postMessage(msg, '*'); } catch (e) { /* host gone */ }
  }

  if (hasHost) {
    window.addEventListener('message', function (e) {
      var d = e.data;
      if (!d || e.source !== window.parent || d.run !== run) return;
      if (d.source === 'preview-online-reply') {
        var fn = pending[d.id];
        delete pending[d.id];
        if (fn) fn(d);
        return;
      }
      if (d.source === 'preview-online-room') {
        // The page's lobby bar (multiplayer('versus' | 'coop')) put this run
        // in a room, or took it out (code null). Moves replay from the start.
        lastSeq = 0;
        mp.turn = 0;
        online.error = null;
        if (d.code) {
          online.code = d.code;
          online.codeIcons = d.codeIcons || null;
          online.seat = typeof d.seat === 'number' ? d.seat : null;
          if (typeof d.seats === 'number') { online.seats = d.seats; mp.players = d.seats; }
          online.status = 'waiting';
        } else {
          online.status = 'off';
          online.code = null;
          online.codeIcons = null;
          online.seat = null;
          online.players = [];
        }
        return;
      }
      if (d.source !== 'preview-online-update' || d.code !== online.code) return;
      if (d.players) online.players = d.players;
      if (typeof d.seat === 'number') online.seat = d.seat;
      if (typeof d.seats === 'number') { online.seats = d.seats; if (mp.online) mp.players = d.seats; }
      if (d.state) online.status = d.state;
      if (d.error) online.error = d.error;
      var events = d.events || [];
      for (var i = 0; i < events.length; i++) {
        var ev = events[i];
        if (ev.seq <= lastSeq) continue; // never apply a move twice
        lastSeq = ev.seq;
        for (var j = 0; j < moveFns.length; j++) {
          // One handler that throws must not drop the moves after it (both
          // boards would then miss them). Report it the normal way, later.
          try { moveFns[j](ev.data, ev.seat); }
          catch (err) { setTimeout(function (x) { return function () { throw x; }; }(err), 0); }
        }
      }
    });
    try { window.parent.postMessage({ source: 'preview-online', run: run, op: 'hello' }, '*'); } catch (e) { /* host gone */ }
  }

  // -------------------------------------------------------------------------
  // multiplayer(mode, players): the one setting for a game with more than one
  // player (codehs-review/MULTIPLAYER-SPEC.md). Call it once, in setup():
  //
  //   multiplayer('none')          one player (the same as not calling it)
  //   multiplayer('local', 3)      2-4 players take turns at one keyboard
  //   multiplayer('versus', 2)     online, turn-based, against each other
  //   multiplayer('coop', 3)       online, same side, anyone may move any time
  //
  // For 'local', 'versus' and 'coop' it adds (only where the sketch has not
  // made its own of the same name): players (how many), turn (0..players-1),
  // nextTurn(), myTurn(), and for the online modes seat (yours, 0 = host).
  // `game` ({ mode, players, ready, seat, code, status, turn }) is always there
  // after the call. Online modes get a lobby bar on the page above the canvas
  // (Host / Join / open rooms): the sketch never calls online.host() or
  // online.join() itself; it uses online.send() and online.onMove() as before.
  //
  // Honest about speed: moves travel by polling (about once a second, faster
  // while the room is full) and each player may send at most 30 moves every
  // 10 seconds. Fine for turn-based and slower games, not for real-time action.
  //
  // A sketch that never calls multiplayer() gets none of these names, so its
  // own `let turn` or `function nextTurn()` is untouched.
  var MODES = ['none', 'local', 'coop', 'versus'];
  var mp = { called: false, mode: 'none', players: 1, turn: 0, online: false };

  function say(level, msg) {
    try { console[level](msg); } catch (e) { /* no console */ }
  }

  /** True when the sketch already has this name: a global, or its own top-level let/const. */
  function taken(name) {
    if (name in g) return true;
    try { return (0, eval)('typeof ' + name) !== 'undefined'; } catch (e) { return true; } // TDZ: declared
  }

  function provide(name, desc) {
    if (taken(name)) {
      say('warn', 'multiplayer(): your sketch already has its own ' + name + ', so multiplayer() leaves it alone and does not add one.');
      return;
    }
    desc.configurable = true;
    desc.enumerable = true;
    if (desc.get && !desc.set) {
      // `turn = 5` in the sketch makes the name the sketch's own plain variable.
      desc.set = function (v) { Object.defineProperty(g, name, { value: v, writable: true, configurable: true, enumerable: true }); };
    }
    try { Object.defineProperty(g, name, desc); } catch (e) { /* not ours to change */ }
  }

  function isReady() {
    return mp.online ? online.status === 'ready' : true;
  }
  function myTurn() {
    if (mp.mode === 'versus') return online.status === 'ready' && online.seat === mp.turn;
    if (mp.mode === 'coop') return online.status === 'ready';
    return true;
  }
  function nextTurn() {
    var n = mp.players > 0 ? mp.players : 1;
    mp.turn = (mp.turn + 1) % n;
    return mp.turn;
  }

  var game = {};
  Object.defineProperties(game, {
    mode: { enumerable: true, get: function () { return mp.mode; } },
    players: { enumerable: true, get: function () { return mp.players; } },
    ready: { enumerable: true, get: isReady },
    turn: { enumerable: true, get: function () { return mp.turn; } },
    seat: { enumerable: true, get: function () { return mp.online ? online.seat : null; } },
    code: { enumerable: true, get: function () { return mp.online ? online.code : null; } },
    status: { enumerable: true, get: function () { return mp.online ? online.status : (mp.mode === 'none' ? 'off' : 'ready'); } },
  });

  function multiplayer(mode, players) {
    if (mp.called) {
      say('error', 'multiplayer() can only be called once, in setup(). The first call (' + JSON.stringify(mp.mode) + ') stays.');
      return game;
    }
    mp.called = true;
    var m = typeof mode === 'string' ? mode.trim().toLowerCase() : mode;
    if (MODES.indexOf(m) < 0) {
      say('error', "multiplayer(): the mode must be 'none', 'local', 'coop' or 'versus', not " + String(JSON.stringify(mode)) + '. Playing as one player.');
      m = 'none';
    }
    var n = 1;
    if (m !== 'none') {
      n = players === undefined ? 2 : players;
      if (typeof n !== 'number' || !isFinite(n) || Math.floor(n) !== n || n < 2 || n > 4) {
        say('error', 'multiplayer(' + JSON.stringify(m) + ', ' + String(JSON.stringify(players)) + '): the number of players must be a whole number from 2 to 4. Playing as one player.');
        m = 'none';
        n = 1;
      }
    }
    mp.mode = m;
    mp.players = n;
    mp.turn = 0;
    mp.online = m === 'versus' || m === 'coop';

    provide('game', { value: game, writable: true });
    if (m !== 'none') {
      provide('players', { get: function () { return mp.players; } });
      provide('turn', { get: function () { return mp.turn; } });
      provide('nextTurn', { value: nextTurn, writable: true });
      provide('myTurn', { value: myTurn, writable: true });
    }
    if (mp.online) {
      provide('seat', { get: function () { return online.seat; } });
      // The page shows the lobby bar; it puts this run in a room for us.
      if (hasHost) {
        try { window.parent.postMessage({ source: 'preview-online', run: run, op: 'lobby', mode: m, players: n }, '*'); } catch (e) { /* host gone */ }
      }
    }
    return game;
  }

  g.online = online;
  g.multiplayer = multiplayer;
  if (typeof window !== 'undefined' && window !== g) { window.online = online; window.multiplayer = multiplayer; }
})();
