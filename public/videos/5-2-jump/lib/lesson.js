// Shared drawing helpers for Papermorph lessons and explainers (was lesson21.js; every 2.1 name is unchanged).
// IM1-2.2 LIB additions at the bottom: tchip, arr, line4, tickMark, crossMark, tW, ease2, homeLeg, sweepFor.
// Colour meaning, held across the whole section:
//   COL.task  (burnt orange) = growth: new tiles, jumps, the coefficient of x
//   COL.whole (slate blue)   = starting value: Figure 0, the constant
//   COL.tile  (graphite)     = tiles carried over from the figure before
'use strict';

// One square tile drawn at (x, y) top-left, side s. Returns a group with ._edge and ._wash so it can be shaded later.
function sqTile(parent, x, y, s, kind = 'old', o = 1) {
  const g = G(parent, { o });
  const wash = mk('rect', { x: x + 1.5, y: y + 1.5, width: s - 3, height: s - 3, fill: kind === 'start' ? COL.whole : COL.task, opacity: 0 }, g);
  const edge = mk('rect', { x: x + 1, y: y + 1, width: s - 2, height: s - 2, fill: 'none', stroke: COL.tile, 'stroke-width': 2, 'stroke-linejoin': 'round' }, g);
  if (kind === 'ghost') { edge.setAttribute('stroke', COL.faint); edge.setAttribute('stroke-dasharray', '5 4'); }
  g._wash = put(wash, { o: 0 }); g._edge = edge; g._box = [x, y, s, s];
  if (kind === 'new' || kind === 'start') { put(wash, { o: kind === 'new' ? .32 : .2 }); edge.setAttribute('stroke', kind === 'new' ? COL.task : COL.whole); }
  return g;
}
// Shade a tile as new (growth colour) or as starting value, on the lesson clock (run = tw) or answer clock (run = fx).
function shade(t, t0, kind = 'new', run = tw) {
  const c = kind === 'start' ? COL.whole : COL.task;
  t._wash.setAttribute('fill', c);
  run(t._wash, { o: kind === 'start' ? .2 : .32 }, t0, .45);
  run(t._edge, { c_stroke: c }, t0, .45);
}
function unshade(t, t0, run = tw) { run(t._wash, { o: 0 }, t0, .4); run(t._edge, { c_stroke: COL.tile }, t0, .4); }

// Pattern A (Investigate 2.1.1): a base row of 5 tiles; a left leg of n tiles on its left end and a right leg of 3n
// on its right end. Figure n has 4n + 5 tiles. (x, baseY) is the bottom-left corner.
function patA(parent, n, x, baseY, s, { o = 1, newFrom = 0 } = {}) {
  const g = inkG(parent);
  const f = { g, base: [], left: [], right: [], all: [], x, baseY, s, w: 5 * s, h: (3 * n + 1) * s };
  const at = (col, row) => [x + col * s, baseY - (row + 1) * s];
  for (let c = 0; c < 5; c++) f.base.push(sqTile(g, ...at(c, 0), s, 'old', o));
  for (let r = 1; r <= n; r++) f.left.push(sqTile(g, ...at(0, r), s, newFrom && r === n ? 'new' : 'old', o));
  for (let r = 1; r <= 3 * n; r++) f.right.push(sqTile(g, ...at(4, r), s, newFrom && r > 3 * (n - 1) ? 'new' : 'old', o));
  f.all = [...f.base, ...f.left, ...f.right];
  f.newOnes = [f.left[n - 1], ...f.right.slice(3 * (n - 1))].filter(Boolean);
  return f;
}
// Pattern B (Investigate 2.1.2): a 2-tile column, then n columns of 3, each starting on the row where the one before
// ends. Column k (k >= 1) covers rows 2k-1 .. 2k+1. Figure n has 3n + 2 tiles.
function patB(parent, n, x, baseY, s, { o = 1, newFrom = 0 } = {}) {
  const g = inkG(parent);
  const f = { g, cols: [], all: [], x, baseY, s, w: (n + 1) * s, h: (2 * n + 2) * s };
  const at = (col, row) => [x + col * s, baseY - (row + 1) * s];
  f.cols.push([sqTile(g, ...at(0, 0), s, 'old', o), sqTile(g, ...at(0, 1), s, 'old', o)]);
  for (let k = 1; k <= n; k++) {
    const col = [];
    for (let r = 2 * k - 1; r <= 2 * k + 1; r++) col.push(sqTile(g, ...at(k, r), s, newFrom && k === n ? 'new' : 'old', o));
    f.cols.push(col);
  }
  f.all = f.cols.flat();
  f.newOnes = n ? f.cols[n] : [];
  return f;
}
// A rows pattern (Example 2.1.1 and practice): `rows` rows of `wide` tiles stacked up from (x, baseY).
function rowsFig(parent, rows, wide, x, baseY, s, { o = 1, newFrom = Infinity, startRows = 0 } = {}) {
  const g = inkG(parent);
  const f = { g, rows: [], all: [], x, baseY, s, w: wide * s, h: rows * s };
  for (let r = 0; r < rows; r++) {
    const kind = r < startRows ? 'start' : r >= newFrom ? 'new' : 'old';
    const row = [];
    for (let c = 0; c < wide; c++) row.push(sqTile(g, x + c * s, baseY - (r + 1) * s, s, kind, o));
    f.rows.push(row);
  }
  f.all = f.rows.flat();
  return f;
}
// Reveal a figure's tiles bottom-up, a few at a time.
function buildUp(f, t0, step = .025, dur = .3) {
  const tiles = [...f.all].sort((a, b) => b._box[1] - a._box[1] || a._box[0] - b._box[0]);
  tiles.forEach((t, i) => show(t, t0 + i * step, dur));
  return t0 + tiles.length * step + dur;
}
// Same reveal on the answer clock.
function buildUpFx(f, delay = 0, step = .03) {
  const tiles = [...f.all].sort((a, b) => b._box[1] - a._box[1] || a._box[0] - b._box[0]);
  tiles.forEach((t, i) => fx(t, { o: 1 }, delay + i * step, .3));
}

