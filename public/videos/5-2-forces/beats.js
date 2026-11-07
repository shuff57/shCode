// moshion-5.2-forces: the concept explainer for shCode lesson 5.2.13 "Forces vs Velocity" (the seventh shCode
// papermorph explainer; the approved 5.2-gravity explainer is the structural parent, 5.1.2 is the style parent, see
// ../moshion-5.1.2-style/STYLE.md). Seven beats, one play-through, no questions:
//   hello   SH waves. 5.2.10's jump set vel.y directly; there is a second way, and this video says when to use which.
//   vel     the reading's sketch (360x300, gravity 10, 40x40 sprite at 180,60, static ground at y 280). `player.vel.y = -3;`
//           every frame: the sprite rises at a steady speed and the readout holds at exactly -3.
//   force   that line replaced by `player.applyForce(0, -3);`: the sprite still falls, more gently than gravity alone
//           (measured 249 px/s^2 against 300), and vel.y changes every frame.
//   add     the push is added to the motion the sprite already has: gravity down, the push up, the sum; the readout
//           climbs instead of jumping to one number.
//   mass    the same push on a heavy (12) and a light (0.4) sprite: the heavy one falls almost like gravity alone,
//           the light one is held up much more.
//   pick    the rule of thumb as two cards: .vel when the player controls the motion; applyForce for a push on physics.
//   close   one line each, and up next 5.2.14 (wind zone). SH waves.
// Not taught here (and not in the video): mass beyond one beat, applyTorque, rotationDrag, friction/bounciness (5.2.11),
// update() (5.2.21), the Wind Zone lab itself (5.2.14 teaches it).
// Truth measured on the real runner (scripts/moshion-harness.mjs, sketch as above; review/measure/):
//   vel.y = -3 every frame: vel.y stays exactly -3 in every frame; y goes 60 -> 1.75 by frame 21 and is negative at frame
//     22 (the sprite leaves the top edge); y drops 2.917 px each frame (not exactly 3: measured).
//   applyForce(0, -3) every frame: vy 0.083 at frame 1, 1.053 at 15, 2.092 at 30, 3.131 at 45, 4.170 at 60; the fall
//     accelerates at 249 px/s^2 against gravity's measured 300 (ratio 0.831); it lands at frame 74 (centre 249.56 on the
//     ground, top 270, sprite 40 tall). Free fall under the same gravity lands at frame 67.
//   mass 0.4: y 60 -> 101.88 by frame 60; mass 12: y 60 -> 208.81 (free fall 212.5). The heavy sprite falls almost like
//     gravity alone; the light one is held up much more. mass is not taught before 5.2.13 (grep of 5-2-* readings).
//   The reading's "slows the fall instead of stopping it" and "drifts down more gently" are TRUE of these numbers.
// Every colour comes from lib/tokens.js. Helper names are fv* (new); lib globals (frame, label, draw, tick, dot, move,
// rect, X, NEG, ...) are not shadowed.
'use strict';
const CHAPTER = { number: 1, type: 'explainer', title: 'Forces vs Velocity', kicker: 'moSHion · Physics Feel',
  meta: 'About 2 minutes 30 seconds, with sound and captions. One play-through, no questions.', minutes: 3, language: 'en', coverGo: 'Play' };

// ---- layout (stage px, 1600x900; y >= 780 is the caption bar's, the bottom-left corner (x < 232, y > 522) is the character's) ----
// eyes fix 3: the code text is laid out with text-rendering="geometricPrecision" (fvRow), so line 7 is the same width at every
// frame size; the panel is 752 wide (right edge 1022) and the pane starts at 1042, which leaves line 7 >= 18 stage px of margin.
const CODE = { x: 270, y: 150, w: 752, head: 44, size: 22, lh: 31, gut: 316, x0: 330, rows: 13 };
const codeBase = i => CODE.y + CODE.head + 28 + i * CODE.lh;            // baselines 222 ... 594
const CODE_B = codeBase(CODE.rows - 1) + 22;                            // the panel ends at y 616
const PANE = { x: 1042, y: 170, w: 530, h: 480 };                       // the student's canvas, drawn in the runner's #111 page
const CV = { x: 1055, y: 200, k: 1.4, w: 360, h: 300 };                 // the reading's 360 x 300 canvas, 504 x 420 stage px
const cvX = u => CV.x + u * CV.k, cvY = v => CV.y + v * CV.k, CV_W = CV.w * CV.k, CV_H = CV.h * CV.k;
const SPR = 40, HALF = SPR / 2 * CV.k;                                  // new Sprite(180, 60, 40, 40): 56 stage px
const GROUND = { x: 180, y: 280, w: 360, h: 20 };
const REST_Y = 249.55;                                                  // measured: the sprite rests on the ground
const SPR_X = 180;
const RUNB = { x: CODE.x + CODE.w - 124, y: CODE.y + 6, w: 110, h: 32 }; // shCode's Run button, right end of the tab strip
const RUN_C = [RUNB.x + RUNB.w / 2, RUNB.y + RUNB.h / 2];                // (953, 172)
const PTR_FROM = [1034, 262], PTR_AT = [RUN_C[0] - 35, RUN_C[1] + 6];
const READ = { x0: PANE.x, x1: PANE.x + PANE.w, y: 150 };                // vel.y readout over the pane
const GR = { x0: 370, x1: 960, y0: 660, y1: 750, fmax: 75 };             // the vel.y graph, under the editor
const gx = f => GR.x0 + f / GR.fmax * (GR.x1 - GR.x0);
const gv = v => (GR.y0 + GR.y1) / 2 + v * ((GR.y1 - GR.y0) / 10);        // negative (up on screen) above 0, positive (down) below
const ZONE = { x: 300, y: 640 };

// ---- the measured frame tables (review/measure/arrays.mjs; f = 0, 5, 10 ... ) ----
const VEL_Y = [60, 48.42, 33.83, 19.25, 4.67, -9.92, -24.5];                              // frames 0..30
const FORCE_Y = [60, 61.11, 63.95, 68.52, 74.83, 82.86, 92.63, 104.13, 117.36, 132.33, 149.02, 167.45, 187.61, 209.5, 233.12]; // 0..70
const FORCE_Y_TAIL = [233.122, 238.055, 243.056, 248.127, 249.564];                        // frames 70..74 (landing)
const FORCE_VY = [0, 0.36, 0.707, 1.053, 1.399, 1.746, 2.092, 2.439, 2.785, 3.131, 3.478, 3.824, 4.17, 4.517, 4.863]; // 0..70
const FORCE_VY_TAIL = [4.863, 4.9323, 5.0016, 5.0708, 0];                                  // frames 70..74
const LIGHT_Y = [60, 60.63, 61.77, 63.44, 65.63, 68.33, 71.56, 75.31, 79.58, 84.38, 89.69, 95.52, 101.88]; // 0..60
const HEAVY_Y = [60, 61.23, 64.49, 69.78, 77.1, 86.46, 97.84, 111.26, 126.71, 144.19, 163.7, 185.24, 208.81]; // 0..60
const fvAt = (arr, f) => { const i = Math.max(0, f) / 5, k = Math.min(arr.length - 1, Math.floor(i)), u = k >= arr.length - 1 ? 0 : i - k; return u === 0 ? arr[k] : arr[k] + (arr[k + 1] - arr[k]) * u; };
const fvTail = (arr, f) => { const i = Math.max(0, Math.min(4, f - 70)), k = Math.floor(i), u = i - k; return k >= 4 ? arr[4] : arr[k] + (arr[k + 1] - arr[k]) * u; };
const fvForceY = f => (f >= 74 ? REST_Y : f > 70 ? fvTail(FORCE_Y_TAIL, f) : fvAt(FORCE_Y, f));
const fvVy = f => (f >= 74 ? 0 : f > 70 ? fvTail(FORCE_VY_TAIL, f) : fvAt(FORCE_VY, f));
const fvFreeY = f => Math.min(REST_Y, 60 + 0.041667 * f * (f + 1));      // measured free fall: y 70 at f15, 98.75 at f30, 212.5 at f60
const fvFmt = v => (v < 0 ? '−' : '') + Math.abs(v).toFixed(3);

