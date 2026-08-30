// Constraints on a sketch outline, and the solver that honours them.
//
// The constraints a straight-edged polygon can express: an edge held
// horizontal or vertical, an edge held at a length, two edges held equal, a
// corner pinned. That is most of what a first sketch needs, and all of it is
// reachable without arcs.
//
// The method is relaxation, not a matrix solve. Each constraint is asked, in
// turn, to nudge its own corners the smallest distance that would satisfy it;
// repeat until nothing moves. It is a handful of lines, it degrades sensibly
// when constraints disagree (it settles on a compromise rather than throwing),
// and it stays fast because a sketch has a dozen corners rather than a
// thousand. A proper solver earns its place when arcs and tangency arrive --
// relaxation cannot do those, and that is the moment for planegcs.

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

  const fixed = new Set<number>(pinned);
  for (const c of constraints) if (c.kind === 'lock') fixed.add(c.corner);

  // Move two corners toward a target, sharing the correction. A pinned corner
  // takes none of it, which is what makes a drag feel like a drag.
  const share = (a: number, b: number): [number, number] => {
    const fa = fixed.has(a);
    const fb = fixed.has(b);
    if (fa && fb) return [0, 0];
    if (fa) return [0, 1];
    if (fb) return [1, 0];
    return [0.5, 0.5];
  };

  // Rotate edge `edge` by `delta` radians around a pivot chosen the same
  // pinned-aware way share() chooses its weights: rotating around a FIXED
  // endpoint (or the midpoint, when neither is fixed) cannot change the
  // edge's own length, because the moving point(s) stay the same distance
  // from whichever point they're rotating around. This is what makes
  // Parallel/Perpendicular safe to combine with Pin a corner -- the naive
  // version (average two independently-rotated endpoints) would NOT
  // preserve length, and does not appear anywhere in this function.
  const rotateEdgeBy = (edge: number, delta: number): number => {
    const [p, q] = edgeCorners(edge, n);
    const fp = fixed.has(p);
    const fq = fixed.has(q);
    if (fp && fq) return 0;
    const dx = pts[q][0] - pts[p][0];
    const dy = pts[q][1] - pts[p][1];
    const len = Math.hypot(dx, dy);
    if (len < 1e-9) return 0; // no direction to rotate
    const pivot: Point = fp ? pts[p] : fq ? pts[q] : [
      (pts[p][0] + pts[q][0]) / 2,
      (pts[p][1] + pts[q][1]) / 2,
    ];
    const cos = Math.cos(delta);
    const sin = Math.sin(delta);
    const rotatePoint = (idx: number) => {
      const vx = pts[idx][0] - pivot[0];
      const vy = pts[idx][1] - pivot[1];
      pts[idx][0] = pivot[0] + vx * cos - vy * sin;
      pts[idx][1] = pivot[1] + vx * sin + vy * cos;
    };
    if (!fp) rotatePoint(p);
    if (!fq) rotatePoint(q);
    return Math.abs(delta) * len; // arc length moved -- feeds `moved` below
  };

  let iterations = 0;
  let moved = Infinity;

  while (iterations < MAX_ITERATIONS && moved > TOL) {
    moved = 0;
    iterations++;

    for (const c of constraints) {
      if (c.kind === 'lock') continue;

      if (c.kind === 'horizontal' || c.kind === 'vertical') {
        const axis = c.kind === 'horizontal' ? 1 : 0;
        const [a, b] = edgeCorners(c.edge, n);
        const [wa, wb] = share(a, b);
        if (!wa && !wb) continue;
        const diff = pts[b][axis] - pts[a][axis];
        pts[a][axis] += diff * wa;
        pts[b][axis] -= diff * wb;
        moved = Math.max(moved, Math.abs(diff));
        continue;
      }

      // length and equal are the same nudge with a different target. This
      // block is guarded to length/equal only: it is NOT continue-terminated,
      // so without the guard a parallel/perpendicular constraint would fall
      // through and stretch its edge to the average of the two lengths,
      // silently destroying the length that rotateEdgeBy exists to preserve.
      if (c.kind === 'length' || c.kind === 'equal') {
        const [a, b] = edgeCorners(c.edge, n);
        const target =
          c.kind === 'length'
            ? c.value
            : (edgeLength(pts, c.edge) + edgeLength(pts, c.other)) / 2;

        const apply = (edge: number, want: number) => {
          const [p, q] = edgeCorners(edge, n);
          const dx = pts[q][0] - pts[p][0];
          const dy = pts[q][1] - pts[p][1];
          const len = Math.hypot(dx, dy);
          // A zero-length edge has no direction to grow along. Nudging it in an
          // arbitrary one would make the result depend on iteration order.
          if (len < 1e-9) return;
          const [wp, wq] = share(p, q);
          if (!wp && !wq) return;
          const scale = (want - len) / len;
          pts[p][0] -= dx * scale * wp;
          pts[p][1] -= dy * scale * wp;
          pts[q][0] += dx * scale * wq;
          pts[q][1] += dy * scale * wq;
          moved = Math.max(moved, Math.abs(want - len));
        };

        apply(c.edge, target);
        if (c.kind === 'equal') apply(c.other, target);
        continue;
      }

      if (c.kind === 'parallel' || c.kind === 'perpendicular') {
        const angleA = edgeAngle(pts, c.edge, n);
        const angleB = edgeAngle(pts, c.other, n);
        if (angleA === null || angleB === null) continue; // a zero-length edge has no angle to match
        const target = c.kind === 'perpendicular' ? Math.PI / 2 : 0;
        let diff = (angleB - angleA - target) % Math.PI;
        if (diff > Math.PI / 2) diff -= Math.PI;
        if (diff <= -Math.PI / 2) diff += Math.PI;
        const movedA = rotateEdgeBy(c.edge, diff / 2);
        const movedB = rotateEdgeBy(c.other, -diff / 2);
        moved = Math.max(moved, movedA, movedB);
        continue;
      }
    }
  }

  return {
    points: pts,
    residual: residualOf(pts, constraints),
    iterations,
    // Relaxation stops moving when it has settled. Still-large error after it
    // settles means the constraints disagree, not that it needed longer.
    overConstrained: residualOf(pts, constraints) > 1e-3,
  };
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
export function residualsOf(pts: Point[], constraints: Constraint[]): number[] {
  const n = pts.length;
  return constraints.map((c) => {
    if (c.kind === 'lock') return 0;
    if (c.kind === 'horizontal' || c.kind === 'vertical') {
      const axis = c.kind === 'horizontal' ? 1 : 0;
      const [a, b] = edgeCorners(c.edge, n);
      return Math.abs(pts[b][axis] - pts[a][axis]);
    }
    if (c.kind === 'length') return Math.abs(edgeLength(pts, c.edge) - c.value);
    return residualOfPair(pts, c, n);
  });
}

/** equal / parallel / perpendicular -- the kinds that name two edges. */
function residualOfPair(
  pts: Point[],
  c: Extract<Constraint, { other: number }>,
  n: number,
): number {
  if (c.kind === 'equal') {
    return Math.abs(edgeLength(pts, c.edge) - edgeLength(pts, c.other));
  }
  const angleA = edgeAngle(pts, c.edge, n);
  const angleB = edgeAngle(pts, c.other, n);
  // A zero-length edge has no direction, so there is nothing to be off by.
  if (angleA === null || angleB === null) return 0;
  const target = c.kind === 'perpendicular' ? Math.PI / 2 : 0;
  let diff = (angleB - angleA - target) % Math.PI;
  if (diff > Math.PI / 2) diff -= Math.PI;
  if (diff <= -Math.PI / 2) diff += Math.PI;
  // Converted to an approximate ARC LENGTH, not left as raw radians -- every
  // other kind's residual is a distance, and mixing units here would make the
  // fighting/overConstrained thresholds (both calibrated at 1e-3 in distance
  // units) meaningless.
  return Math.abs(diff) * Math.max(edgeLength(pts, c.edge), edgeLength(pts, c.other));
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
