// moshion-5.1.2-style: the FULL concept explainer for shCode lesson 5.1.2 "Your first moSHion sketch" (built in place from the
// approved style sample; see ../STYLE.md). Seven beats, one play-through, no questions:
//   hello   cold open: SH waves, the title and the four-line sketch come in; "two lines" lights lines 2 and 3.     (approved)
//   canvas  `new Canvas(400, 400)`: the canvas (defined), width, height, pixels (defined), x and y (defined), then the origin.
//   sprite  `new Sprite(200, 200)`: the sprite pops in at the middle; x, y and coordinates (defined).
//   run     the explanation picture clears and the student's PREVIEW PANE takes its place ("Click Run to execute your
//           sketch."); Run (defined) appears in the tab strip; the dimmed wrapper is outlined as a box (setup, explained in
//           5.1.3); the pointer presses Run and the sprite appears in the pane. The canvas edge is a dashed HELPER (the real
//           preview shows only the square), and the narration says so.
//   cycle   edit 200 -> 100; the sketch has NOT changed yet; predict (x smaller: left, y smaller: up); press Run again; only
//           the sketch's contents restart (the pane and the helper edge stay), the sprite pops at (100, 100); a dashed square
//           marks the old spot ("your sketch doesn't draw it"); change -> Run -> look.
//   size    an EXPLANATION picture, not a run: keep the width at 400, make the height 300; a dashed helper outline shrinks to
//           400 x 300. No press (the real runner re-centres a 400 x 300 canvas, so the square would move DOWN 50 px); the
//           narration says so.
//   close   a cut to the end card: what was made, then "Up next: 5.1.3 Reading", setup() and draw() named, SH waves.
// setup()/draw()/frames are taught in 5.1.3 and 5.1.12: the wrapper is only named, never explained.
// moSHion's default gravity is 0, so nothing falls; a re-run restarts the sketch, so the sprite never slides between runs.
// Colour meaning: x things (x, width) cyan; y things (y, height) orange; code as shCode's editor colours it.
// Every colour comes from lib/tokens.js. Helper names are prefixed ms: lib globals (frame, label, X, NEG, ...) must not be shadowed.
'use strict';
const CHAPTER = { number: 1, type: 'explainer', title: 'Your first moSHion sketch', kicker: 'moSHion · 5.1.2',
  meta: 'Under 3 minutes, with sound and captions. One play-through, no questions.', minutes: 3, language: 'en', coverGo: 'Play' };

// ---- layout (stage px, 1600x900; y >= 780 is the caption bar's, the bottom-left corner is the character's) ----
const CODE = { x: 70, y: 170, w: 700, head: 44, size: 34, lh: 60, gut: 118, x0: 150 };
const codeBase = i => CODE.y + CODE.head + 46 + i * CODE.lh;            // baselines 260 320 380 440
const CODE_H = codeBase(3) + 30 - CODE.y;                               // panel ends at y 470
const CV = { x: 880, y: 150, k: 1.4, n: 400 };                           // the moSHion canvas: 400 units drawn 560 px
const cvX = u => CV.x + u * CV.k, cvY = v => CV.y + v * CV.k, CV_S = CV.n * CV.k;
const SPRITE = 50;                                                       // new Sprite(x, y) with no size is 50 x 50 (moshion.js)
const HALF = SPRITE / 2 * CV.k;                                          // 35 stage px
const RUNB = { x: 646, y: 176, w: 110, h: 32 };                          // shCode's Run button, at the right of the editor's tab strip
const RUN_C = [RUNB.x + RUNB.w / 2, RUNB.y + RUNB.h / 2];                // (701, 192)
// The preview pane (runner.html: a #111 page with the canvas centred in it), centred on the 400 x 400 canvas.
const PANE = { x: 860, y: 130, w: 600, h: 600 };
// The pointer: it comes in from the gap between the editor and the pane (never over code) and its tip lands on the button's
// left end, by the play triangle, so the whole arrow sits left of the word "Run" while the voice says it.
const PTR_FROM = [800, 300], PTR_AT = [RUN_C[0] - 35, RUN_C[1] + 6];
// The four lines, tagged the way shCode's editor (lezer javascript + draculaHighlight) tags them.
const LINES = [
  [['function', 'keyword'], [' ', 'punct'], ['setup', 'fn'], ['() {', 'punct']],
  [['  ', 'punct'], ['new', 'keyword'], [' ', 'punct'], ['Canvas', 'cls'], ['(', 'punct'], ['400', 'num', 'w'], [', ', 'punct'], ['400', 'num', 'h'], [');', 'punct']],
  [['  ', 'punct'], ['new', 'keyword'], [' ', 'punct'], ['Sprite', 'cls'], ['(', 'punct'], ['200', 'num', 'sx'], [', ', 'punct'], ['200', 'num', 'sy'], [');', 'punct']],
  [['}', 'punct']],
];
const WRAP = .42;                                                        // opacity of the setup() wrapper: shown, not taught yet

