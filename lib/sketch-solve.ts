// Constraints on a sketch outline, and the solver that honours them.
//
// The constraints a straight-edged polygon can express: an edge held
// horizontal or vertical, an edge held at a length, two edges held equal, a
// corner pinned. That is most of what a first sketch needs, and all of it is
// reachable without arcs.
//
// The method is least squares over the residuals, not relaxation.
//
// It used to be relaxation: ask each rule in turn to nudge its own corners
// the smallest distance that would satisfy it, and repeat until nothing
// moves. That is a handful of lines and it works for straight edges, but it
// cannot express tangency at all -- there is no direction to nudge a line
// that makes it "closer to tangent" one rule at a time -- and this file said
// so, naming planegcs as the moment that arrived. Arcs arrived in the
// 2026-09-01 bow work, so it did.
//
// What replaced it is ours rather than vendored, for three reasons measured
// at the time: planegcs is a 600 KB LGPL wasm blob in a bundle that is
// otherwise MIT, its wrapper initialises asynchronously while this function
// is called synchronously from React render paths and from a sync test
// harness, and residualsOf() below already computed the hard half -- one
// number per rule, all in distance units, which IS the residual vector a
// least-squares solver needs.
//
// So: every rule is written as "how wrong is this", and lib/least-squares.ts
// moves the corners until all of those are as close to zero as they can get,
// all at once. Adding a rule means writing what wrong means for it and
// nothing else -- no derivative by hand, no new solver. It still degrades
// sensibly when rules disagree, because a least-squares answer to a
// contradiction IS the compromise, and it still stays fast because a sketch
// has a dozen corners rather than a thousand.

import { leastSquares } from './least-squares';

export type Point = [number, number];

export type Constraint =
  | { kind: 'horizontal'; edge: number }
  | { kind: 'vertical'; edge: number }
  | { kind: 'length'; edge: number; value: number }
  | { kind: 'equal'; edge: number; other: number }
  | { kind: 'parallel'; edge: number; other: number }
  | { kind: 'perpendicular'; edge: number; other: number }
  | { kind: 'lock'; corner: number };

export interface SolveResult {
  points: Point[];
  /** Largest remaining violation, in sketch units. */
  residual: number;
  iterations: number;
  /** True when the constraints could not all be met at once. */
  overConstrained: boolean;
}

/** Edge n runs from corner n to corner n+1, wrapping at the end. */
export function edgeCorners(n: number, count: number): [number, number] {
  return [((n % count) + count) % count, ((n + 1) % count + count) % count];
}

export function edgeLength(pts: Point[], n: number): number {
  const [a, b] = edgeCorners(n, pts.length);
  return Math.hypot(pts[b][0] - pts[a][0], pts[b][1] - pts[a][1]);
}

/**
 * The direction of edge n, in radians, treated mod PI -- a line has no
 * distinguished direction, so angle and angle+PI mean the same edge. Null
 * for a zero-length edge, which has no direction to report.
 */
function edgeAngle(pts: Point[], n: number, count: number): number | null {
  const [a, b] = edgeCorners(n, count);
  const dx = pts[b][0] - pts[a][0];
  const dy = pts[b][1] - pts[a][1];
  if (Math.hypot(dx, dy) < 1e-9) return null;
  return Math.atan2(dy, dx);
}

const TOL = 1e-7;
const MAX_ITERATIONS = 300;

/**
 * @param pinned corners the solver may not move — the one being dragged, plus
 *   any locked by a constraint. Without this a drag fights the solver: the
 *   corner under the pointer gets pulled back by whatever it is constrained to.
 */
