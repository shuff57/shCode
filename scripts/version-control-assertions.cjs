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

  console.log(`\n${pass} passed, ${fails.length} failed`);
  return fails.length === 0;
};
