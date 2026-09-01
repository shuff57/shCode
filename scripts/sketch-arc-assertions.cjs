// Assertions for lib/sketch-arc.ts.
//
// The rectangle is a degenerate fixture for anything trim-distance shaped: at
// a 90-degree corner, r/tan(45deg) === r, so a correct implementation and one
// that just trims by r produce the same numbers. Every fillet check below
// uses a non-90-degree corner (a 3-4-5-shaped right triangle) so a wrong trim
// formula actually shows up as a wrong answer.

module.exports = function run(dir) {
  const path = require('path');
  const fs = require('fs');
  const A = require(path.join(dir, 'sketch-arc.js'));

  let pass = 0;
  const fails = [];
  const check = (name, ok, detail) => {
    if (ok) { pass++; console.log(`  PASS  ${name}`); }
    else { fails.push(name); console.log(`  FAIL  ${name}${detail ? ' -- ' + detail : ''}`); }
  };

  const near = (a, b, tol = 1e-3) => Math.abs(a - b) < tol;

  // A right triangle with legs 40 and 30 (a 3-4-5 shape), corner 1 = [40, 0]
  // is the non-90-degree corner (its interior angle is atan(30/40) doubled,
  // ~36.87 degrees, not 90) -- the deliberate escape from the rectangle trap.
  const triangle = [[0, 0], [40, 0], [0, 30]];

  console.log('\n=== filletCorner: trim distance on a non-90-degree corner ===');

  const filleted = A.filletCorner({ points: triangle }, 1, 5);
  check('#1 the sharp corner is replaced by two trim points',
    filleted.points.length === 4, JSON.stringify(filleted.points));
  check('#1 trimmed by r/tan(interior/2) = 15, not by r = 5 (the rectangle-trap answer)',
    near(filleted.points[1][0], 25) && near(filleted.points[1][1], 0)
    && near(filleted.points[2][0], 28) && near(filleted.points[2][1], 9),
    `got ${JSON.stringify([filleted.points[1], filleted.points[2]])}, `
      + `a broken trim-by-r implementation would give [[35,0],[36,3]]`);
  check('...the untouched corners are still exactly where they were',
    filleted.points[0][0] === 0 && filleted.points[0][1] === 0
    && filleted.points[3][0] === 0 && filleted.points[3][1] === 30);

  console.log('\n=== filletCorner: the bulge it writes ===');

  check('#2 bulge is tan(sweep/4) with sweep = 180 - interior = 143.13deg, not the 90-degree answer',
    near(filleted.bulges[1], Math.tan((143.1301 * Math.PI / 180) / 4), 1e-4),
    `got ${filleted.bulges[1]}, a hardcoded-90-degree implementation would give 0.414214`);

  console.log('\n=== arcFromBulge: rebuilding the arc from its two endpoints ===');

  const arc = A.arcFromBulge(filleted.points[1], filleted.points[2], filleted.bulges[1]);
  check('#3 the center lands INSIDE the corner, not outside it',
    near(arc.center[0], 25, 0.01) && near(arc.center[1], 5, 0.01),
    `got ${JSON.stringify(arc.center)}, a sign-flipped implementation would give [28, 4]`);
  check('...and the radius matches the one filletCorner was asked for',
    near(arc.radius, 5, 0.01), String(arc.radius));

  console.log('\n=== filletCorner: constraint and bulge reindexing ===');

  const rect = () => [[0, 0], [40, 0], [40, 25], [0, 25]];

  const cFilleted = A.filletCorner({
    points: rect(),
    constraints: [
      { kind: 'horizontal', edge: 0 },
      { kind: 'vertical', edge: 1 },
      { kind: 'lock', corner: 2 },
    ],
  }, 1, 5);
  check('#4 the edge before the rounded corner keeps its index',
    cFilleted.constraints.some((c) => c.kind === 'horizontal' && c.edge === 0),
    JSON.stringify(cFilleted.constraints));
  check('#4 the edge after shifts past the new arc edge (index 1 -> 2), not left pointing at the arc',
    cFilleted.constraints.some((c) => c.kind === 'vertical' && c.edge === 2)
    && !cFilleted.constraints.some((c) => c.kind === 'vertical' && c.edge === 1),
    JSON.stringify(cFilleted.constraints));
  check('#4 the locked corner shifts from 2 to 3, not left on the wrong point',
    cFilleted.constraints.some((c) => c.kind === 'lock' && c.corner === 3)
    && !cFilleted.constraints.some((c) => c.kind === 'lock' && c.corner === 2),
    JSON.stringify(cFilleted.constraints));

  const eFilleted = A.filletCorner({
    points: rect(),
    constraints: [{ kind: 'equal', edge: 0, other: 2 }],
  }, 1, 5);
  check('#5 equal reindexes BOTH edge and other, not just edge',
    eFilleted.constraints.some((c) => c.kind === 'equal' && c.edge === 0 && c.other === 3),
    `got ${JSON.stringify(eFilleted.constraints)}, an implementation that only maps the ` +
    `first field would silently equate the bottom edge to the new arc (other: 2)`);

  console.log('\n=== filletCorner: a radius bigger than the corner can take (Finding 1) ===');

  // A thin spike: interior angle ~11.5deg, both adjacent edges length
  // ~10.05. The OLD angle-blind maxFilletRadius would have called radius=5
  // safe (half of 10.05 is ~5.02) -- but trim = radius/tan(interior/2) at
  // that angle is roughly 10x the radius, so a radius of 5 trims ~50 units
  // down an edge that is only ~10 units long: straight through the far
  // corner and out the other side, self-crossing the outline.
  const spike = [[-1, 10], [0, 0], [1, 10]];
  const spikeLenIn = Math.hypot(spike[0][0] - spike[1][0], spike[0][1] - spike[1][1]);
  const spikeLenOut = Math.hypot(spike[2][0] - spike[1][0], spike[2][1] - spike[1][1]);
  const spikeFilleted = A.filletCorner({ points: spike }, 1, 5);
  const spikeTrim = Math.hypot(
    spikeFilleted.points[1][0] - spike[1][0], spikeFilleted.points[1][1] - spike[1][1]
  );
  check('#7 asking for radius 5 on a corner that can only take ~0.5 does not overrun the edge',
    spikeTrim <= Math.min(spikeLenIn, spikeLenOut) / 2 + 1e-6,
    `trim came out ${spikeTrim.toFixed(2)} against an edge only ${Math.min(spikeLenIn, spikeLenOut).toFixed(2)} ` +
    `long -- an unclamped implementation computes trim = radius / tan(interior/2) directly and self-crosses the outline`);
  check('...the clamp lands exactly on half the shorter edge, not zero and not the raw request',
    Math.abs(spikeTrim - Math.min(spikeLenIn, spikeLenOut) / 2) < 1e-3,
    `got trim ${spikeTrim.toFixed(3)}, expected ${(Math.min(spikeLenIn, spikeLenOut) / 2).toFixed(3)}`);

  console.log('\n=== filletCorner: a corner too sharp to round at all ===');

  // Perfectly degenerate: P and N sit on the same ray out of C, interior
  // angle is exactly 0. No positive radius is safe here.
  const hairpin = { points: [[5, 0], [0, 0], [10, 0]] };
  const hairpinFilleted = A.filletCorner(hairpin, 1, 5);
  check('#8 a corner whose edges lie on top of each other refuses, leaving the sketch unchanged',
    hairpinFilleted.points.length === 3
    && hairpinFilleted.points.every((p, i) => p[0] === hairpin.points[i][0] && p[1] === hairpin.points[i][1]),
    `got ${JSON.stringify(hairpinFilleted.points)} -- an unclamped implementation divides by ` +
    `tan(0)=0 and produces a coincident or NaN point instead of refusing`);
  check('...and whyCannotRoundCorner names it instead of staying silent',
    typeof A.whyCannotRoundCorner(hairpin.points, 1) === 'string' && A.whyCannotRoundCorner(hairpin.points, 1).length > 10,
    String(A.whyCannotRoundCorner(hairpin.points, 1)));
  check('...while an ordinary corner gets no such refusal',
    A.whyCannotRoundCorner(rect(), 0) === null);

  console.log('\n=== maxFilletRadius: now angle-aware, not just half the shorter edge (Finding 1) ===');

  check('#9 the spike corner\'s real max is far below the old angle-blind half-edge guess',
    A.maxFilletRadius(spike, 1) < Math.min(spikeLenIn, spikeLenOut) / 2 - 1,
    `got ${A.maxFilletRadius(spike, 1).toFixed(2)}, old formula would have said ` +
    `${(Math.min(spikeLenIn, spikeLenOut) / 2).toFixed(2)}`);
  check('...still exactly half the shorter edge at a plain 90-degree corner (unchanged behaviour)',
    near(A.maxFilletRadius(rect(), 0), 12.5));

  console.log('\n=== filletCorner: a lock on the corner BEING rounded (Finding 2) ===');

  const lockedFilleted = A.filletCorner({
    points: rect(),
    constraints: [{ kind: 'lock', corner: 1 }],
  }, 1, 5);
  check('#10 the lock on the rounded-away corner is dropped, not silently reassigned',
    !lockedFilleted.constraints.some((c) => c.kind === 'lock'),
    `got ${JSON.stringify(lockedFilleted.constraints)} -- a naive reindex-only implementation would ` +
    `move it to corner 2 (pointOut), a point the student never selected`);

  const lockedElsewhereFilleted = A.filletCorner({
    points: rect(),
    constraints: [{ kind: 'lock', corner: 2 }],
  }, 1, 5);
  check('...but a lock on a DIFFERENT, surviving corner still shifts normally',
    lockedElsewhereFilleted.constraints.some((c) => c.kind === 'lock' && c.corner === 3)
    && !lockedElsewhereFilleted.constraints.some((c) => c.kind === 'lock' && c.corner === 2),
    JSON.stringify(lockedElsewhereFilleted.constraints));

  console.log('\n=== reindex(): the shared seam addCorner() also uses ===');

  const rFilleted = A.reindex({ points: rect(), constraints: [{ kind: 'lock', corner: 2 }] }, 0);
  check('#6 reindex(f, 0) shifts a corner past the seam from 2 to 3',
    rFilleted.constraints.some((c) => c.kind === 'lock' && c.corner === 3),
    JSON.stringify(rFilleted.constraints));
  check('...and leaves one at or before the seam alone',
    A.reindex({ points: rect(), constraints: [{ kind: 'lock', corner: 0 }] }, 0)
      .constraints.some((c) => c.kind === 'lock' && c.corner === 0));

  console.log('\n=== circleOf(): reads the tag, nothing else ===');

  check('a shape:"circle" two-point sketch reads as a circle',
    JSON.stringify(A.circleOf({ shape: 'circle', points: [[15, 12.5], [25, 12.5]] }))
      === JSON.stringify({ center: [20, 12.5], radius: 5 }));
  check('two points WITHOUT the tag is not a circle -- no float-comparison guessing',
    A.circleOf({ points: [[15, 12.5], [25, 12.5]] }) === null);
  check('a malformed circle (missing points) does not crash, just refuses',
    A.circleOf({ shape: 'circle', points: [] }) === null);

  console.log('\n=== maxFilletRadius(): half the shorter adjacent edge ===');

  check('a 40x25 rectangle corner clamps to half its shorter side (12.5)',
    near(A.maxFilletRadius(rect(), 0), 12.5));

  console.log('\n=== tessellate(): what the preview overlay actually draws ===');

  const circleTess = A.tessellate({ shape: 'circle', points: [[-10, 0], [10, 0]] });
  check('a circle tessellates to at least 48 points, not the 2 raw corners',
    circleTess.length >= 48,
    `got ${circleTess.length} points -- 2 is what a plain straight-line render (today's literal ` +
    `behaviour, before this build) would produce`);
  check('...and every sampled point is actually on the circle (radius 10, center [0,0])',
    circleTess.every((p) => near(Math.hypot(p[0], p[1]), 10, 0.01)));

  const curvedTess = A.tessellate(filleted);
  check('a filleted outline tessellates to more than its 4 raw corners',
    curvedTess.length > filleted.points.length,
    `got ${curvedTess.length} points for a 4-corner outline with one curved edge`);
  check('a straight-only outline (no bulges) tessellates to exactly its own corners',
    A.tessellate({ points: rect() }).length === 4);

  // ------------------------------------------------------------------
  // Round 3. One root cause, three faces: a bulge is keyed by EDGE INDEX and
  // its value is a factor of that edge's own CHORD, so any operation that
  // moves an edge's endpoints and only shifts the key rescales that arc in
  // silence.
  // ------------------------------------------------------------------

  console.log('\n=== D1: a STRAIGHT corner, which is the only kind addCorner can make ===');

  // Exactly what addCorner() produces on a straight edge: the midpoint of
  // the rectangle's bottom edge, spliced in as corner 1. Interior angle 180.
  const collinear = [[0, 0], [20, 0], [40, 0], [40, 25], [0, 25]];

  const straightMax = A.maxFilletRadius(collinear, 1);
  // Bounded, not merely finite. "Is it finite?" is a check that CANNOT fail
  // here and would have been evidence of nothing: JS Math.acos(-1) is PI to
  // the last bit but Math.tan(PI/2) is 16331239353195370, not Infinity, so
  // the no-180-degree-case implementation returns a finite number and sails
  // through Number.isFinite. What it advertises is a safe radius of 1.6e17
  // on an edge 20 long. The bound is what makes this an assertion.
  check('#D1 a collinear corner reports a BOUNDED ceiling, not 1.6e17',
    Number.isFinite(straightMax) && straightMax < 1e6,
    `got ${straightMax} -- cos(interior) = -1 makes tan(interior/2) = tan(90deg), which is ` +
    `1.6e16 in floating point, so an implementation with no 180-degree case advertises an ` +
    `effectively unlimited safe radius while still passing Number.isFinite`);
  check('...and that ceiling is 0, i.e. this corner cannot be rounded at all',
    straightMax === 0, String(straightMax));

  const straightRounded = A.filletCorner({ points: collinear }, 1, 5);
  check('#D1 filletCorner refuses it outright -- same points, same count',
    straightRounded.points.length === collinear.length
    && straightRounded.points.every((p, i) => p[0] === collinear[i][0] && p[1] === collinear[i][1]),
    `got ${JSON.stringify(straightRounded.points)}`);
  // The specific corruption, named: trim = r/tan(90deg) = 0 puts pointIn and
  // pointOut on top of each other. A duplicate point is a zero-length edge,
  // and a zero-length edge makes lenIn === 0 for BOTH neighbours, which is
  // the early return in filletCorner and maxFilletRadius -- so those two
  // corners become permanently unroundable with nothing said.
  const dup = straightRounded.points.some((p, i) => {
    const q = straightRounded.points[(i + 1) % straightRounded.points.length];
    return Math.hypot(p[0] - q[0], p[1] - q[1]) < 1e-12;
  });
  check('#D1 ...and never splices a duplicate point / zero-length edge',
    !dup, `got ${JSON.stringify(straightRounded.points)}`);
  check('#D1 ...and both neighbours are still roundable afterwards',
    A.maxFilletRadius(straightRounded.points, 0) > 0
    && A.maxFilletRadius(straightRounded.points, 2) > 0);

  const straightWhy = A.whyCannotRoundCorner(collinear, 1);
  check('#D1 whyCannotRoundCorner calls it straight, not "too sharp"',
    typeof straightWhy === 'string' && /straight/i.test(straightWhy) && !/too sharp/i.test(straightWhy),
    String(straightWhy));
  // The remedy named here is dragging the corner, which is a real handle:
  // sketchHandles() in lib/model-handles.ts emits one 'point' handle per
  // sketch corner. Checked in the source rather than asserted in prose,
  // because an unreachable remedy has now shipped three generations running.
  const handlesSrc = fs.readFileSync(path.join(__dirname, '..', 'lib', 'model-handles.ts'), 'utf8');
  check('#D1 ...and "drag the corner" is a remedy that actually exists',
    /kind:\s*'point'\s*as const/.test(handlesSrc) && /f\.points\.map/.test(handlesSrc),
    'sketchHandles() no longer emits a per-corner point handle, so the message tells a ' +
    'student to do something the app does not let them do');

  console.log('\n=== D3: splitting a CURVED edge must not change the outline ===');

  // filleted (above) is the 3-4-5 triangle with corner 1 rounded at r=5:
  // 4 points, one real arc on edge 1. Splitting that arc is what addCorner()
  // does when a student presses Corner on a sketch whose edge 0 has been
  // rounded.
  //
  // Area and perimeter of the TESSELLATION, not the bulge numbers. A check
  // that reads bulges cannot tell a correct split from a plausible-looking
  // wrong one; the outline is the thing that has to be unchanged.
  const shoelace = (pts) => {
    let a = 0;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], q = pts[(i + 1) % pts.length];
      a += p[0] * q[1] - q[0] * p[1];
    }
    return Math.abs(a) / 2;
  };
  const perimeter = (pts) => {
    let d = 0;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], q = pts[(i + 1) % pts.length];
      d += Math.hypot(q[0] - p[0], q[1] - p[1]);
    }
    return d;
  };

  const beforeTess = A.tessellate(filleted);
  const split = A.splitEdge(filleted, 1);
  const afterTess = A.tessellate(split);

  check('#D3 splitting an edge adds exactly one corner',
    split.points.length === filleted.points.length + 1,
    `got ${split.points.length} from ${filleted.points.length}`);
  // 0.2% either way. The two tessellations sample the same curve at slightly
  // different densities, which is worth ~1e-4 here; the WRONG split (both
  // halves keeping the whole edge's bulge factor across half the chord, i.e.
  // half the radius each) moves the area by ~1.5%, an order of magnitude
  // clear of this bound.
  const areaDrift = Math.abs(shoelace(afterTess) - shoelace(beforeTess)) / shoelace(beforeTess);
  const perimDrift = Math.abs(perimeter(afterTess) - perimeter(beforeTess)) / perimeter(beforeTess);
  check('#D3 the outline AREA is unchanged by adding a corner to a curved edge',
    areaDrift < 2e-3,
    `area moved ${(areaDrift * 100).toFixed(3)}% -- a split that shifts the bulge KEY and keeps ` +
    `its VALUE gives each half the whole edge's factor over half the chord: half the radius, ` +
    `moved centre, a different shape`);
  check('#D3 ...and so is the PERIMETER',
    perimDrift < 2e-3, `perimeter moved ${(perimDrift * 100).toFixed(3)}%`);

  // Where the new point landed, stated directly: on the arc, not on the
  // chord. These are the same defect from the other side, and the chord
  // midpoint is off the arc by the half-sagitta, which is not small.
  const origArc = A.arcFromBulge(filleted.points[1], filleted.points[2], filleted.bulges[1]);
  const newPoint = split.points[2];
  check('#D3 the new corner lands ON the original arc, not on its chord',
    near(Math.hypot(newPoint[0] - origArc.center[0], newPoint[1] - origArc.center[1]),
      origArc.radius, 1e-9),
    `it sits ${Math.hypot(newPoint[0] - origArc.center[0], newPoint[1] - origArc.center[1]).toFixed(4)} ` +
    `from the arc centre, radius is ${origArc.radius.toFixed(4)}`);
  check('#D3 ...and each half turns through half the angle (b\' = (sqrt(1+b^2)-1)/b)',
    near(split.bulges[1], (Math.sqrt(1 + filleted.bulges[1] ** 2) - 1) / filleted.bulges[1], 1e-9)
    && near(split.bulges[2], split.bulges[1], 1e-12),
    `got ${JSON.stringify([split.bulges[1], split.bulges[2]])}`);
  check('#D3 splitting a STRAIGHT edge still lands on the chord midpoint (unchanged)',
    (() => {
      const s = A.splitEdge({ points: rect() }, 0);
      return s.points.length === 5 && s.points[1][0] === 20 && s.points[1][1] === 0;
    })());

  console.log('\n=== D2: rounding a corner whose neighbour is already curved ===');

  // `filleted` has its arc on edge 1, so corners 1 and 2 each have that arc
  // on one side. Rounding either reads the arc as a straight chord: the
  // fillet does not meet it tangentially, and trimming the arc's chord while
  // its bulge factor stays put rescales that arc too.
  check('#D2 maxFilletRadius says 0 for a corner with an arc on one side',
    A.maxFilletRadius(filleted.points, 1, filleted.bulges) === 0
    && A.maxFilletRadius(filleted.points, 2, filleted.bulges) === 0,
    `got ${A.maxFilletRadius(filleted.points, 1, filleted.bulges)} and ` +
    `${A.maxFilletRadius(filleted.points, 2, filleted.bulges)}`);
  check('...while the corner with straight edges on BOTH sides is still roundable',
    A.maxFilletRadius(filleted.points, 0, filleted.bulges) > 0);

  const curvedNeighbour = A.filletCorner(filleted, 2, 1);
  check('#D2 filletCorner refuses rather than answering wrongly in silence',
    curvedNeighbour.points.length === filleted.points.length
    && curvedNeighbour.points.every((p, i) => p[0] === filleted.points[i][0] && p[1] === filleted.points[i][1])
    && near(curvedNeighbour.bulges[1], filleted.bulges[1], 1e-12),
    `points ${JSON.stringify(curvedNeighbour.points)}, bulges ${JSON.stringify(curvedNeighbour.bulges)} ` +
    `-- the silent-wrong-answer version trims the arc's chord and leaves its bulge factor alone, ` +
    `which changes that arc's radius as a side effect of rounding the corner next door`);

  const curvedWhy = A.whyCannotRoundCorner(filleted.points, 2, filleted.bulges);
  check('#D2 whyCannotRoundCorner says the neighbour is a curve, in plain words',
    typeof curvedWhy === 'string' && /curve/i.test(curvedWhy) && !/too sharp/i.test(curvedWhy),
    String(curvedWhy));
  // The unreachable-remedy rule. There is no un-round / straighten action in
  // the app, so this message must NOT tell a student to straighten the edge.
  check('#D2 ...and names no remedy the app cannot provide',
    // typeof first: without it a null answer stringifies to "null", matches
    // nothing, and this passes for the wrong reason.
    typeof curvedWhy === 'string'
    && !/straighten|un-?round|remove the curve|make it straight/i.test(curvedWhy),
    `"${curvedWhy}" names a remedy; there is no action anywhere in the app that removes a bulge`);

  // ------------------------------------------------------------------ CH --
  // Chamfer is the mirror of fillet, with ONE deliberate difference: the
  // request IS the trim distance (no radius, no tan(), no arc). The rectangle
  // is the right fixture here precisely because it is degenerate for chamfer
  // the same way it is degenerate for trim -- there is no radius-to-trim law
  // that a degenerate angle could mask, so a correct answer and a
  // wrong-by-construction answer are trivially separable.
  console.log('\n=== chamferCorner: the trim distance is the request, no arc ===');

  const chamferedTri = A.chamferCorner({ points: triangle }, 1, 5);
  check('#CH the sharp corner is replaced by two trim points, exactly `distance` in',
    chamferedTri.points.length === 4
      && near(chamferedTri.points[1][0], 35) && near(chamferedTri.points[1][1], 0)
      && near(chamferedTri.points[2][0], 36) && near(chamferedTri.points[2][1], 3),
    `got ${JSON.stringify(chamferedTri.points)} -- trim must be the request (5), not a `
      + `r/tan(interior/2) fillet trim (15) that would land at [25,0]/[28,9]`);
  check('#CH ...and it writes NO bulge: the new edge is straight, not an arc',
    !chamferedTri.bulges || Object.keys(chamferedTri.bulges).length === 0,
    JSON.stringify(chamferedTri.bulges));
  check('...the untouched corners are still exactly where they were',
    chamferedTri.points[0][0] === 0 && chamferedTri.points[0][1] === 0
      && chamferedTri.points[3][0] === 0 && chamferedTri.points[3][1] === 30);

  check('...a chamfer on a rectangle corner trims both edges by the distance',
    (() => {
      const r = A.chamferCorner({ points: rect() }, 0, 5);
      return r.points.length === 5
        && near(r.points[0][0], 0) && near(r.points[0][1], 5)
        && near(r.points[1][0], 5) && near(r.points[1][1], 0);
    })(),
    'corner [0,0] at distance 5 must become [0,5] and [5,0]');

  console.log('\n=== maxChamferDistance: the ceiling IS the shorter edge, no tan() ===');

  check('#CH a 3-4-5 triangle corner clamps to the shorter adjacent edge (40, not a fillet)',
    near(A.maxChamferDistance(triangle, 1), 40),
    `got ${A.maxChamferDistance(triangle, 1)} -- the shorter edge here is the 40-unit leg; a `
      + `fillet formula (min/2 * tan(interior/2)) would say ~5.55, not 40`);
  check('...a rectangle corner clamps to half its shorter side (25) -- the whole edge',
    near(A.maxChamferDistance(rect(), 0), 25));

  console.log('\n=== chamferCorner: the same three refusals as fillet, and only those ===');

  check('#CH a STRAIGHT corner refuses, returning the sketch unchanged',
    (() => {
      const c = A.chamferCorner({ points: collinear }, 1, 5);
      return c.points.length === collinear.length
        && c.points.every((p, i) => p[0] === collinear[i][0] && p[1] === collinear[i][1]);
    })(),
    'a collinear corner has no angle to slice; chamfer must not splice two coincident points');
  check('#CH a zero-length-adjacent-edge corner refuses too',
    (() => {
      const zeroLen = [[0, 0], [40, 0], [40, 0], [0, 25]];
      const c = A.chamferCorner({ points: zeroLen }, 1, 5);
      return c.points.length === 4
        && c.points.every((p, i) => p[0] === zeroLen[i][0] && p[1] === zeroLen[i][1]);
    })(),
    'a corner with no edge on one side cannot be chamfered');
  check('#CH a corner next to an already-curved edge refuses (same reason round does)',
    A.maxChamferDistance(filleted.points, 2, filleted.bulges) === 0
      && A.chamferCorner(filleted, 2, 5).points.length === filleted.points.length,
    'chamfering reads both edges as straight chords; next to an arc it would slice that arc');

  console.log('\n=== whyCannotChamferCorner: words for the refusals ===');

  check('#CH an ordinary corner has no refusal at all',
    A.whyCannotChamferCorner(rect(), 0) === null);
  check('#CH a straight corner is named straight, not "too sharp"',
    (() => {
      const w = A.whyCannotChamferCorner(collinear, 1);
      return typeof w === 'string' && /straight/i.test(w) && !/too sharp/i.test(w);
    })(),
    String(A.whyCannotChamferCorner(collinear, 1)));
  check('#CH a zero-length edge is named as coincidence, not a sharp angle',
    (() => {
      const zeroLen = [[0, 0], [40, 0], [40, 0], [0, 25]];
      const w = A.whyCannotChamferCorner(zeroLen, 1);
      return typeof w === 'string' && /on top of each other/i.test(w) && !/wider angle/i.test(w);
    })(),
    String(A.whyCannotChamferCorner([[0, 0], [40, 0], [40, 0], [0, 25]], 1)));
  check('#CH a curved neighbour is named as a curve, with no remedy the app cannot provide',
    (() => {
      const w = A.whyCannotChamferCorner(filleted.points, 2, filleted.bulges);
      return typeof w === 'string' && /curve/i.test(w)
        && !/straighten|un-?round|remove the curve|make it straight/i.test(w);
    })(),
    String(A.whyCannotChamferCorner(filleted.points, 2, filleted.bulges)));

  console.log('\n=== chamferCorner: reindexing constraints and chamfers ===');

  const cFilleted2 = A.chamferCorner({
    points: rect(),
    constraints: [
      { kind: 'horizontal', edge: 0 },
      { kind: 'vertical', edge: 1 },
      { kind: 'lock', corner: 2 },
    ],
    chamfers: { 1: 5 },
  }, 1, 5);
  check('#CH constraints reindex past the seam exactly as a fillet does',
    cFilleted2.constraints.some((c) => c.kind === 'horizontal' && c.edge === 0)
      && cFilleted2.constraints.some((c) => c.kind === 'vertical' && c.edge === 2)
      && cFilleted2.constraints.some((c) => c.kind === 'lock' && c.corner === 3),
    JSON.stringify(cFilleted2.constraints));
  check('#CH a lock on the chamfered-away corner is dropped, not reassigned',
    !A.chamferCorner({ points: rect(), constraints: [{ kind: 'lock', corner: 1 }] }, 1, 5)
      .constraints.some((c) => c.kind === 'lock'),
    'the corner being chamfered is deleted; its pin must not silently move to pointOut');
  check('#CH reindex shifts the chamfers map with its corner, not its index',
    A.reindex({ points: rect(), chamfers: { 1: 8 } }, 0).chamfers[2] === 8
      && A.reindex({ points: rect(), chamfers: { 1: 8 } }, 0).chamfers[1] === undefined
      && A.reindex({ points: rect(), chamfers: { 1: 8 } }, 3).chamfers[1] === 8,
    'chamfers is keyed by CORNER like rounds; splitting edge 0 must slide corner 1 to corner 2');

  console.log('\n=== splitEdge, curved branch: the reindex nobody was covering ===');

  // splitEdge()'s curved branch calls reindex() to shift everything past the
  // seam, then overwrites the two halves of the split edge itself. Deleting
  // that reindex() call left `npm test` at exit 0 (sketch gauntlet round 3,
  // test-integrity lens) -- the only reindex assertion in the suite built its
  // fixture with NO bulges, so it exercised the straight branch only.
  //
  // The fixture therefore needs a bulge on BOTH sides of the seam, plus a lock
  // and a length past it. A fixture with a single fillet cannot fail here:
  // with one bulge at the seam, splitEdge overwrites both keys itself and
  // reindex is left with nothing to do.
  const twoRounds = A.filletCorner(
    A.filletCorner(
      { points: [[0, 0], [40, 0], [40, 25], [0, 25]],
        constraints: [{ kind: 'lock', corner: 4 }, { kind: 'length', edge: 3, value: 12 }] },
      1, 8),
    4, 6);
  const beforeKeys = Object.keys(twoRounds.bulges || {}).map(Number).sort((a, b) => a - b);
  check('the fixture really does carry a bulge on BOTH sides of the seam',
    beforeKeys.length === 2 && beforeKeys[0] <= 1 && beforeKeys[1] > 2,
    `bulge edges ${JSON.stringify(beforeKeys)} -- if they do not straddle edge 1 this fixture `
      + 'cannot detect a missing reindex and must be rebuilt');

  const reSplit = A.splitEdge(twoRounds, 1);
  const afterKeys = Object.keys(reSplit.bulges || {}).map(Number).sort((a, b) => a - b);
  check('#R splitting a straight edge shifts the LATER arc up one, and moves no other',
    afterKeys.length === 3 && afterKeys[0] === beforeKeys[0]
    && afterKeys[2] === beforeKeys[1] + 1,
    `bulge edges ${JSON.stringify(afterKeys)} from ${JSON.stringify(beforeKeys)}; without the `
      + 'reindex the later arc keeps its old number and is now keyed to a straight edge');
  // Expected values are DERIVED from the fixture, not pasted from a run: two
  // fillets have already moved these indices once each, so a hand-written
  // number here would be a guess that happens to agree with today's code.
  // Both must sit past the seam or neither could shift, which is what the
  // guard check below is for -- otherwise these two would pass under the
  // sabotage and be exactly the coverage hole they exist to close.
  const lockBefore = (twoRounds.constraints || []).find((c) => c.kind === 'lock').corner;
  const lenBefore = (twoRounds.constraints || []).find((c) => c.kind === 'length').edge;
  check('the pin and the length rule really are past the seam',
    lockBefore > 1 && lenBefore > 1,
    `lock corner ${lockBefore}, length edge ${lenBefore} -- at or before edge 1 neither shifts, `
      + 'so this fixture could not detect a missing reindex');
  const lock = (reSplit.constraints || []).find((c) => c.kind === 'lock');
  check('#R ...and the pin past the seam follows its corner',
    lock && lock.corner === lockBefore + 1,
    `lock on corner ${lock && lock.corner}, expected ${lockBefore + 1}`);
  const len = (reSplit.constraints || []).find((c) => c.kind === 'length');
  check('#R ...and so does the length rule',
    len && len.edge === lenBefore + 1,
    `length on edge ${len && len.edge}, expected ${lenBefore + 1}`);

  console.log('\n=== the three call sites that have to ASK about bulges ===');

  // A library that refuses correctly and a UI that never passes the bulges
  // is the same defect wearing a different hat: the panel would keep
  // offering a ceiling for a corner that cannot be rounded.
  const panelSrc = fs.readFileSync(
    path.join(__dirname, '..', 'components', 'model', 'SketchConstraints.tsx'), 'utf8');
  check('the Rules panel asks maxFilletRadius with the bulges, not just the points',
    /maxFilletRadius\(\s*points\s*,\s*i\s*,\s*bulges\s*\)/.test(panelSrc),
    'SketchConstraints.tsx still calls maxFilletRadius(points, i) -- the ceiling it shows is for ' +
    'a straight-edged sketch that is not the one on screen');
  const editorSrc = fs.readFileSync(
    path.join(__dirname, '..', 'components', 'model', 'ModelEditor.tsx'), 'utf8');
  check('...and the editor asks whyCannotRoundCorner with them too',
    /whyCannotRoundCorner\(\s*f\.points\s*,\s*corner\s*,\s*f\.bulges\s*\)/.test(editorSrc),
    'ModelEditor.tsx still calls whyCannotRoundCorner(f.points, corner)');

  console.log('\n=== two states that used to be explained wrongly, or not at all ===');

  // A zero-length edge is not a sharp angle -- there is no angle at all, the
  // two points coincide. The Rules panel can produce this in one click (an Up
  // rule on a horizontal edge collapses it), and the old answer sent the
  // student off to widen an angle that does not exist. Found live, round 3.
  const collapsed = A.whyCannotRoundCorner([[0, 0], [40, 0], [40, 0], [0, 25]], 1);
  check('#Z a corner with a zero-length edge is NOT reported as too sharp',
    typeof collapsed === 'string' && !/too sharp|wider angle|double back/i.test(collapsed),
    `"${collapsed}" -- a false diagnosis: there is no angle here to widen`);
  check('#Z ...it says the two corners sit on top of each other, and to drag them apart',
    typeof collapsed === 'string' && /on top of each other/i.test(collapsed)
      && /drag/i.test(collapsed),
    `"${collapsed}" -- the remedy named has to be the corner handle, which is real`);

  // The over-radius clamp used to be both silent AND unobservable: the panel
  // pre-clamped, so filletCorner received 10 whether the student typed 10 or
  // 500, and no caller could tell a clamp had happened. Named by the blind
  // judge as the biggest remaining gap, round 3. filletCorner still clamps
  // internally as a floor -- unchanged and deliberate -- so what these check
  // is the WIRING, which is the only place the difference now exists.
  check('the panel passes the typed radius through rather than pre-clamping it away',
    !/onRound\(i,\s*Math\.min\(/.test(panelSrc),
    'SketchConstraints.tsx clamps before calling onRound, so 500 and 10 arrive identically '
      + 'and nothing downstream can report that a clamp happened');
  check('...and the editor compares against the ceiling and says so',
    /maxFilletRadius\(f\.points,\s*corner,\s*f\.bulges\)/.test(editorSrc)
      && /radius\s*>\s*ceiling/.test(editorSrc),
    'ModelEditor.tsx never asks for the ceiling, so an over-radius round is still silent');


  {
    console.log('\n=== bowing a straight edge into an arc ===');

    // A 40x25 rectangle. Edge 0 is the 40-long bottom, edge 1 the 25-long right.
    const bowRect = { points: [[0, 0], [40, 0], [40, 25], [0, 25]] };

    check('a straight edge reports no bow', A.bowOf(bowRect.points, 0) === 0);
    check('the ceiling is half the chord -- a half circle',
      A.maxBow(bowRect.points, 0) === 20 && A.maxBow(bowRect.points, 1) === 12.5,
      `${A.maxBow(bowRect.points, 0)} / ${A.maxBow(bowRect.points, 1)}`);

    // Round trip: a bow in, the same bow back out. This is the whole contract
    // between the panel (which speaks distances) and the outline (which speaks
    // bulges), and a factor-of-two slip here is invisible in both directions
    // separately.
    for (const [edge, want] of [[0, 5], [0, -5], [1, 12.5], [2, 0.25], [3, -3]]) {
      const bowed = A.bowEdge(bowRect, edge, want);
      check(`bow ${want} on edge ${edge + 1} round-trips`,
        near(A.bowOf(bowed.points, edge, bowed.bulges), want),
        `asked ${want}, read back ${A.bowOf(bowed.points, edge, bowed.bulges)}`);
    }

    // The geometry it actually produces, measured rather than asserted from the
    // formula it was built with: a bow of exactly half the chord is a half
    // circle, so the radius must be half the chord and the arc's midpoint must
    // sit exactly `bow` off the chord.
    const half = A.bowEdge(bowRect, 0, 20);
    check('a half-chord bow is bulge 1', near(half.bulges[0], 1), String(half.bulges[0]));
    const arc = A.arcFromBulge(bowRect.points[0], bowRect.points[1], half.bulges[0]);
    check('...and that is a half circle: radius = half the chord',
      near(arc.radius, 20), String(arc.radius));
    check('...centred on the chord itself',
      near(arc.center[0], 20) && near(arc.center[1], 0), JSON.stringify(arc.center));

    // A quarter-ish bow, checked by sampling the drawn outline rather than by
    // re-running the same arithmetic: tessellate() is what the student sees.
    const bowed5 = A.bowEdge(bowRect, 0, 5);
    const drawn = A.tessellate(bowed5);
    const far = drawn.reduce((m, p) => (Math.abs(p[1]) > Math.abs(m) && p[0] > 1 && p[0] < 39 ? p[1] : m), 0);
    check('the drawn outline really stands off the chord by the bow',
      near(Math.abs(far), 5, 0.05), `furthest sample is ${far} from the chord, asked 5`);

    check('0 clears the bow rather than storing a straight arc',
      A.bowEdge(bowed5, 0, 0).bulges === undefined,
      JSON.stringify(A.bowEdge(bowed5, 0, 0).bulges));

    // Clamping and refusal. The panel is supposed to REPORT the ceiling rather
    // than silently clamp -- same contract the round/chamfer rows already have,
    // and the reason whyCannotBowEdge exists at all.
    check('over the ceiling is refused with a sentence naming the ceiling',
      /at most 20\.0/.test(A.whyCannotBowEdge(bowRect.points, 0, 40) || ''),
      String(A.whyCannotBowEdge(bowRect.points, 0, 40)));
    check('...and refused in the negative direction too',
      A.whyCannotBowEdge(bowRect.points, 0, -40) !== null);
    check('...but an in-range bow is not refused',
      A.whyCannotBowEdge(bowRect.points, 0, 19.9) === null);
    check('a bow still clamps rather than producing a bulge past 1, if one gets through',
      Math.abs(A.bulgeFromBow(bowRect.points, 0, 400)) <= 1,
      String(A.bulgeFromBow(bowRect.points, 0, 400)));

    const collapsed = { points: [[0, 0], [0, 0], [40, 25], [0, 25]] };
    check('a zero-length edge cannot be bowed, and says why rather than NaN-ing',
      A.bulgeFromBow(collapsed.points, 0, 5) === 0
        && /no length/.test(A.whyCannotBowEdge(collapsed.points, 0, 5) || ''),
      String(A.whyCannotBowEdge(collapsed.points, 0, 5)));

    check('a circle refuses to be bowed -- its two points are a diameter, not an edge',
      A.bowEdge({ points: [[0, 0], [20, 0]], shape: 'circle' }, 0, 5).bulges === undefined);

    // The bulge survives a corner move, which is the whole reason it is stored
    // rather than the bow: the included angle is what a curve should keep.
    const moved = { ...bowed5, points: [[0, 0], [80, 0], [40, 25], [0, 25]] };
    check('moving a corner keeps the ANGLE and scales the bow with the chord',
      near(moved.bulges[0], bowed5.bulges[0]) && near(A.bowOf(moved.points, 0, moved.bulges), 10),
      `bulge ${moved.bulges[0]}, bow now ${A.bowOf(moved.points, 0, moved.bulges)}`);
  }

  {
    console.log('\n=== removing a corner: splitEdge run backwards ===');

    const pent = {
      points: [[0, 0], [40, 0], [50, 20], [20, 35], [-10, 20]],
      constraints: [
        { kind: 'lock', corner: 0 },
        { kind: 'lock', corner: 3 },
        { kind: 'length', edge: 0, value: 40 },
        { kind: 'length', edge: 3, value: 25 },
        { kind: 'equal', edge: 1, other: 4 },
      ],
      bulges: { 3: 0.2 },
      rounds: { 2: 4 },
      chamfers: { 4: 3 },
    };

    const gone = A.removeCorner(pent, 2);
    check('the corner is gone and the rest stay put',
      gone.points.length === 4 && JSON.stringify(gone.points[2]) === JSON.stringify([20, 35]),
      JSON.stringify(gone.points));

    // Corner keys: 3 and 4 slide down to 2 and 3, corner 2's own round goes.
    check('a lock above the removed corner slides down',
      gone.constraints.some((c) => c.kind === 'lock' && c.corner === 2),
      JSON.stringify(gone.constraints));
    check('...and one below it does not move',
      gone.constraints.some((c) => c.kind === 'lock' && c.corner === 0));
    check('the round ON the removed corner goes with it',
      gone.rounds === undefined, JSON.stringify(gone.rounds));
    check('a chamfer above it slides down, keeping its value',
      gone.chamfers && gone.chamfers[3] === 3, JSON.stringify(gone.chamfers));

    // Edge keys: edges 1 and 2 merged, so anything naming either is dropped.
    check('a length rule on an edge that did not merge slides down',
      gone.constraints.some((c) => c.kind === 'length' && c.edge === 2 && c.value === 25),
      JSON.stringify(gone.constraints));
    check('...and one below the seam stays where it is',
      gone.constraints.some((c) => c.kind === 'length' && c.edge === 0 && c.value === 40));
    check('a pair rule touching a merged edge is DROPPED, not remapped',
      !gone.constraints.some((c) => c.kind === 'equal'),
      'edge 1 merged, so "edge 1 = edge 5" is a rule about an edge that no longer exists');
    check('the curve on a merged edge is dropped rather than guessed at',
      !gone.bulges || gone.bulges[3] === undefined, JSON.stringify(gone.bulges));

    // A curve NOT on a merging edge has to survive, or the drop above is just
    // a bug that happens to look like a policy.
    const curvedFar = A.removeCorner({ ...pent, bulges: { 0: 0.3 } }, 3);
    check('a curve on an untouched edge survives the removal',
      curvedFar.bulges && Math.abs(curvedFar.bulges[0] - 0.3) < 1e-9,
      JSON.stringify(curvedFar.bulges));

    // Removing corner 0 is the wrap-around case: edges 4 and 0 merge, and the
    // merged edge lands LAST rather than first. Off-by-one here mis-keys every
    // rule on the shape.
    const first = A.removeCorner({ ...pent, bulges: undefined, rounds: undefined, chamfers: undefined }, 0);
    check('removing corner 1 wraps: the merged edge lands last, not first',
      first.points.length === 4
        && first.constraints.some((c) => c.kind === 'length' && c.edge === 2 && c.value === 25)
        && !first.constraints.some((c) => c.kind === 'length' && c.value === 40),
      JSON.stringify(first.constraints));

    // The real contract, measured on the OUTLINE rather than on index
    // arithmetic: put a corner in and take it back out, and the shape has to
    // come back. Numbers that look plausible are exactly how the four earlier
    // faces of the arc-endpoint bug shipped.
    const area = (pts) => {
      let a = 0;
      for (let i = 0; i < pts.length; i++) {
        const [x1, y1] = pts[i];
        const [x2, y2] = pts[(i + 1) % pts.length];
        a += x1 * y2 - x2 * y1;
      }
      return Math.abs(a) / 2;
    };
    for (const edge of [0, 2, 4]) {
      const base = { points: pent.points };
      const split = A.splitEdge(base, edge);
      const back = A.removeCorner(split, edge + 1);
      check(`split edge ${edge + 1} then remove the new corner restores the shape`,
        back.points.length === base.points.length
          && near(area(A.tessellate(back)), area(A.tessellate(base)), 1e-6),
        `${back.points.length} corners, area ${area(A.tessellate(back))} vs ${area(A.tessellate(base))}`);
    }

    console.log('\n=== removing a corner: what it refuses ===');

    const tri = { points: [[0, 0], [40, 0], [20, 30]] };
    check('a triangle refuses -- three corners is the floor',
      /at least three corners/.test(A.whyCannotRemoveCorner(tri, 1) || ''),
      String(A.whyCannotRemoveCorner(tri, 1)));
    check('...and really does not change it',
      A.removeCorner(tri, 1).points.length === 3);
    check('a circle refuses, and says why in circle words',
      /diameter/.test(A.whyCannotRemoveCorner({ points: [[0, 0], [20, 0]], shape: 'circle' }, 0) || ''));
    check('an out-of-range corner refuses rather than splicing nothing',
      A.whyCannotRemoveCorner(pent, 9) !== null);
    check('a four-corner shape is still allowed to lose one',
      A.whyCannotRemoveCorner({ points: pent.points.slice(0, 4) }, 1) === null);

    console.log('\n=== removing a corner: saying what it costs, first ===');

    const cost = A.whyRemovingCornerCosts(pent, 2);
    // ONE rule, not three: of pent's five, only the equal pair names a
    // merging edge. Written as 3 first, which is what the fixture LOOKS like
    // at a glance -- the counter was right and the expectation was wrong.
    check('the warning counts the rules that will go',
      /so 1 rule and/.test(cost || ''), String(cost));
    check('...and pluralises once there is more than one',
      /3 rules/.test(A.whyRemovingCornerCosts({
        points: pent.points,
        constraints: [
          { kind: 'lock', corner: 2 },
          { kind: 'length', edge: 1, value: 10 },
          { kind: 'horizontal', edge: 2 },
          { kind: 'vertical', edge: 4 },
        ],
      }, 2) || ''),
      String(A.whyRemovingCornerCosts({
        points: pent.points,
        constraints: [
          { kind: 'lock', corner: 2 },
          { kind: 'length', edge: 1, value: 10 },
          { kind: 'horizontal', edge: 2 },
          { kind: 'vertical', edge: 4 },
        ],
      }, 2)));
    check('...names the round on that corner',
      /its round/.test(cost || ''), String(cost));
    check('...and says WHY, in edges rather than in indices',
      /joins the two edges beside it into one/.test(cost || ''), String(cost));
    check('a corner that costs nothing warns about nothing',
      A.whyRemovingCornerCosts({ points: pent.points }, 2) === null,
      String(A.whyRemovingCornerCosts({ points: pent.points }, 2)));
    check('the warning counts a curve on a merging edge too',
      /a curve/.test(A.whyRemovingCornerCosts({ points: pent.points, bulges: { 1: 0.4 } }, 2) || ''),
      String(A.whyRemovingCornerCosts({ points: pent.points, bulges: { 1: 0.4 } }, 2)));
  }

  console.log(`\n${fails.length ? 'FAIL' : 'ALL PASS'}  (${pass} assertions${fails.length ? ', ' + fails.length + ' failed: ' + fails.join(', ') : ''})`);
  return fails.length === 0;
};
