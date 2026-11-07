// moshion-5.2-delete: the concept explainer for shCode lesson 5.2.15 "Cleanup and Delete" (the fifth 5.2
// papermorph explainer; the approved 5.1.2 explainer is the style template and 5.2-gravity is the layout parent,
// see ../moshion-5.1.2-style/STYLE.md). Six beats, one play-through, no questions:
//   hello   cold open: SH waves; the reading's two sprites (blue a, orange b); two ways to make a sprite go away,
//           named on screen: delete and hide. Those two are not the same.
//   delete  the reading's whole sketch in the editor, the live preview, and the console under it. Press d: the keycap
//           lights, the blue sprite is gone, the console prints "a deleted", the code sets a to null. Press d again:
//           nothing, because the if line asks for the key AND for a, and a is null.
//   hide    same picture (keep): press v, the orange sprite hides, the console prints "b visible: false"; a dashed
//           outline stays where it is to say it is still there, not drawn. Press v again: back, "b visible: true".
//   still   the proof, MEASURED: two mini canvases, one ball each, dropped together. On the left the orange sprite is
//           hidden, and the ball lands on it at y 125. On the right that sprite was deleted, and the same ball falls
//           straight through and off the bottom.
//   pick    the two-row rule: delete is gone, no undo, drawing/updating/physics all stop; visible = false is hidden
//           only, everything else keeps running. Which to use: delete a collected coin, hide a sprite that comes back.
//   close   one line each; up next 5.2.16 (the finished scene); SH waves.
// Not taught here (5.7 teaches .life): group.cull, group.removeAll, splice of arrays of sprites, .life,
// garbage collection.
// Truth measured on the real runner (public/moshion/runner.html; scripts in review/measure/):
//   m1: the reading's sketch. after d: 2 sprites -> 1, console "a deleted", a is null. after a second d: the console
//       is unchanged. after v: b.visible false, console "b visible: false", b still in allSprites; after a second v:
//       true and "b visible: true".
//   m2/m4: a 30 x 30 ball dropped from y 40 onto an orange 40 x 40 pad at (180, 160), gravity 10 (300 px/s^2):
//       pad.visible = false -> the ball lands and rests at y 124.55 (the screen says about y 125), settled at frame 50;
//       pad.delete() -> the ball passes y 125 and keeps falling (y 192.5 at frame 60, off a 300-tall canvas at
//       about frame 81).
//   m3: the pad's own update() runs 60 times in 60 frames when visible, 60 when hidden, 0 after delete(); the pad is
//       removed from allSprites only by delete().
// Every colour comes from lib/tokens.js. Helper names are dl* (the spec's prefix). Lib globals (frame, label, draw,
// tick, dot, move, rect, X, NEG, ...) must not be shadowed.
'use strict';
const CHAPTER = { number: 1, type: 'explainer', title: 'Delete and Hide, Explained', kicker: 'moSHion · Physics Feel',
  meta: 'Under 2 minutes, with sound and captions. One play-through, no questions.', minutes: 2, language: 'en', coverGo: 'Play' };

// ---- layout (stage px, 1600x900; y >= 780 is the caption bar's, the bottom-left corner (x < 232, y > 522) is the character's) ----
// The reading's sketch is 22 lines, so this video's code runs at 22 px on a 25 px line: the style's floor, kept there so the
// whole sketch the reading prints fits above the caption band. The editor starts at x 250 to leave SH his corner.
const CODE = { x: 250, y: 150, w: 640, head: 40, size: 22, lh: 25, gut: 308, x0: 320, rows: 22 };
const codeBase = i => CODE.y + CODE.head + 24 + i * CODE.lh;            // 214, 239, ... 739
const CODE_B = codeBase(CODE.rows - 1) + 18;                            // the panel ends at y 757
// The live preview: runner.html's #111 page with the reading's 360 x 200 canvas in it (background('#222') is painted by
// the sketch itself, so the canvas edge is real and there is no grid and no ticks: the sketch never draws them).
const PANE = { x: 905, y: 140, w: 620, h: 380 };
const CV = { x: 927, y: 170, k: 1.6, w: 360, h: 200 };
const cvX = u => CV.x + u * CV.k, cvY = v => CV.y + v * CV.k, CV_W = CV.w * CV.k, CV_H = CV.h * CV.k;
const SPR = 40;                                                         // new Sprite(120, 100, 40, 40): 64 stage px
const CON = { x: 905, y: 560, w: 500, h: 200 };
const CON_LINE = i => CON.y + 78 + i * 44;                              // 638, 682, 726
const KD = { x: 1424, y: 570 }, KV = { x: 1484, y: 570 };
const RUNB = { x: CODE.x + CODE.w - 124, y: CODE.y + 6, w: 110, h: 32 }; // shCode's Run button, in the tab strip
const RUN_C = [RUNB.x + RUNB.w / 2, RUNB.y + RUNB.h / 2];
// the proof: two mini canvases, 360 x 300 units at 0.9x
const MINI = { k: .9, w: 324, h: 270 }, ML = { x: 300, y: 250 }, MR = { x: 760, y: 250 };
const PAD = { u: 180, v: 160 }, DROP = { u: 180, v: 40 }, BALL = 30, PAD_S = 40;
const FALL_A = 300, REST_MEASURED = 124.55, LANDS_AT = .755;            // measured on the runner (see header)
const REST_SHOWN = 125;
const ZONE = { x: 250 };

