// graph.js: the coordinate-graph widget (IM1-2.2 LIB). Follows the author-set style in im1-graph-style.md:
//   * every integer tick is numbered, ON the axis lines, faint (50%), behind the lines and over the grid;
//   * marked points are NEVER labelled with coordinates (there is no option for it);
//   * one origin "0" (left of and below the crossing), clear of the "-1" tick of the y axis;
//   * grid rows at least 28 px tall (GRAPH.MIN_ROW) AND tick numbers sized from the row so the origin 0 and the -1 below it keep
//     >= GRAPH.CLEAR (4) px of clear ink between them (the same rule the book figures follow at 13 px / 28 px); g.audit() measures the
//     real glyph boxes with that same rule, so the doc, MIN_ROW and the audit agree; line names are single letters just outside the plot;
//   * colours match svg-figures/_shared/figlib.py graph22 / multi_graph: line = slate blue (COL.whole), accent = COL.task,
//     axis ink = COL.tile, grid = COL.tile at .45, tick numbers = COL.chalk at .5.
// Everything is drawn at absolute stage px (no transform on the root), so g.px()/g.py() are stage coordinates and the
// check builders' hit targets line up with what is drawn. Animations take a time t0 and an optional `run` (tw for the
// lesson clock, fx for the answer clock, same signature), exactly like jump() in lesson.js.
// Documented in LIB.md. Do not edit per part: this file is frozen.
'use strict';

const GRAPH = { MIN_ROW: 28, CLEAR: 4, uid: 0 };
// Digit ink box of a tick-number text element (x, y, text-anchor, font-size attributes): { x, y, w, h } in stage px.
function tickInk(t) {
  const fsz = +t.getAttribute('font-size'), s = t.textContent, a = t.getAttribute('text-anchor');
  ctx2d.font = `${fsz}px ${MATH}`;
  const m = ctx2d.measureText(s), x = +t.getAttribute('x'), y = +t.getAttribute('y');
  return { x: a === 'end' ? x - m.width : a === 'middle' ? x - m.width / 2 : x, y: y - m.actualBoundingBoxAscent, w: m.width, h: m.actualBoundingBoxAscent + m.actualBoundingBoxDescent };
}
const minus = n => (n < 0 ? '−' : '') + Math.abs(n);               // typographic minus, as the book figures print it
const fmtNum = n => Number.isInteger(n) ? minus(n) : minus(+n.toFixed(2));

// Clip the infinite line through p0, p1 to the rectangle; returns [[x, y], [x, y]] in data units, or null if it misses.
function clipLine(p0, p1, xmin, xmax, ymin, ymax) {
  const dx = p1[0] - p0[0], dy = p1[1] - p0[1];
  if (!dx && !dy) return null;
  let t0 = -Infinity, t1 = Infinity;
  const cut = (p, q) => {                                           // p * t <= q
    if (p === 0) return q >= 0;
    const r = q / p;
    if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; } else { if (r < t0) return false; if (r < t1) t1 = r; }
    return true;
  };
  if (!(cut(-dx, p0[0] - xmin) && cut(dx, xmax - p0[0]) && cut(-dy, p0[1] - ymin) && cut(dy, ymax - p0[1]))) return null;
  return [[p0[0] + dx * t0, p0[1] + dy * t0], [p0[0] + dx * t1, p0[1] + dy * t1]];
}

/* graph(parent, opts) -> g
   opts: x, y        stage px of the plot rectangle's top-left corner (the axes' numbers hang outside it). Keep y >= 140 so the
                     y axis name clears a beat's kicker line.
         xmin xmax ymin ymax   integer bounds, inclusive
         xstep ystep grid and numbered ticks every this many units (default 1: a number at every integer; use 2, 5 ... for tall
                     graphs, as the book's y = 3x + 5 figure does). The grid ROW (ystep * uy) must be >= 28 px or this throws.
         ux, uy      stage px per unit. Or give w, h (plot size in px) instead.
         xlabel, ylabel   axis names, default 'x' and 'y'; false to omit
         t0          reveal time (fades the whole graph in); omit for "already there" (o: 1); o: 0 hides it for later
   Returns g with: root, plot [x, y, w, h], box (plot plus the labels' margin), ux, uy, px(x), py(y), at(x, y), inv(sx, sy),
   layers (lines, segs, tris, pts), and the methods point, points, line, segment, highlight, mark, label, dragLine, audit. */
