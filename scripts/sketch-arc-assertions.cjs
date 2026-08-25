// Assertions for lib/sketch-arc.ts.
//
// The rectangle is a degenerate fixture for anything trim-distance shaped: at
// a 90-degree corner, r/tan(45deg) === r, so a correct implementation and one
// that just trims by r produce the same numbers. Every fillet check below
// uses a non-90-degree corner (a 3-4-5-shaped right triangle) so a wrong trim
// formula actually shows up as a wrong answer.

module.exports = function run(dir) {
  const path = require('path');
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

  console.log(`\n${fails.length ? 'FAIL' : 'ALL PASS'}  (${pass} assertions${fails.length ? ', ' + fails.length + ' failed: ' + fails.join(', ') : ''})`);
  return fails.length === 0;
};
