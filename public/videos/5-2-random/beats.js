// moshion-5.2-random: the concept explainer for shCode lesson 5.2.1 "Reading: Random numbers and timers" (the sixth
// shCode papermorph explainer; the approved 5.1.2 explainer is the style template, see ../moshion-5.1.2-style/STYLE.md).
// Seven beats, one play-through, no questions:
//   hello   cold open: SH waves; two tools arrive - a number the computer picks (random) and a clock made of frames (frameCount).
//   decimal random(6) drops three dots on a number line from 0 up to, but never touching, 6: 0.2509..., 4.339..., 5.675...
//   whole   floor cuts the decimals off; floor(random(6)) gives the six wholes 0-5 and never 6; the reading's range table,
//           then the rule floor(random(low, high + 1)).
//   spot    coin.x = random(30, 370) and coin.y = random(30, 270) move the coin to a random spot (dashed margins = helpers);
//           the coin lands at x 44.22, y 203.56, then colors[floor(random(colors.length))] picks deepskyblue (index 2).
//   clock   frameCount is the frames so far (1 on the first frame); 30 frames = half a second, 60 = one second, 300 = five,
//           drawn as three bars to scale; seconds x 60 = frames.
//   beat    frameCount % 30 === 0 is true on frames 30, 60, 90; a tick row 1..60 lights every 30th, a marker pulses on each;
//           frameCount % 60 is a slower beat (once a second).
//   close   end card: random gives a decimal, floor makes it whole, frameCount counts the clock; up next 5.2.2.
// Not taught here (list from the video spec; do not teach it): noise(), randomSeed, millis(), arrays beyond the colour list
// this reading uses, and the Sparkles example's own code (5.2.2 shows it).
// Truth measured on the real runner (headless moSHion harness, review/measure/): random(6) returns 0.250952, 4.339035,
// 5.675160 on the first three calls, identical in every fresh sandbox; floor(random(1, 7)) over 600 calls gives only 1-6;
// floor(random(6)) over 600 calls gives only 0-5; frameCount is 1, 2, 3 on the first three draws and 60 after 60 pumped
// frames; frameCount % 30 === 0 at frames 30, 60 and 90; the spot sketch's first coin lands at x 44.2206, y 203.5614 and
// floor(random(colors.length)) is 2 (deepskyblue). The reading's example values 4.1827 / 0.3391 / 5.9702 are NOT what the
// runner returns; the video uses the measured numbers (see review/BUILD.md, "Lesson defects found").
// Every colour comes from lib/tokens.js. Helper names are rt* so nothing shadows a lib global (frame, label, draw, tick,
// dot, move, rect, X, NEG, panel, show, hide, path, put, G, S ...).
'use strict';
const CHAPTER = { number: 1, type: 'explainer', title: 'Random Numbers and Timers, Explained', kicker: 'moSHion · 5.2.1',
  meta: 'Under 3 minutes, with sound and captions. One play-through, no questions.', minutes: 3, language: 'en', coverGo: 'Play' };

// ---- layout (stage px, 1600x900; y >= 780 is the caption bar's, x < 232 with y > 522 is the character's corner) ----
const CODE = { x: 110, y: 170, w: 760, head: 44, size: 22, lh: 34, gut: 166, x0: 206 };
const rtBase = i => CODE.y + CODE.head + 28 + i * CODE.lh;             // baselines 242 276 310 ...
const SPACE = { x: 900, y: 160, w: 620 };                              // the right-hand picture zone
const NL = { x0: 300, x1: 1420, y: 600 };                              // the 0..6 number line
const nlX = v => NL.x0 + v / 6 * (NL.x1 - NL.x0);
const PANE = { x: 1010, y: 150, w: 520, h: 440 };                      // the student's preview
const CV = { x: 1040, y: 200, k: 1.15, n: 400 };                       // the 400 x 300 canvas, drawn 460 x 345
const cvX = u => CV.x + u * CV.k, cvY = v => CV.y + v * CV.k;
const COIN0 = { x: 200, y: 150 }, COIN = { x: 44.2206, y: 203.5614 };   // measured first random spot
const TICKS = { x0: 300, x1: 1450, n: 60 };