// What the reading's sketch says, tagged as shCode's editor (lezer javascript + draculaHighlight) tags it.
const tk = kind => (s, id) => [s, kind, id];
const KW = tk('keyword'), PU = tk('punct'), NU = tk('num'), FN = tk('fn'), CL = tk('cls'), SR = tk('str'), OP = tk('op'), ID = tk('ident');
const MAIN = [
  [KW('let'), PU(' '), ID('a'), PU(', '), ID('b'), PU(';')],
  [],
  [KW('function'), PU(' '), FN('setup'), PU('() {')],
  [PU('  '), KW('new'), PU(' '), CL('Canvas'), PU('('), NU('360'), PU(', '), NU('200'), PU(');')],
  [PU('  '), ID('a', 'a4'), PU(' = '), KW('new'), PU(' '), CL('Sprite'), PU('('), NU('120'), PU(', '), NU('100'), PU(', '), NU('40'), PU(', '), NU('40'), PU(');')],
  [PU('  '), ID('a'), PU('.'), ID('color'), PU(' = '), SR("'deepskyblue'"), PU(';')],
  [PU('  '), ID('b', 'b6'), PU(' = '), KW('new'), PU(' '), CL('Sprite'), PU('('), NU('240'), PU(', '), NU('100'), PU(', '), NU('40'), PU(', '), NU('40'), PU(');')],
  [PU('  '), ID('b'), PU('.'), ID('color'), PU(' = '), SR("'orange'"), PU(';')],
  [PU('}')],
  [],
  [KW('function'), PU(' '), FN('draw'), PU('() {')],
  [PU('  '), FN('background'), PU('('), SR("'#222'"), PU(');')],
  [PU('  '), KW('if'), PU(' ('), ID('kb', 'kb12'), PU('.'), ID('presses', 'presses12'), PU('('), SR("'d'", 'd12'), PU(') && '), ID('a', 'aguard12'), PU(') {')],
  [PU('    '), ID('a'), PU('.'), FN('delete', 'del13'), PU('();')],
  [PU('    '), ID('a'), PU(' = '), KW('null', 'null14'), PU(';')],
  [PU('    '), ID('console'), PU('.'), FN('log'), PU('('), SR("'a deleted'"), PU(');')],
  [PU('  }')],
  [PU('  '), KW('if'), PU(' ('), ID('kb'), PU('.'), ID('presses'), PU('('), SR("'v'", 'v17'), PU(')) {')],
  [PU('    '), ID('b'), PU('.'), ID('visible', 'vis18'), PU(' = '), OP('!', 'not18'), ID('b'), PU('.'), ID('visible'), PU(';')],
  [PU('    '), ID('console'), PU('.'), FN('log'), PU('('), SR("'b visible:'"), PU(', '), ID('b'), PU('.'), ID('visible', 'bvis19'), PU(');')],
  [PU('  }')],
  [PU('}')],
];

// ---- drawing helpers (dl*: copied from the 5.2-gravity / 5.1.2 explainers, renamed to this video's prefix) ----
const AP = () => TOKS().app, STG = () => TOKS().stage, SXT = () => TOKS().syntax;
function dlText(p, str, { x, y, size = 26, fill = COL.text, weight = 500, anchor = 'start', font = UI, o = 1, italic = false }) {
  const t = T(p, str, { x, y, size, fill, weight, anchor, font, o });
  if (italic) t.setAttribute('font-style', 'italic');
  return t;
}
function dlRuns(p, runs, { x, y, size = 26, anchor = 'middle', font = UI, o = 1, weight = 500 }) {
  const t = dlText(p, '', { x, y, size, anchor, font, o, weight });
  t.runs = runs.map(([s, f, w, fnt, sz]) => {
    const e = mk('tspan', { fill: f }, t);
    if (w) e.setAttribute('font-weight', w); if (fnt) e.setAttribute('font-family', fnt); if (sz) e.setAttribute('font-size', sz);
    e.textContent = s; return e;
  });
  return t;
}
function dlHold(t) { prog(() => {}, t, 0, lin); }
function dlBump(e, t0, k = 1.1) { tw(e, { s: k }, t0, .18, out); tw(e, { s: 1 }, t0 + .18, .32); }
// A keycap: a raised key with its letter. dlKey lights it and dips it on a press, then puts it back.
function dlKeycap(p, x, y, label, o = 0) {
  const g = G(p, { x, y, o });
  const cap = mk('rect', { x: 0, y: 0, width: 48, height: 44, rx: 9, fill: COL.raised, stroke: COL.border, 'stroke-width': 2.5 }, g);
  const t = dlText(g, label, { x: 24, y: 31, size: 26, fill: COL.text, font: MONO, weight: 700, anchor: 'middle' });
  return { g, cap, t, base: y };
}
function dlKey(kc, t0) {
  tw(kc.cap, { c_fill: COL.purple }, t0, .06);
  tw(kc.t, { c_fill: COL.board }, t0, .06);
  tw(kc.g, { y: kc.base + 3 }, t0, .07);
  tw(kc.g, { y: kc.base }, t0 + .13, .22, out);
  tw(kc.cap, { c_fill: COL.raised }, t0 + .3, .35);
  tw(kc.t, { c_fill: COL.text }, t0 + .3, .35);
}

