// moshion-5.2-jump: the concept explainer for shCode lesson 5.2.10 "Lab: Add a Jump" (the fourth shCode
// papermorph explainer; built on the approved 5.1.2 style and the 5.1.12 layout, see ../moshion-5.1.12/STYLE.md).
// Seven beats, one play-through, no questions:
//   hello   cold open: SH waves; the 5.1 player, its ground, and the fact that it has never jumped.
//   press   kb.pressing asks every frame (a held key keeps moving); kb.presses fires once, on the frame the key
//           goes down. Two frame strips under the editor, one continuous, one single blip.
//   ground  player.colliding(ground) is true while touching; off the edge it is false. A mini ground diagram with a
//           green "touching" lamp on it and a grey one off it.
//   jump    Run: the space bar is pressed on the ground, vel.y = -7, the player rises 291 px (measured on the real
//           runner: apex y 59 after 1.4 s) and gravity brings it back. The condition is shown as two chips -> jump.
//   bug     skip the ground check and a second press in mid-air launches again (measured: y -108, off the top). Use
//           kb.pressing instead and the speed is set every frame, so the player never falls. The rule line.
//   try     -7 becomes -5: about half the height (apex 200), sooner back down; the old apex stays as a dashed guide.
//   close   end card: presses fires once, colliding checks the ground; up next 5.2.11 (bounciness and friction).
// Truth measured on the real runner (public/moshion/runner.html): vel.y = -7 is 420 px/s, gravity 300 px/s^2, so the
// apex is 291 px (y 350 -> 59) after 1.4 s and the whole jump is 2.8 s. vel.y = -5 gives 150 px, apex y 200, 2 s.
// Two presses with no ground check reach y -108 (off the canvas). kb.pressing re-setting vel.y every frame means
// the player never falls. `colliding()` returns a running frame count, truthy while touching, so the video only
// shows it as a lamp, never as a number.
// Every colour comes from lib/tokens.js. Helper names are ms* (from the 5.1.2/5.1.12 explainers) or jp* (new). Lib
// globals (frame, label, draw, tick, dot, move, rect, X, NEG, ...) must not be shadowed.
'use strict';
const CHAPTER = { number: 1, type: 'explainer', title: 'The jump', kicker: 'moSHion · 5.2.10',
  meta: 'Under 3 minutes, with sound and captions. One play-through, no questions.', minutes: 3, language: 'en', coverGo: 'Play' };

