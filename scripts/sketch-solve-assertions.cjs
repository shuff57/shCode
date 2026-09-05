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

  // A fact about HOW THIS SOLVER settles, not about whether it is right.
  // Reported, never gated -- the same bargain scripts/test-moshion.mjs makes
  // with its deliberate p5play deltas.
  //
  // The distinction is load-bearing now that the solver is being replaced.
  // Relaxation nudges every constraint a little each pass, so when a rule can
  // be satisfied more than one way it lands in the middle of the options. A
  // matrix solver reaches a different resting place and is exactly as correct.
  // An assertion that pins the resting place would fail the new solver for not
  // being the old one, which is the single most likely way this swap gets
  // talked out of a correct answer.
  const deltas = [];
  const delta = (name, detail) => { deltas.push([name, detail]); };

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
  delta('relaxation meets in the middle rather than dragging one corner to the other',
    `both ends of the levelled edge sat at y=${flat.points[0][1].toFixed(3)}; the edge ran `
    + `0 to 6, so the midpoint is 3. Any y is correct as long as the two agree, which is
       what the PASS above actually checks`);

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
  delta('relaxation converges on a satisfiable box well inside its iteration cap',
    `${boxed.iterations} of 300. A solver without a relaxation loop has no`
    + ' comparable number; what has to stay true is that the rules come out met,'
    + ' which the PASS above checks.');

  // A rectangle born from the Sketch/Rectangle tools carries these four rules
  // from the start (lib/model-types.ts, RECTANGLE_CONSTRAINTS) precisely so
  // typing a Length does not need re-squaring by hand. Measured 2026-09-03: a
  // FREE rectangle (no h/v rules) that had 40 and 20 typed onto two edges
  // settled at 40 / 20 / 40.1 / 24.9, not a rectangle at all. Feeding the
  // edits through one at a time, the way the Dimensions panel actually
  // commits them, is the real path -- a single combined solve can hide a
  // per-step regression a sequential one would not.
  const rectRules = [
    { kind: 'horizontal', edge: 0 },
    { kind: 'vertical', edge: 1 },
    { kind: 'horizontal', edge: 2 },
    { kind: 'vertical', edge: 3 },
  ];
  const step1 = S.solveSketch(rect(), [...rectRules, { kind: 'length', edge: 0, value: 40 }]);
  const step2 = S.solveSketch(step1.points, [
    ...rectRules, { kind: 'length', edge: 0, value: 40 }, { kind: 'length', edge: 1, value: 20 },
  ]);
  check('a born-rectangle sketch stays exactly 40 x 20 after typing both lengths',
    near(S.edgeLength(step2.points, 0), 40, 1e-5)
    && near(S.edgeLength(step2.points, 1), 20, 1e-5)
    && near(S.edgeLength(step2.points, 2), 40, 1e-5)
    && near(S.edgeLength(step2.points, 3), 20, 1e-5),
    JSON.stringify(step2.points.map((p) => p.map((n) => +n.toFixed(3)))));
  const edgeVec = (pts, n) => {
    const [a, b] = S.edgeCorners(n, pts.length);
    return [pts[b][0] - pts[a][0], pts[b][1] - pts[a][1]];
  };
  // The COSINE of the angle between consecutive edges, not the raw dot
  // product: a raw dot product is scaled by both edges' lengths (here
  // roughly 40 x 20 = 800), so an absolute 1e-6 bar on it is really an angle
  // bar 800x LOOSER than 1e-6 on one edge pair and tighter on another.
  // Dividing out both lengths makes it a comparison of angle alone --
  // cos(90 degrees) = 0 -- which is what "right angles within 1e-6" means
  // for a shape whose own size is not 1 unit.
  check('...with actual right angles, not just the right side lengths',
    [0, 1, 2, 3].every((n) => {
      const e0 = edgeVec(step2.points, n);
      const e1 = edgeVec(step2.points, (n + 1) % 4);
      const l0 = Math.hypot(e0[0], e0[1]);
      const l1 = Math.hypot(e1[0], e1[1]);
      return Math.abs((e0[0] * e1[0] + e0[1] * e1[1]) / (l0 * l1)) < 1e-6;
    }),
    JSON.stringify(step2.points));

  // Stacking equal/parallel/perpendicular rules one at a time -- exactly the
  // order a student builds them in the Rules panel -- used to blow up:
  // measured 2026-09-03, a starting quad plus two lengths plus two
  // perpendicular rules plus a THIRD collapsed two corners onto each other
  // (residual 23.3) instead of landing on the achievable 40 x 20 rectangle
  // one basin over, and removing the offending rule again did not recover --
  // it stayed at the bad point because nothing in the solver was anchored to
  // anywhere else. The fixture below is the literal sequence that produced
  // it: a non-axis-aligned starting quad (a freshly dragged rectangle is
  // never axis-aligned), two lengths, two perpendicular rules, then the
  // third.
  let stackPts = [[0, 0], [6.4, 0], [6.4, 15.7], [0, 15.7]];
  const stack = (cs) => { const r = S.solveSketch(stackPts, cs); stackPts = r.points; return r; };
  stack([{ kind: 'length', edge: 0, value: 40 }]);
  stack([{ kind: 'length', edge: 0, value: 40 }, { kind: 'length', edge: 1, value: 20 }]);
  stack([
    { kind: 'length', edge: 0, value: 40 }, { kind: 'length', edge: 1, value: 20 },
    { kind: 'perpendicular', edge: 0, other: 1 },
  ]);
  const twoPerp = stack([
    { kind: 'length', edge: 0, value: 40 }, { kind: 'length', edge: 1, value: 20 },
    { kind: 'perpendicular', edge: 0, other: 1 }, { kind: 'perpendicular', edge: 1, other: 2 },
  ]);
  check('two perpendicular rules on top of two lengths settle, not just avoid NaN',
    !twoPerp.overConstrained, `residual ${twoPerp.residual}`);
  const preThird = stackPts.map((p) => p.slice());
  const scaleOf = (pts) => Math.max(1, Math.hypot(
    Math.max(...pts.map((p) => p[0])) - Math.min(...pts.map((p) => p[0])),
    Math.max(...pts.map((p) => p[1])) - Math.min(...pts.map((p) => p[1])),
  ));
  const threePerp = stack([
    { kind: 'length', edge: 0, value: 40 }, { kind: 'length', edge: 1, value: 20 },
    { kind: 'perpendicular', edge: 0, other: 1 }, { kind: 'perpendicular', edge: 1, other: 2 },
    { kind: 'perpendicular', edge: 2, other: 3 },
  ]);
  check('a third perpendicular rule settles too, rather than exploding to thousands of mm',
    !threePerp.overConstrained && scaleOf(threePerp.points) < 10 * scaleOf(preThird),
    `residual ${threePerp.residual}, scale ${scaleOf(threePerp.points)} vs pre-rule ${scaleOf(preThird)}`);
  const afterRemoval = stack([
    { kind: 'length', edge: 0, value: 40 }, { kind: 'length', edge: 1, value: 20 },
    { kind: 'perpendicular', edge: 0, other: 1 }, { kind: 'perpendicular', edge: 1, other: 2 },
  ]);
  const minEdge = Math.min(...[0, 1, 2, 3].map((n) => S.edgeLength(afterRemoval.points, n)));
  check('removing the offending rule settles on a real quadrilateral, not a collapsed one',
    !afterRemoval.overConstrained && minEdge > 1,
    `residual ${afterRemoval.residual}, shortest edge ${minEdge}`);

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

  // Making two edges parallel must not wreck the shape. What "wreck" means is
  // the triage worth writing down, because the old relaxation preserved length
  // EXACTLY -- it rotated each edge about a chosen pivot, so length could not
  // change by construction -- and a least-squares solver has no such guarantee:
  // it moves corners, and a small length change is a legitimate part of the
  // cheapest arrangement that makes the rule true.
  //
  // So the bar is proportion, not equality. 0.5% is far tighter than anything a
  // student could see and far looser than a defect: the first version of this
  // solver, before the smallest-change term existed, stretched this same edge
  // from 40 to 265. That is what this check is for. The exact-preservation
  // property is reported below as a delta rather than demanded.
  const lenBefore = [S.edgeLength(lean2, 0), S.edgeLength(lean2, 2)];
  const parLen = S.solveSketch(lean2, [{ kind: 'parallel', edge: 0, other: 2 }]);
  const drift = (got, want) => Math.abs(got - want) / want;
  const d0 = drift(S.edgeLength(parLen.points, 0), lenBefore[0]);
  const d2 = drift(S.edgeLength(parLen.points, 2), lenBefore[1]);
  check('parallel does not stretch either edge (no corner pinned)',
    d0 < 0.005 && d2 < 0.005,
    `${(d0 * 100).toFixed(2)}% and ${(d2 * 100).toFixed(2)}% -- a stretch, not a rotation`);
  delta('edge length is preserved to about a quarter of a percent, not exactly',
    `${(d0 * 100).toFixed(3)}% and ${(d2 * 100).toFixed(3)}%. Relaxation held it exactly by`
    + ' rotating about a pivot; least squares trades a hair of length for the'
    + ' cheapest arrangement overall. Either is correct -- what matters is that'
    + ' the shape survives, which the PASS above checks.');

  // Pin one endpoint of edge 0; the pivot must move to the other endpoint so
  // the edge still rotates without changing length, and the pin never moves.
  const parPin = S.solveSketch(lean2, [
    { kind: 'parallel', edge: 0, other: 2 },
    { kind: 'lock', corner: 0 },
  ]);
  const dPin = Math.abs(S.edgeLength(parPin.points, 0) - lenBefore[0]) / lenBefore[0];
  check('...and does not stretch it with one corner pinned either',
    dPin < 0.005,
    `${(dPin * 100).toFixed(2)}% -- before the smallest-change term this was 399 against 40`);
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

  console.log('\n=== which EDGES lose, not which rules ===');

  // losingEdges is what turns geometry red. Its failure mode is the one the
  // canvas chips already shipped once and had to be corrected: reddening an
  // innocent neighbour, which says "this is a culprit" about something that is
  // not. Every check here is about discrimination, not about detection.
  const litEdges = S.losingEdges(fightSolved.points, fight);
  check('a contradiction reddens the edge it is about', litEdges.includes(0),
    JSON.stringify(litEdges));
  check('...and leaves the satisfied edge alone', !litEdges.includes(1),
    JSON.stringify(litEdges));

  check('a satisfiable sketch reddens nothing',
    S.losingEdges(happySolved.points, happy).length === 0,
    JSON.stringify(S.losingEdges(happySolved.points, happy)));

  // Measured on raw points rather than a solve: this is the pure mapping from
  // rule to edges, and a solver that happened to settle it would hide it.
  const unmetPair = S.losingEdges(rect(), [{ kind: 'equal', edge: 0, other: 1 }]);
  check('an unmet pair rule reddens BOTH its edges, not an arbitrary one',
    JSON.stringify(unmetPair) === '[0,1]', JSON.stringify(unmetPair));

  check('a lock never reddens an edge -- it names a corner',
    S.losingEdges(rect(), [{ kind: 'lock', corner: 0 }]).length === 0);

  const dup = S.losingEdges(rect(), [
    { kind: 'equal', edge: 1, other: 0 },
    { kind: 'length', edge: 0, value: 999 },
  ]);
  check('an edge named by two losing rules appears once, and the list is sorted',
    JSON.stringify(dup) === '[0,1]', JSON.stringify(dup));

  // The panel and the canvas must agree about who is in trouble: every edge
  // reddened has to be named by a rule the panel would mark, and vice versa.
  const panelEdges = new Set();
  fight.forEach((c, i) => {
    if (S.residualsOf(fightSolved.points, fight)[i] <= 1e-3) return;
    panelEdges.add(c.edge);
    if ('other' in c) panelEdges.add(c.other);
  });
  check('the red edges are exactly the edges the panel marks rules on',
    JSON.stringify([...panelEdges].sort((a, b) => a - b)) === JSON.stringify(litEdges),
    JSON.stringify([...panelEdges]) + ' vs ' + JSON.stringify(litEdges));

  // A conflict banner reported on the CANVAS (HandleOverlay.tsx) and in the
  // RULES PANEL (SketchConstraints.tsx) both key off losingEdges()/residualOf
  // freshly, every render, off whichever sketch is currently selected -- so
  // the pin here is that the FUNCTION itself carries no memory of a previous
  // sketch's trouble: a conflicting doc followed by an unrelated, unconflicted
  // one must come back clean, not still flagged. (Measured 2026-09-04: the
  // lens's own persisting banner turned out to be a DIFFERENT, unrelated
  // message -- ReshapeParamsPanel's `stale === 'empty'` notice, which
  // SandboxWorkspace.tsx sets from the B-rep viewport's triangle count and
  // which fires on ANY bare, not-yet-pulled sketch, conflict or not, freshly
  // drawn or not. This solver-side claim was already true; it is pinned here
  // so a future change to losingEdges/residualOf cannot quietly reintroduce
  // cross-sketch leakage without a test noticing.)
  const conflicting = S.losingEdges(fightSolved.points, fight);
  check('a genuinely conflicting sketch reddens something, to set up the next check',
    conflicting.length > 0, JSON.stringify(conflicting));
  const unrelatedCircle = [[-10, 0], [10, 0]];
  check('an unrelated sketch solved right after reddens nothing left over',
    S.losingEdges(unrelatedCircle, []).length === 0,
    JSON.stringify(S.losingEdges(unrelatedCircle, [])));
  check('...and its residual reads clean, not the previous sketch\'s',
    S.residualOf(unrelatedCircle, []) === 0);

  console.log('\n=== addConstraintSettling: the rule you just made wins, not the banner ===');

  // rect() = [[0,0],[40,0],[40,25],[0,25]], no h/v of its own. Edge 1
  // (index 1)'s length is the OLDER rule here on purpose -- it sits FIRST
  // in the array, matching the array-order convention every
  // SketchConstraints.tsx handler already appends to (oldest first).
  const startRect = rect();
  const beforeEqual = [
    { kind: 'length', edge: 1, value: 20 },
    { kind: 'length', edge: 0, value: 40 },
  ];
  const afterEqual = [...beforeEqual, { kind: 'equal', edge: 0, other: 1 }];
  check('the raw addition really would be a conflict -- both lengths fixed AND made equal',
    S.solveSketch(startRect, afterEqual).overConstrained, 'setup check, not the fix under test');

  const settledEqual = S.addConstraintSettling(startRect, afterEqual);
  check('cycling Edges 1&2 to equal settles clean -- no conflict left standing',
    !S.solveSketch(startRect, settledEqual.constraints).overConstrained,
    JSON.stringify(settledEqual));
  check('...by dropping edge 1\'s length rule specifically (the OLDER of the two, not edge 0\'s)',
    settledEqual.removed && settledEqual.removed.kind === 'length' && settledEqual.removed.edge === 1
    && settledEqual.constraints.some((c) => c.kind === 'length' && c.edge === 0 && c.value === 40)
    && !settledEqual.constraints.some((c) => c.kind === 'length' && c.edge === 1),
    JSON.stringify(settledEqual));
  check('...and the note reads exactly the sentence a beginner needs',
    S.describeRemovalNote(settledEqual.removed, afterEqual[afterEqual.length - 1])
      === 'Edge 2 no longer has to stay 20 long so edge 1 can stay the same length as edge 2. '
        + 'Undo puts it back.',
    S.describeRemovalNote(settledEqual.removed, afterEqual[afterEqual.length - 1]));

  // Then: typing 25 into edge 1's Length box. setLength() always filters out
  // any EXISTING length rule on that same edge before appending the new one
  // (SketchConstraints.tsx's own convention) -- so this is a plain add, not
  // a second settling case, and it should need no removal at all.
  const afterLength = [
    ...settledEqual.constraints.filter((c) => !(c.kind === 'length' && c.edge === 0)),
    { kind: 'length', edge: 0, value: 25 },
  ];
  const settledLength = S.addConstraintSettling(startRect, afterLength);
  check('typing 25 on edge 1 needs no removal at all -- it never conflicted with equal',
    settledLength.removed === null, JSON.stringify(settledLength));
  const bothAt25 = S.solveSketch(startRect, settledLength.constraints);
  check('...and both edges actually settle at 25',
    near(S.edgeLength(bothAt25.points, 0), 25) && near(S.edgeLength(bothAt25.points, 1), 25),
    JSON.stringify(bothAt25.points));

  // The banner still has to be the honest answer when NO single removal
  // would fix it -- addConstraintSettling must not invent a multi-rule
  // rewrite just to make the red banner go away. Three DIFFERENT lengths on
  // the SAME edge is exactly that: dropping any one of the three still
  // leaves two different values fighting over the same edge, so no single
  // removal ever clears it (unlike three mutually perpendicular triangle
  // edges, where dropping any ONE of the three resolves it immediately --
  // measured while writing this test, and the wrong fixture to use here).
  const trulyStuck = S.addConstraintSettling(rect(), [
    { kind: 'length', edge: 0, value: 10 },
    { kind: 'length', edge: 0, value: 20 },
    { kind: 'length', edge: 0, value: 30 },
  ]);
  check('a conflict that needs more than one rule gone is left alone -- banner included',
    trulyStuck.removed === null && trulyStuck.constraints.length === 3,
    JSON.stringify(trulyStuck));

  console.log('\n=== a lock is the last resort, not just whichever removal leaves more area (item I) ===');

  // Corners 0 and 1 locked at DIFFERENT y's -- a direct contradiction with
  // `horizontal` on edge 0, which demands they match. Two removals each
  // resolve it alone: drop edge 0's horizontal rule (a real, non-degenerate
  // quad, area 100) or drop corner 0's lock (a bigger rectangle, area 800).
  // Pure area-maximising picks the lock every time; a lock must lose only
  // when nothing else can settle it.
  const lockQuad = [[0, 0], [40, 45], [40, 25], [0, 25]];
  const lockCS = [
    { kind: 'horizontal', edge: 0 }, { kind: 'vertical', edge: 1 },
    { kind: 'horizontal', edge: 2 }, { kind: 'vertical', edge: 3 },
    { kind: 'lock', corner: 0 }, { kind: 'lock', corner: 1 },
  ];
  const lockSettled = S.addConstraintSettling(lockQuad, lockCS);
  check('...setup: this really is a conflict that needs a removal',
    S.solveSketch(lockQuad, lockCS).overConstrained, 'setup check, not the fix under test');
  check('locking corner 1 after corner 0 is already locked drops edge 0\'s '
    + 'horizontal rule, not either lock',
    lockSettled.removed && lockSettled.removed.kind === 'horizontal' && lockSettled.removed.edge === 0
    && lockSettled.constraints.some((c) => c.kind === 'lock' && c.corner === 0)
    && lockSettled.constraints.some((c) => c.kind === 'lock' && c.corner === 1),
    JSON.stringify(lockSettled));
  check('...and both locked corners genuinely hold in the result',
    (() => {
      const solved = S.solveSketch(lockQuad, lockSettled.constraints);
      return near(solved.points[0][0], 0) && near(solved.points[0][1], 0)
        && near(solved.points[1][0], 40) && near(solved.points[1][1], 45);
    })(),
    JSON.stringify(S.solveSketch(lockQuad, lockSettled.constraints).points));

  // A fresh lock on a sketch that is not otherwise in any conflict must
  // simply hold -- no removal, no banner, same as any other harmless add.
  const freshLockCS = [
    { kind: 'horizontal', edge: 0 }, { kind: 'vertical', edge: 1 },
    { kind: 'horizontal', edge: 2 }, { kind: 'vertical', edge: 3 },
    { kind: 'lock', corner: 2 },
  ];
  const freshLockSettled = S.addConstraintSettling(rect(), freshLockCS);
  check('a fresh lock on an unconflicted sketch simply holds -- nothing removed',
    freshLockSettled.removed === null && freshLockSettled.constraints.length === freshLockCS.length,
    JSON.stringify(freshLockSettled));

  // The order the addendum named directly: a between-edges rule set FIRST,
  // then a corner locked -- must not silently drop the just-added lock, and
  // must not drop any EARLIER lock either when a non-lock removal exists.
  const pairThenLockBase = [
    { kind: 'horizontal', edge: 0 }, { kind: 'horizontal', edge: 2 },
    { kind: 'vertical', edge: 3 }, { kind: 'horizontal', edge: 1 },
  ];
  const pairThenLockCS = [...pairThenLockBase, { kind: 'lock', corner: 2 }];
  const pairThenLockPts = [[0, 0], [40, 0], [55, 25], [0, 25]];
  const pairThenLockSettled = S.addConstraintSettling(pairThenLockPts, pairThenLockCS);
  check('a lock added after a between-edges/other rule is already set is not itself dropped',
    pairThenLockSettled.constraints.some((c) => c.kind === 'lock' && c.corner === 2),
    JSON.stringify(pairThenLockSettled));

  console.log('\n=== a between-edges rule must not collapse the sketch (S09/S10/S11) ===');

  // Solve a freshly-added rule the way the app actually does: settle it
  // (which may drop an older rule), then solve the settled constraints from
  // seedForNewRule's own seed -- the same two calls
  // SketchConstraints.settle() and ModelEditor.setConstraints both make.
  const applyRule = (points, constraints) => {
    const settled = S.addConstraintSettling(points, constraints);
    const seed = S.seedForNewRule(points, settled.constraints);
    const solved = S.solveSketch(seed, settled.constraints);
    return { settled, solved };
  };
  const quadArea = (p) => {
    let a = 0;
    for (let i = 0; i < p.length; i++) {
      const [x1, y1] = p[i];
      const [x2, y2] = p[(i + 1) % p.length];
      a += x1 * y2 - x2 * y1;
    }
    return Math.abs(a) / 2;
  };
  const withinQuarter = (before, after, n) =>
    S.edgeLength(after, n) >= 0.25 * S.edgeLength(before, n);

  // S09: a genuine trapezoid (edge 0 flat, edge 2 sloped) made parallel
  // between edges 1 and 3 (design edges 0 and 2, "Edges 1 and 3" in the
  // panel). Regression for the sliver: this same rule on this same
  // trapezoid used to snap all four corners to one `across` value, a
  // ~0.3mm-wide degenerate outline, reported as residual 0.
  const trapezoid = [[0, 0], [40, 0], [40, 15], [0, 25]];
  const trapCS = [
    { kind: 'horizontal', edge: 0 }, { kind: 'vertical', edge: 1 }, { kind: 'vertical', edge: 3 },
    { kind: 'parallel', edge: 0, other: 2 },
  ];
  const par09 = applyRule(trapezoid, trapCS);
  check('parallel on the S09 trapezoid needs nothing removed -- nothing here actually conflicts',
    par09.settled.removed === null, JSON.stringify(par09.settled.removed));
  check('...every edge keeps at least 25% of its length from before the rule',
    [0, 1, 2, 3].every((n) => withinQuarter(trapezoid, par09.solved.points, n)),
    JSON.stringify([0, 1, 2, 3].map((n) =>
      (S.edgeLength(par09.solved.points, n) / S.edgeLength(trapezoid, n)).toFixed(3))));
  check('...the outline keeps at least 25% of its own area',
    quadArea(par09.solved.points) >= 0.25 * quadArea(trapezoid),
    `${quadArea(par09.solved.points).toFixed(1)} vs ${quadArea(trapezoid)} before`);
  check('...the gate agrees nothing collapsed',
    !S.collapsedByRatio(trapezoid, par09.solved.points));
  check('...and edges 1 and 3 actually end up parallel, not just uncollapsed',
    near(angleDiff(edgeAngle(par09.solved.points, 0), edgeAngle(par09.solved.points, 2)), 0, 1e-2),
    JSON.stringify([edgeAngle(par09.solved.points, 0), edgeAngle(par09.solved.points, 2)]));

  // S10: the same quad shape, `perpendicular` between edges 1 and 3 while
  // BOTH already carry their own `across` (horizontal) rule -- a genuine
  // disagreement (edge 1 and edge 3 cannot stay horizontal AND become
  // perpendicular to each other), so exactly one older rule has to go.
  const s10Quad = [[0, 0], [40, 0], [50, 25], [0, 25]];
  const s10CS = [
    { kind: 'horizontal', edge: 0 }, { kind: 'horizontal', edge: 2 }, { kind: 'vertical', edge: 3 },
    { kind: 'perpendicular', edge: 0, other: 2 },
  ];
  const perp10 = applyRule(s10Quad, s10CS);
  check('perpendicular on the S10 quad settles by dropping exactly one older rule',
    perp10.settled.removed !== null && perp10.settled.constraints.length === 3,
    JSON.stringify(perp10.settled));
  check('...every edge keeps at least 25% of its length from before the rule',
    [0, 1, 2, 3].every((n) => withinQuarter(s10Quad, perp10.solved.points, n)),
    JSON.stringify([0, 1, 2, 3].map((n) =>
      (S.edgeLength(perp10.solved.points, n) / S.edgeLength(s10Quad, n)).toFixed(3))));
  check('...the outline keeps at least 25% of its own area',
    quadArea(perp10.solved.points) >= 0.25 * quadArea(s10Quad),
    `${quadArea(perp10.solved.points).toFixed(1)} vs ${quadArea(s10Quad)} before`);
  check('...edges 1 and 3 actually end up perpendicular',
    near(Math.abs(angleDiff(edgeAngle(perp10.solved.points, 0), edgeAngle(perp10.solved.points, 2))),
      Math.PI / 2, 1e-2));
  check('...and the note reads as information, in the course\'s own words, not an error',
    S.describeRemovalNote(perp10.settled.removed, s10CS[s10CS.length - 1]).endsWith('Undo puts it back.'),
    S.describeRemovalNote(perp10.settled.removed, s10CS[s10CS.length - 1]));

  // S11: pressing "Edge 2 across" while "Edge 3 across" is already on --
  // over-constrained in a way that used to satisfy every residual at once by
  // collapsing the whole outline flat (residual 0, nothing flagged), which
  // addConstraintSettling's old overConstrained-only check could not see.
  const s11Quad = [[0, 0], [40, 0], [55, 25], [0, 25]];
  const s11CS = [
    { kind: 'horizontal', edge: 0 }, { kind: 'horizontal', edge: 2 }, { kind: 'vertical', edge: 3 },
    { kind: 'horizontal', edge: 1 },
  ];
  const h11 = applyRule(s11Quad, s11CS);
  check('S11 succeeds on the first press by dropping edge 3\'s across rule specifically',
    h11.settled.removed && h11.settled.removed.kind === 'horizontal' && h11.settled.removed.edge === 2,
    JSON.stringify(h11.settled.removed));
  check('...not by silently collapsing the sketch (the old bug: residual 0, ratio ~0)',
    !S.collapsedByRatio(s11Quad, h11.solved.points), JSON.stringify(h11.solved.points));

  // equal on two adjacent edges (design edges 0 and 1, sharing corner 1) --
  // a sizeable length difference, nothing else in the way, so this is the
  // "fewest movers" attempt on its own: edge 0 should not move at all.
  const adjacentQuad = [[0, 0], [40, 0], [40, 10], [0, 10]];
  const adjacentCS = [{ kind: 'equal', edge: 0, other: 1 }];
  const eqAdj = applyRule(adjacentQuad, adjacentCS);
  check('equal on two adjacent edges needs nothing removed',
    eqAdj.settled.removed === null, JSON.stringify(eqAdj.settled.removed));
  check('...the shared edge (edge 0) does not move at all',
    eqAdj.solved.points[0][0] === adjacentQuad[0][0] && eqAdj.solved.points[0][1] === adjacentQuad[0][1]
    && eqAdj.solved.points[1][0] === adjacentQuad[1][0] && eqAdj.solved.points[1][1] === adjacentQuad[1][1],
    JSON.stringify(eqAdj.solved.points));
  check('...both edges land at the same length',
    near(S.edgeLength(eqAdj.solved.points, 0), S.edgeLength(eqAdj.solved.points, 1), 1e-2),
    `${S.edgeLength(eqAdj.solved.points, 0)} vs ${S.edgeLength(eqAdj.solved.points, 1)}`);
  check('...every edge keeps at least 25% of its length from before the rule',
    [0, 1, 2, 3].every((n) => withinQuarter(adjacentQuad, eqAdj.solved.points, n)),
    JSON.stringify([0, 1, 2, 3].map((n) =>
      (S.edgeLength(eqAdj.solved.points, n) / S.edgeLength(adjacentQuad, n)).toFixed(3))));
  check('...the outline keeps at least 25% of its own area',
    quadArea(eqAdj.solved.points) >= 0.25 * quadArea(adjacentQuad),
    `${quadArea(eqAdj.solved.points).toFixed(1)} vs ${quadArea(adjacentQuad)} before`);

  if (deltas.length) {
    console.log('\n=== HOW THIS SOLVER SETTLES (reported, never gated) ===');
    for (const [name, detail] of deltas) {
      console.log('  ~  ' + name + '\n       ' + String(detail).replace(/\s+/g, ' ').trim());
    }
  }

  console.log(`\n${fails.length ? 'FAIL' : 'ALL PASS'}  (${pass} assertions${fails.length ? ', ' + fails.length + ' failed: ' + fails.join(', ') : ''})`);
  return fails.length === 0;
};
