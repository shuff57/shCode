// moshion-5.2-bounce: the concept explainer for shCode lesson 5.2.11 "Reading: Bounciness and Friction".
// Six beats, one play-through, no questions:
//   hello    the reading's sketch; the two numbers named; the dials. bounciness = 0: the ball lands and stays.
//   bounce   the same sketch at 0.8: the ball bounces, peak ticks at 140 / 87 / 53 px (measured); then 0 and 1.
//   scale    three lanes dropped together at 0 / 0.5 / 0.8: 0 does not bounce, 0.5 reaches 55 px, 0.8 reaches 140.
//   friction the sketch's second document: the sprite pushed at friction 0 (ice, it leaves the canvas), 0.4 (238 px),
//            0.8 (118 px).
//   two      when two sprites touch: bounciness takes the higher value (0.2 on 1 bounces like 1), friction takes the
//            geometric mean (0.9 on 0.4 = 0.6: 158 px, the same stop as 0.6 on 0.6).
//   close    both numbers sit on every sprite; up next 5.2.12 Bouncy Ball.
// Not taught here (5.2.12-5.2.17 and 5.3 teach them): .drag, applyForce, rollingResistance, the Bouncy Ball lab, and
// bounciness above 1 (the reading does not say what it does, so neither does the video).
//
// Truth measured on the real runner (headless moSHion harness; the scripts are review/measure/*.mjs and they print these):
//   gravity 10 is 300 px/s^2 (Box2D 10 m/s^2 at 30 px per metre). The reading's ball: 30x30 at (180, 40), ground
//   360x20 at (180, 280) -> the ball rests with its centre at y 254.55 (ground top 270, half the sprite 15).
//   Drop 214.55 px. A peak is the ball's bottom above the ground = 270 - (centre y + 15):
//     b 0     no rebound, rests at 254.55
//     b 0.5   apexes y 199.99 / 241.49 / 251.12 at frames 107 / 161 / 188 -> 55.0 / 13.5 / 3.9 px
//     b 0.8   apexes y 115.39 / 168.43 / 201.76 at frames 128 / 231 / 313 -> 139.6 / 86.6 / 53.2 px
//     b 1     apexes y 37.42 / 39.99 / 37.42 at frames 143 / 287 / 431 -> 217.1 / 214.6 / 217.1 px: it comes back to the
//             height it started from (the drop was 214.55) and keeps going, losing no height
//   friction, the same 30x30 sprite at (70, 260) with vel.x = 4 px/frame on the same ground, friction equal on both:
//     0 (either side) -> never stops, leaves the canvas at frame 77 (1.28 s), still at 240 px/s
//     0.4 -> 238.0 px;  0.8 -> 118.0 px;  0.9 on 0.4 -> 158.0 px;  0.6 on 0.6 -> 158.0 px (identical: the geometric mean)
//   pair bounciness: ball 0.2 + floor 1 gives exactly the b = 1 apexes above (37.42 / 39.99 / 37.42), so the higher value wins.
//   The drawn paths ARE those traces at 60 Hz (site/traces.js), not a re-simulation. The 0.8 drop's clock is stretched so
//   peaks 1-3 land on [[p1]] [[p2]] [[p3]] ("slow motion", labelled under the pane); every other run is real time.
// Every colour comes from lib/tokens.js. Helper names are bf*; lib globals (frame, label, draw, tick, dot, move, rect, X,
// NEG, ...) are not shadowed.
'use strict';
const CHAPTER = { number: 1, type: 'explainer', title: 'Bounciness and Friction, Explained', kicker: 'moSHion · 5.2.11',
  meta: 'Two and a half minutes, with sound and captions.', minutes: 3, language: 'en', coverGo: 'Play' };

// ---- layout (stage px, 1600x900; y >= 780 is the caption bar's, the bottom-left corner (x < 232, y > 522) is SH's) ----
const CODE = { x: 270, y: 150, w: 740, head: 44, size: 22, lh: 28, x0: 300, rows: 14 };
const codeBase = i => CODE.y + CODE.head + 28 + i * CODE.lh;      // baselines 222, 250, ... 586
const CODE_B = codeBase(CODE.rows - 1) + 22;                       // the panel ends at y 608
const PANE = { x: 1030, y: 150, w: 520, h: 520 };                  // the student's preview (runner.html's #111 page)
const PANE_R = PANE.x + PANE.w - 10;
const CV = { x: 1038, y: 200, k: 1.4, n: 360 };                     // the reading's 360 x 300 canvas, drawn 504 x 420
const cvX = u => CV.x + u * CV.k, cvY = v => CV.y + v * CV.k;
const CVW = 360 * CV.k, CVH = 300 * CV.k;
const SPR = 30, HALF = SPR * CV.k / 2;                             // new Sprite(180, 40, 30, 30): a 42 px square
const GROUND = { x: 180, y: 280, w: 360, h: 20 };
const FLOOR = GROUND.y - GROUND.h / 2, REST = FLOOR - SPR / 2;     // 270, 255
const SLIDE_X = 70;                                                // the pushed sprite starts here
const DIAL = { w: 340, h: 132, y: 624 };
const RUNB = { x: CODE.x + CODE.w - 124, y: CODE.y + 6, w: 110, h: 32 };
const RUN_C = [RUNB.x + RUNB.w / 2, RUNB.y + RUNB.h / 2];          // (941, 172)
const PTR_FROM = [1000, 300], PTR_AT = [RUN_C[0] - 35, RUN_C[1] + 6];
const TR = window.BF_TRACES;
// Marks (m) exist only per sentence. A reveal that belongs INSIDE a sentence is keyed to the word that says it, from
// the word clock in audio/en/words.js (tools/words.py, generated from content/narration.en.timings.json):
// w('two', 'floor') = the first "floor" of that beat; the optional `from` skips an earlier one.
const WORDS = window.BF_WORDS || {};
const wkey = s => s.toLowerCase().replace(/[^a-z0-9.-]/g, '');
function w(beat, text, from = 0) {
  const want = wkey(text);
  for (const [t, x] of WORDS[beat] || []) if (t >= from && wkey(x) === want) return t;
  throw new Error(`${beat}: no word '${text}' at/after ${from}s`);
}