// ---- drawing helpers ----
// Column positions come from the rendered SVG text itself (a canvas measureText came out ~1 px per column short).
const msColL = (i, c) => CODE.x0 + S.code.texts[i].getStartPositionOfChar(c).x;   // left edge of column c on line i
const msColR = (i, c) => CODE.x0 + S.code.texts[i].getEndPositionOfChar(c).x;     // right edge of column c on line i
const msMid = (i, c0, c1) => (msColL(i, c0) + msColR(i, c1 - 1)) / 2;
const AP = () => TOKS().app, STG = () => TOKS().stage;
// Every video helper (something Run does not draw) is one style: the ghost colour, dashed 8 7, 2.5 px.
const HELP = () => ({ stroke: AP().ghost, 'stroke-width': 2.5, 'stroke-dasharray': '8 7', fill: 'none' });
function msText(p, str, { x, y, size = 26, fill = COL.text, weight = 500, anchor = 'start', font = UI, o = 1, italic = false }) {
  const t = T(p, str, { x, y, size, fill, weight, anchor, font, o });
  if (italic) t.setAttribute('font-style', 'italic');
  return t;
}
// A text made of coloured runs: [[str, fill, weight?, font?], ...].
// Each run is [str, fill, weight?, font?, size?]; the tspans are kept on t.runs (a word can fade in on its own mark).
function msRuns(p, runs, { x, y, size = 34, anchor = 'middle', font = UI, o = 1, weight = 500 }) {
  const t = msText(p, '', { x, y, size, anchor, font, o, weight });
  t.runs = runs.map(([s, f, w, fnt, sz]) => {
    const e = mk('tspan', { fill: f }, t);
    if (w) e.setAttribute('font-weight', w); if (fnt) e.setAttribute('font-family', fnt); if (sz) e.setAttribute('font-size', sz);
    e.textContent = s; return e;
  });
  return t;
}
// Fade tspans of t in on their own times: [[index, t0], ...] (fill-opacity, since a tspan takes no opacity of its own).
function msWords(t, steps) { t.runs.forEach(e => e.setAttribute('fill-opacity', 0)); for (const [i, t0] of steps) tw(t.runs[i], { 'a_fill-opacity': 1 }, t0, .35); }
// A lit-line bar (the editor's #44475a with a 5 px purple stripe) covering `n` lines from line i.
function msLitBar(p, i, n, o = 0) {
  const SX = TOKS().syntax, b = G(p, { o, y: codeBase(i) });
  mk('rect', { x: CODE.x + 2, y: -44, width: CODE.w - 4, height: 60 * n, fill: SX.lineBg }, b);
  mk('rect', { x: CODE.x + 2, y: -44, width: 5, height: 60 * n, fill: SX.lineMark }, b);
  return b;
}
// The editor: a panel, a script.js tab, shCode's Run button (hidden until the 'run' beat), gutter numbers, four syntax-coloured
// lines, a highlight bar for the lit line and a two-line bar for "just two lines".
function msCode(p, t0) {
  const SX = TOKS().syntax, A = AP(), g = G(p, { o: 0 });
  mk('rect', { x: CODE.x, y: CODE.y, width: CODE.w, height: CODE_H, rx: 14, fill: SX.bg, stroke: SX.edge, 'stroke-width': 2 }, g);
  path(g, `M${CODE.x} ${CODE.y + CODE.head}H${CODE.x + CODE.w}`, { stroke: SX.edge, 'stroke-width': 2 });
  msText(g, 'script.js', { x: CODE.x + 26, y: CODE.y + 29, size: 20, fill: COL.muted, font: UI, weight: 500 });
  path(g, `M${CODE.x + 14} ${CODE.y + CODE.head - 1}H${CODE.x + 132}`, { stroke: COL.purple, 'stroke-width': 3 });
  const run = G(g, { x: RUN_C[0], y: RUN_C[1], s: 0, o: 0 });
  const runBg = mk('rect', { x: -RUNB.w / 2, y: -RUNB.h / 2, width: RUNB.w, height: RUNB.h, rx: 5, fill: A.run }, run);
  path(run, 'M-31 -8L-31 8L-18 0Z', { fill: A.runText, stroke: A.runText, 'stroke-width': 1.5 });
  const runLabel = msText(run, 'Run', { x: -9, y: 8, size: 21, fill: A.runText, weight: 600 });
  const washes = G(g);                                                   // behind the lines (the 'run' beat's wrapper washes)
  const pair = msLitBar(g, 1, 2);                                        // "just two lines": lines 2 and 3 together
  const bar = msLitBar(g, 1, 1);                                         // the highlight bar, moved by y
  const spans = {}, texts = [], lines = LINES.map((toks, i) => {
    const row = G(g, { o: i === 0 || i === 3 ? WRAP : 1 });
    msText(row, String(i + 1), { x: CODE.gut, y: codeBase(i), size: 26, fill: SX.gutter, font: MONO, anchor: 'end', weight: 400 });
    const t = msText(row, '', { x: CODE.x0, y: codeBase(i), size: CODE.size, font: MONO, weight: 400 });
    texts.push(t);
    for (const [str, kind, id] of toks) {
      const sp = mk('tspan', { fill: SX[kind] }, t);
      if (kind === 'cls') sp.setAttribute('font-style', 'italic');
      sp.textContent = str;
      if (id) spans[id] = sp;
    }
    return row;
  });
  show(g, t0, .5);
  return { g, bar, pair, lines, spans, texts, run, runBg, runLabel, washes };
}
// An underline under columns [c0, c1) of line i, drawn left to right.
function msUnder(p, i, c0, c1, color, t0) {
  const y = codeBase(i) + 9, e = path(p, `M${msColL(i, c0) + 1} ${y}H${msColR(i, c1 - 1) - 1}`, { stroke: color, 'stroke-width': 4 }, { d: 0 });
  draw(e, t0, .4);
  return e;
}
// An arrow from (x1,y1) to (x2,y2): the shaft draws, the head appears as it lands.
function msArrow(p, x1, y1, x2, y2, color, t0, dur = .7, w = 3.5) {
  const g = G(p), a = Math.atan2(y2 - y1, x2 - x1), L = 16;
  draw(path(g, `M${x1} ${y1}L${x2} ${y2}`, { stroke: color, 'stroke-width': w }, { d: 0 }), t0, dur);
  const hd = path(g, `M${x2 - L * Math.cos(a - .5)} ${y2 - L * Math.sin(a - .5)}L${x2} ${y2}L${x2 - L * Math.cos(a + .5)} ${y2 - L * Math.sin(a + .5)}`,
    { stroke: color, 'stroke-width': w }, { o: 0 });
  show(hd, t0 + dur * .8, .15);
  return g;
}
// An edit in the code: a purple flash behind columns [c0, c1) of line i; the spans read `to` from the flash's peak.
function msEdit(C, i, c0, c1, ids, to, t0) {
  const flash = mk('rect', { x: msColL(i, c0) - 5, y: codeBase(i) - 34, width: msColR(i, c1 - 1) - msColL(i, c0) + 10, height: 44, rx: 6, fill: COL.purple }, null);
  C.lines[i].insertBefore(flash, C.lines[i].children[1]); put(flash, { o: 0 });
  tw(flash, { o: .45 }, t0, .2); tw(flash, { o: 0 }, t0 + .45, .45);
  const from = ids.map(id => C.spans[id].textContent);
  prog(q => ids.forEach((id, k) => { C.spans[id].textContent = q < .5 ? from[k] : to; }), t0 + .05, .4, lin);
}
// The EXPLANATION picture of the canvas (the 'canvas' and 'sprite' beats): what the line will make, drawn to explain it. A
// #111 square with a #6272a4 outline, a grid every 50 units (stronger every 100) and ticks every 100. Not what Run shows.
function msStage(p, wU = 400, hU = 400) {
  const ST = STG(), g = G(p), R = { g, wU, hU }, W = wU * CV.k, H = hU * CV.k;
  R.fill = mk('rect', { x: CV.x, y: CV.y, width: W, height: H, fill: ST.bg }, G(g, { o: 0 }));
  R.fillG = R.fill.parentNode;
  R.grid = G(g, { o: 0 });
  for (let u = 50; u < wU; u += 50)
    path(R.grid, `M${cvX(u)} ${CV.y}V${CV.y + H}`, { stroke: ST.grid, 'stroke-opacity': u % 100 ? ST.gridA : ST.gridMajorA, 'stroke-width': 1.5 });
  for (let v = 50; v < hU; v += 50)
    path(R.grid, `M${CV.x} ${cvY(v)}H${CV.x + W}`, { stroke: ST.grid, 'stroke-opacity': v % 100 ? ST.gridA : ST.gridMajorA, 'stroke-width': 1.5 });
  R.outline = path(g, `M${CV.x} ${CV.y}H${CV.x + W}V${CV.y + H}H${CV.x}Z`, { stroke: ST.outline, 'stroke-width': 2 }, { d: 0 });
  R.xt = {}; R.yt = {};
  for (let u = 100; u <= wU; u += 100)
    R.xt[u] = msText(g, String(u), { x: cvX(u), y: CV.y - 14, size: 22, fill: ST.tick, font: MONO, anchor: 'middle', weight: 400, o: 0 });
  for (let v = 100; v <= hU; v += 100)
    R.yt[v] = msText(g, String(v), { x: CV.x - 12, y: cvY(v) + 8, size: 22, fill: ST.tick, font: MONO, anchor: 'end', weight: 400, o: 0 });
  R.origin = G(g, { o: 0 });
  mk('circle', { cx: CV.x, cy: CV.y, r: 7, fill: COL.text }, R.origin);
  msText(R.origin, '(0, 0)', { x: CV.x - 14, y: CV.y - 14, size: 22, fill: COL.text, font: MONO, anchor: 'end', weight: 400 });
  return R;
}
// A dimension line with its label in a gap at the middle: horizontal under a canvas hU units tall, or vertical to its right.
function msDim(p, horiz, color, t0, lab, hU = CV.n) {
  const g = G(p), gap = horiz ? 66 : 32, sw = { stroke: color, 'stroke-width': 3 }, H = hU * CV.k;
  if (horiz) {
    const y = CV.y + H + 30, mid = CV.x + CV_S / 2;
    draw(path(g, `M${CV.x} ${y - 9}V${y + 9}M${CV.x} ${y}H${mid - gap}`, sw, { d: 0 }), t0, .45);
    draw(path(g, `M${CV.x + CV_S} ${y - 9}V${y + 9}M${CV.x + CV_S} ${y}H${mid + gap}`, sw, { d: 0 }), t0, .45);
    show(msText(g, lab[0], { x: mid, y: y + 8, size: 24, fill: color, anchor: 'middle', weight: 600, o: 0 }), t0 + .3, .3);
  } else {
    const x = CV.x + CV_S + 40, mid = CV.y + H / 2;
    draw(path(g, `M${x - 9} ${CV.y}H${x + 9}M${x} ${CV.y}V${mid - gap - 8}`, sw, { d: 0 }), t0, .45);
    draw(path(g, `M${x - 9} ${CV.y + H}H${x + 9}M${x} ${CV.y + H}V${mid + gap + 4}`, sw, { d: 0 }), t0, .45);
    show(msText(g, lab[0], { x, y: mid - 6, size: 24, fill: color, anchor: 'middle', weight: 600, o: 0 }), t0 + .3, .3);
    show(msText(g, lab[1], { x, y: mid + 22, size: 22, fill: color, anchor: 'middle', weight: 600, o: 0 }), t0 + .3, .3);
  }
  return g;
}
// The student's PREVIEW PANE, as runner.html draws it: a #111 page with "Click Run to execute your sketch." until the first
// run. `kids` holds what a run draws (the sprite) and the video's helpers on it (the dashed canvas edge, guides, the old spot);
// `note` is the line under the pane that says the dashed lines are helpers. The pane itself never fades during a re-run.
function msPane(p, t0) {
  const ST = STG(), g = G(p, { o: 0 });
  mk('rect', { x: PANE.x, y: PANE.y, width: PANE.w, height: PANE.h, rx: 14, fill: ST.pane, stroke: ST.paneEdge, 'stroke-width': 2 }, g);
  const empty = msText(g, 'Click Run to execute your sketch.', { x: PANE.x + PANE.w / 2, y: PANE.y + PANE.h / 2 + 8, size: 24, fill: ST.empty, anchor: 'middle', weight: 400 });
  const kids = G(g);
  const edge = path(kids, `M${CV.x} ${CV.y}H${CV.x + CV_S}V${CV.y + CV_S}H${CV.x}Z`, HELP(), { o: 0 });   // the canvas edge: a helper
  const note = msText(g, 'dashed lines: helpers, not in your preview', { x: PANE.x + PANE.w / 2, y: 764, size: 22, fill: COL.muted, anchor: 'middle', weight: 500, o: 0 });
  show(g, t0, .5);
  return { g, empty, kids, edge, note };
}
// One run's sprite in the pane: a 50-unit deeppink square with no stroke at (sx, sy), popping in at t0.
function msRun(pv, sx, sy, t0) {
  const spr = G(pv.kids, { x: cvX(sx), y: cvY(sy), s: 0, o: 0 });
  mk('rect', { x: -HALF, y: -HALF, width: 2 * HALF, height: 2 * HALF, fill: STG().sprite }, spr);
  pop(spr, t0);
  return { spr };
}
// Dashed guides to the sprite at (u, v), and an (x, y) readout to its right. Each guide takes the colour of the ruler it drops
// from: the x guide (cyan) comes down from the top edge at x = u, the y guide (orange) comes across from the left edge at y = v.
function msGuides(p, u, v, t0) {
  const ST = STG(), g = G(p), x = cvX(u), y = cvY(v), st = { gk: 0 };
  const xg = path(g, '', { stroke: ST.x, 'stroke-width': 3, 'stroke-dasharray': '9 8' });
  const yg = path(g, '', { stroke: ST.y, 'stroke-width': 3, 'stroke-dasharray': '9 8' });
  const set = () => {
    xg.setAttribute('d', `M${x} ${CV.y}V${CV.y + st.gk * (y - HALF - CV.y)}`);
    yg.setAttribute('d', `M${CV.x} ${y}H${CV.x + st.gk * (x - HALF - CV.x)}`);
    xg.style.visibility = yg.style.visibility = st.gk < .01 ? 'hidden' : '';
  };
  set();
  prog(q => { st.gk = q; set(); }, t0, .5);
  const ro = G(g, { x: x + HALF + 16, y: y + 10, o: 0 });                // origin at the readout's left baseline, so a pulse grows in place
  msRuns(ro, [['(', COL.text], [String(u), ST.x], [', ', COL.text], [String(v), ST.y], [')', COL.text]], { x: 0, y: 0, size: 28, font: MONO, anchor: 'start', weight: 400 });
  show(ro, t0 + .25, .35);
  return { g, xg, yg, ro };
}
// shCode's mouse pointer (tip = the hot spot) gliding to the Run button and pressing it at t0: the button takes the hover colour
// as the pointer arrives, dips and darkens as :active does, and a ring spreads from it (capped at 1.2x, inside the panel).
function msPress(C, p, t0, from = PTR_FROM) {
  const A = AP(), cur = G(p, { x: from[0], y: from[1], o: 0 });
  path(cur, 'M0 0L0 31L8 24L13.5 36L19 33.5L13.5 22L24 22Z', { fill: A.cursor, stroke: A.cursorEdge, 'stroke-width': 2.5 });
  show(cur, t0 - .8, .2);
  tw(cur, { x: PTR_AT[0], y: PTR_AT[1] }, t0 - .75, .65, io);
  tw(C.runBg, { c_fill: A.runHover }, t0 - .2, .1);
  tw(cur, { s: .84 }, t0, .07); tw(cur, { s: 1 }, t0 + .07, .18, out);
  tw(C.run, { s: .93 }, t0, .07); tw(C.run, { s: 1 }, t0 + .07, .25, out);
  tw(C.runBg, { c_fill: A.runDown }, t0, .06); tw(C.runBg, { c_fill: A.runHover }, t0 + .22, .2);
  const ring = G(C.g, { x: RUN_C[0], y: RUN_C[1], o: 0 });
  mk('rect', { x: -RUNB.w / 2, y: -RUNB.h / 2, width: RUNB.w, height: RUNB.h, rx: 7, fill: 'none', stroke: A.run, 'stroke-width': 3 }, ring);
  tw(ring, { o: .9 }, t0, .05); tw(ring, { s: 1.2, o: 0 }, t0 + .05, .55, out);
  (S.rings = S.rings || []).push(ring);
  hide(cur, t0 + .75, .3);
  tw(C.runBg, { c_fill: A.run }, t0 + .8, .25);                          // the pointer leaves: back to the resting colour
  (S.cursors = S.cursors || []).push(cur);
  return cur;
}
// change -> Run -> look, with the way back, under the editor. Each node starts dim and lights on its word.
function msCycle(p) {
  const A = AP(), g = G(p, { o: 0 }), Y = 610, H = 52, nodes = {};
  const node = (key, x, w, label, fill, txt) => {
    const n = G(g, { x: x + w / 2, y: Y, o: .4 });
    mk('rect', { x: -w / 2, y: -H / 2, width: w, height: H, rx: key === 'run' ? 7 : H / 2, fill, stroke: key === 'run' ? 'none' : COL.raised, 'stroke-width': 2 }, n);
    if (key === 'run') path(n, `M${-w / 2 + 22} -9L${-w / 2 + 22} 9L${-w / 2 + 37} 0Z`, { fill: txt, stroke: txt, 'stroke-width': 1.5 });
    msText(n, label, { x: key === 'run' ? 10 : 0, y: 9, size: 26, fill: txt, weight: 600, anchor: 'middle' });
    return (nodes[key] = n);
  };
  node('change', 300, 152, 'change', COL.panel, COL.text);
  node('run', 510, 120, 'Run', A.run, A.runText);
  node('look', 682, 88, 'look', COL.panel, COL.text);
  return { g, nodes, arrows: [[454, 504], [632, 676]].map(([a, b]) => ({ a, b })), Y };
}
// A hold: the picture stays for a look before the next beat (the beat ends at the latest tween + 0.6 s).
function msHold(t) { prog(() => {}, t, 0, lin); }
function msLight(n, t0) { tw(n, { o: 1 }, t0, .25); tw(n, { s: 1.1 }, t0, .18, out); tw(n, { s: 1 }, t0 + .18, .35); }
function msThick(e, t0, w = 2.5, k = 2) { tw(e, { 'a_stroke-width': w * k }, t0, .2, out); tw(e, { 'a_stroke-width': w }, t0 + .25, .45); }