// ---- drawing helpers (rt*: adapted from the 5.2-gravity explainer's ms*/gr*) ----
const AP = () => TOKS().app, STG = () => TOKS().stage, SXT = () => TOKS().syntax;
function rtText(p, str, { x, y, size = 26, fill = COL.text, weight = 500, anchor = 'start', font = UI, o = 1, italic = false } = {}) {
  const t = T(p, str, { x, y, size, fill, weight, anchor, font, o });
  if (italic) t.setAttribute('font-style', 'italic');
  return t;
}
function rtRuns(p, runs, { x, y, size = 34, anchor = 'middle', font = UI, o = 1, weight = 500 } = {}) {
  const t = rtText(p, '', { x, y, size, anchor, font, o, weight });
  t.runs = runs.map(([s, f, w, fnt, sz]) => {
    const e = mk('tspan', { fill: f }, t);
    if (w) e.setAttribute('font-weight', w); if (fnt) e.setAttribute('font-family', fnt); if (sz) e.setAttribute('font-size', sz);
    e.textContent = s; return e;
  });
  return t;
}
function rtArrow(p, x1, y1, x2, y2, color, t0, dur = .7, w = 3.5) {
  const g = G(p), a = Math.atan2(y2 - y1, x2 - x1), L = 16;
  draw(path(g, `M${x1} ${y1}L${x2} ${y2}`, { stroke: color, 'stroke-width': w }, { d: 0 }), t0, dur);
  const hd = path(g, `M${x2 - L * Math.cos(a - .5)} ${y2 - L * Math.sin(a - .5)}L${x2} ${y2}L${x2 - L * Math.cos(a + .5)} ${y2 - L * Math.sin(a + .5)}`,
    { stroke: color, 'stroke-width': w }, { o: 0 });
  show(hd, t0 + dur * .8, .15);
  return g;
}
function rtDashed(p, d, color = TOKS().app.ghost, o = 0) {
  return path(p, d, { stroke: color, 'stroke-width': 2.5, 'stroke-dasharray': '8 7', fill: 'none' }, { o });
}
function rtHold(t) { prog(() => {}, t, 0, lin); }
function rtBump(e, t0, k = 1.12) { tw(e, { s: k }, t0, .2, out); tw(e, { s: 1 }, t0 + .2, .35); }
function rtCard(p, { x, y, w, h, o = 0 }) {
  const g = G(p, { o, x, y });
  mk('rect', { x: 0, y: 0, width: w, height: h, rx: 14, fill: COL.panel, stroke: COL.raised, 'stroke-width': 2 }, g);
  return g;
}
function rtDot(p, x, y, color, r = 14) {
  const g = G(p, { x, y, o: 0 });
  mk('circle', { r, fill: color, stroke: COL.board, 'stroke-width': 2.5 }, g);
  return g;
}
function rtCounter(p, x, y) {
  const g = G(p, { o: 0 });
  const box = mk('rect', { x: 0, y: 0, width: 600, height: 140, rx: 14, fill: COL.panel, stroke: COL.raised, 'stroke-width': 2 }, g);
  rtText(g, 'frameCount', { x: 28, y: 46, size: 24, fill: COL.muted, weight: 500 });
  const v = rtText(g, '1', { x: 28, y: 118, size: 62, fill: COL.orange, font: MONO, weight: 600 });
  put(g, { x, y });
  return { g, v, box };
}

// ---- the editor (rt*: adapted from the gravity template's gr*) ----
const rtColL = (t, c) => CODE.x0 + t.getStartPositionOfChar(c).x;
const rtColR = (t, c) => CODE.x0 + t.getEndPositionOfChar(c).x;
const tk = kind => (s, id) => [s, kind, id];
const KW = tk('keyword'), PU = tk('punct'), NU = tk('num'), FN = tk('fn'), CL = tk('cls'), SR = tk('str'), OP = tk('op'), ID = tk('ident'), CM = tk('comment');
function rtRow(p, toks, i, spans, o = 1) {
  const SX = SXT(), row = G(p, { y: rtBase(i), o });
  const t = rtText(row, '', { x: CODE.x0, y: 0, size: CODE.size, font: MONO, weight: 400 });
  for (const [s, kind, id] of toks) {
    const sp = mk('tspan', { fill: SX[kind] }, t);
    if (kind === 'cls') sp.setAttribute('font-style', 'italic');
    sp.textContent = s;
    if (id) spans[id] = sp;
  }
  return { row, t };
}
function rtCode(p, lines, t0, o = 0) {
  const SX = SXT(), A = AP(), bottom = rtBase(Math.max(lines.length, 1) - 1) + 22;
  const g = G(p, { o });
  mk('rect', { x: CODE.x, y: CODE.y, width: CODE.w, height: bottom - CODE.y, rx: 14, fill: SX.bg, stroke: SX.edge, 'stroke-width': 2 }, g);
  path(g, `M${CODE.x} ${CODE.y + CODE.head}H${CODE.x + CODE.w}`, { stroke: SX.edge, 'stroke-width': 2 });
  rtText(g, 'script.js', { x: CODE.x + 26, y: CODE.y + 29, size: 20, fill: COL.muted, weight: 500 });
  path(g, `M${CODE.x + 14} ${CODE.y + CODE.head - 1}H${CODE.x + 132}`, { stroke: COL.purple, 'stroke-width': 3 });
  const run = G(g, { x: CODE.x + CODE.w - 70, y: CODE.y + 22 });
  mk('rect', { x: -52, y: -17, width: 104, height: 34, rx: 5, fill: A.run }, run);
  path(run, 'M-32 -8L-32 8L-19 0Z', { fill: A.runText, stroke: A.runText, 'stroke-width': 1.5 });
  rtText(run, 'Run', { x: -10, y: 8, size: 21, fill: A.runText, weight: 600 });
  const gut = G(g), nums = [], rows = [], texts = [], spans = {};
  lines.forEach((toks, i) => {
    nums.push(rtText(gut, String(i + 1), { x: CODE.gut, y: rtBase(i), size: 20, fill: SX.gutter, font: MONO, anchor: 'end', weight: 400 }));
    const r = rtRow(g, toks, i, spans); rows.push(r.row); texts.push(r.t);
  });
  const bar = G(g, { o: 0, y: rtBase(0) - 26 });
  bar.bg = mk('rect', { x: CODE.x + 2, y: 0, width: CODE.w - 4, height: CODE.lh, fill: SX.lineBg }, bar);
  bar.sp = mk('rect', { x: CODE.x + 2, y: 0, width: 5, height: CODE.lh, fill: SX.lineMark }, bar);
  show(g, t0, .5);
  return { g, run, bar, nums, rows, texts, spans, bottom };
}
function rtBarTo(b, i, n, t0, dur = .35) {
  tw(b, { y: rtBase(i) - 26 }, t0, dur);
  tw(b.bg, { a_height: CODE.lh * n }, t0, dur); tw(b.sp, { a_height: CODE.lh * n }, t0, dur);
}
function rtUnder(p, row, t, c0, c1, color, t0, w = 3.5) {
  const y = st(row).y + 8, e = path(p, `M${rtColL(t, c0) + 1} ${y}H${rtColR(t, c1 - 1) - 1}`, { stroke: color, 'stroke-width': w }, { d: 0 });
  draw(e, t0, .4);
  return e;
}
function rtType(row, t, t0, dur) {
  const sp = [...t.querySelectorAll('tspan')], full = sp.map(s => s.textContent), total = full.join('').length;
  show(row, t0, .05);
  prog(q => {
    let left = Math.round(q * total);
    sp.forEach((s, k) => { const n = Math.min(full[k].length, Math.max(0, left)); s.textContent = full[k].slice(0, n); left -= full[k].length; });
  }, t0, dur, lin);
}

