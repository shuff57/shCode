// papermorph explainer: shCode's "Pinball: the table". It carries NO lesson or module number: the
// course renumbers lessons, so the picture names each lesson by its type and title only (shCode public/videos/VENDORED.md).
// Seven beats, one play-through, no questions. A scene is not a game; the table is where the four things a game adds live.
//   hello    the finished table runs once, and the module's eight-lesson map appears (short names only, no numbers);
//            the reading that lets you play the finished game first is the first of them.
//   idea    The plan (sketch your pinball game), then the reading that turns a scene into a game. A game adds a goal, a
//           score, a way to lose and a way to start again, and this module builds the table where all four will live. The
//           goal appears on the word "goal": a scene does not have one.
//   drop    The lab Drop a bouncy ball. world.gravity.y = 10, `new Sprite(70, 60, 24)` (one size number = a circle),
//           ball.bounciness = 0.75. Run: it falls straight down and off the canvas, and never lands.
//   walls   The lab Walls and a ground. Two static walls and a static ground whose left end is x 110, so the ground
//           stops before the left wall; that gap is the drain. Run: the ball falls through it and off the canvas.
//   bumper  The lab A tilted bumper. Fourteen degrees turns the flat bar into a slope; the ball lands on it and rolls
//           down to the right. The dotted line is the ball's measured path, labelled as the helper it is; the ball comes to
//           rest at the bumper's low end and x = 240 marks it, on the word.
//   goal    The lab Put a goal on the table. A golden bar, tilted the same way, goes on the dotted path. Run: the ball
//           rolls off the bumper straight across the bar, and nothing happens, because nothing is looking yet.
//   close   the worked example's draw() gets a check: the score climbs 1..33 while the ball crosses the bar (33 frames of
//           contact). The table is complete and the score counts too much; the next module, "Pinball: score once",
//           fixes it.
// Not taught here (the next module teaches it): why a per-frame check counts 33, and the fix. The 33 is shown once, at the end.
//
// Every label that belongs INSIDE a sentence is keyed to the word clock (wAt -> window.TS_WORDKEYS), so a chip, a note
// or a mark lands on the word that names it, not on the sentence's first word.
// Truth measured on the real runner (headless moSHion harness, /home/shuff57/Documents/GitHub/shCode/scripts/
// moshion-harness.mjs; the scripts are review/measure/*.mjs and they print these):
//   gravity 10 is 300 px/s^2 (Box2D 10 m/s^2 at 30 px per metre). Stage 1: the ball starts at (70, 60) and falls straight
//     down (x stays 70), off the bottom of the canvas at frame 92 (1.53 s); nothing stops it. The sprite's w = h = 24,
//     radius 12: one size number is a circle 24 across.
//   bounciness 0.75: dropped on a 400 x 20 ground, impact vel.y 7.000, rebound -5.312 -> ratio 0.759, so it keeps about
//     three quarters of its speed.
//   Stage 2: the ground is 280 x 20 at (250, 385), so it spans x 110..390; the ball at x 70 falls through the 110-px
//     gap at the left (the drain) and off the canvas again at frame 92.
//   Stage 3: the bumper is 200 x 14 at (140, 115) rotated 14 degrees, so its low end is near (237, 139). The ball meets
//     it at frame 21, rolls down it (contact frames 21, 53, 78, 98, 114, 127), leaves its low end by frame 128 at x 227,
//     hits the right wall at frame 185 (x 374.7), the ground at frame 201 (x 349), and drains at frame 415.
//   Stage 4: the goal is 100 x 14 at (286, 151) rotated 14 degrees, so its high end continues the bumper's line from
//     (237, 139) to (334, 163). The ball contacts it for frames 136..168 = 33 frames -> `score += 1` counts 33, the
//     reading's 33. It then bounces off the right wall (f 180), the ground (f 230), the left wall (f 320) and drains at
//     f 349 (5.82 s). The drawn paths ARE those traces (site/traces.js, 60 Hz), not a re-simulation.
// Every colour comes from lib/tokens.js (the sketch's 'gray'/'sienna'/'gold' are token mixes, as in the earlier explainers); helper names
// are ts*; lib globals (frame, label, draw, tick, dot, move, rect, X, NEG, ...) are not shadowed.
'use strict';
const CHAPTER = { number: 1, type: 'explainer', title: 'Pinball: the table', kicker: 'moSHion · Pinball',
  meta: 'Under three minutes, with sound and captions. One play-through, no questions.', minutes: 3, language: 'en', coverGo: 'Play' };

// ---- layout (stage px, 1600x900; y >= 780 is the caption bar's, the bottom-left corner (x < 232, y > 522) is SH's) ----
const CODE = { x: 278, y: 150, w: 860, head: 44, size: 22, lh: 30, x0: 296 };
const codeBase = i => CODE.y + CODE.head + 26 + i * CODE.lh;              // baselines 220, 250, ... 520
const codeBottom = rows => codeBase(rows - 1) + 24;                       // a panel sized to its document
const PANE = { x: 1150, y: 150, w: 438, h: 490 };                          // the student's preview pane (runner.html)
const CV = { x: 1159, y: 170, k: 1.05, n: 400 };                           // the 400 x 400 canvas, drawn 420 px
const cvX = u => CV.x + u * CV.k, cvY = v => CV.y + v * CV.k, CVP = CV.n * CV.k;
const RUNB = { x: CODE.x + CODE.w - 124, y: CODE.y + 6, w: 110, h: 32 };   // shCode's Run button, right end of the tab strip
const RUN_C = [RUNB.x + RUNB.w / 2, RUNB.y + RUNB.h / 2];                  // (1056, 172)
const PTR_FROM = [1120, 196], PTR_AT = [RUN_C[0] - 34, RUN_C[1] + 6];
const ZONE = { x: 300, y: 596 };                                           // under the editor: one note at a time
const CARD = { x: 279, y: 652, w: 152, h: 74, gap: 12 };
const cardX = i => CARD.x + i * (CARD.w + CARD.gap) + CARD.w / 2;
const FPS = 60;
const TR = window.TS_TRACES;

// The table's own geometry, in canvas units (the lesson's numbers), and its colours as token mixes.
const GRAY = () => mix(COL.text, COL.board, .5);
const SIENNA = () => mix(mix(COL.orange, COL.red, .55), COL.board, .42);
const GOLD = () => mix(COL.yellow, COL.orange, .5);
const TBL = {
  left: { x: 5, y: 200, w: 10, h: 400, rot: 0, c: GRAY },
  right: { x: 395, y: 200, w: 10, h: 400, rot: 0, c: GRAY },
  ground: { x: 250, y: 385, w: 280, h: 20, rot: 0, c: GRAY },
  bumper: { x: 140, y: 115, w: 200, h: 14, rot: 14, c: SIENNA },
  goal: { x: 286, y: 151, w: 100, h: 14, rot: 14, c: GOLD },
  ball: { x: 70, y: 60, d: 24 },
};
// The eight lessons the video walks through, by short name only: the video carries no lesson numbers (VENDORED.md).
const CARD_NAMES = ['play', 'plan', 'a scene', 'example', 'ball', 'walls', 'bumper', 'goal'];