// ---- layout (stage px, 1600x900; y >= 780 is the caption bar's, the bottom-left corner (x < 232, y > 522) is the character's) ----
const CODE = { x: 270, y: 150, w: 760, head: 44, size: 22, lh: 26, gut: 316, x0: 330, rows: 14 };
const codeBase = i => CODE.y + CODE.head + 26 + i * CODE.lh;            // baselines 220 246 ... 558
const CODE_B = codeBase(CODE.rows - 1) + 22;                            // the panel ends at y 580
const PANE = { x: 1040, y: 150, w: 520, h: 520 };                       // the student's preview: runner.html's #111 page
const CV = { x: 1070, y: 180, k: 1.15, n: 400 };                        // the 400 x 400 canvas, drawn 460 px, centred in the pane
const cvX = u => CV.x + u * CV.k, cvY = v => CV.y + v * CV.k, CV_S = CV.n * CV.k;
const PLAYER = { x: 200, y: 330, w: 30, h: 40 };
const GROUND = { x: 200, y: 380, w: 400, h: 20 };
const FLOOR_Y = GROUND.y - GROUND.h / 2, REST_Y = FLOOR_Y - PLAYER.h / 2;   // 370, so the player's centre rests at 350
const JUMP_H = 291, JUMP_T = 2.8;                                         // vel.y = -7: 291 px up, 2.8 s in the air (measured)
const JUMP_H5 = 150, JUMP_T5 = 2.0;                                       // vel.y = -5: 150 px up, 2 s (measured)
const RUNB = { x: CODE.x + CODE.w - 124, y: CODE.y + 6, w: 110, h: 32 }; // shCode's Run button, right end of the tab strip
const RUN_C = [RUNB.x + RUNB.w / 2, RUNB.y + RUNB.h / 2];                // (921, 172)
const PTR_FROM = [1015, 300], PTR_AT = [RUN_C[0] - 35, RUN_C[1] + 6];
const ZONE = { x: 284, y: 600, r: 990 };                                 // under the editor: one thing at a time
const TOP_Y = 124;
// What the sketch's own lines say, tagged as shCode's editor (lezer javascript + draculaHighlight) tags them.
const tk = kind => (s, id) => [s, kind, id];
const KW = tk('keyword'), PU = tk('punct'), NU = tk('num'), FN = tk('fn'), CL = tk('cls'), SR = tk('str'), OP = tk('op'), ID = tk('ident');
const MAIN = [
  [KW('let'), PU(' '), ID('player'), PU(', '), ID('ground'), PU(';')],
  [KW('function'), PU(' '), FN('setup'), PU('() {')],
  [PU('  '), KW('new'), PU(' '), CL('Canvas'), PU('('), NU('400'), PU(', '), NU('400'), PU(');')],
  [PU('  '), ID('world'), OP('.'), ID('gravity'), OP('.'), ID('y'), PU(' '), OP('='), PU(' '), NU('10'), PU(';')],
  [PU('  '), ID('player'), PU(' '), OP('='), PU(' '), KW('new'), PU(' '), CL('Sprite'), PU('('), NU('200'), PU(', '), NU('330'), PU(', '), NU('30'), PU(', '), NU('40'), PU(');')],
  [PU('  '), ID('player'), OP('.'), ID('color'), PU(' '), OP('='), PU(' '), SR("'deepskyblue'"), PU(';')],
  [PU('  '), ID('ground'), PU(' '), OP('='), PU(' '), KW('new'), PU(' '), CL('Sprite'), PU('('), NU('200'), PU(', '), NU('380'), PU(', '), NU('400'), PU(', '), NU('20'), PU(', '), SR("'static'", 'static'), PU(');')],
  [PU('  '), ID('ground'), OP('.'), ID('color'), PU(' '), OP('='), PU(' '), SR("'gray'"), PU(';')],
  [PU('}')],
  [KW('function'), PU(' '), FN('draw'), PU('() {')],
  [PU('  '), KW('if'), PU(' ('), ID('kb'), OP('.'), ID('presses'), PU('('), SR("' '"), PU(') && '), ID('player'), OP('.'), ID('colliding'), PU('('), ID('ground'), PU(')) {')],
  [PU('    '), ID('player'), OP('.'), ID('vel'), OP('.'), ID('y'), PU(' '), OP('='), PU(' '), OP('-'), NU('7', 'v7'), PU(';')],
  [PU('  '), PU('}')],
  [PU('}')],
];

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

