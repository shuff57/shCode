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
//   online.host()          start a room; online.code becomes its 6-letter code
//   online.host(3)         a room for 3 players (2 to 4)
//   online.join('K7QX2M')  join a classmate's room with their code
//   online.send(move)      send a move: numbers, true/false, one-word labels
//   online.onMove(fn)      fn(move, seat) runs for EVERY move, yours included,
//                          in the same order on every computer
//   online.leave()
//
//   online.status   'off' | 'connecting' | 'waiting' | 'ready' | 'closed' | 'error'
//   online.seat     your seat: 0 is the host, then 1, 2, 3
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
      if (d.source !== 'preview-online-update' || d.code !== online.code) return;
      if (d.players) online.players = d.players;
      if (typeof d.seat === 'number') online.seat = d.seat;
      if (typeof d.seats === 'number') online.seats = d.seats;
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

  g.online = online;
  if (typeof window !== 'undefined' && window !== g) window.online = online;
})();