// ---- drawing helpers (ts*: copied from the earlier explainers) ----
const AP = () => TOKS().app, STG = () => TOKS().stage, SXT = () => TOKS().syntax;
function tsText(p, str, { x, y, size = 26, fill = COL.text, weight = 500, anchor = 'start', font = UI, o = 1, italic = false }) {
  const t = T(p, str, { x, y, size, fill, weight, anchor, font, o });
  if (italic) t.setAttribute('font-style', 'italic');
  return t;
}
function tsRuns(p, runs, { x, y, size = 34, anchor = 'middle', font = UI, o = 1, weight = 500 }) {
  const t = tsText(p, '', { x, y, size, anchor, font, o, weight });
  t.runs = runs.map(([s, f, w, fnt, sz]) => {
    const e = mk('tspan', { fill: f }, t);
    if (w) e.setAttribute('font-weight', w); if (fnt) e.setAttribute('font-family', fnt); if (sz) e.setAttribute('font-size', sz);
    e.textContent = s; return e;
  });
  return t;
}
function tsArrow(p, x1, y1, x2, y2, color, t0, dur = .7, w = 3.5) {
  const g = G(p), a = Math.atan2(y2 - y1, x2 - x1), L = 15;
  draw(path(g, `M${x1} ${y1}L${x2} ${y2}`, { stroke: color, 'stroke-width': w }, { d: 0 }), t0, dur);
  const hd = path(g, `M${x2 - L * Math.cos(a - .5)} ${y2 - L * Math.sin(a - .5)}L${x2} ${y2}L${x2 - L * Math.cos(a + .5)} ${y2 - L * Math.sin(a + .5)}`,
    { stroke: color, 'stroke-width': w }, { o: 0 });
  show(hd, t0 + dur * .8, .15);
  return g;
}
function tsHold(t) { prog(() => {}, t, 0, lin); }
function tsBump(e, t0, k = 1.12) { tw(e, { s: k }, t0, .2, out); tw(e, { s: 1 }, t0 + .2, .35); }
function tsPress(C, p, t0, glide = .6) {
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
  C.rings.push(ring);
  hide(cur, t0 + .75, .3);
  tw(C.runBg, { c_fill: A.run }, t0 + .8, .25);
  C.cursors.push(cur);
  return cur;
}

// ---- the editor (ts*: adapted from the earlier template's gr*) ----
const tk = kind => (s, id) => [s, kind, id];
const KW = tk('keyword'), PU = tk('punct'), NU = tk('num'), FN = tk('fn'), CL = tk('cls'), SR = tk('str'), OP = tk('op'), ID = tk('ident');
const L = (n, ...toks) => [n, toks];
const BLANK = null, ELL = '…';

function tsCodeShell(p) {
  const SX = SXT(), A = AP(), g = G(p, { o: 0 });
  g.bg = mk('rect', { x: CODE.x, y: CODE.y, width: CODE.w, height: 394, rx: 14, fill: SX.bg, stroke: SX.edge, 'stroke-width': 2 }, g);
  path(g, `M${CODE.x} ${CODE.y + CODE.head}H${CODE.x + CODE.w}`, { stroke: SX.edge, 'stroke-width': 2 });
  tsText(g, 'script.js', { x: CODE.x + 26, y: CODE.y + 29, size: 22, fill: COL.muted, weight: 500 });
  path(g, `M${CODE.x + 14} ${CODE.y + CODE.head - 1}H${CODE.x + 150}`, { stroke: COL.purple, 'stroke-width': 3 });
  const run = G(g, { x: RUN_C[0], y: RUN_C[1] });
  const runBg = mk('rect', { x: -RUNB.w / 2, y: -RUNB.h / 2, width: RUNB.w, height: RUNB.h, rx: 5, fill: A.run }, run);
  path(run, 'M-31 -8L-31 8L-18 0Z', { fill: A.runText, stroke: A.runText, 'stroke-width': 1.5 });
  const runLabel = tsText(run, 'Run', { x: -9, y: 8, size: 22, fill: A.runText, weight: 600 });
  const bar = put(G(g, { o: 0 }), { y: codeBase(0) - 26 });
  bar.bg = mk('rect', { x: CODE.x + 2, y: 0, width: CODE.w - 4, height: CODE.lh, fill: SX.lineBg }, bar);
  bar.sp = mk('rect', { x: CODE.x + 2, y: 0, width: 5, height: CODE.lh, fill: SX.lineMark }, bar);
  const marks = G(g);                                    // the documents sit ON the lit bar
  Object.assign(g, { run, runBg, runLabel, marks, bar, rings: [], cursors: [] });
  return g;
}
function tsCodeIn(C, t0, rows) {
  const h = codeBottom(rows) - CODE.y;
  tw(C.bg, { a_height: h }, t0, .35, out);
  show(C, t0, .35);
  return C;
}
function tsDoc(parent, rows, hidden = false) {
  const SX = SXT(), g = G(parent), spans = {}, textAt = {}, rowG = [];
  rows.forEach((row, i) => {
    const rg = G(g); rowG[i] = rg; if (hidden) put(rg, { o: 0 });
    const y = codeBase(i);
    if (row === ELL) { textAt[i] = tsText(rg, '…', { x: CODE.x0, y, size: 22, fill: SX.gutter, font: MONO, weight: 400, o: .9 }); return; }
    if (row === BLANK) return;
    const [n, toks] = row;
    const t = tsText(rg, '', { x: CODE.x0, y, size: CODE.size, font: MONO, weight: 400 });
    t.setAttribute('text-rendering', 'geometricPrecision');
    for (const [s, kind, id] of toks) {
      const sp = mk('tspan', { fill: SX[kind] }, t);
      if (kind === 'cls') sp.setAttribute('font-style', 'italic');
      sp.textContent = s;
      if (id) spans[id] = sp;
    }
    textAt[i] = t;
  });
  return { g, spans, textAt, rows: rowG };
}
function tsBarTo(C, row, n, t0, dur = .4) {
  show(C.bar, t0, .2);
  tw(C.bar, { y: codeBase(row) - 26 }, t0, dur);
  tw(C.bar.bg, { a_height: CODE.lh * n }, t0, dur);
  tw(C.bar.sp, { a_height: CODE.lh * n }, t0, dur);
}
function tsUnderSpan(doc, id, color, t0, w = 3.5) {
  const sp = doc.spans[id]; if (!sp) return null;
  let b; try { b = sp.getBBox(); } catch { return null; }
  const y = st(sp.parentNode).y + 8;
  const e = path(doc.g, `M${CODE.x0 + b.x + 1} ${y}H${CODE.x0 + b.x + b.width - 1}`, { stroke: color, 'stroke-width': w }, { d: 0 });
  draw(e, t0, .4);
  return e;
}
function tsNewDoc(C, rows, t0, hideAt) {
  if (S.doc) hide(S.doc.g, Math.max(0, hideAt), .25);
  S.doc = tsDoc(C.marks, rows);
  put(S.doc.g, { o: 0 });
  tsCodeIn(C, t0 - .1, rows.length);
  show(S.doc.g, t0, .35);
  return S.doc;
}