// ---- the editor (gr*: from 5.1.12) ----
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
  const SX = SXT(), b = G(p, { o, y: codeBase(i) - 22 });
  b.bg = mk('rect', { x: CODE.x + 2, y: 0, width: CODE.w - 4, height: CODE.lh * n, fill: SX.lineBg }, b);
  b.sp = mk('rect', { x: CODE.x + 2, y: 0, width: 5, height: CODE.lh * n, fill: mark || SX.lineMark }, b);
  return b;
}
function grBarTo(b, i, n, t0, dur = .4) {
  tw(b, { y: codeBase(i) - 22 }, t0, dur);
  tw(b.bg, { a_height: CODE.lh * n }, t0, dur); tw(b.sp, { a_height: CODE.lh * n }, t0, dur);
}
function grUnder(p, row, t, c0, c1, color, t0, w = 3.5) {
  const y = st(row).y + 8, e = path(p, `M${grColL(t, c0) + 1} ${y}H${grColR(t, c1 - 1) - 1}`, { stroke: color, 'stroke-width': w }, { d: 0 });
  draw(e, t0, .4);
  return e;
}
function grEdit(row, t, c0, c1, spans, to, t0) {
  const flash = mk('rect', { x: grColL(t, c0) - 5, y: -20, width: grColR(t, c1 - 1) - grColL(t, c0) + 10, height: 28, rx: 6, fill: COL.purple }, null);
  row.insertBefore(flash, row.firstChild); put(flash, { o: 0 });
  tw(flash, { o: .45 }, t0, .2); tw(flash, { o: 0 }, t0 + .45, .45);
  const from = spans.map(s => s.textContent);
  prog(q => spans.forEach((s, k) => { s.textContent = q < .5 ? from[k] : to; }), t0 + .05, .4, lin);
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
  const marks = G(g), bar = grBar(g, 0, 1), gut = G(g), nums = [];
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
  const clip = mk('clipPath', { id: 'jpCanvasClip' }, g);
  mk('rect', { x: CV.x, y: CV.y, width: CV_S, height: CV_S }, clip);
  const kids = G(g);
  kids.setAttribute('clip-path', 'url(#jpCanvasClip)');
  show(g, t0, .5);
  return { g, kids };
}
function grGround(pv, o = 1) {
  const g = G(pv.kids, { x: cvX(GROUND.x), y: cvY(GROUND.y), o });
  mk('rect', { x: -GROUND.w * CV.k / 2, y: -GROUND.h * CV.k / 2, width: GROUND.w * CV.k, height: GROUND.h * CV.k, fill: '#808080' }, g);
  return g;
}
function grPlayer(pv, x, y, color, o = 1) {
  const W = PLAYER.w * CV.k, H = PLAYER.h * CV.k, e = G(pv.kids, { x: cvX(x), y: cvY(y), o });
  mk('rect', { x: -W / 2, y: -H / 2, width: W, height: H, fill: color }, e);
  return e;
}
function grClear(els, t0) { els.forEach(e => e && hide(e, t0, .12)); }
function grTop(p) {
  const ST = STG(), g = G(p);
  const tG = G(g, { o: 0 }), tr = msRuns(tG, [['on the ground', COL.muted], ['   ', COL.muted], ['yes', COL.good, 600]], { x: PANE.x + 6, y: TOP_Y, size: 28, anchor: 'start' });
  const yG = G(g, { o: 0 }), yr = msRuns(yG, [['y', ST.y, 600, MONO], [' = ', COL.muted, 400, MONO], ['350', COL.text, 500, MONO]], { x: PANE.x + PANE.w - 6, y: TOP_Y, size: 32, anchor: 'end' });
  return { g, tG, yG, tr, yr, touch: v => { tr.runs[2].textContent = v ? 'yes' : 'no'; tr.runs[2].setAttribute('fill', v ? COL.good : COL.muted); }, y: v => { yr.runs[2].textContent = String(v); } };
}
const grSet = (f, v, t0) => prog(() => f(v), t0, 0, lin);
function grModeLabel(p, text, t0, t1) {
  const e = msText(p, text, { x: PANE.x + PANE.w, y: 700, size: 22, fill: COL.muted, weight: 500, anchor: 'end', o: 0 });
  show(e, t0, .3); if (t1 != null) hide(e, t1, .3);
  return e;
}
// The space bar, under the pane: it dips on the frame the key goes down, and lifts again.
function grKey(p, t0, y = 712, w = 190) {
  const g = G(p, { x: PANE.x + PANE.w / 2, y, o: 0 });
  const bg = mk('rect', { x: -w / 2, y: -26, width: w, height: 52, rx: 10, fill: COL.panel, stroke: COL.raised, 'stroke-width': 2.5 }, g);
  msText(g, 'space', { x: 0, y: 9, size: 22, fill: COL.text, weight: 600, anchor: 'middle' });
  const lamp = G(g, { x: 0, y: 0 });
  show(g, t0, .35);
  return { g, bg, down: t => { tw(g, { s: .94 }, t, .06, out); tw(bg, { c_fill: COL.raised }, t, .06); },
    up: t => { tw(g, { s: 1 }, t, .18, out); tw(bg, { c_fill: COL.panel }, t, .18); } };
}
// A frame strip: n boxes; fill from..to (inclusive) with the accent. Used to show held vs one-shot.
function grStrip(p, x, y, n, { w = 34, gap = 9, color = COL.purple } = {}) {
  const g = G(p), boxes = [];
  for (let i = 0; i < n; i++) {
    const b = mk('rect', { x: x + i * (w + gap), y: y - 20, width: w, height: 40, rx: 5, fill: COL.panel, stroke: COL.raised, 'stroke-width': 2 }, g);
    boxes.push(b);
  }
  return { g, boxes, fill: (i, t0, c = color) => tw(boxes[i], { c_fill: c }, t0, .15) };
}
// A vertical jump guide at stage x, from yBase up to yTop (stage px), drawn top-down with an arrow at the top.
function grGuide(p, x, yBase, yTop, color, t0, dash = '8 7') {
  const g = path(p, `M${x} ${yBase}V${yTop}`, { stroke: color, 'stroke-width': 3, 'stroke-dasharray': dash }, { d: 0 });
  draw(g, t0, .5);
  const hd = path(p, `M${x - 9} ${yTop + 14}L${x} ${yTop}L${x + 9} ${yTop + 14}`, { stroke: color, 'stroke-width': 3 }, { o: 0 });
  show(hd, t0 + .5, .15);
  return [g, hd];
}