// Text helpers that fade in at t0.
const say = (p, str, x, y, t0, { size = 30, fill = COL.chalk, anchor = 'start', weight = 500, font = UI, o = 1 } = {}) => {
  const e = T(p, str, { x, y, size, fill, anchor, weight, font, o: 0 }); if (t0 !== null) tw(e, { o }, t0, .5); return e;
};
const mth = (p, parts, x, y, t0, { size = 44, fill = COL.chalk, anchor = 'start' } = {}) => {
  const e = M(p, [].concat(parts), { x, y, size, fill, anchor, o: 0 }); if (t0 !== null) show(e, t0); return e;
};
// A row of math tokens with their own colours: items like ['y = ', ['4', COL.task], 'x + ', ['5', COL.whole]].
function mrow(p, items, x, y, t0, { size = 56, anchor = 'start', step = 0 } = {}) {
  const row = tokens(p, items.map(it => Array.isArray(it) ? { t: it[0], fill: it[1] } : it), { x, y, size, anchor, o: 0 });
  row.forEach((e, i) => { if (t0 !== null) show(e, t0 + i * step); });
  return row;
}
// Small caps heading for a beat, top left.
const kicker = (p, str, t0 = .2) => say(p, str.toUpperCase(), 150, 92, t0, { size: 22, fill: COL.dim, weight: 600 });
// Caption under a figure.
function figLabel(p, str, cx, y, t0, { fill = COL.dim, size = 26, weight = 500 } = {}) { return say(p, str, cx, y, t0, { size, fill, anchor: 'middle', weight }); }

// A pencil-drawn definition box: title in the accent colour, body lines below. Returns the group.
function defBox(p, x, y, w, title, lines, t0, { size = 28, lh = 40, accent = COL.accent } = {}) {
  const hgt = 70 + lines.length * lh;
  const g = G(p, { o: 0 });
  const frame = inkG(g);
  mk('rect', { x, y, width: w, height: hgt, fill: COL.panel, stroke: 'none', rx: 4 }, frame);
  path(frame, `M${x} ${y}H${x + w}V${y + hgt}H${x}Z`, { stroke: COL.tile, 'stroke-width': 2.4 });
  path(frame, `M${x + 6} ${y + 6}V${y + hgt - 6}`, { stroke: accent, 'stroke-width': 6 });
  T(g, title, { x: x + 28, y: y + 44, size: size * .82, fill: accent, weight: 700 });
  lines.forEach((ln, i) => T(g, ln, { x: x + 28, y: y + 44 + (i + 1) * lh, size, fill: COL.chalk }));
  tw(g, { o: 1 }, t0, .6);
  g._h = hgt;
  return g;
}

