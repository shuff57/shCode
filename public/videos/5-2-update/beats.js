// moshion-5.2-update: the concept explainer for shCode lesson 5.2.21 "Reading: update() runs before physics"
// (the 5.2 family of papermorph explainers; the approved 5.1.2 explainer is the style template and 5.2.6/5.1.12 are the
// layout parents, see ../moshion-5.1.2-style/STYLE.md). Six beats, one play-through, no questions:
//   hello   cold open: SH waves; setup() and draw() are the two functions you know, and moSHion looks for a third, update().
//   three   three boxes side by side (setup runs once, draw every frame, update every frame too) and the reading's real
//           console: frame 1: update, frame 1: draw, ... frame 3: draw, typed in as the voice says each line.
//   order   the four steps of ONE frame as a loop diagram, the reading's own numbers 1-4, a marker travelling the ring twice.
//   early   two squares at the same x: A sets vel.x = 4 in update(), B sets the same line in draw(); stepped one frame at a
//           time with the MEASURED x values (A 204/208/212, B 200/204/208). A moves on frame 1; B waits one frame.
//   halves  the reading's jump scene, code split into two coloured halves: the rules (keys, movement, jump) in update(),
//           the picture (background, words) in draw(). The pane plays the measured scene: d slides right, space jumps and lands.
//   close   end card: rules in update(), picture in draw(), update first; up next 5.2.22; SH waves.
// Not taught here (5.2.22 and later teach them): world.autoStep/physicsUpdate, sprite.update overrides, world.allowSleeping,
// and 5.2.22's own lab task. Frames and draw() were taught in 5.1.12; this video only points at them.
//
// Truth measured on the real runner (scripts in review/measure/, harness /home/shuff57/Documents/GitHub/shCode/scripts/
// moshion-harness.mjs):
//   * the reading's logging sketch prints, frames 1-3: frame 1: update, frame 1: draw, frame 2: update, frame 2: draw,
//     frame 3: update, frame 3: draw (order.mjs);
//   * two squares start at x 200; A (vel.x = 4 in update) reads 204, 208, 212 after frames 1, 2, 3 and B (the same line in
//     draw) reads 200, 204, 208: A moves on frame 1, B one frame later (ab.mjs);
//   * the jump scene rests at y 349.6 (ground top 370, player 40 tall); holding d moves 4 px per frame; space sets vel.y -7,
//     the player rises 290.5 px to y 59.1 at frame 82 and lands again at frame 167 (jump2.mjs).
//   * one frame of the logging sketch comes out as update then draw, and moSHion's real loop calls update() before the
//     physics step and draw() after it (public/moshion/moshion.js loop(), lines 3645-3660).
// Every colour comes from lib/tokens.js. Helper names are up*; no lib global (frame, label, draw, tick, dot, move, rect, X,
// NEG, T, G, path, show, hide, tw, prog, put, panel ...) is shadowed.
'use strict';
const CHAPTER = { number: 2, type: 'explainer', title: 'update() Runs Before Physics', kicker: 'moSHion · 5.2.21',
  meta: 'About 2:30, with sound and captions. One play-through, no questions.', minutes: 3, language: 'en', coverGo: 'Play' };

// Marks (m) exist only per sentence. A cue that belongs INSIDE a sentence is keyed to the word that says it, from the
// word clock in audio/en/words.js (tools/words.py, generated from content/narration.en.timings.json):
// w('halves', 'space') = the first "space" of that beat; the optional `from` skips an earlier one.
const WORDS = window.BF_WORDS || {};
const wkey = s => s.toLowerCase().replace(/[^a-z0-9.-]/g, '');
function w(beat, text, from = 0) {
  const want = wkey(text);
  for (const [t, x] of WORDS[beat] || []) if (t >= from && wkey(x) === want) return t;
  throw new Error(`${beat}: no word '${text}' at/after ${from}s`);
}