const BEATS = [
  ['hello', 'Hello', (m) => {
    const p = panel(0);
    S.title = G(p);
    show(msText(S.title, 'moSHion · 5.1.2', { x: 70, y: 74, size: 22, fill: COL.purple, weight: 600, o: 0 }), m('title', -.05), .4);
    const tt = msText(S.title, 'Your first moSHion sketch', { x: 70, y: 124, size: 46, fill: COL.text, weight: 600, o: 0 });
    tw(tt, { o: 1, y: 124 }, m('title'), .5, out); put(tt, { y: 136 });
    S.code = msCode(p, m('two'));
    tw(S.code.g, { y: 0 }, m('two'), .55, out); put(S.code.g, { y: 14 });
    show(S.code.pair, m('twol', -.05), .35);                              // "two lines": lines 2 and 3, the dimmed ones are not
  }],

  ['canvas', 'The canvas', (m) => {
    const C = S.code, p = S.panel, ST = STG();
    S.diag = G(p);                                                        // the explanation picture (cleared in 'run')
    S.cm = G(C.g);                                                        // its marks on the code (cleared in 'run')
    hide(C.pair, m('line'), .3);                                          // the two lines narrow to the first of them
    show(C.bar, m('line'), .35);                                          // the line lights up
    const R = S.stage = msStage(S.diag);
    draw(R.outline, m('line', .45), .7);
    show(R.fillG, m('line', .55), .5);
    show(R.grid, m('line', 1.0), .7);
    S.u2 = [msUnder(S.cm, 1, 13, 16, ST.x, m('w')), msUnder(S.cm, 1, 18, 21, ST.y, m('h'))];
    S.dims = [msDim(S.diag, true, ST.x, m('w', .15), ['400 wide']), msDim(S.diag, false, ST.y, m('h', .15), ['400', 'tall'])];
    msArrow(S.diag, CV.x + 20, CV.y - 46, CV.x + CV_S - 20, CV.y - 46, ST.x, m('x'), .8);
    show(msText(S.diag, 'x', { x: CV.x + CV_S + 4, y: CV.y - 37, size: 32, fill: ST.x, weight: 600, italic: true, o: 0 }), m('x', .6), .3);
    [100, 200, 300, 400].forEach((u, i) => show(R.xt[u], m('x', .25 + i * .12), .3));
    msArrow(S.diag, CV.x - 68, CV.y + 40, CV.x - 68, CV.y + CV_S - 30, ST.y, m('y'), .8);
    show(msText(S.diag, 'y', { x: CV.x - 84, y: CV.y + CV_S - 30, size: 32, fill: ST.y, weight: 600, italic: true, anchor: 'end', o: 0 }), m('y', .6), .3);
    [100, 200, 300, 400].forEach((u, i) => show(R.yt[u], m('y', .25 + i * .12), .3));
    // "So the top-left corner is (0, 0)": said only after x and y are defined
    show(R.origin, m('origin'), .3);
    const od = R.origin.querySelector('circle');
    tw(od, { a_r: 13 }, m('origin', .1), .22, out); tw(od, { a_r: 7 }, m('origin', .35), .4);
    // "On a math graph, though, y goes up": a small math-graph corner under the editor, its y arrow pointing UP (same orange)
    const mg = S.mathG = G(p, { o: 0 }), ox = 330, oy = 706;
    msArrow(mg, ox, oy, ox + 150, oy, COL.muted, m('math', .05), .45);
    msArrow(mg, ox, oy, ox, oy - 138, ST.y, m('math', .2), .55);
    msText(mg, 'y', { x: ox - 14, y: oy - 116, size: 30, fill: ST.y, weight: 600, italic: true, anchor: 'end' });
    msText(mg, 'x', { x: ox + 164, y: oy + 9, size: 30, fill: COL.muted, weight: 600, italic: true });
    msText(mg, 'on a math graph', { x: ox + 4, y: oy + 42, size: 22, fill: COL.muted, weight: 500 });
    show(mg, m('math'), .3);
  }, { keep: true }],                                                    // keep: builds on the same picture (no cut)

  ['sprite', 'A sprite', (m) => {
    const C = S.code, R = S.stage, p = S.diag, ST = STG();
    tw(C.bar, { y: codeBase(2) }, m('line'), .45);                       // the highlight moves down to the sprite line
    S.u2.forEach(e => hide(e, m('line'), .3));
    S.dims.forEach(e => tw(e, { o: .35 }, m('line'), .4));
    hide(S.mathG, m('line'), .4);
    // the sprite at (200, 200), its two guides and its readout
    const x = cvX(200), y = cvY(200);
    const spr = S.spr = G(p, { x, y, s: 0, o: 0 });
    mk('rect', { x: -HALF, y: -HALF, width: 2 * HALF, height: 2 * HALF, fill: ST.sprite }, spr);
    pop(spr, m('pop'));
    const gd = S.guides = msGuides(p, 200, 200, m('pop', .45));
    tw(R.xt[200], { c_fill: ST.x }, m('pop', .7), .3); tw(R.yt[200], { c_fill: ST.y }, m('pop', .7), .3);
    // the two numbers in the code: x then y
    msUnder(S.cm, 2, 13, 16, ST.x, m('xnum'));
    show(msText(S.cm, 'x', { x: msMid(2, 13, 16), y: codeBase(2) + 40, size: 24, fill: ST.x, weight: 600, anchor: 'middle', o: 0 }), m('xnum', .2), .3);
    tw(gd.xg, { 'a_stroke-width': 6 }, m('xnum', .1), .2, out); tw(gd.xg, { 'a_stroke-width': 3 }, m('xnum', .35), .4);
    msUnder(S.cm, 2, 18, 21, ST.y, m('ynum'));
    show(msText(S.cm, 'y', { x: msMid(2, 18, 21), y: codeBase(2) + 40, size: 24, fill: ST.y, weight: 600, anchor: 'middle', o: 0 }), m('ynum', .2), .3);
    tw(gd.yg, { 'a_stroke-width': 6 }, m('ynum', .1), .2, out); tw(gd.yg, { 'a_stroke-width': 3 }, m('ynum', .35), .4);
    // coordinates: the readout and the sprite's center
    const ctr = G(p, { x, y, s: 0, o: 0 });
    mk('circle', { r: 6, fill: COL.text, stroke: ST.bg, 'stroke-width': 2 }, ctr);
    pop(ctr, m('coords', .1));
    tw(gd.ro, { s: 1.1 }, m('coords'), .2, out); tw(gd.ro, { s: 1 }, m('coords', .2), .4);
    tw(ctr, { s: 1.6 }, m('coords', 3.0), .2, out); tw(ctr, { s: 1 }, m('coords', 3.2), .35);   // "...where its center is"
  }, { keep: true }],

  ['run', 'Press Run', (m, D) => {
    const C = S.code, p = S.panel, A = AP();
    // "Nothing shows up until you press Run": the explanation picture clears and the student's preview pane takes its place,
    // with the runner's own "Click Run to execute your sketch."
    hide(S.diag, m('nothing'), .6); hide(S.cm, m('nothing'), .5); hide(C.bar, m('nothing'), .4);
    const pv = S.pv = msPane(p, m('nothing', .3));
    pop(C.run, m('runw'));                                               // Run, in the editor's tab strip, as shCode shows it
    tw(C.run, { s: 1.08 }, m('btn'), .2, out); tw(C.run, { s: 1 }, m('btn', .2), .4);
    // the dimmed wrapper: two washes (and a little brighter while it is named), then the box it makes, named setup
    const wash = [0, 3].map(i => { const r = mk('rect', { x: CODE.x + 2, y: codeBase(i) - 44, width: CODE.w - 4, height: 60, fill: COL.purple }, C.washes); put(r, { o: 0 }); return r; });
    wash.forEach(r => tw(r, { o: .16 }, m('wrap', .1), .4));
    [0, 3].forEach(i => { tw(C.lines[i], { o: .62 }, m('wrap', .1), .4); tw(C.lines[i], { o: WRAP }, m('press', -.2), .4); });
    S.box = G(p);
    const bx = path(S.box, `M${CODE.x + 12} ${CODE.y + CODE.head + 6}H${CODE.x + CODE.w - 12}V${codeBase(3) + 20}H${CODE.x + 12}Z`,
      { stroke: COL.purple, 'stroke-width': 3 }, { d: 0 });
    draw(bx, m('mkbox', -.1), .9);
    show(msText(S.box, 'the box your code goes in', { x: CODE.x + CODE.w, y: 514, size: 26, fill: COL.purple, weight: 600, anchor: 'end', o: 0 }), m('box'), .4);
    msUnder(S.box, 0, 9, 14, COL.green, m('setup'));
    show(msText(S.box, 'the next reading explains it', { x: CODE.x + CODE.w, y: 550, size: 22, fill: COL.muted, weight: 500, anchor: 'end', o: 0 }), m('nr'), .4);
    wash.forEach(r => hide(r, m('press', -.2), .4));
    // the press, and the first run: the runner's line goes, the sprite appears, and the (invisible) canvas edge is drawn dashed
    msPress(C, p, m('click'));
    hide(pv.empty, m('click', .3), .15);
    S.run1 = msRun(pv, 200, 200, m('go', .05));
    show(pv.edge, m('cvw', -.1), .4);
    hide(S.box, m('go', 1.4), .5);
    // "The dashed lines are only helpers. Your preview shows just the square."
    msThick(pv.edge, m('helper', .1));
    show(pv.note, m('helper', .1), .4);
    tw(S.run1.spr, { s: 1.12 }, m('sq', -.05), .2, out); tw(S.run1.spr, { s: 1 }, m('sq', .15), .35);
    // "Each time you press Run, the sketch starts fresh from your code."
    const glow = G(C.g, { x: RUN_C[0], y: RUN_C[1], o: 0 });
    mk('rect', { x: -RUNB.w / 2 - 6, y: -RUNB.h / 2 - 6, width: RUNB.w + 12, height: RUNB.h + 12, rx: 10, fill: 'none', stroke: A.run, 'stroke-width': 3 }, glow);
    tw(glow, { o: .85 }, m('fresh'), .3); tw(glow, { o: 0 }, m('fresh', 1.4), .5);
    msHold(D + .5);
  }, { keep: true }],

  ['cycle', 'Change, Run, look', (m, D) => {
    const C = S.code, p = S.panel, pv = S.pv, ST = STG(), A = AP();
    show(C.bar, m('edit'), .35);                                          // "In the sprite line": the bar is still on line 3
    msEdit(C, 2, 13, 21, ['sx', 'sy'], '100', m('n100', -.1));
    S.cm2 = G(C.g);
    msUnder(S.cm2, 2, 13, 16, ST.x, m('n100', .45)); msUnder(S.cm2, 2, 18, 21, ST.y, m('n100', .55));
    // "The sketch has not changed yet": a dashed ring on the sprite that is still at (200, 200)
    const old = S.run1, ox = cvX(200), oy = cvY(200);
    const ring = G(pv.kids, { x: ox, y: oy, o: 0 });
    mk('rect', { x: -HALF - 12, y: -HALF - 12, width: 2 * HALF + 24, height: 2 * HALF + 24, rx: 6, fill: 'none', stroke: COL.text, 'stroke-width': 2.5, 'stroke-dasharray': '7 6' }, ring);
    show(ring, m('stale', .2), .3);
    // the guess: x smaller -> left (cyan), y smaller -> up (orange)
    S.pred = G(pv.kids);
    msArrow(S.pred, ox - HALF - 16, oy, ox - HALF - 126, oy, ST.x, m('gx', .3), .55);
    msArrow(S.pred, ox, oy - HALF - 16, ox, oy - HALF - 126, ST.y, m('gy', .3), .55);
    const ul = S.cm2.children;
    tw(ul[0], { 'a_stroke-width': 7 }, m('gx', .1), .2, out); tw(ul[0], { 'a_stroke-width': 4 }, m('gx', .35), .4);
    tw(ul[1], { 'a_stroke-width': 7 }, m('gy', .1), .2, out); tw(ul[1], { 'a_stroke-width': 4 }, m('gy', .35), .4);
    // Run again: the sketch restarts. Only its contents go (the old sprite, the ring, the guesses); the pane and the dashed
    // canvas edge stay, so nothing blinks; the sprite pops at (100, 100) and never slides there.
    msPress(C, p, m('click'));
    [old.spr, ring, S.pred].forEach(e => hide(e, m('click', .15), .12));
    S.run2 = msRun(pv, 100, 100, m('click', .3));
    S.guides2 = msGuides(pv.kids, 100, 100, m('move', .25));
    // the dashed square: where it was (a video helper, not something Run draws, and the narration says so)
    S.ghost = G(pv.kids, { x: ox, y: oy, o: 0 });
    mk('rect', { x: -HALF, y: -HALF, width: 2 * HALF, height: 2 * HALF, ...HELP() }, S.ghost);
    tw(S.ghost, { o: .75 }, m('move', .6), .4);
    msThick(S.ghost.firstChild, m('ghost', .1));
    tw(S.ghost, { o: 1 }, m('ghost', .1), .2);
    // change -> Run -> look
    const Y = S.cycle = msCycle(p);
    show(Y.g, m('loop'), .4);
    Y.arrows.forEach(({ a, b }, i) => msArrow(Y.g, a, Y.Y, b, Y.Y, COL.muted, m('loop', .3 + i * .15), .35, 3));
    msLight(Y.nodes.change, m('lchange')); msLight(Y.nodes.run, m('lrun')); msLight(Y.nodes.look, m('llook'));
    const back = G(Y.g);
    // "If it's not where you wanted, change it and run it again.": the way back, from look to change
    draw(path(back, `M727 640V680H376V646`, { stroke: COL.muted, 'stroke-width': 3 }, { d: 0 }), m('fix', .9), .9);
    show(path(back, `M366 657L376 643L386 657`, { stroke: COL.muted, 'stroke-width': 3 }, { o: 0 }), m('fix', 1.65), .15);
    msLight(Y.nodes.change, m('fix', 1.75));
    msHold(D + .4);
  }, { keep: true }],

  ['size', 'Canvas size', (m, D) => {
    const C = S.code, p = S.panel, ST = STG();
    tw(C.bar, { y: codeBase(1) }, m('edit'), .45);                       // the canvas line
    hide(S.cm2, m('edit'), .3);
    [S.cycle.nodes.change, S.cycle.nodes.run, S.cycle.nodes.look].forEach(n => tw(n, { o: .4 }, m('edit'), .3));
    // An EXPLANATION picture, not a run: the preview pane goes, and a dashed helper outline of the canvas takes its place.
    // (Nothing is pressed: the real runner would re-centre a 400 x 300 canvas, so the square would move down 50 px.)
    hide(S.pv.g, m('edit'), .5);
    const so = S.sizeEx = { g: G(p, { o: 0 }), h: 400 };
    so.edge = path(so.g, '', HELP());
    const setEdge = () => so.edge.setAttribute('d', `M${CV.x} ${CV.y}H${CV.x + CV_S}V${CV.y + so.h * CV.k}H${CV.x}Z`);
    setEdge();
    show(so.g, m('edit', .35), .45);
    // "Keep the width at 400": the first number, and the width under the outline
    msUnder(G(C.g), 1, 13, 16, ST.x, m('keep'));
    const wd = G(so.g);
    msDim(wd, true, ST.x, m('keep', .15), ['400 wide']);
    // "and make the height 300": the second number changes, the outline's bottom edge comes up to 300, the width dim with it
    msEdit(C, 1, 18, 21, ['h'], '300', m('n300', -.1));
    msLight(S.cycle.nodes.change, m('nums', .1));
    msUnder(G(C.g), 1, 18, 21, ST.y, m('n300', .45));
    prog(q => { so.h = 400 - 100 * q; setEdge(); }, m('n300', .25), .6);
    tw(wd, { y: -100 * CV.k }, m('n300', .25), .6);
    // "Now it's only 300 pixels tall."
    msDim(so.g, false, ST.y, m('short', -.05), ['300', 'tall'], 300);
    // "The dashed outline is just a helper." "Run it, and the square moves down a little: your preview keeps the canvas centered."
    msThick(so.edge, m('helper', .1));
    so.note = msText(so.g, 'dashed outline: a helper, not in your preview', { x: CV.x + CV_S / 2, y: 668, size: 22, fill: COL.muted, anchor: 'middle', weight: 500, o: 0 });
    show(so.note, m('helper', .1), .4);
    msLight(S.cycle.nodes.run, m('shift'));
    msHold(D + .6);
  }, { keep: true }],

  ['close', 'Up next', (m, D) => {
    const p = panel(0), A = AP();
    const row = (runs, y, t0, size = 40, weight = 600, x = 800) => { const t = msRuns(p, runs, { x, y, size, weight, o: 0 }); tw(t, { o: 1, y }, t0, .45, out); put(t, { y: y + 10 }); return t; };
    // "You made a canvas, put a sprite on it, and pressed Run." (the green WORD "Run": runWord, 6.3:1 on the stage)
    msWords(row([['a canvas', COL.text], ['   ·   ', COL.muted], ['a sprite', COL.text], ['   ·   ', COL.muted], ['Run', A.runWord, 700]], 210, m('wc', -.1)),
      [[0, m('wc', -.1)], [1, m('ws', -.2)], [2, m('ws', -.1)], [3, m('wr', -.2)], [4, m('wr', -.1)]]);
    // "Then you changed the numbers and ran it again."
    row([['change', COL.muted], ['   →   ', COL.muted], ['Run', A.runWord, 700], ['   →   ', COL.muted], ['look', COL.muted]], 300, m('again'), 30, 500);
    // "Next, read 5.1.3. It explains the setup box, and a second box named draw."
    show(msText(p, 'UP NEXT', { x: 800, y: 440, size: 22, fill: COL.purple, weight: 600, anchor: 'middle', o: 0 }), m('next', -.05), .35);
    row([['5.1.3 Reading', COL.text]], 512, m('next', .1), 60);
    const SX = TOKS().syntax;
    msWords(row([['setup', SX.fn, 400, MONO], ['()', SX.punct, 400, MONO], ['  and  ', COL.muted, 500, UI, 28], ['draw', SX.fn, 400, MONO], ['()', SX.punct, 400, MONO]], 590, m('wsu', -.1), 36, 400),
      [[0, m('wsu', -.1)], [1, m('wsu', -.1)], [2, m('wdr', -.3)], [3, m('wdr', -.1)], [4, m('wdr', -.1)]]);
    msHold(Math.max(D, m('bye', 1.9)) + .6);                              // the wave finishes, then the end card holds
  }],
].map(([id, title, run, extra]) => ({ id, title, run, ...extra }));