// What the sketch's own lines say, tagged as shCode's editor (lezer javascript + draculaHighlight) tags them.
const tk = kind => (s, id) => [s, kind, id];
const KW = tk('keyword'), PU = tk('punct'), NU = tk('num'), FN = tk('fn'), CL = tk('cls'), SR = tk('str'), OP = tk('op'), ID = tk('ident');
const MAIN = [
  [KW('let'), PU(' '), ID('player'), PU(', '), ID('ground'), PU(';')],
  [KW('function'), PU(' '), FN('setup'), PU('() {')],
  [PU('  '), KW('new'), PU(' '), CL('Canvas'), PU('('), NU('360'), PU(', '), NU('300'), PU(');')],
  [PU('  '), ID('world'), OP('.'), ID('gravity'), OP('.'), ID('y'), PU(' '), OP('='), PU(' '), NU('10'), PU(';')],
  [PU('  '), ID('player'), PU(' '), OP('='), PU(' '), KW('new'), PU(' '), CL('Sprite'), PU('('), NU('180'), PU(', '), NU('60'), PU(', '), NU('40'), PU(', '), NU('40'), PU(');')],
  [PU('  '), ID('player'), OP('.'), ID('color'), PU(' '), OP('='), PU(' '), SR("'deepskyblue'"), PU(';')],
  [PU('  '), ID('ground'), PU(' '), OP('='), PU(' '), KW('new'), PU(' '), CL('Sprite'), PU('('), NU('180'), PU(', '), NU('280'), PU(', '), NU('360'), PU(', '), NU('20'), PU(', ', 'comma'), SR("'static'", 'static'), PU(');')],
  [PU('  '), ID('ground'), OP('.'), ID('color'), PU(' '), OP('='), PU(' '), SR("'gray'"), PU(';')],
  [PU('}')],
  [KW('function'), PU(' '), FN('draw'), PU('() {')],
  [PU('  '), ID('background'), PU('('), SR("'#222'"), PU(');')],
  [PU('  '), ID('player'), OP('.'), ID('vel'), OP('.'), ID('y'), PU(' '), OP('='), PU(' '), NU('-3', 'vel3'), PU(';')],
  [PU('}')],
];
// The reading's second version: the same sketch with the force line instead of the vel line.
const FORCE_LINE = [PU('  '), ID('player'), OP('.'), ID('applyForce'), PU('('), NU('0'), PU(', '), NU('-3'), PU(');')];

// ---- drawing helpers (fv*: adapted from gravity's ms*/gr*) ----
const AP = () => TOKS().app, STG = () => TOKS().stage, SXT = () => TOKS().syntax;
function fvText(p, str, { x, y, size = 26, fill = COL.text, weight = 500, anchor = 'start', font = UI, o = 1, italic = false }) {
  const t = T(p, str, { x, y, size, fill, weight, anchor, font, o });
  if (italic) t.setAttribute('font-style', 'italic');
  return t;
}
function fvRuns(p, runs, { x, y, size = 34, anchor = 'middle', font = UI, o = 1, weight = 500 }) {
  const t = fvText(p, '', { x, y, size, anchor, font, o, weight });
  t.runs = runs.map(([s, f, w, fnt, sz]) => {
    const e = mk('tspan', { fill: f }, t);
    if (w) e.setAttribute('font-weight', w); if (fnt) e.setAttribute('font-family', fnt); if (sz) e.setAttribute('font-size', sz);
    e.textContent = s; return e;
  });
  return t;
}
function fvArrow(p, x1, y1, x2, y2, color, t0, dur = .7, w = 3.5) {
  const g = G(p), a = Math.atan2(y2 - y1, x2 - x1), L = 16;
  draw(path(g, `M${x1} ${y1}L${x2} ${y2}`, { stroke: color, 'stroke-width': w }, { d: 0 }), t0, dur);
  const hd = path(g, `M${x2 - L * Math.cos(a - .5)} ${y2 - L * Math.sin(a - .5)}L${x2} ${y2}L${x2 - L * Math.cos(a + .5)} ${y2 - L * Math.sin(a + .5)}`,
    { stroke: color, 'stroke-width': w }, { o: 0 });
  show(hd, t0 + dur * .8, .15);
  return g;
}
function fvHold(t) { prog(() => {}, t, 0, lin); }
function fvBump(e, t0, k = 1.12) { tw(e, { s: k }, t0, .2, out); tw(e, { s: 1 }, t0 + .2, .35); }
function fvPress(C, p, t0, glide = .5) {
  const A = AP(), cur = G(p, { x: PTR_FROM[0], y: PTR_FROM[1], o: 0 });
  path(cur, 'M0 0L0 31L8 24L13.5 36L19 33.5L13.5 22L24 22Z', { fill: A.cursor, stroke: A.cursorEdge, 'stroke-width': 2.5 });
  show(cur, t0 - glide - .12, .15);
  tw(cur, { x: PTR_AT[0], y: PTR_AT[1] }, t0 - glide - .1, glide, io);
  tw(C.runBg, { c_fill: A.runHover }, t0 - .2, .1);
  tw(cur, { s: .84 }, t0, .07); tw(cur, { s: 1 }, t0 + .07, .18, out);
  tw(C.run, { s: .93 }, t0, .07); tw(C.run, { s: 1 }, t0 + .07, .25, out);
  tw(C.runBg, { c_fill: A.runDown }, t0, .06); tw(C.runBg, { c_fill: A.runHover }, t0 + .22, .2);
  const ring = G(C.g, { x: RUN_C[0], y: RUN_C[1], o: 0 });
  mk('rect', { x: -RUNB.w / 2, y: -RUNB.h / 2, width: RUNB.w, height: RUNB.h, rx: 7, fill: 'none', stroke: A.run, 'stroke-width': 3 }, ring);
  tw(ring, { o: .9 }, t0, .05); tw(ring, { s: 1.2, o: 0 }, t0 + .05, .55, out);
  (S.rings = S.rings || []).push(ring);
  hide(cur, t0 + .75, .3);
  tw(C.runBg, { c_fill: A.run }, t0 + .8, .25);
  (S.cursors = S.cursors || []).push(cur);
  return cur;
}

