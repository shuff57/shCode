// lib/solution-variants.ts: the flat /api/lesson-solution `files` map becomes
// the groups the Solution panel offers, one per Chapter 3 problem, with the
// `variants/<problem>/` prefix stripped for an insert.
//
// The split matters in two directions. Wrongly KEPT, an insert writes
// `variants/lap-times/script.js` into the editor, a path the lesson does not
// have. Wrongly STRIPPED, an ordinary lesson whose solution happens to use a
// `variants` directory loses part of its file path.
//
// Run: node --import ./scripts/register-ts.mjs scripts/test-solution-variants.mjs
//      (also part of `npm test`)
import { strict as assert } from 'node:assert';
import { groupSolutionFiles, solutionVariantLabel } from '../lib/solution-variants.ts';

const results = [];
function check(name, fn) {
  try {
    fn();
    results.push(`  ok  ${name}`);
  } catch (e) {
    results.push(`FAIL  ${name}\n      ${e.message}`);
    process.exitCode = 1;
  }
}

check('no files means no groups', () => {
  assert.deepEqual(groupSolutionFiles(null), []);
  assert.deepEqual(groupSolutionFiles({}), []);
});

check('a lesson with no variants keeps today\'s single group', () => {
  const groups = groupSolutionFiles({ 'script.js': 'code' });
  assert.equal(groups.length, 1);
  assert.equal(groups[0].id, 'default');
  assert.equal(groups[0].label, 'Reference answer');
  assert.deepEqual(groups[0].files, { 'script.js': 'code' });
});

check('the default answer is labelled by the problem the variants do not cover', () => {
  const groups = groupSolutionFiles({
    'script.js': 'snack',
    'variants/lap-times/script.js': 'laps',
    'variants/seed-tray/script.js': 'seeds',
    'variants/library-cart/script.js': 'cart',
  });
  assert.deepEqual(
    groups.map((g) => [g.id, g.label]),
    [
      ['default', 'Snack Shack'],
      ['lap-times', 'Lap Times'],
      ['seed-tray', 'Seed Tray'],
      ['library-cart', 'Library Cart'],
    ],
  );
  assert.equal(groups[0].files['script.js'], 'snack');
});

check('the prefix is stripped from every variant file', () => {
  const groups = groupSolutionFiles({
    'variants/lap-times/docs/README.md': 'nested',
    'variants/lap-times/script.js': 'top',
  });
  assert.deepEqual(groups[0].files, {
    'docs/README.md': 'nested',
    'script.js': 'top',
  });
});

check('the menu follows the course order, not the directory order', () => {
  const groups = groupSolutionFiles({
    'variants/library-cart/script.js': 'c',
    'variants/lap-times/script.js': 'l',
    'variants/seed-tray/script.js': 's',
  });
  assert.deepEqual(groups.map((g) => g.id), ['lap-times', 'seed-tray', 'library-cart']);
});

check('all four as variants leaves no default group to label', () => {
  const groups = groupSolutionFiles({
    'variants/snack-shack/script.js': 'a',
    'variants/lap-times/script.js': 'b',
    'variants/seed-tray/script.js': 'c',
    'variants/library-cart/script.js': 'd',
  });
  assert.equal(groups.length, 4);
  assert.ok(groups.every((g) => g.id !== 'default'));
});

check('an unknown problem id gets a readable label and sorts last', () => {
  const groups = groupSolutionFiles({
    'variants/lap-times/script.js': 'l',
    'variants/pizza-club/script.js': 'p',
  });
  assert.equal(groups[1].label, 'Pizza Club');
  assert.deepEqual(groups.map((g) => g.id), ['lap-times', 'pizza-club']);
});

check('a variants FILE is not a variant directory', () => {
  const groups = groupSolutionFiles({ 'variants/README.md': 'plain' });
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].files, { 'variants/README.md': 'plain' });
});

check('labels: the four known problems, then a title-cased fallback', () => {
  assert.equal(solutionVariantLabel('snack-shack'), 'Snack Shack');
  assert.equal(solutionVariantLabel('library-cart'), 'Library Cart');
  assert.equal(solutionVariantLabel('pizza-club'), 'Pizza Club');
});

console.log(results.join('\n'));
console.log(
  process.exitCode
    ? `\n[test-solution-variants] ${results.filter((r) => r.startsWith('FAIL')).length} failure(s)`
    : '\n[test-solution-variants] OK — grouping and prefix stripping agree',
);