// What the sketch's own lines say, tagged as shCode's editor (lezer javascript + draculaHighlight) tags them.
const tk = kind => (s, id) => [s, kind, id];
const KW = tk('keyword'), PU = tk('punct'), NU = tk('num'), FN = tk('fn'), CL = tk('cls'), SR = tk('str'), OP = tk('op'), ID = tk('ident');
// Document 1: the reading's sketch, verbatim (5-2-6-reading-bounciness-friction/content.md).
const DOC1 = [
  [KW('let'), PU(' '), ID('ball'), PU(', '), ID('ground'), PU(';')],
  [KW('function'), PU(' '), FN('setup'), PU('() {')],
  [PU('  '), KW('new'), PU(' '), CL('Canvas'), PU('('), NU('360'), PU(', '), NU('300'), PU(');')],
  [PU('  '), ID('world'), OP('.'), ID('gravity'), OP('.'), ID('y'), PU(' '), OP('='), PU(' '), NU('10'), PU(';')],
  [PU('  '), ID('ball'), PU(' '), OP('='), PU(' '), KW('new'), PU(' '), CL('Sprite'), PU('('), NU('180'), PU(', '), NU('40'), PU(', '), NU('30'), PU(', '), NU('30'), PU(');')],
  [PU('  '), ID('ball'), OP('.'), ID('color'), PU(' '), OP('='), PU(' '), SR("'deepskyblue'"), PU(';')],
  [PU('  '), ID('ball'), OP('.'), ID('bounciness', 'bn'), PU(' '), OP('='), PU(' '), NU('0.8', 'bv'), PU(';')],
  [PU('  '), ID('ground'), PU(' '), OP('='), PU(' '), KW('new'), PU(' '), CL('Sprite'), PU('('), NU('180'), PU(', '), NU('280'), PU(', '), NU('360'), PU(', '), NU('20'), PU(', '), SR("'static'"), PU(');')],
  [PU('  '), ID('ground'), OP('.'), ID('color'), PU(' '), OP('='), PU(' '), SR("'gray'"), PU(';')],
  [PU('}')],
  [KW('function'), PU(' '), FN('draw'), PU('() {')],
  [PU('  '), FN('background'), PU('('), SR("'#222'"), PU(');')],
  [PU('}')],
];
// Document 2: the pushed sprite. .vel is 5.2.8's idiom (and 5.1's), so nothing here is untaught.
const DOC2 = [
  [KW('let'), PU(' '), ID('block'), PU(', '), ID('ground'), PU(';')],
  [KW('function'), PU(' '), FN('setup'), PU('() {')],
  [PU('  '), KW('new'), PU(' '), CL('Canvas'), PU('('), NU('360'), PU(', '), NU('300'), PU(');')],
  [PU('  '), ID('world'), OP('.'), ID('gravity'), OP('.'), ID('y'), PU(' '), OP('='), PU(' '), NU('10'), PU(';')],
  [PU('  '), ID('block'), PU(' '), OP('='), PU(' '), KW('new'), PU(' '), CL('Sprite'), PU('('), NU('70'), PU(', '), NU('260'), PU(', '), NU('30'), PU(', '), NU('30'), PU(');')],
  [PU('  '), ID('block'), OP('.'), ID('color'), PU(' '), OP('='), PU(' '), SR("'deepskyblue'"), PU(';')],
  [PU('  '), ID('block'), OP('.'), ID('friction', 'bf'), PU(' '), OP('='), PU(' '), NU('0', 'fb'), PU(';')],
  [PU('  '), ID('ground'), PU(' '), OP('='), PU(' '), KW('new'), PU(' '), CL('Sprite'), PU('('), NU('180'), PU(', '), NU('280'), PU(', '), NU('360'), PU(', '), NU('20'), PU(', '), SR("'static'"), PU(');')],
  [PU('  '), ID('ground'), OP('.'), ID('friction', 'gf'), PU(' '), OP('='), PU(' '), NU('0', 'fg'), PU(';')],
  [PU('  '), ID('block'), OP('.'), ID('vel'), OP('.'), ID('x'), PU(' '), OP('='), PU(' '), NU('4'), PU(';')],
  [PU('}')],
  [KW('function'), PU(' '), FN('draw'), PU('() {')],
  [PU('  '), FN('background'), PU('('), SR("'#222'"), PU(');')],
  [PU('}')],
];