// ---- layout (stage px, 1600x900; y >= 780 is the caption bar's, the bottom-left corner (x < 232, y > 522) is the character's) ----
const CODE = { x: 270, y: 136, w: 770, head: 38, size: 22, lh: 25, gut: 318, x0: 332, rows: 23 };
const codeBase = i => CODE.y + CODE.head + 24 + i * CODE.lh;              // baselines 198, 223 ... 748
const CODE_B = codeBase(CODE.rows - 1) + 20;                             // the panel ends at y 768
const PANE = { x: 1060, y: 150, w: 500, h: 520 };                        // the student's preview: runner.html's #111 page
const CV = { x: 1080, y: 180, k: 1.15, n: 400 };                         // the 400 x 400 canvas, drawn 460 px, in the pane
const cvX = u => CV.x + u * CV.k, cvY = v => CV.y + v * CV.k, CV_S = CV.n * CV.k;
const SPR = 40, HALF = SPR / 2 * CV.k;                                   // new Sprite(200, 60, 40, 40): 46 stage px
const GROUND = { x: 200, y: 380, w: 400, h: 20 };
const FLOOR_Y = GROUND.y - GROUND.h / 2, REST_Y = 349.6;                  // measured rest: ground top 370, player 40 tall (349.55 on the runner)
const FPS = 60;
// Beat 4's smaller stage: two code panels on the left, a 400 x 400 pane on the right.
const M2 = { x: 280, y: 160, w: 500, head: 40, size: 22, lh: 30, x0: 300 };
const m2Base = (py, i) => py + M2.head + 30 + i * M2.lh;
const P2 = { x: 860, y: 150, w: 540, h: 520 };
const CV2 = { x: 880, y: 180, k: 1.15, n: 400 };
const cv2X = u => CV2.x + u * CV2.k, cv2Y = v => CV2.y + v * CV2.k, CV2_S = CV2.n * CV2.k;
const HALF2 = SPR / 2 * CV2.k;
const SQ_A = { x: 200, y: 120 }, SQ_B = { x: 200, y: 300 };
const TOP_Y = 124;                                                       // over the pane: the two readouts
// The loop diagram (beat 3): four boxes on a ring, the ring track the marker travels.
const RING = { x0: 345, y0: 205, x1: 1305, y1: 615 };
const RINGW = RING.x1 - RING.x0, RINGH = RING.y1 - RING.y0, RINGP = 2 * (RINGW + RINGH);
const BOXES = [
  { x: 380, y: 235, w: 320, h: 110, name: 'update()', sub: 'your code' },
  { x: 900, y: 235, w: 320, h: 110, name: 'physics', sub: 'gravity · velocity · collisions' },
  { x: 900, y: 475, w: 320, h: 110, name: 'draw()', sub: 'your code' },
  { x: 380, y: 475, w: 320, h: 110, name: 'paint', sub: 'the sprites, on top' },
];
const MARK_S = [195, 715, 1615, 2135];                                   // ring distance above update, physics, below draw, below paint
// What the sketch's own lines say, tagged as shCode's editor (lezer javascript + draculaHighlight) tags them.
const tk = kind => (s, id) => [s, kind, id];
const KW = tk('keyword'), PU = tk('punct'), NU = tk('num'), FN = tk('fn'), CL = tk('cls'), SR = tk('str'), OP = tk('op'), ID = tk('ident');
// The reading's jump scene, 23 lines (blank lines and comments dropped so it fits the panel at 22 px).
const MAIN = [
  [KW('let'), PU(' '), ID('player'), PU(', '), ID('ground'), PU(';')],
  [KW('function'), PU(' '), FN('setup'), PU('() {')],
  [PU('  '), KW('new'), PU(' '), CL('Canvas'), PU('('), NU('400'), PU(', '), NU('400'), PU(');')],
  [PU('  '), ID('world'), OP('.'), ID('gravity'), OP('.'), ID('y'), PU(' '), OP('='), PU(' '), NU('10'), PU(';')],
  [PU('  '), ID('player'), PU(' '), OP('='), PU(' '), KW('new'), PU(' '), CL('Sprite'), PU('('), NU('200'), PU(', '), NU('60'), PU(', '), NU('40'), PU(', '), NU('40'), PU(');')],
  [PU('  '), ID('player'), OP('.'), ID('color'), PU(' '), OP('='), PU(' '), SR("'deepskyblue'"), PU(';')],
  [PU('  '), ID('ground'), PU(' '), OP('='), PU(' '), KW('new'), PU(' '), CL('Sprite'), PU('('), NU('200'), PU(', '), NU('380'), PU(', '), NU('400'), PU(', '), NU('20'), PU(', '), SR("'static'"), PU(');')],
  [PU('  '), ID('ground'), OP('.'), ID('color'), PU(' '), OP('='), PU(' '), SR("'gray'"), PU(';')],
  [PU('}')],
  [KW('function'), PU(' '), FN('update'), PU('() {')],
  [PU('  '), KW('if'), PU(' ('), ID('kb'), OP('.'), ID('pressing'), PU("('"), ID('a'), PU("'))       "), ID('player'), OP('.'), ID('vel'), OP('.'), ID('x'), PU(' '), OP('='), PU(' '), NU('-4'), PU(';')],
  [PU('  '), KW('else'), PU(' '), KW('if'), PU(' ('), ID('kb'), OP('.'), ID('pressing'), PU("('"), ID('d'), PU("'))  "), ID('player'), OP('.'), ID('vel'), OP('.'), ID('x'), PU(' '), OP('='), PU(' '), NU('4'), PU(';')],
  [PU('  '), KW('else'), PU('                        '), ID('player'), OP('.'), ID('vel'), OP('.'), ID('x'), PU(' '), OP('='), PU(' '), NU('0'), PU(';')],
  [PU('  '), KW('if'), PU(' ('), ID('kb'), OP('.'), ID('presses'), PU("(' ') && "), ID('player'), OP('.'), ID('colliding'), PU('('), ID('ground'), PU(')) {')],
  [PU('    '), ID('player'), OP('.'), ID('vel'), OP('.'), ID('y'), PU(' '), OP('='), PU(' '), NU('-7'), PU(';')],
  [PU('  '), PU('}')],
  [PU('}')],
  [KW('function'), PU(' '), FN('draw'), PU('() {')],
  [PU('  '), ID('background'), PU("('#222');")],
  [PU('  '), ID('fill'), PU("('white');")],
  [PU('  '), ID('textSize'), PU('('), NU('14'), PU(');')],
  [PU('  '), ID('text'), PU("('a and d move, space jumps', "), NU('20'), PU(', '), NU('26'), PU(');')],
  [PU('}')],
];

// ---- drawing helpers (up*: copied from the 5.2.6 / 5.1.12 explainers) ----
const AP = () => TOKS().app, STG = () => TOKS().stage, SXT = () => TOKS().syntax;
function upText(p, str, { x, y, size = 26, fill = COL.text, weight = 500, anchor = 'start', font = UI, o = 1 }) {
  return T(p, str, { x, y, size, fill, weight, anchor, font, o });
}
function upRuns(p, runs, { x, y, size = 34, anchor = 'middle', font = UI, o = 1, weight = 500 }) {
  const t = upText(p, '', { x, y, size, anchor, font, o, weight });
  t.runs = runs.map(([s, f, w, fnt, sz]) => {
    const e = mk('tspan', { fill: f }, t);
    if (w) e.setAttribute('font-weight', w); if (fnt) e.setAttribute('font-family', fnt); if (sz) e.setAttribute('font-size', sz);
    e.textContent = s; return e;
  });
  return t;
}
function upArrow(p, x1, y1, x2, y2, color, t0, dur = .6, w = 3.5) {
  const g = G(p), a = Math.atan2(y2 - y1, x2 - x1), L = 15;
  draw(path(g, `M${x1} ${y1}L${x2} ${y2}`, { stroke: color, 'stroke-width': w }, { d: 0 }), t0, dur);
  const hd = path(g, `M${x2 - L * Math.cos(a - .5)} ${y2 - L * Math.sin(a - .5)}L${x2} ${y2}L${x2 - L * Math.cos(a + .5)} ${y2 - L * Math.sin(a + .5)}`,
    { stroke: color, 'stroke-width': w }, { o: 0 });
  show(hd, t0 + dur * .8, .15);
  return g;
}
function upHold(t) { prog(() => {}, t, 0, lin); }
function upBump(e, t0, k = 1.12) { tw(e, { s: k }, t0, .2, out); tw(e, { s: 1 }, t0 + .2, .35); }
// A keycap: a small raised key with its label (5.2-delete's dlKeycap idiom). upKey lights it on t0 and puts it back on t1,
// so a held key stays lit for the whole press and a tap lights for its tap. 22 px label = the smallest teaching text.
const KEYCAP = { x: 1084, y: 562, h: 32, gap: 10 };   // the row: inside the pane's canvas, bottom-left, over the black above the ground
function upKeycap(p, x, wCap, label, o = 0) {
  const g = G(p, { x, y: KEYCAP.y, o });
  const cap = mk('rect', { x: 0, y: 0, width: wCap, height: KEYCAP.h, rx: 7, fill: COL.raised, stroke: COL.border, 'stroke-width': 2 }, g);
  const t = upText(g, label, { x: wCap / 2, y: KEYCAP.h - 10, size: 22, fill: COL.text, font: MONO, weight: 600, anchor: 'middle' });
  return { g, cap, t, base: KEYCAP.y };
}
function upKey(kc, t0, t1) {
  tw(kc.cap, { c_fill: COL.purple }, t0, .08);
  tw(kc.t, { c_fill: COL.board }, t0, .08);
  tw(kc.g, { y: kc.base + 2 }, t0, .08);
  tw(kc.cap, { c_fill: COL.raised }, t1, .18);
  tw(kc.t, { c_fill: COL.text }, t1, .18);
  tw(kc.g, { y: kc.base }, t1, .18, out);
}

