var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// ../../sketch/dist/least-squares.js
function solveLinear(A, b) {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let best = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(M[row][col]) > Math.abs(M[best][col]))
        best = row;
    }
    if (Math.abs(M[best][col]) < 1e-12)
      return null;
    if (best !== col) {
      const t = M[best];
      M[best] = M[col];
      M[col] = t;
    }
    const pivot = M[col][col];
    for (let row = col + 1; row < n; row++) {
      const f = M[row][col] / pivot;
      if (f === 0)
        continue;
      for (let k = col; k <= n; k++)
        M[row][k] -= f * M[col][k];
    }
  }
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = M[i][n];
    for (let j = i + 1; j < n; j++)
      s -= M[i][j] * x[j];
    x[i] = s / M[i][i];
  }
  return x.every((v) => Number.isFinite(v)) ? x : null;
}
var sumSquares = (r) => r.reduce((a, v) => a + v * v, 0);
var worstOf = (r) => r.reduce((a, v) => Math.max(a, Math.abs(v)), 0);
function leastSquares(start, residuals2, options = {}) {
  const tolerance = options.tolerance ?? 1e-6;
  const maxIterations = options.maxIterations ?? 100;
  const epsilon = options.epsilon ?? 1e-6;
  const primary = options.primaryCount;
  const judged = (r2) => primary === void 0 ? r2 : r2.slice(0, primary);
  const n = start.length;
  let x = [...start];
  let r = residuals2(x);
  const m = r.length;
  if (n === 0 || m === 0) {
    return { x, worst: worstOf(judged(r)), iterations: 0, unsatisfied: worstOf(judged(r)) > tolerance };
  }
  let lambda = 1e-3;
  let cost = sumSquares(r);
  let iterations = 0;
  for (let step = 0; step < maxIterations; step++) {
    if (worstOf(judged(r)) <= tolerance)
      break;
    const J = [];
    for (let i = 0; i < m; i++)
      J.push(new Array(n).fill(0));
    for (let j = 0; j < n; j++) {
      const bump = epsilon * Math.max(1, Math.abs(x[j]));
      const up2 = [...x];
      const down2 = [...x];
      up2[j] += bump;
      down2[j] -= bump;
      const ru = residuals2(up2);
      const rd = residuals2(down2);
      for (let i = 0; i < m; i++)
        J[i][j] = (ru[i] - rd[i]) / (2 * bump);
    }
    const JtJ = [];
    for (let a = 0; a < n; a++) {
      JtJ.push(new Array(n).fill(0));
      for (let b = 0; b < n; b++) {
        let s = 0;
        for (let i = 0; i < m; i++)
          s += J[i][a] * J[i][b];
        JtJ[a][b] = s;
      }
    }
    const Jtr = new Array(n).fill(0);
    for (let a = 0; a < n; a++) {
      let s = 0;
      for (let i = 0; i < m; i++)
        s += J[i][a] * r[i];
      Jtr[a] = s;
    }
    const maxDiag = JtJ.reduce((worst2, row, i) => Math.max(worst2, row[i]), 0);
    const floor = Math.max(1e-12, maxDiag * 1e-6);
    let accepted = false;
    for (let attempt = 0; attempt < 12; attempt++) {
      const A = JtJ.map((row, a) => row.map((v, b) => (
        // Damping scaled by the diagonal, not added flat: a sketch measured in
        // millimetres and one measured in metres should behave the same, and a
        // flat lambda makes them behave differently.
        a === b ? v + lambda * Math.max(v, floor) : v
      )));
      const delta = solveLinear(A, Jtr.map((v) => -v));
      if (delta) {
        const candidate = x.map((v, i) => v + delta[i]);
        if (candidate.every(Number.isFinite)) {
          const rc = residuals2(candidate);
          const costC = sumSquares(rc);
          if (costC < cost) {
            x = candidate;
            r = rc;
            cost = costC;
            lambda = Math.max(lambda * 0.3, 1e-12);
            accepted = true;
            iterations++;
            break;
          }
        }
      }
      lambda *= 10;
      if (lambda > 1e12)
        break;
    }
    if (!accepted)
      break;
  }
  const worst = worstOf(judged(r));
  return { x, worst, iterations, unsatisfied: worst > tolerance };
}

// ../../sketch/dist/sketch-solve.js
function indexesCorners(c) {
  return c.kind === "lock" || c.kind === "distanceX" || c.kind === "distanceY" || c.kind === "symmetric";
}
function cornersOf(c) {
  if (c.kind === "lock")
    return [c.corner];
  if (c.kind === "symmetric")
    return [c.a, c.b, c.center];
  return [c.a, c.b];
}
function edgeCorners(n, count) {
  return [(n % count + count) % count, ((n + 1) % count + count) % count];
}
function edgeLength(pts, n) {
  const [a, b] = edgeCorners(n, pts.length);
  return Math.hypot(pts[b][0] - pts[a][0], pts[b][1] - pts[a][1]);
}
function edgeAngle(pts, n, count) {
  const [a, b] = edgeCorners(n, count);
  const dx = pts[b][0] - pts[a][0];
  const dy = pts[b][1] - pts[a][1];
  if (Math.hypot(dx, dy) < 1e-9)
    return null;
  return Math.atan2(dy, dx);
}
function solveSketch(input, constraints, pinned = []) {
  const pts = input.map((p) => [p[0], p[1]]);
  const n = pts.length;
  if (n < 2 || constraints.length === 0) {
    return { points: pts, residual: 0, iterations: 0, overConstrained: false };
  }
  const fixed = /* @__PURE__ */ new Set();
  const wrap = (i) => (i % n + n) % n;
  for (const p of pinned)
    fixed.add(wrap(p));
  for (const c of constraints)
    if (c.kind === "lock")
      fixed.add(wrap(c.corner));
  const flat = [];
  for (const p of pts)
    flat.push(p[0], p[1]);
  const free2 = [];
  for (let i = 0; i < n; i++) {
    if (fixed.has(i))
      continue;
    free2.push(2 * i, 2 * i + 1);
  }
  const expand = (x) => {
    const all = flat.slice();
    for (let j = 0; j < free2.length; j++)
      all[free2[j]] = x[j];
    const out = [];
    for (let i = 0; i < n; i++)
      out.push([all[2 * i], all[2 * i + 1]]);
    return out;
  };
  const startScale = sketchScale(pts);
  const HOME_PULL = 1e-3;
  const home = free2.map((k) => flat[k]);
  const rules = (x) => residualsOf(expand(x), constraints, startScale);
  const runPass = (start) => {
    const guided = leastSquares(start, (x) => {
      const r = rules(x);
      for (let j = 0; j < x.length; j++)
        r.push(HOME_PULL * (x[j] - start[j]));
      return r;
    }, { tolerance: 1e-6, maxIterations: 200, primaryCount: constraints.length });
    return leastSquares(guided.x, rules, { tolerance: 1e-9, maxIterations: 300 });
  };
  const hasZeroLengthEdge = Array.from({ length: n }, (_, i) => edgeLength(pts, i)).some((len8) => len8 < 1e-9);
  let fit = runPass(home);
  let best = residualOf(expand(fit.x), constraints);
  if (best > 1e-3 && !hasZeroLengthEdge) {
    const scale2 = startScale;
    let seed = 99491872;
    const rand = () => {
      seed = seed + 1831565813 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
    for (let trial = 0; trial < 6 && best > 1e-3; trial++) {
      const jittered = home.map((v) => v + (rand() - 0.5) * scale2 * 0.3);
      const candidate = runPass(jittered);
      const residualHere = residualOf(expand(candidate.x), constraints);
      if (residualHere < best) {
        fit = candidate;
        best = residualHere;
      }
    }
  }
  const points = expand(fit.x);
  const residual = residualOf(points, constraints);
  return { points, residual, iterations: fit.iterations, overConstrained: residual > 1e-3 };
}
function residualsOf(pts, constraints, scaleOverride) {
  const n = pts.length;
  const scale2 = scaleOverride ?? sketchScale(pts);
  return constraints.map((c) => {
    if (c.kind === "lock")
      return 0;
    if (c.kind === "horizontal" || c.kind === "vertical") {
      const axis = c.kind === "horizontal" ? 1 : 0;
      const [a, b] = edgeCorners(c.edge, n);
      return Math.abs(pts[b][axis] - pts[a][axis]);
    }
    if (c.kind === "length")
      return Math.abs(edgeLength(pts, c.edge) - c.value);
    if (c.kind === "distanceX")
      return Math.abs(pts[c.b][0] - pts[c.a][0] - c.value);
    if (c.kind === "distanceY")
      return Math.abs(pts[c.b][1] - pts[c.a][1] - c.value);
    if (c.kind === "symmetric") {
      const mx = (pts[c.a][0] + pts[c.b][0]) / 2 - pts[c.center][0];
      const my = (pts[c.a][1] + pts[c.b][1]) / 2 - pts[c.center][1];
      return Math.max(Math.abs(mx), Math.abs(my));
    }
    if (c.kind === "angle") {
      const [a0, a1] = edgeCorners(c.edge, n);
      const [b0, b1] = edgeCorners(c.other, n);
      const ax = pts[a1][0] - pts[a0][0], ay = pts[a1][1] - pts[a0][1];
      const bx = pts[b1][0] - pts[b0][0], by = pts[b1][1] - pts[b0][1];
      const la = Math.hypot(ax, ay), lb = Math.hypot(bx, by);
      if (la < 1e-9 || lb < 1e-9)
        return scale2;
      const dot10 = (ax * bx + ay * by) / (la * lb);
      const cross9 = (ax * by - ay * bx) / (la * lb);
      const turn = Math.atan2(cross9, dot10);
      let want = c.degrees * Math.PI / 180 % (2 * Math.PI);
      if (want > Math.PI)
        want -= 2 * Math.PI;
      if (want <= -Math.PI)
        want += 2 * Math.PI;
      const diff = Math.abs(turn - want);
      const wrapped2 = Math.min(diff, Math.abs(diff - 2 * Math.PI));
      return wrapped2 / (2 * Math.PI) * scale2;
    }
    return residualOfPair(pts, c, n, scale2);
  });
}
function sketchScale(pts) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of pts) {
    if (p[0] < minX)
      minX = p[0];
    if (p[0] > maxX)
      maxX = p[0];
    if (p[1] < minY)
      minY = p[1];
    if (p[1] > maxY)
      maxY = p[1];
  }
  const d = Math.hypot(maxX - minX, maxY - minY);
  return Number.isFinite(d) && d > 1e-9 ? d : 1;
}
function residualOfPair(pts, c, n, scale2) {
  if (c.kind === "equal") {
    return Math.abs(edgeLength(pts, c.edge) - edgeLength(pts, c.other));
  }
  const angleA = edgeAngle(pts, c.edge, n);
  const angleB = edgeAngle(pts, c.other, n);
  if (angleA === null || angleB === null)
    return 0;
  const target = c.kind === "perpendicular" ? Math.PI / 2 : 0;
  let diff = (angleB - angleA - target) % Math.PI;
  if (diff > Math.PI / 2)
    diff -= Math.PI;
  if (diff <= -Math.PI / 2)
    diff += Math.PI;
  return Math.abs(diff) * scale2;
}
function residualOf(pts, constraints) {
  let worst = 0;
  for (const r of residualsOf(pts, constraints))
    worst = Math.max(worst, r);
  return worst;
}
function polygonArea(pts) {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a) / 2;
}
var COLLAPSE_RATIO = 0.25;
function collapsedByRatio(before, after) {
  const n = before.length;
  if (n !== after.length || n < 3)
    return false;
  for (let i = 0; i < n; i++) {
    const b = edgeLength(before, i);
    if (b < 1e-9)
      continue;
    if (edgeLength(after, i) < b * COLLAPSE_RATIO)
      return true;
  }
  const areaBefore = polygonArea(before);
  if (areaBefore < 1e-9)
    return false;
  return polygonArea(after) < areaBefore * COLLAPSE_RATIO;
}
function fewestMoversSeed(pts, edge, other, kind, count) {
  const seed = pts.map((p) => [p[0], p[1]]);
  const angleA = edgeAngle(pts, edge, count);
  if (angleA === null)
    return seed;
  const [a1, a2] = edgeCorners(edge, count);
  const [b1, b2] = edgeCorners(other, count);
  const shared = [b1, b2].find((c) => c === a1 || c === a2);
  const pivot = shared !== void 0 ? pts[shared] : [(pts[b1][0] + pts[b2][0]) / 2, (pts[b1][1] + pts[b2][1]) / 2];
  if (kind === "equal") {
    const lenA = edgeLength(pts, edge);
    const lenB = edgeLength(pts, other);
    if (lenB < 1e-9)
      return seed;
    const scale2 = lenA / lenB;
    for (const c of [b1, b2]) {
      if (c === shared)
        continue;
      seed[c] = [
        pivot[0] + (pts[c][0] - pivot[0]) * scale2,
        pivot[1] + (pts[c][1] - pivot[1]) * scale2
      ];
    }
    return seed;
  }
  const angleB = edgeAngle(pts, other, count);
  if (angleB === null)
    return seed;
  const target = kind === "perpendicular" ? angleA + Math.PI / 2 : angleA;
  let rotate = (target - angleB) % Math.PI;
  if (rotate > Math.PI / 2)
    rotate -= Math.PI;
  if (rotate <= -Math.PI / 2)
    rotate += Math.PI;
  const cos = Math.cos(rotate);
  const sin = Math.sin(rotate);
  for (const c of [b1, b2]) {
    if (c === shared)
      continue;
    const dx = pts[c][0] - pivot[0];
    const dy = pts[c][1] - pivot[1];
    seed[c] = [pivot[0] + dx * cos - dy * sin, pivot[1] + dx * sin + dy * cos];
  }
  return seed;
}
function seedForNewRule(points, constraints) {
  const added = constraints[constraints.length - 1];
  if (!added)
    return points;
  if (added.kind !== "parallel" && added.kind !== "perpendicular" && added.kind !== "equal") {
    return points;
  }
  return fewestMoversSeed(points, added.edge, added.other, added.kind, points.length);
}

// ../../sketch/dist/sketch-arc.js
var sketch_arc_exports = {};
__export(sketch_arc_exports, {
  arcFromBulge: () => arcFromBulge,
  bowEdge: () => bowEdge,
  bowOf: () => bowOf,
  bulgeFromBow: () => bulgeFromBow,
  chamferCorner: () => chamferCorner,
  circleOf: () => circleOf,
  filletCorner: () => filletCorner,
  maxBow: () => maxBow,
  maxChamferDistance: () => maxChamferDistance,
  maxFilletRadius: () => maxFilletRadius,
  outlineOf: () => outlineOf,
  reindex: () => reindex,
  removeCorner: () => removeCorner,
  segmentRoles: () => segmentRoles,
  splitEdge: () => splitEdge,
  tessellate: () => tessellate,
  whyCannotBowEdge: () => whyCannotBowEdge,
  whyCannotChamferCorner: () => whyCannotChamferCorner,
  whyCannotRemoveCorner: () => whyCannotRemoveCorner,
  whyCannotRoundCorner: () => whyCannotRoundCorner,
  whyRemovingCornerCosts: () => whyRemovingCornerCosts
});
function arcFromBulge(a, b, bulge) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const d = Math.hypot(dx, dy);
  const radius = d * (1 + bulge * bulge) / (4 * Math.abs(bulge));
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  const ux = dx / d;
  const uy = dy / d;
  const px = -uy;
  const py = ux;
  const half = d / 2;
  const toCentre = Math.sqrt(Math.max(0, radius * radius - half * half));
  const sign = (bulge >= 0 ? 1 : -1) * (Math.abs(bulge) > 1 ? -1 : 1);
  const center = [mx + px * toCentre * sign, my + py * toCentre * sign];
  const startAngle = Math.atan2(a[1] - center[1], a[0] - center[0]);
  const endAngle = Math.atan2(b[1] - center[1], b[0] - center[0]);
  return { center, radius, startAngle, endAngle };
}
function signedSweep(startAngle, endAngle, bulge) {
  let sweep = endAngle - startAngle;
  if (bulge > 0 && sweep < 0)
    sweep += Math.PI * 2;
  if (bulge < 0 && sweep > 0)
    sweep -= Math.PI * 2;
  return sweep;
}
function circleOf(f) {
  if (f.shape !== "circle")
    return null;
  const [a, b] = f.points;
  if (!a || !b)
    return null;
  return {
    center: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2],
    radius: Math.hypot(b[0] - a[0], b[1] - a[1]) / 2
  };
}
var STRAIGHT_TOL = 1e-6;
function maxFilletRadius(points, corner, bulges) {
  const n = points.length;
  if (bulges && (bulges[(corner - 1 + n) % n] || bulges[corner]))
    return 0;
  const prev = points[(corner - 1 + n) % n];
  const c = points[corner];
  const next = points[(corner + 1) % n];
  const lenIn = Math.hypot(c[0] - prev[0], c[1] - prev[1]);
  const lenOut = Math.hypot(next[0] - c[0], next[1] - c[1]);
  if (lenIn === 0 || lenOut === 0)
    return 0;
  const vIn = [prev[0] - c[0], prev[1] - c[1]];
  const vOut = [next[0] - c[0], next[1] - c[1]];
  const cosInterior = (vIn[0] * vOut[0] + vIn[1] * vOut[1]) / (lenIn * lenOut);
  const interior = Math.acos(Math.max(-1, Math.min(1, cosInterior)));
  if (Math.PI - interior < STRAIGHT_TOL)
    return 0;
  return Math.min(lenIn, lenOut) / 2 * Math.tan(interior / 2);
}
function whyCannotRoundCorner(points, corner, bulges) {
  if (maxFilletRadius(points, corner, bulges) > 0)
    return null;
  const n = points.length;
  if (bulges && (bulges[(corner - 1 + n) % n] || bulges[corner])) {
    return "One of the two edges at this corner is already a curve, and shCode can only round a corner where both of its edges are straight.";
  }
  const prev = points[(corner - 1 + n) % n];
  const c = points[corner];
  const next = points[(corner + 1) % n];
  const lenIn = Math.hypot(c[0] - prev[0], c[1] - prev[1]);
  const lenOut = Math.hypot(next[0] - c[0], next[1] - c[1]);
  if (lenIn === 0 || lenOut === 0) {
    return "Two corners of this sketch are sitting on top of each other, so one of the edges here has no length at all. Drag them apart first.";
  }
  if (lenIn > 0 && lenOut > 0) {
    const cosInterior = ((prev[0] - c[0]) * (next[0] - c[0]) + (prev[1] - c[1]) * (next[1] - c[1])) / (lenIn * lenOut);
    const interior = Math.acos(Math.max(-1, Math.min(1, cosInterior)));
    if (Math.PI - interior < STRAIGHT_TOL) {
      return "This corner is straight -- both of its edges run in one line, so there is no corner sticking out to round off. Drag the corner away from that line first.";
    }
  }
  return "This corner is too sharp to round -- its two edges nearly double back on each other. Drag it into a wider angle first.";
}
function maxChamferDistance(points, corner, bulges) {
  const n = points.length;
  if (bulges && (bulges[(corner - 1 + n) % n] || bulges[corner]))
    return 0;
  const prev = points[(corner - 1 + n) % n];
  const c = points[corner];
  const next = points[(corner + 1) % n];
  const lenIn = Math.hypot(c[0] - prev[0], c[1] - prev[1]);
  const lenOut = Math.hypot(next[0] - c[0], next[1] - c[1]);
  if (lenIn === 0 || lenOut === 0)
    return 0;
  const vIn = [prev[0] - c[0], prev[1] - c[1]];
  const vOut = [next[0] - c[0], next[1] - c[1]];
  const cosInterior = (vIn[0] * vOut[0] + vIn[1] * vOut[1]) / (lenIn * lenOut);
  const interior = Math.acos(Math.max(-1, Math.min(1, cosInterior)));
  if (Math.PI - interior < STRAIGHT_TOL)
    return 0;
  return Math.min(lenIn, lenOut);
}
function whyCannotChamferCorner(points, corner, bulges) {
  if (maxChamferDistance(points, corner, bulges) > 0)
    return null;
  const n = points.length;
  if (bulges && (bulges[(corner - 1 + n) % n] || bulges[corner])) {
    return "One of the two edges at this corner is already a curve, and shCode can only chamfer a corner where both of its edges are straight.";
  }
  const prev = points[(corner - 1 + n) % n];
  const c = points[corner];
  const next = points[(corner + 1) % n];
  const lenIn = Math.hypot(c[0] - prev[0], c[1] - prev[1]);
  const lenOut = Math.hypot(next[0] - c[0], next[1] - c[1]);
  if (lenIn === 0 || lenOut === 0) {
    return "Two corners of this sketch are sitting on top of each other, so one of the edges here has no length at all. Drag them apart first.";
  }
  if (lenIn > 0 && lenOut > 0) {
    const cosInterior = ((prev[0] - c[0]) * (next[0] - c[0]) + (prev[1] - c[1]) * (next[1] - c[1])) / (lenIn * lenOut);
    const interior = Math.acos(Math.max(-1, Math.min(1, cosInterior)));
    if (Math.PI - interior < STRAIGHT_TOL) {
      return "This corner is straight -- both of its edges run in one line, so there is no corner sticking out to chamfer off. Drag the corner away from that line first.";
    }
  }
  return "This corner is too sharp to chamfer -- its two edges nearly double back on each other. Drag it into a wider angle first.";
}
function reindex(f, insertedAt) {
  const shiftCorner = (c) => c > insertedAt ? c + 1 : c;
  const shiftEdge = (e) => e > insertedAt ? e + 1 : e;
  const constraints = f.constraints?.map((c) => {
    if (indexesCorners(c)) {
      if (c.kind === "lock")
        return { ...c, corner: shiftCorner(c.corner) };
      if (c.kind === "symmetric") {
        return { ...c, a: shiftCorner(c.a), b: shiftCorner(c.b), center: shiftCorner(c.center) };
      }
      return { ...c, a: shiftCorner(c.a), b: shiftCorner(c.b) };
    }
    if (c.kind === "equal")
      return { ...c, edge: shiftEdge(c.edge), other: shiftEdge(c.other) };
    return { ...c, edge: shiftEdge(c.edge) };
  });
  const bulges = f.bulges ? Object.fromEntries(Object.entries(f.bulges).map(([k, v]) => [shiftEdge(Number(k)), v])) : f.bulges;
  const rounds = f.rounds ? Object.fromEntries(Object.entries(f.rounds).map(([k, v]) => [shiftCorner(Number(k)), v])) : f.rounds;
  const chamfers = f.chamfers ? Object.fromEntries(Object.entries(f.chamfers).map(([k, v]) => [shiftCorner(Number(k)), v])) : f.chamfers;
  return {
    ...f,
    ...constraints ? { constraints } : {},
    ...bulges ? { bulges } : {},
    ...rounds ? { rounds } : {},
    ...chamfers ? { chamfers } : {}
  };
}
function splitEdge(f, index) {
  if (f.shape === "circle")
    return f;
  const n = f.points.length;
  const a = f.points[index];
  const b = f.points[(index + 1) % n];
  if (!a || !b)
    return f;
  const bulge = f.bulges?.[index] ?? 0;
  if (!bulge) {
    const mid2 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const points2 = [...f.points];
    points2.splice(index + 1, 0, mid2);
    return { ...reindex(f, index), points: points2 };
  }
  const { center, radius, startAngle, endAngle } = arcFromBulge(a, b, bulge);
  const sweep = signedSweep(startAngle, endAngle, bulge);
  const half = startAngle + sweep / 2;
  const mid = [center[0] + radius * Math.cos(half), center[1] + radius * Math.sin(half)];
  const halfBulge = (Math.sqrt(1 + bulge * bulge) - 1) / bulge;
  const points = [...f.points];
  points.splice(index + 1, 0, mid);
  const shifted = reindex(f, index);
  const bulges = { ...shifted.bulges ?? {}, [index]: halfBulge, [index + 1]: halfBulge };
  return { ...shifted, points, bulges };
}
function trimCorner(f, corner, trim) {
  const n = f.points.length;
  const prevI = (corner - 1 + n) % n;
  const nextI = (corner + 1) % n;
  const C = f.points[corner];
  const P = f.points[prevI];
  const N = f.points[nextI];
  const vIn = [P[0] - C[0], P[1] - C[1]];
  const vOut = [N[0] - C[0], N[1] - C[1]];
  const lenIn = Math.hypot(vIn[0], vIn[1]);
  const lenOut = Math.hypot(vOut[0], vOut[1]);
  if (lenIn === 0 || lenOut === 0)
    return null;
  if (!(trim > 1e-9 * Math.min(lenIn, lenOut)))
    return null;
  const pointIn2 = [C[0] + vIn[0] / lenIn * trim, C[1] + vIn[1] / lenIn * trim];
  const pointOut = [C[0] + vOut[0] / lenOut * trim, C[1] + vOut[1] / lenOut * trim];
  const points = [...f.points];
  points.splice(corner, 1, pointIn2, pointOut);
  const insertedAt = corner - 1;
  const constraintsMinusTrimmedPin = f.constraints?.filter((c) => !(c.kind === "lock" && c.corner === corner));
  const reindexed = reindex({ ...f, constraints: constraintsMinusTrimmedPin }, insertedAt);
  return { points, reindexed, pointIn: pointIn2, pointOut };
}
function filletCorner(f, corner, radius, ceilingOverride) {
  const n = f.points.length;
  const prevI = (corner - 1 + n) % n;
  const nextI = (corner + 1) % n;
  const C = f.points[corner];
  const P = f.points[prevI];
  const N = f.points[nextI];
  const vIn = [P[0] - C[0], P[1] - C[1]];
  const vOut = [N[0] - C[0], N[1] - C[1]];
  const lenIn = Math.hypot(vIn[0], vIn[1]);
  const lenOut = Math.hypot(vOut[0], vOut[1]);
  if (lenIn === 0 || lenOut === 0)
    return f;
  const cosInterior = (vIn[0] * vOut[0] + vIn[1] * vOut[1]) / (lenIn * lenOut);
  const interior = Math.acos(Math.max(-1, Math.min(1, cosInterior)));
  const safeRadius = ceilingOverride ?? maxFilletRadius(f.points, corner, f.bulges);
  const clampedRadius = Math.min(Math.max(0, radius), safeRadius);
  if (clampedRadius <= 0)
    return f;
  const trim = clampedRadius / Math.tan(interior / 2);
  const trimmed = trimCorner(f, corner, trim);
  if (!trimmed)
    return f;
  const inEdge = [C[0] - P[0], C[1] - P[1]];
  const outEdge = [N[0] - C[0], N[1] - C[1]];
  const cross9 = inEdge[0] * outEdge[1] - inEdge[1] * outEdge[0];
  const sweep = Math.PI - interior;
  const bulge = (cross9 >= 0 ? 1 : -1) * Math.tan(sweep / 4);
  const bulges = { ...trimmed.reindexed.bulges ?? {} };
  bulges[corner] = bulge;
  return { ...trimmed.reindexed, points: trimmed.points, bulges };
}
function chamferCorner(f, corner, distance, ceilingOverride) {
  const safeDistance = ceilingOverride ?? maxChamferDistance(f.points, corner, f.bulges);
  const clampedDistance = Math.min(Math.max(0, distance), safeDistance);
  if (clampedDistance <= 0)
    return f;
  const trimmed = trimCorner(f, corner, clampedDistance);
  if (!trimmed)
    return f;
  return { ...trimmed.reindexed, points: trimmed.points };
}
function tessellate(f) {
  const circle = circleOf(f);
  if (circle) {
    const samples = 48;
    const out2 = [];
    for (let i = 0; i < samples; i++) {
      const t = i / samples * Math.PI * 2;
      out2.push([circle.center[0] + circle.radius * Math.cos(t), circle.center[1] + circle.radius * Math.sin(t)]);
    }
    return out2;
  }
  const pts = f.points;
  const n = pts.length;
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push(pts[i]);
    const bulge = f.bulges?.[i];
    if (!bulge)
      continue;
    const a = pts[i];
    const b = pts[(i + 1) % n];
    const { center, radius, startAngle, endAngle } = arcFromBulge(a, b, bulge);
    const sweep = signedSweep(startAngle, endAngle, bulge);
    const samples = Math.max(8, Math.ceil(Math.abs(sweep) / (7.5 * Math.PI / 180)));
    for (let s = 1; s < samples; s++) {
      const t = startAngle + sweep * (s / samples);
      out.push([center[0] + radius * Math.cos(t), center[1] + radius * Math.sin(t)]);
    }
  }
  return out;
}
function segmentRoles(basis) {
  const n = basis.length;
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = basis[i];
    const b = basis[(i + 1) % n];
    out.push(a === b ? { role: "corner", index: a } : { role: "edge", index: a });
  }
  return out;
}
function collapsedEdge(points) {
  const n = points.length;
  if (n < 3)
    return null;
  let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
  for (const [u, v] of points) {
    if (u < minU)
      minU = u;
    if (u > maxU)
      maxU = u;
    if (v < minV)
      minV = v;
    if (v > maxV)
      maxV = v;
  }
  const tol = 1e-6 * Math.max(maxU - minU, maxV - minV);
  for (let i = 0; i < n; i++) {
    const a = points[i];
    const b = points[(i + 1) % n];
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) < tol) {
      return "That would pull two corners of this sketch on top of each other, leaving an edge with no length at all -- the outline would stop being a shape. It has been left as it was.";
    }
  }
  return null;
}
function outlineOf(f) {
  const identity = f.points.map((_, i) => i);
  if (f.shape === "circle") {
    return { ok: true, points: f.points, bulges: f.bulges, basis: identity, notes: [] };
  }
  const collapsed = collapsedEdge(f.points);
  const validCorner = (k) => Number.isInteger(k) && k >= 0 && k < f.points.length;
  const roundAsks = Object.entries(f.rounds ?? {}).map(([k, v]) => ({ corner: Number(k), kind: "round", want: v })).filter((a) => validCorner(a.corner) && a.want > 0);
  const roundCorners = new Set(roundAsks.map((a) => a.corner));
  const chamferAsks = Object.entries(f.chamfers ?? {}).map(([k, v]) => ({ corner: Number(k), kind: "chamfer", want: v })).filter((a) => validCorner(a.corner) && a.want > 0 && !roundCorners.has(a.corner));
  const asks = [...roundAsks, ...chamferAsks].sort((a, b) => b.corner - a.corner);
  if (asks.length === 0) {
    return collapsed ? { ok: false, points: f.points, bulges: f.bulges, basis: identity, notes: [], why: collapsed } : { ok: true, points: f.points, bulges: f.bulges, basis: identity, notes: [] };
  }
  let points = f.points.map((p) => [p[0], p[1]]);
  let bulges = { ...f.bulges ?? {} };
  let basis = identity.slice();
  const notes = [];
  const n = f.points.length;
  const design = f.points.map((p) => [p[0], p[1]]);
  const decided = /* @__PURE__ */ new Map();
  for (const ask of asks) {
    const ceiling = ask.kind === "round" ? maxFilletRadius(design, ask.corner, f.bulges) : maxChamferDistance(design, ask.corner, f.bulges);
    const got = Math.min(ask.want, Math.max(0, ceiling));
    if (!(got > 0)) {
      notes.push({ corner: ask.corner, want: ask.want, got: 0 });
      continue;
    }
    const k = ask.corner;
    const c = design[k], p = design[(k - 1 + n) % n], q = design[(k + 1) % n];
    const lin = Math.hypot(p[0] - c[0], p[1] - c[1]), lout = Math.hypot(q[0] - c[0], q[1] - c[1]);
    const cosI = ((p[0] - c[0]) * (q[0] - c[0]) + (p[1] - c[1]) * (q[1] - c[1])) / (lin * lout);
    const interior = Math.acos(Math.max(-1, Math.min(1, cosI)));
    decided.set(k, { got, trim: ask.kind === "round" ? got / Math.tan(interior / 2) : got });
  }
  const give = /* @__PURE__ */ new Map();
  for (const k of decided.keys())
    give.set(k, 1);
  for (let k = 0; k < n; k++) {
    const j = (k + 1) % n;
    const a = decided.get(k), b = decided.get(j);
    if (!a || !b || k === j)
      continue;
    const len8 = Math.hypot(design[j][0] - design[k][0], design[j][1] - design[k][1]);
    const sum = a.trim + b.trim;
    if (sum > len8 * (1 + 1e-12)) {
      const share = len8 / sum;
      give.set(k, Math.min(give.get(k), share));
      give.set(j, Math.min(give.get(j), share));
    }
  }
  for (const ask of asks) {
    const d = decided.get(ask.corner);
    if (!d)
      continue;
    const got = d.got * give.get(ask.corner);
    if (got < ask.want - 1e-9)
      notes.push({ corner: ask.corner, want: ask.want, got });
  }
  for (const ask of asks) {
    const k = ask.corner;
    const d = decided.get(k);
    if (!d)
      continue;
    const got = d.got * give.get(k);
    if (!(got > 0))
      continue;
    const before = points.length;
    const next = ask.kind === "round" ? filletCorner({ points, bulges }, k, got, Infinity) : chamferCorner({ points, bulges }, k, got, Infinity);
    if (next.points.length === before)
      continue;
    points = next.points;
    bulges = next.bulges ?? {};
    basis = [...basis.slice(0, k), basis[k], basis[k], ...basis.slice(k + 1)];
  }
  return collapsed ? { ok: false, points, bulges, basis, notes, why: collapsed } : { ok: true, points, bulges, basis, notes };
}
function chordOf(pts, e) {
  const n = pts.length;
  if (n < 2)
    return 0;
  const a = pts[(e % n + n) % n];
  const b = pts[((e + 1) % n + n) % n];
  return Math.hypot(b[0] - a[0], b[1] - a[1]);
}
function maxBow(pts, e) {
  return chordOf(pts, e) / 2;
}
function bowOf(pts, e, bulges) {
  const g = bulges?.[e];
  if (!g)
    return 0;
  return chordOf(pts, e) / 2 * g;
}
function bulgeFromBow(pts, e, want) {
  const chord = chordOf(pts, e);
  if (!(chord > 0) || !Number.isFinite(want) || want === 0)
    return 0;
  const ceiling = chord / 2;
  const bow = Math.max(-ceiling, Math.min(ceiling, want));
  return 2 * bow / chord;
}
function whyCannotBowEdge(pts, e, want) {
  if (!Number.isFinite(want))
    return "That is not a number.";
  const chord = chordOf(pts, e);
  if (!(chord > 0)) {
    return `Edge ${e + 1} has no length, so there is nothing to bow. Move one of its corners first.`;
  }
  const ceiling = chord / 2;
  if (Math.abs(want) > ceiling) {
    return `Edge ${e + 1} can bow at most ${ceiling.toFixed(1)} either way -- that is a half circle, and past it the arc turns back on itself.`;
  }
  return null;
}
function bowEdge(f, e, bow) {
  if (f.shape === "circle")
    return f;
  if (!Number.isInteger(e) || e < 0 || e >= f.points.length)
    return f;
  const bulges = { ...f.bulges ?? {} };
  const g = bulgeFromBow(f.points, e, bow);
  if (g)
    bulges[e] = g;
  else
    delete bulges[e];
  return Object.keys(bulges).length ? { ...f, bulges } : { ...f, bulges: void 0 };
}
function whyCannotRemoveCorner(f, k) {
  if (f.shape === "circle") {
    return "A circle has no corners to remove -- its two points are the ends of a diameter.";
  }
  if (!Number.isInteger(k) || k < 0 || k >= f.points.length)
    return "There is no such corner.";
  if (f.points.length <= 3) {
    return "A shape needs at least three corners. Removing this one would leave a line, not an outline.";
  }
  return null;
}
function whyRemovingCornerCosts(f, k) {
  const n = f.points.length;
  if (!Number.isInteger(k) || k < 0 || k >= n)
    return null;
  const merging = [(k - 1 + n) % n, k];
  const lost = [];
  const rules = (f.constraints ?? []).filter((c) => {
    if (indexesCorners(c))
      return cornersOf(c).includes(k);
    if ("other" in c)
      return merging.includes(c.edge) || merging.includes(c.other);
    return merging.includes(c.edge);
  }).length;
  if (rules > 0)
    lost.push(rules === 1 ? "1 rule" : `${rules} rules`);
  const curves = merging.filter((e) => f.bulges?.[e]).length;
  if (curves > 0)
    lost.push(curves === 1 ? "a curve" : "two curves");
  if (f.rounds?.[k])
    lost.push("its round");
  if (f.chamfers?.[k])
    lost.push("its chamfer");
  if (lost.length === 0)
    return null;
  const list = lost.length === 1 ? lost[0] : lost.slice(0, -1).join(", ") + " and " + lost[lost.length - 1];
  return `Removing corner ${k + 1} joins the two edges beside it into one, so ${list} go with it.`;
}
function removeCorner(f, k) {
  if (whyCannotRemoveCorner(f, k))
    return f;
  const n = f.points.length;
  const prev = (k - 1 + n) % n;
  const merging = /* @__PURE__ */ new Set([prev, k]);
  const shift = (i) => i > k ? i - 1 : i;
  const points = f.points.filter((_, i) => i !== k);
  const remap = (src, drop) => {
    if (!src)
      return void 0;
    const out = {};
    for (const [key, v] of Object.entries(src)) {
      const i = Number(key);
      if (!Number.isInteger(i) || drop(i))
        continue;
      out[shift(i)] = v;
    }
    return Object.keys(out).length ? out : void 0;
  };
  const bulges = remap(f.bulges, (e) => merging.has(e));
  const rounds = remap(f.rounds, (c) => c === k);
  const chamfers = remap(f.chamfers, (c) => c === k);
  const constraints = f.constraints?.filter((c) => {
    if (indexesCorners(c))
      return !cornersOf(c).includes(k);
    if ("other" in c)
      return !merging.has(c.edge) && !merging.has(c.other);
    return !merging.has(c.edge);
  }).map((c) => {
    if (indexesCorners(c)) {
      if (c.kind === "lock")
        return { ...c, corner: shift(c.corner) };
      if (c.kind === "symmetric")
        return { ...c, a: shift(c.a), b: shift(c.b), center: shift(c.center) };
      return { ...c, a: shift(c.a), b: shift(c.b) };
    }
    if ("other" in c)
      return { ...c, edge: shift(c.edge), other: shift(c.other) };
    return { ...c, edge: shift(c.edge) };
  });
  return {
    ...f,
    points,
    bulges,
    rounds,
    chamfers,
    ...constraints ? { constraints } : {}
  };
}

// ../../script/dist/model-types.js
var model_types_exports = {};
__export(model_types_exports, {
  EMPTY_DOC: () => EMPTY_DOC,
  RECTANGLE_CONSTRAINTS: () => RECTANGLE_CONSTRAINTS,
  SWEEP_DIR: () => SWEEP_DIR,
  addCorner: () => addCorner,
  canRotate: () => canRotate,
  datumRefs: () => datumRefs,
  defaultName: () => defaultName,
  dependsOn: () => dependsOn,
  exactExtentAlong: () => exactExtentAlong,
  extentAlong: () => extentAlong,
  extentBoundAlong: () => extentBoundAlong,
  featureRangeAlong: () => featureRangeAlong,
  holeAxialOffset: () => holeAxialOffset,
  isDerived: () => isDerived,
  isRoundable: () => isRoundable,
  isShape: () => isShape,
  isSketchOnly: () => isSketchOnly,
  maxRound: () => maxRound,
  nameMap: () => nameMap,
  newBlend: () => newBlend,
  newCircleSketch: () => newCircleSketch,
  newDatum: () => newDatum,
  newExtrude: () => newExtrude,
  newGroove: () => newGroove,
  newHole: () => newHole,
  newHoleCorners: () => newHoleCorners,
  newMirror: () => newMirror,
  newMove: () => newMove,
  newPattern: () => newPattern,
  newPocket: () => newPocket,
  newPolygonSketch: () => newPolygonSketch,
  newRectangleSketch: () => newRectangleSketch,
  newRevolve: () => newRevolve,
  newRotate: () => newRotate,
  newShape: () => newShape,
  newShell: () => newShell,
  newSketch: () => newSketch,
  newSketchOnFace: () => newSketchOnFace,
  nextId: () => nextId,
  placementLabel: () => placementLabel,
  rightmostShapeId: () => rightmostShapeId,
  shellInsertion: () => shellInsertion,
  sketchBBoxCentre: () => sketchBBoxCentre,
  sketchFrameOf: () => sketchFrameOf,
  throughExtentAlong: () => throughExtentAlong,
  topLevel: () => topLevel,
  topoRefs: () => topoRefs,
  unmeasuredSweptId: () => unmeasuredSweptId,
  whyCannotBlend: () => whyCannotBlend,
  whyCannotOrbit: () => whyCannotOrbit,
  whyCannotRound: () => whyCannotRound,
  withHoleDepth: () => withHoleDepth
});

// ../../script/dist/topo-name.js
function featureChain(n) {
  const out = [n.feature];
  if (n.cause === "carried" || n.cause === "split")
    out.push(...featureChain(n.of));
  if (n.cause === "between")
    out.push(...featureChain(n.of[0]), ...featureChain(n.of[1]));
  return [...new Set(out)];
}

// ../../script/dist/model-types.js
var NAMED_PLANE_FRAMES = {
  xy: { u: [1, 0, 0], v: [0, 1, 0], n: [0, 0, 1] },
  xz: { u: [1, 0, 0], v: [0, 0, 1], n: [0, 1, 0] },
  yz: { u: [0, 1, 0], v: [0, 0, 1], n: [1, 0, 0] }
};
function sketchFrameOf(f) {
  if (f.frame) {
    const { origin, u, v } = f.frame;
    const n = [
      u[1] * v[2] - u[2] * v[1],
      u[2] * v[0] - u[0] * v[2],
      u[0] * v[1] - u[1] * v[0]
    ];
    return { origin, u, v, n };
  }
  const a = NAMED_PLANE_FRAMES[f.plane ?? "xy"] ?? NAMED_PLANE_FRAMES.xy;
  const offset = f.offset ?? 0;
  return {
    origin: [a.n[0] * offset, a.n[1] * offset, a.n[2] * offset],
    u: a.u,
    v: a.v,
    n: a.n
  };
}
function dependsOn(f) {
  const named = topoRefs(f);
  const into = "into" in f && typeof f.into === "string" ? [f.into] : [];
  const datum = datumRefs(f);
  if ("targets" in f)
    return [.../* @__PURE__ */ new Set([...f.targets, ...into, ...named, ...datum])];
  if ("target" in f)
    return [.../* @__PURE__ */ new Set([f.target, ...into, ...named, ...datum])];
  return [.../* @__PURE__ */ new Set([...into, ...named, ...datum])];
}
function datumRefs(f) {
  return f.kind === "sketch" && f.onDatum ? [f.onDatum] : [];
}
function topoRefs(f) {
  const names = [];
  if (f.kind === "fillet")
    names.push(f.edge);
  if (f.kind === "draft" && f.face)
    names.push(f.face);
  if (f.kind === "shell" && f.open)
    names.push(f.open);
  return [...new Set(names.flatMap(featureChain))];
}
function isDerived(f) {
  return f.kind === "combine" || f.kind === "extrude" || f.kind === "revolve" || f.kind === "mirror" || f.kind === "pattern" || f.kind === "hole" || f.kind === "shell" || f.kind === "move" || f.kind === "rotate";
}
function isSketchOnly(doc) {
  return doc.features.length === 0 || doc.features.every((f) => f.kind === "sketch" || f.kind === "datum");
}
var EMPTY_DOC = { version: 1, features: [] };
function isShape(f) {
  return f.kind === "box" || f.kind === "cylinder" || f.kind === "sphere" || f.kind === "cone" || f.kind === "torus";
}
function isRoundable(f) {
  return f.kind === "box" || f.kind === "cylinder";
}
function whyCannotRound(f) {
  if (f.kind === "combine") {
    if (f.op === "subtract") {
      return "Rounding works on a shape, not a combination. Round the shape before you cut it.";
    }
    const verb = f.op === "union" ? "join" : "overlap";
    return `Rounding works on a shape, not a combination. Round the shapes before you ${verb} them.`;
  }
  if (f.kind === "sketch") {
    if (f.shape === "circle") {
      return "A circle has no corners to round \u2014 it is already round the whole way. Rounding is for shapes with edges, like a box.";
    }
    return "Rounding works on a solid shape, not a flat sketch. To round a corner here, use Round a corner in the Rules panel.";
  }
  if (f.kind === "extrude" || f.kind === "revolve") {
    const past = f.kind === "extrude" ? "pulled" : "spun";
    const bare = f.kind === "extrude" ? "pull" : "spin";
    return `Rounding works on a shape you build with a tool like Box or Cylinder, not one ${past} from a sketch. If its sketch has corners, use Round a corner in the Rules panel before you ${bare} it.`;
  }
  if (f.kind === "sphere" || f.kind === "torus") {
    return "That shape has no edges to round \u2014 it is curved all the way round.";
  }
  if (f.kind === "cone") {
    return "Rounding a cone is not supported yet.";
  }
  if (f.kind === "hole") {
    return "Rounding works on the shape, not the hole cut into it. Round the shape before you drill it.";
  }
  if (f.kind === "shell") {
    return "Rounding works on a shape, not a hollowed-out one. A hollow shape rounds its edges one at a time: pick an edge and round that.";
  }
  if (f.kind === "mirror") {
    return "Rounding works on the original shape, not a mirrored copy. Round it before you mirror it.";
  }
  if (f.kind === "pattern") {
    return "Rounding works on the original shape, not a repeated copy. Round it before you repeat it.";
  }
  if (f.kind === "move") {
    return f.copy ? "Rounding the whole shape works on the original, not a copy made by Move \u2014 round the original before you copy it, or click one edge of this copy in the viewport to round just that edge." : "Rounding the whole shape works on the original, not a moved copy \u2014 round it before you move it, or click one edge of this shape in the viewport to round just that edge.";
  }
  return null;
}
function whyCannotOrbit(f, axis) {
  if (!isShape(f))
    return null;
  const [x, y, z] = f.center;
  const offAxis = axis === "x" ? Math.hypot(y, z) : axis === "y" ? Math.hypot(x, z) : Math.hypot(x, y);
  if (offAxis > 0.01)
    return null;
  return "Repeat Around spins copies about the middle of the world, so a shape sitting in the middle has nothing to spin around \u2014 every copy would land on top of the first. Move it away from the middle first (in a script, move(shape, [30, 0, 0])).";
}
function canRotate(f) {
  return f.kind === "box" || f.kind === "cylinder" || f.kind === "cone" || f.kind === "torus";
}
function maxRound(f) {
  const smallest = f.kind === "box" ? Math.min(f.size[0], f.size[1], f.size[2]) : Math.min(f.radius * 2, f.height);
  return Math.max(0, smallest / 2 - 0.01);
}
function nextId(doc, prefix) {
  const taken = new Set(doc.features.map((f) => f.id));
  for (let n = 1; ; n++) {
    const id = `${prefix}${n}`;
    if (!taken.has(id))
      return id;
  }
}
var RECTANGLE_CONSTRAINTS = [
  { kind: "horizontal", edge: 0 },
  { kind: "vertical", edge: 1 },
  { kind: "horizontal", edge: 2 },
  { kind: "vertical", edge: 3 }
];
function newSketch(doc, plane = "xy") {
  return {
    id: nextId(doc, "sk"),
    kind: "sketch",
    plane,
    offset: 0,
    points: [[0, 0], [40, 0], [40, 25], [0, 25]],
    constraints: RECTANGLE_CONSTRAINTS.slice()
  };
}
function newSketchOnFace(doc, frame, points = [[0, 0], [40, 0], [40, 25], [0, 25]]) {
  return {
    id: nextId(doc, "sk"),
    kind: "sketch",
    plane: "xy",
    offset: 0,
    frame,
    points: points.map((p) => [p[0], p[1]]),
    constraints: RECTANGLE_CONSTRAINTS.slice()
  };
}
function placementLabel(f) {
  return f.frame ? "custom plane" : f.plane ?? "xy";
}
function newDatum(doc) {
  return { id: nextId(doc, "pl"), kind: "datum", type: "plane" };
}
function newCircleSketch(doc, plane = "xy", centre2 = [0, 0]) {
  return {
    id: nextId(doc, "sk"),
    kind: "sketch",
    plane,
    offset: 0,
    points: [[centre2[0] - 10, centre2[1]], [centre2[0] + 10, centre2[1]]],
    shape: "circle"
  };
}
function sketchBBoxCentre(points) {
  if (points.length === 0)
    return [0, 0];
  let loU = points[0][0], hiU = points[0][0];
  let loV = points[0][1], hiV = points[0][1];
  for (const [u, v] of points) {
    if (u < loU)
      loU = u;
    else if (u > hiU)
      hiU = u;
    if (v < loV)
      loV = v;
    else if (v > hiV)
      hiV = v;
  }
  return [(loU + hiU) / 2, (loV + hiV) / 2];
}
function newRectangleSketch(doc, plane, p1, p2) {
  const w = Math.abs(p2[0] - p1[0]);
  const h = Math.abs(p2[1] - p1[1]);
  if (w < 1 || h < 1)
    return null;
  const loU = Math.min(p1[0], p2[0]), hiU = Math.max(p1[0], p2[0]);
  const loV = Math.min(p1[1], p2[1]), hiV = Math.max(p1[1], p2[1]);
  return {
    id: nextId(doc, "sk"),
    kind: "sketch",
    plane,
    offset: 0,
    points: [[loU, loV], [hiU, loV], [hiU, hiV], [loU, hiV]],
    constraints: RECTANGLE_CONSTRAINTS.slice()
  };
}
function newPolygonSketch(doc, plane, center, vertex, sides = 6) {
  const dx = vertex[0] - center[0];
  const dy = vertex[1] - center[1];
  const radius = Math.hypot(dx, dy);
  if (radius < 1)
    return null;
  const startAngle = Math.atan2(dy, dx);
  const points = [];
  for (let i = 0; i < sides; i++) {
    const a = startAngle + i / sides * Math.PI * 2;
    points.push([center[0] + radius * Math.cos(a), center[1] + radius * Math.sin(a)]);
  }
  return { id: nextId(doc, "sk"), kind: "sketch", plane, offset: 0, points };
}
function newExtrude(doc, target) {
  return { id: nextId(doc, "pull"), kind: "extrude", target, height: 12 };
}
function newRevolve(doc, target) {
  return { id: nextId(doc, "rev"), kind: "revolve", target, angle: 360 };
}
function newGroove(doc, target, into) {
  return { id: nextId(doc, "groove"), kind: "groove", target, into, angle: 360 };
}
function newPocket(doc, target, into) {
  return { id: nextId(doc, "pocket"), kind: "pocket", target, into, depth: 5 };
}
function whyCannotBlend(a, b) {
  if (a.kind !== "sketch" || b.kind !== "sketch") {
    return "Blend joins two flat outlines. Pick two sketches -- a solid has no outline to skin from.";
  }
  if (a.plane !== b.plane) {
    return "Those two sketches sit on different planes, so there is no single direction to blend along. Put both on the same one first.";
  }
  if (a.offset === b.offset) {
    return "Both sketches sit at the same offset, so there is no gap to fill. Slide one of them along its plane first.";
  }
  if (a.shape !== "circle" && a.points.length < 3 || b.shape !== "circle" && b.points.length < 3) {
    return "A blend needs two real outlines, and one of these has fewer than three corners.";
  }
  return null;
}
function newBlend(doc, a, b) {
  const [lo, hi] = a.offset <= b.offset ? [a, b] : [b, a];
  return { id: nextId(doc, "bl"), kind: "blend", targets: [lo.id, hi.id] };
}
function newMirror(doc, target, plane) {
  return { id: nextId(doc, "mir"), kind: "mirror", target, plane };
}
function extentAlong(doc, featureId, axis) {
  let id = featureId;
  for (let hop = 0; hop < 16 && id; hop++) {
    const f = doc.features.find((feat) => feat.id === id);
    if (!f)
      return null;
    if (f.kind === "box") {
      if (f.rotate && f.rotate.some((v) => v !== 0))
        return null;
      return axis === "x" ? f.size[0] : axis === "y" ? f.size[1] : f.size[2];
    }
    if (f.kind === "cylinder") {
      if (f.rotate && f.rotate.some((v) => v !== 0))
        return null;
      return axis === "z" ? f.height : f.radius * 2;
    }
    id = "target" in f ? f.target : void 0;
  }
  return null;
}
var SWEEP_DIR = { xy: 1, xz: -1, yz: 1 };
var AXIS_INDEX = { x: 0, y: 1, z: 2 };
function sketchBounds2D(f) {
  if (f.geoms && f.geoms.length || f.geom && f.geom.length || f.rules && f.rules.length)
    return null;
  const circle = circleOf(f);
  if (circle) {
    const [cx, cy] = circle.center;
    return [cx - circle.radius, cx + circle.radius, cy - circle.radius, cy + circle.radius];
  }
  if (f.shape === "circle" || f.points.length < 3)
    return null;
  const o = outlineOf(f);
  if (!o.ok || o.points.length < 3)
    return null;
  let uLo = Infinity, uHi = -Infinity, vLo = Infinity, vHi = -Infinity;
  const take = (u, v) => {
    if (u < uLo)
      uLo = u;
    if (u > uHi)
      uHi = u;
    if (v < vLo)
      vLo = v;
    if (v > vHi)
      vHi = v;
  };
  const n = o.points.length;
  for (let i = 0; i < n; i++) {
    const a = o.points[i], b = o.points[(i + 1) % n];
    take(a[0], a[1]);
    const bulge = o.bulges?.[i];
    if (!bulge)
      continue;
    const { center, radius, startAngle, endAngle } = arcFromBulge(a, b, bulge);
    let sweep = endAngle - startAngle;
    if (bulge > 0 && sweep < 0)
      sweep += Math.PI * 2;
    if (bulge < 0 && sweep > 0)
      sweep -= Math.PI * 2;
    for (let k = 0; k < 4; k++) {
      const theta = k * Math.PI / 2;
      let d = sweep >= 0 ? theta - startAngle : startAngle - theta;
      d = (d % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
      if (d <= Math.abs(sweep))
        take(center[0] + radius * Math.cos(theta), center[1] + radius * Math.sin(theta));
    }
  }
  if (![uLo, uHi, vLo, vHi].every(Number.isFinite))
    return null;
  return [uLo, uHi, vLo, vHi];
}
var unitAxisOf = (v) => {
  for (const i of [0, 1, 2]) {
    if (Math.abs(Math.abs(v[i]) - 1) < 1e-9 && v.every((c, j) => j === i || Math.abs(c) < 1e-9)) {
      return { i, sign: v[i] > 0 ? 1 : -1 };
    }
  }
  return null;
};
function extrudeRange(sk, height, axis, opt = {}) {
  if (!(height > 0))
    return null;
  const fr = sketchFrameOf(sk);
  const ui = unitAxisOf(fr.u), vi = unitAxisOf(fr.v), ni = unitAxisOf(fr.n);
  if (!ui || !vi || !ni)
    return null;
  const i = AXIS_INDEX[axis];
  const o = fr.origin[i];
  const bounds = sketchBounds2D(sk);
  if (!bounds && ni.i !== i)
    return null;
  if (ni.i === i) {
    const dir = sk.frame ? 1 : SWEEP_DIR[sk.plane ?? "xy"] ?? 1;
    const s = ni.sign * dir * (opt.reversed ? -1 : 1);
    const back = opt.midplane ? height / 2 : opt.length2 ?? 0;
    const fwd = opt.midplane ? height / 2 : height;
    const a2 = o - s * back, b2 = o + s * fwd;
    return { lo: Math.min(a2, b2), hi: Math.max(a2, b2), exact: true };
  }
  const [lo, hi, w] = ui.i === i ? [bounds[0], bounds[1], ui.sign] : [bounds[2], bounds[3], vi.sign];
  const a = o + w * lo, b = o + w * hi;
  return { lo: Math.min(a, b), hi: Math.max(a, b), exact: true };
}
function revolveRange(sk, angle, axis) {
  if (angle !== 360 || sk.frame || sk.offset !== 0 || sk.plane !== "xz" && sk.plane !== "yz")
    return null;
  const bounds = sketchBounds2D(sk);
  if (!bounds || bounds[0] < 0)
    return null;
  const normal = sk.plane === "xz" ? "y" : "x";
  if (axis === normal)
    return { lo: bounds[2], hi: bounds[3], exact: true };
  return { lo: -bounds[1], hi: bounds[1], exact: true };
}
function rotationMatrix(rot) {
  const [a, b, c] = rot.map((d) => d * Math.PI / 180);
  const [sa, ca, sb, cb, sc, cc] = [Math.sin(a), Math.cos(a), Math.sin(b), Math.cos(b), Math.sin(c), Math.cos(c)];
  return [
    [cc * cb, cc * sb * sa - sc * ca, cc * sb * ca + sc * sa],
    [sc * cb, sc * sb * sa + cc * ca, sc * sb * ca - cc * sa],
    [-sb, cb * sa, cb * ca]
  ];
}
var snap = (v) => Math.round(v * 1e9) / 1e9;
var matMul = (A, B) => A.map((row) => [0, 1, 2].map((j) => row[0] * B[0][j] + row[1] * B[1][j] + row[2] * B[2][j]));
function axisRotation(axis, deg) {
  const t = deg * Math.PI / 180, c = Math.cos(t), s = Math.sin(t);
  return axis === "x" ? [[1, 0, 0], [0, c, -s], [0, s, c]] : axis === "y" ? [[c, 0, s], [0, 1, 0], [-s, 0, c]] : [[c, -s, 0], [s, c, 0], [0, 0, 1]];
}
function ownSupport(t, d) {
  const side = Math.hypot(d[0], d[1]);
  switch (t.kind) {
    case "torus":
      return t.ringRadius * side + t.tubeRadius;
    case "cone":
      return Math.max(-d[2] * t.height / 2 + t.radius * side, d[2] * t.height / 2);
    case "prism": {
      let best = -Infinity;
      for (let k = 0; k < t.sides; k++) {
        const a = 2 * Math.PI * k / t.sides;
        best = Math.max(best, Math.cos(a) * d[0] + Math.sin(a) * d[1]);
      }
      return Math.abs(d[2]) * t.height / 2 + t.radius * best;
    }
    default:
      return null;
  }
}
function hullRange(t, M, c, i) {
  const d = M[i];
  const up2 = ownSupport(t, d), down2 = ownSupport(t, d.map((v) => -v));
  if (up2 === null || down2 === null)
    return null;
  return { lo: snap(c - down2), hi: snap(c + up2), exact: true };
}
function polarRange(doc, f, axis, rec) {
  if (!(f.count >= 1) || !Number.isFinite(f.count))
    return null;
  const spin = f.axis ?? "z";
  const total2 = f.totalAngle ?? 360;
  if (!Number.isFinite(total2))
    return null;
  if (spin === axis || f.count === 1)
    return rec(f.target);
  const t = doc.features.find((feat) => feat.id === f.target);
  if (!t || t.kind !== "box" && t.kind !== "cylinder" && t.kind !== "sphere" && t.kind !== "cone" && t.kind !== "torus" && t.kind !== "prism")
    return null;
  const i = AXIS_INDEX[axis];
  const own = rotationMatrix(t.rotate ?? [0, 0, 0]);
  let lo = Infinity, hi = -Infinity;
  for (let k = 0; k < f.count; k++) {
    const R = axisRotation(spin, total2 / f.count * k);
    const c = R[i].reduce((a, r, j) => a + r * t.center[j], 0);
    if (t.kind === "torus" || t.kind === "prism" || t.kind === "cone") {
      const h = hullRange(t, matMul(R, own), c, i);
      if (!h)
        return null;
      lo = Math.min(lo, h.lo);
      hi = Math.max(hi, h.hi);
      continue;
    }
    let half;
    if (t.kind === "sphere")
      half = t.radius;
    else {
      const M = matMul(R, own);
      half = t.kind === "box" ? M[i].reduce((a, m, j) => a + Math.abs(m) * t.size[j] / 2, 0) : t.height / 2 * Math.abs(M[i][2]) + t.radius * Math.sqrt(Math.max(0, 1 - M[i][2] * M[i][2]));
    }
    lo = Math.min(lo, c - half);
    hi = Math.max(hi, c + half);
  }
  return { lo: snap(lo), hi: snap(hi), exact: true };
}
function rangeOf(doc, featureId, axis, budget = { n: 64 }) {
  const f = doc.features.find((feat) => feat.id === featureId);
  if (!f || budget.n-- <= 0)
    return null;
  const i = AXIS_INDEX[axis];
  const spun = "rotate" in f && f.rotate && f.rotate.some((v) => v !== 0);
  const around = (c, half, exact = true) => ({ lo: c - half, hi: c + half, exact });
  const rec = (id) => rangeOf(doc, id, axis, budget);
  switch (f.kind) {
    case "box": {
      if (!spun)
        return around(f.center[i], f.size[i] / 2);
      const R = rotationMatrix(f.rotate);
      return around(f.center[i], snap(R[i].reduce((t, r, j) => t + Math.abs(r) * f.size[j] / 2, 0)));
    }
    case "cone":
      if (!spun)
        return around(f.center[i], (axis === "z" ? f.height : f.radius * 2) / 2);
      return hullRange(f, rotationMatrix(f.rotate), f.center[i], i);
    case "cylinder":
      if (!spun)
        return around(f.center[i], (axis === "z" ? f.height : f.radius * 2) / 2);
      {
        const d = rotationMatrix(f.rotate)[i][2];
        return around(f.center[i], snap(f.height / 2 * Math.abs(d) + f.radius * Math.sqrt(Math.max(0, 1 - d * d))));
      }
    case "prism":
      return hullRange(f, rotationMatrix(f.rotate ?? [0, 0, 0]), f.center[i], i);
    case "sphere":
      return around(f.center[i], f.radius);
    case "torus":
      return hullRange(f, rotationMatrix(f.rotate ?? [0, 0, 0]), f.center[i], i);
    case "wedge":
      return spun ? null : around(f.center[i], (axis === "x" ? f.width : axis === "y" ? f.depth : f.height) / 2);
    case "hole":
    case "shell":
    case "fillet":
    case "draft":
      return rec(f.target);
    case "move": {
      const r = rec(f.target);
      if (!r)
        return null;
      const d = f.offset[i];
      return { ...r, lo: r.lo + d, hi: r.hi + d };
    }
    case "extrude": {
      const sk = doc.features.find((feat) => feat.id === f.target);
      const r = sk && sk.kind === "sketch" ? extrudeRange(sk, f.height, axis, { midplane: f.midplane, length2: f.length2, reversed: f.reversed }) : null;
      if (!r || !(f.taper || f.direction))
        return r;
      const sk2 = sk;
      const ni = unitAxisOf(sketchFrameOf(sk2).n);
      return ni && ni.i === AXIS_INDEX[axis] ? { ...r, exact: false } : null;
    }
    case "revolve": {
      const sk = doc.features.find((feat) => feat.id === f.target);
      return sk && sk.kind === "sketch" ? revolveRange(sk, f.angle, axis) : null;
    }
    case "groove":
    case "pocket": {
      const r = rec(f.into);
      return r ? { ...r, exact: false } : null;
    }
    case "combine": {
      if (f.targets.length === 0)
        return null;
      if (f.op === "intersect")
        return null;
      if (f.op === "subtract") {
        const r = rec(f.targets[0]);
        return r ? { ...r, exact: false } : null;
      }
      let lo = Infinity, hi = -Infinity, exact = true;
      for (const t of f.targets) {
        const r = rec(t);
        if (!r)
          return null;
        lo = Math.min(lo, r.lo);
        hi = Math.max(hi, r.hi);
        exact = exact && r.exact;
      }
      return { lo, hi, exact };
    }
    case "pattern": {
      if (f.mode === "circular")
        return polarRange(doc, f, axis, rec);
      if (f.mode !== "linear" || !f.step || !(f.count >= 1))
        return null;
      const r = rec(f.target);
      if (!r)
        return null;
      const d = f.step[i] * (f.count - 1);
      return { lo: Math.min(r.lo, r.lo + d), hi: Math.max(r.hi, r.hi + d), exact: r.exact };
    }
    case "mirror": {
      const r = rec(f.target);
      if (!r)
        return null;
      const across = f.plane === "xy" ? "z" : f.plane === "xz" ? "y" : "x";
      return across === axis ? null : r;
    }
    default:
      return null;
  }
}
function featureRangeAlong(doc, featureId, axis) {
  return rangeOf(doc, featureId, axis);
}
function extentBoundAlong(doc, featureId, axis) {
  const r = rangeOf(doc, featureId, axis);
  return r ? { extent: r.hi - r.lo, exact: r.exact } : null;
}
function throughExtentAlong(doc, featureId, axis) {
  return extentBoundAlong(doc, featureId, axis)?.extent ?? null;
}
function exactExtentAlong(doc, featureId, axis) {
  const e = extentBoundAlong(doc, featureId, axis);
  return e && e.exact ? e.extent : null;
}
function holeAxialOffset(doc, target, axis, depth) {
  const e = extentBoundAlong(doc, target, axis);
  if (!e)
    return null;
  if (depth >= e.extent)
    return 0;
  return e.exact ? (e.extent - depth) / 2 : null;
}
function withHoleDepth(doc, f, depth) {
  const off = holeAxialOffset(doc, f.target, f.axis, depth);
  if (off == null)
    return { ...f, depth };
  const center = [...f.center];
  center[f.axis === "x" ? 0 : f.axis === "y" ? 1 : 2] = off;
  return { ...f, depth, center };
}
function newPattern(doc, target, mode = "linear") {
  const id = nextId(doc, "pat");
  if (mode === "linear") {
    const extent = extentAlong(doc, target, "x");
    const step = extent != null ? [Math.ceil(extent * 1.5), 0, 0] : [30, 0, 0];
    return { id, kind: "pattern", target, mode, count: 3, step };
  }
  return { id, kind: "pattern", target, mode, count: 6, axis: "z", totalAngle: 360 };
}
function newHole(doc, target) {
  const extent = extentAlong(doc, target, "z");
  const depth = extent != null ? extent + 2 : 10;
  return {
    id: nextId(doc, "hole"),
    kind: "hole",
    target,
    diameter: 6,
    depth,
    center: [0, 0, 0],
    axis: "z"
  };
}
function newHoleCorners(doc, target) {
  const extent = extentAlong(doc, target, "z");
  const depth = extent != null ? extent + 2 : 10;
  return {
    id: nextId(doc, "hole"),
    kind: "hole",
    target,
    diameter: 6,
    depth,
    center: [0, 0, 0],
    axis: "z",
    corners: { dx: 15, dy: 10 }
  };
}
function newShell(doc, target, open) {
  const f = { id: nextId(doc, "shell"), kind: "shell", target, thickness: 2 };
  if (open)
    f.open = open;
  return f;
}
function shellInsertion(doc, pickedId) {
  const chain = [];
  let cur = doc.features.find((f) => f.id === pickedId);
  while (cur) {
    chain.unshift(cur);
    const t = "target" in cur ? cur.target : void 0;
    cur = t ? doc.features.find((f) => f.id === t) : void 0;
  }
  const blockerIndex = chain.findIndex((f) => f.kind === "hole" || f.kind === "fillet");
  if (blockerIndex > 0) {
    const root = chain[blockerIndex - 1];
    const blocker = chain[blockerIndex];
    const insertAt = doc.features.findIndex((f) => f.id === root.id) + 1;
    return { target: root.id, insertAt, rewireId: blocker.id };
  }
  const direct = doc.features.find((f) => "target" in f && f.target === pickedId);
  if (direct && (direct.kind === "hole" || direct.kind === "fillet")) {
    const insertAt = doc.features.findIndex((f) => f.id === pickedId) + 1;
    return { target: pickedId, insertAt, rewireId: direct.id };
  }
  return { target: pickedId, insertAt: doc.features.length, rewireId: null };
}
function newRotate(doc, target, angles) {
  return { id: nextId(doc, "turn"), kind: "rotate", target, angles };
}
function newMove(doc, target, copy = false) {
  return { id: nextId(doc, "move"), kind: "move", target, offset: [20, 0, 0], copy };
}
function addCorner(f, index) {
  if (f.shape === "circle")
    return f;
  return splitEdge(f, index);
}
function newHalfWidthX(kind) {
  if (kind === "box")
    return 20;
  if (kind === "cylinder")
    return 10;
  if (kind === "cone")
    return 12;
  if (kind === "torus")
    return 18;
  if (kind === "prism")
    return 10;
  if (kind === "wedge")
    return 15;
  return 15;
}
function shapeRightEdgeX(f) {
  if (f.kind === "box")
    return f.center[0] + f.size[0] / 2;
  if (f.kind === "cylinder" || f.kind === "cone")
    return f.center[0] + f.radius;
  if (f.kind === "sphere")
    return f.center[0] + f.radius;
  if (f.kind === "torus")
    return f.center[0] + f.ringRadius + f.tubeRadius;
  if (f.kind === "prism")
    return f.center[0] + f.radius;
  if (f.kind === "wedge")
    return f.center[0] + f.width / 2;
  return null;
}
function sweptRightEdgeX(doc, f) {
  if (f.kind !== "extrude" && f.kind !== "revolve")
    return null;
  const r = rangeOf(doc, f.id, "x");
  return r && r.exact ? r.hi : null;
}
var rightEdgeX = (doc, f) => shapeRightEdgeX(f) ?? sweptRightEdgeX(doc, f);
function rightmostShapeId(doc) {
  let best = null;
  let x = -Infinity;
  for (const f of doc.features) {
    const e = rightEdgeX(doc, f);
    if (e !== null && e > x) {
      x = e;
      best = f.id;
    }
  }
  return best;
}
function unmeasuredSweptId(doc) {
  let last = null;
  for (const f of doc.features)
    if ((f.kind === "extrude" || f.kind === "revolve") && sweptRightEdgeX(doc, f) === null)
      last = f.id;
  return last;
}
function newShape(doc, kind) {
  const edges = doc.features.map((f) => rightEdgeX(doc, f)).filter((x) => x !== null);
  const cx = edges.length === 0 ? 0 : Math.max(...edges) + newHalfWidthX(kind) + 10;
  if (kind === "box") {
    return { id: nextId(doc, "box"), kind, size: [40, 40, 20], center: [cx, 0, 0] };
  }
  if (kind === "cylinder") {
    return { id: nextId(doc, "cyl"), kind, radius: 10, height: 40, center: [cx, 0, 0] };
  }
  if (kind === "cone") {
    return { id: nextId(doc, "cone"), kind, radius: 12, height: 30, center: [cx, 0, 0] };
  }
  if (kind === "torus") {
    return { id: nextId(doc, "ring"), kind, ringRadius: 14, tubeRadius: 4, center: [cx, 0, 0] };
  }
  if (kind === "prism") {
    return { id: nextId(doc, "prism"), kind, sides: 6, radius: 10, height: 30, center: [cx, 0, 0] };
  }
  if (kind === "wedge") {
    return { id: nextId(doc, "wedge"), kind, width: 30, depth: 20, height: 25, center: [cx, 0, 0] };
  }
  return { id: nextId(doc, "ball"), kind, radius: 15, center: [cx, 0, 0] };
}
function labelOf(f) {
  if (f.kind === "combine") {
    return f.op === "union" ? "Join" : f.op === "subtract" ? "Cut" : "Overlap";
  }
  return f.kind === "sketch" ? "Sketch" : f.kind === "datum" ? f.frame ? "Custom plane" : "Plane" : f.kind === "extrude" ? "Pull" : f.kind === "revolve" ? "Spin" : f.kind === "mirror" ? "Mirror" : f.kind === "pattern" ? f.mode === "circular" ? "Repeat Around" : "Repeat" : f.kind === "hole" ? "Hole" : f.kind === "shell" ? "Hollow" : f.kind === "move" ? f.copy ? "Copy" : "Move" : f.kind === "rotate" ? "Turn" : f.kind === "box" ? "Box" : f.kind === "cylinder" ? "Cylinder" : f.kind === "cone" ? "Cone" : f.kind === "torus" ? "Ring" : f.kind === "prism" ? "Prism" : f.kind === "wedge" ? "Wedge" : f.kind === "groove" ? "Groove" : f.kind === "pocket" ? "Pocket" : f.kind === "blend" ? "Blend" : f.kind === "sphere" ? "Sphere" : f.kind === "fillet" ? f.style === "chamfer" ? "Bevel" : "Round" : f.kind === "draft" ? f.whole ? "Body draft" : "Draft" : nameless(f);
}
function nameless(f) {
  return f.kind;
}
function creationOrder(id) {
  const digits = /\d+$/.exec(id);
  return digits ? parseInt(digits[0], 10) : 0;
}
function nameMap(doc) {
  const byLabel = /* @__PURE__ */ new Map();
  for (const f of doc.features) {
    const label = labelOf(f);
    const group = byLabel.get(label);
    if (group)
      group.push(f);
    else
      byLabel.set(label, [f]);
  }
  const out = {};
  for (const [label, group] of byLabel) {
    const ordered = [...group].sort((a, b) => creationOrder(a.id) - creationOrder(b.id));
    ordered.forEach((f, i) => {
      out[f.id] = f.name ?? `${label} ${i + 1}`;
    });
  }
  return out;
}
function defaultName(f, doc) {
  return nameMap(doc)[f.id] ?? labelOf(f);
}
function topLevel(doc) {
  const consumed = /* @__PURE__ */ new Set();
  const heads = /* @__PURE__ */ new Map();
  const supersede = (body, id) => {
    const from = heads.get(body) ?? body;
    consumed.add(from);
    for (const [k, v] of heads)
      if (v === from)
        heads.set(k, id);
    heads.set(body, id);
  };
  for (const f of doc.features) {
    if (f.kind === "hole")
      supersede(f.target, f.id);
    if (f.kind === "pocket" || f.kind === "groove")
      supersede(f.into, f.id);
    if (f.kind === "combine")
      f.targets.forEach((t) => consumed.add(t));
    if (f.kind === "extrude")
      consumed.add(f.target);
    if (f.kind === "revolve")
      consumed.add(f.target);
    if (f.kind === "pattern")
      consumed.add(f.target);
    if (f.kind === "hole")
      consumed.add(f.target);
    if (f.kind === "shell")
      consumed.add(f.target);
    if (f.kind === "move" && !f.copy)
      consumed.add(f.target);
    if (f.kind === "rotate")
      consumed.add(f.target);
    if (f.kind === "fillet")
      consumed.add(f.target);
    if (f.kind === "draft")
      consumed.add(f.target);
    if (f.kind === "pocket")
      consumed.add(f.into);
  }
  return doc.features.filter((f) => !consumed.has(f.id) && f.kind !== "sketch" && f.kind !== "datum");
}

// ../../script/dist/model-codegen.js
function solveDoc(doc) {
  let changed = false;
  const features = doc.features.map((f) => {
    if (f.kind !== "sketch" || !f.constraints || f.constraints.length === 0)
      return f;
    const solved = solveSketch(f.points.map((p) => [p[0], p[1]]), f.constraints);
    if (solved.residual === 0 && solved.iterations === 0)
      return f;
    const points = solved.points.map((p) => [p[0], p[1]]);
    if (points.every((p, i) => p[0] === f.points[i][0] && p[1] === f.points[i][1]))
      return f;
    if (!outlineOf({ ...f, points }).ok)
      return f;
    if (collapsedByRatio(f.points.map((p) => [p[0], p[1]]), points))
      return f;
    changed = true;
    return { ...f, points };
  });
  return changed ? { ...doc, features } : doc;
}

// ../../layer/dist/sketch-map.js
var NAMED = {
  xy: { u: [1, 0, 0], v: [0, 1, 0], n: [0, 0, 1] },
  xz: { u: [1, 0, 0], v: [0, 0, 1], n: [0, 1, 0] },
  yz: { u: [0, 1, 0], v: [0, 0, 1], n: [1, 0, 0] }
};
function frameOf(sk) {
  if (sk.frame) {
    const { origin, u, v } = sk.frame;
    return { origin, u, v, n: [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]] };
  }
  const a = NAMED[sk.plane ?? "xy"] ?? NAMED.xy;
  const o = sk.offset ?? 0;
  return { origin: a.n.map((c) => c * o), ...a };
}
var gname = (id) => `g${id}`;
var sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
var cross = (a, b) => a[0] * b[1] - a[1] * b[0];
var dot = (a, b) => a[0] * b[0] + a[1] * b[1];
var len = (a) => Math.hypot(a[0], a[1]);
var dist = (a, b) => len(sub(a, b));
var isRound = (g) => g.k === "circle" || g.k === "arc";
function arcThrough(g) {
  const a0 = Math.atan2(g.a[1] - g.c[1], g.a[0] - g.c[0]);
  const a1 = Math.atan2(g.b[1] - g.c[1], g.b[0] - g.c[0]);
  const TAU2 = Math.PI * 2;
  let sweep = ((a1 - a0) % TAU2 + TAU2) % TAU2;
  if (g.sense === "cw")
    sweep = sweep === 0 ? -TAU2 : sweep - TAU2;
  const m = a0 + sweep / 2;
  const r = g.r ?? dist(g.a, g.c);
  return [g.c[0] + r * Math.cos(m), g.c[1] + r * Math.sin(m)];
}
function mapSketch(sk, opts = {}) {
  const geoms = sk.geoms ?? sk.geom ?? [];
  const rules = sk.rules ?? [];
  const name = opts.name ?? `sk_${sk.id ?? "x"}`;
  const fr = opts.frame ?? frameOf(sk);
  const refusals = [];
  const notes = [];
  const refuse6 = (i, sentence) => {
    refusals.push({ rule: i, kind: rules[i]?.k ?? "geom", sentence });
  };
  const byId = /* @__PURE__ */ new Map();
  geoms.forEach((g, i) => {
    if (g.id !== i + 1)
      refusals.push({ rule: -1, kind: "geom", sentence: `geometry row ${i + 1} carries id ${g.id}; the soup's ids are dense and 1-based` });
    byId.set(g.id, g);
  });
  const commands = [];
  const names = [];
  commands.push({ command: "sketch.create", params: { name, plane: { origin: fr.origin, x_dir: fr.u, y_dir: fr.v } } });
  for (const g of geoms) {
    const id = gname(g.id);
    const base = { id, connect: false, ...g.construction ? { construction: true } : {} };
    if (g.k === "point") {
      commands.push({ command: "sketch.point", params: { point: g.p, id, connect: false } });
      names.push({ geom: g.id, kind: "point", curve: null, points: { a: id } });
    } else if (g.k === "line") {
      commands.push({ command: "sketch.line", params: { points: [g.a, g.b], ids: [id], connect: false, ...g.construction ? { construction: true } : {} } });
      names.push({ geom: g.id, kind: "line", curve: id, points: { a: `${id}.start`, b: `${id}.end` } });
    } else if (g.k === "circle") {
      commands.push({ command: "sketch.circle.center", params: { center: g.c, radius: g.r, ...base } });
      names.push({ geom: g.id, kind: "circle", curve: id, points: { c: `${id}.center` } });
    } else if (g.k === "arc") {
      commands.push({ command: "sketch.arc.three_point", params: { start: g.a, end: g.b, through: arcThrough(g), ...base } });
      const cw = g.sense === "cw";
      names.push({ geom: g.id, kind: "arc", curve: id, sense: g.sense, points: { a: cw ? `${id}.end` : `${id}.start`, b: cw ? `${id}.start` : `${id}.end`, c: `${id}.center` } });
    } else {
      const bad2 = g;
      refusals.push({ rule: -1, kind: "geom", sentence: `geometry ${bad2.id} is a ${bad2.k}, which this mapper does not draw (point, line, circle and arc only)` });
    }
  }
  const geomOf = (id) => byId.get(id);
  const nameOf2 = (id) => names.find((n) => n.geom === id);
  const pt = (i, id, end, { need = false, lock = false } = {}) => {
    if (id === -1)
      return "origin";
    if (id === -2 || id === -3) {
      refuse6(i, `the ${id === -2 ? "X" : "Y"} axis has no point to name`);
      return null;
    }
    const g = geomOf(id);
    if (!g) {
      refuse6(i, `names geometry ${id}, which is not in the sketch`);
      return null;
    }
    const n = nameOf2(id);
    let e = end;
    if (!e) {
      if (need) {
        refuse6(i, `needs a point of geometry ${id} and the row names none (brep-rs refuses the same row)`);
        return null;
      }
      e = lock && (g.k === "circle" || g.k === "arc") ? "c" : g.k === "circle" ? "c" : "a";
    }
    if (g.k === "point") {
      if (e !== "a") {
        refuse6(i, `geometry ${id} is a point and has no end '${e}'`);
        return null;
      }
      return n.points.a;
    }
    const ref = n.points[e];
    if (!ref) {
      refuse6(i, `geometry ${id} is a ${g.k} and has no point '${e}'`);
      return null;
    }
    return ref;
  };
  const curve = (i, id, { axes = false, only = null } = {}) => {
    if (id === -2 || id === -3) {
      if (!axes) {
        refuse6(i, `the sketch axis cannot be used here`);
        return null;
      }
      return id === -2 ? "x" : "y";
    }
    const g = geomOf(id);
    if (!g) {
      refuse6(i, `names geometry ${id}, which is not in the sketch`);
      return null;
    }
    if (g.k === "point") {
      refuse6(i, `geometry ${id} is a point, not a curve`);
      return null;
    }
    if (only && !only.includes(g.k)) {
      refuse6(i, `geometry ${id} is a ${g.k}; this rule needs ${only.join(" or ")}`);
      return null;
    }
    return nameOf2(id).curve;
  };
  const startPos = (id, end) => {
    if (id === -1)
      return [0, 0];
    const g = geomOf(id);
    if (!g)
      return null;
    if (g.k === "point")
      return g.p;
    if (g.k === "line")
      return end === "b" ? g.b : g.a;
    if (g.k === "circle")
      return g.c;
    if (g.k === "arc")
      return end === "b" ? g.b : end === "c" ? g.c : g.a;
    return null;
  };
  const ruleMap = [];
  const emit = (i, cmd, params) => {
    commands.push({ command: cmd, params });
    (ruleMap[i] ??= []).push(commands.length - 1);
  };
  const ruleIsDriven = (r) => r.driving === false;
  const dimBase = (r) => ruleIsDriven(r) ? { driven: true } : {};
  const value = (i, r) => {
    if (typeof r.value !== "number" || !Number.isFinite(r.value)) {
      refuse6(i, `carries no numeric value`);
      return null;
    }
    return r.value;
  };
  const joined = (a, ae, b, be) => rules.some((x) => x.k === "coincident" && (x.a === a && (x.aEnd ?? "a") === (ae ?? "a") && x.b === b && (x.bEnd ?? "a") === (be ?? "a") || x.a === b && (x.aEnd ?? "a") === (be ?? "a") && x.b === a && (x.bEnd ?? "a") === (ae ?? "a")));
  const order = [...rules.keys()].sort((x, y) => (rules[x].k === "lock" ? 0 : 1) - (rules[y].k === "lock" ? 0 : 1) || x - y);
  order.forEach((i) => {
    const r = rules[i];
    if (r.active === false) {
      notes.push(`rule ${i} (${r.k}) is inactive: skipped, as brep-rs drops it from the solve, the diagnosis and the profile`);
      ruleMap[i] = [];
      return;
    }
    switch (r.k) {
      case "coincident": {
        const a = pt(i, r.a, r.aEnd), b = pt(i, r.b, r.bEnd);
        if (a && b)
          emit(i, "sketch.constraint.coincident", { a, b });
        return;
      }
      case "pointOnObject": {
        const a = pt(i, r.a, r.aEnd);
        const b = curve(i, r.b, { axes: true, only: ["line", "circle", "arc"] });
        if (a && b)
          emit(i, "sketch.constraint.coincident", { a, b });
        return;
      }
      case "horizontal":
      case "vertical": {
        const l = curve(i, r.a, { only: ["line"] });
        if (l)
          emit(i, "sketch.constraint.horizontal_vertical", { line: l, mode: r.k });
        return;
      }
      case "parallel":
      case "perpendicular": {
        const a = curve(i, r.a, { axes: true, only: ["line"] }), b = curve(i, r.b, { axes: true, only: ["line"] });
        if (a && b)
          emit(i, `sketch.constraint.${r.k}`, { a, b });
        return;
      }
      case "equal": {
        const ga = geomOf(r.a), gb = geomOf(r.b);
        const a = curve(i, r.a, { only: ["line", "circle", "arc"] }), b = curve(i, r.b, { only: ["line", "circle", "arc"] });
        if (a && b && ga && gb) {
          const round = (g) => g.k === "circle" || g.k === "arc";
          if (round(ga) !== round(gb)) {
            refuse6(i, `equal across a line and a circle/arc is refused by brep-rs too (a radius is not a length)`);
            return;
          }
          emit(i, "sketch.constraint.equal", { a, b });
        }
        return;
      }
      case "tangent": {
        const ga = geomOf(r.a), gb = geomOf(r.b);
        const a = curve(i, r.a, { axes: true, only: ["line", "circle", "arc"] }), b = curve(i, r.b, { axes: true, only: ["line", "circle", "arc"] });
        if (!a || !b || !ga || !gb)
          return;
        const endForm = r.aEnd !== void 0 || r.bEnd !== void 0;
        if (endForm && !joined(r.a, r.aEnd, r.b, r.bEnd)) {
          refuse6(i, `is the endpoint tangent form with no coincident row joining those two ends before it; solidcraft's tangent is between curves, and it only treats it as tangent-at-the-joint when the ends are tied`);
          return;
        }
        if (isRound(ga) && isRound(gb) && r.mode) {
          const d = dist(ga.c, gb.c);
          const ext = Math.abs(d - (ga.r + gb.r));
          const int = Math.abs(d - Math.abs(ga.r - gb.r));
          const startMode = ext <= int ? "external" : "internal";
          if (startMode !== r.mode) {
            refuse6(i, `asks for ${r.mode} tangency but the circles start ${startMode}ly placed; solidcraft's tangent has no mode parameter (it keeps the branch of the starting geometry), so it cannot be requested`);
            return;
          }
          notes.push(`rule ${i} (tangent mode ${r.mode}): branch carried by the starting geometry, not requested of solidcraft`);
        }
        if (r.side !== void 0 && (ga.k === "line" && isRound(gb) || gb.k === "line" && isRound(ga))) {
          const L = ga.k === "line" ? ga : gb, C = ga.k === "line" ? gb : ga;
          const sigma = Math.sign(cross(sub(L.b, L.a), sub(C.c, L.a)));
          if (sigma !== 0 && sigma !== Math.sign(r.side)) {
            refuse6(i, `records side ${r.side} for the line/circle tangency but the circle starts on the other side of the line; solidcraft's tangent has no side parameter, so it cannot be requested`);
            return;
          }
          notes.push(`rule ${i} (tangent side ${r.side}): branch carried by the starting geometry, not requested of solidcraft`);
        }
        emit(i, "sketch.constraint.tangent", { a, b });
        return;
      }
      case "symmetric": {
        const a = pt(i, r.a, r.aEnd), b = pt(i, r.b, r.bEnd);
        if (!a || !b)
          return;
        if (r.cEnd !== void 0) {
          const c = pt(i, r.c, r.cEnd);
          if (!c)
            return;
          const m = `m${i}`;
          commands.push({ command: "sketch.line", params: { points: [a, b], ids: [m], construction: true, connect: false } });
          (ruleMap[i] ??= []).push(commands.length - 1);
          names.push({ geom: null, kind: "helper-line", curve: m, points: {}, forRule: i });
          emit(i, "sketch.constraint.midpoint", { point: c, line: m });
        } else {
          const l = curve(i, r.c, { axes: true, only: ["line"] });
          if (l)
            emit(i, "sketch.constraint.symmetry", { a, b, line: l });
        }
        return;
      }
      case "distance": {
        const v = value(i, r);
        if (v === null)
          return;
        if (!(v > 0)) {
          refuse6(i, `has value ${v}; solidcraft's distance dimension is a length and a zero or negative one is refused`);
          return;
        }
        const a = pt(i, r.a, r.aEnd, { need: true }), b = pt(i, r.b, r.bEnd, { need: true });
        if (!a || !b)
          return;
        const ga = geomOf(r.a);
        const ends = [r.aEnd, r.bEnd].sort().join("");
        if (r.a === r.b && ga?.k === "line" && ends === "ab")
          emit(i, "sketch.dimension", { entities: [nameOf2(r.a).curve], type: "length", value: v, ...dimBase(r) });
        else
          emit(i, "sketch.dimension", { entities: [a, b], type: "distance", value: v, ...dimBase(r) });
        return;
      }
      case "distanceX":
      case "distanceY": {
        const v = value(i, r);
        if (v === null)
          return;
        const a = pt(i, r.a, r.aEnd, { need: true }), b = pt(i, r.b, r.bEnd, { need: true });
        if (!a || !b)
          return;
        const ax = r.k === "distanceX" ? 0 : 1;
        if (v === 0) {
          if (r.driving === false) {
            refuse6(i, `is a reference ${r.k} of 0; solidcraft has no reference form of a point-pair level constraint`);
            return;
          }
          emit(i, "sketch.constraint.horizontal_vertical", { points: [a, b], mode: r.k === "distanceX" ? "vertical" : "horizontal" });
          notes.push(`rule ${i} (${r.k} 0): emitted as a ${r.k === "distanceX" ? "vertical" : "horizontal"}-points constraint (no parameter), not a dimension`);
          return;
        }
        const pa = startPos(r.a, r.aEnd), pb = startPos(r.b, r.bEnd);
        const s = pa && pb ? pb[ax] - pa[ax] : 0;
        if (Math.abs(s) < 1e-9) {
          refuse6(i, `the two points start level in ${r.k === "distanceX" ? "x" : "y"}, so the side (sign) of the signed ${r.k} ${v} is not carried by the starting geometry`);
          return;
        }
        if (Math.sign(s) !== Math.sign(v)) {
          refuse6(i, `is the SIGNED ${r.k} ${v} (brep-rs) but the points start ${s > 0 ? "positive" : "negative"}; solidcraft's ${r.k === "distanceX" ? "horizontal" : "vertical"} dimension is |d| and keeps the starting side, so the sign cannot be requested`);
          return;
        }
        emit(i, "sketch.dimension", { entities: [a, b], type: r.k === "distanceX" ? "horizontal" : "vertical", value: Math.abs(v), ...dimBase(r) });
        return;
      }
      case "radius":
      case "diameter": {
        const v = value(i, r);
        if (v === null)
          return;
        if (!(v > 0)) {
          refuse6(i, `has value ${v}; a radius or diameter must be positive`);
          return;
        }
        const c = curve(i, r.a, { only: ["circle", "arc"] });
        if (c)
          emit(i, "sketch.dimension", { entities: [c], type: r.k, value: v, ...dimBase(r) });
        return;
      }
      case "angle": {
        const v = value(i, r);
        if (v === null)
          return;
        const ga = geomOf(r.a), gb = geomOf(r.b);
        const a = curve(i, r.a, { only: ["line"] }), b = curve(i, r.b, { only: ["line"] });
        if (!a || !b || !ga || !gb)
          return;
        const da = sub(ga.b, ga.a), db = sub(gb.b, gb.a);
        if (len(da) < 1e-12 || len(db) < 1e-12) {
          refuse6(i, `has a zero-length line at the start; the angle between it and another is undefined`);
          return;
        }
        const toDeg = (x) => x * 180 / Math.PI;
        let ang = Math.atan2(cross(da, db), dot(da, db));
        let swapped = false;
        if (ang < 0) {
          ang = -ang;
          swapped = true;
        }
        const direct = { value: ang, swapped, flip: false };
        const supp = { value: Math.PI - ang, swapped: !swapped, flip: true };
        let [cur, alt] = ang <= Math.PI / 2 ? [direct, supp] : [supp, direct];
        const want = v * Math.PI / 180;
        if (Math.abs(want - alt.value) < Math.abs(want - cur.value))
          cur = alt;
        const eff = cur.swapped ? -want : want;
        const effDeg = (toDeg(eff) % 180 + 180) % 180;
        const wantDeg = (v % 180 + 180) % 180;
        const dd = Math.min(Math.abs(effDeg - wantDeg), 180 - Math.abs(effDeg - wantDeg));
        if (dd > 1e-6) {
          refuse6(i, `is the directed angle ${v} deg from line ${r.a} to line ${r.b}; from this starting geometry solidcraft would apply the value to the opposite orientation (it would hold ${effDeg.toFixed(6)} deg from ${r.a} to ${r.b}); its angle dimension is undirected and takes its orientation from the start state`);
          return;
        }
        if (r.quadrant)
          notes.push(`rule ${i} (angle quadrant ${r.quadrant}): brep-rs's quadrant never enters its residual either; orientation carried by the starting geometry`);
        emit(i, "sketch.dimension", { entities: [a, b], type: "angle", value: `${v} deg`, ...dimBase(r) });
        return;
      }
      case "lock": {
        if (r.driving === false) {
          refuse6(i, `a lock cannot be a reference measurement`);
          return;
        }
        const p = pt(i, r.a, r.aEnd, { lock: true });
        if (p)
          emit(i, "sketch.constraint.fix", { entity: p, fixed: true });
        return;
      }
      default:
        refuse6(i, `kind '${r.k}' is not in the soup vocabulary this mapper knows`);
    }
  });
  if (refusals.length)
    return { ok: false, refusals, names, notes };
  return { ok: true, commands, names, ruleMap, notes, sketchName: name, frame: fr };
}
function docProfileIndices(profileList, geoms) {
  const segs = [];
  const live2 = geoms.filter((g) => !g.construction && g.k !== "point");
  const parent = live2.map((_, i) => i);
  const find = (i) => parent[i] === i ? i : parent[i] = find(parent[i]);
  const ends = (g) => g.k === "line" || g.k === "arc" ? [g.a, g.b] : [];
  for (let i = 0; i < live2.length; i++)
    for (let j = i + 1; j < live2.length; j++) {
      if (ends(live2[i]).some((p) => ends(live2[j]).some((q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < 1e-6)))
        parent[find(i)] = find(j);
    }
  const arcPts = (g, n = 96) => {
    const a0 = Math.atan2(g.a[1] - g.c[1], g.a[0] - g.c[0]);
    const a1 = Math.atan2(g.b[1] - g.c[1], g.b[0] - g.c[0]);
    const TAU2 = Math.PI * 2;
    let sw = ((a1 - a0) % TAU2 + TAU2) % TAU2;
    if (g.sense === "cw")
      sw = sw === 0 ? -TAU2 : sw - TAU2;
    const r = Math.hypot(g.a[0] - g.c[0], g.a[1] - g.c[1]);
    return Array.from({ length: n + 1 }, (_, k) => [g.c[0] + r * Math.cos(a0 + sw * k / n), g.c[1] + r * Math.sin(a0 + sw * k / n)]);
  };
  live2.forEach((g, i) => {
    const key = find(i);
    let pts;
    if (g.k === "line")
      pts = [g.a, g.b];
    else if (g.k === "arc")
      pts = arcPts(g);
    else
      pts = Array.from({ length: 97 }, (_, k) => [g.c[0] + g.r * Math.cos(2 * Math.PI * k / 96), g.c[1] + g.r * Math.sin(2 * Math.PI * k / 96)]);
    for (let k = 0; k + 1 < pts.length; k++)
      segs.push([key, pts[k], pts[k + 1]]);
  });
  const inside2 = (pt, key) => {
    let c = false;
    for (const [k, p, q] of segs) {
      if (k !== key)
        continue;
      if (p[1] > pt[1] !== q[1] > pt[1] && pt[0] < (q[0] - p[0]) * (pt[1] - p[1]) / (q[1] - p[1]) + p[0])
        c = !c;
    }
    return c;
  };
  const keys = [...new Set(segs.map((s) => s[0]))];
  return profileList.map((p, i) => ({ i, d: keys.filter((k) => inside2(p.interior, k)).length })).filter((x) => x.d % 2 === 1).map((x) => x.i);
}

// ../../layer/dist/follow-moves.js
var I3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
var mul = (A, B) => A.map((r) => [0, 1, 2].map((j) => r[0] * B[0][j] + r[1] * B[1][j] + r[2] * B[2][j]));
var app = (R, v) => R.map((r) => r[0] * v[0] + r[1] * v[1] + r[2] * v[2]);
var dot2 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
var SIN = [0, 1, 0, -1];
var COS = [1, 0, -1, 0];
function quarter(axis, k) {
  const q = (k % 4 + 4) % 4;
  const c = COS[q];
  const s = SIN[q];
  if (axis === 0)
    return [[1, 0, 0], [0, c, -s], [0, s, c]];
  if (axis === 1)
    return [[c, 0, s], [0, 1, 0], [-s, 0, c]];
  return [[c, -s, 0], [s, c, 0], [0, 0, 1]];
}
function quarterTurns(angles) {
  let R = I3;
  for (let i = 0; i < 3; i++) {
    const a = angles[i] ?? 0;
    if (typeof a !== "number" || !Number.isFinite(a) || Math.abs(a / 90 - Math.round(a / 90)) > 1e-9)
      return null;
    R = mul(quarter(i, Math.round(a / 90)), R);
  }
  return R;
}
var PASS_TARGET = ["shell", "draft", "hole", "fillet"];
var PASS_INTO = ["pocket", "groove"];
function followMoves(rr, env) {
  if (!rr.ok || rr.kind !== "face" || !rr.plane)
    return rr;
  const nm = rr.evidence.name;
  const byId = new Map(env.features.map((f) => [f.id, f]));
  const root = rr.shape.featureId;
  const back = [];
  let cur = env.targetId;
  let blocker = null;
  for (const seen = /* @__PURE__ */ new Set(); cur !== root; ) {
    if (seen.has(cur)) {
      blocker = null;
      break;
    }
    seen.add(cur);
    const g = byId.get(cur);
    if (!g) {
      blocker = null;
      break;
    }
    if (g.kind === "move") {
      if (g.copy)
        return fail(`${nm} names a face of ${root}, but ${g.id} is a copying move, so which copy the name means is not known; nothing is picked`);
      back.push({ kind: "move", t: g.offset ?? [0, 0, 0] });
      cur = g.target ?? "";
      continue;
    }
    if (g.kind === "rotate") {
      const R = quarterTurns(g.angles ?? [0, 0, 0]);
      if (!R)
        return fail(`${nm} names a face of ${root}, but ${g.id} turns the part by ${(g.angles ?? []).join(", ")} degrees, and a name is carried only through a turn of whole quarter turns (90, 180 or 270 degrees) about x, y or z; nothing is picked`);
      const bb = env.bboxOf(g.target ?? "");
      if (!bb)
        return fail(`${nm} names a face of ${root}, but there is no measured bounding box for ${g.target} to turn ${g.id} about; nothing is picked`);
      back.push({ kind: "turn", R, c: [0, 1, 2].map((i) => (bb[i] + bb[i + 3]) / 2), id: g.id });
      cur = g.target ?? "";
      continue;
    }
    if (PASS_TARGET.includes(g.kind)) {
      cur = g.target ?? "";
      continue;
    }
    if (PASS_INTO.includes(g.kind)) {
      cur = g.into ?? "";
      continue;
    }
    blocker ??= g;
    cur = (g.kind === "combine" ? g.targets?.[0] : g.target) ?? g.into ?? "";
  }
  if (!back.length)
    return rr;
  if (cur !== root || blocker) {
    const why = blocker ? `${blocker.id} is a ${blocker.kind}` : "the history between them cannot be read";
    return fail(`${nm} names a face of ${root}, but the part was moved or turned and then ${why}; a name is carried through a move or a quarter turn only, so nothing is picked`);
  }
  let n = rr.plane.n;
  let d = rr.plane.d;
  let pt = rr.point;
  const trail = [];
  for (const s of back.slice().reverse()) {
    if (s.kind === "move") {
      d += dot2(n, s.t);
      if (pt)
        pt = pt.map((v, i) => v + s.t[i]);
      trail.push(`move ${s.t.join(",")}`);
    } else {
      const n2 = app(s.R, n);
      d += dot2(n2, s.c) - dot2(n, s.c);
      if (pt) {
        const q = app(s.R, pt.map((v, i) => v - s.c[i]));
        pt = q.map((v, i) => v + s.c[i]);
      }
      n = n2;
      trail.push(`turn ${s.id}`);
    }
  }
  const out = { ...rr, plane: { n, d }, point: pt, evidence: { ...rr.evidence, followed: { from: root, to: env.targetId, steps: trail, plane: { n, d } } } };
  return out;
}
var fail = (sentence) => ({ ok: false, sentence });

// ../../layer/dist/resolve-names.js
var dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
var sub2 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
var nrm = (a) => Math.hypot(a[0], a[1], a[2]);
var AXV = { "+x": [1, 0, 0], "-x": [-1, 0, 0], "+y": [0, 1, 0], "-y": [0, -1, 0], "+z": [0, 0, 1], "-z": [0, 0, -1] };
var ANGLE_TOL = 1e-6;
var view = (f) => f;
function nameText(n) {
  if (!n || typeof n !== "object")
    return String(n);
  switch (n.cause) {
    case "primitive":
      return `${n.feature}.${n.kind}[${n.part}]`;
    case "swept":
      return `${n.feature}.${n.kind}[${n.from}.edge${n.edge}]`;
    case "rounded":
      return `${n.feature}.${n.kind}[${n.from}.corner${n.corner}]`;
    case "cap":
      return `${n.feature}.cap[${n.end}]`;
    case "carried":
      return `${n.feature}.same[${nameText(n.of)}]`;
    case "between":
      return `${n.feature}.edge[${nameText(n.of?.[0])} ^ ${nameText(n.of?.[1])}]`;
    default: {
      const o = n;
      return `${o.feature ?? "?"}.${o.cause ?? "?"}`;
    }
  }
}
var fail2 = (sentence) => ({ ok: false, sentence });
var scaleOf = (shape) => {
  let s = 1;
  for (const f of shape.faces)
    for (const v of f.centroid)
      s = Math.max(s, Math.abs(v));
  for (const e of shape.edges)
    for (const p of [e.start, e.mid, e.end])
      for (const v of p)
        s = Math.max(s, Math.abs(v));
  return s;
};
var planarOf = (f) => f.plane_normal && nrm(f.plane_normal) > 0.5 ? { n: f.plane_normal, d: dot3(f.plane_normal, f.centroid) } : null;
var parallel = (a, b) => dot3(a, b) >= 1 - ANGLE_TOL;
function pickPoint(f, tol) {
  const ok = (h2) => h2 && h2.index === f.index && h2.dist <= tol;
  if (ok(f.centroid_hit))
    return { ok: true, point: f.centroid, source: "centroid" };
  if (f.inner_point && ok(f.inner_hit))
    return { ok: true, point: f.inner_point, source: "interior point (largest display triangle); the centroid is off the face" };
  const h = f.centroid_hit;
  return { ok: false, why: h ? `solidcraft's nearest-face rule sends a pick at its centroid to face ${h.index} (${h.dist.toExponential(2)} mm away), not to face ${f.index}, and no interior point on it survives the same test` : "the topology snapshot has no pick-hit for it" };
}
async function resolveName(name, env, want) {
  const r = name?.cause === "between" ? await resolveEdge(name, env) : await resolveFaceName(name, env);
  if (!r.ok)
    return r;
  if (want && r.kind !== want)
    return fail2(`${nameText(name)} names ${r.kind === "edge" ? "an edge" : r.kind === "faceset" ? `a set of ${r.faces.length} faces` : "a face"}, but this feature needs ${want === "edge" ? "an edge" : "a face"}`);
  if (r.kind === "face") {
    const tol = 1e-6 * Math.max(1, scaleOf(r.shape)) * 10;
    const p = pickPoint(r.faces[0], Math.max(tol, 1e-4));
    r.point = p.ok ? p.point : null;
    r.evidence.pickPoint = p.ok ? `own shape: ${p.source}` : `own shape: none (${p.why})`;
  }
  return r;
}
async function resolveFaceName(name, env) {
  const t = nameText(name);
  if (!name || name.kind !== "face")
    return fail2(`${t} is not a face name`);
  const f = env.features.find((x) => x.id === name.feature);
  if (!f)
    return fail2(`${t}: there is no feature ${name.feature} before this one`);
  switch (name.cause) {
    case "primitive":
      return primitiveFace(name, view(f), env, t);
    case "cap":
      return capFace(name, view(f), env, t);
    case "swept":
      return sweptFace(name, view(f), env, t);
    case "carried":
      return carriedFace(name, view(f), env, t);
    case "rounded":
      return fail2(`${t}: a name made by a ROUNDED sketch corner is not resolved in the browser demo (only primitive, cap, swept-by-a-straight-edge, carried-plane and between names are)`);
    case "split":
    case "made":
      return fail2(`${t}: a '${name.cause}' name (a piece of a face, or a face an operation made) is not resolved in the browser demo; it needs a discriminator point and solidcraft has no history record to read it from`);
    default:
      return fail2(`${t}: the name cause '${name.cause}' is not one this demo knows`);
  }
}
function finishFace(t, shape, cands, extra) {
  if (cands.length === 0)
    return fail2(`${t} matches no face on ${shape.bodyName} (${extra.rule}); not guessing`);
  if (cands.length > 1)
    return fail2(`${t} matches ${cands.length} faces on ${shape.bodyName} (${cands.map((c) => c.name).join(", ")}; ${extra.rule}); a name must pick exactly one, so nothing is picked`);
  const face = cands[0];
  return {
    ok: true,
    kind: "face",
    area: face.area,
    shape,
    faces: [face],
    plane: planarOf(face),
    evidence: { name: t, candidates: 1, engineFace: face.name, rule: extra.rule, checks: extra.checks ?? [] }
  };
}
async function shapeFor(env, featureId, t) {
  const s = await env.shapeOf(featureId);
  if (!s.ok)
    return fail2(`${t}: ${s.sentence}`);
  return s;
}
var rotated = (f) => Array.isArray(f.rotate) && f.rotate.some((v) => v);
async function primitiveFace(name, f, env, t, world = false) {
  const part = name.part;
  const isPrim = ["box", "cylinder", "prism"].includes(f.kind);
  const turn = isPrim && rotated(f) && env.followTurns ? quarterTurns(f.rotate) : null;
  if (world) {
    if (!turn || part === "side" || !AXV[part])
      return fail2(`${t}: no world-frame reading`);
    const shape2 = await shapeFor(env, f.id, t);
    if (!shape2.ok)
      return shape2;
    const tol2 = 1e-6 * Math.max(1, scaleOf(shape2));
    const dir2 = AXV[part];
    const planar2 = shape2.faces.filter((x) => x.plane_normal && parallel(x.plane_normal, dir2));
    const best2 = planar2.length ? Math.max(...planar2.map((x) => dot3(x.centroid, dir2))) : null;
    const cands2 = planar2.filter((x) => best2 !== null && Math.abs(dot3(x.centroid, dir2) - best2) <= tol2 * 10);
    return finishFace(t, shape2, cands2, { rule: `world frame: planar face with outward normal ${part} at the extreme along it on ${f.id}'s own shape` });
  }
  if (isPrim && rotated(f) && !turn)
    return fail2(`${t}: ${f.id} is rotated; this demo resolves primitive faces only on unrotated primitives (the part names the face by direction, and a rotated body turns solidcraft's own face labels too)`);
  if (isPrim && f.round)
    return fail2(`${t}: ${f.id} carries a whole-shape round, which changes its faces and edges; not resolved`);
  if (part === "side" && f.kind !== "cylinder")
    return fail2(`${t}: only a cylinder primitive has a 'side' face in this demo`);
  if (part !== "side" && !AXV[part])
    return fail2(`${t}: '${part}' is not a face part this demo knows`);
  if ((f.kind === "cylinder" || f.kind === "prism") && part !== "side" && part !== "+z" && part !== "-z")
    return fail2(`${t}: a ${f.kind} has no ${part} face`);
  if (["sphere", "cone", "torus", "wedge"].includes(f.kind))
    return fail2(`${t}: faces of a ${f.kind} are not resolved in the browser demo`);
  const shape = await shapeFor(env, f.id, t);
  if (!shape.ok)
    return shape;
  const tol = 1e-6 * Math.max(1, scaleOf(shape));
  const c = f.center ?? [0, 0, 0];
  if (part === "side") {
    const curved = shape.faces.filter((x) => !x.plane_normal);
    if (curved.length === 0)
      return fail2(`${t} matches no curved face on ${shape.bodyName}; not guessing`);
    return { ok: true, kind: "faceset", faces: curved, shape, evidence: { name: t, candidates: curved.length, engineFaces: curved.map((x) => x.name), rule: "every non-planar face of the cylinder primitive" } };
  }
  const dirLocal = AXV[part];
  const dir = turn ? turn.map((row) => Math.round(row[0] * dirLocal[0] + row[1] * dirLocal[1] + row[2] * dirLocal[2])) : dirLocal;
  const planar = shape.faces.filter((x) => x.plane_normal && parallel(x.plane_normal, dir));
  const best = planar.length ? Math.max(...planar.map((x) => dot3(x.centroid, dir))) : null;
  const cands = planar.filter((x) => best !== null && Math.abs(dot3(x.centroid, dir) - best) <= tol * 10);
  const checks = [];
  if (cands.length === 1 && isPrim) {
    const axis = dir.findIndex((v) => v !== 0);
    const axisLocal = dirLocal.findIndex((v) => v !== 0);
    const half = f.kind === "box" ? f.size[axisLocal] / 2 : f.height / 2;
    const docOffset = (c[axis] + Math.sign(dir[axis]) * half) * Math.sign(dir[axis]);
    const got = dot3(cands[0].centroid, dir);
    const okDoc = Math.abs(got - docOffset) <= 1e-6 * Math.max(1, Math.abs(docOffset));
    checks.push({ check: "doc plane", expected: docOffset, got, agree: okDoc });
    if (!okDoc)
      return fail2(`${t}: solidcraft's face ${cands[0].name} is at ${got} along ${part} but ${f.id}'s own parameters put that face at ${docOffset}; the two disagree, so nothing is picked`);
    const want = shape.featureNumber != null ? persistentPrimitive(f.kind, shape.featureNumber, part) : null;
    if (want) {
      const ok = cands[0].name === want || cands[0].name.startsWith(want + "#");
      checks.push({ check: "engine persistent name", expected: want, got: cands[0].name, agree: ok });
      if (!ok)
        return fail2(`${t}: solidcraft names that face ${cands[0].name}, not ${want} as a ${f.kind}'s ${part} should be; the two disagree, so nothing is picked`);
    } else
      checks.push({ check: "engine persistent name", agree: null, note: "feature number or kind not mapped; skipped" });
  } else if (cands.length === 1) {
    checks.push({ check: "doc plane", agree: null, note: `${f.id} is a ${f.kind}: no doc-derived plane for a built shape; the rule is geometry on solidcraft's own shape only` });
  }
  return finishFace(t, shape, cands, { rule: `planar face with outward normal ${part} at the extreme along it on ${f.id}'s own shape`, checks });
}
function persistentPrimitive(kind, n, part) {
  if (kind === "box")
    return `F${n}:${part}`;
  if (kind === "cylinder")
    return part === "+z" ? `F${n}:top` : part === "-z" ? `F${n}:bottom` : null;
  return null;
}
function extrudeOf(env, f, t) {
  if (f.kind !== "extrude")
    return { err: fail2(`${t}: ${f.id} is a ${f.kind}, not a plain extrude; sweep names of other features are not resolved in the browser demo`) };
  for (const k of ["midplane", "length2", "reversed", "taper", "direction", "alongNormal"]) {
    if (f[k])
      return { err: fail2(`${t}: ${f.id} uses the ${k} option, which the translator does not map; not resolved`) };
  }
  const sk = env.features.find((x) => x.id === f.target && x.kind === "sketch");
  if (!sk)
    return { err: fail2(`${t}: ${f.id}'s sketch ${f.target} is not in the document before this feature`) };
  const f0 = env.sketchFrame(sk);
  const [u, v] = [f0.u, f0.v];
  const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  return { sk, fr: { ...f0, n } };
}
async function capFace(name, f, env, t) {
  const { fr, err } = extrudeOf(env, f, t);
  if (err)
    return err;
  if (name.end !== "top" && name.end !== "bottom")
    return fail2(`${t}: cap end '${name.end}' is not top or bottom`);
  const shape = await shapeFor(env, f.id, t);
  if (!shape.ok)
    return shape;
  const tol = 1e-6 * Math.max(1, scaleOf(shape));
  const outward = name.end === "top" ? fr.n : fr.n.map((v) => -v);
  const d = dot3(fr.origin, fr.n) + (name.end === "top" ? f.height : 0);
  const want = d * (name.end === "top" ? 1 : -1);
  const cands = shape.faces.filter((x) => x.plane_normal && parallel(x.plane_normal, outward) && Math.abs(dot3(x.centroid, outward) - want) <= tol * 10);
  return finishFace(t, shape, cands, { rule: `planar face, outward normal along the sketch normal ${name.end === "top" ? "" : "reversed "}at the sketch plane${name.end === "top" ? " + height" : ""}`, checks: [{ check: "doc plane", expected: want, agree: cands.length === 1 }] });
}
async function sweptFace(name, f, env, t) {
  const { sk, fr, err } = extrudeOf(env, f, t);
  if (err)
    return err;
  if (name.from !== sk.id)
    return fail2(`${t}: the name was written against sketch ${name.from} but ${f.id} sweeps ${sk.id}; not resolved`);
  if (sk.shape === "circle" || Array.isArray(sk.geoms) && sk.geoms.length)
    return fail2(`${t}: ${sk.id} is a circle or a rows-and-rules sketch; a swept name over it is not resolved in the browser demo`);
  const o = env.outline(sk);
  if (!o.ok)
    return fail2(`${t}: ${sk.id} has no usable outline`);
  const pts = o.points;
  const designN = Array.isArray(sk.points) ? sk.points.length : null;
  if (designN === null || pts.length !== designN)
    return fail2(`${t}: ${sk.id} has rounded or chamfered corners (its outline has ${pts.length} segments for ${designN ?? "?"} design edges), so the sketch edge index does not map to one straight wall; not resolved`);
  const i = name.edge;
  if (!Number.isInteger(i) || i < 0 || i >= pts.length)
    return fail2(`${t}: ${sk.id} has no edge ${String(i)}`);
  if ((o.bulges ?? {})[i])
    return fail2(`${t}: sketch edge ${i} of ${sk.id} is an arc; a swept name over an arc is not resolved in the browser demo (only straight edges are)`);
  const a2 = pts[i];
  const b2 = pts[(i + 1) % pts.length];
  const w = (p) => [0, 1, 2].map((k) => fr.origin[k] + fr.u[k] * p[0] + fr.v[k] * p[1]);
  const A = w(a2);
  const B = w(b2);
  const dir = sub2(B, A);
  const L = nrm(dir);
  if (L < 1e-9)
    return fail2(`${t}: sketch edge ${i} has zero length`);
  const e = dir.map((v) => v / L);
  const cr = [fr.n[1] * e[2] - fr.n[2] * e[1], fr.n[2] * e[0] - fr.n[0] * e[2], fr.n[0] * e[1] - fr.n[1] * e[0]];
  const cn = nrm(cr);
  const nOut = cr.map((v) => v / cn);
  const shape = await shapeFor(env, f.id, t);
  if (!shape.ok)
    return shape;
  const tol = 1e-6 * Math.max(1, scaleOf(shape));
  const mid = [0, 1, 2].map((k) => (A[k] + B[k]) / 2 + fr.n[k] * f.height / 2);
  const cands = shape.faces.filter((x) => x.plane_normal && Math.abs(Math.abs(dot3(x.plane_normal, nOut)) - 1) <= ANGLE_TOL && nrm(sub2(x.centroid, mid)) <= tol * 10 && Math.abs(x.area - L * Math.abs(f.height)) <= 1e-6 * Math.max(1, L * Math.abs(f.height)));
  return finishFace(t, shape, cands, { rule: `planar wall through sketch edge ${i} lifted by the height (centroid and area match)`, checks: [{ check: "doc wall centroid", expected: mid, agree: cands.length === 1 }] });
}
async function carriedFace(name, f, env, t) {
  if (["move", "rotate", "mirror", "pattern"].includes(f.kind))
    return fail2(`${t}: ${f.id} is a ${f.kind}, which moves or copies faces; a carried name through it is not resolved`);
  if (!name.of || name.of.kind !== "face")
    return fail2(`${t}: a carried name must wrap a face name`);
  const parent = await resolveFaceName(name.of, env);
  if (!parent.ok)
    return fail2(`${t}: its parent ${parent.sentence}`);
  return liftTo(parent, f.id, env, t);
}
async function liftTo(r, T, env, t) {
  if (r.shape.featureId === T)
    return r;
  if (r.kind === "faceset")
    return fail2(`${t}: its face is a set of ${r.faces.length} faces (a cylinder wall split at the seam); lifting a set through ${T} is not resolved`);
  if (!r.plane)
    return fail2(`${t}: the face ${r.faces[0].name} is curved; a CURVED face carried through ${T} is not resolved in the browser demo (it would have to be matched by surface, and only planes are)`);
  const Tf = env.features.find((x) => x.id === T);
  if (!Tf)
    return fail2(`${t}: there is no feature ${T} before this one`);
  const tv = view(Tf);
  if (["move", "rotate", "mirror", "pattern"].includes(tv.kind))
    return fail2(`${t}: ${T} is a ${tv.kind}, which moves or copies faces; a name through it is not resolved`);
  const consumed = [...tv.targets ?? [], tv.target, tv.into].filter(Boolean);
  if (!consumed.includes(r.shape.featureId))
    return fail2(`${t}: ${T} does not take ${r.shape.featureId} as an input (it takes ${consumed.join(", ") || "nothing"}), so the face cannot have been carried through it`);
  const flip = tv.kind === "combine" && tv.op === "subtract" && tv.targets.indexOf(r.shape.featureId) >= 1;
  const shape = await shapeFor(env, T, t);
  if (!shape.ok)
    return shape;
  const tol = 1e-6 * Math.max(1, scaleOf(shape));
  const n = flip ? r.plane.n.map((v) => -v) : r.plane.n;
  const d = flip ? -r.plane.d : r.plane.d;
  const cands = shape.faces.filter((x) => x.plane_normal && parallel(x.plane_normal, n) && Math.abs(dot3(x.centroid, n) - d) <= tol * 10);
  const checks = [...r.evidence.checks ?? [], { check: "lift", from: r.shape.featureId, to: T, flipped: flip, plane: { n, d } }];
  if (cands.length === 1) {
    const ratio = cands[0].area / r.faces[0].area;
    checks.push({ check: "area vs original", ratio });
    if (ratio > 1 + 1e-6)
      return fail2(`${t}: the face on that plane of ${T} is LARGER than the original (${cands[0].area} vs ${r.faces[0].area}); it was merged with another face, so it is not the carried one; nothing is picked`);
    const nm = cands[0].name;
    const was = r.faces[0].name;
    const same2 = nm === was || nm.startsWith(was + "#") || was.startsWith(nm + "#");
    checks.push({ check: "engine persistent name kept", expected: was, got: nm, agree: same2 });
    if (!same2)
      return fail2(`${t}: the face on that plane of ${T} is named ${nm} by solidcraft, not ${was}; the geometry and the persistent names disagree, so nothing is picked`);
  }
  const out = finishFace(t, shape, cands, { rule: `the planar face on ${r.faces[0].name}'s plane${flip ? " (flipped: it was a subtracted tool)" : ""} on ${T}'s own shape`, checks });
  if (out.ok)
    out.evidence.liftedFrom = r.evidence;
  return out;
}
var parseEdgeName = (n) => {
  if (typeof n !== "string")
    return null;
  const parts = n.replace(/~\d+$/, "").split("|");
  return parts.length === 2 ? parts : null;
};
var near = (p, q, tol) => nrm(sub2(p, q)) <= tol;
async function resolveEdge(name, env) {
  const t = nameText(name);
  if (name.kind !== "edge" || !Array.isArray(name.of) || name.of.length !== 2)
    return fail2(`${t} is not a well-formed between name`);
  const f = env.features.find((x) => x.id === name.feature);
  if (!f)
    return fail2(`${t}: there is no feature ${name.feature} before this one`);
  let A = await resolveFaceNameOrSet(name.of[0], env);
  if (!A.ok)
    return fail2(`${t} cannot be resolved: ${A.sentence}`);
  let B = await resolveFaceNameOrSet(name.of[1], env);
  if (!B.ok)
    return fail2(`${t} cannot be resolved: ${B.sentence}`);
  const clash = await turnedFrameClash(name, env, A, B, t);
  if (clash)
    return clash;
  A = await liftTo(A, name.feature, env, t);
  if (!A.ok)
    return A;
  B = await liftTo(B, name.feature, env, t);
  if (!B.ok)
    return B;
  if (A.shape.bodyName !== B.shape.bodyName || A.shape.featureId !== B.shape.featureId)
    return fail2(`${t}: its two faces live on different shapes (${A.shape.featureId} and ${B.shape.featureId}); an edge between faces of two different features is not resolved`);
  const shape = A.shape;
  const tol = 1e-6 * Math.max(1, scaleOf(shape));
  const aNames = new Set(A.faces.map((x) => x.name));
  const bNames = new Set(B.faces.map((x) => x.name));
  const planeA = A.faces.length === 1 ? planarOf(A.faces[0]) : null;
  const planeB = B.faces.length === 1 ? planarOf(B.faces[0]) : null;
  const onPlane = (e, pl) => [e.start, e.mid, e.end].every((p) => Math.abs(dot3(pl.n, p) - pl.d) <= tol * 10);
  const byName = shape.edges.filter((e) => {
    const pr = parseEdgeName(e.name);
    return pr && (aNames.has(pr[0]) && bNames.has(pr[1]) || aNames.has(pr[1]) && bNames.has(pr[0]));
  });
  let cands;
  let geoAll = null;
  if (planeA && planeB) {
    geoAll = shape.edges.filter((e) => onPlane(e, planeA) && onPlane(e, planeB));
    const all = geoAll;
    const sameSet = all.length === byName.length && all.every((e) => byName.some((x) => x.index === e.index));
    if (!sameSet)
      return fail2(`${t}: geometry finds ${all.length} edge(s) on both planes but solidcraft's persistent edge names find ${byName.length}; the two disagree, so nothing is picked`);
    cands = all;
  } else {
    const pl = planeA ?? planeB;
    cands = pl ? byName.filter((e) => onPlane(e, pl)) : byName;
    if (byName.length !== cands.length)
      return fail2(`${t}: ${byName.length - cands.length} of the edges solidcraft names for it do not lie on the planar face's plane; the two disagree, so nothing is picked`);
  }
  if (cands.length === 0)
    return fail2(`${t} matches no edge on ${shape.bodyName} (the two faces do not meet there any more, or never did); not guessing`);
  if (cands.length > 1) {
    const ends = cands.flatMap((e) => [e.start, e.end]);
    const closed = ends.every((p, i) => ends.filter((q, j) => j !== i && near(p, q, tol * 10)).length === 1);
    if (!closed)
      return fail2(`${t} matches ${cands.length} separate edges on ${shape.bodyName} (${cands.map((e) => e.name).join(", ")}) that do not form one closed loop; a name must pick exactly one edge, so nothing is picked`);
  }
  const e0 = cands[0];
  return {
    ok: true,
    kind: "edge",
    point: e0.mid,
    length: cands.reduce((s, e) => s + e.length, 0),
    shape,
    edges: cands,
    evidence: {
      name: t,
      candidates: cands.length,
      loop: cands.length > 1,
      engineEdges: cands.map((e) => e.name),
      pointOn: e0.name,
      facesA: [...aNames],
      facesB: [...bNames],
      checks: [planeA && planeB ? { check: "geometry vs persistent names", agree: true, geometric: geoAll.length, named: byName.length } : { check: "persistent names + plane of the planar face", agree: true, named: byName.length }]
    }
  };
}
async function turnedFrameClash(name, env, A, B, t) {
  if (!env.followTurns)
    return null;
  const names = (r) => new Set(r.faces.map((x) => x.name));
  const own = [names(A), names(B)];
  const world = [];
  let turned = null;
  let noWorld = false;
  let noWorldBottom = null;
  for (let i = 0; i < 2; i++) {
    const n = name.of[i];
    const raw = n?.cause === "primitive" ? env.features.find((x) => x.id === n.feature) : void 0;
    const f = raw ? view(raw) : null;
    if (!f || n.cause !== "primitive" || !["box", "cylinder", "prism"].includes(f.kind) || !rotated(f) || !quarterTurns(f.rotate)) {
      world.push(own[i]);
      continue;
    }
    turned = f;
    if (n.part === "side") {
      world.push(own[i]);
      continue;
    }
    const w = await primitiveFace(n, f, env, nameText(n), true);
    if (!w.ok) {
      if (f.kind === "cylinder" && n.part === "-z")
        noWorldBottom = f;
      noWorld = true;
      continue;
    }
    world.push(names(w));
  }
  if (noWorldBottom)
    return fail2(`${t}: ${noWorldBottom.id} is rotated; this demo resolves primitive faces only on unrotated primitives, and the bottom of a cylinder turned onto its side has no world-frame reading that a second oracle confirms; nothing is picked`);
  if (noWorld)
    return null;
  if (!turned)
    return null;
  const same2 = (a, b) => a.size === b.size && [...a].every((x) => b.has(x));
  if (same2(own[0], world[0]) && same2(own[1], world[1]) || same2(own[0], world[1]) && same2(own[1], world[0]))
    return null;
  const show = (s) => s.map((x) => [...x].join("+")).join(" ^ ");
  return fail2(`${t}: ${turned.id} is rotated; this demo resolves primitive faces only on unrotated primitives unless the name means one edge either way, and after this turn it does not (${show(own)} in ${turned.id}'s own frame, ${show(world)} in the world frame); nothing is picked`);
}
async function resolveFaceNameOrSet(name, env) {
  const r = await resolveFaceName(name, env);
  if (!r.ok)
    return r;
  return { ...r, faces: r.faces };
}

// ../../layer/dist/rule-check.js
var sub3 = (a, b) => [a[0] - b[0], a[1] - b[1]];
var cross2 = (a, b) => a[0] * b[1] - a[1] * b[0];
var dot4 = (a, b) => a[0] * b[0] + a[1] * b[1];
var len2 = (a) => Math.hypot(a[0], a[1]);
function pointOf(g, end, lock = false) {
  if (!g)
    return null;
  if (g.k === "point")
    return g.p;
  if (g.k === "line")
    return end === "b" ? g.b : g.a;
  if (g.k === "circle")
    return g.c;
  if (g.k === "arc")
    return end === "c" ? g.c : end === "b" ? g.b : lock ? g.c : g.a;
  return null;
}
function checkRules(geoms, rules, start = null) {
  const byId = new Map(geoms.map((g) => [g.id, g]));
  const sById = new Map((start ?? []).map((g) => [g.id, g]));
  const P = (id, end, lock) => id === -1 ? [0, 0] : pointOf(byId.get(id), end, lock);
  const out = [];
  rules.forEach((r, i) => {
    if (r.active === false)
      return;
    let res = null, unit3 = "mm";
    const ga = byId.get(r.a), gb = byId.get(r.b);
    switch (r.k) {
      case "coincident": {
        const a = P(r.a, r.aEnd), b = P(r.b, r.bEnd);
        res = len2(sub3(a, b));
        break;
      }
      case "pointOnObject": {
        const p = P(r.a, r.aEnd);
        if (r.b === -2)
          res = Math.abs(p[1]);
        else if (r.b === -3)
          res = Math.abs(p[0]);
        else if (gb.k === "line")
          res = Math.abs(cross2(sub3(gb.b, gb.a), sub3(p, gb.a))) / len2(sub3(gb.b, gb.a));
        else
          res = Math.abs(len2(sub3(p, gb.c)) - gb.r);
        break;
      }
      case "horizontal":
        res = Math.abs(ga.a[1] - ga.b[1]);
        break;
      case "vertical":
        res = Math.abs(ga.a[0] - ga.b[0]);
        break;
      case "parallel":
      case "perpendicular": {
        const da = r.a < 0 ? r.a === -2 ? [1, 0] : [0, 1] : sub3(ga.b, ga.a);
        const db = r.b < 0 ? r.b === -2 ? [1, 0] : [0, 1] : sub3(gb.b, gb.a);
        const s = len2(da) * len2(db);
        res = (r.k === "parallel" ? Math.abs(cross2(da, db)) : Math.abs(dot4(da, db))) / s;
        unit3 = "1 (sin/cos of the angle)";
        break;
      }
      case "equal":
        res = Math.abs((ga.k === "line" ? len2(sub3(ga.b, ga.a)) : ga.r) - (gb.k === "line" ? len2(sub3(gb.b, gb.a)) : gb.r));
        break;
      case "tangent": {
        const round = (g) => g.k === "circle" || g.k === "arc";
        if (r.aEnd !== void 0 && r.bEnd !== void 0 && ga.k !== "circle" && gb.k !== "circle") {
          const Pt = pointOf(ga, r.aEnd);
          if (ga.k === "line" || gb.k === "line") {
            const L = ga.k === "line" ? ga : gb, C = ga.k === "line" ? gb : ga;
            const d = sub3(L.b, L.a);
            res = Math.abs(dot4(sub3(Pt, C.c), d)) / len2(d);
          } else {
            const ra = ga, rb = gb;
            const u = sub3(Pt, ra.c), v = sub3(Pt, rb.c);
            res = Math.abs(cross2(u, v)) / Math.max(len2(u) + len2(v), 1e-12);
          }
          break;
        }
        if (round(ga) && round(gb)) {
          const ra = ga, rb = gb;
          const d = len2(sub3(ra.c, rb.c));
          res = Math.min(Math.abs(d - (ra.r + rb.r)), Math.abs(d - Math.abs(ra.r - rb.r)));
        } else {
          const L = ga.k === "line" ? ga : gb, C = ga.k === "line" ? gb : ga;
          res = Math.abs(Math.abs(cross2(sub3(L.b, L.a), sub3(C.c, L.a))) / len2(sub3(L.b, L.a)) - C.r);
        }
        break;
      }
      case "symmetric": {
        const a = P(r.a, r.aEnd), b = P(r.b, r.bEnd);
        if (r.cEnd !== void 0) {
          const c = P(r.c, r.cEnd);
          res = len2([(a[0] + b[0]) / 2 - c[0], (a[1] + b[1]) / 2 - c[1]]);
        } else {
          const L = r.c === -2 ? { a: [0, 0], b: [1, 0] } : r.c === -3 ? { a: [0, 0], b: [0, 1] } : byId.get(r.c);
          const d = sub3(L.b, L.a), m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
          const off = Math.abs(cross2(d, sub3(m, L.a))) / len2(d);
          const perp = Math.abs(dot4(d, sub3(b, a))) / len2(d);
          res = Math.max(off, perp);
        }
        break;
      }
      case "distance":
        res = Math.abs(len2(sub3(P(r.a, r.aEnd), P(r.b, r.bEnd))) - r.value);
        break;
      case "distanceX":
        res = Math.abs(P(r.b, r.bEnd)[0] - P(r.a, r.aEnd)[0] - r.value);
        break;
      case "distanceY":
        res = Math.abs(P(r.b, r.bEnd)[1] - P(r.a, r.aEnd)[1] - r.value);
        break;
      case "radius":
        res = Math.abs(ga.r - r.value);
        break;
      case "diameter":
        res = Math.abs(2 * ga.r - r.value);
        break;
      case "angle": {
        const da = sub3(ga.b, ga.a), db = sub3(gb.b, gb.a);
        const d = (Math.atan2(cross2(da, db), dot4(da, db)) * 180 / Math.PI - r.value) % 180;
        const dd = (d % 180 + 180) % 180;
        res = Math.min(dd, 180 - dd);
        unit3 = "deg (mod 180)";
        break;
      }
      case "lock": {
        const s = sById.get(r.a);
        if (!s) {
          res = null;
          break;
        }
        const a = pointOf(byId.get(r.a), r.aEnd, true), b = pointOf(s, r.aEnd, true);
        res = len2(sub3(a, b));
        break;
      }
      default:
        res = null;
    }
    out.push({ rule: i, kind: r.k, residual: res, unit: unit3, driving: r.driving !== false });
  });
  return out;
}

// ../../layer/dist/sketch-volume.js
var RECONCILE_TOL = { planar: 1e-9, curved: 3e-4 };
var SKETCH_VOLUME_GUARD = "SKETCH-VOLUME";
var TAU = Math.PI * 2;
var JOIN_TOL = 1e-5;
var hyp = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
var fmt = (v) => Number.isFinite(v) ? String(Number(v.toPrecision(6))) : String(v);
var piecesWord = (n) => n === 1 ? "one piece" : `${n} separate pieces`;
var isSoupSketch = (sk) => sk.shape !== "circle" && Array.isArray(sk.geoms) && sk.geoms.length > 0;
var live = (g) => !g.construction && g.k !== "point";
function arcSweep(g) {
  const a0 = Math.atan2(g.a[1] - g.c[1], g.a[0] - g.c[0]);
  const a1 = Math.atan2(g.b[1] - g.c[1], g.b[0] - g.c[0]);
  let sw = ((a1 - a0) % TAU + TAU) % TAU;
  if (g.sense === "cw")
    sw = sw === 0 ? -TAU : sw - TAU;
  else if (sw === 0)
    sw = TAU;
  return { a0, sweep: sw };
}
var inPoly = (p, poly) => {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a[1] > p[1] !== b[1] > p[1] && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0])
      c = !c;
  }
  return c;
};
function soupArea(rows) {
  const L0 = rows.filter(live);
  if (!L0.length)
    return null;
  const o = L0[0].a ?? L0[0].c;
  const sh = (p) => p ? [p[0] - o[0], p[1] - o[1]] : p;
  const L = L0.map((g) => ({ ...g, a: sh(g.a), b: sh(g.b), c: sh(g.c) }));
  const used = /* @__PURE__ */ new Set();
  const loops = [];
  const ends = (g) => g.k === "line" || g.k === "arc" ? [g.a, g.b] : [];
  for (let s = 0; s < L.length; s++) {
    if (used.has(s))
      continue;
    const g0 = L[s];
    used.add(s);
    if (g0.k === "circle") {
      const n = 1440;
      loops.push({ poly: Array.from({ length: n }, (_, k) => [g0.c[0] + g0.r * Math.cos(TAU * k / n), g0.c[1] + g0.r * Math.sin(TAU * k / n)]), area: Math.PI * g0.r * g0.r, depth: 0 });
      continue;
    }
    const poly = [];
    let green = 0;
    const start = g0.a;
    const walk = (g, fromA) => {
      if (g.k === "line") {
        const a = fromA ? g.a : g.b;
        const b = fromA ? g.b : g.a;
        poly.push(a);
        green += (a[0] * b[1] - b[0] * a[1]) / 2;
        return b;
      }
      const r = (hyp(g.a, g.c) + hyp(g.b, g.c)) / 2;
      const { a0, sweep } = arcSweep(g);
      const s0 = fromA ? a0 : a0 + sweep;
      const w = fromA ? sweep : -sweep;
      const n = Math.max(8, Math.ceil(Math.abs(w) / (TAU / 720)));
      for (let k = 0; k < n; k++)
        poly.push([g.c[0] + r * Math.cos(s0 + w * k / n), g.c[1] + r * Math.sin(s0 + w * k / n)]);
      green += (r * r * w + g.c[0] * r * (Math.sin(s0 + w) - Math.sin(s0)) - g.c[1] * r * (Math.cos(s0 + w) - Math.cos(s0))) / 2;
      return fromA ? g.b : g.a;
    };
    let at2 = walk(g0, true);
    let closed = false;
    for (let guard = 0; guard < L.length + 1; guard++) {
      if (hyp(at2, start) < JOIN_TOL) {
        closed = true;
        break;
      }
      const k = L.findIndex((q, i) => {
        if (used.has(i))
          return false;
        const e = ends(q);
        return e.length > 0 && (hyp(e[0], at2) < JOIN_TOL || hyp(e[1], at2) < JOIN_TOL);
      });
      if (k < 0)
        break;
      used.add(k);
      at2 = walk(L[k], hyp(ends(L[k])[0], at2) < JOIN_TOL);
    }
    if (!closed)
      return null;
    loops.push({ poly, area: Math.abs(green), depth: 0 });
  }
  loops.forEach((l, i) => {
    const probe = l.poly[Math.floor(l.poly.length / 3)];
    l.depth = loops.filter((q, j) => j !== i && inPoly(probe, q.poly)).length;
  });
  const area = loops.reduce((a, l) => a + (l.depth % 2 === 0 ? 1 : -1) * l.area, 0);
  return { area, regions: loops.filter((l) => l.depth % 2 === 0).length, curved: L.some((g) => g.k !== "line") };
}
function outlineArea(sk, arc) {
  const o = arc.outlineOf(sk);
  if (!o || !o.ok || !Array.isArray(o.points))
    return null;
  if (sk.shape === "circle") {
    const [a, b] = o.points;
    if (!a || !b)
      return null;
    const d = hyp(a, b);
    return { area: Math.PI * d * d / 4, regions: 1, curved: true };
  }
  const n = o.points.length;
  if (n < 3)
    return null;
  const P = o.points.map((p) => [p[0] - o.points[0][0], p[1] - o.points[0][1]]);
  const B = o.bulges ?? {};
  let s2 = 0;
  let curved = false;
  for (let i = 0; i < n; i++) {
    const a = P[i];
    const b = P[(i + 1) % n];
    s2 += a[0] * b[1] - b[0] * a[1];
    const g = B[i];
    if (!g)
      continue;
    curved = true;
    const { radius, startAngle, endAngle } = arc.arcFromBulge(a, b, g);
    let sweep = endAngle - startAngle;
    if (g > 0 && sweep < 0)
      sweep += TAU;
    if (g < 0 && sweep > 0)
      sweep -= TAU;
    s2 += radius * radius * (sweep - Math.sin(sweep));
  }
  return { area: Math.abs(s2) / 2, regions: 1, curved };
}
var RULE_HOLDS = 1e-9;
function rulesHold(sk) {
  const rules = sk.rules ?? [];
  if (!rules.length)
    return true;
  try {
    const geoms = sk.geoms;
    return checkRules(geoms, rules, geoms).every((r) => !r.driving || r.residual !== null && Number.isFinite(r.residual) && r.residual <= RULE_HOLDS);
  } catch {
    return false;
  }
}
function sketchArea(sk, arc) {
  try {
    if (isSoupSketch(sk) && !rulesHold(sk))
      return null;
    const r = isSoupSketch(sk) ? soupArea(sk.geoms) : outlineArea(sk, arc);
    return r && Number.isFinite(r.area) && r.area > 0 ? r : null;
  } catch {
    return null;
  }
}
function pullLength(f) {
  if (typeof f.height !== "number" || !Number.isFinite(f.height))
    return null;
  if (f.taper || f.direction && f.alongNormal === false)
    return null;
  const l2 = !f.midplane && typeof f.length2 === "number" && f.length2 > 0 ? f.length2 : 0;
  return Math.abs(f.height) + l2;
}
function reconcileSentence(f, H2, info, built) {
  const want = info.area * H2;
  const got = built.volume;
  const wantPieces = info.regions;
  const part = f.target ? `sketch ${f.target}` : "this sketch";
  const head = `Pulling ${part} ${fmt(H2)} mm should make about ${fmt(+want.toPrecision(7))} mm3 in ${piecesWord(wantPieces)} (its area ${fmt(+info.area.toPrecision(7))} mm2 times the length), but the 3D build came out`;
  const tail = "so it was not built; a thin wall or a very small gap between shapes is the usual cause, so make the walls thicker or draw the shapes on separate sketches.";
  if (built.pieces === wantPieces)
    return `${head} ${fmt(+Math.abs(got - want).toPrecision(2))} mm3 ${got < want ? "smaller" : "larger"}, ${tail}`;
  return `${head} at ${fmt(+built.volume.toPrecision(7))} mm3 in ${piecesWord(built.pieces)}, ${tail}`;
}
function reconcilePull(f, info, built) {
  if (!info || !(info.area > 0) || !built || !Number.isFinite(built.volume))
    return null;
  const H2 = pullLength(f);
  if (H2 === null || !(H2 > 0))
    return null;
  const want = info.area * H2;
  const tol = info.curved ? RECONCILE_TOL.curved : RECONCILE_TOL.planar;
  const rel2 = Math.abs(built.volume - want) / want;
  if (rel2 <= tol && built.pieces === info.regions)
    return null;
  return reconcileSentence(f, H2, info, built);
}
var isPiece = (bodyName, names) => names.some((n) => bodyName === n || bodyName.startsWith(`${n} (`) && /^ \(\d+\)$/.test(bodyName.slice(n.length)));
function sketchVolumeRefusal(f, sketch, ctx, res, produces) {
  if (f.kind !== "extrude" || ctx.skipSketchVolume || !sketch || !res.measure)
    return null;
  const fv = f;
  if (pullLength(fv) === null)
    return null;
  const mine = res.measure.bodies.filter((b) => isPiece(b.name, produces));
  if (!mine.length)
    return null;
  const built = { volume: mine.reduce((a, b) => a + b.volume_mm3, 0), pieces: mine.length };
  return reconcilePull(fv, sketchArea(sketch, ctx.arc), built);
}

// ../../layer/dist/soup-regions.js
var STEP = Math.PI / 720;
var JOIN_TOL2 = 1e-5;
var TOUCH_TOL = 1e-3;
var near2 = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]) <= JOIN_TOL2;
function arcPoints(g) {
  const a0 = Math.atan2(g.a[1] - g.c[1], g.a[0] - g.c[0]);
  const a1 = Math.atan2(g.b[1] - g.c[1], g.b[0] - g.c[0]);
  const TAU2 = Math.PI * 2;
  let sweep = ((a1 - a0) % TAU2 + TAU2) % TAU2;
  if (g.sense === "cw")
    sweep = sweep === 0 ? -TAU2 : sweep - TAU2;
  const n = Math.max(2, Math.ceil(Math.abs(sweep) / STEP));
  const r = Math.hypot(g.a[0] - g.c[0], g.a[1] - g.c[1]);
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = a0 + sweep * i / n;
    out.push([g.c[0] + r * Math.cos(t), g.c[1] + r * Math.sin(t)]);
  }
  out[0] = [g.a[0], g.a[1]];
  out[n] = [g.b[0], g.b[1]];
  return out;
}
function circlePoints(g) {
  const n = Math.ceil(2 * Math.PI / STEP);
  return Array.from({ length: n }, (_, i) => [g.c[0] + g.r * Math.cos(2 * Math.PI * i / n), g.c[1] + g.r * Math.sin(2 * Math.PI * i / n)]);
}
function inside(poly, p) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a[1] > p[1] !== b[1] > p[1] && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0])
      c = !c;
  }
  return c;
}
function segDist(p, q, r, s) {
  const o = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const d1 = o(p, q, r);
  const d2 = o(p, q, s);
  const d3 = o(r, s, p);
  const d4 = o(r, s, q);
  if (d1 * d2 < 0 && d3 * d4 < 0)
    return 0;
  const pt = (a, b, c) => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const l = dx * dx + dy * dy;
    const t = l ? Math.max(0, Math.min(1, ((c[0] - a[0]) * dx + (c[1] - a[1]) * dy) / l)) : 0;
    return Math.hypot(a[0] + t * dx - c[0], a[1] + t * dy - c[1]);
  };
  return Math.min(pt(p, q, r), pt(p, q, s), pt(r, s, p), pt(r, s, q));
}
function polyDist(A, B, cap2) {
  let best = Infinity;
  const bb = (P) => P.reduce((m, p) => [Math.min(m[0], p[0]), Math.min(m[1], p[1]), Math.max(m[2], p[0]), Math.max(m[3], p[1])], [Infinity, Infinity, -Infinity, -Infinity]);
  const a = bb(A);
  const b = bb(B);
  if (a[0] > b[2] + cap2 || b[0] > a[2] + cap2 || a[1] > b[3] + cap2 || b[1] > a[3] + cap2)
    return Infinity;
  for (let i = 0; i < A.length; i++) {
    const p = A[i];
    const q = A[(i + 1) % A.length];
    const lo = [Math.min(p[0], q[0]) - cap2, Math.min(p[1], q[1]) - cap2];
    const hi = [Math.max(p[0], q[0]) + cap2, Math.max(p[1], q[1]) + cap2];
    for (let j = 0; j < B.length; j++) {
      const r = B[j];
      const s = B[(j + 1) % B.length];
      if (Math.min(r[0], s[0]) > hi[0] || Math.max(r[0], s[0]) < lo[0] || Math.min(r[1], s[1]) > hi[1] || Math.max(r[1], s[1]) < lo[1])
        continue;
      best = Math.min(best, segDist(p, q, r, s));
      if (best <= 0)
        return 0;
    }
  }
  return best;
}
function soupLoops(sk) {
  const rows = (sk.geoms ?? []).filter((g) => !g.construction && g.k !== "point");
  const loops = [];
  const open = [];
  for (const g of rows) {
    if (g.k === "circle")
      loops.push({ poly: circlePoints(g), ids: [g.id], circle: true });
    else if (g.k === "line")
      open.push({ id: g.id, pts: [g.a, g.b], a: g.a, b: g.b });
    else if (g.k === "arc")
      open.push({ id: g.id, pts: arcPoints(g), a: g.a, b: g.b });
    else
      return { sentence: `sketch ${sk.id} has a ${g.k} drawn in it, which a pull does not read as an outline` };
  }
  const used = /* @__PURE__ */ new Set();
  const take = (pt) => open.filter((x) => !used.has(x.id) && (near2(x.a, pt) || near2(x.b, pt)));
  for (const e of open) {
    if (used.has(e.id))
      continue;
    used.add(e.id);
    let pts = e.pts.slice();
    let tail = e.b;
    const ids = [e.id];
    while (!near2(tail, e.a)) {
      const cand = take(tail);
      const at2 = `[${tail.map((v) => +v.toFixed(3)).join(", ")}]`;
      if (cand.length === 0)
        return { sentence: `sketch ${sk.id} has an edge that does not close into a loop (a loose end near ${at2}), so it has no outline to pull` };
      if (cand.length > 1)
        return { sentence: `sketch ${sk.id} has more than two edges meeting near ${at2}, so it has no single outline to pull` };
      const x = cand[0];
      used.add(x.id);
      ids.push(x.id);
      const fwd = near2(x.a, tail);
      pts = pts.concat((fwd ? x.pts : x.pts.slice().reverse()).slice(1));
      tail = fwd ? x.b : x.a;
    }
    pts.pop();
    loops.push({ poly: pts, ids });
  }
  return { loops };
}
function evenOddPicks(sk) {
  const got = soupLoops(sk);
  if ("sentence" in got)
    return got;
  const loops = got.loops;
  if (loops.length === 0)
    return { sentence: `sketch ${sk.id} has no closed outline to pull` };
  for (let i = 0; i < loops.length; i++)
    for (let j = i + 1; j < loops.length; j++) {
      const d = polyDist(loops[i].poly, loops[j].poly, TOUCH_TOL);
      if (d <= TOUCH_TOL)
        return { sentence: `two shapes in sketch ${sk.id} cross or touch each other, so there is no single outline to pull; move them apart or draw one shape` };
    }
  for (const L of loops) {
    if (L.circle)
      continue;
    const n = L.poly.length;
    if (n > 2e3)
      continue;
    for (let i = 0; i < n; i++) {
      const p = L.poly[i];
      const q = L.poly[(i + 1) % n];
      const lox = Math.min(p[0], q[0]);
      const hix = Math.max(p[0], q[0]);
      const loy = Math.min(p[1], q[1]);
      const hiy = Math.max(p[1], q[1]);
      for (let j = i + 2; j < n; j++) {
        if (i === 0 && j === n - 1)
          continue;
        const r = L.poly[j];
        const t = L.poly[(j + 1) % n];
        if (Math.max(r[0], t[0]) < lox || Math.min(r[0], t[0]) > hix || Math.max(r[1], t[1]) < loy || Math.min(r[1], t[1]) > hiy)
          continue;
        if (segDist(p, q, r, t) === 0)
          return { sentence: `a shape in sketch ${sk.id} crosses itself, so it has no outline to pull` };
      }
    }
  }
  const depth = loops.map((L, i) => loops.reduce((c, M, j) => c + (j !== i && inside(M.poly, L.poly[0]) ? 1 : 0), 0));
  const picks = [];
  loops.forEach((L, i) => {
    if (depth[i] % 2 !== 0)
      return;
    const ys = L.poly.map((p) => p[1]);
    const y0 = Math.min(...ys);
    const y1 = Math.max(...ys);
    for (const f of [0.5, 0.37, 0.63, 0.23, 0.77, 0.11, 0.89, 0.05, 0.95, 0.31, 0.69]) {
      const y = y0 + (y1 - y0) * f;
      const xs = [];
      for (const M of loops)
        for (let k = 0; k < M.poly.length; k++) {
          const p = M.poly[k];
          const q = M.poly[(k + 1) % M.poly.length];
          if (p[1] > y !== q[1] > y)
            xs.push(p[0] + (y - p[1]) * (q[0] - p[0]) / (q[1] - p[1]));
        }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k++) {
        if (xs[k + 1] - xs[k] < 1e-4)
          continue;
        const m = [(xs[k] + xs[k + 1]) / 2, y];
        const holders = loops.reduce((c, M) => c + (inside(M.poly, m) ? 1 : 0), 0);
        if (holders === depth[i] + 1 && inside(L.poly, m)) {
          picks.push([+m[0].toFixed(6), +m[1].toFixed(6)]);
          return;
        }
      }
    }
  });
  if (picks.length !== depth.filter((d) => d % 2 === 0).length)
    return { sentence: `could not find an interior point of every region of sketch ${sk.id}; it is not pulled` };
  return { picks, loops: loops.length, depths: depth, polys: loops.map((L) => L.poly) };
}

// ../../layer/dist/outline-guard.js
var GAP = 1e-3;
var MIN_LEN = 1e-3;
var MIN_ROUND = 0.01;
var TOUCH = 1e-4;
var ARC_STEP = 2 * Math.PI / 180;
function sampleOutline(o, arc) {
  const P = o.points;
  const n = P.length;
  const pts = [];
  const owner = [];
  for (let i = 0; i < n; i++) {
    const a = P[i];
    const b = P[(i + 1) % n];
    pts.push([a[0], a[1]]);
    owner.push(i);
    const g = o.bulges?.[i];
    if (!g)
      continue;
    const { center, radius, startAngle, endAngle } = arc.arcFromBulge(a, b, g);
    let sweep = endAngle - startAngle;
    if (g > 0 && sweep < 0)
      sweep += Math.PI * 2;
    if (g < 0 && sweep > 0)
      sweep -= Math.PI * 2;
    const k = Math.max(2, Math.ceil(Math.abs(sweep) / ARC_STEP));
    for (let j = 1; j < k; j++) {
      const t = startAngle + sweep * j / k;
      pts.push([center[0] + radius * Math.cos(t), center[1] + radius * Math.sin(t)]);
      owner.push(i);
    }
  }
  return { pts, owner };
}
function signedArea(P) {
  let a = 0;
  for (let i = 0; i < P.length; i++) {
    const p = P[i];
    const q = P[(i + 1) % P.length];
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a / 2;
}
function offsetLoop(P, d) {
  const n = P.length;
  const sg = signedArea(P) >= 0 ? 1 : -1;
  const lines = P.map((p, i) => {
    const q = P[(i + 1) % n];
    const dx = q[0] - p[0];
    const dy = q[1] - p[1];
    const l = Math.hypot(dx, dy) || 1;
    return { p: [p[0] + sg * dy / l * d, p[1] - sg * dx / l * d], dir: [dx / l, dy / l] };
  });
  return P.map((_p, i) => {
    const A = lines[(i + n - 1) % n];
    const B = lines[i];
    const den = A.dir[0] * B.dir[1] - A.dir[1] * B.dir[0];
    if (Math.abs(den) < 1e-9)
      return [B.p[0], B.p[1]];
    const t = ((B.p[0] - A.p[0]) * B.dir[1] - (B.p[1] - A.p[1]) * B.dir[0]) / den;
    return [A.p[0] + A.dir[0] * t, A.p[1] + A.dir[1] * t];
  });
}
function segDist2(p, q, r, s) {
  const o = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const d1 = o(p, q, r);
  const d2 = o(p, q, s);
  const d3 = o(r, s, p);
  const d4 = o(r, s, q);
  if (d1 * d2 < 0 && d3 * d4 < 0)
    return 0;
  const pt = (a, b, c) => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const l = dx * dx + dy * dy;
    const t = l ? Math.max(0, Math.min(1, ((c[0] - a[0]) * dx + (c[1] - a[1]) * dy) / l)) : 0;
    return Math.hypot(a[0] + t * dx - c[0], a[1] + t * dy - c[1]);
  };
  return Math.min(pt(p, q, r), pt(p, q, s), pt(r, s, p), pt(r, s, q));
}
function selfClearance(P, owner, nEdges, stopBelow = -1) {
  const n = P.length;
  let best = Infinity;
  const near3 = (a, b) => {
    const d = Math.abs(a - b);
    return d <= 1 || d === nEdges - 1;
  };
  const bb = (i) => {
    const p = P[i];
    const q = P[(i + 1) % n];
    return [Math.min(p[0], q[0]), Math.min(p[1], q[1]), Math.max(p[0], q[0]), Math.max(p[1], q[1])];
  };
  const boxes = P.map((_, i) => bb(i));
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (near3(owner[i], owner[j]))
        continue;
      const a = boxes[i];
      const b = boxes[j];
      const lim = Number.isFinite(best) ? Math.min(best, 1) : 1;
      if (a[0] > b[2] + lim || b[0] > a[2] + lim || a[1] > b[3] + lim || b[1] > a[3] + lim)
        continue;
      const d = segDist2(P[i], P[(i + 1) % n], P[j], P[(j + 1) % n]);
      if (d < best)
        best = d;
      if (best <= stopBelow)
        return best;
    }
  }
  return best;
}
function selfTouch(o, arc) {
  if (o.shape === "circle")
    return null;
  const { pts, owner } = sampleOutline(o, arc);
  const c = selfClearance(pts, owner, o.points.length, TOUCH);
  return c <= TOUCH ? c === 0 ? "cross" : "touch" : null;
}
function taperFold(o, arc, d, circleRadius = null) {
  if (circleRadius !== null) {
    return circleRadius + d <= GAP ? { at: -circleRadius, why: "closes" } : null;
  }
  const { pts, owner } = sampleOutline(o, arc);
  const nEdges = o.points.length;
  const n = pts.length;
  const K = 64;
  for (let k = 1; k <= K; k++) {
    const dk = d * k / K;
    const Q = offsetLoop(pts, dk);
    for (let i = 0; i < n; i++) {
      const p = pts[i];
      const q = pts[(i + 1) % n];
      const e0 = [q[0] - p[0], q[1] - p[1]];
      const a = Q[i];
      const b = Q[(i + 1) % n];
      const e1 = [b[0] - a[0], b[1] - a[1]];
      const l0 = Math.hypot(...e0);
      const l1 = Math.hypot(...e1);
      if (l0 > 1e-6 && (e0[0] * e1[0] + e0[1] * e1[1] <= 0 || l1 < 1e-6))
        return { at: dk, why: "edge" };
    }
    if (selfClearance(Q, owner, nEdges, GAP) <= GAP)
      return { at: dk, why: "overlap" };
  }
  return null;
}
function pointIn(poly, p) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a[1] > p[1] !== b[1] > p[1] && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0])
      c = !c;
  }
  return c;
}
function taperFoldLoops(loops, d) {
  const K = 64;
  const polys = loops.map((L) => L.poly);
  const sign = loops.map((L) => L.depth % 2 === 0 ? 1 : -1);
  const owner = polys.map((P) => P.map((_, i) => i));
  const nest0 = polys.map((A) => polys.map((B) => A === B ? false : pointIn(B, A[0])));
  for (let k = 1; k <= K; k++) {
    const dk = d * k / K;
    const Q = polys.map((P, li) => offsetLoop(P, sign[li] * dk));
    for (let li = 0; li < polys.length; li++) {
      const P = polys[li];
      const q = Q[li];
      const n = P.length;
      for (let i = 0; i < n; i++) {
        const p0 = P[i];
        const p1 = P[(i + 1) % n];
        const e0 = [p1[0] - p0[0], p1[1] - p0[1]];
        const a = q[i];
        const b = q[(i + 1) % n];
        const e1 = [b[0] - a[0], b[1] - a[1]];
        const l0 = Math.hypot(...e0);
        const l1 = Math.hypot(...e1);
        if (l0 > 1e-6 && (e0[0] * e1[0] + e0[1] * e1[1] <= 0 || l1 < 1e-6))
          return { at: dk, why: "edge" };
      }
      if (selfClearance(q, owner[li], n, GAP) <= GAP)
        return { at: dk, why: "overlap" };
    }
    for (let a = 0; a < Q.length; a++)
      for (let b = 0; b < Q.length; b++) {
        if (a === b)
          continue;
        if (pointIn(Q[b], Q[a][0]) !== nest0[a][b])
          return { at: dk, why: "loops" };
      }
    for (let a = 0; a < Q.length; a++)
      for (let b = a + 1; b < Q.length; b++) {
        const A = Q[a];
        const B = Q[b];
        for (let i = 0; i < A.length; i++) {
          const p = A[i];
          const q = A[(i + 1) % A.length];
          const lox = Math.min(p[0], q[0]) - GAP;
          const hix = Math.max(p[0], q[0]) + GAP;
          const loy = Math.min(p[1], q[1]) - GAP;
          const hiy = Math.max(p[1], q[1]) + GAP;
          for (let j = 0; j < B.length; j++) {
            const r = B[j];
            const s = B[(j + 1) % B.length];
            if (Math.max(r[0], s[0]) < lox || Math.min(r[0], s[0]) > hix || Math.max(r[1], s[1]) < loy || Math.min(r[1], s[1]) > hiy)
              continue;
            if (segDist2(p, q, r, s) <= GAP)
              return { at: dk, why: "loops" };
          }
        }
      }
  }
  return null;
}
function outlineSize(o, arc) {
  if (o.shape === "circle") {
    const [a, b] = o.points;
    const dd = Math.hypot(b[0] - a[0], b[1] - a[1]);
    return { w: dd, h: dd, minRadius: dd / 2 };
  }
  const { pts } = sampleOutline(o, arc);
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  let minRadius = Infinity;
  for (const [i, g] of Object.entries(o.bulges ?? {})) {
    if (!g)
      continue;
    const a = o.points[Number(i)];
    const b = o.points[(Number(i) + 1) % o.points.length];
    minRadius = Math.min(minRadius, arc.arcFromBulge(a, b, g).radius);
  }
  return { w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys), minRadius };
}

// ../../layer/dist/extrude-pocket.js
function cleanSketch(sk) {
  if (!sk || isSoup(sk) || sk.shape === "circle" || !Array.isArray(sk.points) || sk.points.length < 3)
    return sk;
  if (sk.constraints && sk.constraints.length || sk.bulges && Object.keys(sk.bulges).length)
    return sk;
  const P = sk.points;
  const same2 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]) <= 1e-9;
  const keep = [];
  const map = [];
  for (let i = 0; i < P.length; i++) {
    if (keep.length && same2(P[i], P[keep[keep.length - 1]])) {
      map.push(keep.length - 1);
      continue;
    }
    keep.push(i);
    map.push(keep.length - 1);
  }
  while (keep.length > 1 && same2(P[keep[keep.length - 1]], P[keep[0]])) {
    keep.pop();
    for (let i = 0; i < map.length; i++)
      if (map[i] === keep.length)
        map[i] = 0;
  }
  if (keep.length === P.length)
    return sk;
  const remap = (rec) => {
    if (!rec || !Object.keys(rec).length)
      return rec;
    const out = {};
    for (const [k, v] of Object.entries(rec)) {
      const j = map[Number(k)];
      if (j !== void 0 && !(j in out))
        out[j] = v;
    }
    return out;
  };
  const c = { ...sk, points: keep.map((i) => P[i]) };
  if (sk.rounds)
    c.rounds = remap(sk.rounds);
  if (sk.chamfers)
    c.chamfers = remap(sk.chamfers);
  return c;
}
function noOutlineSentence(sk, o) {
  const pts = o && o.points || sk.points || [];
  if (pts.length) {
    const w = Math.max(...pts.map((p) => p[0])) - Math.min(...pts.map((p) => p[0]));
    const h = Math.max(...pts.map((p) => p[1])) - Math.min(...pts.map((p) => p[1]));
    if (w <= 1e-9 || h <= 1e-9)
      return `the outline of sketch ${sk.id} is flat: it is 0 mm ${w <= 1e-9 ? "wide" : "tall"}, so it has no area to pull; give it a size in both directions`;
  }
  return `sketch ${sk.id} has two corners on the very same spot, so one of its sides has no length and the outline is not a shape; move the corners apart or delete the extra one`;
}
var SIGN = (x) => x < 0 ? -1 : 1;
var fmtMm = (x) => String(+Number(x).toPrecision(3));
var dot32 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
var cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
var TAPER_LIMIT = 89.9;
var MAX_SHAPES = 24;
function optionPlan(kind, f, sk, ctx, bboxOfTarget = null) {
  const len0 = kind === "pull" ? f.height : f.depth;
  const L = Math.abs(len0);
  const noun = kind === "pull" ? "pull" : "pocket";
  if (!(L > 0) && !f.through)
    return { refusal: kind === "pull" ? "the pull height is 0, so there is nothing to pull" : "the pocket depth is 0, so there is nothing to cut" };
  if (L < MIN_LEN && !f.through)
    return { refusal: `the ${kind === "pull" ? "pull height" : "pocket depth"} ${fmtMm(L)} mm is under ${MIN_LEN} mm, which is too small to build; make it at least ${MIN_LEN} mm` };
  const mid = !!f.midplane;
  const l2 = mid || !(f.length2 > 0) ? 0 : f.length2;
  if (l2 > 0 && l2 < MIN_LEN)
    return { refusal: `length2 ${fmtMm(l2)} mm is under ${MIN_LEN} mm, which is too small to build; make it at least ${MIN_LEN} mm` };
  const taper = f.taper ?? 0;
  if (Math.abs(taper) > TAPER_LIMIT)
    return { refusal: `a taper of ${taper} degrees cannot be built: a taper leans the walls by at most ${TAPER_LIMIT} degrees either way` };
  const fr = frameOf2(sk, ctx.mt);
  const n = cross3(fr.u, fr.v);
  const nl = Math.hypot(...n);
  const nn = n.map((c) => c / nl);
  let dir = f.direction ?? null;
  let flip = false;
  let slant = null;
  if (dir) {
    const dl = Math.hypot(...dir);
    const dh = dir.map((c2) => c2 / dl);
    const c = dot32(dh, nn);
    const parallel2 = Math.hypot(...cross3(dh, nn)) <= 1e-9;
    const eff = kind === "pull" ? c : -c;
    if (parallel2) {
      flip = eff < 0;
      dir = null;
    } else {
      if (Math.abs(c) < 1e-6)
        return { refusal: "the direction lies in the sketch plane, so it never leaves the profile; pick a direction that points out of the plane" };
      slant = { dh, c, alongNormal: f.alongNormal !== false };
    }
  }
  const sgn0 = (f.reversed ? -1 : 1) * (flip ? -1 : 1) * SIGN(len0);
  const through = kind === "pocket" && !!f.through;
  if (through && l2 > 0)
    return { refusal: "through together with length2 is not built, because it could mean two different cuts (the cut ignoring length2, or the cut also reaching length2 on the other side of the sketch); use through alone, or length2 without through" };
  if (taper !== 0 && slant)
    return { refusal: "a taper and a direction together are not built yet: use one or the other" };
  if (taper !== 0 && (mid || l2 > 0))
    return { refusal: `a taper together with ${mid ? "midplane" : "length2"} is not built yet: use one of them, or set the taper to 0` };
  const span = mid ? L : L + l2;
  const back = mid ? L / 2 : l2;
  let up2;
  let down2;
  if (kind === "pull") {
    if (sgn0 > 0) {
      up2 = span - back;
      down2 = back;
    } else {
      up2 = back;
      down2 = span - back;
    }
  } else if (sgn0 > 0) {
    up2 = back;
    down2 = span - back;
  } else {
    up2 = span - back;
    down2 = back;
  }
  let reach = null;
  if (through) {
    if (!bboxOfTarget)
      return { refusal: "a through-all pocket needs the part it cuts, and it was not measured" };
    const o = fr.origin;
    const lo = bboxOfTarget.slice(0, 3);
    const hi = bboxOfTarget.slice(3);
    let mx = -Infinity;
    let mn = Infinity;
    for (const x of [lo[0], hi[0]])
      for (const y of [lo[1], hi[1]])
        for (const z of [lo[2], hi[2]]) {
          const t = dot32([x - o[0], y - o[1], z - o[2]], nn);
          mx = Math.max(mx, t);
          mn = Math.min(mn, t);
        }
    reach = { maxN: mx, minN: mn };
  }
  return { kind, noun, L, span, back, taper, slant, through, mid, sgn: sgn0, up: up2, down: down2, nn, fr, reach };
}
function outlineGuards(o, s, sk, ctx) {
  if (s.soup)
    return null;
  const out = ctx.arc.outlineOf(sk);
  if (!out.ok)
    return null;
  const oo = { ...out, shape: sk.shape };
  const size = outlineSize(oo, ctx.arc);
  if (size.w <= 1e-9 || size.h <= 1e-9)
    return sk.shape === "circle" ? "the circle has a diameter of 0 mm, so it has no area to pull; give it a diameter" : `the outline is flat: it is 0 mm ${size.w <= 1e-9 ? "wide" : "tall"}, so it has no area to pull; give it a size in both directions`;
  if (size.w < MIN_LEN || size.h < MIN_LEN)
    return `the outline is ${fmtMm(Math.min(size.w, size.h))} mm across, under ${MIN_LEN} mm, which is too small to build; draw it larger`;
  if (hasCurve(sk, ctx) && Math.min(size.w, size.h) < MIN_ROUND)
    return `the round outline is ${fmtMm(Math.min(size.w, size.h))} mm across, under ${MIN_ROUND} mm, which is too small to build; draw it larger`;
  const bad2 = selfTouch(oo, ctx.arc);
  if (bad2 === "cross")
    return "two edges of the outline cross each other, so it does not enclose one area; redraw it without crossing";
  if (bad2 === "touch")
    return "two parts of the outline touch each other, so it does not enclose one clean area; pull them apart";
  if (o.taper) {
    const reach = o.through ? Math.max(0, o.reach ? o.sgn > 0 ? -o.reach.minN : o.reach.maxN : 0) : o.span;
    const d = reach * Math.tan(o.taper * Math.PI / 180);
    const circleR = sk.shape === "circle" ? size.minRadius : null;
    const fold = taperFold(oo, ctx.arc, d, circleR);
    if (fold)
      return `a taper of ${o.taper} degrees over ${+reach.toFixed(3)} mm makes the outline fold over itself (its walls would cross before the end), so nothing is built; use a smaller taper or a shorter length`;
  }
  return null;
}
function finiteTool(o) {
  if (!o.through)
    return o;
  const trav = o.sgn > 0 ? -o.reach.minN : o.reach.maxN;
  if (o.mid) {
    const a = Math.max(o.reach.maxN, 0) + 1;
    const b = Math.max(-o.reach.minN, 0) + 1;
    const m = Math.max(a, b);
    return { ...o, through: false, up: m, down: m, span: 2 * m, back: m, slant: o.slant && { ...o.slant, alongNormal: true } };
  }
  const ext = Math.max(trav, 0) + 1;
  return { ...o, through: false, up: o.sgn > 0 ? 0 : ext, down: o.sgn > 0 ? ext : 0, span: ext, back: 0, slant: o.slant && { ...o.slant, alongNormal: true } };
}
function emitSweep(o, s, sk, ctx, st, body, only) {
  const g = outlineGuards(o, s, sk, ctx);
  if (g)
    return { refusal: g };
  if (o.slant) {
    if (s.soup)
      return { refusal: "a direction is only built for one plain outline; this sketch has holes or several shapes, so draw one outline or drop the direction" };
    const { dh, c, alongNormal } = o.slant;
    let span = o.span;
    let back = o.back;
    const section = (origin, name) => s.cmds.map((cmd) => cmd.command === "sketch.create" ? { ...cmd, params: { ...cmd.params, name, plane: { ...cmd.params.plane, origin } } } : cmd);
    if (o.through) {
      const tn = (o.sgn > 0 ? 1 : -1) * SIGN(c);
      const need = tn > 0 ? o.reach.maxN : -o.reach.minN;
      const needBack = tn > 0 ? -o.reach.minN : o.reach.maxN;
      if (!o.mid && !(need > 0))
        return { refusal: "it does not touch the part, so it cuts nothing; move the sketch onto the part or change the direction" };
      const m = Math.max(need, o.mid ? needBack : 0, 0) + 1;
      span = o.mid ? 2 * m : m;
      back = o.mid ? m : 0;
      const mag2 = span / Math.abs(c);
      const S2 = dh.map((x) => x * mag2 * o.sgn);
      const k2 = back / span;
      const p02 = o.fr.origin.map((x, i) => x - S2[i] * k2);
      const p12 = p02.map((x, i) => x + S2[i]);
      const a2 = `sk_${sk.id}_${st.counter++}a`;
      const b2 = `sk_${sk.id}_${st.counter++}b`;
      return { cmds: [...section(p02, a2), ...section(p12, b2), { command: "solid.loft", params: { sections: [{ sketch: a2 }, { sketch: b2 }], ...body } }] };
    }
    const mag = span / (alongNormal ? Math.abs(c) : 1);
    const S = dh.map((x) => x * mag * o.sgn);
    const k = back / span;
    const p0 = o.fr.origin.map((x, i) => x - S[i] * k);
    const p1 = p0.map((x, i) => x + S[i]);
    const a = `sk_${sk.id}_${st.counter++}a`;
    const b = `sk_${sk.id}_${st.counter++}b`;
    return { cmds: [...section(p0, a), ...section(p1, b), { command: "solid.loft", params: { sections: [{ sketch: a }, { sketch: b }], ...body } }] };
  }
  const ex = { sketch: s.name, ...body };
  let ntool = 1;
  if (s.soup) {
    const eo = evenOddPicks(sk);
    if ("sentence" in eo)
      return { refusal: eo.sentence };
    if (eo.loops > MAX_SHAPES)
      return { refusal: `this sketch has ${eo.loops} separate shapes, more than the ${MAX_SHAPES} that one ${o.noun ?? "pull"} is built with (SolidCraft needs about a second for each and cannot be interrupted); split them over two ${o.noun ?? "pull"}s` };
    if (o.taper) {
      const reachT = o.through ? Math.max(0, o.reach ? o.sgn > 0 ? -o.reach.minN : o.reach.maxN : 0) : o.span;
      const dT = reachT * Math.tan(o.taper * Math.PI / 180);
      const foldT = taperFoldLoops(eo.polys.map((poly, i) => ({ poly, depth: eo.depths[i] })), dT);
      if (foldT)
        return { refusal: `a taper of ${o.taper} degrees over ${+reachT.toFixed(3)} mm ${foldT.why === "loops" ? "makes two shapes of the sketch (or a hole and its outline) run into each other" : "makes an outline fold over itself or a hole close up"} before the end, so nothing is built; use a smaller taper or a shorter length` };
    }
    if (eo.loops > 1) {
      ex.profiles = (only === void 0 ? eo.picks : [eo.picks[only]]).map((p) => ({ point: p }));
      ntool = eo.picks.length;
    }
  }
  if (o.taper)
    ex.taper = o.taper;
  if (o.through) {
    ex.through_all = true;
    ex.direction = o.mid ? "symmetric" : o.sgn > 0 ? "negative" : "positive";
    return { cmds: [...s.cmds, { command: "solid.extrude", params: ex }], ntool };
  }
  if (o.up > 0 && o.down > 0) {
    ex.distance = o.up;
    ex.distance2 = o.down;
  } else if (o.down > 0) {
    ex.distance = o.down;
    ex.direction = "negative";
  } else
    ex.distance = o.up;
  return { cmds: [...s.cmds, { command: "solid.extrude", params: ex }], ntool };
}
var NEAR_FLUSH = 1e-4;
var FLUSH_NOISE = 1e-9;
var CURVED_BBOX_SLOP = 3e-5;
function profileBox(sk, ctx) {
  if (isSoup(sk)) {
    const got = soupLoops(sk);
    if (!("loops" in got))
      return null;
    const pts2 = got.loops.flatMap((l) => l.poly);
    return [Math.min(...pts2.map((p) => p[0])), Math.min(...pts2.map((p) => p[1])), Math.max(...pts2.map((p) => p[0])), Math.max(...pts2.map((p) => p[1]))];
  }
  const out = ctx.arc.outlineOf(sk);
  if (!out.ok)
    return null;
  if (sk.shape === "circle") {
    const [a, b] = out.points;
    const cx = (a[0] + b[0]) / 2;
    const cy = (a[1] + b[1]) / 2;
    const r = Math.hypot(b[0] - a[0], b[1] - a[1]) / 2;
    return [cx - r, cy - r, cx + r, cy + r];
  }
  const { pts } = sampleOutline({ ...out, shape: sk.shape }, ctx.arc);
  return [Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1]))];
}
var hasCurve = (sk, ctx) => {
  if (isSoup(sk))
    return (sk.geoms ?? []).some((g) => !g.construction && (g.k === "circle" || g.k === "arc"));
  if (sk.shape === "circle")
    return true;
  const out = ctx.arc.outlineOf(sk);
  return !!out.ok && Object.values(out.bulges ?? {}).some((g) => g);
};
function frameExtents(o, sk, ctx) {
  const box = profileBox(sk, ctx);
  if (!box)
    return null;
  const fr = o.fr;
  const nn = o.nn;
  const along = (a, p) => a[0] * p[0] + a[1] * p[1] + a[2] * p[2];
  const n0 = along(nn, fr.origin);
  const span = o.span;
  const back = o.back;
  if (o.slant) {
    const mag = span / (o.slant.alongNormal ? Math.abs(o.slant.c) : 1);
    const S = o.slant.dh.map((x) => x * mag * o.sgn);
    const sU = along(fr.u, S);
    const sV = along(fr.v, S);
    const sN = along(nn, S);
    const k = back / span;
    const q0 = -sN * k;
    const q1 = q0 + sN;
    const nLo = n0 + Math.min(q0, q1);
    const nHi = n0 + Math.max(q0, q1);
    const shift = -k;
    return { u: [box[0] + Math.min(sU * shift, sU * (shift + 1)), box[2] + Math.max(sU * shift, sU * (shift + 1))], v: [box[1] + Math.min(sV * shift, sV * (shift + 1)), box[3] + Math.max(sV * shift, sV * (shift + 1))], n: [nLo, nHi], mouthSide: o.sgn * SIGN(o.slant.c) };
  }
  if (o.taper)
    return null;
  const pad = 0;
  const lo = o.kind === "pull" ? o.sgn > 0 ? -back : -(span - back) : o.sgn > 0 ? back - span : -back;
  const hi = o.kind === "pull" ? o.sgn > 0 ? span - back : back : o.sgn > 0 ? back : span - back;
  return { u: [box[0] - pad, box[2] + pad], v: [box[1] - pad, box[3] + pad], n: o.through ? [-1e300, 1e300] : [n0 + lo, n0 + hi], mouthSide: 0 };
}
function bboxInFrame(bb, o) {
  const fr = o.fr;
  const nn = o.nn;
  const ext = (a) => {
    const v = [];
    for (const x of [bb[0], bb[3]])
      for (const y of [bb[1], bb[4]])
        for (const z of [bb[2], bb[5]])
          v.push(a[0] * x + a[1] * y + a[2] * z);
    return [Math.min(...v), Math.max(...v)];
  };
  return { u: ext(fr.u), v: ext(fr.v), n: ext(nn) };
}
function nearFlush(tool, part, floor = FLUSH_NOISE) {
  for (const ax of ["u", "v", "n"]) {
    for (const [t, p, sideIn] of [[tool[ax][0], part[ax][0], (t2, p2) => t2 - p2], [tool[ax][1], part[ax][1], (t2, p2) => p2 - t2]]) {
      const gap = sideIn(t, p);
      if (gap > floor && gap <= NEAR_FLUSH * (1 + 1e-9))
        return { axis: ax, gap };
    }
  }
  return null;
}
var CURVE_ERR = [[35, 2e-4], [40, 25e-5], [45, 31e-5], [75, 5e-4], [100, 6e-4], [150, 9e-4], [300, 2e-3], [1e3, 0.05], [Infinity, 0.6]];
var curveErr = (x) => CURVE_ERR.find(([lim]) => x <= lim)[1];
var ABS_ERR = [[5e-3, 0.03], [0.01, 0.014], [0.02, 73e-4], [0.05, 24e-4], [0.1, 19e-4], [0.2, 6e-4], [0.3, 46e-5], [0.5, 26e-5], [Infinity, 0]];
var absErr = (D) => ABS_ERR.find(([lim]) => D <= lim)[1];
var CURVED_BAR = 3e-4;
function minRadiusOf(sk, ctx) {
  if (isSoup(sk))
    return (sk.geoms ?? []).filter((g) => !g.construction && (g.k === "circle" || g.k === "arc")).reduce((r, g) => Math.min(r, g.r ?? Math.hypot(g.a[0] - g.c[0], g.a[1] - g.c[1])), Infinity);
  const out = ctx.arc.outlineOf(sk);
  if (!out.ok)
    return Infinity;
  return outlineSize({ ...out, shape: sk.shape }, ctx.arc).minRadius ?? Infinity;
}
function curvedAccuracy(f, m, sk, ctx, curvedVolume) {
  const r = minRadiusOf(sk, ctx);
  if (!Number.isFinite(r) || !(r > 0))
    return null;
  const diag = Math.hypot(m.bbox[3] - m.bbox[0], m.bbox[4] - m.bbox[1], m.bbox[5] - m.bbox[2]);
  const x = diag / (2 * r);
  const bound = Math.max(curveErr(x), absErr(2 * r)) * curvedVolume / Math.max(m.volume, 1e-300);
  if (!(bound > CURVED_BAR))
    return null;
  const what = f.kind === "extrude" ? "pull" : "pocket";
  const tiny = absErr(2 * r) >= curveErr(x);
  const why = tiny ? `the smallest round shape in this ${what} is only ${fmtMm(2 * r)} mm across` : `the part is about ${Math.round(x)} times wider than the smallest round shape in this ${what}`;
  return `${f.id}: ${why}, and SolidCraft would report its volume and mass up to ${(bound * 100).toPrecision(2)}% wrong, so it is refused instead of showing a wrong part; make the round shape larger or the part smaller`;
}
async function verifyPull(f, m, sk, ctx) {
  return curvedAccuracy(f, m, sk, ctx, m.volume);
}
var total = (res) => res.measure.bodies.reduce((a, b) => a + b.volume_mm3, 0);
async function verifyPocket(f, m, before, sk, ctx, env, tool) {
  if (!before)
    return null;
  const sameVol = Math.abs(m.volume - before.volume) <= 1e-9 * Math.max(before.volume, 1);
  if (sameVol && m.faces === before.faces)
    return `${f.id} does not touch the part, so it cuts nothing; move the sketch onto the part, or change the depth or direction`;
  if (m.shells - before.shells > m.bodies.length - before.bodies.length)
    return `${f.id} would leave a sealed cavity inside the part instead of opening onto a face; start the sketch on a face of the part, or cut deeper`;
  if (tool.extents && before.bbox) {
    const nf = nearFlush(tool.extents, bboxInFrame(before.bbox, tool.opt), before.curved ? CURVED_BBOX_SLOP : FLUSH_NOISE);
    if (nf)
      return `${f.id}: the cut stops ${+nf.gap.toPrecision(2)} mm short of a face of the part, closer than the ${NEAR_FLUSH} mm this app can check reliably (SolidCraft can silently lose a sliver that thin), so it is refused; make the cut reach the face, or leave at least 0.001 mm`;
  }
  const cc = await cutConsistency(f, m, before, env, tool);
  if (cc.refusal)
    return cc.refusal;
  return curvedAccuracy(f, m, sk, ctx, Math.max(cc.removed, 0));
}
async function cutConsistency(f, m, before, env, tool) {
  const sceneTotal = env.scene.reduce((a, b) => a + b.vol, 0);
  const sceneExact = (n) => env.scene.find((b) => b.name === n)?.vol ?? 0;
  let removed = 0;
  let inconclusive = false;
  for (const piece of tool.pieces) {
    const t = `tmp_tool_${f.id}`;
    const made = tool.build({ operation: "new", body_name: t });
    if ("refusal" in made) {
      inconclusive = true;
      continue;
    }
    const nTool = made.ntool ?? 1;
    for (let rg = 0; rg < nTool; rg++) {
      const one = nTool > 1 ? tool.build({ operation: "new", body_name: t }, rg) : made;
      if ("refusal" in one) {
        inconclusive = true;
        continue;
      }
      const r2 = await env.runSC([...env.accepted, ...one.cmds, { command: "solid.combine", params: { target: piece, tools: [t], operation: "intersect" } }]);
      if (!r2.ok) {
        inconclusive = true;
        continue;
      }
      const leftover = r2.measure.bodies.filter((b) => b.name === t).reduce((a, b) => a + b.volume_mm3, 0);
      removed += total(r2) - leftover - (sceneTotal - sceneExact(piece));
    }
  }
  const curvedPart = m.curved || before.curved;
  const tol = curvedPart ? CURVED_BAR * Math.max(before.volume, 1) : 1e-9 * Math.max(before.volume, 1);
  const dev = m.volume - (before.volume - removed);
  env.checks.push({ check: "cut-consistency", removedByTool: removed, devMm3: dev, tolMm3: tol, inconclusive });
  if (!inconclusive && Math.abs(dev) > tol)
    return { refusal: `${f.id}: the cut and the volume the sketch should remove do not add up (${Math.abs(dev) < 0.01 ? dev.toExponential(1) : +dev.toFixed(3)} mm3 apart); a wall or sliver thinner than about 0.3% of the part's size is the usual cause, so it is refused rather than losing it silently; leave a thicker wall or cut in one go`, removed };
  return { refusal: null, removed };
}
var TOUCH_EPS = 1e-6;
var JOIN_TOUCH_SENTENCE = (id) => `${id}: the parts of this join only touch along a line or at a point (or stop just short of each other), so they would not be one solid; overlap them a little, share a whole face, or keep them clearly apart`;
var isBlock = (b) => {
  const v = (b.bbox[3] - b.bbox[0]) * (b.bbox[4] - b.bbox[1]) * (b.bbox[5] - b.bbox[2]);
  return Math.abs(v - b.vol) <= 1e-9 * Math.max(v, 1);
};
function boxContact(a, b) {
  let touch = 0;
  for (let k = 0; k < 3; k++) {
    const gap = Math.max(a[k], b[k]) - Math.min(a[k + 3], b[k + 3]);
    if (gap > TOUCH_EPS)
      return "apart";
    if (gap >= -TOUCH_EPS)
      touch++;
  }
  return touch === 0 ? "overlap" : touch === 1 ? "face" : "line-point";
}
function blockTouches(names, scene) {
  const out = [];
  const ent = names.map((n) => scene.find((x) => x.name === n)).filter((x) => !!x);
  for (let i = 0; i < ent.length; i++)
    for (let j = i + 1; j < ent.length; j++) {
      const c = boxContact(ent[i].bbox, ent[j].bbox);
      if (c === "line-point" && isBlock(ent[i]) && isBlock(ent[j]))
        out.push({ a: ent[i].name, b: ent[j].name, how: "blocks touching on 2+ axes" });
    }
  return out;
}
function curvedTouches(names, scene, m) {
  const ent = names.map((n) => scene.find((x) => x.name === n)).filter((x) => !!x);
  const sum = ent.reduce((a, e) => a + e.shells, 0);
  if (m.shells < sum)
    return [];
  const out = [];
  for (let i = 0; i < ent.length; i++)
    for (let j = i + 1; j < ent.length; j++) {
      if (isBlock(ent[i]) && isBlock(ent[j]))
        continue;
      const c = boxContact(ent[i].bbox, ent[j].bbox);
      if (c === "face" || c === "line-point")
        out.push({ a: ent[i].name, b: ent[j].name, how: `boxes ${c}, no shell merged (${m.shells} of ${sum})` });
    }
  return out;
}
async function verifyUnion(f, m, ops, env, consistency = true) {
  const ct = curvedTouches(ops, env.scene, m);
  env.checks.push({ check: "join-contact", blockPairsTouching: 0, otherPairsSuspect: ct.length });
  if (ct.length)
    return JOIN_TOUCH_SENTENCE(f.id);
  const sceneTotal = env.scene.reduce((a, b) => a + b.vol, 0);
  const sceneExact = (n) => env.scene.find((b) => b.name === n)?.vol ?? 0;
  const bb = (n) => env.scene.find((b) => b.name === n)?.bbox;
  for (let i = 0; i < ops.length; i++)
    for (let j = i + 1; j < ops.length; j++) {
      const a = bb(ops[i]);
      const b = bb(ops[j]);
      if (!a || !b)
        continue;
      const diag = Math.hypot(Math.max(a[3], b[3]) - Math.min(a[0], b[0]), Math.max(a[4], b[4]) - Math.min(a[1], b[1]), Math.max(a[5], b[5]) - Math.min(a[2], b[2]));
      const near3 = Math.max(NEAR_FLUSH, 25e-6 * diag);
      for (let ax = 0; ax < 3; ax++)
        for (const k of [0, 3]) {
          const gap = Math.abs(a[ax + k] - b[ax + k]);
          const overlapOthers = [0, 1, 2].filter((q) => q !== ax).every((q) => Math.min(a[q + 3], b[q + 3]) - Math.max(a[q], b[q]) > 1e-6);
          if (overlapOthers && gap > FLUSH_NOISE && gap <= near3 * (1 + 1e-9))
            return `${f.id}: two faces of the joined parts are ${+gap.toPrecision(2)} mm apart, closer than the ${+near3.toPrecision(2)} mm this app can check reliably on a part this size (SolidCraft can silently lose a step that thin), so it is refused; make them flush or at least ${+(near3 * 1.5).toPrecision(2)} mm apart`;
        }
    }
  if (!consistency)
    return null;
  let expected = sceneExact(ops[0]);
  let inconclusive = false;
  for (let i = 1; i < ops.length; i++) {
    const r = await env.runSC([...env.accepted, { command: "solid.combine", params: { target: ops[i], tools: ops.slice(0, i), operation: "cut" } }]);
    if (!r.ok) {
      inconclusive = true;
      continue;
    }
    const consumed = ops.slice(0, i + 1).reduce((a, n) => a + sceneExact(n), 0);
    expected += total(r) - (sceneTotal - consumed);
  }
  const tol = (m.curved ? CURVED_BAR : 1e-9) * Math.max(m.volume, 1);
  const dev = m.volume - expected;
  env.checks.push({ check: "join-consistency", expectedMm3: expected, devMm3: dev, tolMm3: tol, inconclusive });
  if (!inconclusive && Math.abs(dev) > tol)
    return `${f.id}: the joined part and the sum of its pieces do not add up (${Math.abs(dev) < 0.01 ? dev.toExponential(1) : +dev.toFixed(3)} mm3 apart); a sliver or thin step of about 0.1 mm or less is the usual cause, so it is refused rather than losing it silently; make the overlap or the step thicker`;
  return null;
}
function planExtrude(fe, st, ctx, h) {
  const f = fe;
  const d = h.dep(f.target, "sketch");
  if (d)
    return refuse(d);
  const sk = cleanSketch(st.sketches[f.target]);
  if (!sk)
    return refuse(`${f.id}: ${f.target} is not a sketch`);
  const opt = optionPlan("pull", f, sk, ctx);
  if ("refusal" in opt)
    return refuse(`${f.id}: ${opt.refusal}`);
  const s = h.inSketch(sk);
  if ("refusal" in s)
    return refuse(`${f.id}: ${s.refusal}`);
  const body = { operation: "new", body_name: h.name };
  const built = emitSweep(opt, s, sk, ctx, st, body);
  if ("refusal" in built)
    return refuse(`${f.id}: ${built.refusal}`);
  return { variants: [[...built.cmds]], produces: [h.name], consumes: [], flagCurvedSlant: !!(opt.slant && hasCurve(sk, ctx)), verify: (m) => verifyPull(f, m, sk, ctx) };
}
function planPocket(fe, st, ctx, h) {
  const f = fe;
  const d = h.dep(f.target, "sketch") || h.dep(f.into, "solid");
  if (d)
    return refuse(d);
  const sk = cleanSketch(st.sketches[f.target]);
  const bs = h.needBody(f.into);
  if (!sk || !bs)
    return refuse(`${f.id}: needs a sketch and a part to cut`);
  const before = st.measure[h.headOf(f.into)];
  const opt = optionPlan("pocket", f, sk, ctx, before?.bbox ?? null);
  if ("refusal" in opt)
    return refuse(`${f.id}: ${opt.refusal}`);
  const s = h.inSketch(sk);
  if ("refusal" in s)
    return refuse(`${f.id}: ${s.refusal}`);
  if (bs.some((b) => st.curvedSlant.has(b)))
    return refuse(`${f.id}: the part it cuts was made from a slanted round pull, and cutting into one can freeze or crash SolidCraft, so it is not built yet; cut before slanting, or draw the slanted pull with straight sides`);
  if (opt.slant && hasCurve(sk, ctx) && !ctx.unguardedSlant) {
    const piece = bs.map((b) => st.scene.find((x) => x.name === b));
    if (piece.some((x) => !x || !isBlock(x)))
      return refuse(`${f.id}: a slanted cut with a round shape is only built into a plain block (no holes, pockets or steps in it), because SolidCraft can take minutes or freeze when it has to cut around them; this part is not one, so cut the slanted hole first, or cut straight down`);
  }
  if (opt.slant && hasCurve(sk, ctx) && before?.bbox) {
    const te = frameExtents(opt, sk, ctx);
    const pe = bboxInFrame(before.bbox, opt);
    if (!te)
      return refuse(`${f.id}: the outline of this slanted cut could not be measured`);
    const eps = 1e-6;
    const out = [];
    for (const ax of ["u", "v"])
      if (te[ax][0] < pe[ax][0] - eps || te[ax][1] > pe[ax][1] + eps)
        out.push(ax);
    if (opt.through)
      out.push("n");
    else {
      const far = te.n;
      const travelPos = opt.sgn * SIGN(opt.slant.c) > 0;
      if (travelPos ? far[1] > pe.n[1] + eps : far[0] < pe.n[0] - eps)
        out.push("n");
    }
    if (out.length)
      return refuse(`${f.id}: a slanted cut with a round shape is only built when it ends inside the part; this one runs out through the ${opt.through ? "far side" : "side or far end"} of the part, which can freeze or crash SolidCraft; shorten the depth, cut straight down, or draw it with straight sides`);
  }
  const built = emitSweep(opt, s, sk, ctx, st, { operation: "cut", targets: bs });
  if ("refusal" in built)
    return refuse(`${f.id}: ${built.refusal}`);
  const toolOf = finiteTool(opt);
  const tool = { pieces: bs, build: (body, only) => emitSweep(toolOf, s, sk, ctx, st, body, only) };
  tool.extents = frameExtents(opt, sk, ctx);
  tool.opt = opt;
  return { variants: [[...built.cmds]], produces: bs, consumes: [f.into], verify: (m, env) => verifyPocket(f, m, before, sk, ctx, env, tool) };
}
function joinPreflight(f, flat, st) {
  if (flat.some((n) => st.curvedSlant.has(n))) {
    const sc = new Map(st.scene.map((b) => [b.name, b.bbox]));
    const vol = (a, b) => [0, 1, 2].reduce((v, i) => v * Math.max(0, Math.min(a[i + 3], b[i + 3]) - Math.max(a[i], b[i]) - 1e-6), 1);
    for (const n of flat.filter((x) => st.curvedSlant.has(x)))
      for (const m2 of flat)
        if (m2 !== n && sc.get(n) && sc.get(m2) && vol(sc.get(n), sc.get(m2)) > 0)
          return `${f.id} a slanted round pull that runs into the other part cannot be joined yet (it can freeze or crash SolidCraft); join it where it only touches, or pull it with straight sides`;
  }
  const bt = blockTouches(flat, st.scene);
  if (bt.length)
    return JOIN_TOUCH_SENTENCE(f.id);
  return null;
}
function planCombine(fe, st, _ctx, h) {
  const f = fe;
  const ds = f.targets.map((t) => h.dep(t)).find(Boolean);
  if (ds)
    return refuse(ds);
  if (f.targets.length < 2)
    return refuse(`${f.id}: a join, subtract or intersect needs two or more parts`);
  const all = f.targets.map((t) => h.needBody(t));
  if (all.some((b) => !b || b.length === 0))
    return refuse(`${f.id}: one of its parts has nothing built, so there is nothing to combine`);
  const parts = all;
  const op = f.op === "union" ? "join" : f.op === "subtract" ? "cut" : "intersect";
  if (op !== "join" && parts.some((b) => b.length !== 1))
    return refuse(`${f.id}: a ${f.op === "subtract" ? "subtract" : "intersect"} is not built yet when one of its parts is ${parts.find((b) => b.length !== 1).length} separate pieces; make every part one piece`);
  const flat = parts.flat();
  if (op === "join") {
    const bad2 = joinPreflight(f, flat, st);
    if (bad2)
      return refuse(bad2);
  }
  return {
    variants: [[{ command: "solid.combine", params: { target: flat[0], tools: flat.slice(1), operation: op } }]],
    produces: flat,
    consumes: f.targets,
    verify: op === "join" ? (m, env) => verifyUnion(f, m, flat, env) : void 0
  };
}
function plainKernelSentence(f, raw) {
  const what = f.kind === "extrude" ? "pull" : f.kind === "pocket" ? "pocket" : f.kind === "combine" ? f.op === "union" ? "join" : f.op === "subtract" ? "subtract" : "intersect" : f.kind === "fillet" ? "round" : f.kind;
  const r = String(raw ?? "");
  if (f.kind === "combine" && /join cannot preserve the original faces|zero-thickness edge contact/.test(r))
    return JOIN_TOUCH_SENTENCE(f.id);
  if (/profile loop is not closed/.test(r))
    return `${f.id}: the outline does not close: two ends that should meet are a hair apart (less than 0.00001 mm); add a coincident rule between them or make them meet exactly`;
  if (f.kind === "extrude" || f.kind === "pocket") {
    if (/over-constrain/.test(r))
      return `${f.id}: a rule or dimension in this sketch conflicts with the others (it would over-constrain the sketch), so nothing is ${what === "pull" ? "added" : "cut"}; remove or change one of the conflicting rules`;
    if (/already determined/.test(r))
      return `${f.id}: a dimension in this sketch is already determined by the other rules, so adding it again would be redundant and nothing is ${what === "pull" ? "added" : "cut"}; remove it, or make it a reference dimension`;
  }
  if (f.kind === "combine")
    return `${f.id}: this ${what} cannot be built from these parts (the solid it makes does not close up cleanly), so nothing is combined; change the sizes or positions so the parts overlap by a clear amount`;
  if (/taper closes the profile/.test(r))
    return `${f.id}: the taper makes the outline fold over itself or close up before the end of the ${what}, so nothing is built; use a smaller taper or a shorter length`;
  if (/extrude distance is zero/.test(r))
    return `${f.id}: the length is too small to build; make it at least ${MIN_LEN} mm`;
  if (/attach a plane to a wire/.test(r))
    return `${f.id}: the outline is too small or too thin to build; draw it larger`;
  if (/through all needs a body/.test(r))
    return `${f.id}: there is no part to cut through`;
  if (f.kind === "extrude" || f.kind === "pocket")
    return `${f.id}: this ${what} cannot be built from the sketch as drawn (the solid it makes does not close up cleanly), so nothing is ${what === "pull" ? "added" : "cut"}; change the sketch, the length or the options`;
  return `${f.id}: this ${what} cannot be built as drawn (the solid it makes does not close up cleanly); change its sizes, positions or options`;
}
var EXTRUDE_POCKET_PROFILE = {
  name: "extrude-pocket",
  planners: { extrude: planExtrude, pocket: planPocket, combine: planCombine },
  verifies: true,
  initState(st) {
    st.scene = [];
    st.curvedSlant = /* @__PURE__ */ new Set();
  },
  // the bookkeeping the generic loop used to do inline after an accepted feature: the scene after the last accepted feature, and the bodies made by a slanted round pull
  onAccepted(st, res, m, plan) {
    if (plan && "flagCurvedSlant" in plan && plan.flagCurvedSlant)
      for (const b of m.bodies)
        st.curvedSlant.add(b);
    st.scene = res.measure.bodies.map((b) => ({ name: b.name, vol: b.volume_mm3, bbox: [...b.bbox.min, ...b.bbox.max], shells: b.kernel?.shells ?? 1 }));
  },
  depSentence(f, role, id, st) {
    const lbl = f.kind === "extrude" || f.kind === "pocket" || f.kind === "combine" ? f.id : `${f.id} (${f.kind})`;
    if (st.refused[id])
      return `${lbl}: its ${role} ${id} was refused, so there is nothing to build on (${String(st.refused[id]).replace(/^[^:]*: /, "")})`;
    if (st.stale[id])
      return `${lbl}: its ${role} ${id} was already used up by ${st.stale[id]}, so it cannot be used again; use the result of ${st.stale[id]} instead`;
    return null;
  },
  noOutline: noOutlineSentence,
  plannerError: (f, e) => ({
    refusal: `${f.id}: this ${f.kind === "extrude" ? "pull" : f.kind} could not be mapped for the solid kernel as written; simplify it or change its options`,
    internal: String(e && e.message)
  }),
  kernelRefusal: (f, raw) => plainKernelSentence(f, raw)
};

// ../../layer/dist/pocket-cut.js
var POCKET_CUT_GUARD = "POCKET-CUT";
var lastRun = /* @__PURE__ */ new WeakMap();
function rememberRun(accepted, res) {
  if (res?.ok && res.measure)
    lastRun.set(accepted, { len: accepted.length, res });
}
function lastRunOf(accepted) {
  const rec = lastRun.get(accepted);
  return rec && rec.len === accepted.length ? rec.res : void 0;
}
async function pocketCutRefusal(f, ctx, res, accepted, variant, produces, run) {
  if (f.kind !== "pocket" || ctx.skipSketchVolume || !res.measure)
    return null;
  const k = variant.map((c) => c.command === "solid.extrude" && c.params?.operation === "cut").lastIndexOf(true);
  if (k < 0)
    return null;
  try {
    const rec = lastRun.get(accepted);
    const prev = rec && rec.len === accepted.length ? rec.res : accepted.length ? await run(accepted) : { ok: true, measure: { bodies: [] } };
    if (!prev.ok || !prev.measure)
      return null;
    const before = aggregate(prev, produces, true);
    const m = aggregate(res, produces, true);
    if (!before || !m)
      return null;
    const scene = prev.measure.bodies.map((b) => ({ name: b.name, vol: b.volume_mm3, bbox: [...b.bbox.min, ...b.bbox.max], shells: b.kernel?.shells ?? 1 }));
    const { targets: _t, ...cut } = variant[k].params;
    const build = (body) => ({ cmds: variant.map((c, i) => i === k ? { ...c, params: { ...cut, ...body } } : c) });
    const env = { accepted: accepted.slice(), variant, runSC: (cmds) => run(cmds), checks: [], scene };
    return (await cutConsistency(f, m, before, env, { pieces: produces, build })).refusal;
  } catch {
    return null;
  }
}

// ../../layer/dist/part-name.js
var CHANGES = /* @__PURE__ */ new Set(["hole", "fillet", "shell", "draft", "move", "rotate"]);
function partNameOf(id, byId) {
  let cur = id;
  const seen = /* @__PURE__ */ new Set();
  while (cur && !seen.has(cur)) {
    seen.add(cur);
    const f = byId[cur];
    if (!f)
      return id;
    const next = CHANGES.has(f.kind) && !(f.kind === "move" && f.copy) ? f.target : f.kind === "pocket" || f.kind === "groove" ? f.into : void 0;
    if (!next)
      return cur;
    cur = next;
  }
  return id;
}
var PART = /* @__PURE__ */ new WeakMap();
var setPartName = (f, name) => {
  if (name)
    PART.set(f, name);
};
var partName = (f) => PART.get(f) ?? f.target;

// ../../layer/dist/hollow-check.js
var HOLLOW_CHECK_GUARD = "HOLLOW-ROUND";
var HOLLOW_TOL = { curved: 15e-5, planar: 1e-7 };
var FV = (f) => f;
var PARTS = ["+x", "-x", "+y", "-y", "+z", "-z"];
var AX = { x: 0, y: 1, z: 2 };
var axOf = (p) => AX[p[1]];
var sgnOf = (p) => p[0] === "+" ? 1 : -1;
var PI = Math.PI;
var ROUND_CORNER = 5 / 3 - PI / 2;
function hollowModel(f, byId) {
  const s = FV(f);
  let rounds = false;
  const chain = [];
  const seen = /* @__PURE__ */ new Set();
  let cur = s.target;
  while (cur && !seen.has(cur)) {
    seen.add(cur);
    const g = byId[cur];
    if (!g)
      return { ok: false, why: `an unknown feature ${cur}`, rounds };
    const v = FV(g);
    chain.push(v);
    if (v.kind === "box")
      break;
    cur = v.target;
  }
  const root = chain.at(-1);
  for (const v of chain)
    if (v.kind === "fillet" && v.style !== "chamfer" || v.round && v.roundStyle !== "chamfer")
      rounds = true;
  const no = (why) => ({ ok: false, why, rounds });
  if (!root || root.kind !== "box")
    return no("the part is not a box");
  if (root.round)
    return no("a whole-shape round");
  const size = root.size;
  if (!Array.isArray(size) || size.length !== 3 || !size.every((v) => v > 0))
    return no("a box with no size");
  if (!s.open || s.open.feature !== root.id || !PARTS.includes(s.open.part ?? ""))
    return no("the open face is not a face of the box");
  const t = s.thickness;
  if (!(typeof t === "number" && t > 0))
    return no("no wall");
  const blends = [];
  const holes = [];
  let turned = false;
  for (const v of chain.slice(0, -1).reverse()) {
    if (v.kind === "move") {
      if (v.copy)
        return no("a copy");
      continue;
    }
    if (v.kind === "rotate") {
      turned = true;
      continue;
    }
    if (v.kind === "fillet") {
      const e = v.edge;
      const sz = typeof v.size === "number" ? v.size : NaN;
      if (!(sz > 0))
        return no("a blend with no size");
      if (!e || e.cause !== "between" || e.of?.length !== 2 || !e.of.every((n) => n.cause === "primitive" && n.feature === root.id && PARTS.includes(n.part ?? "")))
        return no("a blend not named by two faces of the box");
      const [a, b] = [e.of[0].part, e.of[1].part].sort();
      if (axOf(a) === axOf(b))
        return no("a blend between opposite faces");
      if (blends.some((x) => x.a === a && x.b === b))
        return no("the same edge blended twice");
      blends.push({ a, b, style: v.style === "chamfer" ? "chamfer" : "fillet", size: sz });
      continue;
    }
    if (v.kind === "hole") {
      if (turned || !isZero(root.rotate))
        return no("a hole in a turned box");
      if (v.counterbore || v.countersink)
        return no("a counterbored or countersunk hole");
      const ax = AX[v.axis ?? "z"];
      const c = v.center ?? [0, 0, 0];
      if (!(typeof v.diameter === "number" && v.diameter > 0 && typeof v.depth === "number"))
        return no("a hole with no size");
      if (v.depth / 2 - Math.abs(c[ax]) < size[ax] / 2 - 1e-9)
        return no("a blind hole");
      const cs = v.corners ? [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy]) => [c[0] + sx * v.corners.dx, c[1] + sy * v.corners.dy, c[2]]) : [c];
      for (const cc of cs)
        holes.push({ axis: ax, c: cc, r: v.diameter / 2 });
      continue;
    }
    return no(`a ${v.kind}`);
  }
  return { ok: true, model: { size, blends, holes, open: s.open.part, t, rounds } };
}
var isZero = (r) => !r || r.every((x) => !x);
var CORNERS = [1, -1].flatMap((x) => [1, -1].flatMap((y) => [1, -1].map((z) => [`${x > 0 ? "+" : "-"}x`, `${y > 0 ? "+" : "-"}y`, `${z > 0 ? "+" : "-"}z`])));
var free = (b) => [0, 1, 2].find((k) => k !== axOf(b.a) && k !== axOf(b.b));
function blendedVolume(s) {
  let v = s.ext[0] * s.ext[1] * s.ext[2];
  for (const b of s.blends) {
    for (const p of [b.a, b.b]) {
      const other = p === b.a ? b.b : b.a;
      if (b.size >= s.ext[axOf(other)] - 1e-9)
        return "a blend as wide as its face";
      const opp = s.blends.find((x) => x !== b && (x.a === p || x.b === p) && axOf(x.a === p ? x.b : x.a) === axOf(other));
      if (opp && b.size + opp.size >= s.ext[axOf(other)] - 1e-9)
        return "two blends that reach each other across a face";
    }
    v -= (b.style === "fillet" ? 1 - PI / 4 : 0.5) * b.size ** 2 * s.ext[free(b)];
  }
  for (const c of CORNERS) {
    const at2 = s.blends.filter((b) => c.includes(b.a) && c.includes(b.b));
    if (at2.length < 2)
      continue;
    if (at2.length > 2)
      return "three blends at a corner";
    const [p, q] = at2;
    if (p.style !== q.style || Math.abs(p.size - q.size) > 1e-9 * Math.max(1, p.size))
      return "two different blends at a corner";
    v += (p.style === "fillet" ? ROUND_CORNER : 1 / 3) * p.size ** 3;
  }
  return v;
}
function hollowClosedForm(m) {
  const { size, t, open } = m;
  const oa = axOf(open);
  const os = sgnOf(open);
  const outer = blendedVolume({ ext: size, blends: m.blends });
  if (typeof outer === "string")
    return { why: outer };
  const iext = size.map((e, k) => e - (k === oa ? t : 2 * t));
  if (!iext.every((e) => e > 1e-9))
    return { why: "a wall as thick as the part" };
  const iblends = [];
  for (const b of m.blends) {
    const rim = b.a === open || b.b === open;
    let d;
    if (rim) {
      if (b.style === "fillet") {
        if (b.size > t + 1e-9)
          return { why: "a rim rounded more than the wall" };
        continue;
      }
      d = b.size + (Math.SQRT2 - 1) * t;
    } else
      d = b.style === "fillet" ? b.size - t : b.size - (2 - Math.SQRT2) * t;
    if (d > 1e-9)
      iblends.push({ ...b, size: d });
  }
  const cav = blendedVolume({ ext: iext, blends: iblends });
  if (typeof cav === "string")
    return { why: `the cavity has ${cav}` };
  let part = outer;
  let hollow = outer - cav;
  const clear = (c, r, ext, bl, centre2) => [0, 1, 2].filter((k) => k !== oa).every((k) => [1, -1].every((sg) => {
    const side = `${sg > 0 ? "+" : "-"}${"xyz"[k]}`;
    const reach = Math.max(0, ...bl.filter((b) => b.a === side || b.b === side).map((b) => b.size));
    return sg * (c[k] - centre2[k]) + r <= ext[k] / 2 - reach + 1e-9;
  }));
  const ic = [0, 0, 0];
  ic[oa] = os * t / 2;
  for (let i = 0; i < m.holes.length; i++) {
    const h = m.holes[i];
    if (h.axis !== oa)
      return { why: "a hole across the open axis" };
    if (!clear(h.c, h.r, size, m.blends, [0, 0, 0]))
      return { why: "a hole that reaches a blend or a side" };
    if (!clear(h.c, h.r + t, iext, iblends, ic))
      return { why: "a hole whose wall reaches a blend or a side of the cavity" };
    for (let j = 0; j < i; j++) {
      const g = m.holes[j];
      if (Math.hypot(...[0, 1, 2].filter((k) => k !== oa).map((k) => h.c[k] - g.c[k])) < h.r + g.r + 2 * t - 1e-9)
        return { why: "two holes whose walls meet" };
    }
    part -= PI * h.r ** 2 * size[oa];
    hollow -= PI * h.r ** 2 * size[oa] - PI * (h.r + t) ** 2 * iext[oa];
  }
  return { part, hollow };
}
var volOf = (res, names) => {
  const bs = res?.measure?.bodies?.filter((b) => names.includes(b.name)) ?? [];
  return bs.length === names.length && bs.length ? bs.reduce((s, b) => s + b.volume_mm3, 0) : null;
};
function hollowRefusal(f, features, st, ctx, res, produces, accepted) {
  if (f.kind !== "shell" || ctx.skipHollowCheck || ctx.skipSketchVolume || !res.measure || !FV(f).open)
    return null;
  const byId = {};
  for (const g of features)
    byId[g.id] = g;
  setPartName(f, partNameOf(FV(f).target, byId));
  const cov = hollowModel(f, byId);
  const refuse6 = (detail) => ({ sentence: openSentence(f), guard: HOLLOW_CHECK_GUARD, detail });
  if (!cov.ok)
    return cov.rounds ? refuse6({ uncovered: cov.why }) : null;
  if (!cov.model.blends.length)
    return null;
  const cf = hollowClosedForm(cov.model);
  if ("why" in cf)
    return cov.model.rounds ? refuse6({ uncovered: cf.why }) : null;
  const after = volOf(res, produces);
  if (after === null)
    return cov.model.rounds ? refuse6({ uncovered: "the hollow was not measured" }) : null;
  const curved = cov.model.rounds || cov.model.holes.length > 0;
  const tol = curved ? HOLLOW_TOL.curved : HOLLOW_TOL.planar;
  const before = volOf(lastRunOf(accepted), produces) ?? (() => {
    const m = st.measure[FV(f).target];
    return m && m.bodies.length === produces.length && m.bodies.every((b) => produces.includes(b)) ? m.volume : null;
  })();
  if (before !== null && Math.abs(before - cf.part) > tol * cf.part)
    return refuse6({ part: before, partClosed: cf.part, hollow: after, closed: cf.hollow });
  if (Math.abs(after - cf.hollow) > tol * cf.hollow)
    return refuse6({ part: before, partClosed: cf.part, hollow: after, closed: cf.hollow });
  return null;
}
var openAxisEngineSentence = (f) => `${f.id} (hollow): ${partName(f)} could not be hollowed with this wall and open side, so ${f.id} is shown without it -- try another wall or another open side.`;
var openSentence = (f) => openAxisEngineSentence(FV(f));

// ../../layer/dist/open-outline.js
var OPEN_OUTLINE_GUARD = "OPEN-OUTLINE";
var SAME_POINT = 1e-9;
var HAIR_GAP = 1e-5;
var WALK_TOL = 1e-5;
var isSoup2 = (sk) => sk.shape !== "circle" && Array.isArray(sk.geoms) && sk.geoms.length > 0;
var hyp2 = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
var where = (p) => `[${p.map((v) => +v.toFixed(3)).join(", ")}]`;
function openOutline(sk) {
  if (!isSoup2(sk))
    return null;
  const all = sk.geoms;
  const rows = all.filter((g) => !g.construction && (g.k === "line" || g.k === "arc"));
  if (!rows.length)
    return null;
  const ok = (p) => Array.isArray(p) && p.length >= 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]);
  if (rows.some((g) => !ok(g.a) || !ok(g.b)))
    return null;
  const byId = new Map(all.map((g) => [g.id, g]));
  const key = (id, end) => id === -1 ? "-1:o" : `${id}:${end ?? (byId.get(id)?.k === "circle" ? "c" : "a")}`;
  const up2 = /* @__PURE__ */ new Map();
  const find = (k) => {
    let r = k;
    for (let n = up2.get(r); n !== void 0 && n !== r; n = up2.get(r))
      r = n;
    return r;
  };
  const unite = (x, y) => {
    if (!up2.has(x))
      up2.set(x, x);
    if (!up2.has(y))
      up2.set(y, y);
    const rx = find(x);
    const ry = find(y);
    if (rx !== ry)
      up2.set(rx, ry);
  };
  for (const r of sk.rules ?? [])
    if (r && r.k === "coincident" && r.active !== false)
      unite(key(r.a, r.aEnd), key(r.b, r.bEnd));
  const ends = rows.flatMap((g) => ["a", "b"].map((e) => ({ g, e, p: g[e], k: `${g.id}:${e}` })));
  const ruled = (x, y) => up2.has(x) && up2.has(y) && find(x) === find(y);
  const joined = (i) => ends.some((y, j) => j !== i && (hyp2(ends[i].p, y.p) <= SAME_POINT || ruled(ends[i].k, y.k)));
  const gapOf = (i) => ends.reduce((m, y, j) => j === i ? m : Math.min(m, hyp2(ends[i].p, y.p)), Infinity);
  const loose = ends.map((_, i) => i).filter((i) => !joined(i));
  if (!loose.length)
    return null;
  const gaps = loose.map(gapOf);
  if (gaps.every((d) => d < HAIR_GAP))
    return { kind: "hair", gap: Math.max(...gaps) };
  const wide = new Map(loose.map((i, n) => [ends[i].k, gaps[n]]).filter(([, d]) => d >= HAIR_GAP));
  const meets = (x, y) => hyp2(x.p, y.p) <= WALK_TOL || ruled(x.k, y.k);
  const used = /* @__PURE__ */ new Set();
  for (const e of rows) {
    if (used.has(e.id))
      continue;
    used.add(e.id);
    const start = { k: `${e.id}:a`, p: e.a };
    let tail = { k: `${e.id}:b`, p: e.b };
    for (let guard = 0; guard <= rows.length && !meets(tail, start); guard++) {
      const cand = rows.filter((x2) => !used.has(x2.id) && (meets({ k: `${x2.id}:a`, p: x2.a }, tail) || meets({ k: `${x2.id}:b`, p: x2.b }, tail)));
      if (cand.length === 0) {
        if (wide.has(tail.k))
          return { kind: "loose", at: tail.p, gap: wide.get(tail.k) };
        break;
      }
      if (cand.length > 1)
        break;
      const x = cand[0];
      used.add(x.id);
      const fwd = meets({ k: `${x.id}:a`, p: x.a }, tail);
      tail = fwd ? { k: `${x.id}:b`, p: x.b } : { k: `${x.id}:a`, p: x.a };
    }
  }
  const [k0, d0] = [...wide][0];
  return { kind: "loose", at: ends.find((x) => x.k === k0).p, gap: d0 };
}
function openOutlineRefusal(f, sk) {
  if (f.kind !== "extrude" && f.kind !== "pocket" || !sk)
    return null;
  const o = openOutline(sk);
  if (!o)
    return null;
  if (o.kind === "hair")
    return `${f.id}: the outline does not close: two ends that should meet are a hair apart (less than 0.00001 mm); add a coincident rule between them or make them meet exactly`;
  return `${f.id}: sketch ${sk.id} has an edge that does not close into a loop (a loose end near ${where(o.at)}), so it has no outline to ${f.kind === "pocket" ? "cut" : "pull"}`;
}

// ../../layer/dist/move-turn.js
var MT_CUT_GUARD = "MT-CUT-HEAD";
var MT_CONE_GUARD = "MT-CONE-CHAIN";
var MT_INVARIANT_GUARD = "MT-INVARIANT";
var MT_PRIMITIVE_GUARD = "MT-PRIMITIVE";
var CONE_CHAIN_MAX = 3;
var INV_TOL = { vol: [1e-8, 3e-4], com: [1e-7, 3e-4] };
var FV2 = (f) => f;
var isStep = (k) => k === "move" || k === "rotate";
function motionInfo(doc, ctx) {
  const steps = {};
  for (const f of doc.features) {
    const v = FV2(f);
    const srcs = [v.target, v.into, ...v.targets ?? []].filter(Boolean);
    const prior = Math.max(0, ...srcs.map((t) => steps[t] ?? 0));
    steps[f.id] = prior + (isStep(f.kind) ? 1 : 0);
  }
  let names = {};
  try {
    const nm = ctx.mt?.nameMap;
    if (nm)
      names = nm(doc) ?? {};
  } catch {
    names = {};
  }
  return { steps, names };
}
var nameOf = (st, id) => st.motion?.names[id] ?? id;
function cutHeadRefusal(f, st, ctx, headOf3) {
  if (ctx.skipMoveTurn || !st.motion || !isStep(f.kind))
    return null;
  const id = FV2(f).target;
  const h = headOf3(id);
  if (h === id)
    return null;
  const N = (x) => nameOf(st, x);
  return `${N(f.id)} is not built: it ${f.kind === "rotate" ? "turns" : "moves"} ${N(id)}, but ${N(h)} had already cut into ${N(id)}, and this build cannot tell whether you mean the part before or after the cut -- ${f.kind === "rotate" ? "turn" : "move"} ${N(id)} before the cut, or ${f.kind === "rotate" ? "turn" : "move"} the result of ${N(h)} instead.`;
}
function coneChainRefusal(f, st, ctx) {
  if (ctx.skipMoveTurn || !st.motion || !isStep(f.kind))
    return null;
  const v = FV2(f);
  const prior = Math.max(0, ...[v.target, v.into, ...v.targets ?? []].filter(Boolean).map((t) => st.motion.steps[t] ?? 0));
  const coneTarget = (st.measure[v.target]?.faceTypes?.cone ?? 0) > 0;
  if (!coneTarget || prior + 1 <= CONE_CHAIN_MAX)
    return null;
  return `${nameOf(st, f.id)} is not built: ${nameOf(st, v.target)} has a cone-shaped face and has already been moved or turned ${prior} times, and a cone moved or turned more than ${CONE_CHAIN_MAX} times in a row cannot be placed accurately, so it is shown without it -- build the part where you want it, or use fewer moves and turns.`;
}
function measureOf(res, names) {
  const bs = res?.measure?.bodies?.filter((b) => names.includes(b.name)) ?? [];
  if (!bs.length)
    return null;
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  for (const b of bs)
    for (let i = 0; i < 3; i++) {
      lo[i] = Math.min(lo[i], b.bbox.min[i]);
      hi[i] = Math.max(hi[i], b.bbox.max[i]);
    }
  const vol = bs.reduce((s, b) => s + b.volume_mm3, 0);
  const areas = bs.map((b) => b.area_mm2);
  return {
    volume: vol,
    area: areas.every((a) => typeof a === "number" && Number.isFinite(a)) ? areas.reduce((s, a) => s + a, 0) : null,
    faceTypes: bs.reduce((a, b) => {
      for (const [k, n] of Object.entries(b.face_types ?? {}))
        a[k] = (a[k] ?? 0) + n;
      return a;
    }, {}),
    com: [0, 1, 2].map((i) => bs.reduce((a, b) => a + b.volume_mm3 * (b.center_of_mass?.[i] ?? NaN), 0) / vol),
    bbox: [...lo, ...hi],
    curved: bs.some((b) => Object.keys(b.face_types ?? {}).some((k) => k !== "plane"))
  };
}
var fmt2 = (v) => Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 1 ? v.toFixed(1) : v.toPrecision(2);
var rel = (a, b) => Math.abs(a - b) / Math.max(Math.abs(b), 1e-12);
var diagOf = (bb) => Math.max(Math.hypot(bb[3] - bb[0], bb[4] - bb[1], bb[5] - bb[2]), 1);
var dist3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
function invariantSentence(f, st, x, r) {
  const v = FV2(f);
  const nm = nameOf(st, f.id);
  const tn = nameOf(st, v.target);
  const k = x.curved || r.curved ? 1 : 0;
  const move = f.kind === "move";
  const bad2 = (what, got, want, unit3) => `${nm} is not built: ${move ? "moving" : "turning"} ${tn} would change its ${what} (${got}${unit3} instead of ${want}${unit3}), which a ${move ? "move" : "turn"} must never do, so it is shown without it -- try fewer separate ${move ? "moves" : "turns"}, or build the part where you want it.`;
  if (rel(x.volume, r.volume) > INV_TOL.vol[k])
    return bad2("volume", fmt2(x.volume), fmt2(r.volume), " mm3");
  if (x.area !== null && r.area !== null && rel(x.area, r.area) > INV_TOL.vol[k])
    return bad2("surface area", fmt2(x.area), fmt2(r.area), " mm2");
  for (const t of /* @__PURE__ */ new Set([...Object.keys(r.faceTypes), ...Object.keys(x.faceTypes)])) {
    if (t === "cylinder")
      continue;
    const a = r.faceTypes[t] ?? 0;
    const b = x.faceTypes[t] ?? 0;
    if (a !== b)
      return `${nm} is not built: ${move ? "moving" : "turning"} ${tn} would change its faces (${b} ${t === "other" ? "of unknown kind" : t} ${b === 1 ? "face" : "faces"} instead of ${a}), which a ${move ? "move" : "turn"} must never do, so it is shown without it -- try fewer separate ${move ? "moves" : "turns"}, or build the part where you want it.`;
  }
  if (!x.com.every(Number.isFinite) || !r.com.every(Number.isFinite))
    return null;
  const dg = diagOf(r.bbox);
  if (move) {
    const want = r.com.map((c, i) => c + (v.offset?.[i] ?? 0));
    if (dist3(x.com, want) / dg > INV_TOL.com[k])
      return bad2("centre of mass", `[${x.com.map(fmt2)}]`, `[${want.map(fmt2)}]`, "");
  } else {
    const c = [0, 1, 2].map((i) => (r.bbox[i] + r.bbox[i + 3]) / 2);
    const dr = dist3(r.com, c);
    const dx = dist3(x.com, c);
    if (Math.abs(dr - dx) / dg > INV_TOL.com[k])
      return bad2("centre of mass", `${fmt2(dx)} from the pivot`, `${fmt2(dr)} from the pivot`, " mm");
  }
  return null;
}
function primitiveVolume(f) {
  const v = FV2(f);
  if (v.round)
    return null;
  const P = Math.PI;
  switch (f.kind) {
    case "box":
      return v.size[0] * v.size[1] * v.size[2];
    case "cylinder":
      return P * v.radius ** 2 * v.height;
    case "cone":
      return P * v.radius ** 2 * v.height / 3;
    case "sphere":
      return 4 / 3 * P * v.radius ** 3;
    case "torus":
      return 2 * P * P * v.ringRadius * v.tubeRadius ** 2;
    case "prism": {
      const n = Math.max(3, Math.min(12, Math.round(v.sides)));
      return 0.5 * n * v.radius ** 2 * Math.sin(2 * P / n) * v.height;
    }
    case "wedge":
      return 0.5 * v.width * v.depth * v.height;
    default:
      return null;
  }
}
function primitiveSentence(f, st, m) {
  const want = primitiveVolume(f);
  if (!want)
    return null;
  const curved = ["cylinder", "cone", "sphere", "torus"].includes(f.kind);
  if (rel(m.volume, want) <= INV_TOL.vol[curved ? 1 : 0])
    return null;
  return `${nameOf(st, f.id)} is not built: the engine built it with the wrong size (volume ${fmt2(m.volume)} mm3 instead of ${fmt2(want)} mm3), so it is shown without it -- try it with fewer turns and moves, or build it at the origin and move it once.`;
}
var PRIMITIVE_KINDS = ["box", "cylinder", "sphere", "cone", "torus", "prism", "wedge"];
function motionRefusal(f, st, ctx, res, produces, accepted) {
  if (ctx.skipMoveTurn || ctx.skipSketchVolume || !st.motion || !res.measure)
    return null;
  if (PRIMITIVE_KINDS.includes(f.kind)) {
    const m = measureOf(res, produces);
    const s2 = m ? primitiveSentence(f, st, m) : null;
    return s2 ? { sentence: s2, guard: MT_PRIMITIVE_GUARD } : null;
  }
  if (!isStep(f.kind) || FV2(f).copy)
    return null;
  const x = measureOf(res, produces);
  if (!x)
    return null;
  let r = measureOf(lastRunOf(accepted), produces);
  if (!r) {
    const t = st.measure[FV2(f).target];
    if (!t || t.bodies.length !== produces.length || !t.bodies.every((b) => produces.includes(b)))
      return null;
    r = { volume: t.volume, area: null, faceTypes: t.faceTypes ?? {}, com: t.com, bbox: t.bbox, curved: t.curved };
  }
  const s = invariantSentence(f, st, x, r);
  return s ? { sentence: s, guard: MT_INVARIANT_GUARD } : null;
}
function padCommands(names, n) {
  return Array.from({ length: n }, () => names.map((nm) => ({ command: "solid.move", params: { bodies: [nm], translate: [0, 0, 0] } }))).flat();
}
async function motionRepair(f, st, ctx, first, produces, accepted, variant, run) {
  if (ctx.skipMoveTurnRepair || first.guard !== MT_INVARIANT_GUARD || !isStep(f.kind) || FV2(f).copy || !produces.length)
    return null;
  for (const n of [1, 2]) {
    const v2 = [...variant, ...padCommands(produces, n)];
    let res;
    try {
      res = await run([...accepted, ...v2]);
    } catch {
      continue;
    }
    if (!res?.ok || !res.measure)
      continue;
    if (!measureOf(res, produces))
      continue;
    if (motionRefusal(f, st, ctx, res, produces, accepted) === null)
      return { variant: v2, res, pads: n };
  }
  return null;
}

// ../../layer/dist/primitives.js
var PRIMITIVES_GUARD = "PRIMITIVES";
var LIM = {
  // ---- box corner (E1, E14)
  boxCornerGap: 1e-4,
  // corner <= half the shortest side x (1 - gap): the truck rounded box is exact to a gap of 1e-5 (18 faces instead of 26 at 1e-6)
  boxCornerMinRel: 1e-4,
  // corner >= this x the LONGEST side: bands are dropped below ~3e-6 x the shortest side (E14: 1.2 -> 3e-6, 12 -> 3e-5, 120 -> 1e-4, 1200 -> 1e-3 are 18 faces); 1e-4 x longest keeps >= 12x
  // ---- cylinder corner / bevel (E2, E14, E14b, E15)
  cylCornerMin: 1e-4,
  // absolute: 3e-6 builds exactly at R 0.6 .. 60, 1e-6 is refused by truck in kernel text at every radius
  cylCornerMinRel: 1e-6,
  // and relative to max(across, tall): a BEVEL drops faces (3 or 4 of 5) at 5.6e-9 .. 1.3e-8 x that size (E14b: R 600 at 1e-5, R 6000 at 1e-4, R 25000 at 1e-3), the floor is 75x above the largest wrong cell
  // The flat top left over after the rim round (R - corner) must be wide enough for the mesh: E15/E15b, R 0.5 .. 200 with H 5 .. 600: the bbox is 1e-2 to 2.6e-2 of the
  // diagonal wrong when the leftover is 0.0008 .. 0.001 x max(across, tall) or less, and exact from 0.0013 x (R 0.5: 0.005 wrong / 0.01 right; R 5: 0.05 / 0.1; R 50: 0.1 / 0.2; R 200: 0.5 / 1).
  // It is NOT a fraction of R alone (a 99%-of-R rule passes R 2 at 0.0201 and R 5 at 0.05, which are wrong) and not a constant (R 200 needs 1).
  cylLeftoverSizeFrac: 0.01,
  // R - corner >= this x max(across, tall): a decade over the last wrong cell, 7x over the first right one
  cylHalfHeightGap: 1e-4,
  // half the height - corner, relative (E2: 1e-4 exact; E15 H series: gaps down to 0.001 on heights 1, 5, 20 are exact)
  // ---- ring (E4, E19)
  ringThinMax: 50,
  // across / tubeAcross <= 50 (2.7e-4 at 40 and 400 across)
  ringFatMin: 2.05,
  // across / tubeAcross >= 2.05, inclusive (E19)
  // ---- sizes (E5, E8, E9, E12)
  curvedMax: 5e4,
  planarMax: 1e6,
  curvedMin: 1,
  ringTubeMin: 0.5,
  tallMin: 0.01,
  planarMin: 0.01,
  // round 4b: was 1e-3. truck refuses a planar profile in kernel text ('cannot attach a plane to a wire ...') for 32 of 233 recorded inputs at EXACTLY 0.001 and for 2 at 0.00114 / 0.002; none at or above 0.0021; a decade above the last refusal
  cylSlender: 30,
  coneSlender: 40,
  planarAspectMax: 1e4,
  // E13: longest / shortest typed size of a planar part. Ends are lost (4 faces for 6) from ~1e6 for a box and from 1e5 for a turned box or a prism needle
  // ---- placement
  curvedFarRatio: 400,
  // curved: largest |at| <= this x the SMALLEST typed size (E7, E20)
  // planar: the volume/centre of mass of truck are summed from products of vertex coordinates, so the rounding error grows as the product of the
  // largest |coordinate| on each axis and is compared with the volume. Q = prod_a(|at_a| + ext_a) / V. E12: exact (dVol <= 6e-10) up to Q 1e7, wrong from 1e8.
  planarQMax: 1e6,
  // a TURNED shape or a prism has a wider scatter (the rotation and the n-gon vertices are not exact): the first wrong cases sit at Q 1.4e5, 1.5e5, 5.5e5 (random inputs, seed 1: dVol 6e-8 .. 1.3e-7, COM 3e-4 .. 5e-4 x diagonal) although the E12 grid was exact to 1e7, so the limit is a decade under the lowest wrong cell
  planarQMaxTurned: 1e4,
  // ---- round 4, after fuzz seeds 1..3 (E22..E27). Every one is the edge of a measured cell with a decade (or the stated factor) of margin.
  coneFlatMin: 0.01,
  // cone tall / across (E26a2, E27d: 4 faces for 2 at 0.0005 plain and at 0.001 turned, right from 0.002 -> 5x margin)
  coneTurnedSlender: 10,
  // a TURNED cone: tall / across (E23, E26a: 3 faces for 2 from 16, right up to 15)
  coneTurnedMovedMinT: 1,
  // a cone that is turned AND not at the origin: tall / across at least this (E26b, E27c: volume 10% .. 100x off up to 0.65, right from 0.7)
  cylRoundAspectMax: 100,
  // cylinder with corner or bevel: across / tall (E24, E26c, E27b: a face is dropped from 450, right through 300; volume 2.6e-4 at 200)
  boxRoundAspectMax: 100,
  // box with corner: longest / shortest (E26c, E27a: volume 3.5e-4 .. 7.7e-4 from 300, 2e-4 at 200, 1.2e-4 up to 100)
  sphereFarProduct: 1e8
  // a curved shape: largest |at| x largest typed size (E21, E25, E27e: first wrong 1e9 (sphere 1000 at 1e6), erratic above it; right everywhere at or below 4e8)
};
var SHAPE = { box: "box", cylinder: "cylinder", sphere: "sphere", cone: "cone", torus: "ring", prism: "prism", wedge: "wedge" };
function num(v) {
  if (!Number.isFinite(v))
    return String(v);
  if (Number.isInteger(v) && Math.abs(v) < 1e15)
    return String(v);
  const a = Math.abs(v);
  if (a >= 1e-6 && a < 1e15)
    return String(+v.toPrecision(4));
  return v.toExponential(2).replace("e+", " x 10^").replace("e-", " x 10^-");
}
var down = (v, d = 3) => {
  if (!(v > 0))
    return 0;
  const k = 10 ** Math.max(d, Math.ceil(-Math.log10(v)) + 2);
  return Math.floor(v * k) / k;
};
var up = (v, d = 3) => {
  const k = 10 ** Math.max(d, Math.ceil(-Math.log10(v)) + 2);
  return Math.ceil(v * k) / k;
};
function dims(f) {
  switch (f.kind) {
    case "box":
      return [["width", f.size?.[0]], ["depth", f.size?.[1]], ["height", f.size?.[2]]];
    case "cylinder":
      return [["across", 2 * f.radius], ["tall", f.height]];
    case "sphere":
      return [["across", 2 * f.radius]];
    case "cone":
      return [["across", 2 * f.radius], ["tall", f.height]];
    case "torus":
      return [["across", 2 * (f.ringRadius + f.tubeRadius)], ["tubeAcross", 2 * f.tubeRadius]];
    case "prism":
      return [["across", 2 * f.radius], ["tall", f.height]];
    case "wedge":
      return [["width", f.width], ["depth", f.depth], ["tall", f.height]];
    default:
      return [];
  }
}
var isCurved = (f) => f.kind === "cylinder" || f.kind === "sphere" || f.kind === "cone" || f.kind === "torus" || f.kind === "box" && !!f.round;
var refuse2 = (code, sentence) => ({ code, sentence });
var callOf = (f) => {
  const nm = SHAPE[f.kind];
  const D = dims(f).map(([, v]) => num(v));
  if (f.kind === "prism")
    return `prism(${f.sides}, ${D.join(", ")})`;
  return `${nm}(${D.join(", ")})`;
};
function planarVolumeExtent(f) {
  if (f.kind === "box")
    return { V: f.size[0] * f.size[1] * f.size[2], ext: f.size.map((v) => v / 2) };
  if (f.kind === "wedge")
    return { V: f.width * f.depth * f.height / 2, ext: [f.width, f.depth, f.height] };
  const n = f.sides;
  return { V: 0.5 * n * f.radius ** 2 * Math.sin(2 * Math.PI / n) * f.height, ext: [f.radius, f.radius, f.height / 2] };
}
function farQ(f) {
  const { V, ext } = planarVolumeExtent(f);
  const c = f.center ?? [0, 0, 0];
  const turned = !!(f.rotate && f.rotate.some((v) => v));
  const R = Math.hypot(...ext);
  const e = turned ? [R, R, R] : ext;
  return { Q: c.reduce((p, v, i) => p * (Math.abs(v) + e[i]), 1) / V, V, e };
}
function farBound(e, V, qmax) {
  const target = qmax * V;
  let lo = 0;
  let hi = 12e5;
  if (e.reduce((p, v) => p * v, 1) > target)
    return 0;
  for (let i = 0; i < 80; i++) {
    const m = (lo + hi) / 2;
    if (e.reduce((p, v) => p * (m + v), 1) <= target)
      lo = m;
    else
      hi = m;
  }
  return lo;
}
function guardFeature(f) {
  const kind = f.kind;
  if (!SHAPE[kind])
    return null;
  const nm = SHAPE[kind];
  const D = dims(f);
  const curved = isCurved(f);
  const cx = f.center ?? [0, 0, 0];
  const turned = !!(f.rotate && f.rotate.some((v) => v));
  const turnedOffZ = !!(f.rotate && (f.rotate[0] || f.rotate[1]));
  for (const [name, v] of D) {
    if (!(typeof v === "number" && Number.isFinite(v) && v > 0))
      return refuse2("not-a-size", `${nm}(): ${name} has to be a number above 0, and it is ${num(v)}.`);
  }
  if (cx.some((v) => !Number.isFinite(v)))
    return refuse2("not-a-position", `${nm}(): every at coordinate has to be a number.`);
  if (f.round !== void 0 && f.round !== 0 && !(Number.isFinite(f.round) && f.round > 0))
    return refuse2("not-a-corner", `${callOf(f)}: the corner has to be a number above 0, and it is ${num(f.round)}.`);
  if (kind === "prism" && !(Number.isInteger(f.sides) && f.sides >= 3 && f.sides <= 12)) {
    return refuse2("prism-sides", `prism(): sides has to be a whole number from 3 to 12, and it is ${num(f.sides)} -- any other value would be rounded to a different shape.`);
  }
  if (kind === "torus") {
    const across = 2 * (f.ringRadius + f.tubeRadius);
    const tube = 2 * f.tubeRadius;
    if (!(f.ringRadius > 0) || across < tube * LIM.ringFatMin * (1 - 1e-9)) {
      const maxTube = down(across / LIM.ringFatMin, 3);
      return refuse2("ring-tube-too-thick", `ring(${num(across)}, ${num(tube)}): the tube is too thick for a ring ${num(across)} across, so the hole in the middle would close and the part would be built wrongly -- tubeAcross has to be ${num(maxTube)} or less.`);
    }
    if (across > tube * LIM.ringThinMax * (1 + 1e-9)) {
      return refuse2("ring-tube-too-thin", `ring(${num(across)}, ${num(tube)}): the tube is too thin for a ring ${num(across)} across, so its volume would be measured wrongly -- tubeAcross has to be at least ${num(up(across / LIM.ringThinMax, 3))}, one fiftieth of across.`);
    }
  }
  for (const [name, v] of D) {
    let floor = curved ? LIM.curvedMin : LIM.planarMin;
    if (kind === "torus" && name === "tubeAcross")
      floor = LIM.ringTubeMin;
    else if ((kind === "cylinder" || kind === "cone") && name === "tall")
      floor = LIM.tallMin;
    if (v < floor)
      return refuse2(curved ? "too-small-curved" : "too-small", `${nm}(): ${name} ${num(v)} is too small -- ${curved ? "a curved or rounded shape this small is built with the wrong size and shape" : "a part this small is built with the wrong size or missing faces"}, so make it at least ${num(floor)}.`);
  }
  const cap2 = curved ? LIM.curvedMax : LIM.planarMax;
  for (const [name, v] of D) {
    if (v > cap2)
      return refuse2(curved ? "too-big-curved" : "too-big", `${nm}(): ${name} ${num(v)} is too big -- ${curved ? "a curved or rounded shape this big is built with the wrong volume and position" : "a part this big is built with the wrong volume and position"}, so keep it at ${num(cap2)} or less.`);
  }
  const vals = D.map(([, v]) => v);
  const smin = Math.min(...vals);
  const smax = Math.max(...vals);
  if (kind === "box" && f.round) {
    if (f.roundStyle === "chamfer") {
      return refuse2("box-chamfer", "box(): a chamfer on every edge of a box is not available because it would be built with its corners cut wrongly -- use corner for a rounded box, or leave the edges square.");
    }
    const [w, d, h] = f.size;
    const m = Math.min(w, d, h);
    const lim = m / 2 * (1 - LIM.boxCornerGap);
    if (f.round > lim) {
      return refuse2("box-corner-too-big", `box(${num(w)}, ${num(d)}, ${num(h)}, { corner: ${num(f.round)} }): the corner is too big -- the rounding would not fit and the box would be built the wrong size, so it has to be ${num(down(lim))} or less, a little under half of the shortest side (${num(m)}).`);
    }
    const floor = LIM.boxCornerMinRel * Math.max(w, d, h);
    if (f.round < floor) {
      return refuse2("box-corner-too-small", `box(${num(w)}, ${num(d)}, ${num(h)}, { corner: ${num(f.round)} }): the corner is too small -- some of the rounded edges would be left out of the part, so it has to be at least ${num(up(floor))}, one ten-thousandth of the longest side (${num(Math.max(w, d, h))}).`);
    }
  }
  if (kind === "cylinder" && f.round) {
    const R = f.radius;
    const across = 2 * R;
    const hLim = f.height / 2 * (1 - LIM.cylHalfHeightGap);
    const what = f.roundStyle === "chamfer" ? "bevel" : "corner";
    const rLim = R - LIM.cylLeftoverSizeFrac * Math.max(across, f.height);
    const cFloor = Math.max(LIM.cylCornerMin, LIM.cylCornerMinRel * Math.max(across, f.height));
    if (f.round < cFloor)
      return refuse2("cyl-corner-too-small", `cylinder(${num(across)}, ${num(f.height)}, { corner: ${num(f.round)} }): the ${what} is too small -- it would be left out of the part, so it has to be at least ${num(up(cFloor))}.`);
    if (f.round > rLim)
      return refuse2("cyl-corner-vs-radius", `cylinder(${num(across)}, ${num(f.height)}, { corner: ${num(f.round)} }): the ${what} is too big for the width -- the flat top that is left would be too narrow to be built correctly, so it has to be ${num(down(Math.max(rLim, 0)))} or less (the radius is ${num(R)}, and the flat top must stay at least one hundredth of ${num(Math.max(across, f.height))}).`);
    if (f.round > hLim)
      return refuse2("cyl-corner-vs-height", `cylinder(${num(across)}, ${num(f.height)}, { corner: ${num(f.round)} }): the ${what} is too big for the height -- the two rims would run into each other and the part would be built wrongly, so it has to be ${num(down(hLim))} or less, a little under half of tall (${num(f.height)}).`);
  }
  if (kind === "cylinder" && f.height / (2 * f.radius) > LIM.cylSlender)
    return refuse2("cyl-too-slender", `cylinder(${num(2 * f.radius)}, ${num(f.height)}): too long for its width -- a slender cylinder is measured wrongly, so tall has to be at most ${LIM.cylSlender} times across.`);
  if (kind === "cone" && f.height / (2 * f.radius) > LIM.coneSlender)
    return refuse2("cone-too-slender", `cone(${num(2 * f.radius)}, ${num(f.height)}): too long for its width -- a slender cone is measured wrongly, so tall has to be at most ${LIM.coneSlender} times across.`);
  if (kind === "cone") {
    const across = 2 * f.radius;
    const t = f.height / across;
    const moved2 = cx.some((v) => v !== 0);
    if (t < LIM.coneFlatMin)
      return refuse2("cone-too-flat", `cone(${num(across)}, ${num(f.height)}): too flat for its width -- a cone this flat is built with the wrong number of faces, so tall has to be at least ${num(up(LIM.coneFlatMin * across))}, one hundredth of across.`);
    if (turnedOffZ && t > LIM.coneTurnedSlender)
      return refuse2("cone-turned-slender", `cone(${num(across)}, ${num(f.height)}): too long to be turned -- a turned cone this long is built with a seam through its side, so tall has to be at most ${LIM.coneTurnedSlender} times across, or leave the cone unturned.`);
    if (turned && moved2 && t < LIM.coneTurnedMovedMinT)
      return refuse2("cone-turned-moved-flat", `cone(${num(across)}, ${num(f.height)}): a cone that is turned and not at the origin has to be at least as tall as it is across -- a flatter one is built with the wrong volume and position, so make tall ${num(up(across))} or more, or leave it unturned or at the origin.`);
  }
  if (kind === "box" && f.round && smax / smin > LIM.boxRoundAspectMax) {
    return refuse2("box-round-too-thin", `${callOf(f)}: too long and thin for a rounded box -- its volume would be measured wrongly, so the longest side has to be at most ${LIM.boxRoundAspectMax} times the shortest.`);
  }
  if (kind === "cylinder" && f.round && 2 * f.radius / f.height > LIM.cylRoundAspectMax) {
    return refuse2("cyl-round-too-flat", `cylinder(${num(2 * f.radius)}, ${num(f.height)}, { corner: ${num(f.round)} }): too flat for a rounded rim -- a rim on a disc this wide is built with a face missing, so across has to be at most ${LIM.cylRoundAspectMax} times tall.`);
  }
  if (!curved && smax / smin > LIM.planarAspectMax) {
    return refuse2("too-thin-planar", `${callOf(f)}: too long and thin -- its ends would be lost and the part built with missing faces, so the longest size has to be at most ${LIM.planarAspectMax} times the shortest.`);
  }
  const far = Math.max(...cx.map(Math.abs));
  if (far > LIM.planarMax)
    return refuse2("too-far", `${nm}(): the at position ${num(far)} is too far from the origin -- the part would be built in the wrong place, so keep every at coordinate within ${num(LIM.planarMax)}.`);
  if (curved) {
    if (far * smax > LIM.sphereFarProduct) {
      return refuse2("too-far-big-curved", `${nm}(): a shape ${num(smax)} across at a position ${num(far)} from the origin is too far out for its size -- its volume and centre would be worked out wrongly, so keep the position times the biggest size at ${num(LIM.sphereFarProduct)} or less (at most ${num(down(LIM.sphereFarProduct / smax, 3))} here).`);
    }
    if (far > LIM.curvedFarRatio * smin) {
      return refuse2("too-far-curved", `${nm}(): the at position ${num(far)} is too far from the origin for a shape whose smallest size is ${num(smin)} -- its volume and centre would be worked out wrongly, so keep every at coordinate within ${num(LIM.curvedFarRatio * smin)} (${LIM.curvedFarRatio} times that size), or move the shape nearer.`);
    }
  } else {
    const { Q, V, e } = farQ(f);
    const qmax = turned || kind === "prism" ? LIM.planarQMaxTurned : LIM.planarQMax;
    if (Q > qmax) {
      const x = farBound(e, V, qmax);
      return refuse2("too-far-planar", `${callOf(f)}: the at position ${num(far)} is too far from the origin for a part this small -- its volume and centre would be worked out wrongly, so keep every at coordinate within ${num(down(x, 3))}${turned || kind === "prism" ? " (a turned part or a prism needs more room)" : ""}, or make the part bigger.`);
    }
  }
  return null;
}
function primitiveEffects(doc) {
  const eff = /* @__PURE__ */ new Map();
  for (const f0 of doc.features) {
    const f = f0;
    if (SHAPE[f.kind])
      eff.set(f0.id, { ...f, center: [...f.center ?? [0, 0, 0]] });
    else if (f.kind === "rotate" && eff.has(f.target)) {
      const e = eff.get(f.target);
      e.rotate = (f.angles ?? [0, 0, 0]).map((v, i) => (e.rotate?.[i] ?? 0) + v);
      if (!e.rotate.some((v) => v))
        e.rotate = [0, 0, 0];
    } else if (f.kind === "move" && eff.has(f.target) && !f.copy) {
      const e = eff.get(f.target);
      e.center = e.center.map((v, i) => v + (f.offset?.[i] ?? 0));
    }
  }
  return eff;
}
function primitiveRefusal(f, st, ctx) {
  if (ctx.skipPrimitives || !SHAPE[f.kind])
    return null;
  const e = st.primitives?.get(f.id);
  if (!e)
    return null;
  const pv = f;
  return guardFeature({ ...e, round: pv.round, roundStyle: pv.roundStyle });
}

// ../../layer/dist/errored-body.js
var ERRORED_BODY_GUARD = "ERRORED-BODY";
var erroredBodySentence = (f) => `${f.id} (${f.kind}): this shape could not be built, so it is shown without it; check its sizes and position.`;
var isV3 = (v) => Array.isArray(v) && v.length === 3 && v.every((x) => typeof x === "number");
function erroredBodies(res) {
  if (!res || !res.ok || !res.measure || !Array.isArray(res.measure.bodies))
    return [];
  return res.measure.bodies.filter((b) => b == null || b.error != null || !b.bbox || !isV3(b.bbox.min) || !isV3(b.bbox.max)).map((b) => String(b?.name ?? "(unnamed)"));
}
function asFailed(res) {
  const bad2 = erroredBodies(res);
  if (!bad2.length)
    return res;
  const why = res.measure.bodies.find((b) => b && b.error != null)?.error;
  return { ...res, ok: false, erroredBody: bad2, failed: { command: "inspect.measure", error: `the engine answered ok, but ${bad2.join(", ")} ${bad2.length === 1 ? "is" : "are"} an error${why != null ? ` (${String(why)})` : ""}` } };
}
var isThenable = (x) => !!x && typeof x.then === "function";
function withErroredBodies(ctx) {
  const run = ctx.runSC;
  if (run.erroredBodies)
    return ctx;
  const wrapped2 = function(...a) {
    const r = run.apply(ctx, a);
    return isThenable(r) ? Promise.resolve(r).then(asFailed) : asFailed(r);
  };
  wrapped2.erroredBodies = true;
  return { ...ctx, runSC: wrapped2 };
}

// ../../layer/dist/fc-sentences.js
var style = (id) => /^bevel|^chamfer/.test(id) ? "bevel" : "round";
var fmt3 = (n) => {
  const x = +n;
  return Number.isInteger(x) ? String(x) : String(+x.toFixed(4));
};
function guardSentence(g, id, st) {
  const a = g.args ?? {};
  const fm = (x) => fmt3(Math.floor(x * 100) / 100);
  switch (g.code) {
    case "too-big":
      return a.face === "cap" ? `The ${st} ${id} is almost as big as the end of the cylinder (radius ${fm(a.extent)}), so ${id} is shown without it -- use a size under ${fm(a.extent - (a.margin ?? 0.1))}.` : a.face === "side" ? `The ${st} ${id} is almost as big as the cylinder is tall (${fm(a.extent)}), so ${id} is shown without it -- use a size under ${fm(a.extent - (a.margin ?? 0.1))}.` : `The ${st} ${id} is as big as or bigger than the face it cuts into (${fm(a.extent)} wide), so ${id} is shown without it -- use a size under ${fm(a.extent)}.`;
    case "in-the-way":
      return `The ${st} ${id} would reach a hole, pocket or cut next to the edge, so ${id} is shown without it -- ${st} the edge before you cut, or use a smaller size.`;
    case "corner":
      return `The ${st} ${id} meets an edge that was already rounded, so ${id} is shown without it -- ${st} edges that do not touch each other, or leave one out.`;
    case "split":
      return `The edge for ${id} has been cut in two by a pocket or hole, so ${id} is shown without it -- ${st} the edge before you cut, or move the cut away from the edge.`;
    case "too-small":
      return `The ${st} size of ${id} is zero, negative or smaller than 0.01, so ${id} is shown without it -- give it a size of at least 0.01.`;
    case "whole-chamfer":
      return `Bevelling every edge of a box at once is not supported, so ${id} is shown without it -- bevel the edges one at a time.`;
    case "twice":
      return `The ${st} ${id} names the same edge twice, so ${id} is shown without it -- name each edge once.`;
    case "crowded":
      return `The ${st} ${id} is too big for the ${a.ofGroup > 2 ? "edges rounded together" : "two edges"} on the face between them (${fm(a.gap)} apart), so ${id} is shown without it -- use a size under ${fm(a.gap / 2)}.`;
    case "corner3":
      return `The ${st}s of ${id} meet three at one corner, where other CAD programs add a small triangle that this one does not, so ${id} is shown without it -- ${st} at most two edges at a corner, or use round instead.`;
    case "knife-rim":
      return `The hollow's open edge is rounded with a radius of ${fmt3(a.size)}, which is at least as large as the wall (${fmt3(a.wall)}), so the rim would have no thickness and ${id} is shown without it -- make the round smaller than the wall.`;
    case "negative":
      return `The ${st} size of ${id} is negative, so ${id} is shown without it -- give it a size above zero.`;
    case "no-topology":
      return `The part before ${id} could not be read back, so ${id} is shown without it -- try again with a simpler part.`;
    case "face-count":
      return `The ${st} ${id} did not give the part the new face it should, so ${id} is shown without it -- use a smaller size.`;
    case "no-edge":
    case "unknown-edge":
    case "orientation":
      return `The edge for ${id} could not be found on the part as it is now, so ${id} is shown without it -- name two faces that meet there, such as top and front.`;
    case "curved-face":
    case "curved-edge":
      return `The ${st} ${id} is on an edge next to a curved face other than the end of a cylinder, which is not supported yet, so ${id} is shown without it -- ${st} a straight edge between two flat faces instead.`;
    default:
      return null;
  }
}
var KIND_WORD = { fillet: "round or bevel", draft: "draft", hole: "hole", pocket: "pocket", combine: "join or cut", shell: "hollow", move: "move", rotate: "turn", mirror: "mirror", pattern: "repeat", groove: "groove" };
function edgeTouched(id, st, ctx) {
  const causes = (ctx.causes ?? []).filter((c) => KIND_WORD[c.kind]);
  const blends = causes.filter((c) => c.kind === "fillet");
  const me = ctx.self ?? {};
  if (blends.length && causes.length === blends.length) {
    const other = blends[blends.length - 1];
    if (other.style === me.style && other.size === me.size)
      return { cls: "edge-touched", sentence: `The ${st} ${id} touches an edge that ${other.id} already changed, and something stands between them, so ${id} is shown without it -- put touching ${st}s of the same size one straight after the other.` };
    return { cls: "edge-touched", sentence: `The ${st} ${id} touches an edge that ${other.id} already changed with a different ${other.style !== me.style ? "kind of blend" : "size"}, so ${id} is shown without it -- give touching edges the same size and kind so they are blended together, or leave one out.` };
  }
  if (causes.length) {
    const words = [...new Set(causes.map((c) => KIND_WORD[c.kind]))];
    return { cls: "edge-touched", sentence: `The edge for ${id} was already changed by an earlier ${words.length > 1 ? words.slice(0, -1).join(", ") + " or " + words.at(-1) : words[0]}, so ${id} is shown without it -- ${st} the edge before that step, or name an edge it left alone.` };
  }
  return { cls: "edge-touched", sentence: `The edge for ${id} was already changed by an earlier step, so ${id} is shown without it -- ${st} the edge before that step, or name an edge it left alone.` };
}
var idOf = (raw) => (raw.match(/^([a-z]+\d+)\s*\(/i) ?? [])[1] ?? "this step";
var stripPrefix = (raw) => raw.replace(/^[a-z]+\d+\s*\([a-z]+\):\s*/i, "");
function plainSentence(rawIn, ctx = {}) {
  const raw = String(rawIn).replace(/^SCRIPT ERROR \(line \d+\):\s*/, "").trim();
  const id = idOf(raw);
  const st = style(id);
  const dm = raw.match(/^[a-z]+\d+\s*\([a-z]+\):\s*its target ([a-z]+\d+) was refused/i);
  if (dm)
    return { cls: "dependent", sentence: `${id} builds on ${dm[1]}, which could not be built, so ${id} is shown without it too -- fix ${dm[1]} first.` };
  const body = stripPrefix(raw);
  const kernelLimit = /solid\.(fillet|chamfer): not supported yet: the blend is (larger than the neighbouring faces|taller than the walls|larger than a corner radius)/.exec(raw);
  if (kernelLimit) {
    const why = kernelLimit[2];
    const what = ctx.shape ? `the ${ctx.shape}` : why === "larger than a corner radius" ? "the rim" : why === "taller than the walls" ? "the walls" : "the faces next to the edge";
    return { cls: "too-big", sentence: `The ${st} ${id} is too big for ${what}, so ${id} is shown without it -- use a smaller size${ctx.limit ? ` (under ${fmt3(ctx.limit)})` : ""}.` };
  }
  if (/solid\.(fillet|chamfer): invalid input: (fillet|chamfer) size must be positive/.test(raw))
    return { cls: "size", sentence: `The ${st} size of ${id} is zero, negative or smaller than 0.01, so ${id} is shown without it -- give it a size of at least 0.01.` };
  if (/no edge near/.test(raw))
    return { cls: "whole-chamfer", sentence: guardSentence({ code: "whole-chamfer" }, id, st) };
  if (/but (that edge is|part of that edge is) no longer present whole on/.test(raw))
    return edgeTouched(id, st, ctx);
  if (/is rotated; this demo resolves primitive faces only on unrotated/.test(raw))
    return { cls: "rotated", sentence: `The part for ${id} was turned, so its edge cannot be found reliably and ${id} is shown without it -- round or bevel the edge before you turn the part.` };
  if (/carries a whole-shape round, which changes its faces and edges/.test(raw))
    return { cls: "rounded-all-over", sentence: `The part for ${id} was already rounded all over, so its edges are not named any more and ${id} is shown without it -- round single edges or the whole shape, not both.` };
  if (/matches no face on/.test(raw))
    return { cls: "no-face", sentence: `A face named in the edge does not exist on this part (a disc pulled from a circle has only a top and a bottom), so ${id} is shown without it -- name two faces that exist, such as top and front on a box.` };
  if (/matches no edge on/.test(raw))
    return { cls: "no-edge", sentence: `Those two faces do not meet in an edge on the part as it is now, so ${id} is shown without it -- name two neighbouring faces, such as top and front.` };
  if (/a name must pick exactly one/.test(raw) || /matches \d+ (separate edges|faces)/.test(raw))
    return { cls: "ambiguous", sentence: `The edge for ${id} matches more than one place on the part, so ${id} is shown without it -- name it with two different faces that meet in a single edge.` };
  const noSuchFace = /a (prism|cylinder) has no [+-]?[a-z]+ face/.exec(raw);
  if (noSuchFace)
    return { cls: "no-such-face", sentence: `The edges of a ${noSuchFace[1]} cannot be picked yet, so ${id} is shown without it -- ${st} an edge of a box, a cylinder or a shape pulled from a sketch instead.` };
  const unsupported = /faces of a (wedge|sphere|cone|torus) are not resolved/.exec(raw);
  if (unsupported)
    return { cls: "unsupported-shape", sentence: `The edges of a ${unsupported[1] === "torus" ? "ring" : unsupported[1]} cannot be picked yet, so ${id} is shown without it -- ${st} an edge of a box, a cylinder or a shape pulled from a sketch instead.` };
  if (/is a circle or a rows-and-rules sketch; a swept name over it/.test(raw))
    return { cls: "circle-pocket", sentence: `The edge of a circular or rule-driven pocket cannot be picked yet, so ${id} is shown without it -- use a pocket drawn with straight sides, or leave the rim sharp.` };
  if (/was already changed in place by/.test(raw))
    return { cls: "combined", sentence: `The shape for ${id} was already combined, moved or mirrored, so its edges are not named any more and ${id} is shown without it -- round or bevel before you combine, move or mirror.` };
  if (/the topology of .* is larger than/.test(raw))
    return { cls: "big-part", sentence: `The part for ${id} has too many faces to find an edge on, so ${id} is shown without it.` };
  if (/shell needs a face to remove/.test(raw))
    return { cls: "other-group", sentence: `The hollow before ${id} has no open side, so ${id} is shown without it -- hollow with an open side such as open:'top'.` };
  if (/solid\.draft/.test(raw))
    return { cls: "other-group", sentence: `The draft after ${id} cannot be built on a rounded part, so ${id} is shown without it -- draft the shape before you round its edges.` };
  if (/^Rounding a cone is not supported yet\./.test(raw))
    return { cls: "whole-other", sentence: "A cone cannot be rounded all over yet -- round one of its edges, or use a box or cylinder." };
  if (/^Rounding does not work on this shape\./.test(raw))
    return { cls: "whole-other", sentence: "Rounding all over only works on a plain box or cylinder -- this shape is a prism, a wedge or already has a rounded or bevelled edge, so round its edges one at a time." };
  const fromSketch = /^Rounding works on a shape you build with a tool like Box or Cylinder, not one (pulled|spun) from a sketch/.exec(raw);
  if (fromSketch)
    return { cls: "whole-other", sentence: `A shape ${fromSketch[1]} from a sketch cannot be rounded all over -- round its sketch corners before you ${fromSketch[1] === "pulled" ? "pull" : "spin"} it, or round one edge.` };
  if (/^Rounding works on a shape, not a combination/.test(raw))
    return { cls: "whole-other", sentence: "A combined shape cannot be rounded all over -- round each shape before you join or cut it." };
  if (/^Rounding works on the shape, not the hole cut into it/.test(raw))
    return { cls: "whole-other", sentence: "A shape with a hole cannot be rounded all over -- round the shape before you drill the hole." };
  if (/^Rounding works on a shape, not a hollowed-out one/.test(raw))
    return { cls: "whole-other", sentence: "A hollowed shape cannot be rounded all over -- round its edges one at a time." };
  if (/^Rounding the whole shape works on the original, not a moved copy/.test(raw))
    return { cls: "whole-other", sentence: "A moved copy cannot be rounded all over -- round the shape before you move it, or round one edge." };
  if (/^Rounding works on the original shape, not a repeated copy/.test(raw))
    return { cls: "whole-other", sentence: "A repeated copy cannot be rounded all over -- round the shape before you repeat it." };
  if (/^That shape has no edges to round/.test(raw))
    return { cls: "whole-other", sentence: "A sphere has no edges to round -- use a box, cylinder or other shape with edges." };
  if (/^(round|bevel)\(\) on a list needs a list of edges/.test(raw))
    return { cls: "arg", sentence: "A list given to round() or bevel() has to be a list of edges that is not empty -- for example part.rim(sketch)." };
  if (/needs three numbers, like \[x, y, z\]/.test(raw))
    return { cls: "arg", sentence: "That needs three numbers in brackets, like [10, 0, 5] -- check the commas and the number of values." };
  if (/^turn\(\) needs a solid shape/.test(raw) || /^turn\(\) needs a shape/.test(raw))
    return { cls: "arg", sentence: "turn() needs a solid shape and three angles, like turn(shape, [0, 0, 90]) -- a flat sketch has to be pulled into a shape first." };
  if (/^Rounding works on the original shape, not a mirrored copy/.test(raw))
    return { cls: "whole-other", sentence: "A mirrored copy cannot be rounded all over -- round the shape before you mirror it." };
  if (/^Rounding the whole shape works on the original, not a copy made by Move/.test(raw))
    return { cls: "whole-other", sentence: "A copy made by move() cannot be rounded all over -- round the original before you copy it, or round one edge." };
  if (/^A circle has no corners to round/.test(raw))
    return { cls: "whole-other", sentence: "A circle has no corners to round -- it is already round all the way, so use a shape with edges." };
  if (/^Rounding works on a solid shape, not a flat sketch/.test(raw))
    return { cls: "whole-other", sentence: "A flat sketch cannot be rounded as a shape -- round its corners in the sketch rules, or pull it into a shape first." };
  if (/^(round|bevel)(\(\))? needs a number for size/.test(raw) || /^(round|bevel)'s size has to be a number/.test(raw))
    return { cls: "arg", sentence: "The size has to be a number such as 2 -- text cannot be a size." };
  if (/^round\(\) needs a shape or an edge/.test(raw))
    return { cls: "arg", sentence: "round() needs a shape or an edge such as shape.edge(a, b) -- a sketch cannot be rounded." };
  if (/^\.edge\(\) needs two DIFFERENT faces/.test(raw))
    return { cls: "arg", sentence: "An edge needs two different faces to name it -- try shape.edge('top', 'front')." };
  if (/^\.(edge|face)\(\): "side" is the curved wall of a cylinder/.test(raw))
    return { cls: "arg", sentence: '"side" only names the curved wall of a cylinder made with cylinder() -- on a box use two of top, bottom, front, back, left and right, and for a disc pulled from a circle use cylinder() instead.' };
  if (/^\.edge\(\) does not know the face/.test(raw))
    return { cls: "arg", sentence: "That is not a face name -- use top, bottom, front, back, left or right." };
  if (/^round\(\) takes a shape or edge and a size/.test(raw))
    return { cls: "arg", sentence: "round() takes a shape or an edge and one size, so the extra number was ignored -- pick the edge with shape.edge(faceA, faceB)." };
  if (/^bevel\(\) needs one edge: a whole shape is not supported yet/.test(raw))
    return { cls: "arg", sentence: raw };
  if (/^bevel\(\) needs one edge -- try/.test(raw) || /^round\(\) on a single reference needs an edge/.test(raw))
    return { cls: "arg", sentence: "round() and bevel() need an edge such as shape.edge(a, b) -- a face or a number cannot be used." };
  if (/^bevel\(\) on a list needs a list of edges/.test(raw))
    return { cls: "arg", sentence: "A list given to bevel() has to be a list of edges -- for example part.rim(sketch)." };
  if (/^\.wall\(\) names a face a pocket cut, and no pocket/.test(raw))
    return { cls: "arg", sentence: "That wall belongs to a pocket that was never cut from this sketch -- cut the pocket first." };
  if (/^\.wall\(\) needs a side number/.test(raw))
    return { cls: "arg", sentence: "That wall number does not exist -- use a number from 1 to the number of sides of the sketch." };
  if (/^\.rim\(\) finds the opening of a pocket cut down from a top-plane sketch/.test(raw))
    return { cls: "arg", sentence: "rim() only works on a pocket cut down from a top-plane sketch -- name its edges one at a time with edge(face, part.wall(sketch, n))." };
  if (/^mirror\(\) needs/.test(raw))
    return { cls: "other-group", sentence: "mirror() needs 'left-right', 'front-back' or 'top-bottom' -- an object cannot be used." };
  if (/^\.(edge|face)\(\) needs a face word/.test(raw))
    return { cls: "arg", sentence: "A face is named with a word in quotes -- use top, bottom, front, back, left or right, like shape.edge('top', 'front')." };
  if (/^\.edge\(\) takes a face word/.test(raw))
    return { cls: "arg", sentence: "An edge is named with face words or pocket walls only -- use shape.edge('top', 'front') or shape.edge('top', part.wall(sketch, 1))." };
  if (/^\.wall\(\) needs the sketch the pocket was cut from/.test(raw))
    return { cls: "arg", sentence: "wall() needs the sketch the pocket was cut from -- for example part.wall(sketch2, 1)." };
  if (/^\.rim\(\) needs the sketch the pocket was cut from/.test(raw))
    return { cls: "arg", sentence: "rim() needs the sketch the pocket was cut from -- for example part.rim(sketch2)." };
  if (!/\n/.test(raw) && lintSentence(raw).length === 0)
    return { cls: "verbatim", sentence: raw };
  return { cls: "UNMAPPED", sentence: null };
}
function lintSentence(s) {
  const problems = [];
  if (typeof s !== "string" || !s)
    return ["empty"];
  const ends = s.match(/[.!?](?=\s+[A-Z(])/g) ?? [];
  if (ends.length)
    problems.push("second sentence");
  if (!/[.?]$/.test(s))
    problems.push("no full stop");
  if (/solid\.|solidcraft|resolves to|F\d+:|\bb_|bridge|topology|persistent|nothing is picked|kernel|wasm|ModelDoc|command|fillet\)|\(fillet|chamfer:|not supported yet: the blend|invalid input|; not guessing|this demo|in the browser/i.test(s))
    problems.push("engine or command-list wording");
  if (s.length > 260)
    problems.push("too long");
  return problems;
}

// ../../layer/dist/fillet-chain.js
var FV3 = (f) => f;
var chainsOn = (st, ctx) => !st.fc && !ctx.skipFilletChain;
function runAt(features, idx) {
  const f = features[idx];
  const fv = FV3(f);
  if (!f || f.kind !== "fillet" || !fv.edge || typeof fv.edge !== "object")
    return f ? [f] : [];
  const run = [f];
  for (let j = idx + 1; j < features.length; j++) {
    const g = features[j];
    const gv = FV3(g);
    if (g.kind !== "fillet" || gv.style !== fv.style || gv.size !== fv.size || gv.target !== FV3(run[run.length - 1]).id || !gv.edge || typeof gv.edge !== "object")
      break;
    run.push(g);
  }
  return run;
}
function components(edges, tol) {
  const parent = edges.map((_, i) => i);
  const find = (i) => parent[i] === i ? i : parent[i] = find(parent[i]);
  const near3 = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) <= tol;
  for (let a = 0; a < edges.length; a++)
    for (let b = a + 1; b < edges.length; b++)
      if (edges[a].ends.some((p) => edges[b].ends.some((q) => near3(p, q))))
        parent[find(a)] = find(b);
  const comps = /* @__PURE__ */ new Map();
  edges.forEach((_, i) => {
    const r = find(i);
    if (!comps.has(r))
      comps.set(r, []);
    comps.get(r).push(i);
  });
  return [...comps.values()];
}
async function groupRun(f, features, idx, st, resolve, scale2) {
  st.chain ??= {};
  if (st.chain[f.id])
    return;
  const run = runAt(features, idx);
  const solo = (m) => {
    st.chain[m.id] = { lead: m.id, ids: [m.id] };
  };
  if (run.length < 2) {
    solo(f);
    return;
  }
  const edges = [];
  for (const m of run) {
    const e = await resolve(m);
    if (!e) {
      run.forEach(solo);
      return;
    }
    edges.push(e);
  }
  const tol = 1e-6 * 10 * Math.max(1, scale2, ...edges.flatMap((e) => e.ends.flatMap((p) => p.map(Math.abs))));
  for (let a = 0; a < edges.length; a++)
    for (let b = a + 1; b < edges.length; b++) {
      const same2 = Math.hypot(...[0, 1, 2].map((k) => edges[a].point[k] - edges[b].point[k])) <= tol;
      if (same2) {
        run.forEach(solo);
        return;
      }
    }
  for (const comp of components(edges, tol)) {
    const ids = comp.map((i) => run[i].id);
    const info = { lead: ids[0], ids };
    for (const id of ids)
      st.chain[id] = id === ids[0] ? { ...info, points: comp.map((i) => edges[i].point) } : info;
  }
}
var isStraight = (start, mid, end) => {
  const sc = Math.max(1, ...[...start, ...end].map(Math.abs));
  return Math.hypot(...[0, 1, 2].map((k) => mid[k] - (start[k] + end[k]) / 2)) <= 1e-7 * sc && Math.hypot(...[0, 1, 2].map((k) => end[k] - start[k])) > 1e-9 * sc;
};
function beforeOf(st, id) {
  if (!id)
    return void 0;
  let h = id;
  const seen = /* @__PURE__ */ new Set();
  while (st.head[h] && !seen.has(h)) {
    seen.add(h);
    h = st.head[h];
  }
  return st.measure[h] ?? st.measure[id];
}
var blendOf = (plan) => plan?.blend;
var wordOf = (id) => /^bevel|^chamfer/.test(id) ? "bevel" : "round";
var BLEND_FACE_GUARD = "FC-FACE-COUNT";
function blendRefusal(f, blend, before, m, ctx) {
  if (f.kind !== "fillet" || !blend || ctx.skipFilletChain)
    return null;
  if (blend.edges !== 1 || !blend.straightPlanar || !before)
    return null;
  if (m.faces === before.faces + 1)
    return null;
  return { sentence: guardSentence({ code: "face-count", args: { facesBefore: before.faces, facesAfter: m.faces } }, f.id, wordOf(f.id)), guard: BLEND_FACE_GUARD };
}

// ../../layer/dist/translate.js
var FEATURE_KINDS = [
  "box",
  "cylinder",
  "sphere",
  "cone",
  "torus",
  "prism",
  "wedge",
  "sketch",
  "datum",
  "extrude",
  "combine",
  "blend",
  "revolve",
  "groove",
  "pocket",
  "mirror",
  "pattern",
  "hole",
  "shell",
  "move",
  "rotate",
  "fillet",
  "draft"
];
var AX2 = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };
var AXN = { x: "X", y: "Y", z: "Z" };
var len3 = (a) => Math.hypot(...a);
var isZero3 = (v) => !v || v[0] === 0 && v[1] === 0 && v[2] === 0;
var bname = (id) => `b_${id}`;
var NAMED2 = {
  xy: { u: [1, 0, 0], v: [0, 1, 0], n: [0, 0, 1] },
  xz: { u: [1, 0, 0], v: [0, 0, 1], n: [0, 1, 0] },
  yz: { u: [0, 1, 0], v: [0, 0, 1], n: [1, 0, 0] }
};
function frameOf2(s, mt) {
  if (mt && mt.sketchFrameOf)
    return mt.sketchFrameOf(s);
  if (s.frame) {
    const { origin, u, v } = s.frame;
    return { origin, u, v, n: [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]] };
  }
  const a = NAMED2[s.plane ?? "xy"] ?? NAMED2.xy;
  const o = s.offset ?? 0;
  return { origin: a.n.map((c) => c * o), ...a };
}
var VERBATIM_GUARDS = /* @__PURE__ */ new Set([OPEN_OUTLINE_GUARD, MT_CUT_GUARD, MT_CONE_GUARD, PRIMITIVES_GUARD]);
var isVerbatimGuard = (g) => !!g && VERBATIM_GUARDS.has(g);
var refuse = (sentence) => ({ refusal: sentence });
var membersOf = (p) => p.members ?? [p];
var ownerOf = (p, kind) => p.owner ? p.owner(kind) : p;
function composeProfiles(list) {
  if (!list.length)
    throw new Error("composeProfiles needs at least one planner set");
  if (list.length === 1)
    return list[0];
  const first = list[0];
  const owners = /* @__PURE__ */ new Map();
  for (const p of list)
    for (const k of Object.keys(p.planners))
      owners.set(k, p);
  const owner = (kind) => owners.get(kind) ?? first;
  return {
    name: list.map((p) => p.name).join("+"),
    planners: Object.assign({}, ...list.map((p) => p.planners)),
    verifies: first.verifies,
    initState: (st, doc) => {
      for (const p of list)
        p.initState(st, doc);
    },
    depSentence: (f, role, id, st) => owner(f.kind).depSentence(f, role, id, st),
    noOutline: (sk, o) => first.noOutline(sk, o),
    plannerError: (f, e) => owner(f.kind).plannerError(f, e),
    kernelRefusal: (f, raw) => owner(f.kind).kernelRefusal(f, raw),
    onAccepted: (st, res, m, plan, acc) => {
      for (const p of list)
        p.onAccepted?.(st, res, m, plan, acc);
    },
    result: (st) => Object.assign({}, ...list.map((p) => p.result?.(st) ?? {})),
    members: list,
    owner
  };
}
var BASE_PROFILE = {
  name: "base",
  planners: {},
  verifies: false,
  initState: () => {
  },
  depSentence(f, role, id, st) {
    if (st.refused[id])
      return `${f.id} (${f.kind}): its ${role} ${id} was refused (${st.refused[id]})`;
    if (st.stale[id])
      return `${f.id} (${f.kind}): its ${role} ${id} was already changed in place by ${st.stale[id]}, and a solidcraft command list has no second copy of it`;
    return null;
  },
  noOutline: (sk, o) => `sketch ${sk.id} has no usable outline (${(o.notes ?? []).join("; ") || "outlineOf refused it"})`,
  plannerError: (f, e) => ({ refusal: `${f.id} (${f.kind}): translator error: ${e.message}`, internal: null }),
  kernelRefusal: (f, raw) => `${f.id} (${f.kind}): solidcraft refused it -- ${raw}`
};
var isSoup = (sk) => sk.shape !== "circle" && Array.isArray(sk.geoms) && sk.geoms.length > 0;
function profileCmds(sk, ctx, profile) {
  if (isSoup(sk))
    return refuse(`sketch ${sk.id} is drawn as rows and rules (a soup); it is mapped by inSketch, not here`);
  const o = ctx.arc.outlineOf(sk);
  if (!o.ok)
    return refuse(profile.noOutline(sk, o));
  if (sk.shape === "circle") {
    const [a, b] = o.points;
    const c = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    return { cmds: [{ command: "sketch.circle.center", params: { center: c, diameter: Math.hypot(b[0] - a[0], b[1] - a[1]) } }] };
  }
  const pts = o.points;
  const bulges = o.bulges ?? {};
  if (!Object.values(bulges).some((g) => g)) {
    return { cmds: [{ command: "sketch.line", params: { points: pts.map((p) => [p[0], p[1]]), closed: true } }] };
  }
  const cmds = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    const g = bulges[i];
    if (!g) {
      cmds.push({ command: "sketch.line", params: { points: [a, b] } });
      continue;
    }
    const { center, radius, startAngle, endAngle } = ctx.arc.arcFromBulge(a, b, g);
    let sweep = endAngle - startAngle;
    if (g > 0 && sweep < 0)
      sweep += Math.PI * 2;
    if (g < 0 && sweep > 0)
      sweep -= Math.PI * 2;
    const mid = startAngle + sweep / 2;
    cmds.push({ command: "sketch.arc.three_point", params: { start: a, end: b, through: [center[0] + radius * Math.cos(mid), center[1] + radius * Math.sin(mid)] } });
  }
  return { cmds };
}
var isSoupTarget = (st, id) => {
  const sk = st.sketches[id];
  return !!sk && isSoup(sk);
};
function inSketch(sk, ctx, st, { revolve = false, allowSoup = true } = {}, profile = BASE_PROFILE) {
  if (isSoup(sk)) {
    if (revolve || !allowSoup)
      return refuse(`sketch ${sk.id} is a constrained sketch (rows and rules); this demo maps those for extrude and pocket only, not for revolve, groove or blend`);
    const name2 = `sk_${sk.id}_${st.counter++}`;
    const m = mapSketch(sk, { name: name2 });
    if (!m.ok)
      return refuse(`sketch ${sk.id} cannot be handed to solidcraft's solver: ${m.refusals.map((r) => `rule ${r.rule + 1}${r.kind ? ` (${r.kind})` : ""}: ${r.sentence}`).join("; ")}`);
    if (ctx.soups)
      ctx.soups[name2] = { sketchId: sk.id, geoms: sk.geoms, rules: sk.rules ?? [], names: m.names, notes: m.notes ?? [], ruleMap: m.ruleMap };
    return { name: name2, soup: true, cmds: [...m.commands, { command: "sketch.finish", params: {} }] };
  }
  const fr = frameOf2(sk, ctx.mt);
  const prof = profileCmds(sk, ctx, profile);
  if ("refusal" in prof)
    return prof;
  const name = `sk_${sk.id}_${st.counter++}`;
  return {
    name,
    cmds: [
      { command: "sketch.create", params: { name, plane: { origin: fr.origin, x_dir: fr.u, y_dir: revolve ? fr.n : fr.v } } },
      ...prof.cmds,
      { command: "sketch.finish", params: {} }
    ]
  };
}
var rotCmds = (name, rotate) => {
  const out = [];
  if (isZero3(rotate))
    return out;
  ["x", "y", "z"].forEach((a, i) => {
    if (rotate[i])
      out.push({ command: "solid.move", params: { bodies: [name], axis: AX2[a], angle: rotate[i] } });
  });
  return out;
};
var moveCmd = (name, t) => ({ command: "solid.move", params: { bodies: [name], translate: t } });
function roundPoints(f, base) {
  if (f.kind === "box") {
    const [w, d, h] = f.size.map((v) => v / 2);
    const c = base;
    const p = [];
    for (const sy of [-1, 1])
      for (const sz of [-1, 1])
        p.push([c[0], c[1] + sy * d, c[2] + sz * h]);
    for (const sx of [-1, 1])
      for (const sz of [-1, 1])
        p.push([c[0] + sx * w, c[1], c[2] + sz * h]);
    for (const sx of [-1, 1])
      for (const sy of [-1, 1])
        p.push([c[0] + sx * w, c[1] + sy * d, c[2]]);
    return p;
  }
  return [[base[0] + f.radius, base[1], base[2] + f.height / 2], [base[0] + f.radius, base[1], base[2] - f.height / 2]];
}
function straightPlanar(r) {
  if (!r.ok || r.kind !== "edge")
    return false;
  const own = r.straightPlanar;
  if (typeof own === "boolean")
    return own;
  const checks = r.evidence.checks;
  return Array.isArray(r.edges) && r.edges.length === 1 && isStraight(r.edges[0].start, r.edges[0].mid, r.edges[0].end) && checks?.[0]?.check === "geometry vs persistent names";
}
function planFeature(f, st, ctx, profileIn = BASE_PROFILE) {
  const plan = planFeatureOf(f, st, ctx, profileIn);
  if ((f.kind === "move" || f.kind === "rotate") && !("refusal" in plan) && !("noop" in plan)) {
    const cc = coneChainRefusal(f, st, ctx);
    if (cc)
      return { refusal: cc, guard: MT_CONE_GUARD };
  }
  return plan;
}
function planFeatureOf(f, st, ctx, profileIn) {
  const profile = ownerOf(profileIn, f.kind);
  const name = bname(f.id);
  const needBody = (id) => {
    const bs = st.bodies[headOf3(id)];
    return bs && bs.length ? bs : null;
  };
  const headOf3 = (id) => {
    let h = id;
    const seen = /* @__PURE__ */ new Set();
    while (st.head[h] && !seen.has(h)) {
      seen.add(h);
      h = st.head[h];
    }
    return h;
  };
  const dep = (id, role = "target") => {
    id = headOf3(id);
    return profile.depSentence(f, role, id, st);
  };
  {
    const pv = primitiveRefusal(f, st, ctx);
    if (pv)
      return { refusal: pv.sentence, guard: PRIMITIVES_GUARD };
  }
  if ((f.kind === "extrude" || f.kind === "pocket") && !ctx.skipOpenOutline && isSoupTarget(st, f.target) && !dep(f.target, "sketch") && !(f.kind === "pocket" && dep(f.into, "solid"))) {
    const oo = openOutlineRefusal(f, st.sketches[f.target]);
    if (oo)
      return { refusal: oo, guard: OPEN_OUTLINE_GUARD };
  }
  if ((f.kind === "move" || f.kind === "rotate") && !dep(f.target)) {
    const ch = cutHeadRefusal(f, st, ctx, headOf3);
    if (ch)
      return { refusal: ch, guard: MT_CUT_GUARD };
  }
  const planner = profile.planners[f.kind];
  if (planner)
    return planner(f, st, ctx, { name, needBody, headOf: headOf3, dep, inSketch: (sk, opts) => inSketch(sk, ctx, st, opts, profile) });
  switch (f.kind) {
    case "box":
    case "cylinder":
    case "sphere":
    case "torus":
    case "cone":
    case "prism":
    case "wedge": {
      const p = f;
      const rot = !isZero3(p.rotate);
      const c = p.center ?? [0, 0, 0];
      const at2 = rot ? [0, 0, 0] : c;
      const cmds = [];
      if (p.kind === "box") {
        cmds.push({ command: "solid.box", params: { length: p.size[0], width: p.size[1], height: p.size[2], center: at2, body_name: name } });
      } else if (p.kind === "cylinder") {
        cmds.push({ command: "solid.cylinder", params: { radius: p.radius, height: p.height, base: [at2[0], at2[1], at2[2] - p.height / 2], axis: "Z", body_name: name } });
      } else if (p.kind === "sphere") {
        cmds.push({ command: "solid.sphere", params: { radius: p.radius, center: at2, body_name: name } });
      } else if (p.kind === "torus") {
        cmds.push({ command: "solid.torus", params: { major: p.ringRadius, minor: p.tubeRadius, center: at2, body_name: name } });
      } else if (p.kind === "cone") {
        const nm = `sk_${p.id}_${st.counter++}`;
        cmds.push({ command: "sketch.create", params: { name: nm, plane: { origin: [at2[0], at2[1], at2[2] - p.height / 2], x_dir: [1, 0, 0], y_dir: [0, 0, 1] } } }, { command: "sketch.line", params: { points: [[0, 0], [p.radius, 0], [0, p.height]], closed: true } }, { command: "sketch.finish", params: {} }, { command: "solid.revolve", params: { axis: "y", sketch: nm, operation: "new", body_name: name } });
      } else {
        const poly = p.kind === "prism" ? (() => {
          const n = Math.max(3, Math.min(12, Math.round(p.sides)));
          return Array.from({ length: n }, (_, i) => [p.radius * Math.cos(2 * Math.PI * i / n), p.radius * Math.sin(2 * Math.PI * i / n)]);
        })() : [[-p.width / 2, -p.depth / 2], [p.width / 2, -p.depth / 2], [-p.width / 2, p.depth / 2]];
        const nm = `sk_${p.id}_${st.counter++}`;
        cmds.push({ command: "sketch.create", params: { name: nm, plane: { origin: [at2[0], at2[1], at2[2] - p.height / 2], x_dir: [1, 0, 0], y_dir: [0, 1, 0] } } }, { command: "sketch.line", params: { points: poly, closed: true } }, { command: "sketch.finish", params: {} }, { command: "solid.extrude", params: { distance: p.height, sketch: nm, operation: "new", body_name: name } });
      }
      if (p.round) {
        if (p.kind !== "box" && p.kind !== "cylinder")
          return refuse(`${p.id} (${p.kind}): a whole-shape round is only mapped for box and cylinder`);
        const pts = roundPoints(p, at2);
        cmds.push(p.roundStyle === "chamfer" ? { command: "solid.chamfer", params: { edges: pts, distance: p.round, body: name } } : { command: "solid.fillet", params: { edges: pts, radius: p.round, body: name } });
      }
      if (rot) {
        cmds.push(...rotCmds(name, p.rotate));
        if (!isZero3(c))
          cmds.push(moveCmd(name, c));
      }
      return { variants: [cmds], produces: [name], consumes: [] };
    }
    case "datum":
      return { noop: true };
    case "sketch":
      return { noop: true, stage: true };
    case "extrude": {
      const d = dep(f.target, "sketch");
      if (d)
        return refuse(d);
      for (const k of ["midplane", "length2", "reversed", "taper", "direction", "alongNormal"]) {
        if (f[k])
          return refuse(`${f.id} (extrude): the ${k} option is not mapped in phase 0 (only a plain one-sided extrude along the sketch normal is)`);
      }
      const sk = st.sketches[f.target];
      if (!sk)
        return refuse(`${f.id} (extrude): ${f.target} is not a sketch`);
      const s = inSketch(sk, ctx, st, void 0, profile);
      if ("refusal" in s)
        return refuse(`${f.id} (extrude): ${s.refusal}`);
      return { variants: [[...s.cmds, { command: "solid.extrude", params: { distance: f.height, sketch: s.name, operation: "new", body_name: name } }]], produces: [name], consumes: [] };
    }
    case "revolve":
    case "groove": {
      const d = dep(f.target, "sketch") || (f.kind === "groove" ? dep(f.into, "solid") : null);
      if (d)
        return refuse(d);
      const sk = st.sketches[f.target];
      if (!sk)
        return refuse(`${f.id} (${f.kind}): ${f.target} is not a sketch`);
      const s = inSketch(sk, ctx, st, { revolve: true }, profile);
      if ("refusal" in s)
        return refuse(`${f.id} (${f.kind}): ${s.refusal}`);
      const params = { axis: "y", sketch: s.name };
      if (f.angle !== 360)
        params.angle = -f.angle;
      if (f.kind === "revolve")
        return { variants: [[...s.cmds, { command: "solid.revolve", params: { ...params, operation: "new", body_name: name } }]], produces: [name], consumes: [] };
      const bs = needBody(f.into);
      if (!bs || bs.length !== 1)
        return refuse(`${f.id} (groove): ${f.into} is not a single body`);
      return { variants: [[...s.cmds, { command: "solid.revolve", params: { ...params, operation: "cut", targets: bs } }]], produces: bs, consumes: [f.into] };
    }
    case "pocket": {
      const d = dep(f.target, "sketch") || dep(f.into, "solid");
      if (d)
        return refuse(d);
      const sk = st.sketches[f.target];
      const bs = needBody(f.into);
      if (!sk || !bs || bs.length !== 1)
        return refuse(`${f.id} (pocket): needs a sketch and a single body`);
      const s = inSketch(sk, ctx, st, void 0, profile);
      if ("refusal" in s)
        return refuse(`${f.id} (pocket): ${s.refusal}`);
      return { variants: [[...s.cmds, { command: "solid.extrude", params: { distance: f.depth, direction: "negative", sketch: s.name, operation: "cut", targets: bs } }]], produces: bs, consumes: [f.into] };
    }
    case "blend": {
      const ds = f.targets.map((t) => dep(t, "sketch")).find(Boolean);
      if (ds)
        return refuse(ds);
      if (f.targets.length < 2)
        return refuse(`${f.id} (blend): needs two or more sketches`);
      const cmds = [];
      const names = [];
      for (const t of f.targets) {
        const sk = st.sketches[t];
        if (!sk)
          return refuse(`${f.id} (blend): ${t} is not a sketch`);
        const s = inSketch(sk, ctx, st, { allowSoup: false }, profile);
        if ("refusal" in s)
          return refuse(`${f.id} (blend): ${s.refusal}`);
        cmds.push(...s.cmds);
        names.push(s.name);
      }
      cmds.push({ command: "solid.loft", params: { sections: names.map((n) => ({ sketch: n })), operation: "new", body_name: name } });
      return { variants: [cmds], produces: [name], consumes: [] };
    }
    case "combine": {
      const ds = f.targets.map((t) => dep(t)).find(Boolean);
      if (ds)
        return refuse(ds);
      if (f.targets.length < 2)
        return refuse(`${f.id} (combine): needs two or more targets`);
      const all = f.targets.map((t) => needBody(t));
      if (all.some((b) => !b || b.length !== 1))
        return refuse(`${f.id} (combine): every target must be a single body`);
      const op = f.op === "union" ? "join" : f.op === "subtract" ? "cut" : "intersect";
      const names = all.map((b) => b[0]);
      return {
        variants: [[{ command: "solid.combine", params: { target: names[0], tools: names.slice(1), operation: op } }]],
        produces: [names[0]],
        consumes: f.targets
      };
    }
    case "move": {
      const d = dep(f.target);
      if (d)
        return refuse(d);
      if (f.copy)
        return refuse(`${f.id} (move): a copying move is not mapped (solidcraft names the copy itself, and phase 0 does not track it)`);
      const bs = needBody(f.target);
      return { variants: [[{ command: "solid.move", params: { bodies: bs, translate: f.offset } }]], produces: bs, consumes: [f.target] };
    }
    case "rotate": {
      const d = dep(f.target);
      if (d)
        return refuse(d);
      const bs = needBody(f.target);
      const m = st.measure[f.target];
      if (!m)
        return refuse(`${f.id} (rotate): no measured bounding box for ${f.target}`);
      const c = [0, 1, 2].map((i) => (m.bbox[i] + m.bbox[i + 3]) / 2);
      const cmds = [];
      if (!isZero3(c))
        cmds.push({ command: "solid.move", params: { bodies: bs, translate: c.map((v) => -v) } });
      ["x", "y", "z"].forEach((a, i) => {
        if (f.angles[i])
          cmds.push({ command: "solid.move", params: { bodies: bs, axis: AX2[a], angle: f.angles[i] } });
      });
      if (!isZero3(c))
        cmds.push({ command: "solid.move", params: { bodies: bs, translate: c } });
      return { variants: [cmds], produces: bs, consumes: [f.target] };
    }
    case "mirror": {
      const d = dep(f.target);
      if (d)
        return refuse(d);
      const bs = needBody(f.target);
      const m = st.measure[f.target];
      if (!m)
        return refuse(`${f.id} (mirror): no measured bounding box for ${f.target}`);
      const axis = f.plane === "yz" ? 0 : f.plane === "xz" ? 1 : 2;
      const lo = m.bbox[axis];
      const hi = m.bbox[axis + 3];
      const at2 = Math.abs(lo) <= Math.abs(hi) ? lo : hi;
      const origin = [0, 0, 0];
      origin[axis] = at2;
      const normal = [0, 0, 0];
      normal[axis] = 1;
      return { variants: [[{ command: "solid.mirror", params: { bodies: bs, plane: { origin, normal }, combine: true } }]], produces: bs, consumes: [f.target] };
    }
    case "pattern": {
      const d = dep(f.target);
      if (d)
        return refuse(d);
      const bs = needBody(f.target);
      if (!bs || bs.length !== 1)
        return refuse(`${f.id} (pattern): needs a single target body`);
      if (f.count < 2)
        return refuse(`${f.id} (pattern): a count under 2 is the original alone; not mapped`);
      const copies = [bs[0], ...Array.from({ length: f.count - 1 }, (_, i) => `${bs[0]} (${i + 2})`)];
      let pat;
      if (f.mode === "circular") {
        if ((f.totalAngle ?? 360) !== 360)
          return refuse(`${f.id} (pattern): a circular pattern over less than 360 degrees is not mapped (solidcraft's angle semantics were not verified)`);
        pat = { command: "solid.pattern.circular", params: { bodies: bs, axis: AXN[f.axis ?? "z"], count: f.count } };
      } else {
        const s = f.step ?? [0, 0, 0];
        if (isZero3(s))
          return refuse(`${f.id} (pattern): a zero step puts every copy on the original`);
        const L = len3(s);
        pat = { command: "solid.pattern.rectangular", params: { bodies: bs, dir1: s.map((v) => v / L), count1: f.count, spacing1: L } };
      }
      const join = { command: "solid.combine", params: { target: copies[0], tools: copies.slice(1), operation: "join" } };
      return { variants: [[pat, join], [pat]], produces: copies, consumes: [f.target] };
    }
    case "hole": {
      const d = dep(f.target);
      if (d)
        return refuse(d);
      if (f.counterbore || f.countersink)
        return refuse(`${f.id} (hole): counterbore and countersink are not mapped in phase 0`);
      const bs = needBody(f.target);
      const m = st.measure[f.target];
      if (!bs || bs.length !== 1 || !m)
        return refuse(`${f.id} (hole): needs a single measured target body`);
      const bc = [0, 1, 2].map((i) => (m.bbox[i] + m.bbox[i + 3]) / 2);
      const cx = bc[0] + f.center[0];
      const cy = bc[1] + f.center[1];
      const cz = bc[2] + f.center[2];
      const centers = f.corners ? [[cx - f.corners.dx, cy - f.corners.dy, cz], [cx + f.corners.dx, cy - f.corners.dy, cz], [cx - f.corners.dx, cy + f.corners.dy, cz], [cx + f.corners.dx, cy + f.corners.dy, cz]] : [[cx, cy, cz]];
      const dir = AX2[f.axis ?? "z"];
      const cmds = centers.map((c) => ({
        command: "solid.cylinder",
        params: { radius: f.diameter / 2, height: f.depth, base: c.map((v, i) => v - dir[i] * f.depth / 2), axis: AXN[f.axis ?? "z"], operation: "cut", targets: bs }
      }));
      return { variants: [cmds], produces: bs, consumes: [f.target] };
    }
    case "shell": {
      const d = dep(f.target);
      if (d)
        return refuse(d);
      const bs = needBody(f.target);
      if (!bs || bs.length !== 1)
        return refuse(`${f.id} (shell): needs a single target body`);
      if (!f.open)
        return refuse(`${f.id} (shell): this spike's shell needs a face to remove; a closed hollow box is not mapped`);
      const r = ctx.resolve(f.open);
      if (r && r.ok === false)
        return refuse(`${f.id} (shell): ${r.sentence}`);
      if (!r || r.kind !== "face")
        return refuse(`${f.id} (shell): the opened face could not be resolved to a single face (${r ? `it names ${r.kind}` : "no resolution"})`);
      return { variants: [[{ command: "solid.shell", params: { faces: [r.point], thickness: f.thickness, body: bs[0] } }]], produces: bs, consumes: [f.target], pickedFrom: "solidcraft topology (browser)", evidence: r.evidence };
    }
    case "fillet": {
      const ch = st.chain?.[f.id];
      if (ch && ch.lead !== f.id && st.accLen[ch.lead] !== void 0 && st.bodies[ch.lead]?.length === 1) {
        return { variants: [[]], produces: st.bodies[ch.lead], consumes: [f.target], pickedFrom: `one call with ${ch.lead} (${ch.ids.join(", ")})` };
      }
      const d = dep(f.target);
      if (d)
        return refuse(d);
      const bs = needBody(f.target);
      if (!bs || bs.length !== 1)
        return refuse(`${f.id} (fillet): needs a single target body`);
      const r = ctx.resolve(f.edge);
      if (r && r.ok === false)
        return refuse(`${f.id} (${f.kind}): ${r.sentence}`);
      if (!r || r.kind !== "edge")
        return refuse(`${f.id} (fillet): the edge could not be resolved to a single edge (${r ? `it names ${r.kind}` : "no resolution"})`);
      const pts = ch && ch.lead === f.id && ch.points && ch.ids.length > 1 ? ch.points : [r.point];
      const mk = (p) => f.style === "chamfer" ? { command: "solid.chamfer", params: { edges: p, distance: f.size, body: bs[0] } } : { command: "solid.fillet", params: { edges: p, radius: f.size, body: bs[0] } };
      return { variants: [[mk(pts)]], produces: bs, consumes: [f.target], pickedFrom: "solidcraft topology (browser)", evidence: r.evidence, blend: { edges: pts.length, straightPlanar: straightPlanar(r) } };
    }
    case "draft": {
      const d = dep(f.target);
      if (d)
        return refuse(d);
      if (f.whole || !f.face)
        return refuse(`${f.id} (draft): a whole-body draft is not mapped (needs a face pick per face)`);
      const bs = needBody(f.target);
      if (!bs || bs.length !== 1)
        return refuse(`${f.id} (draft): needs a single target body`);
      const r = ctx.resolve(f.face);
      if (r && r.ok === false)
        return refuse(`${f.id} (draft): ${r.sentence}`);
      if (!r || r.kind !== "face")
        return refuse(`${f.id} (draft): the face could not be resolved to a single face (${r ? `it names ${r.kind}` : "no resolution"})`);
      const ax = AX2[f.pull ?? "z"];
      return {
        variants: [[{ command: "solid.draft", params: { faces: [r.point], angle: f.angle, neutral: { origin: ax.map((v) => v * f.neutral), normal: ax }, pull: ax, body: bs[0] } }]],
        produces: bs,
        consumes: [f.target],
        pickedFrom: "solidcraft topology (browser)",
        evidence: r.evidence
      };
    }
    default: {
      const u = f;
      return refuse(`${u.id}: feature kind '${u.kind}' is not in the ModelDoc vocabulary this translator knows`);
    }
  }
}
var isPiece2 = (bodyName, names) => names.some((n) => bodyName === n || bodyName.startsWith(`${n} (`) && /^ \(\d+\)$/.test(bodyName.slice(n.length)));
function aggregate(res, names, pieces = false) {
  const bs = res.measure.bodies.filter((b) => pieces ? isPiece2(b.name, names) : names.includes(b.name));
  if (!bs.length)
    return null;
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  for (const b of bs)
    for (let i = 0; i < 3; i++) {
      lo[i] = Math.min(lo[i], b.bbox.min[i]);
      hi[i] = Math.max(hi[i], b.bbox.max[i]);
    }
  return {
    volume: bs.reduce((s, b) => s + b.volume_mm3, 0),
    faces: bs.reduce((s, b) => s + b.faces, 0),
    kernelFaces: bs.reduce((s, b) => s + b.kernel.faces, 0),
    ...pieces ? { shells: bs.reduce((s, b) => s + (b.kernel.shells ?? 1), 0) } : {},
    curved: bs.some((b) => Object.keys(b.face_types ?? {}).some((k) => k !== "plane")),
    bbox: [...lo, ...hi],
    faceTypes: bs.reduce((a, b) => {
      for (const [k, v] of Object.entries(b.face_types ?? {}))
        a[k] = (a[k] ?? 0) + v;
      return a;
    }, {}),
    com: [0, 1, 2].map((i) => bs.reduce((a, b) => a + b.volume_mm3 * b.center_of_mass[i], 0) / bs.reduce((a, b) => a + b.volume_mm3, 0)),
    bodies: bs.map((b) => b.name)
  };
}
function moveOrTurnBetween(features, targetId, rootId) {
  const byId = new Map(features.map((f) => [f.id, f]));
  const seen = /* @__PURE__ */ new Set();
  for (let cur = targetId; cur && cur !== rootId && !seen.has(cur); ) {
    seen.add(cur);
    const g = byId.get(cur);
    if (!g)
      return null;
    if (g.kind === "move" || g.kind === "rotate")
      return g;
    cur = g.target ?? g.into ?? g.targets?.[0];
  }
  return null;
}
var edgePair = (n) => {
  const p = n.replace(/~\d+$/, "").split("|");
  return p.length === 2 ? [...p].sort().join("|") : null;
};
async function confirmOnTarget(rr, { st, accepted, ctx, targetId, features }) {
  if (!rr.ok || rr.kind === "faceset")
    return rr;
  const headId2 = (id) => {
    let h = id;
    const seen = /* @__PURE__ */ new Set();
    while (st.head[h] && !seen.has(h)) {
      seen.add(h);
      h = st.head[h];
    }
    return h;
  };
  const tb = st.bodies[headId2(targetId)];
  const nm = rr.evidence.name;
  if (!tb || tb.length !== 1)
    return { ok: false, sentence: `${nm} resolved on ${rr.shape.featureId}, but the target ${targetId} is ${tb ? tb.length : 0} bodies; a pick is made on a single body, so nothing is picked` };
  let cur;
  try {
    cur = await ctx.topologyOf(accepted);
  } catch (e) {
    cur = { ok: false, error: e.message };
  }
  const body = cur.ok && cur.topology ? cur.topology.bodies.find((b) => b.name === tb[0]) : null;
  if (!body || body.error)
    return { ok: false, sentence: `${nm} resolved, but solidcraft returned no topology for the target ${tb[0]}; nothing is picked` };
  let sc = 1;
  for (const e of body.edges)
    for (const q of [e.start, e.mid, e.end])
      for (const v of q)
        sc = Math.max(sc, Math.abs(v));
  for (const x of body.faces)
    for (const v of x.centroid)
      sc = Math.max(sc, Math.abs(v));
  const tol = 1e-6 * sc * 10;
  const dot10 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const dist2 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  if (rr.kind === "edge") {
    const er = rr;
    const per = er.edges.map((e) => body.edges.filter((q) => dist2(q.mid, e.mid) <= tol && Math.abs(q.length - e.length) <= tol));
    const miss = per.filter((m) => m.length === 0).length;
    if (miss)
      return { ok: false, sentence: `${nm} resolves to ${er.evidence.engineEdges.join(", ")} on ${er.shape.featureId}, but ${miss === er.edges.length ? "that edge is" : "part of that edge is"} no longer present whole on ${tb[0]} (an operation after ${er.shape.featureId} changed or removed it); nothing is picked` };
    if (per.some((m) => m.length > 1))
      return { ok: false, sentence: `${nm} matches more than one edge on ${tb[0]} (${per.flat().map((q) => q.name).join(", ")}); nothing is picked` };
    const mt = features ? moveOrTurnBetween(features, targetId, er.shape.featureId) : null;
    if (mt) {
      const other = er.edges.map((e, i) => [e.name, per[i][0].name]).filter(([a, b]) => edgePair(a) !== null && edgePair(b) !== null && edgePair(a) !== edgePair(b));
      if (other.length)
        return { ok: false, sentence: `${nm} resolves to ${er.evidence.engineEdges.join(", ")} on ${er.shape.featureId}, but that edge is no longer present whole on ${tb[0]}: after ${mt.id} (a ${mt.kind}) the edge at its place is ${other.map(([, b]) => b).join(", ")}, another edge of the part; nothing is picked` };
    }
    er.evidence.target = { body: tb[0], candidates: er.edges.length, edges: per.flat().map((q) => q.name), point: er.point };
    return er;
  }
  const fr = rr;
  if (!fr.plane)
    return { ok: false, sentence: `${nm} resolves to a curved face; a pick of a curved face on the target is not resolved in the browser demo` };
  const { n, d } = fr.plane;
  const allowFlip = fr.shape.featureId !== targetId && fr.shape.featureId !== headId2(targetId);
  const on = body.faces.filter((x) => x.plane_normal && Math.abs(dot10(x.centroid, n) - d) <= tol && (dot10(x.plane_normal, n) >= 1 - 1e-6 || allowFlip && dot10(x.plane_normal, n) <= -1 + 1e-6));
  if (on.length === 0)
    return { ok: false, sentence: `${nm} resolves on ${fr.shape.featureId}, but no face of ${tb[0]} lies on that plane any more; nothing is picked` };
  if (on.length > 1)
    return { ok: false, sentence: `${nm} matches ${on.length} faces on ${tb[0]} (${on.map((x) => x.name).join(", ")}; all on the named plane); a name must pick exactly one, so nothing is picked` };
  const p = pickPoint(on[0], Math.max(tol, 1e-4));
  if (!p.ok)
    return { ok: false, sentence: `${nm} resolves to ${on[0].name} on ${tb[0]} but there is no safe pick point: ${p.why}` };
  fr.point = p.point;
  fr.evidence.pickPoint = `target ${tb[0]}: ${p.source}`;
  fr.evidence.target = { body: tb[0], candidates: 1, face: on[0].name, faceIndex: on[0].index, point: p.point, pickSource: p.source, centroidHit: on[0].centroid_hit ?? null, innerHit: on[0].inner_hit ?? null };
  return fr;
}
function makeEnv(st, accepted, prefix, ctx, shapeCache) {
  return {
    features: prefix,
    sketchFrame: (sk) => frameOf2(sk, ctx.mt),
    outline: (sk) => ctx.arc.outlineOf(sk),
    ...ctx.followMoves ? { followTurns: true } : {},
    shapeOf: async (fid) => {
      if (st.accLen[fid] === void 0)
        return { ok: false, sentence: `feature ${fid} was not built (it is a sketch, was refused, or comes later), so there is no shape of it to read the name from` };
      const bodies = st.bodies[fid];
      if (!bodies || bodies.length !== 1)
        return { ok: false, sentence: `feature ${fid} produced ${bodies ? bodies.length : 0} bodies; a name is resolved on a single body` };
      if (!shapeCache.has(fid)) {
        const cmds2 = accepted.slice(0, st.accLen[fid]);
        let r2;
        try {
          r2 = await ctx.topologyOf(cmds2);
        } catch (e) {
          r2 = { ok: false, error: e.message };
        }
        shapeCache.set(fid, { cmds: cmds2, r: r2 });
      }
      const { cmds, r } = shapeCache.get(fid);
      if (!r.ok || !r.topology)
        return { ok: false, sentence: `solidcraft could not report the topology of ${fid} (${r.error ?? r.rejected ?? (r.failed && r.failed.error) ?? "no topology in the reply"})` };
      if (r.topology.truncated)
        return { ok: false, sentence: `the topology of ${fid} is larger than the bridge's snapshot limit; not resolved` };
      const body = r.topology.bodies.find((b) => b.name === bodies[0]);
      if (!body || body.error)
        return { ok: false, sentence: `solidcraft returned no topology for body ${bodies[0]}${body?.error ? " (" + body.error + ")" : ""}` };
      let k = -1;
      cmds.forEach((c, i) => {
        if (c.params?.body_name === bodies[0] && /^solid\.(box|cylinder|extrude|revolve|loft|sphere|torus)$/.test(c.command))
          k = i;
      });
      const featureNumber = k >= 0 ? r.results?.[k]?.feature ?? null : null;
      return { ok: true, bodyName: bodies[0], featureId: fid, featureNumber, faces: body.faces, edges: body.edges };
    }
  };
}
async function resolveNamesFor(f, prefix, env) {
  const { st, accepted, ctx, shapeCache } = env;
  const resolved = /* @__PURE__ */ new Map();
  const ch = st.chain?.[f.id];
  if (f.kind === "fillet" && ch && ch.lead !== f.id && st.accLen[ch.lead] !== void 0)
    return resolved;
  const nameField = f.kind === "shell" ? "open" : f.kind === "fillet" ? "edge" : f.kind === "draft" ? "face" : null;
  const nameVal = f.kind === "shell" ? f.open : f.kind === "fillet" ? f.edge : f.kind === "draft" ? f.face : void 0;
  if (nameField && nameVal && typeof nameVal === "object" && ctx.topologyOf) {
    const menv = makeEnv(st, accepted, prefix, ctx, shapeCache);
    let rr = await resolveName(nameVal, menv, nameField === "edge" ? "edge" : "face");
    const targetId = f.target;
    if (ctx.followMoves)
      rr = followMoves(rr, { features: prefix, bboxOf: (id) => st.measure[id]?.bbox, targetId });
    rr = await confirmOnTarget(rr, { st, accepted, ctx, targetId, features: prefix });
    if (rr.ok && rr.kind === "faceset")
      resolved.set(nameVal, { ok: false, sentence: `${rr.evidence.name} is ${rr.faces.length} faces in solidcraft (${rr.evidence.engineFaces.join(", ")}; a cylinder's wall is split at its seam); a face pick of it would choose one half silently, so nothing is picked` });
    else
      resolved.set(nameVal, rr);
    if (f.kind === "fillet" && chainsOn(st, ctx) && !st.chain?.[f.id]) {
      const idx = prefix.length;
      const all = env.features ?? env.doc?.features ?? null;
      if (all && all[idx]?.id === f.id) {
        const own = rr;
        const edgeOf = (x) => x.ok && x.kind === "edge" && x.edges.length === 1 && (own.ok && own.kind === "edge" && x.shape.featureId === own.shape.featureId) ? { point: x.point, ends: [x.edges[0].start, x.edges[0].end] } : null;
        await groupRun(f, all, idx, st, async (m) => {
          if (m.id === f.id)
            return edgeOf(own);
          const nm = m.edge;
          if (!nm || typeof nm !== "object")
            return null;
          let mr = await resolveName(nm, makeEnv(st, accepted, prefix, ctx, shapeCache), "edge");
          if (ctx.followMoves)
            mr = followMoves(mr, { features: prefix, bboxOf: (id) => st.measure[id]?.bbox, targetId });
          mr = await confirmOnTarget(mr, { st, accepted, ctx, targetId, features: prefix });
          return edgeOf(mr);
        }, 1);
      }
    }
  }
  return resolved;
}
async function translateDoc(doc, ctx0, profileIn = BASE_PROFILE) {
  const ctx = withErroredBodies(ctx0);
  const st = { head: {}, bodies: {}, stale: {}, refused: {}, sketches: {}, measure: {}, counter: 0, accLen: {} };
  if (!ctx.skipMoveTurn)
    st.motion = motionInfo(doc, ctx);
  if (!ctx.skipPrimitives)
    st.primitives = primitiveEffects(doc);
  profileIn.initState(st, doc);
  const shapeCache = /* @__PURE__ */ new Map();
  const accepted = [];
  const out = [];
  for (let idx = 0; idx < doc.features.length; idx++) {
    const f = doc.features[idx];
    if (ctx0.onStep)
      await ctx0.onStep({ id: f.id, kind: f.kind, index: idx, count: doc.features.length });
    const profile = ownerOf(profileIn, f.kind);
    const env = { doc, ctx, st, accepted, out, shapeCache, profile: profileIn };
    if (profile.step) {
      await profile.step(f, idx, env);
      continue;
    }
    await genericStep(f, idx, env, profile);
  }
  const extras = profileIn.result ? profileIn.result(st) : {};
  return { features: out, commands: accepted, ...extras, _state: { st, accepted, shapeCache } };
}
async function genericStep(f, idx, env, profile) {
  const { doc, ctx, st, accepted, out, shapeCache } = env;
  const profileIn = env.profile;
  const prefix = doc.features.slice(0, idx);
  const resolved = await resolveNamesFor(f, prefix, { st, accepted, ctx, shapeCache, features: doc.features });
  const fctx = { ...ctx, resolve: (name) => resolved.get(name) ?? null };
  const note = (o) => out.push({ id: f.id, kind: f.kind, ...o });
  if (f.kind === "sketch")
    st.sketches[f.id] = f;
  let plan;
  let internal = null;
  try {
    plan = planFeature(f, st, fctx, profile);
  } catch (e) {
    const pe = profile.plannerError(f, e);
    internal = pe.internal;
    plan = refuse(pe.refusal);
  }
  if ("refusal" in plan) {
    st.refused[f.id] = plan.refusal;
    note({ status: "refused", refusal: plan.refusal, ...isVerbatimGuard(plan.guard) ? { guard: plan.guard } : {}, commands: [], ...internal ? { internalError: internal } : {} });
    return;
  }
  if ("noop" in plan) {
    note({ status: "noop", commands: [] });
    return;
  }
  let lastErr = null;
  let lastFail = null;
  let verifyRefusal = null;
  let verifyGuard;
  let errored = false;
  const checks = [];
  for (const variant0 of plan.variants) {
    let variant = variant0;
    let repaired;
    let res;
    try {
      res = await ctx.runSC([...accepted, ...variant]);
    } catch (e) {
      res = { ok: false, failed: { error: `bridge error: ${e.message}` } };
    }
    if (!res.ok && res.erroredBody)
      errored = true;
    if (!res.ok) {
      lastErr = res.failed ? `${res.failed.command}: ${res.failed.error}` : String(res.rejected ?? res.error ?? "unknown");
      lastFail = res;
      continue;
    }
    let m = aggregate(res, plan.produces, profile.verifies);
    if (!m) {
      lastErr = `solidcraft ran the commands but no body named ${plan.produces.join(", ")} came back`;
      continue;
    }
    if (profile.verifies) {
      const bad2 = plan.verify && !ctx.skipVerify ? await plan.verify(m, { accepted: accepted.slice(), variant, runSC: ctx.runSC, checks, scene: st.scene }) : null;
      if (bad2) {
        verifyRefusal = bad2;
        verifyGuard = void 0;
        lastErr = null;
        continue;
      }
    }
    const sv = f.kind === "extrude" ? sketchVolumeRefusal(f, st.sketches[f.target], ctx, res, plan.produces) : null;
    if (sv) {
      verifyRefusal = sv;
      verifyGuard = SKETCH_VOLUME_GUARD;
      lastErr = null;
      continue;
    }
    const mv = motionRefusal(f, st, ctx, res, plan.produces, accepted);
    const fx = mv ? await motionRepair(f, st, ctx, mv, plan.produces, accepted, variant, ctx.runSC) : null;
    const m2 = fx ? aggregate(fx.res, plan.produces, profile.verifies) : null;
    if (mv && fx && m2) {
      variant = fx.variant;
      res = fx.res;
      m = m2;
      repaired = { pads: fx.pads, reason: mv.sentence };
    } else if (mv) {
      verifyRefusal = mv.sentence;
      verifyGuard = mv.guard;
      lastErr = null;
      continue;
    }
    const bl = blendRefusal(f, plan.blend, beforeOf(st, f.target), m, ctx);
    if (bl) {
      verifyRefusal = bl.sentence;
      verifyGuard = bl.guard;
      lastErr = null;
      continue;
    }
    const pc = !profile.verifies && f.kind === "pocket" ? await pocketCutRefusal(f, ctx, res, accepted, variant, plan.produces, ctx.runSC) : null;
    if (pc) {
      verifyRefusal = pc;
      verifyGuard = POCKET_CUT_GUARD;
      lastErr = null;
      continue;
    }
    const hc = f.kind === "shell" ? hollowRefusal(f, doc.features, st, ctx, res, plan.produces, accepted) : null;
    if (hc) {
      verifyRefusal = hc.sentence;
      verifyGuard = hc.guard;
      lastErr = null;
      continue;
    }
    accepted.push(...variant);
    rememberRun(accepted, res);
    for (const mp of membersOf(profileIn))
      mp.onAccepted?.(st, res, m, plan, { f, ctx });
    st.accLen[f.id] = accepted.length;
    st.bodies[f.id] = m.bodies;
    st.measure[f.id] = m;
    for (const c of plan.consumes) {
      if (c === f.id)
        continue;
      if (f.kind === "hole" || f.kind === "pocket" || f.kind === "groove") {
        if (c === (f.kind === "hole" ? f.target : f.into))
          st.head[c] = f.id;
      } else
        st.stale[c] = f.id;
    }
    note({ status: "built", ...profile.verifies ? { checks } : {}, commands: variant, measure: m, pickedFrom: plan.pickedFrom, evidence: plan.evidence ?? null, pick: variant.find((c) => c.params.edges || c.params.faces)?.params ?? null, variantsTried: plan.variants.indexOf(variant0) + 1, ...repaired ? { repaired } : {} });
    return;
  }
  const sentence = errored ? erroredBodySentence(f) : verifyRefusal ?? profile.kernelRefusal(f, lastErr);
  st.refused[f.id] = sentence;
  note({ status: "refused", refusal: sentence, ...errored ? { guard: ERRORED_BODY_GUARD } : verifyRefusal && verifyGuard ? { guard: verifyGuard } : {}, commands: plan.variants[0], failed: lastFail?.failed ?? null, sketchAtFailure: lastFail?.sketch_at_failure ?? null });
}
async function resolveAfter(tr, doc, name, ctx, want, targetId = null, beforeId = null) {
  const { st, accepted: all, shapeCache } = tr._state;
  let accepted = all;
  if (beforeId) {
    const i = doc.features.findIndex((x) => x.id === beforeId);
    let len8 = 0;
    for (let k = 0; k < i; k++)
      if (st.accLen[doc.features[k].id] !== void 0)
        len8 = Math.max(len8, st.accLen[doc.features[k].id]);
    accepted = all.slice(0, len8);
  }
  let rr = await resolveName(name, makeEnv(st, accepted, doc.features, ctx, shapeCache), want);
  if (targetId && ctx.followMoves)
    rr = followMoves(rr, { features: beforeId ? doc.features.slice(0, doc.features.findIndex((x) => x.id === beforeId)) : doc.features, bboxOf: (id) => st.measure[id]?.bbox, targetId });
  return targetId ? confirmOnTarget(rr, { st, accepted, ctx, targetId, features: beforeId ? doc.features.slice(0, doc.features.findIndex((x) => x.id === beforeId)) : doc.features }) : rr;
}

// ../../layer/dist/holes-volume.js
var mergeIntervals = (a) => {
  const s = a.filter(([l, h]) => h > l).sort((p, q) => p[0] - q[0]);
  const out = [];
  for (const iv of s) {
    if (out.length && iv[0] <= out[out.length - 1][1])
      out[out.length - 1][1] = Math.max(out[out.length - 1][1], iv[1]);
    else
      out.push([iv[0], iv[1]]);
  }
  return out;
};
var subtract = (A, B) => {
  let len8 = 0;
  for (const [l, h] of A) {
    let cur = l;
    for (const [bl, bh] of B) {
      if (bh <= cur)
        continue;
      if (bl >= h)
        break;
      if (bl > cur)
        len8 += bl - cur;
      cur = Math.max(cur, bh);
      if (cur >= h)
        break;
    }
    if (cur < h)
      len8 += h - cur;
  }
  return len8;
};
var radiusAt = (prof, z) => {
  for (let i = 0; i + 1 < prof.length; i++) {
    const [z0, r0] = prof[i];
    const [z1, r1] = prof[i + 1];
    if (z >= z0 && z <= z1)
      return z1 === z0 ? Math.max(r0, r1) : r0 + (r1 - r0) * (z - z0) / (z1 - z0);
  }
  return 0;
};
function sectionArea(news, olds, box, z, N = 4e3) {
  const circ = (T) => T.map((t) => ({ cx: t.cx, cy: t.cy, r: radiusAt(t.prof, z) })).filter((c) => c.r > 0);
  const nc = circ(news);
  const oc = circ(olds);
  if (!nc.length)
    return 0;
  const [x0, x1, y0, y1] = box;
  const lo = Math.max(x0, Math.min(...nc.map((c) => c.cx - c.r)));
  const hi = Math.min(x1, Math.max(...nc.map((c) => c.cx + c.r)));
  if (!(hi > lo))
    return 0;
  const h = (hi - lo) / N;
  let area = 0;
  for (let i = 0; i < N; i++) {
    const x = lo + (i + 0.5) * h;
    const chord = (c) => {
      const d = c.r * c.r - (x - c.cx) ** 2;
      if (d <= 0)
        return null;
      const s = Math.sqrt(d);
      return [c.cy - s, c.cy + s];
    };
    const A = mergeIntervals(nc.map(chord).filter((v) => !!v).map(([l, u]) => [Math.max(l, y0), Math.min(u, y1)]));
    if (!A.length)
      continue;
    const B = mergeIntervals(oc.map(chord).filter((v) => !!v));
    area += subtract(A, B) * h;
  }
  return area;
}
function removedVolume(news, olds, box3, M = 24) {
  const [x0, x1, y0, y1, zlo, zhi] = box3;
  const zs = /* @__PURE__ */ new Set([zlo, zhi]);
  for (const t of [...news, ...olds])
    for (const [z] of t.prof)
      if (z > zlo && z < zhi)
        zs.add(z);
  const zb = [...zs].sort((a, b) => a - b);
  let vol = 0;
  for (let k = 0; k + 1 < zb.length; k++) {
    const a = zb[k];
    const b = zb[k + 1];
    if (b - a < 1e-12)
      continue;
    const m = M;
    const dz = (b - a) / m;
    const f = (z) => sectionArea(news, olds, [x0, x1, y0, y1], z);
    const eps = (b - a) * 1e-9;
    let s = f(a + eps) + f(b - eps);
    for (let j = 1; j < m; j++)
      s += (j % 2 ? 4 : 2) * f(a + j * dz);
    vol += s * dz / 3;
  }
  return vol;
}
function holeProfile(f, top, lo, c0z) {
  const r = f.diameter / 2;
  const zb0 = c0z - f.depth / 2;
  const zb1 = c0z + f.depth / 2;
  const through = zb0 <= lo + 1e-9 && zb1 >= top - 1e-9;
  const big = 1e6;
  if (!f.counterbore && !f.countersink)
    return [[zb0, r], [zb1, r]];
  const bot = through ? lo - 1 : zb0;
  if (f.counterbore) {
    const R2 = f.counterbore.diameter / 2;
    const zc2 = top - f.counterbore.depth;
    return [[bot, r], [zc2, r], [zc2, R2], [top + big, R2]];
  }
  const R = f.countersink.diameter / 2;
  const tn = Math.tan(f.countersink.angleDeg * Math.PI / 360);
  const dc = (R - r) / tn;
  const zc = top - dc;
  const pts = [];
  if (zc >= bot)
    pts.push([bot, r], [zc, r]);
  else
    pts.push([bot, R - (top - bot) * tn]);
  pts.push([top, R], [top + 1, R + tn]);
  return pts;
}

// ../../layer/dist/holes.js
var AXI = { x: 0, y: 1, z: 2 };
var AX3 = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };
var AXN2 = { x: "X", y: "Y", z: "Z" };
var PI2 = Math.PI;
var H = (x) => x;
var fmt4 = (n) => Number.isInteger(n) ? String(n) : String(+n.toFixed(4));
var BUDGET_S = 45;
var DOC_BUDGET_S = 180;
var budgetSentenceOther = (id, kind) => `${id} (${kind}): building this took longer than ${BUDGET_S} seconds of computing, so it was stopped and ${id} is shown without it.`;
var refuse3 = (sentence, guard) => ({ refusal: sentence, guard });
var CS_MARGIN = 0.05;
var COVER_TOL = { planar: 1e-9, curved: 5e-4 };
var RECESS_TOL = 1e-3;
var SENTENCE = {
  dep: (f, head) => `${f.id} (hole): it comes after ${head}, which could not be built, so ${f.id} is shown without it -- fix ${head} first.`,
  stale: (f, head, by) => `${f.id} (hole): ${head} was already changed by ${by} after the hole was set up, so ${f.id} is shown without it -- drill the part before changing it.`,
  noBody: (f) => `${f.id} (hole): the part it drills could not be found as a single piece, so ${f.id} is shown without it -- drill one shape at a time.`,
  multi: (f, n) => `${f.id} (hole): the part it drills is ${n} separate pieces and a hole cannot tell which one to drill, so ${f.id} is shown without it -- drill each piece before copying it, or join the pieces first.`,
  // the part was made by a join whose pieces do not touch (owner-approved text, 2026-11-12)
  multiJoin: (f, n) => `${f.id} (hole): the part it drills is ${n} separate pieces and a hole cannot tell which one to drill, so ${f.id} is shown without it -- drill each piece before you join them, or move the pieces so that they overlap.`,
  cornersAxis: (f) => `${f.id} (holes): four holes drilled along ${f.axis} are not supported yet, so ${f.id} is shown without it -- use holes() along z, or drill each hole with hole(shape, { along: '${f.axis}', at: [...] }).`,
  top: (f) => `${f.id} (hole): a hole that stops short of the other side starts on the top of the part, but the part is not flat and level under this spot, so ${f.id} is shown without it -- move the hole onto a flat top, or let it go all the way through.`,
  // the part was made by a join (owner-approved text, 2026-11-12): the piece can be drilled before it is joined
  topJoin: (f) => `${f.id} (hole): a hole that stops short of the other side starts on the top of the part, but the part is not flat and level under this spot, so ${f.id} is shown without it -- move the hole onto a flat top, let it go all the way through, or drill the piece before you join it.`,
  topRecess: (f, what) => `${f.id} (hole): a ${what} is cut from the top of the part, but the part is not flat and level under this spot, so ${f.id} is shown without it -- move the hole onto a flat top.`,
  noop: (f) => `${f.id} (hole): it does not touch the part, so it would cut nothing and ${f.id} is shown without it -- move the hole onto the part (at: is measured from the middle of the part) or make it wider.`,
  split: (f, n0, n12) => `${f.id} (hole): it would leave ${n12} separate pieces where there ${n0 === 1 ? "is 1 now" : `are ${n0} now`}, so ${f.id} is shown without it -- make the hole narrower than the part, or drill each separate piece before copying it.`,
  tangent: (f, what, other = "edge") => `${f.id} (hole): its ${what} would touch ${other === "edge" ? "the edge of the part" : other === "sibling" ? what === "recess" ? "the recess of another hole in this holes() call" : "another hole in this holes() call" : "another hole"} along a line, which leaves a zero-thickness wall, so ${f.id} is shown without it -- move it a little or change its size.`,
  torus: (f) => `${f.id} (hole): drilling a ring (torus) is not supported yet, so ${f.id} is shown without it -- drill a box, cylinder or other flat-faced shape.`,
  shells: (f) => `${f.id} (hole): it would leave a sealed hollow inside the part, or pieces that touch only along a line, so ${f.id} is shown without it -- move it, make it narrower than the part, or let it go all the way through.`,
  cross: (f, h) => `${f.id} (hole): it crosses ${h.id}, a hole drilled in another direction, and crossing holes are not supported yet, so ${f.id} is shown without it -- drill the holes so they do not meet, or drill along one direction only.`,
  // G-OTHERS (owner-approved text, 2026-11-12): the cut would also change another part
  others: (f, part) => `${f.id} (hole): cutting it would also cut ${part}, which is in the way of this hole, so ${f.id} is shown without it -- drill this hole before you make ${part}.`,
  engine: (f) => `${f.id} (hole): this hole could not be cut cleanly into this part, so ${f.id} is shown without it -- try a smaller hole, a different place, or drill the plain shape before it is shaped.`,
  csBand: (f, need, have) => `${f.id} (hole): the countersink cone needs a hole at least ${fmt4(need)} deep but this hole is ${fmt4(have)} deep, so ${f.id} is shown without it -- drill deeper than ${fmt4(need)} or make the countersink narrower.`,
  cbDeep: (f, cb, limit, what) => `${f.id} (hole): the counterbore is ${fmt4(cb)} deep but the ${what} is only ${fmt4(limit)}, so ${f.id} is shown without it -- make the counterbore shallower than the ${what}.`,
  recessNarrow: (f, what) => `${f.id} (hole): the ${what} has to be wider than the hole, so ${f.id} is shown without it -- make it wider than ${fmt4(f.diameter)}.`,
  recessSide: (f, what) => `${f.id} (hole): ${f.id} cannot be drilled with a ${what} along ${f.axis} here, so ${f.id} is shown without it -- put the hole on a flat top.`,
  recessCavity: (f, what) => `${f.id} (hole): a ${what} has to start on a face of the part, and this hole starts inside it, so ${f.id} is shown without it -- give the hole a depth that ends at a face or leave the depth out.`,
  recessNest: (f, what, other) => `${f.id} (hole): a ${what} has to start on a face of the part, but this hole starts inside ${other}, so ${f.id} is shown without it -- move it onto the flat top of the part.`,
  csFlat: (f) => `${f.id} (hole): a countersink angle wider than ${CS_MAX_ANGLE} degrees makes a cone too flat to cut reliably, so ${f.id} is shown without it -- use ${CS_MAX_ANGLE} degrees or less (90 and 120 are usual).`,
  recessSmall: (f, what, why, fix) => `${f.id} (hole): a ${what} ${why} cannot be cut reliably, so ${f.id} is shown without it -- ${fix}.`,
  recessCheck: (f, what) => `${f.id} (hole): the ${what} did not come out the size that was asked, so ${f.id} is shown without it -- try a slightly different depth or width.`,
  // ---- round 4
  budget: (f) => `${f.id} (hole): cutting this hole took longer than ${BUDGET_S} seconds of computing, so it was stopped and ${f.id} is shown without it -- try a flat-sided part, a smaller hole, or drill the plain shape before it is turned or rounded.`,
  docBudget: (f) => `${f.id} (hole): this model has already used its ${DOC_BUDGET_S} seconds of computing, so ${f.id} is shown without it -- use fewer holes or simpler shapes.`,
  revolve: (f) => `${f.id} (hole): drilling a spun shape is not supported yet, so ${f.id} is shown without it -- for a hole down the middle, leave a gap in the sketch that is spun; for other holes, build the part from cylinders instead.`,
  curved: (f, what) => `${f.id} (hole): a hole drilled across ${what} would cut through its curved wall at an angle, which is not supported yet, so ${f.id} is shown without it -- drill along the axis of ${what}, or use a flat-sided shape.`,
  csOverlap: (f, other) => `${f.id} (hole): its countersink cone would overlap ${other}, which is not supported yet, so ${f.id} is shown without it -- space the countersinks at least as far apart as their mouth is wide, or use counterbores.`,
  csEdge: (f) => `${f.id} (hole): the countersink mouth reaches past the side of the part, which is not supported yet, so ${f.id} is shown without it -- move the hole away from the side or make the countersink narrower than the part.`,
  tiny: (f) => `${f.id} (hole): a hole narrower than ${MIN_ACROSS} mm cannot be cut reliably, so ${f.id} is shown without it -- make it at least ${MIN_ACROSS} across.`,
  wide: (f, what) => `${f.id} (hole): the hole is as wide as ${what} it drills, so nothing would be left and ${f.id} is shown without it -- make the hole narrower than ${what}.`,
  engineCurved: (f) => `${f.id} (hole): this hole meets a curved surface where the cut cannot be done exactly, so ${f.id} is shown without it -- drill along the axis of the curved shape or use a flat-sided shape.`,
  engineWide: (f) => `${f.id} (hole): the hole is wider than the part, so nothing of it would be left and ${f.id} is shown without it -- make the hole narrower than the part.`
};
var MIN_ACROSS = 1e-3;
var CS_MAX_ANGLE = 170;
var CB_MIN = { across: 0.2, depth: 5e-3, ring: 5e-3 };
var CS_MIN = { bore: 0.7, ring: 0.04 };
function engineSentence(f, raw) {
  const r = String(raw ?? "");
  if (/exact fallback|planar faces only|shallow angle/.test(r))
    return SENTENCE.engineCurved(f);
  if (/no body named/.test(r))
    return SENTENCE.engineWide(f);
  return null;
}
function aggregateOf(res, names) {
  const bs = res.measure.bodies.filter((b) => names.includes(b.name));
  if (!bs.length)
    return null;
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  for (const b of bs)
    for (let i = 0; i < 3; i++) {
      lo[i] = Math.min(lo[i], b.bbox.min[i]);
      hi[i] = Math.max(hi[i], b.bbox.max[i]);
    }
  const vol = bs.reduce((s, b) => s + b.volume_mm3, 0);
  return {
    volume: vol,
    faces: bs.reduce((s, b) => s + b.faces, 0),
    kernelFaces: bs.reduce((s, b) => s + b.kernel.faces, 0),
    shells: bs.reduce((s, b) => s + (b.kernel.shells ?? 1), 0),
    curved: bs.some((b) => Object.keys(b.face_types ?? {}).some((k) => k !== "plane")),
    bbox: [...lo, ...hi],
    faceTypes: bs.reduce((a, b) => {
      for (const [k, v] of Object.entries(b.face_types ?? {}))
        a[k] = (a[k] ?? 0) + v;
      return a;
    }, {}),
    com: [0, 1, 2].map((i) => bs.reduce((a, b) => a + b.volume_mm3 * b.center_of_mass[i], 0) / vol),
    bodies: bs.map((b) => b.name)
  };
}
var csToolDepth = (d, D, a) => (D / 2 - 0.9 * (d / 2)) / Math.tan(a * PI2 / 360);
var rowsOf = (res) => res.measure.bodies.map((b) => ({ name: b.name, volume: b.volume_mm3, shells: b.kernel.shells ?? 1, faces: b.faces }));
var SHELL_CLOSED = (f) => `${f.id} (hollow): a hollow with no open side is not built here, so ${f.id} is shown without it -- add open:'top' (or 'bottom', 'front', 'back', 'left', 'right') to leave one side open.`;
async function holesStep(f, idx, env) {
  const { doc, ctx, st, accepted, out } = env;
  const hs = st.holes;
  const off = new Set(ctx.guardsOff ?? []);
  const byId = Object.fromEntries(doc.features.map((x) => [x.id, x]));
  const fv = f;
  const runB = async (cmds, { replay = true } = {}) => {
    const budgetS = off.has("G-BUDGET") ? 1e9 : BUDGET_S + (replay ? 1.5 * hs.lastRunS : 0);
    let res;
    try {
      res = await ctx.runSC(cmds, { budgetS });
    } catch (e) {
      res = { ok: false, failed: { command: "(wasm)", error: `WASM TRAP: ${e.message}` } };
    }
    hs.spentS += (res?.cpuMs ?? 0) / 1e3;
    if (res?.ok && res.cpuMs && replay)
      hs.lastRunS = res.cpuMs / 1e3;
    return res;
  };
  const headOf3 = (id) => {
    let h = id;
    const seen = /* @__PURE__ */ new Set();
    while (st.head[h] && !seen.has(h)) {
      seen.add(h);
      h = st.head[h];
    }
    return h;
  };
  const prefix = doc.features.slice(0, idx);
  const resolved = await resolveNamesFor(f, prefix, env);
  const fctx = { ...ctx, resolve: (name) => resolved.get(name) ?? null };
  const note = (o) => {
    out.push({ id: f.id, kind: f.kind, ...o });
  };
  if (f.kind === "sketch")
    st.sketches[f.id] = f;
  let plan;
  try {
    plan = f.kind === "hole" && !off.has("G-BUDGET") && hs.spentS > DOC_BUDGET_S ? refuse3(SENTENCE.docBudget(f), "G-BUDGET") : f.kind === "hole" ? await planHole(f, st, { accepted, headOf: headOf3, byId, off, runB }) : f.kind === "shell" && !f.open ? refuse3(SHELL_CLOSED(f), "G-CLOSED") : planFeature(f, st, fctx, BASE_PROFILE);
  } catch (e) {
    const r = refuse3(`${f.id} (${f.kind}): this step could not be built, so ${f.id} is shown without it.`, "translator-error");
    r.raw = String(e.message);
    plan = r;
  }
  if (plan.refusal && plan.guard === "dependency" && f.kind === "hole" && ctx.probeBlocked) {
    const own = await probeBlockedHole(f, st, { accepted, headOf: headOf3, byId, off, runB }, hs.allCount, !!ctx.probeBlockedNoAcrossCut);
    if (own) {
      st.refused[f.id] = own.refusal;
      note({ status: "refused", refusal: own.refusal, guard: own.guard, raw: `blocked (${plan.refusal}); own refusal found by a test build on ${own.base}`, commands: [] });
      return;
    }
  }
  if (plan.refusal) {
    st.refused[f.id] = plan.refusal;
    note({ status: "refused", refusal: plan.refusal, guard: plan.guard, raw: plan.raw, probe: plan.probe, commands: [] });
    return;
  }
  if (plan.noop) {
    note({ status: "noop", commands: [] });
    return;
  }
  let lastErr = null;
  let errored = false;
  for (const variant0 of plan.variants) {
    let variant = variant0;
    let repaired;
    let res = await runB([...accepted, ...variant]);
    if (res.timedOut && off.has("G-BUDGET")) {
      st.refused[f.id] = `CONTROL: no result within ${res.failed?.error} (a hang)`;
      note({ status: "refused", refusal: st.refused[f.id], guard: "CONTROL-KILL", raw: res.failed?.error, cpuMs: res.cpuMs, commands: variant });
      return;
    }
    if (res.timedOut) {
      const sentence2 = f.kind === "hole" ? SENTENCE.budget(f) : budgetSentenceOther(f.id, f.kind);
      st.refused[f.id] = sentence2;
      note({ status: "refused", refusal: sentence2, guard: "G-BUDGET", raw: `${res.failed?.error}`, cpuMs: res.cpuMs, commands: variant });
      return;
    }
    if (!res.ok) {
      if (res.erroredBody)
        errored = true;
      lastErr = res.failed ? `${res.failed.command}: ${res.failed.error}` : String(res.error ?? "unknown");
      continue;
    }
    let m = aggregateOf(res, plan.produces);
    if (!m) {
      lastErr = `solidcraft ran the commands but no body named ${plan.produces.join(", ")} came back`;
      continue;
    }
    let allBodies = rowsOf(res);
    const sv = f.kind === "extrude" ? sketchVolumeRefusal(f, st.sketches[f.target], ctx, res, plan.produces) : null;
    if (sv) {
      st.refused[f.id] = sv;
      note({ status: "refused", refusal: sv, guard: SKETCH_VOLUME_GUARD, commands: variant });
      return;
    }
    const mv = motionRefusal(f, st, ctx, res, plan.produces, accepted);
    const fx = mv ? await motionRepair(f, st, ctx, mv, plan.produces, accepted, variant, runB) : null;
    const m2 = fx ? aggregateOf(fx.res, plan.produces) : null;
    if (mv && fx && m2) {
      variant = fx.variant;
      res = fx.res;
      m = m2;
      repaired = { pads: fx.pads, reason: mv.sentence };
      allBodies = rowsOf(res);
    } else if (mv) {
      st.refused[f.id] = mv.sentence;
      note({ status: "refused", refusal: mv.sentence, guard: mv.guard, commands: variant });
      return;
    }
    const bl = blendRefusal(f, blendOf(plan), beforeOf(st, fv.target), m, ctx);
    if (bl) {
      st.refused[f.id] = bl.sentence;
      note({ status: "refused", refusal: bl.sentence, guard: bl.guard, unguarded: { volume: m.volume, faces: m.faces, bbox: m.bbox }, commands: variant });
      return;
    }
    if (plan.post) {
      const before = st.measure[headOf3(f.target)] ?? st.measure[f.target];
      const bad2 = plan.post(m, before, { allBodies, allCountBefore: hs.allCount, allBefore: hs.allRows, partOf: makerOf(st, byId), accepted, variant, off });
      if (bad2) {
        st.refused[f.id] = bad2.refusal;
        note({ status: "refused", refusal: bad2.refusal, guard: bad2.guard, unguarded: { volume: m.volume, faces: m.faces, bbox: m.bbox, shells: m.shells, bodies: allBodies.length, allVolume: allBodies.reduce((a, b) => a + b.volume, 0) }, commands: variant });
        return;
      }
    }
    if (f.kind === "hole") {
      const h = headOf3(f.target);
      const prev = hs.chain[h];
      hs.chain[f.id] = prev ?? { baseIdx: plan.baseIdx, baseMeasure: st.measure[h] ?? st.measure[f.target] };
    }
    const pc = f.kind === "pocket" ? await pocketCutRefusal(f, ctx, res, accepted, variant, plan.produces, (c) => runB(c, { replay: false })) : null;
    if (pc) {
      st.refused[f.id] = pc;
      note({ status: "refused", refusal: pc, guard: POCKET_CUT_GUARD, commands: variant });
      return;
    }
    const hc = f.kind === "shell" ? hollowRefusal(f, doc.features, st, ctx, res, plan.produces, accepted) : null;
    if (hc) {
      st.refused[f.id] = hc.sentence;
      note({ status: "refused", refusal: hc.sentence, guard: hc.guard, commands: variant });
      return;
    }
    accepted.push(...variant);
    rememberRun(accepted, res);
    for (const mp of membersOf(env.profile))
      mp.onAccepted?.(st, res, m, null, { f, ctx });
    st.accLen[f.id] = accepted.length;
    st.bodies[f.id] = m.bodies;
    st.measure[f.id] = m;
    for (const c of plan.consumes) {
      if (c === f.id)
        continue;
      if (f.kind === "hole" || f.kind === "pocket" || f.kind === "groove") {
        if (c === (f.kind === "hole" ? f.target : fv.into))
          st.head[c] = f.id;
      } else
        st.stale[c] = f.id;
    }
    note({ status: "built", commands: variant, measure: m, pickedFrom: plan.pickedFrom, probe: plan.probe, variantsTried: plan.variants.indexOf(variant0) + 1, ...repaired ? { repaired } : {} });
    return;
  }
  if (errored) {
    const s = erroredBodySentence(f);
    st.refused[f.id] = s;
    note({ status: "refused", refusal: s, raw: lastErr, guard: ERRORED_BODY_GUARD, commands: plan.variants[0] });
    return;
  }
  const sentence = f.kind === "hole" ? engineSentence(f, lastErr) ?? SENTENCE.engine(f) : `${f.id} (${f.kind}): this step could not be built cleanly, so ${f.id} is shown without it.`;
  st.refused[f.id] = sentence;
  note({ status: "refused", refusal: sentence, raw: lastErr, guard: "G-ENGINE", commands: plan.variants[0] });
}
async function probeBlockedHole(f, st, G, allCountBefore, noAcrossCut = false) {
  let base = G.headOf(f.target);
  const seen = /* @__PURE__ */ new Set();
  while (base && st.refused[base] && !seen.has(base)) {
    seen.add(base);
    const x = G.byId[base];
    base = x && ["hole", "fillet", "shell", "draft"].includes(x.kind) && x.target ? G.headOf(x.target) : void 0;
  }
  if (!base || st.refused[base] || st.stale[base] || !st.bodies[base] || !st.measure[base])
    return null;
  const f2 = { ...f, target: base };
  let plan;
  try {
    plan = await planHole(f2, st, G);
  } catch {
    return null;
  }
  if ("refusal" in plan && plan.refusal)
    return plan.guard === "dependency" ? null : { refusal: plan.refusal, guard: plan.guard ?? "guard", base };
  const hp = plan;
  let lastErr = null;
  let errored = false;
  if (hp.across && noAcrossCut)
    return null;
  for (const variant of hp.variants) {
    const res = await G.runB([...G.accepted, ...variant], { replay: false });
    if (res.timedOut)
      return { refusal: SENTENCE.budget(f), guard: "G-BUDGET", base };
    if (!res.ok) {
      if (res.erroredBody)
        errored = true;
      lastErr = res.failed ? `${res.failed.command}: ${res.failed.error}` : String(res.error ?? "unknown");
      continue;
    }
    const m = aggregateOf(res, hp.produces);
    if (!m) {
      lastErr = "no body came back";
      continue;
    }
    const allBodies = rowsOf(res);
    const bad2 = hp.post ? hp.post(m, st.measure[base], { allBodies, allCountBefore, allBefore: st.holes.allRows, partOf: makerOf(st, G.byId), accepted: G.accepted, variant, off: G.off }) : null;
    return bad2 ? { refusal: bad2.refusal, guard: bad2.guard ?? "guard", base } : null;
  }
  if (errored)
    return { refusal: erroredBodySentence(f), guard: ERRORED_BODY_GUARD, base };
  return { refusal: engineSentence(f, lastErr) ?? SENTENCE.engine(f), guard: "G-ENGINE", base };
}
var NOT_A_REF = /* @__PURE__ */ new Set(["id", "kind", "name"]);
function rootsOf(id, byId) {
  const roots = /* @__PURE__ */ new Set();
  const seen = /* @__PURE__ */ new Set();
  const walk = (cur) => {
    if (seen.has(cur))
      return;
    seen.add(cur);
    const f = byId[cur];
    if (!f)
      return;
    const refs = /* @__PURE__ */ new Set();
    const scan = (v) => {
      if (typeof v === "string") {
        if (v !== cur && byId[v] !== void 0)
          refs.add(v);
      } else if (Array.isArray(v))
        v.forEach(scan);
      else if (v && typeof v === "object")
        Object.values(v).forEach(scan);
    };
    for (const [k, v] of Object.entries(f))
      if (!NOT_A_REF.has(k))
        scan(v);
    if (!refs.size)
      roots.add(cur);
    else
      refs.forEach(walk);
  };
  walk(id);
  return roots;
}
function otherPartsOnly(target, bs, st, byId) {
  const rows = st.holes.allRows;
  if (!rows || rows.length !== st.holes.allCount)
    return false;
  const mine = rootsOf(target, byId);
  if (!mine.size)
    return false;
  for (const r of rows) {
    if (bs.includes(r.name))
      continue;
    const makers = Object.keys(st.bodies).filter((id) => st.bodies[id]?.includes(r.name));
    if (!makers.length)
      return false;
    for (const mk of makers)
      for (const x of rootsOf(mk, byId))
        if (mine.has(x))
          return false;
  }
  return true;
}
function ownPieces(target, bs, st, byId) {
  const rows = st.holes.allRows;
  const mine = rootsOf(target, byId);
  if (!rows || rows.length !== st.holes.allCount || !mine.size)
    return Math.max(bs.length, st.holes.allCount);
  let n = 0;
  for (const r of rows) {
    if (bs.includes(r.name)) {
      n++;
      continue;
    }
    const makers = Object.keys(st.bodies).filter((id) => st.bodies[id]?.includes(r.name));
    if (!makers.length || makers.some((mk) => [...rootsOf(mk, byId)].some((x) => mine.has(x))))
      n++;
  }
  return Math.max(n, bs.length);
}
function othersChanged(mine, before, after) {
  for (const b0 of before) {
    if (mine.includes(b0.name))
      continue;
    const b1 = after.find((x) => x.name === b0.name);
    if (!b1 || b1.shells !== b0.shells || b0.faces !== void 0 && b1.faces !== void 0 && b1.faces !== b0.faces || Math.abs(b1.volume - b0.volume) > 1e-9 * Math.max(1, Math.abs(b0.volume)))
      return b0.name;
  }
  return null;
}
var makerOf = (st, byId) => (body) => Object.keys(byId).find((id) => st.bodies[id]?.includes(body));
var byIdOf = (G, id) => G.byId[id];
async function planHole(f, st, G) {
  const { accepted, headOf: headOf3, off, runB } = G;
  const runSC = (cmds2) => runB(cmds2, { replay: false });
  const head = headOf3(f.target);
  if (st.refused[head])
    return refuse3(SENTENCE.dep(f, head), "dependency");
  if (st.stale[head])
    return refuse3(SENTENCE.stale(f, head, st.stale[head]), "dependency");
  const bs = st.bodies[head];
  const m = st.measure[head] ?? st.measure[f.target];
  if (!bs || !bs.length || !m)
    return refuse3(SENTENCE.noBody(f), "G-BODIES");
  const joined = (rootOf(f.target, G) ?? {}).kind === "combine" && (rootOf(f.target, G) ?? {}).op === "union";
  if (!off.has("G-BODIES") && (bs.length !== 1 || st.holes.allCount > 1 && !otherPartsOnly(f.target, bs, st, G.byId)))
    return refuse3((joined ? SENTENCE.multiJoin : SENTENCE.multi)(f, ownPieces(f.target, bs, st, G.byId)), "G-BODIES");
  if (!off.has("G-BODIES") && (m.shells ?? 1) > 1)
    return refuse3((joined ? SENTENCE.multiJoin : SENTENCE.multi)(f, m.shells), "G-BODIES");
  if (!off.has("G-TINY") && !(f.diameter >= MIN_ACROSS - 1e-12))
    return refuse3(SENTENCE.tiny(f), "G-TINY");
  const rootF = rootOf(f.target, G);
  if (!off.has("G-REVOLVE") && rootF?.kind === "revolve")
    return refuse3(SENTENCE.revolve(f), "G-REVOLVE");
  const axis = f.axis ?? "z";
  const ai = AXI[axis];
  const dir = AX3[axis];
  const curvedRoot = curvedRootOf(f.target, G);
  let across = false;
  if (curvedRoot && !off.has("G-CURVED")) {
    const cv = curvedAxis(curvedRoot, G);
    if (cv && Math.abs(Math.abs(cv.axis[ai]) - 1) > 1e-9) {
      const mid = (m.bbox[ai] + m.bbox[ai + 3]) / 2 + f.center[ai];
      const goesThrough = mid - f.depth / 2 <= m.bbox[ai] + 1e-9 && mid + f.depth / 2 >= m.bbox[ai + 3] - 1e-9;
      if (!acrossAllowed(f, curvedRoot, rootF, cv, goesThrough, G))
        return refuse3(SENTENCE.curved(f, cv.what), "G-CURVED");
      across = true;
    }
  }
  if (rootF?.kind === "cylinder" && !off.has("G-WIDE")) {
    const cv = curvedAxis(rootF, G);
    if (cv && Math.abs(Math.abs(cv.axis[ai]) - 1) <= 1e-9) {
      const bc1 = [0, 1, 2].map((i) => (m.bbox[i] + m.bbox[i + 3]) / 2);
      const perp1 = [0, 1, 2].filter((k) => k !== ai);
      const c1 = [0, 1, 2].map((i) => bc1[i] + f.center[i]);
      const offs = f.corners ? [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy]) => [sx * f.corners.dx, sy * f.corners.dy]) : [[0, 0]];
      for (const [ox, oy] of offs) {
        const pc = [c1[0] + ox, c1[1] + oy, c1[2]];
        if (Math.hypot(...perp1.map((k) => pc[k] - bc1[k])) + rootF.radius <= f.diameter / 2 + 1e-9)
          return refuse3(SENTENCE.wide(f, "the cylinder"), "G-WIDE");
      }
    }
  }
  if (f.corners && axis !== "z" && !off.has("G-CORNERS"))
    return refuse3(SENTENCE.cornersAxis({ ...f, axis }), "G-CORNERS");
  if (!off.has("G-TORUS")) {
    let root = G.byId[f.target];
    const seenR = /* @__PURE__ */ new Set();
    while (root && root.kind === "hole" && !seenR.has(root.id)) {
      seenR.add(root.id);
      root = G.byId[root.target];
    }
    if (root?.kind === "torus")
      return refuse3(SENTENCE.torus(f), "G-TORUS");
  }
  if (!off.has("G-TANGENT")) {
    const bcT = [0, 1, 2].map((i) => (m.bbox[i] + m.bbox[i + 3]) / 2);
    const cT = [bcT[0] + f.center[0], bcT[1] + f.center[1], bcT[2] + f.center[2]];
    const cs4 = f.corners ? [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy]) => [cT[0] + sx * f.corners.dx, cT[1] + sy * f.corners.dy, cT[2]]) : [cT];
    const aiT = AXI[axis];
    const TOLT = 1e-6;
    const radii = [[f.diameter / 2, "hole"]];
    if (f.counterbore)
      radii.push([f.counterbore.diameter / 2, "recess"]);
    if (f.countersink)
      radii.push([f.countersink.diameter / 2, "recess"]);
    for (const [R, what] of radii) {
      for (const c of cs4)
        for (const i of [0, 1, 2].filter((k) => k !== aiT)) {
          if (Math.abs(c[i] - R - m.bbox[i]) < TOLT || Math.abs(c[i] + R - m.bbox[i + 3]) < TOLT)
            return refuse3(SENTENCE.tangent(f, what), "G-TANGENT");
        }
      for (let a = 0; a < cs4.length; a++)
        for (let b = a + 1; b < cs4.length; b++) {
          const d = Math.hypot(...[0, 1, 2].filter((k) => k !== aiT).map((k) => cs4[a][k] - cs4[b][k]));
          if (d > TOLT && Math.abs(d - 2 * R) < TOLT)
            return refuse3(SENTENCE.tangent(f, what, "sibling"), "G-TANGENT");
        }
    }
    for (let cur = G.byId[f.target], seenT = /* @__PURE__ */ new Set(); cur && cur.kind === "hole" && !seenT.has(cur.id); cur = G.byId[cur.target]) {
      seenT.add(cur.id);
      if ((cur.axis ?? "z") !== axis)
        continue;
      const cc = [bcT[0] + cur.center[0], bcT[1] + cur.center[1], bcT[2] + cur.center[2]];
      const others = cur.corners ? [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy]) => [cc[0] + sx * cur.corners.dx, cc[1] + sy * cur.corners.dy, cc[2]]) : [cc];
      for (const o of others)
        for (const c of cs4) {
          const d = Math.hypot(...[0, 1, 2].filter((k) => k !== aiT).map((k) => o[k] - c[k]));
          const r1 = cur.diameter / 2;
          const r2 = f.diameter / 2;
          if (d > TOLT && (Math.abs(d - (r1 + r2)) < TOLT || Math.abs(d - Math.abs(r1 - r2)) < TOLT))
            return refuse3(SENTENCE.tangent(f, "hole", "earlier"), "G-TANGENT");
        }
    }
  }
  if (!off.has("G-CROSS")) {
    const bc0 = [0, 1, 2].map((i) => (m.bbox[i] + m.bbox[i + 3]) / 2);
    const toolsOf = (h) => {
      const a = h.axis ?? "z";
      const c = [bc0[0] + h.center[0], bc0[1] + h.center[1], bc0[2] + h.center[2]];
      const cs = h.corners ? [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy]) => [c[0] + sx * h.corners.dx, c[1] + sy * h.corners.dy, c[2]]) : [c];
      return cs.map((cc) => ({ a: AXI[a], c: cc, L: h.depth / 2, r: Math.max(h.diameter, h.counterbore?.diameter ?? 0, h.countersink?.diameter ?? 0) / 2 }));
    };
    const mine = toolsOf({ ...f, axis });
    for (let cur = byIdOf(G, f.target), seen = /* @__PURE__ */ new Set(); cur && cur.kind === "hole" && !seen.has(cur.id); cur = byIdOf(G, cur.target)) {
      seen.add(cur.id);
      if ((cur.axis ?? "z") === axis)
        continue;
      for (const A of toolsOf(H(cur)))
        for (const B of mine) {
          const k = [0, 1, 2].find((i) => i !== A.a && i !== B.a);
          if (Math.abs(A.c[k] - B.c[k]) < A.r + B.r && Math.abs(B.c[A.a] - A.c[A.a]) <= A.L + B.r && Math.abs(A.c[B.a] - B.c[B.a]) <= B.L + A.r && !crossInAir(A, B, f, G, m))
            return refuse3(SENTENCE.cross(f, cur), "G-CROSS");
        }
    }
  }
  const bc = [0, 1, 2].map((i) => (m.bbox[i] + m.bbox[i + 3]) / 2);
  const c0 = [bc[0] + f.center[0], bc[1] + f.center[1], bc[2] + f.center[2]];
  const centres = f.corners ? [[c0[0] - f.corners.dx, c0[1] - f.corners.dy, c0[2]], [c0[0] + f.corners.dx, c0[1] - f.corners.dy, c0[2]], [c0[0] - f.corners.dx, c0[1] + f.corners.dy, c0[2]], [c0[0] + f.corners.dx, c0[1] + f.corners.dy, c0[2]]] : [c0];
  const r = f.diameter / 2;
  const lo = m.bbox[ai];
  const hi = m.bbox[ai + 3];
  const T = hi - lo;
  const toolTop = c0[ai] + f.depth / 2;
  const toolBot = c0[ai] - f.depth / 2;
  const through = toolBot <= lo + 1e-9 && toolTop >= hi - 1e-9;
  const recess = f.counterbore ? "counterbore" : f.countersink ? "countersink" : null;
  const baseIdx = st.holes.chain[head]?.baseIdx ?? accepted.length;
  const baseMeasure = st.holes.chain[head]?.baseMeasure ?? m;
  const probeInfo = {};
  if (!off.has("G-CSOVERLAP")) {
    const perpA = [0, 1, 2].filter((k) => k !== ai);
    const dist2 = (a, b) => Math.hypot(...perpA.map((k) => a[k] - b[k]));
    const footprint = (h) => Math.max(h.diameter, h.counterbore?.diameter ?? 0, h.countersink?.diameter ?? 0) / 2;
    const bcO = [0, 1, 2].map((i) => (m.bbox[i] + m.bbox[i + 3]) / 2);
    const centresOf = (h) => {
      const cc = [0, 1, 2].map((i) => bcO[i] + h.center[i]);
      return h.corners ? [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy]) => [cc[0] + sx * h.corners.dx, cc[1] + sy * h.corners.dy, cc[2]]) : [cc];
    };
    const mineC = centresOf(f);
    const rn = footprint(f);
    if (f.countersink) {
      for (let a = 0; a < mineC.length; a++)
        for (let b = a + 1; b < mineC.length; b++)
          if (dist2(mineC[a], mineC[b]) < 2 * rn + 1e-6)
            return refuse3(SENTENCE.csOverlap(f, "the countersink of another hole in this holes() call"), "G-CSOVERLAP");
    }
    for (let cur = G.byId[f.target], seenO = /* @__PURE__ */ new Set(); cur && cur.kind === "hole" && !seenO.has(cur.id); cur = G.byId[cur.target]) {
      seenO.add(cur.id);
      if ((cur.axis ?? "z") !== axis)
        continue;
      if (!f.countersink && !cur.countersink)
        continue;
      const ro = footprint(H(cur));
      for (const o of centresOf(H(cur)))
        for (const c of mineC)
          if (dist2(o, c) < rn + ro + 1e-6)
            return refuse3(SENTENCE.csOverlap(f, `${cur.countersink ? "the countersink" : "the hole"} of ${cur.id}`), "G-CSOVERLAP");
    }
  }
  if (f.countersink && !off.has("G-CSEDGE")) {
    const R = f.countersink.diameter / 2;
    const cvE = rootF ? curvedAxis(rootF, G) : null;
    for (const c of centres) {
      for (const i of [0, 1, 2].filter((k) => k !== ai))
        if (c[i] - R < m.bbox[i] + 1e-6 || c[i] + R > m.bbox[i + 3] - 1e-6)
          return refuse3(SENTENCE.csEdge(f), "G-CSEDGE");
      if (rootF?.kind === "cylinder" && cvE && Math.abs(Math.abs(cvE.axis[ai]) - 1) <= 1e-9) {
        const pk = [0, 1, 2].filter((k) => k !== ai);
        if (Math.hypot(...pk.map((k) => c[k] - bc[k])) + R > rootF.radius - 1e-6)
          return refuse3(SENTENCE.csEdge(f), "G-CSEDGE");
      }
    }
  }
  if (!off.has("G-TOP") && (!through || recess)) {
    const top = recess ? hi : toolTop;
    const eps = Math.min(Math.max(r / 4, MIN_ACROSS / 2), r, 1);
    const delta = 0.05;
    const want = PI2 * eps * eps * delta;
    const probeCmds = centres.map((c) => ({ command: "solid.cylinder", params: { radius: eps, height: delta + 1, base: c.map((v, i) => i === ai ? top - delta : v), axis: AXN2[axis], operation: "cut", targets: bs } }));
    let removed = null;
    let failed = null;
    let dFaces = null;
    let ok = false;
    let why = null;
    let res_timedOut = false;
    const curvedBase = baseMeasure.curved;
    let flat = { ok: true };
    const faceProbe = !curvedBase && want * centres.length < 1e-6 * baseMeasure.volume;
    if (curvedBase)
      flat = flatTopCurved(f, axis, G, centres, bc);
    try {
      const res = await runSC([...accepted.slice(0, baseIdx), ...probeCmds]);
      if (res.timedOut)
        res_timedOut = true;
      if (!res.ok)
        failed = `${res.failed?.command}: ${res.failed?.error}`;
      else {
        const a = aggregateOf(res, bs);
        removed = baseMeasure.volume - a.volume;
        dFaces = a.faces - baseMeasure.faces;
        if (curvedBase)
          ok = flat.ok && dFaces === 2 * centres.length && a.shells === baseMeasure.shells;
        else if (faceProbe) {
          ok = dFaces === 2 * centres.length && a.shells === baseMeasure.shells;
          why = dFaces === 3 * centres.length ? "buried" : "air";
        } else {
          const ratio = removed / (want * centres.length);
          ok = ratio >= 0.8 && ratio <= 1.2;
          why = ratio > 1.2 ? "buried" : "air";
        }
      }
    } catch (e) {
      failed = String(e.message);
    }
    Object.assign(probeInfo, { top, eps, delta, curvedBase, faceProbe, wantEach: want, removed, ratio: removed === null ? null : removed / (want * centres.length), dFaces, flat: curvedBase ? flat : void 0, failed });
    if (!ok) {
      if (res_timedOut)
        return { ...refuse3(SENTENCE.budget(f), "G-BUDGET"), probe: probeInfo };
      const buried = removed !== null && !curvedBase && !faceProbe && removed / (want * centres.length) > 1.2 || (curvedBase || faceProbe) && dFaces === 3 * centres.length;
      const s = recess ? buried ? SENTENCE.recessCavity(f, recess) : SENTENCE.topRecess(f, recess) : joined ? SENTENCE.topJoin(f) : SENTENCE.top(f);
      return { ...refuse3(s, "G-TOP"), probe: probeInfo };
    }
  }
  if (recess) {
    if (f.countersink && !off.has("G-CSFLAT") && f.countersink.angleDeg > CS_MAX_ANGLE + 1e-9)
      return { ...refuse3(SENTENCE.csFlat(f), "G-CSFLAT"), probe: probeInfo };
    if (!off.has("G-RECESSMIN")) {
      const cbx = f.counterbore;
      const csx = f.countersink;
      if (cbx) {
        if (cbx.diameter < CB_MIN.across)
          return { ...refuse3(SENTENCE.recessSmall(f, "counterbore", `narrower than ${CB_MIN.across} mm`, `make it at least ${CB_MIN.across} across`), "G-RECESSMIN"), probe: probeInfo };
        if (cbx.depth < CB_MIN.depth)
          return { ...refuse3(SENTENCE.recessSmall(f, "counterbore", `shallower than ${CB_MIN.depth} mm`, `make it at least ${CB_MIN.depth} deep`), "G-RECESSMIN"), probe: probeInfo };
        if ((cbx.diameter - f.diameter) / 2 < CB_MIN.ring - 1e-12 && cbx.diameter > f.diameter)
          return { ...refuse3(SENTENCE.recessSmall(f, "counterbore", `less than ${CB_MIN.ring} mm wider than the hole on each side`, `make it at least ${+(f.diameter + 2 * CB_MIN.ring).toFixed(4)} across`), "G-RECESSMIN"), probe: probeInfo };
      } else if (csx) {
        if (f.diameter < CS_MIN.bore)
          return { ...refuse3(SENTENCE.recessSmall(f, "countersink", `on a hole narrower than ${CS_MIN.bore} mm`, `make the hole at least ${CS_MIN.bore} across`), "G-RECESSMIN"), probe: probeInfo };
        if ((csx.diameter - f.diameter) / 2 < CS_MIN.ring - 1e-12 && csx.diameter > f.diameter)
          return { ...refuse3(SENTENCE.recessSmall(f, "countersink", `less than ${CS_MIN.ring} mm wider than the hole on each side`, `make it at least ${+(f.diameter + 2 * CS_MIN.ring).toFixed(4)} across`), "G-RECESSMIN"), probe: probeInfo };
      }
    }
    if (!off.has("G-NEST")) {
      const perpN = [0, 1, 2].filter((k) => k !== ai);
      for (let cur = G.byId[f.target], seenN = /* @__PURE__ */ new Set(); cur && cur.kind === "hole" && !seenN.has(cur.id); cur = G.byId[cur.target]) {
        seenN.add(cur.id);
        if ((cur.axis ?? "z") !== axis)
          continue;
        const ch = H(cur);
        const cc = [0, 1, 2].map((i) => bc[i] + ch.center[i]);
        if (cc[ai] + ch.depth / 2 < hi - 1e-9)
          continue;
        const rTop = Math.max(ch.diameter, ch.counterbore?.diameter ?? 0, ch.countersink?.diameter ?? 0) / 2;
        const os = ch.corners ? [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy]) => [cc[0] + sx * ch.corners.dx, cc[1] + sy * ch.corners.dy, cc[2]]) : [cc];
        for (const o of os)
          for (const c of centres)
            if (Math.hypot(...perpN.map((k) => c[k] - o[k])) < rTop - 1e-9)
              return { ...refuse3(SENTENCE.recessNest(f, recess, `the hole of ${cur.id}`), "G-NEST"), probe: probeInfo };
      }
    }
    if (!through && Math.abs(toolTop - hi) > 1e-9)
      return { ...refuse3(SENTENCE.recessCavity(f, recess), "G-RECESS"), probe: probeInfo };
    const cb = f.counterbore;
    const cs = f.countersink;
    const D = (cb ?? cs).diameter;
    if (!off.has("G-RECESS") && !(D > f.diameter + 1e-12))
      return { ...refuse3(SENTENCE.recessNarrow(f, cb ? "counterbore" : "countersink"), "G-RECESS"), probe: probeInfo };
    const holeDepth = through ? T : f.depth;
    if (!off.has("G-RECESS") && cb && !(through ? cb.depth <= T + 1e-9 : cb.depth < holeDepth - 1e-9)) {
      return { ...refuse3(SENTENCE.cbDeep(f, cb.depth, holeDepth, through ? "part" : "hole"), "G-RECESS"), probe: probeInfo };
    }
    if (!off.has("G-RECESS") && cb && cb.depth <= 0)
      return { ...refuse3(SENTENCE.cbDeep(f, cb.depth, holeDepth, "hole"), "G-RECESS"), probe: probeInfo };
    let need = null;
    if (cs && !through) {
      need = csToolDepth(f.diameter, cs.diameter, cs.angleDeg) + CS_MARGIN;
      if (!off.has("G-CSBAND") && holeDepth < need)
        return { ...refuse3(SENTENCE.csBand(f, need, holeDepth), "G-CSBAND"), probe: { ...probeInfo, need } };
    }
    const cmds2 = centres.map((c) => {
      const params = { position: c.map((v, i) => i === ai ? hi : v), diameter: f.diameter, body: bs[0] };
      if (!through)
        params.depth = holeDepth;
      if (cb)
        Object.assign(params, { type: "counterbore", cb_diameter: cb.diameter, cb_depth: cb.depth });
      else
        Object.assign(params, { type: "countersink", cs_diameter: cs.diameter, cs_angle: `${cs.angleDeg} deg` });
      return { command: "solid.hole", params };
    });
    const isBox = baseMeasure.faces === 6 && !baseMeasure.curved && Math.abs(baseMeasure.volume - (baseMeasure.bbox[3] - baseMeasure.bbox[0]) * (baseMeasure.bbox[4] - baseMeasure.bbox[1]) * (baseMeasure.bbox[5] - baseMeasure.bbox[2])) <= 1e-9 * baseMeasure.volume;
    let expected = null;
    if (isBox) {
      const [p0, p1] = [0, 1, 2].filter((k) => k !== ai);
      const bb = baseMeasure.bbox;
      const bcB = [0, 1, 2].map((i) => (bb[i] + bb[i + 3]) / 2);
      const toolsOf = (h, cs2) => cs2.map((c) => ({ cx: c[p0], cy: c[p1], prof: holeProfile(h, bb[ai + 3], bb[ai], c[ai]) }));
      const centresOfH = (h) => {
        const cc = [0, 1, 2].map((i) => bcB[i] + h.center[i]);
        return h.corners ? [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy]) => [cc[0] + sx * h.corners.dx, cc[1] + sy * h.corners.dy, cc[2]]) : [cc];
      };
      const olds = [];
      for (let cur = G.byId[f.target], seenV = /* @__PURE__ */ new Set(); cur && cur.kind === "hole" && !seenV.has(cur.id); cur = G.byId[cur.target]) {
        seenV.add(cur.id);
        if ((cur.axis ?? "z") === axis)
          olds.push(...toolsOf(H(cur), centresOfH(H(cur))));
      }
      expected = removedVolume(toolsOf(f, centres), olds, [bb[p0], bb[p0 + 3], bb[p1], bb[p1 + 3], bb[ai], bb[ai + 3]]);
    }
    return {
      variants: [cmds2],
      produces: bs,
      consumes: [f.target],
      baseIdx,
      probe: { ...probeInfo, need, expected },
      post: (after, before, env) => commonPost(f, after, before, env, { expected, recess })
    };
  }
  const cmds = centres.map((c) => ({
    command: "solid.cylinder",
    params: { radius: r, height: f.depth, base: c.map((v, i) => v - dir[i] * f.depth / 2), axis: AXN2[axis], operation: "cut", targets: bs }
  }));
  return {
    variants: [cmds],
    produces: bs,
    consumes: [f.target],
    baseIdx,
    probe: probeInfo,
    across,
    post: (after, before, env) => commonPost(f, after, before, env, {}) ?? (across && before && !off.has("G-ACROSS-BOX") && boxOutside(after.bbox, before.bbox) > ACROSS_BOX_MM ? { guard: "G-ACROSS-BOX", refusal: SENTENCE.engine(f) } : null)
  };
}
function flatTopCurved(f, axis, G, centres, bc) {
  let cur = G.byId[f.target];
  const seen = /* @__PURE__ */ new Set();
  while (cur && cur.kind === "hole" && !seen.has(cur.id)) {
    seen.add(cur.id);
    cur = G.byId[cur.target];
  }
  if (!cur)
    return { ok: false, why: "no root found" };
  const ai = AXI[axis];
  const rotate = (v, rot) => {
    let [x, y, z] = v;
    const [rx, ry, rz] = (rot ?? [0, 0, 0]).map((d) => d * PI2 / 180);
    [y, z] = [y * Math.cos(rx) - z * Math.sin(rx), y * Math.sin(rx) + z * Math.cos(rx)];
    [x, z] = [x * Math.cos(ry) + z * Math.sin(ry), -x * Math.sin(ry) + z * Math.cos(ry)];
    [x, y] = [x * Math.cos(rz) - y * Math.sin(rz), x * Math.sin(rz) + y * Math.cos(rz)];
    return [x, y, z];
  };
  if (cur.kind === "cylinder") {
    const d = rotate([0, 0, 1], cur.rotate);
    return { ok: Math.abs(Math.abs(d[ai]) - 1) < 1e-9, root: "cylinder", why: "cylinder axis " + d.map((v) => +v.toFixed(3)) };
  }
  if (cur.kind === "extrude") {
    if (cur.taper || cur.direction || cur.midplane || cur.alongNormal)
      return { ok: false, root: "extrude", why: "tapered or slanted pull" };
    const sk = G.byId[cur.target];
    if (!sk)
      return { ok: false, root: "extrude", why: "no sketch" };
    const n = sk.frame ? (() => {
      const u = sk.frame.u;
      const v = sk.frame.v;
      return [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    })() : PLANE_NORMAL[sk.plane ?? "xy"];
    return { ok: Math.abs(Math.abs(n[ai]) - 1) < 1e-9, root: "extrude", why: "pull normal " + n };
  }
  if (cur.kind === "sphere") {
    const perp = [0, 1, 2].filter((i) => i !== ai);
    return { ok: centres.length === 1 && perp.every((i) => Math.abs(centres[0][i] - bc[i]) < 1e-9), root: "sphere", why: "sphere pole only" };
  }
  return { ok: false, root: cur.kind, why: `a ${cur.kind} has no flat top` };
}
function commonPost(f, after, before, env, { expected, recess }) {
  const off = env.off;
  if (!off.has("G-BODIES") && env.allBodies.length > env.allCountBefore)
    return { guard: "G-BODIES", refusal: SENTENCE.split(f, env.allCountBefore, env.allBodies.length) };
  const other = !off.has("G-OTHERS") && env.allBefore ? othersChanged(after.bodies, env.allBefore, env.allBodies) : null;
  if (other !== null) {
    const part = env.partOf?.(other);
    return { guard: "G-OTHERS", refusal: part ? SENTENCE.others(f, part) : SENTENCE.engine(f) };
  }
  if (!before)
    return null;
  if (!off.has("G-SHELLS") && after.shells > before.shells)
    return { guard: "G-SHELLS", refusal: SENTENCE.shells(f) };
  const curved = after.curved || before.curved;
  const dV = before.volume - after.volume;
  const tol = (curved ? COVER_TOL.curved : COVER_TOL.planar) * before.volume;
  if (!off.has("G-NOOP") && Math.abs(dV) <= tol && !(after.faces > before.faces))
    return { guard: "G-NOOP", refusal: SENTENCE.noop(f) };
  if (!off.has("G-NOOP") && !(after.faces > before.faces) && dV <= tol)
    return { guard: "G-NOOP", refusal: SENTENCE.noop(f) };
  if (expected != null && expected > 1e-9 && !off.has("G-RECESS-VOL") && Math.abs(dV - expected) > RECESS_TOL * expected)
    return { guard: "G-RECESS-VOL", refusal: SENTENCE.recessCheck(f, recess) };
  return null;
}
function rootOf(id, G) {
  let cur = G.byId[id];
  const seen = /* @__PURE__ */ new Set();
  while (cur && cur.kind === "hole" && !seen.has(cur.id)) {
    seen.add(cur.id);
    cur = G.byId[cur.target];
  }
  return cur ?? null;
}
function curvedRootOf(id, G) {
  let cur = G.byId[id];
  const seen = /* @__PURE__ */ new Set();
  while (cur && throughForCurved(cur) && !seen.has(cur.id)) {
    seen.add(cur.id);
    cur = G.byId[cur.target];
  }
  return cur ?? null;
}
function throughForCurved(f) {
  if (f.kind === "hole" || f.kind === "shell" || f.kind === "move" || f.kind === "mirror" || f.kind === "fillet")
    return true;
  return f.kind === "pattern" && f.mode !== "circular";
}
function acrossAllowed(f, curvedRoot, rootF, cv, goesThrough, G) {
  if (!rootF || rootF.id !== curvedRoot.id)
    return false;
  if (f.counterbore || f.countersink || f.corners || !goesThrough)
    return false;
  if (!cv.axis.some((v) => Math.abs(Math.abs(v) - 1) <= 1e-9))
    return false;
  if (curvedRoot.kind === "cylinder")
    return true;
  if (curvedRoot.kind === "extrude") {
    const sk = G.byId[curvedRoot.target];
    const e = curvedRoot;
    return !!sk && sk.shape === "circle" && !e.taper && !e.direction && !e.alongNormal && !e.midplane && !e.reversed && !e.length2 && !e.rotate;
  }
  return false;
}
var ACROSS_BOX_MM = 26e-4;
function boxOutside(a, b) {
  return Math.max(...[0, 1, 2].map((i) => Math.max(b[i] - a[i], a[i + 3] - b[i + 3])));
}
var CROSS_AIR_MARGIN = 0.01;
function rectMeetsPolygon(x0, x1, y0, y1, pts) {
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % n];
    const dx = bx - ax, dy = by - ay;
    let t0 = 0, t1 = 1, hit = true;
    for (const [p, q] of [[-dx, ax - x0], [dx, x1 - ax], [-dy, ay - y0], [dy, y1 - ay]]) {
      if (p === 0) {
        if (q < 0) {
          hit = false;
          break;
        }
        continue;
      }
      const t = q / p;
      if (p < 0) {
        if (t > t1) {
          hit = false;
          break;
        }
        if (t > t0)
          t0 = t;
      } else {
        if (t < t0) {
          hit = false;
          break;
        }
        if (t < t1)
          t1 = t;
      }
    }
    if (hit)
      return true;
  }
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  let inside2 = false;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if (yi > cy !== yj > cy && cx < (xj - xi) * (cy - yi) / (yj - yi) + xi)
      inside2 = !inside2;
  }
  return inside2;
}
function crossInAir(A, B, f, G, m) {
  if (A.a === 2 || B.a === 2)
    return false;
  const root = rootOf(f.target, G);
  if (!root || root.kind !== "extrude" || root.taper || root.direction || root.midplane || root.alongNormal || root.rotate && root.rotate.some((v) => v !== 0))
    return false;
  const sk = G.byId[root.target];
  if (!sk || sk.kind !== "sketch" || (sk.plane ?? "xy") !== "xy" || sk.frame || sk.shape === "circle")
    return false;
  if (sk.geoms && sk.geoms.length || sk.geom && sk.geom.length || sk.rules && sk.rules.length || sk.constraints && sk.constraints.length)
    return false;
  if (Object.keys(sk.bulges ?? {}).length || Object.keys(sk.rounds ?? {}).length)
    return false;
  const pts = sk.points;
  if (!Array.isArray(pts) || pts.length < 3 || !pts.every((p) => Array.isArray(p) && p.length === 2 && p.every((v) => Number.isFinite(v))))
    return false;
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const tol = 1e-6 * Math.max(1, m.bbox[3] - m.bbox[0], m.bbox[4] - m.bbox[1]);
  if (Math.abs(Math.min(...xs) - m.bbox[0]) > tol || Math.abs(Math.max(...xs) - m.bbox[3]) > tol || Math.abs(Math.min(...ys) - m.bbox[1]) > tol || Math.abs(Math.max(...ys) - m.bbox[4]) > tol)
    return false;
  const lo = [0, 0, 0], hi = [0, 0, 0];
  lo[A.a] = B.c[A.a] - B.r - CROSS_AIR_MARGIN;
  hi[A.a] = B.c[A.a] + B.r + CROSS_AIR_MARGIN;
  lo[B.a] = A.c[B.a] - A.r - CROSS_AIR_MARGIN;
  hi[B.a] = A.c[B.a] + A.r + CROSS_AIR_MARGIN;
  return !rectMeetsPolygon(lo[0], hi[0], lo[1], hi[1], pts);
}
var PLANE_NORMAL = { xy: [0, 0, 1], xz: [0, -1, 0], yz: [1, 0, 0] };
var rot3 = (v, rot) => {
  let [x, y, z] = v;
  const [rx, ry, rz] = (rot ?? [0, 0, 0]).map((d) => d * PI2 / 180);
  [y, z] = [y * Math.cos(rx) - z * Math.sin(rx), y * Math.sin(rx) + z * Math.cos(rx)];
  [x, z] = [x * Math.cos(ry) + z * Math.sin(ry), -x * Math.sin(ry) + z * Math.cos(ry)];
  [x, y] = [x * Math.cos(rz) - y * Math.sin(rz), x * Math.sin(rz) + y * Math.cos(rz)];
  return [x, y, z];
};
function curvedAxis(root, G) {
  if (root.kind === "cylinder")
    return { what: "the cylinder", axis: rot3([0, 0, 1], root.rotate), radius: root.radius };
  if (root.kind === "cone")
    return { what: "the cone", axis: rot3([0, 0, 1], root.rotate) };
  if (root.kind === "extrude") {
    const sk = G.byId[root.target];
    const curved = sk && (sk.shape === "circle" || Object.keys(sk.bulges ?? {}).length > 0 || Object.keys(sk.rounds ?? {}).length > 0);
    if (!curved)
      return null;
    if (root.taper || root.direction || root.alongNormal)
      return { what: "the round pad", axis: [0, 0, 0] };
    const n = sk.frame ? (() => {
      const u = sk.frame.u;
      const v = sk.frame.v;
      return [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    })() : PLANE_NORMAL[sk.plane ?? "xy"];
    return { what: "the round pad", axis: root.rotate ? rot3(n, root.rotate) : n };
  }
  return null;
}
var holePlannerNotSync = () => {
  throw new Error("the 'holes' planner set plans a hole asynchronously (its guards cut probe pieces on the engine); use translateDoc, or planHole directly");
};
var HOLES_PROFILE = {
  name: "holes",
  // claiming the 'hole' kind is what makes this profile its owner in a composition; the real planning is planHole, called by the step
  planners: { hole: holePlannerNotSync },
  verifies: false,
  initState(st) {
    st.holes = { chain: {}, allCount: 0, allRows: [], spentS: 0, lastRunS: 0 };
  },
  // wording of the generic loop: the step does not use these, they are the base's so the profile is complete
  depSentence: BASE_PROFILE.depSentence,
  noOutline: BASE_PROFILE.noOutline,
  plannerError: BASE_PROFILE.plannerError,
  kernelRefusal: BASE_PROFILE.kernelRefusal,
  // st.allCount of the original: how many bodies the engine held after the last accepted feature
  onAccepted(st, res) {
    st.holes.allCount = res.measure.bodies.length;
    st.holes.allRows = rowsOf(res);
  },
  result: (st) => ({ spentS: st.holes.spentS }),
  step: holesStep
};

// ../../layer/dist/shell-draft.js
var AXI2 = { x: 0, y: 1, z: 2 };
var DIRV = { "+x": [1, 0, 0], "-x": [-1, 0, 0], "+y": [0, 1, 0], "-y": [0, -1, 0], "+z": [0, 0, 1], "-z": [0, 0, -1] };
var WORD_OF = { "+z": "top", "-z": "bottom", "-y": "front", "+y": "back", "-x": "left", "+x": "right", side: "side" };
var AXWORDS = { x: ["left", "right"], y: ["front", "back"], z: ["top", "bottom"] };
var sweepOf = (fr) => [fr.u[1] * fr.v[2] - fr.u[2] * fr.v[1], fr.u[2] * fr.v[0] - fr.u[0] * fr.v[2], fr.u[0] * fr.v[1] - fr.u[1] * fr.v[0]];
var isZero32 = (v) => !v || v[0] === 0 && v[1] === 0 && v[2] === 0;
var refuse4 = (sentence, status = "refused") => ({ refusal: sentence, status });
var fmt5 = (n) => Number.isInteger(n) ? String(n) : String(+n.toFixed(4));
var FV4 = (f) => f;
var SENTENCE2 = {
  closed: (f, what) => `${f.id} (hollow): a hollow with no open side is only built for a plain box, cylinder or prism, and ${what}, so ${f.id} is shown without it -- add open:'top' (or 'bottom', 'front', 'back', 'left', 'right') to leave one side open.`,
  shellTwice: (f) => `${f.id} (hollow): ${partName(f)} is already hollow and a second hollow is not supported yet, so ${f.id} is shown without it -- give the first hollow the wall you want instead.`,
  afterClosedHollow: (f, what) => `${f.id} (${f.kind === "shell" ? "hollow" : f.kind}): ${what} has no open side, and nothing but a move or a turn can be added to a hollow like that yet, so ${f.id} is shown without it -- apply ${f.id} before the hollow, or open one side of the hollow.`,
  closedFail: (f) => `${f.id} (hollow): a hollow with no open side could not be built for ${partName(f)} with a wall of ${fmt5(f.thickness)}, so ${f.id} is shown without it -- use a different wall, or add open:'top' to leave one side open.`,
  noFaceDrafted: (f, word, dr) => `${f.id} (hollow): the ${word} face was tilted by ${dr.id}, so it can no longer be picked by name and ${f.id} is shown without it -- open a different face, or hollow before drafting.`,
  swallowed: (f, word, name) => `${f.id} (hollow): the ${word} face of ${name} is inside the part after the mirror or join, so ${f.id} is shown without it -- open a face that is still on the outside.`,
  hollowCone: (f) => `${f.id} (hollow): ${partName(f)} has a drafted curved wall (a cone) and a hollow of that is not supported yet, so ${f.id} is shown without it -- leave out either the draft or the hollow.`,
  chamferBox: (f) => `Bevelling every edge of a box at once is not supported, so ${f.id} is shown without it -- bevel the edges one at a time.`,
  chamferCyl: (f) => `${f.id} (hollow): ${partName(f)} has its edges bevelled and a hollow of a bevelled cylinder is not supported yet, so ${f.id} is shown without it -- hollow the plain cylinder, or leave the hollow out.`,
  concave: (f, why) => `Hollowing ${partName(f)} is not supported yet because the part has inside corners (${why}) where the new wall would come out thicker than ${fmt5(f.thickness)}, so ${f.id} is shown without it -- hollow the plain shape first, or leave the hollow out.`,
  blindHole: (f) => `Hollowing ${partName(f)} is not supported yet because the part has a blind hole, whose floor is an inside corner, so ${f.id} is shown without it -- hollow the plain shape first, then drill the hole.`,
  noFlat: (f, word, kind) => `${f.id} (hollow): ${kind === "sphere" ? "a sphere has no flat face to open" : kind === "cone" && word === "top" ? "the top of a cone is a point, not a flat face to open" : `a ${kind} only has flat top and bottom faces, not a ${word} one to open`}, so ${f.id} is shown without it -- use ${kind === "sphere" ? "a box, cylinder or other flat-faced shape" : kind === "cone" ? "open:'bottom'" : "open:'top' or open:'bottom'"}.`,
  // a face with no word (a side of a pulled outline) reads "that face of e2 could not be found ..." (owner-approved text, 2026-11-12; it read "the undefined face of e2")
  noFace: (f, word, why) => `${f.id}${f.kind === "shell" ? " (hollow)" : f.kind === "draft" ? " (draft)" : ""}: ${!word && (why === void 0 || /^was tilted by /.test(why)) ? "that face" : `the ${word} face`} of ${partName(f)} ${why ?? "could not be found on the part as it is now"}, so ${f.id} is shown without it${f.kind === "shell" ? " -- open a different face, or hollow before drafting." : "."}`,
  thickBox: (f, limit) => `Hollowing ${partName(f)} to ${fmt5(f.thickness)} thick would collapse it, so ${f.id} is shown without it -- the wall has to be under ${fmt5(limit)}.`,
  thickGeneric: (f) => `Hollowing ${partName(f)} to ${fmt5(f.thickness)} thick would collapse it, so ${f.id} is shown without it -- use a wall thinner than the depth of the part and than half its narrowest width.`,
  tie: (f, word, kind, n) => `${f.id}: the ${word} face is ambiguous on this ${n ? n + "-sided " : ""}${kind} because two faces are equally far ${word}, so ${f.id} is shown without it -- pick a face that has only one candidate (for example top or bottom), or ${kind === "box" ? "turn the box a little less" : "use a different number of sides"}.`,
  stale: (f, what) => `${f.id}: ${what === "undefined face" ? "that face" : `the ${what}`} cannot be found reliably after the part was turned or copied, so ${f.id} is shown without it -- apply it before turning the part.`,
  // a face with no word: "that face" (owner-approved text, 2026-11-12)
  noPickCsink: (f, word) => `${f.id} (hollow): not supported yet because the ${word} face cannot be picked reliably on a part with a countersink, so ${f.id} is shown without it -- hollow before drilling the countersink.`,
  csinkOpen: (f, hole) => `${f.id} (hollow): not supported yet because ${hole} has a countersink on the face being opened, so ${f.id} is shown without it -- open a different face, or use a plain hole without the countersink.`,
  holeNear: (f, why) => `${f.id} (hollow): not supported yet because a hole would be too close to a wall or to another hole (${why}), so ${f.id} is shown without it -- move the holes apart, or drill after hollowing.`,
  rim: (f, rr, t, style2) => `${f.id} (hollow): the open edge of ${partName(f)} is ${style2 === "chamfer" ? "bevelled by" : "rounded with a radius of"} ${fmt5(rr)}, which is as large as the wall (${fmt5(t)}), so the rim would have no thickness and ${f.id} is shown without it -- make the ${style2 === "chamfer" ? "bevel" : "round"} smaller than the wall.`,
  openAxisEngine: (f) => openAxisEngineSentence(f),
  hollowSide: (f) => `${f.id} (hollow): "side" is the curved wall of a cylinder, not a flat face, so ${f.id} is shown without it -- open top or bottom instead.`,
  cap: (f, word, why = {}) => {
    const fa = ["right", "left"].includes(word) ? "x" : ["front", "back"].includes(word) ? "y" : "z";
    const others = Object.entries(AXWORDS).filter(([a]) => a !== fa).flatMap(([, w]) => w);
    const pull = why.pull ?? "z";
    const list = `${others.slice(0, -1).join(", ")} or ${others.at(-1)}`;
    const advice = why.fromWord ? `set from: to ${list}${fa !== "z" ? " (or leave from: out)" : ""} so the pull no longer points along the ${word} face` : `draft a side face, or set from: to ${list} so the pull no longer points along the ${word} face`;
    return `${f.id} (draft): the ${word} face is square to the pull direction (${pull}${why.fromWord ? `, set by from:'${why.fromWord}'` : ""}), so it cannot be tilted, and ${f.id} is shown without it -- ${advice}.`;
  },
  angleRange: (f, max) => `${f.id} (draft): a draft angle of ${fmt5(f.angle)} degrees is too steep, so ${f.id} is shown without it -- keep it between -${max} and ${max} degrees.`,
  vanish: (f) => `Tilting ${f.id} at ${fmt5(f.angle)} degrees would not fit because the tilted face would run into another face of the part, so ${f.id} is shown without it -- use a smaller angle.`,
  twice: (f) => `${f.id} (draft): that face was already drafted, so ${f.id} is shown without it -- draft it once with the angle you want.`,
  fromStale: (f, word, got, want) => `${f.id} (draft): from:'${word}' would put the neutral plane at ${fmt5(got)}, but the ${word} of this part is at ${fmt5(want)} now (the part was moved, joined or turned), so ${f.id} is shown without it -- give the plane yourself, for example neutral: ${fmt5(want)}.`,
  wholeChanged: (f, what) => `${f.id} (draft): drafting a whole shape is only built for a plain box, prism, wedge, cylinder or extruded outline (optionally moved), and ${partName(f)} has been changed by ${what}, so ${f.id} is shown without it -- draft the shape before ${what === "a hollow" ? "hollowing it" : "that step"}, or draft one face at a time.`,
  wholeHollow: (f) => `${f.id} (draft): drafting a whole shape that is hollow is not supported yet, so ${f.id} is shown without it -- draft the shape first and hollow it afterwards.`,
  wholeDrafted: (f) => `${f.id} (draft): ${partName(f)} already has a drafted face, so drafting the whole shape as well is not supported yet and ${f.id} is shown without it -- draft the whole shape first, or draft the faces one at a time.`,
  wholeCone: (f) => `${f.id} (draft): the sloping side of a cone is not parallel to the pull direction, so it cannot be drafted and ${f.id} is shown without it -- draft a box, prism or cylinder instead.`,
  wholeSphere: (f) => `${f.id} (draft): a sphere has no side faces to draft, so ${f.id} is shown without it -- draft a box, prism, cylinder or other shape with straight sides.`,
  wholeAxis: (f, kind, axis) => `${f.id} (draft): the sides of this ${kind} are not parallel to the ${axis} pull direction, so ${f.id} is shown without it -- pull along the ${kind === "cylinder" ? "cylinder's own axis" : "axis the sides run along"} (usually z), for example with from:'top' or from:'bottom'.`,
  outlineCrosses: (f) => `${f.id} (draft): the outline of ${partName(f)} touches or crosses itself, so its sides cannot be drafted and ${f.id} is shown without it -- fix the outline first.`,
  wholeShape: (f, kind) => `${f.id} (draft): drafting a whole shape is not built for ${kind} yet, so ${f.id} is shown without it -- draft a plain box, prism, wedge, cylinder or extruded outline, or draft one face at a time.`,
  sphereFace: (f) => `${f.id} (draft): a sphere has no flat face to draft, so ${f.id} is shown without it -- draft a box, prism or other shape with flat sides.`,
  curvedFace: (f, word) => `${f.id} (draft): the curved side of a cylinder cannot be picked for a draft yet, so ${f.id} is shown without it -- draft a flat face instead.`,
  squareNeighbours: (f) => `${f.id} (draft): the faces next to the one you are drafting must be square to the pull direction and the wall of a hole or a round cut into that face is not, so ${f.id} is shown without it -- draft the plain face first, then add the hole or round.`,
  tiltedNeighbour: (f) => `${f.id} (draft): the face next to the one you are drafting was already tilted by an earlier draft and this part cannot take a second tilted neighbour, so ${f.id} is shown without it -- draft one face of it, or draft the faces of a plain box one after another.`,
  engineDraft: (f) => `${f.id} (draft): this face of ${partName(f)} could not be drafted at ${fmt5(f.angle)} degrees, so ${f.id} is shown without it -- try a smaller angle or a different face.`,
  noOpposite: (f) => `${f.id} (draft): the face could not be found on the part as it is now, so ${f.id} is shown without it.`,
  unverified: (f) => `Tilting ${f.id} at ${fmt5(f.angle)} degrees could not be checked against a smaller tilt of the same face, so ${f.id} is shown without it -- use a smaller angle.`
};
function plainEngineText(raw, f, ctx = {}) {
  const r = String(raw);
  if (f.kind === "shell") {
    const rim = /round of radius ([\d.]+) mm.*shell is ([\d.]+) mm/i.exec(r);
    if (rim)
      return SENTENCE2.rim(f, +rim[1], +rim[2], void 0);
    if (/collapse|implausible result volume|enclose a solid|corner whose faces|no thickness|not oriented and closed/i.test(r))
      return SENTENCE2.thickGeneric(f);
    if (/select at least one face|faces. must be a list of points|no face at/i.test(r))
      return ctx.drafted ? SENTENCE2.noFaceDrafted(f, WORD_OF[f.open?.part] ?? "open", ctx.drafted) : SENTENCE2.noFace(f, WORD_OF[f.open?.part] ?? "open");
    return SENTENCE2.openAxisEngine(f);
  }
  if (f.kind === "draft") {
    if (/angle must be between/i.test(r))
      return SENTENCE2.angleRange(f, 89);
    if (/parallel to the pull/i.test(r))
      return SENTENCE2.cap(f, WORD_OF[f.face?.part] ?? "flat", { pull: f.pull });
    if (/square to the pull/i.test(r))
      return SENTENCE2.squareNeighbours(f);
    if (/no faces? to draft|no face at/i.test(r))
      return SENTENCE2.noOpposite(f);
    return SENTENCE2.engineDraft(f);
  }
  return null;
}
var FRAG = /solidcraft refused it -- (.*)$/s;
function sanitize(s, fById) {
  const m = FRAG.exec(s);
  if (!m)
    return s;
  const id = /^([A-Za-z]+\d+) \(/.exec(s)?.[1];
  const f = fById[id];
  return f ? plainEngineText(m[1], f) ?? `${id} (${f.kind}): this step could not be built on the parts before it, so ${id} is shown without it.` : `This step could not be built, so it is shown without it.`;
}
function polyConvex(pts, bulges) {
  if (!pts || pts.length < 3)
    return false;
  if (bulges && Object.values(bulges).some((g) => g))
    return false;
  let sign = 0;
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n], c = pts[(i + 2) % n];
    const cr = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
    if (Math.abs(cr) < 1e-12)
      continue;
    if (sign === 0)
      sign = Math.sign(cr);
    else if (Math.sign(cr) !== sign)
      return false;
  }
  return true;
}
function convexity(id, byId, arc, holeExt = {}) {
  const seen = /* @__PURE__ */ new Set();
  const go = (cur) => {
    if (seen.has(cur))
      return { convex: false, why: "a loop in the history" };
    seen.add(cur);
    const f = byId[cur];
    if (!f)
      return { convex: false, why: `an unknown feature ${cur}` };
    switch (f.kind) {
      case "box":
      case "cylinder":
      case "sphere":
      case "cone":
      case "prism":
      case "wedge":
        return { convex: true };
      case "torus":
        return { convex: false, why: "a ring has a hole through its middle" };
      case "move":
        return f.copy ? { convex: false, why: "a copy" } : go(f.target);
      case "rotate":
      case "draft":
        return go(f.target);
      case "fillet":
        return go(f.target);
      case "extrude": {
        const sk = byId[f.target];
        if (!sk)
          return { convex: false, why: "a sketch that is missing" };
        if (sk.shape === "circle")
          return { convex: true };
        let o;
        try {
          o = arc.outlineOf(sk);
        } catch {
          o = { ok: false };
        }
        if (!o.ok)
          return { convex: false, why: "a sketch outline that could not be read" };
        return polyConvex(o.points, o.bulges) ? { convex: true } : { convex: false, why: "an extruded outline with an inside corner or an arc" };
      }
      case "hole": {
        const t = go(f.target);
        if (!t.convex)
          return t;
        const ax = AXI2[f.axis ?? "z"];
        const ext = holeExt[f.id]?.[ax];
        const along = Math.abs((f.center ?? [0, 0, 0])[ax]);
        return ext !== void 0 && f.depth / 2 - along >= ext / 2 - 1e-9 ? { convex: true, holes: true } : { convex: false, why: "a blind hole (its floor is an inside corner)" };
      }
      case "shell":
        return { convex: false, why: "it is already hollow" };
      case "combine":
        return { convex: false, why: f.op === "union" ? "a join" : f.op === "subtract" ? "a cut" : "a keep-overlap" };
      case "pocket":
      case "groove":
        return { convex: false, why: "a pocket or groove" };
      case "mirror":
        return { convex: false, why: "a mirror" };
      case "pattern":
        return { convex: false, why: "repeated copies" };
      case "revolve":
      case "blend":
        return { convex: false, why: "a revolved or lofted body" };
      default:
        return { convex: false, why: `a ${f.kind}` };
    }
  };
  return go(id);
}
function hops(fromId, toId, byId) {
  const out = [];
  let cur = toId;
  const seen = /* @__PURE__ */ new Set();
  while (cur && cur !== fromId && !seen.has(cur)) {
    seen.add(cur);
    const f = byId[cur];
    if (!f)
      return null;
    out.push(f);
    cur = f.kind === "combine" ? f.targets?.[0] : f.target;
  }
  return cur === fromId ? out.reverse() : null;
}
var rootOf2 = (id, byId) => {
  let cur = id;
  const seen = /* @__PURE__ */ new Set();
  while (cur && !seen.has(cur)) {
    seen.add(cur);
    const f = byId[cur];
    if (!f)
      return null;
    if (["box", "cylinder", "sphere", "cone", "prism", "wedge", "torus", "extrude", "revolve", "blend"].includes(f.kind))
      return f;
    cur = f.kind === "combine" ? f.targets?.[0] : f.target;
  }
  return null;
};
function rotPt(p, r) {
  let [x, y, z] = p;
  const R = (a) => [Math.cos(a * Math.PI / 180), Math.sin(a * Math.PI / 180)];
  if (r?.[0]) {
    const [c, s] = R(r[0]);
    [y, z] = [c * y - s * z, s * y + c * z];
  }
  if (r?.[1]) {
    const [c, s] = R(r[1]);
    [x, z] = [c * x + s * z, -s * x + c * z];
  }
  if (r?.[2]) {
    const [c, s] = R(r[2]);
    [x, y] = [c * x - s * y, s * x + c * y];
  }
  return [x, y, z];
}
var polyCentroid = (pts) => {
  let a = 0, cx = 0, cy = 0;
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const p = pts[i], q = pts[(i + 1) % n];
    const k = p[0] * q[1] - q[0] * p[1];
    a += k;
    cx += (p[0] + q[0]) * k;
    cy += (p[1] + q[1]) * k;
  }
  return Math.abs(a) < 1e-12 ? [pts[0][0], pts[0][1]] : [cx / (3 * a), cy / (3 * a)];
};
function wordTie(root, part, byId, arc, mt) {
  const dir = DIRV[part];
  if (!dir || !root)
    return null;
  let poly = null, n = null;
  const kind = root.kind;
  if (root.kind === "prism") {
    n = Math.max(3, Math.min(12, Math.round(root.sides)));
    const nn = n;
    poly = Array.from({ length: nn }, (_, i) => [root.radius * Math.cos(2 * Math.PI * i / nn), root.radius * Math.sin(2 * Math.PI * i / nn)]);
  } else if (root.kind === "box") {
    if (isZero32(root.rotate))
      return null;
    const [w, d, h] = root.size.map((v) => v / 2);
    const c2 = root.center ?? [0, 0, 0];
    const centres2 = [[w, 0, 0], [-w, 0, 0], [0, d, 0], [0, -d, 0], [0, 0, h], [0, 0, -h]].map((p) => {
      const q = rotPt(p, root.rotate);
      return [q[0] + c2[0], q[1] + c2[1], q[2] + c2[2]];
    });
    return tieOf(centres2, dir, "box", null);
  } else if (root.kind === "wedge") {
    poly = [[-root.width / 2, -root.depth / 2], [root.width / 2, -root.depth / 2], [-root.width / 2, root.depth / 2]];
  } else if (root.kind === "extrude") {
    const sk = byId[root.target];
    if (!sk || sk.shape === "circle")
      return null;
    let o;
    try {
      o = arc.outlineOf(sk);
    } catch {
      return null;
    }
    if (!o.ok || o.bulges && Object.values(o.bulges).some(Boolean))
      return null;
    const fr = mt.sketchFrameOf(sk);
    const to3 = (p) => [0, 1, 2].map((i) => fr.origin[i] + fr.u[i] * p[0] + fr.v[i] * p[1]);
    const h = root.height;
    const sw = sweepOf(fr);
    const centres2 = [];
    const P = o.points;
    for (let i = 0; i < P.length; i++) {
      const a = to3(P[i]), b = to3(P[(i + 1) % P.length]);
      centres2.push([0, 1, 2].map((k) => (a[k] + b[k]) / 2 + sw[k] * h / 2));
    }
    const c0 = polyCentroid(P);
    centres2.push(to3(c0), to3(c0).map((v, k) => v + sw[k] * h));
    return tieOf(centres2, dir, kind, null);
  } else
    return null;
  const c = root.center ?? [0, 0, 0];
  const centres = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    centres.push([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 0]);
  }
  const cc = polyCentroid(poly);
  centres.push([cc[0], cc[1], root.height / 2], [cc[0], cc[1], -root.height / 2]);
  const moved2 = centres.map((p) => {
    const q = rotPt(p, root.rotate);
    return [q[0] + c[0], q[1] + c[1], q[2] + c[2]];
  });
  return tieOf(moved2, dir, kind, n);
}
function tieOf(centres, dir, kind, n) {
  const sc = centres.map((p) => p[0] * dir[0] + p[1] * dir[1] + p[2] * dir[2]);
  const best = Math.max(...sc);
  const top = sc.filter((v) => Math.abs(v - best) <= 1e-7);
  return top.length > 1 ? { kind, n, ties: top.length } : null;
}
function draftFromUsage(script) {
  const out = [];
  const re = /\bdraft\s*\(/g;
  let m;
  while (m = re.exec(script)) {
    let depth = 1, i = re.lastIndex;
    while (i < script.length && depth > 0) {
      const ch = script[i++];
      if (ch === "(")
        depth++;
      else if (ch === ")")
        depth--;
    }
    const body = script.slice(re.lastIndex, i - 1);
    out.push({ from: /\bfrom\s*:\s*['"]([a-z]+)['"]/.exec(body)?.[1] ?? null, neutral: /\bneutral\s*:/.test(body) });
  }
  return out;
}
var LO_WORD = { x: "left", y: "front", z: "bottom" };
var HI_WORD = { x: "right", y: "back", z: "top" };
var KEEPS_ROOT = /* @__PURE__ */ new Set(["move", "rotate", "mirror", "pattern", "hole", "shell", "fillet", "draft"]);
function interpreterExtreme(doc, byId, rootId, axis, lo, mt) {
  const f = byId[rootId];
  if (f?.kind === "extrude") {
    const r = mt.featureRangeAlong?.(doc, rootId, axis);
    return r && r.exact ? lo ? r.lo : r.hi : 0;
  }
  const half = mt.extentAlong(doc, rootId, axis);
  const center = f && ["box", "cylinder", "sphere", "cone", "torus"].includes(f.kind) ? f.center?.[AXI2[axis]] ?? 0 : 0;
  if (half == null)
    return 0;
  return lo ? center - half / 2 : center + half / 2;
}
function fromUsageOfDoc(doc, opts) {
  const byId = Object.fromEntries(doc.features.map((x) => [x.id, FV4(x)]));
  return doc.features.filter((x) => x.kind === "draft").map((x) => {
    const f = FV4(x);
    if (typeof f.neutralFrom === "string")
      return { from: f.neutralFrom, neutral: false };
    if (opts.recorded)
      return { from: null, neutral: false };
    if (!opts.mt)
      throw new Error("fromUsageOfDoc: recorded: false needs mt (the model-types module) to read the root extents");
    let rootId;
    if (f.face && f.face.cause === "primitive")
      rootId = f.face.feature;
    else {
      let cur = byId[f.target];
      const seen = /* @__PURE__ */ new Set();
      while (cur && KEEPS_ROOT.has(cur.kind) && cur.target && !seen.has(cur.id)) {
        seen.add(cur.id);
        cur = byId[cur.target];
      }
      rootId = cur?.id;
    }
    const axis = f.pull ?? "z";
    const maybe = [];
    if (rootId)
      for (const lo of [true, false]) {
        const v = interpreterExtreme(doc, byId, rootId, axis, lo, opts.mt);
        if (Math.abs(v - f.neutral) <= 1e-9 * Math.max(1, Math.abs(v)))
          maybe.push(lo ? LO_WORD[axis] : HI_WORD[axis]);
      }
    return { from: null, neutral: false, ...maybe.length ? { maybe } : {} };
  });
}
function voidedDep(f, st) {
  const ids = new Set(Object.keys(st.shellDraft.voided));
  if (!ids.size)
    return null;
  let hit = null;
  const walk = (v, key) => {
    if (hit)
      return;
    if (typeof v === "string") {
      if (key !== "id" && ids.has(v))
        hit = v;
    } else if (Array.isArray(v))
      v.forEach((x) => walk(x, key));
    else if (v && typeof v === "object")
      for (const [k, x] of Object.entries(v))
        walk(x, k);
  };
  walk(f, "");
  return hit ? `the hollow ${hit}` : null;
}
function aggregateOf2(res, names) {
  const bs = res.measure.bodies.filter((b) => names.includes(b.name));
  if (!bs.length)
    return null;
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  for (const b of bs)
    for (let i = 0; i < 3; i++) {
      lo[i] = Math.min(lo[i], b.bbox.min[i]);
      hi[i] = Math.max(hi[i], b.bbox.max[i]);
    }
  return {
    volume: bs.reduce((s, b) => s + b.volume_mm3, 0),
    faces: bs.reduce((s, b) => s + b.faces, 0),
    kernelFaces: bs.reduce((s, b) => s + b.kernel.faces, 0),
    curved: bs.some((b) => Object.keys(b.face_types ?? {}).some((k) => k !== "plane")),
    bbox: [...lo, ...hi],
    faceTypes: bs.reduce((a, b) => {
      for (const [k, v] of Object.entries(b.face_types ?? {}))
        a[k] = (a[k] ?? 0) + v;
      return a;
    }, {}),
    com: [0, 1, 2].map((i) => bs.reduce((a, b) => a + b.volume_mm3 * b.center_of_mass[i], 0) / bs.reduce((a, b) => a + b.volume_mm3, 0)),
    bodies: bs.map((b) => b.name)
  };
}
var NO_PICK_POINT = /but there is no safe pick point/;
async function pickPoints(f, name, st, G, { gridOnHole, boxResult: opts_boxResult = false }) {
  const root = byId0(G, name.feature);
  const { r, raw } = await G.pickAt(name);
  const chain = hops(name.feature, f.target, G.byId);
  const withRaw = (err) => raw === void 0 ? { err } : { err, raw };
  if (!r || r.kind !== "face") {
    const word = WORD_OF[name.part] ?? name.part;
    const dr = (chain ?? []).find((h) => h.kind === "draft" && (h.face?.feature === name.feature && h.face?.part === name.part || h.whole && DIRV[name.part] && DIRV[name.part][AXI2[h.pull ?? "z"]] === 0));
    if (dr)
      return withRaw(f.kind === "shell" ? SENTENCE2.noFaceDrafted(f, word, dr) : SENTENCE2.noFace(f, word, `was tilted by ${dr.id}`));
    if (root?.kind === "sphere")
      return withRaw(SENTENCE2.noFace(f, word, "does not exist (a sphere has no flat faces)"));
    if (f.kind === "shell" && raw !== void 0 && NO_PICK_POINT.test(raw)) {
      for (let cur = G.headOf(f.target), seen = /* @__PURE__ */ new Set(); cur && !seen.has(cur); ) {
        seen.add(cur);
        const h = G.byId[cur];
        if (!h)
          break;
        if (h.kind === "hole" && h.countersink)
          return withRaw(SENTENCE2.noPickCsink(f, word));
        cur = h.kind === "combine" ? h.targets?.[0] : h.target;
      }
    }
    return withRaw(SENTENCE2.noFace(f, word));
  }
  if (!chain)
    return withRaw(SENTENCE2.stale(f, `${WORD_OF[name.part] ?? "chosen"} face`));
  let shift = [0, 0, 0];
  for (const h of chain) {
    if (h.kind === "move") {
      if (h.copy)
        return withRaw(SENTENCE2.stale(f, `${WORD_OF[name.part]} face`));
      shift = shift.map((v, i) => v + h.offset[i]);
    } else if (["shell", "draft", "hole", "fillet"].includes(h.kind))
      continue;
    else if (opts_boxResult && (h.kind === "mirror" || h.kind === "combine" && h.op === "union"))
      continue;
    else
      return withRaw(SENTENCE2.stale(f, `${WORD_OF[name.part]} face`));
  }
  const base = r.centroid.map((v, i) => v + (r.current ? 0 : shift[i]));
  const pts = [base];
  const m = st.measure[G.headOf(f.target)] ?? st.measure[f.target];
  const dir = DIRV[name.part];
  const tilt = root && !isZero32(root.rotate) && root.rotate.some((a) => a % 90 !== 0);
  if (dir && m && !tilt) {
    const ax = dir.findIndex((v) => v !== 0);
    const ext = dir[ax] > 0 ? m.bbox[ax + 3] : m.bbox[ax];
    const scale2 = Math.max(1, Math.abs(ext));
    const rootBox = root && ["box"].includes(root.kind);
    if (rootBox || root && ["extrude"].includes(root.kind)) {
      if (Math.abs(base[ax] - ext) > 1e-6 * scale2 && !chain.some((h) => h.kind === "draft"))
        return withRaw(opts_boxResult ? SENTENCE2.swallowed(f, WORD_OF[name.part], name.feature) : SENTENCE2.stale(f, `${WORD_OF[name.part]} face`));
    }
    if (gridOnHole && rootBox) {
      const o = [0, 1, 2].filter((i) => i !== ax);
      for (const [a, b] of [[0.5, 0.5], [0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75], [0.1, 0.5], [0.9, 0.5], [0.5, 0.1], [0.5, 0.9]]) {
        const p = [0, 0, 0];
        p[ax] = ext;
        p[o[0]] = m.bbox[o[0]] + a * (m.bbox[o[0] + 3] - m.bbox[o[0]]);
        p[o[1]] = m.bbox[o[1]] + b * (m.bbox[o[1] + 3] - m.bbox[o[1]]);
        pts.push(p);
      }
    }
  }
  return { pts, shift, root, current: r.current === true };
}
var byId0 = (G, id) => rootOf2(id, G.byId);
function isPlainBox(m) {
  if (!m || m.faces !== 6 || (m.faceTypes?.plane ?? 0) !== 6)
    return false;
  const bv = (m.bbox[3] - m.bbox[0]) * (m.bbox[4] - m.bbox[1]) * (m.bbox[5] - m.bbox[2]);
  return Math.abs(m.volume - bv) <= 1e-9 * Math.max(bv, 1);
}
function onlyBoxJoins(id, byId) {
  const seen = /* @__PURE__ */ new Set();
  for (let cur = id; cur && !seen.has(cur); ) {
    seen.add(cur);
    const h = byId[cur];
    if (!h)
      return false;
    if (h.kind === "box")
      return !h.round;
    if (h.kind === "mirror" || h.kind === "move" && !h.copy)
      cur = h.target;
    else if (h.kind === "combine" && h.op === "union")
      cur = h.targets?.[0];
    else
      return false;
  }
  return false;
}
var KIND_NAME = { cone: "cone", wedge: "wedge", torus: "ring", extrude: "extruded outline", revolve: "revolved shape", blend: "lofted shape", box: "box", cylinder: "cylinder", sphere: "sphere", prism: "prism" };
var HOP_NAME = { combine: "a join or cut", fillet: "a round or bevel", hole: "a hole", draft: "a draft", mirror: "a mirror", pattern: "repeated copies", pocket: "a pocket", groove: "a groove", rotate: "a turn", shell: "a hollow", move: "a copy" };
function planClosedShell(f, st, ctx, G, bs) {
  const head = G.headOf(f.target);
  if (st.shellDraft.voided[head] || G.byId[head]?.kind === "shell")
    return { ...refuse4(SENTENCE2.shellTwice(f)), guard: "G-TWICE" };
  const why = (w) => ({ ...refuse4(SENTENCE2.closed(f, w)), guard: "G-CLOSED" });
  const root = rootOf2(f.target, G.byId);
  if (!root)
    return why(`${partName(f)} has a history this cannot follow`);
  if (!["box", "cylinder", "sphere", "prism"].includes(root.kind))
    return why(`${partName(f)} is made from ${/^[aeiou]/.test(KIND_NAME[root.kind] ?? root.kind) ? "an" : "a"} ${KIND_NAME[root.kind] ?? root.kind}`);
  const chain = hops(root.id, f.target, G.byId);
  if (!chain)
    return why(`${partName(f)} has a history this cannot follow`);
  const bad2 = chain.find((h) => !(h.kind === "move" && !h.copy));
  if (bad2)
    return why(`${partName(f)} has been changed by ${HOP_NAME[bad2.kind] ?? `a ${bad2.kind}`}`);
  if (root.round)
    return { ...refuse4(root.kind === "cylinder" && root.roundStyle === "chamfer" ? SENTENCE2.chamferCyl(f) : SENTENCE2.closed(f, `${partName(f)} has rounded or bevelled edges`)), guard: "G-CLOSED" };
  const t = f.thickness;
  const clone = (o) => ({ ...root, id: `${f.id}_in`, ...o });
  let inner, vInner, limit, curved = false;
  if (root.kind === "box") {
    limit = Math.min(...root.size) / 2;
    const sz = root.size.map((v) => v - 2 * t);
    if (t >= limit - 1e-9)
      return { ...refuse4(SENTENCE2.thickBox(f, limit)), guard: "G-THICK" };
    inner = clone({ size: sz });
    vInner = sz[0] * sz[1] * sz[2];
  } else if (root.kind === "cylinder") {
    limit = Math.min(root.radius, root.height / 2);
    curved = true;
    if (t >= limit - 1e-9)
      return { ...refuse4(SENTENCE2.thickBox(f, limit)), guard: "G-THICK" };
    inner = clone({ radius: root.radius - t, height: root.height - 2 * t });
    vInner = Math.PI * (root.radius - t) ** 2 * (root.height - 2 * t);
  } else if (root.kind === "sphere") {
    limit = root.radius;
    curved = true;
    if (t >= limit - 1e-9)
      return { ...refuse4(SENTENCE2.thickBox(f, limit)), guard: "G-THICK" };
    inner = clone({ radius: root.radius - t });
    vInner = 4 / 3 * Math.PI * (root.radius - t) ** 3;
  } else {
    const n = Math.max(3, Math.min(12, Math.round(root.sides)));
    const ap = root.radius * Math.cos(Math.PI / n);
    limit = Math.min(root.height / 2, ap);
    if (t >= limit - 1e-9)
      return { ...refuse4(SENTENCE2.thickBox(f, limit)), guard: "G-THICK" };
    const R2 = root.radius - t / Math.cos(Math.PI / n);
    inner = clone({ radius: R2, height: root.height - 2 * t });
    vInner = n / 2 * R2 * R2 * Math.sin(2 * Math.PI / n) * (root.height - 2 * t);
  }
  const ip = planFeature(inner, st, ctx, BASE_PROFILE);
  if (ip.refusal)
    return refuse4(SENTENCE2.closedFail(f));
  const innerName = ip.produces[0];
  const cmds = [...ip.variants[0]];
  for (const h of chain)
    cmds.push({ command: "solid.move", params: { bodies: [innerName], translate: h.offset } });
  cmds.push({ command: "solid.combine", params: { target: bs[0], tools: [innerName], operation: "cut" } });
  return {
    variants: [cmds],
    produces: bs,
    consumes: [f.target],
    voided: true,
    pickedFrom: "none (outer solid minus an inner copy of the primitive)",
    plain: () => SENTENCE2.closedFail(f),
    post: (after, before) => {
      if (!before)
        return null;
      const want = before.volume - vInner;
      const tol = curved || before.curved ? 5e-4 : 1e-9;
      if (Math.abs(after.volume - want) > tol * Math.max(before.volume, 1) || !(after.faces >= 2 * before.faces - (root.kind === "sphere" ? 1 : 0)) || after.bodies.length !== 1)
        return { guard: "G-CLOSED", refusal: SENTENCE2.closedFail(f) };
      return null;
    }
  };
}
async function planShell(f, st, ctx, G) {
  const dep = (id) => {
    id = G.headOf(id);
    if (st.refused[id])
      return `${f.id} (hollow): it needs ${id}, which could not be built, so ${f.id} is shown without it.`;
    if (st.stale[id])
      return `${f.id} (hollow): ${id} was already changed by ${st.stale[id]}, so ${f.id} is shown without it.`;
    return null;
  };
  const d = dep(f.target);
  if (d)
    return refuse4(d);
  const bs = st.bodies[G.headOf(f.target)];
  if (!bs || bs.length !== 1)
    return refuse4(`${f.id} (hollow): ${partName(f)} is not a single solid, so ${f.id} is shown without it.`);
  if (!f.open)
    return planClosedShell(f, st, ctx, G, bs);
  let cv = convexity(G.headOf(f.target), G.byId, ctx.arc, G.holeExt);
  let boxResult = false;
  if (!cv.convex && /^a (mirror|join)$/.test(cv.why)) {
    const m0 = st.measure[G.headOf(f.target)];
    const root0 = rootOf2(f.open.feature, G.byId);
    if (m0 && root0?.kind === "box" && isZero32(root0.rotate) && isPlainBox(m0) && onlyBoxJoins(G.headOf(f.target), G.byId)) {
      cv = { convex: true, boxResult: true };
      boxResult = true;
    }
  }
  if (!cv.convex && /^it is already hollow/.test(cv.why))
    return { ...refuse4(SENTENCE2.shellTwice(f)), guard: "G-TWICE" };
  if (!cv.convex && /^a blind hole/.test(cv.why))
    return { ...refuse4(SENTENCE2.blindHole(f)), guard: "G-BLIND" };
  if (!cv.convex)
    return { ...refuse4(SENTENCE2.concave(f, cv.why)), guard: "G-CONVEX" };
  const part = f.open.part;
  if (part === "side")
    return refuse4(SENTENCE2.hollowSide(f));
  const root = rootOf2(f.open.feature, G.byId);
  const tie = wordTie(root, part, G.byId, ctx.arc, ctx.mt);
  if (tie)
    return { ...refuse4(SENTENCE2.tie(f, WORD_OF[part], tie.kind, tie.n)), guard: "G-TIE" };
  if (root && ["sphere", "cylinder", "cone"].includes(root.kind) && isZero32(root.rotate)) {
    const flat = root.kind === "sphere" ? [] : root.kind === "cone" ? ["-z"] : ["+z", "-z"];
    if (!flat.includes(part))
      return { ...refuse4(SENTENCE2.noFlat(f, WORD_OF[part], root.kind)), guard: "G-FLAT" };
  }
  const m = st.measure[G.headOf(f.target)] ?? st.measure[f.target];
  const rootR = rootOf2(f.target, G.byId);
  if (rootR && (rootR.kind === "cylinder" || rootR.kind === "extrude" && G.byId[rootR.target]?.shape === "circle")) {
    const dh = (hops(rootR.id, f.target, G.byId) ?? []).find((h) => h.kind === "draft");
    if (dh)
      return { ...refuse4(SENTENCE2.hollowCone(f)), guard: "G-CONE" };
  }
  if (rootR?.round && rootR.kind === "cylinder" && rootR.roundStyle === "chamfer")
    return { ...refuse4(SENTENCE2.chamferCyl(f)), guard: "G-CHAMFER" };
  if (rootR?.round && f.thickness <= rootR.round + 1e-9)
    return { ...refuse4(SENTENCE2.rim(f, rootR.round, f.thickness, rootR.roundStyle)), guard: "G-ROUND" };
  const rootT = rootOf2(f.target, G.byId);
  const dirv = DIRV[part];
  if (dirv && rootT?.kind === "box" && m && !(rootT.rotate && rootT.rotate.some((a) => a % 90 !== 0)) && !rootT.round) {
    const ax = dirv.findIndex((v) => v !== 0);
    const e = [0, 1, 2].map((i) => m.bbox[i + 3] - m.bbox[i]);
    const limit = Math.min(e[ax], ...[0, 1, 2].filter((i) => i !== ax).map((i) => e[i] / 2));
    if (f.thickness >= limit - 1e-9)
      return { ...refuse4(SENTENCE2.thickBox(f, limit)), guard: "G-THICK" };
  }
  if (cv.holes) {
    const holes = [];
    for (let cur = G.headOf(f.target), seen = /* @__PURE__ */ new Set(); cur && !seen.has(cur); ) {
      seen.add(cur);
      const h = G.byId[cur];
      if (!h)
        break;
      if (h.kind === "hole")
        holes.push(h);
      cur = h.kind === "combine" ? h.targets?.[0] : h.target;
    }
    const rt = rootOf2(f.target, G.byId);
    const bad2 = (why) => ({ ...refuse4(SENTENCE2.holeNear(f, why)), guard: "G-HOLE" });
    if (!rt || rt.kind !== "box" || rt.rotate && rt.rotate.some((a) => a % 90 !== 0))
      return bad2("the hole is in a part that is not a plain box");
    if (new Set(holes.map((h) => h.axis ?? "z")).size > 1)
      return bad2("the holes run in different directions");
    const O = dirv ? dirv.findIndex((v) => v !== 0) : -1;
    const openHi = dirv ? dirv[O] > 0 : true;
    const tubes = [];
    for (const h of holes) {
      const box = G.holeBox[h.id];
      if (!box)
        return bad2("the part was measured before the hole");
      const ax = AXI2[h.axis ?? "z"];
      if (h.countersink && ax === O && openHi)
        return { ...refuse4(SENTENCE2.csinkOpen(f, h.id)), guard: "G-CSOPEN" };
      const r = Math.max(h.diameter, h.counterbore?.diameter ?? 0, h.countersink?.diameter ?? 0) / 2;
      const R = r + f.thickness;
      const bc = [0, 1, 2].map((i) => (box[i] + box[i + 3]) / 2);
      const c = [0, 1, 2].map((i) => bc[i] + h.center[i]);
      for (const i of [0, 1, 2].filter((k) => k !== ax)) {
        const openSide = i === O;
        const loLim = box[i] + (openSide && !openHi ? 0 : f.thickness);
        const hiLim = box[i + 3] - (openSide && openHi ? 0 : f.thickness);
        if (c[i] - R < loLim - 1e-9 || c[i] + R > hiLim + 1e-9)
          return bad2(`the hole's wall allowance of ${fmt5(R)} reaches the side wall`);
      }
      tubes.push({ c, ax, R });
    }
    for (let a = 0; a < tubes.length; a++)
      for (let b = a + 1; b < tubes.length; b++) {
        const d2 = Math.hypot(...[0, 1, 2].filter((k) => k !== tubes[a].ax).map((k) => tubes[a].c[k] - tubes[b].c[k]));
        if (d2 < tubes[a].R + tubes[b].R - 1e-9)
          return bad2("two holes are closer than their wall allowances");
      }
  }
  for (let cur = G.headOf(f.target), seen = /* @__PURE__ */ new Set(); cur && !seen.has(cur); ) {
    seen.add(cur);
    const h = G.byId[cur];
    if (!h)
      break;
    if (h.kind === "fillet" && h.style !== "chamfer" && h.edge?.of?.some((n) => n.feature === f.open.feature && n.part === f.open.part) && h.size >= f.thickness - 1e-9) {
      return { ...refuse4(SENTENCE2.rim(f, h.size, f.thickness, h.style)), guard: "G-RIM" };
    }
    cur = h.kind === "combine" ? h.targets?.[0] : h.target;
  }
  const gridOnHole = cv.holes === true;
  const pk = await pickPoints(f, f.open, st, G, { gridOnHole, boxResult });
  if ("err" in pk)
    return { ...refuse4(pk.err), guard: "G-PICK", ...pk.raw === void 0 ? {} : { raw: pk.raw } };
  const variants = pk.pts.map((p) => [{ command: "solid.shell", params: { faces: [p], thickness: f.thickness, body: bs[0] } }]);
  const drafted = (hops(f.open.feature, f.target, G.byId) ?? []).find((h) => h.kind === "draft" && (h.face?.feature === f.open.feature && h.face?.part === f.open.part || h.whole && DIRV[f.open.part] && DIRV[f.open.part][AXI2[h.pull ?? "z"]] === 0));
  return {
    variants,
    produces: bs,
    consumes: [f.target],
    pickedFrom: pk.current ? "solidcraft topology (browser) + moves in the history" : "brep-rs resolve + moves in the history",
    plain: (raw) => plainEngineText(raw, f, { drafted }),
    post: (after, before) => {
      if (!before)
        return null;
      const dropped = after.curved || before.curved ? Math.abs(after.volume - before.volume) > 1e-9 * before.volume && after.volume < before.volume * (1 + 5e-4) : after.volume < before.volume * (1 - 1e-9);
      if (!dropped || !(after.faces > before.faces))
        return { guard: "G-THICK", refusal: SENTENCE2.thickGeneric(f) };
      return null;
    }
  };
}
var SWEEP_TOL = { planar: 1e-9, curved: 2e-5 };
async function sweepCheck(f, after, before, env, bodies) {
  const ax = AXI2[f.pull ?? "z"];
  const tanA = Math.tan(Math.abs(f.angle) * Math.PI / 180);
  const ext = [0, 1, 2].map((i) => before.bbox[i + 3] - before.bbox[i]);
  const zspan = Math.max(Math.abs(before.bbox[ax] - f.neutral), Math.abs(before.bbox[ax + 3] - f.neutral), 1e-9);
  const minExt = Math.min(...ext.filter((v) => v > 1e-9));
  const t1 = Math.max(Math.tan(0.01 * Math.PI / 180), Math.min(Math.tan(Math.PI / 180), 0.01 * minExt / zspan));
  if (tanA <= 3.5 * t1)
    return null;
  const sign = f.angle < 0 ? -1 : 1;
  const V = [before.volume];
  for (const k of [1, 2, 3]) {
    const a = sign * Math.atan(k * t1) * 180 / Math.PI;
    const probe = env.variant.map((c) => c.command === "solid.draft" ? { ...c, params: { ...c.params, angle: a } } : c);
    let res;
    try {
      res = await env.runSC([...env.accepted, ...probe]);
    } catch {
      return "unverified";
    }
    if (!res?.ok)
      return "unverified";
    const m = aggregateOf2(res, bodies);
    if (!m)
      return "unverified";
    V.push(m.volume);
  }
  const scale2 = Math.max(Math.abs(before.volume), 1);
  const baseTol = (after.curved || before.curved ? SWEEP_TOL.curved : SWEEP_TOL.planar) * scale2;
  const c2t = (V[2] - 2 * V[1] + V[0]) / 2;
  const c1t = V[1] - V[0] - c2t;
  const at2 = (t) => V[0] + c1t * (t / t1) + c2t * (t / t1) ** 2;
  if (Math.abs(at2(3 * t1) - V[3]) > baseTol)
    return "unverified";
  const pred = V[0] + c1t * (tanA / t1) + c2t * (tanA / t1) ** 2;
  return Math.abs(after.volume - pred) <= baseTol + 4e-15 * (tanA / t1) ** 2 * scale2 ? null : "off-curve";
}
var SC_SIGMA = -1;
var bboxCoords = (bb) => bb ? [0, 1, 2].map((i) => [bb[i], bb[i + 3]]) : null;
var mergeC = (...cs) => cs.some((c) => !c) ? null : [0, 1, 2].map((i) => cs.flatMap((c) => c[i]));
var shiftC = (c, v) => c ? c.map((a, i) => a.map((x) => x + v[i])) : null;
function critCoords(id, G, st, ctx, seen = /* @__PURE__ */ new Set()) {
  if (seen.has(id))
    return null;
  seen.add(id);
  const f = G.byId[id];
  if (!f)
    return null;
  const own = bboxCoords(st.measure[id]?.bbox);
  const sketchC = (skId, heights) => {
    const sk = G.byId[skId];
    if (!sk)
      return null;
    if (sk.shape === "circle")
      return null;
    let o;
    try {
      o = ctx.arc.outlineOf(sk);
    } catch {
      return null;
    }
    if (!o.ok)
      return null;
    const fr = ctx.mt.sketchFrameOf(sk);
    const sw = sweepOf(fr);
    const to3 = (p, h) => [0, 1, 2].map((i) => fr.origin[i] + fr.u[i] * p[0] + fr.v[i] * p[1] + sw[i] * h);
    const pts = o.points.flatMap((p) => heights.map((h) => to3(p, h)));
    return [0, 1, 2].map((i) => pts.map((q) => q[i]));
  };
  switch (f.kind) {
    case "box":
    case "cylinder":
    case "sphere":
    case "cone":
    case "prism":
    case "wedge":
      return own;
    case "extrude": {
      const c = sketchC(f.target, [0, f.height]);
      return c && own ? mergeC(c, own) : null;
    }
    case "move":
      return f.copy ? null : shiftC(critCoords(f.target, G, st, ctx, seen), f.offset);
    case "draft":
    case "shell":
    case "fillet": {
      const c = critCoords(f.target, G, st, ctx, seen);
      return c && own ? mergeC(c, own) : c;
    }
    case "combine": {
      const cs = f.targets.map((t) => critCoords(t, G, st, ctx, new Set(seen)));
      return mergeC(...cs, own ?? [[], [], []]);
    }
    case "hole": {
      const c = critCoords(f.target, G, st, ctx, seen);
      const bb = G.holeBox[f.id];
      if (!c || !bb)
        return null;
      const ax = AXI2[f.axis ?? "z"];
      const r = f.diameter / 2;
      const ctr = [0, 1, 2].map((i) => (bb[i] + bb[i + 3]) / 2 + f.center[i]);
      const h = [[], [], []];
      for (let i = 0; i < 3; i++) {
        if (i === ax)
          h[i].push(ctr[i] - f.depth / 2, ctr[i] + f.depth / 2, ctr[i] - f.depth, ctr[i] + f.depth);
        else
          h[i].push(ctr[i] - r, ctr[i] + r);
      }
      return mergeC(c, h);
    }
    case "pocket": {
      const c = critCoords(f.into, G, st, ctx, seen);
      const k = sketchC(f.target, [0, f.depth, -f.depth, f.depth / 2, -f.depth / 2, f.length2 ?? 0, -(f.length2 ?? 0)]);
      return c && k ? mergeC(c, k, own ?? [[], [], []]) : null;
    }
    default:
      return null;
  }
}
var sweepIn = (angle, neutral, lo, hi) => Math.tan(Math.abs(angle) * Math.PI / 180) * (angle * SC_SIGMA < 0 ? Math.max(0, hi - neutral) : Math.max(0, neutral - lo));
function reachCheck(f, part, c0, st, ctx, G) {
  const dir = DIRV[part];
  if (!dir)
    return "unverified";
  const root = rootOf2(f.face.feature, G.byId);
  if (root && !isZero32(root.rotate) && root.rotate.some((a) => a % 90 !== 0))
    return "unverified";
  const ax = dir.findIndex((v) => v !== 0);
  const side = dir[ax];
  const m = st.measure[G.headOf(f.target)] ?? st.measure[f.target];
  if (!m)
    return "unverified";
  const pa = AXI2[f.pull ?? "z"];
  const D = sweepIn(f.angle, f.neutral, m.bbox[pa], m.bbox[pa + 3]);
  if (D <= 0)
    return null;
  const coords = critCoords(G.headOf(f.target), G, st, ctx);
  if (!coords)
    return "unverified";
  let dmin = Infinity;
  for (const c of coords[ax]) {
    const d = side * (c0 - c);
    if (d > 1e-9 * Math.max(1, Math.abs(c0)))
      dmin = Math.min(dmin, d);
  }
  if (D >= dmin * (1 - 2e-3))
    return "reach";
  for (const h of hops(f.face.feature, f.target, G.byId) ?? []) {
    if (h.kind !== "draft" || !h.face || st.refused[h.id])
      continue;
    const hd = DIRV[h.face.part];
    if (!hd || hd[ax] === 0 || hd[ax] === side)
      continue;
    const before = st.measure[h.target]?.bbox;
    if (!before)
      return "unverified";
    const cPrev = hd[ax] > 0 ? before[ax + 3] : before[ax];
    const Dp = sweepIn(h.angle, h.neutral, before[AXI2[h.pull ?? "z"]], before[AXI2[h.pull ?? "z"] + 3]);
    if (D + Dp >= Math.abs(c0 - cPrev) * (1 - 2e-3))
      return "reach";
  }
  return null;
}
function fromGuard(f, m, G) {
  const use = G.fromUsage?.[G.draftIds.indexOf(f.id)];
  const words = use?.from && !use.neutral ? [use.from] : use?.maybe ?? [];
  if (m)
    for (const word of words) {
      const ax = AXI2[f.pull];
      const lo = word === "bottom" || word === "front" || word === "left";
      const want = lo ? m.bbox[ax] : m.bbox[ax + 3];
      if (Math.abs(want - f.neutral) > 1e-9 * Math.max(1, Math.abs(want)))
        return { ...refuse4(SENTENCE2.fromStale(f, word, f.neutral, want)), guard: "G-FROM" };
    }
  return null;
}
function wholeFaces(root, byId, ctx) {
  const rot = (p) => rotPt(p, root.rotate);
  const c = root.center ?? [0, 0, 0];
  const world = (p) => rot(p).map((v, i) => v + c[i]);
  const planar = (n, pt) => ({ n: rot(n), pt: world(pt), planar: true });
  if (root.kind === "box") {
    const [w, d, h] = root.size.map((v) => v / 2);
    return { kind: "box", faces: [planar([1, 0, 0], [w, 0, 0]), planar([-1, 0, 0], [-w, 0, 0]), planar([0, 1, 0], [0, d, 0]), planar([0, -1, 0], [0, -d, 0]), planar([0, 0, 1], [0, 0, h]), planar([0, 0, -1], [0, 0, -h])] };
  }
  if (root.kind === "cylinder") {
    const R = root.radius, h = root.height / 2;
    return { kind: "cylinder", R, axis: rot([0, 0, 1]), faces: [{ curved: true, pt: world([R, 0, 0]) }, planar([0, 0, 1], [0, 0, h]), planar([0, 0, -1], [0, 0, -h])] };
  }
  if (root.kind === "prism" || root.kind === "wedge") {
    const poly = root.kind === "prism" ? (() => {
      const n = Math.max(3, Math.min(12, Math.round(root.sides)));
      return Array.from({ length: n }, (_, i) => [root.radius * Math.cos(2 * Math.PI * i / n), root.radius * Math.sin(2 * Math.PI * i / n)]);
    })() : [[-root.width / 2, -root.depth / 2], [root.width / 2, -root.depth / 2], [-root.width / 2, root.depth / 2]];
    const faces = [];
    const h = root.height / 2;
    const sg = Math.sign(poly.reduce((a, p, i) => a + p[0] * poly[(i + 1) % poly.length][1] - poly[(i + 1) % poly.length][0] * p[1], 0)) || 1;
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      const e = [b[0] - a[0], b[1] - a[1]];
      const l = Math.hypot(...e);
      faces.push(planar([sg * e[1] / l, -sg * e[0] / l, 0], [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 0]));
    }
    faces.push(planar([0, 0, 1], [0, 0, h]), planar([0, 0, -1], [0, 0, -h]));
    return { kind: root.kind, faces };
  }
  if (root.kind === "extrude") {
    const sk = byId[root.target];
    if (!sk)
      return { err: "a sketch that is missing" };
    let o;
    try {
      o = ctx.arc.outlineOf(sk);
    } catch {
      o = { ok: false };
    }
    if (!o.ok)
      return { err: "a sketch outline that could not be read" };
    const fr = ctx.mt.sketchFrameOf(sk);
    const sw = sweepOf(fr);
    const to3 = (p, hh) => [0, 1, 2].map((i) => fr.origin[i] + fr.u[i] * p[0] + fr.v[i] * p[1] + sw[i] * hh);
    const H2 = root.height;
    if (sk.shape === "circle") {
      const [a, b] = o.points;
      const cc2 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      const R = Math.hypot(b[0] - a[0], b[1] - a[1]) / 2;
      return { kind: "cylinder", R, axis: sw, faces: [{ curved: true, pt: to3([cc2[0] + R, cc2[1]], H2 / 2) }, { n: sw, pt: to3(cc2, H2), planar: true }, { n: sw.map((v) => -v), pt: to3(cc2, 0), planar: true }] };
    }
    if (o.bulges && Object.values(o.bulges).some(Boolean))
      return { err: "an outline with an arc" };
    const P = o.points;
    const sg = Math.sign(P.reduce((a, p, i) => a + p[0] * P[(i + 1) % P.length][1] - P[(i + 1) % P.length][0] * p[1], 0)) || 1;
    const faces = [];
    for (let i = 0; i < P.length; i++) {
      const a = P[i], b = P[(i + 1) % P.length];
      const e = [b[0] - a[0], b[1] - a[1]];
      const l = Math.hypot(...e);
      const n2 = [sg * e[1] / l, -sg * e[0] / l];
      faces.push({ n: [0, 1, 2].map((k) => fr.u[k] * n2[0] + fr.v[k] * n2[1]), pt: to3([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], H2 / 2), planar: true });
    }
    const cc = polyCentroid(P);
    faces.push({ n: sw, pt: to3(cc, H2), planar: true }, { n: sw.map((v) => -v), pt: to3(cc, 0), planar: true });
    return { kind: "extrude", faces, polygon: P };
  }
  return { err: root.kind };
}
function simplePolygon(P) {
  const n = P.length;
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const on = (a, b, c) => Math.min(a[0], b[0]) - 1e-9 <= c[0] && c[0] <= Math.max(a[0], b[0]) + 1e-9 && Math.min(a[1], b[1]) - 1e-9 <= c[1] && c[1] <= Math.max(a[1], b[1]) + 1e-9;
  const hit = (p1, p2, p3, p4) => {
    const d1 = cr(p3, p4, p1), d2 = cr(p3, p4, p2), d3 = cr(p1, p2, p3), d4 = cr(p1, p2, p4);
    if ((d1 > 1e-9 && d2 < -1e-9 || d1 < -1e-9 && d2 > 1e-9) && (d3 > 1e-9 && d4 < -1e-9 || d3 < -1e-9 && d4 > 1e-9))
      return true;
    return Math.abs(d1) <= 1e-9 && on(p3, p4, p1) || Math.abs(d2) <= 1e-9 && on(p3, p4, p2) || Math.abs(d3) <= 1e-9 && on(p1, p2, p3) || Math.abs(d4) <= 1e-9 && on(p1, p2, p4);
  };
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) {
      if (j === i + 1 || i === 0 && j === n - 1)
        continue;
      if (hit(P[i], P[(i + 1) % n], P[j], P[(j + 1) % n]))
        return false;
    }
  return true;
}
var dotv = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
function planWholeDraft(f, st, ctx, G, bs) {
  if (Math.abs(f.angle) > 89)
    return { ...refuse4(SENTENCE2.angleRange(f, 89)), guard: "G-ANGLE" };
  const root = rootOf2(f.target, G.byId);
  if (!root)
    return refuse4(SENTENCE2.wholeChanged(f, "a step this cannot follow"));
  if (root.kind === "sphere")
    return { ...refuse4(SENTENCE2.wholeSphere(f)), guard: "G-FLAT" };
  if (root.kind === "cone")
    return { ...refuse4(SENTENCE2.wholeCone(f)), guard: "G-FLAT" };
  const chain = hops(root.id, f.target, G.byId);
  if (!chain)
    return refuse4(SENTENCE2.wholeChanged(f, "a step this cannot follow"));
  let shift = [0, 0, 0];
  for (const h of chain) {
    if (h.kind === "move" && !h.copy) {
      shift = shift.map((v, i) => v + h.offset[i]);
      continue;
    }
    if (h.kind === "shell")
      return { ...refuse4(SENTENCE2.wholeHollow(f)), guard: "G-WHOLE-HOLLOW" };
    if (h.kind === "draft")
      return { ...refuse4(SENTENCE2.wholeDrafted(f)), guard: "G-TWICE" };
    return { ...refuse4(SENTENCE2.wholeChanged(f, HOP_NAME[h.kind] ?? `a ${h.kind}`)), guard: "G-WHOLE-HISTORY" };
  }
  if (root.round)
    return { ...refuse4(SENTENCE2.wholeChanged(f, "rounded or bevelled edges")), guard: "G-WHOLE-HISTORY" };
  const wf = wholeFaces(root, G.byId, ctx);
  if ("err" in wf && wf.err !== void 0)
    return { ...refuse4(SENTENCE2.wholeShape(f, /^an? /.test(wf.err) ? wf.err : `a ${KIND_NAME[wf.err] ?? wf.err}`)), guard: "G-WHOLE-SHAPE" };
  const W = wf;
  if (W.polygon && !simplePolygon(W.polygon))
    return { ...refuse4(SENTENCE2.outlineCrosses(f)), guard: "G-OUTLINE" };
  const pv = DIRV["+" + (f.pull ?? "z")];
  const sides = [];
  for (const fc of W.faces) {
    if (fc.curved) {
      if (Math.abs(dotv(W.axis, pv)) < 1 - 1e-9)
        return { ...refuse4(SENTENCE2.wholeAxis(f, W.kind, f.pull ?? "z")), guard: "G-WHOLE-AXIS" };
      sides.push(fc.pt);
      continue;
    }
    const a = Math.abs(dotv(fc.n, pv));
    if (a < 1e-9)
      sides.push(fc.pt);
    else if (a < 1 - 1e-9)
      return { ...refuse4(SENTENCE2.wholeAxis(f, W.kind, f.pull ?? "z")), guard: "G-WHOLE-AXIS" };
  }
  if (!sides.length)
    return { ...refuse4(SENTENCE2.wholeAxis(f, W.kind, f.pull ?? "z")), guard: "G-WHOLE-AXIS" };
  const pts = sides.map((p) => p.map((v, i) => v + shift[i]));
  const m = st.measure[G.headOf(f.target)] ?? st.measure[f.target];
  const fg = fromGuard(f, m, G);
  if (fg)
    return fg;
  const ax = DIRV["+" + (f.pull ?? "z")];
  const variant = [{ command: "solid.draft", params: { faces: pts, angle: f.angle, neutral: { origin: ax.map((v) => v * f.neutral), normal: ax }, pull: ax, body: bs[0] } }];
  return {
    variants: [variant],
    produces: bs,
    consumes: [f.target],
    pickedFrom: "the primitive's own dimensions (every side face, one call)",
    plain: (raw) => plainEngineText(raw, { ...f, face: null }),
    post: async (after, before, env) => {
      if (before && after.faces !== before.faces)
        return { guard: "G-VANISH", refusal: SENTENCE2.vanish(f) };
      if (!(after.volume > 0) && !G.off?.includes("G-SWEEP"))
        return { guard: "G-SWEEP", refusal: SENTENCE2.vanish(f) };
      if (W.kind === "cylinder" && before && !G.off?.includes("G-SWEEP")) {
        const pa = AXI2[f.pull ?? "z"];
        const lo = before.bbox[pa], hi = before.bbox[pa + 3];
        const k = SC_SIGMA * Math.tan(f.angle * Math.PI / 180);
        const r = (z) => W.R + k * (z - f.neutral);
        if (Math.min(r(lo), r(hi)) <= 1e-9 * W.R)
          return { guard: "G-VANISH", refusal: SENTENCE2.vanish(f) };
        const want = Math.abs(k) < 1e-12 ? Math.PI * W.R * W.R * (hi - lo) : Math.PI / (3 * k) * (r(hi) ** 3 - r(lo) ** 3);
        if (Math.abs(after.volume - want) > 3e-4 * want)
          return { guard: "G-SWEEP", refusal: SENTENCE2.vanish(f), expected: want };
        return null;
      }
      if (before && env && !G.off?.includes("G-SWEEP")) {
        const bad2 = await sweepCheck(f, after, before, env, bs);
        if (bad2)
          return { guard: "G-SWEEP", refusal: bad2 === "unverified" ? SENTENCE2.unverified(f) : SENTENCE2.vanish(f), sweep: bad2 };
      }
      return null;
    }
  };
}
async function planDraft(f, st, ctx, G) {
  const dep = (id) => {
    id = G.headOf(id);
    if (st.refused[id])
      return `${f.id} (draft): it needs ${id}, which could not be built, so ${f.id} is shown without it.`;
    if (st.stale[id])
      return `${f.id} (draft): ${id} was already changed by ${st.stale[id]}, so ${f.id} is shown without it.`;
    return null;
  };
  const d = dep(f.target);
  if (d)
    return refuse4(d);
  const bs = st.bodies[G.headOf(f.target)];
  if (!bs || bs.length !== 1)
    return refuse4(`${f.id} (draft): ${partName(f)} is not a single solid, so ${f.id} is shown without it.`);
  if (f.whole || !f.face)
    return planWholeDraft(f, st, ctx, G, bs);
  const part = f.face.part;
  if (part === "side")
    return refuse4(SENTENCE2.curvedFace(f, "side"));
  if (Math.abs(f.angle) > 89)
    return { ...refuse4(SENTENCE2.angleRange(f, 89)), guard: "G-ANGLE" };
  const dirv = DIRV[part];
  const rootFace = rootOf2(f.face.feature, G.byId);
  if (rootFace?.kind === "sphere")
    return { ...refuse4(SENTENCE2.sphereFace(f)), guard: "G-FLAT" };
  const useEarly = G.fromUsage?.[G.draftIds.indexOf(f.id)];
  if (dirv && dirv[AXI2[f.pull ?? "z"]] !== 0)
    return { ...refuse4(SENTENCE2.cap(f, WORD_OF[part], { pull: f.pull ?? "z", fromWord: useEarly?.from ?? null })), guard: "G-CAP" };
  const prior = hops(f.face.feature, f.target, G.byId) ?? [];
  if (prior.some((h) => h.kind === "draft" && h.face?.feature === f.face.feature && h.face?.part === part))
    return { ...refuse4(SENTENCE2.twice(f)), guard: "G-TWICE" };
  const root = rootOf2(f.face.feature, G.byId);
  const tie = wordTie(root, part, G.byId, ctx.arc, ctx.mt);
  if (tie)
    return { ...refuse4(SENTENCE2.tie(f, WORD_OF[part], tie.kind, tie.n)), guard: "G-TIE" };
  const m = st.measure[G.headOf(f.target)] ?? st.measure[f.target];
  const fg = fromGuard(f, m, G);
  if (fg)
    return fg;
  const cv = convexity(G.headOf(f.target), G.byId, ctx.arc, G.holeExt);
  const pk = await pickPoints(f, f.face, st, G, { gridOnHole: cv.holes === true || !cv.convex });
  if ("err" in pk)
    return { ...refuse4(pk.err), guard: "G-PICK", ...pk.raw === void 0 ? {} : { raw: pk.raw } };
  if ((!cv.convex || cv.holes === true) && !G.off?.includes("G-REACH")) {
    const dv = DIRV[part];
    const axi = dv ? dv.findIndex((v) => v !== 0) : -1;
    const c0 = axi >= 0 ? pk.pts[0][axi] : NaN;
    const why = Number.isFinite(c0) ? reachCheck(f, part, c0, st, ctx, G) : "unverified";
    if (why)
      return { ...refuse4(why === "unverified" ? SENTENCE2.unverified(f) : SENTENCE2.vanish(f)), guard: "G-REACH" };
  }
  const ax = DIRV["+" + (f.pull ?? "z")];
  const variants = pk.pts.map((p) => [{ command: "solid.draft", params: { faces: [p], angle: f.angle, neutral: { origin: ax.map((v) => v * f.neutral), normal: ax }, pull: ax, body: bs[0] } }]);
  return {
    variants,
    produces: bs,
    consumes: [f.target],
    pickedFrom: pk.current ? "solidcraft topology (browser) + moves in the history" : "brep-rs resolve + moves in the history",
    plain: (raw) => /square to the pull/i.test(String(raw)) && prior.some((h) => h.kind === "draft") ? SENTENCE2.tiltedNeighbour(f) : plainEngineText(raw, f),
    post: async (after, before, env) => {
      if (before && after.faces !== before.faces)
        return { guard: "G-VANISH", refusal: SENTENCE2.vanish(f) };
      if (!(after.volume > 0) && !G.off?.includes("G-SWEEP"))
        return { guard: "G-SWEEP", refusal: SENTENCE2.vanish(f) };
      if (before && env && !G.off?.includes("G-SWEEP")) {
        const bad2 = await sweepCheck(f, after, before, env, bs);
        if (bad2)
          return { guard: "G-SWEEP", refusal: bad2 === "unverified" ? SENTENCE2.unverified(f) : SENTENCE2.vanish(f), sweep: bad2 };
      }
      return null;
    }
  };
}
var PICKED_AT = "ctx.resolveAt (primitive frame; only fillets in the history)";
async function filletEdgeAt(f, prefix, byId, ctx) {
  const nm = f.edge;
  if (!nm || nm.cause !== "between" || !Array.isArray(nm.of) || nm.of.length !== 2)
    return null;
  const root = byId[nm.feature];
  if (!root || root.kind !== "box" || root.round || !isZero32(root.rotate))
    return null;
  if (!nm.of.every((n) => n && n.cause === "primitive" && n.feature === nm.feature && DIRV[n.part]))
    return null;
  const [a, b] = nm.of.map((n) => DIRV[n.part]);
  if (a.some((v, i) => v !== 0 && b[i] !== 0))
    return null;
  const earlier = [];
  for (let cur = f.target, seen = /* @__PURE__ */ new Set(); ; ) {
    if (!cur || seen.has(cur))
      return null;
    seen.add(cur);
    if (cur === nm.feature)
      break;
    const h = byId[cur];
    if (!h || h.kind !== "fillet")
      return null;
    earlier.push(h);
    cur = h.target;
  }
  const r = await ctx.resolveAt(prefix, nm);
  if (!r || r.kind !== "edge" || !(typeof r.length === "number" && r.length > 0) || !Array.isArray(r.centroid))
    return null;
  const pair = (n) => (n.of ?? []).map((x) => `${x.feature}.${x.part}`).sort().join("|");
  for (const h of earlier) {
    const he = h.edge;
    if (!he || he.cause !== "between" || pair(he) === pair(nm))
      return null;
    const size = h.size;
    if (!(typeof size === "number" && size >= 0 && size < r.length / 2))
      return null;
  }
  const dir = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const ends = [r.centroid.map((v, i) => v - dir[i] * r.length / 2), r.centroid.map((v, i) => v + dir[i] * r.length / 2)];
  return { ok: true, kind: "edge", point: r.centroid, length: r.length, straightPlanar: true, ends, evidence: { name: `${nm.feature}.edge[${pair(nm)}]`, pickSource: PICKED_AT, history: earlier.map((h) => h.id) } };
}
async function shellDraftStep(f, idx, env) {
  const { doc, ctx, st, accepted, out } = env;
  const sd = st.shellDraft;
  const fv = FV4(f);
  const byId = Object.fromEntries(doc.features.map((x) => [x.id, FV4(x)]));
  const draftIds = doc.features.filter((x) => x.kind === "draft").map((x) => x.id);
  const headOf3 = (id) => {
    let h = id;
    const seen = /* @__PURE__ */ new Set();
    while (st.head[h] && !seen.has(h)) {
      seen.add(h);
      h = st.head[h];
    }
    return h;
  };
  const prefix = doc.features.slice(0, idx);
  const note = (o) => {
    out.push({ id: f.id, kind: f.kind, ...o });
  };
  if (f.kind === "sketch")
    st.sketches[f.id] = f;
  const holeExt = {};
  const holeBox = {};
  for (const x of doc.features.slice(0, idx + 1)) {
    if (x.kind !== "hole")
      continue;
    const m = st.measure[FV4(x).target];
    if (m) {
      holeExt[x.id] = [0, 1, 2].map((i) => m.bbox[i + 3] - m.bbox[i]);
      holeBox[x.id] = m.bbox;
    }
  }
  let resolvedMap = null;
  const G = {
    byId,
    headOf: headOf3,
    holeExt,
    holeBox,
    draftIds,
    fromUsage: ctx.fromUsage,
    off: ctx.guardsOff,
    pickAt: async (name) => {
      if (ctx.resolveAt) {
        const r = await ctx.resolveAt(prefix, name);
        return { r };
      }
      if (!resolvedMap)
        resolvedMap = await resolveNamesFor(f, prefix, env);
      const rr = resolvedMap.get(name);
      if (!rr)
        return { r: null, raw: "no resolution (the name was not resolved: no topology reply, or not a name)" };
      if (rr.ok === false)
        return { r: null, raw: rr.sentence };
      if (rr.kind !== "face" || !rr.point)
        return { r: null, raw: `it names ${rr.kind}` };
      return { r: { kind: "face", centroid: rr.point, current: true } };
    }
  };
  const chained = f.kind === "fillet" && !!st.chain?.[f.id] && st.chain[f.id].lead !== f.id && st.accLen[st.chain[f.id].lead] !== void 0;
  const edgeAt = f.kind === "fillet" && ctx.resolveAt && !chained ? await filletEdgeAt(fv, prefix, byId, ctx) : null;
  if (edgeAt && chainsOn(st, ctx) && !st.chain?.[f.id]) {
    await groupRun(f, doc.features, idx, st, async (m) => {
      const e = m.id === f.id ? edgeAt : await filletEdgeAt(FV4(m), prefix, byId, ctx);
      return e ? { point: e.point, ends: e.ends } : null;
    }, 1);
  }
  const baseResolved = f.kind === "fillet" && !edgeAt ? await resolveNamesFor(f, prefix, env) : /* @__PURE__ */ new Map();
  const fctx = { ...ctx, resolve: (name) => edgeAt && name === fv.edge ? edgeAt : baseResolved.get(name) ?? null };
  setPartName(fv, partNameOf(fv.target, byId));
  let plan;
  try {
    const vd = voidedDep(fv, st);
    if (f.kind === "box" && fv.round && fv.roundStyle === "chamfer")
      plan = { ...refuse4(SENTENCE2.chamferBox(fv)), guard: "G-CHAMFER" };
    else if (vd && !["shell", "move", "rotate"].includes(f.kind))
      plan = { ...refuse4(SENTENCE2.afterClosedHollow(fv, vd)), guard: "G-VOID" };
    else
      plan = f.kind === "shell" ? await planShell(fv, st, fctx, G) : f.kind === "draft" ? await planDraft(fv, st, fctx, G) : planFeature(f, st, fctx, BASE_PROFILE);
    if (edgeAt && plan.variants)
      plan.pickedFrom = PICKED_AT;
    if (vd && ["move", "rotate"].includes(f.kind) && !plan.refusal && !plan.noop) {
      if (f.kind === "move" && fv.copy)
        plan = { ...refuse4(SENTENCE2.afterClosedHollow(fv, vd)), guard: "G-VOID" };
      else {
        plan.voided = true;
        plan.post = (after, before) => before && (Math.abs(after.volume - before.volume) > 3e-4 * Math.max(1, before.volume) || after.faces !== before.faces) ? { guard: "G-VOID", refusal: SENTENCE2.afterClosedHollow(fv, vd) } : null;
      }
    }
  } catch (e) {
    plan = refuse4(`${f.id} (${f.kind}): this step could not be built (${String(e.message).replace(/[\[\]`]/g, "")}), so it is shown without it.`);
  }
  if (plan.refusal) {
    const s = sanitize(plan.refusal, byId);
    st.refused[f.id] = s;
    note({ status: plan.status ?? "refused", refusal: s, guard: plan.guard, ...plan.raw === void 0 ? {} : { raw: plan.raw }, commands: [] });
    return;
  }
  if (plan.noop) {
    note({ status: "noop", commands: [] });
    return;
  }
  let lastErr = null;
  let errored = false;
  const shellBudgetS = f.kind === "shell" ? hollowBudgetS(sd.lastRunS) : 0;
  let shellSpentS = 0;
  const outOfTime = (variant, raw2, cpuMs) => {
    const sentence2 = budgetSentenceOther(f.id, f.kind);
    st.refused[f.id] = sentence2;
    note({ status: "refused", refusal: sentence2, guard: "G-BUDGET", raw: raw2, cpuMs: cpuMs ?? Math.round(shellSpentS * 1e3), commands: variant });
  };
  for (const variant0 of plan.variants) {
    let variant = variant0;
    let repaired;
    let res;
    const leftS = shellBudgetS - shellSpentS;
    if (f.kind === "shell" && leftS <= 0) {
      outOfTime(variant, `TIME BUDGET: ${plan.variants.indexOf(variant0)} open-face points used the hollow's ${fmt5(shellBudgetS)} s`);
      return;
    }
    const t0 = Date.now();
    try {
      res = f.kind === "shell" ? await ctx.runSC([...accepted, ...variant], { budgetS: leftS }) : await ctx.runSC([...accepted, ...variant]);
    } catch (e) {
      res = { ok: false, failed: { error: `WASM TRAP: ${e.message}` } };
    }
    if (f.kind === "shell")
      shellSpentS += (typeof res.cpuMs === "number" ? res.cpuMs : Date.now() - t0) / 1e3;
    if (res.timedOut && f.kind === "shell") {
      outOfTime(variant, `${res.failed?.error}`, res.cpuMs);
      return;
    }
    if (!res.ok && res.erroredBody)
      errored = true;
    if (!res.ok) {
      lastErr = res.failed ? `${res.failed.command}: ${res.failed.error}` : String(res.error ?? "unknown");
      continue;
    }
    let m = aggregateOf2(res, plan.produces);
    if (!m) {
      lastErr = `no body named ${plan.produces.join(", ")} came back`;
      continue;
    }
    const sv = f.kind === "extrude" ? sketchVolumeRefusal(f, st.sketches[f.target], ctx, res, plan.produces) : null;
    if (sv) {
      st.refused[f.id] = sv;
      note({ status: "refused", refusal: sv, guard: SKETCH_VOLUME_GUARD, commands: variant });
      return;
    }
    const mv = motionRefusal(f, st, ctx, res, plan.produces, accepted);
    const fx = mv ? await motionRepair(f, st, ctx, mv, plan.produces, accepted, variant, ctx.runSC) : null;
    const m2 = fx ? aggregateOf2(fx.res, plan.produces) : null;
    if (mv && fx && m2) {
      variant = fx.variant;
      res = fx.res;
      m = m2;
      repaired = { pads: fx.pads, reason: mv.sentence };
    } else if (mv) {
      st.refused[f.id] = mv.sentence;
      note({ status: "refused", refusal: mv.sentence, guard: mv.guard, commands: variant });
      return;
    }
    const bl = blendRefusal(f, blendOf(plan), beforeOf(st, fv.target), m, ctx);
    if (bl) {
      st.refused[f.id] = bl.sentence;
      note({ status: "refused", refusal: bl.sentence, guard: bl.guard, unguarded: { volume: m.volume, faces: m.faces, bbox: m.bbox, com: m.com }, commands: variant });
      return;
    }
    const bad2 = await plan.post?.(m, st.measure[headOf3(fv.target)] ?? st.measure[fv.target], { accepted: [...accepted], variant, runSC: ctx.runSC });
    if (bad2) {
      const s = sanitize(bad2.refusal, byId);
      st.refused[f.id] = s;
      note({ status: "refused", refusal: s, guard: bad2.guard, unguarded: { volume: m.volume, faces: m.faces, bbox: m.bbox, com: m.com }, commands: variant });
      return;
    }
    const pc = f.kind === "pocket" ? await pocketCutRefusal(f, ctx, res, accepted, variant, plan.produces, ctx.runSC) : null;
    if (pc) {
      st.refused[f.id] = pc;
      note({ status: "refused", refusal: pc, guard: POCKET_CUT_GUARD, commands: variant });
      return;
    }
    const hc = f.kind === "shell" ? hollowRefusal(f, doc.features, st, ctx, res, plan.produces, accepted) : null;
    if (hc) {
      st.refused[f.id] = hc.sentence;
      note({ status: "refused", refusal: hc.sentence, guard: hc.guard, commands: variant });
      return;
    }
    accepted.push(...variant);
    rememberRun(accepted, res);
    for (const mp of membersOf(env.profile))
      mp.onAccepted?.(st, res, m, null, { f, ctx });
    st.accLen[f.id] = accepted.length;
    st.bodies[f.id] = m.bodies;
    st.measure[f.id] = m;
    if (plan.voided)
      sd.voided[f.id] = true;
    for (const c of plan.consumes) {
      if (c === f.id)
        continue;
      if (f.kind === "hole" || f.kind === "pocket" || f.kind === "groove") {
        if (c === (f.kind === "hole" ? fv.target : fv.into))
          st.head[c] = f.id;
      } else
        st.stale[c] = f.id;
    }
    note({ status: "built", commands: variant, measure: m, pickedFrom: plan.pickedFrom, variantsTried: plan.variants.indexOf(variant0) + 1, ...repaired ? { repaired } : {}, pick: variant.find((c) => c.params.edges || c.params.faces)?.params ?? null });
    return;
  }
  const raw = lastErr;
  const sentence = errored ? erroredBodySentence(f) : plan.plain ? plan.plain(raw) : sanitize(`${f.id} (${f.kind}): solidcraft refused it -- ${raw}`, byId);
  st.refused[f.id] = sentence;
  note({ status: "refused", refusal: sentence, raw, guard: errored ? ERRORED_BODY_GUARD : "engine", commands: plan.variants[0] });
}
var hollowBudgetS = (lastRunS) => BUDGET_S + 1.5 * lastRunS;
var notSync = () => {
  throw new Error("the 'shell-draft' planner set plans a shell and a draft asynchronously (the name is resolved on the engine, the guards re-run it); use translateDoc");
};
var SHELL_DRAFT_PROFILE = {
  name: "shell-draft",
  // claiming the 'shell' and 'draft' kinds is what makes this profile their owner in a composition; the real planning is planShell / planDraft, called by the step
  planners: { shell: notSync, draft: notSync },
  verifies: false,
  initState(st) {
    st.shellDraft = { voided: {}, lastRunS: 0 };
  },
  // the budget of the next hollow run is 45 s + 1.5 x the CPU the last accepted run used, whichever step built it
  onAccepted(st, res) {
    if (res.cpuMs)
      st.shellDraft.lastRunS = res.cpuMs / 1e3;
  },
  // wording of the generic loop: the step does not use these, they are the base's so the profile is complete
  depSentence: BASE_PROFILE.depSentence,
  noOutline: BASE_PROFILE.noOutline,
  plannerError: BASE_PROFILE.plannerError,
  kernelRefusal: BASE_PROFILE.kernelRefusal,
  step: shellDraftStep
};

// ../../layer/dist/patterns-mirror.js
var AXN3 = { x: "X", y: "Y", z: "Z" };
var len4 = (a) => Math.hypot(...a);
var isZero33 = (v) => !v || v[0] === 0 && v[1] === 0 && v[2] === 0;
var PM_KINDS = ["pattern", "mirror"];
var PFV = (f) => f;
function initPM(st) {
  st.pm = { abox: {}, torus: {}, tools: {}, known: null, accMs: 0, raw: {}, student: {}, rootOf: {}, mirrorAt: {}, docT0: Date.now() };
}
var CALL = { shell: "hollow", extrude: "pull", revolve: "spin", blend: "loft" };
var fname = (f) => f.kind === "pattern" ? f.mode === "circular" ? "repeatAround" : "repeat" : f.kind === "combine" ? f.op === "union" ? "join" : f.op === "subtract" ? "subtract" : "common" : f.kind === "fillet" ? f.style === "chamfer" ? "bevel" : "round" : CALL[f.kind] ?? f.kind;
var fmtMm2 = (v) => String(+Number(v).toPrecision(2));
var nearTag = (gap) => {
  const g = Math.max(...gap);
  return g > 1e-8 ? ` gap=${g.toExponential(1)}` : "";
};
function studentSentence(fIn, raw) {
  const f = fIn;
  const n = fname(f);
  let m;
  if (/TIME BUDGET: whole model/.test(raw)) {
    m = /exceeded (\d+) ms/.exec(raw);
    return `${n}(): checking the whole model was stopped after ${m ? Math.round(+m[1] / 6e4) : 60} minutes without finishing, so this step and every step after it were left out -- use fewer steps or fewer copies.`;
  }
  if (/TIME BUDGET/.test(raw)) {
    m = /exceeded (\d+) ms/.exec(raw);
    return `${n}(): building this was stopped after ${m ? Math.round(+m[1] / 1e3) : 600} seconds without finishing, so it was left out -- use fewer copies, space them apart, or use flat-sided shapes.`;
  }
  if (/pattern count must be/.test(raw))
    return `${n}(): a pattern can have at most 1000 copies, and this one asks for ${f.count} -- use a count of 1000 or fewer.`;
  if (/near-coincident copies/.test(raw)) {
    m = /shifted by only ([\d.e+-]+) mm \(([\d.e+-]+) mm is the smallest safe shift/.exec(raw);
    return `${n}(): the copies are shifted by only ${m ? m[1] : "a hair"} mm, so each one lies almost exactly on the one before and the thin layer between them would be lost -- shift them by more than ${m ? m[2] : "a few hundredths of"} mm, or by a whole part size.`;
  }
  if (/thin wall/.test(raw)) {
    m = /wall of only ([\d.e+-]+) mm .* ([\d.e+-]+) mm is the smallest safe wall (between two cuts|between a cut and the side of the part)/.exec(raw);
    const side = m && /side of the part/.test(m[3]);
    return `${n}(): this cut leaves a wall of only ${m ? m[1] : "a hair"} mm ${side ? "between it and the side of the part" : "between it and an earlier cut"}, and a wall that thin is lost without any error -- leave more than ${m ? m[2] : "a few tenths of"} mm of material there, or make it one wider cut.`;
  }
  if (/near-coincident cut/.test(raw)) {
    m = /by only ([\d.e+-]+) mm from an earlier cut of the same size \(([\d.e+-]+) mm is the smallest safe shift/.exec(raw);
    return `${n}(): this cut lies only ${m ? m[1] : "a hair"} mm from an earlier cut of the same size, so the thin sliver between the two would be lost -- move it by more than ${m ? m[2] : "a few hundredths of"} mm, or leave it out.`;
  }
  if (/\[curved-near/.test(raw)) {
    m = /gap=([\d.e+-]+)/.exec(raw);
    return `${n}(): two of the curved copies lie so close together${m ? ` (the boxes around them are only about ${m[1].replace(/e([+-])0*(\d)/, "e$1$2")} mm apart)` : ""} that it cannot be told whether they touch, and curved copies that close cannot be fused or kept apart reliably -- leave a clear gap between them, or overlap them clearly.`;
  }
  if (/mirror copy not fused/.test(raw) || f.kind === "mirror" && /boolean Union: the operation failed/.test(raw))
    return "mirror(): the mirrored copy touches the original but the two could not be fused into one solid -- mirror in another direction, or build the part with pull() instead of spin().";
  if (/sub-resolution gap/.test(raw)) {
    m = /apart by ([\d.e+-]+) mm/.exec(raw);
    return `${n}(): the copies would be only ${m ? m[1] : "a hair"} mm apart, a gap too small to keep apart reliably -- make the gap larger than 0.001 mm, or let the copies touch exactly.`;
  }
  if (/sub-resolution overlap/.test(raw)) {
    m = /by only ([\d.e+-]+) mm/.exec(raw);
    return `${n}(): the copies overlap by only ${m ? m[1] : "a hair"} mm, too little to fuse them reliably -- overlap them by more than 0.0005 mm (a visible overlap is better), or leave a clear gap.`;
  }
  if (/copies overlap or touch.*curved/.test(raw))
    return `${n}(): these copies overlap or touch, and their curved faces cannot be fused into one solid yet -- space the copies so they clear each other, or build the shape from flat faces.`;
  if (/copies overlap or touch/.test(raw))
    return `${n}(): these copies overlap or touch and could not be fused into one solid -- space the copies so they clear each other by a visible gap, or overlap them clearly.`;
  if (/mirror contact is not a face/.test(raw))
    return "mirror(): on that side the part meets the mirror plane only along a line or at a point (its nearest side is curved, pointed or edge-on), so the copy cannot be fused to it -- mirror in a direction where the part has a flat face, or turn the part so a flat face points that way (a sphere has no flat face to turn).";
  if (/lumps: shell boundaries intersect or touch/.test(raw)) {
    if (f.kind === "mirror")
      return "mirror(): on that side the part meets the mirror plane only along a line or at a point (its nearest side is curved, pointed or edge-on), so the copy cannot be fused to it -- mirror in a direction where the part has a flat face, or turn the part so a flat face points that way (a sphere has no flat face to turn).";
    return `${n}(): two of the copies would meet only along an edge or at a point, so the result would not be one solid -- overlap them along a face or leave a gap.`;
  }
  if (/join cannot preserve the original faces|boolean Union: the operation failed|exact fallback for where the bodies meet/.test(raw))
    return `${n}(): these two shapes touch only along a line or at a point (or are exactly tangent), so they cannot be fused into one solid -- overlap them a little or leave a gap.`;
  if (/angle semantics|less than 360 degrees is not mapped/.test(raw))
    return `${n}(): a turn other than one full 360 degrees is not available for a whole shape yet -- leave the angle out for a full turn, or repeat a pocket or hole, which does accept an angle.`;
  if (/zero step/.test(raw))
    return `${n}(): the step is [0, 0, 0], so every copy would land exactly on the original -- give a step such as [30, 0, 0].`;
  if (/counterbore and countersink are not mapped/.test(raw))
    return "hole(): a hole with a counterbore or countersink cannot be drilled yet, so it cannot be repeated either -- drill a plain hole instead.";
  if (f.kind === "shell" && /faces. must be a list of points|solid\.shell/.test(raw))
    return "hollow(): a hollow with no open side cannot be built here, so it cannot be repeated or mirrored either -- give the hollow an open side, for example hollow(shape, { wall: 3, open: 'top' }).";
  if (/torus/.test(raw) && /clear of/.test(raw))
    return `${n}(): copies of a ring that touch or overlap cannot be fused reliably yet -- space the copies so the rings do not meet.`;
  if (/only along an edge or at a point/.test(raw))
    return `${n}(): two of the copies would meet only along an edge or at a point, so the result would not be one solid -- overlap them along a face or leave a gap.`;
  if (/analytic|cannot tell exactly where the part ends/.test(raw))
    return `${n}(): it cannot be told exactly where this curved part ends in that direction, so the mirror plane cannot be placed -- mirror a part made of flat faces, or build the other half yourself.`;
  if (m = /the (\w+) option is not mapped/.exec(raw))
    return `${n}(): the ${m[1]} option is not built yet -- leave ${m[1]} out.`;
  if (/taper closes the profile|fold over itself/.test(raw))
    return `${n}(): the taper makes the outline fold over itself before the end of the pull, so nothing is built -- use a smaller taper or a shorter pull.`;
  if (/not a single body|needs a single/.test(raw))
    return `${n}(): this works on one shape at a time, and what it was given is several separate shapes -- join them first.`;
  if (f.kind === "draft" && /solid\.draft|drafting faces/.test(raw))
    return "draft(): a draft can only be put on a face that is parallel to the pull direction (the top face of a box is not) -- leave the draft out, or draft a side face.";
  if (/sum check/.test(raw))
    return `${n}(): the copies are apart, but the volume of the result does not add up to the volume of the copies, so it cannot be trusted -- move the copies clearly apart or clearly together, or line their faces up exactly.`;
  if (/no measured bounding box/.test(raw))
    return `${n}(): there is no built shape to ${n} -- an earlier step did not produce one.`;
  return `${n}(): this could not be built reliably, so it was left out -- change the shape or its numbers a little and try again.`;
}
var SNAP_REL = 0.015;
var SLIVER_MM = 5e-4;
var minExtent = (lo, hi) => {
  const e = [0, 1, 2].map((i) => hi[i] - lo[i]).filter((v) => v > 1e-9);
  return e.length ? Math.min(...e) : 0;
};
function toolBoxOf(f, st, ctx) {
  const g = PFV(f);
  if (g.kind === "pocket") {
    const sk = st.sketches[g.target];
    if (!sk)
      return null;
    const fr = frameOf2(sk, ctx.mt);
    const o = ctx.arc.outlineOf(sk);
    if (!o.ok)
      return null;
    const W = (p) => [0, 1, 2].map((i) => fr.origin[i] + fr.u[i] * p[0] + fr.v[i] * p[1]);
    let pts;
    if (sk.shape === "circle") {
      const [a, b] = o.points;
      const c = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      const r = Math.hypot(b[0] - a[0], b[1] - a[1]) / 2;
      pts = [[c[0] - r, c[1] - r], [c[0] + r, c[1] - r], [c[0] - r, c[1] + r], [c[0] + r, c[1] + r]].map(W);
    } else
      pts = o.points.map(W);
    const circle = sk.shape === "circle";
    const poly = circle ? null : pts;
    const nl = Math.hypot(...fr.n) || 1;
    const sgn = g.reversed ? 1 : -1;
    const lo = [Infinity, Infinity, Infinity];
    const hi = [-Infinity, -Infinity, -Infinity];
    for (const q of pts)
      for (const t of [0, sgn * g.depth])
        for (let i = 0; i < 3; i++) {
          const v = q[i] + fr.n[i] / nl * t;
          lo[i] = Math.min(lo[i], v);
          hi[i] = Math.max(hi[i], v);
        }
    const ai = [0, 1, 2].find((i) => Math.abs(Math.abs(fr.n[i]) / nl - 1) < 1e-9) ?? -1;
    return { lo, hi, circle, poly, ai };
  }
  if (g.kind === "hole") {
    const m = st.measure[g.target];
    if (!m)
      return null;
    const bc = [0, 1, 2].map((i) => (m.bbox[i] + m.bbox[i + 3]) / 2);
    const centers = g.corners ? [[-g.corners.dx, -g.corners.dy], [g.corners.dx, -g.corners.dy], [-g.corners.dx, g.corners.dy], [g.corners.dx, g.corners.dy]] : [[0, 0]];
    const ai = { x: 0, y: 1, z: 2 }[g.axis ?? "z"];
    const lo = [Infinity, Infinity, Infinity];
    const hi = [-Infinity, -Infinity, -Infinity];
    for (const [ox, oy] of centers) {
      const c = [bc[0] + g.center[0] + (g.corners ? ox : 0), bc[1] + g.center[1] + (g.corners ? oy : 0), bc[2] + g.center[2]];
      for (let i = 0; i < 3; i++) {
        const h = i === ai ? g.depth / 2 : g.diameter / 2;
        lo[i] = Math.min(lo[i], c[i] - h);
        hi[i] = Math.max(hi[i], c[i] + h);
      }
    }
    return { lo, hi, circle: true, poly: null, ai };
  }
  return null;
}
function snapCut(tb, prior) {
  const ext = [0, 1, 2].map((i) => tb.hi[i] - tb.lo[i]);
  const mn = minExtent(tb.lo, tb.hi);
  if (!(mn > 0))
    return null;
  const tau = SNAP_REL * mn;
  for (const pb of prior ?? []) {
    if (!ext.every((e, i) => Math.abs(e - (pb.hi[i] - pb.lo[i])) <= tau))
      continue;
    const d = Math.hypot(...[0, 1, 2].map((i) => (tb.lo[i] + tb.hi[i]) / 2 - (pb.lo[i] + pb.hi[i]) / 2));
    if (d > 1e-9 && d <= tau)
      return { d, tau };
  }
  return null;
}
var WEB_REL = 0.01;
var segDist3 = (p, q, r, s) => {
  const cr = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const d1 = cr(r, s, p), d2 = cr(r, s, q), d3 = cr(p, q, r), d4 = cr(p, q, s);
  if ((d1 > 0 && d2 < 0 || d1 < 0 && d2 > 0) && (d3 > 0 && d4 < 0 || d3 < 0 && d4 > 0))
    return 0;
  const pt = (a, b, c) => {
    const dx = c[0] - b[0], dy = c[1] - b[1];
    const L2 = dx * dx + dy * dy;
    const t = L2 ? Math.max(0, Math.min(1, ((a[0] - b[0]) * dx + (a[1] - b[1]) * dy) / L2)) : 0;
    return Math.hypot(a[0] - b[0] - t * dx, a[1] - b[1] - t * dy);
  };
  return Math.min(pt(p, r, s), pt(q, r, s), pt(r, p, q), pt(s, p, q));
};
var inPoly2 = (pt, poly) => {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if (a[1] > pt[1] !== b[1] > pt[1] && pt[0] < (b[0] - a[0]) * (pt[1] - a[1]) / (b[1] - a[1]) + a[0])
      c = !c;
  }
  return c;
};
function polyDist2(A, B) {
  if (inPoly2(A[0], B) || inPoly2(B[0], A))
    return 0;
  let d = Infinity;
  for (let i = 0; i < A.length; i++)
    for (let j = 0; j < B.length; j++)
      d = Math.min(d, segDist3(A[i], A[(i + 1) % A.length], B[j], B[(j + 1) % B.length]));
  return d;
}
function webCut(tb, prior, bb) {
  if (!tb || tb.circle || !tb.poly || !bb)
    return null;
  const diag = Math.hypot(bb[3] - bb[0], bb[4] - bb[1], bb[5] - bb[2]);
  const tau = WEB_REL * diag;
  if (!(tau > 0))
    return null;
  const proj = (pts, ai) => pts.map((p) => [0, 1, 2].filter((i) => i !== ai).map((i) => p[i]));
  let best = null;
  const upd = (d, kind) => {
    if (d > 1e-9 && d <= tau && (!best || d < best.d))
      best = { d, tau, kind };
  };
  for (const pb of prior ?? []) {
    if (pb.circle || !pb.poly)
      continue;
    if (tb.ai >= 0 && tb.ai === pb.ai) {
      const ov = Math.min(tb.hi[tb.ai], pb.hi[tb.ai]) - Math.max(tb.lo[tb.ai], pb.lo[tb.ai]);
      if (!(ov > 1e-9))
        continue;
      upd(polyDist2(proj(tb.poly, tb.ai), proj(pb.poly, tb.ai)), "cut");
    } else {
      const g = [0, 1, 2].map((i) => Math.max(tb.lo[i] - pb.hi[i], pb.lo[i] - tb.hi[i]));
      const apart2 = g.filter((v) => v > 0);
      if (apart2.length === 1)
        upd(apart2[0], "cut");
    }
  }
  for (let i = 0; i < 3; i++) {
    if (i === tb.ai)
      continue;
    upd(tb.lo[i] - bb[i], "side");
    upd(bb[i + 3] - tb.hi[i], "side");
  }
  return best;
}
function cutGuard(f, st, ctx) {
  const g = PFV(f);
  if (g.kind !== "pocket" && g.kind !== "hole")
    return null;
  const pm = st.pm;
  const into = g.kind === "pocket" ? g.into : g.target;
  const hid = headOf(st, into);
  const blocked = (id) => {
    const h = headOf(st, id);
    return !!(st.refused[h] || st.stale[h]);
  };
  if (blocked(into) || g.kind === "pocket" && blocked(g.target))
    return null;
  const bs = st.bodies[hid];
  if (!bs || bs.length !== 1)
    return null;
  const tb = toolBoxOf(f, st, ctx);
  if (!tb)
    return null;
  const snap2 = snapCut(tb, pm.tools[bs[0]]);
  if (snap2)
    return { guard: "PM-SNAPCUT", raw: `${g.id} (${g.kind}): near-coincident cut: this cut lies by only ${fmtMm2(snap2.d)} mm from an earlier cut of the same size (${fmtMm2(snap2.tau)} mm is the smallest safe shift: ${SNAP_REL * 100}% of the tool's smallest size), so the thin sliver between the two would be dropped` };
  const wm = st.measure[into];
  const hit = webCut(tb, pm.tools[bs[0]], wm?.bbox);
  if (hit)
    return { guard: "PM-WEB", raw: `${g.id} (${g.kind}): thin wall: this cut leaves a wall of only ${fmtMm2(hit.d)} mm ${hit.kind === "side" ? "between it and the side of the part" : "between it and an earlier cut"}; ${fmtMm2(hit.tau)} mm is the smallest safe wall ${hit.kind === "side" ? "between a cut and the side of the part" : "between two cuts"} (${WEB_REL * 100}% of the part's diagonal), because a flat wall thinner than that is dropped by the cut` };
  return null;
}
function headOf(st, id) {
  let h = id;
  const seen = /* @__PURE__ */ new Set();
  while (st.head[h] && !seen.has(h)) {
    seen.add(h);
    h = st.head[h];
  }
  return h;
}
var rot90Half = (h, angles) => {
  const v = [...h];
  for (let a = 0; a < 3; a++) {
    const ang = angles?.[a] ?? 0;
    if (!ang)
      continue;
    const k = ang / 90;
    if (!Number.isInteger(k))
      return null;
    if ((k % 2 + 2) % 2 === 1) {
      const i = (a + 1) % 3;
      const j = (a + 2) % 3;
      [v[i], v[j]] = [v[j], v[i]];
    }
  }
  return v;
};
var unionBox = (bs) => bs.some((b) => !b) ? null : { lo: [0, 1, 2].map((i) => Math.min(...bs.map((b) => b.lo[i]))), hi: [0, 1, 2].map((i) => Math.max(...bs.map((b) => b.hi[i]))) };
var shiftBox = (b, t) => b ? { lo: b.lo.map((v, i) => v + t[i]), hi: b.hi.map((v, i) => v + t[i]) } : null;
function analyticBox(f, st, ctx, mirrorAt) {
  const g = PFV(f);
  const pm = st.pm;
  const c = g.center ?? [0, 0, 0];
  switch (g.kind) {
    case "box":
    case "cylinder":
    case "sphere":
    case "cone":
    case "torus": {
      const h = g.kind === "box" ? g.size.map((v) => v / 2) : g.kind === "cylinder" || g.kind === "cone" ? [g.radius, g.radius, g.height / 2] : g.kind === "sphere" ? [g.radius, g.radius, g.radius] : [g.ringRadius + g.tubeRadius, g.ringRadius + g.tubeRadius, g.tubeRadius];
      const r = isZero33(g.rotate) ? h : rot90Half(h, g.rotate);
      return r ? { lo: c.map((v, i) => v - r[i]), hi: c.map((v, i) => v + r[i]) } : null;
    }
    case "prism":
    case "wedge": {
      if (!isZero33(g.rotate))
        return null;
      const poly = g.kind === "prism" ? (() => {
        const n = Math.max(3, Math.min(12, Math.round(g.sides)));
        return Array.from({ length: n }, (_, i) => [g.radius * Math.cos(2 * Math.PI * i / n), g.radius * Math.sin(2 * Math.PI * i / n)]);
      })() : [[-g.width / 2, -g.depth / 2], [g.width / 2, -g.depth / 2], [-g.width / 2, g.depth / 2]];
      const xs = poly.map((p) => p[0]);
      const ys = poly.map((p) => p[1]);
      return { lo: [c[0] + Math.min(...xs), c[1] + Math.min(...ys), c[2] - g.height / 2], hi: [c[0] + Math.max(...xs), c[1] + Math.max(...ys), c[2] + g.height / 2] };
    }
    case "extrude": {
      if (g.taper)
        return null;
      const sk = st.sketches[g.target];
      if (!sk)
        return null;
      const fr = frameOf2(sk, ctx.mt);
      const o = ctx.arc.outlineOf(sk);
      if (!o.ok)
        return null;
      const W = (p) => [0, 1, 2].map((i) => fr.origin[i] + fr.u[i] * p[0] + fr.v[i] * p[1]);
      const sweep = (pts3, half) => {
        const lo = [Infinity, Infinity, Infinity];
        const hi = [-Infinity, -Infinity, -Infinity];
        for (const q of pts3)
          for (const t of [0, g.height])
            for (let i = 0; i < 3; i++) {
              const v = q[i] + fr.n[i] * t;
              lo[i] = Math.min(lo[i], v - half[i]);
              hi[i] = Math.max(hi[i], v + half[i]);
            }
        return { lo, hi };
      };
      if (sk.shape === "circle") {
        const [a, b] = o.points;
        const r = Math.hypot(b[0] - a[0], b[1] - a[1]) / 2;
        const nl = Math.hypot(...fr.n);
        return sweep([W([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2])], fr.n.map((v) => r * Math.sqrt(Math.max(0, 1 - (v / nl) ** 2))));
      }
      if (Object.values(o.bulges ?? {}).some((x) => x))
        return null;
      return sweep(o.points.map(W), [0, 0, 0]);
    }
    case "revolve": {
      if (g.angle !== 360)
        return null;
      const sk = st.sketches[g.target];
      if (!sk)
        return null;
      const fr = frameOf2(sk, ctx.mt);
      const ai = fr.n.findIndex((x) => Math.abs(Math.abs(x) - 1) < 1e-12);
      if (ai < 0 || fr.n.filter((x) => Math.abs(x) > 1e-12).length !== 1)
        return null;
      const o = ctx.arc.outlineOf(sk);
      if (!o.ok || sk.shape === "circle" || Object.values(o.bulges ?? {}).some((x) => x))
        return null;
      const us = o.points.map((p) => p[0]);
      const vs = o.points.map((p) => p[1]);
      const R = Math.max(...us.map(Math.abs));
      const ax = [fr.origin[ai] + fr.n[ai] * Math.min(...vs), fr.origin[ai] + fr.n[ai] * Math.max(...vs)].sort((a, b) => a - b);
      const lo = [0, 1, 2].map((i) => i === ai ? ax[0] : fr.origin[i] - R);
      const hi = [0, 1, 2].map((i) => i === ai ? ax[1] : fr.origin[i] + R);
      return { lo, hi };
    }
    case "combine": {
      const bx = g.targets.map((t) => pm.abox[t] ?? null);
      return g.op === "union" ? unionBox(bx) : g.op === "subtract" ? bx[0] : null;
    }
    case "hole":
      return pm.abox[g.target] ?? null;
    case "pocket":
    case "groove":
      return pm.abox[g.into] ?? null;
    case "move":
      return g.copy ? null : shiftBox(pm.abox[g.target] ?? null, g.offset);
    case "rotate": {
      const b = pm.abox[g.target];
      if (!b)
        return null;
      const r = rot90Half([0, 1, 2].map((i) => (b.hi[i] - b.lo[i]) / 2), g.angles);
      if (!r)
        return null;
      const m = [0, 1, 2].map((i) => (b.hi[i] + b.lo[i]) / 2);
      return { lo: m.map((v, i) => v - r[i]), hi: m.map((v, i) => v + r[i]) };
    }
    case "mirror": {
      const b = pm.abox[g.target];
      const at2 = mirrorAt;
      if (!b || !at2)
        return null;
      const lo = [...b.lo];
      const hi = [...b.hi];
      lo[at2.axis] = 2 * at2.at - b.hi[at2.axis];
      hi[at2.axis] = 2 * at2.at - b.lo[at2.axis];
      return unionBox([b, { lo, hi }]);
    }
    case "pattern": {
      const b = pm.abox[g.target];
      if (!b)
        return null;
      if (g.count < 2)
        return b;
      if (g.mode === "circular")
        return null;
      const s = g.step ?? [0, 0, 0];
      return unionBox(Array.from({ length: g.count }, (_, i) => shiftBox(b, s.map((v) => v * i))));
    }
    default:
      return null;
  }
}
var boxGap = (a, b) => [0, 1, 2].map((i) => Math.max(a.bbox[i] - b.bbox[i + 3], b.bbox[i] - a.bbox[i + 3]));
function aggregatePM(res, names) {
  const bs = res.measure.bodies.filter((b) => names.includes(b.name));
  if (!bs.length)
    return null;
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  for (const b of bs)
    for (let i = 0; i < 3; i++) {
      lo[i] = Math.min(lo[i], b.bbox.min[i]);
      hi[i] = Math.max(hi[i], b.bbox.max[i]);
    }
  return {
    volume: bs.reduce((s, b) => s + b.volume_mm3, 0),
    faces: bs.reduce((s, b) => s + b.faces, 0),
    kernelFaces: bs.reduce((s, b) => s + b.kernel.faces, 0),
    shells: bs.reduce((s, b) => s + b.kernel.shells, 0),
    curved: bs.some((b) => Object.keys(b.face_types ?? {}).some((k) => k !== "plane")),
    bbox: [...lo, ...hi],
    faceTypes: bs.reduce((a, b) => {
      for (const [k, v] of Object.entries(b.face_types ?? {}))
        a[k] = (a[k] ?? 0) + v;
      return a;
    }, {}),
    com: [0, 1, 2].map((i) => bs.reduce((a, b) => a + b.volume_mm3 * b.center_of_mass[i], 0) / bs.reduce((a, b) => a + b.volume_mm3, 0)),
    bodies: bs.map((b) => b.name)
  };
}
var refuse5 = (sentence, guard) => guard ? { refusal: sentence, guard } : { refusal: sentence };
function pmDep(f, role, id, st) {
  const r = st.refused[id];
  if (r)
    return `${f.id} (${f.kind}): its ${role} ${id} was refused (${st.pm?.raw[id] ?? r})`;
  if (st.stale[id])
    return `${f.id} (${f.kind}): its ${role} ${id} was already changed in place by ${st.stale[id]}, and a solidcraft command list has no second copy of it`;
  return null;
}
var pmPattern = (f, st, _ctx, h) => {
  const g = PFV(f);
  const d = h.dep(g.target);
  if (d)
    return refuse5(d);
  const bs = h.needBody(g.target);
  if (!bs || bs.length !== 1)
    return refuse5(`${g.id} (pattern): needs a single target body`);
  if (g.count < 2)
    return { variants: [[]], produces: bs, consumes: [g.target], identity: true };
  const tm = st.measure[g.target];
  if (tm) {
    const mn = minExtent(tm.bbox.slice(0, 3), tm.bbox.slice(3));
    const tau = SNAP_REL * mn;
    let disp = 0;
    if (g.mode === "circular") {
      const ai = { x: 0, y: 1, z: 2 }[g.axis ?? "z"];
      const th = 2 * Math.PI / g.count;
      for (const cx of [0, 3])
        for (const cy of [1, 4])
          for (const cz of [2, 5]) {
            const c = [tm.bbox[cx], tm.bbox[cy], tm.bbox[cz]];
            const rho = Math.hypot(...c.filter((_x, i) => i !== ai));
            disp = Math.max(disp, 2 * rho * Math.sin(th / 2));
          }
    } else
      disp = len4(g.step ?? [0, 0, 0]);
    if (mn > 0 && disp > 0 && disp <= tau)
      return refuse5(`${g.id} (pattern): near-coincident copies: consecutive copies are shifted by only ${fmtMm2(disp)} mm (${fmtMm2(tau)} mm is the smallest safe shift: ${SNAP_REL * 100}% of the part's smallest size ${fmtMm2(mn)} mm), so solid.combine join would drop the thin layer between them and report the original's volume`, "PM-SNAP");
  }
  const copies = [bs[0], ...Array.from({ length: g.count - 1 }, (_x, i) => `${bs[0]} (${i + 2})`)];
  let pat;
  if (g.mode === "circular") {
    const tot = g.totalAngle ?? 360;
    if (tot !== 360)
      return refuse5(`${g.id} (pattern): a circular pattern over less than 360 degrees is not mapped (solidcraft's angle semantics were not verified)`);
    pat = { command: "solid.pattern.circular", params: { bodies: bs, axis: AXN3[g.axis ?? "z"], count: g.count } };
  } else {
    const s = g.step ?? [0, 0, 0];
    if (isZero33(s))
      return refuse5(`${g.id} (pattern): a zero step puts every copy on the original`);
    const L = len4(s);
    pat = { command: "solid.pattern.rectangular", params: { bodies: bs, dir1: s.map((v) => v / L), count1: g.count, spacing1: L } };
  }
  const join = { command: "solid.combine", params: { target: copies[0], tools: copies.slice(1), operation: "join" } };
  return { variants: [[pat, join], [pat]], produces: copies, consumes: [g.target], copiesOf: bs[0] };
};
var pmMirror = (f, st, _ctx, h) => {
  const g = PFV(f);
  const d = h.dep(g.target);
  if (d)
    return refuse5(d);
  const bs = h.needBody(g.target);
  const m = st.measure[g.target];
  if (!m)
    return refuse5(`${g.id} (mirror): no measured bounding box for ${g.target}`);
  const axis = g.plane === "yz" ? 0 : g.plane === "xz" ? 1 : 2;
  let lo = m.bbox[axis];
  let hi = m.bbox[axis + 3];
  let how = "measured";
  const a = st.pm.abox[g.target];
  const ext = Math.max(...[0, 1, 2].map((i) => m.bbox[i + 3] - m.bbox[i]), 1);
  const tol = 1e-3 + 1e-4 * ext;
  if (a && [0, 1, 2].every((i) => Math.abs(a.lo[i] - m.bbox[i]) <= tol && Math.abs(a.hi[i] - m.bbox[i + 3]) <= tol)) {
    lo = a.lo[axis];
    hi = a.hi[axis];
    how = "analytic";
  } else if (m.curved)
    return refuse5(`${g.id} (mirror): cannot tell exactly where the part ends along the mirror direction (no analytic box, curved faces) -- truck's box is tessellation-derived`);
  else if (Math.abs(Math.abs(lo) - Math.abs(hi)) <= 1e-9 * Math.max(1, Math.abs(lo), Math.abs(hi))) {
    hi = -lo;
    how = "measured-planar-tie";
  }
  const at2 = Math.abs(lo) <= Math.abs(hi) ? lo : hi;
  const origin = [0, 0, 0];
  origin[axis] = at2;
  const normal = [0, 0, 0];
  normal[axis] = 1;
  return { variants: [[{ command: "solid.mirror", params: { bodies: bs, plane: { origin, normal }, combine: true } }]], produces: bs, consumes: [g.target], mirrorAt: { axis, at: at2, how } };
};
var PM_PLAIN = { ...BASE_PROFILE, name: "patterns-mirror(plain)", depSentence: pmDep };
var pmPocket = (f, st, ctx) => {
  const p = planFeature(f, st, ctx, PM_PLAIN);
  if ("refusal" in p || "noop" in p)
    return p;
  if (!PFV(f).reversed)
    return p;
  const variants = p.variants.map((v) => v.map((c, i) => i === v.length - 1 && c.command === "solid.extrude" ? { ...c, params: { ...c.params, direction: "positive" } } : c));
  return { ...p, variants };
};
var pmExtrude = (f, st, ctx) => {
  const g = PFV(f);
  const canTaper = !!g.taper && !(g.midplane || g.length2 || g.reversed || g.direction || g.alongNormal) && g.height > 0 && Math.abs(g.taper) <= 89.9;
  const p = planFeature(canTaper ? { ...f, taper: void 0 } : f, st, ctx, PM_PLAIN);
  if (!canTaper || "refusal" in p || "noop" in p)
    return p;
  const sk = st.sketches[g.target];
  const o = ctx.arc.outlineOf(sk);
  if (!o.ok)
    return refuse5(`${g.id} (extrude): sketch ${sk.id} has no usable outline`);
  const oo = { ...o, shape: sk.shape };
  const size = outlineSize(oo, ctx.arc);
  const fold = taperFold(oo, ctx.arc, g.height * Math.tan(g.taper * Math.PI / 180), sk.shape === "circle" ? size.minRadius : null);
  if (fold)
    return refuse5(`${g.id} (extrude): a taper of ${g.taper} degrees over ${g.height} mm makes the outline fold over itself (the taper closes the profile)`);
  const variants = p.variants.map((v) => v.map((c, i) => i === v.length - 1 && c.command === "solid.extrude" ? { ...c, params: { ...c.params, taper: g.taper } } : c));
  return { ...p, variants };
};
var PM_PLAN = { ...PM_PLAIN, name: "patterns-mirror(plan)", planners: { pattern: pmPattern, mirror: pmMirror, pocket: pmPocket, extrude: pmExtrude } };
var TOLC = 1e-3;
async function pmStep(f, idx, env) {
  const { doc, ctx, st, accepted, out } = env;
  const pm = st.pm;
  const g = PFV(f);
  const prefix = doc.features.slice(0, idx);
  const note = (o) => {
    out.push({ id: f.id, kind: f.kind, ...o });
  };
  const headRoot = (id) => {
    const seen = /* @__PURE__ */ new Set();
    let h = id;
    while (st.head[h] && !seen.has(h)) {
      seen.add(h);
      h = st.head[h];
    }
    return h;
  };
  const rootStudent = (raw) => {
    const m = /its (?:target|sketch|solid) (\S+) was refused/.exec(raw);
    const sx = m ? pm.student[m[1]] ?? st.refused[m[1]] : void 0;
    if (m && sx) {
      const dep = pm.rootOf[headRoot(m[1])] ?? pm.rootOf[m[1]];
      if (dep) {
        pm.rootOf[f.id] = dep;
        return `${fname(g)}(): it needs ${dep.call}() to be built first, and that was refused: ${dep.reason}`;
      }
      if (!pm.student[m[1]]) {
        const x = doc.features.find((y) => y.id === m[1]);
        const why = sx.replace(/^\S+( \([^)]*\))?:\s*/, "").replace(/\.?$/, ".");
        if (x)
          return `${fname(g)}(): it needs ${fname(PFV(x))}() to be built first, and that was refused: ${why}`;
      }
      return sx;
    }
    if (/was already changed in place/.test(raw))
      return `${fname(g)}(): the shape it works on was already used up by an earlier step, so it cannot be used a second time.`;
    return studentSentence(g, raw);
  };
  const refusedNote = (raw, student, commands, guard) => {
    const sentence = student ?? rootStudent(raw);
    st.refused[f.id] = sentence;
    pm.raw[f.id] = raw;
    pm.student[f.id] = sentence;
    if (!pm.rootOf[f.id])
      pm.rootOf[f.id] = { call: fname(g), reason: sentence.replace(/^[\w]+\(\): /, "") };
    note({ status: "refused", refusal: sentence, raw, ...guard ? { guard } : {}, commands });
  };
  const DOC_BUDGET = ctx.pmDocBudgetMs ?? 36e5;
  if (Date.now() - pm.docT0 > DOC_BUDGET && f.kind !== "sketch" && f.kind !== "datum") {
    refusedNote(`${f.id} (${f.kind}): TIME BUDGET: whole model exceeded ${DOC_BUDGET} ms before this step`, void 0, [], "G-BUDGET");
    return;
  }
  if (f.kind === "sketch")
    st.sketches[f.id] = f;
  const resolved = await resolveNamesFor(f, prefix, env);
  const fctx = { ...ctx, resolve: (name) => resolved.get(name) ?? null };
  let planned;
  try {
    planned = planFeature(f, st, fctx, PM_PLAN);
  } catch (e) {
    planned = refuse5(`${f.id} (${f.kind}): translator error: ${e.message}`);
  }
  if ("refusal" in planned) {
    const pg = planned.guard;
    refusedNote(planned.refusal, isVerbatimGuard(pg) ? planned.refusal : void 0, [], pg);
    return;
  }
  if ("noop" in planned) {
    note({ status: "noop", commands: [] });
    return;
  }
  const plan = planned;
  let cut;
  try {
    cut = cutGuard(f, st, ctx);
  } catch (e) {
    refusedNote(`${f.id} (${f.kind}): translator error: ${e.message}`, void 0, []);
    return;
  }
  if (cut) {
    refusedNote(cut.raw, void 0, [], cut.guard);
    return;
  }
  if ((f.kind === "pattern" || f.kind === "mirror") && !plan.identity) {
    const tm = st.measure[g.target];
    if (tm && pm.torus[g.target]) {
      let clear = false;
      const bb = tm.bbox;
      if (f.kind === "pattern" && g.mode !== "circular") {
        const s0 = g.step ?? [0, 0, 0];
        clear = [0, 1, 2].some((a) => Math.abs(s0[a]) > bb[a + 3] - bb[a] + 1e-3);
      } else if (f.kind === "pattern") {
        const ax = { x: 0, y: 1, z: 2 }[g.axis ?? "z"];
        const mid = [0, 1, 2].map((i) => (bb[i] + bb[i + 3]) / 2);
        const rad = Math.hypot(...mid.filter((_x, i) => i !== ax));
        const bsr = Math.hypot(...[0, 1, 2].map((i) => (bb[i + 3] - bb[i]) / 2));
        const spacing = 2 * Math.PI / g.count;
        clear = (g.totalAngle ?? 360) === 360 && 2 * rad * Math.sin(spacing / 2) > 2 * bsr + 1e-3;
      }
      if (!clear) {
        refusedNote(`${f.id} (${f.kind}): a torus is in the shape and its copies are not provably clear of each other (truck does not return on touching tori)`, f.kind === "mirror" ? "mirror(): a mirrored ring always meets its original along a circle, so the two would not become one solid -- build the second ring yourself with move() and leave a clear gap." : `${fname(g)}(): rings that touch or overlap cannot be fused reliably yet -- space the copies so the rings do not meet.`, [], "PM-TORUS");
        return;
      }
    }
  }
  let lastErr = null;
  let firstJoinErr = null;
  const B = ctx.pmBudgetMs ?? 6e5;
  const callSC = async (cmds) => {
    const t0 = Date.now();
    const budgetMs = B + 2 * pm.accMs + 1e3;
    let r;
    try {
      r = await ctx.runSC(cmds, { budgetS: budgetMs / 1e3 });
    } catch (e) {
      r = { ok: false, failed: { command: "(wasm)", error: `WASM TRAP: ${e.message}` } };
    }
    r.wallMs = Date.now() - t0;
    if (r.timedOut)
      r = { ...r, ok: false, failed: { command: "(budget)", error: `TIME BUDGET: exceeded ${B} ms` } };
    return r;
  };
  let errored = false;
  for (const [vi, variant0] of plan.variants.entries()) {
    let variant = variant0;
    let repaired;
    let res = await callSC([...accepted, ...variant]);
    if (!res.ok) {
      if (res.erroredBody)
        errored = true;
      lastErr = res.failed ? `${res.failed.command}: ${res.failed.error}` : String(res.error ?? "unknown");
      if (res.timedOut) {
        refusedNote(`${f.id} (${f.kind}): ${lastErr}`, void 0, variant, "G-BUDGET");
        return;
      }
      if (vi === 0 && plan.copiesOf)
        firstJoinErr = lastErr;
      continue;
    }
    const known = pm.known ?? /* @__PURE__ */ new Set();
    let fresh = res.measure.bodies.map((b) => b.name).filter((n) => !known.has(n) && !plan.produces.includes(n));
    let m = aggregatePM(res, [...plan.produces, ...fresh]);
    if (!m) {
      lastErr = `solidcraft ran the commands but no body named ${plan.produces.join(", ")} came back`;
      continue;
    }
    const sv = f.kind === "extrude" ? sketchVolumeRefusal(f, st.sketches[f.target], ctx, res, plan.produces) : null;
    if (sv) {
      refusedNote(sv, sv, variant, SKETCH_VOLUME_GUARD);
      return;
    }
    const mv = motionRefusal(f, st, ctx, res, plan.produces, accepted);
    const fx = mv ? await motionRepair(f, st, ctx, mv, plan.produces, accepted, variant, callSC) : null;
    const m2 = fx ? aggregatePM(fx.res, [...plan.produces, ...fx.res.measure.bodies.map((b) => b.name).filter((n) => !known.has(n) && !plan.produces.includes(n))]) : null;
    if (mv && fx && m2) {
      variant = fx.variant;
      res = fx.res;
      m = m2;
      repaired = { pads: fx.pads, reason: mv.sentence };
      fresh = res.measure.bodies.map((b) => b.name).filter((n) => !known.has(n) && !plan.produces.includes(n));
    } else if (mv) {
      refusedNote(mv.sentence, mv.sentence, variant, mv.guard);
      return;
    }
    const bl = blendRefusal(f, blendOf(plan), beforeOf(st, g.target), m, ctx);
    if (bl) {
      refusedNote(bl.sentence, bl.sentence, variant, bl.guard);
      return;
    }
    if (f.kind === "mirror" && st.measure[g.target]?.shells === 1 && m.shells > 1) {
      refusedNote(`${f.id} (mirror): mirror copy not fused: solid.mirror combine:true returned ${m.bodies.length} body(ies) with ${m.shells} shells for one input body of 1 shell (${m.bodies.join(", ")})`, void 0, variant, "PM-FUSED");
      return;
    }
    if (f.kind === "mirror" && plan.mirrorAt && !m.curved && st.measure[g.target]?.shells === 1 && st.measure[g.target]?.volume > 0) {
      const V0 = st.measure[g.target].volume;
      const bb = st.measure[g.target].bbox;
      const ax = plan.mirrorAt.axis;
      const side = (bb[ax] + bb[ax + 3]) / 2 > plan.mirrorAt.at ? 1 : -1;
      let probeFailed = null;
      const ovAt = async (d) => {
        const cmd = variant[0];
        const plane = cmd.params.plane;
        const o = [...plane.origin];
        o[ax] += side * d / 2;
        const r = await callSC([...accepted, { ...cmd, params: { ...cmd.params, plane: { ...plane, origin: o } } }]);
        if (r.timedOut)
          return { timedOut: r };
        if (!r.ok) {
          probeFailed = `${r.failed ? `${r.failed.command}: ${r.failed.error}` : String(r.error ?? "unknown")}`;
          return null;
        }
        const mm2 = aggregatePM(r, [...plan.produces, ...r.measure.bodies.map((b) => b.name).filter((n) => !known.has(n))]);
        if (!mm2)
          probeFailed = "no body came back";
        return mm2 ? 2 * V0 - mm2.volume : null;
      };
      const o1 = await ovAt(0.01);
      if (o1 !== null && typeof o1 === "object") {
        refusedNote(`${f.id} (${f.kind}): ${o1.timedOut.failed.error}`, void 0, variant, "G-BUDGET");
        return;
      }
      const o2 = await ovAt(1e-3);
      if (o2 !== null && typeof o2 === "object") {
        refusedNote(`${f.id} (${f.kind}): ${o2.timedOut.failed.error}`, void 0, variant, "G-BUDGET");
        return;
      }
      if (probeFailed !== null) {
        refusedNote(`${f.id} (mirror): mirror contact check could not run: a probe run failed (${probeFailed})`, "mirror(): the check that the mirrored copy meets the part along a face could not be completed, so this mirror is left out -- try again, or mirror in a direction where the part has a flat face.", variant, "PM-MIRCONTACT");
        return;
      }
      if (o1 != null && o2 != null) {
        const k = o2 > 0 && o1 > 0 ? Math.log10(o1 / o2) : Infinity;
        if (!(o1 > 1e-9 * V0) || k > 1.5) {
          refusedNote(`${f.id} (mirror): mirror contact is not a face: the overlap of the copy pushed in by 1e-2 and 1e-3 mm is ${o1.toExponential(2)} and ${o2.toExponential(2)} mm3 (growth exponent ${Number.isFinite(k) ? k.toFixed(2) : "inf"}; a face contact grows like 1, an edge like 2, a point like 3)`, void 0, variant, "PM-MIRCONTACT");
          return;
        }
      }
    }
    if (plan.copiesOf && vi > 0) {
      const cps = res.measure.bodies.filter((b) => plan.produces.includes(b.name));
      const bbx = (b) => ({ bbox: [...b.bbox.min, ...b.bbox.max] });
      let wa = 0;
      let wb = 0;
      let closest = Infinity;
      for (let a = 0; a < cps.length; a++)
        for (let b = a + 1; b < cps.length; b++) {
          const gp = Math.max(...boxGap(bbx(cps[a]), bbx(cps[b])));
          if (gp < closest) {
            closest = gp;
            wa = a;
            wb = b;
          }
        }
      if (cps.length > 1 && !(closest > 1e-3)) {
        const curved = m.curved;
        const depth = -closest;
        const sub8 = !curved && depth > 0 && depth <= 1e-5;
        const why = sub8 ? `sub-resolution overlap: copies ${wa + 1} and ${wb + 1} overlap by only ${depth.toExponential(1)} mm and solid.combine could not join them (${firstJoinErr})` : `copies overlap or touch${curved ? " (curved faces)" : ""}: copies ${wa + 1} and ${wb + 1} have bbox gap ${closest.toExponential(1)} and solid.combine could not join them (${firstJoinErr}); leaving them as ${cps.length} separate bodies would add their volumes`;
        refusedNote(`${f.id} (pattern): ${why}`, void 0, variant, "PM-DISJOINT");
        return;
      }
    }
    if (f.kind === "pattern" && !plan.identity) {
      const sep = await callSC([...accepted, variant[0]]);
      if (sep.timedOut) {
        refusedNote(`${f.id} (${f.kind}): ${sep.failed.error}`, void 0, variant, "G-BUDGET");
        return;
      }
      const cps = sep.ok ? sep.measure.bodies.filter((b) => plan.produces.includes(b.name)) : [];
      const bb = (b) => ({ bbox: [...b.bbox.min, ...b.bbox.max] });
      const isCurved2 = (b) => Object.keys(b.face_types ?? {}).some((k) => k !== "plane");
      const par = cps.map((_x, i2) => i2);
      const fnd = (i2) => par[i2] === i2 ? i2 : par[i2] = fnd(par[i2]);
      const cand = [];
      const nudge = [];
      for (let a = 0; a < cps.length; a++)
        for (let b = a + 1; b < cps.length; b++) {
          const gap = boxGap(bb(cps[a]), bb(cps[b]));
          if (!isCurved2(cps[a]) && !isCurved2(cps[b]) && gap.every((x) => x <= 1e-8)) {
            const depth = Math.min(...gap.filter((x) => x < -1e-8).map((x) => -x));
            if (depth <= SLIVER_MM) {
              refusedNote(`${f.id} (pattern): sub-resolution overlap: copies ${a + 1} and ${b + 1} overlap by only ${depth.toExponential(1)} mm along one direction (bbox overlap), below the ${SLIVER_MM} mm solid.combine join fuses exactly`, void 0, variant, "PM-SLIVER");
              return;
            }
          }
          if (!gap.every((x) => x <= TOLC))
            continue;
          par[fnd(a)] = fnd(b);
          const gmax = Math.max(...gap);
          if (!isCurved2(cps[a]) && !isCurved2(cps[b]) && gmax > 1e-8) {
            refusedNote(`${f.id} (pattern): sub-resolution gap: copies ${a + 1} and ${b + 1} are apart by ${gmax.toExponential(1)} mm (bbox gap), below the 1e-3 mm the kernel can keep apart`, void 0, variant, "PM-SUBGAP");
            return;
          }
          if (gap.some((x) => Math.abs(x) <= TOLC))
            cand.push([a, b, gap, isCurved2(cps[a]) || isCurved2(cps[b])]);
          else if (isCurved2(cps[a]) || isCurved2(cps[b]))
            nudge.push([a, b, gap]);
        }
      const K = new Set(cps.map((_x, i2) => fnd(i2))).size;
      const S = res.measure.bodies.filter((b) => [...plan.produces, ...fresh].includes(b.name)).reduce((t, b) => t + b.kernel.shells, 0);
      if (S > K) {
        for (const [a, b, gap, curvedPair] of cand) {
          const two = await callSC([...accepted, variant[0], { command: "solid.combine", params: { target: cps[a].name, tools: [cps[b].name], operation: "join" } }]);
          if (two.timedOut) {
            refusedNote(`${f.id} (${f.kind}): ${two.failed.error}`, void 0, variant, "G-BUDGET");
            return;
          }
          const tb = two.ok ? two.measure.bodies.find((x) => x.name === cps[a].name) : null;
          const gs = gap.map((x) => x.toExponential(1)).join(",");
          if (!two.ok && /join cannot preserve the original faces/.test(two.failed?.error ?? "")) {
            refusedNote(`${f.id} (pattern): copies ${a + 1} and ${b + 1} meet only along an edge or at a point${curvedPair ? ` [curved-near${nearTag(gap)}]` : ""} (bbox gap ${gs}; solid.combine: ${two.failed.error})`, void 0, variant, "PM-CONTACT");
            return;
          }
          const volTol = (curvedPair ? 3e-4 : 1e-6) * tb?.volume_mm3;
          if (tb && tb.kernel.shells >= 2 && Math.abs(tb.volume_mm3 - cps[a].volume_mm3 - cps[b].volume_mm3) <= volTol) {
            refusedNote(`${f.id} (pattern): copies ${a + 1} and ${b + 1} meet only along an edge or at a point${curvedPair ? ` [curved-near${nearTag(gap)}]` : ""} (bbox gap ${gs}; joined pair keeps ${tb.kernel.shells} shells, volume = sum${curvedPair ? " within the curved tolerance" : ""}; whole result ${S} shells vs ${K} bbox-connected groups)`, void 0, variant, "PM-CONTACT");
            return;
          }
        }
        for (const [a, b, gap] of nudge) {
          const ca = cps[a].center_of_mass;
          const cb = cps[b].center_of_mass;
          const d = [0, 1, 2].map((i) => ca[i] - cb[i]);
          const L = Math.hypot(...d);
          if (!(L > 1e-9))
            continue;
          const t = d.map((v) => v / L * 2e-3);
          const nu = await callSC([...accepted, variant[0], { command: "solid.move", params: { bodies: [cps[b].name], translate: t } }, { command: "solid.combine", params: { target: cps[a].name, tools: [cps[b].name], operation: "join" } }]);
          if (nu.timedOut) {
            refusedNote(`${f.id} (${f.kind}): ${nu.failed.error}`, void 0, variant, "G-BUDGET");
            return;
          }
          const nb = nu.ok ? nu.measure.bodies.find((x) => x.name === cps[a].name) : null;
          if (nb && nb.kernel.shells === 1) {
            refusedNote(`${f.id} (pattern): copies ${a + 1} and ${b + 1} meet only along an edge or at a point [curved-near${nearTag(gap)}] (curved copies with overlapping boxes, bbox gap ${gap.map((x) => x.toExponential(1)).join(",")}; pushed 2e-3 mm together they fuse into one shell, so they were touching; whole result ${S} shells vs ${K} bbox-connected groups)`, void 0, variant, "PM-CONTACT");
            return;
          }
        }
      }
      if (cps.length > 1 && cps.every((b) => !isCurved2(b))) {
        let allApart = true;
        for (let a2 = 0; a2 < cps.length && allApart; a2++)
          for (let b2 = a2 + 1; b2 < cps.length; b2++) {
            if (!(Math.max(...boxGap(bb(cps[a2]), bb(cps[b2]))) > TOLC)) {
              allApart = false;
              break;
            }
          }
        const sumV = cps.reduce((t2, b3) => t2 + b3.volume_mm3, 0);
        if (allApart && Math.abs(m.volume - sumV) > 1e-9 * sumV) {
          refusedNote(`${f.id} (pattern): sum check: the ${cps.length} copies are all apart (bbox gap above 1e-3 mm) so the result must be the sum of their volumes ${sumV.toPrecision(12)}, but solid.combine join returned ${m.volume.toPrecision(12)} (relative difference ${(Math.abs(m.volume - sumV) / sumV).toExponential(1)})`, void 0, variant, "PM-SUMCHECK");
          return;
        }
      }
    }
    const pc = f.kind === "pocket" ? await pocketCutRefusal(f, ctx, res, accepted, variant, plan.produces, callSC) : null;
    if (pc) {
      refusedNote(pc, pc, variant, POCKET_CUT_GUARD);
      return;
    }
    const hc = f.kind === "shell" ? hollowRefusal(f, doc.features, st, ctx, res, plan.produces, accepted) : null;
    if (hc) {
      refusedNote(hc.sentence, hc.sentence, variant, hc.guard);
      return;
    }
    accepted.push(...variant);
    rememberRun(accepted, res);
    if (plan.mirrorAt)
      pm.mirrorAt[f.id] = plan.mirrorAt;
    pm.produced = plan.produces;
    for (const mp of membersOf0(env.profile))
      mp.onAccepted?.(st, res, m, null, { f, ctx });
    st.accLen[f.id] = accepted.length;
    st.bodies[f.id] = m.bodies;
    st.measure[f.id] = m;
    for (const c of plan.consumes) {
      if (c === f.id)
        continue;
      if (f.kind === "hole" || f.kind === "pocket" || f.kind === "groove") {
        if (c === (f.kind === "hole" ? g.target : g.into))
          st.head[c] = f.id;
      } else
        st.stale[c] = f.id;
    }
    note({ status: "built", commands: variant, measure: m, pickedFrom: plan.pickedFrom, variantsTried: plan.variants.indexOf(variant0) + 1, ...repaired ? { repaired } : {}, pick: variant.find((c) => c.params.edges || c.params.faces)?.params ?? null, ...plan.mirrorAt ? { mirrorAt: plan.mirrorAt } : {}, wallMs: res.wallMs });
    return;
  }
  if (errored) {
    refusedNote(`${f.id} (${f.kind}): solidcraft refused it -- ${lastErr}`, erroredBodySentence(f), plan.variants[0], ERRORED_BODY_GUARD);
    return;
  }
  refusedNote(`${f.id} (${f.kind}): solidcraft refused it -- ${lastErr}`, void 0, plan.variants[0]);
}
var membersOf0 = (p) => p.members ?? [p];
function pmAccepted(st, res, m, _plan, acc) {
  const pm = st.pm;
  pm.known = new Set(res.measure.bodies.map((b) => b.name));
  if (!acc)
    return;
  const { f, ctx } = acc;
  const g = PFV(f);
  pm.accMs = res.wallMs ?? 0;
  const tb = g.kind === "pocket" || g.kind === "hole" ? toolBoxOf(f, st, ctx) : null;
  const into = g.kind === "pocket" ? g.into : g.kind === "hole" ? g.target : null;
  const p0 = into !== null ? st.bodies[headOf(st, into)]?.[0] : void 0;
  if (tb && p0)
    (pm.tools[p0] ??= []).push(tb);
  else
    for (const b of pm.produced ?? m.bodies)
      delete pm.tools[b];
  pm.produced = void 0;
  pm.abox[f.id] = analyticBox(f, st, ctx, pm.mirrorAt[f.id]);
  pm.torus[f.id] = f.kind === "torus" || [g.target, g.into, ...g.targets ?? []].some((t) => !!t && !!pm.torus[t]);
}
var PM_PROFILE = {
  name: "patterns-mirror",
  // the owner of 'pattern' and 'mirror' in a composition; both planners are synchronous, the step calls them through PM_PLAN with the two adapters
  planners: { pattern: pmPattern, mirror: pmMirror },
  verifies: false,
  initState(st) {
    initPM(st);
  },
  depSentence: pmDep,
  noOutline: BASE_PROFILE.noOutline,
  plannerError: BASE_PROFILE.plannerError,
  kernelRefusal: BASE_PROFILE.kernelRefusal,
  onAccepted: pmAccepted,
  step: pmStep
};

// ../../layer/dist/booleans-slow.js
var EPS_AXIS = 1e-6;
var dot5 = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
var cross4 = (u, v) => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
var norm = (v) => Math.hypot(v[0], v[1], v[2]);
var unit = (v) => {
  const n = norm(v);
  return n < 1e-12 ? [0, 0, 0] : [v[0] / n, v[1] / n, v[2] / n];
};
var add = (u, v) => [u[0] + v[0], u[1] + v[1], u[2] + v[2]];
var sub4 = (u, v) => [u[0] - v[0], u[1] - v[1], u[2] - v[2]];
var scale = (v, k) => [v[0] * k, v[1] * k, v[2] * k];
var canon = (v) => {
  const u = unit(v);
  const s = (u.find((x) => Math.abs(x) > 1e-9) ?? 1) < 0 ? -1 : 1;
  return u.map((x) => Math.round(x * s * 1e9) / 1e9 + 0);
};
function rotMat(rot) {
  const d = Math.PI / 180;
  const [ax, ay, az] = (rot ?? [0, 0, 0]).map((v) => v * d);
  const cx = Math.cos(ax), sx = Math.sin(ax), cy = Math.cos(ay), sy = Math.sin(ay), cz = Math.cos(az), sz = Math.sin(az);
  const Rx = [[1, 0, 0], [0, cx, -sx], [0, sx, cx]];
  const Ry = [[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]];
  const Rz = [[cz, -sz, 0], [sz, cz, 0], [0, 0, 1]];
  const mul3 = (A, B) => A.map((r) => [0, 1, 2].map((j) => r[0] * B[0][j] + r[1] * B[1][j] + r[2] * B[2][j]));
  return mul3(Rz, mul3(Ry, Rx));
}
var apply = (R, v) => [0, 1, 2].map((i) => R[i][0] * v[0] + R[i][1] * v[1] + R[i][2] * v[2]);
var empty = () => ({ cyl: [], cone: [], torus: [], sphere: false, normals: [], unknownPlanes: false, unknownCurved: false });
var merge = (...xs) => {
  const o = empty();
  for (const x of xs) {
    o.cyl.push(...x.cyl);
    o.cone.push(...x.cone);
    o.torus.push(...x.torus);
    o.sphere ||= x.sphere;
    o.normals.push(...x.normals);
    o.unknownPlanes ||= x.unknownPlanes;
    o.unknownCurved ||= x.unknownCurved;
  }
  const dd = (a) => {
    const seen = /* @__PURE__ */ new Set();
    return a.filter((v) => {
      const k = canon(v).join(",");
      if (seen.has(k))
        return false;
      seen.add(k);
      return true;
    });
  };
  o.cyl = dd(o.cyl);
  o.cone = dd(o.cone);
  o.torus = dd(o.torus);
  o.normals = dd(o.normals);
  return o;
};
var mapVec = (x, fn) => ({ ...x, cyl: x.cyl.map(fn), cone: x.cone.map(fn), torus: x.torus.map(fn), normals: x.normals.map(fn) });
var MIRROR_N = { xy: [0, 0, 1], xz: [0, 1, 0], yz: [1, 0, 0] };
var PLANE_WORD = { "left-right": [1, 0, 0], "front-back": [0, 1, 0], "top-bottom": [0, 0, 1] };
var AXIS_V = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };
function primInfo(f) {
  const R = rotMat(f.rotate);
  const ax = (i) => apply(R, [[1, 0, 0], [0, 1, 0], [0, 0, 1]][i]);
  const o = empty();
  const z = ax(2);
  if (f.kind === "box") {
    o.normals = [ax(0), ax(1), ax(2)];
    if (f.round) {
      o.cyl = [ax(0), ax(1), ax(2)];
      o.sphere = true;
    }
  } else if (f.kind === "cylinder") {
    o.cyl = [z];
    o.normals = [z];
    if (f.round)
      o.torus = [z];
  } else if (f.kind === "cone") {
    o.cone = [z];
    o.normals = [z];
  } else if (f.kind === "sphere")
    o.sphere = true;
  else if (f.kind === "torus")
    o.torus = [z];
  else if (f.kind === "prism") {
    const n = Math.max(3, Math.min(12, Math.round(f.sides)));
    o.normals = [z];
    for (let i = 0; i < n; i++) {
      const a = 2 * Math.PI * (i + 0.5) / n;
      o.normals.push(apply(R, [Math.cos(a), Math.sin(a), 0]));
    }
  } else if (f.kind === "wedge") {
    o.normals = [z, apply(R, [0, -1, 0]), apply(R, [-1, 0, 0]), apply(R, unit([f.depth, f.width, 0]))];
  } else {
    o.unknownPlanes = true;
    o.unknownCurved = true;
  }
  o.normals = o.normals.map(canon);
  return o;
}
function orient(id, featById, sketchInfo, affects = {}, _seen = /* @__PURE__ */ new Set()) {
  const base = orient1(id, featById, sketchInfo, affects, _seen);
  const extra = (affects[id] ?? []).filter((a) => !_seen.has(a)).map((a) => orient1(a, featById, sketchInfo, affects, /* @__PURE__ */ new Set([..._seen, id])));
  return extra.length ? merge(base, ...extra) : base;
}
function orient1(id, featById, sketchInfo, affects, _seen) {
  const f = featById[id];
  if (!f || _seen.has(id)) {
    const o = empty();
    o.unknownPlanes = true;
    o.unknownCurved = true;
    return o;
  }
  const seen = new Set(_seen);
  seen.add(id);
  const rec = (t) => seen.has(t) ? empty() : orient(t, featById, sketchInfo, affects, seen);
  switch (f.kind) {
    case "box":
    case "cylinder":
    case "sphere":
    case "cone":
    case "torus":
    case "prism":
    case "wedge":
      return primInfo(f);
    case "combine":
      return merge(...f.targets.map(rec));
    case "rotate": {
      const R = rotMat(f.angles);
      return mapVec(rec(f.target), (v) => canon(apply(R, v)));
    }
    case "move":
      return rec(f.target);
    case "shell":
      return rec(f.target);
    case "mirror": {
      const c = rec(f.target);
      const n = unit(PLANE_WORD[f.plane] ?? MIRROR_N[f.plane] ?? [1, 0, 0]);
      return merge(c, mapVec(c, (v) => canon(sub4(v, scale(n, 2 * dot5(v, n))))));
    }
    case "pattern": {
      const c = rec(f.target);
      if (f.mode !== "circular")
        return c;
      const R0 = (a) => {
        const d = a * Math.PI / 180;
        const k = AXIS_V[f.axis ?? "z"];
        const [x, y, z] = k;
        const cs = Math.cos(d), sn = Math.sin(d);
        return [[cs + x * x * (1 - cs), x * y * (1 - cs) - z * sn, x * z * (1 - cs) + y * sn], [y * x * (1 - cs) + z * sn, cs + y * y * (1 - cs), y * z * (1 - cs) - x * sn], [z * x * (1 - cs) - y * sn, z * y * (1 - cs) + x * sn, cs + z * z * (1 - cs)]];
      };
      const step = (f.totalAngle ?? 360) / (f.totalAngle === 360 || f.totalAngle === void 0 ? f.count : Math.max(1, f.count - 1));
      return merge(c, ...Array.from({ length: Math.max(0, f.count - 1) }, (_, i) => {
        const R = R0(step * (i + 1));
        return mapVec(c, (v) => canon(apply(R, v)));
      }));
    }
    case "fillet": {
      const c = rec(f.target);
      const ax = [];
      for (let i = 0; i < c.normals.length; i++)
        for (let j = i + 1; j < c.normals.length; j++) {
          const w = cross4(c.normals[i], c.normals[j]);
          if (norm(w) > 1e-6)
            ax.push(canon(w));
        }
      return merge(c, { ...empty(), cyl: ax, sphere: true, unknownPlanes: c.unknownPlanes, unknownCurved: c.unknownCurved });
    }
    case "draft": {
      const c = rec(f.target);
      return { ...c, unknownPlanes: true };
    }
    // a drafted wall is slanted by an angle the list does not give
    case "hole": {
      const c = rec(f.target);
      const a = AXIS_V[f.axis ?? "z"];
      return merge(c, { ...empty(), cyl: [a], normals: [a], cone: f.countersink ? [a] : [] });
    }
    case "extrude":
    case "revolve":
    case "groove":
    case "pocket": {
      const base = f.kind === "groove" || f.kind === "pocket" ? rec(f.into) : empty();
      const sk = sketchInfo ? sketchInfo(f.target) : null;
      if (!sk)
        return merge(base, { ...empty(), unknownPlanes: true, unknownCurved: true });
      const o = empty();
      if (f.kind === "extrude" || f.kind === "pocket") {
        o.normals = [sk.n, ...sk.edgeNormals];
        if (sk.arcs)
          o.cyl = [sk.n];
        if (f.taper || f.direction)
          o.unknownPlanes = true;
      } else {
        o.normals = [sk.n];
        const ax = sk.axis ?? sk.n;
        o.cyl = [ax];
        o.cone = [ax];
        o.unknownPlanes = false;
      }
      o.normals = o.normals.map(canon);
      return merge(base, o);
    }
    default: {
      const o = empty();
      o.unknownPlanes = true;
      o.unknownCurved = true;
      return o;
    }
  }
}
var slantedAxisNormal = (a, n) => {
  const c = Math.abs(dot5(unit(a), unit(n)));
  return c > EPS_AXIS && c < 1 - EPS_AXIS;
};
function orientSlant(IA, IB) {
  let unread = false;
  for (const [X, Y] of [[IA, IB], [IB, IA]]) {
    const axes = [...X.cyl, ...X.cone];
    if (!axes.length)
      continue;
    if (Y.unknownPlanes)
      unread = true;
    for (const a of axes)
      for (const n of Y.normals)
        if (slantedAxisNormal(a, n))
          return "slant";
  }
  for (const [X] of [[IA], [IB]])
    if (X.unknownCurved)
      unread = true;
  return unread ? "unread" : null;
}
var frameOf3 = (f) => {
  const R = rotMat(f.rotate);
  return { R, c: f.center ?? [0, 0, 0], ax: [0, 1, 2].map((j) => [R[0][j], R[1][j], R[2][j]]) };
};
function polytope(f) {
  const { R, c } = frameOf3(f);
  const planes = [];
  const place = (nLocal, dLocal) => {
    const n = unit(apply(R, nLocal));
    planes.push({ n, d: dLocal + dot5(n, c) });
  };
  if (f.kind === "box") {
    const [sx, sy, sz] = f.size;
    place([1, 0, 0], sx / 2);
    place([-1, 0, 0], sx / 2);
    place([0, 1, 0], sy / 2);
    place([0, -1, 0], sy / 2);
    place([0, 0, 1], sz / 2);
    place([0, 0, -1], sz / 2);
    return planes;
  }
  if (f.kind === "prism") {
    const n = Math.max(3, Math.min(12, Math.round(f.sides)));
    const ap = f.radius * Math.cos(Math.PI / n);
    for (let i = 0; i < n; i++) {
      const a = 2 * Math.PI * (i + 0.5) / n;
      place([Math.cos(a), Math.sin(a), 0], ap);
    }
    place([0, 0, 1], f.height / 2);
    place([0, 0, -1], f.height / 2);
    return planes;
  }
  if (f.kind === "wedge") {
    const w = f.width, d = f.depth;
    place([0, -1, 0], d / 2);
    place([-1, 0, 0], w / 2);
    place(unit([d, w, 0]), 0);
    place([0, 0, 1], f.height / 2);
    place([0, 0, -1], f.height / 2);
    return planes;
  }
  return null;
}
var insidePolytope = (planes, p, tol) => planes.every((pl) => dot5(pl.n, p) - pl.d <= tol);
function cylSamples(f, nTheta = 720) {
  const { c, ax } = frameOf3(f);
  const a = ax[2];
  const u = ax[0];
  const v = ax[1];
  const h = f.height / 2;
  const r = f.radius;
  const centre2 = f.rotate && f.rotate.some((x) => x) ? c : c;
  return { a, u, v, h, r, c: centre2, nTheta };
}
function cylSideMeetsSlantedFace(cf, pf) {
  const cs = cylSamples(cf);
  const planes = polytope(pf);
  if (!planes)
    return null;
  const tol = 1e-7 * Math.max(1, cs.r, cs.h);
  for (const pl of planes) {
    const k = dot5(pl.n, cs.a);
    if (!(Math.abs(k) > EPS_AXIS && Math.abs(k) < 1 - EPS_AXIS))
      continue;
    for (let i = 0; i < cs.nTheta; i++) {
      const th = 2 * Math.PI * i / cs.nTheta;
      const q = add(cs.c, add(scale(cs.u, cs.r * Math.cos(th)), scale(cs.v, cs.r * Math.sin(th))));
      const t = (pl.d - dot5(pl.n, q)) / k;
      if (Math.abs(t) > cs.h + tol)
        continue;
      const p = add(q, scale(cs.a, t));
      if (insidePolytope(planes, p, 1e-6 * Math.max(1, cs.r)))
        return true;
    }
  }
  return false;
}
function cylInsidePolytope(cf, pf) {
  const cs = cylSamples(cf, 180);
  const planes = polytope(pf);
  if (!planes)
    return null;
  for (const s of [-1, 1])
    for (let i = 0; i < cs.nTheta; i++) {
      const th = 2 * Math.PI * i / cs.nTheta;
      const p = add(add(cs.c, scale(cs.a, s * cs.h)), add(scale(cs.u, cs.r * Math.cos(th)), scale(cs.v, cs.r * Math.sin(th))));
      if (!insidePolytope(planes, p, -1e-6 * Math.max(1, cs.r)))
        return false;
    }
  return true;
}
function cylInsideCyl(Bf, Af) {
  const b = cylSamples(Bf, 180);
  const a = cylSamples(Af, 8);
  for (const s of [-1, 1])
    for (let i = 0; i < b.nTheta; i++) {
      const th = 2 * Math.PI * i / b.nTheta;
      const p = add(add(b.c, scale(b.a, s * b.h)), add(scale(b.u, b.r * Math.cos(th)), scale(b.v, b.r * Math.sin(th))));
      const rel2 = sub4(p, a.c);
      const axial = dot5(rel2, a.a);
      const rad = norm(sub4(rel2, scale(a.a, axial)));
      if (!(Math.abs(axial) < a.h - 1e-6 * Math.max(1, a.r) && rad < a.r - 1e-6 * Math.max(1, a.r)))
        return false;
    }
  return true;
}
var POLY = /* @__PURE__ */ new Set(["box", "prism", "wedge"]);
function slantedMeeting(A, B) {
  const v = orientSlant(A.info, B.info);
  if (v !== "slant")
    return v;
  for (const [X, Y] of [[A, B], [B, A]]) {
    if (X.prim?.kind === "cylinder" && !X.prim.round && Y.prim && POLY.has(Y.prim.kind) && !Y.prim.round) {
      if (cylInsidePolytope(X.prim, Y.prim))
        return null;
      const m = cylSideMeetsSlantedFace(X.prim, Y.prim);
      if (m === false)
        return null;
      if (m === true)
        return "slant";
    }
  }
  return "slant";
}
function roundBandHit(boxFeat, other) {
  if (!boxFeat || boxFeat.kind !== "box" || !boxFeat.round || boxFeat.roundStyle === "chamfer")
    return null;
  const planes = polytope(boxFeat);
  if (!planes)
    return null;
  const rf = boxFeat.round;
  const tol = 1e-6 * Math.max(1, ...boxFeat.size);
  const test = (p) => {
    const gaps = planes.map((pl) => pl.d - dot5(pl.n, p));
    if (gaps.some((g) => g < -tol))
      return false;
    return gaps.filter((g) => g < rf + tol).length >= 2;
  };
  if (other.kind === "cylinder" && !other.round) {
    const cs = cylSamples(other, 360);
    for (let k = 0; k <= 60; k++) {
      const t = -cs.h + 2 * cs.h * k / 60;
      for (let i = 0; i < cs.nTheta; i++) {
        const th = 2 * Math.PI * i / cs.nTheta;
        if (test(add(add(cs.c, scale(cs.a, t)), add(scale(cs.u, cs.r * Math.cos(th)), scale(cs.v, cs.r * Math.sin(th))))))
          return true;
      }
    }
    return false;
  }
  if (other.kind === "sphere") {
    const c = other.center ?? [0, 0, 0];
    const r = other.radius;
    for (let i = 0; i <= 90; i++) {
      const ph = Math.PI * i / 90;
      for (let j = 0; j < 180; j++) {
        const th = 2 * Math.PI * j / 180;
        if (test([c[0] + r * Math.sin(ph) * Math.cos(th), c[1] + r * Math.sin(ph) * Math.sin(th), c[2] + r * Math.cos(ph)]))
          return true;
      }
    }
    return false;
  }
  return null;
}

// ../../layer/dist/booleans-guard.js
var BUDGET_S2 = 45;
var SLIVER = { flat: 4e-3, rotated: 0.1, curvedCut: 0.2, curvedKeep: 2 };
var EPS = 1e-6;
var tolOf = (d) => hasCurved(d) ? 1e-3 + 2e-4 * Math.max(d.hi[0] - d.lo[0], d.hi[1] - d.lo[1], d.hi[2] - d.lo[2]) : EPS;
var tolPair = (a, b) => Math.max(tolOf(a), tolOf(b));
var FN = { union: "join", subtract: "cut", intersect: "keep" };
var mm = (v) => String(+v.toPrecision(3));
var SENTENCES = {
  sameShape: (op) => `${FN[op]}() was given the same shape twice; give it two different shapes.`,
  budget: (op) => `This ${FN[op]}() took longer than ${BUDGET_S2} seconds to calculate, so it was stopped and nothing was changed; use simpler shapes or cut with a box-shaped tool.`,
  trap: (op) => `The solid calculation for this ${FN[op]}() failed part-way, so nothing was changed; if two faces of the shapes are almost, but not exactly, on top of each other, move one shape so they are clearly apart or exactly together.`,
  hangCross: (op) => `Round shapes that cross at an angle or off-centre (two cylinders at right angles, a cylinder that misses the centre of a ball) take minutes to calculate here, so this ${FN[op]}() is not built; line them up on one axis or use a box-shaped tool.`,
  hangCone: (op) => `A cone combined with a cylinder, cone or ball that is not on the cone's own axis either fails or takes minutes here, so this ${FN[op]}() is not built; put the other shape on the cone's axis, or use a box-shaped tool.`,
  hangTorus: (op) => `A ring (torus) that meets another shape in anything but a box around it or a cylinder through its hole takes minutes or fails here, so this ${FN[op]}() is not built; keep the ring clear of the other shape or enclose it in a box.`,
  sliver: (op, depth = SLIVER.rotated) => `The two shapes overlap by less than ${mm(depth)} mm, which is too thin to ${op === "intersect" ? "keep" : "cut"} reliably here, so nothing was changed; make the overlap at least ${mm(depth)} mm deep or move the shapes clear of each other.`,
  cutNothingThin: () => "The cut removed nothing because the cutting shape only grazes the part or misses it; move it so the two overlap clearly.",
  cutNothing: () => "The cutting shape does not overlap the shape being cut, so nothing would be removed; move it (give it an at: position) so the two overlap.",
  keepNothing: () => "The two shapes do not overlap, so keeping their overlap leaves nothing.",
  keepNothingKernel: () => "Keeping the overlap of these shapes leaves nothing here: they do not overlap, or only by a sliver too thin to keep.",
  cutEverything: () => "The cutting shapes would remove the whole shape, so nothing would be left.",
  pinchJoin: () => "The two shapes only touch along a line or at a point, so they would not be one solid; overlap them a little.",
  thinCap: () => "The part this keep() would leave is a shallow cap of a ball that runs out past the edges of the other shape, which cannot be built reliably here, so nothing was changed; push the ball deeper into the shape or keep the cap inside the shape's edges.",
  pinchCut: () => "The cutting shape touches the part's surface along a line or at a point, which leaves a pinched solid that cannot be built correctly here, so nothing was changed; change its size or position a little so it clearly crosses that surface or stays clear of it.",
  tangentCircle: (op) => `The two round shapes only touch along a circle, which cannot be built as one clean solid here, so this ${FN[op]}() was not done; change one size a little so they clearly overlap or clearly miss each other.`,
  hollowBall: (op) => `A ball with a smaller ball taken out of its inside (a hollow ball) cannot be built here, so this ${FN[op]}() was not done.`,
  tubeTool: (op) => `A tube-shaped tool (a spin() of a ring-shaped outline) that is not wholly inside the part cannot be built correctly here, so this ${FN[op]}() was not done; cut with a solid shape instead, or keep the tube wholly inside the part.`,
  slant: (op) => `A cylinder or cone that meets a flat face at a slant (neither square to it nor parallel to it) takes minutes to calculate here, so this ${FN[op]}() is not built; turn the shapes together, or keep the round shape square to the flat faces.`,
  roundBand: (op) => `A cylinder or ball that reaches the rounded edges or corners of a rounded box takes minutes to calculate here, so this ${FN[op]}() is not built; keep the round shape clear of the rounded edges, or use a box-shaped tool.`,
  lens: (op) => `The overlap of two cylinders with parallel axes that cross each other (a lens shape) cannot be built reliably here, so this ${FN[op]}() was not done; put the two cylinders on one axis, let one contain the other, or cut with a box-shaped tool.`,
  outsideShapes: (op) => `The part this ${FN[op]}() would leave came out bigger than the shapes it was made from, so its size cannot be trusted here and nothing was changed; use a smaller round shape, or make the overlap deeper.`,
  tinyRemainder: () => "This cut() would leave only a very thin sliver of the part (under 3 percent of its volume), which cannot be calculated reliably here, so nothing was changed; cut less away, or remove the sliver on purpose with a different cut.",
  sameWall: (op) => `Two cylinders on the same axis with the same radius share their curved wall, and keeping only their overlap cannot be built here, so this ${FN[op]}() was not done; give one of them a clearly different radius, or let one contain the other.`,
  costly: (op) => `This ${FN[op]}() of round shapes would take longer than ${BUDGET_S2} seconds on this computer, so it is not built; use fewer or simpler round shapes, or cut with a box-shaped tool.`,
  coincident: (op) => `This ${FN[op]}() could not be calculated here because faces of the two shapes lie exactly on top of each other, so nothing was changed; move one shape a little so they clearly cross, or build the part in simpler steps.`,
  shallow: (op) => `This ${FN[op]}() could not be calculated here because curved faces of the two shapes meet at a shallow angle or only just touch, so nothing was changed; change a size or a position a little so they clearly cross, or build the part in simpler steps.`,
  curvedKernel: (op) => `This ${FN[op]}() could not be calculated here, so nothing was changed; try building the part in simpler steps, one join, cut or keep at a time.`,
  // only for kernel text with no recorded cause
  generic: (op) => `This ${FN[op]}() could not be built, so nothing was changed; move the shapes so they overlap more clearly.`,
  needTwo: () => "A join, cut or keep needs two or more shapes.",
  consumed: () => "This shape was already used up by an earlier join, cut or keep, so it cannot be used again; make a second copy of it.",
  skipped: () => "This step was skipped because an earlier step it depends on was not done; fix that earlier step first.",
  pieces: () => "This step needs the part to be one connected piece, but an earlier cut left it in several pieces; join the pieces together first or cut so that one piece is left."
};
var rotAxis = (rotate) => {
  let v = [0, 0, 1];
  const rx = (a2, [x, y, z]) => {
    const c = Math.cos(a2), s = Math.sin(a2);
    return [x, y * c - z * s, y * s + z * c];
  };
  const ry = (a2, [x, y, z]) => {
    const c = Math.cos(a2), s = Math.sin(a2);
    return [x * c + z * s, y, -x * s + z * c];
  };
  const rz = (a2, [x, y, z]) => {
    const c = Math.cos(a2), s = Math.sin(a2);
    return [x * c - y * s, x * s + y * c, z];
  };
  const d = Math.PI / 180;
  if (rotate?.[0])
    v = rx(rotate[0] * d, v);
  if (rotate?.[1])
    v = ry(rotate[1] * d, v);
  if (rotate?.[2])
    v = rz(rotate[2] * d, v);
  const a = v.map(Math.abs);
  for (const [i, n] of [[0, "x"], [1, "y"], [2, "z"]])
    if (a[i] > 1 - 1e-9)
      return n;
  return "oblique";
};
function describe(measure, feat, extra = {}) {
  const lo = measure.bbox.slice(0, 3);
  const hi = measure.bbox.slice(3);
  const prim = feat && ["box", "cylinder", "sphere", "cone", "torus", "prism", "wedge"].includes(feat.kind) ? feat : null;
  const aligned = !!prim && (prim.rotate ?? [0, 0, 0]).every((v) => Math.abs(v / 90 - Math.round(v / 90)) < 1e-9);
  return { lo, hi, prim, aligned, kind: prim?.kind ?? null, axis: prim && ["cylinder", "cone", "torus"].includes(prim.kind) ? rotAxis(prim.rotate) : null, round: !!(prim && prim.round), faceTypes: measure.faceTypes ?? {}, curved: !!measure.curved, ring: extra.ring ?? null, pieces: extra.pieces ?? 1, info: extra.info ?? null };
}
var overlapOf = (a, b) => [0, 1, 2].map((i) => Math.min(a.hi[i], b.hi[i]) - Math.max(a.lo[i], b.lo[i]));
var hasCurved = (d) => d.curved || d.kind === "cylinder" || d.kind === "sphere" || d.kind === "cone" || d.kind === "torus" || d.round;
var AXI3 = { x: 0, y: 1, z: 2 };
var centre = (d) => [0, 1, 2].map((i) => (d.lo[i] + d.hi[i]) / 2);
var flatOnAxis = (d, ax) => {
  if (!d.prim || d.round)
    return null;
  if (d.kind === "box")
    return d.aligned;
  if (d.kind === "cylinder")
    return d.axis === ax;
  if (d.kind === "prism" || d.kind === "wedge")
    return d.aligned ? null : false;
  return false;
};
var isPlainBox2 = (d) => d.kind === "box" && d.aligned && !d.round;
var coaxial = (a, b, tol) => {
  if (!a.axis || !b.axis || a.axis === "oblique" || a.axis !== b.axis)
    return false;
  const k = AXI3[a.axis];
  const ca = centre(a);
  const cb = centre(b);
  return [0, 1, 2].every((i) => i === k || Math.abs(ca[i] - cb[i]) <= tol);
};
function cylFacts(d) {
  if (d.prim?.kind === "cylinder" && !d.prim.round) {
    const R = rotMat(d.prim.rotate);
    const a = [R[0][2], R[1][2], R[2][2]];
    const c = d.prim.center ?? [0, 0, 0];
    return { a, c, r: d.prim.radius, h: d.prim.height };
  }
  const ft = d.faceTypes ?? {};
  if (!d.prim && d.info && d.info.cyl.length === 1 && d.info.cone.length === 0 && !d.info.sphere && d.info.torus.length === 0 && ft.cylinder === 1 && ft.plane === 2 && Object.keys(ft).length === 2) {
    const a = d.info.cyl[0];
    const k = a.findIndex((x) => Math.abs(Math.abs(x) - 1) < 1e-9);
    if (k < 0)
      return null;
    const ext = [0, 1, 2].map((i) => d.hi[i] - d.lo[i]);
    const rest = [0, 1, 2].filter((i) => i !== k);
    if (Math.abs(ext[rest[0]] - ext[rest[1]]) > 1e-3 * Math.max(1, ext[rest[0]]))
      return null;
    const c = centre(d);
    return { a: [0, 0, 0].map((_, i) => i === k ? 1 : 0), c, r: ext[rest[0]] / 2, h: ext[k] };
  }
  return null;
}
function sharedWall(A, B) {
  const a = cylFacts(A);
  const b = cylFacts(B);
  if (!a || !b)
    return false;
  const tol = 1e-6 * Math.max(1, a.r, b.r, a.h, b.h);
  const par = Math.abs(Math.abs(a.a[0] * b.a[0] + a.a[1] * b.a[1] + a.a[2] * b.a[2]) - 1) < 1e-9;
  if (!par || Math.abs(a.r - b.r) > tol)
    return false;
  const dc = [0, 1, 2].map((i) => b.c[i] - a.c[i]);
  const along = dc[0] * a.a[0] + dc[1] * a.a[1] + dc[2] * a.a[2];
  const off = Math.hypot(dc[0] - along * a.a[0], dc[1] - along * a.a[1], dc[2] - along * a.a[2]);
  if (off > tol)
    return false;
  const lo = Math.max(-a.h / 2, along - b.h / 2);
  const hi = Math.min(a.h / 2, along + b.h / 2);
  if (hi - lo <= tol)
    return false;
  const aInB = along - b.h / 2 <= -a.h / 2 + tol && along + b.h / 2 >= a.h / 2 - tol;
  const bInA = -a.h / 2 <= along - b.h / 2 + tol && a.h / 2 >= along + b.h / 2 - tol;
  return !aInB && !bInA;
}
function crossLens(A, B) {
  const a = cylFacts(A);
  const b = cylFacts(B);
  if (!a || !b)
    return false;
  const tol = 1e-6 * Math.max(1, a.r, b.r, a.h, b.h);
  const par = Math.abs(Math.abs(a.a[0] * b.a[0] + a.a[1] * b.a[1] + a.a[2] * b.a[2]) - 1) < 1e-9;
  if (!par)
    return false;
  const dc = [0, 1, 2].map((i) => b.c[i] - a.c[i]);
  const along = dc[0] * a.a[0] + dc[1] * a.a[1] + dc[2] * a.a[2];
  const off = Math.hypot(dc[0] - along * a.a[0], dc[1] - along * a.a[1], dc[2] - along * a.a[2]);
  if (off <= tol)
    return false;
  if (off >= a.r + b.r - tol || off <= Math.abs(a.r - b.r) + tol)
    return false;
  return Math.min(a.h / 2, along + b.h / 2) - Math.max(-a.h / 2, along - b.h / 2) > tol;
}
function hangOf(A, B) {
  const ov = overlapOf(A, B);
  const tol = tolPair(A, B);
  if (ov.some((v) => v < -tol))
    return null;
  for (const [t, o] of [[A, B], [B, A]]) {
    if (!(t.kind === "torus" || !t.prim && t.faceTypes.torus))
      continue;
    const inside2 = isPlainBox2(o) && [0, 1, 2].every((i) => t.lo[i] > o.lo[i] + tol && t.hi[i] < o.hi[i] - tol);
    const coax = o.kind === "cylinder" && t.kind === "torus" && coaxial(o, t, tol);
    if (!(inside2 || coax))
      return "torus";
  }
  if (A.kind === "cylinder" && B.kind === "cylinder") {
    const nested = A.prim && B.prim && !A.round && !B.round && (cylInsideCyl(A.prim, B.prim) || cylInsideCyl(B.prim, A.prim));
    if (!nested && (A.axis === "oblique" || B.axis === "oblique" || A.axis !== B.axis))
      return "cross";
  }
  const sc = A.kind === "sphere" && B.kind === "cylinder" ? [A, B] : A.kind === "cylinder" && B.kind === "sphere" ? [B, A] : null;
  if (sc) {
    const [s, c] = sc;
    if (c.axis === "oblique")
      return "cross";
    const k = AXI3[c.axis];
    const off = [0, 1, 2].filter((i) => i !== k).map((i) => (s.lo[i] + s.hi[i]) / 2 - (c.lo[i] + c.hi[i]) / 2);
    if (Math.hypot(...off) > tol)
      return "cross";
  }
  const cn = A.kind === "cone" ? [A, B] : B.kind === "cone" ? [B, A] : null;
  if (cn && hasCurved(cn[1]) && !coneOk(cn[0], cn[1], tol))
    return "cone";
  return null;
}
var CONE_OK = { cylinderCoaxial: true, coneCoaxial: true, ballCentred: true };
function coneOk(cone, other, tol) {
  if (cone.axis === "oblique")
    return false;
  if (other.kind === "cylinder" || other.kind === "cone")
    return CONE_OK[other.kind === "cylinder" ? "cylinderCoaxial" : "coneCoaxial"] && coaxial(cone, other, tol);
  if (other.kind === "sphere") {
    const k = AXI3[cone.axis];
    const cc = centre(cone);
    const cs = centre(other);
    return CONE_OK.ballCentred && [0, 1, 2].every((i) => i === k || Math.abs(cc[i] - cs[i]) <= tol);
  }
  return false;
}
var curvedOnAxis = (d, ax) => {
  if (d.round)
    return true;
  if (d.kind === "sphere" || d.kind === "cone" || d.kind === "torus")
    return true;
  if (d.kind === "cylinder")
    return d.axis !== ax;
  if (d.prim)
    return false;
  return !!d.curved;
};
function sliverClass(a, b, ax) {
  const k = "xyz"[ax];
  if (flatOnAxis(a, k) === true && flatOnAxis(b, k) === true)
    return "flat";
  if (curvedOnAxis(a, k) || curvedOnAxis(b, k))
    return "curved";
  return "rotated";
}
var BALL_KEEP_FRAC = 0.1;
var CYL_KEEP_FRAC = 0.035;
var TINY_FRAC = 0.03;
var sliverMm = (cls, op, a, b, ax = -1) => {
  if (cls === "flat")
    return SLIVER.flat;
  if (cls === "rotated")
    return SLIVER.rotated;
  if (op !== "intersect")
    return SLIVER.curvedCut;
  const R = Math.max(...[a, b].map((x) => x?.kind === "sphere" && x.prim ? x.prim.radius : 0));
  const Rc = Math.max(...[a, b].map((x) => {
    const c = cylFacts(x);
    return c && Math.abs(c.a[ax]) < 0.999 ? c.r : 0;
  }));
  return Math.max(SLIVER.curvedKeep, BALL_KEEP_FRAC * R, CYL_KEEP_FRAC * Rc);
};
var dot6 = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
var cross5 = (u, v) => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
function obbDepth(A, B) {
  if (!A.prim || !B.prim || A.kind !== "box" || B.kind !== "box" || A.round || B.round)
    return null;
  const mk = (p) => {
    const R = rotMat(p.rotate);
    return { c: p.center ?? [0, 0, 0], h: p.size.map((v) => v / 2), ax: [0, 1, 2].map((j) => [R[0][j], R[1][j], R[2][j]]) };
  };
  const a = mk(A.prim);
  const b = mk(B.prim);
  const t = [0, 1, 2].map((i) => b.c[i] - a.c[i]);
  const axes = [...a.ax, ...b.ax];
  for (const u of a.ax)
    for (const v of b.ax) {
      const w = cross5(u, v);
      const n = Math.hypot(...w);
      if (n > 1e-9)
        axes.push(w.map((x) => x / n));
    }
  let best = Infinity;
  for (const L of axes) {
    const ra = a.h.reduce((s, h, i) => s + h * Math.abs(dot6(a.ax[i], L)), 0);
    const rb = b.h.reduce((s, h, i) => s + h * Math.abs(dot6(b.ax[i], L)), 0);
    best = Math.min(best, ra + rb - Math.abs(dot6(t, L)));
  }
  return best;
}
function guardCombine(f, ops) {
  const r = guardCombine0(f, ops);
  if (r)
    PLAIN.add(r.sentence);
  return r;
}
function guardCombine0(f, ops) {
  const op = f.op;
  if (new Set(f.targets).size !== f.targets.length)
    return { code: "G1", sentence: SENTENCES.sameShape(op) };
  const pairs = op === "union" ? ops.flatMap((a, i) => ops.slice(i + 1).map((b) => [a, b])) : ops.slice(1).map((t) => [ops[0], t]);
  if (op === "subtract") {
    for (const [a, b] of pairs) {
      if (!b.d.ring)
        continue;
      const tol = tolPair(a.d, b.d);
      const inside2 = [0, 1, 2].every((i) => b.d.lo[i] > a.d.lo[i] + tol && b.d.hi[i] < a.d.hi[i] - tol);
      if (!inside2)
        return { code: "G10", sentence: SENTENCES.tubeTool(op) };
    }
  }
  for (const [a, b] of pairs) {
    const h = hangOf(a.d, b.d);
    if (h)
      return { code: "G2", sentence: h === "cross" ? SENTENCES.hangCross(op) : h === "cone" ? SENTENCES.hangCone(op) : SENTENCES.hangTorus(op), detail: h };
  }
  {
    const all = ops.flatMap((a, i) => ops.slice(i + 1).map((b) => [a, b]));
    for (const [a, b] of all) {
      if (a.d.kind === "cylinder" && b.d.kind === "cylinder")
        continue;
      if (!a.d.info || !b.d.info)
        continue;
      const ov = overlapOf(a.d, b.d);
      const tol = tolPair(a.d, b.d);
      if (!ov.every((v2) => v2 > tol))
        continue;
      const v = slantedMeeting({ info: a.d.info, prim: a.d.prim }, { info: b.d.info, prim: b.d.prim });
      if (v === "slant")
        return { code: "G16", sentence: SENTENCES.slant(op), detail: "slant" };
    }
  }
  {
    const all = ops.flatMap((a, i) => ops.slice(i + 1).map((b) => [a, b]));
    for (const [a, b] of all)
      for (const [r, o] of [[a, b], [b, a]]) {
        if (r.d.prim?.kind === "box" && r.d.prim.round && o.d.prim && (o.d.prim.kind === "cylinder" || o.d.prim.kind === "sphere")) {
          const ov = overlapOf(r.d, o.d);
          if (!ov.every((v) => v > tolPair(r.d, o.d)))
            continue;
          if (roundBandHit(r.d.prim, o.d.prim) === true)
            return { code: "G18", sentence: SENTENCES.roundBand(op) };
        }
      }
  }
  if (op === "intersect") {
    for (const [a, b] of ops.flatMap((x, i) => ops.slice(i + 1).map((y) => [x, y]))) {
      if (sharedWall(a.d, b.d))
        return { code: "G17", sentence: SENTENCES.sameWall(op) };
    }
  }
  if (op === "intersect") {
    for (const [a, b] of ops.flatMap((x, i) => ops.slice(i + 1).map((y) => [x, y]))) {
      if (crossLens(a.d, b.d))
        return { code: "G20", sentence: SENTENCES.lens(op) };
    }
  }
  for (const [a, b] of pairs) {
    for (const [t, c] of [[a.d, b.d], [b.d, a.d]]) {
      if (t.kind !== "torus" || c.kind !== "cylinder" || !coaxial(t, c, tolPair(t, c)))
        continue;
      const R = t.prim.ringRadius;
      const r = t.prim.tubeRadius;
      const tol = tolPair(t, c);
      const rc = c.prim.radius;
      if (Math.abs(rc - (R - r)) <= tol)
        return { code: "G13", sentence: SENTENCES.tangentCircle(op) };
      if (op === "subtract" && Math.abs(rc - (R + r)) <= tol)
        return { code: "G13", sentence: SENTENCES.tangentCircle(op) };
    }
  }
  if (op === "subtract") {
    for (const [a, b] of pairs) {
      if (a.d.kind === "sphere" && b.d.kind === "sphere") {
        const tol = tolPair(a.d, b.d);
        if ([0, 1, 2].every((i) => b.d.lo[i] >= a.d.lo[i] - tol && b.d.hi[i] <= a.d.hi[i] + tol))
          return { code: "G14", sentence: SENTENCES.hollowBall(op) };
      }
    }
  }
  if (op === "subtract" || op === "intersect") {
    const ovs = pairs.map(([a, b]) => overlapOf(a.d, b.d));
    const tols = pairs.map(([a, b]) => tolPair(a.d, b.d));
    for (const [k, ov] of ovs.entries()) {
      if (!ov.every((v) => v > tols[k]))
        continue;
      const ax = ov.indexOf(Math.min(...ov));
      const cls = sliverClass(pairs[k][0].d, pairs[k][1].d, ax);
      const depth = sliverMm(cls, op, pairs[k][0].d, pairs[k][1].d, ax);
      const obb = cls === "rotated" ? obbDepth(pairs[k][0].d, pairs[k][1].d) : null;
      const thin = obb !== null ? obb : Math.min(...ov);
      if (thin < depth && thin > -tols[k])
        return { code: "G3", sentence: SENTENCES.sliver(op, depth), detail: { depth, thin, class: cls, obb: obb !== null } };
    }
    if (op === "intersect") {
      for (const [k, ov] of ovs.entries()) {
        if (!ov.every((v) => v > tols[k]))
          continue;
        const [a, b] = pairs[k];
        for (const [sph, oth] of [[a.d, b.d], [b.d, a.d]]) {
          if (sph.kind !== "sphere" || !sph.prim || oth.kind === "sphere")
            continue;
          const R = sph.prim.radius;
          const ax = ov.indexOf(Math.min(...ov));
          const depth = ov[ax];
          if (!(depth < R))
            continue;
          const base = Math.sqrt(Math.max(0, 2 * R * depth - depth * depth));
          const narrow = Math.min(...[0, 1, 2].filter((i) => i !== ax).map((i) => oth.hi[i] - oth.lo[i]));
          if (2 * base > narrow - tols[k])
            return { code: "G3b", sentence: SENTENCES.thinCap(), detail: { depth, base, narrow } };
        }
      }
    }
    const touching = ovs.map((ov, k) => ov.every((v) => v > tols[k]));
    if (op === "subtract" && !touching.some(Boolean))
      return { code: "G4", sentence: SENTENCES.cutNothing() };
    if (op === "intersect" && touching.some((t) => !t))
      return { code: "G5", sentence: SENTENCES.keepNothing() };
    if (op === "subtract") {
      for (const [a, b] of pairs) {
        if (!isPlainBox2(a.d) || !b.d.prim || b.d.kind === "box" || b.d.round)
          continue;
        const tol = tolPair(a.d, b.d);
        const ax = ["x", "y", "z"];
        const curvedAxes = [0, 1, 2].filter((i) => flatOnAxis(b.d, ax[i]) !== true);
        if (curvedAxes.length === 3 && b.d.kind === "cylinder")
          continue;
        const tangent = curvedAxes.reduce((n, i) => n + (Math.abs(b.d.lo[i] - a.d.lo[i]) <= tol ? 1 : 0) + (Math.abs(b.d.hi[i] - a.d.hi[i]) <= tol ? 1 : 0), 0);
        const within = [0, 1, 2].every((i) => b.d.lo[i] >= a.d.lo[i] - tol && b.d.hi[i] <= a.d.hi[i] + tol);
        const flatTouches = [0, 1, 2].filter((i) => flatOnAxis(b.d, ax[i]) === true).some((i) => Math.abs(b.d.lo[i] - a.d.lo[i]) <= tol || Math.abs(b.d.hi[i] - a.d.hi[i]) <= tol);
        const sealed = within && !flatTouches;
        const hasFlat = [0, 1, 2].some((i) => flatOnAxis(b.d, ax[i]) === true);
        const pinch = hasFlat && tangent >= 2 || tangent >= 1 && sealed;
        if (pinch)
          return { code: "G7", sentence: SENTENCES.pinchCut() };
      }
    }
  }
  if (op === "union") {
    for (const [a, b] of pairs) {
      const ov = overlapOf(a.d, b.d);
      const tol = tolPair(a.d, b.d);
      if (ov.some((v) => v < -tol))
        continue;
      if (ov.every((v) => v > tol))
        continue;
      const zero = ov.map((v, i) => Math.abs(v) <= tol ? i : -1).filter((i) => i >= 0);
      if (zero.length >= 2)
        return { code: "G6", sentence: SENTENCES.pinchJoin() };
      const ax = ["x", "y", "z"][zero[0]];
      const fa = flatOnAxis(a.d, ax);
      const fb = flatOnAxis(b.d, ax);
      if (fa === false || fb === false)
        return { code: "G6", sentence: SENTENCES.pinchJoin() };
    }
  }
  return null;
}
function afterCombine(f, m, before, boxes) {
  const r = afterCombine0(f, m, before, boxes);
  if (r)
    PLAIN.add(r.sentence);
  return r;
}
function afterCombine0(f, m, before, boxes) {
  if (!m)
    return null;
  if (f.op === "subtract" && before && Math.abs(m.volume - before.volume) <= 1e-12 * Math.max(before.volume, 1))
    return { code: "G4b", sentence: SENTENCES.cutNothingThin() };
  if (Array.isArray(boxes) && boxes.every((b) => Array.isArray(b) && b.length === 6) && Array.isArray(m.bbox)) {
    const bs = boxes;
    const bar = m.curved ? 3e-4 : 1e-9;
    const lo = [0, 1, 2].map((i) => f.op === "union" ? Math.min(...bs.map((b) => b[i])) : f.op === "subtract" ? bs[0][i] : Math.max(...bs.map((b) => b[i])));
    const hi = [0, 1, 2].map((i) => f.op === "union" ? Math.max(...bs.map((b) => b[i + 3])) : f.op === "subtract" ? bs[0][i + 3] : Math.min(...bs.map((b) => b[i + 3])));
    const out = [0, 1, 2].some((i) => (lo[i] - m.bbox[i]) / Math.max(Math.abs(lo[i]), 1) > bar || (m.bbox[i + 3] - hi[i]) / Math.max(Math.abs(hi[i]), 1) > bar);
    if (out)
      return { code: "G19", sentence: SENTENCES.outsideShapes(f.op) };
  }
  if (f.op === "subtract" && before && m.curved && m.volume > 0 && m.volume < TINY_FRAC * before.volume)
    return { code: "G21", sentence: SENTENCES.tinyRemainder() };
  return null;
}
function reusedTools(f, feats) {
  const later = feats.slice(feats.findIndex((x) => x.id === f.id) + 1);
  const uses = (id) => later.some((g) => (g.targets ?? []).includes(id) || g.target === id || g.into === id);
  return f.targets.slice(1).filter(uses);
}
var PLAIN = /* @__PURE__ */ new Set();
var mark = (r) => {
  PLAIN.add(r.sentence);
  return r;
};
function plainSentence2(raw, f) {
  return mark(plainSentence0(raw, f));
}
function plainSentence0(raw, f) {
  const op = f?.op ?? "union";
  const t = String(raw ?? "");
  if (PLAIN.has(t))
    return { code: "PLAIN", sentence: t };
  if (/no body named/.test(t))
    return op === "intersect" ? { code: "K1", sentence: SENTENCES.keepNothingKernel() } : op === "subtract" ? { code: "K2", sentence: SENTENCES.cutEverything() } : { code: "K3", sentence: SENTENCES.generic(op) };
  if (/cannot be combined with itself/.test(t))
    return { code: "K4", sentence: SENTENCES.sameShape(op) };
  if (/needs two or more targets/.test(t))
    return { code: "K5", sentence: SENTENCES.needTwo() };
  if (/already changed in place/.test(t))
    return { code: "K6", sentence: SENTENCES.consumed() };
  if (/was refused \((.*)\)$/.test(t)) {
    return { code: "K7", sentence: SENTENCES.skipped() };
  }
  if (/unreachable|WASM TRAP|RuntimeError|trap/i.test(t))
    return { code: "K8", sentence: SENTENCES.trap(op) };
  if (/coincident faces/i.test(t))
    return { code: "K9a", sentence: SENTENCES.coincident(op) };
  if (/exact fallback|planar faces only|curved faces|shallow angle|tangent/i.test(t))
    return { code: "K9b", sentence: SENTENCES.shallow(op) };
  if (/implausible result volume|not a manifold|tolerance|degenerate|failed to (intersect|boolean|combine)|could not|cannot/i.test(t))
    return { code: "K9", sentence: SENTENCES.curvedKernel(op) };
  return { code: "K0", sentence: SENTENCES.generic(op) };
}
function plainPieces(raw) {
  return /single (measured target )?body|not a single body/.test(String(raw ?? "")) ? { code: "G12", sentence: mark({ code: "G12", sentence: SENTENCES.pieces() }).sentence } : null;
}

// ../../layer/dist/booleans.js
var BOOL_KINDS = ["combine"];
var BFV = (f) => f;
function initBool(st, doc) {
  const feats = doc?.features ?? [];
  const featById = Object.fromEntries(feats.map((g) => [g.id, g]));
  const affects = {};
  for (const g of feats) {
    if (["hole", "pocket", "groove", "shell", "fillet", "draft"].includes(g.kind)) {
      const v = BFV(g);
      const t = g.kind === "pocket" || g.kind === "groove" ? v.into : v.target;
      if (t)
        (affects[t] ??= []).push(g.id);
    }
  }
  st.bool = { featById, affects, docFeatures: feats, lastNames: void 0, lastRunS: 0 };
}
var AXIS_TOL = 1e-9;
var SAME = 1e-9;
function profileInfo(sk, arc) {
  const skv = sk;
  const o = arc.outlineOf(sk);
  if (!o.ok)
    return { ok: false, scale: 0, umin: 0, umax: 0 };
  if (skv.shape === "circle") {
    const [a, b] = o.points;
    const c = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const r = Math.hypot(b[0] - a[0], b[1] - a[1]) / 2;
    return { ok: true, scale: Math.max(1e-12, Math.abs(c[0]) + r, Math.abs(c[1]) + r), umin: c[0] - r, umax: c[0] + r };
  }
  const { pts } = sampleOutline(o, arc);
  const us = pts.map((p) => p[0]);
  const scale2 = Math.max(1e-12, ...pts.flat().map(Math.abs));
  void SAME;
  return { ok: true, scale: scale2, umin: Math.min(...us), umax: Math.max(...us) };
}
function ringOf(feat, st, ctx) {
  if (feat?.kind !== "revolve")
    return null;
  const sk = st.bool.featById[feat.target];
  if (!sk)
    return null;
  const p = profileInfo(sk, ctx.arc);
  if (!p.ok)
    return null;
  const tol = AXIS_TOL * Math.max(1, p.scale);
  return p.umin > tol || p.umax < -tol ? { angle: feat.angle } : null;
}
function sketchInfoOf(st, ctx) {
  return (skId) => {
    const sk = st.bool.featById[skId];
    if (!sk || sk.kind !== "sketch")
      return null;
    try {
      const fr = frameOf2(sk, ctx.mt);
      const o = ctx.arc.outlineOf(sk);
      if (sk.shape === "circle")
        return { n: fr.n, edgeNormals: [], arcs: true };
      const pts = o.points ?? sk.points;
      const bul = o.bulges ?? sk.bulges ?? {};
      const edgeNormals = [];
      let arcs = false;
      for (let i = 0; i < pts.length; i++) {
        const j = (i + 1) % pts.length;
        const dx = pts[j][0] - pts[i][0];
        const dy = pts[j][1] - pts[i][1];
        const L = Math.hypot(dx, dy);
        if (L < 1e-12)
          continue;
        if (Math.abs(bul[i] ?? 0) > 1e-12) {
          arcs = true;
          continue;
        }
        const nx = dy / L;
        const ny = -dx / L;
        edgeNormals.push([0, 1, 2].map((k) => fr.u[k] * nx + fr.v[k] * ny));
      }
      return { n: fr.n, edgeNormals, arcs, axis: fr.v };
    } catch {
      return null;
    }
  };
}
var epJoinLevel = (st, ctx) => st.unified ? ctx.unifiedEpJoinChecks ?? "cheap" : "off";
var boolCombine = (fe, st, ctx, h) => {
  const f = BFV(fe);
  const ds = f.targets.map((t) => h.dep(t)).find(Boolean);
  if (ds)
    return refuse(ds);
  if (f.targets.length < 2)
    return refuse(`${f.id} (combine): needs two or more targets`);
  const all = f.targets.map((t) => h.needBody(t));
  if (all.some((b) => !b || !b.length))
    return refuse(`${f.id} (combine): a target has no body`);
  const parts = all;
  const ops = f.targets.map((t) => ({ id: t, measure: st.measure[h.headOf(t)] ?? st.measure[t], feat: st.head[t] ? null : BFV(st.bool.featById[t]), pieces: (st.bodies[h.headOf(t)] ?? []).length }));
  if (ops.every((o) => o.measure)) {
    const sketchInfo = sketchInfoOf(st, ctx);
    const g = guardCombine(f, ops.map((o) => ({ id: o.id, d: describe(o.measure, o.feat, { ring: ringOf(o.feat, st, ctx), pieces: o.pieces, info: orient(o.id, st.bool.featById, sketchInfo, st.bool.affects) }) })));
    if (g)
      return { refusal: g.sentence, guard: g.code };
  }
  if (epJoinLevel(st, ctx) !== "off" && f.op === "union") {
    const bad2 = joinPreflight(fe, parts.flat(), st);
    if (bad2)
      return { refusal: bad2, guard: "EP-JOIN", final: true };
  }
  const keepIds = reusedTools(f, st.bool.docFeatures);
  const plan = {
    r3: { op: f.op, groups: parts, keep: f.targets.map((t, i) => i > 0 && keepIds.includes(t)) },
    produces: parts[0],
    before: st.measure[h.headOf(f.targets[0])] ?? st.measure[f.targets[0]],
    boxes: f.targets.map((t) => (st.measure[h.headOf(t)] ?? st.measure[t])?.bbox),
    consumes: f.targets.filter((t, i) => i === 0 || !keepIds.includes(t))
  };
  return plan;
};
async function execCombine(r3, accepted, runSC, live0) {
  const { op, groups, keep } = r3;
  const cmds = [];
  let live2 = new Set(live0);
  let res = null;
  const run = async (cmd) => {
    let r;
    try {
      r = await runSC([...accepted, ...cmds, cmd]);
    } catch (e) {
      r = { ok: false, failed: { error: `WASM TRAP: ${e.message}` } };
    }
    if (r.timedOut)
      return { err: r.failed ? `${r.failed.command}: ${r.failed.error}` : "TIME BUDGET: the run did not finish", timedOut: true };
    if (!r.ok)
      return { err: r.failed ? `${r.failed.command}: ${r.failed.error}` : String(r.error ?? "unknown"), ...r.erroredBody ? { errored: true } : {} };
    cmds.push(cmd);
    res = r;
    return { names: new Set(r.measure.bodies.map((b) => b.name)) };
  };
  const step = async (piece, tools, keepTools) => {
    const before = live2;
    const r = await run({ command: "solid.combine", params: { target: piece, tools, operation: op === "union" ? "join" : op === "subtract" ? "cut" : "intersect", ...keepTools ? { keep_tools: true } : {} } });
    if ("err" in r)
      return r;
    live2 = r.names;
    const out = [];
    if (r.names.has(piece))
      out.push(piece);
    for (const n of r.names)
      if (!before.has(n))
        out.push(n);
    return { pieces: out };
  };
  const toolGroups = groups.slice(1);
  let pieces = groups[0].slice();
  if (op === "union") {
    const anyKeep = keep.some(Boolean);
    const extra = pieces.slice(1);
    if (!anyKeep) {
      const r = await step(pieces[0], [...extra, ...toolGroups.flat()], false);
      if ("err" in r)
        return r;
      pieces = r.pieces;
    } else {
      let cur = pieces[0];
      if (extra.length) {
        const r = await step(cur, extra, false);
        if ("err" in r)
          return r;
        cur = r.pieces[0] ?? cur;
      }
      for (let j = 0; j < toolGroups.length; j++) {
        const r = await step(cur, toolGroups[j], !!keep[j + 1]);
        if ("err" in r)
          return r;
        cur = r.pieces[0] ?? cur;
      }
      pieces = [cur];
    }
  } else {
    const oneShot = op === "subtract" && !keep.some(Boolean);
    const rounds = oneShot ? [{ tools: toolGroups.flat(), keepTools: false }] : toolGroups.map((g, j) => ({ tools: g, keepTools: !!keep[j + 1] }));
    for (const rd of rounds) {
      const next = [];
      for (let i = 0; i < pieces.length; i++) {
        const r = await step(pieces[i], rd.tools, rd.keepTools || i < pieces.length - 1);
        if ("err" in r)
          return r;
        next.push(...r.pieces);
      }
      pieces = next;
      if (!pieces.length)
        break;
    }
  }
  if (!pieces.length)
    return { err: `solidcraft ran the commands but no body named ${groups[0].join(", ")} came back` };
  return { cmds, produces: pieces, res };
}
var BOOL_PLAN = { ...BASE_PROFILE, name: "booleans(plan)", planners: { combine: boolCombine } };
async function boolStep(f, idx, env) {
  const { doc, ctx, st, accepted, out } = env;
  const bs = st.bool;
  const prefix = doc.features.slice(0, idx);
  const note = (o) => {
    out.push({ id: f.id, kind: f.kind, ...o });
  };
  if (f.kind === "sketch")
    st.sketches[f.id] = f;
  const resolved = await resolveNamesFor(f, prefix, env);
  const fctx = { ...ctx, resolve: (name) => resolved.get(name) ?? null };
  let planned;
  let guard;
  try {
    planned = planFeature(f, st, fctx, BOOL_PLAN);
  } catch (e) {
    planned = refuse(`${f.id} (${f.kind}): translator error: ${e.message}`);
  }
  if ("refusal" in planned) {
    guard = planned.guard;
    const raw = planned.refusal;
    let sentence2 = raw;
    if (planned.final || isVerbatimGuard(guard)) {
    } else if (f.kind === "combine") {
      const p = plainSentence2(raw, f);
      sentence2 = p.sentence;
      guard ??= p.code;
    } else if (/was refused \(.*\)$/.test(raw)) {
      const p = plainSentence2(raw, f);
      sentence2 = p.sentence;
      guard ??= p.code;
    } else {
      const pp = plainPieces(raw);
      if (pp) {
        sentence2 = pp.sentence;
        guard ??= pp.code;
      }
    }
    st.refused[f.id] = sentence2;
    note({ status: "refused", refusal: sentence2, ...sentence2 !== raw ? { raw } : {}, ...guard ? { guard } : {}, commands: [] });
    return;
  }
  if ("noop" in planned) {
    note({ status: "noop", commands: [] });
    return;
  }
  const plan = planned;
  let lastErr = null;
  let timedOut = false;
  let errored = false;
  const combine = f.kind === "combine";
  const callSC = async (cmds) => {
    const r = await ctx.runSC(cmds, { budgetS: BUDGET_S2 + 1.5 * bs.lastRunS });
    if (r?.ok && r.cpuMs)
      bs.lastRunS = r.cpuMs / 1e3;
    return r;
  };
  if (plan.r3) {
    const ex = await execCombine(plan.r3, accepted, callSC, bs.lastNames ?? []);
    if ("err" in ex) {
      lastErr = ex.err;
      timedOut = !!ex.timedOut;
      errored = !!ex.errored;
      plan.variants = [];
    } else {
      plan.variants = [ex.cmds];
      plan.produces = ex.produces;
      plan.__res = ex.res;
    }
  }
  let afterGuard;
  let epFinal = false;
  for (const variant0 of plan.variants) {
    let variant = variant0;
    let repaired;
    let res;
    try {
      res = plan.__res ?? await ctx.runSC([...accepted, ...variant]);
    } catch (e) {
      res = { ok: false, failed: { error: `WASM TRAP: ${e.message}` } };
    }
    if (!res.ok && res.erroredBody)
      errored = true;
    if (!res.ok) {
      lastErr = res.failed ? `${res.failed.command}: ${res.failed.error}` : String(res.error ?? "unknown");
      continue;
    }
    let m = aggregate(res, plan.produces);
    if (!m) {
      lastErr = `solidcraft ran the commands but no body named ${plan.produces.join(", ")} came back`;
      continue;
    }
    const sv = f.kind === "extrude" ? sketchVolumeRefusal(f, st.sketches[f.target], ctx, res, plan.produces) : null;
    if (sv) {
      st.refused[f.id] = sv;
      note({ status: "refused", refusal: sv, guard: SKETCH_VOLUME_GUARD, commands: variant });
      return;
    }
    const mv = motionRefusal(f, st, ctx, res, plan.produces, accepted);
    const fx = mv ? await motionRepair(f, st, ctx, mv, plan.produces, accepted, variant, ctx.runSC) : null;
    const m2 = fx ? aggregate(fx.res, plan.produces) : null;
    if (mv && fx && m2) {
      variant = fx.variant;
      res = fx.res;
      m = m2;
      repaired = { pads: fx.pads, reason: mv.sentence };
    } else if (mv) {
      st.refused[f.id] = mv.sentence;
      note({ status: "refused", refusal: mv.sentence, guard: mv.guard, commands: variant });
      return;
    }
    const bl = blendRefusal(f, blendOf(plan), beforeOf(st, BFV(f).target), m, ctx);
    if (bl) {
      st.refused[f.id] = bl.sentence;
      note({ status: "refused", refusal: bl.sentence, guard: bl.guard, commands: variant });
      return;
    }
    if (combine) {
      const bad2 = afterCombine(f, m, plan.before, plan.boxes);
      if (bad2) {
        lastErr = bad2.sentence;
        afterGuard = bad2.code;
        continue;
      }
    }
    if (combine && BFV(f).op === "union" && epJoinLevel(st, ctx) !== "off") {
      const mE = aggregate(res, plan.produces, true) ?? m;
      let bad2;
      try {
        bad2 = await verifyUnion(f, mE, plan.r3.groups.flat(), { accepted: accepted.slice(), variant, runSC: ctx.runSC, checks: [], scene: st.scene }, epJoinLevel(st, ctx) === "full");
      } catch (e) {
        lastErr = `undefined: WASM TRAP: ${e.message}`;
        afterGuard = "EP-JOIN";
        continue;
      }
      if (bad2) {
        lastErr = bad2;
        afterGuard = "EP-JOIN";
        epFinal = true;
        continue;
      }
    }
    const pc = f.kind === "pocket" ? await pocketCutRefusal(f, ctx, res, accepted, variant, plan.produces, ctx.runSC) : null;
    if (pc) {
      st.refused[f.id] = pc;
      note({ status: "refused", refusal: pc, guard: POCKET_CUT_GUARD, commands: variant });
      return;
    }
    const hc = f.kind === "shell" ? hollowRefusal(f, doc.features, st, ctx, res, plan.produces, accepted) : null;
    if (hc) {
      st.refused[f.id] = hc.sentence;
      note({ status: "refused", refusal: hc.sentence, guard: hc.guard, commands: variant });
      return;
    }
    accepted.push(...variant);
    rememberRun(accepted, res);
    for (const mp of env.profile.members ?? [env.profile])
      mp.onAccepted?.(st, res, m, null, { f, ctx });
    st.accLen[f.id] = accepted.length;
    st.bodies[f.id] = m.bodies;
    st.measure[f.id] = m;
    for (const c of plan.consumes) {
      if (c === f.id)
        continue;
      if (f.kind === "hole" || f.kind === "pocket" || f.kind === "groove") {
        if (c === (f.kind === "hole" ? BFV(f).target : BFV(f).into))
          st.head[c] = f.id;
      } else
        st.stale[c] = f.id;
    }
    note({ status: "built", commands: variant, measure: m, pickedFrom: plan.pickedFrom, evidence: plan.evidence ?? null, variantsTried: plan.variants.indexOf(variant0) + 1, ...repaired ? { repaired } : {}, pick: variant.find((c) => c.params.edges || c.params.faces)?.params ?? null });
    return;
  }
  let sentence;
  let code;
  if (errored) {
    sentence = erroredBodySentence(f);
    code = ERRORED_BODY_GUARD;
  } else if (timedOut && combine) {
    sentence = SENTENCES.budget(BFV(f).op);
    code = "G-BUDGET";
  } else if (combine && epFinal) {
    sentence = lastErr;
    code = afterGuard;
  } else if (combine) {
    const p = plainSentence2(lastErr, f);
    sentence = p.sentence;
    code = afterGuard ?? p.code;
  } else
    sentence = `${f.id} (${f.kind}): solidcraft refused it -- ${lastErr}`;
  st.refused[f.id] = sentence;
  note({ status: "refused", refusal: sentence, ...lastErr !== null && lastErr !== sentence ? { raw: lastErr } : {}, ...code ? { guard: code } : {}, commands: plan.variants[0] ?? [] });
}
var BOOL_PROFILE = {
  name: "booleans",
  // claiming 'combine' is what makes this profile its owner in a composition; the real planning is boolCombine, called by the step through BOOL_PLAN
  planners: { combine: boolCombine },
  verifies: false,
  initState(st, doc) {
    initBool(st, doc);
  },
  depSentence: BASE_PROFILE.depSentence,
  noOutline: BASE_PROFILE.noOutline,
  plannerError: BASE_PROFILE.plannerError,
  kernelRefusal: BASE_PROFILE.kernelRefusal,
  // the original's st.lastNames: the bodies the engine held after the last accepted feature, whichever step built it; and how long that run took
  onAccepted(st, res) {
    st.bool.lastNames = res.measure.bodies.map((b) => b.name);
    if (res.cpuMs)
      st.bool.lastRunS = res.cpuMs / 1e3;
  },
  step: boolStep
};

// ../../layer/dist/revolve-groove-guard.js
var MIN_TURN = 1;
var MAX_SPIN = 720;
var AXIS_TOL2 = 1e-9;
var STARTER = [[0, 0], [40, 0], [40, 25], [0, 25]];
var SAME2 = 1e-9;
var NOTHING = 1e-9;
var num2 = (v) => Number.isInteger(v) ? String(v) : String(+Number(v).toFixed(4));
var verbOf = (f) => f.kind === "revolve" ? "spin" : "groove";
var lead = (f) => `${f.id} (${f.kind}): `;
var rgView = (f) => f;
var headOf2 = (st, id) => {
  let h = id;
  const seen = /* @__PURE__ */ new Set();
  while (st.head[h] && !seen.has(h)) {
    seen.add(h);
    h = st.head[h];
  }
  return h;
};
var skView = (sk) => sk;
function profileInfo2(sk, arc) {
  const o = arc.outlineOf(sk);
  if (!o.ok)
    return { ok: false, why: "unreadable", circle: false, scale: 0, umin: 0, umax: 0, vmin: 0, vmax: 0 };
  if (skView(sk).shape === "circle") {
    const [a, b] = o.points;
    const c = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const r = Math.hypot(b[0] - a[0], b[1] - a[1]) / 2;
    return { ok: true, circle: true, scale: Math.max(1e-12, Math.abs(c[0]) + r, Math.abs(c[1]) + r), umin: c[0] - r, umax: c[0] + r, vmin: c[1] - r, vmax: c[1] + r, r };
  }
  const go = o;
  const { pts } = sampleOutline(go, arc);
  const us = pts.map((p) => p[0]);
  const vs = pts.map((p) => p[1]);
  const scale2 = Math.max(1e-12, ...pts.flat().map(Math.abs));
  let a2 = 0;
  pts.forEach((p, i) => {
    const q = pts[(i + 1) % pts.length];
    a2 += p[0] * q[1] - q[0] * p[1];
  });
  const dup = o.points.some((p, i) => {
    const q = o.points[(i + 1) % o.points.length];
    return Math.hypot(p[0] - q[0], p[1] - q[1]) <= SAME2 * scale2;
  });
  const P = o.points;
  let far = [P[0], P[0]];
  let best = -1;
  for (const a of P)
    for (const b of P) {
      const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      if (d > best) {
        best = d;
        far = [a, b];
      }
    }
  const collinear = best <= SAME2 * scale2 || P.every((q) => Math.abs((far[1][0] - far[0][0]) * (q[1] - far[0][1]) - (far[1][1] - far[0][1]) * (q[0] - far[0][0])) / best <= 1e-9 * scale2) && !(o.bulges && Object.values(o.bulges).some((g) => g));
  return { ok: true, circle: false, o: go, scale: scale2, umin: Math.min(...us), umax: Math.max(...us), vmin: Math.min(...vs), vmax: Math.max(...vs), area2: a2, dup, collinear, n: o.points.length, pts };
}
var isStarter = (sk) => sk.shape !== "circle" && sk.points?.length === 4 && sk.points.every((p, k) => p[0] === STARTER[k][0] && p[1] === STARTER[k][1]) && (sk.constraints?.length ?? 0) === 4 && !sk.rounds && !sk.chamfers;
function profileProblem(f, sk, arc) {
  const verb = verbOf(f);
  const L = lead(f);
  if (!sk)
    return `${L}${f.target} is not a sketch, so there is nothing to ${verb}.`;
  const s = skView(sk);
  if (s.shape !== "circle" && Array.isArray(s.geoms) && s.geoms.length > 0) {
    return `${L}the sketch holds more than one shape (or a hole, geom() or slot()), and a ${verb} takes one plain outline, so draw one rect, circle or polygon per sketch.`;
  }
  if (isStarter(s))
    return `${L}the sketch is exactly the default 40 by 25 rectangle at the corner (an undrawn sketch looks the same), so the ${verb} is not built; draw your outline, for example with rect(10, 30, { at: [15, 15] }), or move this rectangle by a fraction of a millimetre if it is the one you want.`;
  if (s.shape !== "circle" && Array.isArray(s.points) && s.points.length > 1) {
    const pts = s.points;
    const sc = Math.max(1e-12, ...pts.flat().map(Math.abs));
    if (pts.some((q, i) => {
      const r = pts[(i + 1) % pts.length];
      return Math.hypot(q[0] - r[0], q[1] - r[1]) <= SAME2 * sc;
    }))
      return `${L}two corners of the sketch are in the same place, so delete one of them.`;
  }
  const p = profileInfo2(sk, arc);
  if (!p.ok)
    return `${L}the sketch has no usable outline, so there is nothing to ${verb}; redraw it as a closed shape.`;
  if (p.circle) {
    if (!(p.r > SAME2 * p.scale))
      return `${L}the circle has no size, so there is nothing to ${verb}; give it a diameter.`;
  } else {
    if (p.dup)
      return `${L}two corners of the sketch are in the same place, so delete one of them.`;
    if (p.n < 3 || p.collinear)
      return `${L}the sketch has no area (all its corners lie on one line), so give it at least three corners that are not in a row.`;
    const t = selfTouch(p.o, arc);
    if (t)
      return `${L}the sketch ${t === "cross" ? "crosses" : "touches"} itself, so it is not one closed shape; reorder its corners so that no two sides ${t === "cross" ? "cross" : "meet"}.`;
  }
  const tol = AXIS_TOL2 * Math.max(1, p.scale);
  if (p.umin < -tol && p.umax > tol)
    return `${L}the outline crosses the line it ${verb === "spin" ? "spins" : "is turned"} about, so one side would overlap the other; draw the whole outline on one side of that line.`;
  return null;
}
var sideOf = (p) => p.umax > AXIS_TOL2 * Math.max(1, p.scale) ? 1 : -1;
function kernelAngle(f, side) {
  const a = f.angle;
  if (Math.abs(a) >= 360)
    return null;
  return side < 0 ? a : -a;
}
function ringMisses(p, fr, bbox, eps = 1e-6) {
  if (!bbox || !fr)
    return null;
  const dot10 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const o = fr.origin;
  const n = fr.n;
  const nl = Math.hypot(...n) || 1;
  const nn = n.map((x) => x / nl);
  let tmin = Infinity;
  let tmax = -Infinity;
  let rmax = 0;
  for (const x of [bbox[0], bbox[3]])
    for (const y of [bbox[1], bbox[4]])
      for (const z of [bbox[2], bbox[5]]) {
        const d = [x - o[0], y - o[1], z - o[2]];
        const t = dot10(d, nn);
        const rad = Math.hypot(d[0] - t * nn[0], d[1] - t * nn[1], d[2] - t * nn[2]);
        tmin = Math.min(tmin, t);
        tmax = Math.max(tmax, t);
        rmax = Math.max(rmax, rad);
      }
  const rmin = p.umin >= 0 ? p.umin : p.umax <= 0 ? -p.umax : 0;
  if (p.vmax < tmin - eps || p.vmin > tmax + eps)
    return "axial";
  if (rmin > rmax + eps)
    return "radial";
  return null;
}
function profilePlaneOnFlatFace(fr, bbox, faceTypes) {
  if (!fr || !bbox || !faceTypes)
    return false;
  const kinds = Object.keys(faceTypes).filter((k) => faceTypes[k] > 0);
  if (kinds.length !== 1 || kinds[0] !== "plane")
    return false;
  const v = fr.v;
  const n = fr.n;
  const vl = Math.hypot(...v) || 1;
  const nl = Math.hypot(...n) || 1;
  const vv = v.map((x) => x / vl);
  const nn = n.map((x) => x / nl);
  if (Math.abs(nn[2]) > 0.5)
    return false;
  const ax = vv.findIndex((x) => Math.abs(Math.abs(x) - 1) < 1e-9);
  if (ax < 0)
    return false;
  const c = fr.origin[0] * vv[0] + fr.origin[1] * vv[1] + fr.origin[2] * vv[2];
  const c1 = c * Math.sign(vv[ax]);
  const scale2 = Math.max(1, ...bbox.map(Math.abs));
  if (Math.abs(bbox[ax] - c1) <= 1e-6 * scale2 || Math.abs(bbox[ax + 3] - c1) <= 1e-6 * scale2)
    return { axis: "xyz"[ax], at: c1 };
  return null;
}
var NUDGE_DEG = 17;
var COST_BUDGET_S = 45;
var S_TOOL = "a ring with a slanted or curved side (a triangle, a circle, a rounded corner) is not built, because in the measurements the engine cut such rings wrongly or took minutes and the two cannot be told apart in advance; give the ring straight sides that are parallel and square to its axis";
var S_TILT = "a full-turn ring about a tilted axis took from 19 to 42 seconds here and is not reliable, so it is not built; sketch the ring on the top, front or side plane, or turn it less than 360 degrees";
var S_PART = "a part turn of a ring that reaches the curved outside of a round part, or of a part with several round surfaces, takes a minute or more to cut here, so it is not built; turn the ring a full 360 degrees on the part's own axis, or keep it clear of the round outside wall";
var S_FULL = "a full-turn ring cut into a round part takes a minute or more here unless its axis is the part's own axis, so it is not built; centre the ring on the axis of the round part";
function costRefusal(c) {
  if (!c)
    return null;
  if (c.tool !== "flat")
    return S_TOOL;
  if (!c.worldAxis && !c.partial)
    return S_TILT;
  if (c.curved === 0)
    return null;
  if (c.partial)
    return c.reachesWall || c.curved >= 2 || !c.worldAxis ? S_PART : null;
  return c.coaxial ? null : S_FULL;
}
function toolSurfaces(sk, arc) {
  const o = arc.outlineOf(sk);
  if (!o.ok)
    return null;
  if (skView(sk).shape === "circle")
    return { kinds: ["torus"] };
  const P = o.points;
  const n = P.length;
  const sc = Math.max(1e-12, ...P.flat().map(Math.abs));
  const kinds = /* @__PURE__ */ new Set();
  for (let i = 0; i < n; i++) {
    const a = P[i];
    const b = P[(i + 1) % n];
    const g = o.bulges?.[i];
    if (g) {
      const { center } = arc.arcFromBulge(a, b, g);
      kinds.add(Math.abs(center[0]) <= AXIS_TOL2 * Math.max(1, sc) ? "sphere" : "torus");
      continue;
    }
    const du = b[0] - a[0];
    const dv = b[1] - a[1];
    const len8 = Math.hypot(du, dv);
    if (len8 <= SAME2 * sc)
      continue;
    if (Math.abs(dv) <= 1e-9 * len8)
      kinds.add("annulus");
    else if (Math.abs(du) <= 1e-9 * len8)
      kinds.add(Math.abs(a[0]) <= AXIS_TOL2 * Math.max(1, sc) ? "axis" : "cylinder");
    else
      kinds.add("cone");
  }
  return { kinds: [...kinds] };
}
function certifiedShape(meas) {
  if (!meas || !meas.bbox || !meas.faceTypes || (meas.bodies?.length ?? 1) !== 1)
    return null;
  const b = meas.bbox;
  const d = [b[3] - b[0], b[4] - b[1], b[5] - b[2]];
  const V = meas.volume;
  const kinds = Object.keys(meas.faceTypes).filter((k) => meas.faceTypes[k] > 0);
  if (kinds.every((k) => k === "plane") && Math.abs(V - d[0] * d[1] * d[2]) <= 1e-9 * V)
    return { kind: "box", bbox: b };
  if (kinds.every((k) => k === "plane" || k === "cylinder") && kinds.includes("cylinder")) {
    for (let k = 0; k < 3; k++) {
      const o1 = (k + 1) % 3;
      const o2 = (k + 2) % 3;
      const R = d[o1] / 2;
      if (Math.abs(d[o1] - d[o2]) <= 1e-6 * d[o1] && Math.abs(V - Math.PI * R * R * d[k]) <= 3e-4 * V)
        return { kind: "cylinder", axis: k, R, centre: [(b[0] + b[3]) / 2, (b[1] + b[4]) / 2, (b[2] + b[5]) / 2], bbox: b };
    }
  }
  return null;
}
function costFeatures(p, sk, arc, fr, meas, a) {
  const ts = toolSurfaces(sk, arc);
  const tool = !ts ? "unknown" : ts.kinds.some((k) => k === "torus" || k === "sphere") ? "torus" : ts.kinds.includes("cone") ? "cone" : "flat";
  const ft = meas?.faceTypes ?? {};
  const curved = Object.entries(ft).reduce((n, [k, v]) => n + (k !== "plane" ? v : 0), 0);
  const tol = AXIS_TOL2 * Math.max(1, p.scale ?? 1);
  const touchesAxis = !(p.umin > tol || p.umax < -tol);
  let axis = -1;
  let nearest = null;
  if (fr) {
    const nl = Math.hypot(...fr.n) || 1;
    const nn = fr.n.map((x) => x / nl);
    axis = nn.findIndex((x) => Math.abs(Math.abs(x) - 1) < 1e-9);
    if (axis >= 0 && meas?.bbox) {
      nearest = Infinity;
      for (const k of [0, 1, 2])
        if (k !== axis)
          nearest = Math.min(nearest, Math.abs(meas.bbox[k] - fr.origin[k]), Math.abs(meas.bbox[k + 3] - fr.origin[k]));
    }
  }
  const rOuter = Math.max(Math.abs(p.umin), Math.abs(p.umax));
  const sh = certifiedShape(meas);
  const coaxial2 = !!(sh && sh.kind === "cylinder" && fr && axis === sh.axis && [0, 1, 2].filter((k) => k !== axis).every((k) => Math.abs(fr.origin[k] - sh.centre[k]) <= 1e-6 * Math.max(1, Math.abs(sh.R))));
  return { tool, shape: sh?.kind ?? null, coaxial: coaxial2, kinds: ts?.kinds ?? null, partial: a < 360, curved, headTypes: ft, touchesAxis, worldAxis: axis >= 0, reachesWall: nearest !== null && rOuter >= nearest - 1e-6, rOuter, nearest, bodies: meas?.bodies?.length ?? null };
}
function ringSealed(p, fr, meas, eps = 1e-6) {
  const sh = certifiedShape(meas);
  if (!sh || !fr)
    return false;
  const nl = Math.hypot(...fr.n) || 1;
  const nn = fr.n.map((x) => x / nl);
  const a = nn.findIndex((x) => Math.abs(Math.abs(x) - 1) < 1e-9);
  if (a < 0)
    return false;
  const o = fr.origin;
  const rmax = Math.max(Math.abs(p.umin), Math.abs(p.umax));
  const t0 = o[a] + nn[a] * p.vmin;
  const t1 = o[a] + nn[a] * p.vmax;
  const lo = Math.min(t0, t1);
  const hi = Math.max(t0, t1);
  const b = sh.bbox;
  if (!(lo > b[a] + eps && hi < b[a + 3] - eps))
    return false;
  if (sh.kind === "box")
    return [0, 1, 2].filter((k) => k !== a).every((k) => o[k] - rmax > b[k] + eps && o[k] + rmax < b[k + 3] - eps);
  if (sh.axis !== a)
    return false;
  const [k1, k2] = [0, 1, 2].filter((k) => k !== a);
  return Math.hypot(o[k1] - sh.centre[k1], o[k2] - sh.centre[k2]) + rmax < sh.R - eps;
}
var GRAZE_MM = 0.25;
function candidatePlanes(cmds, a) {
  const nums = /* @__PURE__ */ new Set();
  const origins = /* @__PURE__ */ new Set();
  const scal = /* @__PURE__ */ new Set();
  const walk = (v, key) => {
    if (typeof v === "number" && Number.isFinite(v)) {
      nums.add(v);
      scal.add(Math.abs(v));
      return;
    }
    if (Array.isArray(v)) {
      if (v.length === 3 && v.every((x) => typeof x === "number")) {
        nums.add(v[a]);
        if (/origin|center|centre|at|position/i.test(key ?? ""))
          origins.add(v[a]);
        else
          scal.add(Math.abs(v[a]));
      }
      for (const x of v)
        walk(x, key);
      return;
    }
    if (v && typeof v === "object")
      for (const [k, x] of Object.entries(v))
        walk(x, k);
  };
  for (const c of cmds ?? [])
    walk(c.params ?? {}, "");
  const out = new Set(nums);
  for (const o of origins)
    if (o !== 0)
      for (const n of scal) {
        for (const m of [1, 0.5]) {
          out.add(o + m * n);
          out.add(o - m * n);
        }
      }
  for (const n of scal) {
    out.add(n / 2);
  }
  return [...out].filter(Number.isFinite);
}
function grazing(p, fr, meas, s = GRAZE_MM, cmds = null) {
  let sh = certifiedShape(meas);
  if (!sh && meas?.bbox && fr)
    sh = { kind: "any", bbox: meas.bbox };
  if (!sh || !fr)
    return null;
  const nl = Math.hypot(...fr.n) || 1;
  const nn = fr.n.map((x) => x / nl);
  const a = nn.findIndex((x) => Math.abs(Math.abs(x) - 1) < 1e-9);
  if (a < 0)
    return null;
  const o = fr.origin;
  const b = sh.bbox;
  const t0 = o[a] + nn[a] * p.vmin;
  const t1 = o[a] + nn[a] * p.vmax;
  const lo = Math.min(t0, t1);
  const hi = Math.max(t0, t1);
  const rmax = Math.max(Math.abs(p.umin), Math.abs(p.umax));
  const rmin = p.umin >= 0 ? p.umin : p.umax <= 0 ? -p.umax : 0;
  const [k1, k2] = [0, 1, 2].filter((k) => k !== a);
  const faceRadial = () => {
    if (sh.kind === "cylinder") {
      const off = Math.hypot(o[k1] - sh.centre[k1], o[k2] - sh.centre[k2]);
      return [Math.max(0, off - sh.R), off + sh.R];
    }
    const dx = [b[k1] - o[k1], b[k1 + 3] - o[k1]];
    const dy = [b[k2] - o[k2], b[k2 + 3] - o[k2]];
    const nearx = dx[0] <= 0 && dx[1] >= 0 ? 0 : Math.min(Math.abs(dx[0]), Math.abs(dx[1]));
    const neary = dy[0] <= 0 && dy[1] >= 0 ? 0 : Math.min(Math.abs(dy[0]), Math.abs(dy[1]));
    return [Math.hypot(nearx, neary), Math.hypot(Math.max(Math.abs(dx[0]), Math.abs(dx[1])), Math.max(Math.abs(dy[0]), Math.abs(dy[1])))];
  };
  const [fr0, fr1] = faceRadial();
  const radialOverlap = rmax >= fr0 - 1e-9 && rmin <= fr1 + 1e-9;
  if (radialOverlap && (sh.kind === "box" || sh.kind === "any" || sh.axis === a)) {
    for (const f of [b[a], b[a + 3]])
      for (const t of [lo, hi]) {
        const d = Math.abs(t - f);
        if (d > 1e-9 && d <= s)
          return { kind: "lip", gap: d, what: "the ring end" };
      }
  }
  if (sh.kind === "any") {
    for (const f of candidatePlanes(cmds, a))
      for (const t of [lo, hi]) {
        const d = Math.abs(t - f);
        if (d > 1e-9 && d <= s && f > b[a] + 1e-9 && f < b[a + 3] - 1e-9)
          return { kind: "lip?", gap: d, what: "the ring end" };
      }
  }
  const walls = [rmin, rmax].filter((r) => r > 0);
  const circleGap = (off, R, rho) => Math.min(Math.abs(off - Math.abs(R - rho)), Math.abs(off - (R + rho)));
  const axialTouch = hi >= b[a] - 1e-9 && lo <= b[a + 3] + 1e-9;
  if (axialTouch && sh.kind === "cylinder") {
    const off = Math.hypot(o[k1] - sh.centre[k1], o[k2] - sh.centre[k2]);
    for (const rho of walls) {
      const g = circleGap(off, sh.R, rho);
      if (off <= 1e-9 && rho > sh.R + 1e-9)
        continue;
      if (g <= s && !(off <= 1e-9 && Math.abs(sh.R - rho) <= 1e-9))
        return { kind: "tangent", gap: g, what: "the ring wall", round: true };
    }
  }
  if (axialTouch && sh.kind === "any" && meas?.faceTypes && Object.keys(meas.faceTypes).some((k) => k !== "plane" && meas.faceTypes[k] > 0)) {
    const cx = [(b[k1] + b[k1 + 3]) / 2, (b[k2] + b[k2 + 3]) / 2];
    const off = Math.hypot(o[k1] - cx[0], o[k2] - cx[1]);
    const Rs = /* @__PURE__ */ new Set([(b[k1 + 3] - b[k1]) / 2, (b[k2 + 3] - b[k2]) / 2]);
    for (const n of candidatePlanes(cmds, a))
      Rs.add(Math.abs(n));
    for (const c of cmds ?? []) {
      const w = (v) => {
        if (typeof v === "number" && Number.isFinite(v)) {
          Rs.add(Math.abs(v));
          Rs.add(Math.abs(v) / 2);
        } else if (Array.isArray(v))
          v.forEach(w);
        else if (v && typeof v === "object")
          Object.values(v).forEach(w);
      };
      w(c.params ?? {});
    }
    for (const R of Rs) {
      if (!(R > 0))
        continue;
      for (const rho of walls) {
        const g = circleGap(off, R, rho);
        if (g <= s && !(off <= 1e-9 && Math.abs(R - rho) <= 1e-9))
          return { kind: "tangent", gap: g, what: "the ring wall", round: true };
      }
    }
  }
  if (sh.kind === "box" || sh.kind === "any") {
    for (const k of [k1, k2]) {
      const kk = k === k1 ? k2 : k1;
      const spun = (cmds ?? []).some((c) => /revolve/i.test(c.command ?? ""));
      const flats = sh.kind === "any" && !spun ? [b[k], b[k + 3], ...candidatePlanes(cmds, k).filter((v) => v > b[k] + 1e-9 && v < b[k + 3] - 1e-9)] : [b[k], b[k + 3]];
      for (const f of flats) {
        const pd = Math.abs(f - o[k]);
        const foot = o[kk] >= b[kk] - 1e-9 && o[kk] <= b[kk + 3] + 1e-9;
        const axial = hi >= b[a] - 1e-9 && lo <= b[a + 3] + 1e-9;
        if (!foot || !axial)
          continue;
        for (const rho of [rmin, rmax])
          if (rho > 0 && Math.abs(rho - pd) <= s)
            return { kind: "tangent", gap: Math.abs(rho - pd), what: "the ring wall" };
      }
    }
  }
  return null;
}
function rotateAbout(v, k, deg) {
  const kl = Math.hypot(...k) || 1;
  const u = k.map((x) => x / kl);
  const c = Math.cos(deg * Math.PI / 180);
  const s = Math.sin(deg * Math.PI / 180);
  const cr = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  const d = u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
  return v.map((x, i) => x * c + cr[i] * s + u[i] * d * (1 - c));
}
function onRefused(f, st) {
  if (f.kind !== "groove" || !f.into)
    return false;
  st.head[headOf2(st, f.into)] = f.id;
  return true;
}
var refusal = (sentence, code, rg) => ({ refusal: sentence, code, ...rg ? { rg } : {} });
function guardPlan(raw, fe, st, ctx) {
  if (fe.kind !== "revolve" && fe.kind !== "groove")
    return raw(fe, st, ctx);
  const f = rgView(fe);
  const off = new Set(ctx.guardsOff ?? []);
  const on = (g) => !off.has(g);
  const verb = verbOf(f);
  const L = lead(f);
  const sk = st.sketches[f.target];
  const prob = on("G4") ? profileProblem(f, sk, ctx.arc) : null;
  if (prob)
    return refusal(prob, "G4");
  const p = profileInfo2(sk, ctx.arc);
  const a = f.angle;
  if (typeof a !== "number" || !Number.isFinite(a))
    return refusal(`${L}the angle has to be a number of degrees.`, "G4");
  if (f.kind === "groove" && (a <= 0 || a > 360))
    return refusal(`${L}a groove turns the ring more than 0 and at most 360 degrees, and ${num2(a)} is not in that range; use 360 for a full turn.`, "G4");
  if (f.kind === "revolve" && Math.abs(a) > MAX_SPIN)
    return refusal(`${L}a spin turns at most two full turns (720 degrees) either way, and ${num2(a)} is more; use 360 for one full turn.`, "G4");
  if (a === 0)
    return refusal(`${L}a ${verb} needs an angle other than 0 degrees.`, "G4");
  if (Math.abs(a) < MIN_TURN)
    return refusal(`${L}a turn of ${num2(a)} degrees is too thin to build as a curved part here; use a turn of 1 degree or more.`, "G4");
  let guard = null;
  let nudge = null;
  if (f.kind === "groove") {
    const head = headOf2(st, f.into);
    if (st.refused[head])
      return refusal(`${L}${head} was not built, so this groove has no finished part to cut; fix ${head} first.`, "RG-CHAIN");
    const bodies = st.bodies[head];
    if (bodies && bodies.length > 1)
      return refusal(`${L}${f.into} was left in ${bodies.length} separate pieces, and a groove cuts one piece, so cut before the part is split.`, "G4");
    const meas = st.measure[head];
    const fr = frameOf2(sk, ctx.mt);
    const cost = costFeatures(p, sk, ctx.arc, fr, meas, a);
    guard = { cost };
    if (meas && fr && ringMisses(p, fr, meas.bbox))
      return refusal(`${L}the ring does not reach the part, so it would cut nothing.`, "G4", guard);
    if (on("G9") && meas && fr && ringSealed(p, fr, meas))
      return refusal(`${L}the ring lies completely inside the part, so cutting it would leave a sealed hollow with no opening, which cannot be built reliably here; let the ring reach the outside of the part.`, "G9", guard);
    const gz = on("G10") && meas && fr ? grazing(p, fr, meas, GRAZE_MM, st.accepted ?? null) : null;
    if (gz) {
      const what = gz.round ? gz.gap < 5e-4 ? "the round wall of the ring touches a round wall of the part without lying on it, which cannot be built reliably here" : `the round wall of the ring passes within ${num2(gz.gap)} mm of a round wall of the part, which leaves a wall thinner than ${GRAZE_MM} mm that cannot be built reliably here` : gz.kind === "lip" ? `the ring ends ${num2(gz.gap)} mm short of a face of the part, which leaves a wall thinner than ${GRAZE_MM} mm that cannot be built reliably here` : gz.kind === "lip?" ? `the ring ends ${num2(gz.gap)} mm short of what may be a flat face inside the part, which could leave a wall thinner than ${GRAZE_MM} mm that cannot be built reliably here` : gz.gap < 5e-4 ? "the round wall of the ring touches a flat face of the part, which cannot be built reliably here" : `the round wall of the ring passes within ${num2(gz.gap)} mm of a flat face of the part, which cannot be built reliably here`;
      return refusal(`${L}${what}; ${gz.round ? "make the ring wall exactly flush with that wall or at least" : "move the ring edge onto that face or at least"} ${GRAZE_MM} mm away from it.`, "G10", guard);
    }
    const g7 = on("G7") && meas && fr ? profilePlaneOnFlatFace(fr, meas.bbox, meas.faceTypes) : null;
    if (g7) {
      if (Math.abs(a) < 360)
        return refusal(`${L}the ring starts in the flat plane ${g7.axis} = ${num2(g7.at)}, which is also a flat face of the part, and a part turn cut from there does not come out reliably; lift the part off that plane by 1 mm or more, or turn the ring a full 360 degrees.`, "G7", guard);
      nudge = NUDGE_DEG;
    }
    if (on("G8") && meas && fr) {
      const c = costRefusal(cost);
      if (c)
        return refusal(`${L}${c}.`, "G8", guard);
    }
  }
  const plan = raw(fe, st, ctx);
  if ("refusal" in plan)
    return plan;
  const side = on("G1") ? sideOf(p) : 1;
  const want = on("G3") ? kernelAngle(f, side) : f.angle === 360 ? null : side < 0 ? f.angle : -f.angle;
  if ("variants" in plan) {
    for (const v of plan.variants)
      for (const c of v) {
        if (c.command === "solid.revolve") {
          if (want === null)
            delete c.params.angle;
          else
            c.params.angle = want;
        }
        if (nudge && c.command === "sketch.create" && c.params.plane) {
          const plane = c.params.plane;
          plane.x_dir = rotateAbout(plane.x_dir, plane.y_dir, nudge);
        }
      }
  }
  return { ...plan, rg: { ...guard ?? {}, side, kernelAngle: want, nudgeDeg: nudge } };
}
function postCheck(fe, st, m, off = /* @__PURE__ */ new Set()) {
  if (fe.kind !== "groove" || off.has("G5"))
    return null;
  const f = rgView(fe);
  const before = st.measure[headOf2(st, f.into)];
  if (!before || !m)
    return null;
  const same2 = Math.abs(m.volume - before.volume) <= NOTHING * Math.max(1, Math.abs(before.volume)) && m.faces === before.faces && m.bodies.length === before.bodies.length;
  return same2 ? { plain: `${lead(f)}the ring does not cut the part (it misses it, or turns away from it), so there is nothing to remove.` } : null;
}
function plainRefusal(fe, err) {
  if (fe.kind !== "revolve" && fe.kind !== "groove")
    return null;
  const f = rgView(fe);
  if (err && typeof err === "object" && err.plain)
    return err.plain;
  const t = String(err ?? "");
  const L = lead(f);
  if (/no body named/i.test(t)) {
    return f.kind === "groove" ? `${L}the ring covers the whole part, so nothing would be left; make the ring smaller than the part.` : `${L}nothing came out of this spin; check that the outline has an area.`;
  }
  if (/crosses the revolve axis/i.test(t))
    return `${L}the outline crosses the line it spins about, so one side would overlap the other; draw the whole outline on one side of that line.`;
  if (/came out empty/i.test(t))
    return `${L}the ring does not reach the part, so it would cut nothing.`;
  if (/more than 0 and at most 360/i.test(t))
    return `${L}a turn has to be more than 0 and at most 360 degrees here.`;
  if (/Cut|fallback|implausible|coincident|no result|reliabl/i.test(t)) {
    return f.kind === "groove" ? `${L}this ring cannot be cut out of the part reliably, so the part is shown without it.` : `${L}this spin cannot be built reliably here, so it is not built.`;
  }
  if (/WASM TRAP|trap|unreachable|out of memory/i.test(t))
    return `${L}this ${verbOf(f)} is too much for the engine, so it is not built.`;
  return `${L}this ${verbOf(f)} cannot be built here, so it is not built.`;
}
function plainRefusalCode(fe, err) {
  if (err && typeof err === "object" && err.plain)
    return "G5";
  return fe.kind === "revolve" || fe.kind === "groove" ? "G6" : "";
}

// ../../layer/dist/revolve-groove.js
var RG_KINDS = ["revolve", "groove"];
var RG_BUDGET_S = COST_BUDGET_S;
function aggregateRG(res, names) {
  const bs = res.measure.bodies.filter((b) => names.some((n) => b.name === n || b.name.startsWith(`${n} (`)));
  if (!bs.length)
    return null;
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  for (const b of bs)
    for (let i = 0; i < 3; i++) {
      lo[i] = Math.min(lo[i], b.bbox.min[i]);
      hi[i] = Math.max(hi[i], b.bbox.max[i]);
    }
  return {
    volume: bs.reduce((s, b) => s + b.volume_mm3, 0),
    faces: bs.reduce((s, b) => s + b.faces, 0),
    kernelFaces: bs.reduce((s, b) => s + b.kernel.faces, 0),
    curved: bs.some((b) => Object.keys(b.face_types ?? {}).some((k) => k !== "plane")),
    bbox: [...lo, ...hi],
    area: bs.reduce((a, b) => a + (b.area_mm2 ?? 0), 0),
    faceTypes: bs.reduce((a, b) => {
      for (const [k, v] of Object.entries(b.face_types ?? {}))
        a[k] = (a[k] ?? 0) + v;
      return a;
    }, {}),
    com: [0, 1, 2].map((i) => bs.reduce((a, b) => a + b.volume_mm3 * b.center_of_mass[i], 0) / bs.reduce((a, b) => a + b.volume_mm3, 0)),
    bodies: bs.map((b) => b.name)
  };
}
var rgBudgetSentence = (id) => `${id} (groove): this groove took longer than ${COST_BUDGET_S} seconds to calculate, so it was stopped and the part is shown without it; use a ring with straight sides, or a part without round walls.`;
var rgPlanner = (f, st, ctx) => guardPlan((g, s, c) => planFeature(g, s, c, BASE_PROFILE), f, st, ctx);
var RG_PLAN = { ...BASE_PROFILE, name: "revolve-groove(plan)", planners: { revolve: rgPlanner, groove: rgPlanner } };
var DEP_REFUSED = /^\S+ \(\w+\): its \w+ (\S+) was refused \(/;
async function rgStep(f, idx, env) {
  const { doc, ctx, st, accepted, out, shapeCache } = env;
  const rs = st.rg;
  st.accepted = accepted;
  const prefix = doc.features.slice(0, idx);
  const resolved = await resolveNamesFor(f, prefix, { st, accepted, ctx, shapeCache, features: doc.features });
  const fctx = { ...ctx, resolve: (name) => resolved.get(name) ?? null };
  const note = (o) => {
    out.push({ id: f.id, kind: f.kind, ...o });
  };
  if (f.kind === "sketch")
    st.sketches[f.id] = f;
  let plan;
  try {
    plan = planFeature(f, st, fctx, RG_PLAN);
  } catch (e) {
    plan = refuse(`${f.id} (${f.kind}): translator error: ${e.message}`);
  }
  const own = f.kind === "revolve" || f.kind === "groove";
  if ("refusal" in plan) {
    st.refused[f.id] = plan.refusal;
    if (onRefused(rgView(f), st))
      rs.chained[f.id] = true;
    const pr = plan;
    let code2 = pr.code ?? (isVerbatimGuard(pr.guard) ? pr.guard : void 0);
    if (!code2 && !own) {
      const m = DEP_REFUSED.exec(plan.refusal);
      if (m && rs.chained[m[1]])
        code2 = "RG-CHAIN";
    }
    note({ status: "refused", refusal: plan.refusal, commands: [], ...code2 ? { guard: code2 } : {}, ...pr.rg ? { rg: pr.rg } : {} });
    return;
  }
  if ("noop" in plan) {
    note({ status: "noop", commands: [] });
    return;
  }
  const rg = plan.rg;
  let lastErr = null;
  let lastFail = null;
  let timedOut = false;
  let errored = false;
  for (const variant0 of plan.variants) {
    let variant = variant0;
    let repaired;
    let res;
    try {
      res = f.kind === "groove" ? await ctx.runSC([...accepted, ...variant], { budgetS: RG_BUDGET_S + 1.5 * rs.lastRunS }) : await ctx.runSC([...accepted, ...variant]);
    } catch (e) {
      res = { ok: false, failed: { error: `bridge error: ${e.message}` } };
    }
    if (!res.ok) {
      if (res.erroredBody)
        errored = true;
      if (res.timedOut && f.kind === "groove") {
        timedOut = true;
        lastErr = res.failed ? `${res.failed.command}: ${res.failed.error}` : "TIME BUDGET: the run did not finish";
        lastFail = res;
        continue;
      }
      lastErr = res.failed ? `${res.failed.command}: ${res.failed.error}` : String(res.rejected ?? res.error ?? "unknown");
      lastFail = res;
      continue;
    }
    let m = aggregateRG(res, plan.produces);
    if (!m) {
      lastErr = `solidcraft ran the commands but no body named ${plan.produces.join(", ")} came back`;
      continue;
    }
    const sv = f.kind === "extrude" ? sketchVolumeRefusal(f, st.sketches[f.target], ctx, res, plan.produces) : null;
    if (sv) {
      st.refused[f.id] = sv;
      if (onRefused(rgView(f), st))
        rs.chained[f.id] = true;
      note({ status: "refused", refusal: sv, guard: SKETCH_VOLUME_GUARD, commands: variant });
      return;
    }
    const mv = motionRefusal(f, st, ctx, res, plan.produces, accepted);
    const fx = mv ? await motionRepair(f, st, ctx, mv, plan.produces, accepted, variant, ctx.runSC) : null;
    const m2 = fx ? aggregateRG(fx.res, plan.produces) : null;
    if (mv && fx && m2) {
      variant = fx.variant;
      res = fx.res;
      m = m2;
      repaired = { pads: fx.pads, reason: mv.sentence };
    } else if (mv) {
      st.refused[f.id] = mv.sentence;
      if (onRefused(rgView(f), st))
        rs.chained[f.id] = true;
      note({ status: "refused", refusal: mv.sentence, guard: mv.guard, commands: variant });
      return;
    }
    const bl = blendRefusal(f, blendOf(plan), beforeOf(st, f.target), m, ctx);
    if (bl) {
      st.refused[f.id] = bl.sentence;
      if (onRefused(rgView(f), st))
        rs.chained[f.id] = true;
      note({ status: "refused", refusal: bl.sentence, guard: bl.guard, commands: variant });
      return;
    }
    {
      const post = postCheck(f, st, m, new Set(ctx.guardsOff ?? []));
      if (post) {
        lastErr = post;
        continue;
      }
    }
    const pc = f.kind === "pocket" ? await pocketCutRefusal(f, ctx, res, accepted, variant, plan.produces, ctx.runSC) : null;
    if (pc) {
      st.refused[f.id] = pc;
      if (onRefused(rgView(f), st))
        rs.chained[f.id] = true;
      note({ status: "refused", refusal: pc, guard: POCKET_CUT_GUARD, commands: variant });
      return;
    }
    const hc = f.kind === "shell" ? hollowRefusal(f, doc.features, st, ctx, res, plan.produces, accepted) : null;
    if (hc) {
      st.refused[f.id] = hc.sentence;
      if (onRefused(rgView(f), st))
        rs.chained[f.id] = true;
      note({ status: "refused", refusal: hc.sentence, guard: hc.guard, commands: variant });
      return;
    }
    accepted.push(...variant);
    rememberRun(accepted, res);
    for (const mp of membersOf(env.profile))
      mp.onAccepted?.(st, res, m, plan, { f, ctx });
    st.accLen[f.id] = accepted.length;
    st.bodies[f.id] = m.bodies;
    st.measure[f.id] = m;
    for (const c of plan.consumes) {
      if (c === f.id)
        continue;
      if (f.kind === "hole" || f.kind === "pocket" || f.kind === "groove") {
        if (c === (f.kind === "hole" ? f.target : f.into))
          st.head[c] = f.id;
      } else
        st.stale[c] = f.id;
    }
    note({ status: "built", commands: variant, measure: m, ...rg ? { rg } : {}, pickedFrom: plan.pickedFrom, evidence: plan.evidence ?? null, pick: variant.find((c) => c.params.edges || c.params.faces)?.params ?? null, variantsTried: plan.variants.indexOf(variant0) + 1, ...repaired ? { repaired } : {} });
    return;
  }
  let sentence;
  let code;
  if (errored) {
    sentence = erroredBodySentence(f);
    code = ERRORED_BODY_GUARD;
  } else if (timedOut) {
    sentence = rgBudgetSentence(f.id);
    code = "G-BUDGET";
  } else {
    const plain = plainRefusal(f, lastErr);
    sentence = plain ?? `${f.id} (${f.kind}): solidcraft refused it -- ${lastErr}`;
    if (plain !== null)
      code = plainRefusalCode(f, lastErr);
  }
  st.refused[f.id] = sentence;
  if (onRefused(rgView(f), st))
    rs.chained[f.id] = true;
  note({ status: "refused", refusal: sentence, commands: plan.variants[0], ...code ? { guard: code } : {}, ...rg ? { rg } : {}, failed: lastFail?.failed ?? null, sketchAtFailure: lastFail?.sketch_at_failure ?? null });
}
var RG_PROFILE = {
  name: "revolve-groove",
  // claiming revolve and groove is what makes this profile their owner in a composition; the real planning is rgPlanner, called by the step through RG_PLAN
  planners: { revolve: rgPlanner, groove: rgPlanner },
  verifies: false,
  initState(st) {
    st.rg = { chained: {}, lastRunS: 0 };
  },
  depSentence: BASE_PROFILE.depSentence,
  noOutline: BASE_PROFILE.noOutline,
  plannerError: BASE_PROFILE.plannerError,
  kernelRefusal: BASE_PROFILE.kernelRefusal,
  // how long the last accepted run took, whichever step built it: the budget of the next groove run is 45 s + 1.5 x this
  onAccepted(st, res) {
    if (res.cpuMs)
      st.rg.lastRunS = res.cpuMs / 1e3;
  },
  step: rgStep
};

// ../../layer/dist/fc-guard.js
var sub5 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
var add2 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
var mul2 = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
var dot7 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
var cross6 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
var len5 = (a) => Math.hypot(a[0], a[1], a[2]);
var unit2 = (a) => {
  const l = len5(a);
  return l > 0 ? mul2(a, 1 / l) : a;
};
var baseName = (n) => String(n ?? "").replace(/~\d+$/, "");
function edgePoints(e, nArc = 32) {
  const S = e.start;
  const M = e.mid;
  const T = e.end;
  const chord = len5(sub5(T, S));
  const scale2 = Math.max(1, len5(S), len5(T));
  if (chord > 1e-9 * scale2) {
    const m2 = mul2(add2(S, T), 0.5);
    if (len5(sub5(M, m2)) <= 1e-7 * scale2)
      return { straight: true, pts: [S, T] };
    const a = sub5(S, M);
    const b = sub5(T, M);
    const ab = cross6(a, b);
    const d2 = 2 * dot7(ab, ab);
    if (d2 < 1e-18)
      return { straight: true, pts: [S, T] };
    const centre3 = add2(M, mul2(cross6(sub5(mul2(b, dot7(a, a)), mul2(a, dot7(b, b))), ab), 1 / d2));
    const r = len5(sub5(S, centre3));
    const n = unit2(ab);
    const u0 = unit2(sub5(S, centre3));
    const v0 = cross6(n, u0);
    const ang = (P) => Math.atan2(dot7(sub5(P, centre3), v0), dot7(sub5(P, centre3), u0));
    const norm22 = (x) => {
      while (x < 0)
        x += 2 * Math.PI;
      while (x >= 2 * Math.PI)
        x -= 2 * Math.PI;
      return x;
    };
    const aM = norm22(ang(M));
    const aT = norm22(ang(T));
    const sweep = aM < aT ? aT : aT - 2 * Math.PI;
    const pts = [];
    for (let i = 0; i <= nArc; i++) {
      const t = sweep * i / nArc;
      pts.push(add2(centre3, add2(mul2(u0, r * Math.cos(t)), mul2(v0, r * Math.sin(t)))));
    }
    return { straight: false, pts, centre: centre3, radius: r, normal: n };
  }
  const centre2 = mul2(add2(S, M), 0.5);
  return { straight: false, closed: true, pts: null, centre: centre2, radius: len5(sub5(S, M)) / 2 };
}
var norm2 = (n) => baseName(n).replace(/#\d+$/, "");
function splitEdgeName(topo, name) {
  topo._fn ??= new Set(topo.faces.map((f) => norm2(f.name)));
  const s = baseName(name);
  const out = [];
  for (let i = s.indexOf("|"); i >= 0; i = s.indexOf("|", i + 1)) {
    const l = s.slice(0, i);
    const r = s.slice(i + 1);
    if (topo._fn.has(norm2(l)) && topo._fn.has(norm2(r)))
      out.push([l, r]);
  }
  return out[0] ?? null;
}
function faceByName(topo, name) {
  const b = baseName(name);
  return topo.faces.filter((f) => f.name === b || f.name.startsWith(`${b}#`));
}
function edgesOfFace(topo, face) {
  const fn = norm2(face.name);
  return topo.edges.filter((e) => {
    const p = splitEdgeName(topo, e.name);
    return p && (norm2(p[0]) === fn || norm2(p[1]) === fn);
  });
}
var distToPolyline = (P, pts) => {
  let best = Infinity;
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const ab = sub5(b, a);
    const l2 = dot7(ab, ab);
    const t = l2 > 0 ? Math.max(0, Math.min(1, dot7(sub5(P, a), ab) / l2)) : 0;
    best = Math.min(best, len5(sub5(P, add2(a, mul2(ab, t)))));
  }
  return best;
};
var scaleOf2 = (topo) => {
  let s = 1;
  for (const e of topo.edges)
    for (const p of [e.start, e.end])
      for (const v of p)
        s = Math.max(s, Math.abs(v));
  return s;
};
var ptsOf = (e) => edgePoints(e).pts ?? [e.start, e.mid, e.end];
function edgeOfPick(topo, P) {
  let best = null;
  for (const e of topo.edges) {
    const d = distToPolyline(P, ptsOf(e));
    if (!best || d < best.d)
      best = { e, d };
  }
  return best;
}
function crossesStrip(p0, p1, lo, hi, s, eps) {
  const N = 24;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const a = p0[0] + (p1[0] - p0[0]) * t;
    const p = p0[1] + (p1[1] - p0[1]) * t;
    if (a > lo + eps && a < hi - eps && p < s - eps && p > -eps)
      return true;
  }
  return false;
}
var bad = (code, args = {}) => ({ ok: false, code, args });
function guardBlend(topo, pick, size, style2) {
  const scale2 = scaleOf2(topo);
  const eps = 1e-6 * scale2;
  if (!(size >= 0.01))
    return bad("too-small", { size });
  const hit = edgeOfPick(topo, pick);
  if (!hit || hit.d > 0.02 * scale2 + 1e-3)
    return bad("no-edge", { dist: hit?.d });
  const e0 = hit.e;
  const names = splitEdgeName(topo, e0.name);
  if (!names)
    return bad("unknown-edge", { name: e0.name });
  const A = faceByName(topo, names[0]);
  const B = faceByName(topo, names[1]);
  if (!A.length || !B.length)
    return bad("unknown-edge", { name: e0.name });
  const planar = (f) => !!f.plane_normal && len5(f.plane_normal) > 0.5;
  const ep0 = edgePoints(e0);
  const info = { edge: e0.name, faces: names, size, style: style2 };
  if (!ep0.straight) {
    const capF = [...A, ...B].filter(planar);
    const sideF = [...A, ...B].filter((f) => !planar(f));
    if (capF.length !== 1 || sideF.length < 1)
      return bad("curved-edge");
    const cap2 = capF[0];
    const normEdge = (n) => baseName(n).replace(/#\d+/g, "");
    const loop = topo.edges.filter((e) => normEdge(e.name) === normEdge(e0.name));
    const centre2 = ep0.centre;
    const R = ep0.radius;
    info.loop = loop.length;
    info.R = R;
    const margin = Math.max(0.1, 5e-3 * R);
    if (size > R - margin)
      return bad("too-big", { face: "cap", extent: R, margin, ...info });
    for (const e of edgesOfFace(topo, cap2)) {
      if (loop.includes(e))
        continue;
      for (const q of ptsOf(e)) {
        const d2 = len5(sub5(q, centre2));
        if (d2 > R - size + eps && d2 < R + size - eps)
          return bad("in-the-way", { other: e.name, ...info });
      }
    }
    const ax = unit2(cap2.plane_normal);
    let hMin = Infinity;
    for (const sf of sideF)
      for (const e of edgesOfFace(topo, sf)) {
        if (loop.includes(e))
          continue;
        for (const q of ptsOf(e)) {
          const h = Math.abs(dot7(sub5(q, centre2), ax));
          if (h > eps)
            hMin = Math.min(hMin, h);
        }
      }
    info.sideHeight = Number.isFinite(hMin) ? hMin : null;
    if (Number.isFinite(hMin) && size > hMin - margin)
      return bad("too-big", { face: "side", extent: hMin, ...info });
    return { ok: true, rule: "rim", ...info };
  }
  if (A.length !== 1 || B.length !== 1 || !planar(A[0]) || !planar(B[0]))
    return bad("curved-face");
  const S = e0.start;
  const T = e0.end;
  const L = len5(sub5(T, S));
  const d = unit2(sub5(T, S));
  const stem = (n) => baseName(n).replace(/~\d+$/, "");
  const onLine = (P) => len5(cross6(sub5(P, S), d)) <= 1e-6 * scale2 * 10;
  const cand = topo.edges.filter((x) => x !== e0 && stem(x.name) === stem(e0.name) && onLine(x.start) && onLine(x.end));
  const chain0 = [e0];
  let grew = true;
  const touch = (a, b) => [a.start, a.end].some((P) => [b.start, b.end].some((Q) => len5(sub5(P, Q)) <= 1e-6 * scale2 * 10));
  while (grew) {
    grew = false;
    for (const x of cand)
      if (!chain0.includes(x) && chain0.some((c) => touch(c, x))) {
        chain0.push(x);
        grew = true;
      }
  }
  const pieces = cand.filter((x) => !chain0.includes(x));
  if (pieces.length)
    return bad("split", { pieces: pieces.map((x) => x.name), ...info });
  const sides = [];
  const near3 = (P, Q) => len5(sub5(P, Q)) <= 1e-6 * scale2 * 10;
  for (const F of [A[0], B[0]]) {
    const nF = unit2(F.plane_normal);
    let p = unit2(cross6(nF, d));
    const fe = edgesOfFace(topo, F).filter((x) => x !== e0);
    const segs2d = [];
    for (const x of edgesOfFace(topo, F)) {
      const pts = ptsOf(x);
      for (let i = 0; i + 1 < pts.length; i++)
        segs2d.push([[dot7(sub5(pts[i], S), d), dot7(sub5(pts[i], S), p)], [dot7(sub5(pts[i + 1], S), d), dot7(sub5(pts[i + 1], S), p)]]);
    }
    const inside2 = (qa2, qb) => {
      let c = 0;
      for (const [P, Q] of segs2d) {
        if (P[1] > qb !== Q[1] > qb) {
          const x = P[0] + (qb - P[1]) * (Q[0] - P[0]) / (Q[1] - P[1]);
          if (x > qa2)
            c++;
        }
      }
      return c % 2 === 1;
    };
    const delta = 1e-3 * Math.min(L, scale2);
    const qa = L * 0.5 + 1e-4 * L;
    const inPos = inside2(qa, delta);
    const inNeg = inside2(qa, -delta);
    if (inPos === inNeg)
      return bad("orientation", { face: F.name });
    if (inNeg)
      p = mul2(p, -1);
    const nbrs = fe.filter((x) => near3(x.start, S) || near3(x.end, S) || near3(x.start, T) || near3(x.end, T));
    sides.push({ F, p, others: fe, nbrs });
  }
  info.legs = [];
  for (const sd of sides) {
    for (const x of sd.nbrs) {
      const xd = unit2(sub5(x.end, x.start));
      const chain = topo.edges.filter((y) => y === x || stem(y.name) === stem(x.name) && len5(cross6(sub5(y.start, x.start), xd)) <= 1e-6 * scale2 * 10 && len5(cross6(sub5(y.end, x.start), xd)) <= 1e-6 * scale2 * 10);
      const xp = chain.flatMap((y) => ptsOf(y));
      const reach = Math.max(...xp.map((q) => dot7(sub5(q, S), sd.p)));
      info.legs.push({ face: sd.F.name, nbr: x.name, reach });
      if (reach <= eps)
        continue;
      const pr = splitEdgeName(topo, x.name);
      const other = pr ? norm2(pr[0]) === norm2(sd.F.name) ? pr[1] : pr[0] : "";
      if (/:blend:/.test(other))
        continue;
      if (reach < size + eps)
        return bad("too-big", { face: sd.F.name, extent: reach, equal: reach > size - eps, ...info });
    }
    for (const x of sd.others) {
      if (sd.nbrs.includes(x))
        continue;
      const ap = ptsOf(x).map((q) => [dot7(sub5(q, S), d), dot7(sub5(q, S), sd.p)]);
      for (let i = 0; i + 1 < ap.length; i++)
        if (crossesStrip(ap[i], ap[i + 1], 0, L, size, eps))
          return bad("in-the-way", { face: sd.F.name, other: x.name, ...info });
    }
  }
  {
    const pA = sides[0].p;
    const pB = sides[1].p;
    const nA = cross6(pA, pB);
    const nl = len5(nA);
    if (nl > 1e-9) {
      const aOf = (q) => {
        const w = sub5(q, S);
        const a = dot7(w, d);
        const w2 = sub5(w, mul2(d, a));
        const g11 = dot7(pA, pA);
        const g12 = dot7(pA, pB);
        const g22 = dot7(pB, pB);
        const r1 = dot7(w2, pA);
        const r2 = dot7(w2, pB);
        const det = g11 * g22 - g12 * g12;
        const alpha = (r1 * g22 - r2 * g12) / det;
        const beta = (g11 * r2 - g12 * r1) / det;
        return { a, alpha, beta };
      };
      const onFaces = /* @__PURE__ */ new Set([...edgesOfFace(topo, A[0]), ...edgesOfFace(topo, B[0])]);
      for (const x of topo.edges) {
        if (onFaces.has(x))
          continue;
        const xp = ptsOf(x);
        for (let i = 0; i < xp.length; i++)
          for (let k = 0; k <= 4; k++) {
            const q = i + 1 < xp.length ? add2(mul2(xp[i], 1 - k / 4), mul2(xp[i + 1], k / 4)) : xp[i];
            const c = aOf(q);
            if (c.a > eps && c.a < L - eps && c.alpha > eps && c.beta > eps && c.alpha + c.beta < size - eps)
              return bad("in-the-way", { other: x.name, inside: true, ...info });
          }
      }
    }
  }
  for (const P of [S, T]) {
    const nearP = (Q) => len5(sub5(P, Q)) <= 1e-6 * scale2 * 10;
    for (const f of topo.faces) {
      if (A.includes(f) || B.includes(f))
        continue;
      const touches = edgesOfFace(topo, f).some((x) => nearP(x.start) || nearP(x.end));
      if (touches && !planar(f))
        return bad("corner", { face: f.name, ...info });
    }
  }
  return { ok: true, rule: "planar", ...info };
}
function guardBatch(topo, picks, size, style2) {
  if (!(size >= 0.01))
    return bad("too-small", { size });
  const scale2 = scaleOf2(topo);
  const eps = 1e-6 * scale2;
  const hits = picks.map((p) => edgeOfPick(topo, p));
  for (const h of hits)
    if (!h || h.d > 0.02 * scale2 + 1e-3)
      return bad("no-edge", { dist: h?.d });
  const es = hits.map((h) => h.e);
  for (let i = 0; i < es.length; i++)
    for (let j = i + 1; j < es.length; j++)
      if (es[i] === es[j])
        return bad("twice", { edge: es[i].name });
  const rules = [];
  for (let i = 0; i < picks.length; i++) {
    const g = guardBlend(topo, picks[i], size, style2);
    if (!g.ok)
      return { ...g, args: { ...g.args, member: i, ofGroup: picks.length } };
    rules.push(g.rule);
  }
  const touch = (a, b) => [a.start, a.end].some((P) => [b.start, b.end].some((Q) => len5(sub5(P, Q)) <= 1e-6 * scale2 * 10));
  const faceSet = (e) => {
    const n = splitEdgeName(topo, e.name);
    return n ? [norm2(n[0]), norm2(n[1])] : [];
  };
  const insideFace = (F, P) => {
    if (!(F.plane_normal && len5(F.plane_normal) > 0.5))
      return null;
    const n = unit2(F.plane_normal);
    const a0 = Math.abs(n[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
    const u = unit2(cross6(n, a0));
    const v = cross6(n, u);
    const q = [dot7(P, u), dot7(P, v)];
    let inside2 = false;
    for (const x of edgesOfFace(topo, F)) {
      const ep = edgePoints(x);
      if (!ep.pts)
        return null;
      const pts = ep.pts;
      for (let i = 0; i + 1 < pts.length; i++) {
        const p0 = [dot7(pts[i], u), dot7(pts[i], v)];
        const p1 = [dot7(pts[i + 1], u), dot7(pts[i + 1], v)];
        if (p0[1] > q[1] !== p1[1] > q[1]) {
          const xi = p0[0] + (q[1] - p0[1]) * (p1[0] - p0[0]) / (p1[1] - p0[1]);
          if (xi > q[0])
            inside2 = !inside2;
        }
      }
    }
    return inside2;
  };
  for (let i = 0; i < es.length; i++)
    for (let j = i + 1; j < es.length; j++) {
      const fi = faceSet(es[i]);
      const fj = faceSet(es[j]);
      const common = fi.filter((x) => fj.includes(x));
      if (!common.length || touch(es[i], es[j]))
        continue;
      const pi = ptsOf(es[i]);
      const pj = ptsOf(es[j]);
      const A = pi.length === 2 ? Array.from({ length: 33 }, (_, k) => add2(mul2(pi[0], 1 - k / 32), mul2(pi[1], k / 32))) : pi;
      let dmin = Infinity;
      const B = pj.length === 2 ? Array.from({ length: 33 }, (_, k) => add2(mul2(pj[0], 1 - k / 32), mul2(pj[1], k / 32))) : pj;
      for (const a of A)
        for (const b of B) {
          const d = len5(sub5(a, b));
          if (d < dmin)
            dmin = d;
        }
      if (!(dmin < 2 * size - eps))
        continue;
      const mids = [];
      for (const a of A)
        for (const b of B)
          if (len5(sub5(a, b)) <= dmin + 1e-9 * scale2)
            mids.push(mul2(add2(a, b), 0.5));
      let between = false;
      for (const cn of common)
        for (const F of faceByName(topo, cn)) {
          const bpolys = edgesOfFace(topo, F).map((x) => ptsOf(x));
          const usable = mids.filter((mm2) => bpolys.every((pl) => distToPolyline(mm2, pl) > 1e-6 * scale2 * 10));
          if (!usable.length) {
            between = true;
            continue;
          }
          const r = insideFace(F, usable[Math.floor(usable.length / 2)]);
          if (r === null || r === true)
            between = true;
        }
      if (between)
        return bad("crowded", { face: common[0], gap: dmin, extent: dmin, equal: Math.abs(dmin - 2 * size) <= eps, a: es[i].name, b: es[j].name, size, ofGroup: picks.length });
    }
  if (style2 === "chamfer") {
    const key = (P) => P.map((v) => Math.round(v / (1e-6 * scale2 * 10))).join(",");
    const cnt = /* @__PURE__ */ new Map();
    for (const e of es)
      for (const P of /* @__PURE__ */ new Set([key(e.start), key(e.end)]))
        cnt.set(P, (cnt.get(P) ?? 0) + 1);
    for (const [, n] of cnt)
      if (n >= 3)
        return bad("corner3", { n, size, ofGroup: picks.length });
  }
  return { ok: true, rule: "group", rules, n: picks.length };
}
function guardShellRim(features, idx) {
  const f = features[idx];
  if (!f || f.kind !== "shell" || !f.open || !(f.thickness > 0))
    return { ok: true };
  const byId = new Map(features.map((x) => [x.id, x]));
  const same2 = (a, b) => !!a && !!b && a.cause === "primitive" && b.cause === "primitive" && a.feature === b.feature && a.part === b.part;
  let cur = f.target;
  const seen = /* @__PURE__ */ new Set();
  while (cur && !seen.has(cur)) {
    seen.add(cur);
    const g = byId.get(cur);
    if (!g || g.kind !== "fillet")
      break;
    if (g.style === "fillet" && g.size >= f.thickness - 1e-9 && (g.edge?.of ?? []).some((x) => same2(x, f.open)))
      return bad("knife-rim", { size: g.size, wall: f.thickness });
    cur = g.target;
  }
  return { ok: true };
}
function guardPrimitiveRound(f) {
  if (f.kind === "box" && f.round && f.roundStyle === "chamfer")
    return bad("whole-chamfer", { size: f.round });
  if (typeof f.round === "number" && f.round < 0)
    return bad("negative", { size: f.round });
  if (f.round !== void 0 && !(f.round >= 0.01))
    return bad("too-small", { size: f.round });
  return { ok: true };
}
function postCheck2(facesBefore, facesAfter, rule) {
  if (rule !== "planar")
    return { ok: true };
  return facesAfter === facesBefore + 1 ? { ok: true } : bad("face-count", { facesBefore, facesAfter });
}

// ../../layer/dist/fillet-chamfer.js
var FC_KINDS = ["fillet"];
var FC_PRIMITIVES = ["box", "cylinder", "sphere", "torus", "cone", "prism", "wedge"];
var fcCode = (code) => `FC-${code.toUpperCase()}`;
var headId = (st, id) => {
  let h = id;
  const seen = /* @__PURE__ */ new Set();
  while (st.head[h] && !seen.has(h)) {
    seen.add(h);
    h = st.head[h];
  }
  return h;
};
var FV5 = (f) => f;
var wordOf2 = (id) => /^bevel|^chamfer/.test(id) ? "bevel" : "round";
function sentenceCtx(raw, f, doc) {
  const sctx = {};
  const m = raw.match(/an operation after (\S+) changed or removed it/);
  const at2 = doc.features.findIndex((x) => x.id === f.id);
  if (m && at2 >= 0) {
    const from = doc.features.findIndex((x) => x.id === m[1]);
    sctx.causes = doc.features.slice(from + 1, at2).filter((x) => !["sketch", "extrude", "datum"].includes(x.kind)).map((x) => ({ id: x.id, kind: x.kind, style: FV5(x).style, size: FV5(x).size }));
    sctx.self = { style: FV5(doc.features[at2]).style, size: FV5(doc.features[at2]).size };
  }
  return sctx;
}
function refusalSentence(f, raw, verdict2, doc) {
  const s = verdict2 ? guardSentence(verdict2, f.id, wordOf2(f.id)) : plainSentence(raw, sentenceCtx(raw, f, doc)).sentence;
  return s ?? raw;
}
async function bodyTopo(ctx, accepted, bodyName) {
  let r;
  try {
    r = await ctx.topologyOf(accepted);
  } catch (e) {
    r = { ok: false, error: e.message };
  }
  const body = r.ok && r.topology ? r.topology.bodies.find((b) => b.name === bodyName) : null;
  if (!body || body.error)
    return { ok: false, error: `no topology for ${bodyName}` };
  const mb = r.measure?.bodies?.find((b) => b.name === bodyName);
  return { ok: true, topo: { faces: body.faces, edges: body.edges }, faces: mb?.faces ?? null };
}
async function guardCmd(ctx, accepted, cmd) {
  const T = await bodyTopo(ctx, accepted, cmd.params.body);
  if (!T.ok)
    return { ok: false, code: "no-topology", args: { why: T.error } };
  const picks = cmd.params.edges;
  const size = cmd.params.radius ?? cmd.params.distance;
  const style2 = cmd.command === "solid.chamfer" ? "chamfer" : "fillet";
  const g = picks.length === 1 ? guardBlend(T.topo, picks[0], size, style2) : guardBatch(T.topo, picks, size, style2);
  return g.ok ? { ok: true, rule: g.rule, facesBefore: T.faces } : g;
}
function faceCheck(gv, before, after) {
  if (!gv.ok || gv.rule !== "planar")
    return null;
  const b = gv.facesBefore ?? before;
  if (b === void 0)
    return { ok: false, code: "no-topology", args: { why: "the face count before the blend is not known" } };
  const pc = postCheck2(b, after, gv.rule);
  return pc.ok ? null : pc;
}
async function fcStep(f, idx, env) {
  const { doc, ctx, st, accepted, out, shapeCache } = env;
  const fs = st.fc;
  if (fs.consumed[f.id])
    return;
  const fv = FV5(f);
  const prefix = doc.features.slice(0, idx);
  const note = (o) => {
    out.push({ id: f.id, kind: f.kind, ...o });
  };
  const refused = (raw, o) => {
    const { verdict: verdict2, ...rest } = o;
    st.refused[f.id] = raw;
    note({ status: "refused", refusal: refusalSentence(f, raw, verdict2 ?? null, doc), ...rest, ...verdict2 ? { guard: fcCode(verdict2.code), fc: verdict2 } : {} });
  };
  if (f.kind === "fillet" && fv.edge && typeof fv.edge === "object" && ctx.topologyOf) {
    const run = [f];
    for (let j = idx + 1; j < doc.features.length; j++) {
      const g = doc.features[j];
      const gv = FV5(g);
      if (g.kind !== "fillet" || gv.style !== fv.style || gv.size !== fv.size || gv.target !== FV5(run[run.length - 1]).id || !gv.edge || typeof gv.edge !== "object")
        break;
      run.push(g);
    }
    if (run.length > 1) {
      for (const m of run.slice(1))
        fs.consumed[m.id] = true;
      await translateGroup(run, prefix, env);
      return;
    }
  }
  const resolved = await resolveNamesFor(f, prefix, { st, accepted, ctx, shapeCache });
  const fctx = { ...ctx, resolve: (name) => resolved.get(name) ?? null };
  if (f.kind === "sketch")
    st.sketches[f.id] = f;
  if (f.kind === "shell") {
    const gs = guardShellRim(doc.features, idx);
    if (!gs.ok) {
      refused(`${f.id} (shell): GUARD ${gs.code}`, { commands: [], verdict: gs });
      return;
    }
  }
  let guardNote = null;
  let pf = f;
  if (FC_PRIMITIVES.includes(f.kind) && fv.round !== void 0) {
    const g = guardPrimitiveRound(f);
    if (!g.ok) {
      guardNote = g;
      pf = { ...f, round: void 0, roundStyle: void 0 };
    }
  }
  let plan;
  try {
    plan = planFeature(pf, st, fctx, BASE_PROFILE);
  } catch (e) {
    plan = refuse(`${f.id} (${f.kind}): translator error: ${e.message}`);
  }
  if ("refusal" in plan) {
    if (isVerbatimGuard(plan.guard)) {
      st.refused[f.id] = plan.refusal;
      note({ status: "refused", refusal: plan.refusal, guard: plan.guard, commands: [] });
      return;
    }
    refused(plan.refusal, { commands: [] });
    return;
  }
  if ("noop" in plan) {
    note({ status: "noop", commands: [] });
    return;
  }
  let lastErr = null;
  let lastFail = null;
  let errored = false;
  for (const variant0 of plan.variants) {
    let variant = variant0;
    let repaired;
    let gv = null;
    const bl = variant[variant.length - 1];
    if (f.kind === "fillet" && bl && (bl.command === "solid.fillet" || bl.command === "solid.chamfer")) {
      gv = await guardCmd(ctx, accepted, bl);
      if (!gv.ok) {
        refused(`${f.id} (${f.kind}): GUARD ${gv.code}`, { commands: variant, verdict: gv });
        return;
      }
    }
    let res;
    try {
      res = await ctx.runSC([...accepted, ...variant]);
    } catch (e) {
      res = { ok: false, failed: { error: `bridge error: ${e.message}` } };
    }
    if (!res.ok) {
      if (res.erroredBody)
        errored = true;
      lastErr = res.failed ? `${res.failed.command}: ${res.failed.error}` : String(res.rejected ?? res.error ?? "unknown");
      lastFail = res;
      continue;
    }
    let m = aggregate(res, plan.produces);
    if (!m) {
      lastErr = `solidcraft ran the commands but no body named ${plan.produces.join(", ")} came back`;
      continue;
    }
    const sv = f.kind === "extrude" ? sketchVolumeRefusal(f, st.sketches[f.target], ctx, res, plan.produces) : null;
    if (sv) {
      st.refused[f.id] = sv;
      note({ status: "refused", refusal: sv, guard: SKETCH_VOLUME_GUARD, commands: variant });
      return;
    }
    const mv = motionRefusal(f, st, ctx, res, plan.produces, accepted);
    const fx = mv ? await motionRepair(f, st, ctx, mv, plan.produces, accepted, variant, ctx.runSC) : null;
    const m2 = fx ? aggregate(fx.res, plan.produces) : null;
    if (mv && fx && m2) {
      variant = fx.variant;
      res = fx.res;
      m = m2;
      repaired = { pads: fx.pads, reason: mv.sentence };
    } else if (mv) {
      st.refused[f.id] = mv.sentence;
      note({ status: "refused", refusal: mv.sentence, guard: mv.guard, commands: variant });
      return;
    }
    if (gv) {
      const pc = faceCheck(gv, f.kind === "fillet" ? st.measure[headId(st, fv.target)]?.faces : void 0, m.faces);
      if (pc) {
        refused(`${f.id} (${f.kind}): GUARD ${pc.code}`, { commands: variant, verdict: pc, measureRefused: m });
        return;
      }
    }
    const pcut = f.kind === "pocket" ? await pocketCutRefusal(f, ctx, res, accepted, variant, plan.produces, ctx.runSC) : null;
    if (pcut) {
      st.refused[f.id] = pcut;
      note({ status: "refused", refusal: pcut, guard: POCKET_CUT_GUARD, commands: variant });
      return;
    }
    const hc = f.kind === "shell" ? hollowRefusal(f, doc.features, st, ctx, res, plan.produces, accepted) : null;
    if (hc) {
      st.refused[f.id] = hc.sentence;
      note({ status: "refused", refusal: hc.sentence, guard: hc.guard, commands: variant });
      return;
    }
    accepted.push(...variant);
    rememberRun(accepted, res);
    for (const mp of membersOf(env.profile))
      mp.onAccepted?.(st, res, m, plan, { f, ctx });
    st.accLen[f.id] = accepted.length;
    st.bodies[f.id] = m.bodies;
    st.measure[f.id] = m;
    for (const c of plan.consumes) {
      if (c === f.id)
        continue;
      if (f.kind === "hole" || f.kind === "pocket" || f.kind === "groove") {
        if (c === (f.kind === "hole" ? f.target : f.into))
          st.head[c] = f.id;
      } else
        st.stale[c] = f.id;
    }
    const built = { commands: variant, measure: m, pickedFrom: plan.pickedFrom, evidence: plan.evidence ?? null, pick: variant.find((c) => c.params.edges || c.params.faces)?.params ?? null, variantsTried: plan.variants.indexOf(variant0) + 1, ...repaired ? { repaired } : {} };
    if (guardNote) {
      const sentence = refusalSentence(f, `${f.id} (${f.kind}): GUARD ${guardNote.code}`, guardNote, doc);
      note({ status: "refused", refusal: sentence, guard: fcCode(guardNote.code), fc: guardNote, partial: true, ...built });
    } else
      note({ status: "built", ...built });
    return;
  }
  if (errored) {
    st.refused[f.id] = `${f.id} (${f.kind}): solidcraft refused it -- ${lastErr}`;
    note({ status: "refused", refusal: erroredBodySentence(f), guard: ERRORED_BODY_GUARD, commands: plan.variants[0], failed: lastFail?.failed ?? null, sketchAtFailure: lastFail?.sketch_at_failure ?? null });
    return;
  }
  refused(`${f.id} (${f.kind}): solidcraft refused it -- ${lastErr}`, { commands: plan.variants[0], failed: lastFail?.failed ?? null, sketchAtFailure: lastFail?.sketch_at_failure ?? null });
}
async function translateGroup(run, prefix, env) {
  const { doc, ctx, st, accepted, out, shapeCache } = env;
  const first = run[0];
  const f0 = FV5(first);
  const ids = run.map((m) => m.id);
  const notes = /* @__PURE__ */ new Map();
  const flush = () => {
    for (const m of run) {
      const n = notes.get(m.id);
      if (n)
        out.push(n);
    }
  };
  const refuseAll = (raw, extra = {}, verdict2 = null) => {
    for (const m of run) {
      const rawM = raw.replace(/^[a-z]+\d+/i, m.id);
      st.refused[m.id] = rawM;
      notes.set(m.id, { id: m.id, kind: m.kind, status: "refused", refusal: refusalSentence(m, rawM, verdict2, doc), commands: [], group: ids, ...extra, ...verdict2 ? { guard: fcCode(verdict2.code), fc: verdict2 } : {} });
    }
  };
  const points = [];
  const evidences = [];
  for (const m of run) {
    const renv = makeEnv(st, accepted, prefix, ctx, shapeCache);
    let rr = await resolveName(FV5(m).edge, renv, "edge");
    rr = await confirmOnTarget(rr, { st, accepted, ctx, targetId: f0.target, features: prefix });
    if (!rr.ok || rr.kind !== "edge") {
      refuseAll(`${m.id} (fillet): ${rr.ok ? `the edge could not be resolved to a single edge (it names ${rr.kind})` : rr.sentence}`);
      flush();
      return;
    }
    points.push(rr.point);
    evidences.push(rr.evidence);
  }
  const resolved = /* @__PURE__ */ new Map();
  resolved.set(f0.edge, { ok: true, kind: "edge", point: points[0], evidence: evidences[0] });
  const fctx = { ...ctx, resolve: (nm) => resolved.get(nm) ?? null };
  let plan;
  try {
    plan = planFeature(first, st, fctx, BASE_PROFILE);
  } catch (e) {
    plan = refuse(`${first.id} (fillet): translator error: ${e.message}`);
  }
  if ("refusal" in plan) {
    refuseAll(plan.refusal);
    flush();
    return;
  }
  if ("noop" in plan)
    throw new Error("a fillet cannot plan to nothing");
  const body = plan.produces[0];
  const mk = (pts) => f0.style === "chamfer" ? { command: "solid.chamfer", params: { edges: pts, distance: f0.size, body } } : { command: "solid.fillet", params: { edges: pts, radius: f0.size, body } };
  const T0 = await bodyTopo(ctx, accepted, body);
  if (!T0.ok) {
    refuseAll(`${first.id} (fillet): solidcraft returned no topology for ${body}`);
    flush();
    return;
  }
  const near3 = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) <= 1e-6 * 10 * Math.max(1, ...T0.topo.edges.flatMap((e) => [...e.start, ...e.end].map(Math.abs)));
  const edgeIdx = points.map((p) => {
    let bi = -1;
    let bd = Infinity;
    T0.topo.edges.forEach((e, i) => {
      const d = Math.min(Math.hypot(...[0, 1, 2].map((k) => e.mid[k] - p[k])), Math.hypot(...[0, 1, 2].map((k) => e.start[k] - p[k])), Math.hypot(...[0, 1, 2].map((k) => e.end[k] - p[k])));
      if (d < bd) {
        bd = d;
        bi = i;
      }
    });
    return bi;
  });
  const dupe = edgeIdx.findIndex((e, i) => e >= 0 && edgeIdx.indexOf(e) !== i);
  if (dupe >= 0) {
    refuseAll(`${first.id} (fillet): GUARD twice`, {}, { code: "twice", args: {} });
    flush();
    return;
  }
  const ends = edgeIdx.map((i) => i >= 0 ? [T0.topo.edges[i].start, T0.topo.edges[i].end] : [points[0], points[0]]);
  const parent = run.map((_, i) => i);
  const find = (i) => parent[i] === i ? i : parent[i] = find(parent[i]);
  for (let a = 0; a < run.length; a++)
    for (let b = a + 1; b < run.length; b++)
      if (ends[a].some((p) => ends[b].some((q) => near3(p, q))))
        parent[find(a)] = find(b);
  const comps = /* @__PURE__ */ new Map();
  run.forEach((_, i) => {
    const r = find(i);
    if (!comps.has(r))
      comps.set(r, []);
    comps.get(r).push(i);
  });
  let before = st.measure[headId(st, f0.target)]?.faces;
  for (const members of comps.values()) {
    const cmd = mk(members.map((i) => points[i]));
    const gv = await guardCmd(ctx, accepted, cmd);
    let res = null;
    let lastFail = null;
    let m2 = null;
    let verdict2 = null;
    if (!gv.ok)
      verdict2 = { guard: gv, raw: `GUARD ${gv.code}` };
    else {
      try {
        res = await ctx.runSC([...accepted, cmd]);
      } catch (e) {
        res = { ok: false, failed: { error: `bridge error: ${e.message}` } };
      }
      if (!res.ok) {
        const lastErr = res.failed ? `${res.failed.command}: ${res.failed.error}` : String(res.rejected ?? res.error ?? "unknown");
        lastFail = res;
        verdict2 = { raw: `solidcraft refused it -- ${lastErr}`, ...res.erroredBody ? { errored: true } : {} };
      } else {
        m2 = aggregate(res, plan.produces);
        if (!m2)
          verdict2 = { raw: `solidcraft ran the commands but no body named ${plan.produces.join(", ")} came back` };
        else if (members.length === 1) {
          const pc = faceCheck(gv, before, m2.faces);
          if (pc)
            verdict2 = { guard: pc, raw: `GUARD ${pc.code}`, measureRefused: m2 };
        }
      }
    }
    if (verdict2) {
      for (const i of members) {
        const m = run[i];
        const rawM = `${m.id} (fillet): ${verdict2.raw}`;
        st.refused[m.id] = rawM;
        notes.set(m.id, { id: m.id, kind: "fillet", status: "refused", refusal: verdict2.errored ? erroredBodySentence(m) : refusalSentence(m, rawM, verdict2.guard ?? null, doc), commands: [cmd], group: ids, ...verdict2.errored ? { guard: ERRORED_BODY_GUARD } : verdict2.guard ? { guard: fcCode(verdict2.guard.code), fc: verdict2.guard } : {}, failed: lastFail?.failed ?? null, measureRefused: verdict2.measureRefused ?? null });
      }
      continue;
    }
    const mm2 = m2;
    accepted.push(cmd);
    rememberRun(accepted, res);
    members.forEach((i, k) => {
      const m = run[i];
      for (const mp of membersOf(env.profile))
        mp.onAccepted?.(st, res, mm2, plan, { f: m, ctx });
      st.accLen[m.id] = accepted.length;
      st.bodies[m.id] = mm2.bodies;
      st.measure[m.id] = mm2;
      st.stale[i === 0 ? f0.target : run[i - 1].id] = m.id;
      notes.set(m.id, { id: m.id, kind: "fillet", status: "built", commands: k === 0 ? [cmd] : [], measure: mm2, pickedFrom: plan.pickedFrom, evidence: evidences[i], pick: k === 0 ? cmd.params : null, group: ids, groupSize: members.length, variantsTried: 1 });
    });
    before = mm2.faces;
  }
  flush();
}
var notSync2 = () => {
  throw new Error("the 'fillet-chamfer' planner set plans a fillet asynchronously (the name is resolved on the engine, the guard reads its topology); use translateDoc");
};
var FC_PROFILE = {
  name: "fillet-chamfer",
  // claiming the 'fillet' kind is what makes this profile its owner in a composition; the real planning is the base planner, called by the step
  planners: { fillet: notSync2 },
  verifies: false,
  initState(st) {
    st.fc = { consumed: {} };
  },
  // wording of the generic loop: the step does not use these, they are the base's so the profile is complete
  depSentence: BASE_PROFILE.depSentence,
  noOutline: BASE_PROFILE.noOutline,
  plannerError: BASE_PROFILE.plannerError,
  kernelRefusal: BASE_PROFILE.kernelRefusal,
  step: fcStep
};

// ../../layer/dist/unified.js
var EP_KINDS = ["extrude", "pocket"];
var FV6 = (f) => f;
var isRefusedRound = (f) => FC_PRIMITIVES.includes(f.kind) && f.round !== void 0 && !guardPrimitiveRound(f).ok;
var isChamferBox = (f) => f.kind === "box" && !!FV6(f).round && FV6(f).roundStyle === "chamfer";
function domainOf(doc) {
  let ep = false;
  let holes = false;
  let sd = false;
  let pm = false;
  let bool = false;
  let rg = false;
  let fc = false;
  for (const f of doc.features) {
    if (EP_KINDS.includes(f.kind))
      ep = true;
    else if (f.kind === "hole")
      holes = true;
    else if (f.kind === "shell" || f.kind === "draft" || isChamferBox(f))
      sd = true;
    else if (PM_KINDS.includes(f.kind))
      pm = true;
    else if (BOOL_KINDS.includes(f.kind))
      bool = true;
    else if (RG_KINDS.includes(f.kind))
      rg = true;
    else if (FC_KINDS.includes(f.kind) || isRefusedRound(f))
      fc = true;
  }
  const style2 = ep ? "extrude-pocket" : holes ? "holes" : sd ? "shell-draft" : pm ? "patterns-mirror" : bool ? "booleans" : rg ? "revolve-groove" : fc ? "fillet-chamfer" : "extrude-pocket";
  return { ep, holes, sd, pm, bool, rg, fc, style: style2 };
}
function routeOf(f, st, ctx) {
  if (f.kind === "shell" || f.kind === "draft")
    return "shell-draft";
  if (isChamferBox(f) || voidedDep(FV6(f), st))
    return "shell-draft";
  if (FC_KINDS.includes(f.kind))
    return "fillet-chamfer";
  if (isRefusedRound(f))
    return "fillet-chamfer";
  if (PM_KINDS.includes(f.kind))
    return "patterns-mirror";
  if (ctx && (f.kind === "pocket" || f.kind === "hole")) {
    let hit = false;
    try {
      hit = !!cutGuard(f, st, ctx);
    } catch {
      hit = false;
    }
    if (hit)
      return "patterns-mirror";
  }
  if (f.kind === "hole")
    return "holes";
  if (EP_KINDS.includes(f.kind))
    return "extrude-pocket";
  if (BOOL_KINDS.includes(f.kind))
    return "booleans";
  if (RG_KINDS.includes(f.kind))
    return "revolve-groove";
  return st.unified.domain.style;
}
function wrapped(ctx, st, seen, budget, pmBudget) {
  const hs = st.holes;
  return {
    ...ctx,
    runSC: async (cmds, opts) => {
      const o = opts ?? (budget ? { budgetS: BUDGET_S + 1.5 * hs.lastRunS } : pmBudget ? { budgetS: ((ctx.pmBudgetMs ?? 6e5) + 2 * st.pm.accMs + 1e3) / 1e3 } : void 0);
      const res = o === void 0 ? await ctx.runSC(cmds) : await ctx.runSC(cmds, o);
      if (!opts && budget)
        hs.spentS += (res?.cpuMs ?? 0) / 1e3;
      if (res?.ok)
        seen.push({ cmds, res });
      return res;
    }
  };
}
var toE = (m, r) => r?.measure ? aggregate(r, m.bodies, true) ?? m : m;
var toP = (m, r) => r?.measure ? aggregateOf(r, [...new Set(m.bodies)]) ?? m : m;
async function unifiedStep(f, idx, env) {
  const { st, accepted } = env;
  const route = routeOf(f, st, env.ctx);
  const dom = st.unified.domain;
  const mixed = Number(dom.ep) + Number(dom.holes) + Number(dom.sd) + Number(dom.pm) + Number(dom.bool) + Number(dom.rg) + Number(dom.fc) >= 2;
  const wrap = mixed || dom.holes && route !== "holes";
  const seen = [];
  const env2 = wrap ? { ...env, ctx: wrapped(env.ctx, st, seen, dom.holes, dom.pm) } : env;
  const kind = route === "extrude-pocket" || route === "revolve-groove" ? "E" : "P";
  const maps = st.unified.maps;
  if (mixed) {
    st.measure = maps[kind].measure;
    st.bodies = maps[kind].bodies;
  }
  const before = st.accLen[f.id];
  const nOut = env.out.length;
  if (route === "holes")
    await holesStep(f, idx, env2);
  else if (route === "shell-draft")
    await shellDraftStep(f, idx, env2);
  else if (route === "patterns-mirror")
    await pmStep(f, idx, env2);
  else if (route === "booleans")
    await boolStep(f, idx, env2);
  else if (route === "revolve-groove")
    await rgStep(f, idx, env2);
  else if (route === "fillet-chamfer")
    await fcStep(f, idx, env2);
  else
    await genericStep(f, idx, env2, EXTRUDE_POCKET_PROFILE);
  if (route === "fillet-chamfer") {
    for (const n of env.out.slice(nOut))
      if (n.status === "refused" && n.refusal !== void 0 && st.refused[n.id] !== void 0)
        st.refused[n.id] = n.refusal;
    if (mixed) {
      const other2 = "E";
      for (const n of env.out.slice(nOut)) {
        const mm2 = st.measure[n.id];
        if (st.accLen[n.id] === void 0 || !mm2 || maps[other2].measure[n.id])
          continue;
        const rr = seen.find((x) => x.cmds.length === st.accLen[n.id] && x.cmds.every((c, i) => c === accepted[i]))?.res;
        if (mm2.shells === void 0)
          mm2.shells = toE(mm2, rr).shells;
        const o2 = toE(mm2, rr);
        maps[other2].measure[n.id] = o2;
        maps[other2].bodies[n.id] = o2.bodies;
      }
    }
    return;
  }
  if (!mixed)
    return;
  const m = st.measure[f.id];
  if (st.accLen[f.id] === before || !m)
    return;
  const r = seen.find((x) => x.cmds.length === accepted.length && x.cmds.every((c, i) => c === accepted[i]))?.res;
  const other = kind === "E" ? "P" : "E";
  if ((kind === "P" || route === "revolve-groove") && m.shells === void 0)
    m.shells = toE(m, r).shells;
  const o = kind === "E" ? toP(m, r) : toE(m, r);
  maps[other].measure[f.id] = o;
  maps[other].bodies[f.id] = o.bodies;
}
var UNIFIED_PROFILE = {
  name: "unified",
  // claiming every kind a group lists keeps planFeature honest about what this set plans (a hole, a shell and a draft are planned asynchronously by the step)
  planners: { ...EXTRUDE_POCKET_PROFILE.planners, ...HOLES_PROFILE.planners, ...SHELL_DRAFT_PROFILE.planners, ...PM_PROFILE.planners, ...BOOL_PROFILE.planners, ...RG_PROFILE.planners, ...FC_PROFILE.planners },
  verifies: true,
  initState(st, doc) {
    EXTRUDE_POCKET_PROFILE.initState(st);
    HOLES_PROFILE.initState(st);
    SHELL_DRAFT_PROFILE.initState(st);
    PM_PROFILE.initState(st);
    BOOL_PROFILE.initState(st, doc);
    RG_PROFILE.initState(st);
    FC_PROFILE.initState(st);
    st.unified = { domain: domainOf(doc ?? { features: [] }), maps: { E: { measure: {}, bodies: {} }, P: { measure: {}, bodies: {} } } };
  },
  // wording of the synchronous planFeature only (the step chooses the wording of a run by the document's style): the extrude-pocket group's, the first entry
  depSentence: EXTRUDE_POCKET_PROFILE.depSentence,
  noOutline: EXTRUDE_POCKET_PROFILE.noOutline,
  plannerError: EXTRUDE_POCKET_PROFILE.plannerError,
  kernelRefusal: EXTRUDE_POCKET_PROFILE.kernelRefusal,
  onAccepted(st, res, m, plan, acc) {
    EXTRUDE_POCKET_PROFILE.onAccepted(st, res, m, plan);
    HOLES_PROFILE.onAccepted(st, res, m, plan);
    PM_PROFILE.onAccepted(st, res, m, plan, acc);
    BOOL_PROFILE.onAccepted(st, res, m, plan, acc);
    RG_PROFILE.onAccepted(st, res, m, plan);
    SHELL_DRAFT_PROFILE.onAccepted(st, res, m, plan);
  },
  result: (st) => st.unified.domain.holes ? { spentS: st.holes.spentS } : {},
  step: unifiedStep
};

// ../../layer/dist/translator.js
var PROFILES = { base: BASE_PROFILE, "extrude-pocket": EXTRUDE_POCKET_PROFILE, holes: HOLES_PROFILE, "shell-draft": SHELL_DRAFT_PROFILE, "patterns-mirror": PM_PROFILE, booleans: BOOL_PROFILE, "revolve-groove": RG_PROFILE, "fillet-chamfer": FC_PROFILE };
var ALL_PROFILES = { ...PROFILES, unified: UNIFIED_PROFILE };
function createTranslator(options = {}) {
  const planners = options.planners ?? "base";
  const names = Array.isArray(planners) ? planners : [planners];
  if (!names.length)
    throw new Error("planners: an empty list of planner sets");
  const members = names.map((n) => {
    const p = Object.prototype.hasOwnProperty.call(ALL_PROFILES, n) ? ALL_PROFILES[n] : void 0;
    if (!p)
      throw new Error(`unknown planner set '${String(n)}'`);
    return p;
  });
  if (names.includes("unified") && names.length > 1)
    throw new Error("planners: 'unified' is a whole set (base + every group, one loop); it is not composed with other sets");
  if (new Set(names).size !== names.length)
    throw new Error(`planners: a planner set is listed twice (${names.join(", ")})`);
  const profile = composeProfiles(members);
  return {
    planners,
    FEATURE_KINDS,
    translateDoc: (doc, ctx) => translateDoc(doc, ctx, profile),
    planFeature: (f, st, ctx) => planFeature(f, st, ctx, profile),
    resolveAfter
  };
}

// ../../layer/dist/surface-sketch.js
var DEG = 180 / Math.PI;

// ../../layer/dist/pm-preflight.js
var PREFLIGHT_SENTENCE = "repeatAround(): an angle of 360 degrees or more (or a negative full turn) means something different for a pocket or hole than for a whole shape, so it is not available -- leave the angle out for a full turn, or give one under 360.";
var PREFLIGHT_SENTENCE_VAR = "repeatAround(): the angle has to be written as a plain number inside the call, for example { count: 4, angle: 90 }, so it can be checked.";
function matchClose(src, i) {
  const open = src[i];
  const close = open === "(" ? ")" : open === "{" ? "}" : "]";
  let depth = 0;
  let q = null;
  for (let k = i; k < src.length; k++) {
    const c = src[k];
    if (q) {
      if (c === "\\")
        k++;
      else if (c === q)
        q = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      q = c;
      continue;
    }
    if (c === open)
      depth++;
    else if (c === close && --depth === 0)
      return k;
  }
  return -1;
}
function splitArgs(s) {
  const out = [];
  let depth = 0;
  let q = null;
  let cur = "";
  for (let k = 0; k < s.length; k++) {
    const c = s[k];
    if (q) {
      cur += c;
      if (c === "\\") {
        cur += s[++k] ?? "";
      } else if (c === q)
        q = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      q = c;
      cur += c;
      continue;
    }
    if ("({[".includes(c))
      depth++;
    else if (")}]".includes(c))
      depth--;
    if (c === "," && depth === 0) {
      out.push(cur);
      cur = "";
    } else
      cur += c;
  }
  if (cur.trim())
    out.push(cur);
  return out;
}
function preflightScript(src) {
  const code = String(src).replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
  if (/\b(repeatAround|polarPattern)\b(?!\s*\()/.test(code) && /\bangle\b/.test(code))
    return { sentence: PREFLIGHT_SENTENCE_VAR, why: "repeatAround used without a direct call" };
  const re = /\b(?:repeatAround|polarPattern)\s*\(/g;
  let m;
  while (m = re.exec(code)) {
    const open = m.index + m[0].length - 1;
    const close = matchClose(code, open);
    if (close < 0)
      continue;
    const args = splitArgs(code.slice(open + 1, close));
    const opt = (args[1] ?? "").trim();
    if (!opt)
      continue;
    if (!opt.startsWith("{")) {
      if (/\bangle\b/.test(code))
        return { sentence: PREFLIGHT_SENTENCE_VAR, why: "options not inline" };
      continue;
    }
    const inner = opt.slice(1, opt.lastIndexOf("}"));
    for (const prop of splitArgs(inner)) {
      const pm = /^\s*(?:["']?angle["']?)\s*:\s*([\s\S]*)$/.exec(prop);
      if (!pm)
        continue;
      const expr = pm[1].trim();
      if (!/^[-+*/().\d\s eE]+$/.test(expr))
        return { sentence: PREFLIGHT_SENTENCE_VAR, why: `angle expression ${expr}` };
      let val;
      try {
        val = Function(`"use strict"; return (${expr});`)();
      } catch {
        return { sentence: PREFLIGHT_SENTENCE_VAR, why: `angle expression ${expr}` };
      }
      if (!Number.isFinite(val))
        return { sentence: PREFLIGHT_SENTENCE_VAR, why: `angle ${expr}` };
      if (Math.abs(val) >= 360 && val !== 360)
        return { sentence: PREFLIGHT_SENTENCE, why: `angle ${val}` };
    }
  }
  return null;
}

// ../../layer/dist/legacy-guard.js
var sub6 = (a, b) => [a[0] - b[0], a[1] - b[1]];
var cross7 = (a, b) => a[0] * b[1] - a[1] * b[0];
var dot8 = (a, b) => a[0] * b[0] + a[1] * b[1];
var len6 = (a) => Math.hypot(a[0], a[1]);
function diagOf2(pts) {
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const d = Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  return Number.isFinite(d) && d > 1e-9 ? d : 1;
}
var E = (pts, e) => {
  const n = pts.length;
  return [pts[(e % n + n) % n], pts[((e + 1) % n + n) % n]];
};
var edgeVec = (pts, e) => {
  const [a, b] = E(pts, e);
  return sub6(b, a);
};
function signedResiduals(pts, constraints, start = pts, scale2 = diagOf2(start)) {
  return constraints.map((c) => {
    switch (c.kind) {
      case "horizontal": {
        const [a, b] = E(pts, c.edge);
        return b[1] - a[1];
      }
      case "vertical": {
        const [a, b] = E(pts, c.edge);
        return b[0] - a[0];
      }
      case "length":
        return len6(edgeVec(pts, c.edge)) - c.value;
      case "equal":
        return len6(edgeVec(pts, c.edge)) - len6(edgeVec(pts, c.other));
      case "parallel":
      case "perpendicular": {
        const u = edgeVec(pts, c.edge), v = edgeVec(pts, c.other);
        const lu = len6(u), lv = len6(v);
        if (lu < 1e-12 || lv < 1e-12)
          return scale2;
        const s = c.kind === "parallel" ? cross7(u, v) / (lu * lv) : dot8(u, v) / (lu * lv);
        return Math.asin(Math.max(-1, Math.min(1, s))) * scale2;
      }
      case "distanceX":
        return pts[c.b][0] - pts[c.a][0] - c.value;
      case "distanceY":
        return pts[c.b][1] - pts[c.a][1] - c.value;
      case "symmetric": {
        const mx = (pts[c.a][0] + pts[c.b][0]) / 2 - pts[c.center][0], my = (pts[c.a][1] + pts[c.b][1]) / 2 - pts[c.center][1];
        return Math.abs(mx) >= Math.abs(my) ? mx : my;
      }
      case "angle": {
        const u = edgeVec(pts, c.edge), v = edgeVec(pts, c.other);
        if (len6(u) < 1e-12 || len6(v) < 1e-12)
          return scale2;
        const turn = Math.atan2(cross7(u, v), dot8(u, v));
        let want = c.degrees * Math.PI / 180 % (2 * Math.PI);
        if (want > Math.PI)
          want -= 2 * Math.PI;
        if (want <= -Math.PI)
          want += 2 * Math.PI;
        let d = turn - want;
        d = ((d + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
        return d / (2 * Math.PI) * scale2;
      }
      case "lock":
        return Math.hypot(pts[c.corner][0] - start[c.corner][0], pts[c.corner][1] - start[c.corner][1]);
      default:
        return NaN;
    }
  });
}
function rowsOf2(pts, constraints, start = pts, scale2 = diagOf2(start)) {
  const out = [];
  constraints.forEach((c) => {
    if (c.kind === "lock")
      return;
    if (c.kind === "symmetric") {
      out.push((pts[c.a][0] + pts[c.b][0]) / 2 - pts[c.center][0], (pts[c.a][1] + pts[c.b][1]) / 2 - pts[c.center][1]);
      return;
    }
    out.push(signedResiduals(pts, [c], start, scale2)[0]);
  });
  return out;
}
function checkAll(pts, constraints, start = pts, tolMm = 1e-6) {
  const r = signedResiduals(pts, constraints, start);
  let worst = { index: -1, residual: 0 };
  r.forEach((v, i) => {
    if (!(Math.abs(v) <= Math.abs(worst.residual)))
      worst = { index: i, kind: constraints[i].kind, residual: v };
  });
  const ok = r.every((v) => Math.abs(v) <= tolMm);
  return { ok, worst, residuals: r };
}
function solveLin(A, b) {
  const n = b.length;
  const M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let i = c + 1; i < n; i++)
      if (Math.abs(M[i][c]) > Math.abs(M[p][c]))
        p = i;
    [M[c], M[p]] = [M[p], M[c]];
    if (Math.abs(M[c][c]) < 1e-300)
      return null;
    for (let i = c + 1; i < n; i++) {
      const f = M[i][c] / M[c][c];
      for (let j = c; j <= n; j++)
        M[i][j] -= f * M[c][j];
    }
  }
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = M[i][n];
    for (let j = i + 1; j < n; j++)
      s -= M[i][j] * x[j];
    x[i] = s / M[i][i];
  }
  return x;
}
function polish(pts0, constraints, pinned = [], { maxIter = 80, tol = 1e-13 } = {}) {
  const n = pts0.length;
  const start = pts0.map((p) => [p[0], p[1]]);
  const fixed = new Set(pinned.map((p) => (p % n + n) % n));
  for (const c of constraints)
    if (c.kind === "lock")
      fixed.add((c.corner % n + n) % n);
  const free2 = [];
  for (let i = 0; i < n; i++)
    if (!fixed.has(i))
      free2.push(2 * i, 2 * i + 1);
  const scale2 = diagOf2(start);
  const flat0 = [];
  for (const p of start)
    flat0.push(p[0], p[1]);
  const expand = (x2) => {
    const all = flat0.slice();
    free2.forEach((k, j) => {
      all[k] = x2[j];
    });
    return Array.from({ length: n }, (_, i) => [all[2 * i], all[2 * i + 1]]);
  };
  const res = (x2) => rowsOf2(expand(x2), constraints, start, scale2);
  const sumsq = (f2) => f2.reduce((a, v) => a + v * v, 0);
  let x = free2.map((k) => flat0[k]);
  let f = res(x);
  let cost = sumsq(f);
  let it = 0;
  for (; it < maxIter && Math.sqrt(cost) > tol; it++) {
    const m = f.length, nn = x.length;
    const J = Array.from({ length: m }, () => new Array(nn).fill(0));
    for (let j = 0; j < nn; j++) {
      const h = 1e-6 * Math.max(1, Math.abs(x[j]));
      const xp = x.slice(), xm = x.slice();
      xp[j] += h;
      xm[j] -= h;
      const fp = res(xp), fm = res(xm);
      for (let i = 0; i < m; i++)
        J[i][j] = (fp[i] - fm[i]) / (2 * h);
    }
    const A = Array.from({ length: m }, () => new Array(m).fill(0));
    let tr = 0;
    for (let a = 0; a < m; a++)
      for (let b = 0; b < m; b++) {
        let v = 0;
        for (let k = 0; k < nn; k++)
          v += J[a][k] * J[b][k];
        A[a][b] = v;
        if (a === b)
          tr += v;
      }
    const rho = 1e-12 * Math.max(tr / Math.max(m, 1), 1e-30);
    for (let a = 0; a < m; a++)
      A[a][a] += rho;
    const y = solveLin(A, f.map((v) => -v));
    if (!y)
      break;
    const d = new Array(nn).fill(0);
    for (let k = 0; k < nn; k++)
      for (let a = 0; a < m; a++)
        d[k] += J[a][k] * y[a];
    let accepted = false;
    for (let alpha = 1; alpha > 1e-4; alpha /= 2) {
      const xn = x.map((v, i) => v + alpha * d[i]);
      const fn = res(xn);
      const cn = sumsq(fn);
      if (cn < cost) {
        x = xn;
        f = fn;
        cost = cn;
        accepted = true;
        break;
      }
    }
    if (!accepted)
      break;
  }
  return { points: expand(x), worst: Math.max(0, ...f.map(Math.abs)), iterations: it };
}
var signedArea2 = (p) => {
  let a = 0;
  for (let i = 0; i < p.length; i++) {
    const [x1, y1] = p[i], [x2, y2] = p[(i + 1) % p.length];
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
};
function isSimple(p) {
  const n = p.length;
  if (n < 3)
    return false;
  const d = diagOf2(p);
  const eps = 1e-9 * d * d;
  const o = (x, y, z) => cross7(sub6(y, x), sub6(z, x));
  const onSeg = (a, b, c) => Math.min(a[0], b[0]) - 1e-9 * d <= c[0] && c[0] <= Math.max(a[0], b[0]) + 1e-9 * d && Math.min(a[1], b[1]) - 1e-9 * d <= c[1] && c[1] <= Math.max(a[1], b[1]) + 1e-9 * d;
  const segInt = (a, b, c, e) => {
    const d1 = o(a, b, c), d2 = o(a, b, e), d3 = o(c, e, a), d4 = o(c, e, b);
    if (d1 * d2 < -eps * eps && d3 * d4 < -eps * eps)
      return true;
    if (Math.abs(d1) <= eps && Math.abs(d2) <= eps)
      return onSeg(a, b, c) || onSeg(a, b, e) || onSeg(c, e, a) || onSeg(c, e, b);
    return false;
  };
  for (let i = 0; i < n; i++) {
    const u = sub6(p[(i + 1) % n], p[i]), v = sub6(p[(i + 2) % n], p[(i + 1) % n]);
    const lu = Math.hypot(u[0], u[1]), lv = Math.hypot(v[0], v[1]);
    if (lu > 0 && lv > 0 && Math.abs(cross7(u, v)) / (lu * lv) < 1e-9 && u[0] * v[0] + u[1] * v[1] < 0)
      return false;
  }
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) {
      if (j === i + 1 || i === 0 && j === n - 1)
        continue;
      if (segInt(p[i], p[(i + 1) % n], p[j], p[(j + 1) % n]))
        return false;
    }
  return true;
}
function shapeProblem(p, drawn) {
  if (!p.every((q) => Number.isFinite(q[0]) && Number.isFinite(q[1])))
    return "blown-up";
  const d = diagOf2(drawn);
  const c = drawn.reduce((s, q) => [s[0] + q[0] / drawn.length, s[1] + q[1] / drawn.length], [0, 0]);
  if (!p.every((q) => Math.hypot(q[0] - c[0], q[1] - c[1]) <= 50 * d))
    return "blown-up";
  for (let i = 0; i < p.length; i++) {
    const e = sub6(p[(i + 1) % p.length], p[i]);
    if (Math.hypot(e[0], e[1]) < 1e-3 * d)
      return "squeezed";
  }
  const a = signedArea2(p), a0 = signedArea2(drawn);
  if (Math.abs(a) < 1e-4 * Math.abs(a0))
    return "squeezed";
  if (!isSimple(p))
    return "folded";
  if (Math.sign(a) !== Math.sign(a0))
    return "inside-out";
  return null;
}
var properShape = (p, drawn) => shapeProblem(p, drawn) === null;
var n1 = (v) => String(Math.round(v * 1e3) / 1e3);
function plainRule(c) {
  switch (c.kind) {
    case "horizontal":
      return `edge ${c.edge + 1} going straight across`;
    case "vertical":
      return `edge ${c.edge + 1} going straight up`;
    case "length":
      return `edge ${c.edge + 1} being ${n1(c.value)} long`;
    case "equal":
      return `edges ${c.edge + 1} and ${c.other + 1} being the same length`;
    case "parallel":
      return `edges ${c.edge + 1} and ${c.other + 1} being parallel`;
    case "perpendicular":
      return `edges ${c.edge + 1} and ${c.other + 1} meeting at a right angle`;
    case "distanceX":
      return `corner ${c.b + 1} being ${n1(c.value)} across from corner ${c.a + 1}`;
    case "distanceY":
      return `corner ${c.b + 1} being ${n1(c.value)} up from corner ${c.a + 1}`;
    case "symmetric":
      return `corner ${c.center + 1} sitting midway between corners ${c.a + 1} and ${c.b + 1}`;
    case "angle":
      return `the ${n1(c.degrees)} degree turn from edge ${c.edge + 1} to edge ${c.other + 1}`;
    case "lock":
      return `corner ${c.corner + 1} staying pinned`;
    default:
      return `a ${c.kind} rule`;
  }
}
var listOf = (a, total2 = a.length) => total2 > a.length ? `${a.join(", ")} and ${total2 - a.length} more` : a.length === 1 ? a[0] : `${a.slice(0, -1).join(", ")} and ${a.at(-1)}`;
var refuseSentence = (c) => `The rule for ${plainRule(c)} cannot hold together with the other rules on this sketch, so the part is not built; remove or change one of the rules.`;
var refuseSentenceWith = (c, others) => others.length === 0 ? refuseSentence(c) : `The rule for ${plainRule(c)} cannot hold together with the rule${others.length > 1 ? "s" : ""} for ${listOf(others.slice(0, 3).map(plainRule), others.length)}, so the part is not built; remove or change one of them.`;
var refuseShapeSentence = (c, problem = "folded") => `The rules, with ${plainRule(c)}, would ${problem === "inside-out" ? "turn the sketch inside out" : problem === "squeezed" ? "squeeze the sketch flat" : "fold the sketch over itself"}, so the part is not built; remove or change one of the rules.`;
var same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
var isPair = (c) => c.kind === "equal" || c.kind === "parallel" || c.kind === "perpendicular";
function intendedRules(logForSketch, initial) {
  let cur = initial.map((c) => ({ ...c }));
  for (const e of logForSketch) {
    const added = e.added;
    let base = cur;
    if (cur.some((c) => same(c, added)))
      continue;
    if (added.kind === "horizontal" || added.kind === "vertical") {
      const opp = added.kind === "horizontal" ? "vertical" : "horizontal";
      base = base.filter((c) => !(c.kind === opp && "edge" in c && c.edge === added.edge));
    } else if (isPair(added))
      base = base.filter((c) => !(isPair(c) && c.edge === added.edge && c.other === added.other));
    cur = [...base, { ...added }];
  }
  return cur;
}
var mulberry = (a) => () => {
  a |= 0;
  a = a + 1831565813 | 0;
  let t = Math.imul(a ^ a >>> 15, 1 | a);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
};
var TOL = 1e-9;
var moved = (p, q) => p.reduce((s, a, i) => s + (a[0] - q[i][0]) ** 2 + (a[1] - q[i][1]) ** 2, 0);
function solveIntended(S, drawn, rules, { jitters = 40, phases = ["touched-only", "all-free"] } = {}) {
  const tryFrom = (start) => {
    const r2 = S.solveSketch(start, rules);
    const q = polish(r2.points, rules);
    const chk = checkAll(q.points, rules, drawn, TOL);
    return { points: q.points, chk };
  };
  const d = diagOf2(drawn);
  const n = drawn.length;
  const wrap = (i) => (i % n + n) % n;
  const locked = new Set(rules.filter((c) => c.kind === "lock").map((c) => wrap(c.corner)));
  const touched = /* @__PURE__ */ new Set();
  for (const c of rules) {
    for (const e of [c.edge, c.other])
      if (e !== void 0) {
        touched.add(wrap(e));
        touched.add(wrap(e + 1));
      }
    for (const k of [c.a, c.b, c.center, c.corner])
      if (k !== void 0)
        touched.add(wrap(k));
  }
  let best = null;
  for (const phase of phases) {
    const rnd = mulberry(24301);
    const seeds = phase === "touched-only" ? [S.seedForNewRule(drawn, rules), drawn] : [];
    for (let k = 0; k < jitters * (phase === "touched-only" ? 1 : 2); k++) {
      const amp = (k % 3 === 0 ? 0.1 : k % 3 === 1 ? 0.3 : 0.5) * d;
      seeds.push(drawn.map((p, i) => locked.has(i) || phase === "touched-only" && !touched.has(i) ? [p[0], p[1]] : [p[0] + (rnd() - 0.5) * amp, p[1] + (rnd() - 0.5) * amp]));
    }
    const cands = [];
    for (const s of seeds) {
      let res;
      try {
        res = tryFrom(s);
      } catch {
        continue;
      }
      if (res.chk.ok && properShape(res.points, drawn)) {
        cands.push(res);
        if (cands.length >= 3 || cands.length === 1 && s === seeds[0])
          break;
      }
      if (!best || Math.abs(res.chk.worst.residual) < Math.abs(best.chk.worst.residual))
        best = res;
    }
    if (cands.length) {
      cands.sort((a, b) => moved(a.points, drawn) - moved(b.points, drawn));
      return { points: cands[0].points, phase };
    }
  }
  const r = best ? best.chk.residuals : [];
  const mx = Math.max(0, ...r.map(Math.abs));
  let idx = -1;
  r.forEach((v, i) => {
    if (Math.abs(v) >= 0.5 * mx && Math.abs(v) > TOL)
      idx = i;
  });
  const problem = best ? shapeProblem(best.points, drawn) : null;
  const ri = idx < 0 ? rules.length - 1 : idx;
  return { fail: { ruleIndex: ri, rule: rules[ri], residual: mx, folded: best ? problem !== null && mx <= TOL : false, problem } };
}
function blame(S, drawn, rules, idx) {
  const out = [];
  for (let j = 0; j < rules.length; j++) {
    if (j === idx)
      continue;
    const rest = rules.filter((_, k) => k !== j);
    const sol = solveIntended(S, drawn, rest, { jitters: 6, phases: ["touched-only"] });
    if ("points" in sol)
      out.push(j);
  }
  return out;
}
function guardLegacySketches(rawDoc, solvedDoc, ruleLog, S) {
  const doc = JSON.parse(JSON.stringify(solvedDoc));
  const report = [];
  for (const f of doc.features) {
    if (f.kind !== "sketch" || !f.points)
      continue;
    const log = (ruleLog ?? []).filter((e) => e && e.sketchId === f.id);
    if (!f.constraints?.length && !log.length)
      continue;
    const f0 = rawDoc.features.find((x) => x.id === f.id);
    const initial = log.length ? log[0].existing : f0.constraints ?? [];
    const intended = log.length ? intendedRules(log, initial) : f0.constraints ?? [];
    const drawn = f0.points.map((p) => [p[0], p[1]]);
    const dropped = log.filter((e) => e.removed || e.removedAlso).flatMap((e) => [e.removed, e.removedAlso].filter(Boolean));
    const droppedInFinal = dropped.filter((c) => intended.some((i) => same(i, c)));
    const entry = { sketch: f.id, written: intended.length, droppedByPipeline: droppedInFinal.map(plainRule), tsPipelineHolds: false, route: null };
    const ts = f.points.map((p) => [p[0], p[1]]);
    let chosen = null;
    {
      const q = polish(ts, intended);
      const c2 = checkAll(q.points, intended, drawn, TOL);
      if (c2.ok && properShape(q.points, drawn)) {
        chosen = q.points;
        entry.tsPipelineHolds = checkAll(ts, intended, drawn, 1e-6).ok;
        entry.route = entry.tsPipelineHolds ? "ts-answer-polished" : "repaired-by-polish";
      }
    }
    if (!chosen) {
      const sol = solveIntended(S, drawn, intended);
      if ("points" in sol) {
        chosen = sol.points;
        entry.route = "resolved-by-guard:" + sol.phase;
      } else {
        entry.route = "refused";
        entry.failRule = sol.fail.rule;
        const bl = sol.fail.folded ? [] : blame(S, drawn, intended, sol.fail.ruleIndex);
        entry.blamed = bl.map((j) => plainRule(intended[j]));
        entry.sentence = sol.fail.folded ? refuseShapeSentence(sol.fail.rule, sol.fail.problem) : refuseSentenceWith(sol.fail.rule, bl.map((j) => intended[j]));
        entry.residual = sol.fail.residual;
        report.push(entry);
        return { outcome: "refused", sentence: entry.sentence, sketches: report };
      }
    }
    f.points = chosen;
    f.constraints = intended;
    report.push(entry);
  }
  return { outcome: "built-ready", doc, sketches: report };
}

// src/soup-solve.mjs
var sub7 = (a, b) => [a[0] - b[0], a[1] - b[1]];
var cross8 = (a, b) => a[0] * b[1] - a[1] * b[0];
var dot9 = (a, b) => a[0] * b[0] + a[1] * b[1];
var len7 = (a) => Math.hypot(a[0], a[1]);
function layout(geoms) {
  const slot = /* @__PURE__ */ new Map();
  let n = 0;
  const x = [];
  const push = (...v) => {
    x.push(...v);
    n += v.length;
  };
  for (const g of geoms) {
    slot.set(g.id, { g, off: n });
    if (g.k === "point") push(g.p[0], g.p[1]);
    else if (g.k === "line") push(g.a[0], g.a[1], g.b[0], g.b[1]);
    else if (g.k === "circle") push(g.c[0], g.c[1], g.r);
    else if (g.k === "arc") push(g.c[0], g.c[1], g.r ?? Math.hypot(g.a[0] - g.c[0], g.a[1] - g.c[1]), g.a[0], g.a[1], g.b[0], g.b[1]);
  }
  return { slot, x, n };
}
function view2(slot, x) {
  const get = (id) => {
    const s = slot.get(id);
    if (!s) return null;
    const o = s.off;
    const g = s.g;
    if (g.k === "point") return { k: "point", p: [x[o], x[o + 1]] };
    if (g.k === "line") return { k: "line", a: [x[o], x[o + 1]], b: [x[o + 2], x[o + 3]] };
    if (g.k === "circle") return { k: "circle", c: [x[o], x[o + 1]], r: x[o + 2] };
    return { k: "arc", c: [x[o], x[o + 1]], r: x[o + 2], a: [x[o + 3], x[o + 4]], b: [x[o + 5], x[o + 6]] };
  };
  return get;
}
var pointOf2 = (g, end, lock = false) => {
  if (!g) return null;
  if (g.k === "point") return g.p;
  if (g.k === "line") return end === "b" ? g.b : g.a;
  if (g.k === "circle") return g.c;
  return end === "c" ? g.c : end === "b" ? g.b : lock ? g.c : g.a;
};
var lenOf = (g) => g.k === "line" ? len7(sub7(g.b, g.a)) : g.r;
function residuals(geoms, rules, slot, x, start, sides) {
  const get = view2(slot, x);
  const out = [];
  const P = (id, end, lock) => id === -1 ? [0, 0] : pointOf2(get(id), end, lock);
  for (const g of geoms) if (g.k === "arc") {
    const a = get(g.id);
    out.push(len7(sub7(a.a, a.c)) - a.r, len7(sub7(a.b, a.c)) - a.r);
  }
  rules.forEach((r, i) => {
    if (r.active === false || r.driving === false) return;
    const ga = r.a >= 0 ? get(r.a) : null;
    const gb = r.b >= 0 ? get(r.b) : null;
    switch (r.k) {
      case "coincident": {
        const d = sub7(P(r.a, r.aEnd), P(r.b, r.bEnd));
        out.push(d[0], d[1]);
        break;
      }
      case "pointOnObject": {
        const p = P(r.a, r.aEnd);
        if (r.b === -2) out.push(p[1]);
        else if (r.b === -3) out.push(p[0]);
        else if (gb.k === "line") out.push(cross8(sub7(gb.b, gb.a), sub7(p, gb.a)) / Math.max(len7(sub7(gb.b, gb.a)), 1e-12));
        else out.push(len7(sub7(p, gb.c)) - gb.r);
        break;
      }
      case "horizontal":
        out.push(ga.a[1] - ga.b[1]);
        break;
      case "vertical":
        out.push(ga.a[0] - ga.b[0]);
        break;
      case "parallel":
      case "perpendicular": {
        const da = r.a < 0 ? r.a === -2 ? [1, 0] : [0, 1] : sub7(ga.b, ga.a);
        const db = r.b < 0 ? r.b === -2 ? [1, 0] : [0, 1] : sub7(gb.b, gb.a);
        const s = Math.max(len7(da) * len7(db), 1e-12);
        out.push((r.k === "parallel" ? cross8(da, db) : dot9(da, db)) / s);
        break;
      }
      case "equal":
        out.push(lenOf(ga) - lenOf(gb));
        break;
      case "tangent": {
        const round = (g) => g.k === "circle" || g.k === "arc";
        if (r.aEnd !== void 0 && r.bEnd !== void 0 && ga.k !== "circle" && gb.k !== "circle") {
          const Pt = pointOf2(ga, r.aEnd);
          if (ga.k === "line" || gb.k === "line") {
            const L = ga.k === "line" ? ga : gb;
            const C = ga.k === "line" ? gb : ga;
            const d = sub7(L.b, L.a);
            out.push(dot9(sub7(Pt, C.c), d) / Math.max(len7(d), 1e-12));
          } else {
            const u = sub7(Pt, ga.c);
            const v = sub7(Pt, gb.c);
            out.push(cross8(u, v) / Math.max(len7(u) + len7(v), 1e-12));
          }
          break;
        }
        if (round(ga) && round(gb)) {
          const d = len7(sub7(ga.c, gb.c));
          out.push(sides[i] === "internal" ? d - Math.abs(ga.r - gb.r) : d - (ga.r + gb.r));
        } else {
          const L = ga.k === "line" ? ga : gb;
          const C = ga.k === "line" ? gb : ga;
          const sd = cross8(sub7(L.b, L.a), sub7(C.c, L.a)) / Math.max(len7(sub7(L.b, L.a)), 1e-12);
          out.push((sides[i] ?? 1) * sd - C.r);
        }
        break;
      }
      case "symmetric": {
        const a = P(r.a, r.aEnd);
        const b = P(r.b, r.bEnd);
        if (r.cEnd !== void 0) {
          const c = P(r.c, r.cEnd);
          out.push((a[0] + b[0]) / 2 - c[0], (a[1] + b[1]) / 2 - c[1]);
        } else {
          const L = r.c === -2 ? { a: [0, 0], b: [1, 0] } : r.c === -3 ? { a: [0, 0], b: [0, 1] } : get(r.c);
          const d = sub7(L.b, L.a);
          const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
          const ld = Math.max(len7(d), 1e-12);
          out.push(cross8(d, sub7(m, L.a)) / ld, dot9(d, sub7(b, a)) / ld);
        }
        break;
      }
      case "distance":
        out.push(len7(sub7(P(r.a, r.aEnd), P(r.b, r.bEnd))) - r.value);
        break;
      case "distanceX":
        out.push(P(r.b, r.bEnd)[0] - P(r.a, r.aEnd)[0] - r.value);
        break;
      case "distanceY":
        out.push(P(r.b, r.bEnd)[1] - P(r.a, r.aEnd)[1] - r.value);
        break;
      case "radius":
        out.push(ga.r - r.value);
        break;
      case "diameter":
        out.push(2 * ga.r - r.value);
        break;
      case "angle": {
        const da = sub7(ga.b, ga.a);
        const db = sub7(gb.b, gb.a);
        const ang = Math.atan2(cross8(da, db), dot9(da, db)) * 180 / Math.PI;
        let d = (ang - r.value) % 180;
        if (d > 90) d -= 180;
        if (d < -90) d += 180;
        out.push(d * (Math.PI / 180) * Math.max(len7(da), len7(db), 1));
        break;
      }
      case "lock": {
        const s = start.get(r.a);
        if (!s) break;
        const a = pointOf2(get(r.a), r.aEnd, true);
        const b = pointOf2(s, r.aEnd, true);
        out.push(a[0] - b[0], a[1] - b[1]);
        break;
      }
      default:
        break;
    }
  });
  return out;
}
function sidesOf(geoms, rules, slot, x) {
  const get = view2(slot, x);
  const sides = {};
  rules.forEach((r, i) => {
    if (r.k !== "tangent" || r.aEnd !== void 0 && r.bEnd !== void 0) return;
    const ga = get(r.a);
    const gb = get(r.b);
    const round = (g) => g.k === "circle" || g.k === "arc";
    if (round(ga) && round(gb)) {
      const d = len7(sub7(ga.c, gb.c));
      sides[i] = Math.abs(d - Math.abs(ga.r - gb.r)) < Math.abs(d - (ga.r + gb.r)) ? "internal" : "external";
    } else {
      const L = ga.k === "line" ? ga : gb;
      const C = ga.k === "line" ? gb : ga;
      sides[i] = cross8(sub7(L.b, L.a), sub7(C.c, L.a)) >= 0 ? 1 : -1;
    }
  });
  return sides;
}
function jacobian(f, x, h) {
  const r0 = f(x);
  const m = r0.length;
  const n = x.length;
  const J = Array.from({ length: m }, () => new Array(n).fill(0));
  for (let j = 0; j < n; j++) {
    const xp = x.slice();
    const xm = x.slice();
    const hj = h * Math.max(1, Math.abs(x[j]));
    xp[j] += hj;
    xm[j] -= hj;
    const rp = f(xp);
    const rm = f(xm);
    for (let i = 0; i < m; i++) J[i][j] = (rp[i] - rm[i]) / (2 * hj);
  }
  return { r0, J };
}
function solveLinear2(A, b) {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-300) return null;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = c + 1; r < n; r++) {
      const k = M[r][c] / M[c][c];
      for (let q = c; q <= n; q++) M[r][q] -= k * M[c][q];
    }
  }
  const x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = M[r][n];
    for (let q = r + 1; q < n; q++) s -= M[r][q] * x[q];
    x[r] = s / M[r][r];
  }
  return x;
}
function singularValues(J) {
  const m = J.length;
  const n = J[0]?.length ?? 0;
  if (!m || !n) return [];
  const U = Array.from({ length: n }, (_, j) => J.map((row) => row[j]));
  for (let sweep = 0; sweep < 60; sweep++) {
    let off = 0;
    for (let p = 0; p < n - 1; p++) for (let q = p + 1; q < n; q++) {
      let a = 0, b = 0, c = 0;
      for (let i = 0; i < m; i++) {
        a += U[p][i] * U[p][i];
        b += U[q][i] * U[q][i];
        c += U[p][i] * U[q][i];
      }
      if (Math.abs(c) < 1e-15 * Math.sqrt(a * b) || c === 0) continue;
      off = Math.max(off, Math.abs(c) / Math.sqrt(a * b));
      const zeta = (b - a) / (2 * c);
      const t = Math.sign(zeta || 1) / (Math.abs(zeta) + Math.sqrt(1 + zeta * zeta));
      const cs = 1 / Math.sqrt(1 + t * t);
      const sn = cs * t;
      for (let i = 0; i < m; i++) {
        const up2 = U[p][i];
        const uq = U[q][i];
        U[p][i] = cs * up2 - sn * uq;
        U[q][i] = sn * up2 + cs * uq;
      }
    }
    if (off < 1e-14) break;
  }
  return U.map((col) => Math.sqrt(col.reduce((s, v) => s + v * v, 0))).sort((a, b) => b - a);
}
function solveSoup(soup, opts = {}) {
  const geoms = soup.geoms;
  const rules = (soup.rules ?? []).filter((r2) => r2.active !== false);
  const { slot, x: x0, n } = layout(geoms);
  const start = new Map(geoms.map((g) => [g.id, g]));
  const sides = sidesOf(geoms, rules, slot, x0);
  const known = /* @__PURE__ */ new Set(["coincident", "pointOnObject", "horizontal", "vertical", "parallel", "perpendicular", "equal", "tangent", "symmetric", "distance", "distanceX", "distanceY", "radius", "diameter", "angle", "lock"]);
  const bad2 = rules.find((r2) => !known.has(r2.k));
  if (bad2) return { unsupported: `rule kind ${bad2.k}`, solved: geoms, residual: null, moved: null, dof: null };
  const scale2 = Math.max(1, ...x0.map(Math.abs));
  const f = (x2) => residuals(geoms, rules, slot, x2, start, sides);
  const norm3 = (r2) => Math.max(0, ...r2.map(Math.abs));
  let x = x0.slice();
  let r = f(x);
  const residual = norm3(r);
  const h = 1e-7;
  let lambda = 1e-3;
  let converged = norm3(r) < 1e-11;
  for (let it = 0; it < (opts.iterations ?? 200) && !converged; it++) {
    const { r0, J: J2 } = jacobian(f, x, h);
    const cost0 = r0.reduce((s, v) => s + v * v, 0);
    const JtJ = Array.from({ length: n }, () => new Array(n).fill(0));
    const Jtr = new Array(n).fill(0);
    for (let i = 0; i < J2.length; i++) for (let a = 0; a < n; a++) {
      if (J2[i][a] === 0) continue;
      Jtr[a] += J2[i][a] * r0[i];
      for (let b = 0; b < n; b++) JtJ[a][b] += J2[i][a] * J2[i][b];
    }
    let improved = false;
    for (let tries = 0; tries < 12; tries++) {
      const A = JtJ.map((row, i) => row.map((v, j) => v + (i === j ? lambda * (1 + v) : 0)));
      const d = solveLinear2(A, Jtr.map((v) => -v));
      if (!d) {
        lambda *= 10;
        continue;
      }
      const xn = x.map((v, i) => v + d[i]);
      const rn = f(xn);
      const cost = rn.reduce((s, v) => s + v * v, 0);
      if (Number.isFinite(cost) && cost < cost0) {
        x = xn;
        r = rn;
        lambda = Math.max(lambda / 5, 1e-12);
        improved = true;
        break;
      }
      lambda *= 10;
    }
    if (norm3(r) < 1e-11) converged = true;
    if (!improved) break;
  }
  const residualAfter = norm3(r);
  const { J } = jacobian(f, x, h);
  const sv = singularValues(J);
  const top = sv[0] ?? 0;
  const rank = sv.filter((s) => s > 1e-6 * Math.max(top, 1)).length;
  const get = view2(slot, x);
  const solved = geoms.map((g) => {
    const v = get(g.id);
    if (g.k === "point") return { ...g, p: v.p };
    if (g.k === "line") return { ...g, a: v.a, b: v.b };
    if (g.k === "circle") return { ...g, c: v.c, r: v.r };
    return { ...g, c: v.c, r: v.r, a: v.a, b: v.b };
  });
  let moved2 = 0;
  for (let i = 0; i < n; i++) moved2 = Math.max(moved2, Math.abs(x[i] - x0[i]));
  const parent = new Map(geoms.map((g) => [g.id, g.id]));
  const find = (i) => {
    while (parent.get(i) !== i) {
      parent.set(i, parent.get(parent.get(i)));
      i = parent.get(i);
    }
    return i;
  };
  for (const r2 of rules) {
    const ids = [r2.a, r2.b, r2.c].filter((q) => typeof q === "number" && q >= 0 && parent.has(q));
    for (let k = 1; k < ids.length; k++) parent.set(find(ids[k]), find(ids[0]));
  }
  const comps = /* @__PURE__ */ new Map();
  for (const g of geoms) {
    const s = slot.get(g.id);
    const w = g.k === "point" ? 2 : g.k === "line" ? 4 : g.k === "circle" ? 3 : 7;
    const root = find(g.id);
    const c = comps.get(root) ?? { ids: [], cols: [], moved: 0 };
    c.ids.push(g.id);
    for (let q = 0; q < w; q++) {
      c.cols.push(s.off + q);
      c.moved = Math.max(c.moved, Math.abs(x[s.off + q] - x0[s.off + q]));
    }
    comps.set(root, c);
  }
  let dofMoved = 0;
  const movedComps = [];
  for (const c of comps.values()) {
    const sub8 = J.map((row) => c.cols.map((j) => row[j]));
    const rk = singularValues(sub8).filter((s) => s > 1e-6 * Math.max(top, 1)).length;
    c.dof = c.cols.length - rk;
    if (c.moved > 1e-6) {
      dofMoved += c.dof;
      movedComps.push({ ids: c.ids, moved: c.moved, dof: c.dof });
    }
  }
  return { solved, residual, residualAfter, moved: moved2, rank, dof: n - rank, dofMoved, movedComps, params: n, converged: converged || residualAfter < 1e-9, scale: scale2 };
}

// src/host-guards.mjs
var fmt6 = (v) => Number.isFinite(v) ? String(Number(v.toPrecision(6))) : String(v);
function oneSentence(text) {
  let s = String(text ?? "").replace(/\s+/g, " ").trim();
  if (!s) return s;
  const keep = [];
  s = s.replace(/(\d\.\d)|(\b(?:e\.g|i\.e|etc)\.)/gi, (m) => {
    keep.push(m);
    return `${keep.length - 1}`;
  });
  s = s.replace(/([.!?])\s+(?=[A-Z"'(\[]|\.[a-z])/g, (m, p, off, str) => {
    const rest = str.slice(off + m.length);
    const first = /^[A-Z][a-z]*\b/.exec(rest);
    return "; " + (first && /^(?:[A-Z]|[A-Z][a-z]+)\b/.test(rest) && !/^[A-Z]{2,}/.test(rest) ? "" : "");
  });
  s = s.replace(/;\s\u0003([A-Z])/g, (m, c) => "; " + c.toLowerCase());
  s = s.replace(/\u0003/g, "");
  s = s.replace(/\u0001(\d+)\u0002/g, (m, i) => keep[Number(i)]);
  s = s.replace(/;\s*([.!?])(?=\s|$)/g, "$1");
  if (!/[.!?]$/.test(s)) s += ".";
  return s;
}
var verdict = (code, sentence) => ({ code, sentence: oneSentence(sentence) });
var isSoup3 = (sk) => sk.shape !== "circle" && Array.isArray(sk.geoms) && sk.geoms.length > 0;
var RULE_TOL = 1e-6;
function solveVerdict(S) {
  if (!S || S.unsupported || S.residual == null) return null;
  if (!(S.residual > RULE_TOL)) return null;
  if (!S.converged) return verdict("rules-conflict", `The rules of this sketch cannot all be met at once (the closest the shape can get still misses a rule by ${fmt6(+S.residualAfter.toPrecision(2))} mm); remove or loosen one of them.`);
  if (S.dofMoved > 0) return verdict("rules-underdetermined", `The rules of this sketch have to move its shape (by up to ${fmt6(+S.moved.toPrecision(2))} mm) but leave ${S.dofMoved} way${S.dofMoved === 1 ? "" : "s"} for it to slide, turn or change size, so where it ends up depends on the solver of the 3D build; pin it down with more rules (a lock on a point, a dimension on each free edge) or draw it at the size the rules give.`);
  return null;
}
function soupSolve(sk) {
  try {
    return solveSoup({ geoms: JSON.parse(JSON.stringify(sk.geoms)), rules: JSON.parse(JSON.stringify(sk.rules ?? [])) });
  } catch (e) {
    return { unsupported: `solve failed: ${e.message}`, solved: sk.geoms, residual: null, moved: null, dof: null };
  }
}
function soupSolveVerdict(sk) {
  if (!sk || sk.kind !== "sketch" || !isSoup3(sk)) return null;
  return solveVerdict(soupSolve(sk));
}
var labelOf2 = (f) => f.kind === "fillet" ? f.style === "chamfer" ? "bevel" : "round" : f.kind === "shell" ? "hollow" : f.kind;
function staleConsumers(doc) {
  const out = /* @__PURE__ */ new Map();
  const cutBy = /* @__PURE__ */ new Map();
  for (const f of doc.features) {
    if ((f.kind === "pocket" || f.kind === "groove") && f.into) cutBy.set(f.into, f.id);
    else if (["fillet", "shell", "draft"].includes(f.kind) && cutBy.has(f.target)) out.set(f.id, { target: f.target, cut: cutBy.get(f.target) });
  }
  return out;
}
var staleSentence = (f, st) => `${f.id} is not built: ${st.target} was already cut by ${st.cut}, so this ${labelOf2(f)} would not include the cut -- keep the result of the cut under a name (for example part = pocket(...)) and pick on that instead.`;
var SG13_GUARD = { "rules-conflict": "SG-RULES-CONFLICT", "rules-underdetermined": "SG-RULES-UNDERDETERMINED" };
var STALE_GUARD = "G-STALE";
var PREFLIGHT_DEP_GUARD = "HOST-PREFLIGHT-DEP";
var usesSentence = (id, sketch) => `${id}: it uses ${sketch}, which could not be built; fix ${sketch} first.`;
var SKIP_KEYS = /* @__PURE__ */ new Set(["id", "kind", "name"]);
function refsOf(f) {
  const out = /* @__PURE__ */ new Set();
  const walk = (v) => {
    if (typeof v === "string") out.add(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  for (const [k, v] of Object.entries(f)) if (!SKIP_KEYS.has(k)) walk(v);
  return out;
}
function hostPreflight(doc, roots = null) {
  const out = /* @__PURE__ */ new Map();
  const stale = staleConsumers(doc);
  const kindOf = new Map(doc.features.map((f) => [f.id, f.kind]));
  for (const f of doc.features) {
    const dead = [...refsOf(f)].find((r) => out.has(r) && r !== f.id);
    if (f.kind === "sketch") {
      const v = soupSolveVerdict(f);
      if (v && (!roots || roots.has(f.id))) out.set(f.id, { refusal: v.sentence, guard: SG13_GUARD[v.code], root: f.id, from: "sg" });
      continue;
    }
    if (dead) {
      const d = out.get(dead);
      if (d.from === "sg" && kindOf.get(dead) === "sketch") out.set(f.id, { refusal: usesSentence(f.id, dead), guard: d.guard, root: d.root, from: "sg", subject: true });
      else if (d.from === "sg") out.set(f.id, { refusal: `${f.id} was not built because ${dead} was refused: ${d.refusal}`, guard: PREFLIGHT_DEP_GUARD, root: d.root, from: "sg" });
      else out.set(f.id, { refusal: `${f.id} is not built because ${dead} could not be built, so ${f.id} is shown without it.`, guard: PREFLIGHT_DEP_GUARD, root: d.root, from: "stale" });
      continue;
    }
    const st = stale.get(f.id);
    if (st && (!roots || roots.has(f.id))) out.set(f.id, { refusal: staleSentence(f, st), guard: STALE_GUARD, root: f.id, from: "stale", subject: true });
  }
  return out;
}

// src/sketch-check.mjs
var RULE_OK = 1e-6;
var num3 = (v) => String(+(+v).toFixed(4));
var WORDS = {
  coincident: "a join",
  horizontal: "a horizontal rule",
  vertical: "a vertical rule",
  parallel: "a parallel rule",
  perpendicular: "a perpendicular rule",
  equal: "an equal rule",
  tangent: "a tangent rule",
  midpoint: "a midpoint rule",
  symmetric: "a symmetric rule",
  pointOnObject: "a point-on rule",
  lock: "a fixed point"
};
function ruleWords(r) {
  if (!r || typeof r.k !== "string") return null;
  const v = Number.isFinite(+r.value) ? num3(r.value) : null;
  if (r.k === "distance" && v !== null) return r.a === r.b ? `a length of ${v}` : `a distance of ${v}`;
  if (r.k === "distanceX" && v !== null) return `a sideways distance (dx) of ${v}`;
  if (r.k === "distanceY" && v !== null) return `an up distance (dy) of ${v}`;
  if (r.k === "radius" && v !== null) return `a radius of ${v}`;
  if (r.k === "diameter" && v !== null) return `a diameter of ${v}`;
  if (r.k === "angle" && v !== null) return `an angle of ${v}`;
  return WORDS[r.k] ?? null;
}
var stable = (v) => JSON.stringify(v, (_k, x) => x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, x[k]])) : x);
function refusedRule(feature, soups) {
  const fl = feature?.failed;
  const cmds = feature?.commands;
  if (!fl || typeof fl.command !== "string" || !fl.command.startsWith("sketch.") || !Array.isArray(cmds)) return null;
  const err = String(fl.error ?? "");
  const kind = /over-constrain/.test(err) ? "clash" : /already determined/.test(err) ? "repeat" : "other";
  const want = stable(fl.params ?? {});
  let found = null;
  cmds.forEach((c, s) => {
    const meta = c?.command === "sketch.create" ? soups?.[c.params?.name] : null;
    if (!meta) return;
    const hits = [];
    (meta.ruleMap ?? []).forEach((js, i) => {
      for (const j of js ?? []) {
        const x = cmds[s + j];
        if (x && x.command === fl.command && stable(x.params ?? {}) === want) hits.push(i);
      }
    });
    if (hits.length) found = { sketchId: meta.sketchId, kind, rule: meta.rules?.[hits[Math.min(1, hits.length - 1)]] ?? null };
    else if (!found) found = { sketchId: meta.sketchId, kind, rule: null };
  });
  return found;
}
var ways = (n) => `${n} way${n === 1 ? "" : "s"}`;
var cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
function sketchCheck({ id, feature, users = [], refused = null, accepted = [], own = null }) {
  const row = (state, cls, result, text) => ({ id, state, cls, result, text });
  if (feature?.status === "refused") {
    return feature.guard === "SG-RULES-UNDERDETERMINED" ? row("free-moved", "refused", "not built", `It is not fully defined, and its rules have to move it. See ${id} under Steps.`) : row("not-built", "refused", "not built", `See ${id} under Steps.`);
  }
  if (refused && refused.kind !== "other") {
    const w = ruleWords(refused.rule);
    return refused.kind === "clash" ? row("clash", "refused", "rules clash", `${w ? cap(w) : "One of its rules"} cannot hold together with the rules before it; remove or change one of them.`) : row("repeat", "refused", "rule repeated", `${w ? cap(w) : "One of its rules"} is already fixed by the rules before it; remove it.`);
  }
  if (accepted.length) {
    const ownDof = own && !own.unsupported && Number.isInteger(own.dof) ? own.dof : null;
    const agree = ownDof !== null && accepted.every((a) => a.status === "solved" && a.dof === ownDof && !(a.worstRes > RULE_OK));
    if (!agree) return row("unconfirmed", "note", "not confirmed", "It was built, but this check could not confirm whether it is fully defined.");
    return ownDof === 0 ? row("defined", "built", "fully defined", "Its rules fix every size and position.") : row("free", "note", "not fully defined", `It can still slide, turn or change size in ${ways(ownDof)}. It was built as you drew it; add rules or dimensions to pin it down.`);
  }
  if (!users.length) return row("unused", "mut", "not checked", "No step uses it yet.");
  return row("not-checked", "mut", "not checked", "The step that uses it was not built. See Steps.");
}

// src/placement.mjs
var num4 = (v) => String(+(+v).toFixed(4));
var at = (c) => `[${c.map(num4).join(", ")}]`;
var placedMap = (placed) => new Map((Array.isArray(placed) ? placed : []).filter((p) => p && typeof p.id === "string" && (typeof p.beside === "string" || p.beside === null && typeof p.unmeasured === "string")).map((p) => [p.id, typeof p.beside === "string" ? p.beside : { origin: p.unmeasured }]));
function shapeNote(f, placed, isBuilt = () => true) {
  const beside = placed.get(f?.id);
  if (!beside || !Array.isArray(f.center)) return null;
  if (typeof beside !== "string") return `no at: given, so it is at the origin ${at(f.center)}${isBuilt(beside.origin) ? `; it may overlap ${beside.origin}` : ""}`;
  return `no at: given, so it was placed beside ${beside}; its centre is at ${at(f.center)}`;
}
var CHANGES2 = /* @__PURE__ */ new Set(["hole", "fillet", "shell", "draft", "move", "rotate"]);
function startOf(id, byId) {
  let cur = id;
  const seen = /* @__PURE__ */ new Set();
  while (cur && !seen.has(cur)) {
    seen.add(cur);
    const f = byId.get(cur);
    if (!f) return id;
    const next = CHANGES2.has(f.kind) && !(f.kind === "move" && f.copy) ? f.target : f.kind === "pocket" || f.kind === "groove" ? f.into : void 0;
    if (typeof next !== "string") return cur;
    cur = next;
  }
  return id;
}
var MISSED = {
  pocket: /does not touch the part, so it cuts nothing/,
  combine: /^The two shapes do not overlap, so keeping their overlap leaves nothing\.?$/,
  groove: /the ring does not cut the part \(it misses it, or turns away from it\), so there is nothing to remove\.?$/
};
function placementHint(r, doc, placed) {
  if (!r || r.status !== "refused" || typeof r.refusal !== "string" || !placed.size) return null;
  const byId = new Map(doc.features.map((f2) => [f2.id, f2]));
  const f = byId.get(r.id);
  if (!f) return null;
  const re = MISSED[f.kind];
  if (!re || !re.test(r.refusal)) return null;
  if (f.kind === "combine" && f.op !== "intersect") return null;
  const parts = (f.kind === "combine" ? f.targets ?? [] : [f.into]).filter((x) => typeof x === "string").map((x) => startOf(x, byId));
  const hit = parts.filter((p) => typeof placed.get(p) === "string" && Array.isArray(byId.get(p)?.center)).sort((a, b) => doc.features.findIndex((x) => x.id === b) - doc.features.findIndex((x) => x.id === a))[0];
  if (!hit) return null;
  return `${r.refusal.replace(/\.\s*$/, "")} (${hit} has no at:, so it was placed beside ${placed.get(hit)} with its centre at ${at(byId.get(hit).center)}).`;
}
function spinNote(f, doc) {
  if (!f || f.kind !== "revolve") return null;
  const sk = doc.features.find((x) => x.id === f.target);
  if (!sk || sk.kind !== "sketch" || sk.frame || sk.onDatum) return null;
  const way = sk.plane === "xz" ? "front to back (y)" : sk.plane === "yz" ? "left to right (x)" : null;
  return way ? `its axis runs ${way}; for a part that stands upright, draw the profile on sketch('top')` : null;
}
var apart = (a, b) => [0, 1, 2].some((i) => a[i] - b[i + 3] > 1e-6 || b[i] - a[i + 3] > 1e-6);
function joinApartNote(r, doc, results, finBodies) {
  const byId = new Map(doc.features.map((f2) => [f2.id, f2]));
  const res = new Map(results.map((x) => [x.id, x]));
  const f = byId.get(r?.id);
  if (!f || f.kind !== "combine" || f.op !== "union" || r.status !== "built" || !Array.isArray(f.targets) || f.targets.length !== 2 || !r.measure) return null;
  const [a, b] = f.targets.map((t) => res.get(t)?.measure);
  if (!a?.bbox || !b?.bbox || !apart(a.bbox, b.bbox) || r.measure.faces !== a.faces + b.faces) return null;
  const later = doc.features.slice(doc.features.findIndex((x) => x.id === f.id) + 1).some((x) => res.get(x.id)?.status === "built" && (res.get(x.id).measure?.bodies ?? []).some((n2) => (r.measure.bodies ?? []).includes(n2)));
  const fin = !later && (r.measure.bodies ?? []).length === 1 ? (finBodies ?? []).find((x) => x.name === r.measure.bodies[0])?.kernel?.shells : void 0;
  const plain = f.targets.every((t) => Array.isArray(byId.get(t)?.center));
  const n = Number.isInteger(r.measure.shells) ? r.measure.shells : Number.isInteger(fin) ? fin : plain ? 2 : null;
  if (!(n > 1)) return null;
  const [na, nb] = f.targets.map((t) => startOf(t, byId));
  return `${na} and ${nb} do not touch, so this join is ${n} separate pieces; give one an at: position so they overlap`;
}
var pieceCount = (bodies) => (bodies ?? []).reduce((n, b) => n + (Number.isInteger(b?.kernel?.shells) && b.kernel.shells > 0 ? b.kernel.shells : 1), 0);

// src/host-entry.mjs
var hostFromUsage = (doc, { recorded }) => fromUsageOfDoc(doc, { recorded, mt: { extentAlong, featureRangeAlong } });
var LEGACY_SOLVER = { solveSketch, seedForNewRule };
function hostPrepare(r, { recorded }) {
  const log = recorded && Array.isArray(r.ruleLog) ? r.ruleLog : [];
  const g = guardLegacySketches(r.doc, solveDoc(r.doc), log, LEGACY_SOLVER);
  const ruleWarnings = new Set(log.map((e) => e?.warning).filter(Boolean));
  const warnings = (Array.isArray(r.warnings) ? r.warnings : []).map(String).filter((w) => !ruleWarnings.has(w));
  if (g.outcome === "refused") return { refusal: g.sentence, warnings, sketches: g.sketches };
  return { doc: g.doc, fromUsage: hostFromUsage(g.doc, { recorded }), warnings, sketches: g.sketches };
}
var layer = createTranslator({ planners: "unified" });
var HOST_EP_JOIN_CHECKS = "full";
var hostCtx = (ctx) => ({ ...ctx, unifiedEpJoinChecks: HOST_EP_JOIN_CHECKS });
var NOT_YET = {
  blend: "a loft between two sketches is not available in this version yet, so {id} is shown without it."
};
var translateDoc2 = async (doc, ctx0) => {
  const tr = await translateGuarded(doc, ctx0);
  return ctx0?.probeBlockedSteps ? probeBlockedSteps(doc, ctx0, tr) : tr;
};
async function translateGuarded(doc, ctx0) {
  const ctx = hostCtx(ctx0);
  const notYet = new Map(doc.features.filter((f) => NOT_YET[f.kind]).map((f) => [f.id, { refusal: NOT_YET[f.kind].replace("{id}", f.id), guard: "PILOT-NOT-YET" }]));
  const tr = await translateWithout(doc, ctx, notYet);
  const flagged = hostPreflight(doc);
  if (!flagged.size) return tr;
  const built = new Set(tr.features.filter((f) => f.status === "built").map((f) => f.id));
  const fired = new Set([...flagged].filter(([id, v]) => v.subject && built.has(id)).map(([, v]) => v.root));
  if (!fired.size) return tr;
  const pre = hostPreflight(doc, fired);
  for (const [id, v] of notYet) if (!pre.has(id)) pre.set(id, v);
  if (ctx.soups) for (const k of Object.keys(ctx.soups)) delete ctx.soups[k];
  return translateWithout(doc, ctx, pre);
}
var BLOCKED_SENTENCE = {
  shell: /^\S+ \(hollow\): it needs (\S+), which could not be built, so /,
  draft: /^\S+ \(draft\): it needs (\S+), which could not be built, so /,
  fillet: /^\S+ builds on (\S+), which could not be built, so /
};
var HANDS_ON = /* @__PURE__ */ new Set(["hole", "fillet", "shell", "draft", "move", "rotate"]);
var handsOnTo = (f) => !f ? void 0 : f.kind === "pocket" || f.kind === "groove" ? f.into : HANDS_ON.has(f.kind) && !(f.kind === "move" && f.copy) ? f.target : void 0;
function blockedProbePlan(doc, tr, fromUsage) {
  const by = new Map(tr.features.map((f) => [f.id, f]));
  const byId = new Map(doc.features.map((f) => [f.id, f]));
  const blocked = doc.features.filter((f) => BLOCKED_SENTENCE[f.kind] && by.get(f.id)?.status === "refused" && BLOCKED_SENTENCE[f.kind].test(by.get(f.id).refusal ?? ""));
  if (!blocked.length) return null;
  const keep = new Set(blocked.map((f) => f.id));
  const drop = new Set(tr.features.filter((f) => f.status === "refused" && !keep.has(f.id)).map((f) => f.id));
  const res = (id) => {
    const seen = /* @__PURE__ */ new Set();
    while (drop.has(id) && !seen.has(id)) {
      seen.add(id);
      const p = handsOnTo(byId.get(id));
      if (typeof p !== "string") break;
      id = p;
    }
    return id;
  };
  const names = (f) => {
    let hit = false;
    const walk = (v) => {
      if (typeof v === "string") {
        for (const d of drop) if (v === d || new RegExp(`(^|[^A-Za-z0-9_])${d}([^A-Za-z0-9_]|$)`).test(v)) hit = true;
      } else if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === "object") Object.values(v).forEach(walk);
    };
    for (const [k, v] of Object.entries(f)) if (!["id", "kind", "name", "target"].includes(k)) walk(v);
    return hit;
  };
  const candidates = blocked.filter((f) => typeof f.target === "string" && !drop.has(res(f.target)) && !names(f)).map((f) => f.id);
  if (!candidates.length) return null;
  const features = doc.features.filter((f) => !drop.has(f.id)).map((f) => {
    const g = { ...f };
    for (const k of ["target", "into"]) if (typeof g[k] === "string") g[k] = res(g[k]);
    if (Array.isArray(g.targets)) g.targets = g.targets.map((t) => typeof t === "string" ? res(t) : t);
    return g;
  });
  const drafts = doc.features.filter((f) => f.kind === "draft");
  return { candidates, doc: { ...doc, features }, fromUsage: Array.isArray(fromUsage) ? fromUsage.filter((_u, i) => drafts[i] && !drop.has(drafts[i].id)) : fromUsage };
}
var NOT_OWN = /solidcraft refused it|could not be resolved|needs a single target body|is not a single solid|translator error|could not be built cleanly|this step could not be built/;
function ownRefusalShown(kind, own) {
  if (!own || own.status !== "refused" || typeof own.refusal !== "string" || !own.refusal) return false;
  if (BLOCKED_SENTENCE[kind]?.test(own.refusal) || own.guard === PREFLIGHT_DEP_GUARD || NOT_OWN.test(own.refusal)) return false;
  return !!own.guard || !/^\S+ \((fillet|chamfer|hollow|shell|draft)\): /.test(own.refusal);
}
async function probeBlockedSteps(doc, ctx0, tr) {
  const plan = blockedProbePlan(doc, tr, ctx0.fromUsage);
  if (!plan) return tr;
  let tr2;
  try {
    tr2 = await translateGuarded(plan.doc, { ...ctx0, soups: {}, fromUsage: plan.fromUsage });
  } catch {
    return tr;
  }
  const by2 = new Map(tr2.features.map((f) => [f.id, f]));
  const kindOf = new Map(doc.features.map((f) => [f.id, f.kind]));
  tr.features = tr.features.map((f) => {
    if (!plan.candidates.includes(f.id)) return f;
    const own = by2.get(f.id);
    if (!ownRefusalShown(kindOf.get(f.id), own)) return f;
    return { ...f, refusal: own.refusal, guard: own.guard, raw: `blocked (${f.refusal}); own refusal found by translating the script without the steps that were not built` };
  });
  return tr;
}
async function translateWithout(doc, ctx, pre) {
  if (!pre.size) return layer.translateDoc(doc, ctx);
  const drafts = doc.features.filter((f) => f.kind === "draft");
  const fromUsage = Array.isArray(ctx.fromUsage) ? ctx.fromUsage.filter((_u, i) => drafts[i] && !pre.has(drafts[i].id)) : ctx.fromUsage;
  const tr = await layer.translateDoc({ ...doc, features: doc.features.filter((f) => !pre.has(f.id)) }, { ...ctx, fromUsage });
  const by = new Map(tr.features.map((f) => [f.id, f]));
  tr.features = doc.features.map((f) => pre.has(f.id) ? { id: f.id, kind: f.kind, status: "refused", refusal: pre.get(f.id).refusal, guard: pre.get(f.id).guard } : by.get(f.id)).filter(Boolean);
  return tr;
}
var resolveAfter2 = layer.resolveAfter;
var FEATURE_KINDS2 = layer.FEATURE_KINDS;
export {
  BLOCKED_SENTENCE,
  FEATURE_KINDS2 as FEATURE_KINDS,
  HOST_EP_JOIN_CHECKS,
  sketch_arc_exports as arc,
  blockedProbePlan,
  checkRules,
  docProfileIndices,
  draftFromUsage,
  hostFromUsage,
  hostPreflight,
  hostPrepare,
  isSoup3 as isSoup,
  joinApartNote,
  mapSketch,
  model_types_exports as mt,
  ownRefusalShown,
  pieceCount,
  placedMap,
  placementHint,
  preflightScript,
  refusedRule,
  resolveAfter2 as resolveAfter,
  ruleWords,
  shapeNote,
  sketchCheck,
  solveDoc,
  soupSolve,
  soupSolveVerdict,
  spinNote,
  staleConsumers,
  translateDoc2 as translateDoc
};