// ---- SH: bottom-left, expressive, never the subject. Every change lands on a narration mark, in time order. ----
bindActs({
  hello: { act: (t, m, D, s, MV) => {
    s.pose = 'down';
    emo(t, s, [[0, { expr: 'delighted', amp: 1.15, look: [1150, 430] }],              // "Hi!" to the empty stage
      [m('title', -.1), { expr: 'curious', tilt: 6, amp: 1, look: [380, 110] }],       // the title
      [m('two', -.1), { expr: 'delighted', tilt: 0, amp: 1.1, look: [420, 350] }]]);   // "just two lines"
    MV.wave(t, s, m('hi', -.15), 1.9);
  } },
  canvas: { act: (t, m, D, s) => {
    s.pose = 'pointUp';                                                                  // at the lit line
    emo(t, s, [[0, { expr: 'determined', look: [430, 320] }],
      [m('w', -.1), { expr: 'curious', tilt: 4, look: [1160, 735], pose: 'point' }],     // across to the canvas
      [m('x', -.1), { expr: 'delighted', tilt: 0, look: [1300, 110], pose: 'down' }],
      [m('y', -.1), { expr: 'determined', look: [812, 560] }],
      [m('origin', -.1), { expr: 'curious', tilt: 8, look: [880, 150] }],
      [m('math', -.1), { expr: 'surprise', tilt: -5, amp: 1, look: [420, 620] }]]);     // the twist: on a math graph y goes up
  } },
  sprite: { act: (t, m, D, s) => {
    s.pose = 'pointUp';
    emo(t, s, [[0, { expr: 'determined', look: [430, 380] }],
      [m('pop', -.1), { expr: 'surprise', amp: 1, look: [1160, 450], pose: 'down' }],    // the square appears: he leans in
      [m('pop', .6), { expr: 'delighted', amp: 1.15 }],
      [m('xnum', -.1), { expr: 'curious', tilt: 5, look: [480, 380], pose: 'pointUp' }],
      [m('coords', -.1), { expr: 'delighted', tilt: 0, amp: 1.1, look: [1260, 440], pose: 'point' }]]);
    kick.lean(t, s, m('pop', -.05), .5, 1.3);
  } },
  run: { act: (t, m, D, s) => {
    s.pose = 'down';
    emo(t, s, [[0, { expr: 'curious', look: [1160, 430] }],                            // the picture clears
      [m('runw', -.1), { expr: 'determined', look: RUN_C, pose: 'pointUp' }],            // Run
      [m('wrap', -.1), { expr: 'curious', tilt: 5, look: [420, 260] }],                  // the dimmed lines
      [m('mkbox', -.1), { expr: 'smug', tilt: 0, look: [600, 500], pose: 'down' }],      // "make a box"
      [m('press', -.1), { expr: 'determined', look: RUN_C, pose: 'pointUp' }],
      [m('go', -.1), { expr: 'surprise', amp: 1, look: [1160, 430], pose: 'down' }],    // the sketch appears
      [m('go', .6), { expr: 'delighted', amp: 1.15 }],
      [m('helper', -.1), { expr: 'curious', amp: 1, look: [1160, 760] }],               // the helper note under the pane
      [m('fresh', -.1), { expr: 'proud', amp: 1.05, look: RUN_C }]]);
    kick.lean(t, s, m('go', -.05), .5, 1.3);
  } },
  cycle: { act: (t, m, D, s) => {
    s.pose = 'pointUp';
    emo(t, s, [[0, { expr: 'determined', look: [430, 380] }],
      [m('stale', -.1), { expr: 'curious', tilt: 6, look: [1160, 430], pose: 'point' }],   // still at (200, 200)
      [m('gx', -.1), { expr: 'determined', tilt: 0, look: [1000, 430] }],
      [m('gy', -.1), { look: [1160, 270] }],
      [m('press', -.1), { expr: 'determined', look: RUN_C, pose: 'pointUp' }],
      [m('move', -.1), { expr: 'surprise', look: [1020, 290], pose: 'down' }],           // there it is
      [m('move', .6), { expr: 'delighted', amp: 1.15 }],
      [m('ghost', -.1), { expr: 'curious', tilt: 5, amp: 1, look: [1160, 430] }],
      [m('loop', -.1), { expr: 'proud', tilt: 0, amp: 1.05, look: [535, 610] }]]);       // change -> Run -> look
    kick.lean(t, s, m('move', -.05), .5, 1.2);
  } },
  size: { act: (t, m, D, s) => {
    s.pose = 'pointUp';
    emo(t, s, [[0, { expr: 'determined', look: [430, 320] }],
      [m('keep', -.1), { expr: 'curious', tilt: 4, look: [1160, 740], pose: 'point' }],     // the width
      [m('n300', -.1), { expr: 'determined', tilt: 0, look: [560, 320], pose: 'pointUp' }], // the 300 in the code
      [m('short', -.1), { expr: 'surprise', look: [1480, 360], pose: 'down' }],            // only 300 tall
      [m('short', .6), { expr: 'delighted', amp: 1.1 }],
      [m('helper', -.1), { expr: 'curious', tilt: 5, amp: 1, look: [1160, 668] }],         // the helper note
      [m('shift', -.1), { expr: 'determined', tilt: 0, look: RUN_C }]]);
  } },
  close: { act: (t, m, D, s, MV) => {
    s.pose = 'down';
    emo(t, s, [[0, { expr: 'proud', amp: 1.05, look: [800, 220] }],
      [m('next', -.1), { expr: 'delighted', look: [800, 500] }],
      [m('bye', -.1), { expr: 'delighted', amp: 1.15, look: [800, 420] }]]);
    MV.wave(t, s, m('bye', -.15), 1.9);
  } },
});
boot();