// ---- the editor (adapted from 5.2.6's gr*) ----
const upColL = (t, c) => CODE.x0 + t.getStartPositionOfChar(c).x;
const upColR = (t, c) => CODE.x0 + t.getEndPositionOfChar(c).x;
function upRow(p, toks, i, spans, o = 1, x = CODE.x0, size = CODE.size, base = codeBase(i)) {
  const SX = SXT(), row = G(p, { y: base, o });
  const t = upText(row, '', { x, y: 0, size, font: MONO, weight: 400 });
  t.setAttribute('text-rendering', 'geometricPrecision');   // hinting made the code wider at 1700/900 than at 1280 (EYES M1)
  for (const [s, kind, id] of toks) {
    const sp = mk('tspan', { fill: SX[kind] }, t);
    if (kind === 'cls') sp.setAttribute('font-style', 'italic');
    sp.textContent = s;
    if (id) spans[id] = sp;
  }
  return { row, t };
}
function upDoc(p, lines, o = 1) {
  const g = G(p, { o }), rows = [], texts = [], spans = {};
  lines.forEach((toks, i) => { const r = upRow(g, toks, i, spans); rows.push(r.row); texts.push(r.t); });
  return { g, rows, texts, spans };
}
function upBar(p, i, n, o = 0, mark) {
  const SX = SXT(), b = G(p, { o, y: codeBase(i) - 20 });
  b.bg = mk('rect', { x: CODE.x + 2, y: 0, width: CODE.w - 4, height: CODE.lh * n, fill: SX.lineBg }, b);
  b.sp = mk('rect', { x: CODE.x + 2, y: 0, width: 5, height: CODE.lh * n, fill: mark || SX.lineMark }, b);
  return b;
}
function upBarTo(b, i, n, t0, dur = .4) {
  tw(b, { y: codeBase(i) - 20 }, t0, dur);
  tw(b.bg, { a_height: CODE.lh * n }, t0, dur); tw(b.sp, { a_height: CODE.lh * n }, t0, dur);
}
function upUnder(p, row, t, c0, c1, color, t0, w = 3.5) {
  const y = st(row).y + 7, e = path(p, `M${upColL(t, c0) + 1} ${y}H${upColR(t, c1 - 1) - 1}`, { stroke: color, 'stroke-width': w }, { d: 0 });
  draw(e, t0, .4);
  return e;
}
function upType(row, t, t0, dur) {
  let sp = [...t.querySelectorAll('tspan')];
  if (!sp.length) sp = [t];                                  // a plain text node types as one run
  const full = sp.map(s => s.textContent), total = full.join('').length;
  show(row, t0, .05);
  prog(q => {
    let left = Math.round(q * total);
    sp.forEach((s, k) => { const n = Math.min(full[k].length, Math.max(0, left)); s.textContent = full[k].slice(0, n); left -= full[k].length; });
  }, t0, dur, lin);
}
function upCode(p, t0) {
  const SX = SXT(), A = AP(), g = G(p, { o: 0 });
  mk('rect', { x: CODE.x, y: CODE.y, width: CODE.w, height: CODE_B - CODE.y, rx: 14, fill: SX.bg, stroke: SX.edge, 'stroke-width': 2 }, g);
  path(g, `M${CODE.x} ${CODE.y + CODE.head}H${CODE.x + CODE.w}`, { stroke: SX.edge, 'stroke-width': 2 });
  upText(g, 'script.js', { x: CODE.x + 24, y: CODE.y + 26, size: 20, fill: COL.muted, weight: 500 });
  path(g, `M${CODE.x + 14} ${CODE.y + CODE.head - 1}H${CODE.x + 132}`, { stroke: COL.purple, 'stroke-width': 3 });
  // the two halves: the rules (update) and the picture (draw), washed behind the code
  const hal = G(g);
  const rules = mk('rect', { x: CODE.x + 2, y: codeBase(9) - 19, width: CODE.w - 4, height: CODE.lh * 8, fill: COL.green, opacity: 0 }, hal);
  const pic = mk('rect', { x: CODE.x + 2, y: codeBase(17) - 19, width: CODE.w - 4, height: CODE.lh * 6, fill: COL.cyan, opacity: 0 }, hal);
  put(rules, { o: 0 }); put(pic, { o: 0 });   // state starts at 0, or the tween fades DOWN from full opacity (green flash on [[rules]])
  const lblR = upText(g, 'the rules', { x: CODE.x + CODE.w - 20, y: codeBase(9) - 8, size: 22, fill: COL.green, weight: 600, anchor: 'end', o: 0 });
  const lblP = upText(g, 'the picture', { x: CODE.x + CODE.w - 20, y: codeBase(17) - 8, size: 22, fill: COL.cyan, weight: 600, anchor: 'end', o: 0 });
  const gut = G(g), nums = [];
  for (let i = 0; i < CODE.rows; i++)
    nums.push(upText(gut, String(i + 1), { x: CODE.gut, y: codeBase(i), size: 19, fill: SX.gutter, font: MONO, anchor: 'end', weight: 400, o: 1 }));
  const main = upDoc(g, MAIN);
  const cm = G(g);
  show(g, t0, .5);
  return { g, hal, rules, pic, lblR, lblP, nums, main, cm, texts: main.texts };
}
// A small two/three-line editor for beat 4.
function upMini(p, py, label, lines, t0) {
  const SX = SXT(), g = G(p, { o: 0 });
  mk('rect', { x: M2.x, y: py, width: M2.w, height: 200, rx: 12, fill: SX.bg, stroke: SX.edge, 'stroke-width': 2 }, g);
  path(g, `M${M2.x} ${py + M2.head}H${M2.x + M2.w}`, { stroke: SX.edge, 'stroke-width': 2 });
  upText(g, label, { x: M2.x + 22, y: py + 27, size: 22, fill: COL.muted, weight: 600 });
  const rows = [], texts = [], spans = {};
  lines.forEach((toks, i) => {
    const r = upRow(g, toks, i, spans, 1, M2.x0, M2.size, m2Base(py, i));
    rows.push(r.row); texts.push(r.t);
  });
  show(g, t0, .45);
  return { g, rows, texts, spans };
}