// ---- the editor (adapted from gravity's gr*) ----
const fvColL = (t, c) => CODE.x0 + t.getStartPositionOfChar(c).x;
const fvColR = (t, c) => CODE.x0 + t.getEndPositionOfChar(c).x;
function fvRow(p, toks, i, spans, o = 1) {
  const SX = SXT(), row = G(p, { y: codeBase(i), o });
  const t = fvText(row, '', { x: CODE.x0, y: 0, size: CODE.size, font: MONO, weight: 400 });
  t.setAttribute('text-rendering', 'geometricPrecision');   // eyes fix 3: no size-dependent hinting on the 11 px mono advances
  for (const [s, kind, id] of toks) {
    const sp = mk('tspan', { fill: SX[kind] }, t);
    if (kind === 'cls') sp.setAttribute('font-style', 'italic');
    sp.textContent = s;
    if (id) spans[id] = sp;
  }
  return { row, t };
}
function fvDoc(p, lines, o = 1) {
  const g = G(p, { o }), rows = [], texts = [], spans = {};
  lines.forEach((toks, i) => { const r = fvRow(g, toks, i, spans); rows.push(r.row); texts.push(r.t); });
  return { g, rows, texts, spans };
}
function fvBar(p, i, n, o = 0, mark) {
  const SX = SXT(), b = G(p, { o, y: codeBase(i) - CODE.lh + 5 });
  b.bg = mk('rect', { x: CODE.x + 2, y: 0, width: CODE.w - 4, height: CODE.lh * n, fill: SX.lineBg }, b);
  b.sp = mk('rect', { x: CODE.x + 2, y: 0, width: 5, height: CODE.lh * n, fill: mark || SX.lineMark }, b);
  return b;
}
function fvBarTo(b, i, n, t0, dur = .4) {
  tw(b, { y: codeBase(i) - CODE.lh + 5 }, t0, dur);
  tw(b.bg, { a_height: CODE.lh * n }, t0, dur); tw(b.sp, { a_height: CODE.lh * n }, t0, dur);
}
function fvUnder(p, row, t, c0, c1, color, t0, w = 3.5) {
  const y = st(row).y + 8, e = path(p, `M${fvColL(t, c0) + 1} ${y}H${fvColR(t, c1 - 1) - 1}`, { stroke: color, 'stroke-width': w }, { d: 0 });
  draw(e, t0, .4);
  return e;
}
function fvType(row, t, t0, dur) {
  const sp = [...t.querySelectorAll('tspan')], full = sp.map(s => s.textContent), total = full.join('').length;
  show(row, t0, .05);
  prog(q => {
    let left = Math.round(q * total);
    sp.forEach((s, k) => { const n = Math.min(full[k].length, Math.max(0, left)); s.textContent = full[k].slice(0, n); left -= full[k].length; });
  }, t0, dur, lin);
}
function fvCode(p, t0) {
  const SX = SXT(), A = AP(), g = G(p, { o: 0 });
  mk('rect', { x: CODE.x, y: CODE.y, width: CODE.w, height: CODE_B - CODE.y, rx: 14, fill: SX.bg, stroke: SX.edge, 'stroke-width': 2 }, g);
  path(g, `M${CODE.x} ${CODE.y + CODE.head}H${CODE.x + CODE.w}`, { stroke: SX.edge, 'stroke-width': 2 });
  fvText(g, 'script.js', { x: CODE.x + 26, y: CODE.y + 29, size: 22, fill: COL.muted, weight: 500 });
  path(g, `M${CODE.x + 14} ${CODE.y + CODE.head - 1}H${CODE.x + 132}`, { stroke: COL.purple, 'stroke-width': 3 });
  const run = G(g, { x: RUN_C[0], y: RUN_C[1] });
  const runBg = mk('rect', { x: -RUNB.w / 2, y: -RUNB.h / 2, width: RUNB.w, height: RUNB.h, rx: 5, fill: A.run }, run);
  path(run, 'M-31 -8L-31 8L-18 0Z', { fill: A.runText, stroke: A.runText, 'stroke-width': 1.5 });
  const runLabel = fvText(run, 'Run', { x: -9, y: 8, size: 22, fill: A.runText, weight: 600 });
  const marks = G(g);
  const bar = fvBar(g, 0, 1);
  const gut = G(g), nums = [];
  for (let i = 0; i < CODE.rows; i++) {
    const n = fvText(gut, String(i + 1), { x: CODE.gut, y: codeBase(i), size: 22, fill: SX.gutter, font: MONO, anchor: 'end', weight: 400, o: i < MAIN.length ? 1 : 0 });
    n.setAttribute('text-rendering', 'geometricPrecision');
    nums.push(n);
  }
  const main = fvDoc(g, MAIN);
  const cm = G(g);
  show(g, t0, .5);
  return { g, run, runBg, runLabel, marks, bar, nums, main, cm, texts: main.texts };
}

// ---- the canvas and the sketch's contents ----
function fvPane(p, t0) {
  const ST = STG(), g = G(p, { o: 0 });
  mk('rect', { x: PANE.x, y: PANE.y, width: PANE.w, height: PANE.h, rx: 14, fill: ST.pane, stroke: ST.paneEdge, 'stroke-width': 2 }, g);
  const clip = mk('clipPath', { id: 'fvCanvasClip' }, g);
  mk('rect', { x: CV.x, y: CV.y, width: CV_W, height: CV_H }, clip);
  const kids = G(g);
  kids.setAttribute('clip-path', 'url(#fvCanvasClip)');
  mk('rect', { x: CV.x, y: CV.y, width: CV_W, height: CV_H, fill: ST.canvas }, kids);   // background('#222')
  mk('rect', { x: CV.x, y: CV.y, width: CV_W, height: CV_H, fill: 'none', stroke: ST.outline, 'stroke-width': 1.5 }, kids);
  const over = G(g);                                                                    // explanations that must not clip
  show(g, t0, .5);
  return { g, kids, over };
}
function fvGround(pv, o = 1) {
  const g = G(pv.kids, { x: cvX(GROUND.x), y: cvY(GROUND.y), o });
  // eyes fix 10: no raw hex in beats.js; the sketch's 'gray' is a neutral mix of two tokens (same value #909094 instead of #808080).
  mk('rect', { x: -GROUND.w * CV.k / 2, y: -GROUND.h * CV.k / 2, width: GROUND.w * CV.k, height: GROUND.h * CV.k, fill: mix(COL.text, COL.board, .5) }, g);
  return g;
}
function fvSprite(pv, x, y, color, o = 1) {
  const e = G(pv.kids, { x: cvX(x), y: cvY(y), o });
  mk('rect', { x: -HALF, y: -HALF, width: 2 * HALF, height: 2 * HALF, fill: color }, e);
  return e;
}
function fvClear(els, t0) { els.forEach(e => e && hide(e, t0, .12)); }

