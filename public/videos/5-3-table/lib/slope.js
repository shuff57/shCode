// slope.js: the slope-triangle animation and its checks (IM1-2.2 LIB). Usable from lessons and from the explainer.
//   const T = slopeTri(g, { a: [0, 5], b: [1, 8] });  // legs drawn on graph g between two grid points
//   T.draw(t0)                                        // run leg, then rise leg, labels, end points
//   T.readout({ x, y, t0 })                           // "slope = 6/9 = 2/3", rebuilt after every resize
//   T.resize([0, 5], [3, 14], t0, 1.4)                // slide to another pair on the same line; the ratio stays 3
//   T.mirror(t0)                                      // flip the rise: a falling line with the same run
// Colour meaning (held across the 2.2 lesson and explainer): run = slate blue (COL.whole), rise = burnt orange (COL.task).
// Geometry is always a pure function of the beat clock (prog tweens), so seeking and replay draw the same picture.
// The pair (a, b) is kept ordered so the run is never negative; the sign of the slope lives in the rise.
// Frozen: do not edit per part. See LIB.md.
'use strict';

const slopeFmt = fmtNum;                                   // −6, 3, 2.5 (the default: decimals)
// opt-in (slopeTri option frac: true): −2/3 instead of −0.67 for a value that is a fraction with denominator <= 12
function slopeFmtFrac(v) {
  if (Number.isInteger(v)) return minus(v);
  for (let d = 2; d <= 12; d++) { const n = v * d; if (Math.abs(n - Math.round(n)) < 1e-6) return minus(Math.round(n)) + '/' + d; }
  return fmtNum(v);
}
// n/d reduced; null when d is 0. Integers are reduced; with frac: true a fractional pair is scaled to integers first (2/3 over 1 -> 2/3);
// otherwise (the default) a non-integer pair is returned unreduced, as before.
function slopeRatio(rise, run, frac = false) {
  if (run === 0) return null;
  if (!Number.isInteger(rise) || !Number.isInteger(run)) {
    if (!frac) return [rise, run];
    for (let k = 2; k <= 12; k++) if (Math.abs(rise * k - Math.round(rise * k)) < 1e-6 && Math.abs(run * k - Math.round(run * k)) < 1e-6) return slopeRatio(Math.round(rise * k), Math.round(run * k));
    return [rise, run];
  }
  const k = gcd(rise, run) || 1;
  return [rise / k, run / k];
}

/* slopeTri(g, opts) -> T
   opts: a, b        two grid points [x, y] (data units); the triangle's legs run a -> corner -> b
         corner      'run-first' (default: across, then up/down: corner (bx, ay)) or 'rise-first' (up/down, then across: corner (ax, by))
         t0          undefined: hidden, call T.draw(t); null: fully drawn now; number: draw starting then
         carrier     true: also draw the long line through a and b (it follows resizes and mirrors)
         words       true (default): "run 3" / "rise 2"; false: just the numbers
         labels      true (default) | false (no leg labels: small nested triangles) | { run: bool, rise: bool } (hide ONE leg label)
         frac        true: fractional rises/runs print as fractions (rise 2/3, readout slope = 2/3), not decimals (0.67). Default false.
         runLabel, riseLabel   [dx, dy] stage-px nudge for a leg label that would land on the axis numbers
         dots        true (default): end points a and b
         runColor, riseColor   override the colour meaning
   T has: root, a, b (the planned final pair), vals(), draw, resize, mirror, readout, fade, sideBoxes, outline, set. */
