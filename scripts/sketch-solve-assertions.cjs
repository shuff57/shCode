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

  console.log(`\n${fails.length ? 'FAIL' : 'ALL PASS'}  (${pass} assertions${fails.length ? ', ' + fails.length + ' failed: ' + fails.join(', ') : ''})`);
  return fails.length === 0;
};