// ---- the preview pane and what runs in it ----
function upPane(p, t0) {
  const ST = STG(), g = G(p, { o: 0 });
  mk('rect', { x: PANE.x, y: PANE.y, width: PANE.w, height: PANE.h, rx: 14, fill: ST.pane, stroke: ST.paneEdge, 'stroke-width': 2 }, g);
  const clip = mk('clipPath', { id: 'upCanvasClip' }, g);
  mk('rect', { x: CV.x, y: CV.y, width: CV_S, height: CV_S }, clip);
  const kids = G(g);
  kids.setAttribute('clip-path', 'url(#upCanvasClip)');
  show(g, t0, .5);
  return { g, kids };
}
function upPane2(p, t0) {
  const ST = STG(), g = G(p, { o: 0 });
  mk('rect', { x: P2.x, y: P2.y, width: P2.w, height: P2.h, rx: 14, fill: ST.pane, stroke: ST.paneEdge, 'stroke-width': 2 }, g);
  const clip = mk('clipPath', { id: 'upCanvasClip2' }, g);
  mk('rect', { x: CV2.x, y: CV2.y, width: CV2_S, height: CV2_S }, clip);
  const kids = G(g);
  kids.setAttribute('clip-path', 'url(#upCanvasClip2)');
  show(g, t0, .5);
  return { g, kids };
}
// The ground: moSHion draws a 400 x 20 'gray' sprite as a plain bar.
function upGround(pv, o = 1) {
  const g = G(pv.kids, { x: cvX(GROUND.x), y: cvY(GROUND.y), o });
  mk('rect', { x: -GROUND.w * CV.k / 2, y: -GROUND.h * CV.k / 2, width: GROUND.w * CV.k, height: GROUND.h * CV.k, fill: mix(COL.text, COL.board, .5) }, g);
  return g;
}
function upGround2(pv, o = 1) {
  const g = G(pv.kids, { x: cv2X(GROUND.x), y: cv2Y(GROUND.y), o });
  mk('rect', { x: -GROUND.w * CV2.k / 2, y: -GROUND.h * CV2.k / 2, width: GROUND.w * CV2.k, height: GROUND.h * CV2.k, fill: mix(COL.text, COL.board, .5) }, g);
  return g;
}
// A 40 x 40 sprite at (x, y) in the big pane.
function upPlayer(pv, x, y, color, o = 1) {
  const e = G(pv.kids, { x: cvX(x), y: cvY(y), o });
  mk('rect', { x: -HALF, y: -HALF, width: 2 * HALF, height: 2 * HALF, fill: color }, e);
  return e;
}
// The words draw() paints: 14-unit text at 20, 26 (1.15x = 16 stage px, exactly what the runner draws).
function upWords(pv, o = 1) {
  const g = G(pv.kids, { x: cvX(20), y: cvY(26), o });
  T(g, 'a and d move, space jumps', { x: 0, y: 0, size: 14 * CV.k, fill: COL.text, weight: 400 });
  return g;
}
// A square in beat 4's pane.
function upSq2(pv, x, y, color, o = 1) {
  const e = G(pv.kids, { x: cv2X(x), y: cv2Y(y), o });
  mk('rect', { x: -HALF2, y: -HALF2, width: 2 * HALF2, height: 2 * HALF2, fill: color }, e);
  return e;
}
// The reading's measured jump, one sample every 5 frames (jump3.mjs): apex y 59.3 at frames 80-85, back at 349.6 at frame 170.
const JUMP_Y = [349.6, 309.3, 278.1, 248.9, 221.8, 196.8, 173.9, 153.1, 134.3, 117.6, 103.1, 90.6, 80.1, 71.8, 65.6, 61.4, 59.3, 59.3, 61.4, 65.6, 71.8, 80.1, 90.6, 103.1, 117.6, 134.3, 153.1, 173.9, 196.8, 221.8, 248.9, 278.1, 309.3, 342.6, 349.6, 349.6, 349.6];
const JUMP_FRAMES = 170;
function upJumpY(n) {
  const k = Math.max(0, Math.min(JUMP_Y.length - 1, n / 5)), i = Math.floor(k), u = k - i;
  return i >= JUMP_Y.length - 1 ? JUMP_Y[JUMP_Y.length - 1] : JUMP_Y[i] + (JUMP_Y[i + 1] - JUMP_Y[i]) * u;
}
// The loop ring: distance -> point on the rounded track.
function upRingAt(s) {
  const P = RINGP, d = ((s % P) + P) % P;
  if (d < RINGW) return [RING.x0 + d, RING.y0];
  if (d < RINGW + RINGH) return [RING.x1, RING.y0 + (d - RINGW)];
  if (d < 2 * RINGW + RINGH) return [RING.x1 - (d - RINGW - RINGH), RING.y1];
  return [RING.x0, RING.y1 - (d - 2 * RINGW - RINGH)];
}