export function solveSketch(
  input: Point[],
  constraints: Constraint[],
  pinned: Iterable<number> = []
): SolveResult {
  const pts: Point[] = input.map((p) => [p[0], p[1]]);
  const n = pts.length;
  if (n < 2 || constraints.length === 0) {
    return { points: pts, residual: 0, iterations: 0, overConstrained: false };
  }

  // A pin is not a rule to be satisfied, it is a coordinate that does not
  // move. So pinned corners come OUT of the unknowns rather than going in as
  // residuals: the solver never has to trade a pin off against anything, which
  // is exactly what a student means by pinning a corner. `pinned` carries the
  // corner currently under the pointer during a drag, for the same reason.
  const fixed = new Set<number>();
  const wrap = (i: number) => ((i % n) + n) % n;
  for (const p of pinned) fixed.add(wrap(p));
  for (const c of constraints) if (c.kind === 'lock') fixed.add(wrap(c.corner));

  const flat: number[] = [];
  for (const p of pts) flat.push(p[0], p[1]);
  const free: number[] = [];
  for (let i = 0; i < n; i++) {
    if (fixed.has(i)) continue;
    free.push(2 * i, 2 * i + 1);
  }

  /** Put the free coordinates back among the fixed ones. */
  const expand = (x: number[]): Point[] => {
    const all = flat.slice();
    for (let j = 0; j < free.length; j++) all[free[j]] = x[j];
    const out: Point[] = [];
    for (let i = 0; i < n; i++) out.push([all[2 * i], all[2 * i + 1]]);
    return out;
  };

  // residualsOf is the rulebook, unchanged and already tested. Everything the
  // solver knows about sketches comes through this one call.
  // A weak pull back toward where each corner started, appended to the real
  // rules. Without it the solver is free to satisfy a rule any way it likes,
  // and "any way" includes absurd ones: measured 2026-09-01, making two edges
  // parallel stretched a 40-unit edge to 265 and a pinned variant to 399,
  // because rotating and stretching both satisfy parallel equally well and
  // nothing preferred the one that keeps the shape.
  //
  // The weight is small on purpose. It is a tie-breaker, not a rule: it picks
  // among the answers that satisfy everything, and it must never be able to
  // outvote an actual constraint. This is what a CAD solver means by solving
  // for the smallest change, and it is also where relaxation's old habit of
  // "meeting in the middle" comes from -- that behaviour is recovered here as
  // a consequence rather than written in by hand.
  // Measured once, from the sketch as drawn, and held for the whole solve.
  const startScale = sketchScale(pts);
  // Small enough that it cannot measurably bend a real rule, big enough to
  // decide between answers a rule is indifferent to. At 1e-3 it bent them: the
  // rules settled 1e-5 out instead of 1e-9.
  const HOME_PULL = 1e-3;
  const home = free.map((k) => flat[k]);
  const rules = (x: number[]) => residualsOf(expand(x), constraints, startScale);

  // Two passes, and the second one is not optional.
  //
  // Pass one solves the rules WITH the pull, which is what picks a sensible
  // arrangement out of the many that satisfy them. But adding the pull moves
  // where the best answer IS: at the joint optimum the rules sit slightly out,
  // because the last scrap of rule accuracy costs more pull than it saves.
  // Measured: a length asked to be 60 settled at 60.00001. Excluding the pull
  // from the stopping test does not help -- that changes when to stop, not
  // where the optimum lies.
  //
  // Pass two re-solves the rules ALONE, starting from pass one's answer. It
  // begins in the right basin and already near the answer, so it converges to
  // real rule satisfaction without wandering back to the arrangements the pull
  // was there to rule out.
  const runPass = (start: number[]) => {
    const guided = leastSquares(
      start,
      (x) => {
        const r = rules(x);
        for (let j = 0; j < x.length; j++) r.push(HOME_PULL * (x[j] - start[j]));
        return r;
      },
      { tolerance: 1e-6, maxIterations: 200, primaryCount: constraints.length },
    );
    // 100 measured too tight for an otherwise perfectly satisfiable rectangle:
    // four alternating horizontal/vertical rules plus two length rules
    // converges here in a straight, unhurried line rather than LM's usual
    // fast finish near the optimum, and was still at 1.5e-6 residual when the
    // cap cut it off (2026-09-03). 300 brings that same case under 1e-6, and
    // costs nothing extra on a sketch that was already converging fast.
    return leastSquares(guided.x, rules, { tolerance: 1e-9, maxIterations: 300 });
  };

  // The two-pass procedure above is run more than once when it lands badly,
  // because this landscape genuinely has more than one basin. Measured
  // 2026-09-03: stacking a THIRD perpendicular rule onto two already-solved
  // ones (a rectangle built up one rule at a time, exactly the order a
  // student stacking rules produces) collapsed two corners onto each other,
  // residual 23.3, reported as "these rules cannot all be true" -- yet the
  // achievable rectangle was right there, residual 0, one basin over. It is
  // not a numerical near-miss: rounding that SAME starting point to two
  // decimal places was enough to land in the good basin instead, and an
  // independent per-coordinate nudge of about a third of the sketch's own
  // size found it on the very first try. So a handful of small, DETERMINISTIC
  // jitters around the honest starting point -- fixed seed, not Math.random,
  // so the same sketch always resolves the same way -- stands in for the
  // multiple starting guesses a real solver would try. A genuine conflict is
  // unaffected: the three-mutually-perpendicular-edges triangle below still
  // reports itself over-constrained after the same jitters, because every
  // basin there is a bad one and jittering cannot manufacture a good one.
  // A truly zero-length edge is not a bad basin to escape -- it is a
  // direction the geometry does not define at all, and a length or angle
  // rule on it is correctly left unmet rather than resolved by whichever way
  // a random nudge happens to open it. Jittering would "fix" it anyway (any
  // nonzero nudge invents SOME direction), so it is excluded up front rather
  // than relied on to fail differently from the collapse case above.
  const hasZeroLengthEdge = Array.from({ length: n }, (_, i) => edgeLength(pts, i)).some(
    (len) => len < 1e-9,
  );

  let fit = runPass(home);
  let best = residualOf(expand(fit.x), constraints);
  if (best > 1e-3 && !hasZeroLengthEdge) {
    const scale = startScale;
    let seed = 0x5ee2020;
    const rand = () => {
      // mulberry32 -- small, dependency-free, and the point of using it here
      // over Math.random is that the SAME sketch always jitters the SAME way.
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    for (let trial = 0; trial < 6 && best > 1e-3; trial++) {
      const jittered = home.map((v) => v + (rand() - 0.5) * scale * 0.3);
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
  // Same 1e-3 the panel and the canvas mark a losing rule with, so "the panel
  // says these disagree" and "the solver says it is over-constrained" cannot
  // come apart.
  return { points, residual, iterations: fit.iterations, overConstrained: residual > 1e-3 };
}
/** How far each constraint is from being satisfied, parallel to `constraints`.
 *
 *  Every entry is a DISTANCE, so the numbers are comparable across kinds and
 *  one tolerance means the same thing for all of them. A `lock` reports 0: it
 *  pins a corner rather than asserting anything that can be off.
 *
 *  This is what lets the panel say WHICH rules disagree instead of only that
 *  some do. Once relaxation has settled, a constraint still carrying error is
 *  one the others outvoted -- that is the culprit set, and naming it is the
 *  difference between "remove one to settle it" and pointing at the two that
 *  are actually fighting.
 *
 *  Collateral is possible: a third rule can be dragged off true by a conflict
 *  it is not part of, and it will appear in the set. Over-reporting is the
 *  safe direction -- every rule genuinely in the conflict is always present. */
/** `scale` turns an angle into a distance. It defaults to the sketch's own
 *  size, which is right for a reader asking "how wrong is this now" -- and
 *  wrong for a SOLVER, which must be handed the size measured once at the
 *  start. A scale recomputed from the points being solved shrinks as they do,
 *  so shrinking the whole sketch makes every angle rule look better: measured
 *  2026-09-01, the impossible triangle collapsed to a 0.00002-wide speck and
 *  reported a residual of 2e-5. Freezing the scale removes the incentive. */
export function residualsOf(
  pts: Point[],
  constraints: Constraint[],
  scaleOverride?: number,
): number[] {
  const n = pts.length;
  // One size for the whole sketch, used to turn an angle into a distance.
  // It is deliberately NOT the length of the edges being judged. Scaling an
  // angle error by its own edge means a shorter edge reports a smaller error
  // for the same wrongness -- harmless when a person reads it, and an open
  // invitation to a solver, which will happily shrink an edge to nothing to
  // make a rule it cannot satisfy look satisfied. Measured 2026-09-01: three
  // mutually perpendicular edges of a triangle, which is impossible,
  // collapsed to a single point at [13.25, 9.38] and reported every rule met.
  const scale = scaleOverride ?? sketchScale(pts);
  return constraints.map((c) => {
    if (c.kind === 'lock') return 0;
    if (c.kind === 'horizontal' || c.kind === 'vertical') {
      const axis = c.kind === 'horizontal' ? 1 : 0;
      const [a, b] = edgeCorners(c.edge, n);
      return Math.abs(pts[b][axis] - pts[a][axis]);
    }
    if (c.kind === 'length') return Math.abs(edgeLength(pts, c.edge) - c.value);
    return residualOfPair(pts, c, n, scale);
  });
}

/** equal / parallel / perpendicular -- the kinds that name two edges. */
/** The sketch's own size, as a distance: the diagonal of the box around its
 *  corners. Never zero -- a degenerate sketch falls back to 1 so an angle
 *  residual stays a real number instead of vanishing. */
function sketchScale(pts: Point[]): number {
  let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
  for (const p of pts) {
    if (p[0] < minX) minX = p[0];
    if (p[0] > maxX) maxX = p[0];
    if (p[1] < minY) minY = p[1];
    if (p[1] > maxY) maxY = p[1];
  }
  const d = Math.hypot(maxX - minX, maxY - minY);
  return Number.isFinite(d) && d > 1e-9 ? d : 1;
}

function residualOfPair(
  pts: Point[],
  c: Extract<Constraint, { other: number }>,
  n: number,
  scale: number,
): number {
  if (c.kind === 'equal') {
    return Math.abs(edgeLength(pts, c.edge) - edgeLength(pts, c.other));
  }
  const angleA = edgeAngle(pts, c.edge, n);
  const angleB = edgeAngle(pts, c.other, n);
  // A zero-length edge has no direction, so there is nothing to be off by.
  //
  // This DID become a loophole when the solver changed: three mutually
  // perpendicular edges of a triangle are impossible, and least squares found
  // it could collapse all three corners onto one point and be told every rule
  // was met. Reporting a full-size miss here was tried and is not the fix --
  // it made the solver chase degenerate edges apart, moving corners a student
  // never asked it to move. The fix is the frozen `scale` above: once shrinking
  // the sketch stops shrinking the residual, collapsing buys nothing and the
  // solver never goes there. Measured after that change: the same impossible
  // triangle keeps 37.30-unit sides and reports itself over-constrained.
  if (angleA === null || angleB === null) return 0;
  const target = c.kind === 'perpendicular' ? Math.PI / 2 : 0;
  let diff = (angleB - angleA - target) % Math.PI;
  if (diff > Math.PI / 2) diff -= Math.PI;
  if (diff <= -Math.PI / 2) diff += Math.PI;
  // Converted to an approximate ARC LENGTH, not left as raw radians -- every
  // other kind's residual is a distance, and mixing units here would make the
  // fighting/overConstrained thresholds (both calibrated at 1e-3 in distance
  // units) meaningless.
  return Math.abs(diff) * scale;
}

export function residualOf(pts: Point[], constraints: Constraint[]): number {
  // Max of the per-constraint residuals, so the arithmetic lives in exactly one
  // place: a fix to one kind's residual cannot land here and miss residualsOf.
  let worst = 0;
  for (const r of residualsOf(pts, constraints)) worst = Math.max(worst, r);
  return worst;
}

export function describe(c: Constraint): string {
  if (c.kind === 'horizontal') return `edge ${c.edge + 1} across`;
  if (c.kind === 'vertical') return `edge ${c.edge + 1} up`;
  if (c.kind === 'length') return `edge ${c.edge + 1} = ${c.value}`;
  if (c.kind === 'equal') return `edge ${c.edge + 1} = edge ${c.other + 1}`;
  if (c.kind === 'parallel') return `edge ${c.edge + 1} ∥ edge ${c.other + 1}`;
  if (c.kind === 'perpendicular') return `edge ${c.edge + 1} ⊥ edge ${c.other + 1}`;
  return `corner ${c.corner + 1} pinned`;
}

/** Which DESIGN EDGES are named by a constraint that is still violated after a
 *  solve -- the geometry a student should be looking at, as opposed to
 *  `residualsOf`, which names the rules.
 *
 *  Onshape's loudest conflict signal is the geometry itself turning red, and
 *  this is the set that earns it. Both edges of a pair rule are included: an
 *  `equal` that cannot be met is an argument between two edges and pointing at
 *  one of them would be picking a side arbitrarily.
 *
 *  A `lock` names a corner rather than an edge and never appears here. It also
 *  never has a residual to begin with, so this is a type guard rather than a
 *  behavioural one.
 *
 *  The 1e-3 tolerance is the same one the Rules panel marks a control with, so
 *  a red edge and a red control are always the same claim. */
export function losingEdges(pts: Point[], constraints: Constraint[]): number[] {
  const n = pts.length;
  const wrap = (e: number) => ((e % n) + n) % n;
  const residuals = residualsOf(pts, constraints);
  const out = new Set<number>();
  constraints.forEach((c, i) => {
    if (residuals[i] <= 1e-3) return;
    if (c.kind === 'lock') return;
    out.add(wrap(c.edge));
    if ('other' in c) out.add(wrap(c.other));
  });
  return [...out].sort((a, b) => a - b);
}