// A table with a header column. head: ['Figure #', 0, 1, 2]; rows: [['Pattern R', 7, 12, ...], ...].
// Cells are separate text elements so they can be revealed one at a time. Returns { g, cells[r][c], cx(c), cy(r), box(r, c) }.
function table(p, x, y, firstW, colW, rowH, head, rows, t0, { size = 32, o = 1, cellsHidden = false } = {}) {
  const g = G(p, { o: 0 });
  const nC = head.length, W = firstW + (nC - 1) * colW, H = rowH * (rows.length + 1);
  const grid = inkG(g);
  mk('rect', { x, y, width: W, height: H, fill: COL.panel, stroke: 'none' }, grid);
  mk('rect', { x, y, width: W, height: rowH, fill: COL.accent, opacity: .1, stroke: 'none' }, grid);
  let d = `M${x} ${y}H${x + W}V${y + H}H${x}Z`;
  for (let r = 1; r <= rows.length; r++) d += `M${x} ${y + r * rowH}H${x + W}`;
  for (let c = 0; c < nC - 1; c++) d += `M${x + firstW + c * colW} ${y}V${y + H}`;
  path(grid, d, { stroke: COL.tile, 'stroke-width': 2 });
  const cx = c => c === 0 ? x + 18 : x + firstW + (c - .5) * colW;
  const cy = r => y + r * rowH + rowH * .66;
  const cells = [head, ...rows].map((row, r) => row.map((v, c) => {
    const isHead = r === 0 || c === 0;
    const e = T(g, String(v), { x: cx(c), y: cy(r), size: isHead ? size * .78 : size, fill: isHead ? COL.dim : COL.chalk,
      font: isHead ? UI : MONO, weight: isHead ? 600 : 500, anchor: c === 0 ? 'start' : 'middle', o: cellsHidden && !isHead ? 0 : 1 });
    return e;
  }));
  tw(g, { o }, t0, .5);
  return { g, cells, cx, cy, x, y, W, H, rowH, colW, firstW, box: (r, c) => [x + firstW + (c - 1) * colW, y + r * rowH, colW, rowH] };
}
// A jump arc between two columns of a table row, with its label (e.g. +4) below or above.
// Timing: the body draws in JUMP_BODY s and the head appears, whole, as the body completes (JUMP_HEAD s, never a
// half-transparent head hovering while the body still draws). A neighbouring arc (same row, starting where this one
// ends) is held back until this head is fully there, so the next arc's first stub never shows beside a fading head.
const JUMP_BODY = .3, JUMP_HEAD = .04, JUMP_GAP = .02, JUMP_LAST = new WeakMap();
function jump(p, x1, x2, y, label, color, t0, { up = false, size = 26, run = tw } = {}) {
  const prev = JUMP_LAST.get(p);
  if (prev && Math.abs(prev.y - y) < 2 && Math.abs(prev.x2 - x1) < 30 && t0 < prev.done) t0 = prev.done;
  JUMP_LAST.set(p, { y, x2, done: t0 + JUMP_BODY + JUMP_HEAD + JUMP_GAP });
  const k = up ? -1 : 1, hgt = 26 * k, dir = Math.sign(x2 - x1) || 1;   // dir < 0: an arc that steps back
  const a = path(p, `M${x1 + 8 * dir} ${y}Q${(x1 + x2) / 2} ${y + 2 * hgt} ${x2 - 8 * dir} ${y}`, { stroke: color, 'stroke-width': 3, 'stroke-linecap': 'butt' }, { d: 0 });   // butt: a round cap draws a dot at d = 0
  // The head follows the arc's real direction at its tip (the control point to the end point). Fixed barb offsets sat
  // asymmetrically about that steep end and read as a tilted arrowhead.
  const ex = x2 - 8 * dir, cxm = (x1 + x2) / 2, cym = y + 2 * hgt, tl = Math.hypot(ex - cxm, y - cym) || 1;
  const bx = -(ex - cxm) / tl, by = -(y - cym) / tl, BL = 14, BA = .52;   // unit vector back along the arc, barb length, half-angle (~30 deg)
  const barb = a => `${ex + BL * (bx * Math.cos(a) - by * Math.sin(a))} ${y + BL * (bx * Math.sin(a) + by * Math.cos(a))}`;
  const hd = path(p, `M${barb(BA)}L${ex} ${y}L${barb(-BA)}`, { stroke: color, 'stroke-width': 3 }, { o: 0 });
  const t = T(p, label, { x: (x1 + x2) / 2, y: y + hgt + (up ? -10 : 34), size, fill: color, anchor: 'middle', weight: 700, font: MONO, o: 0 });
  run(a, { d: 1 }, t0, JUMP_BODY); run(hd, { o: 1 }, t0 + JUMP_BODY, JUMP_HEAD); run(t, { o: 1 }, t0 + .15, .3);
  return [a, hd, t];
}
// Numbered takeaway rows for a wrap beat.
function takeaways(p, items, m, { x = 170, y = 260, gap = 140, size = 36 } = {}) {
  items.forEach(([str, mark, sub], i) => {
    const g = G(p, { x: -16, y: y + i * gap, o: 0 });
    mk('circle', { cx: x, cy: -12, r: 26, fill: COL.accent }, g);
    T(g, String(i + 1), { x, y: -1, size: 30, fill: COL.panel, weight: 700, anchor: 'middle' });
    T(g, str, { x: x + 60, size, weight: 600 });
    if (sub) T(g, sub, { x: x + 60, y: 46, size: size * .72, fill: COL.dim });
    tw(g, { o: 1, x: 0 }, m(mark), .6);
  });
}
// A title card for a chapter's first beat.
function titleCard(m, D, kick, title, sub) {
  const P0 = panel(0);                              // the title is the panel: the next beat's panel() fades it, no empty gap
  const g = G(P0, { o: 0, y: 24 });
  T(g, kick, { x: 800, y: 330, size: 28, fill: COL.dim, anchor: 'middle', weight: 600 });
  T(g, title, { x: 800, y: 430, size: 80, weight: 600, anchor: 'middle' });
  tw(g, { o: 1, y: 0 }, .2, 1.1, out);
  const r = say(P0, sub, 800, 520, m('sub'), { size: 34, fill: COL.accent, anchor: 'middle' });
  const rule = path(P0, 'M640 560H960', { stroke: COL.task, 'stroke-width': 3 }, { d: 0 });
  draw(rule, m('sub', .3), .7);
}
const num$ = s => { const v = Number(String(s).replace(/\s/g, '')); return Number.isFinite(v) ? v : NaN; };

