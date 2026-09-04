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

  if (deltas.length) {
    console.log('\n=== HOW THIS SOLVER SETTLES (reported, never gated) ===');
    for (const [name, detail] of deltas) {
      console.log('  ~  ' + name + '\n       ' + String(detail).replace(/\s+/g, ' ').trim());
    }
  }

  console.log(`\n${fails.length ? 'FAIL' : 'ALL PASS'}  (${pass} assertions${fails.length ? ', ' + fails.length + ' failed: ' + fails.join(', ') : ''})`);
  return fails.length === 0;
};