// ---- the pane, the table, and the run pictures ----
function tsPane(p, t0) {
  const ST = STG(), g = G(p, { o: 0 });
  mk('rect', { x: PANE.x, y: PANE.y, width: PANE.w, height: PANE.h, rx: 14, fill: ST.pane, stroke: ST.paneEdge, 'stroke-width': 2 }, g);
  mk('rect', { x: CV.x, y: CV.y, width: CVP, height: CVP, fill: ST.canvas }, g);
  // no canvas outline: background('#222') already makes the edge real, and the two walls must read as walls
  const clip = mk('clipPath', { id: 'tsCanvasClip' }, g);
  mk('rect', { x: CV.x, y: CV.y, width: CVP, height: CVP }, clip);
  const kids = G(g);
  kids.setAttribute('clip-path', 'url(#tsCanvasClip)');
  show(g, t0, .5);
  return { g, kids };
}
function tsPart(pv, o, color, rot = o.rot) {
  const e = G(pv.kids, { x: cvX(o.x), y: cvY(o.y), r: rot, o: 1 });
  mk('rect', { x: -o.w * CV.k / 2, y: -o.h * CV.k / 2, width: o.w * CV.k, height: o.h * CV.k, fill: color }, e);
  return e;
}
function tsBall(pv, x, y, o = 1) {
  const g = G(pv.kids, { x: cvX(x), y: cvY(y), o });
  mk('circle', { r: TBL.ball.d / 2 * CV.k, fill: STG().blue }, g);
  return g;
}
function tsRun(pv, trace, t0, t1, { o = 1, onFrame } = {}) {
  const g = tsBall(pv, trace[0][0], trace[0][1], 0), n = trace.length - 1;
  show(g, t0, .12);
  prog(q => {
    const f = Math.max(0, Math.min(n, q * n)), i = Math.min(n, Math.floor(f)), u = f - i;
    const a = trace[i], b = trace[Math.min(n, i + 1)];
    put(g, { x: cvX(a[0] + (b[0] - a[0]) * u), y: cvY(a[1] + (b[1] - a[1]) * u) });
    if (onFrame) onFrame(f);
  }, t0, t1 - t0, lin);
  return g;
}
function tsDots(pv, trace, t0, { step = 4, o = .5, r = 2.6 } = {}) {
  const g = G(pv.kids, { o: 0 }), dots = [];
  for (let f = 0; f < trace.length; f += step) {
    const [x, y] = trace[f];
    const d = mk('circle', { r, fill: COL.muted, cx: cvX(x), cy: cvY(y), opacity: 0 }, g);
    dots.push([f, d]);
  }
  show(g, t0, .25);
  return { g, dots, upTo: (frame, t1) => prog(() => {}, t1, 0, lin) || null, reveal: frame => dots.forEach(([f, d]) => { if (f <= frame) put(d, { o }); }) };
}
function tsClear(els, t0, dur = .25) { els.forEach(e => e && hide(e, t0, dur)); }

// ---- the eight lesson cards: the module map, short names only (no numbers; numbers move on every renumber) ----
function tsCards(p, t0) {
  const g = G(p, { o: 0 }), out = [];
  for (let i = 0; i < 8; i++) {
    const c = G(g, { x: cardX(i), y: CARD.y + CARD.h / 2, o: 0 });
    c.bg = mk('rect', { x: -CARD.w / 2, y: -CARD.h / 2, width: CARD.w, height: CARD.h, rx: 10, fill: COL.panel, stroke: COL.raised, 'stroke-width': 2 }, c);
    c.name = tsText(c, CARD_NAMES[i], { x: 0, y: 9, size: 26, fill: COL.muted, weight: 600, anchor: 'middle', o: 0 });
    out.push(c);
  }
  show(g, t0, .4);
  return { g, out };
}
function tsCardOn(c, t0) { show(c.name, t0, .3); }
function tsCardFill(c, t0) {                        // this lesson is reached: lit, but no longer current
  tw(c.bg, { c_stroke: COL.purple }, t0, .3);
  tw(c.name, { c_fill: COL.text }, t0, .3);
}
function tsCardNow(c, t0) {                         // the lesson the video is on: a wash and a heavier outline
  tw(c.bg, { c_fill: mix(COL.panel, COL.purple, .55), 'a_stroke-width': 4 }, t0, .3);
  tw(c.name, { c_fill: COL.text }, t0, .3);
}
function tsCardDone(c, t0) {                        // was current, still reached
  tw(c.bg, { c_fill: COL.panel, 'a_stroke-width': 2 }, t0, .3);
}
function tsCardSet(i, t0) {
  const out = S.cards.out;
  if (S.cur != null && S.cur !== i) tsCardDone(out[S.cur], t0);
  tsCardFill(out[i], t0); tsCardNow(out[i], t0);
  S.cur = i;
}

// ---- narration marks: per-sentence marks only; `w` is the word clock for anything inside a sentence ----
// Every label keyed to the word clock goes through wAt, which records (beat, word, from, time) in TS_WORDKEYS so the e2e
// can assert each label's time equals the word clock's, to the millisecond.
const WORDS = window.TS_WORDS || {};
const wkey = s => s.toLowerCase().replace(/[^a-z0-9.-]/g, '');
function w(beat, text, from = 0) {
  const want = wkey(text);
  for (const [t, x] of WORDS[beat] || []) if (t >= from && wkey(x) === want) return t;
  return 0;
}
const WORDKEYS = []; window.TS_WORDKEYS = WORDKEYS;
function wAt(beat, text, fallback, from = 0) {
  const t = w(beat, text, from), at = t > 0 ? t : fallback;
  WORDKEYS.push([beat, text, from, at]);
  return at;
}
// The sketch's own line from draw(), at its own size: the labs all draw it, so the pane shows it too.
function tsPaneText(pv, t0) {
  const g = G(pv.kids, { o: 0 });
  const t = tsText(g, 'press R to drop the ball', { x: cvX(20), y: cvY(34), size: 14 * CV.k, fill: COL.text, font: MONO, weight: 400, o: 1 });
  t.setAttribute('text-rendering', 'geometricPrecision');
  const sc = tsText(g, 'score: 0', { x: cvX(250), y: cvY(60), size: 23, fill: COL.text, font: MONO, weight: 500, o: 1 });
  sc.setAttribute('text-rendering', 'geometricPrecision');
  g.score = sc;
  show(g, t0, .3);
  return g;
}