const BEATS = [
  ['hello', 'It has never jumped', (m, D) => {
    const p = panel(0);
    S.title = G(p);
    show(msText(S.title, 'moSHion · 5.2.10', { x: 70, y: 74, size: 22, fill: COL.purple, weight: 600, o: 0 }), m('move', -.1), .4);
    const tt = msText(S.title, 'The jump', { x: 70, y: 124, size: 46, fill: COL.text, weight: 600, o: 0 });
    tw(tt, { o: 1, y: 124 }, m('move'), .5, out); put(tt, { y: 136 });
    S.code = grCode(p, m('move'));
    tw(S.code.g, { y: 0 }, m('move'), .55, out); put(S.code.g, { y: 14 });
    S.pv = grPane(p, m('never', -.05));
    S.ground = grGround(S.pv, 0); show(S.ground, m('never', .1), .35);
    S.player = grPlayer(S.pv, PLAYER.x, REST_Y, STG().blue, 0); show(S.player, m('never', .15), .3);
    S.top = grTop(p);
    show(S.top.tG, m('never', .2), .3); show(S.top.yG, m('never', .2), .3);
    S.key = grKey(p, m('here', -.05)); show(S.key.g, m('here'), .35);
    msBump(S.player, m('here', .3), 1.1);
  }],

  ['press', 'Once, not every frame', (m, D) => {
    const C = S.code, p = S.panel, H = D + .1, SX = SXT(), ST = STG();
    // "The key code you know is kb.pressing."
    show(C.bar, m('two', -.05), .3); grBarTo(C.bar, 10, 1, m('two', -.05), .3);
    S.cmp = G(C.cm);
    grUnder(S.cmp, C.main.rows[10], C.main.texts[10], 8, 19, COL.purple, m('two', .3));   // kb.pressing
    // "So the player keeps moving for as long as you hold it.": a held key fills every frame
    S.held = G(p);
    show(msText(S.held, 'a held key', { x: ZONE.x, y: 640, size: 22, fill: COL.muted, o: 0 }), m('move', -.05), .3);
    const st1 = grStrip(S.held, ZONE.x + 170, 640, 12, { color: COL.purple });
    show(st1.g, m('move', .1), .3);
    for (let i = 0; i < 12; i++) st1.fill(i, m('move', .25 + i * .045));
    // "The space bar needs something different. One tap should give one jump."
    S.spaceLabel = msText(p, 'the space bar', { x: ZONE.x, y: 700, size: 22, fill: COL.muted, o: 0 });
    show(S.spaceLabel, m('space', -.05), .3);
    const key = S.key2 = grKey(p, m('space', .1), 700);
    // "That is kb.presses: it fires once, on the frame the key goes down."
    hide(S.held, m('presses', -.2), .35);
    show(C.bar, m('presses', -.05), .3); grBarTo(C.bar, 10, 1, m('presses', -.05), .01);
    hide(S.cmp, m('presses', -.15), .3);
    S.cmp2 = G(C.cm);
    grUnder(S.cmp2, C.main.rows[10], C.main.texts[10], 8, 19, COL.purple, m('presses', .05));   // kb.presses
    S.one = G(p);
    const st2 = grStrip(S.one, ZONE.x + 170, 700, 12, { color: COL.purple });
    show(st2.g, m('presses', .1), .3);
    key.down(m('presses', .3)); key.up(m('presses', .55));
    st2.fill(0, m('presses', .3));
    // "Hold the key down, and it does not fire again.": the key stays down, no new blip
    key.down(m('hold', -.1));
    const note = msText(S.one, 'held: no second jump', { x: ZONE.x + 690, y: 706, size: 20, fill: COL.muted, o: 0 });
    show(note, m('hold', .2), .3);
    hide(S.one, H - .4, .3); hide(S.key2.g, H - .4, .3); hide(S.cmp2, H - .4, .3);
    msHold(H);
  }, { keep: true }],

  ['ground', 'It needs the ground', (m, D) => {
    const C = S.code, p = S.panel, ST = STG(), H = D + .1;
    hide(S.spaceLabel, m('ground'), .3);
    // "player.colliding(ground) is true while the player touches the ground."
    show(C.bar, m('ground', -.05), .3); grBarTo(C.bar, 10, 1, m('ground', -.05), .01);
    const cm = S.cmg = G(C.cm);
    grUnder(cm, C.main.rows[10], C.main.texts[10], 21, 42, ST.green, m('collide', .05));      // colliding(ground)
    // "Walk off the edge, and it is false.": a mini ground with the player on it and beside it
    const g = S.gd = G(p), BX = ZONE.x + 30, BY = 690, BW = 380, BH = 22;
    mk('rect', { x: BX, y: BY, width: BW, height: BH, fill: '#808080' }, g);
    const on = G(g, { x: BX + 90, y: BY - 22, o: 0 }); mk('rect', { x: -18, y: -20, width: 36, height: 40, fill: ST.blue }, on);
    const off = G(g, { x: BX + BW + 70, y: BY + 40, o: 0 }); mk('rect', { x: -18, y: -20, width: 36, height: 40, fill: ST.blue }, off);
    show(on, m('ground', .2), .3);
    const lamp1 = msRuns(g, [['touching', COL.muted], ['  yes', COL.good, 600]], { x: BX + 60, y: 650, size: 22, anchor: 'middle', o: 0 });
    show(lamp1, m('collide', .1), .3);
    show(off, m('off', -.05), .3);
    const lamp2 = msRuns(g, [['off the edge', COL.muted], ['  no', COL.text, 600]], { x: BX + BW + 70, y: 650, size: 22, anchor: 'middle', o: 0 });
    show(lamp2, m('off', .1), .3);
    msArrow(g, BX + 130, 676, BX + BW + 40, 676, COL.muted, m('off', .2), .5, 3);
    // "So the jump needs both: a press, and the ground."
    S.both = G(p);
    show(msRuns(S.both, [['a press', COL.text, 600], ['  +  ', COL.muted], ['the ground', COL.text, 600], ['  =  ', COL.muted], ['a jump', COL.good, 600]], { x: ZONE.x + 20, y: 760, size: 24, anchor: 'start', o: 0 }), m('lamp', .05), .4);
    hide(S.gd, H - .4, .3); hide(S.both, H - .4, .3); hide(cm, H - .4, .3);
    msHold(H);
  }, { keep: true }],

  ['jump', 'The jump line', (m, D) => {
    const C = S.code, p = S.panel, top = S.top, ST = STG(), H = D + .1;
    hide(S.gd, m('line'), .35); hide(S.both, m('line'), .35); hide(S.spaceLabel, m('line'), .3);
    // "Here is the line.": the if and the vel.y line
    show(C.bar, m('line', -.05), .3); grBarTo(C.bar, 11, 2, m('line', -.05), .01);
    S.cmj = G(C.cm);
    grUnder(S.cmj, C.main.rows[11], C.main.texts[11], 4, 16, ST.y, m('then', -.1));            // player.vel.y
    grUnder(S.cmj, C.main.rows[11], C.main.texts[11], 19, 21, COL.purple, m('then', .2));      // -7
    // "The space bar is pressed, and the player is touching the ground."
    msPress(C, p, m('and'), .4);
    S.key3 = grKey(p, m('and', .2), 712); show(S.key3.g, m('and', .2), .3);
    S.key3.down(m('then', -.1)); S.key3.up(m('then', .5));
    show(top.tG, m('and', .3), .3); show(top.yG, m('and', .3), .3);
    // "Then set vel.y to -7. Negative y is up the screen, so the player rises."
    const P = S.pv;
    grClear([S.player], m('and', .3));
    const pj = S.jumpPl = grPlayer(P, PLAYER.x, REST_Y, STG().blue, 0); show(pj, m('and', .4), .12);
    const t0 = m('then', .3), tEnd = t0 + JUMP_T;
    top.touch(false);
    prog(q => {
      const t = q * JUMP_T, y = REST_Y - 4 * JUMP_H * (t / JUMP_T) * (1 - t / JUMP_T);
      put(pj, { y: cvY(y) }); top.y(Math.round(y));
    }, t0, JUMP_T, lin);
    grSet(top.touch, true, t0 + JUMP_T);
    // "One press, one jump.": an apex guide at the top of the jump
    S.once = msText(p, 'one press, one jump', { x: ZONE.x + 20, y: 700, size: 26, fill: COL.muted, o: 0 });
    show(S.once, m('once', .1), .35);
    msBump(top.yr, m('once', .2), 1.1);
    hide(S.key3.g, H - .4, .3); hide(top.tG, H - .4, .3); hide(top.yG, H - .4, .3);
    hide(C.bar, H - .4, .3); hide(S.cmj, H - .4, .3);
    msHold(H);
  }, { keep: true }],

  ['bug', 'Skip the ground check', (m, D) => {
    const C = S.code, p = S.panel, P = S.pv, top = S.top, H = D + .1, ST = STG();
    // "What if you skip the ground check?"
    hide(S.once, m('skip', -.1), .3); hide(S.jumpPl, m('skip', -.1), .2);
    show(C.bar, m('skip', -.05), .3); grBarTo(C.bar, 10, 1, m('skip', -.05), .01);
    const cm = S.cmb = G(C.cm);
    const warn = msRuns(p, [['press again in mid-air', COL.orange, 600]], { x: ZONE.x + 20, y: 700, size: 26, anchor: 'start', o: 0 });
    show(warn, m('air', -.05), .35);
    // "Press again in mid-air, and the player launches a second time."
    const p1 = grPlayer(P, PLAYER.x, REST_Y, ST.blue, 0); show(p1, m('skip', .1), .1);
    show(top.tG, m('skip', .1), .3); show(top.yG, m('skip', .1), .3);
    const t1 = m('skip', .2), T1 = JUMP_T * .42;
    top.touch(false);
    prog(q => { const t = q * T1, y = REST_Y - 4 * JUMP_H * (t / JUMP_T) * (1 - t / JUMP_T); put(p1, { y: cvY(y) }); top.y(Math.round(y)); }, t1, T1, lin);
    const yAir = REST_Y - 4 * JUMP_H * (T1 / JUMP_T) * (1 - T1 / JUMP_T);   // about 205
    grSet(top.y, Math.round(yAir), m('twice', -.1));
    // the second launch from mid-air, off the top
    const t2 = m('twice', -.2), T2 = 1.6;
    prog(q => {
      const t = q * T2, y = yAir - 4 * JUMP_H * (t / JUMP_T) * (1 - t / JUMP_T);
      put(p1, { y: cvY(y) }); top.y(Math.round(y));
    }, t2, T2, lin);
    S.guide = G(P.kids);
    grGuide(S.guide, cvX(260), cvY(350), cvY(-60), COL.red, t2, '8 7');
    // "Using kb.pressing is worse. It sets the speed every frame, so the player never falls."
    hide(p1, m('worse', -.15), .2); hide(S.guide, m('worse', -.15), .3);
    const p2 = S.rocket = grPlayer(P, PLAYER.x, REST_Y, ST.blue, 0); show(p2, m('worse', .1), .1);
    grSet(top.y, 350, m('worse', .1)); top.touch(true);
    const t3 = m('worse', .2);
    top.touch(false);
    prog(q => { const y = REST_Y - 460 * q; put(p2, { y: cvY(y) }); top.y(Math.round(y)); }, t3, .8, lin);
    hide(p2, m('every', .1), .15);
    const flat = S.flat = G(p);
    show(msRuns(flat, [['vel.y is set every frame', COL.orange, 600]], { x: ZONE.x + 20, y: 745, size: 24, anchor: 'start', o: 0 }), m('every', .2), .35);
    // "A press, and the ground. Both, or the jump does not work."
    const rule = msRuns(p, [['a press', COL.text, 600], ['  +  ', COL.muted], ['the ground', COL.text, 600]], { x: ZONE.x + 20, y: 645, size: 26, anchor: 'start', o: 0 });
    show(rule, m('rule', -.05), .4);
    hide(flat, m('rule', -.15), .3); hide(warn, m('rule', -.15), .3); hide(rule, H - .3, .3);
    hide(top.tG, H - .4, .3); hide(top.yG, H - .4, .3); hide(C.bar, H - .4, .3); hide(cm, H - .4, .3);
    msHold(H);
  }, { keep: true }],

  ['try', 'A smaller jump', (m, D) => {
    const C = S.code, p = S.panel, P = S.pv, top = S.top, H = D + .1, ST = STG();
    // "Change -7 to -5."
    show(C.bar, m('try', -.05), .3); grBarTo(C.bar, 11, 1, m('try', -.05), .01);
    grEdit(C.main.rows[11], C.main.texts[11], 19, 21, [C.main.spans.v7], '5', m('change', -.1));
    S.cm5 = G(C.cm);
    grUnder(S.cm5, C.main.rows[11], C.main.texts[11], 19, 21, COL.purple, m('change', .35));
    // "The player jumps about half as high" : the apex from -7 stays as a dashed guide
    grGuide(P.kids, cvX(258), cvY(350), cvY(59), COL.muted, m('change', .3));
    msText(P.kids, '-7', { x: cvX(258) + 10, y: cvY(59) + 4, size: 20, fill: COL.muted, font: MONO });
    msPress(C, p, m('higher', -.9), .4);
    show(top.tG, m('higher', .2), .3); show(top.yG, m('higher', .2), .3);
    const pj = S.tryP = grPlayer(P, PLAYER.x, REST_Y, ST.blue, 0); show(pj, m('higher', .3), .12);
    top.touch(false);
    const t0 = m('higher', .3);
    prog(q => { const t = q * JUMP_T5, y = REST_Y - 4 * JUMP_H5 * (t / JUMP_T5) * (1 - t / JUMP_T5); put(pj, { y: cvY(y) }); top.y(Math.round(y)); }, t0, JUMP_T5, lin);
    grSet(top.touch, true, t0 + JUMP_T5);
    // "Change it back to -7 for the big jump."
    grEdit(C.main.rows[11], C.main.texts[11], 19, 21, [C.main.spans.v7], '7', m('back', 1.6));
    hide(top.tG, H - .4, .3); hide(top.yG, H - .4, .3); hide(C.bar, H - .4, .3); hide(S.cm5, H - .4, .3);
    msHold(H);
  }, { keep: true }],

  ['close', 'Up next', (m, D) => {
    const p = panel(0), SX = SXT();
    const row = (runs, y, t0, size = 40, weight = 600, x = 800) => { const t = msRuns(p, runs, { x, y, size, weight, o: 0 }); tw(t, { o: 1, y }, t0, .45, out); put(t, { y: y + 10 }); return t; };
    row([['kb.presses', SX.ident, 500, MONO], ['   fires once per press', COL.text, 500]], 210, m('sum', -.05), 38);
    row([['colliding', SX.ident, 500, MONO], ['   asks if the player touches the ground', COL.text, 500]], 292, m('ground', -.05), 36);
    show(msText(p, 'UP NEXT', { x: 800, y: 440, size: 22, fill: COL.purple, weight: 600, anchor: 'middle', o: 0 }), m('next', -.05), .35);
    row([['5.2.11 Bounciness and Friction', COL.text]], 512, m('next', .15), 46);
    row([['two dials that change how the game feels', COL.muted]], 580, m('next', 1.1), 30, 500);
    msHold(Math.max(D, m('bye', 1.8)) + .1);
  }],
].map(([id, title, run, extra]) => ({ id, title, run, ...extra }));