const BEATS = [
  ['hello', 'A third function', (m, D) => {
    const p = panel(0), ST = STG(), SX = SXT();
    S.title = G(p);
    S.kick = upText(S.title, 'moSHion · 5.2.21', { x: 70, y: 74, size: 22, fill: COL.purple, weight: 600, o: 0 });
    show(S.kick, m('hi', -.1), .4);
    const tt = S.titleT = upText(S.title, 'update() Runs Before Physics', { x: 70, y: 124, size: 46, fill: COL.text, weight: 600, o: 0 });
    tw(tt, { o: 1, y: 124 }, m('hi'), .5, out); put(tt, { y: 136 });
    // two functions you know, then the third name moSHion looks for
    S.rows = G(p);
    const line = (y, fn, tail, t0, tTag) => {
      const g = G(S.rows, { o: 0 });
      upRuns(g, [['function ', SX.keyword, 400, MONO], [fn, SX.fn, 400, MONO], ['() {  …  }', SX.punct, 400, MONO]],
        { x: 380, y, size: 27, anchor: 'start' });
      const tag = upText(g, tail, { x: 940, y, size: 24, fill: COL.muted, weight: 500, o: 0 });
      show(g, t0, .4); show(tag, tTag, .35);
      return g;
    };
    // both lines are on screen while "Every sketch so far has had two functions" is said;
    // the descriptions land on "setup()" and "draw()"
    S.l1 = line(320, 'setup', 'runs once', m('two', -.1), m('setup', .05));
    S.l2 = line(400, 'draw', 'runs on every frame', m('two', .15), m('draw', .05));
    show(upRuns(S.rows, [['two functions so far', COL.muted]], { x: 380, y: 240, size: 24, anchor: 'start', o: 0 }), m('two', -.2), .35);
    // "update()" lands on its word
    const g3 = S.upLine = G(S.rows, { o: 0 });
    upRuns(g3, [['function ', SX.keyword, 400, MONO], ['update', SX.fn, 400, MONO], ['() {  …  }', SX.punct, 400, MONO]],
      { x: 380, y: 480, size: 27, anchor: 'start' });
    show(g3, m('update', -.1), .4);
    show(upText(g3, 'runs on every frame too', { x: 940, y: 480, size: 24, fill: COL.muted, weight: 500, o: 0 }), m('update', .1), .35);
    const ring = mk('rect', { x: 360, y: 440, width: 560, height: 62, rx: 12, fill: 'none', stroke: COL.purple, 'stroke-width': 3, opacity: 0 }, g3);
    tw(ring, { o: 1 }, m('update', .2), .35); upBump(ring, m('same', .4), 1.02);
    // "You write it the same way"
    show(upText(S.rows, 'written like the other two', { x: 380, y: 560, size: 24, fill: COL.purple, weight: 600, o: 0 }), m('same', .1), .35);
    upHold(D + .1);
  }],

  ['three', 'Three boxes, one console', (m, D) => {
    const p = panel(0), SX = SXT(), ST = STG(), H = D + .1;
    const X0 = 280, BW = 320, GAP = 30;
    const box = (i, name, sub, t0) => {
      const x = X0 + i * (BW + GAP), g = G(p, { o: 0 });
      mk('rect', { x, y: 170, width: BW, height: 150, rx: 12, fill: COL.panel, stroke: COL.raised, 'stroke-width': 2.5 }, g);
      upRuns(g, [[name, SX.fn, 400, MONO], ['()', SX.punct, 400, MONO]], { x: x + BW / 2, y: 226, size: 32 });
      upText(g, sub, { x: x + BW / 2, y: 268, size: 23, fill: COL.muted, weight: 500, anchor: 'middle' });
      const hi = mk('rect', { x, y: 170, width: BW, height: 150, rx: 12, fill: 'none', stroke: COL.purple, 'stroke-width': 3, opacity: 0 }, g);
      show(g, t0, .4);
      return { g, hi };
    };
    S.bSetup = box(0, 'setup', 'runs once, at the start', m('once', -.1));
    S.bDraw = box(1, 'draw', 'runs on every frame', m('every', -.1));
    S.bUpd = box(2, 'update', 'runs on every frame too', m('too', -.1));
    tw(S.bUpd.hi, { o: 1 }, m('too', .1), .3);
    // "You never call it yourself." / "It is optional.": one note line at a time, under the boxes
    const n1 = upText(p, 'you never call it yourself', { x: 800, y: 352, size: 23, fill: COL.muted, weight: 500, anchor: 'middle', o: 0 });
    const n2 = upRuns(p, [['optional: ', COL.muted], ['a sketch without update() still runs', COL.text]], { x: 800, y: 352, size: 23, anchor: 'middle', o: 0 });
    show(n1, m('never', -.05), .3); hide(n1, m('optional', -.1), .25);
    show(n2, m('optional', -.05), .3); hide(n2, m('log', -.15), .35);   // dim when the console's sentence starts, not at the beat's end
    // the console panel: the reading's own six lines
    const cg = S.console = G(p, { o: 0 });
    mk('rect', { x: X0, y: 380, width: BW * 3 + GAP * 2, height: 300, rx: 12, fill: COL.panel, stroke: COL.raised, 'stroke-width': 2 }, cg);
    path(cg, `M${X0} ${380 + 38}H${X0 + BW * 3 + GAP * 2}`, { stroke: COL.raised, 'stroke-width': 2 });
    upText(cg, 'console', { x: X0 + 22, y: 380 + 27, size: 22, fill: COL.muted, weight: 600 });
    show(cg, m('log', -.1), .4);
    const LINES = [
      ['frame 1:', ' update', 'f1', 'u1'],
      ['frame 1:', ' draw', 'd1', 'd1'],
      ['frame 2:', ' update', 'f2', 'u2'],
      ['frame 2:', ' draw', 'd2', 'd2'],
      ['frame 3:', ' update', 'f3', 'u3'],
      ['frame 3:', ' draw', 'd3', 'd3'],
    ];
    S.clines = LINES.map(([pre, val, kpre, kval], i) => {
      const y = 452 + i * 34, g = G(cg, { o: 0 });
      const a = upText(g, pre, { x: X0 + 30, y, size: 26, fill: COL.muted, weight: 400, font: MONO, o: 0 });
      const b = upText(g, val.trim(), { x: X0 + 30 + 140, y, size: 26, fill: SX.fn, weight: 500, font: MONO, o: 0 });
      show(g, 0, .01);
      upType(a, a, m(kpre), .25); upType(b, b, m(kval), .25);
      return { g, a, b };
    });
    // "update always comes first."
    show(upRuns(p, [['update', SX.fn, 400, MONO], [' always comes first', COL.text]], { x: 800, y: 726, size: 27, anchor: 'middle', o: 0 }), m('always', -.05), .35);
    upHold(H);
  }],

  ['order', 'One frame, in order', (m, D) => {
    const p = panel(0), SX = SXT(), H = D + .1;
    // the ring track and its four boxes (the reading's own steps 1-4)
    const track = G(p, { o: 0 });
    mk('rect', { x: RING.x0, y: RING.y0, width: RINGW, height: RINGH, rx: 34, fill: 'none', stroke: COL.raised, 'stroke-width': 3, 'stroke-dasharray': '2 9' }, track);
    show(track, m('frame', -.1), .5);
    S.boxes = BOXES.map((b, i) => {
      const g = G(p, { o: 0 });
      mk('rect', { x: b.x, y: b.y, width: b.w, height: b.h, rx: 12, fill: COL.panel, stroke: COL.raised, 'stroke-width': 2.5 }, g);
      const badge = G(g, { x: b.x + 30, y: b.y + 28 });
      mk('circle', { r: 17, fill: COL.purple }, badge);
      upText(badge, String(i + 1), { x: 0, y: 8, size: 23, fill: COL.board, weight: 600, anchor: 'middle' });
      upRuns(g, [[b.name, i === 0 || i === 2 ? SX.fn : COL.text, 400, i === 0 || i === 2 ? MONO : UI]], { x: b.x + b.w / 2, y: b.y + 56, size: 30 });
      upText(g, b.sub, { x: b.x + b.w / 2, y: b.y + 88, size: 22, fill: COL.muted, weight: 500, anchor: 'middle' });
      const hi = mk('rect', { x: b.x, y: b.y, width: b.w, height: b.h, rx: 12, fill: 'none', stroke: COL.purple, 'stroke-width': 3.5, opacity: 0 }, g);
      show(g, m(['frame', 'two', 'three', 'four'][i], -.05), .4);
      return { g, hi };
    });
    // the arrows between the boxes
    const ar = G(p);
    upArrow(ar, 706, 290, 894, 290, COL.raised, m('two', -.35), .45);
    upArrow(ar, 1060, 397, 1060, 469, COL.raised, m('three', -.35), .45);
    upArrow(ar, 894, 530, 706, 530, COL.raised, m('four', -.35), .45);
    upArrow(ar, 540, 469, 540, 351, COL.raised, m('loop', -.35), .45);
    // each box lights on its own word
    const light = (i, t0) => { tw(S.boxes[i].hi, { o: 1 }, t0, .2); tw(S.boxes[i].hi, { o: .35 }, t0 + .5, .5); };
    light(0, m('one', -.05)); light(1, m('two', -.05)); light(2, m('three', -.05)); light(3, m('four', -.05));
    tw(S.boxes[1].hi, { o: 1 }, m('physics', -.05), .2); tw(S.boxes[1].hi, { o: .35 }, m('three', -.2), .5);   // keep physics lit on its own sentence
    // the physics note: directly under the physics box (not 315 px below it, under draw(): EYES M2)
    const note = upText(p, 'this is the physics step', { x: 1060, y: 382, size: 22, fill: COL.muted, weight: 500, anchor: 'middle', o: 0 });
    show(note, m('physics', -.05), .35); hide(note, m('three', -.2), .3);
    // the marker on the ring: lap one on the words, lap two by "loop"
    const mark = S.marker = G(p, { x: upRingAt(MARK_S[0])[0], y: upRingAt(MARK_S[0])[1], o: 0 });
    mk('circle', { r: 12, fill: COL.purple, stroke: COL.board, 'stroke-width': 3 }, mark);
    show(mark, m('one', -.5), .3);
    const K = [['one', 0], ['two', 1], ['three', 2], ['four', 3]];
    K.forEach(([k, i]) => {
      if (i === 0) return;
      // each leg starts where the previous one ended (MARK_S[i-1]), not back at update: EYES H1
      prog(q => { const [x, y] = upRingAt(MARK_S[i - 1] + (MARK_S[i] - MARK_S[i - 1]) * q); put(mark, { x, y }); }, m(K[i - 1][0], .1), m(k) - m(K[i - 1][0]) - .1, lin);
    });
    // lap two: one full ring from paint back to update (MARK_S[0] + RINGP), so "the loop again, with update()" lands on update
    prog(q => { const [x, y] = upRingAt(MARK_S[3] + (MARK_S[0] + RINGP - MARK_S[3]) * q); put(mark, { x, y }); }, m('four', .3), Math.max(.6, m('loop') - m('four') - .3), lin);
    // "then the next frame starts the loop again"
    upBump(mark, m('loop', .1), 1.25);
    upHold(H);
  }],

  ['early', 'Why update is first', (m, D) => {
    const p = panel(0), SX = SXT(), ST = STG(), H = D + .1;
    // two little editors: the same line, one in update(), one in draw()
    S.A = upMini(p, 160, 'A · in update()', [
      [KW('function'), PU(' '), FN('update'), PU('() {')],
      [PU('  '), ID('a'), OP('.'), ID('vel'), OP('.'), ID('x'), PU(' '), OP('='), PU(' '), NU('4'), PU(';')],
      [PU('}')],
    ], m('why', .0));
    S.B = upMini(p, 400, 'B · in draw()', [
      [KW('function'), PU(' '), FN('draw'), PU('() {')],
      [PU('  '), ID('b'), OP('.'), ID('vel'), OP('.'), ID('x'), PU(' '), OP('='), PU(' '), NU('4'), PU(';')],
      [PU('}')],
    ], m('same', .1));
    // the two squares, same x, and their readouts
    S.pv = upPane2(p, m('same', -.1));
    S.sqA = upSq2(S.pv, SQ_A.x, SQ_A.y, ST.blue, 0); show(S.sqA, m('same', .1), .35);
    S.sqB = upSq2(S.pv, SQ_B.x, SQ_B.y, ST.sprite, 0); show(S.sqB, m('same', .2), .35);
    S.top = G(p);
    const ro = (px, anchor, col, name) => {
      // the group carries the position, so a pulse (scale) grows from the readout's own anchor instead of the stage origin
      const g = G(S.top, { x: px, y: TOP_Y, o: 0 });
      const t = upRuns(g, [[name, col, 600, MONO], ['  x', ST.x, 600, MONO], [' = ', COL.muted, 400, MONO], ['200', COL.text, 500, MONO]],
        { x: 0, y: 0, size: 30, anchor });
      return { g, t, v: v => { t.runs[3].textContent = String(v); } };
    };
    S.roA = ro(880, 'start', ST.blue, 'A');
    S.roB = ro(1380, 'end', ST.sprite, 'B');
    show(S.roA.g, m('same', .2), .35); show(S.roB.g, m('same', .3), .35);
    // "A sets vel.x to 4 in update()" / "B sets the same line in draw()"
    S.cmA = G(p);
    upUnder(S.cmA, S.A.rows[1], S.A.texts[1], 2, 12, ST.x, m('a', .1));
    S.cmB = G(p);
    upUnder(S.cmB, S.B.rows[1], S.B.texts[1], 2, 12, ST.x, m('b', .1));
    upBump(S.roA.g, m('a', .3), 1.08); upBump(S.roB.g, m('b', .3), 1.08);
    // the frame counter under the pane: it says "start" until the first step has run (EYES L3)
    S.chip = G(p, { o: 0 });
    mk('rect', { x: 1050, y: 700, width: 160, height: 48, rx: 10, fill: COL.panel, stroke: COL.raised, 'stroke-width': 2 }, S.chip);
    const chipT = upRuns(S.chip, [['start', COL.muted, 500], ['', COL.text, 500, MONO]], { x: 1130, y: 733, size: 26, anchor: 'middle' });
    show(S.chip, m('step', -.1), .35);
    S.frameN = n => { chipT.runs[0].textContent = 'frame '; chipT.runs[1].textContent = String(n); }; S.chipT = chipT;
    // "B's line ran after the physics step, so it waits." — the note goes when B starts moving on frame two (EYES M4)
    S.note = upText(p, "B's line ran after physics, so it waits", { x: 280, y: 662, size: 24, fill: COL.muted, weight: 500, o: 0 });
    show(S.note, m('wait', -.05), .35); hide(S.note, m('next', -.15), .3);
    // a dashed guide (the template's helper style) at B's left edge, from above A down past B: the one-frame lead is the
    // gap between A's left edge and this line, the same 4 canvas units the readouts report (EYES M3)
    S.guide = G(S.pv.kids, { x: cv2X(SQ_B.x) - HALF2, y: cv2Y(70), o: 0 });
    path(S.guide, `M0 0L0 ${(355 - 70) * CV2.k}`, { stroke: AP().ghost, 'stroke-width': 2.5, 'stroke-dasharray': '8 7', fill: 'none' });
    show(S.guide, m('step', -.1), .35);
    // a readout takes its value on a mark (a zero-length tween, so a seek draws the same frame)
    const setV = (ro, val, t0) => prog(() => ro.v(val), t0, 0, lin);
    const setFrame = (n, t0) => prog(() => S.frameN(n), t0, 0, lin);
    // the chip changes with the readouts, on the same mark offsets: "frame 1" only once the first step has actually run
    setFrame(1, m('a1', .3));
    // MEASURED x: A 204/208/212, B 200/204/208
    prog(q => { put(S.sqA, { x: cv2X(SQ_A.x + 4 * q) }); }, m('a1', -.05), .35, out);
    setV(S.roA, 204, m('a1', .3)); upBump(S.roA.g, m('a1', .32), 1.12);
    upBump(S.roB.g, m('b1', -.05), 1.12);
    setFrame(2, m('next', .3));
    prog(q => { put(S.sqA, { x: cv2X(SQ_A.x + 4 + 4 * q) }); put(S.sqB, { x: cv2X(SQ_B.x + 4 * q) }); put(S.guide, { x: cv2X(SQ_B.x + 4 * q) - HALF2 }); }, m('next', -.05), .4, out);
    setV(S.roA, 208, m('next', .3)); setV(S.roB, 204, m('next', .3));
    upBump(S.roA.g, m('next', .32), 1.1); upBump(S.roB.g, m('next', .32), 1.1);
    setFrame(3, m('tiny', .3));
    prog(q => { put(S.sqA, { x: cv2X(SQ_A.x + 8 + 4 * q) }); put(S.sqB, { x: cv2X(SQ_B.x + 4 + 4 * q) }); put(S.guide, { x: cv2X(SQ_B.x + 4 + 4 * q) - HALF2 }); }, m('tiny', -.05), .4, out);
    setV(S.roA, 212, m('tiny', .3)); setV(S.roB, 208, m('tiny', .3));
    show(upText(p, '60 frames every second', { x: 1130, y: 770, size: 22, fill: COL.muted, weight: 500, anchor: 'middle', o: 0 }), m('tiny', .2), .35);
    upHold(H);
  }],

  ['halves', 'Rules in update, picture in draw', (m, D) => {
    const p = panel(0), SX = SXT(), ST = STG(), H = D + .1;
    S.code = upCode(p, m('rules', -.15));
    tw(S.code.g, { y: 0 }, m('rules', -.15), .5, out); put(S.code.g, { y: 12 });
    // "the rules": the update() half washes green, "the picture": the draw() half washes cyan
    tw(S.code.rules, { o: .12 }, m('rules', .0), .4);
    show(S.code.lblR, m('rules', .05), .35);
    tw(S.code.pic, { o: .12 }, m('picture', .0), .4);
    show(S.code.lblP, m('picture', .05), .35);
    // "Here is the jump scene": the pane, its ground and the player at rest
    S.pv = upPane(p, m('jump', -.1));
    S.ground = upGround(S.pv, 0); show(S.ground, m('jump', .1), .35);
    S.words = upWords(S.pv, 0); show(S.words, m('jump', .3), .35);
    S.player = upPlayer(S.pv, 200, REST_Y, ST.blue, 0); show(S.player, m('jump', .25), .3);
    // the keys: a cap row that lights while its key is down. It appears when the scene first needs input (the slide that
    // starts on [[d]]); d and space light on the words that name them. a is shown too: the sketch reads it, it is just
    // never pressed in this scene.
    S.caps = G(p, { o: 0 });
    S.kA = upKeycap(S.caps, KEYCAP.x, 36, 'a', 1);
    S.kD = upKeycap(S.caps, KEYCAP.x + 36 + KEYCAP.gap, 36, 'd', 1);
    S.kSpace = upKeycap(S.caps, KEYCAP.x + 2 * (36 + KEYCAP.gap), 78, 'space', 1);
    show(S.caps, w('halves', 'plays', m('play')), .4);                 // "It plays exactly like before": the row is on screen before any press
    upKey(S.kD, m('d', 0), w('halves', 'player', m('d')));             // "Hold d, and the player ...": lit through the held slide
    const tSpace = m('space'), tSpaceUp = tSpace + .8;                 // "Press space": a tap as the jump starts, not a hold
    upKey(S.kSpace, tSpace, tSpaceUp);
    // "the same keys, the same jump": hold d, the player slides right (measured 4 px per frame)
    prog(q => { put(S.player, { x: cvX(200 + 84 * q) }); }, m('d', -.05), .45, out);
    // "press space ... and it jumps": the measured arc, frame 0 -> 167
    const t0 = m('space', .0), t1 = Math.max(t0 + 1.6, m('land', .1));
    prog(q => {
      const n = q * JUMP_FRAMES;
      put(S.player, { x: cvX(284), y: cvY(upJumpY(n)) });
    }, t0, t1 - t0, lin);
    // "It plays exactly like before" / "Nothing new happens on the screen."
    const same = upText(p, 'the 5.2.10 scene, unchanged', { x: 1310, y: 706, size: 23, fill: COL.muted, weight: 500, anchor: 'middle', o: 0 });
    show(same, m('play', .1), .35); hide(same, m('nothing', -.2), .3);
    // wrapped in two lines inside the pane's width (1060..1560), instead of one 539 px line from the panel border and past the pane
    S.movedNote = G(p, { o: 0 });
    upText(S.movedNote, 'same keys, same jump:', { x: 1310, y: 704, size: 23, fill: COL.muted, weight: 500, anchor: 'middle' });
    upText(S.movedNote, 'only the functions moved', { x: 1310, y: 732, size: 23, fill: COL.muted, weight: 500, anchor: 'middle' });
    show(S.movedNote, m('nothing', .1), .35);
    upHold(H);
  }],

  ['close', 'Up next', (m, D) => {
    const p = panel(0), SX = SXT();
    const row = (runs, y, t0, size = 40, weight = 600) => { const t = upRuns(p, runs, { x: 800, y, size, weight, o: 0 }); tw(t, { o: 1, y }, t0, .45, out); put(t, { y: y + 10 }); return t; };
    row([['rules', COL.muted, 500], ['    ', COL.text], ['update()', SX.fn, 400, MONO]], 210, m('sum', -.05), 40);
    row([['picture', COL.muted, 500], ['    ', COL.text], ['draw()', SX.fn, 400, MONO]], 292, m('pic', -.05), 40);
    row([['update() runs first, before physics', COL.text, 500]], 374, m('first', -.05), 34);
    show(upText(p, 'UP NEXT', { x: 800, y: 470, size: 22, fill: COL.purple, weight: 600, anchor: 'middle', o: 0 }), m('next', -.05), .35);
    row([['5.2.22 Lab: Rules in update()', COL.text]], 540, m('next', .15), 46);
    row([['put the rules in update(), and the picture in draw()', COL.muted]], 606, m('next', 1.1), 28, 500);
    upHold(Math.max(D, m('bye', 1.8)) + .1);
  }],
].map(([id, title, run, extra]) => ({ id, title, run, ...extra }));

