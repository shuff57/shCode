// director.js: the bookSHelf character as an actor on the lesson stage. IM1-2.2 LIB copy: the 1.3.2 explainer rig (13 expressions,
// gaze/tilt/amp, sweep, powerup, toss, tag, cutSparks, scratch, emo/kick/lookAt/walk/route) with Z0 chosen by window.PM.
//
// Body: the vendored rig (docs/_vendor/kg-character.js, copied to lib/ unchanged) via __KGC.frames().
// Moves: draw bodies COPIED from _workspace/_bakeoff/character-motion-reel.html (main checkout), the
// executable source named by .claude/skills/explainer-video/references/character-moves.md. They run here
// in "reel space": the same units the reel uses (sprite 70x90), mapped onto the 1600x900 stage by Z.
// Changes from the reel are marked ADAPTED (parameters/targets) or AUTHORED (new code).
//
// Purity: every teaching move is a function of the beat clock P.t and its marks, so seeking and replay
// draw the same picture. Two things run on the wall clock and are NOT teaching: idle breathing and the
// short right/wrong reactions in a check (answer effects already live on the wall clock in the engine).
// moshion-5.1.2-style COPY (MS changes): home corner from window.PM.charHome, every colour (effects and the baked body)
// from lib/tokens.js, the canvas text font from the token file, HAND positions for the new poses, and MV.wave.
// PLAY LAYER (added): CH.play holds the student's drag, the proximity power-up and the spoken word. It is applied
// on the wall clock after the teaching state, so it never changes a sought frame or CH.signature(). MV.teleport
// is the one move added for it. The pointer lives in lib/play.js; this file only draws what that file asks for.
'use strict';
(function () {
  const KG = window.__KG, KGC = window.__KGC;
  if (!KG || !KGC) return;
  const PMC = window.PM || {};                       // set by the page before load.js: { type: 'lesson'|'explainer', charZ? }
  const Z0 = PMC.charZ || (PMC.type === 'explainer' ? 1.9 : 1.5);   // stage px per reel unit: explainer 1.9 (133x171 sprite, a brow or glint reads); lesson 1.5 (105x135) leaves more room for figures and cards
  const SW = 70, SH = 90;                          // reel sprite size
  const RX = 70 / 92, RY = 90 / 118;               // rig units -> reel units (as the reel does)
  const HOME = PMC.charHome ? { x: PMC.charHome[0], y: PMC.charHome[1] } : { x: 20, y: 900 - 14 - SH * Z0 };   // MS: PM.charHome (sprite top-left, stage px)
  const BOIL_DRAW = 8;                             // character/pencil boil, Hz (the reel's 125 ms)

  // ---- canvas layer, between the stage SVG and the HTML cards ----
  const cv = document.createElement('canvas');
  cv.width = 1600; cv.height = 900; cv.id = 'charLayer';
  cv.setAttribute('aria-hidden', 'true');
  $('stage').after(cv);
  const sk = new KG.Sketch(1600, 900);
  sk.canvas = cv; sk.ctx = cv.getContext('2d', { willReadFrequently: true });
  const ctx = sk.ctx;
  const NULLSK = new KG.Sketch(4, 4);             // reduced motion: effects are drawn here, where nobody sees them
  let FX = sk;

  // ---- reel colour keys, from the deck palette ----
  const TOKC = window.PM_TOKENS ? Object.fromEntries(Object.entries(window.PM_TOKENS.themes).map(([k, v]) => [k, v.char])) : null;   // MS
  const RCP = TOKC ? Object.fromEntries(Object.entries(TOKC).map(([k, v]) => [k, v.fx])) : {
    light: { stroke: '#141413', ink: '#141413', 'ink-soft': '#3d3d3a', blue: '#3d5a80', ember: '#b3520f', rule: '#8a877c',
      plate: '#faf9f5', gold: '#c98a0c', 'gold-hot': '#efae1d', smoke: '#8a877c' },
    dark: { stroke: '#ece7d9', ink: '#ece7d9', 'ink-soft': '#c4bfb1', blue: '#89a9c8', ember: '#e0a96d', rule: '#77736a',
      plate: '#23221f', gold: '#e8b04a', 'gold-hot': '#ffd36b', smoke: '#77736a' },
  };
  let RC = {}, RCH = {};
  const hex2rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  function readColours() { RCH = RCP[THEME.name]; RC = {}; for (const k in RCH) RC[k] = hex2rgb(RCH[k]); }

  // ---- reel helpers, copied ----
  const clamp01 = x => x < 0 ? 0 : x > 1 ? 1 : x;
  const ease = u => u * u * (3 - 2 * u);
  const seg = (u, a, b) => clamp01((u - a) / (b - a));
  const pingpong = u => u < .5 ? u * 2 : (1 - u) * 2;
  const snap = k => 1 - Math.pow(1 - k, 2.4);
  function smearPts(gx, gy, a0, a1, rOut, tMax) {
    const N = 16, out = [];
    for (let i = 0; i <= N; i++) { const a = a0 + (a1 - a0) * (i / N); out.push([gx + Math.cos(a) * rOut, gy + Math.sin(a) * rOut]); }
    for (let i = N; i >= 0; i--) { const u = i / N, uu = Math.pow(u, 1.6), a = a0 + (a1 - a0) * u, th = tMax * Math.pow(Math.sin(Math.PI * uu), 0.75);
      out.push([gx + Math.cos(a) * (rOut - th), gy + Math.sin(a) * (rOut - th)]); }
    return out;
  }
  function ln(s, pts, w, c, o) { s.sk.setInk(RC[c || 'stroke']); s.sk.stroke(pts, w || 2, o || { alpha: .92 }); }
  function ring(s, cx, cy, r, c, fill) {
    const pts = KG.circlePts(cx, cy, r, r, 18, 0);
    if (fill) { s.sk.poly(pts, true); s.sk.ctx.fillStyle = s.sk.colA(RC[c || 'blue'], .85); s.sk.ctx.fill(); }
    s.sk.setInk(RC[c || 'blue']); s.sk.stroke(pts.concat([pts[0]]), 1.6, { alpha: .9 });
  }
  function blob(s, cx, cy, r, c, a) {
    const pts = s.sk.blobPts(cx, cy, r, r * 0.92, 0, 0.5);
    s.sk.poly(pts, true); s.sk.ctx.fillStyle = s.sk.colA(RC[c || 'smoke'], a == null ? 0.5 : a); s.sk.ctx.fill();
  }
  function bubblePts(s, cx, cy, rx, ry, think) {
    const pts = [], N = 70, L = 5, amp = think ? 0.12 : 0;
    for (let i = 0; i < N; i++) {
      const a = i / N * Math.PI * 2, k = 1 + amp * Math.abs(Math.sin(a * L)) + s.sk.jr(-0.014, 0.014);
      pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
    }
    return pts;
  }
  function bubble(s, cx, cy, rx, ry, o) {
    o = o || {}; const k = o.k == null ? 1 : o.k, lk = o.lobeK == null ? k : o.lobeK, z = 0.88 + 0.12 * k;
    if (k > 0.02) {
      const pts = bubblePts(s, cx, cy, rx * z, ry * z, o.think);
      s.sk.poly(pts, true); s.sk.ctx.fillStyle = s.sk.colA(RC.plate, 0.95); s.sk.ctx.fill();
      s.sk.setInk(RC[o.c || 'stroke']); s.sk.stroke(pts.concat([pts[0]]), 1.6, { alpha: 0.92 * k });
    }
    if (!o.to || (k <= 0.02 && lk <= 0.02)) return;
    const dx = o.to[0] - cx, dy = o.to[1] - cy, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
    if (o.think) {
      for (let i = 1; i <= 2; i++) {
        const pop = clamp01(lk * 2 - (i === 2 ? 0 : 1));
        if (pop <= 0.02) continue;
        const f = 0.18 + (i - 1) * 0.27, r = (9.0 - i * 2.6) * pop;
        const bx = cx + ux * (rx * z + (d - rx * z) * f), by = cy + uy * (ry * z + (d - ry * z) * f);
        const cp = KG.circlePts(bx, by, r, r, 12, 0);
        s.sk.poly(cp, true); s.sk.ctx.fillStyle = s.sk.colA(RC.plate, 0.95); s.sk.ctx.fill();
        s.sk.setInk(RC[o.c || 'stroke']); s.sk.stroke(cp.concat([cp[0]]), 1.4, { alpha: 0.88 * pop });
      }
    } else {
      const px = -uy, py = ux, base = 15 * z, run = Math.min(d * 0.62, rx * z * 0.9 + 46);
      const b0 = [cx + ux * rx * z * 0.70 + px * base, cy + uy * ry * z * 0.70 + py * base];
      const b1 = [cx + ux * rx * z * 0.70 - px * base, cy + uy * ry * z * 0.70 - py * base];
      const tip = [cx + ux * run, cy + uy * run];
      s.sk.poly([b0, tip, b1], true); s.sk.ctx.fillStyle = s.sk.colA(RC.plate, 0.95); s.sk.ctx.fill();
      s.sk.stroke([b0, tip, b1], 1.6, { alpha: 0.92 * k });
    }
  }
  // Text on the pencil canvas (the reel uses SVG <text> over its canvas; same idea, one layer). ADAPTED.
  function word(str, x, y, size, c, a, weight = 600) {
    if (a <= 0.01) return;
    const cx2 = FX.ctx;
    cx2.save(); cx2.globalAlpha = a; cx2.fillStyle = RCH[c] || c; cx2.textAlign = 'center';
    cx2.font = `${weight} ${size}px ${window.PM_TOKENS ? window.PM_TOKENS.font.ui : 'Georgia, serif'}`; cx2.fillText(str, x, y); cx2.restore();
  }
  // Rig hand positions (rig units, from the A table in kg-character.js) -> reel offsets from the sprite corner.
  const HAND = { point: [46 + 22, 60 + 3], cup: [46 + 14, 60 + 17], thrust: [46 + 21, 60 + 6], sling: [46 + 16, 60 + 3], up: [46 + 15, 60 - 7],
    pointUp: [46 + 24, 60 - 8], wave1: [46 + 25, 60 - 11], wave2: [46 + 30, 60 - 4] };   // MS: the new poses
  const hand = (s, pose) => [s.cx + s.lean + HAND[pose][0] * RX, s.cy + s.hop + HAND[pose][1] * RY];
  // stage px <-> reel units for the current Z
  const R = (s, p) => [p[0] / s.Z, p[1] / s.Z];

  /* ======================== moves ======================== */
  const MV = {};

  // idle (reel 'idle', copied; ADAPTED: the shrug on the weight shift only in "rest" so it never reads as a verdict)
  MV.idle = (u, s, { rest = true } = {}) => {
    const c = u * Math.PI * 2 * 3;
    s.hop += Math.sin(c) * 2.5;                                  // reel: 4 (smaller here, he shares the stage)
    s.scale *= 1 + 0.018 * Math.sin(c + 0.6);
    const away = seg(u, .34, .40) - seg(u, .48, .55);
    // The reel mirrored him (scaleX 1 -> -1) for the look-away. Mirroring passes through a sliver whatever the floor, and the 16 Hz redraw
    // catches it as a glitch about one frame in nine (LIB fix pass #3), so the look-away is now a head turn: a tilt away, no change of width.
    s.tilt = (s.tilt || 0) + away * -8;
    const shift = pingpong(seg(u, .62, .94));
    s.lean += away * -6 + shift * 5; s.hop += shift * 1.5;
    if (rest && shift > 0.6 && s.pose === 'down') s.pose = 'shrug';
  };

  // MS (AUTHORED): a wave. The raised right hand swings between two drawn frames at hz swings per second over [t0, t0 + dur];
  // a pure function of the beat clock t, so a seek lands on the same frame. A small lift as the arm goes up.
  MV.wave = (t, s, t0, dur, hz = 2.4) => {
    const dt = t - t0;
    if (dt < 0 || dt > dur) return false;
    s.pose = Math.floor(dt * hz * 2) % 2 ? 'wave2' : 'wave1';
    s.hop -= 3 * Math.sin(Math.PI * Math.min(1, dt / .35)) * (dt < .35 ? 1 : 0);
    s.lean += 1.5 * Math.sin(dt * hz * Math.PI * 2);
    return true;
  };

  // hop along (reel 'walkpast', copied: eased travel, a sine hop over the middle). ADAPTED: endpoints, height.
  MV.hop = (u, s, x0, x1, h = 30) => {
    const p = ease(u);
    s.cx = x0 + p * (x1 - x0);
    const over = p > .2 && p < .8;
    s.hop += over ? -h * Math.sin((p - .2) / .6 * Math.PI) : 0;
    if (x1 < x0) s.face = -1;
  };

  // Rasengan gather (reel 'rasengan', copied gather + orb) and AUTHORED throw: thrust carries the orb into
  // a target, impact spray copied from 'beam'. tokens: [[label, stageX, stageY]], tgt: stage px.
  MV.rasengan = (u, s, { tokens, tgt }) => {
    const g = ease(seg(u, .08, .52)), go = seg(u, .66, .80), throwK = snap(go), done = ease(seg(u, .80, .96));
    s.pose = u < .62 ? 'point' : 'thrust';
    const H = u < .62 ? hand(s, 'point') : hand(s, 'thrust');
    const T = R(s, tgt);
    // gather: the tokens spiral into the hand (copied: straight-line lerp with a faint trail)
    tokens.forEach(([lab, sx, sy], i) => {
      const [x0, y0] = R(s, [sx, sy]);
      const sw = (1 - g) * 0.9 + 0.1, ang = g * 4.2 + i * 2.6;          // AUTHORED: a spiral, not a straight line
      const x = H[0] + (x0 - H[0]) * (1 - g) + Math.cos(ang) * 14 * g * (1 - g) * 2;
      const y = H[1] + (y0 - H[1]) * (1 - g) + Math.sin(ang) * 14 * g * (1 - g) * 2;
      word(lab, x, y + 5, 16 * sw + 6, 'ember', 1 - g * 0.92);
      if (g > .04 && g < .97) ln(s, [[x0, y0], [x, y]], 1.1, 'rule', { alpha: .22 * (1 - g) });
    });
    // the orb (copied), carried by the throw
    const k2 = 1 - done;
    if (g > .10 && k2 > .02) {
      const ox = H[0] + (T[0] - H[0]) * throwK, oy = H[1] + (T[1] - H[1]) * throwK;
      const R0 = 16 * g * (1 - 0.35 * throwK);
      if (throwK > .02 && throwK < .98) {                               // AUTHORED: a short speed trail behind it
        const d = Math.hypot(T[0] - H[0], T[1] - H[1]) || 1, ux = (T[0] - H[0]) / d, uy = (T[1] - H[1]) / d;
        const pts = [[ox - ux * 40 * Math.sin(Math.PI * go) - uy * R0 * .6, oy - uy * 40 * Math.sin(Math.PI * go) + ux * R0 * .6], [ox, oy],
          [ox - ux * 40 * Math.sin(Math.PI * go) + uy * R0 * .6, oy - uy * 40 * Math.sin(Math.PI * go) - ux * R0 * .6]];
        s.sk.poly(pts, true); s.sk.ctx.fillStyle = s.sk.colA(RC.blue, 0.25); s.sk.ctx.fill();
      }
      const pts = KG.circlePts(ox, oy, R0, R0, 18, 0);
      s.sk.poly(pts, true); s.sk.ctx.fillStyle = s.sk.colA(RC.blue, 0.6 * g * k2); s.sk.ctx.fill();
      s.sk.poly(KG.circlePts(ox, oy, R0 * 0.5, R0 * 0.5, 14, 0), true);
      s.sk.ctx.fillStyle = s.sk.colA(RC['gold-hot'], 0.6 * g * k2); s.sk.ctx.fill();
      for (let b2 = 0; b2 < 3; b2++) {
        const ph = u * 54 + b2 * 2.09, arm = [];
        for (let t2 = 0; t2 <= 12; t2++) { const q = t2 / 12, ang = ph + q * 3.4, rr = R0 * (0.20 + 0.86 * q); arm.push([ox + Math.cos(ang) * rr, oy + Math.sin(ang) * rr]); }
        s.sk.setInk(RC['gold-hot']); s.sk.stroke(arm, 1.3, { alpha: 0.8 * g * k2 });
      }
      s.sk.setInk(RC.blue); s.sk.stroke(pts.concat([pts[0]]), 1.5, { alpha: 0.9 * g * k2 });
    }
    // impact spray at the target (copied from 'beam')
    if (go >= 1 && done < 1) {
      const d = Math.hypot(T[0] - H[0], T[1] - H[1]) || 1, ux = (T[0] - H[0]) / d, uy = (T[1] - H[1]) / d;
      for (let j = 0; j < 6; j++) {
        const a2 = Math.atan2(uy, ux) + (j - 2.5) * 0.55, r0 = 8 + done * 10;
        ln(s, [[T[0] + Math.cos(a2) * r0, T[1] + Math.sin(a2) * r0], [T[0] + Math.cos(a2) * (r0 + 13), T[1] + Math.sin(a2) * (r0 + 13)]], 1.4, 'gold', { alpha: 0.7 * (1 - done) });
      }
    }
    s.lean += 6 * throwK * (1 - done);
  };

  // Teleport (AUTHORED for the play layer): a blink between two stage points. The body is moved by
  // applyPlay() below; this draws only the tear at the old spot and the flash at the new one. Pure in u.
  MV.teleport = (u, s, { from, to }) => {
    const F = R(s, from), T = R(s, to);
    const out = ease(seg(u, 0, .30)), inn = ease(seg(u, .22, .58)), fade = 1 - ease(seg(u, .62, 1));
    s.pose = u < .30 ? 'down' : 'up';
    if (out > 0 && fade > 0) {
      for (let i = 0; i < 4; i++) {                                  // the old spot: a torn ring and three speed ticks
        const a = -0.6 + i * 0.42 + u * 3.2, rr = 12 + 26 * out + i * 4, fy = F[1] + 46 / s.Z;
        ln(s, [[F[0] + Math.cos(a) * rr, fy + Math.sin(a) * rr * .7],
               [F[0] + Math.cos(a) * (rr + 16), fy + Math.sin(a) * (rr + 16) * .7]], 1.5, 'blue', { alpha: .55 * fade * (1 - inn * .6) });
      }
      ring(s, F[0], F[1] + 46 / s.Z, 10 + 30 * out, 'blue', false);
    }
    if (inn > 0 && fade > 0) {
      ring(s, T[0], T[1] + 46 / s.Z, 40 * (1 - inn) + 8, 'cyan', false);
      for (let i = 0; i < 10; i++) {                                 // the new spot: an arrival flash
        const a = i / 10 * Math.PI * 2 + .2, r0 = 9 + 14 * (1 - inn), r1 = r0 + 16, ty = T[1] + 46 / s.Z;
        ln(s, [[T[0] + Math.cos(a) * r0, ty + Math.sin(a) * r0],
               [T[0] + Math.cos(a) * r1, ty + Math.sin(a) * r1]], 1.5, 'gold-hot', { alpha: .8 * (1 - inn) * fade });
      }
    }
    s.hop -= 5 * Math.sin(Math.PI * Math.min(1, u / .5));
  };

  // Beam (reel 'beam', copied). ADAPTED: target is stage px; the expression text is the lesson's own SVG.
  MV.beam = (u, s, { tgt }) => {
    const ch = ease(seg(u, .06, .42)), fire = ease(seg(u, .46, .62));
    const TGT = R(s, tgt), tail = 1 - ease(seg(u, .78, .94));
    s.pose = fire > .02 ? 'thrust' : 'cup';
    const [hx, hy] = hand(s, fire > .02 ? 'thrust' : 'cup');
    if (ch > .03 && fire < .98) {
      const Rr = 10 * ch * (1 - fire);
      blob(s, hx, hy, Rr * 1.7, 'gold', 0.28 * ch * (1 - fire));
      blob(s, hx, hy, Rr, 'gold-hot', 0.9 * ch * (1 - fire));
      for (let i = 0; i < 5; i++) {
        const a = i * 1.26 + u * 14, rr = Rr + 9 + ((i * 5 + u * 30) % 10);
        ln(s, [[hx + Math.cos(a) * rr, hy + Math.sin(a) * rr], [hx + Math.cos(a) * (Rr + 2), hy + Math.sin(a) * (Rr + 2)]], 1.2, 'gold', { alpha: 0.6 * ch * (1 - fire) });
      }
    }
    if (fire > .02 && tail > .02) {
      const dx = TGT[0] - hx, dy = TGT[1] - hy, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d, px = -uy, py = ux;
      const len = fire * (d + 8), ex = hx + ux * len, ey = hy + uy * len;
      [[9, 'gold', 0.28], [4.5, 'gold', 0.55], [1.8, 'gold-hot', 0.95]].forEach(L => {
        const w0 = L[0], w1 = L[0] * 0.72;
        s.sk.poly([[hx + px * w0, hy + py * w0], [ex + px * w1, ey + py * w1], [ex - px * w1, ey - py * w1], [hx - px * w0, hy - py * w0]], true);
        s.sk.ctx.fillStyle = s.sk.colA(RC[L[1]], L[2] * tail); s.sk.ctx.fill();
      });
      blob(s, hx, hy, 9, 'gold-hot', 0.5 * tail);
      s.sk.setInk(RC.gold);
      s.sk.stroke(KG.arcPts(hx + ux * 6, hy + uy * 6, 7, 15, 0, Math.PI * 2, 14), 1.4, { alpha: 0.5 * tail });
      if (fire > .5) for (let j = 0; j < 4; j++) {
        const a2 = Math.atan2(uy, ux) + (j - 1.5) * 0.5;
        ln(s, [[ex, ey], [ex + Math.cos(a2) * 13, ey + Math.sin(a2) * 13]], 1.4, 'gold', { alpha: 0.6 * tail });
      }
      // ADAPTED: the result it lands on glows (a ring behind the number the beam lights up)
      if (fire > .9) ring(s, TGT[0], TGT[1], 26, 'gold', false);
    }
  };

  // Sword sweep (reel 'sweep', copied six-beat strike). ADAPTED: the released slash travels from x0 to the
  // target x and STOPS there (it marks a place, not a test), spanning stage y from y0 to y1.
  MV.sweep = (u, s, { x0: sx0, x1: sx1, y0: sy0, y1: sy1, xOf, band = 1 }) => {   // ADAPTED (2nd pass): xOf(u) pins the slash to the lesson's own line; band scales the washes
    const drawK = ease(seg(u, .05, .22)), antK = ease(seg(u, .23, .34)), swR = seg(u, .375, .415);
    const cutK = snap(swR), setK = ease(seg(u, .415, .50)), fast = Math.sin(Math.PI * swR);
    const trav = ease(seg(u, .415, .70)), fade = 1 - ease(seg(u, .86, 1));
    s.pose = drawK < 0.10 ? 'down' : (trav > 0.18 ? 'point' : 'sword');
    s.turn = 1 - 0.30 * ease(seg(u, .02, .15)) * (1 - ease(seg(u, .86, .96)));
    const lungeK = clamp01(cutK - setK);
    s.lean += 12 * lungeK; s.hop += 2 * lungeK;
    const LX = s.cx + s.lean, LY = s.cy + s.hop;
    const MX = 53, MY = 36, SX = 28, SY = 60;
    const mx = LX + 35 + (MX - 35) * s.turn, my = LY + MY, kx = LX + 35 + (SX - 35) * s.turn, ky = LY + SY;
    ln(s, [[kx, ky], [mx, my]], 3.4, 'ink-soft', { alpha: .72 });
    const ax = Math.atan2(my - ky, mx - kx);
    const BL = 44, AL = 34, shx = LX + 35, shy = LY + 46;
    const hUp = -0.70, hAnt = hUp - 0.28, hDown = 0.34, hOver = hDown + 0.16, hRest = hDown - 0.10;
    const hA = hUp + (hAnt - hUp) * antK + (hOver - hAnt) * cutK + (hRest - hOver) * setK;
    const ox = shx + Math.cos(hA) * AL, oy = shy + Math.sin(hA) * AL;
    const gx = mx + (ox - mx) * drawK, gy = my + (oy - my) * drawK, outL = BL * drawK;
    const b0 = ax + Math.PI, bUp = -1.22 + 2 * Math.PI, bAnt = bUp - 0.46, bDown = 0.62 + 2 * Math.PI, bOver = bDown + 0.24, bRest = bDown - 0.16;
    const bA = b0 + (bUp - b0) * drawK + (bAnt - bUp) * antK + (bOver - bAnt) * cutK + (bRest - bOver) * setK;
    const ux = Math.cos(bA), uy = Math.sin(bA), nx = -uy, ny = ux;
    if (trav < .45) {
      const vis = 1 - ease(seg(trav, .20, .45));
      if (fast > .015 && outL > 3) {
        const r1 = BL * 1.06, r2 = BL * 0.90, lead = bA + 0.12 * fast, lag = bA - 0.55 * fast;
        [[smearPts(gx, gy, bA - 2.45 * fast, lag, r2, BL * 0.70), 'ember', .24], [smearPts(gx, gy, bA - 2.05 * fast, lag, r2, BL * 0.22), 'gold', .38],
          [smearPts(gx, gy, bA - 1.75 * fast, lead, r1, BL * 0.92), 'ember', .46], [smearPts(gx, gy, bA - 1.32 * fast, lead, r1, BL * 0.34), 'gold', .80]
        ].forEach(sm => { s.sk.poly(sm[0], true); s.sk.ctx.fillStyle = s.sk.colA(RC[sm[1]], sm[2] * fast * vis); s.sk.ctx.fill(); });
      }
      const w0 = 4.6, w1 = 1.2, q0x = gx + ux * 4, q0y = gy + uy * 4, q1x = gx + ux * outL, q1y = gy + uy * outL;
      const quad = [[q0x + nx * w0, q0y + ny * w0], [q1x + nx * w1, q1y + ny * w1], [q1x - nx * w1, q1y - ny * w1], [q0x - nx * w0, q0y - ny * w0]];
      const bladeK = (1 - Math.pow(fast, 0.55)) * vis;
      if (outL > 3 && bladeK > .02) {
        s.sk.poly(quad, true); s.sk.ctx.fillStyle = s.sk.colA(RC.plate, 0.92 * bladeK); s.sk.ctx.fill();
        ln(s, quad.concat([quad[0]]), 1.8, 'stroke', { alpha: .94 * bladeK });
        ln(s, [[q0x, q0y], [q1x, q1y]], 1.0, 'ink-soft', { alpha: .45 * bladeK });
      }
      ln(s, [[q0x - nx * 8, q0y - ny * 8], [q0x + nx * 8, q0y + ny * 8]], 2.2, 'stroke', { alpha: .92 * vis });
      ln(s, [[gx - ux * 9, gy - uy * 9], [q0x, q0y]], 2.6, 'stroke', { alpha: .9 * vis });
      const pom = KG.circlePts(gx - ux * 11, gy - uy * 11, 2.6, 2.6, 10, 0);
      s.sk.poly(pom, true); s.sk.ctx.fillStyle = s.sk.colA(RC.stroke, 0.9 * vis); s.sk.ctx.fill();
      if (drawK > .05) ln(s, [[shx, shy], [gx - ux * 4, gy - uy * 4]], 1.6, 'stroke', { alpha: .9 * vis });
    }
    // the released slash (copied look: line + two translucent bands + a hot tick), ADAPTED to stop at x1
    const [lx] = R(s, [sx0, 0]), [tx] = R(s, [sx1, 0]), y0 = sy0 / s.Z, y1 = sy1 / s.Z;
    const x = xOf ? xOf(u) / s.Z : lx + trav * (tx - lx);   // ADAPTED
    if (trav > .001 && fade > .02) {
      ln(s, [[x, y0], [x, y1]], 2.6, 'ember', { alpha: .95 * fade });
      s.sk.poly([[x - 26, y0 + 4], [x, y0 + 4], [x, y1 - 4], [x - 26, y1 - 4]], true);
      s.sk.ctx.fillStyle = s.sk.colA(RC.ember, 0.16 * band * fade * (1 - trav * .6)); s.sk.ctx.fill();
      s.sk.poly([[x - 11, y0 + 4], [x, y0 + 4], [x, y1 - 4], [x - 11, y1 - 4]], true);
      s.sk.ctx.fillStyle = s.sk.colA(RC.ember, 0.20 * band * fade); s.sk.ctx.fill();
      ln(s, [[x - 2, y0 - 4], [x + 2, y0 + 4]], 1.6, 'gold-hot', { alpha: .8 * fade });
    }
  };

  // Thought bubble (reel 'thought', copied). ADAPTED: shows "..." (the card holds the question).
  MV.thought = (u, s) => {
    const k = ease(seg(u, .22, .38)), lk = ease(seg(u, .05, .20));
    const hx = s.cx + s.lean + 35, hy = s.cy + s.hop;
    const bx = hx + 18, by = hy - 46;                               // ADAPTED: straight up, clear of captions to his right
    bubble(s, bx, by, 34, 20, { think: true, to: [hx + 12, hy + 10], k, lobeK: lk });
    const dots = ['.', '. .', '. . .'][Math.floor((u * 6) % 3)];
    word(dots, bx, by + 6, 20, 'ink', k * .95, 700);
    s.lean += Math.sin(u * Math.PI * 4) * 1.5;
  };

  // Speech bubble (reel 'speech', copied). One or two words only.
  // PLAY LAYER: the bubble flips to his left / below when the dragged body is near the stage edge, so a "Woo!"
  // dropped in a corner is still readable instead of being clipped.
  MV.speech = (u, s, { text }) => {
    const k = ease(seg(u, .12, .24)) * (1 - ease(seg(u, .80, .92)));
    const hx = s.cx + s.lean + 35, hy = s.cy + s.hop;
    const bx = (hx + 70 + 50) * s.Z > 1600 ? hx - 70 : hx + 70;
    const by = (hy - 52) * s.Z < 8 ? hy + 62 : hy - 30;
    bubble(s, bx, by, 48, 22, { to: [hx + (bx < hx ? -18 : 18), hy + 14], k });
    word(text, bx, by + 6, 17, 'ember', k);
    s.lean += k * 4; s.hop -= k * 3;
  };

  // Impact frame (reel 'impact', copied speed lines). ADAPTED: centred on (cx, cy) reel units, radius scale.
  MV.impact = (u, s, cx, cy, sc = 1) => {
    const p = ease(seg(u, .0, .25)), fade = ease(seg(u, .55, 1));
    if (p <= .03) return;
    for (let i = 0; i < 20; i++) {
      const a = i / 20 * Math.PI * 2 + .11, r0 = (30 + p * 12) * sc, r1 = r0 + (16 + ((i % 3) * 8)) * sc;
      ln(s, [[cx + Math.cos(a) * r0, cy + Math.sin(a) * r0], [cx + Math.cos(a) * r1, cy + Math.sin(a) * r1]], 1.4, 'stroke', { alpha: .5 * p * (1 - fade) });
    }
  };

  // Sweat drop (reel 'doubletake', copied glyph) + head scratch (AUTHORED: the 'sling' pose hands the right arm
  // to the caller, which draws the forearm up to his head and rubs it).
  MV.oops = (u, s) => {
    const scratch = u > .30 && u < .92;
    s.pose = scratch ? 'sling' : 'shrug';
    const LX = s.cx + s.lean, LY = s.cy + s.hop;
    if (scratch) {
      const st = [LX + HAND.sling[0] * RX, LY + HAND.sling[1] * RY];
      const rub = Math.sin((u - .30) * Math.PI * 10) * 2.2;
      const elbow = [LX + 63 * RX, LY + 42 * RY], tip = [LX + (56 + rub) * RX, LY + 20 * RY];
      ln(s, [st, elbow, tip], 2.1 * RX * 1.3, 'stroke', { alpha: .9 });
    }
    if (u > .12 && u < .95) {
      const dx = LX + 60, dy = LY + 4 + seg(u, .12, .95) * 6;
      ln(s, [[dx, dy], [dx + 5, dy + 8], [dx, dy + 13], [dx - 5, dy + 8], [dx, dy]], 1.5, 'blue', { alpha: .8 });
    }
    word('?', LX + 10, LY - 4, 22, 'ember', ease(seg(u, .05, .2)) * (1 - ease(seg(u, .85, 1))), 700);
  };

  // Power-up (reel 'powerup', copied): the blonde transformation. Once per lesson, on a perfect score card.
  MV.powerup = (u, s, { size = 1, auraK = 1 } = {}) => {   // ADAPTED (2nd pass): size shrinks the aura; auraK fades it while the hair stays blonde
    const p = ease(seg(u, .10, .46)), k = p * auraK;
    s.blonde = p > 0.30;
    const cx = s.cx + 35, footY = s.cy + 88, headY = s.cy + 4;
    if (k < .02) { s.scale *= 1 + p * 0.10; return; }
    const midY = footY - 52;
    blob(s, cx, midY + 10, 26 * k * size, 'gold', 0.24 * k);
    blob(s, cx, midY, 16 * k * size, 'gold-hot', 0.42 * k);
    blob(s, cx, footY - 8, 20 * k * size, 'gold', 0.16 * k);
    const hubX = cx, hubY = footY - 16 * k, L0 = 120 * k * size, NB = 15;
    for (let i = 0; i < NB; i++) {
      const f = i / (NB - 1), a2 = Math.PI + (0.09 + 0.82 * f) * Math.PI, ph = u * 34 + i * 1.43;
      const len = L0 * (0.52 + 0.48 * Math.sin(Math.PI * f)) * (0.74 + 0.34 * Math.abs(Math.sin(ph)));
      const halfW = (9.5 + 3.5 * Math.sin(i * 2.1)) * k, nx2 = -Math.sin(a2), ny2 = Math.cos(a2);
      const tipx = hubX + Math.cos(a2) * len, tipy = hubY + Math.sin(a2) * len;
      s.sk.poly([[hubX + nx2 * halfW, hubY + ny2 * halfW], [tipx, tipy], [hubX - nx2 * halfW, hubY - ny2 * halfW]], true);
      s.sk.ctx.fillStyle = s.sk.colA(RC.gold, (0.20 + 0.16 * Math.abs(Math.sin(ph))) * k); s.sk.ctx.fill();
    }
    for (let j = 0; j < 9; j++) {
      const g2 = j / 8, a3 = Math.PI + (0.06 + 0.88 * g2) * Math.PI, ph3 = u * 41 + j * 2.0;
      const l3 = L0 * 0.42 * (0.6 + 0.4 * Math.sin(Math.PI * g2)) * (0.8 + 0.3 * Math.abs(Math.sin(ph3)));
      const nx3 = -Math.sin(a3), ny3 = Math.cos(a3), hw3 = 5.5 * k;
      s.sk.poly([[hubX + nx3 * hw3, hubY + ny3 * hw3], [hubX + Math.cos(a3) * l3, hubY + Math.sin(a3) * l3], [hubX - nx3 * hw3, hubY - ny3 * hw3]], true);
      s.sk.ctx.fillStyle = s.sk.colA(RC['gold-hot'], (0.26 + 0.18 * Math.abs(Math.sin(ph3))) * k); s.sk.ctx.fill();
    }
    blob(s, hubX, hubY - 14 * k, 15 * k, 'gold-hot', 0.30 * k);
    for (let h2 = 0; h2 < 5; h2++) {
      const a = (-0.95 + h2 * 0.475), sx = cx + Math.sin(a) * 15, sy = headY - 2;
      ln(s, [[sx, sy], [sx + Math.sin(a) * 10, sy - 16 * k - 4]], 1.9, 'gold', { alpha: 0.85 * k });
    }
    for (let m = 0; m < 7; m++) { const mp = ((u * 2.2 + m * 0.143) % 1); blob(s, cx + Math.sin(m * 2.3 + u * 8) * 30, footY - 6 - mp * 128, (1.7 + (m % 3) * 0.7) * k, 'gold', 0.75 * (1 - mp) * k); }
    for (let d = 0; d < 4; d++) { const dp = ((u * 1.5 + d * 0.25) % 1); blob(s, cx + ((d - 1.5) * 26), footY + 6 - dp * 34, 1.9 * k, 'ink-soft', 0.55 * (1 - dp) * k); }
    const rr = (10 + k * 46);
    s.sk.setInk(RC.gold); s.sk.stroke(KG.arcPts(cx, footY + 8, rr, rr * 0.30, 0, Math.PI * 2, 20), 1.4, { alpha: 0.35 * k });
    s.scale *= 1 + p * 0.10;   // p, not k: the bigger frame stays after the aura fades
  };

  // Right answer: arms up, two hops, a burst of speed lines (reel 'impact', copied).
  MV.yay = (u, s, big = 1) => {
    s.pose = u < .9 ? 'up' : 'down';
    s.hop -= 14 * big * Math.abs(Math.sin(seg(u, 0, .7) * Math.PI * 2));
    MV.impact(u, s, s.cx + s.lean + 35, s.cy + s.hop + 40, 1.1 * big);
  };

  // Score-card celebration, scaled to the first-try score. AUTHORED composition of copied moves.
  MV.celebrate = (t, s) => {
    let r = 0, n = 0;
    for (const k in SCORE) { r += SCORE[k].right; n += SCORE[k].total; }
    const q = n ? r / n : 0;
    if (n && q === 1) { MV.powerup(Math.min(1, t / 3.2), s); s.pose = 'up'; }
    else if (q >= .6) { MV.yay(Math.min(1, (t % 1.6) / 1.6), s, 1.3); if (t > 3.2) s.pose = 'up'; }
    else { s.pose = 'point'; MV.speech(Math.min(.7, t / 3), s, { text: n ? 'Next time!' : 'Try them!' }); }
  };

  // ---- AUTHORED: moves that touch the picture (pure functions of u in 0..1) ----
  // Toss a point onto the graph: a dot leaves the hand, rides a parabola, lands at tgt (stage px).
  MV.toss = (u, s, { tgt, col = 'ember', r = 11 }) => {
    s.pose = 'point';
    const H = hand(s, 'point'), T = R(s, tgt), k = ease(seg(u, .30, .86));
    const x = H[0] + (T[0] - H[0]) * k, y = H[1] + (T[1] - H[1]) * k - Math.sin(Math.PI * k) * 46;
    const rr = r / s.Z * (u < .30 ? .5 + seg(u, 0, .3) * .5 : 1);
    if (u < .02 || u > .90) return;
    ring(s, x, y, rr, col, true);
    ln(s, [[x - 5, y + 9], [x - 12, y + 16]], 1.2, 'rule', { alpha: .5 * (1 - k) });   // a small flick of motion behind it
  };
  // Hang a sign: a paper tag flies from the hand to the corner at `at` (stage px), then swings and settles.
  MV.tag = (u, s, { at, text, col = 'ember', ret = 0 }) => {
    if (ret >= 1) return;
    const H = hand(s, 'up'), A = R(s, at), k = ease(seg(u, .10, .50));
    const sw = u > .5 ? Math.sin((u - .5) * 26) * 9 * Math.exp(-(u - .5) * 5) * Math.PI / 180 : 0;
    const px0 = H[0] + (A[0] - H[0]) * k, py0 = H[1] + (A[1] - H[1]) * k - Math.sin(Math.PI * k) * 20;
    const px = px0 + (H[0] - px0) * ret, py = py0 + (H[1] - py0) * ret;   // taken back as he leaves, so it never sits on the chip
    if (u < .05) return;
    const w = 31, h = 15, cs = Math.cos(sw), sn = Math.sin(sw), rot = (x, y) => [px + x * cs - y * sn, py + x * sn + y * cs];
    const body = [rot(-w, 6), rot(w, 6), rot(w, 6 + h * 1.6), rot(-w, 6 + h * 1.6)];
    s.sk.poly(body, true); s.sk.ctx.fillStyle = s.sk.colA(RC.plate, .96); s.sk.ctx.fill();
    ln(s, body.concat([body[0]]), 1.6, col, { alpha: .95 });
    ln(s, [rot(0, 6), rot(-5, -2), rot(5, -2), rot(0, 6)], 1.2, 'ink-soft', { alpha: .8 });
    s.sk.ctx.save(); s.sk.ctx.translate(px, py); s.sk.ctx.rotate(sw);
    word(text, 0, 6 + h * 1.15, 13, col, .98, 700); s.sk.ctx.restore();
  };
  // The cut lands: a short radial spray at each point where the line stands (the sweep's release ticks, copied style).
  MV.cutSparks = (u, s, pts) => {
    if (u <= 0 || u >= 1) return;
    const e = ease(u), fade = 1 - ease(seg(u, .5, 1));
    pts.forEach(pt => { const [cx2, cy2] = R(s, pt);
      for (let j = 0; j < 8; j++) { const a = j / 8 * Math.PI * 2 + .2, r0 = 6 + e * 6, r1 = r0 + 9 + e * 6;
        ln(s, [[cx2 + Math.cos(a) * r0, cy2 + Math.sin(a) * r0], [cx2 + Math.cos(a) * r1, cy2 + Math.sin(a) * r1]], 1.4, 'gold', { alpha: .85 * fade }); } });
  };
  // Head scratch for an embarrassed beat: the 'sling' pose hands the arm over, we draw the forearm to the head.
  MV.scratch = (u, s) => {
    s.pose = 'sling';
    const LX = s.cx + s.lean, LY = s.cy + s.hop;
    const st = [LX + HAND.sling[0] * RX, LY + HAND.sling[1] * RY], rub = Math.sin(u * Math.PI * 12) * 2.2;
    ln(s, [st, [LX + 63 * RX, LY + 42 * RY], [LX + (56 + rub) * RX, LY + 20 * RY]], 2.1 * RX * 1.3, 'stroke', { alpha: .9 });
  };

  // ---- AUTHORED: emotion helpers. Every one is a pure function of the beat clock t, so seeking draws the same face. ----
  // steps: [[time, props], ...] ascending; props accumulate (later steps override earlier ones). A reaction therefore
  // lands on the word that owns its time (always an m('mark', off)), never on a timer of its own.
  window.emo = (t, s, steps) => { for (const st of steps) if (t >= st[0]) Object.assign(s, st[1]); };
  const bump = (dt, a, b) => dt <= 0 ? 0 : dt < a ? dt / a : Math.max(0, 1 - (dt - a) / b);
  window.kick = {
    take:   (t, s, at, k = 1) => { const b = bump(t - at, .12, .6); s.lean -= 10 * k * b; s.hop -= 9 * k * b; s.scale *= 1 + .07 * k * b; },   // double-take recoil
    spring: (t, s, at, k = 1) => { const dt = t - at; if (dt < 0 || dt > .7) return; const q = Math.sin(Math.PI * Math.min(1, dt / .5)); s.hop -= 18 * k * q; s.scale *= 1 + .04 * k * q; },   // aha
    slump:  (t, s, at, len = .8, k = 1) => { const u = ease(seg(t, at, at + len)); s.hop += 4 * k * u; s.lean -= 3 * k * u; s.scale *= 1 - .03 * k * u; },   // persists
    lean:   (t, s, at, len = .6, k = 1) => { const u = ease(seg(t, at, at + len)); s.lean += 7 * k * u; },    // lean in toward something new (persists)
    shake:  (t, s, at, len = 1) => { const dt = t - at; if (dt < 0 || dt > len) return; s.lean += Math.sin(dt * 34) * 2.4 * (1 - dt / len); },
  };
  // Where he is looking, resolved at the end of compute() once his final facing is known. Stage px.
  window.lookAt = (s, x, y) => { s.look = [x, y]; };
  // Walk (eased, small hop) from stage x0 to x1 over [t0, t0+dur]; y fixed. Used for "stand next to the subject".
  window.walk = (t, s, MV, x0, x1, t0, dur, y) => {
    const u = seg(t, t0, t0 + dur); s.cx = (x0 + (x1 - x0) * ease(u)) / s.Z; if (y != null) s.cy = y / s.Z;
    if (u > 0 && u < 1) { s.hop -= 5 * Math.abs(Math.sin(u * Math.PI * 4)); if (x1 < x0) s.face = -1; }
  };

  // Walk a route of legs [[t0, dur, x, y]] (sprite top-left, stage px), starting from HOME. Eased, with a small step-hop;
  // he faces the way he is going. Used to stand next to the subject and to come back before the beat ends.
  window.route = (t, s, legs) => {
    let x = HOME.x, y = HOME.y;
    for (const [t0, dur, tx, ty] of legs) {
      const u = seg(t, t0, t0 + dur), e = ease(u);
      if (u <= 0) break;
      if (u < 1) { s.hop -= 5 * Math.abs(Math.sin(u * Math.PI * 4)); if (tx < x) s.face = -1; x += (tx - x) * e; y += (ty - y) * e; break; }
      x = tx; y = ty;
    }
    s.cx = x / s.Z; s.cy = y / s.Z;
  };
  window.CHAR_HOME = [HOME.x, HOME.y];

  /* ======================== state, clock, render ======================== */
  const CH = window.CHAR = { on: true, react: null, thinkT0: null, sig: '',
    play: { drag: null, hold: null, fx: null, say: null } };   // PLAY LAYER: filled by lib/play.js
  try { CH.on = localStorage.getItem('pm-char') !== '0'; } catch {}
  const FR = {};
  function framesFor(pose, blonde, expr = '', gx = 0, gy = 0, tilt = 0, amp = 1) {
    const key = THEME.name + pose + (blonde ? 'b' : '') + '|' + expr + '|' + gx + gy + '|' + tilt + '|' + amp;
    if (!FR[key]) {
      const hair = blonde ? (THEME.name === 'dark' ? [248, 220, 134] : [232, 196, 92]) : null;   // reel SSJ_HAIR_D / _L
      let urls = [];
      try { urls = KGC.frames({ arms: pose, dark: THEME.name === 'dark', scale: 3, hair, expression: expr, gaze: [gx, gy], tilt, amp, palette: TOKC ? TOKC[THEME.name] : null }); } catch {}   // MS: palette
      FR[key] = urls.map(u => { const im = new Image(); im.src = u; return im; });
    }
    return FR[key];
  }
  // Chapter beats give { act(t, m, D, s, MV) } for lesson choreography. Asks get idle + reactions.
  function state(Z = Z0) { return { sk: FX, Z, cx: HOME.x / Z, cy: HOME.y / Z, pose: 'point', hop: 0, lean: 0, scale: 1, face: 1, turn: 1, rot: 0, blonde: false, hide: false,
    expr: '', gaze: [0, 0], tilt: 0, amp: 1, look: null }; }
  CH.home = () => [HOME.x, HOME.y];
  // ---- PLAY LAYER (lib/play.js): drag position, proximity power-up, spoken word ----------------------------
  CH.now = () => clock;
  CH.bounds = () => { const Z = (typeof BEATS !== 'undefined' && BEATS[P.i] && BEATS[P.i].charZ) || Z0; return { w: SW * Z, h: SH * Z }; };
  CH.clamp = (x, y, pad = 0) => { const b = CH.bounds(); return { x: Math.max(pad, Math.min(1600 - b.w - pad, x)), y: Math.max(pad, Math.min(900 - b.h - pad, y)) }; };
  CH.hit = (x, y) => { const b = CH.box; if (!b) return false; const pad = 12 + Math.abs(CH.rot || 0) * .8; return x >= b[0] - pad && x <= b[0] + b[2] + pad && y >= b[1] - pad && y <= b[1] + b[3] + pad; };
  CH.at = () => CH.box ? [CH.box[0] + CH.box[2] / 2, CH.box[1] + CH.box[3] / 2] : [HOME.x + SW * Z0 / 2, HOME.y + SH * Z0 / 2];
  // Applied after the beat's own choreography, and only when drawing (never for signature/boxNow/prewarm), so a
  // dragged or powered-up frame is still a pure function of wall time and the teaching state is untouched.
  function applyPlay(s) {
    const PL = CH.play;
    if (!PL) return;
    const now = clock;
    let tx = null, ty = null;
    if (PL.drag) { tx = PL.drag.x; ty = PL.drag.y; }
    else if (PL.hold) {
      const h = PL.hold;
      if (h.start && now < h.start) { /* still at the beat's place: the teleport tear is drawing */ }
      else if (h.mode === 'hold') {
        if (now >= h.until) { h.mode = 'back'; h.t0 = now; h.dur = .55; }
        else { tx = h.x; ty = h.y; }
      }
      if (h.mode === 'back') {
        const u = clamp01((now - h.t0) / h.dur);
        const sx = (s.cx + s.lean) * s.Z, sy = (s.cy + s.hop) * s.Z;   // the beat's own place
        tx = h.x + (sx - h.x) * ease(u); ty = h.y + (sy - h.y) * ease(u);
        if (u >= 1) PL.hold = null;
      }
    }
    if (tx != null) {
      // Ragdoll: the held body lags the pointer's velocity, swings on the grab point, and hangs with its arms down.
      // play.js puts vx/vy (stage px/s) on the drag; the offset decays in a few frames when the pointer stops moving.
      let rx = 0, ry = 0, pad = 0;
      if (PL.drag) {
        const d = PL.drag, age = Math.max(0, now - (d.t || now)), damp = Math.exp(-age * 4);
        const vx = (d.vx || 0) * damp, vy = (d.vy || 0) * damp;
        rx = Math.max(-56, Math.min(56, vx * .05)) + Math.sin(now * 7.5) * 5;
        ry = Math.max(-34, Math.min(34, vy * .032)) + 7 + Math.sin(now * 6.2) * 3;
        // The body really tips: a drawn raster rotated about its middle, plus the head tilt and the dangle pose.
        s.rot = Math.max(-42, Math.min(42, vx * .062)) + Math.sin(now * 6.8) * 6;
        s.pose = 'down';                       // limp while he is held
        s.tilt = (s.tilt || 0) + Math.max(-30, Math.min(30, vx * .045));
        s.scale *= 1 + .025 * Math.sin(now * 11);   // squash-and-stretch on the swing
        if (Math.abs(vx) > 60) s.face = vx < 0 ? -1 : 1;
        pad = 62;                              // room for the rotated box, so he still cannot leave the stage
      } else if (PL.hold && PL.hold.vx != null) {
        // Let the tip and the sway settle after release instead of snapping upright.
        const h = PL.hold, age = Math.max(0, now - (h.t0rel || now)), damp = Math.exp(-age * 3.2);
        const vx = (h.vx || 0) * damp, vy = (h.vy || 0) * damp;
        s.rot = Math.max(-26, Math.min(26, vx * .05)) + Math.sin(now * 6) * 3 * damp;
        s.tilt = (s.tilt || 0) + Math.max(-18, Math.min(18, vx * .03));
        rx = Math.sin(now * 6) * 3 * damp;                                  // a short settling wobble
        ry = Math.max(-14, Math.min(14, vy * .022)) + Math.sin(now * 5) * 2 * damp;
      }
      const c = CH.clamp(tx + rx, ty + ry, pad);
      s.cx = c.x / s.Z - s.lean; s.cy = c.y / s.Z - s.hop;
    }
    const fx = PL.fx;
    if (fx) {
      const u = (now - fx.t0) / fx.dur;
      if (u >= 1) PL.fx = null;
      else if (u >= 0) {
        if (fx.kind === 'powerup') MV.powerup(u, s, { size: fx.size || 1, auraK: 1 });
        else if (fx.kind === 'rasengan') MV.rasengan(u, s, { tokens: fx.tokens, tgt: fx.tgt });
        else if (fx.kind === 'teleport') MV.teleport(u, s, { from: fx.from, to: fx.to });
      }
    }
    const say = PL.say;
    if (say) {
      const u = (now - say.t0) / say.dur;
      if (u >= 1) PL.say = null;
      else if (u >= 0) MV.speech(u, s, { text: say.text });
    }
  }
  function compute(teachOnly, bi = P.i, tt = P.t) {
    const b = BEATS[bi], tm = TIMINGS[b.id], t = tt;
    const m = (k, off = 0) => { if (!(k in tm.marks)) throw new Error(`${b.id}: missing mark ${k}`); return tm.marks[k] + off; };
    const s = state(b.charZ || Z0);
    s.pose = b.ask ? 'down' : 'point';
    if (b.act) b.act(t, m, tm.dur, s, MV);
    if (teachOnly) return s;
    if (b.ask && !STILL) {
      if (CH.thinkT0 != null) MV.thought(Math.min(.84, (clock - CH.thinkT0) / 3.2), s);
      const r = CH.react;
      if (r) {
        const u = (clock - r.t0) / r.dur;
        if (u < 1) { if (r.ok) MV.yay(u, s, r.big || 1); else MV.oops(u, s); }
        else CH.react = null;
      }
    }
    if (!STILL && !b.noIdle) MV.idle(((clock % 5.4) / 5.4), s, { rest: !!b.ask });
    applyPlay(s);   // PLAY LAYER: wall-clock drag / power-up / speech, after the beat has placed him
    if (s.look) {   // gaze toward the thing the narration is about, in sprite space (a mirrored sprite flips x)
      const hx = (s.cx + s.lean + 35) * s.Z, hy = (s.cy + s.hop + 24) * s.Z, dx = s.look[0] - hx, dy = s.look[1] - hy;
      s.gaze = [(dx > 90 ? 1 : dx < -90 ? -1 : 0) * Math.sign(s.face || 1), dy > 90 ? 1 : dy < -90 ? -1 : 0];
    }
    return s;
  }
  let lastDraw = -1, lastKey = '', lastGood = null;
  function draw() {
    if (!BEATS || !TIMINGS || !TIMINGS[BEATS[P.i]?.id]) return;
    document.documentElement.classList.toggle('char-on', CH.on);
    if (!CH.on) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, 1600, 900); return; }
    const wall = performance.now();
    if (wall - lastDraw < 1000 / 16) return;       // the reel's 16 Hz pencil redraw
    lastDraw = wall;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, 1600, 900);
    const boilK = STILL ? 0 : Math.floor(clock * BOIL_DRAW) % 3;
    sk.boil(boilK + 1);
    ctx.setTransform(BEATS[P.i].charZ || Z0, 0, 0, BEATS[P.i].charZ || Z0, 0, 0);
    let s;
    try {
      // reduced motion: the same choreography decides pose and place, but effects and body motion are dropped
      FX = STILL ? NULLSK : sk;
      s = compute(false);
      if (STILL) { s.hop = 0; s.lean = 0; s.scale = 1; s.turn = 1; s.face = 1; }
    } catch (e) { console.error(e); return; }
    CH.box = [(s.cx + s.lean) * s.Z, (s.cy + s.hop) * s.Z, SW * s.Z, SH * s.Z];   // stage px, for the spacing gate
    CH.rot = s.rot || 0;                                                          // PLAY LAYER: a wider hit box when tipped
    if (s.hide) return;
    const q4 = Math.round((s.tilt || 0) / 4) * 4;
    let im = framesFor(s.pose, s.blonde, s.expr, s.gaze[0], s.gaze[1], q4, s.amp)[boilK];
    if (!(im && im.complete && im.naturalWidth) && lastGood) im = lastGood;   // a new face is still decoding: hold the last one, never blank
    if (im && im.complete && im.naturalWidth) {
      lastGood = im;
      ctx.save();
      ctx.translate(s.cx + s.lean + SW / 2, s.cy + s.hop + SH / 2);   // centre pivot (same picture when rot is 0)
      if (s.rot) ctx.rotate(s.rot * Math.PI / 180);                   // PLAY LAYER: the ragdoll tip
      ctx.scale((s.face || 1) * (s.turn == null ? 1 : s.turn) * s.scale, s.scale);
      ctx.drawImage(im, -SW / 2, -SH / 2, SW, SH);
      ctx.restore();
    } else lastDraw = -1;                             // not decoded yet: try again next frame
  }
  // A deterministic signature of the teaching state at the current beat time (for the replay test).
  CH.signature = () => { const keep = FX; FX = NULLSK; const s = compute(true); FX = keep; return [BEATS[P.i].id, P.t.toFixed(3), s.pose, s.cx.toFixed(2), s.cy.toFixed(2), s.hop.toFixed(2), s.lean.toFixed(2), s.blonde, s.expr, s.tilt, s.amp].join('|'); };
  // The body's box (stage px) for the teaching state at the current beat time, without drawing (spacing gate).
  CH.boxNow = () => { const keep = FX; FX = NULLSK; const s = compute(true); FX = keep; return CH.on ? [(s.cx + s.lean) * s.Z, (s.cy + s.hop) * s.Z, SW * s.Z, SH * s.Z] : null; };
  CH.draw = draw;
  CH.redraw = () => { lastDraw = -1; draw(); };
  CH.react = null;
  CH.onGrade = ok => { CH.react = { ok, t0: clock, dur: ok ? 1.4 : 1.9 }; lastDraw = -1; };
  CH.onThink = () => { CH.thinkT0 = clock; };
  CH.onStart = () => { CH.react = null; CH.thinkT0 = null; lastDraw = -1; };
  CH.toggle = () => {
    CH.on = !CH.on;
    try { localStorage.setItem('pm-char', CH.on ? '1' : '0'); } catch {}
    $('bChar')?.setAttribute('aria-pressed', String(CH.on));
    lastDraw = -1; draw();
  };
  // Build every face/pose the explainer will use ahead of time (a dry pass over all beats), so no frame waits on a decode.
  function prewarm() {
    if (typeof BEATS === 'undefined' || typeof TIMINGS === 'undefined') { setTimeout(prewarm, 100); return; }   // the page's own scripts are still loading
    const keep = FX; FX = NULLSK;
    try {
      BEATS.forEach((b, i) => { const d = TIMINGS[b.id].dur; for (let t = 0; t <= d + 6; t += .2) {
        const s = compute(true, i, t); framesFor(s.pose, s.blonde, s.expr, s.gaze[0], s.gaze[1], Math.round((s.tilt || 0) / 4) * 4, s.amp); } });
    } catch (e) { console.error(e); }
    FX = keep;
  }
  CH.prewarm = prewarm;
  setTimeout(() => { readColours(); prewarm(); lastDraw = -1; }, 0);
  CH.theme = () => { readColours(); prewarm(); lastDraw = -1; };
  readColours();
  $('bChar')?.setAttribute('aria-pressed', String(CH.on));
  document.documentElement.classList.toggle('char-on', CH.on);
  CH.MV = MV; CH.R = R;
})();
