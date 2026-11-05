// moshion-5.2-gravity: the concept explainer for shCode lesson 5.2.6 "Reading: Gravity" (the third shCode
// papermorph explainer; the approved 5.1.2 explainer is the style template and 5.1.12 is the layout parent,
// see ../moshion-5.1.2-style/STYLE.md and ../moshion-5.1.12/STYLE.md). Seven beats, one play-through, no questions:
//   hello   cold open: SH waves; the 5.1 sketch (ball at y 80, static ground) and its first run: nothing falls, because
//           every world starts at gravity zero. y stays 80.
//   zero    world.gravity.y is ONE setting for the whole world; it starts at 0, and 0 means no pull. Run: the ball hangs.
//   fall    the 0 is edited to 10 (about Earth's pull); Run: the ball falls (shown in slow motion), y 80 -> 107 -> 218 -> 350,
//           and it stops on the ground.
//   down    y = 0 is the TOP edge and y grows downward (a math graph is the other way round), so positive gravity pulls
//           toward bigger y. A small canvas diagram plus a math-graph contrast, under the editor.
//   dials   gravity belongs to the world, not one sprite: a second sprite is typed in, and at -5 BOTH drift upward.
//   static  a sprite without 'static' is dynamic, so gravity moves it. Remove 'static' and the ground falls too; put it
//           back and the ground holds while the ball lands.
//   close   end card: one number for the whole world; 0 floats, 10 falls, negative pulls up; up next 5.2.8 (tune gravity).
// Not taught here (5.2.8-5.2.14 teach them): bounciness/friction, applyForce, colliding(), kb.presses.
// Truth measured on the real runner (public/moshion/runner.html): gravity 10 is 300 px/s^2 here (Box2D 10 m/s^2 at
// 30 px per metre); the ball starts at y 80 and rests at y 349.6 (ground top 370, ball 40 tall); gravity 0 keeps y at 80;
// gravity -5 drifts up and off the canvas. Removing 'static' makes the ground fall too.
// Every colour comes from lib/tokens.js. Helper names are ms* (from the 5.1.2/5.1.12 explainers) or gr* (new). Lib globals
// (frame, label, draw, tick, dot, move, rect, X, NEG, ...) must not be shadowed.
'use strict';
const CHAPTER = { number: 1, type: 'explainer', title: 'Gravity', kicker: 'moSHion · 5.2.6',
  meta: 'Under 3 minutes, with sound and captions. One play-through, no questions.', minutes: 3, language: 'en', coverGo: 'Play' };

// ---- layout (stage px, 1600x900; y >= 780 is the caption bar's, the bottom-left corner (x < 232, y > 522) is the character's) ----
const CODE = { x: 270, y: 150, w: 740, head: 44, size: 22, lh: 34, gut: 316, x0: 330, rows: 10 };
const codeBase = i => CODE.y + CODE.head + 28 + i * CODE.lh;            // baselines 222 256 ... 528
const CODE_B = codeBase(CODE.rows - 1) + 22;                            // the panel ends at y 550
const PANE = { x: 1030, y: 150, w: 520, h: 520 };                       // the student's preview: runner.html's #111 page
const CV = { x: 1060, y: 180, k: 1.15, n: 400 };                        // the 400 x 400 canvas, drawn 460 px, centred in the pane
const cvX = u => CV.x + u * CV.k, cvY = v => CV.y + v * CV.k, CV_S = CV.n * CV.k;
const SPR = 40, HALF = SPR / 2 * CV.k;                                  // new Sprite(200, 80, 40, 40): 46 stage px
const BALL0 = { x: 200, y: 80 }, BALL2_0 = { x: 120, y: 60 };
const GROUND = { x: 200, y: 380, w: 400, h: 20 };
const FLOOR_Y = GROUND.y - GROUND.h / 2, REST_Y = FLOOR_Y - SPR / 2;      // 370, so the ball's centre rests at 350
const RUNB = { x: CODE.x + CODE.w - 124, y: CODE.y + 6, w: 110, h: 32 }; // shCode's Run button, right end of the tab strip
const RUN_C = [RUNB.x + RUNB.w / 2, RUNB.y + RUNB.h / 2];                // (921, 172)
const PTR_FROM = [1000, 300], PTR_AT = [RUN_C[0] - 35, RUN_C[1] + 6];
const ZONE = { x: 284, y: 636, r: 990 };                                 // under the editor: one thing at a time
const TOP_Y = 124;                                                      // over the pane: the two readouts
const FPS = 60, G_PX = 300;                                             // 10 m/s^2 at 30 px per metre (measured on the runner)
// What the sketch's own lines say, tagged as shCode's editor (lezer javascript + draculaHighlight) tags them.
const tk = kind => (s, id) => [s, kind, id];
const KW = tk('keyword'), PU = tk('punct'), NU = tk('num'), FN = tk('fn'), CL = tk('cls'), SR = tk('str'), OP = tk('op'), ID = tk('ident');
const MAIN = [
  [KW('let'), PU(' '), ID('ball'), PU(', '), ID('ground'), PU(';')],
  [KW('function'), PU(' '), FN('setup'), PU('() {')],
  [PU('  '), KW('new'), PU(' '), CL('Canvas'), PU('('), NU('400'), PU(', '), NU('400'), PU(');')],
  [PU('  '), ID('world'), OP('.'), ID('gravity'), OP('.'), ID('y'), PU(' '), OP('='), PU(' '), NU('0', 'g0'), PU(';')],
  [PU('  '), ID('ball'), PU(' '), OP('='), PU(' '), KW('new'), PU(' '), CL('Sprite'), PU('('), NU('200'), PU(', '), NU('80', 'y80'), PU(', '), NU('40'), PU(', '), NU('40'), PU(');')],
  [PU('  '), ID('ball'), OP('.'), ID('color'), PU(' '), OP('='), PU(' '), SR("'deepskyblue'"), PU(';')],
  [PU('  '), ID('ground'), PU(' '), OP('='), PU(' '), KW('new'), PU(' '), CL('Sprite'), PU('('), NU('200'), PU(', '), NU('380'), PU(', '), NU('400'), PU(', '), NU('20'), PU(', ', 'comma'), SR("'static'", 'static'), PU(');')],
  [PU('  '), ID('ground'), OP('.'), ID('color'), PU(' '), OP('='), PU(' '), SR("'gray'"), PU(';')],
  [PU('}')],
];
// The one new line ('dials'): a second sprite, so "one number moves everything" is something the student can see.
const BALL2_LINE = [PU('  '), ID('ball2'), PU(' '), OP('='), PU(' '), KW('new'), PU(' '), CL('Sprite'), PU('('), NU('120'), PU(', '), NU('60'), PU(', '), NU('40'), PU(', '), NU('40'), PU(');')];

