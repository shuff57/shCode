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