function slopeTri(g, o = {}) {
  const runColor = o.runColor || COL.whole, riseColor = o.riseColor || COL.task;
  const words = o.words !== false, dots = o.dots !== false, rf = o.corner === 'rise-first';
  const lb = o.labels && typeof o.labels === 'object' ? o.labels : { run: o.labels !== false, rise: o.labels !== false };
  const showRun = lb.run !== false, showRise = lb.rise !== false, showLabels = showRun || showRise;
  const FMT = o.frac ? slopeFmtFrac : slopeFmt;
  const norm = (a, b) => (a[0] > b[0] ? [b, a] : [a, b]);
  let [A0, B0] = norm(o.a, o.b);
  const T$ = { g, root: G(g.layers.tris), opts: o, end: { a: A0.slice(), b: B0.slice() } };
  const root = T$.root;
  // elements
  const carrier = o.carrier ? path(g.layers.lines, '', { stroke: o.carrierColor || COL.whole, 'stroke-width': 4 }, { d: o.t0 === null ? 1 : 0 }) : null;
  const runLeg = path(root, '', { stroke: runColor, 'stroke-width': 5 }, { d: o.t0 === null ? 1 : 0 });
  const riseLeg = path(root, '', { stroke: riseColor, 'stroke-width': 5 }, { d: o.t0 === null ? 1 : 0 });
  const ra = path(root, '', { stroke: COL.chalk, 'stroke-width': 2 }, { o: o.t0 === null ? 1 : 0 });
  const chev = [path(root, '', { stroke: runColor, 'stroke-width': 3.5 }, { o: o.t0 === null ? 1 : 0 }), path(root, '', { stroke: riseColor, 'stroke-width': 3.5 }, { o: o.t0 === null ? 1 : 0 })];
  const mkDot = c => { const e = G(root, { s: o.t0 === null ? 1 : 0, o: o.t0 === null ? 1 : 0 }); mk('circle', { r: 8, fill: c, stroke: COL.chalk, 'stroke-width': 1.5 }, e); return e; };
  const dA = dots ? mkDot(COL.chalk) : null, dB = dots ? mkDot(COL.chalk) : null;
  const lblG = G(root, { o: o.t0 === null ? 1 : 0 });
  const runT = showRun ? T(lblG, '', { size: 28, fill: runColor, weight: 700, font: MONO, anchor: 'middle' }) : null;
  const riseT = showRise ? T(lblG, '', { size: 28, fill: riseColor, weight: 700, font: MONO }) : null;
  T$.runLeg = runLeg; T$.riseLeg = riseLeg; T$.labels = lblG; T$.dots = [dA, dB]; T$.carrier = carrier;

  const cornerOf = (a, b) => rf ? [a[0], b[1]] : [b[0], a[1]];
  const vals = (a = T$.end.a, b = T$.end.b) => { const run = b[0] - a[0], rise = b[1] - a[1]; return { run, rise, ratio: slopeRatio(rise, run, !!o.frac) }; };
  T$.vals = vals;
  // Lay everything out for pair (a, b); `text` is the pair whose numbers the labels show (they differ while sliding).
  const layout = (a, b, text = b && { a, b }) => {
    const C = cornerOf(a, b), P = (p) => g.at(p[0], p[1]);
    const [ax, ay] = P(a), [bx, by] = P(b), [cx, cy] = P(C);
    // run leg (horizontal) and rise leg (vertical), each drawn from its start toward its end
    const hor = rf ? [[cx, cy], [bx, by]] : [[ax, ay], [cx, cy]], ver = rf ? [[ax, ay], [cx, cy]] : [[cx, cy], [bx, by]];
    runLeg.setAttribute('d', `M${hor[0][0]} ${hor[0][1]}L${hor[1][0]} ${hor[1][1]}`);
    riseLeg.setAttribute('d', `M${ver[0][0]} ${ver[0][1]}L${ver[1][0]} ${ver[1][1]}`);
    const sgn = Math.sign;
    // right-angle mark at the corner, between the two legs
    const du = [sgn(hor[0][0] - cx) || sgn(hor[1][0] - cx) || 1, 0], dv = [0, sgn(ver[0][1] - cy) || sgn(ver[1][1] - cy) || -1];
    const k = 12;
    ra.setAttribute('d', Math.abs(a[0] - b[0]) < 1e-6 || Math.abs(a[1] - b[1]) < 1e-6 ? '' : `M${cx + du[0] * k} ${cy}L${cx + du[0] * k} ${cy + dv[1] * k}L${cx} ${cy + dv[1] * k}`);
    // direction chevrons at 62% along each leg, pointing the way the leg is read (run: left to right; rise: toward b)
    const chevAt = (p, q, i) => {
      const x = p[0] + (q[0] - p[0]) * .62, y = p[1] + (q[1] - p[1]) * .62, L = Math.hypot(q[0] - p[0], q[1] - p[1]);
      if (L < 24) { chev[i].setAttribute('d', ''); return; }
      const ang = Math.atan2(q[1] - p[1], q[0] - p[0]), s = 11;
      chev[i].setAttribute('d', `M${x - s * Math.cos(ang - .55)} ${y - s * Math.sin(ang - .55)}L${x} ${y}L${x - s * Math.cos(ang + .55)} ${y - s * Math.sin(ang + .55)}`);
    };
    chevAt(rf ? [cx, cy] : [ax, ay], rf ? [bx, by] : [cx, cy], 0);       // run: read left to right
    chevAt(rf ? [ax, ay] : [cx, cy], rf ? [cx, cy] : [bx, by], 1);       // rise: toward b
    if (dA) put(dA, { x: ax, y: ay }); if (dB) put(dB, { x: bx, y: by });
    if (carrier) {
      const c = clipLine(a, b, g.xmin, g.xmax, g.ymin, g.ymax);
      carrier.setAttribute('d', c ? `M${g.px(c[0][0])} ${g.py(c[0][1])}L${g.px(c[1][0])} ${g.py(c[1][1])}` : '');
    }
    if (showLabels && text) {
      const v = vals(text.a, text.b);
      const rtxt = (words ? (o.riseWord ?? 'rise ') : '') + FMT(v.rise), ntxt = (words ? (o.runWord ?? 'run ') : '') + FMT(v.run);
      if (runT) runT.textContent = ntxt; if (riseT) riseT.textContent = rtxt;
      // outside the triangle: the run label on the side of its leg away from b; the rise label on the side away from a
      const hmid = [(hor[0][0] + hor[1][0]) / 2, (hor[0][1] + hor[1][1]) / 2], vmid = [(ver[0][0] + ver[1][0]) / 2, (ver[0][1] + ver[1][1]) / 2];
      const rising = text.b[1] >= text.a[1];
      const belowRun = rf ? !rising : rising;   // the run leg sits below the triangle (label below it) when the triangle is above it
      if (runT) put(runT, { x: hmid[0] + (o.runLabel ? o.runLabel[0] : 0), y: hmid[1] + (belowRun ? 38 : -16) + (o.runLabel ? o.runLabel[1] : 0) });
      const rightSide = rf ? false : true;     // run-first: the triangle is left of the rise leg, label on its right
      if (riseT) put(riseT, { x: vmid[0] + (rightSide ? 16 : -16) + (o.riseLabel ? o.riseLabel[0] : 0), y: vmid[1] + 10 + (o.riseLabel ? o.riseLabel[1] : 0) });
      if (riseT) riseT.setAttribute('text-anchor', rightSide ? 'start' : 'end');
    }
  };
  layout(A0, B0);
  T$.set = layout;

  const clockOf = run => (run === fx ? fxp : prog);
  const tweenTo = (e, to, t0, dur, run) => (run || tw)(e, to, t0, dur);

  // ---- draw the legs in: end point a, run leg, its label, right angle, rise leg, its label, end point b. Returns the end time.
  T$.draw = (t0, { dur = 1.5, run = tw } = {}) => {
    if (carrier) tweenTo(carrier, { d: 1 }, t0, dur * .5, run);
    if (dA) tweenTo(dA, { s: 1, o: 1 }, t0, .35, run);
    tweenTo(rf ? riseLeg : runLeg, { d: 1 }, t0 + .15, dur * .4, run);
    tweenTo(rf ? runLeg : riseLeg, { d: 1 }, t0 + .15 + dur * .5, dur * .4, run);
    tweenTo(chev[0], { o: 1 }, t0 + .15 + dur * .35, .3, run);
    tweenTo(chev[1], { o: 1 }, t0 + .15 + dur * .85, .3, run);
    tweenTo(ra, { o: 1 }, t0 + .15 + dur * .9, .3, run);
    if (dB) tweenTo(dB, { s: 1, o: 1 }, t0 + .15 + dur * .9, .35, run);
    tweenTo(lblG, { o: 1 }, t0 + dur * .85, .5, run);
    return t0 + .15 + dur * .9 + .5;
  };
  T$.fade = (t0, to = 0, dur = .5, run = tw) => { tweenTo(root, { o: to }, t0, dur, run); if (carrier) tweenTo(carrier, { o: to }, t0, dur, run); };

  // ---- readout: "slope = rise/run = reduced". Rebuilt (faded out, new faded in) after every resize.
  let ro = null, roCfg = null;
  const buildReadout = (a, b, cfg, t, run) => {
    const v = vals(a, b), { x = 1000, y = 200, size = 56, anchor = 'start', delay = .9 } = cfg;
    const grp = G(cfg.parent || root, { o: 1 });
    const oneRun = o.frac && v.run === 1;          // frac mode: a run of 1 reads "slope = 2/3", not "2/3 over 1"
    const raw = v.run === 0 ? [(cfg.label ?? 'slope = '), 'undefined'] : oneRun ? [(cfg.label ?? 'slope = '), FMT(v.rise)] : [(cfg.label ?? 'slope = '), F(FMT(v.rise), FMT(v.run))];
    const red = !oneRun && v.ratio && (v.ratio[0] !== v.rise || v.ratio[1] !== v.run)
      ? [' = ', v.ratio[1] === 1 ? FMT(v.ratio[0]) : F(FMT(v.ratio[0]), FMT(v.ratio[1]))] : null;
    const w1 = mathW(raw, size), w2 = red ? mathW(red, size) : 0, total = w1 + w2;
    const x0 = anchor === 'middle' ? x - total / 2 : anchor === 'end' ? x - total : x;
    const m1 = M(grp, raw, { x: x0, y, size, anchor: 'start', o: 0 });
    const m2 = red ? M(grp, red, { x: x0 + w1, y, size, anchor: 'start', o: 0 }) : null;
    const rec = { g: grp, m1, m2, delay };
    if (t === null) { put(m1, { o: 1 }); if (m2) put(m2, { o: 1 }); }
    else { tweenTo(m1, { o: 1 }, t, .5, run); if (m2) tweenTo(m2, { o: 1 }, t + delay, .5, run); }
    return rec;
  };
  // Show the readout (it is rebuilt for each resize). cfg: x, y, size, anchor ('start'|'middle'|'end'), delay (s before "= reduced"), parent, label, t0.
  T$.readout = (cfg = {}) => {
    roCfg = cfg;
    ro = buildReadout(T$.end.a, T$.end.b, cfg, cfg.t0 ?? 0, cfg.run || tw);
    return T$;
  };
  T$.hideReadout = (t0, run = tw) => { if (ro) { tweenTo(ro.g, { o: 0 }, t0, .4, run); ro = null; roCfg = null; } };

  // ---- resize: slide a and b to a2, b2 over dur seconds, starting at t0. The labels dip and change at the midpoint; the
  // readout is replaced when the slide ends. Both pairs should lie on the same line if the ratio is to stay fixed.
  T$.resize = (a2, b2, t0, dur = 1.4, { run = tw } = {}) => {
    const [na, nb] = norm(a2, b2), from = { a: T$.end.a.slice(), b: T$.end.b.slice() };
    const lerp = (p, q, u) => [p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u];
    clockOf(run)(q => {
      const u = io(q);
      layout(lerp(from.a, na, u), lerp(from.b, nb, u), q < .5 ? from : { a: na, b: nb });
      put(lblG, { o: q >= 1 ? 1 : Math.abs(2 * q - 1) });   // labels dip while the numbers change at the midpoint
    }, t0, dur, lin);
    if (ro) {
      tweenTo(ro.g, { o: 0 }, t0, .4, run);
      ro = buildReadout(na, nb, roCfg, t0 + dur, run);
    }
    T$.end = { a: na.slice(), b: nb.slice() };
    return t0 + dur;
  };
  // ---- mirror: keep the run, negate the rise (a rising line becomes a falling one). The rise leg swings through the run leg.
  T$.mirror = (t0, dur = 1.6, opts) => {
    const { a, b } = T$.end;
    return T$.resize(a, [b[0], 2 * a[1] - b[1]], t0, dur, opts);
  };

  // ---- geometry for checks (stage px, from the planned final pair)
  T$.outline = () => { const { a, b } = T$.end, C = cornerOf(a, b); return [g.at(...a), g.at(...C), g.at(...b)]; };
  T$.sideBoxes = () => {
    const [A, C, B] = T$.outline();
    const hor = rf ? [C, B] : [A, C], ver = rf ? [A, C] : [C, B];
    const box = (p, q, pad = 16) => [Math.min(p[0], q[0]) - pad, Math.min(p[1], q[1]) - pad, Math.abs(p[0] - q[0]) + 2 * pad, Math.abs(p[1] - q[1]) + 2 * pad];
    return { run: { a: hor[0], b: hor[1], el: runLeg, label: 'the horizontal side' }, rise: { a: ver[0], b: ver[1], el: riseLeg, label: 'the vertical side' },
      hyp: { a: A, b: B, el: carrier || runLeg, label: 'the slanted side' }, box };
  };
  return T$;
}