// The readout over the pane: vel.y and its value. An explanation, outside the canvas.
function fvRead(p, t0) {
  const g = G(p, { o: 0 });
  const lab = fvRuns(g, [['vel.y', COL.muted, 500, MONO, 24]], { x: READ.x0, y: READ.y, size: 30, anchor: 'start' });
  const val = fvText(g, '0.000', { x: READ.x1, y: READ.y, size: 36, fill: COL.orange, font: MONO, weight: 600, anchor: 'end' });
  show(g, t0, .4);
  // eyes fix 9: `set(null)` leaves the readout blank until the beat's Run press; only then does a number appear.
  return { g, lab, val, set: v => { val.textContent = v === null ? '' : fvFmt(v); } };
}

// The vel.y graph under the editor: one flat line for set vel, one climbing line for applyForce.
function fvGraph(p, t0) {
  const ST = STG(), g = G(p, { o: 0 }), mid = (GR.y0 + GR.y1) / 2;
  fvText(g, 'vel.y, frame by frame', { x: GR.x0, y: GR.y0 - 12, size: 22, fill: COL.muted, weight: 500 });
  // eyes fix 7: say which way is negative, in words already spoken ("up", "negative"); no new narration.
  fvText(g, 'up is negative', { x: GR.x0 + 250, y: GR.y0 - 12, size: 22, fill: COL.muted, weight: 500 });
  path(g, `M${GR.x0} ${mid}H${GR.x1}`, { stroke: COL.raised, 'stroke-width': 2, 'stroke-dasharray': '6 8' });
  fvText(g, '0', { x: GR.x0 - 12, y: mid + 7, size: 22, fill: COL.muted, font: MONO, anchor: 'end' });
  fvText(g, 'up', { x: GR.x0 - 12, y: gv(-4) + 7, size: 22, fill: COL.muted, anchor: 'end' });
  fvText(g, 'down', { x: GR.x0 - 12, y: gv(4) + 7, size: 22, fill: COL.muted, anchor: 'end' });
  fvText(g, 'frame 1', { x: GR.x0, y: GR.y1 + 22, size: 22, fill: COL.muted });
  // eyes fix 7: the label sat at frame 75's x (GR.x1) while the flat line ended at frame 60; put it on the line's end.
  fvText(g, 'frame 60', { x: gx(60), y: GR.y1 + 22, size: 22, fill: COL.muted, anchor: 'end' });
  const flat = path(g, `M${gx(0)} ${gv(-3)}H${gx(60)}`, { stroke: COL.orange, 'stroke-width': 3.5 }, { d: 0 });
  const flatLab = fvText(g, '−3', { x: gx(60) + 10, y: gv(-3) + 7, size: 22, fill: COL.orange, font: MONO, weight: 600, o: 0 });
  const curve = path(g, 'M0 0', { stroke: COL.orange, 'stroke-width': 3.5 }, { o: 0 });
  // eyes fix 7: the numbers on the two lines: -3 (the set-vel line) and the applyForce line's top value, kept off the curve.
  const curveLab = fvText(g, '+4.2', { x: gx(60) + 10, y: gv(4.17) - 5, size: 22, fill: COL.orange, font: MONO, weight: 600, o: 0 });
  const dotA = G(g, { o: 0 }), dotB = G(g, { o: 0 });
  mk('circle', { r: 6, fill: COL.orange, stroke: COL.board, 'stroke-width': 2 }, dotA);
  mk('circle', { r: 6, fill: COL.orange, stroke: COL.board, 'stroke-width': 2 }, dotB);
  show(g, t0, .4);
  return { g, flat, flatLab, curve, curveLab, dotA, dotB,
    flatAt(f) { put(dotA, { x: gx(f), y: gv(-3) }); },
    // final fix 4: the applyForce line stops at the "frame 60" tick, like the set-vel line, instead of running on to x 960
    // past the labelled axis; its "+4.2" is then the value at the line's own end (frame 60, measured 4.170), and the dot
    // marks that end for the rest of the beat instead of dropping to 0 off the curve.
    curveAt(f) {
      const n = Math.min(60, f);
      let d = `M${gx(0)} ${gv(0)}`;
      for (let k = 0; k <= n; k += 1) d += `L${gx(k).toFixed(1)} ${gv(fvAt(FORCE_VY, k)).toFixed(1)}`;
      curve.setAttribute('d', d);
      put(dotB, { x: gx(n), y: gv(fvAt(FORCE_VY, n)) });
    } };
}
function fvLegend(p, t0) {
  const g = G(p, { o: 0 });
  const row = (y, color, label, dash) => {
    const e = G(g);
    path(e, `M${PANE.x} ${y}H${PANE.x + 44}`, { stroke: color, 'stroke-width': 3.5, ...(dash ? { 'stroke-dasharray': '7 7' } : {}) });
    const t = fvText(e, label, { x: PANE.x + 58, y: y + 7, size: 22, fill: COL.muted });
    return { e, t };
  };
  const a = row(700, COL.muted, 'set vel', true), b = row(736, COL.orange, 'applyForce', false);
  show(g, t0 - .1, .3); show(a.e, t0, .35); show(b.e, t0 + .2, .35);
  return { g, a: a.e, b: b.e, ta: a.t, tb: b.t };
}
// A mode tag under the pane ("slow motion"); eyes fix 9: also raised in the other beats that run slowed, at a clear y.
function fvMode(p, text, t0, t1, y = 690) {
  const e = fvText(p, text, { x: PANE.x, y, size: 22, fill: COL.muted, weight: 500, o: 0 });
  show(e, t0, .3); if (t1 != null) hide(e, t1, .3);
  return e;
}

