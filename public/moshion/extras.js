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
// Real time (multiplayer(mode, n, { realtime: true }); REALTIME-SPEC.md): the
// page keeps a WebSocket to the room instead of polling, so moves arrive in a
// few hundredths of a second, and:
//   online.share(sprite)   send this sprite's x, y, rotation, size and colour
//                          about 15 times a second (once a second while still);
//                          up to 8 sprites. Only this computer moves it.
//   online.unshare(sprite)
//   online.peers[seat]     the first sprite that seat shares, made and moved
//                          here automatically, smoothed between updates
//                          (collider 'none': use overlaps() to touch it)
//   online.sharedBy(seat)  every sprite that seat shares, in the order shared
//   online.isHost          true on the host's computer (seat 0): in a
//                          host-decides game the host applies everyone's
//                          inputs, moves the real sprites and shares them
//   online.live            true while in a real-time room
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
    live: false,
    peers: {},
    host: function (seats) {
      online.status = 'connecting';
      online.error = null;
      var body = { game: 'moshion', seats: seats === undefined ? 2 : seats };
      if (mp.realtime) body.live = true;
      ask('host', body, function (r) {
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
        online.live = false;
        removePeers();
      });
    },
    share: function (sprite) {
      if (!mp.realtime) {
        if (!warnedShare) {
          warnedShare = true;
          fail("online.share() needs a real-time room: call multiplayer('coop', 2, { realtime: true }) in setup() first.");
        }
        return;
      }
      if (!sprite || typeof sprite !== 'object' || !('x' in sprite) || !('y' in sprite)) {
        fail('online.share() needs a sprite: online.share(player)');
        return;
      }
      for (var i = 0; i < mine.length; i++) if (mine[i].sprite === sprite) return;
      if (mine.length >= MAX_SHARED) { fail('online.share(): you can share at most ' + MAX_SHARED + ' sprites.'); return; }
      var used = {};
      for (var j = 0; j < mine.length; j++) used[mine[j].id] = true;
      var id = 0;
      while (used[id]) id++;
      mine.push({ sprite: sprite, id: id, last: '', at: 0 });
      if (shareTimer === null && typeof setInterval === 'function') shareTimer = setInterval(shareTick, SHARE_MS);
    },
    unshare: function (sprite) {
      for (var i = mine.length - 1; i >= 0; i--) {
        if (sprite === undefined || mine[i].sprite === sprite) {
          tell('unshare', { id: mine[i].id });
          mine.splice(i, 1);
        }
      }
    },
    sharedBy: function (seat) {
      var byId = peerSprites[seat];
      var out = [];
      if (!byId) return out;
      var ids = Object.keys(byId).map(Number).sort(function (a, b) { return a - b; });
      for (var i = 0; i < ids.length; i++) out.push(byId[ids[i]]);
      return out;
    },
  };
  Object.defineProperty(online, 'isHost', { enumerable: true, get: function () { return online.seat === 0; } });

  // ---- shared sprites (real-time rooms only) -------------------------------
  var SHARE_MS = Math.round(1000 / 15);  // lib/live-protocol.ts SHARE_HZ
  var KEEPALIVE_MS = 1000;               // a sprite that has not moved is sent once a second
  var PEER_DELAY_MS = 100;               // peers are drawn this far in the past, between two updates
  var MAX_SHARED = 8;
  var COLOR_RE = /^(?:[a-z]{3,20}|#[0-9a-f]{3,8}|(?:rgba?|hsla?)\(\s*-?[\d.]+%?(?:\s*,\s*-?[\d.]+%?){2,3}\s*\))$/i;
  var TEXTURE_RE = /^[A-Za-z0-9_-]{1,20}$/;
  var mine = [];        // [{ sprite, id, last, at }]: what this computer shares
  var shareTimer = null;
  var peerSprites = {}; // seat -> { id -> sprite }: what the others share
  var warnedShare = false;

  function clock() { return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now(); }
  function r2(n) { n = Number(n); return isFinite(n) ? Math.round(n * 100) / 100 : 0; }

  function tell(op, body) {
    if (!hasHost) return;
    var msg = { source: 'preview-online', run: run, op: op };
    for (var k in body) if (Object.prototype.hasOwnProperty.call(body, k)) msg[k] = body[k];
    try { window.parent.postMessage(msg, '*'); } catch (e) { /* host gone */ }
  }

  function snapshot(sp, id) {
    var o = { id: id, x: r2(sp.x), y: r2(sp.y), r: r2(sp.rotation) };
    if (sp.vel) { o.vx = r2(sp.vel.x); o.vy = r2(sp.vel.y); }
    if (sp.shape === 'circle') o.d = Math.max(0, r2(sp.w)); else { o.w = Math.max(0, r2(sp.w)); o.h = Math.max(0, r2(sp.h)); }
    if (typeof sp.color === 'string' && sp.color.length <= 40 && COLOR_RE.test(sp.color)) o.c = sp.color;
    // sprite.texture reads back the texture object (its .name) since 2026-11-13;
    // a string is an older engine.
    var tn = typeof sp.texture === 'string' ? sp.texture : (sp.texture && sp.texture.name);
    if (typeof tn === 'string' && TEXTURE_RE.test(tn)) o.tx = tn;
    o.v = sp.visible !== false;
    return o;
  }

  function othersHere() {
    var n = 0;
    for (var i = 0; i < online.players.length; i++) if (!online.players[i].left && online.players[i].seat !== online.seat) n++;
    return n;
  }

  function shareTick() {
    // Nobody else to see it: send nothing (every message counts against the room's allowance).
    if (!hasHost || !online.live || !online.code || online.status === 'closed' || online.status === 'error' || othersHere() === 0) return;
    var t = clock();
    var list = [];
    for (var i = mine.length - 1; i >= 0; i--) {
      var m = mine[i];
      if (m.sprite._dead) { tell('unshare', { id: m.id }); mine.splice(i, 1); continue; }
      var snap = snapshot(m.sprite, m.id);
      var key = JSON.stringify(snap);
      if (key !== m.last || t - m.at >= KEEPALIVE_MS) { m.last = key; m.at = t; list.push(snap); }
    }
    if (list.length) tell('share', { list: list });
  }

  function placePeer(p) {
    var s = p._liveSamples;
    if (!s || !s.length) return;
    var t = clock() - PEER_DELAY_MS;
    var last = s[s.length - 1];
    var x, y, r;
    if (t >= last.t) {
      // Past the newest update: carry on along its velocity a little, then hold.
      var frames = Math.min(t - last.t, 150) / (1000 / 60);
      x = last.x + last.vx * frames;
      y = last.y + last.vy * frames;
      r = last.r;
    } else if (t <= s[0].t) {
      x = s[0].x; y = s[0].y; r = s[0].r;
    } else {
      var i = s.length - 2;
      while (i > 0 && s[i].t > t) i--;
      var a = s[i], b = s[i + 1];
      var f = b.t > a.t ? (t - a.t) / (b.t - a.t) : 1;
      x = a.x + (b.x - a.x) * f;
      y = a.y + (b.y - a.y) * f;
      var dr = ((b.r - a.r + 540) % 360) - 180; // the short way round
      r = a.r + dr * f;
    }
    try {
      p.x = x; p.y = y; p.rotation = r;
      if (p.vel) { p.vel.x = 0; p.vel.y = 0; }
    } catch (e) { /* deleted */ }
  }

  function makePeer(st) {
    var p = st.d !== undefined ? new Sprite(st.x, st.y, st.d) : new Sprite(st.x, st.y, st.w === undefined ? 50 : st.w, st.h === undefined ? 50 : st.h);
    p.collider = 'none';
    p._liveSamples = [];
    p.update = function () { placePeer(p); };
    return p;
  }

  function lookPeer(p, st) {
    if (st.c !== undefined && p.color !== st.c) p.color = st.c;
    var ptn = typeof p.texture === 'string' ? p.texture : (p.texture && p.texture.name);
    if (st.tx !== undefined && ptn !== st.tx) { try { p.texture = st.tx; } catch (e) { /* unknown here */ } }
    if (st.v !== undefined) p.visible = st.v;
    if (st.d !== undefined) { if (p.w !== st.d) p.diameter = st.d; }
    else if (st.w !== undefined && st.h !== undefined && (p.w !== st.w || p.h !== st.h)) { p.w = st.w; p.h = st.h; }
  }

  function refreshPeers() {
    var out = {};
    for (var seat in peerSprites) {
      var list = online.sharedBy(Number(seat));
      if (list.length) out[seat] = list[0];
    }
    online.peers = out;
  }

  function onShare(seat, list) {
    if (typeof seat !== 'number' || seat === online.seat || typeof Sprite !== 'function' || !list || !list.length) return;
    var byId = peerSprites[seat] || (peerSprites[seat] = {});
    var t = clock();
    for (var i = 0; i < list.length; i++) {
      var st = list[i];
      if (!st || typeof st.id !== 'number') continue;
      var p = byId[st.id];
      if (!p || p._dead) { p = makePeer(st); byId[st.id] = p; }
      lookPeer(p, st);
      var smp = p._liveSamples;
      var prev = smp[smp.length - 1];
      // After a still spell (one update a second), start the move from "just now", not a second ago.
      if (prev && t - prev.t > SHARE_MS * 3) smp.push({ t: t - SHARE_MS, x: prev.x, y: prev.y, r: prev.r, vx: 0, vy: 0 });
      smp.push({ t: t, x: st.x, y: st.y, r: st.r || 0, vx: st.vx || 0, vy: st.vy || 0 });
      while (smp.length > 12) smp.shift();
      if (smp.length === 1) placePeer(p);
    }
    refreshPeers();
  }

  /** Delete the sprites shared by one seat (or by every seat), or one of them. */
  function removePeers(seat, id) {
    for (var k in peerSprites) {
      if (seat !== undefined && Number(k) !== seat) continue;
      var byId = peerSprites[k];
      for (var j in byId) {
        if (id !== undefined && Number(j) !== id) continue;
        try { byId[j].delete(); } catch (e) { /* gone */ }
        delete byId[j];
      }
      if (!Object.keys(byId).length) delete peerSprites[k];
    }
    refreshPeers();
  }

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
        online.live = d.live === true;
        removePeers();
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
      if (d.source === 'preview-online-share' || d.source === 'preview-online-unshare') {
        if (d.code !== online.code) return;
        if (d.source === 'preview-online-share') onShare(d.seat, d.list);
        else if (typeof d.seat === 'number') removePeers(d.seat, typeof d.id === 'number' ? d.id : undefined);
        return;
      }
      if (d.source !== 'preview-online-update' || d.code !== online.code) return;
      if (d.live === true) online.live = true;
      // A real-time room counts moves from where it is now (moves made before you came are not replayed).
      if (typeof d.seqBase === 'number') lastSeq = d.seqBase;
      if (d.players) {
        online.players = d.players;
        if (online.live) {
          var here = {};
          for (var pi = 0; pi < d.players.length; pi++) if (!d.players[pi].left) here[d.players[pi].seat] = true;
          for (var ps in peerSprites) if (!here[ps]) removePeers(Number(ps));
        }
      }
      if (typeof d.seat === 'number') online.seat = d.seat;
      if (typeof d.seats === 'number') { online.seats = d.seats; if (mp.online) mp.players = d.seats; }
      if (d.state) online.status = d.state;
      if (d.state === 'closed') removePeers();
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
  //   multiplayer('coop', 2, { realtime: true })
  //
  // makes the lobby use a REAL-TIME room instead (a WebSocket, moves in a few
  // hundredths of a second, online.share() for sprites). Without the option
  // nothing changes.
  //
  // A sketch that never calls multiplayer() gets none of these names, so its
  // own `let turn` or `function nextTurn()` is untouched.
  var MODES = ['none', 'local', 'coop', 'versus'];
  var mp = { called: false, mode: 'none', players: 1, turn: 0, online: false, realtime: false };

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
    realtime: { enumerable: true, get: function () { return mp.realtime; } },
    status: { enumerable: true, get: function () { return mp.online ? online.status : (mp.mode === 'none' ? 'off' : 'ready'); } },
  });

  function multiplayer(mode, players, options) {
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
    var wantsRealtime = !!(options && typeof options === 'object' && options.realtime === true);
    if (wantsRealtime && !mp.online) say('warn', "multiplayer(): { realtime: true } is for the online modes, 'coop' and 'versus'. Ignored for " + JSON.stringify(m) + '.');
    mp.realtime = wantsRealtime && mp.online;

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
        var lob = { source: 'preview-online', run: run, op: 'lobby', mode: m, players: n };
        if (mp.realtime) lob.realtime = true;
        try { window.parent.postMessage(lob, '*'); } catch (e) { /* host gone */ }
      }
    }
    return game;
  }

  g.online = online;
  g.multiplayer = multiplayer;
  if (typeof window !== 'undefined' && window !== g) { window.online = online; window.multiplayer = multiplayer; }
})();