/* slopeTris(g, specs, opts) -> [T, ...]: several static (fully drawn) triangles, for a picker. specs: [{ a, b, corner?, color? }].
   opts: words (default false), labels (default false). pickTriangle() makes the smallest one win a click where they overlap. */
function slopeTris(g, specs, { words = false, labels = false, carrier = false } = {}) {
  return specs.map(sp => slopeTri(g, { ...sp, t0: null, words, labels, carrier, runColor: sp.color, riseColor: sp.color }));
}

/* ---------- checks ---------- */
// A pick-a-side hit group: a wide invisible stroke along p -> q (or a polygon), with a ring that shows on hover and focus.
function sideHit(Lq, d, label, fillIt) {
  const e = G(Lq); e.classList.add('hit');
  e.setAttribute('tabindex', 0); e.setAttribute('role', 'button'); e.setAttribute('aria-label', label);
  const r = mk('path', { class: 'ring', d, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, e);
  r.style.strokeWidth = fillIt ? '4px' : '16px';
  if (!fillIt) r.style.fill = 'none';
  return e;
}

// riseSideCheck(T, o): "which side is the rise?" Click one of the triangle's three sides.
//   o.right 'rise' (default) | 'run' | 'hyp';  o.yes; o.hints { run, rise, hyp } texts for a wrong click; o.onRight
function riseSideCheck(T$, o = {}) {
  const right = o.right || 'rise', sb = T$.sideBoxes();
  const names = ['run', 'rise', 'hyp'];
  const dflt = { run: 'That is the run: it goes across. The rise is the up-or-down side.', hyp: 'The slanted side is the line itself. The rise is the vertical side.', rise: 'Yes, that one.' };
  const yes = o.yes ?? 'The rise is the vertical side: how far the line goes up or down between the two points.';
  return (body, api) => {
    const Lq = qlayer();
    let locked = false, cur = -1;
    const hits = names.map(n => {
      const s = sb[n], e = sideHit(Lq, `M${s.a[0]} ${s.a[1]}L${s.b[0]} ${s.b[1]}`, s.label);
      e._n = n;
      const act = () => {
        if (locked) return;
        if (n === right) { e.classList.add('good'); o.onRight?.(); api.grade(true, yes); }
        else { e.classList.add('bad'); shakeFx(s.el); api.grade(false, (o.hints || {})[n] || dflt[n]); }
      };
      e.addEventListener('click', act); keyAct(e, act);
      return e;
    });
    return {
      reveal() { hits[names.indexOf(right)].classList.add('good'); o.onRight?.(); return yes; },
      lock() { locked = true; hits.forEach(e => e.setAttribute('tabindex', -1)); },
      // theme toggle: remember the sides already tried (the red marks) and the keyboard cursor
      save: () => ({ bad: hits.map((e, i) => e.classList.contains('bad') ? i : -1).filter(i => i >= 0), cur }),
      load(v) { v.bad.forEach(i => hits[i]?.classList.add('bad')); if (v.cur >= 0) cur = v.cur; },
      hint: [kbd('←'), kbd('→'), ' move, ', kbd('Enter'), ' choose, or click a side'],
      key(e) {
        const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
        if (!d || locked) return false;
        cur = cur < 0 ? (d > 0 ? 0 : hits.length - 1) : (cur + d + hits.length) % hits.length;
        hits[cur].focus(); return true;
      },
    };
  };
}

// pickTriangle(tris, right, yes, no, onRight): click the triangle that is a slope triangle for the line (or whichever you ask).
//   tris: the array from slopeTris(); right: its index; no: fn(i) -> text, or an array of texts (null for the right one).
function pickTriangle(tris, right, yes, no, onRight) {
  return (body, api) => {
    const Lq = qlayer();
    let locked = false, cur = -1;
    const area = t => { const [A, C, B] = t.outline(); return Math.abs((A[0] - C[0]) * (B[1] - C[1])) / 2; };
    const order = tris.map((t, i) => i).sort((p, q) => area(tris[q]) - area(tris[p]));   // largest first: the smallest ends on top
    const hits = [];
    order.forEach(i => {
      const [A, C, B] = tris[i].outline();
      const e = sideHit(Lq, `M${A[0]} ${A[1]}L${C[0]} ${C[1]}L${B[0]} ${B[1]}Z`, `Triangle ${i + 1}`, true);
      const act = () => {
        if (locked) return;
        if (i === right) { e.classList.add('good'); onRight?.(); api.grade(true, yes); }
        else { e.classList.add('bad'); shakeFx(tris[i].root); api.grade(false, typeof no === 'function' ? no(i) : (no || [])[i]); }
      };
      e.addEventListener('click', act); keyAct(e, act);
      hits[i] = e;
    });
    return {
      reveal() { hits[right].classList.add('good'); onRight?.(); return yes; },
      lock() { locked = true; hits.forEach(e => e.setAttribute('tabindex', -1)); },
      save: () => ({ bad: hits.map((e, i) => e && e.classList.contains('bad') ? i : -1).filter(i => i >= 0), cur }),
      load(v) { v.bad.forEach(i => hits[i]?.classList.add('bad')); if (v.cur >= 0) cur = v.cur; },
      hint: [kbd('←'), kbd('→'), ' move, ', kbd('Enter'), ' choose, or click a triangle'],
      key(e) {
        const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
        if (!d || locked) return false;
        cur = cur < 0 ? (d > 0 ? 0 : hits.length - 1) : (cur + d + hits.length) % hits.length;
        hits[cur].focus(); return true;
      },
    };
  };
}