// ---- drawing helpers (bf*: adapted from the 5.2.6 gravity explainer) ----
const AP = () => TOKS().app, STG = () => TOKS().stage, SXT = () => TOKS().syntax;
const bfNum = v => String(v);
function bfText(p, str, { x, y, size = 24, fill = COL.text, weight = 500, anchor = 'start', font = UI, o = 1 }) {
  return T(p, str, { x, y, size, fill, weight, anchor, font, o });
}
function bfRuns(p, runs, { x, y, size = 30, anchor = 'middle', font = UI, o = 1, weight = 500 }) {
  const t = bfText(p, '', { x, y, size, anchor, o, weight });
  t.runs = runs.map(([s, f, w, fnt, sz]) => {
    const e = mk('tspan', { fill: f }, t);
    if (w) e.setAttribute('font-weight', w); if (fnt) e.setAttribute('font-family', fnt); if (sz) e.setAttribute('font-size', sz);
    e.textContent = s; return e;
  });
  return t;
}
function bfArrow(p, x1, y1, x2, y2, color, t0, dur = .7, w = 3.5) {
  const g = G(p), a = Math.atan2(y2 - y1, x2 - x1), L = 14;
  draw(path(g, `M${x1} ${y1}L${x2} ${y2}`, { stroke: color, 'stroke-width': w }, { d: 0 }), t0, dur);
  const hd = path(g, `M${x2 - L * Math.cos(a - .5)} ${y2 - L * Math.sin(a - .5)}L${x2} ${y2}L${x2 - L * Math.cos(a + .5)} ${y2 - L * Math.sin(a + .5)}`,
    { stroke: color, 'stroke-width': w }, { o: 0 });
  show(hd, t0 + dur * .8, .15);
  return g;
}
function bfDash(p, d, t0, dur = .45, color = AP().ghost, w = 2.5) {
  const e = mk('path', { d, fill: 'none', stroke: color, 'stroke-width': w, 'stroke-dasharray': '8 7' }, p);
  put(e, { o: 0 });
  show(e, t0, dur);
  return e;
}
function bfHold(t) { prog(() => {}, t, 0, lin); }
function bfBump(e, t0, k = 1.12) { tw(e, { s: k }, t0, .2, out); tw(e, { s: 1 }, t0 + .2, .35); }
function bfPress(C, p, t0, glide = .65) {
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

// ---- the editor: a document group at (CODE.x0, 0), one row group per line at its baseline ----
function bfRow(p, toks, spans, y, o = 1) {
  const SX = SXT(), row = G(p, { y, o });
  const t = bfText(row, '', { x: 0, y: 0, size: CODE.size, font: MONO, weight: 400 });
  for (const [s, kind, id] of toks) {
    const sp = mk('tspan', { fill: SX[kind] }, t);
    if (kind === 'cls') sp.setAttribute('font-style', 'italic');
    sp.textContent = s;
    if (id) spans[id] = sp;
  }
  return { row, t };
}
function bfDoc(parent, lines, spans, t0) {
  const SX = SXT(), g = G(parent, { o: 0, x: CODE.x0 }), rows = [], texts = [];
  lines.forEach((toks, i) => {
    const r = bfRow(g, toks, spans, codeBase(i));
    rows.push(r.row); texts.push(r.t);
  });
  show(g, t0, .3);
  return { g, rows, texts, spans };
}
function bfCode(p, t0) {
  const SX = SXT(), A = AP(), g = G(p, { o: 0 });
  mk('rect', { x: CODE.x, y: CODE.y, width: CODE.w, height: CODE_B - CODE.y, rx: 14, fill: SX.bg, stroke: SX.edge, 'stroke-width': 2 }, g);
  path(g, `M${CODE.x} ${CODE.y + CODE.head}H${CODE.x + CODE.w}`, { stroke: SX.edge, 'stroke-width': 2 });
  // one tab per document: beat 4 swaps script.js out for slide.js when its second sketch takes the panel
  const tab1 = bfText(g, 'script.js', { x: CODE.x + 26, y: CODE.y + 29, size: 22, fill: COL.muted, weight: 500 });
  const tab2 = bfText(g, 'slide.js', { x: CODE.x + 26, y: CODE.y + 29, size: 22, fill: COL.muted, weight: 500, o: 0 });
  path(g, `M${CODE.x + 14} ${CODE.y + CODE.head - 1}H${CODE.x + 124}`, { stroke: COL.purple, 'stroke-width': 3 });
  const run = G(g, { x: RUN_C[0], y: RUN_C[1] });
  const runBg = mk('rect', { x: -RUNB.w / 2, y: -RUNB.h / 2, width: RUNB.w, height: RUNB.h, rx: 5, fill: A.run }, run);
  path(run, 'M-31 -8L-31 8L-18 0Z', { fill: A.runText, stroke: A.runText, 'stroke-width': 1.5 });
  const runLabel = bfText(run, 'Run', { x: -9, y: 9, size: 23, fill: A.runText, weight: 600 });
  const docs = G(g);
  show(g, t0, .5);
  return { g, run, runBg, runLabel, tab1, tab2, docs };
}
// Replace one token's text (a number) at t0, with the editor's purple flash behind it.
function bfSwap(row, span, to, t0) {
  const bb = span.getBBox(), flash = mk('rect', { x: bb.x - 4, y: -24, width: bb.width + 8, height: 32, rx: 6, fill: COL.purple }, null);
  row.insertBefore(flash, row.firstChild); put(flash, { o: 0 });
  tw(flash, { o: .45 }, t0, .2); tw(flash, { o: 0 }, t0 + .45, .45);
  const from = span.textContent;
  prog(q => { span.textContent = q < .5 ? from : to; }, t0 + .05, .4, lin);
  return flash;
}
// A 4 px underline under a token, drawn left to right (inside the row group, so local x/y).
function bfUnder(row, span, color, t0, w = 3.5) {
  const bb = span.getBBox();
  const e = path(row, `M${bb.x + 1} 8H${bb.x + bb.width - 1}`, { stroke: color, 'stroke-width': w }, { d: 0 });
  draw(e, t0, .4);
  return e;
}

// ---- the preview pane and what runs in it ----
function bfPane(p, t0) {
  const ST = STG(), g = G(p, { o: 0 });
  mk('rect', { x: PANE.x, y: PANE.y, width: PANE.w, height: PANE.h, rx: 14, fill: ST.pane, stroke: ST.paneEdge, 'stroke-width': 2 }, g);
  const clip = mk('clipPath', { id: 'bfCanvasClip' }, g);
  mk('rect', { x: CV.x, y: CV.y, width: CVW, height: CVH }, clip);
  const kids = G(g);
  kids.setAttribute('clip-path', 'url(#bfCanvasClip)');
  show(g, t0, .5);
  return { g, kids };
}
// The 360 x 20 floor the reading's sketch makes: a dark slab with a lit top edge.
function bfGround(pv, o = 1) {
  const g = G(pv.kids, { x: cvX(GROUND.x), y: cvY(GROUND.y), o });
  mk('rect', { x: -GROUND.w * CV.k / 2, y: -GROUND.h * CV.k / 2, width: GROUND.w * CV.k, height: GROUND.h * CV.k, fill: COL.raised }, g);
  mk('rect', { x: -GROUND.w * CV.k / 2, y: -GROUND.h * CV.k / 2, width: GROUND.w * CV.k, height: 2.5, fill: COL.muted }, g);
  return g;
}
function bfSprite(pv, u, v, color, o = 1) {
  const e = G(pv.kids, { x: cvX(u), y: cvY(v), o });
  mk('rect', { x: -HALF, y: -HALF, width: SPR * CV.k, height: SPR * CV.k, fill: color }, e);
  return e;
}
function bfClear(els, t0) { els.forEach(e => e && hide(e, t0, .12)); }
// A measured trace -> y(t), with the clock stretched between measured frames and beat marks.
function bfTrace(tr, anchors) {
  const A = anchors;
  return t => {
    if (t <= A[0][1]) return tr[A[0][0]];
    for (let i = 1; i < A.length; i++) {
      if (t <= A[i][1]) {
        const [f0, t0] = A[i - 1], [f1, t1] = A[i];
        const q = Math.max(0, Math.min(1, (t - t0) / Math.max(.001, t1 - t0)));
        return tr[Math.round(f0 + (f1 - f0) * q)];
      }
    }
    return tr[tr.length - 1];
  };
}
function bfPlay(el, fn, t0, t1) { prog(q => { put(el, fn(t0 + q * (t1 - t0))); }, t0, Math.max(.01, t1 - t0), lin); }
// A peak tick at the height the sprite's bottom reached: a dashed line and its measured label.
// opt.above puts the label clear over a sprite that is held at this height (the scale beat's lanes).
function bfPeak(pv, u, h, label, t0, t1, centred = false, opt = {}) {
  const y = cvY(FLOOR - h), g = G(pv.kids);
  const x1 = centred ? cvX(u) - 78 : cvX(u) + 30, x2 = centred ? cvX(u) + 78 : cvX(u) + 150;
  bfDash(g, `M${x1} ${y}H${x2}`, t0 - .15, .25);
  const lab = centred
    ? bfText(g, label, { x: cvX(u), y: y - (opt.above ? 56 : 12), size: 24, fill: COL.text, font: MONO, anchor: 'middle', o: 0 })
    : bfText(g, label, { x: x2, y: y - 11, size: 24, fill: COL.text, font: MONO, anchor: 'start', o: 0 });
  show(lab, t0, .3); bfBump(lab, t0 + .05, 1.08);
  if (t1 != null) hide(g, t1, .3);
  return g;
}
// A measured distance ruler. opt.ghost outlines the sprite at its start and opt.drop runs a short dashed
// drop from the right tick to the sprite's top, so the ruler is attached to the path it measures.
// opt.labT shows the ruler with the measurement in place and the number on the word that says it.
function bfRuler(pv, u1, u2, v, label, t0, opt = {}) {
  const g = G(pv.kids, { o: 0 }), y = cvY(v);
  bfDash(g, `M${cvX(u1)} ${y}H${cvX(u2)}`, t0, .35);
  for (const u of [u1, u2]) mk('path', { d: `M${cvX(u)} ${y - 9}V${y + 9}`, fill: 'none', stroke: AP().ghost, 'stroke-width': 2.5 }, g);
  if (opt.ghost) {
    const gx = cvX(u1), gy = cvY(260), s = SPR * CV.k;
    path(g, `M${gx - s / 2} ${gy - s / 2}h${s}v${s}h${-s}Z`,
      { fill: 'none', stroke: AP().ghost, 'stroke-width': 2, 'stroke-dasharray': '6 5', opacity: .85 });
  }
  if (opt.drop) bfDash(g, `M${cvX(u2)} ${y}V${cvY(245)}`, t0 + .15, .3);   // down to the sliding sprite's top
  const lab = bfText(g, label, { x: (cvX(u1) + cvX(u2)) / 2, y: y - 14, size: 24, fill: COL.text, font: MONO, anchor: 'middle', o: opt.labT == null ? 1 : 0 });
  if (opt.labT != null) { show(lab, opt.labT, .3); bfBump(lab, opt.labT + .05, 1.08); }
  show(g, t0, .35);
  return g;
}

// ---- one dial: label, value, a 0..1 track and a knob ----
function bfDial(p, x, label, value, t0) {
  const g = G(p, { o: 0 }), w = DIAL.w, h = DIAL.h, y = DIAL.y;
  mk('rect', { x, y, width: w, height: h, rx: 12, fill: COL.panel, stroke: COL.raised, 'stroke-width': 2 }, g);
  bfText(g, label, { x: x + 22, y: y + 38, size: 24, fill: COL.muted });
  const val = bfText(g, bfNum(value), { x: x + w - 22, y: y + 40, size: 30, fill: COL.purple, font: MONO, weight: 600, anchor: 'end' });
  const x0 = x + 26, x1 = x + w - 26, ty = y + h - 48;
  path(g, `M${x0} ${ty}H${x1}`, { stroke: COL.raised, 'stroke-width': 4 });
  const kx = v => x0 + v * (x1 - x0);
  for (const v of [0, 1]) path(g, `M${kx(v)} ${ty - 7}V${ty + 7}`, { stroke: COL.raised, 'stroke-width': 3 });
  const knob = G(g, { x: kx(value), y: ty });
  mk('circle', { r: 10, fill: COL.purple, stroke: COL.panel, 'stroke-width': 2.5 }, knob);
  show(g, t0, .4);
  return {
    g, knob, val, kx, ty,
    set: (v, t1) => { tw(knob, { x: kx(v) }, t1, .45, out); prog(() => { val.textContent = bfNum(v); }, t1, 0, lin); },
    dot: (v, t1, color = COL.muted) => { const d = G(g, { x: kx(v), y: ty - 19, o: 0 }); mk('circle', { r: 6, fill: color, stroke: COL.panel, 'stroke-width': 2 }, d); show(d, t1, .3); return d; },
    endL: (str, t1) => { const e = bfText(g, str, { x: x0, y: y + h - 12, size: 22, fill: COL.text, o: 0 }); show(e, t1, .3); return e; },
    endR: (str, t1) => { const e = bfText(g, str, { x: x1, y: y + h - 12, size: 22, fill: COL.text, anchor: 'end', o: 0 }); show(e, t1, .3); return e; },
  };
}
// A rule card. Each line is { y, size, fill, weight, font, runs }; a run is [text, t], and a run with a time fades in on
// that word (it is a tspan, so it flows after the run before it: the line is laid out once and only its clock is split).
// The frame and the untimed runs land at t0, so nothing on the card is said before the voice says it.
function bfCard(p, x, y, t0, lines) {
  const g = G(p, { o: 0 });
  mk('rect', { x, y, width: 726, height: 146, rx: 12, fill: COL.panel, stroke: COL.raised, 'stroke-width': 2 }, g);
  for (const L of lines) {
    const t = bfText(g, '', { x: x + 28, y: y + L.y, size: L.size, fill: L.fill, font: L.font || UI, weight: L.weight || 500 });
    for (const [s, ts] of L.runs) {
      const sp = mk('tspan', {}, t);
      sp.textContent = s;
      if (ts != null) { put(sp, { o: 0 }); show(sp, ts, .3); }
    }
  }
  show(g, t0, .35);
  return g;
}
function bfChip(p, x, y, w, txt, t0, color = COL.text) {
  const g = G(p, { o: 0 });
  mk('rect', { x, y, width: w, height: 44, rx: 9, fill: COL.panel, stroke: COL.raised, 'stroke-width': 2 }, g);
  bfText(g, txt, { x: x + w / 2, y: y + 30, size: 24, fill: color, font: MONO, anchor: 'middle' });
  show(g, t0, .3);
  return g;
}

// ---- the six beats ----
const BEATS = [
  ['hello', 'Two numbers', (m, D) => {
    const p = panel(0), ST = STG();
    S.title = G(p);
    show(bfText(S.title, CHAPTER.kicker, { x: 70, y: 74, size: 22, fill: COL.purple, weight: 600, o: 0 }), m('hi', -.1), .4);
    const tt = bfText(S.title, 'Bounciness and Friction', { x: 70, y: 124, size: 46, fill: COL.text, weight: 600, o: 0 });
    tw(tt, { o: 1, y: 124 }, m('hi'), .5, out); put(tt, { y: 136 });

    // "two numbers decide what happens next": the sketch and the two dials
    S.code = bfCode(p, m('twonum'));
    tw(S.code.g, { y: 0 }, m('twonum'), .55, out); put(S.code.g, { y: 14 });
    S.doc1 = bfDoc(S.code.docs, DOC1, {}, m('twonum', .15));
    bfUnder(S.doc1.rows[6], S.doc1.spans.bn, COL.purple, m('bn', .15));

    S.db = bfDial(p, 284, 'bounciness', 0.8, m('twonum', .1));
    S.df = bfDial(p, 664, 'friction', 0, m('twonum', .25));
    // "two numbers": the second dial says so, so friction is not an unnamed control
    S.df.endL('the second number', m('twonum', .45));
    // "At 0, it sticks. At 1, it keeps full speed.": the dial's two ends name the two rules
    S.db.endL('0 sticks', m('sticks', -.05));
    S.db.endR('1 full speed', m('full', -.05));

    // "Here is a ball with bounciness zero.": the pane, the ball, and the number edited to 0
    S.pv = bfPane(p, m('here', -.45));
    S.ground = bfGround(S.pv, 0); show(S.ground, m('here', -.2), .35);
    const b = S.ball = bfSprite(S.pv, 180, 40, ST.blue, 0); show(b, m('here', .1), .25);
    bfSwap(S.doc1.rows[6], S.doc1.spans.bv, '0', m('here', .3));
    S.db.set(0, m('here', .4));

    // "Run it, and the ball lands and stays.": the measured b = 0 drop, real time
    bfPress(S.code, p, m('run0'), .45);
    const t0 = m('run0') + .12, t1 = t0 + (TR.bounce[0].length - 1) / 60;
    const y0 = bfTrace(TR.bounce[0], [[0, t0], [TR.bounce[0].length - 1, t1]]);
    bfPlay(b, t => ({ y: cvY(y0(t)) }), t0, t1);

    // "Change one number, and the same ball can spring.": back to 0.8, no run yet
    bfSwap(S.doc1.rows[6], S.doc1.spans.bv, '0.8', m('edit', .05));
    S.db.set(0.8, m('edit', .15));
  }],

  ['bounce', 'Measure the bounce', (m, D) => {
    const p = S.panel, ST = STG(), H = D + .1, tr = TR.bounce[0.8];
    hide(S.df.g, m('drop', -.3), .3);
    // "Run it, and the ball comes back most of the way up.": the sketch restarts at 0.8
    bfPress(S.code, p, m('drop'), .45);
    bfClear([S.ball], m('drop', .1));
    const b = S.ball = bfSprite(S.pv, 180, 40, ST.blue, 0); show(b, m('drop', .22), .12);
    const t0 = m('drop', .22);
    const yAt = bfTrace(tr, [[0, t0], [128, Math.max(m('p1'), t0 + .5)], [231, Math.max(m('p2'), m('p1') + .5)],
      [313, Math.max(m('p3'), m('p2') + .5)], [406, m('p3') + 1.1]]);   // 406 = the floor contact after the third peak
    bfPlay(b, t => ({ y: cvY(yAt(t)) }), t0, m('p3') + 1.1);
    S.mode = bfText(p, 'slow motion', { x: PANE.x + 4, y: 700, size: 22, fill: COL.muted, o: 0 });
    show(S.mode, m('drop', .3), .3);

    // the three peaks, measured: 139.6 / 86.6 / 53.2 px above the ground
    S.pk1 = bfPeak(S.pv, 180, 139.6, '140 px', m('p1'));
    S.pk2 = bfPeak(S.pv, 180, 86.6, '87 px', m('p2'));
    S.pk3 = bfPeak(S.pv, 180, 53.2, '53 px', m('p3'));
    hide(S.pk1, m('zero', -.6), .3); hide(S.pk2, m('zero', -.6), .3); hide(S.pk3, m('zero', -.6), .3);
    hide(S.mode, m('zero', -.5), .3);

    // "At zero, it lands and stays."
    bfSwap(S.doc1.rows[6], S.doc1.spans.bv, '0', m('zero', 0));
    S.db.set(0, m('zero', .1));
    bfPress(S.code, p, m('zero', .3), .35);
    bfClear([b], m('zero', .45));
    const b0 = S.ball0 = bfSprite(S.pv, 180, 40, ST.blue, 0); show(b0, m('zero', .55), .1);
    prog(q => { const i = Math.min(TR.bounce[0].length - 1, Math.round(q * (TR.bounce[0].length - 1))); put(b0, { y: cvY(TR.bounce[0][i]) }); },
      m('zero', .55), (TR.bounce[0].length - 1) / 60, lin);

    // "At one, it comes back to the height it started from. And it keeps going."
    const t1 = m('one', 0);
    bfSwap(S.doc1.rows[6], S.doc1.spans.bv, '1', t1 - .35);
    S.db.set(1, t1 - .25);
    S.startLine = bfDash(S.pv.kids, `M${cvX(150)} ${cvY(55)}H${cvX(348)}`, t1 - .2, .35);
    S.startLab = bfText(p, 'start height', { x: PANE_R, y: cvY(55) - 10, size: 22, fill: COL.muted, anchor: 'end', o: 0 });
    show(S.startLab, w('bounce', 'height', t1), .3);   // the label lands on "the height it started from", not before it
    bfPress(S.code, p, t1 + .45, .4);
    bfClear([b0], t1 + .55);
    const b1 = S.ball1 = bfSprite(S.pv, 180, 40, ST.blue, 0); show(b1, t1 + .65, .1);
    prog(q => { const i = Math.min(TR.bounce[1].length - 1, Math.round(q * 300)); put(b1, { y: cvY(TR.bounce[1][i]) }); },
      t1 + .65, 300 / 60, lin);
    bfHold(H);
  }, { keep: true }],

  ['scale', 'The whole scale', (m, D) => {
    const p = S.panel, ST = STG(), H = D + .1;
    tw(S.code.g, { o: .3 }, m('range', -.2), .5);                 // the sketch is not this picture
    hide(S.ball1, m('range', -.1), .15);
    hide(S.startLine, m('range', -.1), .25); hide(S.startLab, m('range', -.1), .25);
    // the dial becomes the scale itself: three dots, one for each lane. Its "1" readout would now name the wrong thing.
    hide(S.db.knob, m('three', -.2), .25); hide(S.db.val, m('three', -.2), .25);
    S.db.dot(0, m('three', 0), COL.purple);
    S.db.dot(0.5, m('three', .12), COL.purple);
    S.db.dot(0.8, m('three', .24), COL.purple);
    // The height they were dropped from: a dashed guide across the lanes, from the sentence that brings the balls in.
    S.dropLine = bfDash(S.pv.kids, `M${cvX(20)} ${cvY(40)}H${cvX(340)}`, m('three', .15), .45);
    S.dropLab = bfText(p, 'dropped from here', { x: cvX(340), y: cvY(40) - 30, size: 22, fill: COL.muted, anchor: 'end', o: 0 });
    show(S.dropLab, m('z', .1), .35);
    // Three lanes, each falling on the sentence that names its value, each held at the first apex its tick will
    // measure, so the height that gets named is the height on screen. They finish the fall on the last line.
    const t0 = m('three', .35), lanes = [
      [60, 0, 71, 0, m('z', .2)],          // 0 lands and stays, on "The first has bounciness 0"
      [180, 0.5, 107, 55.0, m('half', .35)],   // 0.5 rises to 55 px during "half the speed"
      [300, 0.8, 128, 139.6, m('most', .2)],   // 0.8 rises to 139.6 px and is labelled on "one hundred forty"
    ];
    S.lane = lanes.map(([u, bv, stop, h, tStart], i) => {
      const tr = TR.bounce[bv], b = bfSprite(S.pv, u, 40, ST.blue, 0); show(b, t0 + i * .07, .15);
      prog(q => { const j = Math.min(stop, Math.round(q * stop)); put(b, { y: cvY(tr[j]) }); }, tStart, stop / 60, lin);
      const l = bfText(p, bfNum(bv), { x: cvX(u), y: 700, size: 26, fill: COL.purple, font: MONO, anchor: 'middle', o: 0 });
      show(l, m('three', .45) + i * .08, .3);
      // a measured height: a guide from the held ball down to the floor, drawn as the ball arrives there
      const guide = h ? bfDash(S.pv.kids, `M${cvX(u)} ${cvY(FLOOR - h)}V${cvY(FLOOR)}`, tStart + stop / 60, .35, AP().ghost, 2) : null;
      return { b, l, guide, u, bv, stop };
    });
    // the measured heights, labelled on the words that say them (55 on [[halfpx]], 140 on "one hundred forty")
    S.sk1 = bfPeak(S.pv, 180, 55.0, '55 px', m('halfpx'), null, true, { above: true });
    S.sk2 = bfPeak(S.pv, 300, 139.6, '140 px', w('scale', 'one', m('most')), null, true, { above: true });
    const fall = (lane, t1, endFrame) => {
      if (!lane.guide) return;
      hide(lane.guide, t1, .25);
      const tr = TR.bounce[lane.bv], from = lane.stop;
      prog(q => { const j = Math.min(endFrame, Math.round(from + q * (endFrame - from))); put(lane.b, { y: cvY(tr[j]) }); },
        t1, (endFrame - from) / 60, lin);
    };
    fall(S.lane[1], m('square', .15), 143);   // 0.5 -> the floor contact
    fall(S.lane[2], m('square', .3), 186);    // 0.8 -> the floor contact
    bfHold(H);
  }, { keep: true }],

  ['friction', 'Friction', (m, D) => {
    const p = S.panel, ST = STG(), H = D + .1;
    // swap to the pushed-sprite sketch. The old document is GONE before the new one fades in: two documents fading
    // through each other in one panel read as garbled text.
    hide(S.db.g, m('fr', -.3), .4);
    hide(S.sk1, m('fr', -.3), .3); hide(S.sk2, m('fr', -.3), .3);
    hide(S.dropLine, m('fr', -.3), .3); hide(S.dropLab, m('fr', -.3), .3);
    S.lane.forEach(({ b, l }) => { hide(b, m('fr', -.25), .2); hide(l, m('fr', -.25), .2); });
    hide(S.doc1.g, m('fr', -.3), .18);
    tw(S.code.g, { o: 1 }, m('fr', -.2), .4);
    S.doc2 = bfDoc(S.code.docs, DOC2, {}, m('fr', .2));
    // this is a SECOND sketch, in a second file: the tab says so and a tag names the swap while it happens
    hide(S.code.tab1, m('fr', -.15), .12); show(S.code.tab2, m('fr', -.02), .2);
    const tagX = CODE.x + 300, tagW = 204;
    S.tag = G(p, { o: 0 });
    mk('rect', { x: tagX, y: CODE.y + 7, width: tagW, height: 30, rx: 7, fill: COL.panel, stroke: COL.raised, 'stroke-width': 2 }, S.tag);
    bfText(S.tag, 'a second sketch', { x: tagX + tagW / 2, y: CODE.y + 28, size: 22, fill: COL.purple, weight: 600, anchor: 'middle' });
    show(S.tag, m('fr', .05), .3); hide(S.tag, m('fr', 1.9), .35);
    S.df2 = bfDial(p, 284, 'friction', 0, m('fr', .05));
    // "it starts the block moving at 4": what block.vel.x = 4 does, as a real comment on the line that does it
    // ("--" is not a JavaScript comment, so the line as drawn would not run if it were copied).
    S.velLab = G(S.code.g, { o: 0 });
    bfText(S.velLab, '// it starts the block moving at 4', { x: CODE.x + 300, y: codeBase(9), size: 22, fill: COL.muted });
    show(S.velLab, m('fr', 1.2), .35);
    bfUnder(S.doc2.rows[6], S.doc2.spans.bf, COL.purple, m('def', .1));
    bfUnder(S.doc2.rows[8], S.doc2.spans.gf, COL.purple, m('def', .35));

    const slide = (tag, t0) => {
      bfPress(S.code, p, t0, .4);
      bfClear([S.pvBlock], t0 + .1);
      const b = S.pvBlock = bfSprite(S.pv, SLIDE_X, 260, ST.blue, 0); show(b, t0 + .2, .1);
      const xs = TR.slide[tag];
      prog(q => { const i = Math.min(xs.length - 1, Math.round(q * (xs.length - 1))); put(b, { x: cvX(xs[i]) }); }, t0 + .2, (xs.length - 1) / 60, lin);
      return b;
    };
    // "At 0, it is ice: the block keeps going." The Run press starts it; no arrow yet.
    S.blk0 = slide('0/0', m('ice', .35));

    // "Give the block a push at 0.4, and it slows down. It stops after 238 pixels."
    const tPush = w('friction', 'push', m('push'));        // "push" at 14.486: the arrow is the word's picture
    const t4 = tPush + .08;
    S.pushA = bfArrow(S.pv.kids, cvX(SLIDE_X) - 74, cvY(260), cvX(SLIDE_X) - 26, cvY(260), COL.cyan, tPush, .4, 4);
    S.pushT = bfText(p, 'a push', { x: cvX(SLIDE_X) - 50, y: cvY(260) - 14, size: 22, fill: COL.cyan, anchor: 'middle', o: 0 });
    show(S.pushT, tPush + .03, .3);
    hide(S.pushA, m('stop', -.25), .3); hide(S.pushT, m('stop', -.25), .3);
    bfSwap(S.doc2.rows[6], S.doc2.spans.fb, '0.4', t4 - .45);
    bfSwap(S.doc2.rows[8], S.doc2.spans.fg, '0.4', t4 - .45);
    S.df2.set(0.4, t4 - .35);
    S.blk4 = slide('0.4/0.4', t4);
    // the ruler appears when the block stops; its number lands on "two hundred thirty-eight"
    S.r4 = bfRuler(S.pv, SLIDE_X, SLIDE_X + 238, 210, '238 px', m('stop'), { ghost: true, drop: true, labT: w('friction', 'two', m('stop')) });
    hide(S.blk4, m('more', -.9), .2);
    hide(S.r4, m('more', -.9), .3);

    // "At 0.8, it stops in 118 pixels." The number lands on "one hundred eighteen".
    const t8 = m('more', .1);
    bfSwap(S.doc2.rows[6], S.doc2.spans.fb, '0.8', t8 - .45);
    bfSwap(S.doc2.rows[8], S.doc2.spans.fg, '0.8', t8 - .45);
    S.df2.set(0.8, t8 - .35);
    S.blk8 = slide('0.8/0.8', t8);
    S.r8 = bfRuler(S.pv, SLIDE_X, SLIDE_X + 118, 210, '118 px', m('more', 1.3), { ghost: true, drop: true, labT: w('friction', 'one', m('more')) });
    bfHold(H);
  }, { keep: true }],

  ['two', 'Two sprites', (m, D) => {
    const p = S.panel, ST = STG(), H = D + .1;
    hide(S.r8, m('touch', -.3), .3);
    hide(S.df2.g, m('touch', -.3), .3);
    hide(S.code.g, m('touch', -.3), .4);
    hide(S.pvBlock, m('touch', -.25), .2);
    // "When two sprites touch": a ball on the floor, so the pane is not empty before the first card
    S.pairBall = bfSprite(S.pv, 180, REST, ST.blue, 0); show(S.pairBall, m('touch', .3), .3);
    // rule 1, on the words. The card's name lands on "Bounciness"; its two values only when the floor's value is spoken,
    // and the answer ("→ 1") only on "as if it had one" -- the card never states the rule before the voice derives it.
    const tEx = w('two', 'one', m('ex'));       // 10.278: "Say a ball has bounciness 0.2, and the floor has one."
    const tAs = w('two', 'as', m('ex'));        // 12.208: "The ball bounces as if it had one."
    S.cd1 = bfCard(p, 284, 210, m('up'), [
      { y: 56, size: 30, fill: COL.text, weight: 600, runs: [['bounciness takes the higher value']] },
      { y: 102, size: 24, fill: COL.muted, font: MONO, runs: [['0.2 with 1', tEx], ['  →  1', tAs]] },
    ]);
    // "Say a ball has bounciness 0.2, and the floor has 1. The ball bounces as if it had one."
    // Each chip lands on the word that says it: "ball", "floor", "as if it had one". The ball itself runs the measured
    // 0.2-on-1 trace (the b = 1 run): on a floor at 1 a 0.2 ball really does bounce like a 1 from its first hit, which
    // is the rule this line teaches -- there is no separate 0.2-only trace to show first, so only the chips and the
    // drop's clock are keyed. The drop's start is free, so it is set from the word clock: the measured fall is 70 frames
    // (1.17 s) and its FIRST FLOOR CONTACT is made the spoken "one" of "the floor has one", so the ball is falling while
    // the two numbers are named and only springs back once the floor's value has been said (its first apex then lands on
    // "The ball bounces", 11.46 s). It comes to rest on the floor at 15.08 s, long before the friction example.
    hide(S.pairBall, m('ex', -.15), .2);
    S.c1 = bfChip(p, 1044, 686, 130, 'ball 0.2', w('two', 'ball', m('ex')));
    S.c2 = bfChip(p, 1186, 686, 116, 'floor 1', w('two', 'floor', m('ex')), COL.muted);
    S.c3 = bfChip(p, 1314, 686, 232, 'bounces like 1', w('two', 'as', m('ex')));
    const tr1 = TR.bounce[1];
    const tb = tEx - 70 / 60;                    // 9.111: frame 70 of the trace is the first floor contact
    const bt = S.pvBall = bfSprite(S.pv, 180, 40, ST.blue, 0); show(bt, w('two', 'ball', m('ex')), .1);
    // 358 = the third floor contact: it keeps bouncing, then rests on the floor it really reached
    prog(q => { const i = Math.min(tr1.length - 1, Math.round(q * 358)); put(bt, { y: cvY(tr1[i]) }); }, tb, 358 / 60, lin);

    // "Friction is different: multiply the two numbers, then take the square root. That is a geometric mean."
    // The card is only "friction" on the word that starts that sentence; it becomes "friction takes the geometric mean"
    // when that phrase is spoken (19.875), and its line arrives on "multiply" (15.694).
    S.cd2 = bfCard(p, 284, 384, m('geo'), [
      { y: 56, size: 30, fill: COL.text, weight: 600, runs: [['friction'], [' takes the geometric mean', w('two', 'geometric', m('geo'))]] },
      { y: 102, size: 24, fill: COL.muted, font: MONO, runs: [['multiply the two, then square root', w('two', 'multiply', m('geo'))]] },
    ]);

    // the example: block 0.9 on floor 0.4 -> 0.6; it stops after 158 px
    hide(bt, m('ex2', -.25), .2);
    hide(S.c1, m('ex2', -.15), .2); hide(S.c2, m('ex2', -.15), .2); hide(S.c3, m('ex2', -.15), .2);
    const t92 = m('ex2', .1);
    // the two values on the words that name them, the result on the words that work it out
    S.x1 = bfChip(p, 1044, 686, 142, 'block 0.9', w('two', 'block', m('ex2')));
    S.x2 = bfChip(p, 1198, 686, 142, 'floor 0.4', w('two', 'floor', m('ex2')), COL.muted);
    S.x3 = bfChip(p, 1352, 686, 128, 'acts 0.6', w('two', 'acts', m('ex2')));
    // the arithmetic itself, in the empty half of the left column: 0.9 x 0.4 = 0.36, then the square root = 0.6
    const tTimes = w('two', 'is', m('ex2'));                 // "... is 0.36"
    const t036 = w('two', 'zero', tTimes);
    const t06 = w('two', 'zero', w('two', 'root', m('ex2'))); // "... of that is 0.6"
    S.res1 = bfText(p, '0.9 × 0.4 = 0.36', { x: 312, y: 586, size: 26, fill: COL.muted, font: MONO, o: 0 });
    S.res2 = bfText(p, '√0.36 = 0.6', { x: 312, y: 626, size: 26, fill: COL.text, font: MONO, o: 0 });
    show(S.res1, t036, .3); show(S.res2, t06, .3);
    S.b92 = bfSprite(S.pv, SLIDE_X, 260, ST.blue, 0); show(S.b92, t92 + .1, .1);
    prog(q => { const xs = TR.slide['0.9/0.4'], i = Math.min(xs.length - 1, Math.round(q * (xs.length - 1))); put(S.b92, { x: cvX(xs[i]) }); },
      t92 + .1, (TR.slide['0.9/0.4'].length - 1) / 60, lin);
    // "It slides 158 pixels"
    S.stopMark = bfDash(S.pv.kids, `M${cvX(SLIDE_X + 158)} ${cvY(70)}V${cvY(272)}`, m('same', -.1), .35, COL.muted, 2);
    S.rr = bfRuler(S.pv, SLIDE_X, SLIDE_X + 158, 120, '158 px', m('px'));

    // "exactly like 0.6 on 0.6": a second run stops on the same mark
    hide(S.b92, m('six', -.4), .2);
    hide(S.x1, m('six', -.3), .2); hide(S.x2, m('six', -.3), .2); hide(S.x3, m('six', -.3), .2);
    S.y1 = bfChip(p, 1044, 686, 142, 'block 0.6', m('six', -.2));
    S.y2 = bfChip(p, 1198, 686, 142, 'floor 0.6', m('six', -.2), COL.muted);
    S.b66 = bfSprite(S.pv, SLIDE_X, 260, ST.blue, 0); show(S.b66, m('six', .05), .1);
    prog(q => { const xs = TR.slide['0.6/0.6'], i = Math.min(xs.length - 1, Math.round(q * (xs.length - 1))); put(S.b66, { x: cvX(xs[i]) }); },
      m('six', .05), (TR.slide['0.6/0.6'].length - 1) / 60, lin);
    bfHold(H);
  }, { keep: true }],

  ['close', 'Up next', (m, D) => {
    const p = panel(0);
    const row = (runs, y, t0, size = 40, weight = 600) => { const t = bfRuns(p, runs, { x: 800, y, size, weight, o: 0 }); tw(t, { o: 1, y }, t0, .45, out); put(t, { y: y + 10 }); return t; };
    // "Both numbers sit on every sprite": the two words are already on the card while the voice says it
    const pre = (str, y, t0) => { const e = bfText(p, str, { x: 800, y, size: 34, fill: COL.text, weight: 600, o: 0 }); show(e, t0, .4); return e; };
    const cl1 = pre('bounciness', 250, m('both', .05));
    const cl2 = pre('friction', 314, m('both', .15));
    row([['bounciness', COL.text, 600], ['  0 sticks, 1 keeps full speed', COL.muted, 500]], 250, m('bn', -.05), 34);
    row([['friction', COL.text, 600], ['  0 is ice, a higher number stops a slide sooner', COL.muted, 500]], 314, m('fr', -.05), 34);
    hide(cl1, m('bn', -.35), .2); hide(cl2, m('fr', -.35), .2);
    show(bfText(p, 'UP NEXT', { x: 800, y: 440, size: 22, fill: COL.purple, weight: 600, anchor: 'middle', o: 0 }), m('next', -.05), .35);
    row([['5.2.12 Bouncy Ball', COL.text]], 512, m('next', .15), 52);
    row([['a bouncy ball of your own', COL.muted]], 580, m('next', 1.1), 30, 500);
    bfHold(D + .1);   // ears round: the old 1.8 s hold after "See you there!" was length with no picture in it
  }],
].map(([id, title, run, extra]) => ({ id, title, run, ...extra }));

// ---- SH: bottom-left, never the subject. Every expression change lands on a narration mark ----
const CODEC = [640, 380], PANEC = [1290, 410], ZONEC = [640, 700];
bindActs({
  hello: { act: (t, m, D, s, MV) => {
    s.pose = 'down';
    emo(t, s, [[0, { expr: 'delighted', amp: 1.15, look: PANEC }],
      [m('twonum', -.1), { expr: 'curious', tilt: 6, amp: 1, look: CODEC }],
      [m('bn', -.1), { expr: 'determined', tilt: 0, look: CODEC, pose: 'pointUp' }],
      [m('sticks', -.1), { expr: 'curious', tilt: 5, look: ZONEC }],
      [m('full', -.1), { expr: 'surprise', amp: 1, look: ZONEC }],
      [m('here', -.1), { expr: 'determined', look: PANEC, pose: 'point' }],
      [m('run0', -.1), { expr: 'surprise', amp: 1, look: PANEC, pose: 'down' }],
      [m('edit', -.1), { expr: 'delighted', amp: 1.1, look: CODEC }]]);
    MV.wave(t, s, m('hi', -.15), 1.9);
  } },
  bounce: { act: (t, m, D, s) => {
    s.pose = 'pointUp';
    emo(t, s, [[0, { expr: 'determined', look: RUN_C }],
      [m('drop', .1), { expr: 'surprise', amp: 1, look: PANEC, pose: 'down' }],
      [m('p1', -.1), { expr: 'curious', tilt: 5, look: PANEC }],
      [m('p3', -.1), { expr: 'delighted', amp: 1.1, look: PANEC }],
      [m('zero', -.1), { expr: 'determined', tilt: 0, look: RUN_C, pose: 'point' }],
      [m('one', -.1), { expr: 'curious', tilt: -4, look: RUN_C }],
      [m('one', .8), { expr: 'surprise', amp: 1, look: PANEC, pose: 'down' }],
      [m('keeps', -.1), { expr: 'delighted', amp: 1.12, look: PANEC }]]);
    kick.lean(t, s, m('drop', .2), .5, .5);
  } },
  scale: { act: (t, m, D, s) => {
    s.pose = 'point';
    emo(t, s, [[0, { expr: 'determined', look: ZONEC }],
      [m('range', -.1), { expr: 'curious', tilt: 5, look: ZONEC }],
      [m('three', -.1), { expr: 'surprise', amp: 1, look: PANEC }],
      [m('z', -.1), { expr: 'curious', tilt: 0, look: PANEC }],
      [m('half', -.1), { expr: 'determined', look: PANEC }],
      [m('most', -.1), { expr: 'delighted', amp: 1.1, look: PANEC }],
      [m('square', -.1), { expr: 'proud', amp: 1.05, look: ZONEC, pose: 'pointUp' }]]);
  } },
  friction: { act: (t, m, D, s) => {
    s.pose = 'pointUp';
    emo(t, s, [[0, { expr: 'curious', tilt: 5, look: CODEC }],
      [m('def', -.1), { expr: 'determined', tilt: 0, look: CODEC }],
      [m('ice', -.1), { expr: 'surprise', amp: 1, look: PANEC, pose: 'down' }],
      [m('push', -.1), { expr: 'determined', look: PANEC }],
      [m('stop', -.1), { expr: 'curious', tilt: 4, look: [1290, 370] }],
      [m('more', -.1), { expr: 'delighted', amp: 1.1, look: PANEC }]]);
  } },
  two: { act: (t, m, D, s) => {
    s.pose = 'down';
    emo(t, s, [[0, { expr: 'determined', look: ZONEC }],
      [m('up', -.1), { expr: 'curious', tilt: 5, look: ZONEC }],
      [m('ex', -.1), { expr: 'surprise', amp: 1, look: PANEC }],
      [m('geo', -.1), { expr: 'determined', tilt: 0, look: ZONEC, pose: 'point' }],
      [m('ex2', -.1), { expr: 'curious', tilt: 4, look: PANEC }],
      [m('same', -.1), { expr: 'delighted', amp: 1.1, look: PANEC }]]);
  } },
  close: { act: (t, m, D, s, MV) => {
    s.pose = 'down';
    emo(t, s, [[0, { expr: 'proud', amp: 1.05, look: [800, 260] }],
      [m('next', -.1), { expr: 'delighted', amp: 1.1, look: [800, 500], pose: 'point' }],
      [m('bye', -.15), { pose: 'down' }],
      [m('bye', -.1), { expr: 'delighted', amp: 1.15, look: [800, 420] }]]);
    MV.wave(t, s, m('bye', -.15), 1.9);
  } },
});
boot();