// ---- SH: bottom-left, never the subject. Every expression change lands on a narration mark. ----
const CODEC = [600, 320], CONC = [800, 520], RINGC = [800, 410], PANEC = [1310, 410], PANE2C = [1130, 410], ZONEC = [520, 250], CARD = [800, 430];
bindActs({
  hello: { act: (t, m, D, s, MV) => {
    s.pose = 'down';
    emo(t, s, [[0, { expr: 'delighted', amp: 1.15, look: ZONEC }],
      [m('hi', -.15), { expr: 'delighted', amp: 1.15, look: ZONEC }],
      [m('setup', -.1), { expr: 'curious', tilt: 6, look: [700, 330] }],
      [m('third', -.1), { expr: 'determined', tilt: 0, look: [700, 480], pose: 'pointUp' }],
      [m('update', -.1), { expr: 'delighted', amp: 1.1, look: [700, 480], pose: 'down' }]]);
    MV.wave(t, s, m('hi', -.15), 1.9);
  } },
  three: { act: (t, m, D, s) => {
    s.pose = 'pointUp';
    emo(t, s, [[0, { expr: 'determined', look: CONC }],
      [m('every', -.1), { expr: 'curious', tilt: 6, look: [790, 210] }],
      [m('too', -.1), { expr: 'surprise', tilt: 0, amp: 1, look: [1140, 210] }],
      [m('never', -.1), { expr: 'determined', look: CONC, pose: 'point' }],
      [m('log', -.1), { expr: 'curious', tilt: 5, look: CONC }],
      [m('f1', -.1), { expr: 'determined', tilt: 0, look: CONC }],
      [m('d3', -.1), { expr: 'delighted', amp: 1.1, look: CONC, pose: 'pointUp' }],
      [m('always', -.1), { expr: 'proud', amp: 1.05, look: [800, 726] }]]);
  } },
  order: { act: (t, m, D, s) => {
    s.pose = 'point';
    emo(t, s, [[0, { expr: 'determined', look: RINGC }],
      [m('one', -.1), { expr: 'determined', look: [540, 290] }],
      [m('two', -.1), { expr: 'curious', tilt: 5, look: [1060, 290] }],
      [m('physics', -.1), { expr: 'surprise', amp: 1, tilt: 0, look: [1060, 290] }],
      [m('three', -.1), { expr: 'determined', look: [1060, 530] }],
      [m('four', -.1), { expr: 'curious', tilt: -5, look: [540, 530] }],
      [m('loop', -.1), { expr: 'delighted', amp: 1.1, look: RINGC, pose: 'pointUp' }]]);
  } },
  early: { act: (t, m, D, s) => {
    s.pose = 'point';
    emo(t, s, [[0, { expr: 'determined', look: CODEC }],
      [m('same', -.1), { expr: 'curious', tilt: 5, look: PANE2C }],
      [m('a', -.1), { expr: 'determined', tilt: 0, look: CODEC }],
      [m('b', -.1), { expr: 'curious', tilt: -5, look: CODEC }],
      [m('step', -.1), { expr: 'determined', tilt: 0, look: PANE2C, pose: 'pointUp' }],
      [m('a1', -.1), { expr: 'surprise', amp: 1, look: PANE2C }],
      [m('b1', -.1), { expr: 'curious', tilt: 5, look: PANE2C, pose: 'point' }],
      [m('wait', -.1), { expr: 'determined', tilt: 0, look: PANE2C }],
      [m('next', -.1), { expr: 'proud', amp: 1.05, look: PANE2C }],
      [m('gain', -.1), { expr: 'delighted', amp: 1.1, look: PANE2C }]]);
  } },
  halves: { act: (t, m, D, s) => {
    s.pose = 'pointUp';
    emo(t, s, [[0, { expr: 'determined', look: CODEC }],
      [m('rules', -.1), { expr: 'determined', tilt: 0, look: CODEC }],
      [m('picture', -.1), { expr: 'curious', tilt: 5, look: CODEC }],
      [m('jump', -.1), { expr: 'surprise', amp: 1, tilt: 0, look: PANEC }],
      [m('play', -.1), { expr: 'determined', look: PANEC, pose: 'point' }],
      [m('d', -.1), { expr: 'curious', tilt: 5, look: PANEC }],
      [m('space', -.1), { expr: 'surprise', amp: 1, look: PANEC }],
      [m('land', -.1), { expr: 'delighted', amp: 1.1, look: PANEC, pose: 'down' }],
      [m('moved', -.1), { expr: 'proud', amp: 1.05, look: CODEC, pose: 'pointUp' }]]);
    kick.lean(t, s, m('space', .1), .5, .5);
  } },
  close: { act: (t, m, D, s, MV) => {
    s.pose = 'down';
    emo(t, s, [[0, { expr: 'proud', amp: 1.05, look: CARD }],
      [m('first', -.1), { expr: 'determined', look: CARD }],
      [m('next', -.1), { expr: 'delighted', amp: 1.1, look: [800, 540], pose: 'point' }],
      [m('bye', -.15), { pose: 'down' }],
      [m('bye', -.1), { expr: 'delighted', amp: 1.15, look: [800, 500] }]]);
    MV.wave(t, s, m('bye', -.15), 1.9);
  } },
});
boot();
