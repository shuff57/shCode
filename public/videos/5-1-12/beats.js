// moshion-5.1.12: the concept explainer for shCode lesson 5.1.12 "Video: The Frame Loop Explained" (the second shCode
// papermorph explainer; the approved 5.1.2 explainer is the style template, see ../STYLE.md). Seven beats, one play-through,
// no questions:
//   hello   cold open: SH waves; the student's Hello Sprite sketch (5.1.11's solution) and its run: the square sits still.
//   loop    Run is pressed; in SLOW MOTION: setup() is called once (it makes the canvas and the sprite), then draw() is called
//           again and again (frame 1, 2, 3 on the counter, one picture each), then FULL SPEED: about 60 times every second.
//           A frame (one call to draw, one finished picture) and frames per second are defined; the draw() calls turn into
//           flipbook pages, and every page is the same, so the square stays still.
//   move    one line is added under background('#222'): player.pos.x = player.pos.x + 2 (the long form 5.1.9 shows; += is
//           never used). It reads x, adds 2, puts the answer back; a bigger x is farther right.
//   frames  Run again, in slow motion (the voice says "slowly": "slow motion" next to moSHion-said-"motion" collided, EARS #5):
//           frame 1 wipe (background) -> x 200 up to 202 -> moSHion draws the square; frames 2 and 3 ("wipe, x is 204, draw the square");
//           2 px is too small to notice; 60 frames a second; 2 x 60 = 120 px, so one second takes x from 200 to 320; then
//           full speed: the square slides right off the edge (x keeps growing).
//   bug     the sprite is made in setup (once). The 5.1.4 sketch made it inside draw: Run it and a new sprite is made every
//           frame, 60 a second. In the REAL runner they shove each other aside and fill the canvas (measured: the sketch's
//           dynamic sprites spread out, they do NOT sit invisibly in one spot). Make it in setup, change it in draw.
//   try     change the 2 to 5: 5 px a frame, 300 px a second; Run: it reaches the edge in less than one second.
//   close   a cut to the end card: setup() once, draw() every frame; up next 5.1.13 (how a sketch checks if a key is held down). SH waves.
// Not taught here (5.1.13-5.1.18 teach them): keys, velocity, if/else. moSHion's default gravity is 0: nothing falls.
// Three kinds of picture (STYLE section 5): the preview PANE is the run (#111 page, the #222 canvas background() paints, the
// sprite); everything outside the pane (frame counter, x readout, labels, pages, the timeline) is an explanation; the only helper
// drawn ON the canvas is the wipe's sweep line, and only under the "slow motion" label. No faint old-position squares are used.
// Every colour comes from lib/tokens.js. Helper names are prefixed ms (copied from 5.1.2) or fl (new): lib globals (frame, label,
// draw, tick, dot, move, rect, X, NEG, ...) must not be shadowed.
'use strict';
const CHAPTER = { number: 1, type: 'explainer', title: 'The frame loop', kicker: 'moSHion · 5.1.12',
  meta: 'Under 3 minutes, with sound and captions. One play-through, no questions.', minutes: 3, language: 'en', coverGo: 'Play' };

// ---- layout (stage px, 1600x900; y >= 780 is the caption bar's, the bottom-left corner (x < 232, y > 522) is the character's) ----
// The editor sits right of the character's column (x >= 270) so ten code lines fit above the caption band.
const CODE = { x: 270, y: 150, w: 720, head: 44, size: 26, lh: 40, gut: 316, x0: 338, rows: 10 };
const codeBase = i => CODE.y + CODE.head + 34 + i * CODE.lh;            // baselines 228 268 ... 588
const CODE_B = codeBase(CODE.rows - 1) + 22;                             // the panel ends at y 610
const PANE = { x: 1030, y: 150, w: 520, h: 520 };                        // the student's preview: runner.html's #111 page
const CV = { x: 1060, y: 180, k: 1.15, n: 400 };                          // the 400 x 400 canvas, drawn 460 px, centred in the pane
const cvX = u => CV.x + u * CV.k, cvY = v => CV.y + v * CV.k, CV_S = CV.n * CV.k;
const SPR = 40, HALF = SPR / 2 * CV.k;                                   // new Sprite(x, y, 40, 40): 46 stage px
const RUNB = { x: CODE.x + CODE.w - 124, y: CODE.y + 6, w: 110, h: 32 }; // shCode's Run button, right end of the tab strip
const RUN_C = [RUNB.x + RUNB.w / 2, RUNB.y + RUNB.h / 2];                // (921, 172)
// The pointer comes in from the gap between the editor and the pane (never over code; the lines up there are short) and its tip
// lands on the button's left end, by the play triangle, so the arrow never covers the word "Run".
const PTR_FROM = [1000, 300], PTR_AT = [RUN_C[0] - 35, RUN_C[1] + 6];
const ZONE = { x: 284, y: 636, r: 990 };                                 // under the editor: one thing at a time
const UPX = PANE.x + PANE.w / 2, UP1 = 712, UP2 = 756;                   // under the pane: the mode label, then the arithmetic
const TOP_Y = 124;                                                       // over the pane: the frame counter and the x readout
const FPS = 60;
// What the sketch's own lines say, tagged as shCode's editor (lezer javascript + draculaHighlight) tags them: `let player` and
// function names are definitions (green), `.`, `=` and `+` are operators (pink), property names and variables are text colour.
const tk = kind => (s, id) => [s, kind, id];
const KW = tk('keyword'), PU = tk('punct'), NU = tk('num'), FN = tk('fn'), CL = tk('cls'), SR = tk('str'), OP = tk('op'), ID = tk('ident');
const MAIN = [                                                           // lessons/5-1-11-moshion-intro/solution.js, blank lines dropped
  [KW('let'), PU(' '), FN('player'), PU(';')],
  [KW('function'), PU(' '), FN('setup'), PU('() {')],
  [PU('  '), KW('new'), PU(' '), CL('Canvas'), PU('('), NU('400'), PU(', '), NU('400'), PU(');')],
  [PU('  '), ID('player'), PU(' '), OP('='), PU(' '), KW('new'), PU(' '), CL('Sprite'), PU('('), NU('200'), PU(', '), NU('200'), PU(', '), NU('40'), PU(', '), NU('40'), PU(');')],
  [PU('  '), ID('player'), OP('.'), ID('color'), PU(' '), OP('='), PU(' '), SR("'deepskyblue'"), PU(';')],
  [PU('}')],
  [KW('function'), PU(' '), FN('draw'), PU('() {')],
  [PU('  '), FN('background'), PU('('), SR("'#222'"), PU(');')],
  [PU('}')],
];
// The one new line (the long form lesson 5.1.9 uses for its own motion line; 5.1.10 names player.pos.x).
const MOVE_LINE = [PU('  '), ID('player'), OP('.'), ID('pos'), OP('.'), ID('x'), PU(' '), OP('='), PU(' '), ID('player'), OP('.'), ID('pos'), OP('.'),
  ID('x'), PU(' '), OP('+'), PU(' '), NU('2', 'step'), PU(';')];