// ---- the course's own code, stage by stage (the lesson's text, indentation kept; comments and blank-run lines elided) ----
const DOC1 = [
  ELL,
  L(1, KW('let'), PU(' '), ID('ball'), PU(', '), ID('bumper'), PU(', '), ID('ground'), PU(', '), ID('goal'), PU(', '), ID('score'), PU(';')),
  BLANK,
  L(3, KW('function'), PU(' '), FN('setup'), PU('() {')),
  L(4, PU('  '), KW('new'), PU(' '), CL('Canvas'), PU('('), NU('400'), PU(', '), NU('400'), PU(');')),
  L(5, PU('  '), ID('world'), OP('.'), ID('gravity'), OP('.'), ID('y'), PU(' '), OP('='), PU(' '), NU('10', 'g10'), PU(';')),
  BLANK,
  L(7, PU('  '), ID('ball'), PU(' '), OP('='), PU(' '), KW('new'), PU(' '), CL('Sprite'), PU('('), NU('70'), PU(', '), NU('60'), PU(', '), NU('24', 'size'), PU(');')),
  L(8, PU('  '), ID('ball'), OP('.'), ID('color'), PU(' '), OP('='), PU(' '), SR("'deepskyblue'"), PU(';')),
  L(9, PU('  '), ID('ball'), OP('.'), ID('bounciness', 'bnm'), PU(' '), OP('='), PU(' '), NU('0.75', 'bv'), PU(';')),
  L(10, PU('  '), ID('score'), PU(' '), OP('='), PU(' '), NU('0'), PU(';')),
  L(11, PU('}')),
  ELL,
];
const DOC2 = [
  ELL,
  L(7, PU('  '), KW('const'), PU(' '), ID('leftWall'), PU(' '), OP('='), PU(' '), KW('new'), PU(' '), CL('Sprite'), PU('('), NU('5'), PU(', '), NU('200'), PU(', '), NU('10'), PU(', '), NU('400'), PU(', '), SR("'static'", 'st1'), PU(');')),
  L(8, PU('  '), ID('leftWall'), OP('.'), ID('color'), PU(' '), OP('='), PU(' '), SR("'gray'"), PU(';')),
  L(9, PU('  '), KW('const'), PU(' '), ID('rightWall'), PU(' '), OP('='), PU(' '), KW('new'), PU(' '), CL('Sprite'), PU('('), NU('395'), PU(', '), NU('200'), PU(', '), NU('10'), PU(', '), NU('400'), PU(', '), SR("'static'", 'st2'), PU(');')),
  L(10, PU('  '), ID('rightWall'), OP('.'), ID('color'), PU(' '), OP('='), PU(' '), SR("'gray'"), PU(';')),
  ELL,
  L(12, PU('  '), ID('ground'), PU(' '), OP('='), PU(' '), KW('new'), PU(' '), CL('Sprite'), PU('('), NU('250'), PU(', '), NU('385'), PU(', '), NU('280'), PU(', '), NU('20'), PU(', '), SR("'static'", 'st3'), PU(');')),
  L(13, PU('  '), ID('ground'), OP('.'), ID('color'), PU(' '), OP('='), PU(' '), SR("'gray'"), PU(';')),
  ELL,
];
const DOC3 = [
  ELL,
  L(12, PU('  '), ID('bumper'), PU(' '), OP('='), PU(' '), KW('new'), PU(' '), CL('Sprite'), PU('('), NU('140'), PU(', '), NU('115'), PU(', '), NU('200'), PU(', '), NU('14'), PU(', '), SR("'static'", 'st4'), PU(');')),
  L(13, PU('  '), ID('bumper'), OP('.'), ID('color'), PU(' '), OP('='), PU(' '), SR("'sienna'"), PU(';')),
  L(14, PU('  '), ID('bumper'), OP('.'), ID('rotation'), PU(' '), OP('='), PU(' '), NU('14', 'rot'), PU(';')),
  ELL,
];
const DOC5 = [
  ELL,
  L(19, PU('  '), ID('goal'), PU(' '), OP('='), PU(' '), KW('new'), PU(' '), CL('Sprite'), PU('('), NU('286'), PU(', '), NU('151'), PU(', '), NU('100'), PU(', '), NU('14'), PU(', '), SR("'static'", 'st5'), PU(');')),
  L(20, PU('  '), ID('goal'), OP('.'), ID('color'), PU(' '), OP('='), PU(' '), SR("'gold'", 'goldc'), PU(';')),
  L(21, PU('  '), ID('goal'), OP('.'), ID('rotation'), PU(' '), OP('='), PU(' '), NU('14', 'grot'), PU(';')),
  ELL,
];
const DOC6 = [
  ELL,
  L(29, KW('function'), PU(' '), FN('draw'), PU('() {')),
  L(30, PU('  '), FN('background'), PU('('), SR("'#222'"), PU(');')),
  ELL,
  L(33, PU('  '), FN('text'), PU('('), SR("'press R to drop the ball'"), PU(', '), NU('20'), PU(', '), NU('28'), PU(');')),
  L(34, PU('  '), FN('textSize'), PU('('), NU('22'), PU(');')),
  L(35, PU('  '), FN('text'), PU('('), SR("'score: '"), PU(' '), OP('+'), PU(' '), ID('score', 'sc'), PU(', '), NU('250'), PU(', '), NU('60'), PU(');')),
  L(33, PU('  '), KW('if'), PU(' '), PU('('), ID('ball'), OP('.'), FN('colliding', 'coll'), PU('('), ID('goal'), PU(')) {')),
  L(34, PU('    '), ID('score'), PU(' '), OP('+='), PU(' '), NU('1'), PU(';')),
  L(35, PU('  '), PU('}')),
  ELL,
];