function graph(parent, o = {}) {
  const { x: X0 = 120, y: Y0g = 140, xmin = -2, xmax = 6, ymin = -2, ymax = 10, xstep = 1, ystep = 1 } = o;
  for (const [k, v] of Object.entries({ xmin, xmax, ymin, ymax })) if (!Number.isInteger(v)) throw new Error(`graph: ${k} must be an integer (every integer tick is numbered)`);
  if (xmax <= xmin || ymax <= ymin) throw new Error('graph: needs xmax > xmin and ymax > ymin');
  const ux = o.ux ?? (o.w ? o.w / (xmax - xmin) : 60), uy = o.uy ?? (o.h ? o.h / (ymax - ymin) : 40);
  const rowH = uy * ystep, colW = ux * xstep;
  if (rowH < GRAPH.MIN_ROW) throw new Error(`graph: grid rows are ${rowH.toFixed(1)} px tall; the graph style needs at least ${GRAPH.MIN_ROW} (the -1 tick must clear the origin 0)`);
  const W = (xmax - xmin) * ux, H = (ymax - ymin) * uy;
  // Number size: as large as the row allows. Ink geometry (digits are ~.72 em tall): the origin 0 sits at baseline ay + 6 + .95 fs, the
  // number one row down is centred on its grid line (top at ay + rowH - .37 fs), so the clear gap is rowH - 1.32 fs - 6. We need CLEAR + 2
  // spare, hence fs <= (rowH - 12) / 1.32: 12 px at the 28 px minimum row, 18 (the cap) from ~36 px. Never below 11.
  let fs = Math.max(11, Math.min(18, Math.floor((rowH - 12) / 1.32)));
  const widest = f => Math.max(...[xmin, xmax].map(v => textW(minus(v), f)));   // x labels sit one column apart
  while (fs > 12 && widest(fs) > colW - 8) fs--;
  const xs = [], ys = [];                                                          // the multiples of each step inside the plot
  for (let i = Math.ceil(xmin / xstep) * xstep; i <= xmax; i += xstep) xs.push(i);
  for (let j = Math.ceil(ymin / ystep) * ystep; j <= ymax; j += ystep) ys.push(j);
  const id = ++GRAPH.uid, clipId = `gclip${id}`;
  const px = x => X0 + (x - xmin) * ux, py = y => Y0g + H - (y - ymin) * uy;
  const ax = px(Math.min(Math.max(0, xmin), xmax)), ay = py(Math.min(Math.max(0, ymin), ymax));   // where the axes cross (or the edge)
  const root = G(parent, { o: (o.t0 === undefined || o.t0 === null) ? (o.o ?? 1) : 0 });
  const defs = mk('defs', {}, root);
  mk('clipPath', { id: clipId }, defs).appendChild(mk('rect', { x: X0, y: Y0g, width: W, height: H }));

  // 1. grid: one path, faint, plain ruled (the pencil wobble is kept for the axes and the lines)
  let gd = '';
  for (const i of xs) gd += `M${px(i)} ${Y0g}V${Y0g + H}`;
  for (const j of ys) gd += `M${X0} ${py(j)}H${X0 + W}`;
  mk('path', { d: gd, fill: 'none', stroke: COL.tile, 'stroke-width': 1, 'stroke-opacity': .45 }, root);
  // 2. axes
  mk('path', { d: `M${X0} ${ay}H${X0 + W}M${ax} ${Y0g}V${Y0g + H}`, fill: 'none', stroke: COL.tile, 'stroke-width': 2.6, 'stroke-linecap': 'round' }, root);   // plain, like the book's ruled axes
  // 3. tick numbers: every integer, on the axis lines, faint, one 0 at the origin; written BEFORE the lines and points
  const tickG = mk('g', { 'data-role': 'ticks' }, root), ticks = [];
  const num$ = (txt, tx, ty, anchor, key) => {
    const t = mk('text', { x: tx, y: ty, 'font-size': fs, 'font-family': MATH, fill: COL.chalk, 'fill-opacity': .5, 'text-anchor': anchor, 'data-tick': key }, tickG);
    t.textContent = txt; ticks.push(t); return t;
  };
  const hasOrigin = xmin <= 0 && xmax >= 0 && ymin <= 0 && ymax >= 0;
  for (const i of xs) if (i !== 0 || !hasOrigin) num$(minus(i), px(i), ay + 6 + fs * .95, 'middle', 'x' + i);
  for (const j of ys) if (j !== 0 || !hasOrigin) num$(minus(j), ax - 9, py(j) + fs * .35, 'end', 'y' + j);
  if (hasOrigin) num$('0', ax - 9, ay + 6 + fs * .95, 'end', 'origin');   // the single 0
  const axName = (txt, tx, ty, anchor) => { const t = T(root, txt, { x: tx, y: ty, size: 24, fill: COL.chalk, font: MATH, anchor }); t.setAttribute('font-style', 'italic'); return t; };
  if (o.xlabel !== false) axName(o.xlabel || 'x', X0 + W + 20, ay + 8, 'start');
  if (o.ylabel !== false) axName(o.ylabel || 'y', ax - 4, Y0g - 14, 'middle');

  // 4. layers, bottom to top: lines (clipped, pencil), highlighted segments, triangles, points
  const clipped = mk('g', { 'clip-path': `url(#${clipId})` }, root);
  const L = {
    lines: inkG(clipped), segs: G(root), tris: G(root), pts: G(root),
  };
  const g = { root, plot: [X0, Y0g, W, H], ux, uy, xstep, ystep, rowH, xmin, xmax, ymin, ymax, px, py, ax, ay, fs, layers: L, ticks, clipId, uid: id };
  g.box = [X0 - 56, Y0g - 38, W + 56 + 70, H + 38 + 44];
  g.at = (x, y) => [px(x), py(y)];
  g.inv = (sx, sy) => [xmin + (sx - X0) / ux, ymin + (Y0g + H - sy) / uy];
  g.inside = (x, y) => x >= xmin && x <= xmax && y >= ymin && y <= ymax;
  g.panel = S.panel;
  S.graphs = (S.graphs || []).filter(x => x.panel === S.panel);   // S.graphs = the graphs of the current beat's panel
  S.graphs.push(g);   // tools/spacing.py and e2e audit every graph on the stage (g.audit())
  if (o.t0 !== undefined && o.t0 !== null) show(root, o.t0, .6);

  const R = (run, e, to, t0, dur, ease) => (run || tw)(e, to, t0, dur, ease);

  // ---- point: a dot at data (x, y). NO coordinate label, by style. Returns the element (state s:0,o:0 unless t0 === null).
  g.point = (x, y, { color = COL.whole, r = 7, t0 = undefined, run = tw, ring = false, layer = L.pts } = {}) => {
    const e = G(layer, { x: px(x), y: py(y), s: t0 === null ? 1 : 0, o: t0 === null ? 1 : 0 });
    if (ring) mk('circle', { r: r + 7, fill: 'none', stroke: color, 'stroke-width': 2.5, opacity: .55 }, e);
    mk('circle', { r, fill: color, stroke: COL.chalk, 'stroke-width': 1.2 }, e);
    e._xy = [x, y]; e._r = r;
    if (typeof t0 === 'number') R(run, e, { s: 1, o: 1 }, t0, .45, back);
    return e;
  };
  // ---- points: animate a list in, one by one. list: [[x, y], ...]. Returns { els, end }.
  g.points = (list, t0, { step = .35, dur = .45, color = COL.whole, r = 7, run = tw, pulse = false, ring = false } = {}) => {
    const els = list.map(([x, y], i) => {
      const e = g.point(x, y, { color, r, ring });
      R(run, e, { s: 1, o: 1 }, t0 + i * step, dur, back);
      if (pulse) { R(run, e, { s: 1.5 }, t0 + i * step + dur, .2, out); R(run, e, { s: 1 }, t0 + i * step + dur + .2, .35); }
      return e;
    });
    return { els, end: t0 + (list.length - 1) * step + dur };
  };
  // ---- line through p0 and p1, drawn across the whole plot (clipped to it). opts: color, width, name (one letter, printed
  // just outside the plot at the 'hi' (larger x, or larger y when vertical) or 'lo' end; on a FALLING line 'hi' is the right, LOWER
  // end and 'lo' the left, higher end: ends are ordered by x, never by height), dashed, t0 (number: draw it from
  // then; null: already drawn; undefined: hidden, call draw(el, t) yourself), dur.
  g.line = (p0, p1, { color = COL.whole, width = 4.5, name, end = 'hi', dashed = false, t0, dur = .9, run = tw } = {}) => {
    const c = clipLine(p0, p1, xmin, xmax, ymin, ymax);
    if (!c) throw new Error('graph.line: the line misses the plot');
    let [a, b] = c;
    if (a[0] > b[0] || (a[0] === b[0] && a[1] > b[1])) [a, b] = [b, a];   // a = lo end, b = hi end
    const d = `M${px(a[0])} ${py(a[1])}L${px(b[0])} ${py(b[1])}`;
    const e = path(L.lines, d, { stroke: color, 'stroke-width': width, ...(dashed ? { 'stroke-dasharray': '10 7' } : {}) }, dashed ? { o: 0 } : { d: t0 === null ? 1 : 0 });
    if (dashed) put(e, { o: t0 === null ? 1 : 0 });
    e._p0 = p0; e._p1 = p1; e._lo = a; e._hi = b;
    if (name) {
      const [ex, ey] = end === 'hi' ? b : a, [ox, oy] = end === 'hi' ? a : b;
      let ux2 = px(ex) - px(ox), uy2 = py(ey) - py(oy); const n = Math.hypot(ux2, uy2) || 1; ux2 /= n; uy2 /= n;
      e._name = T(root, name, { x: px(ex) + ux2 * 18, y: py(ey) + uy2 * 18 + 7, size: 24, fill: color, anchor: 'middle', weight: 700, o: t0 === null ? 1 : 0 });
    }
    if (typeof t0 === 'number') {
      if (dashed) R(run, e, { o: 1 }, t0, dur); else R(run, e, { d: 1 }, t0, dur);
      if (e._name) R(run, e._name, { o: 1 }, t0 + dur * .8, .4);
    }
    return e;
  };
  // ---- segment between two data points (not extended). Same t0 rules as line().
  g.segment = (p0, p1, { color = COL.whole, width = 4, t0, dur = .7, run = tw, layer = L.segs } = {}) => {
    const e = path(layer, `M${px(p0[0])} ${py(p0[1])}L${px(p1[0])} ${py(p1[1])}`, { stroke: color, 'stroke-width': width }, { d: t0 === null ? 1 : 0 });
    e._p0 = p0; e._p1 = p1;
    if (typeof t0 === 'number') R(run, e, { d: 1 }, t0, dur);
    return e;
  };
  // ---- highlight a stretch of the graph (e.g. the rise leg): a wide soft band under a bright core, drawn from p0 to p1, with a
  // pulse at the end. Returns a group; hide(el, t) it later.
  g.highlight = (p0, p1, { color = COL.task, width = 7, t0 = 0, dur = .6, run = tw, label, labelAt, size = 28 } = {}) => {
    const e = G(L.segs);
    const band = path(e, `M${px(p0[0])} ${py(p0[1])}L${px(p1[0])} ${py(p1[1])}`, { stroke: color, 'stroke-width': width * 2.6, 'stroke-opacity': .22 }, { d: t0 === null ? 1 : 0 });
    const core = path(e, `M${px(p0[0])} ${py(p0[1])}L${px(p1[0])} ${py(p1[1])}`, { stroke: color, 'stroke-width': width }, { d: t0 === null ? 1 : 0 });
    e._band = band; e._core = core;
    if (label) e._label = T(e, label, { x: labelAt ? labelAt[0] : (px(p0[0]) + px(p1[0])) / 2 + 18, y: labelAt ? labelAt[1] : (py(p0[1]) + py(p1[1])) / 2 + 9, size, fill: color, weight: 700, font: MONO, o: t0 === null ? 1 : 0 });
    if (typeof t0 === 'number') {
      R(run, band, { d: 1 }, t0, dur); R(run, core, { d: 1 }, t0, dur);
      if (e._label) R(run, e._label, { o: 1 }, t0 + dur * .7, .35);
      R(run, core, { 'a_stroke-width': width * 1.8 }, t0 + dur, .2, out); R(run, core, { 'a_stroke-width': width }, t0 + dur + .2, .4);
    }
    return e;
  };
  // ---- free text at a data position (for line names or a unit tag, NOT for point coordinates). Returns the text element.
  g.label = (txt, x, y, { color = COL.chalk, size = 26, dx = 0, dy = 0, anchor = 'middle', weight = 600, font = UI, t0, run = tw } = {}) => {
    const e = T(root, txt, { x: px(x) + dx, y: py(y) + dy, size, fill: color, anchor, weight, font, o: t0 === null ? 1 : 0 });
    if (typeof t0 === 'number') R(run, e, { o: 1 }, t0, .4);
    return e;
  };
  // ---- a faint dashed guide (e.g. a rise leg), to or from the axes
  g.guide = (p0, p1, { color = COL.faint, t0, run = tw } = {}) => {
    const e = path(L.segs, `M${px(p0[0])} ${py(p0[1])}L${px(p1[0])} ${py(p1[1])}`, { stroke: color, 'stroke-width': 2.2, 'stroke-dasharray': '6 6' }, { o: t0 === null ? 1 : 0 });
    if (typeof t0 === 'number') R(run, e, { o: 1 }, t0, .4);
    return e;
  };
  // ---- draggable line (two handles on the grid, live line). Free exploration; drawLine() is the same thing as a check. See gdrag().
  // Outside a quiz (a think() card, or plain narration) the handles also survive a theme toggle: the engine's P.save / P.resume.
  g.dragLine = o2 => {
    const d = gdrag(g, o2);
    const R0 = P.resume && P.resume.beat === P.i && P.resume.qid === 'dragLine' ? P.resume : null;
    if (R0) { P.resume = null; R0.state.forEach((p, i) => d.set(i, p[0], p[1])); }
    P.save = () => ({ beat: P.i, k: 0, qid: 'dragLine', state: d.pts.map(p => p.slice()) });
    return d;
  };
  // ---- self-check for the style rules: returns a list of problems (empty = clean). Measures the real digit ink of every number:
  // any two numbers closer than GRAPH.CLEAR px are reported (this is where the origin 0 and the -1 below it would be caught).
  g.audit = () => {
    const out = [], bb = ticks.map(t => ({ k: t.dataset.tick, r: tickInk(t) })), C = GRAPH.CLEAR;
    for (let i = 0; i < bb.length; i++) for (let j = i + 1; j < bb.length; j++) {
      const a = bb[i].r, b = bb[j].r;
      if (a.x < b.x + b.w + C && b.x < a.x + a.w + C && a.y < b.y + b.h + C && b.y < a.y + a.h + C)
        out.push(bb[i].k === 'origin' || bb[j].k === 'origin' ? `tick ${bb[i].k === 'origin' ? bb[j].k : bb[i].k} is closer than ${C}px to the origin 0` : `tick numbers ${bb[i].k} and ${bb[j].k} are closer than ${C}px`);
    }
    if (rowH < GRAPH.MIN_ROW) out.push(`rows ${rowH}px < ${GRAPH.MIN_ROW}`);
    const strays = [...root.querySelectorAll('text')].filter(t => /^\(\s*-?[\d.−]+\s*,\s*-?[\d.−]+\s*\)$/.test((t.textContent || '').trim()));
    if (strays.length) out.push(`coordinate label on a point: ${strays[0].textContent}`);
    return out;
  };
  return g;
}