/* ---------- character choreography helpers (see lib/director.js) ----------
   An act is (t, m, D, s, MV): t is the beat clock, m(mark) a word time, s the character state in reel units
   (s.Z stage px per unit), MV the moves. Acts must be pure in t: no state is kept between frames. */
const win = (t, a, d) => Math.max(0, Math.min(1, (t - a) / d));
const [HOME_X, HOME_Y] = window.CHAR_HOME || [20, 900 - 14 - 90 * 1.5];   // director.js loads first; the home depends on PM.type (lesson 1.5, explainer 1.9)
function place(s, x, y = HOME_Y) { s.cx = x / s.Z; s.cy = y / s.Z; }
// Hop along a row of stage x positions: legs [[t0, dur, xTo]]; the last leg started decides where he is.
function hops(t, s, MV, x0, legs, h = 26) {
  let x = x0; place(s, x0, s.cy * s.Z);
  for (const [t0, dur, x1] of legs) {
    if (t < t0) break;
    const u = win(t, t0, dur);
    MV.hop(u, s, x / s.Z, x1 / s.Z, h);
    if (u >= 1) s.face = 1;
    x = x1;
  }
}
const nod = (t, s, at, k = 8) => { s.hop -= k * Math.sin(Math.PI * win(t, at, .45)); };
// Run a move whose key instant is at fraction `key` of its length L, so that instant lands on time `at`.
function moveAt(t, at, key, L, f) { const t0 = Math.max(.15, at - key * L), len = (at - t0) / key; const u = (t - t0) / len; if (u > 0 && u < 1) { f(u); return true; } return false; }
// Right end of a token row (for a beam target): the last characters of the row's last token.
function rowEnd(row, size, chars = 3) { const e = row[row.length - 1]; return [e._px + e._w / 2 - chars * .27 * size, row.y - .35 * size]; }
const ACT_COMMON = {
  intro: { act: (t, m, D, s, MV) => { s.pose = 'up'; hops(t, s, MV, -140, [[.2, 1.3, HOME_X]], 34); if (t > 1.6) s.pose = 'point'; } },
  finish: { charZ: 2, noIdle: false, act: (t, m, D, s, MV) => { place(s, 730, 120); MV.celebrate(t, s); } },
};
// Beats named intro / finish get the shared character act (ACT_COMMON). Opt out with a beat flag, not by renaming: [id, title, run, { common: false }].
function bindActs(acts) { BEATS.forEach(b => Object.assign(b, b.common === false ? {} : (ACT_COMMON[b.id] || {}), acts[b.id] || {})); }