const BEATS = [
  ['hello', 'Two ways to move', (m, D) => {
    const p = panel(0);
    S.title = G(p);
    show(fvText(S.title, 'moSHion · Physics Feel', { x: 70, y: 74, size: 22, fill: COL.purple, weight: 600, o: 0 }), m('hi', -.1), .4);
    const tt = fvText(S.title, 'Forces vs Velocity', { x: 70, y: 124, size: 46, fill: COL.text, weight: 600, o: 0 });
    tw(tt, { o: 1, y: 124 }, m('hi', .05), .5, out); put(tt, { y: 136 });
    S.code = fvCode(p, m('jump', .0));
    tw(S.code.g, { y: 0 }, m('jump', .0), .55, out); put(S.code.g, { y: 14 });
    S.pv = fvPane(p, m('jump', .3));
    S.ground = fvGround(S.pv, 0); show(S.ground, m('jump', .5), .35);
    S.ball = fvSprite(S.pv, SPR_X, 60, STG().blue, 0); show(S.ball, m('jump', .6), .3);
    S.read = fvRead(p, m('second', -.2));
    show(S.code.bar, m('second', -.05), .3); fvBarTo(S.code.bar, 11, 1, m('second', -.05), .3);
    S.one = G(p);
    show(fvRuns(S.one, [['set the velocity', COL.muted]], { x: PANE.x, y: 735, size: 24, anchor: 'start', o: 0 }), m('second', .2), .35);
    S.under = fvUnder(p, S.code.main.rows[11], S.code.main.texts[11], 9, 14, COL.orange, m('way', .1));
    fvBump(S.ball, m('this', -.1), 1.1);
    // final fix 5: the line-12 highlight, the "set the velocity" label and the unexplained 0.000 readout belong to "That is
    // one way to move a sprite" ([[second]]); they fade with its last word ([[way]]) instead of sitting under "This video
    // shows when to use which". 'vel' brings the bar and the readout back at its own start (the editor's line marker and the
    // live vel.y readout are its subject).
    hide(S.one, m('way', .15), .35);
    hide(S.code.bar, m('way', .15), .35);
    hide(S.read.g, m('way', .15), .35);
  }],

  ['vel', 'Set the speed', (m, D) => {
    const C = S.code, p = S.panel, H = D + .1;
    S.read.set(null);                                     // eyes fix 9: no -3.000 before Run
    // final fix 5: hello now fades the line-12 highlight and the readout at [[way]]; they are back from this beat's start,
    // because here they are the subject (the highlighted line and the live vel.y). No other change to this beat.
    show(S.code.bar, m('def', -.4), .3);
    show(S.read.g, m('def', -.4), .3);
    S.graph = fvGraph(p, m('def', .0));
    S.mode = fvMode(p, 'slow motion', m('run', -.1), H - .5);
    fvPress(C, p, m('run'), .45);
    // eyes fix 2: the motion starts on the Run press (the pane is never empty while "Run it..." is spoken) and the sprite
    // leaves the top edge on "straight off the top" instead of already having gone. 22 frames across the words, 8 more out.
    const f0 = m('run') + .12, tA = m('steady') + .05, t1 = m('steady') + 2.6, rise = 30;
    S.rise = fvSprite(S.pv, SPR_X, 60, STG().blue, 0); show(S.rise, f0 - .06, .2);
    hide(S.ball, m('run', -.05), .2);
    const riseTo = f => {
      put(S.rise, { y: cvY(fvAt(VEL_Y, Math.min(30, f))) });
      S.read.set(-3);
      S.graph.flatAt(Math.min(60, f * 2));
    };
    prog(q => riseTo(q * 22), f0, tA - f0, lin);
    prog(q => riseTo(22 + q * (rise - 22)), tA, Math.max(.4, t1 - tA), lin);
    S.graph.flatAt(0);
    draw(S.graph.flat, m('run', .1), 1.4);
    show(S.graph.flatLab, m('flat', .1), .35);
    S.flatBump = m('flat');
    fvBump(S.read.val, m('flat', .1), 1.12);
    S.off = G(p);
    // eyes fix 12: the tag used to sit on the pane's top border (its ascenders at stage y ~170). It now sits in the empty canvas
    // below the exit, with the chevron pointing at the top edge.
    const off = fvText(S.off, 'off the top', { x: cvX(180), y: CV.y + 62, size: 22, fill: COL.muted, anchor: 'middle', o: 0 });
    show(off, m('steady', .1), .35);
    fvArrowUp(S.off, cvX(180), CV.y + 12, m('steady', .1));
    hide(S.off, H - .3, .3);
    fvHold(H);
  }, { keep: true }],

  ['force', 'Add a push', (m, D) => {
    const C = S.code, p = S.panel, SX = SXT(), ST = STG(), H = D + .1;
    S.read.set(null);                                     // eyes fix 9: no carried-over 0.083 before Run
    // replace the line: purple flash, the vel row out, the force row in at the same baseline
    const flash = mk('rect', { x: CODE.x0 - 5, y: codeBase(11) - 24, width: 400, height: 30, rx: 6, fill: COL.purple }, null);
    C.g.insertBefore(flash, C.g.firstChild); put(flash, { o: 0 });
    tw(flash, { o: .45 }, m('swap', .0), .2); tw(flash, { o: 0 }, m('swap', .45), .45);
    const fr = fvRow(C.g, FORCE_LINE, 11, C.main.spans, 0);
    S.fr = fr;
    tw(C.main.rows[11], { o: 0 }, m('swap', .05), .25);
    show(fr.row, m('swap', .25), .25);
    S.under2 = fvUnder(p, fr.row, fr.t, 9, 19, COL.purple, m('swap', .5));
    // the flat line becomes the ghost; the force line takes over
    tw(S.graph.flat, { c_stroke: COL.muted }, m('swap', .1), .4);
    // eyes fix 7: pathLength:1 (from the draw animation) scales a 7 7 dash to the whole path, so the "dashed" set-vel line
    // rendered solid while the legend key was dashed. Drop pathLength and the dash animation offset so the dash is real.
    S.graph.flat.removeAttribute('pathLength');
    S.graph.flat.setAttribute('stroke-dashoffset', 0);
    S.graph.flat.setAttribute('stroke-dasharray', '7 7');
    S.graph.legend = fvLegend(p, m('swap', .4));
    // eyes fix 7: the -3 label stays with its line through the swap (it used to be faded out here).
    show(S.graph.flatLab, m('swap', .0), .3);
    show(S.graph.curve, m('run', -.1), .3); tw(S.graph.curve, { o: 1 }, m('run', -.1), .3);

    tw(S.graph.dotA, { o: 1 }, m('run', .1), .2); tw(S.graph.dotB, { o: 1 }, m('run', .1), .2);
    S.mode2 = fvMode(p, 'slow motion', m('run', -.1), H - .5, 674);   // eyes fix 9 (above the legend rows at 700/736)
    fvPress(C, p, m('run'), .45);
    // eyes fix 2: the sketch's sprite is on the canvas from the start of the beat (the pane used to be empty for 6 s);
    // Run then starts the motion from y 60.
    S.fall = fvSprite(S.pv, SPR_X, 60, STG().blue, 0); show(S.fall, .1, .3);
    fvClear([S.rise], m('run', .1));
    // eyes fix 4: frames 0 -> 45 now run to the end of the "changes every frame" sentence instead of freezing at 15.4 s.
    const f0 = m('run') + .25, f1 = m('read') + 3.5;
    prog(q => {
      const f = q * 45, y = fvAt(FORCE_Y, f);
      put(S.fall, { y: cvY(y) });
      S.read.set(fvVy(f));
      S.graph.curveAt(f);
      S.graph.flatAt(Math.min(60, f));
    }, f0, f1 - f0, lin);
    // "more gently than gravity alone": the measured free-fall line, ending short of the sprite (eyes fix 12) and labelled
    // on the empty canvas at its left end instead of on top of the sprite.
    S.ghost = G(p, { o: 0 });
    S.ghostLine = path(S.ghost, `M${CV.x} ${cvY(fvFreeY(0))}H${cvX(SPR_X) - HALF - 12}`, { stroke: COL.muted, 'stroke-width': 2.5, 'stroke-dasharray': '7 7' }, { d: 1 });
    S.ghostLab = fvText(S.ghost, 'gravity alone', { x: CV.x + 10, y: cvY(fvFreeY(0)) - 10, size: 22, fill: COL.muted, anchor: 'start', o: 0 });
    show(S.ghost, m('gently', -.05), .3); show(S.ghostLab, m('gently', .1), .3);
    prog(q => { const f = q * 45; S.ghostLine.setAttribute('d', `M${CV.x} ${cvY(fvFreeY(f))}H${cvX(SPR_X) - HALF - 12}`); put(S.ghostLab, { y: cvY(fvFreeY(f)) - 10 }); }, f0, f1 - f0, lin);
    fvBump(S.read.val, m('read', .1), 1.1);
    fvHold(H);
  }, { keep: true }],

  ['add', 'A push adds up', (m, D) => {
    const p = S.panel, H = D + .1;
    // the sprite keeps falling from frame 45 (where 'force' stopped)
    const f0 = 45, f1 = 75, t0 = .15, t1 = 11.5;
    S.arrows = G(p, { o: 0 });
    const arrG = G(S.arrows, { o: 0 }), arrP = G(S.arrows, { o: 0 }), arrT = G(S.arrows, { o: 0 });
    // eyes fix 6: arrowheads are proportional (a 9 px arrow used to get a 12 px head, i.e. its tip was inside its own base).
    const mkArr = (g, len, color, up, halo) => {
      const A = Math.abs(len), L = A * (up ? -1 : 1), hl = Math.min(13, A * .5), hw = Math.min(7, A * .34);
      const d = `M0 0L0 ${L}`, pts = `-${hw},${(A - hl) * (up ? -1 : 1)} ${hw},${(A - hl) * (up ? -1 : 1)} 0,${L}`;
      if (halo) draw(path(g, d, { stroke: COL.board, 'stroke-width': 7 }, { d: 0 }), 0, .45);
      draw(path(g, d, { stroke: color, 'stroke-width': halo ? 3.5 : 4 }, { d: 0 }), 0, .45);
      mk('polygon', { points: pts, fill: color, ...(halo ? { stroke: COL.board, 'stroke-width': 1.5 } : {}) }, g);
    };
    // eyes fix 6: labels now sit on a panel-coloured plate (COL.panel, same fill as the editor), never on the sprite or the
    // grey ground: text-on-plate contrast is orange 8.9:1, purple 6.3:1, text 15:1 (>= 4.5 required).
    const chip = (g, text, color, x, y, anchor) => {
      const w = textW(text, 22), pad = 10, hw = w / 2;
      const left = anchor === 'middle' ? x - hw : anchor === 'end' ? x - w : x;
      const plate = mk('rect', { x: left - pad, y: y - 21, width: w + 2 * pad, height: 29, rx: 7, fill: COL.panel, stroke: COL.raised, 'stroke-width': 2 }, g);
      const t = fvText(g, text, { x, y, size: 22, fill: color, anchor, weight: 500, o: 0 });
      t.plate = plate;
      return t;
    };
    // final fix 3: every arrow sits BESIDE the sprite, never inside it, and the two downward ones stop above the ground.
    // add arrows polish: the lengths are now PROPORTIONAL to the real picture instead of the 54/34/36 schematic. The measured
    // falls are 300 px/s^2 under gravity, 50 px/s^2 of push in effect (249 = 83% of 300), so gravity is 144 stage px, the push
    // 24 px (17% of gravity, the readability floor) and the total 120 px (83%, exactly gravity - push). All three share one
    // band: gravity runs from the sprite centre -122.4 to +21.6, the total from the same tail to -2.4 (24 px shorter on both
    // counts), and the purple push points up from +21.6 to -2.4, i.e. it is exactly the piece gravity has beyond the total.
    // At rest (centre stage 549.4) the lowest tip is 571, 7 px clear of the ground top at 578. Chips: "gravity" one row above
    // the arrows, "your push" alone on the left above its own tip, "total" 17 stage px below "gravity" and 8 px right of its
    // arrow; none of them covers an arrowhead. See review/BUILD.md "add arrows polish".
    const LG = 144, LP = 24, LT = LG - LP;                             // 120: the total is 83% of gravity
    const PUSH_AX = cvX(SPR_X) - 48;                                   // the purple arrow's shaft x (stage 1259)
    const GHOST_END = PUSH_AX - 20;                                    // the ghost line stops 13 px left of the push arrowhead
    mkArr(arrG, LG, COL.orange, false, false);
    mkArr(arrP, LP, COL.purple, true, false);
    mkArr(arrT, LT, COL.text, false, false);
    S.labG = chip(arrG, 'gravity', COL.orange, 8, -16, 'start');       // baseline: arrow top - 16 (sprite centre - 138)
    S.labP = chip(arrP, 'your push', COL.purple, -10, -74, 'end');     // baseline: push tail - 74 (sprite centre - 52)
    S.labT = chip(arrT, 'total', COL.text, 25, 30, 'start');           // 8 px right of its arrow, 17 px under "gravity"
    S.arrs = { g: arrG, p: arrP, t: arrT };                            // measured by tools/e2e_style.py: tips above the ground
    const place = (f, yy) => {
      const c = cvY(yy), top = c + 21.6 - LG;                          // tip 21.6 below the centre, 7 px above the ground
      put(arrG, { x: cvX(SPR_X) + 44, y: top });                       // top of a 144 px down arrow
      put(arrP, { x: PUSH_AX, y: c + 21.6 });                          // tail of a 24 px up arrow
      put(arrT, { x: cvX(SPR_X) + 86, y: top });                       // top of a 120 px down arrow (same tail as gravity)
    };
    show(S.arrows, m('grav', -.05), .02);
    show(arrG, m('grav', -.05), .02); show(S.labG, m('grav', .15), .25);
    show(arrP, m('push', -.05), .02); show(S.labP, m('push', .15), .25);
    show(arrT, m('sum', -.05), .02); show(S.labT, m('sum', .15), .25);
    // the free-fall ghost continues too
    prog(q => {
      const f = f0 + q * (f1 - f0), y = fvForceY(f);
      put(S.fall, { y: cvY(y) });
      S.read.set(fvVy(f));
      S.graph.curveAt(f);
      S.graph.flatAt(Math.min(60, f));
      place(f, y);
      S.ghostLine.setAttribute('d', `M${CV.x} ${cvY(fvFreeY(f))}H${GHOST_END}`);
      put(S.ghostLab, { y: cvY(fvFreeY(f)) - 10 });
    }, t0, t1 - t0, lin);
    // eyes fix 1: the arrows used to be hidden at 11.6, the same instant as the [[sum]] mark, so the "total is a little less
    // than gravity alone" sentence (11.1 -> 15.7) played over an empty picture. They now stay frozen at the landing spot
    // until the next beat's [[once]] mark.
    hide(S.arrows, m('once', -.12), .3);
    hide(S.ghost, m('once', -.12), .3);
    // eyes fix 7: the applyForce line's top value, once the graph is the subject.
    show(S.graph.curveLab, m('once', .2), .35);
    // "With set vel, the number jumps at once. With a force, it changes a little each frame."
    prog(q => { if (q > 0) S.graph.legend.ta.textContent = 'set vel · one number, at once'; }, m('once', -.05), 0, lin);
    prog(q => { if (q > 0) S.graph.legend.tb.textContent = 'applyForce · a little each frame'; }, m('once', .45), 0, lin);
    fvHold(H);
  }, { keep: true }],

  ['mass', 'More mass, less change', (m, D) => {
    const p = S.panel, H = D + .1;
    hide(S.read.g, m('mass', -.2), .3);
    hide(S.graph.g, m('mass', -.2), .3);
    hide(S.graph.legend.g, m('mass', -.2), .3);
    hide(S.ghost, m('same', -.3), .2);
    // final fix 2: the sprite that landed in 'add' is still resting on the ground while "Mass is how heavy the sprite is" is
    // spoken, so it wears the "mass 12" tag from the beat's start: the word "mass" now has a picture. It is also the heavy
    // sprite of the comparison, so the tag simply stays with it.
    const tagY = u => cvY(u) - HALF - 14;
    S.tags = G(p);
    const tag = (text, t0) => {
      const g = G(S.tags, { o: 0 });
      mk('rect', { x: -60, y: -22, width: 120, height: 30, rx: 8, fill: COL.panel, stroke: COL.raised, 'stroke-width': 2 }, g);
      fvText(g, text, { x: 0, y: 1, size: 22, fill: COL.text, font: MONO, anchor: 'middle' });
      show(g, t0, .3);
      return g;
    };
    S.heavy = S.fall;
    S.tagH = tag('mass 12', m('mass', .15));
    put(S.tagH, { x: cvX(SPR_X), y: tagY(REST_Y) });
    // final fix 1: BOTH sprites and BOTH tags are on screen, at rest, from [[same]] ("Here is the same push on a heavy sprite
    // and a light one"), in two lanes side by side at the setup's y 60, with the applyForce line still on screen; the light
    // sprite used to arrive mid-motion on [[light]] (12.9 s), after the sentence that names it. The two falls now start
    // TOGETHER on [[heavy]] and run through the [[heavy]] and [[light]] sentences; the end state is the measured frame 60
    // (208.81 / 101.88) and the bars are untouched.
    S.light = fvSprite(S.pv, 120, 60, STG().blue, 0);
    show(S.light, m('same', .0), .3);
    S.tagL = tag('mass 0.4', m('same', .05));
    put(S.tagL, { x: cvX(120), y: tagY(60) });
    // the heavy one goes back up to the top and into its lane instead of teleporting: the reset is part of the picture.
    const tSet = m('same', -.05), dSet = .55;
    prog(q => {
      const ux = SPR_X + (240 - SPR_X) * q, uy = REST_Y + (60 - REST_Y) * q;
      put(S.heavy, { x: cvX(ux), y: cvY(uy) });
      put(S.tagH, { x: cvX(ux), y: tagY(uy) });
    }, tSet, dSet, out);
    fvBump(S.heavy, m('heavy', -.05), 1.08); fvBump(S.light, m('light', -.05), 1.08);
    S.mode = fvMode(p, 'slow motion', m('same', -.1), H - .5);   // eyes fix 9: mass runs slowed too
    const t0 = m('heavy') - .02, t1 = m('why') - .55;
    prog(q => {
      const f = q * 60;
      put(S.heavy, { y: cvY(fvAt(HEAVY_Y, f)) });
      put(S.light, { y: cvY(fvAt(LIGHT_Y, f)) });
      put(S.tagH, { y: tagY(fvAt(HEAVY_Y, f)) });
      put(S.tagL, { y: tagY(fvAt(LIGHT_Y, f)) });
    }, t0, t1 - t0, lin);
    // the measured one-second fall, as two bars under the editor
    S.bars = G(p, { o: 0 });
    fvText(S.bars, 'distance fallen in one second', { x: ZONE.x, y: GR.y0 - 4, size: 22, fill: COL.muted });
    const bar = (y, label, v, color, t) => {
      const w = v / 150 * 400, row = G(S.bars, { o: 0 });
      fvText(row, label, { x: ZONE.x, y: y + 7, size: 22, fill: COL.text });
      const r = mk('rect', { x: ZONE.x + 190, y: y - 12, width: 1, height: 26, rx: 5, fill: color }, row);
      tw(r, { a_width: w }, t, .7, out);
      fvText(row, `${v} px`, { x: ZONE.x + 200 + w, y: y + 7, size: 22, fill: COL.muted, font: MONO });
      show(row, t - .1, .3);
      return row;
    };
    bar(GR.y0 + 30, 'heavy', 149, COL.orange, m('heavy', .2));
    bar(GR.y0 + 76, 'light', 42, COL.purple, m('light', .2));
    show(S.bars, m('heavy', .2), .3);
    fvHold(H);
  }, { keep: true }],

  ['pick', 'Which one?', (m, D) => {
    const p = panel(0), SX = SXT(), H = D + .1;
    show(fvText(p, 'the rule of thumb', { x: 70, y: 74, size: 22, fill: COL.purple, weight: 600, o: 0 }), m('rule', -.1), .4);
    const tt = fvText(p, 'Which one?', { x: 70, y: 124, size: 46, fill: COL.text, weight: 600, o: 0 });
    tw(tt, { o: 1, y: 124 }, m('rule', .05), .5, out); put(tt, { y: 136 });
    const card = (x, title, color, sub, eg, t0, t1) => {
      const g = G(p, { o: 0, x, y: 230 });
      mk('rect', { x: 0, y: 0, width: 520, height: 350, rx: 18, fill: COL.panel, stroke: COL.raised, 'stroke-width': 2.5 }, g);
      fvText(g, title, { x: 36, y: 82, size: 40, fill: color, font: MONO, weight: 700 });
      fvText(g, sub, { x: 36, y: 140, size: 28, fill: COL.text, weight: 500 });
      eg.forEach((e, i) => {
        const yy = 208 + i * 52;
        mk('circle', { cx: 44, cy: yy - 8, r: 5, fill: color }, g);
        fvText(g, e, { x: 62, y: yy, size: 28, fill: COL.muted, weight: 500 });
      });
      tw(g, { o: 1, y: 230 }, t0, .5, out); put(g, { y: 244 });
      if (t1 != null) hide(g, t1, .3);
      return g;
    };
    S.cardA = card(250, '.vel', COL.orange, 'you set the speed', ['walking', 'jumping'], m('direct', -.1));
    S.cardB = card(810, 'applyForce', COL.purple, 'a push on top', ['wind', 'thrust'], m('layer', -.1));
    S.short = G(p);
    show(fvRuns(S.short, [['One ', COL.muted], ['sets', COL.text, 600], [' the speed. The other ', COL.muted], ['adds', COL.text, 600], [' to it.', COL.muted]], { x: 800, y: 690, size: 30, anchor: 'middle', o: 0 }), m('short', -.05), .4);
    fvHold(H);
  }],

  ['close', 'Up next', (m, D) => {
    const p = panel(0), SX = SXT(), ST = STG();
    const row = (runs, y, t0, size = 40, weight = 600) => { const t = fvRuns(p, runs, { x: 800, y, size, weight, o: 0 }); tw(t, { o: 1, y }, t0, .45, out); put(t, { y: y + 10 }); return t; };
    row([['Two ways to move a sprite', COL.text, 600]], 190, m('both', -.05), 46);
    row([['player.vel.y = -3', COL.orange, 600, MONO]], 310, m('both', .35), 36);
    row([['sets the speed', COL.muted, 500]], 356, m('both', .55), 26);
    row([['player.applyForce(0, -3)', COL.purple, 600, MONO]], 440, m('both', .95), 36);
    row([['adds a push', COL.muted, 500]], 486, m('both', 1.15), 26);
    show(fvText(p, 'UP NEXT', { x: 800, y: 590, size: 22, fill: COL.purple, weight: 600, anchor: 'middle', o: 0 }), m('next', -.05), .35);
    row([['The reading: Forces vs Velocity', COL.text]], 650, m('next', .15), 50);
    row([['then a push that changes every frame', COL.muted, 500]], 704, m('next', 1.1), 28);
    fvHold(Math.max(D, m('bye', 1.8)) + .1);
  }],
].map(([id, title, run, extra]) => ({ id, title, run, ...extra }));