// ---- the editor (dl*: adapted from 5.2-gravity's gr*) ----
function dlRow(p, toks, i, spans, o = 1) {
  const SX = SXT(), row = G(p, { y: codeBase(i), o });
  const t = dlText(row, '', { x: CODE.x0, y: 0, size: CODE.size, font: MONO, weight: 400 });
  // eyes round: exact glyph advances, so the longest line ends at the same stage x at every frame size (a rounded-up
  // advance at a 900 px iframe put it 1.1 px from the panel edge)
  // text-rendering as a PRESENTATION attribute, not a style attribute: writing the style attribute here replaced the
  // inline `white-space: pre` T() sets, which collapsed every leading PU('  ') into nothing and flattened the sketch.
  t.setAttribute('text-rendering', 'geometricPrecision');
  for (const [s, kind, id] of toks) {
    const sp = mk('tspan', { fill: SX[kind] }, t);
    if (kind === 'cls') sp.setAttribute('font-style', 'italic');
    sp.textContent = s;
    if (id) spans[id] = sp;
  }
  return { row, t };
}
function dlDoc(p, lines, o = 1) {
  const g = G(p, { o }), rows = [], texts = [], spans = {};
  lines.forEach((toks, i) => {
    if (!toks.length) { rows.push(null); texts.push(null); return; }
    const r = dlRow(g, toks, i, spans);
    rows.push(r.row); texts.push(r.t);
  });
  return { g, rows, texts, spans };
}
function dlBar(p, i, n, o = 0) {
  const SX = SXT(), b = G(p, { o, y: codeBase(i) - 19 });
  b.bg = mk('rect', { x: CODE.x + 4, y: 0, width: CODE.w - 8, height: CODE.lh * n, fill: SX.lineBg }, b);
  b.sp = mk('rect', { x: CODE.x + 4, y: 0, width: 5, height: CODE.lh * n, fill: SX.lineMark }, b);
  return b;
}
function dlBarTo(b, i, n, t0, dur = .4) {
  tw(b, { y: codeBase(i) - 19 }, t0, dur);
  tw(b.bg, { a_height: CODE.lh * n }, t0, dur); tw(b.sp, { a_height: CODE.lh * n }, t0, dur);
}
// Underline one token, positioned from the rendered SVG text (getStartPositionOfChar), never from a character width.
function dlUnder(row, span, color, t0, w = 3.5) {
  const n = span.textContent.length; if (!n) return null;
  // the text is positioned by its own transform (render() writes translate(x,y)); glyph positions are local to it
  const ox = st(span.parentNode).x;
  const x0 = ox + span.getStartPositionOfChar(0).x, x1 = ox + span.getEndPositionOfChar(n - 1).x;
  const e = path(row.parentNode, `M${x0 + 1} ${st(row).y + 7}H${x1 - 1}`, { stroke: color, 'stroke-width': w }, { d: 0 });
  draw(e, t0, .4);
  return e;
}
// From the start of one token to the end of another: the whole condition, in one underline.
function dlUnderSpan(row, a, b, color, t0, w = 3.5) {
  const ox = st(a.parentNode).x;
  const x0 = ox + a.getStartPositionOfChar(0).x, x1 = ox + b.getEndPositionOfChar(b.textContent.length - 1).x;
  const e = path(row.parentNode, `M${x0 + 1} ${st(row).y + 7}H${x1 - 1}`, { stroke: color, 'stroke-width': w }, { d: 0 });
  draw(e, t0, .45);
  return e;
}
function dlCode(p, t0) {
  const SX = SXT(), A = AP(), g = G(p, { o: 0 });
  mk('rect', { x: CODE.x, y: CODE.y, width: CODE.w, height: CODE_B - CODE.y, rx: 14, fill: SX.bg, stroke: SX.edge, 'stroke-width': 2 }, g);
  path(g, `M${CODE.x} ${CODE.y + CODE.head}H${CODE.x + CODE.w}`, { stroke: SX.edge, 'stroke-width': 2 });
  dlText(g, 'script.js', { x: CODE.x + 22, y: CODE.y + 27, size: 21, fill: COL.muted, weight: 500 });
  path(g, `M${CODE.x + 12} ${CODE.y + CODE.head - 1}H${CODE.x + 118}`, { stroke: COL.purple, 'stroke-width': 3 });
  const run = G(g, { x: RUN_C[0], y: RUN_C[1] });
  mk('rect', { x: -RUNB.w / 2, y: -RUNB.h / 2, width: RUNB.w, height: RUNB.h, rx: 5, fill: A.run }, run);
  path(run, 'M-31 -8L-31 8L-18 0Z', { fill: A.runText, stroke: A.runText, 'stroke-width': 1.5 });
  dlText(run, 'Run', { x: -9, y: 8, size: 22, fill: A.runText, weight: 600 });
  const bar = dlBar(g, 0, 1);   // eyes round: UNDER the code text and the gutter numbers; painted after them it blanked the lit line
  const gut = G(g), nums = [];
  for (let i = 0; i < CODE.rows; i++)
    nums.push(dlText(gut, String(i + 1), { x: CODE.gut, y: codeBase(i), size: 21, fill: SX.gutter, font: MONO, anchor: 'end', weight: 400 }));
  const main = dlDoc(g, MAIN);
  const marks = G(g);
  show(g, t0, .5);
  return { g, run, marks, bar, nums, main, texts: main.texts };
}