const BEATS = [
  ['hello', 'Pinball: the table', (m, D) => {
    const p = panel(0);
    show(tsText(p, 'moSHion · Pinball', { x: 70, y: 74, size: 22, fill: COL.purple, weight: 600, o: 0 }), m('hi', -.1), .4);
    S.title = tsText(p, 'Pinball: the table', { x: 70, y: 124, size: 46, fill: COL.text, weight: 600, o: 0 });
    tw(S.title, { o: 1, y: 124 }, wAt('hello', 'pinball', m('mod', -.1)), .5, out); put(S.title, { y: 136 });
    S.sub = tsText(p, 'This video walks through the other eight lessons of this module.', { x: 70, y: 218, size: 30, fill: COL.muted, weight: 500, o: 0 });
    show(S.sub, m('map', .3), .4);
    hide(S.sub, m('l0', -.4), .3);
    S.pv = tsPane(p, m('mod', -.05));
    S.code = tsCodeShell(p);                       // hidden until the first lab
    S.docs = {}; S.cur = null;
    S.cards = tsCards(p, m('map', -.05));          // the map: eight cards, short names only
    S.cards.out.forEach((c, i) => { show(c, m('map', .02 + i * .04), .3); tsCardOn(c, m('map', .08 + i * .04)); });
    S.tbl = {
      walls: [tsPart(S.pv, TBL.left, GRAY()), tsPart(S.pv, TBL.right, GRAY())],
      ground: tsPart(S.pv, TBL.ground, GRAY()),
      bumper: tsPart(S.pv, TBL.bumper, SIENNA()),
      goal: tsPart(S.pv, TBL.goal, GOLD()),
      ball: tsBall(S.pv, TBL.ball.x, TBL.ball.y),
    };
    const T = S.tbl;
    S.ball0 = tsBall(S.pv, TBL.ball.x, TBL.ball.y, 0);   // one ball, reused by every lab beat
    [T.walls[0], T.walls[1], T.ground, T.bumper, T.goal, T.ball].forEach(e => put(e, { o: 0 }));
    [T.walls[0], T.walls[1], T.ground, T.bumper, T.goal, T.ball].forEach((e, k) => show(e, m('mod', .2 + k * .05), .3));
    // the finished table runs while the voice says so, at real speed; no clause trails the ball
    hide(T.ball, m('run', .3), .12);
    S.helloBall = tsRun(S.pv, TR.s4, m('run', .3), m('run', .3) + TR.s4.length / FPS);
    // the play-only reading is the lesson the video is on when it is named
    tsCardSet(0, m('l0', .05));
    tsHold(D);
  }],

  ['idea', 'A scene is not a game', (m, D) => {
    const p = S.panel, H = D, T = S.tbl;
    // the scene from the run stays on the pane; the goal arrives only when a game adds it
    hide(T.goal, m('p1', -.25), .25);
    S.ball0 = tsBall(S.pv, TBL.ball.x, TBL.ball.y, 0);
    show(S.ball0, m('p1', .2), .3);
    tsCardSet(1, m('p1', .05));
    tsCardSet(2, m('p2', .05));
    const chips = [['a goal', 300, 306, 'goal'], ['a score', 710, 306, 'score'], ['a way to lose', 300, 436, 'lose'], ['a way to start again', 710, 436, 'again']];
    S.gameHead = tsText(p, 'a game adds', { x: 300, y: 274, size: 24, fill: COL.purple, weight: 600, o: 0 });
    show(S.gameHead, m('game', .05), .3);
    S.chips = chips.map(([label, x, y, word]) => {
      const g = G(p, { o: 0 });
      mk('rect', { x, y, width: 380, height: 110, rx: 12, fill: COL.panel, stroke: COL.raised, 'stroke-width': 2 }, g);
      tsText(g, label, { x: x + 190, y: y + 66, size: 28, fill: COL.text, weight: 600, anchor: 'middle' });
      show(g, wAt('idea', word, m('game', .2)), .3);
      return g;
    });
    show(T.goal, wAt('idea', 'goal', m('game', .1)), .35);
    tsCardSet(3, m('ex', .1));
    S.hang = tsText(p, 'the table where all four will live', { x: 300, y: 600, size: 26, fill: COL.orange, weight: 600, o: 0 });
    show(S.hang, wAt('idea', 'table', m('table', .2)), .35);
    tsHold(H);
  }, { keep: true }],

  ['drop', 'Lab: Drop a bouncy ball', (m, D) => {
    const p = S.panel, C = S.code, H = D, T = S.tbl;
    tsClear([S.gameHead, ...S.chips, S.hang, S.sub], m('l4', -.25), .25);
    tsClear([T.walls[0], T.walls[1], T.ground, T.bumper, T.goal, T.ball, S.helloBall, S.ball0], m('l4', -.2), .25);
    tsCardSet(4, m('l4', .05));
    S.doc = tsNewDoc(C, DOC1, m('l4', .1), m('l4', -.2)); S.docs.drop = S.doc;
    S.paneText = tsPaneText(S.pv, m('l4', .15));
    // the lab's starting state: the ball is already on the canvas, at its start
    put(S.ball0, { x: cvX(TBL.ball.x), y: cvY(TBL.ball.y) });
    show(S.ball0, m('l4', .02), .1);
    // one size number makes a circle: the bracket and its label land on the words
    tsBarTo(C, 7, 1, m('s', .05));
    tsUnderSpan(S.doc, 'size', COL.purple, wAt('drop', 'size', m('s', .5)));
    S.one = G(S.pv.g, { o: 0 });
    const bx = cvX(TBL.ball.x), by = cvY(TBL.ball.y);
    draw(path(S.one, `M${bx - 13} ${by + 30}H${bx + 13}`, { stroke: COL.cyan, 'stroke-width': 2.5 }, { d: 0 }), wAt('drop', 'size', m('s', .5)), .4);
    draw(path(S.one, `M${bx - 13} ${by + 24}V${by + 36}M${bx + 13} ${by + 24}V${by + 36}`, { stroke: COL.cyan, 'stroke-width': 2.5 }, { d: 0 }), wAt('drop', 'size', m('s', .6)), .3);
    show(tsText(S.one, '24', { x: bx, y: by + 66, size: 22, fill: COL.cyan, font: MONO, weight: 600, anchor: 'middle', o: 0 }), wAt('drop', 'twenty-four', m('s', 2.2)), .3);
    show(S.one, wAt('drop', 'size', m('s', .5)), .3);
    hide(S.one, m('b', -.1), .2);
    // bounciness, and what 0.75 means (the note lands on "keeps")
    tsBarTo(C, 9, 1, m('b', .05));
    tsUnderSpan(S.doc, 'bv', COL.purple, wAt('drop', 'zero', m('b', .5)));
    S.keep = tsText(p, 'a bounce keeps three quarters of its speed', { x: ZONE.x, y: ZONE.y + 34, size: 24, fill: COL.orange, weight: 500, o: 0 });
    show(S.keep, wAt('drop', 'keeps', m('b', 2.9)), .35);
    tsPress(C, p, m('run'), .5);
    tsClear([S.one, S.keep], m('run', .05), .12);
    hide(S.ball0, m('run', .05), .12);
    S.fall = tsRun(S.pv, TR.s1, m('run', .35), m('run', .35) + (TR.s1.length / FPS) / .62);
    S.slow2 = tsText(p, 'slow motion', { x: PANE.x + PANE.w - 4, y: PANE.y + PANE.h - 14, size: 22, fill: COL.muted, weight: 500, anchor: 'end', o: 0 });
    show(S.slow2, m('run', -.1), .3);
    hide(S.slow2, m('off', .2), .3);
    S.nofloor = tsText(p, 'no floor: it never lands', { x: PANE.x + 10, y: PANE.y + PANE.h - 14, size: 22, fill: COL.muted, weight: 500, o: 0 });
    show(S.nofloor, wAt('drop', 'lands', m('off', .6)), .35);
    hide(C.bar, H - .3, .3);
    tsHold(H);
  }, { keep: true }],

  ['walls', 'Lab: Walls and a ground', (m, D) => {
    const p = S.panel, C = S.code, H = D, T = S.tbl;
    tsClear([S.nofloor, S.slow2, S.fall], m('l5', -.25), .3);
    tsCardSet(5, m('l5', .05));
    S.doc = tsNewDoc(C, DOC2, m('l5', .1), m('l5', -.2)); S.docs.walls = S.doc;
    put(S.ball0, { x: cvX(TBL.ball.x), y: cvY(TBL.ball.y) });
    show(S.ball0, m('l5', .02), .1);
    show(T.walls[0], m('w', .15), .35); show(T.walls[1], m('w', .25), .35);
    tsBarTo(C, 1, 4, m('w', .05));
    tsUnderSpan(S.doc, 'st1', COL.orange, m('s', .1));
    tsUnderSpan(S.doc, 'st2', COL.orange, m('s', .25));
    S.static = tsText(p, 'static: it never moves', { x: ZONE.x, y: ZONE.y + 34, size: 24, fill: COL.orange, weight: 500, o: 0 });
    show(S.static, wAt('walls', 'never', m('s', .55)), .3);
    hide(S.static, m('g', -.3), .3);
    show(T.ground, m('g', .15), .35);
    tsBarTo(C, 6, 2, m('g', .0));
    tsUnderSpan(S.doc, 'st3', COL.orange, m('g', .45));
    // x = 110, on the word, with the arithmetic that produces it
    S.ruler = G(S.pv.g, { o: 0 });
    const gy = cvY(TBL.ground.y - TBL.ground.h / 2) - 18;
    const tr = wAt('walls', 'hundred', m('g', .5));
    draw(path(S.ruler, `M${cvX(13)} ${gy}H${cvX(110)}`, { stroke: COL.cyan, 'stroke-width': 2.5 }, { d: 0 }), tr, .5);
    draw(path(S.ruler, `M${cvX(110)} ${gy - 9}V${gy + 9}`, { stroke: COL.cyan, 'stroke-width': 2.5 }, { d: 0 }), tr + .25, .3);
    show(tsText(S.ruler, '110', { x: cvX(55), y: gy - 26, size: 22, fill: COL.cyan, font: MONO, weight: 600, anchor: 'middle', o: 0 }), tr + .2, .3);
    show(tsText(S.ruler, '250 − 280/2', { x: cvX(17), y: gy - 58, size: 22, fill: COL.muted, font: MONO, weight: 500, o: 0 }), tr + .35, .3);
    show(S.ruler, tr, .3);
    // the drain, on the word "drain"
    S.drain = G(S.pv.g, { o: 0 });
    tsText(S.drain, 'the drain', { x: cvX(58), y: cvY(400) + 42, size: 22, fill: COL.muted, weight: 600, anchor: 'middle' });
    tsArrow(S.drain, cvX(58), cvY(400) + 20, cvX(58), cvY(396), COL.muted, wAt('walls', 'drain', m('gap', .3)), .4, 3);
    show(S.drain, wAt('walls', 'drain', m('gap', .3)), .3);
    tsPress(C, p, m('run'), .5);
    tsClear([S.ruler, S.drain], m('run', .05), .12);
    hide(S.ball0, m('run', .05), .12);
    S.through = tsRun(S.pv, TR.s2, m('run', .2), m('run', .2) + (TR.s2.length / FPS) / .85);
    hide(C.bar, H - .3, .3);
    tsHold(H);
  }, { keep: true }],

  ['bumper', 'Lab: A tilted bumper', (m, D) => {
    const p = S.panel, C = S.code, H = D, T = S.tbl;
    tsClear([S.through], m('l6', -.25), .3);
    tsCardSet(6, m('l6', .05));
    S.doc = tsNewDoc(C, DOC3, m('l6', .1), m('l6', -.2)); S.docs.bumper = S.doc;
    put(S.ball0, { x: cvX(TBL.ball.x), y: cvY(TBL.ball.y) });
    show(S.ball0, m('l6', .02), .1);
    put(T.bumper, { r: 0, o: 0 });
    show(T.bumper, m('l6', .25), .3);                       // flat, and seen flat
    tsBarTo(C, 1, 1, m('l6', .1));
    const u4 = tsUnderSpan(S.doc, 'st4', COL.orange, m('l6', .5));
    hide(u4, m('b', 1.1), .3);
    tw(T.bumper, { r: 14 }, m('b', .1), .8, out);          // "A tilted bumper" is spoken as it tilts
    tsBarTo(C, 3, 1, m('b', .1));
    tsUnderSpan(S.doc, 'rot', COL.purple, wAt('bumper', 'fourteen', m('b', .8)));
    S.tilt = tsText(p, 'a flat bar, turned into a slope', { x: ZONE.x, y: ZONE.y + 34, size: 24, fill: COL.purple, weight: 500, o: 0 });
    show(S.tilt, wAt('bumper', 'slope', m('b', 2.6)), .3);
    tsPress(C, p, m('run'), .5);
    tsClear([S.tilt], m('run', .05), .12);
    // the ball rolls to the bumper's low end and ARRIVES on "It leaves the bumper": the run ends there,
    // and the dotted path (shown below) carries where it went afterwards
    hide(S.ball0, m('run', .05), .1);
    S.roll = tsRun(S.pv, TR.s3.slice(0, 140), m('run', .05), wAt('bumper', 'reaches', m('off', -.2)) - .05);
    S.dots = tsDots(S.pv, TR.s3, wAt('bumper', 'dotted', m('path', .1)));
    S.dots.dots.forEach(([f, d]) => put(d, { o: .5 }));
    S.helper = tsText(p, 'a helper, not your sketch', { x: PANE.x + 10, y: PANE.y + PANE.h - 14, size: 22, fill: COL.muted, weight: 500, o: 0 });
    show(S.helper, wAt('bumper', 'dotted', m('path', .5)), .3);
    S.slow = tsText(p, 'slow motion', { x: PANE.x + PANE.w - 4, y: PANE.y + PANE.h - 14, size: 22, fill: COL.muted, weight: 500, anchor: 'end', o: 0 });
    show(S.slow, m('run', -.1), .3);
    // x = 240: the low end, marked on the word, its label clear of the dotted path
    S.mark240 = G(S.pv.g, { o: 0 });
    const mx = cvX(240), my = cvY(139);
    draw(path(S.mark240, `M${mx} ${my}V${my + 22}`, { stroke: COL.orange, 'stroke-width': 3 }, { d: 0 }), wAt('bumper', 'forty', m('off', .3)), .4);
    show(tsText(S.mark240, 'x = 240', { x: mx - 12, y: my + 46, size: 22, fill: COL.orange, font: MONO, weight: 600, anchor: 'end', o: 0 }), m('off', .25), .3);
    show(S.mark240, wAt('bumper', 'forty', m('off', .3)), .3);
    hide(C.bar, H - .3, .3);
    tsHold(H);
  }, { keep: true }],

  ['goal', 'Lab: Put a goal on the table', (m, D) => {
    const p = S.panel, C = S.code, H = D, T = S.tbl;
    tsClear([S.roll, S.dots.g, S.helper, S.slow, S.mark240, S.ball0], m('l7', -.25), .3);
    tsCardSet(7, m('l7', .05));
    S.doc = tsNewDoc(C, DOC5, m('l7', .1), m('l7', -.2)); S.docs.goal = S.doc;
    put(S.ball0, { x: cvX(TBL.ball.x), y: cvY(TBL.ball.y) });
    show(S.ball0, m('l7', .02), .1);
    put(T.goal, { r: 0, o: 0 });
    show(T.goal, wAt('goal', 'golden', m('g', 1.1)), .3);      // the bar turns gold on the word "golden"
    tsBarTo(C, 1, 1, m('g', .05));
    tsUnderSpan(S.doc, 'st5', COL.orange, wAt('goal', 'static', m('g', .5)));
    tsUnderSpan(S.doc, 'goldc', COL.yellow, wAt('goal', 'golden', m('g', 1.1)));
    tw(T.goal, { r: 14 }, wAt('goal', 'tilted', m('g', 1.4)), .8, out);
    tsBarTo(C, 3, 1, wAt('goal', 'tilted', m('g', 1.4)));
    S.dots = tsDots(S.pv, TR.s3, wAt('goal', 'dotted', m('pl', .1)));   // the bumper lab's path, no goal yet
    S.dots.dots.forEach(([f, d]) => put(d, { o: .5 }));
    S.helper = tsText(p, 'a helper, not your sketch', { x: PANE.x + 10, y: PANE.y + PANE.h - 14, size: 22, fill: COL.muted, weight: 500, o: 0 });
    show(S.helper, wAt('goal', 'dotted', m('pl', .5)), .3);
    tsPress(C, p, m('run'), .5);
    tsClear([S.dots.g, S.helper], m('run', .05), .15);
    hide(S.ball0, m('run', .05), .12);
    S.slow5 = tsText(p, 'slow motion', { x: PANE.x + PANE.w - 4, y: PANE.y + PANE.h - 14, size: 22, fill: COL.muted, weight: 500, anchor: 'end', o: 0 });
    show(S.slow5, m('run', -.1), .3);
    hide(S.slow5, m('n', .2), .3);
    // (a) down the bumper to its low end, arriving as "bumper" ends in "rolls off the bumper"; no hold after it.
    const lip = wAt('goal', 'bumper', 11.9) + .45;
    S.rollA = tsRun(S.pv, TR.s4.slice(0, 129), m('run', .05), lip);
    // (b) straight on from the lip: on the gold for "across the golden bar", off it on "bar"
    const goldOut = wAt('goal', 'bar', 13.8, 12.5);
    S.roll = tsRun(S.pv, TR.s4.slice(128, 232), lip, lip + (goldOut - lip) * (231 - 128) / (168 - 128));
    hide(S.rollA, lip, .12);
    S.nolook = tsText(p, 'no score yet: nothing is checking', { x: ZONE.x, y: ZONE.y + 34, size: 24, fill: COL.orange, weight: 500, o: 0 });
    show(S.nolook, wAt('goal', 'looking', m('n', .3)), .35);
    hide(C.bar, H - .3, .3);
    tsHold(H);
  }, { keep: true }],

  ['close', 'It counts, but wrongly', (m, D) => {
    const p = S.panel, C = S.code, H = D;
    tsClear([S.roll, S.rollA, S.dots.g, S.helper, S.slow5, S.nolook], m('sc', -.25), .3);
    if (S.doc) hide(S.doc.g, m('sc', -.25), .25);
    S.doc = tsDoc(C.marks, DOC6, true); S.docs.close = S.doc;
    tsCodeIn(C, m('sc', -.1), DOC6.length);
    [0, 1, 2, 3, 4, 5, 6].forEach(i => show(S.doc.rows[i], m('sc', .05), .3));
    [7, 8, 9, 10].forEach(i => show(S.doc.rows[i], m('sc', 1.15), .3));
    tsBarTo(C, 6, 1, m('sc', .1));
    tsCardSet(3, wAt('close', 'worked', m('sc', .2)));   // the card follows the words: this is the worked example
    hide(S.paneText.score, m('race', -.45), .2);          // the pane's score stays up until the live one takes over
    S.scoreG = G(S.pv.kids, { o: 0 });
    S.scoreT = tsText(S.scoreG, 'score: 0', { x: cvX(250), y: cvY(60), size: 23, fill: COL.text, font: MONO, weight: 500, o: 1 });
    S.scoreT.style.transformBox = 'fill-box'; S.scoreT.style.transformOrigin = 'center';
    show(S.scoreG, m('race', -.4), .3);
    tsBarTo(C, 7, 3, m('sc', 1.2));
    put(S.ball0, { x: cvX(TBL.ball.x), y: cvY(TBL.ball.y) });
    show(S.ball0, m('sc', .1), .3);
    tsPress(C, p, m('race'), .5);
    hide(S.ball0, m('race', -.1), .12);
    tsBump(S.tbl.goal, wAt('close', 'bar', m('why', .6)), 1.06);
    S.score = 0;
    const run = tsRun(S.pv, TR.s4, m('race', .05), m('race', .05) + TR.s4.length / FPS, {
      onFrame: f => {
        const s = Math.max(0, Math.min(33, Math.floor(f) - 136 + 1));
        if (s !== S.score) { S.score = s; if (S.scoreT) S.scoreT.textContent = 'score: ' + s; }
      },
    });
    S.runBall = run;
    S.why = G(p, { o: 0 });
    tsRuns(S.why, [['33 frames', COL.text, 600, MONO], ['  ×  ', COL.muted, 500, MONO], ['1 point', COL.text, 600, MONO], ['  =  ', COL.muted, 500, MONO], ['33', COL.purple, 600, MONO]], { x: ZONE.x, y: ZONE.y + 34, size: 26, anchor: 'start' });
    show(S.why, wAt('close', 'frames', m('why', 1.0)), .35);
    // the 33 contact frames replayed slowly on the bar, the counter running 1..33, on "touched the golden bar"
    const c0 = wAt('close', 'touched', m('why', .3));
    hide(run, c0, .2);
    S.rep = tsRun(S.pv, TR.s4.slice(136, 169), c0, c0 + 1.8, {
      onFrame: i => { const k = Math.min(33, Math.max(1, Math.round(i) + 1)); if (S.scoreT) S.scoreT.textContent = 'score: ' + k; },
    });
    tsBump(S.scoreT, c0 + 1.8, 1.15);
    // the end card: every line on the word that says it; the pane/code/strip hold until the first row arrives
    const cardAt = wAt('close', 'table', m('next', .1));
    tsClear([S.code, S.pv.g, S.cards.g, S.why, S.scoreG], cardAt - .05, .35);
    S.card = G(p);
    const row = (runs, y, t0, size = 40, weight = 600) => { const t = tsRuns(S.card, runs, { x: 800, y, size, weight, o: 0 }); tw(t, { o: 1, y }, t0, .45, out); put(t, { y: y + 10 }); return t; };
    row([['The table is complete', COL.text, 600]], 268, cardAt, 44);
    row([['and the score counts too much', COL.muted, 500]], 340, wAt('close', 'much', m('next', .8)), 32);
    show(tsText(S.card, 'UP NEXT', { x: 800, y: 460, size: 22, fill: COL.purple, weight: 600, anchor: 'middle', o: 0 }), m('m4', -.1), .35);
    row([['Pinball: score once', COL.text, 600]], 516, wAt('close', 'pinball', m('m4', .7)), 36);
    row([['it fixes it', COL.muted, 500]], 580, wAt('close', 'fixes', m('m4', 1.9)), 30);
    tsHold(H);
  }, { keep: true }],
].map(([id, title, run, extra]) => ({ id, title, run, ...extra }));

