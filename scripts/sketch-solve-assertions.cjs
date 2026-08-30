// Assertions for lib/sketch-solve.ts.
//
// Every check measures the geometry after solving, not the solver's own report
// of itself. A relaxation solver that returns residual 0 while the shape is
// wrong is exactly the failure worth catching.

module.exports = function run(dir) {
  const path = require('path');
  const S = require(path.join(dir, 'sketch-solve.js'));

  let pass = 0;
  const fails = [];
  const check = (name, ok, detail) => {
    if (ok) { pass++; console.log(`  PASS  ${name}`); }
    else { fails.push(name); console.log(`  FAIL  ${name}${detail ? ' -- ' + detail : ''}`); }
  };

  const near = (a, b, tol = 1e-3) => Math.abs(a - b) < tol;
  const rect = () => [[0, 0], [40, 0], [40, 25], [0, 25]];

  console.log('\n=== nothing to do ===');

  const untouched = S.solveSketch(rect(), []);
  check('no constraints leaves the points alone',
    JSON.stringify(untouched.points) === JSON.stringify(rect()));
  check('...and reports nothing wrong',
    untouched.residual === 0 && !untouched.overConstrained);

  console.log('\n=== one constraint at a time ===');

  // A skewed edge pulled flat.
  const skew = [[0, 0], [40, 6], [40, 25], [0, 25]];
  const flat = S.solveSketch(skew, [{ kind: 'horizontal', edge: 0 }]);
  check('horizontal levels an edge', near(flat.points[0][1], flat.points[1][1]),
    `${flat.points[0][1]} vs ${flat.points[1][1]}`);
  check('...by meeting in the middle, not dragging one to the other',
    near(flat.points[0][1], 3) && near(flat.points[1][1], 3),
    JSON.stringify([flat.points[0], flat.points[1]]));

  const lean = [[0, 0], [40, 0], [46, 25], [0, 25]];
  const upright = S.solveSketch(lean, [{ kind: 'vertical', edge: 1 }]);
  check('vertical squares an edge up',
    near(upright.points[1][0], upright.points[2][0]));

  const sized = S.solveSketch(rect(), [{ kind: 'length', edge: 0, value: 60 }]);
  check('length stretches an edge to its number',
    near(S.edgeLength(sized.points, 0), 60), String(S.edgeLength(sized.points, 0)));
  check('...symmetrically about the middle',
    near(sized.points[0][0], -10) && near(sized.points[1][0], 50),
    JSON.stringify([sized.points[0], sized.points[1]]));

  const evened = S.solveSketch(rect(), [{ kind: 'equal', edge: 0, other: 1 }]);
  check('equal brings two edges to the same length',
    near(S.edgeLength(evened.points, 0), S.edgeLength(evened.points, 1)),
    `${S.edgeLength(evened.points, 0).toFixed(3)} vs ${S.edgeLength(evened.points, 1).toFixed(3)}`);
  check('...landing between the two, not on either',
    S.edgeLength(evened.points, 0) > 25 && S.edgeLength(evened.points, 0) < 40,
    String(S.edgeLength(evened.points, 0)));

  console.log('\n=== a pinned corner does not move ===');

  const pinned = S.solveSketch(rect(), [
    { kind: 'length', edge: 0, value: 60 },
    { kind: 'lock', corner: 0 },
  ]);
  check('a locked corner stays exactly put',
    pinned.points[0][0] === 0 && pinned.points[0][1] === 0,
    JSON.stringify(pinned.points[0]));
  check('...so the whole correction lands on the other end',
    near(pinned.points[1][0], 60), String(pinned.points[1][0]));
  check('...and the constraint is still met',
    near(S.edgeLength(pinned.points, 0), 60));

  // The dragged corner is pinned the same way, which is what stops a drag
  // fighting the solver.
  const dragged = S.solveSketch(
    [[0, 0], [55, 9], [40, 25], [0, 25]],
    [{ kind: 'horizontal', edge: 0 }],
    [1]
  );
  check('the corner under the pointer is not pulled back',
    dragged.points[1][0] === 55 && dragged.points[1][1] === 9,
    JSON.stringify(dragged.points[1]));
  check('...the other end moves to meet it', near(dragged.points[0][1], 9));

  console.log('\n=== constraints together ===');

  const boxed = S.solveSketch([[0, 0], [40, 3], [37, 25], [0, 25]], [
    { kind: 'horizontal', edge: 0 },
    { kind: 'vertical', edge: 1 },
    { kind: 'horizontal', edge: 2 },
    { kind: 'vertical', edge: 3 },
    { kind: 'lock', corner: 0 },
  ]);
  check('four constraints square a wonky quad',
    boxed.residual < 1e-3, `residual ${boxed.residual}`);
  check('...into an actual rectangle',
    near(boxed.points[0][1], boxed.points[1][1])
    && near(boxed.points[1][0], boxed.points[2][0])
    && near(boxed.points[2][1], boxed.points[3][1])
    && near(boxed.points[3][0], boxed.points[0][0]),
    JSON.stringify(boxed.points));
  check('...and it converges rather than running out of iterations',
    boxed.iterations < 300, `${boxed.iterations} iterations`);

  const squared = S.solveSketch(rect(), [
    { kind: 'horizontal', edge: 0 },
    { kind: 'vertical', edge: 1 },
    { kind: 'equal', edge: 0, other: 1 },
    { kind: 'lock', corner: 0 },
  ]);
  check('equal plus square gives a square',
    near(S.edgeLength(squared.points, 0), S.edgeLength(squared.points, 1)),
    `${S.edgeLength(squared.points, 0).toFixed(2)} vs ${S.edgeLength(squared.points, 1).toFixed(2)}`);

  console.log('\n=== when they disagree ===');

  // One edge told to be two lengths at once. There is no answer; the solver
  // must say so rather than oscillate silently or claim success.
  const fought = S.solveSketch(rect(), [
    { kind: 'length', edge: 0, value: 60 },
    { kind: 'length', edge: 0, value: 20 },
  ]);
  check('impossible constraints are reported', fought.overConstrained,
    `residual ${fought.residual.toFixed(3)}`);
  check('...and it still returns usable points',
    fought.points.length === 4 && fought.points.every((p) => Number.isFinite(p[0]) && Number.isFinite(p[1])));

  const impossible = S.solveSketch(rect(), [
    { kind: 'length', edge: 0, value: 60 },
    { kind: 'lock', corner: 0 },
    { kind: 'lock', corner: 1 },
  ]);
  check('a length between two pinned corners is reported, not forced',
    impossible.overConstrained && impossible.points[1][0] === 40,
    JSON.stringify(impossible.points[1]));

  console.log('\n=== degenerate input ===');

  const zero = S.solveSketch([[10, 10], [10, 10], [40, 25]], [
    { kind: 'length', edge: 0, value: 20 },
  ]);
  check('a zero-length edge does not produce NaN',
    zero.points.every((p) => Number.isFinite(p[0]) && Number.isFinite(p[1])),
    JSON.stringify(zero.points));
  check('...and is reported as unmet rather than invented',
    zero.overConstrained);

  const tiny = S.solveSketch([[0, 0]], [{ kind: 'horizontal', edge: 0 }]);
  check('a single point is not a polygon and is left alone', tiny.points.length === 1);

  console.log('\n=== parallel and perpendicular ===');

  // Angles are measured from the returned points with plain trig, mod PI --
  // a line has no direction, so angle and angle+PI are the same edge.
  const edgeAngle = (pts, n) => {
    const [a, b] = S.edgeCorners(n, pts.length);
    const dx = pts[b][0] - pts[a][0];
    const dy = pts[b][1] - pts[a][1];
    if (Math.hypot(dx, dy) < 1e-9) return null;
    return Math.atan2(dy, dx);
  };
  // Smallest signed difference between two angles, mod PI, in (-PI/2, PI/2].
  const angleDiff = (a, b) => {
    let d = (b - a) % Math.PI;
    if (d > Math.PI / 2) d -= Math.PI;
    if (d <= -Math.PI / 2) d += Math.PI;
    return d;
  };

  // Two edges at clearly different angles (edge 0 leans, edge 2 is flat).
  const lean2 = [[0, 0], [40, 6], [40, 25], [0, 25]];
  const par = S.solveSketch(lean2, [{ kind: 'parallel', edge: 0, other: 2 }]);
  check('parallel brings two edges to the same angle',
    near(angleDiff(edgeAngle(par.points, 0), edgeAngle(par.points, 2)), 0, 1e-3),
    `${edgeAngle(par.points, 0).toFixed(4)} vs ${edgeAngle(par.points, 2).toFixed(4)}`);

  const perp = S.solveSketch(lean2, [{ kind: 'perpendicular', edge: 0, other: 2 }]);
  check('perpendicular brings two edges to a right angle',
    near(Math.abs(angleDiff(edgeAngle(perp.points, 0), edgeAngle(perp.points, 2))), Math.PI / 2, 1e-3),
    `${edgeAngle(perp.points, 0).toFixed(4)} vs ${edgeAngle(perp.points, 2).toFixed(4)}`);

  // Length preservation is the whole point of rotating around the right pivot.
  const lenBefore = [S.edgeLength(lean2, 0), S.edgeLength(lean2, 2)];
  const parLen = S.solveSketch(lean2, [{ kind: 'parallel', edge: 0, other: 2 }]);
  check('parallel preserves both edge lengths (no corner pinned)',
    near(S.edgeLength(parLen.points, 0), lenBefore[0], 1e-3)
    && near(S.edgeLength(parLen.points, 2), lenBefore[1], 1e-3),
    `${S.edgeLength(parLen.points, 0).toFixed(3)}/${lenBefore[0].toFixed(3)} and ${S.edgeLength(parLen.points, 2).toFixed(3)}/${lenBefore[1].toFixed(3)}`);

  // Pin one endpoint of edge 0; the pivot must move to the other endpoint so
  // the edge still rotates without changing length, and the pin never moves.
  const parPin = S.solveSketch(lean2, [
    { kind: 'parallel', edge: 0, other: 2 },
    { kind: 'lock', corner: 0 },
  ]);
  check('...and still preserves length with one corner pinned',
    near(S.edgeLength(parPin.points, 0), lenBefore[0], 1e-3),
    `${S.edgeLength(parPin.points, 0).toFixed(3)} vs ${lenBefore[0].toFixed(3)}`);
  check('...and the pinned corner does not move at all',
    parPin.points[0][0] === 0 && parPin.points[0][1] === 0,
    JSON.stringify(parPin.points[0]));

  // A zero-length edge has no angle to match; it must be skipped, not NaN'd.
  const zeroPar = S.solveSketch([[10, 10], [10, 10], [40, 25]], [
    { kind: 'parallel', edge: 0, other: 1 },
  ]);
  check('a zero-length edge is refused, not NaN\'d',
    zeroPar.points.every((p) => Number.isFinite(p[0]) && Number.isFinite(p[1])),
    JSON.stringify(zeroPar.points));
  check('...and its corners stay exactly where they were',
    zeroPar.points[0][0] === 10 && zeroPar.points[0][1] === 10
    && zeroPar.points[1][0] === 10 && zeroPar.points[1][1] === 10,
    JSON.stringify([zeroPar.points[0], zeroPar.points[1]]));

  // Three sides of a triangle cannot all be mutually perpendicular. The solver
  // must settle on a compromise and report the disagreement, not pinball until
  // the iteration cap or corrupt the geometry. NOTE: whether it actually
  // settles (iterations well under 300) is the one open question from the
  // design pass -- it is surfaced as a measurement below, not a hard PASS/FAIL,
  // because a non-converging relaxation is a real algorithmic finding for a
  // human to read, not a test to paper over.
  const tri = [[0, 0], [40, 0], [20, 30]];
  const triPerp = S.solveSketch(tri, [
    { kind: 'perpendicular', edge: 0, other: 1 },
    { kind: 'perpendicular', edge: 1, other: 2 },
    { kind: 'perpendicular', edge: 2, other: 0 },
  ]);
  console.log(`  MEASURE  impossible perpendiculars: ${triPerp.iterations} iterations (cap ${300})`);
  check('impossible perpendiculars are reported as over-constrained, not silently picked',
    triPerp.overConstrained, `residual ${triPerp.residual.toFixed(3)}`);
  check('...with finite points throughout',
    triPerp.points.every((p) => Number.isFinite(p[0]) && Number.isFinite(p[1])),
    JSON.stringify(triPerp.points));

  // All three relation kinds at once on one small polygon: they must not
  // crash or fight into NaN, even if the result is over-constrained.
  const mixed = S.solveSketch(rect(), [
    { kind: 'equal', edge: 0, other: 1 },
    { kind: 'parallel', edge: 0, other: 2 },
    { kind: 'perpendicular', edge: 1, other: 3 },
  ]);
  check('equal + parallel + perpendicular coexist without NaN',
    Number.isFinite(mixed.residual)
    && mixed.points.every((p) => Number.isFinite(p[0]) && Number.isFinite(p[1])),
    `residual ${mixed.residual}`);

  // ------------------------------------------------------------------
  // residualsOf -- WHICH rules disagree, not just that some do.
  //
  // The panel turns a cell red off these numbers, so the thing worth testing
  // is discrimination: the culprits must come back above tolerance AND an
  // innocent rule in the same sketch must come back below it. A function that
  // flagged everything would satisfy "the culprits are flagged" and be useless.
  console.log('\n=== which rules disagree (residualsOf) ===');

  const TOL = 1e-3;

  // A sketch where every rule is satisfiable: nothing should be flagged.
  const happy = [
    { kind: 'horizontal', edge: 0 },
    { kind: 'length', edge: 0, value: 40 },
    { kind: 'lock', corner: 0 },
  ];
  const happySolved = S.solveSketch(rect(), happy);
  const happyR = S.residualsOf(happySolved.points, happy);
  check('one residual per constraint, in order', happyR.length === happy.length,
    `got ${happyR.length} for ${happy.length}`);
  check('a satisfiable sketch flags nothing', happyR.every((r) => r < TOL),
    JSON.stringify(happyR));
  check('a lock reports no residual', happyR[2] === 0, String(happyR[2]));

  // NOT horizontal+vertical on one edge, which looks like the obvious
  // contradiction and is not one: the solver satisfies BOTH by collapsing the
  // edge to zero length, and every residual comes back ~1e-8. Measured here
  // 2026-08-29 when this test was written expecting a conflict and got none.
  // Two different lengths on one edge is a real contradiction -- no geometry
  // satisfies both.
  const fight = [
    { kind: 'length', edge: 0, value: 40 },
    { kind: 'length', edge: 0, value: 10 },
    { kind: 'length', edge: 1, value: 25 },   // innocent bystander, already true
  ];
  const fightSolved = S.solveSketch(rect(), fight);
  const fightR = S.residualsOf(fightSolved.points, fight);
  const flagged = fightR.map((r) => r > TOL);
  check('a contradiction flags at least one of the two rules in it',
    flagged[0] || flagged[1], JSON.stringify(fightR));
  check('...and does NOT flag the satisfied bystander', !flagged[2],
    `bystander residual ${fightR[2]}`);
  check('so the flags discriminate rather than lighting everything up',
    flagged.some(Boolean) && !flagged.every(Boolean), JSON.stringify(flagged));

  // residualOf must stay the max of residualsOf -- they are one calculation,
  // and a drift between them is how the header and the cells start disagreeing.
  for (const [label, pts, cs] of [
    ['satisfiable', happySolved.points, happy],
    ['contradictory', fightSolved.points, fight],
    ['impossible triangle', triPerp.points, [
      { kind: 'perpendicular', edge: 0, other: 1 },
      { kind: 'perpendicular', edge: 1, other: 2 },
      { kind: 'perpendicular', edge: 2, other: 0 },
    ]],
  ]) {
    check(`residualOf === max(residualsOf) -- ${label}`,
      near(S.residualOf(pts, cs), Math.max(0, ...S.residualsOf(pts, cs)), 1e-9));
  }

  check('no constraints means no residuals', S.residualsOf(rect(), []).length === 0);

  console.log(`\n${fails.length ? 'FAIL' : 'ALL PASS'}  (${pass} assertions${fails.length ? ', ' + fails.length + ' failed: ' + fails.join(', ') : ''})`);
  return fails.length === 0;
};