// ---- the live preview: runner.html's #111 page with the reading's canvas in it ----
function dlPane(p, t0) {
  const ST = STG(), g = G(p, { o: 0 });
  mk('rect', { x: PANE.x, y: PANE.y, width: PANE.w, height: PANE.h, rx: 14, fill: ST.pane, stroke: ST.paneEdge, 'stroke-width': 2 }, g);
  mk('rect', { x: CV.x, y: CV.y, width: CV_W, height: CV_H, fill: ST.canvas }, g);   // background('#222')
  const clip = mk('clipPath', { id: 'dlCanvasClip' }, g);
  mk('rect', { x: CV.x, y: CV.y, width: CV_W, height: CV_H }, clip);
  const kids = G(g);
  kids.setAttribute('clip-path', 'url(#dlCanvasClip)');
  show(g, t0, .5);
  return { g, kids };
}
function dlSquare(pv, u, v, color, size, o = 1) {
  const k = size * CV.k, e = G(pv.kids, { x: cvX(u), y: cvY(v), o });
  mk('rect', { x: -k / 2, y: -k / 2, width: k, height: k, fill: color }, e);
  return e;
}
// A plain square at a stage position (the cold open's two sprites, before there is a canvas yet).
function dlBox(p, x, y, size, color, o = 0) {
  const e = G(p, { x, y, o });
  mk('rect', { x: -size / 2, y: -size / 2, width: size, height: size, fill: color }, e);
  return e;
}
// The console the reading tells the student to watch: the message list under the canvas.
function dlConsole(p, t0) {
  const SX = SXT(), g = G(p, { o: 0 });
  mk('rect', { x: CON.x, y: CON.y, width: CON.w, height: CON.h, rx: 12, fill: SX.bg, stroke: SX.edge, 'stroke-width': 2 }, g);
  dlText(g, 'console', { x: CON.x + 18, y: CON.y + 30, size: 22, fill: COL.muted, weight: 600 });
  show(g, t0, .4);
  return { g, lines: G(g), n: 0 };
}
function dlLog(con, text, t0) {
  const y = CON_LINE(con.n++);
  const t = dlText(con.lines, text, { x: CON.x + 20, y, size: 24, fill: COL.text, font: MONO, weight: 400, o: 0 });
  show(t, t0, .25);
  return t;
}

