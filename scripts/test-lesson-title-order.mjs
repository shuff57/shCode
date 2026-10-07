// lib/lesson-title-order.ts: lessons order by the number in the title, not the folder id.
// Run: node scripts/test-lesson-title-order.mjs   (also part of `npm test`)
import { strict as assert } from 'node:assert';
import { titleNumber, compareLessons, compareUnitLabels, lessonLabel } from '../lib/lesson-title-order.ts';

const results = [];
function check(name, fn) {
  try { fn(); results.push(`  ok  ${name}`); } catch (e) { results.push(`FAIL  ${name}\n      ${e.message}`); process.exitCode = 1; }
}
const L = (n, id) => ({ id: id ?? `3-2-${n}-x`, title: `3.2.${n} Thing` });

check('titleNumber reads the leading dotted number', () => {
  assert.deepEqual(titleNumber('3.2.10 Loops'), [3, 2, 10]);
  assert.equal(titleNumber('Intro'), null);
});
check('3.2 lessons sort numerically even when folder ids sort as strings', () => {
  const ids = [2, 20, 22, 23, 1, 3, 10, 4];
  const got = ids.map((n) => L(n)).sort(compareLessons).map((l) => l.title.split(' ')[0]);
  assert.deepEqual(got, ['3.2.1', '3.2.2', '3.2.3', '3.2.4', '3.2.10', '3.2.20', '3.2.22', '3.2.23']);
});
check('3.3.18 comes after 3.3.4', () => {
  const got = [{ id: 'a', title: '3.3.18 B' }, { id: 'b', title: '3.3.4 A' }].sort(compareLessons).map((l) => l.id);
  assert.deepEqual(got, ['b', 'a']);
});
check('unnumbered lessons sort after numbered ones', () => {
  const got = [{ id: 'z', title: 'Extra' }, { id: 'a', title: '3.1.1 A' }].sort(compareLessons).map((l) => l.id);
  assert.deepEqual(got, ['a', 'z']);
});
check('unit labels sort numerically with Other last', () => {
  const got = ['3.10', '3.4', 'Other', '3.2', '3.1', '3.6', '3.5'].sort(compareUnitLabels);
  assert.deepEqual(got, ['3.1', '3.2', '3.4', '3.5', '3.6', '3.10', 'Other']);
});
check('lessonLabel falls back to the id', () => {
  assert.equal(lessonLabel('x', { x: '3.3.14 Filter' }), '3.3.14 Filter');
  assert.equal(lessonLabel('y', { x: 'q' }), 'y');
});
console.log(results.join('\n'));
