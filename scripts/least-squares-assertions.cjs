// Assertions for lib/least-squares.ts.
//
// Every problem here has an answer known from arithmetic, not from running the
// solver and recording what it said. That is the whole point of testing the
// numerics apart from the sketch: a solver checked only against its own output
// is a solver that cannot be wrong.

module.exports = function run(dir) {
  const path = require('path');
  const LS = require(path.join(dir, 'least-squares.js'));

  let pass = 0;
  const fails = [];
  const check = (name, ok, detail) => {
    if (ok) { pass++; console.log(`  PASS  ${name}`); }
    else { fails.push(name); console.log(`  FAIL  ${name}${detail ? ' -- ' + detail : ''}`); }
  };
  const near = (a, b, tol = 1e-4) => Math.abs(a - b) < tol;

  console.log('\n=== the linear solve underneath ===');

  // 2x + y = 5, x - y = 1  ->  x = 2, y = 1. Worked by hand.
  const xy = LS.solveLinear([[2, 1], [1, -1]], [5, 1]);
  check('a 2x2 system comes out right', xy && near(xy[0], 2) && near(xy[1], 1), JSON.stringify(xy));

  // A system needing a row swap: the first pivot is zero, so a solver without
  // partial pivoting divides by it and returns NaN or Infinity.
  const swapped = LS.solveLinear([[0, 2], [1, 1]], [4, 3]);
  check('a zero first pivot is handled by swapping rows, not by dividing by it',
    swapped && near(swapped[0], 1) && near(swapped[1], 2), JSON.stringify(swapped));

  check('a singular matrix returns null rather than infinities',
    LS.solveLinear([[1, 2], [2, 4]], [3, 6]) === null);

  console.log('\n=== fitting things whose answer is arithmetic ===');

  // Find x where x^2 = 9, from a bad guess. Answer 3.
  const root = LS.leastSquares([0.4], (v) => [v[0] * v[0] - 9]);
  check('it finds the square root of 9 from a poor starting guess',
    near(root.x[0], 3, 1e-3) && !root.unsatisfied, `${root.x[0]} in ${root.iterations} steps`);

  // Two equations, two unknowns, exactly solvable: a + b = 10, a - b = 2.
  const pair = LS.leastSquares([0, 0], (v) => [v[0] + v[1] - 10, v[0] - v[1] - 2]);
  check('an exactly-solvable pair lands on the exact answer',
    near(pair.x[0], 6) && near(pair.x[1], 4), JSON.stringify(pair.x));
  check('...and reports itself satisfied', !pair.unsatisfied);

  // A straight line through points that are NOT collinear. No exact answer
  // exists, so the right behaviour is the least-squares fit, not failure.
  // Points (0,0) (1,1) (2,3): the best-fit slope through the origin is
  // sum(xy)/sum(xx) = (0 + 1 + 6) / (0 + 1 + 4) = 7/5 = 1.4.
  const fit = LS.leastSquares([0], (v) => [
    v[0] * 0 - 0,
    v[0] * 1 - 1,
    v[0] * 2 - 3,
  ]);
  check('an over-determined fit lands on the least-squares answer, 1.4',
    near(fit.x[0], 1.4, 1e-3), String(fit.x[0]));
  check('...and says it could not satisfy everything, because nothing could',
    fit.unsatisfied);

  // Contradiction: x must be 1 and also 5. The least-squares answer is 3, the
  // midpoint -- a compromise, reported as unsatisfied rather than thrown.
  const fight = LS.leastSquares([0], (v) => [v[0] - 1, v[0] - 5]);
  check('a flat contradiction settles on the compromise rather than throwing',
    near(fight.x[0], 3, 1e-3), String(fight.x[0]));
  check('...and is reported unsatisfied', fight.unsatisfied);

  console.log('\n=== the failure modes that make numerics dangerous ===');

  check('a problem with no inputs is answered, not crashed',
    LS.leastSquares([], () => [1]).unsatisfied === true);
  check('a problem with no residuals is satisfied by anything',
    LS.leastSquares([1, 2], () => []).unsatisfied === false);
  check('starting AT the answer costs no steps',
    LS.leastSquares([3], (v) => [v[0] - 3]).iterations === 0);

  // Rank-deficient on purpose: two inputs, one residual that only constrains
  // their sum. Infinitely many answers. It must return one of them, finite,
  // rather than dividing by a singular normal matrix.
  const under = LS.leastSquares([0, 0], (v) => [v[0] + v[1] - 10]);
  check('an under-determined system returns SOME valid answer, finite',
    near(under.x[0] + under.x[1], 10, 1e-3)
      && under.x.every(Number.isFinite),
    JSON.stringify(under.x));

  // Impossible AND under-determined at once -- the shape an over-constrained
  // sketch actually has. Must terminate, stay finite, and say so.
  const nasty = LS.leastSquares([0, 0], (v) => [
    v[0] + v[1] - 10, v[0] + v[1] - 20, v[0] - v[1],
  ]);
  check('impossible and under-determined together still terminates',
    nasty.x.every(Number.isFinite) && nasty.unsatisfied, JSON.stringify(nasty.x));
  check('...and stays inside its iteration cap',
    nasty.iterations <= 100, String(nasty.iterations));

  // A residual that returns NaN must not poison the result: the step is
  // rejected, and what comes back is the last good point.
  const poisoned = LS.leastSquares([2], (v) => [v[0] > 2.5 ? NaN : v[0] - 1]);
  check('a residual that goes NaN off in one direction does not corrupt the answer',
    poisoned.x.every(Number.isFinite), JSON.stringify(poisoned.x));

  // Scale independence: the same problem in millimetres and in metres should
  // take the same shape of answer. This is what the diagonal-scaled damping
  // buys, and a flat lambda fails it.
  const mm = LS.leastSquares([0], (v) => [v[0] - 1000], { tolerance: 1e-3 });
  const m = LS.leastSquares([0], (v) => [v[0] - 1], { tolerance: 1e-6 });
  check('a problem measured 1000x larger is solved just as well',
    near(mm.x[0], 1000, 1e-2) && near(m.x[0], 1, 1e-5),
    `${mm.x[0]} and ${m.x[0]}`);

  console.log(`\n${fails.length ? 'FAIL' : 'ALL PASS'}  (${pass} assertions${fails.length ? ', ' + fails.length + ' failed: ' + fails.join(', ') : ''})`);
  return fails.length === 0;
};
