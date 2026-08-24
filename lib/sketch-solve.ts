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

      // length and equal are the same nudge with a different target.
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

export function residualOf(pts: Point[], constraints: Constraint[]): number {
  const n = pts.length;
  let worst = 0;
  for (const c of constraints) {
    if (c.kind === 'lock') continue;
    if (c.kind === 'horizontal' || c.kind === 'vertical') {
      const axis = c.kind === 'horizontal' ? 1 : 0;
      const [a, b] = edgeCorners(c.edge, n);
      worst = Math.max(worst, Math.abs(pts[b][axis] - pts[a][axis]));
    } else if (c.kind === 'length') {
      worst = Math.max(worst, Math.abs(edgeLength(pts, c.edge) - c.value));
    } else {
      worst = Math.max(worst, Math.abs(edgeLength(pts, c.edge) - edgeLength(pts, c.other)));
    }
  }
  return worst;
}

export function describe(c: Constraint): string {
  if (c.kind === 'horizontal') return `edge ${c.edge + 1} across`;
  if (c.kind === 'vertical') return `edge ${c.edge + 1} up`;
  if (c.kind === 'length') return `edge ${c.edge + 1} = ${c.value}`;
  if (c.kind === 'equal') return `edge ${c.edge + 1} = edge ${c.other + 1}`;
  return `corner ${c.corner + 1} pinned`;
}
