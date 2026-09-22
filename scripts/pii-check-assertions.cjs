// Assertions for lib/pii-check.ts -- the structured-PII pre-flight gate for
// the AI tutor. Confirms each category catches its shape and ordinary tutor
// questions (including ones that mention a name) pass through clean.

module.exports = function run(dir) {
  const path = require('path');
  const m = require(path.join(dir, 'pii-check.js'));

  let pass = 0;
  const fails = [];
  const check = (name, ok, detail) => {
    if (ok) { pass++; console.log(`  PASS  ${name}`); }
    else { fails.push(name); console.log(`  FAIL  ${name}${detail ? ' -- ' + detail : ''}`); }
  };

  console.log('\n=== structured PII is caught ===');

  check('SSN', m.findPII('my ssn is 123-45-6789') === 'SSN');
  check('email', m.findPII('reach me at kid@example.com please') === 'email');
  check('phone (dashed)', m.findPII('call 555-123-4567') === 'phone');
  check('phone (parens)', m.findPII('call (555) 123-4567') === 'phone');
  check('credit card', m.findPII('card is 4111 1111 1111 1111') === 'credit card');
  check('address', m.findPII('I live at 123 Main Street apt 2') === 'address');

  console.log('\n=== ordinary tutor questions pass through ===');

  check('plain code question', m.findPII("why isn't my sprite moving?") === null);
  check('mentions a teacher by name (NER out of scope)',
    m.findPII('my teacher is Mrs. Lee, can you explain loops?') === null);
  check('mentions a friend by name', m.findPII('my friend John helped me with this') === null);
  check('short number, not a phone/CC/SSN shape', m.findPII('I got 42 on the quiz') === null);
  check('empty string', m.findPII('') === null);

  console.log('\n=== first match wins, label is returned ===');

  check('returns the category label, not a boolean',
    typeof m.findPII('123-45-6789') === 'string');

  console.log(`\n${fails.length ? 'FAIL' : 'ALL PASS'}  (${pass} assertions${fails.length ? ', ' + fails.length + ' failed: ' + fails.join(', ') : ''})`);
  return fails.length === 0;
};
