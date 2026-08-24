// Assertions for getChangedFiles in lib/version-control.ts.
//
// Exists because of a shipped defect: the function took a `dirtyIds` set and
// iterated only that, ignoring the two content maps it was handed. `store.ts`
// resets dirtyFileIds to an empty Set on every lesson mount, so any edit made
// before a reload was invisible, commitChanges() no-opped, and a student could
// finish a lesson with zero rows in `commits` -- which also left the teacher
// unable to push into that lesson. Reproduced 2026-08-24 in D1.
//
// The reload case below is the one that regressed. Keep it.

module.exports = function run(dir) {
  const path = require('path');
  const m = require(path.join(dir, 'version-control.js'));

  let pass = 0;
  const fails = [];
  const check = (name, ok, detail) => {
    if (ok) { pass++; console.log(`  PASS  ${name}`); }
    else { fails.push(name); console.log(`  FAIL  ${name}${detail ? ' -- ' + detail : ''}`); }
  };

  const same = (a, b) => a.length === b.length && [...a].sort().join() === [...b].sort().join();

  console.log('\n=== getChangedFiles compares content, not bookkeeping ===');

  check('no edits means nothing changed',
    same(m.getChangedFiles({ 'script.js': 'a' }, { 'script.js': 'a' }), []));

  check('an edited file is reported',
    same(m.getChangedFiles({ 'script.js': 'b' }, { 'script.js': 'a' }), ['script.js']));

  check('only the edited file is reported',
    same(
      m.getChangedFiles(
        { 'script.js': 'b', 'style.css': 'x', 'index.html': 'y' },
        { 'script.js': 'a', 'style.css': 'x', 'index.html': 'y' },
      ),
      ['script.js'],
    ));

  check('several edits are all reported',
    same(
      m.getChangedFiles(
        { 'script.js': 'b', 'style.css': 'z' },
        { 'script.js': 'a', 'style.css': 'x' },
      ),
      ['script.js', 'style.css'],
    ));

  console.log('\n=== the regression: edits must survive a lesson remount ===');

  // The exact shape of the bug. On remount the store rebuilds with an empty
  // dirty set but restores fileContents from localStorage, so the edit is
  // present in the maps and nowhere else. A signature that accepts a third
  // dirty-id argument is how the defect got in -- refuse it outright.
  check('getChangedFiles takes exactly two arguments',
    m.getChangedFiles.length === 2, `arity is ${m.getChangedFiles.length}`);

  check('an edit made before a reload is still detected',
    same(
      m.getChangedFiles(
        { 'script.js': 'let total = 0;' },   // restored from localStorage
        { 'script.js': 'let a = 0;' },       // last committed
      ),
      ['script.js'],
    ));

  console.log('\n=== files added and removed ===');

  check('a file present only in current counts as changed',
    same(m.getChangedFiles({ 'script.js': 'a', 'README.md': 'hi' }, { 'script.js': 'a' }), ['README.md']));

  check('a file present only in lastCommitted counts as changed',
    same(m.getChangedFiles({ 'script.js': 'a' }, { 'script.js': 'a', 'README.md': 'hi' }), ['README.md']));

  check('two empty maps are unchanged', same(m.getChangedFiles({}, {}), []));

  console.log('\n=== line endings must never register as a change ===');

  // Lesson bundles ship CRLF; CodeMirror normalises its document to LF and
  // fires onChange on mount. Before normalizeEol, that made every lesson open
  // showing "Commit (1)" on work nobody had touched, and the 2s autosave
  // persisted the mismatch so it survived every later load.
  const CRLF = 'let a = 1;\r\nlet b = 2;\r\n';
  const LF = 'let a = 1;\nlet b = 2;\n';
  const CR = 'let a = 1;\rlet b = 2;\r';

  check('normalizeEol turns CRLF into LF', m.normalizeEol(CRLF) === LF);
  check('normalizeEol turns a lone CR into LF', m.normalizeEol(CR) === LF);
  check('normalizeEol leaves LF alone', m.normalizeEol(LF) === LF);
  check('normalizeEol tolerates undefined', m.normalizeEol(undefined) === '');
  check('normalizeEol does not touch anything but line endings',
    m.normalizeEol('a\r\nb') === 'a\nb' && m.normalizeEol('a b') === 'a b');

  check('normalizeContents normalises every value',
    JSON.stringify(m.normalizeContents({ 'a.js': CRLF, 'b.js': CR, 'c.js': LF }))
    === JSON.stringify({ 'a.js': LF, 'b.js': LF, 'c.js': LF }));
  check('normalizeContents tolerates an empty map',
    JSON.stringify(m.normalizeContents({})) === '{}');

  // The defect, stated as the property that was violated.
  check('THE BUG: CRLF vs LF of the same file is no longer a change',
    same(m.getChangedFiles(m.normalizeContents({ 'script.js': LF }),
                           m.normalizeContents({ 'script.js': CRLF })), []),
    'normalised on both sides');

  check('a real edit is still a change once both sides are normalised',
    same(m.getChangedFiles(m.normalizeContents({ 'script.js': 'let a = 99;\r\n' }),
                           m.normalizeContents({ 'script.js': CRLF })), ['script.js']));

  // Guard the guard: without normalisation the two DO differ, so the check
  // above is not passing because the inputs were identical to begin with.
  check('un-normalised CRLF vs LF really does differ (harness sanity)',
    same(m.getChangedFiles({ 'script.js': LF }, { 'script.js': CRLF }), ['script.js']));

  console.log(`\n${pass} passed, ${fails.length} failed`);
  return fails.length === 0;
};