/* ============================================================
   Draggable line: two handles on the grid (pointer drag, or Tab to a handle and arrow keys), the line through them redrawn live.
   g.dragLine(opts) -> d   (works on its own for "drag it and watch the slope", and powers the drawLine() check)
   opts: start [[x0,y0],[x1,y1]] (default [[0,0],[1,1]]); snap (default 1: handles land on grid points; 0 = free);
         fixed: 0 or 1 pins that handle (e.g. the given y-intercept); color; onChange(d) called on every move.
   d: p0, p1 (data), slope() -> [n, d] reduced or null (vertical), intercept() -> [n, d] | null, on(x, y), layer, destroy(), set(i, x, y).
   ============================================================ */
function gdrag(g, { start = [[0, 0], [1, 1]], snap = 1, fixed = -1, color = COL.task, onChange, layer } = {}) {
  const Lr = layer || qlayer(), pts = start.map(p => p.slice());
  const line = path(Lr, '', { stroke: color, 'stroke-width': 4.5 });
  line.setAttribute('clip-path', `url(#${g.clipId})`);
  const clampP = (x, y) => [Math.min(g.xmax, Math.max(g.xmin, snap ? Math.round(x / snap) * snap : x)), Math.min(g.ymax, Math.max(g.ymin, snap ? Math.round(y / snap) * snap : y))];
  const draw = () => {
    const c = clipLine(pts[0], pts[1], g.xmin, g.xmax, g.ymin, g.ymax);
    line.setAttribute('d', c ? `M${g.px(c[0][0])} ${g.py(c[0][1])}L${g.px(c[1][0])} ${g.py(c[1][1])}` : '');
    handles.forEach((h, i) => { h.setAttribute('transform', `translate(${g.px(pts[i][0])},${g.py(pts[i][1])})`); h.setAttribute('aria-label', `Point ${'AB'[i]} at x ${fmtNum(pts[i][0])}, y ${fmtNum(pts[i][1])}. Arrow keys move it.`); });
  };
  const svg = $('stage');
  const pt = e => { const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(svg.getScreenCTM().inverse()); };
  const d = { pts, layer: Lr, line };
  const set = (i, x, y) => { pts[i] = clampP(x, y); draw(); (d.onChange || onChange)?.(d); };
  const handles = pts.map((p, i) => {
    const h = mk('g', { class: 'hit gdrag', tabindex: i === fixed ? -1 : 0, role: 'slider', transform: '' }, Lr);
    mk('circle', { class: 'ring', r: 24 }, h);
    mk('circle', { r: 11, fill: color, stroke: COL.chalk, 'stroke-width': 1.8, 'pointer-events': 'none' }, h);
    const tag = mk('text', { y: -22, 'text-anchor': 'middle', 'font-size': 20, 'font-weight': 700, fill: color, 'font-family': UI, 'pointer-events': 'none' }, h); tag.textContent = 'AB'[i];
    if (i !== fixed) {
      let drag = false;
      h.addEventListener('pointerdown', e => { e.preventDefault(); drag = true; h.setPointerCapture(e.pointerId); h.focus({ preventScroll: true }); });
      h.addEventListener('pointermove', e => { if (!drag) return; const q = pt(e), [x, y] = g.inv(q.x, q.y); set(i, x, y); });
      h.addEventListener('pointerup', () => { drag = false; });
      h.addEventListener('keydown', e => {
        const dx = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0, dy = e.key === 'ArrowUp' ? 1 : e.key === 'ArrowDown' ? -1 : 0;
        if (dx || dy) { e.preventDefault(); e.stopPropagation(); const s = snap || .25; set(i, pts[i][0] + dx * s, pts[i][1] + dy * s); }
        else if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); d.onEnter?.(); }
      });
    } else h.style.cursor = 'default';
    return h;
  });
  d.set = set;
  d.slope = () => { const dx = pts[1][0] - pts[0][0], dy = pts[1][1] - pts[0][1]; if (!dx) return null; const k = gcd(dx * 1000, dy * 1000) / 1000 || 1; return [Math.round(dy / k * 1000) / 1000, Math.round(dx / k * 1000) / 1000]; };
  d.intercept = () => { const s = d.slope(); if (!s) return null; return pts[0][1] - pts[0][0] * s[0] / s[1]; };
  d.on = (x, y) => { const dx = pts[1][0] - pts[0][0], dy = pts[1][1] - pts[0][1]; return Math.abs((y - pts[0][1]) * dx - (x - pts[0][0]) * dy) < 1e-9; };
  d.destroy = () => { line.remove(); handles.forEach(h => h.remove()); };
  draw();
  return d;
}

