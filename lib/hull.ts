// Convex hull, ours.
//
// WHY THIS FILE EXISTS, measured 2026-09-02. Every other name in the scripting
// surface survives the kernel swap: OpenCascade either has the operation, or the
// operation is arithmetic we already do, or the name only ever existed to tidy a
// mesh and a B-rep has no mesh to tidy. `hull` is the exception, and it is not a
// close call -- of the 498 exports in the replicad OpenCascade build, ZERO match
// /hull/i. OpenCascade ships no convex hull at all, in any build, so unlike
// non-uniform scale (which is real OCCT that this particular wasm build does not
// bind) there is nothing to go and enable. Either we own it or eleven documented
// pages stop working.
//
// See lib/script-surface.ts for the full classification and the page counts.
//
// WHAT A HULL IS, since the docs have to say it in one line: the shape a rubber
// sheet makes when it is stretched around everything and let go. No dents.
//
// THE ALGORITHM is incremental, not quickhull, and the reason is legibility
// rather than speed. Start with a tetrahedron of four points that are genuinely
// not flat; then for each remaining point, delete every face it can see, and
// stitch a new face onto each edge of the hole that leaves. The inputs here are
// a student's shape corners -- tens of points, not millions -- so an O(n^2) loop
// that a person can read beats a faster one nobody can check.
//
// EXACT FOR FLAT INPUTS, APPROXIMATE FOR ROUND ONES, and that asymmetry is worth
// stating because it runs the OPPOSITE way to the rest of this conversion.
// Everywhere else the B-rep answer is more correct than the tessellated one -- a
// cylinder's volume stops being a 32-sided prism's. Here it is the reverse: the
// hull of two spheres is only as round as the points fed in, so hulling a curved
// solid means sampling its surface and the answer is a polyhedron either way.
// That is the same trade JSCAD makes, so nothing is LOST at the swap; it is
// simply the one place where B-rep buys no accuracy.
//
// NO KERNEL, ON PURPOSE -- same split as lib/topo-name.ts against
// lib/topo-resolve.ts. Points in, triangles out, testable by arithmetic: the
// hull of a cube's eight corners has volume exactly s^3, and stays exactly s^3
// when interior points are added. Turning those triangles into a solid is the
// adapter's job, because that is the part that needs OpenCascade.

/** A point. Same shape as Vec3 in lib/model-types.ts, kept local so this file
 *  imports nothing. */
export type Pt = [number, number, number];

/** One face of the hull, as indices into the input points, wound
 *  counter-clockwise seen from outside. */
export type Tri = [number, number, number];

export interface Hull {
  /** The points that ended up ON the hull, in input order. */
  used: number[];
  /** The hull's triangles, indexing the ORIGINAL points array. */
  triangles: Tri[];
}

const sub = (a: Pt, b: Pt): Pt => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: Pt, b: Pt): Pt => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const dot = (a: Pt, b: Pt): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/**
 * How far `p` sits above the plane of triangle `t`, in the direction the
 * triangle faces. Positive means the point can SEE that face, which is the only
 * question the algorithm ever asks.
 *
 * Not normalised: the sign is what matters, and dividing by a length that could
 * be near zero on a sliver triangle is a way to turn a clear answer into a
 * noisy one.
 */
function above(pts: Pt[], t: Tri, p: Pt): number {
  const a = pts[t[0]];
  const n = cross(sub(pts[t[1]], a), sub(pts[t[2]], a));
  return dot(n, sub(p, a));
}

/**
 * The convex hull of a point set, or null when there is no hull to take.
 *
 * Returns null for fewer than four points, and for a set that is flat --
 * every point on one plane, or on one line. Those are real inputs a student can
 * produce (four corners of a rectangle, say) and they have no VOLUME, so a
 * caller that wants a shape out of this has to say so in words rather than
 * receive a degenerate solid. whyNoHull() below is that sentence.
 *
 * `eps` scales with the point set rather than being a fixed number, because
 * "flat" at the scale of a 200 mm bracket is not flat at the scale of a 0.2 mm
 * feature, and a constant would silently pick one of them.
 */
