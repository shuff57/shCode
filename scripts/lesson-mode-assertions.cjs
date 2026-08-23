// Assertions for lib/lesson-mode.ts — the two teacher gates and how they stack.

module.exports = function run(dir) {
  const path = require('path');
  const m = require(path.join(dir, 'lesson-mode.js'));

  let pass = 0;
  const fails = [];
  const check = (name, ok, detail) => {
    if (ok) { pass++; console.log(`  PASS  ${name}`); }
    else { fails.push(name); console.log(`  FAIL  ${name}${detail ? ' -- ' + detail : ''}`); }
  };

  const none = { classDefault: null, lessons: {} };
  const classVisual = { classDefault: 'visual', lessons: {} };
  const both = { classDefault: 'both', lessons: { 'l-2': 'code' } };

  console.log('\n=== which gate wins ===');

  check('nothing set at all falls through to both',
    m.resolveMode('l-1', none).mode === 'both'
    && m.resolveMode('l-1', none).source === 'default');

  check("the lesson's own declaration is used when no teacher spoke",
    m.resolveMode('l-1', none, 'code').source === 'lesson');

  check('a class default beats the lesson declaration',
    m.resolveMode('l-1', classVisual, 'code').mode === 'visual');

  check('a per-assignment override beats the class default',
    m.resolveMode('l-2', both, 'visual').mode === 'code'
    && m.resolveMode('l-2', both, 'visual').source === 'assignment');

  check('a lesson with no override still takes the class default',
    m.resolveMode('l-9', both).mode === 'both'
    && m.resolveMode('l-9', both).source === 'class');

  check('missing teacher data is not an error',
    m.resolveMode('l-1', null).mode === 'both'
    && m.resolveMode('l-1', undefined).mode === 'both');

  console.log('\n=== what each mode allows ===');

  const visual = m.resolveMode('l-1', classVisual);
  const code = m.resolveMode('l-2', both);
  const open = m.resolveMode('l-9', both);

  check('visual allows Build only', m.canUseBuild(visual) && !m.canUseCode(visual));
  check('code allows Code only', m.canUseCode(code) && !m.canUseBuild(code));
  check('both allows both', m.canUseBuild(open) && m.canUseCode(open));
  check('every mode allows at least one editor',
    [visual, code, open].every((r) => m.canUseBuild(r) || m.canUseCode(r)));

  console.log('\n=== the locked one explains itself ===');

  check('both says nothing', m.whyLocked(open) === null);
  check('a class lock names the class',
    (m.whyLocked(visual) || '').includes('class'), m.whyLocked(visual));
  check('an assignment lock names the assignment',
    (m.whyLocked(code) || '').includes('assignment'), m.whyLocked(code));
  check('a lesson-declared lock does not blame a teacher',
    !(m.whyLocked(m.resolveMode('l-1', none, 'visual')) || '').includes('teacher'),
    m.whyLocked(m.resolveMode('l-1', none, 'visual')));

  console.log(`\n${fails.length ? 'FAIL' : 'ALL PASS'}  (${pass} assertions${fails.length ? ', ' + fails.length + ' failed: ' + fails.join(', ') : ''})`);
  return fails.length === 0;
};