/* ============================================================
   Check builders for quiz(): same shape as choice() / pickMany() in engine.js, returned as (body, api) => ctl.
   The question id's first try is scored by the engine (SCORE[q.id]); every builder supports Show answer, keyboard, and survives
   a theme toggle (save/load).
   ============================================================ */

// pickPoints(g, o): click the right point(s) on the graph.
//   o.right        [[x, y], ...]  the points that are correct
//   o.candidates   [[x, y], ...]  the clickable points (default: every integer grid point in the plot)
//   o.multi        pick several then Check (default: right.length > 1). Single mode grades on the click.
//   o.yes          feedback when right (string or rich parts)
//   o.hints        [{ at: [x, y] | when: picked => bool, text }] first match wins; per-wrong-point and per-wrong-set hints.
//                  `text` is a STRING (a function(picked) -> string is tolerated); for a computed message use `miss` (string or fn).
//   o.miss         fallback text or fn(picked) -> text
//   o.plot         true (default): the right points pop onto the graph when answered (answer clock)
//   o.color        colour of the popped points
function pickPoints(g, o) {
  const right = o.right, multi = o.multi ?? right.length > 1;
  const cands = o.candidates || (() => { const a = []; for (let y = g.ymax; y >= g.ymin; y--) for (let x = g.xmin; x <= g.xmax; x++) a.push([x, y]); return a; })();
  const key = p => p[0] + ',' + p[1], want = new Set(right.map(key));
  return (body, api) => {
    const Lq = qlayer(), on = new Set();
    let locked = false, cur = 0;
    const rr = Math.min(26, Math.min(g.ux, g.uy) * .42);
    const count = multi ? h('p', 'picked') : null;
    const say$ = () => { if (count) count.textContent = `${on.size} point${on.size === 1 ? '' : 's'} picked`; };
    const hits = cands.map((p, i) => {
      const e = G(Lq, { x: g.px(p[0]), y: g.py(p[1]) });
      e.classList.add('hit'); if (multi) e.classList.add('many');
      e.setAttribute('tabindex', i === 0 ? 0 : -1); e.setAttribute('role', multi ? 'checkbox' : 'button');
      if (multi) e.setAttribute('aria-checked', 'false');
      e.setAttribute('aria-label', `The point x ${fmtNum(p[0])}, y ${fmtNum(p[1])}`);
      mk('circle', { class: 'ring', r: rr }, e);
      e._p = p;
      e.addEventListener('click', () => act(i));
      e.addEventListener('keydown', ev => {
        if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); ev.stopPropagation(); if (ev.key === 'Enter' && multi && !locked) ctl.check(); else act(i); }
      });
      return e;
    });
    const hintFor = picked => {
      for (const r of o.hints || []) {
        const txt = () => typeof r.text === 'function' ? r.text(picked) : r.text;   // a string (documented) or fn(picked) -> string
        if (r.at && picked.length === 1 && key(picked[0]) === key(r.at)) return txt();
        if (r.when && r.when(picked)) return txt();
      }
      return typeof o.miss === 'function' ? o.miss(picked) : (o.miss || 'Not that one. Look at the numbers along the axes again.');
    };
    const celebrate = () => { o.onRight?.(); if (o.plot !== false) g.points(right, 0, { run: fx, step: .25, color: o.color || COL.task, r: 9 }); };
    const act = i => {
      if (locked) return;
      setCur(i, false);
      const p = hits[i]._p;
      if (multi) {
        const k = i; hits[i].classList.remove('bad', 'good');
        if (on.has(k)) on.delete(k); else on.add(k);
        hits[i].classList.toggle('on', on.has(k)); hits[i].setAttribute('aria-checked', String(on.has(k))); say$();
      } else if (want.has(key(p))) { hits[i].classList.add('good'); celebrate(); api.grade(true, o.yes); }
      else { hits[i].classList.add('bad'); api.grade(false, hintFor([p])); }
    };
    const setCur = (i, focus = true) => { hits[cur].setAttribute('tabindex', -1); cur = i; hits[i].setAttribute('tabindex', 0); if (focus) hits[i].focus({ preventScroll: true }); };
    const near = (dx, dy) => {   // the candidate nearest in a direction (arrow keys move over the grid)
      const c = hits[cur]._p; let best = -1, bd = Infinity;
      cands.forEach((q, i) => {
        const vx = q[0] - c[0], vy = q[1] - c[1];
        if (!(vx * dx + vy * dy > 0) || (dx && Math.abs(vy) > Math.abs(vx)) || (dy && Math.abs(vx) > Math.abs(vy))) return;
        const dist = Math.hypot(vx, vy) + (dx ? Math.abs(vy) : Math.abs(vx)) * .01;
        if (dist < bd) { bd = dist; best = i; }
      });
      return best;
    };
    if (count) { body.append(count); say$(); }
    const ctl = {
      check: multi ? function () {
        const picked = [...on].map(i => cands[i]);
        const ok = picked.length === want.size && picked.every(p => want.has(key(p)));
        if (ok) { hits.forEach((e, i) => e.classList.toggle('good', on.has(i))); celebrate(); api.grade(true, o.yes); return; }
        hits.forEach((e, i) => { if (on.has(i) && !want.has(key(cands[i]))) e.classList.add('bad'); });
        api.grade(false, hintFor(picked));
      } : undefined,
      reveal() {
        const idx = cands.map((p, i) => want.has(key(p)) ? i : -1).filter(i => i >= 0);
        hits.forEach((e, i) => { const w = idx.includes(i); e.classList.toggle('good', w); if (multi) e.classList.toggle('on', w); e.classList.remove('bad'); });
        on.clear(); if (multi) idx.forEach(i => on.add(i)); say$(); celebrate();
        return o.yes;
      },
      lock() { locked = true; },
      save: () => [...on],
      load: v => { v.forEach(i => { if (hits[i]) { on.add(i); hits[i].classList.add('on'); hits[i].setAttribute('aria-checked', 'true'); } }); say$(); },
      keepHint: true,
      hint: multi ? ['Click the points, or ', kbd('←'), kbd('→'), kbd('↑'), kbd('↓'), ' move, ', kbd('Space'), ' pick, ', kbd('Enter'), ' check']
        : ['Click a point, or ', kbd('←'), kbd('→'), kbd('↑'), kbd('↓'), ' move and ', kbd('Space'), ' choose'],
      key(e) {
        if (locked) return false;
        const dx = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0, dy = e.key === 'ArrowUp' ? 1 : e.key === 'ArrowDown' ? -1 : 0;
        if (!dx && !dy) return false;
        const n = near(dx, dy); if (n >= 0) setCur(n);
        return true;
      },
    };
    return ctl;
  };
}