// a small up chevron for "off the top"
function fvArrowUp(p, x, y, t0) {
  const g = G(p);
  draw(path(g, `M${x} ${y + 16}V${y}`, { stroke: COL.muted, 'stroke-width': 3 }, { d: 0 }), t0, .4);
  const hd = path(g, `M${x - 8} ${y + 8}L${x} ${y}L${x + 8} ${y + 8}`, { stroke: COL.muted, 'stroke-width': 3 }, { o: 0 });
  show(hd, t0 + .3, .2);
}

// ---- SH: bottom-left, never the subject. Every expression change lands on a narration mark. ----
const CODEC = [646, 380], PANEC = [1307, 410], READC = [1400, 150], GRAPHC = [640, 700], MASSC = [1307, 420], CARDC = [800, 400];
bindActs({
  hello: { act: (t, m, D, s, MV) => {
    s.pose = 'down';
    emo(t, s, [[0, { expr: 'delighted', amp: 1.15, look: PANEC }],
      [m('jump', -.1), { expr: 'curious', tilt: 6, amp: 1, look: CODEC }],
      [m('second', -.1), { expr: 'determined', tilt: 0, look: CODEC, pose: 'pointUp' }],
      [m('way', -.1), { expr: 'curious', tilt: -5, look: CODEC }],
      [m('this', -.1), { expr: 'delighted', amp: 1.1, look: PANEC, pose: 'down' }]]);
    MV.wave(t, s, m('hi', -.15), 1.9);
  } },
  vel: { act: (t, m, D, s) => {
    s.pose = 'point';
    emo(t, s, [[0, { expr: 'determined', look: CODEC }],
      [m('line', -.1), { expr: 'curious', tilt: 5, look: CODEC }],
      [m('run', -.1), { expr: 'determined', tilt: 0, look: RUN_C, pose: 'pointUp' }],
      [m('run', .2), { expr: 'surprise', amp: 1, look: PANEC, pose: 'down' }],
      [m('flat', -.1), { expr: 'curious', tilt: 0, look: READC }],
      [m('steady', -.1), { expr: 'delighted', amp: 1.1, look: PANEC }]]);
    kick.lean(t, s, m('run', .2), .5, .5);
  } },
  force: { act: (t, m, D, s) => {
    s.pose = 'pointUp';
    emo(t, s, [[0, { expr: 'determined', look: CODEC }],
      [m('swap', .2), { expr: 'curious', tilt: 5, look: CODEC }],
      [m('run', -.1), { expr: 'determined', tilt: 0, look: RUN_C }],
      [m('run', .2), { expr: 'surprise', amp: 1, look: PANEC, pose: 'down' }],
      [m('still', -.1), { expr: 'curious', tilt: -4, look: PANEC }],
      [m('gently', -.1), { expr: 'determined', tilt: 0, look: PANEC, pose: 'point' }],
      [m('read', -.1), { expr: 'surprise', amp: 1, look: READC }]]);
    kick.lean(t, s, m('run', .2), .5, .5);
  } },
  add: { act: (t, m, D, s) => {
    s.pose = 'point';
    emo(t, s, [[0, { expr: 'determined', look: PANEC }],
      [m('grav', -.1), { expr: 'curious', tilt: 5, look: PANEC }],
      [m('push', -.1), { expr: 'determined', tilt: 0, look: PANEC, pose: 'pointUp' }],
      [m('sum', -.1), { expr: 'surprise', amp: 1, look: PANEC, pose: 'point' }],
      [m('once', -.1), { expr: 'curious', tilt: -5, look: GRAPHC }]]);
  } },
  mass: { act: (t, m, D, s) => {
    s.pose = 'point';
    emo(t, s, [[0, { expr: 'determined', look: PANEC }],
      [m('same', -.1), { expr: 'curious', tilt: 5, look: PANEC }],
      [m('heavy', -.1), { expr: 'determined', tilt: 0, look: PANEC }],
      [m('light', -.1), { expr: 'surprise', amp: 1, look: MASSC, pose: 'point' }],
      [m('why', -.1), { expr: 'proud', amp: 1.05, look: GRAPHC }]]);
  } },
  pick: { act: (t, m, D, s) => {
    s.pose = 'down';
    emo(t, s, [[0, { expr: 'curious', tilt: 5, look: CARDC }],
      [m('rule', -.1), { expr: 'determined', tilt: 0, look: CARDC, pose: 'pointUp' }],
      [m('direct', -.1), { expr: 'determined', look: [510, 420] }],
      [m('layer', -.1), { expr: 'curious', tilt: -5, look: [1070, 420] }],
      [m('short', -.1), { expr: 'proud', amp: 1.05, look: [800, 690], pose: 'point' }]]);
  } },
  close: { act: (t, m, D, s, MV) => {
    s.pose = 'down';
    emo(t, s, [[0, { expr: 'proud', amp: 1.05, look: [800, 190] }],
      [m('next', -.1), { expr: 'delighted', amp: 1.1, look: [800, 640], pose: 'point' }],
      [m('bye', -.15), { pose: 'down' }],
      [m('bye', -.1), { expr: 'delighted', amp: 1.15, look: [800, 420] }]]);
    MV.wave(t, s, m('bye', -.15), 1.9);
  } },
});
boot();