// lessons/5-1-4-example-minimum-sprite steps 1-2: the sprite made inside draw().
const BUGDOC = [
  [KW('function'), PU(' '), FN('setup'), PU('() {')],
  [PU('  '), KW('new'), PU(' '), CL('Canvas'), PU('('), NU('400'), PU(', '), NU('400'), PU(');')],
  [PU('}')],
  [KW('function'), PU(' '), FN('draw'), PU('() {')],
  [PU('  '), FN('background'), PU('('), SR("'#222'"), PU(');')],
  [PU('  '), KW('new'), PU(' '), CL('Sprite'), PU('('), NU('200'), PU(', '), NU('200'), PU(', '), NU('40'), PU(', '), NU('40'), PU(');')],
  [PU('}')],
];

// ---- drawing helpers (ms*: copied from the 5.1.2 explainer) ----
const AP = () => TOKS().app, STG = () => TOKS().stage, SXT = () => TOKS().syntax;
function msText(p, str, { x, y, size = 26, fill = COL.text, weight = 500, anchor = 'start', font = UI, o = 1, italic = false }) {
  const t = T(p, str, { x, y, size, fill, weight, anchor, font, o });
  if (italic) t.setAttribute('font-style', 'italic');
  return t;
}
// A text made of coloured runs: [[str, fill, weight?, font?, size?], ...]; the tspans are kept on t.runs.
function msRuns(p, runs, { x, y, size = 34, anchor = 'middle', font = UI, o = 1, weight = 500 }) {
  const t = msText(p, '', { x, y, size, anchor, font, o, weight });
  t.runs = runs.map(([s, f, w, fnt, sz]) => {
    const e = mk('tspan', { fill: f }, t);
    if (w) e.setAttribute('font-weight', w); if (fnt) e.setAttribute('font-family', fnt); if (sz) e.setAttribute('font-size', sz);
    e.textContent = s; return e;
  });
  return t;
}
function msWords(t, steps) { t.runs.forEach(e => e.setAttribute('fill-opacity', 0)); for (const [i, t0] of steps) tw(t.runs[i], { 'a_fill-opacity': 1 }, t0, .35); }
// An arrow from (x1,y1) to (x2,y2): the shaft draws, the head appears as it lands.
function msArrow(p, x1, y1, x2, y2, color, t0, dur = .7, w = 3.5) {
  const g = G(p), a = Math.atan2(y2 - y1, x2 - x1), L = 16;
  draw(path(g, `M${x1} ${y1}L${x2} ${y2}`, { stroke: color, 'stroke-width': w }, { d: 0 }), t0, dur);
  const hd = path(g, `M${x2 - L * Math.cos(a - .5)} ${y2 - L * Math.sin(a - .5)}L${x2} ${y2}L${x2 - L * Math.cos(a + .5)} ${y2 - L * Math.sin(a + .5)}`,
    { stroke: color, 'stroke-width': w }, { o: 0 });
  show(hd, t0 + dur * .8, .15);
  return g;
}
// A hold: the picture stays for a look before the next beat (the beat ends at the latest tween + 0.6 s).
function msHold(t) { prog(() => {}, t, 0, lin); }
function msLight(n, t0) { tw(n, { o: 1 }, t0, .25); tw(n, { s: 1.1 }, t0, .18, out); tw(n, { s: 1 }, t0 + .18, .35); }
function msBump(e, t0, k = 1.12) { tw(e, { s: k }, t0, .2, out); tw(e, { s: 1 }, t0 + .2, .35); }
// shCode's mouse pointer (tip = the hot spot) gliding to the Run button and pressing it at t0 (5.1.2's press; `glide` is shorter
// when the word "Run" comes right at the start of a beat): hover colour as it arrives, :active on the press, a ring capped at 1.2x.
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