const BEATS = [
  ['hello', 'Two tools', (m, D) => {
    const p = panel(0);
    S.title = G(p);
    show(rtText(S.title, 'moSHion · 5.2.1', { x: 70, y: 74, size: 22, fill: COL.purple, weight: 600, o: 0 }), m('still', -.1), .4);
    const t1 = rtText(S.title, 'Random Numbers', { x: 70, y: 190, size: 58, fill: COL.text, weight: 600, o: 0 });
    const t2 = rtText(S.title, 'and Timers, Explained', { x: 70, y: 254, size: 58, fill: COL.text, weight: 600, o: 0 });
    tw(t1, { o: 1, y: 190 }, m('still'), .5, out); put(t1, { y: 202 });
    tw(t2, { o: 1, y: 254 }, m('still', .15), .5, out); put(t2, { y: 266 });
    // the two tools, one card each
    const A = S.cardA = rtCard(p, { x: 240, y: 390, w: 520, h: 220 });
    show(A, m('pick', -.25), .4); put(A, { y: 402 }); tw(A, { y: 390 }, m('pick', -.25), .45, out);
    const B = S.cardB = rtCard(p, { x: 840, y: 390, w: 520, h: 220 });
    show(B, m('clock', -.25), .4); put(B, { y: 402 }); tw(B, { y: 390 }, m('clock', -.25), .45, out);
    // card A: random
    show(rtText(A, 'random(6)', { x: 40, y: 86, size: 36, fill: COL.purple, font: MONO, weight: 500, o: 0 }), m('pick', -.05), .4);
    show(rtText(A, 'a number the computer picks', { x: 40, y: 148, size: 24, fill: COL.muted, o: 0 }), m('pick', .25), .4);
    // card B: frameCount
    show(rtText(B, 'frameCount', { x: 40, y: 86, size: 36, fill: COL.orange, font: MONO, weight: 500, o: 0 }), m('clock', -.05), .4);
    show(rtText(B, 'a clock made of frames', { x: 40, y: 148, size: 24, fill: COL.muted, o: 0 }), m('clock', .25), .4);
    rtHold(D);   // fix round (ears): cold-open hold trimmed by .1 s for the 2:45 bar
  }],

  ['decimal', 'A decimal, not a whole', (m, D) => {
    const p = panel(0), H = D + .1;
    const C = S.code = rtCode(p, [
      [KW('let'), PU(' '), ID('n'), PU(' '), OP('='), PU(' '), FN('random'), PU('('), NU('6', 'six'), PU(');')],
    ], m('still'));
    const line = S.line = G(p);
    // the number line: 0 .. 6 (ticks fade in with the axis)
    const ticks = S.ticks = G(line, { o: 0 });
    show(ticks, m('call', -.1), .5);
    draw(path(line, `M${NL.x0} ${NL.y}H${NL.x1}`, { stroke: COL.muted, 'stroke-width': 3 }, { d: 0 }), m('call', -.1), .6);
    for (let v = 0; v <= 6; v++) {
      path(ticks, `M${nlX(v)} ${NL.y - 10}V${NL.y + 10}`, { stroke: COL.muted, 'stroke-width': 2.5 });
      rtText(ticks, String(v), { x: nlX(v), y: NL.y + 44, size: 24, fill: COL.muted, font: MONO, anchor: 'middle' });
    }
    // the readout under the editor: n = the answer just heard
    const ro = S.ro = G(p, { o: 0 });
    rtText(ro, 'n', { x: CODE.x, y: 400, size: 44, fill: COL.muted, font: MONO, weight: 500 });
    rtText(ro, '=', { x: CODE.x + 44, y: 400, size: 44, fill: COL.muted, font: MONO });
    const rv = S.rv = rtText(ro, '', { x: CODE.x + 96, y: 400, size: 44, fill: COL.purple, font: MONO, weight: 600 });
    show(ro, m('first', -.15), .35);
    const dotAt = (v, key, label) => {
      const d = rtDot(p, nlX(v), NL.y - 80, COL.purple);
      tw(d, { y: NL.y, o: 1 }, m(key, -.05), .55, back);
      rtBump(d, m(key, .5), 1.1);
      const lab = rtText(p, label, { x: nlX(v), y: NL.y - 46, size: 22, fill: COL.purple, font: MONO, anchor: 'middle', o: 0 });
      show(lab, m(key, .35), .35);
      return d;
    };
    S.d1 = dotAt(0.250952, 'first', '0.2509…');
    prog(() => { rv.textContent = '0.2509…'; }, m('first', -.05), 0, lin);
    S.d2 = dotAt(4.339035, 'second', '4.339…');
    prog(() => { rv.textContent = '4.339…'; }, m('second', -.05), 0, lin);
    S.d3 = dotAt(5.675160, 'third', '5.675…');
    prog(() => { rv.textContent = '5.675…'; }, m('third', -.05), 0, lin);
    // "any point on the line is allowed" - a faint band between the ends
    const band = rtDashed(p, `M${nlX(0)} ${NL.y - 26}H${nlX(6)}`, COL.muted, 0);
    show(band, m('tail', -.1), .45);
    // "stops before six": an open ring at 6
    const ring = S.ring = G(p, { o: 0, x: nlX(6), y: NL.y });
    mk('circle', { r: 15, fill: 'none', stroke: COL.orange, 'stroke-width': 3.5 }, ring);
    show(ring, m('reach', -.1), .4); rtBump(ring, m('reach', .25), 1.15);
    show(rtText(p, 'not reached', { x: nlX(6), y: NL.y + 82, size: 22, fill: COL.orange, anchor: 'end', o: 0 }), m('never', -.05), .35);
    hide(S.ro, H - .4, .3); hide(S.line, H - .4, .3); hide(S.ring, H - .4, .3);
    rtHold(H);
  }, { keep: false }],

  ['whole', 'floor makes it whole', (m, D) => {
    const p = panel(0), H = D + .1;
    const C = S.code = rtCode(p, [
      [KW('let'), PU(' '), ID('n'), PU(' '), OP('='), PU(' '), FN('floor'), PU('('), FN('random'), PU('('), NU('6'), PU('));')],
    ], m('still'));
    // six boxes, 0..5
    const boxes = S.boxes = G(p, { o: 0 });
    for (let i = 0; i < 6; i++) {
      const bx = 950 + i * 90;
      mk('rect', { x: bx, y: 220, width: 80, height: 80, rx: 10, fill: COL.panel, stroke: COL.purple, 'stroke-width': 2.5 }, boxes);
      rtText(boxes, String(i), { x: bx + 40, y: 272, size: 32, fill: COL.purple, font: MONO, anchor: 'middle', weight: 500 });
    }
    show(boxes, m('boxes', -.05), .4);
    show(rtText(p, 'six answers', { x: 950, y: 340, size: 22, fill: COL.muted, o: 0 }), m('boxes', .4), .35);
    // floor(4.34) = 4
    const cut = S.cut = G(p, { o: 0 });
    rtText(cut, 'floor(4.34)', { x: CODE.x, y: 400, size: 38, fill: COL.muted, font: MONO });
    rtText(cut, '=', { x: CODE.x + 270, y: 400, size: 38, fill: COL.muted, font: MONO });
    rtText(cut, '4', { x: CODE.x + 310, y: 400, size: 38, fill: COL.purple, font: MONO, weight: 600 });
    show(cut, m('cut', -.1), .4);
    // the table, drawn as the reading draws it
    const T = S.table = G(p);
    show(rtText(T, 'You want', { x: 300, y: 528, size: 22, fill: COL.muted, weight: 600, o: 0 }), m('table', -.05), .35);
    show(rtText(T, 'Write', { x: 820, y: 528, size: 22, fill: COL.muted, weight: 600, o: 0 }), m('table', -.05), .35);
    const row = (i, want, write, key) => {
      const g = G(T, { o: 0 });
      rtText(g, want, { x: 300, y: 578 + i * 48, size: 26, fill: COL.text });
      rtText(g, write, { x: 820, y: 578 + i * 48, size: 26, fill: COL.cyan, font: MONO });
      show(g, m(key, -.05), .35);
      return g;
    };
    S.rows = [row(0, '0 to 5', 'floor(random(6))', 'row1'), row(1, '1 to 6 (a die)', 'floor(random(1, 7))', 'row2'), row(2, '10 to 19', 'floor(random(10, 20))', 'row3')];
    // the rule - fix round (eyes): hold the formula until the voice says "write" (25.65 s; the mark is 2.914 s early)
    const R = S.rule = G(p, { o: 0 });
    mk('rect', { x: 288, y: 700, width: 640, height: 62, rx: 12, fill: COL.panel, stroke: COL.purple, 'stroke-width': 2.5 }, R);
    rtText(R, 'floor(random(low, high + 1))', { x: 320, y: 742, size: 28, fill: COL.text, font: MONO, weight: 500 });
    show(R, m('rule', 2.914) - .1, .4);
    hide(S.cut, H - .4, .3); hide(boxes, H - .4, .3); hide(T, H - .4, .3); hide(R, H - .4, .3);
    rtHold(H);
  }, { keep: false }],

  ['spot', 'A random spot and colour', (m, D) => {
    const p = panel(0), ST = STG(), H = D + .1;
    const C = S.code = rtCode(p, [
      [ID('coin'), OP('.'), ID('x'), PU(' '), OP('='), PU(' '), FN('random'), PU('('), NU('30'), PU(', '), NU('370'), PU(');')],
      [ID('coin'), OP('.'), ID('y'), PU(' '), OP('='), PU(' '), FN('random'), PU('('), NU('30'), PU(', '), NU('270'), PU(');')],
      [KW('let'), PU(' '), ID('pick'), PU(' '), OP('='), PU(' '), FN('floor'), PU('('), FN('random'), PU('('), ID('colors'), OP('.'), ID('length'), PU('));')],
      [ID('coin'), OP('.'), ID('color'), PU(' '), OP('='), PU(' '), ID('colors'), PU('['), ID('pick'), PU('];')],
    ], m('still'));
    // the lit-line bar and the underline follow the voice down the four lines; each underline fades when the next arrives
    rtBarTo(C.bar, 0, 1, m('coinx', -.05));
    const u0 = rtUnder(p, C.rows[0], C.texts[0], 0, 6, COL.purple, m('coinx', -.05));
    rtBarTo(C.bar, 1, 1, m('coiny', -.05));
    const u1 = rtUnder(p, C.rows[1], C.texts[1], 0, 6, COL.purple, m('coiny', -.05)); hide(u0, m('coiny', -.05), .3);
    rtBarTo(C.bar, 2, 1, m('len', -.05));
    const u2 = rtUnder(p, C.rows[2], C.texts[2], 24, 37, COL.purple, m('len', -.05)); hide(u1, m('len', -.05), .3);
    rtBarTo(C.bar, 3, 1, m('read', -.05));
    const u3 = rtUnder(p, C.rows[3], C.texts[3], 13, 25, COL.purple, m('read', -.05)); hide(u2, m('read', -.05), .3);
    // the preview pane and the 400 x 300 canvas
    const pg = S.pg = G(p, { o: 0 });
    mk('rect', { x: PANE.x, y: PANE.y, width: PANE.w, height: PANE.h, rx: 14, fill: ST.pane, stroke: ST.paneEdge, 'stroke-width': 2 }, pg);
    const clip = mk('clipPath', { id: 'rtCanvasClip' }, pg);
    mk('rect', { x: CV.x, y: CV.y, width: CV.n * CV.k, height: 300 * CV.k }, clip);
    const kids = S.kids = G(pg);
    kids.setAttribute('clip-path', 'url(#rtCanvasClip)');
    show(pg, m('x', -.1), .45);
    // helpers: the margins the two random ranges keep the coin inside
    const mx0 = rtDashed(kids, `M${cvX(30)} ${cvY(0)}V${cvY(300)}`, AP().ghost, 0);
    const mx1 = rtDashed(kids, `M${cvX(370)} ${cvY(0)}V${cvY(300)}`, AP().ghost, 0);
    const my0 = rtDashed(kids, `M${cvX(0)} ${cvY(30)}H${cvX(400)}`, AP().ghost, 0);
    const my1 = rtDashed(kids, `M${cvX(0)} ${cvY(270)}H${cvX(400)}`, AP().ghost, 0);
    [mx0, mx1, my0, my1].forEach(e => show(e, m('margin', -.15), .45));
    show(rtText(p, 'dashed: helpers only', { x: PANE.x + 6, y: PANE.y + PANE.h + 34, size: 22, fill: COL.muted, o: 0 }), m('margin', .35), .35);
    // the coin: the sketch's sprite, drawn 28 stage px wide so it clears its own left margin line (centre lands at
    // measured x 44.2206, y 203.5614 - the drawn size is layout only, the measured spot is unchanged)
    const coin = S.coin = G(kids, { x: cvX(COIN0.x), y: cvY(COIN0.y), o: 0, s: .6 });
    mk('rect', { x: -14, y: -14, width: 28, height: 28, fill: ST.sprite }, coin);
    show(coin, m('x', .1), .3); tw(coin, { s: 1 }, m('x', .1), .45, back);
    tw(coin, { x: cvX(COIN.x) }, m('coinx', -.05), .75, io);
    tw(coin, { y: cvY(COIN.y) }, m('coiny', -.05), .75, io);
    rtBump(coin, m('coiny', .65), 1.12);
    // readouts under the pane
    show(rtRuns(p, [['coin.x', COL.muted, 500, MONO, 24], ['  ', COL.muted], ['44.22', COL.text, 600, MONO]], { x: PANE.x + 6, y: PANE.y + PANE.h + 78, size: 26, anchor: 'start', o: 0 }), m('coinx', .7), .35);
    show(rtRuns(p, [['coin.y', COL.muted, 500, MONO, 24], ['  ', COL.muted], ['203.56', COL.text, 600, MONO]], { x: PANE.x + 300, y: PANE.y + PANE.h + 78, size: 26, anchor: 'start', o: 0 }), m('coiny', .7), .35);
    // the colour list: three items in an array, positions 0 1 2
    const sw = [['tomato', mix(COL.red, COL.orange, .25)], ['gold', mix(COL.yellow, COL.orange, .55)], ['deepskyblue', ST.blue]];
    const list = S.list = G(p);
    S.chips = [];
    sw.forEach(([name, hex], i) => {
      const y = 545 + i * 72;
      const g = G(list, { o: 0 });
      mk('rect', { x: 340, y, width: 56, height: 56, rx: 8, fill: hex }, g);
      rtText(g, String(i), { x: 312, y: y + 42, size: 26, fill: COL.muted, font: MONO, anchor: 'end' });
      rtText(g, name, { x: 416, y: y + 38, size: 24, fill: COL.text });
      show(g, m('array', -.05 + i * .22), .3);
      S.chips.push(g);
    });
    show(rtRuns(list, [['colors.length', COL.muted, 500, MONO, 24], [' = ', COL.muted, 500, MONO, 24], ['3', COL.purple, 600, MONO, 24]], { x: 700, y: 560, size: 24, anchor: 'start', o: 0 }), m('len', -.05), .35);
    // fix round (eyes): the range first; "= 2" is revealed only when the voice names two (the picked mark)
    const ex = S.expr = G(list, { o: 0 });
    const exT = rtText(ex, 'floor(random(3))', { x: 700, y: 610, size: 24, fill: COL.muted, font: MONO, weight: 500 });
    show(ex, m('idx', -.05), .35);
    const exW = (exT.getComputedTextLength && exT.getComputedTextLength()) || 16 * 14.4;
    const eq = S.eq = G(list, { o: 0 });
    rtRuns(eq, [[' = ', COL.muted, 500, MONO, 24], ['2', COL.purple, 600, MONO, 24]], { x: 700 + exW, y: 610, size: 24, anchor: 'start' });
    show(eq, m('picked', -.05), .35);
    // the pick: the third chip lights up and the coin changes colour
    const pick = S.pick = G(list, { o: 0, x: 368, y: 717 });
    mk('rect', { x: -36, y: -36, width: 72, height: 72, rx: 12, fill: 'none', stroke: COL.purple, 'stroke-width': 3.5 }, pick);
    show(pick, m('picked', -.05), .35); rtBump(pick, m('picked', 0), 1.1);
    tw(coin.firstChild, { c_fill: ST.blue }, m('picked', -.05), .3);
    rtBump(coin, m('picked', .15), 1.15);
    hide(S.list, H - .4, .3); hide(pg, H - .4, .3);
    rtHold(H);
  }, { keep: false }],

  ['clock', 'A clock made of frames', (m, D) => {
    const p = panel(0), H = D + .1;
    const C = S.code = rtCode(p, [
      [FN('text'), PU('('), ID('frameCount'), PU(', '), NU('20'), PU(', '), NU('20'), PU(');')],
    ], m('still'));
    const cnt = S.cnt = rtCounter(p, 900, 200);
    show(cnt.g, m('fc', -.1), .4);
    prog(() => { cnt.v.textContent = '1'; }, m('fc', -.05), 0, lin);
    prog(() => { cnt.v.textContent = '2'; }, m('one', .55), 0, lin); rtBump(cnt.v, m('one', .55), 1.12);
    prog(() => { cnt.v.textContent = '3'; }, m('one', 1.3), 0, lin); rtBump(cnt.v, m('one', 1.3), 1.12);
    prog(() => { cnt.v.textContent = '60'; }, m('rate', .2), 0, lin); rtBump(cnt.v, m('rate', .2), 1.15);
    // three bars, all on the same scale: 300 frames = 900 stage px
    const K = 2.9, X0 = 500;
    S.bars = [];
    const bar = (i, frames, right, key) => {
      const y = 440 + i * 100, w = frames * K;
      const g = G(p, { o: 0 });
      rtText(g, frames + ' frames', { x: X0 - 24, y: y + 10, size: 26, fill: COL.muted, font: MONO, anchor: 'end' });
      mk('rect', { x: X0, y: y - 14, width: 0, height: 28, rx: 6, fill: COL.orange }, g);
      const r = g.querySelector('rect');
      tw(r, { a_width: w }, m(key, -.05), .55, out);
      rtText(g, right, { x: X0 + w + 22, y: y + 10, size: 26, fill: COL.text, anchor: 'start' });
      show(g, m(key, -.1), .35);
      S.bars.push({ g, r, frames });
      return g;
    };
    bar(0, 30, 'half a second', 'thirty');
    bar(1, 60, 'one second', 'sixty');
    bar(2, 300, 'five seconds', 'five');
    // seconds x 60
    const f = S.formula = G(p, { o: 0 });
    rtRuns(f, [['seconds', COL.orange, 600], ['  ×  ', COL.muted, 500], ['60', COL.orange, 600], ['  =  frames', COL.muted, 500]], { x: 500, y: 730, size: 30, anchor: 'start' });
    show(f, m('rule', -.05), .4);
    hide(cnt.g, H - .4, .3); hide(f, H - .4, .3);
    rtHold(H);
  }, { keep: false }],

  ['beat', 'Every thirtieth frame', (m, D) => {
    const p = panel(0), H = D + .1;
    const C = S.code = rtCode(p, [
      [KW('if'), PU(' ('), ID('frameCount'), PU(' '), OP('%'), PU(' '), NU('30', 'thirty'), PU(' === '), NU('0'), PU(') {')],
      [PU('  '), CM('// every 30 frames')],
      [PU('}')],
    ], m('still'));
    // "this symbol": the bar lights line 1 and the underline lands on %
    rtBarTo(C.bar, 0, 1, m('pct', -.05));
    rtUnder(p, C.rows[0], C.texts[0], 15, 16, COL.purple, m('pct', -.05), 4);
    // fix round (eyes): "Inside an if ..." points at the `if` keyword; it goes when the next sentence starts
    const ifU = rtUnder(p, C.rows[0], C.texts[0], 0, 2, COL.purple, m('if', -.05), 4);
    hide(ifU, m('slower', -.05), .3);
    const tx = i => TICKS.x0 + (i - 1) * (TICKS.x1 - TICKS.x0) / (TICKS.n - 1);
    const rowOf = (y, label, lit, key) => {
      const g = G(p, { o: 0 }), ticks = [], labels = {};
      show(rtText(g, label, { x: TICKS.x0, y: y - 44, size: 24, fill: COL.muted, font: MONO, o: 0 }), m(key, -.15), .35);
      for (let i = 1; i <= TICKS.n; i++) {
        const on = lit.includes(i), h = on ? 20 : 10;
        ticks.push(path(g, `M${tx(i)} ${y - h}V${y + h}`, { stroke: on ? COL.orange : COL.raised, 'stroke-width': on ? 4 : 2.5 }));
      }
      [1, 30, 60].forEach(i => { labels[i] = rtText(g, String(i), { x: tx(i), y: y + 40, size: 22, fill: lit.includes(i) ? COL.orange : COL.muted, font: MONO, anchor: 'middle' }); });
      show(g, m(key, -.1), .4);
      return { g, y, ticks, labels };
    };
    // fix round (eyes): the row now draws the idea the voice says. A cursor sweeps the frame row from frame 1 to 30
    // across the "row" sentence while the readout climbs 1..29 and lands on 0 at frame 30 (the "zero" mark).
    // fix round (picture): the cursor then HOLDS on frame 30 with the readout at 0 and tick 30 lit, through the words
    // "zero on frames" so the picture says zero while the voice says zero; the 30 -> 60 leg only starts when "thirty"
    // is spoken, so the second leg is the faster one and the cursor lands on 60 exactly at the word "sixty".
    // Every value is frame % 30 for that frame, and the 30 / 60 ticks light only when the cursor reaches their zero.
    const r1 = rowOf(500, 'frameCount % 30', [], 'row');
    S.row1 = r1.g; S.row1Ticks = r1.ticks; S.row1Labels = r1.labels;
    const ro = G(p, { o: 0 });
    rtText(ro, 'frameCount % 30 = ', { x: TICKS.x0, y: 404, size: 24, fill: COL.muted, font: MONO });
    const rem = S.rem = rtText(ro, '1', { x: TICKS.x0 + 300, y: 404, size: 28, fill: COL.orange, font: MONO, weight: 600 });
    show(ro, m('row', -.05), .3);
    const cur = S.cur = G(p, { x: tx(1), y: 500, o: 0 });
    mk('circle', { r: 9, fill: COL.purple, stroke: COL.board, 'stroke-width': 2.5 }, cur);
    show(cur, m('row', -.05), .3);
    const paint = f => {
      const n = Math.max(1, Math.min(TICKS.n, Math.floor(f)));
      const on = i => (i === 30 && n >= 30) || (i === 60 && n >= 60);
      r1.ticks.forEach((t, k) => {
        const i = k + 1, lit = on(i), h = lit ? 20 : 10;
        t.setAttribute('d', `M${tx(i)} ${500 - h}V${500 + h}`);
        t.setAttribute('stroke', lit ? COL.orange : COL.raised);
        t.setAttribute('stroke-width', lit ? 4 : 2.5);
      });
      [30, 60].forEach(i => r1.labels[i].setAttribute('fill', on(i) ? COL.orange : COL.muted));
      rem.textContent = String(n % 30);
      put(cur, { x: tx(f) });
    };
    // word clock (content/narration.en.timings.json, beat): "zero" 12.458, "thirty" 13.847, "sixty" 14.653.
    // "sixty" is only 0.13 s after "thirty" ends, so a 29-frame leg from the end of "thirty" would be illegible;
    // the hold therefore runs to the START of "thirty" (zero + 2.319 = 13.847, a 0.806 s second leg to "sixty").
    const rowT = m('row'), zeroT = m('zero'), thirtyT = m('zero', 2.319), sixtyT = m('zero', 3.125);
    prog(q => paint(1 + 29 * q), rowT, zeroT - rowT, lin);
    prog(() => paint(30), zeroT, thirtyT - zeroT, lin);
    prog(q => paint(30 + 30 * q), thirtyT, sixtyT - thirtyT, lin);
    // the pulsing marker on each beat. fix round (picture): it sits just over its own tick (was y 400, ~60 px adrift)
    const pulse = (i, key) => {
      const g = G(p, { x: tx(i), y: 458, o: 0 });
      mk('rect', { x: -15, y: -15, width: 30, height: 30, rx: 6, fill: COL.orange }, g);
      show(g, m(key, -.05), .25); tw(g, { s: 1.35 }, m(key, .05), .18, out); tw(g, { s: 1 }, m(key, .23), .4);
      return g;
    };
    S.p30 = pulse(30, 'zero'); S.p60 = pulse(60, 'tick');
    S.row2 = rowOf(680, 'frameCount % 60', [60], 'slower').g;
    hide(S.p30, H - .4, .3); hide(S.p60, H - .4, .3);
    rtHold(H);
  }, { keep: false }],

  ['close', 'Up next', (m, D) => {
    const p = panel(0), SX = SXT(), ST = STG();
    const row = (runs, y, t0, size = 40, weight = 600) => { const t = rtRuns(p, runs, { x: 800, y, size, weight, o: 0 }); tw(t, { o: 1, y }, t0, .45, out); put(t, { y: y + 10 }); return t; };
    row([['random', COL.purple, 500, MONO], ['  gives a decimal below the top number', COL.text, 500]], 220, m('sum', -.05), 38);
    row([['floor', COL.cyan, 500, MONO], ['  cuts it down to a whole number', COL.text, 500]], 296, m('floor', -.05), 38);
    row([['frameCount', COL.orange, 500, MONO], ['  is a clock: 60 frames = 1 second', COL.text, 500]], 372, m('clock', -.05), 38);
    show(rtText(p, 'UP NEXT', { x: 800, y: 470, size: 22, fill: COL.purple, weight: 600, anchor: 'middle', o: 0 }), m('next', -.05), .35);
    row([['5.2.2 Sparkles on a Beat', COL.text]], 542, m('next', .15), 52);
    row([['make something sparkle on every beat', COL.muted]], 606, m('next', 1.0), 30, 500);
    rtHold(Math.max(D, m('bye', .9)));   // fix round (ears): end-card hold 1.8 -> 0.9 s (narration now sets the beat end)
  }],
].map(([id, title, run, extra]) => ({ id, title, run, ...extra }));

