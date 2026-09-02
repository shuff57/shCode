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
};