// ---- the editor (fl*: new) ----
// Column positions come from the rendered SVG text (a measured character width came out ~1 px per column short in 5.1.2).
const flColL = (t, c) => CODE.x0 + t.getStartPositionOfChar(c).x;
const flColR = (t, c) => CODE.x0 + t.getEndPositionOfChar(c).x;
const flMid = (t, c0, c1) => (flColL(t, c0) + flColR(t, c1 - 1)) / 2;
// A code row: a group at its line's baseline (so a row can slide down when a line is inserted above it), holding one text.
function flRow(p, toks, i, spans, o = 1) {
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
function flDoc(p, lines, o = 1) {
  const g = G(p, { o }), rows = [], texts = [], spans = {};
  lines.forEach((toks, i) => { const r = flRow(g, toks, i, spans); rows.push(r.row); texts.push(r.t); });
  return { g, rows, texts, spans };
}
// A lit-line bar (the editor's #44475a with a 5 px stripe) over `n` lines from line i; flBarTo slides and resizes it.
function flBar(p, i, n, o = 0, mark) {
  const SX = SXT(), b = G(p, { o, y: codeBase(i) - 28 });
  b.bg = mk('rect', { x: CODE.x + 2, y: 0, width: CODE.w - 4, height: CODE.lh * n, fill: SX.lineBg }, b);
  b.sp = mk('rect', { x: CODE.x + 2, y: 0, width: 5, height: CODE.lh * n, fill: mark || SX.lineMark }, b);
  return b;
}
function flBarTo(b, i, n, t0, dur = .4) {
  tw(b, { y: codeBase(i) - 28 }, t0, dur);
  tw(b.bg, { a_height: CODE.lh * n }, t0, dur); tw(b.sp, { a_height: CODE.lh * n }, t0, dur);
}
// An underline under columns [c0, c1) of a row, drawn left to right.
function flUnder(p, row, t, c0, c1, color, t0, w = 4) {
  const y = st(row).y + 9, e = path(p, `M${flColL(t, c0) + 1} ${y}H${flColR(t, c1 - 1) - 1}`, { stroke: color, 'stroke-width': w }, { d: 0 });
  draw(e, t0, .4);
  return e;
}
// An edit: a purple flash behind columns [c0, c1) of a row; the given spans read `to` from the flash's peak.
function flEdit(row, t, c0, c1, spans, to, t0) {
  const flash = mk('rect', { x: flColL(t, c0) - 5, y: -27, width: flColR(t, c1 - 1) - flColL(t, c0) + 10, height: 36, rx: 6, fill: COL.purple }, null);
  row.insertBefore(flash, row.firstChild); put(flash, { o: 0 });
  tw(flash, { o: .45 }, t0, .2); tw(flash, { o: 0 }, t0 + .45, .45);
  const from = spans.map(s => s.textContent);
  prog(q => spans.forEach((s, k) => { s.textContent = q < .5 ? from[k] : to; }), t0 + .05, .4, lin);
}
// Type a row in, character by character, over dur (the row is built whole, so every column position is measured on the full text).
function flType(row, t, t0, dur) {
  const sp = [...t.querySelectorAll('tspan')], full = sp.map(s => s.textContent), total = full.join('').length;
  show(row, t0, .05);
  prog(q => {
    let left = Math.round(q * total);
    sp.forEach((s, k) => { const n = Math.min(full[k].length, Math.max(0, left)); s.textContent = full[k].slice(0, n); left -= full[k].length; });
  }, t0, dur, lin);
}
// The editor: a panel, the script.js tab, shCode's Run button, a gutter of ten numbers, the lit bar, and two documents: the
// Hello Sprite sketch (main) and, hidden until 'bug', the 5.1.4 sketch.
function flCode(p, t0) {
  const SX = SXT(), A = AP(), g = G(p, { o: 0 });
  mk('rect', { x: CODE.x, y: CODE.y, width: CODE.w, height: CODE_B - CODE.y, rx: 14, fill: SX.bg, stroke: SX.edge, 'stroke-width': 2 }, g);
  path(g, `M${CODE.x} ${CODE.y + CODE.head}H${CODE.x + CODE.w}`, { stroke: SX.edge, 'stroke-width': 2 });
  msText(g, 'script.js', { x: CODE.x + 26, y: CODE.y + 29, size: 20, fill: COL.muted, weight: 500 });
  path(g, `M${CODE.x + 14} ${CODE.y + CODE.head - 1}H${CODE.x + 132}`, { stroke: COL.purple, 'stroke-width': 3 });
  const run = G(g, { x: RUN_C[0], y: RUN_C[1] });
  const runBg = mk('rect', { x: -RUNB.w / 2, y: -RUNB.h / 2, width: RUNB.w, height: RUNB.h, rx: 5, fill: A.run }, run);
  path(run, 'M-31 -8L-31 8L-18 0Z', { fill: A.runText, stroke: A.runText, 'stroke-width': 1.5 });
  const runLabel = msText(run, 'Run', { x: -9, y: 8, size: 21, fill: A.runText, weight: 600 });
  const marks = G(g);                                                    // outlines and washes behind the text
  const bar = flBar(g, 0, 1);                                            // the lit line (or block)
  const bar2 = flBar(g, 0, 1);                                           // a second lit line, for "make it here, change it there"
  const gut = G(g), nums = [];
  for (let i = 0; i < CODE.rows; i++)
    nums.push(msText(gut, String(i + 1), { x: CODE.gut, y: codeBase(i), size: 22, fill: SX.gutter, font: MONO, anchor: 'end', weight: 400, o: i < MAIN.length ? 1 : 0 }));
  const main = flDoc(g, MAIN), bug = flDoc(g, BUGDOC, 0);
  const cm = G(g);                                                       // underlines and tags on the code
  show(g, t0, .5);
  return { g, run, runBg, runLabel, marks, bar, bar2, nums, main, bug, cm, texts: main.texts };
}

// ---- the preview pane and what runs in it ----
function flPane(p, t0) {
  const ST = STG(), g = G(p, { o: 0 });
  mk('rect', { x: PANE.x, y: PANE.y, width: PANE.w, height: PANE.h, rx: 14, fill: ST.pane, stroke: ST.paneEdge, 'stroke-width': 2 }, g);
  const cvFill = mk('rect', { x: CV.x, y: CV.y, width: CV_S, height: CV_S, fill: ST.canvas }, g);   // painted by background('#222')
  const clip = mk('clipPath', { id: 'flCanvasClip' }, g);
  mk('rect', { x: CV.x, y: CV.y, width: CV_S, height: CV_S }, clip);
  const kids = G(g);                                                     // what the sketch draws (clipped to the canvas, as a canvas is)
  kids.setAttribute('clip-path', 'url(#flCanvasClip)');
  show(g, t0, .5);
  return { g, cvFill, kids };
}
// One sprite in the pane: a 40-unit square at (u, 200).
function flSq(pv, u, color, o = 1) {
  const e = G(pv.kids, { x: cvX(u), y: cvY(200), o });
  mk('rect', { x: -HALF, y: -HALF, width: 2 * HALF, height: 2 * HALF, fill: color }, e);
  return e;
}
// A re-run restarts only the sketch's contents: they go in 0.12 s; the pane and the painted canvas stay (no blink, 5.1.2 EYES #4).
function flClear(els, t0) { els.forEach(e => e && hide(e, t0, .12)); }
// The wipe, in slow motion: background('#222') paints the whole canvas over the last picture. A #222 band sweeps left to right
// behind a muted edge line (the only helper drawn on the canvas, shown only under "slow motion"); what it passes is gone after.
function flWipe(pv, t0, gone = [], dur = .6) {
  const ST = STG(), g = G(pv.kids, { o: 0 });
  const band = mk('rect', { x: CV.x, y: CV.y, width: 0, height: CV_S, fill: ST.canvas }, g);
  const edge = path(g, `M${CV.x} ${CV.y}V${CV.y + CV_S}`, { stroke: COL.muted, 'stroke-width': 4 });
  prog(q => { band.setAttribute('width', q * CV_S); put(edge, { x: q * CV_S }); }, t0, dur, lin);
  tw(g, { o: 1 }, t0, .05); tw(g, { o: 0 }, t0 + dur, .12);
  gone.forEach(e => tw(e, { o: 0 }, t0 + dur * .55, .01));
  return g;
}
// A real-speed run from beat time ts: on frame n the square is at x0 + step * n (frame 1 is the first picture). Sets the
// counter and the x readout. `n0` continues a slow-motion run at full speed (frames n0+1, n0+2, ... from ts).
function flRunFull(sq, top, ts, until, { x0 = 200, step = 2, n0 = 0 } = {}) {
  prog(q => {
    const t = q * (until - ts), n = n0 + Math.floor(t * FPS) + (n0 ? 0 : 1), x = x0 + step * n;
    put(sq, { x: cvX(x) }); top.n(n); top.x(x);
  }, ts, until - ts, lin);
}
// The 5.1.4 sketch's run: draw() makes a new 40 x 40 sprite (deeppink, moSHion's default) at (200, 200) every frame. In the
// real runner they are dynamic bodies: each new one shoves the others aside, so the crowd spreads from the middle and fills the
// canvas (measured on public/moshion/runner.html: x spread 52..348 after 0.5 s, past both edges after 1 s). Recreated here as a
// pure function of the time since the press: sprite k (made on frame k) sits about sqrt(C2 * age) units out along its own
// pseudo-random angle (the first few along the axes, as the real ones go), turned a little. The angles are hashed, not stepped: a
// regular angle step drew spiral arms (a pinwheel), which the real crowd never shows. A pool of 180 squares is enough: older ones are off the canvas.
function flBurst(pv, top) {
  const ST = STG(), g = G(pv.kids), pool = 180, sq = [];
  for (let k = 0; k < pool; k++) { const e = G(g, { o: 0 }); mk('rect', { x: -HALF, y: -HALF, width: 2 * HALF, height: 2 * HALF, fill: ST.sprite }, e); sq.push(e); }
  const C2 = 33950;                                                      // 40 x 40 squares packed loosely: 120 units out after 0.4 s
  const hs = (k, j) => { const v = Math.sin(k * 127.1 + j * 311.7) * 43758.5453; return v - Math.floor(v); };   // 0..1, no pattern
  const ang = k => k < 20 ? (k % 4) * Math.PI / 2 + (hs(k, 0) - .5) * .3 : 2 * Math.PI * hs(k, 1);
  const far = k => .8 + .4 * hs(k, 2);
  const rot = k => (hs(k, 3) - .5) * 80;
  const set = T => {                                                     // T: seconds since the first frame
    const n = Math.floor(T * FPS) + 1;                                   // sprites made so far
    for (let s = 0; s < pool; s++) {
      if (n - 1 < s) { put(sq[s], { o: 0 }); continue; }
      const k = s + pool * Math.floor((n - 1 - s) / pool), age = Math.max(0, T - k / FPS), rho = far(k) * Math.sqrt(C2 * age);
      if (rho > 330) { put(sq[s], { o: 0 }); continue; }
      const a = ang(k), ux = 200 + rho * Math.cos(a), uy = 200 + rho * Math.sin(a), r = rot(k) * Math.min(1, age * 1.5);
      // wholly off the canvas (its turned box misses it): the canvas clips it, so it is not drawn at all, and it leaves no box
      // behind for the layout checks
      const e = SPR / 2 * (Math.abs(Math.cos(r * Math.PI / 180)) + Math.abs(Math.sin(r * Math.PI / 180)));
      if (ux + e <= 0 || ux - e >= 400 || uy + e <= 0 || uy - e >= 400) { put(sq[s], { o: 0 }); continue; }
      put(sq[s], { x: cvX(ux), y: cvY(uy), r, o: 1 });
    }
    top.s(n); top.n(n);
  };
  return { g, set, run: (t0, until, T0 = 0) => prog(q => set(T0 + q * (until - t0)), t0, until - t0, lin) };
}
// Over the pane: "frame N" at the left, and at the right either "x = N" or "sprites N". All three are explanations (outside the pane).
function flTop(p) {
  const ST = STG(), g = G(p);
  const fcG = G(g, { o: 0 }), fc = msRuns(fcG, [['frame ', COL.muted, 500, UI, 26], ['0', COL.text, 500, MONO]], { x: PANE.x + 6, y: TOP_Y, size: 32, anchor: 'start' });
  const xrG = G(g, { o: 0 }), xr = msRuns(xrG, [['x', ST.x, 600, MONO], [' = ', COL.muted, 400, MONO], ['200', COL.text, 500, MONO]], { x: PANE.x + PANE.w - 6, y: TOP_Y, size: 32, anchor: 'end' });
  const srG = G(g, { o: 0 }), sr = msRuns(srG, [['sprites ', COL.muted, 500, UI, 26], ['0', COL.text, 500, MONO]], { x: PANE.x + PANE.w - 6, y: TOP_Y, size: 32, anchor: 'end' });
  const set = (run, v) => { run.textContent = String(v); };
  return { g, fcG, xrG, srG, fc, xr, sr, n: v => set(fc.runs[1], v), x: v => set(xr.runs[2], v), s: v => set(sr.runs[1], v) };
}
const flSet = (f, v, t0) => prog(() => f(v), t0, 0, lin);                // a readout takes value v at t0
function flModeLabel(p, text, t0, t1) {
  const e = msText(p, text, { x: UPX, y: UP1, size: 24, fill: COL.muted, weight: 500, anchor: 'middle', o: 0 });
  show(e, t0, .3); if (t1 != null) hide(e, t1, .3);
  return e;
}
// A flipbook page centred on (cx, cy): a small picture of the canvas with the square at x = u (to scale: 72 px for 400 units).
// Groups are placed at their own centre, so a bump grows in place.
function flPage(p, cx, cy, u, o = 0, w = 72) {
  const ST = STG(), g = G(p, { x: cx, y: cy, o }), k = w / 400, s = SPR * k;
  mk('rect', { x: -w / 2, y: -w / 2, width: w, height: w, rx: 3, fill: ST.canvas, stroke: COL.raised, 'stroke-width': 2 }, g);
  mk('rect', { x: -w / 2 + u * k - s / 2, y: -w / 2 + 200 * k - s / 2, width: s, height: s, fill: ST.blue }, g);
  return g;
}
// A function-call pill for the timeline ("setup()" / "draw()"), its group at the pill's centre.
function flPill(p, x, w, name, y = 684) {
  const SX = SXT(), g = G(p, { x: x + w / 2, y, o: 0 });
  mk('rect', { x: -w / 2, y: -22, width: w, height: 44, rx: 22, fill: COL.panel, stroke: COL.raised, 'stroke-width': 2 }, g);
  msRuns(g, [[name, SX.fn, 400, MONO], ['()', SX.punct, 400, MONO]], { x: 0, y: 8, size: 24 });
  return g;
}

const BEATS = [
  ['hello', 'Hello', (m, D) => {
    const p = panel(0);
    S.title = G(p);
    show(msText(S.title, 'moSHion · 5.1.12', { x: 70, y: 74, size: 22, fill: COL.purple, weight: 600, o: 0 }), m('code', -.1), .4);
    const tt = msText(S.title, 'The frame loop', { x: 70, y: 124, size: 46, fill: COL.text, weight: 600, o: 0 });
    tw(tt, { o: 1, y: 124 }, m('code'), .5, out); put(tt, { y: 136 });
    S.code = flCode(p, m('code'));
    tw(S.code.g, { y: 0 }, m('code'), .55, out); put(S.code.g, { y: 14 });
    // "When it runs, the square just sits still.": the student's own run of it (they ran it in 5.1.11)
    S.pv = flPane(p, m('sits', -.05));
    S.sq = flSq(S.pv, 200, STG().blue, 0); show(S.sq, m('sits', .1), .35);
    S.top = flTop(p);
    msBump(S.sq, m('title', .2), 1.18);                                   // "Let's make it move"
  }],

  ['loop', 'setup once, draw every frame', (m, D) => {
    const C = S.code, p = S.panel, pv = S.pv, top = S.top, H = D + .1, SX = SXT();
    // "When you press Run": the sketch restarts. In slow motion: setup() first, so nothing is painted until draw() runs.
    msPress(C, p, m('click'), .35);
    flClear([S.sq], m('click', .15));
    S.mode1 = flModeLabel(p, 'slow motion', m('click', .35), m('sixty', -.2));
    show(C.bar, m('setup', -.05), .3); flBarTo(C.bar, 1, 5, m('setup', -.05), .01);   // the setup block, lines 2 to 6
    S.tl = G(p);
    const pSetup = flPill(S.tl, ZONE.x, 140, 'setup');
    show(pSetup, m('setup'), .3); msBump(pSetup, m('setup', .05));
    show(msText(S.tl, 'once', { x: ZONE.x + 70, y: 748, size: 22, fill: COL.muted, anchor: 'middle', o: 0 }), m('setup', .3), .3);
    flBarTo(C.bar, 2, 3, m('makes'));                                     // "setup makes the canvas and the sprite": lines 3 to 5
    // "Then moSHion calls draw": frame 1, the first picture
    flBarTo(C.bar, 6, 3, m('draw', -.05));
    show(top.fcG, m('draw'), .25); flSet(top.n, 1, m('draw'));
    const sq = S.sq2 = flSq(pv, 200, STG().blue, 0); show(sq, m('draw', .25), .2);
    msArrow(S.tl, ZONE.x + 148, 684, ZONE.x + 184, 684, COL.muted, m('draw'), .25, 3);
    const DX = i => ZONE.x + 252 + i * 132;                              // centres of the three draw() calls (and their pages)
    const pills = [0, 1, 2].map(i => flPill(S.tl, DX(i) - 55, 110, 'draw'));
    // "again, and again": frames 2 and 3, the same picture each time
    [['draw', 0], ['again1', 1], ['again2', 2]].forEach(([k, i]) => {
      show(pills[i], m(k), .25); msBump(pills[i], m(k, .02));
      tw(C.bar, { o: .55 }, m(k, -.02), .08); tw(C.bar, { o: 1 }, m(k, .08), .2);
      if (i) flSet(top.n, i + 1, m(k));
    });
    // "about 60 times every second": full speed from here; the counter climbs about 60 a second
    S.mode2 = flModeLabel(p, 'full speed', m('sixty'), H - .4);
    const dots = msText(S.tl, '…', { x: DX(2) + 96, y: 694, size: 36, fill: COL.muted, anchor: 'middle', o: 0 });
    show(dots, m('sixty'), .3);
    msBump(top.fc, m('sixty', .3), 1.15);
    flRunFull(sq, { n: top.n, x: () => {} }, m('sixty'), H - .4, { x0: 200, step: 0, n0: 3 });
    // "Each call to draw makes one frame: one finished picture on the canvas.": each draw() call becomes a page
    const pages = [0, 1, 2].map(i => flPage(S.tl, DX(i), 682, 200, 0, 88));
    const fl = [0, 1, 2].map(i => msText(S.tl, `frame ${i + 1}`, { x: DX(i), y: 752, size: 22, fill: COL.muted, anchor: 'middle', o: 0 }));
    pills.forEach((e, i) => hide(e, m('frame', .1 + i * .12), .3));
    pages.forEach((e, i) => { tw(e, { o: 1 }, m('frame', .2 + i * .12), .35); });
    fl.forEach((e, i) => show(e, m('frame', .3 + i * .12), .3));
    pages.forEach((e, i) => msBump(e, m('pic', i * .12), 1.1));
    // "So 60 frames per second means 60 new pictures every second.": the term, under the pane
    S.fps = msRuns(p, [['60', COL.text, 600, MONO], [' frames per second', COL.text, 600]], { x: UPX, y: UP2, size: 28, o: 0 });
    show(S.fps, m('fps'), .35); hide(S.fps, H - .4, .3);
    // "It's like a flipbook: flip the pages fast": a ring hops across the pages, three times round
    const ring = G(S.tl, { x: DX(0), y: 682, o: 0 });
    mk('rect', { x: -52, y: -52, width: 104, height: 104, rx: 6, fill: 'none', stroke: COL.purple, 'stroke-width': 4 }, ring);
    for (let j = 0; j < 9; j++) { const t = m('flip', j * .14); tw(ring, { o: 1 }, t, .01); tw(ring, { x: DX(j % 3) }, t, .01); }
    hide(ring, m('flip', 9 * .14), .2);
    // "Right now every page is the same": equals signs between the pages
    [0, 1].forEach(i => show(msText(S.tl, '=', { x: DX(i) + 66, y: 693, size: 32, fill: COL.text, anchor: 'middle', weight: 600, o: 0 }), m('same', .2 + i * .15), .3));
    hide(top.fcG, H - .4, .3); tw(C.bar, { o: 0 }, H - .4, .3);
    msHold(H);
  }, { keep: true }],

  ['move', 'Add one line', (m, D) => {
    const C = S.code, p = S.panel, ST = STG(), H = D + .1;
    hide(S.tl, m('add'), .4);
    // "add one line inside draw": the draw block lights, the closing brace moves down, and the line types in
    show(C.bar, m('add', .05), .3); flBarTo(C.bar, 6, 3, m('add', .05), .01);
    const mv = flRow(C.main.g, MOVE_LINE, 8, C.main.spans, 0);
    const brace = C.main.rows[8];
    C.main.rows.splice(8, 0, mv.row); C.main.texts.splice(8, 0, mv.t);
    S.mv = mv;
    tw(brace, { y: codeBase(9) }, m('add', 1.3), .4);
    show(C.nums[9], m('add', 1.3), .4);
    flBarTo(C.bar, 6, 4, m('add', 1.3), .4);
    flType(mv.row, mv.t, m('add', 1.75), 1.2);
    // "under the background line"
    flBarTo(C.bar, 7, 1, m('under', -.05));
    flBarTo(C.bar, 8, 1, m('under', .75));
    // "It reads the sprite's x, adds 2, and puts the new number back into x."
    S.cmv = G(C.cm);
    flUnder(S.cmv, mv.row, mv.t, 17, 29, ST.x, m('reads'));
    flUnder(S.cmv, mv.row, mv.t, 30, 33, COL.purple, m('plus'));
    flUnder(S.cmv, mv.row, mv.t, 2, 14, ST.x, m('back', .1));
    // ...the same thing with numbers, under the editor: x is 200; 200 + 2 is 202; 202 goes back into x
    const f = S.flow = G(p), Y = 700;
    show(msText(f, 'x', { x: ZONE.x + 64, y: 652, size: 28, fill: ST.x, weight: 600, italic: true, anchor: 'middle', o: 0 }), m('reads'), .3);
    const boxA = G(f, { o: 0 });
    mk('rect', { x: ZONE.x, y: Y - 28, width: 128, height: 56, rx: 10, fill: COL.panel, stroke: ST.x, 'stroke-width': 2.5 }, boxA);
    const va = msText(boxA, '200', { x: ZONE.x + 64, y: Y + 11, size: 32, fill: COL.text, font: MONO, weight: 500, anchor: 'middle' });
    show(boxA, m('reads'), .35);
    const sum = G(f);                                                     // "+ 2" and its answer: they go once 202 is back in x
    msArrow(sum, ZONE.x + 140, Y, ZONE.x + 262, Y, COL.purple, m('plus', .05), .5);
    show(msText(sum, '+ 2', { x: ZONE.x + 200, y: Y - 14, size: 26, fill: COL.purple, font: MONO, weight: 600, anchor: 'middle', o: 0 }), m('plus', .05), .3);
    const boxB = G(sum, { o: 0 });
    mk('rect', { x: ZONE.x + 274, y: Y - 28, width: 128, height: 56, rx: 10, fill: COL.panel, stroke: COL.raised, 'stroke-width': 2.5 }, boxB);
    msText(boxB, '202', { x: ZONE.x + 338, y: Y + 11, size: 32, fill: COL.text, font: MONO, weight: 500, anchor: 'middle' });
    show(boxB, m('plus', .45), .3);
    // the way back: from 202, under both boxes, up into x
    const back = G(sum);
    draw(path(back, `M${ZONE.x + 338} ${Y + 30}V${Y + 50}H${ZONE.x + 64}V${Y + 36}`, { stroke: ST.x, 'stroke-width': 3 }, { d: 0 }), m('back', .1), .7);
    show(path(back, `M${ZONE.x + 54} ${Y + 46}L${ZONE.x + 64} ${Y + 32}L${ZONE.x + 74} ${Y + 46}`, { stroke: ST.x, 'stroke-width': 3 }, { o: 0 }), m('back', .75), .15);
    show(msText(back, 'back into x', { x: ZONE.x + 420, y: Y + 58, size: 22, fill: COL.muted, weight: 500, o: 0 }), m('back', .5), .3);
    const fl = mk('rect', { x: ZONE.x + 14, y: Y - 22, width: 100, height: 44, rx: 6, fill: COL.purple }, boxA); boxA.insertBefore(fl, va); put(fl, { o: 0 });
    tw(fl, { o: .45 }, m('back', .85), .2); tw(fl, { o: 0 }, m('back', 1.3), .45);
    prog(q => { va.textContent = q < .5 ? '200' : '202'; }, m('back', .9), .4, lin);
    hide(sum, m('back', 1.5), .4);                                        // x is now 202: "200 + 2" is used up
    S.flowVal = va; S.sum = sum;
    // "A bigger x is farther to the right.": under the pane (outside it, so not something the sketch draws)
    S.bigger = G(p);
    msArrow(S.bigger, PANE.x + 90, UP1 - 8, PANE.x + PANE.w - 90, UP1 - 8, ST.x, m('bigger'), .7);
    show(msRuns(S.bigger, [['bigger ', COL.muted], ['x', ST.x, 600, MONO]], { x: UPX, y: UP2, size: 26, o: 0 }), m('bigger', .3), .3);
    tw(C.bar, { o: 0 }, H - .4, .3);
    msHold(H);
  }, { keep: true }],

  ['frames', 'One frame at a time', (m, D) => {
    const C = S.code, p = S.panel, pv = S.pv, top = S.top, ST = STG(), mv = S.mv, H = D + .1;
    hide(S.flow, m('press'), .4); hide(S.bigger, m('press'), .4); hide(S.cmv, m('press'), .3);
    // "Press Run": the new code runs. Slow motion: nothing is painted until frame 1's draw() has run.
    msPress(C, p, m('click'), .28);
    flClear([S.sq2], m('click', .15));
    S.mode3 = flModeLabel(p, 'slow motion: one frame at a time', m('slow'), m('full', -.2));
    // the strip: one page per frame, the x it was drawn at over it
    S.strip = G(p);
    const SLOT = i => ZONE.x + 50 + i * 134, PY = 702;                    // page centres; each page group sits at its centre
    const page = (i, u, n, t0) => {
      const g = G(S.strip, { x: SLOT(i), y: PY, o: 0 });
      flPage(g, 0, 0, u, 1, 84);
      msText(g, `x ${u}`, { x: 0, y: -50, size: 22, fill: ST.x, font: MONO, weight: 500, anchor: 'middle' });
      msText(g, `frame ${n}`, { x: 0, y: 64, size: 22, fill: COL.muted, weight: 500, anchor: 'middle' });
      tw(g, { o: 1 }, t0, .35); msBump(g, t0, 1.08);
      return g;
    };
    // one slow frame: the counter, the draw block, the wipe (background line), the new x (the new line), then moSHion draws
    // Fix round (EYES #1): line 9 no longer rests lit with nothing happening. On frame 1 the bar lands on "The new line" together
    // with the x readout and a cyan underline under the right-hand player.pos.x (it reads x); the readout bumps on "from 200";
    // the "+ 2" underline and the tick to 202 land on "202". Frames 2 and 3: the bar lands on "x is", the tick on the number.
    S.cmf = G(C.cm);
    const slow = (n, kf, kw, ks, kp, old, kn) => {
      flSet(top.n, n, m(kf)); if (n === 1) show(top.fcG, m(kf), .25);
      flBarTo(C.bar, 6, 4, m(kf, -.05), .2); if (n === 1) show(C.bar, m(kf, -.05), .3);
      flBarTo(C.bar, 7, 1, m(kw, -.05), .3);
      flWipe(pv, m(kw, .05), old ? [old] : []);
      flBarTo(C.bar, 8, 1, m(ks, -.05), .3);
      if (n === 1) {
        show(top.xrG, m(ks), .3); flSet(top.x, 200, m(ks));
        flUnder(S.cmf, mv.row, mv.t, 17, 29, ST.x, m(ks, .1));             // it reads x ...
        msBump(top.xr, m('x200', -.05), 1.12);                               // ... which is 200 ...
        flUnder(S.cmf, mv.row, mv.t, 30, 33, COL.purple, m(kn, -.25));      // ... adds 2 ...
        hide(S.cmf, m(kp, -.05), .3);
      }
      const x = 200 + 2 * n, xs = m(kn, -.05);                               // ... and x is now 202 (204, 206), on the number
      flSet(top.x, x, xs); msBump(top.xr, xs, 1.12);
      tw(C.bar, { o: .35 }, m(kp, -.05), .2);                            // draw() has finished: moSHion draws the sprites
      const sq = flSq(pv, x, ST.blue, 0); show(sq, m(kp, .1), .2);
      tw(C.bar, { o: 1 }, m(kp, .55), .2);
      page(n - 1, x, n, m(kp, .3));
      return sq;
    };
    const s1 = slow(1, 'f1', 'w1', 's1', 'p1', null, 'n202');
    const s2 = slow(2, 'f2', 'w2', 's2', 'p2', s1, 'n204');
    const s3 = slow(3, 'f3', 'w3', 's3', 'p3', s2, 'n206');
    S.fr = [s1, s2, s3];
    // "Each step is just 2 pixels, too small to notice."
    msBump(top.xr, m('tiny', .3), 1.15);
    // "But 60 frames go by every second.": ... frame 60
    const dots = msText(S.strip, '…', { x: SLOT(3), y: 712, size: 36, fill: COL.muted, anchor: 'middle', o: 0 });
    show(dots, m('but'), .3);
    const p60 = page(4, 320, 60, m('but', .25));
    // "2 pixels times 60 is 120 pixels, so after one second, the square has moved from 200 to 320."
    const math = msRuns(p, [['2', COL.purple, 600, MONO], [' × ', COL.muted], ['60', COL.text, 600, MONO], [' = ', COL.muted], ['120', ST.x, 600, MONO], [' pixels each second', COL.muted]],
      { x: UPX, y: UP2, size: 26, o: 0 });
    S.math = math;
    show(math, m('math'), .35);
    msBump(p60, m('sec', 1.2), 1.06);                                     // small: its label sits 10 px above the caption band
    // "Here it is at full speed.": frames 4, 5, 6, ... sixty a second; x keeps growing after the square has left the canvas
    S.mode4 = flModeLabel(p, 'full speed', m('full'), H - .4);
    flRunFull(s3, top, m('full'), H - .4, { x0: 200, step: 2, n0: 3 });
    msBump(p60, m('full', 57 / FPS), 1.06);                              // the counter passes 60: the square is at 320
    hide(top.fcG, H - .4, .3); hide(top.xrG, H - .4, .3); hide(S.math, H - .4, .3); tw(C.bar, { o: 0 }, H - .4, .3);
    msHold(H);
  }, { keep: true }],

  ['bug', 'Make it in setup', (m, D) => {
    const C = S.code, p = S.panel, pv = S.pv, top = S.top, SX = SXT(), H = D + .1;
    hide(S.strip, m('where'), .4);
    // "The sprite is made in setup, which runs once."
    show(C.bar, m('where'), .3); flBarTo(C.bar, 3, 1, m('where'), .01);
    const box = path(C.marks, `M${CODE.x + 12} ${codeBase(1) - 34}H${CODE.x + CODE.w - 12}V${codeBase(5) + 14}H${CODE.x + 12}Z`, { stroke: COL.purple, 'stroke-width': 3 }, { d: 0 });
    draw(box, m('insetup', -.05), .8);
    S.z1 = G(p);
    show(msRuns(S.z1, [['setup', SX.fn, 400, MONO], ['()', SX.punct, 400, MONO], ['  runs once', COL.muted]], { x: ZONE.x, y: 700, size: 26, anchor: 'start', o: 0 }), m('insetup', .1), .35);
    // "The sketch in 5.1.4 made the sprite inside draw instead.": the editor shows the 5.1.4 sketch
    hide(box, m('remember'), .3); hide(S.z1, m('remember'), .3); tw(C.bar, { o: 0 }, m('remember'), .2);
    hide(C.main.g, m('remember'), .35); show(C.bug.g, m('remember', .2), .4);
    C.nums.forEach((e, i) => { if (i >= 7) hide(e, m('remember'), .3); });
    const red = flBar(C.marks, 5, 1, 0, COL.red);
    show(red, m('remember', 1.4), .3);
    S.cmRed = G(C.cm);
    flUnder(S.cmRed, C.bug.rows[5], C.bug.texts[5], 2, 30, COL.red, m('remember', 1.5));
    S.z2 = G(p);
    show(msRuns(S.z2, [['new Sprite', COL.text, 500, MONO], [' inside ', COL.muted], ['draw', SX.fn, 400, MONO], ['()', SX.punct, 400, MONO],
      [': a new sprite every frame', COL.muted]], { x: ZONE.x, y: 700, size: 24, anchor: 'start', o: 0 }), m('remember', 1.7), .35);
    // "Run it, and draw makes a brand-new sprite every frame: 60 new sprites every second."
    msPress(C, p, m('click'));
    const bz = S.burst = flBurst(pv, top);
    show(top.fcG, m('click', .3), .25); show(top.srG, m('click', .3), .25);
    bz.run(m('click', .3), H);
    S.burstT = H - m('click', .3);
    msBump(top.sr, m('n60', .1), 1.15);
    // "So make the sprite in setup, and change it in draw.": back to the moving sketch, the two lines lit
    hide(S.z2, m('rule', -.1), .3); hide(red, m('rule', -.1), .3); hide(S.cmRed, m('rule', -.1), .3);
    hide(C.bug.g, m('rule', -.1), .35); show(C.main.g, m('rule', .05), .4);
    C.nums.forEach((e, i) => { if (i >= 7) show(e, m('rule', .05), .3); });
    show(C.bar, m('rule', .1), .3); flBarTo(C.bar, 3, 1, m('rule', .1), .01);
    show(C.bar2, m('change', -.05), .3); flBarTo(C.bar2, 8, 1, m('change', -.05), .01);
    S.z3 = G(p);
    msWords(msRuns(S.z3, [['make it in ', COL.muted], ['setup', SX.fn, 400, MONO], ['   ·   ', COL.muted], ['change it in ', COL.muted], ['draw', SX.fn, 400, MONO]],
      { x: ZONE.x, y: 700, size: 26, anchor: 'start' }), [[0, m('rule', .1)], [1, m('rule', .5)], [2, m('change', -.1)], [3, m('change')], [4, m('change', .4)]]);
    hide(top.fcG, H - .4, .3); hide(top.srG, H - .4, .3);
    msHold(H);
  }, { keep: true }],

  ['try', 'Try it', (m, D) => {
    const C = S.code, p = S.panel, pv = S.pv, top = S.top, ST = STG(), mv = S.mv, H = D + .1;
    // the 5.1.4 sketch keeps running until Run is pressed; fix round (EYES #3): it dims to 25% while the edit is explained, so
    // the eye goes to line 9, and goes on the press
    S.burst.run(0, m('click', .2), S.burstT);
    tw(S.burst.g, { o: .25 }, m('try'), .5);
    hide(S.z3, m('try'), .3); hide(C.bar, m('try'), .3);
    flBarTo(C.bar2, 8, 1, m('try'), .01);
    // "Try this: in the new line, change the 2 to a 5." (fix round, EARS #9: the voice says which 2)
    tw(C.bar2.sp, { a_width: 12 }, m('inl'), .2, out); tw(C.bar2.sp, { a_width: 5 }, m('inl', .3), .4);
    flEdit(mv.row, mv.t, 32, 33, [C.main.spans.step], '5', m('n5', -.1));
    S.cm5 = G(C.cm);
    flUnder(S.cm5, mv.row, mv.t, 32, 33, COL.purple, m('n5', .4));
    // "Each frame now moves the square 5 pixels: 300 pixels every second."
    const math = msRuns(p, [['5', COL.purple, 600, MONO], [' × ', COL.muted], ['60', COL.text, 600, MONO], [' = ', COL.muted], ['300', ST.x, 600, MONO], [' pixels each second', COL.muted]],
      { x: UPX, y: UP2, size: 26, o: 0 });
    S.math5 = math;
    show(math, m('math', -.1), .35);
    // "Press Run, and it reaches the edge in less than one second."
    msPress(C, p, m('click'), .3);
    flClear([S.burst.g], m('click', .15));
    S.mode5 = flModeLabel(p, 'full speed', m('click', .3), H - .4);
    const sq = S.sq5 = flSq(pv, 205, ST.blue, 0); show(sq, m('click', .3), .05);
    show(top.fcG, m('click', .3), .2); show(top.xrG, m('click', .3), .2);
    flRunFull(sq, top, m('click', .3), H - .4, { x0: 200, step: 5 });
    hide(top.fcG, H - .4, .3); hide(top.xrG, H - .4, .3);
    msHold(H);
  }, { keep: true }],

  ['close', 'Up next', (m, D) => {
    const p = panel(0), SX = SXT();
    const row = (runs, y, t0, size = 40, weight = 600, x = 800) => { const t = msRuns(p, runs, { x, y, size, weight, o: 0 }); tw(t, { o: 1, y }, t0, .45, out); put(t, { y: y + 10 }); return t; };
    // "setup runs once. draw runs every frame, about 60 times a second."
    row([['setup', SX.fn, 400, MONO], ['()', SX.punct, 400, MONO], ['   runs once', COL.text, 500]], 210, m('sum', -.05), 40);
    row([['draw', SX.fn, 400, MONO], ['()', SX.punct, 400, MONO], ['   runs every frame: about ', COL.text, 500], ['60', COL.text, 600, MONO], [' a second', COL.text, 500]], 290, m('sumd', -.05), 40);
    // "Next, in 5.1.13, you'll read how a sketch checks if a key is held down." (fix round, EARS #6: 5.1.13 is the reading on
    // kb.pressing(key); the end card says what it is about in plain words and never names the API)
    show(msText(p, 'UP NEXT', { x: 800, y: 440, size: 22, fill: COL.purple, weight: 600, anchor: 'middle', o: 0 }), m('next', -.05), .35);
    row([['5.1.13 Reading', COL.text]], 512, m('next', .15), 60);
    row([['how a sketch checks if a key is held down', COL.muted]], 580, m('next', 1.2), 32, 500);
    msHold(Math.max(D, m('bye', 1.8)) + .1);                              // the wave finishes, then the end card holds
  }],
].map(([id, title, run, extra]) => ({ id, title, run, ...extra }));

// ---- SH: bottom-left, never the subject. Every change lands on a narration mark. His leans are small (k .5, about 10 px):
// the editor and the zone under it start 50 px right of his corner, and text keeps 40 px from his box (tools/spacing.py). The expressions that carry a moment are the
// three that read at 1000 px (delighted: open smile; surprise: the O; proud: closed eyes and blush), plus determined's deep V. ----
const CODEC = [630, 380], PANEC = [1290, 410], ZONEC = [640, 700], TOPC = [1290, 110];
bindActs({
  hello: { act: (t, m, D, s, MV) => {
    s.pose = 'down';
    emo(t, s, [[0, { expr: 'delighted', amp: 1.15, look: [1150, 430] }],
      [m('code', -.1), { expr: 'curious', tilt: 6, amp: 1, look: CODEC }],
      [m('sits', -.1), { expr: 'determined', tilt: 0, look: PANEC, pose: 'pointUp' }],             // the square, sitting still
      [m('title', -.1), { expr: 'delighted', amp: 1.15, look: PANEC, pose: 'down' }]]);           // "Let's make it move"
    MV.wave(t, s, m('hi', -.15), 1.9);
  } },
  loop: { act: (t, m, D, s) => {
    s.pose = 'down';
    emo(t, s, [[0, { expr: 'determined', look: RUN_C }],
      [m('setup', -.1), { expr: 'determined', look: CODEC, pose: 'pointUp' }],                    // setup, once
      [m('draw', -.1), { expr: 'surprise', amp: 1, look: PANEC, pose: 'down' }],                   // frame 1 appears
      [m('again1', -.1), { expr: 'delighted', amp: 1.1, look: ZONEC, pose: 'point' }],             // again, and again
      [m('sixty', -.1), { expr: 'surprise', look: TOPC, pose: 'down' }],                           // sixty a second
      [m('frame', -.1), { expr: 'determined', look: ZONEC, pose: 'point' }],                       // a frame: one picture
      [m('book', -.1), { expr: 'delighted', amp: 1.15, look: ZONEC }],                             // a flipbook
      [m('same', -.1), { expr: 'proud', amp: 1.05, look: PANEC, pose: 'down' }]]);                // every page is the same
    kick.lean(t, s, m('draw', -.05), .5, .5);
  } },
  move: { act: (t, m, D, s) => {
    s.pose = 'pointUp';
    emo(t, s, [[0, { expr: 'determined', look: CODEC }],
      [m('reads', -.1), { expr: 'curious', tilt: 5, look: ZONEC, pose: 'point' }],
      [m('back', -.1), { expr: 'surprise', tilt: 0, amp: 1, look: ZONEC }],                        // 202 goes back into x
      [m('back', .9), { expr: 'delighted', amp: 1.1 }],
      [m('bigger', -.1), { expr: 'proud', amp: 1.05, look: [1290, 700], pose: 'down' }]]);
  } },
  frames: { act: (t, m, D, s) => {
    s.pose = 'down';
    emo(t, s, [[0, { expr: 'determined', look: RUN_C }],
      [m('f1', -.1), { expr: 'curious', tilt: 5, look: TOPC }],
      [m('w1', -.1), { expr: 'determined', tilt: 0, look: PANEC }],
      [m('p1', -.1), { expr: 'surprise', amp: 1, look: PANEC }],                                   // the square is drawn
      [m('f2', -.1), { expr: 'delighted', amp: 1.1, look: PANEC }],
      [m('tiny', -.1), { expr: 'curious', tilt: 6, look: [1440, 110] }],                          // 2 px: too small to notice
      [m('but', -.1), { expr: 'determined', tilt: 0, look: ZONEC, pose: 'point' }],
      [m('math', -.1), { expr: 'proud', amp: 1.05, look: [1290, 750], pose: 'down' }],
      [m('full', -.1), { expr: 'surprise', amp: 1, look: PANEC }],                                 // full speed
      [m('off', .3), { expr: 'delighted', amp: 1.15, look: [1530, 410] }]]);                       // off the edge
    kick.lean(t, s, m('full', -.05), .5, .5);
  } },
  bug: { act: (t, m, D, s) => {
    s.pose = 'pointUp';
    emo(t, s, [[0, { expr: 'determined', look: CODEC }],
      [m('remember', -.1), { expr: 'curious', tilt: 6, look: [600, 420] }],
      [m('click', -.1), { expr: 'determined', tilt: 0, look: RUN_C }],
      [m('every', -.1), { expr: 'surprise', amp: 1, look: PANEC, pose: 'down' }],                  // the canvas fills up
      [m('shove', -.1), { expr: 'alarmed', amp: 1, look: PANEC }],
      [m('rule', -.1), { expr: 'proud', amp: 1.05, look: CODEC, pose: 'pointUp' }]]);             // make it in setup, change it in draw
    kick.lean(t, s, m('every', -.05), .5, .5);
  } },
  try: { act: (t, m, D, s) => {
    s.pose = 'pointUp';
    emo(t, s, [[0, { expr: 'curious', tilt: 5, look: CODEC }],
      [m('edit', -.1), { expr: 'determined', tilt: 0, look: [860, 548] }],                         // the 2 becomes 5
      [m('math', -.1), { expr: 'delighted', amp: 1.1, look: [1290, 750], pose: 'down' }],
      [m('press', -.1), { expr: 'determined', look: RUN_C, pose: 'pointUp' }],
      [m('click', .2), { expr: 'surprise', amp: 1, look: PANEC, pose: 'down' }],                   // gone in under a second
      [m('edge', .4), { expr: 'delighted', amp: 1.15, look: [1530, 410] }]]);
    kick.lean(t, s, m('click', .2), .5, .5);
  } },
  close: { act: (t, m, D, s, MV) => {
    s.pose = 'down';
    emo(t, s, [[0, { expr: 'proud', amp: 1.05, look: [800, 220] }],
      [m('next', -.1), { expr: 'delighted', amp: 1.1, look: [800, 500], pose: 'point' }],          // pointing at what is next
      [m('bye', -.15), { pose: 'down' }],
      [m('bye', -.1), { expr: 'delighted', amp: 1.15, look: [800, 420] }]]);
    MV.wave(t, s, m('bye', -.15), 1.9);
  } },
});
boot();
