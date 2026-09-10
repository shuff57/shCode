// Assertions for lib/hull.ts, run by scripts/test-script-surface.mjs.
//
// Every bar here is arithmetic, never a recorded number. A convex hull has an
// exact volume for exact inputs, so a hull that keeps a point it should have
// swallowed, or drops a corner it should have kept, moves a number that
// arithmetic already knows -- which is the only kind of check worth writing for
// geometry.
//
// The CONTROLS are the point of the file. "The hull of a cube is the cube" is
// satisfied by an implementation that simply returns its input, so each claim is
// paired with one that the lazy implementation fails.

module.exports = function run({ hull, check, near }) {
  const { convexHull, hullVolume, whyNoHull } = hull;

  console.log('\n=== a hull of flat corners is exact ===');

  // A 10-cube at the origin. Eight corners, volume 1000, no arithmetic in
  // dispute.
  const CUBE = [
    [0, 0, 0], [10, 0, 0], [10, 10, 0], [0, 10, 0],
    [0, 0, 10], [10, 0, 10], [10, 10, 10], [0, 10, 10],
  ];
  const cube = convexHull(CUBE);
  check('a cube of eight corners hulls', cube !== null);
  check('...to exactly its own volume',
    near(hullVolume(CUBE, cube), 1000, 1e-9), String(hullVolume(CUBE, cube)));
  check('...keeping all eight corners', cube.used.length === 8, JSON.stringify(cube.used));
  check('...as twelve triangles, two per face',
    cube.triangles.length === 12, String(cube.triangles.length));

  // THE CONTROL for "no dents": a point in the middle changes nothing. An
  // implementation that just triangulates whatever it is handed reports a
  // different volume and a ninth used corner here.
  const WITHMID = [...CUBE, [5, 5, 5]];
  const mid = convexHull(WITHMID);
  check('CONTROL: a point INSIDE is swallowed, not kept',
    mid.used.length === 8 && !mid.used.includes(8), JSON.stringify(mid.used));
  check('...and the volume does not move',
    near(hullVolume(WITHMID, mid), 1000, 1e-9), String(hullVolume(WITHMID, mid)));

  // ...and the other half of the same control: a point OUTSIDE must be kept and
  // must grow the volume. A hull that swallowed everything would pass the check
  // above and fail this one.
  const WITHFAR = [...CUBE, [5, 5, 20]];
  const far = convexHull(WITHFAR);
  check('CONTROL: a point OUTSIDE is kept',
    far.used.includes(8), JSON.stringify(far.used));
  // cube + a pyramid on the top face: 1000 + (1/3)(100)(10) = 1333.333...
  check('...and adds exactly the pyramid it caps the top with',
    near(hullVolume(WITHFAR, far), 1000 + 1000 / 3, 1e-9), String(hullVolume(WITHFAR, far)));

  // A tetrahedron, whose volume arithmetic also knows: |det| / 6.
  const TET = [[0, 0, 0], [6, 0, 0], [0, 9, 0], [0, 0, 4]];
  const tet = convexHull(TET);
  check('a tetrahedron hulls to |det|/6',
    near(hullVolume(TET, tet), (6 * 9 * 4) / 6, 1e-9), String(hullVolume(TET, tet)));
  check('...as exactly four triangles', tet.triangles.length === 4, String(tet.triangles.length));

  console.log('\n=== the winding is outward, not merely consistent ===');

  // hullVolume takes an absolute value, so it cannot tell inward winding from
  // outward. Measured directly instead: every face must have the hull's own
  // middle BEHIND it.
  const inside = (pts, h) => {
    const c = [0, 1, 2].map((i) => h.used.reduce((s, k) => s + pts[k][i], 0) / h.used.length);
    return h.triangles.every((t) => {
      const [a, b, d] = [pts[t[0]], pts[t[1]], pts[t[2]]];
      const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const v = [d[0] - a[0], d[1] - a[1], d[2] - a[2]];
      const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
      const w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      return n[0] * w[0] + n[1] * w[1] + n[2] * w[2] < 0;
    });
  };
  check('every cube face points away from the middle', inside(CUBE, cube));
  check('every tetrahedron face points away from the middle', inside(TET, tet));
  check('...and so does the capped one', inside(WITHFAR, far));

  console.log('\n=== flat inputs are refused in words, not with a broken solid ===');

  check('four corners of a rectangle have no hull',
    convexHull([[0, 0, 0], [10, 0, 0], [10, 10, 0], [0, 10, 0]]) === null);
  check('...and say so as a plane, naming the axis',
    whyNoHull([[0, 0, 0], [10, 0, 0], [10, 10, 0], [0, 10, 0]])
      === 'All the corners sit flat on one plane (every z is the same), so the hull would have no thickness.',
    String(whyNoHull([[0, 0, 0], [10, 0, 0], [10, 10, 0], [0, 10, 0]])));
  check('a row of points says line, not plane',
    /straight line/.test(whyNoHull([[0, 0, 0], [1, 0, 0], [2, 0, 0], [3, 0, 0]])),
    String(whyNoHull([[0, 0, 0], [1, 0, 0], [2, 0, 0], [3, 0, 0]])));
  check('four copies of one point says one place',
    /same place/.test(whyNoHull([[1, 2, 3], [1, 2, 3], [1, 2, 3], [1, 2, 3]])),
    String(whyNoHull([[1, 2, 3], [1, 2, 3], [1, 2, 3], [1, 2, 3]])));
  check('three points is too few, and the sentence counts them',
    whyNoHull([[0, 0, 0], [1, 0, 0], [0, 1, 1]])
      === 'A hull needs at least four corners to have any thickness, and this has 3.',
    String(whyNoHull([[0, 0, 0], [1, 0, 0], [0, 1, 1]])));
  check('CONTROL: a real solid is NOT reported as flat',
    whyNoHull(CUBE) === null, String(whyNoHull(CUBE)));

  // A plane tilted off the axes -- the case the axis-naming branch must not
  // claim, and the one a naive "is every z equal" test would miss entirely.
  const TILTED = [[0, 0, 0], [10, 0, 10], [10, 10, 10], [0, 10, 0]];
  check('a TILTED flat set is still refused', convexHull(TILTED) === null);
  check('...without inventing an axis to blame',
    whyNoHull(TILTED) === 'All the corners sit flat on one plane, so the hull would have no thickness.',
    String(whyNoHull(TILTED)));

  console.log('\n=== scale-relative, so small parts are not called flat ===');

  // The same cube at 0.001 mm. A fixed epsilon large enough for a 200 mm
  // bracket calls this one flat and refuses it.
  const TINY = CUBE.map((p) => p.map((v) => v * 1e-4));
  const tiny = convexHull(TINY);
  check('a 0.001 mm cube still hulls', tiny !== null && tiny.used.length === 8);
  check('...to its own exact volume',
    near(hullVolume(TINY, tiny), 1e-9, 1e-15), String(hullVolume(TINY, tiny)));

  // ...and the opposite: a huge set that IS flat must still be refused, so the
  // scaling is not just "call everything solid".
  const BIGFLAT = [[0, 0, 0], [1e6, 0, 0], [1e6, 1e6, 0], [0, 1e6, 0], [5e5, 5e5, 0]];
  check('CONTROL: a 1000 m flat sheet is still flat', convexHull(BIGFLAT) === null);

  console.log('\n=== many points, and the rubber sheet still has no dents ===');

  // 200 points on a sphere of radius 20, plus 200 scattered inside it. Only the
  // surface ones may survive, and the hull's volume must sit just under the
  // sphere's -- an inscribed polyhedron holds less, never more. That upper
  // bound is the assertion a buggy stitch breaks: a hull with a hole or a
  // flipped face reports a volume that is wildly wrong or negative.
  let seed = 12345;
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const shell = [];
  for (let i = 0; i < 200; i++) {
    const z = 2 * rnd() - 1;
    const t = 2 * Math.PI * rnd();
    const r = Math.sqrt(1 - z * z);
    shell.push([20 * r * Math.cos(t), 20 * r * Math.sin(t), 20 * z]);
  }
  const inner = [];
  for (let i = 0; i < 200; i++) {
    const z = 2 * rnd() - 1;
    const t = 2 * Math.PI * rnd();
    const r = Math.sqrt(1 - z * z) * 0.5;
    inner.push([20 * r * Math.cos(t), 20 * r * Math.sin(t), 10 * z]);
  }
  const CLOUD = [...shell, ...inner];
  const cloud = convexHull(CLOUD);
  const sphereVol = (4 / 3) * Math.PI * 20 ** 3;
  const cv = hullVolume(CLOUD, cloud);
  check('400 points hull without falling over', cloud !== null);
  check('...keeping only points from the shell',
    cloud.used.every((i) => i < 200), `kept ${cloud.used.filter((i) => i >= 200).length} interior points`);
  check('...to a volume just UNDER the sphere it is inscribed in',
    cv > sphereVol * 0.9 && cv < sphereVol,
    `${cv.toFixed(1)} against ${sphereVol.toFixed(1)}`);
  // Euler's formula for a simplicial polyhedron: F = 2V - 4. A stitch that
  // leaves a hole or a duplicate face fails this and nothing else notices.
  check('...and satisfies Euler F = 2V - 4',
    cloud.triangles.length === 2 * cloud.used.length - 4,
    `${cloud.triangles.length} faces, ${cloud.used.length} vertices`);

  console.log('\n=== it does not fall apart when the point set gets dense ===');

  // THE REGRESSION THIS EXISTS FOR, measured 2026-09-02. The tolerance floored
  // at span squared regardless of how big the face was, so once the hull got
  // dense enough for its faces to be small, that floor sat millions of times
  // above the distances being judged: genuinely visible faces read as invisible,
  // the horizon stopped closing, and the face set stopped being a surface.
  //
  // It did not throw and it did not return a wrong number. On 6000 points the
  // face count tracked 2i-4 exactly to i=3000, then went 6427 -> 178731 in five
  // hundred points and the process died on memory -- which was first diagnosed
  // as allocation churn, wrongly, because the symptom was a heap error.
  //
  // 4000 points is past where the collapse began, so this fails on the old code
  // and is the check that would have caught it. Euler is the assertion that
  // matters: a hull that has stopped being a surface breaks it immediately,
  // while a volume can stay plausible for a while.
  let s2 = 7;
  const rand = () => {
    s2 |= 0; s2 = (s2 + 0x6D2B79F5) | 0;
    let t = Math.imul(s2 ^ (s2 >>> 15), 1 | s2);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const DENSE = [];
  for (let i = 0; i < 4000; i++) {
    const z = 2 * rand() - 1;
    const t = 2 * Math.PI * rand();
    const rr = Math.sqrt(1 - z * z);
    DENSE.push([10 * rr * Math.cos(t), 10 * rr * Math.sin(t), 10 * z]);
  }
  const dense = convexHull(DENSE);
  check('4000 points on a sphere still hull', dense !== null);
  check('...with every one of them ON the hull, since every one is on the sphere',
    dense.used.length === 4000, `${dense.used.length} of 4000`);
  check('...and Euler still exact, so it is still a closed surface',
    dense.triangles.length === 2 * dense.used.length - 4,
    `${dense.triangles.length} faces, ${dense.used.length} vertices`);
  check('...to a volume closer to the sphere than the 400-point one managed',
    near(hullVolume(DENSE, dense), (4 / 3) * Math.PI * 1000, 0.005),
    String(hullVolume(DENSE, dense)));

  // CONTROL: duplicated points must be swallowed, not counted twice. A hull that
  // survives dense input by loosening its tolerance would start keeping these.
  const DOUBLED = DENSE.slice(0, 1000).flatMap((p) => [p, [...p]]);
  const doubled = convexHull(DOUBLED);
  check('CONTROL: each point duplicated is still hulled once',
    doubled.used.length === 1000, `${doubled.used.length} of 1000 distinct`);
  check('...and that hull is a closed surface too',
    doubled.triangles.length === 2 * doubled.used.length - 4);

  // ===========================================================================
  // THE 2D CASE
  // ===========================================================================

  const { convexHull2, hull2Area } = hull;
  // Twice the signed area of (o, a, b) -- same definition as the private
  // cross2 in lib/hull.ts, kept local here since that one is not exported.
  const cross2 = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

  console.log('\n=== a 2D hull of flat corners is exact ===');

  const SQUARE = [[0, 0], [10, 0], [10, 10], [0, 10]];
  const square = convexHull2(SQUARE);
  check('a square hulls', square !== null);
  check('...keeping all four corners',
    square.used.length === 4 && square.boundary.length === 4, JSON.stringify(square));
  check('...to exactly its own area',
    near(hull2Area(SQUARE, square), 100, 1e-9), String(hull2Area(SQUARE, square)));

  // THE CONTROL for "no dents", one dimension down: an interior point changes
  // nothing. An implementation that just wound whatever it was handed would
  // report a different area and a fifth used corner here.
  const SQ_MID = [...SQUARE, [5, 5]];
  const sqMid = convexHull2(SQ_MID);
  check('CONTROL: a point INSIDE the square is swallowed, not kept',
    sqMid.used.length === 4 && !sqMid.used.includes(4), JSON.stringify(sqMid.used));
  check('...and the area does not move',
    near(hull2Area(SQ_MID, sqMid), 100, 1e-9), String(hull2Area(SQ_MID, sqMid)));

  console.log('\n=== a concave outline hulls to its convex boundary ===');

  // An L-tromino: a 10x10 square with its top-right 5x5 corner cut away.
  // (10,10) itself is not a vertex of this shape at all -- the cut REMOVES
  // it -- so the hull cannot be the square; it is the pentagon that results
  // from drawing one straight edge across the missing corner, from (10,5)
  // to (5,10). The one point strictly behind that edge, the reflex corner
  // at (5,5), is what "no dents" swallows.
  //
  // Analytic area: the pentagon is the 10x10 square (100) minus the 5x5
  // triangle cut off by the (10,5)-(5,10) edge (12.5), i.e. 87.5.
  const L_SHAPE = [
    [0, 0], [10, 0], [10, 5], [5, 5], [5, 10], [0, 10],
  ];
  const lShape = convexHull2(L_SHAPE);
  check('the L-tromino\'s hull swallows only its reflex corner',
    lShape.used.length === 5 && !lShape.used.includes(3), JSON.stringify(lShape.used));
  check('...and measures the analytic 87.5, not the shape\'s own 75',
    near(hull2Area(L_SHAPE, lShape), 87.5, 1e-9), String(hull2Area(L_SHAPE, lShape)));

  console.log('\n=== collinear points are dropped, not kept ===');

  // A square with an extra point at the midpoint of one edge. Under the
  // documented convention (drop, matching the reference engine's own
  // hullPoints2) the midpoint is not a hull vertex even though it sits
  // exactly on the boundary -- only the two real corners survive that side.
  const MIDEDGE = [[0, 0], [5, 0], [10, 0], [10, 10], [0, 10]];
  const midedge = convexHull2(MIDEDGE);
  check('a point exactly on an edge is dropped, per the stated convention',
    midedge.used.length === 4 && !midedge.used.includes(1), JSON.stringify(midedge.used));
  check('...and the area is still exactly the square\'s',
    near(hull2Area(MIDEDGE, midedge), 100, 1e-9), String(hull2Area(MIDEDGE, midedge)));

  console.log('\n=== degenerate 2D inputs do something sane ===');

  check('two points is too few', convexHull2([[0, 0], [1, 1]]) === null);
  check('every point in the same place has no hull',
    convexHull2([[3, 4], [3, 4], [3, 4], [3, 4]]) === null);
  check('every point on one line has no hull',
    convexHull2([[0, 0], [1, 0], [2, 0], [3, 0], [1.5, 0]]) === null);
  check('...even when the line is not axis-aligned',
    convexHull2([[0, 0], [2, 2], [4, 4], [1, 1], [3, 3]]) === null);

  console.log('\n=== randomised: every input point is inside or on the hull, and the hull is convex ===');

  // The check that actually catches a WRONG hull rather than merely a slow or
  // crashing one: for each random point set, (a) no input point sits strictly
  // outside the reported boundary, and (b) the boundary itself turns the same
  // way -- left -- at every one of its own vertices. A hull that swallowed a
  // point it should have kept fails (a); a hull that is not actually convex
  // (a bug in the chain-building, say) fails (b).
  let s3 = 99;
  const rnd2 = () => {
    s3 |= 0; s3 = (s3 + 0x6D2B79F5) | 0;
    let t = Math.imul(s3 ^ (s3 >>> 15), 1 | s3);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  let allInside = true;
  let allConvex = true;
  let badTrial = -1;
  for (let trial = 0; trial < 300; trial++) {
    const count = 5 + Math.floor(rnd2() * 40);
    const pts = [];
    for (let i = 0; i < count; i++) pts.push([rnd2() * 100, rnd2() * 100]);
    const h = convexHull2(pts);
    if (!h) continue;                             // the rare all-collinear draw; not this check's job

    // (a) every input point inside or on the hull: for each polygon edge, no
    // point may sit strictly to its right (a positive-area convex polygon's
    // interior is always to the left of each of its own CCW edges).
    for (const p of pts) {
      for (let i = 0; i < h.boundary.length; i++) {
        const a = pts[h.boundary[i]];
        const b = pts[h.boundary[(i + 1) % h.boundary.length]];
        const cr = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
        if (cr < -1e-6) { allInside = false; badTrial = trial; }
      }
    }

    // (b) convex at every vertex: consecutive boundary edges all turn the
    // same way (left, since the winding is CCW).
    for (let i = 0; i < h.boundary.length; i++) {
      const o = pts[h.boundary[i]];
      const a = pts[h.boundary[(i + 1) % h.boundary.length]];
      const b = pts[h.boundary[(i + 2) % h.boundary.length]];
      if (cross2(o, a, b) < -1e-6) { allConvex = false; badTrial = trial; }
    }
  }
  check('300 random point sets: every input point is inside or on its hull',
    allInside, `first bad trial ${badTrial}`);
  check('...and every hull is convex at every vertex',
    allConvex, `first bad trial ${badTrial}`);
};