// drawLine(g, o): the student places the line by dragging two handles (or arrow keys), then Check.
//   o.answer  { m, b }  slope and intercept as numbers or strings ('2/3'); or o.through [[x, y], ...] points the line must hit
//   o.start   [[x0, y0], [x1, y1]] handle start positions;   o.fixed 0|1 pins a handle (a given point)
//   o.hints   [{ when: ({ m: [n, d] | null, b, p0, p1 }) => bool, text }]  first match wins;  o.miss fallback text or fn(state)
//   o.yes, o.onRight, o.color, o.snap (default 1)
function drawLine(g, o) {
  const ans = o.answer ? { m: rat(String(o.answer.m)), b: rat(String(o.answer.b)) } : null;
  return (body, api) => {
    let locked = false;
    const readout = o.readout ? h('p', 'picked') : null;   // off by default: it would give the slope away
    let d;
    const upd = () => { if (!readout || !d) return; const s = d.slope(); readout.textContent = s ? `slope ${s[1] === 1 ? fmtNum(s[0]) : fmtNum(s[0]) + '/' + s[1]}` : 'a vertical line'; };
    d = gdrag(g, { start: o.start || [[0, 0], [1, 1]], snap: o.snap ?? 1, fixed: o.fixed ?? -1, color: o.color || COL.task, onChange: upd });
    const stateOf = () => ({ m: d.slope(), b: d.intercept(), p0: d.pts[0], p1: d.pts[1] });
    d.onEnter = () => { if (!locked) ctl.check(); };
    if (readout) { body.append(readout); upd(); }
    const onLine = (x, y) => { const dx = d.pts[1][0] - d.pts[0][0], dy = d.pts[1][1] - d.pts[0][1]; return Math.abs((y - d.pts[0][1]) * dx - (x - d.pts[0][0]) * dy) < 1e-9; };
    const correct = () => {
      if (d.pts[0][0] === d.pts[1][0] && d.pts[0][1] === d.pts[1][1]) return false;
      if (o.through) return o.through.every(p => onLine(p[0], p[1]));
      const s = d.slope(); if (!s) return false;
      const [mn, md] = ans.m, [bn, bd] = ans.b;      // y = (mn/md) x + (bn/bd)
      return d.pts.every(p => Math.abs(p[1] - (mn / md * p[0] + bn / bd)) < 1e-9);
    };
    const celebrate = () => { o.onRight?.(); };
    const ctl = {
      check() {
        if (d.pts[0][0] === d.pts[1][0] && d.pts[0][1] === d.pts[1][1]) { api.grade(false, 'The two points are on top of each other. Move one apart to make a line.'); return; }
        if (correct()) { celebrate(); api.grade(true, o.yes); return; }
        const st2 = stateOf();
        for (const r of o.hints || []) if (r.when(st2)) { api.grade(false, r.text); return; }
        api.grade(false, typeof o.miss === 'function' ? o.miss(st2) : (o.miss || 'That line is not the one. Check where it crosses the y axis, then how much it rises for each step right.'));
      },
      reveal() {
        if (o.through) { const [a, b] = o.through; d.set(0, a[0], a[1]); d.set(1, b[0], b[1]); }
        else { const [mn, md] = ans.m, [bn, bd] = ans.b; const x1 = md; d.set(0, 0, bn / bd); d.set(1, x1, mn / md * x1 + bn / bd); }
        celebrate();
        return o.yes;
      },
      lock() { locked = true; d.layer.querySelectorAll('.gdrag').forEach(h => { h.setAttribute('tabindex', -1); h.style.pointerEvents = 'none'; }); },
      save: () => d.pts.map(p => p.slice()),
      load: v => { d.set(0, v[0][0], v[0][1]); d.set(1, v[1][0], v[1][1]); },
      hint: ['Drag the points, or Tab to one and use ', kbd('←'), kbd('→'), kbd('↑'), kbd('↓'), ', then ', kbd('Enter'), ' to check'],
      keepHint: true,
      key() { return false; },
    };
    requestAnimationFrame(() => { if (P.started) d.layer.querySelector('.gdrag[tabindex="0"]')?.focus({ preventScroll: true }); });
    return ctl;
  };
}