const BEATS = [
  ['hello', 'Two ways', (m, D) => {
    const p = panel(0), ST = STG(), H = D + .1;
    const K = S.title = G(p);
    show(dlText(K, 'moSHion · Physics Feel', { x: 70, y: 74, size: 22, fill: COL.purple, weight: 600, o: 0 }), m('hi', -.1), .4);
    const tt = dlText(K, 'Delete and Hide, Explained', { x: 70, y: 124, size: 46, fill: COL.text, weight: 600, o: 0 });
    tw(tt, { o: 1, y: 124 }, m('hi'), .5, out); put(tt, { y: 136 });
    // the reading's two sprites, before any code: one column each, so the two ways can be named under them
    S.hc = G(p);
    S.hb = dlBox(S.hc, 860, 320, 90, ST.blue); show(S.hb, m('hi', .2), .4);
    S.ho = dlBox(S.hc, 1170, 320, 90, COL.orange); show(S.ho, m('hi', .3), .4);
    show(dlText(p, 'a', { x: 860, y: 430, size: 30, fill: COL.muted, font: MONO, weight: 600, anchor: 'middle', o: 0 }), m('hi', .45), .35);
    show(dlText(p, 'b', { x: 1170, y: 430, size: 30, fill: COL.muted, font: MONO, weight: 600, anchor: 'middle', o: 0 }), m('hi', .5), .35);
    // "One is delete." / "The other is hide.": the two method names, on their own words
    S.d1 = dlRuns(p, [['delete', SXT().fn, 600, MONO], ['()', COL.muted, 400, MONO]], { x: 860, y: 500, size: 30, o: 0 });
    show(S.d1, m('del', .05), .4); dlBump(S.hb, m('del', .1), 1.12);
    S.d2 = dlRuns(p, [['visible', SXT().ident, 600, MONO], [' = ', COL.muted, 400, MONO], ['false', SXT().num, 600, MONO]], { x: 1170, y: 500, size: 30, o: 0 });
    show(S.d2, m('hide', .05), .4); dlBump(S.ho, m('hide', .1), 1.12);
    // "Those two are not the same.": a divider between the columns, and the line
    const dv = path(S.hc, 'M1005 250V560', { stroke: COL.raised, 'stroke-width': 3 }, { d: 0 });
    draw(dv, m('same', .0), .5);
    S.notSame = dlText(p, 'not the same', { x: 1005, y: 640, size: 32, fill: COL.text, weight: 600, anchor: 'middle', o: 0 });
    show(S.notSame, m('same', .12), .4);
    dlHold(H);
  }],

  ['delete', 'Press d', (m, D) => {
    const p = panel(0), ST = STG(), H = D + .1;
    S.code = dlCode(p, m('code'));
    S.pane = dlPane(p, m('code', .05));
    S.blue = dlSquare(S.pane, 120, 100, ST.blue, SPR, 0); show(S.blue, m('code', .3), .3);
    S.orange = dlSquare(S.pane, 240, 100, COL.orange, SPR, 0); show(S.orange, m('code', .35), .3);
    S.con = dlConsole(p, m('code', .1));
    S.kd = dlKeycap(p, KD.x, KD.y, 'd'); S.kv = dlKeycap(p, KV.x, KV.y, 'v');
    show(S.kd.g, m('code', .2), .3); show(S.kv.g, m('code', .25), .3);
    S.pressLbl = dlText(p, 'press', { x: 1478, y: 552, size: 22, fill: COL.muted, anchor: 'middle', o: 0 });
    show(S.pressLbl, m('code', .3), .3);
    const C = S.code;
    // "The blue one is a." / "The orange one is b."
    show(C.bar, m('blue', -.05), .25); dlBarTo(C.bar, 4, 1, m('blue', -.05), .3);
    S.u1 = dlUnder(C.main.rows[4], C.main.spans.a4, COL.purple, m('blue', .0));
    dlBump(S.blue, m('blue', .05), 1.12);
    hide(S.u1, m('orange', -.05), .2); dlBarTo(C.bar, 6, 1, m('orange', -.05), .35);
    S.u2 = dlUnder(C.main.rows[6], C.main.spans.b6, COL.purple, m('orange', .0));
    dlBump(S.orange, m('orange', .05), 1.12);
    // "Press d."
    hide(S.u2, m('pressd', -.05), .2); dlBarTo(C.bar, 12, 1, m('pressd', -.05), .3);
    dlKey(S.kd, m('pressd', .05));
    // "a.delete() removes the blue sprite for good. It is gone."
    dlBarTo(C.bar, 13, 1, m('del', -.05), .25);
    S.u3 = dlUnder(C.main.rows[13], C.main.spans.del13, COL.purple, m('del', .15));
    hide(S.blue, m('del', .2), .1);                                  // a delete is not a fade
    // "The console under the canvas shows a deleted."
    hide(S.u3, m('log', -.1), .2); dlBarTo(C.bar, 15, 1, m('log', -.1), .3);
    dlLog(S.con, 'a deleted', m('log', .05));
    // "Then the code sets a to null."
    dlBarTo(C.bar, 14, 1, m('null', -.05), .3);
    S.u4 = dlUnder(C.main.rows[14], C.main.spans.null14, COL.purple, m('null', .1));
    // "Press d again. Nothing happens."
    hide(S.u4, m('again', -.1), .2); dlBarTo(C.bar, 12, 1, m('again', -.05), .3);
    dlKey(S.kd, m('again', .05));
    S.note = dlText(p, 'nothing new', { x: CON.x + CON.w - 16, y: CON.y + 30, size: 22, fill: COL.muted, anchor: 'end', o: 0 });
    show(S.note, m('nothing', .05), .3);
    // "The if line asks for the d key and for a. Now a is null, so the test fails."
    S.u5 = dlUnderSpan(C.main.rows[12], C.main.spans.kb12, C.main.spans.aguard12, COL.purple, m('guard', .0), 4);
    dlBarTo(C.bar, 12, 1, m('guard', -.05), .3);
    hide(S.note, H - .5, .3); hide(C.bar, H - .4, .3); hide(S.u5, H - .5, .3); hide(S.pressLbl, H - .5, .3);
    dlHold(H);
  }],

  ['hide', 'Press v', (m, D) => {
    const C = S.code, p = S.panel, pv = S.pane, H = D + .1;
    // "Now press v."
    show(C.bar, m('pressv', -.05), .25); dlBarTo(C.bar, 17, 1, m('pressv', -.05), .3);
    dlKey(S.kv, m('pressv', .05));
    // "b.visible equals false hides the orange sprite.": the line that hides it lights on [[hide]] ("This line flips
    // visible"), but the sprite itself goes when the voice says the word "hides" (6.472 s in this beat's audio,
    // content/narration.en.timings.json). It used to go on [[hide]]+0.25, 4.9 s before that word: the pane went blank
    // while the student was still being told which line flips, so the sprite that was about to hide was never seen.
    // Marks, narration and timings.js are unchanged; only the picture moved onto the word (see review/BUILD.md).
    const HIDES_AT = 6.472;
    dlBarTo(C.bar, 18, 1, m('hide', -.05), .3);
    S.u6 = dlUnder(C.main.rows[18], C.main.spans.vis18, COL.purple, m('hide', .1));
    hide(S.orange, HIDES_AT, .12);
    // the console line lands on its own words
    dlLog(S.con, 'b visible: false', m('false', .05));
    // "But b is still there. It is not drawn, but nothing else changed.": a dashed outline stays where it is
    const gx = G(pv.kids, { x: cvX(240), y: cvY(100), o: 0 });
    mk('rect', { x: -SPR * CV.k / 2, y: -SPR * CV.k / 2, width: SPR * CV.k, height: SPR * CV.k,
      fill: 'none', stroke: AP().ghost, 'stroke-width': 2.5, 'stroke-dasharray': '8 7' }, gx);
    S.ghost = gx; show(gx, m('there', .1), .35);
    S.ghostL = dlText(p, 'still there, not drawn', { x: cvX(240) - 52, y: cvY(100) + 8, size: 22, fill: COL.muted, anchor: 'end', o: 0 });
    show(S.ghostL, m('there', .3), .35);
    // "Press v again, and it comes back."
    dlKey(S.kv, m('back', .05));
    hide(S.ghost, m('back', .15), .2); hide(S.ghostL, m('back', .15), .2);
    show(S.orange, m('back', .25), .2);
    dlLog(S.con, 'b visible: true', m('true', .05));
    // "That line flips the value on every press."
    dlBarTo(C.bar, 18, 1, m('flip', -.05), .3);
    S.u7 = dlUnder(C.main.rows[18], C.main.spans.not18, COL.purple, m('flip', .15), 4);
    hide(C.bar, H - .4, .3); hide(S.u7, H - .4, .3); hide(S.u6, H - .45, .3);
    dlHold(H);
  }, { keep: true }],

  ['still', 'The proof', (m, D) => {
    const p = panel(0), ST = STG(), SX = SXT(), H = D + .1;
    const g = S.still = G(p);
    // two scenes, labelled
    show(dlText(g, 'hidden', { x: ML.x, y: 190, size: 32, fill: COL.text, weight: 600, o: 0 }), m('hidden', -.1), .35);
    show(dlRuns(g, [['visible = false', SX.ident, 600, MONO]], { x: ML.x, y: 220, size: 22, anchor: 'start', o: 0 }), m('hidden', .1), .35);
    show(dlText(g, 'deleted', { x: MR.x, y: 190, size: 32, fill: COL.text, weight: 600, o: 0 }), m('deleted', -.1), .35);
    show(dlRuns(g, [['a', SX.ident, 600, MONO], ['.delete()', SX.fn, 600, MONO]], { x: MR.x, y: 220, size: 22, anchor: 'start', o: 0 }), m('deleted', .1), .35);
    const mkMini = (x, id) => {
      const mm = G(g);
      mk('rect', { x, y: ML.y, width: MINI.w, height: MINI.h, fill: ST.canvas }, mm);
      const cp = mk('clipPath', { id }, mm);
      mk('rect', { x, y: ML.y, width: MINI.w, height: MINI.h }, cp);
      const kids = G(mm); kids.setAttribute('clip-path', `url(#${id})`);
      return kids;
    };
    const kl = mkMini(ML.x, 'dlClipL'), kr = mkMini(MR.x, 'dlClipR');
    show(g, m('proof', -.05), .35);
    // the pad's place, where it is: left hidden (nothing drawn), right deleted (nothing drawn); both say so later
    const padGhost = (kids, x0, o = 0) => {
      const e = G(kids, { x: x0 + PAD.u * MINI.k, y: ML.y + PAD.v * MINI.k, o });
      mk('rect', { x: -PAD_S * MINI.k / 2, y: -PAD_S * MINI.k / 2, width: PAD_S * MINI.k, height: PAD_S * MINI.k,
        fill: 'none', stroke: AP().ghost, 'stroke-width': 2.5, 'stroke-dasharray': '8 7' }, e);
      return e;
    };
    S.gL = padGhost(kl, ML.x); S.gR = padGhost(kr, MR.x);
    // "It stops at about y = 125.": the line both balls cross, the left one stopping on it. Drawn BEFORE the balls
    // (eyes round: painted after them, it notched across the left ball's centre).
    const yl = ML.y + REST_SHOWN * MINI.k;
    const yline = path(g, `M${ML.x - 8} ${yl}H${MR.x + MINI.w + 6}`, { stroke: ST.y, 'stroke-width': 2.5, 'stroke-dasharray': '8 7' }, { o: 0 });
    // the balls get their own clipped layer ABOVE the line (they are children of the mini canvas, so creating them
    // after the line would still paint them under it)
    const mkBallLayer = (x, id) => {
      const mm = G(g);
      const cp = mk('clipPath', { id }, mm);
      mk('rect', { x, y: ML.y, width: MINI.w, height: MINI.h }, cp);
      const kids = G(mm); kids.setAttribute('clip-path', `url(#${id})`);
      return kids;
    };
    const bl = mkBallLayer(ML.x, 'dlClipBL'), br = mkBallLayer(MR.x, 'dlClipBR');
    // the same ball, the same height, in both scenes
    const ball = (kids, x0, o = 0) => {
      const e = G(kids, { x: x0 + DROP.u * MINI.k, y: ML.y + DROP.v * MINI.k, o });
      mk('rect', { x: -BALL * MINI.k / 2, y: -BALL * MINI.k / 2, width: BALL * MINI.k, height: BALL * MINI.k, fill: ST.blue }, e);
      return e;
    };
    const bL = S.bL = ball(bl, ML.x), bR = S.bR = ball(br, MR.x);
    show(bL, m('two', .05), .25); show(bR, m('two', .12), .25);
    // the falls: real time, measured. Both balls sit at y 40 and follow y = 40 + 150 t^2. The left one drops so that
    // it lands on [[lands]] and stops on the hidden pad (measured 124.55). The right one drops on its own sentence,
    // "The ball falls straight through", and leaves the canvas 1.354 s later, so it is still falling while that line
    // is said and gone by "It keeps going, off the bottom."
    const tl = Math.max(m('two', .3), m('lands', -.1) - LANDS_AT);
    prog(q => {
      const t = q * 1.2;
      put(bL, { y: ML.y + Math.min(REST_MEASURED, DROP.v + .5 * FALL_A * t * t) * MINI.k });
    }, tl, 1.2, lin);
    const tr = Math.max(tl + 1.4, m('keep', -1.354));   // eyes round: leaves the canvas ON "off the bottom" (20.86 s), not 1 s early
    prog(q => {
      const t = q * 1.6;
      put(bR, { y: MR.y + (DROP.v + .5 * FALL_A * t * t) * MINI.k });
    }, tr, 1.6, lin);
    // "It stops at about y = 125.": the line both balls cross, the left one stopping on it
    show(yline, m('stop', .0), .5);
    show(dlRuns(g, [['y', ST.y, 600, MONO], [' = ', COL.muted, 400, MONO], ['125', COL.text, 500, MONO]], { x: MR.x + MINI.w + 18, y: yl + 8, size: 26, anchor: 'start', o: 0 }), m('stop', .25), .35);
    // "It landed on something you cannot see." The outline is on screen from "hidden" (5.3 s), so the ball does not
    // rest on empty canvas for the ~5 s before this line (eyes round, item 2).
    show(S.gL, m('hidden', .3), .4);
    // The helper labels sit UNDER their pads and inside their canvases (eyes round, item 5: beside the pad the
    // 22 px text ran past the canvas edge; "where it was" ended 1.3 px outside the right canvas).
    show(dlText(g, 'the hidden sprite', { x: ML.x + MINI.w - 10, y: ML.y + PAD.v * MINI.k + 58, size: 22, fill: COL.muted, anchor: 'end', o: 0 }), m('cannot', .35), .35);
    // "On the right, that sprite was deleted." / "The ball falls straight through."
    show(S.gR, m('deleted', .1), .4);
    show(dlText(g, 'where it was', { x: MR.x + MINI.w - 10, y: ML.y + PAD.v * MINI.k + 58, size: 22, fill: COL.muted, anchor: 'end', o: 0 }), m('deleted', .35), .35);
    // the result under each scene, on the words that say it
    show(dlText(g, 'the ball lands on it', { x: ML.x + MINI.w / 2, y: 560, size: 26, fill: COL.text, anchor: 'middle', o: 0 }), m('lands', .05), .35);
    show(dlText(g, 'the ball falls through', { x: MR.x + MINI.w / 2, y: 560, size: 26, fill: COL.text, anchor: 'middle', o: 0 }), m('through', .05), .35);
    // the verdict, on "Delete took the physics body with it. Hide did not."
    show(dlText(g, 'physics: still running', { x: ML.x + MINI.w / 2, y: 606, size: 24, fill: COL.muted, anchor: 'middle', o: 0 }), m('body', .0), .35);
    show(dlText(g, 'physics: gone', { x: MR.x + MINI.w / 2, y: 606, size: 24, fill: COL.muted, anchor: 'middle', o: 0 }), m('body', .35), .35);
    dlHold(H);
  }],

  ['pick', 'Which one', (m, D) => {
    const p = panel(0), SX = SXT(), H = D + .1;
    const g = S.rules = G(p, { o: 0 });
    const row = (y, codeRuns, head, details, when) => {
      mk('rect', { x: ZONE.x, y, width: 1250, height: 180, rx: 14, fill: COL.panel, stroke: COL.raised, 'stroke-width': 2.5 }, g);
      return {
        t: dlRuns(g, codeRuns, { x: ZONE.x + 40, y: y + 70, size: 30, anchor: 'start', o: 0 }),
        h1: dlText(g, head, { x: ZONE.x + 500, y: y + 62, size: 30, fill: COL.text, weight: 600, o: 0 }),
        d1: dlText(g, details, { x: ZONE.x + 500, y: y + 108, size: 23, fill: COL.muted, o: 0 }),
        w1: dlRuns(g, when, { x: ZONE.x + 40, y: y + 148, size: 23, anchor: 'start', o: 0 }),
      };
    };
    const c1 = row(210, [['a', SX.ident, 600, MONO], ['.delete()', SX.fn, 600, MONO]], 'gone for good',
      'no undo · drawing stops · updating stops · physics stops', [['when: ', COL.muted], ['a coin you collected', COL.text, 600]]);
    const c2 = row(420, [['b', SX.ident, 600, MONO], ['.visible', SX.ident, 600, MONO], [' = ', COL.muted, 400, MONO], ['false', SX.num, 600, MONO]], 'hidden only',
      'not drawn · still there · physics keeps running', [['when: ', COL.muted], ['a sprite that comes back', COL.text, 600]]);
    show(g, m('rule', -.05), .4);
    // The detail line and the "when" line wait for their own words (eyes round, item 4): they used to appear with
    // the row, 3.4 s and 7-11 s before the voice named them. Marks already exist in the narration, no re-synthesis.
    const reveal = (t, k, kd, kw) => {
      show(t.t, m(k, .0), .3); show(t.h1, m(k, .1), .3);
      show(t.d1, m(kd, .0), .3); show(t.w1, m(kw, .0), .3);
    };
    reveal(c1, 'forever', 'stopall', 'when'); reveal(c2, 'curtain', 'notdrawn', 'later');
    // "One question picks: is it coming back?"
    show(dlText(g, 'Is it coming back?', { x: 800, y: 720, size: 34, fill: COL.purple, weight: 600, anchor: 'middle', o: 0 }), m('ask', -.05), .4);
    dlHold(H);
  }],

  ['close', 'Up next', (m, D) => {
    const p = panel(0), SX = SXT();
    const row = (runs, y, t0, size = 40, weight = 600) => { const t = dlRuns(p, runs, { x: 800, y, size, weight, o: 0 }); tw(t, { o: 1, y }, t0, .45, out); put(t, { y: y + 10 }); return t; };
    row([['delete()', SX.fn, 500, MONO], ['   gone for good', COL.text, 500]], 230, m('sum', -.05), 38);
    row([['visible = false', SX.ident, 500, MONO], ['   hidden only', COL.text, 500]], 312, m('sum', .6), 38);
    show(dlText(p, 'UP NEXT', { x: 800, y: 440, size: 22, fill: COL.purple, weight: 600, anchor: 'middle', o: 0 }), m('next', -.05), .35);
    row([['The reading: Cleanup and Delete', COL.text]], 512, m('next', .15), 46);
    row([['then the whole scene, with everything you built', COL.muted]], 580, m('next', 1.1), 30, 500);
    dlHold(Math.max(D, m('bye', 1.8)) + .1);
  }],
].map(([id, title, run, extra]) => ({ id, title, run, ...extra }));