export function convexHull(pts: Pt[]): Hull | null {
  const n = pts.length;
  if (n < 4) return null;

  // A scale-relative flatness threshold, from the spread of the points.
  let lo = [Infinity, Infinity, Infinity];
  let hi = [-Infinity, -Infinity, -Infinity];
  for (const p of pts) {
    for (let i = 0; i < 3; i++) {
      if (p[i] < lo[i]) lo[i] = p[i];
      if (p[i] > hi[i]) hi[i] = p[i];
    }
  }
  const span = Math.max(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]);
  if (!(span > 0)) return null;
  const eps = span * 1e-9;

  // ---- a starting tetrahedron ---------------------------------------------
  //
  // Four points that are not flat. Taken greedily rather than cleverly: the
  // first two that differ, then the first that is off that line, then the first
  // that is off that plane. If the last search comes up empty the whole set is
  // planar, which is the null case above.
  let i0 = 0;
  let i1 = -1;
  for (let i = 1; i < n; i++) {
    if (Math.hypot(...sub(pts[i], pts[i0])) > eps) { i1 = i; break; }
  }
  if (i1 < 0) return null;                       // every point in one place

  let i2 = -1;
  const line = sub(pts[i1], pts[i0]);
  for (let i = 0; i < n; i++) {
    if (i === i0 || i === i1) continue;
    if (Math.hypot(...cross(line, sub(pts[i], pts[i0]))) > eps * span) { i2 = i; break; }
  }
  if (i2 < 0) return null;                       // every point on one line

  let i3 = -1;
  const base: Tri = [i0, i1, i2];
  for (let i = 0; i < n; i++) {
    if (i === i0 || i === i1 || i === i2) continue;
    if (Math.abs(above(pts, base, pts[i])) > eps * span * span) { i3 = i; break; }
  }
  if (i3 < 0) return null;                       // every point on one plane

  // Wind the seed faces outward. The fourth point is inside the tetrahedron by
  // construction, so any face it can see is wound the wrong way round.
  let faces: Tri[] = [
    [i0, i1, i2], [i0, i2, i3], [i0, i3, i1], [i1, i3, i2],
  ].map((f) => f as Tri);
  const centre: Pt = [
    (pts[i0][0] + pts[i1][0] + pts[i2][0] + pts[i3][0]) / 4,
    (pts[i0][1] + pts[i1][1] + pts[i2][1] + pts[i3][1]) / 4,
    (pts[i0][2] + pts[i1][2] + pts[i2][2] + pts[i3][2]) / 4,
  ];
  faces = faces.map((f) => (above(pts, f, centre) > 0 ? [f[0], f[2], f[1]] as Tri : f));

  // ---- add the rest, one at a time ----------------------------------------
  const seeded = new Set([i0, i1, i2, i3]);
  for (let i = 0; i < n; i++) {
    if (seeded.has(i)) continue;
    const p = pts[i];

    // A tolerance proportional to each face's own size: `above` returns twice
    // the tetrahedron volume, so a big face and a sliver need different floors
    // for the same physical distance. Without this, a point sitting exactly on
    // a large face is judged "visible" by floating-point noise and the horizon
    // walk below is handed a hole that does not close.
    const visible = faces.filter((f) => {
      const a = pts[f[0]];
      const nrm = cross(sub(pts[f[1]], a), sub(pts[f[2]], a));
      const area2 = Math.hypot(...nrm);
      return above(pts, f, p) > eps * Math.max(area2, span * span);
    });
    if (visible.length === 0) continue;          // already inside the hull

    // The horizon: every edge of the visible region that is NOT shared with
    // another visible face. Counting each directed edge once is enough --
    // adjacent faces wind opposite ways, so a shared edge appears in both
    // directions and cancels.
    const seen = new Set(visible);
    const horizon: Array<[number, number]> = [];
    for (const f of visible) {
      for (const [a, b] of [[f[0], f[1]], [f[1], f[2]], [f[2], f[0]]] as Array<[number, number]>) {
        const shared = faces.some((g) => seen.has(g) && g !== f && (
          (g[0] === b && g[1] === a) || (g[1] === b && g[2] === a) || (g[2] === b && g[0] === a)
        ));
        if (!shared) horizon.push([a, b]);
      }
    }

    faces = faces.filter((f) => !seen.has(f));
    for (const [a, b] of horizon) faces.push([a, b, i]);
  }

  const used = new Set<number>();
  for (const f of faces) { used.add(f[0]); used.add(f[1]); used.add(f[2]); }
  return {
    used: [...used].sort((a, b) => a - b),
    triangles: faces,
  };
}

/**
 * Why a point set has no hull, phrased for a student, or null when it has one.
 *
 * The same contract as whyDeletingCosts() in lib/model-deps.ts and
 * whyNameLost() in lib/topo-name.ts: say what went wrong in words and let the
 * caller decide. Nothing here refuses anything on its own.
 *
 * The three flat cases are named separately because they are three different
 * mistakes. "All in one place" is usually a loop that forgot to move; "on one
 * line" is a row of shapes; "on one plane" is a 2D drawing where a 3D one was
 * meant, which is the common one and the least obvious from looking at it.
 */
export function whyNoHull(pts: Pt[]): string | null {
  if (pts.length < 4) {
    return `A hull needs at least four corners to have any thickness, and this has ${pts.length}.`;
  }
  if (convexHull(pts) !== null) return null;

  const same = (i: number) => pts.every((p) => Math.abs(p[i] - pts[0][i]) < 1e-9);
  if (pts.every((p) => Math.hypot(...sub(p, pts[0])) < 1e-9)) {
    return 'Every corner is in the same place, so there is no shape to wrap.';
  }
  const flatAxis = [0, 1, 2].filter(same);
  if (flatAxis.length >= 2) {
    return 'All the corners sit on one straight line, so there is no shape to wrap.';
  }
  const axis = ['x', 'y', 'z'];
  if (flatAxis.length === 1) {
    return `All the corners sit flat on one plane (every ${axis[flatAxis[0]]} is the same), `
      + 'so the hull would have no thickness.';
  }
  return 'All the corners sit flat on one plane, so the hull would have no thickness.';
}

/**
 * The volume the hull encloses.
 *
 * Here rather than left to the kernel because it is what makes this file
 * checkable on its own: the hull of a cube's eight corners must measure exactly
 * s^3, and must still measure s^3 once interior points are thrown in. That is
 * an arithmetic bar, not a golden number, and it is the control that catches a
 * hull which quietly kept a point it should have swallowed.
 *
 * Signed tetrahedron sum from the origin -- the standard divergence-theorem
 * form. Outward winding makes it positive.
 */
export function hullVolume(pts: Pt[], h: Hull): number {
  let v = 0;
  for (const t of h.triangles) {
    const [a, b, c] = [pts[t[0]], pts[t[1]], pts[t[2]]];
    v += dot(a, cross(b, c)) / 6;
  }
  return Math.abs(v);
}