// ---- SH: bottom-left, never the subject. Every expression change lands on a narration mark. ----
const CODEC = [500, 300], PANEC = [1270, 330], ZONEC = [800, 660], LISTC = [460, 640], COUNTC = [1200, 270], TICKC = [800, 500];
bindActs({
  hello: { act: (t, m, D, s, MV) => {
    s.pose = 'down';
    emo(t, s, [[0, { expr: 'delighted', amp: 1.15, look: PANEC }],
      [m('two', -.1), { expr: 'curious', tilt: 5, look: CODEC }],
      [m('pick', -.1), { expr: 'determined', tilt: 0, look: CODEC, pose: 'point' }],
      [m('clock', -.1), { expr: 'delighted', amp: 1.1, look: [1100, 480], pose: 'pointUp' }]]);
    MV.wave(t, s, m('hi', -.15), 1.9);
  } },
  decimal: { act: (t, m, D, s) => {
    s.pose = 'point';
    emo(t, s, [[0, { expr: 'determined', look: CODEC }],
      [m('call', -.1), { expr: 'curious', tilt: 5, look: CODEC }],
      [m('first', -.1), { expr: 'surprise', tilt: 0, amp: 1, look: [nlX(0.250952), NL.y] }],
      [m('second', -.1), { expr: 'curious', tilt: 5, look: [nlX(4.339035), NL.y] }],
      [m('third', -.1), { expr: 'delighted', amp: 1.1, look: [nlX(5.67516), NL.y] }],
      [m('reach', -.1), { expr: 'determined', tilt: 0, look: [NL.x1, NL.y], pose: 'pointUp' }]]);
  } },
  whole: { act: (t, m, D, s) => {
    s.pose = 'pointUp';
    emo(t, s, [[0, { expr: 'determined', look: CODEC }],
      [m('cut', -.1), { expr: 'curious', tilt: 5, look: [CODE.x + 140, 390] }],
      [m('wrap', -.1), { expr: 'surprise', amp: 1, tilt: 0, look: [1250, 260] }],
      [m('table', -.1), { expr: 'determined', look: ZONEC, pose: 'point' }],
      [m('rule', -.1), { expr: 'proud', amp: 1.05, look: [820, 730] }]]);
  } },
  spot: { act: (t, m, D, s) => {
    s.pose = 'point';
    emo(t, s, [[0, { expr: 'determined', look: CODEC }],
      [m('x', -.1), { expr: 'curious', tilt: 5, look: PANEC }],
      [m('margin', -.1), { expr: 'surprise', amp: 1, tilt: 0, look: PANEC, pose: 'down' }],
      [m('coiny', .7), { expr: 'delighted', amp: 1.1, look: PANEC }],
      [m('array', -.1), { expr: 'curious', tilt: -5, look: LISTC, pose: 'point' }],
      [m('picked', -.1), { expr: 'proud', amp: 1.05, look: LISTC, pose: 'pointUp' }]]);
  } },
  clock: { act: (t, m, D, s) => {
    s.pose = 'down';
    emo(t, s, [[0, { expr: 'determined', look: COUNTC }],
      [m('one', -.1), { expr: 'curious', tilt: 5, look: COUNTC }],
      [m('rate', -.1), { expr: 'surprise', amp: 1, tilt: 0, look: COUNTC }],
      [m('thirty', -.1), { expr: 'determined', look: [700, 440], pose: 'point' }],
      [m('five', -.1), { expr: 'proud', amp: 1.05, look: [1150, 640], pose: 'pointUp' }]]);
  } },
  beat: { act: (t, m, D, s) => {
    s.pose = 'pointUp';
    emo(t, s, [[0, { expr: 'determined', look: CODEC }],
      [m('pct', -.1), { expr: 'curious', tilt: 5, look: CODEC }],
      [m('row', -.1), { expr: 'determined', tilt: 0, look: TICKC, pose: 'point' }],
      [m('zero', -.1), { expr: 'surprise', amp: 1, look: [tx30(), 500] }],
      [m('slower', -.1), { expr: 'curious', tilt: -5, look: [800, 680] }],
      [m('sixty', -.1), { expr: 'delighted', amp: 1.1, look: [TICKS.x1, 680] }]]);
    kick.lean(t, s, m('zero', .05), .5, .5);
  } },
  close: { act: (t, m, D, s, MV) => {
    s.pose = 'down';
    emo(t, s, [[0, { expr: 'proud', amp: 1.05, look: [800, 220] }],
      [m('next', -.1), { expr: 'delighted', amp: 1.1, look: [800, 530], pose: 'point' }],
      [m('bye', -.15), { pose: 'down' }],
      [m('bye', -.1), { expr: 'delighted', amp: 1.15, look: [800, 430] }]]);
    MV.wave(t, s, m('bye', -.15), 1.9);
  } },
});
function tx30() { return TICKS.x0 + 29 * (TICKS.x1 - TICKS.x0) / (TICKS.n - 1); }
boot();