// ---- SH: bottom-left, never the subject. ----
const CODEC = [630, 380], PANEC = [1290, 410], ZONEC = [640, 700], TOPC = [1290, 110];
bindActs({
  hello: { act: (t, m, D, s, MV) => {
    s.pose = 'down';
    emo(t, s, [[0, { expr: 'delighted', amp: 1.15, look: PANEC }],
      [m('move', -.1), { expr: 'curious', tilt: 6, amp: 1, look: CODEC }],
      [m('never', -.1), { expr: 'determined', tilt: 0, look: PANEC, pose: 'pointUp' }],
      [m('here', -.1), { expr: 'delighted', amp: 1.15, look: [1290, 712], pose: 'down' }]]);
    MV.wave(t, s, m('hi', -.15), 1.9);
  } },
  press: { act: (t, m, D, s) => {
    s.pose = 'pointUp';
    emo(t, s, [[0, { expr: 'determined', look: CODEC }],
      [m('checks', -.1), { expr: 'curious', tilt: 5, look: ZONEC }],
      [m('move', .6), { expr: 'delighted', amp: 1.1, look: ZONEC, pose: 'point' }],
      [m('space', -.1), { expr: 'determined', tilt: 0, look: [1290, 700] }],
      [m('presses', -.1), { expr: 'surprise', amp: 1, look: ZONEC }],
      [m('hold', -.1), { expr: 'proud', amp: 1.05, look: ZONEC, pose: 'point' }]]);
  } },
  ground: { act: (t, m, D, s) => {
    s.pose = 'point';
    emo(t, s, [[0, { expr: 'determined', look: CODEC }],
      [m('collide', -.1), { expr: 'curious', tilt: 5, look: [640, 690] }],
      [m('off', -.1), { expr: 'surprise', amp: 1, look: [900, 690] }],
      [m('lamp', -.1), { expr: 'proud', amp: 1.05, look: [640, 760], pose: 'pointUp' }]]);
  } },
  jump: { act: (t, m, D, s) => {
    s.pose = 'down';
    emo(t, s, [[0, { expr: 'determined', look: CODEC }],
      [m('and', -.1), { expr: 'determined', look: RUN_C, pose: 'pointUp' }],
      [m('then', -.1), { expr: 'curious', tilt: 5, look: CODEC }],
      [m('neg', -.1), { expr: 'surprise', amp: 1, look: PANEC }],
      [m('gravity', -.1), { expr: 'delighted', amp: 1.1, look: PANEC }],
      [m('once', -.1), { expr: 'proud', amp: 1.05, look: PANEC, pose: 'down' }]]);
    kick.lean(t, s, m('neg', .2), .5, .5);
  } },
  bug: { act: (t, m, D, s) => {
    s.pose = 'pointUp';
    emo(t, s, [[0, { expr: 'determined', look: CODEC }],
      [m('air', -.1), { expr: 'curious', tilt: 5, look: PANEC }],
      [m('twice', -.1), { expr: 'surprise', amp: 1, look: [1290, 120] }],
      [m('worse', -.1), { expr: 'determined', tilt: 0, look: PANEC }],
      [m('every', -.1), { expr: 'alarmed', amp: 1, look: PANEC }],
      [m('rule', -.1), { expr: 'proud', amp: 1.05, look: ZONEC, pose: 'point' }]]);
    kick.lean(t, s, m('twice', .1), .5, .5);
  } },
  try: { act: (t, m, D, s) => {
    s.pose = 'down';
    emo(t, s, [[0, { expr: 'curious', tilt: 5, look: CODEC }],
      [m('change', -.1), { expr: 'determined', tilt: 0, look: [900, 480] }],
      [m('higher', -.1), { expr: 'delighted', amp: 1.1, look: PANEC }],
      [m('back', -.1), { expr: 'determined', look: RUN_C, pose: 'pointUp' }],
      [m('back', 1.3), { expr: 'delighted', amp: 1.1, look: PANEC, pose: 'down' }]]);
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