// ---- save / load / saved (#97) -------------------------------------------
//
// save(key, value, where) and load(key, where). 'local' (the default) is
// exactly the engine's storeItem/getItem: this browser only. 'remote' is the
// student's account, so it follows them to another computer. The page loaded
// this sketch's remote saves into window.__moshionRemote BEFORE the sketch ran
// (runner.html), so load() stays synchronous, and every change is posted up for
// the page to write back (lib/moshion-storage.ts, /api/sketch-saves).
// window.__moshionRemoteState says how that went: 'ready', 'signed-out',
// 'offline', or absent (the code never says 'remote', or no page serves it).
// Anything but 'ready' keeps the save in this browser and says so ONCE, rather
// than failing a game over a missing network.
//
// saved(name, defaults, where) is the same store as one object: the saved
// fields laid over `defaults`, plus .save(where?) to write the object back.
//
// Limits mirror lib/sketch-saves-core.ts, so a refusal happens here, with the
// sketch's line number, instead of silently in the page.
(function () {
  'use strict';
  var g = typeof globalThis !== 'undefined' ? globalThis : window;
  var MAX_NAMES = 100, MAX_NAME = 100, MAX_VALUE = 16 * 1024, MAX_TOTAL = 64 * 1024;
  var warned = false;

  function where_(where, fn) {
    if (where === undefined || where === null || where === 'local') return 'local';
    if (where === 'remote') return 'remote';
    throw new Error(fn + "(): where to save is 'local' or 'remote', not " + JSON.stringify(where));
  }
  function remote() {
    if (g.__moshionRemoteState === 'ready' && g.__moshionRemote) return g.__moshionRemote;
    if (!warned) {
      warned = true;
      var st = g.__moshionRemoteState;
      console.warn(
        st === 'signed-out' ? "'remote' saves need you to be signed in, so this sketch is saving in this browser only."
          : st === 'offline' ? "Your account could not be reached, so 'remote' saves are kept in this browser only for now."
          : "'remote' saves are not available here, so this sketch is saving in this browser only."
      );
    }
    return null;
  }
  function post(msg) {
    msg.source = 'preview-storage';
    try { if (g.parent && g.parent !== g) g.parent.postMessage(msg, '*'); } catch (e) { /* no host */ }
  }

  function save(key, value, where) {
    if (typeof key !== 'string' || !key) {
      throw new Error("save(): start with a name in quotes, like save('best', score)");
    }
    if (value === undefined) value = null;
    var r = where_(where, 'save') === 'remote' ? remote() : null;
    if (!r) { g.storeItem(key, value); return value; }
    var raw = JSON.stringify(value);
    if (key.length > MAX_NAME) throw new Error('save(): a save name can be at most ' + MAX_NAME + ' characters.');
    if (raw.length > MAX_VALUE) throw new Error('save(): "' + key + '" is too big to save online (over 16 KB).');
    var had = Object.prototype.hasOwnProperty.call(r, key);
    if (!had && Object.keys(r).length >= MAX_NAMES) {
      throw new Error('save(): a sketch can save at most ' + MAX_NAMES + ' different names online.');
    }
    var before = r[key];
    r[key] = raw;
    if (JSON.stringify(r).length > MAX_TOTAL) {
      if (had) r[key] = before; else delete r[key];
      throw new Error("save(): this sketch's online saves would be over 64 KB in total.");
    }
    post({ op: 'set', key: key, value: raw, remote: true });
    return value;
  }

  function load(key, where) {
    var r = where_(where, 'load') === 'remote' ? remote() : null;
    if (!r) return g.getItem(key);
    if (!Object.prototype.hasOwnProperty.call(r, key)) return null;
    try { return JSON.parse(r[key]); } catch (e) { return r[key]; }
  }

  function saved(name, defaults, where) {
    where_(where, 'saved');
    if (typeof name !== 'string' || !name) {
      throw new Error("saved(): start with a name in quotes, like saved('player', { best: 0 })");
    }
    var stored = load(name, where);
    var obj = Object.assign({}, defaults || {},
      stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {});
    // Not enumerable, so JSON.stringify and for...in never see it.
    Object.defineProperty(obj, 'save', {
      value: function (w) { save(name, this, w === undefined ? where : w); return this; },
      enumerable: false, writable: true, configurable: true,
    });
    return obj;
  }

  // The page reports a write it could not make (offline, or a limit the server
  // counts in bytes) on the same message channel.
  if (typeof g.addEventListener === 'function') {
    g.addEventListener('message', function (e) {
      var d = e && e.data;
      if (d && d.source === 'preview-storage-remote-error' && typeof d.message === 'string') console.warn(d.message);
    });
  }

  g.save = save;
  g.load = load;
  g.saved = saved;
})();