/* ============================================================
   Table-to-grid helper.
   tableXY(p, x, y, xs, ys, t0, opts) -> T : a two-row table (x over y), optionally a third "rate" row, drawn with the lesson's
   table(). The cells are real text, so plotTable() can fly each (x, y) pair onto a graph.
   opts: labels ['x', 'y'], colW, firstW, rowH, size, rates (add a row of change in y over change in x, hidden until showRates()), cellsHidden
   T = table() result plus: xs, ys, row(c) (the centre of column c's y cell), plot(g, t0, opts), showRates(t0, step).
   ============================================================ */
function tableXY(p, x, y, xs, ys, t0, { labels = ['x', 'y'], colW = 96, firstW = 110, rowH = 70, size = 32, rates = false, cellsHidden = false, o = 1, rateLabel = 'rate' } = {}) {
  const rows = [[labels[1], ...ys.map(minus)]];
  const rateVals = xs.slice(1).map((xv, i) => { const dy = ys[i + 1] - ys[i], dx = xv - xs[i], k = gcd(dy, dx) || 1; return dx / k === 1 ? minus(dy / k) : minus(dy / k) + '/' + dx / k; });
  if (rates) rows.push([rateLabel, '', ...rateVals]);
  const tbl = table(p, x, y, firstW, colW, rowH, [labels[0], ...xs.map(minus)], rows, t0, { size, o, cellsHidden });
  tbl.xs = xs; tbl.ys = ys; tbl.rateVals = rateVals;
  tbl.cellAt = c => [tbl.cx(c + 1), tbl.cy(1) - size * .3];
  tbl.plot = (g, t, opts) => plotTable(tbl, g, t, opts);
  tbl.showRates = (t, step = .5, run = tw) => {
    if (!rates) return;
    rateVals.forEach((_, i) => { const c = tbl.cells[2][i + 2]; run(c, { o: 1 }, t + i * step, .4); });
  };
  if (rates) tbl.cells[2].forEach((c, i) => { if (i > 1) put(c, { o: 0 }); });
  return tbl;
}
// plotTable(tbl, g, t0, opts): for each column, the pair pulses in the table, a dot lifts out of the y cell and flies to its
// place on the graph and lands as a real point. opts: step (s between pairs), fly (s of flight), color, r, run, cols (which
// columns, default all). Returns { els, end } like g.points.
function plotTable(tbl, g, t0, { step = .9, fly = .7, color = COL.task, r = 8, run = tw, cols } = {}) {
  const idx = cols || tbl.xs.map((_, i) => i), els = [];
  idx.forEach((c, k) => {
    const ts = t0 + k * step, [cx0, cy0] = tbl.cellAt(c), [gx, gy] = g.at(tbl.xs[c], tbl.ys[c]);
    [tbl.cells[0][c + 1], tbl.cells[1][c + 1]].forEach(cell => { run(cell, { s: 1.25 }, ts, .2, out); run(cell, { s: 1 }, ts + .2, .35); });
    const e = G(g.layers.pts, { x: cx0, y: cy0, s: 0, o: 0 });
    mk('circle', { r, fill: color, stroke: COL.chalk, 'stroke-width': 1.2 }, e);
    e._xy = [tbl.xs[c], tbl.ys[c]]; els.push(e);
    run(e, { s: 1, o: 1 }, ts + .25, .25);
    const tf = ts + .45;
    (run === tw ? prog : fxp)(q => put(e, { x: cx0 + (gx - cx0) * q, y: cy0 + (gy - cy0) * q - Math.sin(Math.PI * q) * 70 }), tf, fly, io);
  });
  return { els, end: t0 + (idx.length - 1) * step + .45 + fly };
}