// ---- drawing helpers (ms*: copied from the 5.1.2 / 5.1.12 explainers) ----
const AP = () => TOKS().app, STG = () => TOKS().stage, SXT = () => TOKS().syntax;
function msText(p, str, { x, y, size = 26, fill = COL.text, weight = 500, anchor = 'start', font = UI, o = 1, italic = false }) {
  const t = T(p, str, { x, y, size, fill, weight, anchor, font, o });
  if (italic) t.setAttribute('font-style', 'italic');
  return t;
}
function msRuns(p, runs, { x, y, size = 34, anchor = 'middle', font = UI, o = 1, weight = 500 }) {
  const t = msText(p, '', { x, y, size, anchor, font, o, weight });
  t.runs = runs.map(([s, f, w, fnt, sz]) => {
    const e = mk('tspan', { fill: f }, t);
    if (w) e.setAttribute('font-weight', w); if (fnt) e.setAttribute('font-family', fnt); if (sz) e.setAttribute('font-size', sz);
    e.textContent = s; return e;
  });
  return t;
}
function msArrow(p, x1, y1, x2, y2, color, t0, dur = .7, w = 3.5) {
  const g = G(p), a = Math.atan2(y2 - y1, x2 - x1), L = 16;
  draw(path(g, `M${x1} ${y1}L${x2} ${y2}`, { stroke: color, 'stroke-width': w }, { d: 0 }), t0, dur);
  const hd = path(g, `M${x2 - L * Math.cos(a - .5)} ${y2 - L * Math.sin(a - .5)}L${x2} ${y2}L${x2 - L * Math.cos(a + .5)} ${y2 - L * Math.sin(a + .5)}`,
    { stroke: color, 'stroke-width': w }, { o: 0 });
  show(hd, t0 + dur * .8, .15);
  return g;
}
function msHold(t) { prog(() => {}, t, 0, lin); }
function msBump(e, t0, k = 1.12) { tw(e, { s: k }, t0, .2, out); tw(e, { s: 1 }, t0 + .2, .35); }
function msPress(C, p, t0, glide = .65) {
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

// ---- the editor (gr*: adapted from 5.1.12's fl*) ----
const grColL = (t, c) => CODE.x0 + t.getStartPositionOfChar(c).x;
const grColR = (t, c) => CODE.x0 + t.getEndPositionOfChar(c).x;
function grRow(p, toks, i, spans, o = 1) {
  const SX = SXT(), row = G(p, { y: codeBase(i), o });
  const t = msText(row, '', { x: CODE.x0, y: 0, size: CODE.size, font: MONO, weight: 400 });
  for (const [s, kind, id] of toks) {
    const sp = mk('tspan', { fill: SX[kind] }, t);
    if (kind === 'cls') sp.setAttribute('font-style', 'italic');
    sp.textContent = s;
    if (id) spans[id] = sp;
  }
  return { row, t };
}
function grDoc(p, lines, o = 1) {
  const g = G(p, { o }), rows = [], texts = [], spans = {};
  lines.forEach((toks, i) => { const r = grRow(g, toks, i, spans); rows.push(r.row); texts.push(r.t); });
  return { g, rows, texts, spans };
}
function grBar(p, i, n, o = 0, mark) {
  const SX = SXT(), b = G(p, { o, y: codeBase(i) - 26 });
  b.bg = mk('rect', { x: CODE.x + 2, y: 0, width: CODE.w - 4, height: CODE.lh * n, fill: SX.lineBg }, b);
  b.sp = mk('rect', { x: CODE.x + 2, y: 0, width: 5, height: CODE.lh * n, fill: mark || SX.lineMark }, b);
  return b;
}
function grBarTo(b, i, n, t0, dur = .4) {
  tw(b, { y: codeBase(i) - 26 }, t0, dur);
  tw(b.bg, { a_height: CODE.lh * n }, t0, dur); tw(b.sp, { a_height: CODE.lh * n }, t0, dur);
}
function grUnder(p, row, t, c0, c1, color, t0, w = 3.5) {
  const y = st(row).y + 8, e = path(p, `M${grColL(t, c0) + 1} ${y}H${grColR(t, c1 - 1) - 1}`, { stroke: color, 'stroke-width': w }, { d: 0 });
  draw(e, t0, .4);
  return e;
}
function grEdit(row, t, c0, c1, spans, to, t0) {
  const flash = mk('rect', { x: grColL(t, c0) - 5, y: -24, width: grColR(t, c1 - 1) - grColL(t, c0) + 10, height: 32, rx: 6, fill: COL.purple }, null);
  row.insertBefore(flash, row.firstChild); put(flash, { o: 0 });
  tw(flash, { o: .45 }, t0, .2); tw(flash, { o: 0 }, t0 + .45, .45);
  const from = spans.map(s => s.textContent), toTxt = k => Array.isArray(to) ? to[k] : to;
  prog(q => spans.forEach((s, k) => { s.textContent = q < .5 ? from[k] : toTxt(k); }), t0 + .05, .4, lin);
}
function grType(row, t, t0, dur) {
  const sp = [...t.querySelectorAll('tspan')], full = sp.map(s => s.textContent), total = full.join('').length;
  show(row, t0, .05);
  prog(q => {
    let left = Math.round(q * total);
    sp.forEach((s, k) => { const n = Math.min(full[k].length, Math.max(0, left)); s.textContent = full[k].slice(0, n); left -= full[k].length; });
  }, t0, dur, lin);
}
function grCode(p, t0) {
  const SX = SXT(), A = AP(), g = G(p, { o: 0 });
  mk('rect', { x: CODE.x, y: CODE.y, width: CODE.w, height: CODE_B - CODE.y, rx: 14, fill: SX.bg, stroke: SX.edge, 'stroke-width': 2 }, g);
  path(g, `M${CODE.x} ${CODE.y + CODE.head}H${CODE.x + CODE.w}`, { stroke: SX.edge, 'stroke-width': 2 });
  msText(g, 'script.js', { x: CODE.x + 26, y: CODE.y + 29, size: 20, fill: COL.muted, weight: 500 });
  path(g, `M${CODE.x + 14} ${CODE.y + CODE.head - 1}H${CODE.x + 132}`, { stroke: COL.purple, 'stroke-width': 3 });
  const run = G(g, { x: RUN_C[0], y: RUN_C[1] });
  const runBg = mk('rect', { x: -RUNB.w / 2, y: -RUNB.h / 2, width: RUNB.w, height: RUNB.h, rx: 5, fill: A.run }, run);
  path(run, 'M-31 -8L-31 8L-18 0Z', { fill: A.runText, stroke: A.runText, 'stroke-width': 1.5 });
  msText(run, 'Run', { x: -9, y: 8, size: 21, fill: A.runText, weight: 600 });
  const marks = G(g);
  const bar = grBar(g, 0, 1);
  const gut = G(g), nums = [];
  for (let i = 0; i < CODE.rows; i++)
    nums.push(msText(gut, String(i + 1), { x: CODE.gut, y: codeBase(i), size: 20, fill: SX.gutter, font: MONO, anchor: 'end', weight: 400, o: i < MAIN.length ? 1 : 0 }));
  const main = grDoc(g, MAIN);
  const cm = G(g);
  show(g, t0, .5);
  return { g, run, runBg, marks, bar, nums, main, cm, texts: main.texts };
}

// ---- the preview pane and what runs in it ----
function grPane(p, t0) {
  const ST = STG(), g = G(p, { o: 0 });
  mk('rect', { x: PANE.x, y: PANE.y, width: PANE.w, height: PANE.h, rx: 14, fill: ST.pane, stroke: ST.paneEdge, 'stroke-width': 2 }, g);
  const clip = mk('clipPath', { id: 'grCanvasClip' }, g);
  mk('rect', { x: CV.x, y: CV.y, width: CV_S, height: CV_S }, clip);
  const kids = G(g);
  kids.setAttribute('clip-path', 'url(#grCanvasClip)');
  show(g, t0, .5);
  return { g, kids };
}
// The ground: moSHion draws a 400 x 20 'gray' sprite as a plain bar.
function grGround(pv, o = 1) {
  const g = G(pv.kids, { x: cvX(GROUND.x), y: cvY(GROUND.y), o });
  mk('rect', { x: -GROUND.w * CV.k / 2, y: -GROUND.h * CV.k / 2, width: GROUND.w * CV.k, height: GROUND.h * CV.k, fill: '#808080' }, g);
  return g;
}
// A 40 x 40 sprite at (x, y); a new Sprite is deeppink, a coloured one is the student's.
function grBall(pv, x, y, color, o = 1) {
  const e = G(pv.kids, { x: cvX(x), y: cvY(y), o });
  mk('rect', { x: -HALF, y: -HALF, width: 2 * HALF, height: 2 * HALF, fill: color }, e);
  return e;
}
function grClear(els, t0) { els.forEach(e => e && hide(e, t0, .12)); }
// Over the pane: "world.gravity.y 0" at the left and "y = 80" at the right. Explanations, outside the pane.
function grTop(p) {
  const ST = STG(), g = G(p);
  const gG = G(g, { o: 0 }), gr = msRuns(gG, [['world.gravity.y', COL.muted, 500, MONO, 24], ['  ', COL.muted], ['0', ST.y, 600, MONO]], { x: PANE.x + 6, y: TOP_Y, size: 30, anchor: 'start' });
  const yG = G(g, { o: 0 }), yr = msRuns(yG, [['y', ST.y, 600, MONO], [' = ', COL.muted, 400, MONO], ['80', COL.text, 500, MONO]], { x: PANE.x + PANE.w - 6, y: TOP_Y, size: 32, anchor: 'end' });
  return { g, gG, yG, gr, yr, grav: v => { gr.runs[2].textContent = String(v); }, y: v => { yr.runs[2].textContent = String(v); } };
}
const grSet = (f, v, t0) => prog(() => f(v), t0, 0, lin);   // a readout takes value v at t0
// The gravity gauge under the pane: -10 .. 20, a marker, and the current value beside it.
const GAUGE = { x0: 1090, x1: 1470, y: 730, lo: -10, hi: 20 };
function grGauge(p, t0, value = 0) {
  const ST = STG(), gx = v => GAUGE.x0 + (v - GAUGE.lo) / (GAUGE.hi - GAUGE.lo) * (GAUGE.x1 - GAUGE.x0);
  const g = G(p, { o: 0 });
  msText(g, 'gravity', { x: GAUGE.x0, y: GAUGE.y - 40, size: 22, fill: COL.muted, weight: 500 });
  path(g, `M${GAUGE.x0} ${GAUGE.y}H${GAUGE.x1}`, { stroke: COL.raised, 'stroke-width': 4 });
  for (const v of [-10, -5, 0, 10, 20]) {
    path(g, `M${gx(v)} ${GAUGE.y - 8}V${GAUGE.y + 8}`, { stroke: v === 0 ? COL.muted : COL.raised, 'stroke-width': 3 });
    msText(g, String(v), { x: gx(v), y: GAUGE.y + 30, size: 20, fill: COL.muted, font: MONO, anchor: 'middle' });
  }
  const knob = G(g, { x: gx(value), y: GAUGE.y, o: 0 });
  mk('circle', { r: 11, fill: ST.y, stroke: COL.board, 'stroke-width': 2.5 }, knob);
  const val = msText(g, String(value), { x: GAUGE.x1 + 28, y: GAUGE.y + 10, size: 28, fill: ST.y, font: MONO, weight: 600, anchor: 'start', o: 0 });
  show(val, t0, .3);
  return { g, knob, val, gx, at: (v, t1) => { tw(knob, { x: gx(v) }, t1, .5, out); prog(() => { val.textContent = String(v); }, t1, 0, lin); } };
}
function grModeLabel(p, text, t0, t1) {
  const e = msText(p, text, { x: GAUGE.x1, y: GAUGE.y - 40, size: 22, fill: COL.muted, weight: 500, anchor: 'end', o: 0 });
  show(e, t0, .3); if (t1 != null) hide(e, t1, .3);
  return e;
}

const BEATS = [
  ['hello', 'Nothing falls', (m, D) => {
    const p = panel(0);
    S.title = G(p);
    show(msText(S.title, 'moSHion · 5.2.6', { x: 70, y: 74, size: 22, fill: COL.purple, weight: 600, o: 0 }), m('still', -.1), .4);
    const tt = msText(S.title, 'Gravity', { x: 70, y: 124, size: 46, fill: COL.text, weight: 600, o: 0 });
    tw(tt, { o: 1, y: 124 }, m('still'), .5, out); put(tt, { y: 136 });
    S.code = grCode(p, m('still'));
    tw(S.code.g, { y: 0 }, m('still'), .55, out); put(S.code.g, { y: 14 });
    S.pv = grPane(p, m('put', -.05));
    S.ground = grGround(S.pv, 0); show(S.ground, m('put', .1), .35);
    S.ball = grBall(S.pv, BALL0.x, BALL0.y, STG().blue, 0); show(S.ball, m('put', .15), .3);
    S.top = grTop(p);
    show(S.top.gG, m('put', .2), .3); show(S.top.yG, m('put', .2), .3);
    msBump(S.ball, m('why', .2), 1.15);
  }],

  ['zero', 'It starts at zero', (m, D) => {
    const C = S.code, p = S.panel, top = S.top, H = D + .1, ST = STG();
    // "gravity is one setting for the whole world: world.gravity.y"
    show(C.bar, m('setting', -.05), .3); grBarTo(C.bar, 3, 1, m('setting', -.05), .3);
    S.cmz = G(C.cm);
    grUnder(S.cmz, C.main.rows[3], C.main.texts[3], 2, 15, COL.purple, m('line', .0));   // world.gravity.y
    // "It starts at zero."
    S.z0 = G(p);
    show(msText(S.z0, 'the world starts at', { x: ZONE.x, y: 690, size: 26, fill: COL.muted, o: 0 }), m('zero', -.05), .35);
    show(msRuns(S.z0, [['0', ST.y, 600, MONO]], { x: ZONE.x + 300, y: 690, size: 30, anchor: 'start', o: 0 }), m('zero', .15), .35);
    // "Zero means no pull. Run the sketch, and the sprite just hangs there."
    msPress(C, p, m('run'), .4);
    S.gauge0 = grGauge(p, m('nopull', .05), 0); show(S.gauge0.g, m('nopull', .05), .4);
    S.mode0 = grModeLabel(p, 'after Run', m('run', .2), H - .4);
    top.y(80);                                                          // gravity 0: the ball does not move at all
    msBump(top.yr, m('def', .1), 1.1);
    hide(top.gG, H - .4, .3); hide(top.yG, H - .4, .3); hide(S.z0, H - .4, .3); hide(S.gauge0.g, H - .4, .3);
    hide(C.bar, H - .4, .3); hide(S.cmz, H - .4, .3);
    msHold(H);
  }, { keep: true }],

  ['fall', 'Turn it on', (m, D) => {
    const C = S.code, p = S.panel, top = S.top, SX = SXT(), H = D + .1;
    // "So set world.gravity.y to 10.": the 0 is edited to 10
    show(C.bar, m('on', -.05), .3); grBarTo(C.bar, 3, 1, m('on', -.05), .01);
    grEdit(C.main.rows[3], C.main.texts[3], 20, 22, [C.main.spans.g0], '10', m('on', .35));
    S.cmf = G(C.cm);
    grUnder(S.cmf, C.main.rows[3], C.main.texts[3], 20, 22, COL.purple, m('on', .8));
    S.gauge1 = grGauge(p, m('on', .1), 10); show(S.gauge1.g, m('on', .1), .4);
    S.gauge1.at(10, m('on', .55));
    top.grav(10);
    // "Press Run": the sketch restarts, and the ball falls from y 80 (shown in slow motion, so the numbers can be read)
    msPress(C, p, m('press'), .4);
    grClear([S.ball], m('press', .15));
    S.mode1 = grModeLabel(p, 'slow motion', m('press', .2), H - .4);
    show(top.gG, m('press', .2), .3); show(top.yG, m('press', .2), .3);
    const ball = S.fallBall = grBall(S.pv, BALL0.x, BALL0.y, STG().blue, 0); show(ball, m('press', .3), .12);
    // the fall, timed to the spoken numbers: 80 at [[y80]], 107 at [[y107]], 218 at [[y218]], 350 at [[land]]
    const kf = [[m('drop'), 80], [m('y80'), 80], [m('y107'), 107], [m('y218'), 218], [m('land'), REST_Y]];
    const yAt = t => {
      for (let i = 1; i < kf.length; i++) {
        const [t1, y1] = kf[i], [t0, y0] = kf[i - 1];
        if (t <= t1) { const u = Math.max(0, (t - t0) / Math.max(.01, t1 - t0)); return y0 + (y1 - y0) * u * u; }
      }
      return REST_Y;
    };
    const tEnd = kf[kf.length - 1][0] + .05;
    prog(q => {
      const t = m('drop') + q * (tEnd - m('drop')), y = yAt(t);
      put(ball, { y: cvY(y) }); top.y(Math.round(y));
    }, m('drop'), tEnd - m('drop'), lin);
    // the y chips under the editor land on the spoken numbers
    const chips = [[80, 'y80'], [107, 'y107'], [218, 'y218'], [350, 'land']];
    const CX = i => ZONE.x + 96 + i * 172;
    S.chips = G(p);
    chips.forEach(([v, k], i) => {
      const cg = G(S.chips, { x: CX(i), y: 700, o: 0 });
      mk('rect', { x: -62, y: -30, width: 124, height: 60, rx: 10, fill: COL.panel, stroke: i === 3 ? COL.raised : SX.num, 'stroke-width': 2.5 }, cg);
      msText(cg, 'y ' + v, { x: 0, y: 11, size: 28, fill: i === 3 ? COL.text : SX.num, font: MONO, weight: 500, anchor: 'middle' });
      show(cg, m(k, .05), .35); msBump(cg, m(k, .1), 1.08);
      if (i) msArrow(S.chips, CX(i - 1) + 70, 700, CX(i) - 70, 700, COL.muted, m(k, -.35), .3, 3);
    });
    msBump(top.yr, m('land', .2), 1.12);
    hide(top.gG, H - .4, .3); hide(top.yG, H - .4, .3); hide(S.gauge1.g, H - .4, .3);
    hide(C.bar, H - .4, .3); hide(S.cmf, H - .4, .3); hide(S.chips, H - .35, .3);
    msHold(H);
  }, { keep: true }],

  ['down', 'Which way is down?', (m, D) => {
    const p = S.panel, ST = STG(), H = D + .1;
    const g = S.down = G(p);
    // "Here is why.": a small canvas diagram under the editor (an explanation, never part of the run picture)
    const BX = ZONE.x + 44, BY = 620, SZ = 104;
    mk('rect', { x: BX, y: BY, width: SZ, height: SZ, fill: COL.panel, stroke: COL.raised, 'stroke-width': 2 }, g);
    msText(g, '(0, 0)', { x: BX + 8, y: BY + 18, size: 19, fill: COL.muted, font: MONO });
    msArrow(g, BX + 10, BY + SZ + 24, BX + SZ, BY + SZ + 24, ST.x, m('top', .2), .6, 3);
    msText(g, 'x', { x: BX + SZ + 8, y: BY + SZ + 32, size: 22, fill: ST.x, font: MONO, weight: 600 });
    // the y ruler sits OUTSIDE the canvas, so it never competes with the force arrow inside
    msArrow(g, BX - 22, BY + 8, BX - 22, BY + SZ + 8, ST.y, m('grow', -.1), .6, 3);
    msText(g, 'y', { x: BX - 40, y: BY + SZ / 2 + 4, size: 22, fill: ST.y, font: MONO, weight: 600 });
    const by = G(g, { x: BX + 84, y: BY + 30, o: 0 });                    // the ball, near the top
    mk('rect', { x: -10, y: -10, width: 20, height: 20, fill: ST.blue }, by);
    show(by, m('corner', .1), .3);
    // "positive gravity pulls toward bigger y: down the screen"
    msArrow(g, BX + 84, BY + 48, BX + 84, BY + SZ - 14, COL.orange, m('pos', .05), .7, 4);
    msText(g, 'gravity', { x: BX + 112, y: BY + 80, size: 20, fill: COL.orange });
    // "A math graph is the other way round. There, y grows upward."
    const MX = ZONE.x + 600, MY = 614, MSZ = 84;
    mk('rect', { x: MX, y: MY, width: MSZ, height: MSZ, fill: COL.panel, stroke: COL.raised, 'stroke-width': 2 }, g);
    msText(g, 'a math graph', { x: MX + MSZ / 2, y: MY - 12, size: 20, fill: COL.muted, anchor: 'middle' });
    msArrow(g, MX + 30, MY + MSZ - 14, MX + 30, MY + 14, ST.y, m('up'), .6, 3);
    msArrow(g, MX + 30, MY + MSZ - 14, MX + MSZ - 14, MY + MSZ - 14, ST.x, m('up', .2), .5, 3);
    msText(g, 'y', { x: MX + 38, y: MY + 26, size: 22, fill: ST.y, font: MONO, weight: 600 });
    msText(g, 'y grows up', { x: MX + 42, y: MY + MSZ + 26, size: 20, fill: COL.orange, anchor: 'middle' });
    // "moSHion follows the screen, not the graph."
    show(msRuns(g, [['on screen, y grows ', COL.muted], ['down', COL.orange, 600]], { x: MX + 42, y: MY + MSZ + 62, size: 24, anchor: 'middle', o: 0 }), m('screen'), .35);
    msHold(H);
  }, { keep: true }],

  ['static', 'Dynamic and static', (m, D) => {
    const C = S.code, p = S.panel, pv = S.pv, top = S.top, ST = STG(), H = D + .1;
    hide(S.down, m('ground'), .4); hide(top.gG, m('ground', -.1), .3); hide(top.yG, m('ground', -.1), .3);
    grClear([S.fallBall], m('ground', .1));
    // "What about the ground? A sprite without static is dynamic. Gravity moves it."
    show(C.bar, m('ground', -.05), .3); grBarTo(C.bar, 6, 1, m('ground', -.05), .05);
    const z = S.zs = G(p);
    show(msRuns(z, [['dynamic', COL.text, 600], ['  falls', COL.muted]], { x: ZONE.x, y: 664, size: 26, anchor: 'start', o: 0 }), m('dyn', .1), .35);
    show(msRuns(z, [['static', COL.text, 600], ['  holds still', COL.muted]], { x: ZONE.x, y: 716, size: 26, anchor: 'start', o: 0 }), m('rule', .2), .35);
    // "Remove static, and the ground falls too.": the string is edited away, then Run
    grEdit(C.main.rows[6], C.main.texts[6], 39, 49, [C.main.spans.comma, C.main.spans.static], ['', ''], m('remove', .1));
    S.gauge3 = grGauge(p, m('remove', -.1), 10); show(S.gauge3.g, m('remove', -.1), .4);
    msPress(C, p, m('remove', 1.35), .35);
    grClear([S.ball, S.ground], m('remove', 1.5));
    S.mode3 = grModeLabel(p, 'full speed', m('remove', 1.6), H - .4);
    // both dynamic bodies fall at the same rate: the ground leaves, and the ball follows it
    const gb = S.gb = grGround(pv, 1), gball = S.gball = grBall(pv, BALL0.x, BALL0.y, STG().blue, 0);
    show(gb, m('remove', 1.5), .1); show(gball, m('remove', 1.5), .1);
    prog(q => {
      const t = q * 1.15, drop = .5 * G_PX * t * t;
      put(gball, { y: cvY(BALL0.y + drop) });
      put(gb, { y: cvY(GROUND.y + drop), o: drop > 30 ? 0 : 1 });   // wholly below the canvas: clipped, and culled here
    }, m('remove', 1.5), 1.15, lin);
    // "Add static back, and the ground holds still, while the ball falls and lands."
    grClear([gb, gball], m('back', -.15));
    grEdit(C.main.rows[6], C.main.texts[6], 39, 49, [C.main.spans.comma, C.main.spans.static], [', ', "'static'"], m('back', .0));
    msPress(C, p, m('back', .55), .35);
    const nb = S.nb = grBall(pv, BALL0.x, BALL0.y, STG().blue, 0), ng = S.ng = grGround(pv, 1);
    show(ng, m('back', .7), .1); show(nb, m('back', .7), .1);
    prog(q => { const t = q * 1.35, y = Math.min(REST_Y, BALL0.y + .5 * G_PX * t * t); put(nb, { y: cvY(y) }); }, m('back', .75), 1.35, lin);
    // "Static sprites are the floor and the walls. Dynamic sprites fall, and they can be pushed."
    hide(z, H - .4, .3); hide(S.gauge3.g, H - .4, .3); hide(C.bar, H - .4, .3);
    msHold(H);
  }, { keep: true }],

  ['dials', 'One number, every sprite', (m, D) => {
    const C = S.code, p = S.panel, top = S.top, SX = SXT(), ST = STG(), H = D + .1;
    // "Gravity belongs to the world, not to one sprite."
    show(C.bar, m('whole', -.05), .3); grBarTo(C.bar, 3, 1, m('whole', -.05), .01);
    // "Add a second sprite, and it falls too.": a new line types in, the closing brace slides down
    grBarTo(C.bar, 4, 5, m('two', -.05), .25);
    const mv = grRow(C.main.g, BALL2_LINE, 8, C.main.spans, 0);
    const brace = C.main.rows[8];
    C.main.rows.splice(8, 0, mv.row); C.main.texts.splice(8, 0, mv.t);
    S.mv = mv;
    tw(brace, { y: codeBase(9) }, m('two', 1.25), .4);
    show(C.nums[9], m('two', 1.25), .4);
    grType(mv.row, mv.t, m('two', 1.5), 1.1);
    // "Now try other values. Zero floats. -5 pulls up.": the gauge visits 0, then -5, and the line is edited to -5
    S.gauge2 = grGauge(p, m('try', -.05), 10); show(S.gauge2.g, m('try', -.05), .4);
    S.gauge2.at(0, m('zero', -.05)); msBump(S.gauge2.val, m('zero'), 1.1);
    S.gauge2.at(-5, m('neg', -.05)); msBump(S.gauge2.val, m('neg'), 1.1);
    show(top.gG, m('neg', -.1), .3); show(top.yG, m('neg', -.1), .3);
    grEdit(C.main.rows[3], C.main.texts[3], 20, 22, [C.main.spans.g0], '-5', m('neg', .1));
    top.grav(-5);
    // "Press Run, and both sprites drift upward."
    msPress(C, p, m('press'), .4);
    grClear([S.nb, S.ng, S.fallBall], m('press', .12));
    S.mode2 = grModeLabel(p, 'full speed', m('press', .2), H - .4);
    const b1 = S.rise1 = grBall(S.pv, BALL0.x, BALL0.y, STG().blue, 0), b2 = S.rise2 = grBall(S.pv, BALL2_0.x, BALL2_0.y, STG().sprite, 0);
    const rg = S.rg = grGround(S.pv, 1);
    show(rg, m('press', .3), .1); show(b1, m('press', .3), .12); show(b2, m('press', .3), .12);
    grSet(top.y, 80, m('press', .3));
    const t0 = Math.max(m('press', .3), m('up', 0)), dur = 1.0;
    prog(q => {                                                         // -5: 150 px/s^2 upward
      const t = q * dur, up = .5 * 150 * t * t;
      put(b1, { y: cvY(BALL0.y - up) }); put(b2, { y: cvY(BALL2_0.y - up) });
      top.y(Math.round(Math.max(-40, BALL0.y - up)));
    }, t0, dur, lin);
    hide(b1, H - .3, .3); hide(b2, H - .3, .3); hide(rg, H - .3, .3);
    hide(top.gG, H - .4, .3); hide(top.yG, H - .4, .3); hide(S.gauge2.g, H - .4, .3);
    hide(C.bar, H - .4, .3);
    msHold(H);
  }, { keep: true }],

  ['close', 'Up next', (m, D) => {
    const p = panel(0), SX = SXT(), ST = STG();
    const row = (runs, y, t0, size = 40, weight = 600, x = 800) => { const t = msRuns(p, runs, { x, y, size, weight, o: 0 }); tw(t, { o: 1, y }, t0, .45, out); put(t, { y: y + 10 }); return t; };
    row([['world.gravity.y', SX.ident, 500, MONO], ['   one number for the whole world', COL.text, 500]], 210, m('sum', -.05), 38);
    row([['0', ST.y, 600, MONO], [' floats     ', COL.muted], ['10', ST.y, 600, MONO], [' falls     ', COL.muted], ['-5', ST.y, 600, MONO], [' pulls up', COL.muted]], 292, m('zero', -.05), 36);
    show(msText(p, 'UP NEXT', { x: 800, y: 440, size: 22, fill: COL.purple, weight: 600, anchor: 'middle', o: 0 }), m('next', -.05), .35);
    row([['5.2.8 Lab: Tune Gravity', COL.text]], 512, m('next', .15), 52);
    row([['change the number, and watch what the ball does', COL.muted]], 580, m('next', 1.1), 30, 500);
    msHold(Math.max(D, m('bye', 1.8)) + .1);
  }],
].map(([id, title, run, extra]) => ({ id, title, run, ...extra }));

// ---- SH: bottom-left, never the subject. Every expression change lands on a narration mark; the expressive three
// (delighted, surprise, proud) carry the moments that matter, and no two consecutive expressions repeat. ----
const CODEC = [630, 380], PANEC = [1290, 410], ZONEC = [640, 700], TOPC = [1290, 110], GAUGEC = [1290, 730];
bindActs({
  hello: { act: (t, m, D, s, MV) => {
    s.pose = 'down';
    emo(t, s, [[0, { expr: 'delighted', amp: 1.15, look: PANEC }],
      [m('still', -.1), { expr: 'curious', tilt: 6, amp: 1, look: CODEC }],
      [m('put', -.1), { expr: 'determined', tilt: 0, look: PANEC, pose: 'pointUp' }],
      [m('why', -.1), { expr: 'delighted', amp: 1.15, look: PANEC, pose: 'down' }]]);
    MV.wave(t, s, m('hi', -.15), 1.9);
  } },
  zero: { act: (t, m, D, s) => {
    s.pose = 'pointUp';
    emo(t, s, [[0, { expr: 'determined', look: CODEC }],
      [m('line', -.1), { expr: 'curious', tilt: 5, look: CODEC }],
      [m('zero', -.1), { expr: 'surprise', tilt: 0, amp: 1, look: ZONEC }],
      [m('run', -.1), { expr: 'determined', look: RUN_C }],
      [m('run', .2), { expr: 'surprise', amp: 1, look: PANEC, pose: 'down' }],
      [m('def', -.1), { expr: 'determined', look: ZONEC, pose: 'point' }]]);
    kick.lean(t, s, m('run', .2), .5, .5);
  } },
  fall: { act: (t, m, D, s) => {
    s.pose = 'pointUp';
    emo(t, s, [[0, { expr: 'determined', look: CODEC }],
      [m('on', .3), { expr: 'curious', tilt: 5, look: CODEC }],
      [m('press', -.1), { expr: 'determined', tilt: 0, look: RUN_C }],
      [m('drop', -.1), { expr: 'surprise', amp: 1, look: PANEC, pose: 'down' }],
      [m('add', -.1), { expr: 'determined', look: PANEC }],
      [m('read', -.1), { expr: 'curious', tilt: 5, look: ZONEC, pose: 'point' }],
      [m('land', -.1), { expr: 'delighted', amp: 1.1, look: PANEC, pose: 'down' }]]);
    kick.lean(t, s, m('drop', .1), .5, .5);
  } },
  down: { act: (t, m, D, s) => {
    s.pose = 'point';
    emo(t, s, [[0, { expr: 'determined', look: ZONEC }],
      [m('top', -.1), { expr: 'curious', tilt: 5, look: ZONEC }],
      [m('grow', -.1), { expr: 'determined', tilt: 0, look: ZONEC }],
      [m('pos', -.1), { expr: 'surprise', amp: 1, look: ZONEC }],
      [m('math', -.1), { expr: 'curious', tilt: -5, look: [ZONE.x + 600, 676] }],
      [m('screen', -.1), { expr: 'proud', amp: 1.05, look: ZONEC, pose: 'pointUp' }]]);
  } },
  dials: { act: (t, m, D, s) => {
    s.pose = 'down';
    emo(t, s, [[0, { expr: 'determined', look: PANEC }],
      [m('two', -.1), { expr: 'curious', tilt: 6, look: CODEC }],
      [m('try', -.1), { expr: 'determined', tilt: 0, look: GAUGEC, pose: 'point' }],
      [m('zero', -.1), { expr: 'surprise', amp: 1, look: GAUGEC }],
      [m('neg', -.1), { expr: 'curious', tilt: -5, look: GAUGEC }],
      [m('press', -.1), { expr: 'determined', tilt: 0, look: RUN_C, pose: 'pointUp' }],
      [m('up', -.1), { expr: 'surprise', amp: 1, look: PANEC, pose: 'down' }],
      [m('one', -.1), { expr: 'delighted', amp: 1.15, look: PANEC }]]);
    kick.lean(t, s, m('up', .1), .5, .5);
  } },
  static: { act: (t, m, D, s) => {
    s.pose = 'pointUp';
    emo(t, s, [[0, { expr: 'determined', look: CODEC }],
      [m('dyn', -.1), { expr: 'curious', tilt: 5, look: ZONEC }],
      [m('remove', -.1), { expr: 'determined', tilt: 0, look: CODEC }],
      [m('remove', .7), { expr: 'surprise', amp: 1, look: PANEC, pose: 'down' }],
      [m('back', -.1), { expr: 'determined', look: RUN_C }],
      [m('back', .7), { expr: 'delighted', amp: 1.1, look: PANEC }],
      [m('rule', -.1), { expr: 'proud', amp: 1.05, look: ZONEC, pose: 'point' }]]);
    kick.lean(t, s, m('remove', .7), .5, .5);
  } },
  close: { act: (t, m, D, s, MV) => {
    s.pose = 'down';
    emo(t, s, [[0, { expr: 'proud', amp: 1.05, look: [800, 220] }],
      [m('next', -.1), { expr: 'delighted', amp: 1.1, look: [800, 500], pose: 'point' }],
      [m('bye', -.15), { pose: 'down' }],
      [m('bye', -.1), { expr: 'delighted', amp: 1.15, look: [800, 420] }]]);
    MV.wave(t, s, m('bye', -.15), 1.9);
  } },
});
boot();