/* ---------- IM1-2.2 LIB additions (promoted from the 1.3.2 explainer page) ---------- */
const ease2 = u => u * u * (3 - 2 * u);
const tW = (str, size, weight = 600) => { ctx2d.font = `${weight} ${size}px ${UI}`; return ctx2d.measureText(str).width; };
// Pill with plain text (units and names, which must not be italicised the way M() does). Returns a group with ._rect and ._w.
function tchip(p, str, color, { x = 0, y = 0, size = 34, o = 1, s = 1 } = {}) {
  const g = G(p, { x, y, o, s });
  const w = textW(str, size) + 44, h = size * 1.5;
  g._rect = mk('rect', { x: -w / 2, y: -h / 2, width: w, height: h, rx: h / 2, fill: COL.board, stroke: color, 'stroke-width': 2.5 }, g);
  T(g, str, { x: 0, y: size * .34, size, anchor: 'middle', font: MATH });
  g._w = w;
  return g;
}
// Arrow along a cubic [x1,y1,c1x,c1y,c2x,c2y,x2,y2]; the head shows as the line finishes. Returns a group with ._ln and ._head.
function arr(p, [x1, y1, c1x, c1y, c2x, c2y, x2, y2], color, t0, dur = .7, sw = 3.5) {
  const g = G(p);
  const ln = path(g, `M${x1} ${y1}C${c1x} ${c1y} ${c2x} ${c2y} ${x2} ${y2}`, { stroke: color, 'stroke-width': sw }, { d: 0 });
  const a = Math.atan2(y2 - c2y, x2 - c2x), L = 17;
  const head = path(g, `M${x2 - L * Math.cos(a - .5)} ${y2 - L * Math.sin(a - .5)}L${x2} ${y2}L${x2 - L * Math.cos(a + .5)} ${y2 - L * Math.sin(a + .5)}`,
    { stroke: color, 'stroke-width': sw }, { o: 0 });
  draw(ln, t0, dur); show(head, t0 + dur * .8, .2);
  g._ln = ln; g._head = head;
  return g;
}
const line4 = (x1, y1, x2, y2) => [x1, y1, x1 + (x2 - x1) / 3, y1 + (y2 - y1) / 3, x1 + 2 * (x2 - x1) / 3, y1 + 2 * (y2 - y1) / 3, x2, y2];
function tickMark(p, x, y, color, t0, s = 1) {            // a drawn check mark that pops in at t0
  const g = G(p, { x, y, s: .3, o: 0 });
  path(g, 'M-15 1L-4 13L17 -14', { stroke: color, 'stroke-width': 7 });
  tw(g, { s, o: 1 }, t0, .45, back); return g;
}
function crossMark(p, x, y, color, t0, s = 1) {           // a drawn cross that pops in at t0
  const g = G(p, { x, y, s: .3, o: 0 });
  path(g, 'M-14 -14L14 14M14 -14L-14 14', { stroke: color, 'stroke-width': 7 });
  tw(g, { s, o: 1 }, t0, .45, back); return g;
}
// Walk home before a beat ends so the next beat starts where he is: route(t, s, [[.3, 1, x, y], homeLeg(D)]).
const homeLeg = D => [D - 1.3, 1.0, HOME_X, HOME_Y];
// Pin the sword sweep's slash to a line on the page: MV.sweep(u, s, sweepFor(x0, x1, y0, y1, uA, uB)) where the slash rides
// from stage x0 to x1 between u = uA and u = uB of the move.
const sweepFor = (x0, x1, y0, y1, uA = .415, uB = .70, band = .45) =>
  ({ x0, x1, y0, y1, band, xOf: uu => x0 + (x1 - x0) * Math.max(0, Math.min(1, (uu - uA) / (uB - uA))) });

// The sword sweep's piecewise clock (from the 1.3.2 explainer): draw back over `prep` s, cut at the absolute beat time `cut`,
// the slash travels `trav` s with the page's own line (x0 -> x1, stage px; or your own xOf(u)), then fades over `fade` s.
// Call it every frame from an act: swordSweep(t, s, MV, { cut: m('line', 2.55), x0, x1, y0, y1 }). Pure in t.
function swordSweep(t, s, MV, { cut, prep = 2.55, trav = 4.2, fade = .35, x0, x1, y0, y1, band = .45, xOf } = {}) {
  const ts = cut - prep;
  if (t <= ts || t >= cut + trav + fade) return;
  const u = t < cut ? .415 * (t - ts) / prep : t < cut + trav ? .415 + .285 * (t - cut) / trav : .70 + .30 * (t - cut - trav) / fade;
  MV.sweep(u, s, { x0, x1, y0, y1, band, xOf: xOf || (uu => x0 + (x1 - x0) * Math.max(0, Math.min(1, (uu - .415) / .285))) });
}