// ---- SH: bottom-left, never the subject. Every expression change lands on a narration mark. ----
const CODEC = [600, 340], PANEC = [1350, 360], RUNC = [1056, 172], CARDC = [700, 690], ZONEC = [700, 620];
bindActs({
  hello: { act: (t, m, D, s, MV) => {
    s.pose = 'down';
    emo(t, s, [[0, { expr: 'delighted', amp: 1.15, look: PANEC }],
      [m('mod', -.1), { expr: 'curious', tilt: 6, look: PANEC }],
      [m('map', -.1), { expr: 'determined', tilt: 0, look: CARDC, pose: 'point' }],
      [m('l0', -.1), { expr: 'curious', tilt: -5, look: CARDC }],
      [m('run', -.1), { expr: 'delighted', amp: 1.15, look: PANEC, pose: 'down' }]]);
    MV.wave(t, s, m('hi', -.15), 1.9);
  } },
  idea: { act: (t, m, D, s) => {
    s.pose = 'pointUp';
    emo(t, s, [[0, { expr: 'determined', look: CODEC }],
      [m('p1', -.1), { expr: 'curious', tilt: 5, look: CARDC, pose: 'point' }],
      [m('p2', -.1), { expr: 'determined', tilt: 0, look: CARDC }],
      [m('game', -.1), { expr: 'surprise', amp: 1, look: CODEC }],
      [m('table', -.1), { expr: 'delighted', amp: 1.1, look: [600, 540], pose: 'point' }]]);
  } },
  drop: { act: (t, m, D, s) => {
    s.pose = 'pointUp';
    emo(t, s, [[0, { expr: 'determined', look: CODEC }],
      [m('s', -.1), { expr: 'curious', tilt: 5, look: CODEC }],
      [m('b', -.1), { expr: 'curious', tilt: -4, look: ZONEC, pose: 'point' }],
      [m('run', -.1), { expr: 'determined', look: RUNC }],
      [m('off', -.1), { expr: 'curious', tilt: 5, look: ZONEC }]]);
    kick.lean(t, s, m('run', .3), .5, .5);
  } },
  walls: { act: (t, m, D, s) => {
    s.pose = 'point';
    emo(t, s, [[0, { expr: 'determined', look: CODEC }],
      [m('w', -.1), { expr: 'curious', tilt: 5, look: PANEC }],
      [m('s', -.1), { expr: 'determined', tilt: 0, look: CODEC }],
      [m('g', -.1), { expr: 'curious', tilt: -5, look: PANEC }],
      [m('gap', -.1), { expr: 'surprise', amp: 1, look: PANEC, pose: 'pointUp' }],
      [m('run', -.1), { expr: 'determined', look: RUNC }]]);
  } },
  bumper: { act: (t, m, D, s) => {
    s.pose = 'down';
    emo(t, s, [[0, { expr: 'determined', look: PANEC }],
      [m('b', -.1), { expr: 'curious', tilt: 6, look: PANEC }],
      [m('run', -.1), { expr: 'determined', look: RUNC }],
      [m('path', -.1), { expr: 'curious', tilt: -5, look: PANEC }],
      [m('off', -.1), { expr: 'curious', tilt: 5, look: ZONEC }]]);
    kick.lean(t, s, m('run', .5), .5, .5);
  } },
  goal: { act: (t, m, D, s) => {
    s.pose = 'point';
    emo(t, s, [[0, { expr: 'determined', look: PANEC }],
      [m('g', .3), { expr: 'surprise', amp: 1, look: PANEC, pose: 'pointUp' }],
      [m('pl', -.1), { expr: 'curious', tilt: 0, look: PANEC }],
      [m('run', -.1), { expr: 'determined', look: RUNC }],
      [m('n', -.1), { expr: 'curious', tilt: 5, look: ZONEC }]]);
  } },
  close: { act: (t, m, D, s, MV) => {
    s.pose = 'down';
    emo(t, s, [[0, { expr: 'determined', look: CODEC }],
      [m('sc', 1.0), { expr: 'curious', tilt: 5, look: CODEC }],
      [m('race', -.1), { expr: 'surprise', amp: 1, look: PANEC, pose: 'pointUp' }],
      [m('why', -.1), { expr: 'curious', tilt: 0, look: ZONEC, pose: 'point' }],
      [m('next', -.1), { expr: 'proud', amp: 1.05, look: [800, 300], pose: 'down' }],
      [m('m4', -.1), { expr: 'delighted', amp: 1.1, look: [800, 520] }]]);
    MV.wave(t, s, m('bye', -.15), 1.9);
  } },
});
boot();
