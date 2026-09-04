// Assertions for lib/format-number.ts's displayNumber(), run against a
// CommonJS build by scripts/test-format-number.mjs.
//
// This is the formatter behind the Dimensions panel's beginner-facing
// readout: a solver's own raw float ("39.99999630790447") rounds to "40" for
// display while the stored value keeps full precision -- see the panel's own
// comment on `text` vs `displayText` for the split this exists to serve.

module.exports = function run(dir) {
  const path = require('path');
  const fmt = require(path.join(dir, 'format-number.js'));

  let pass = 0;
  const fails = [];
  const check = (name, ok, detail) => {
    if (ok) { pass++; console.log(`  PASS  ${name}`); }
    else { fails.push(name); console.log(`  FAIL  ${name}${detail ? ' -- ' + detail : ''}`); }
  };

  console.log('\n=== displayNumber: float noise from a solver ===');

  check('a value that is really 40 but landed at 39.99999630790447 displays as "40"',
    fmt.displayNumber(39.99999630790447) === '40', fmt.displayNumber(39.99999630790447));
  check('a value that is really 22.5 but landed at 22.49838917077572 displays as "22.5"',
    fmt.displayNumber(22.49838917077572) === '22.5', fmt.displayNumber(22.49838917077572));
  check('a value that is really 0 but landed at -0.00000369064424204246 displays as "0", never "-0"',
    fmt.displayNumber(-0.00000369064424204246) === '0', fmt.displayNumber(-0.00000369064424204246));

  console.log('\n=== displayNumber: negative zero, every way it can arrive ===');

  check('literal negative zero displays as "0"', fmt.displayNumber(-0) === '0');
  check('a tiny positive float that rounds to zero also displays as "0", not "0.00"',
    fmt.displayNumber(0.0000001) === '0', fmt.displayNumber(0.0000001));

  console.log('\n=== displayNumber: exact and already-clean values are unaffected ===');

  check('an exact integer stays exact', fmt.displayNumber(40) === '40');
  check('an exact one-decimal value stays exact, no padding to two places',
    fmt.displayNumber(22.5) === '22.5');
  check('an exact two-decimal value stays exact', fmt.displayNumber(4.25) === '4.25');
  check('a negative real value keeps its sign', fmt.displayNumber(-15.5) === '-15.5');

  console.log('\n=== displayNumber: rounding, not truncation ===');

  // 1.005 is not exactly representable in IEEE 754 -- it is actually stored
  // as ~1.00499999999999989... -- so toFixed(2) rounds it DOWN to "1.00" and
  // this displays as "1". That is a property of floating point, not a bug in
  // this function; pinning the actual observed value here (rather than
  // guessing "1.01") is the honest test.
  check('1.005 (not exactly representable) displays as "1", matching toFixed(2)\'s own float behaviour',
    fmt.displayNumber(1.005) === '1', fmt.displayNumber(1.005));
  check('rounds 1.239 up to 1.24', fmt.displayNumber(1.239) === '1.24', fmt.displayNumber(1.239));
  check('rounds 1.231 down to 1.23', fmt.displayNumber(1.231) === '1.23', fmt.displayNumber(1.231));

  console.log('\n=== displayNumber: non-finite input does not throw ===');

  check('NaN passes through as the string "NaN" rather than throwing',
    fmt.displayNumber(NaN) === 'NaN');
  check('Infinity passes through as the string "Infinity" rather than throwing',
    fmt.displayNumber(Infinity) === 'Infinity');

  console.log(fails.length === 0
    ? `\nall ${pass} checks passed`
    : `\n${fails.length} failed`);
  return fails.length === 0;
};