// ---- SH: bottom-left, never the subject. Every expression change lands on a narration mark; no two consecutive
// expressions repeat. ----
const CODEC = [560, 420], PANEC = [1210, 330], CONC = [1150, 660], KEYC = [1478, 590],
  TWOC = [1005, 340], STILLC = [700, 400], RULEC = [900, 420];
bindActs({
  hello: { act: (t, m, D, s, MV) => {
    s.pose = 'down';
    emo(t, s, [[0, { expr: 'delighted', amp: 1.15, look: TWOC }],
      [m('del', -.1), { expr: 'curious', tilt: 6, look: [860, 500] }],
      [m('hide', -.1), { expr: 'determined', tilt: 0, look: [1170, 500] }],
      [m('same', -.1), { expr: 'delighted', amp: 1.1, look: TWOC, pose: 'down' }]]);
    MV.wave(t, s, m('hi', -.15), 1.9);
  } },
  delete: { act: (t, m, D, s) => {
    s.pose = 'pointUp';
    emo(t, s, [[0, { expr: 'determined', look: CODEC }],
      [m('blue', -.1), { expr: 'curious', tilt: 5, look: PANEC }],
      [m('orange', -.1), { expr: 'determined', tilt: 0, look: PANEC }],
      [m('pressd', -.1), { expr: 'curious', tilt: 4, look: KEYC }],
      [m('del', -.1), { expr: 'surprise', amp: 1, look: PANEC, pose: 'down' }],
      [m('log', -.1), { expr: 'curious', tilt: 0, look: CONC, pose: 'point' }],
      [m('null', -.1), { expr: 'determined', look: CODEC }],
      [m('again', -.1), { expr: 'curious', tilt: 4, look: KEYC, pose: 'pointUp' }],
      [m('nothing', -.1), { expr: 'surprise', amp: 1, look: CONC }],
      [m('guard', -.1), { expr: 'determined', tilt: 0, look: CODEC, pose: 'point' }],
      [m('null2', -.1), { expr: 'proud', amp: 1.05, look: CODEC }]]);
  } },
  hide: { act: (t, m, D, s) => {
    s.pose = 'pointUp';
    emo(t, s, [[0, { expr: 'determined', look: KEYC }],
      [m('pressv', -.1), { expr: 'curious', tilt: 5, look: KEYC }],
      [m('hide', -.1), { expr: 'surprise', amp: 1, look: PANEC, pose: 'down' }],
      [m('false', -.1), { expr: 'curious', tilt: 0, look: CONC, pose: 'point' }],
      [m('there', -.1), { expr: 'determined', look: PANEC }],
      [m('back', -.1), { expr: 'surprise', amp: 1, look: PANEC }],
      [m('true', -.1), { expr: 'curious', tilt: 4, look: CONC, pose: 'pointUp' }],
      [m('flip', -.1), { expr: 'proud', amp: 1.05, look: CODEC, pose: 'point' }]]);
  } },
  still: { act: (t, m, D, s) => {
    s.pose = 'point';
    emo(t, s, [[0, { expr: 'determined', look: STILLC }],
      [m('proof', -.1), { expr: 'curious', tilt: 5, look: STILLC }],
      [m('two', -.1), { expr: 'determined', tilt: 0, look: STILLC }],
      [m('lands', -.1), { expr: 'surprise', amp: 1, look: [ML.x + 162, ML.y + 130] }],
      [m('stop', -.1), { expr: 'curious', tilt: 0, look: [MR.x + MINI.w + 40, ML.y + 140] }],
      [m('deleted', -.1), { expr: 'determined', look: [MR.x + 162, MR.y + 140] }],
      [m('through', -.1), { expr: 'surprise', amp: 1, look: [MR.x + 162, MR.y + 220] }],
      [m('body', -.1), { expr: 'proud', amp: 1.05, look: STILLC, pose: 'pointUp' }]]);
  } },
  pick: { act: (t, m, D, s) => {
    s.pose = 'down';
    emo(t, s, [[0, { expr: 'determined', look: RULEC }],
      [m('forever', -.1), { expr: 'curious', tilt: 5, look: RULEC }],
      [m('curtain', -.1), { expr: 'determined', tilt: 0, look: RULEC }],
      [m('when', -.1), { expr: 'curious', tilt: 4, look: RULEC, pose: 'point' }],
      [m('later', -.1), { expr: 'determined', tilt: 0, look: RULEC }],
      [m('ask', -.1), { expr: 'delighted', amp: 1.1, look: RULEC, pose: 'pointUp' }]]);
  } },
  close: { act: (t, m, D, s, MV) => {
    s.pose = 'down';
    emo(t, s, [[0, { expr: 'proud', amp: 1.05, look: [800, 240] }],
      [m('next', -.1), { expr: 'delighted', amp: 1.1, look: [800, 500], pose: 'point' }],
      [m('bye', -.15), { pose: 'down' }],
      [m('bye', -.1), { expr: 'delighted', amp: 1.15, look: [800, 420] }]]);
    MV.wave(t, s, m('bye', -.15), 1.9);
  } },
});
boot();
