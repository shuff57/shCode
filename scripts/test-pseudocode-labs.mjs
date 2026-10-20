// The "Plain English to Pseudocode" labs replaced the Chart-the-Code activities
// (5.4.6 and 3.7.5 / 3.7.16 so far). A student types numbered pseudocode into
// README.md and six regex requirements grade it, no model call. For each lab
// this proves, offline:
//   - the starter README.md passes nothing (a target must not equal the starter);
//   - the reference (solution/README.md) passes every requirement;
//   - a lower-case, differently spaced version of the reference still passes;
//   - each classic mistake fails exactly the requirement it is about, and no other.
// Run: node scripts/test-pseudocode-labs.mjs   (also part of `npm test`)

import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
let n = 0;
const check = (ok, msg) => { n++; if (!ok) { failures++; console.log('  FAIL  ' + msg); } };

const lines = (...l) => l.join('\n') + '\n';

// Every mutation: the text the student types and the ONE requirement that must go red.
const LABS = {
  '5-3-20a-chart-the-method-chain': {
    frame: (body) => lines('takeDamage(amount) starts', body, 'back to the caller'),
    muts: [
      ['flashRed inside the IF', ['r5'], lines('1. SET health TO health - amount', '2. IF health <= 0', '3.   CALL die', '4.   CALL flashRed', '5. END IF')],
      ['die outside the IF', ['r4'], lines('1. SET health TO health - amount', '2. CALL die', '3. IF health <= 0', '4. END IF', '5. CALL flashRed')],
      ['a third CALL', ['r6'], lines('1. SET health TO health - amount', '2. IF health <= 0', '3.   CALL die', '4. END IF', '5. CALL flashRed', '6. CALL removeSprite')],
      ['flipped test: health > 0', ['r3'], lines('1. SET health TO health - amount', '2. IF health > 0', '3.   CALL die', '4. END IF', '5. CALL flashRed')],
      ['health == 0 only', ['r3'], lines('1. SET health TO health - amount', '2. IF health == 0', '3.   CALL die', '4. END IF', '5. CALL flashRed')],
      ['two IFs', ['r3'], lines('1. SET health TO health - amount', '2. IF health <= 0', '3. IF health < 5', '4.   CALL die', '5. END IF', '6. CALL flashRed')],
      ['not numbered', ['r1'], lines('SET health TO health - amount', 'IF health <= 0', '  CALL die', 'END IF', 'CALL flashRed')],
    ],
    lower: lines('1. set health to health - amount', '2. if health is 0 or less', '3.   call die', '4. end if', '5. call flashRed'),
    ok: [
      ['CALL this.die / this.flashRed', lines('1. SET health TO health - amount', '2. IF health <= 0', '3.   CALL this.die', '4. END IF', '5. CALL this.flashRed')],
      ['health -= amount', lines('1. SET health -= amount', '2. IF health <= 0', '3.   CALL die', '4. END IF', '5. CALL flashRed')],
      ['END  IF with two spaces', lines('1. SET health TO health - amount', '2. IF health <= 0', '3.   CALL die', '4. END  IF', '5. CALL flashRed')],
      ['ENDIF as one word', lines('1. SET health TO health - amount', '2. IF health <= 0', '3.   CALL die', '4. ENDIF', '5. CALL flashRed')],
      ['a comment that says sprite', lines('1. SET health TO health - amount', '2. IF health <= 0', '3.   CALL die (removes the sprite)', '4. END IF', '5. CALL flashRed')],
      ['blank lines between steps', lines('1. SET health TO health - amount', '', '2. IF health <= 0', '', '3.   CALL die', '', '4. END IF', '', '5. CALL flashRed')],
    ],
  },
  '3-7-5-chart-map-trace': {
    frame: (body) => lines('START', body, 'END'),
    muts: [
      ['print inside the loop', ['r6'], lines('1. SET withTax TO an empty list', '2. FOR EACH price IN prices', '3.   ADD price * 1.08 TO withTax', '4.   OUTPUT withTax', '5. END FOR', '6. OUTPUT withTax')],
      ['only a print inside the loop', ['r5', 'r6'], lines('1. SET withTax TO an empty list', '2. FOR EACH price IN prices', '3.   ADD price * 1.08 TO withTax', '4.   OUTPUT withTax', '5. END FOR')],
      ['add after the loop, not inside it', ['r4'], lines('1. SET withTax TO an empty list', '2. FOR EACH price IN prices', '3. END FOR', '4. ADD price * 1.08 TO withTax', '5. OUTPUT withTax')],
      ['list never started', ['r2'], lines('1. DO NOTHING YET', '2. FOR EACH price IN prices', '3.   ADD price * 1.08 TO withTax', '4. END FOR', '5. OUTPUT withTax')],
      ['no END FOR', ['r3', 'r5', 'r6'], lines('1. SET withTax TO an empty list', '2. FOR EACH price IN prices', '3.   ADD price * 1.08 TO withTax', '4. OUTPUT withTax', '5. KEEP GOING')],
      ['divides instead of multiplying', ['r4'], lines('1. SET withTax TO an empty list', '2. FOR EACH price IN prices', '3.   ADD price / 1.08 TO withTax', '4. END FOR', '5. OUTPUT withTax')],
      ['adds a name the loop never made', ['r4'], lines('1. SET withTax TO an empty list', '2. FOR EACH x IN prices', '3.   ADD price * 1.08 TO withTax', '4. END FOR', '5. OUTPUT withTax')],
      ['a second END FOR', ['r3'], lines('1. SET withTax TO an empty list', '2. FOR EACH price IN prices', '3.   ADD price * 1.08 TO withTax', '4. END FOR', '5. END FOR', '6. OUTPUT withTax')],
      ['nothing printed at all', ['r5'], lines('1. SET withTax TO an empty list', '2. FOR EACH price IN prices', '3.   ADD price * 1.08 TO withTax', '4. END FOR', '5. SET done TO true')],
      ['adds the untaxed price', ['r4'], lines('1. SET withTax TO an empty list', '2. FOR EACH price IN prices', '3.   ADD price TO withTax', '4. END FOR', '5. OUTPUT withTax')],
    ],
    lower: lines('1. set withTax to a new empty array', '2. for each price in prices', '3.   push price * 1.08 to withTax', '4. end for', '5. print withTax'),
    ok: [
      ['RETURN instead of OUTPUT', lines('1. SET withTax TO an empty list', '2. FOR EACH price IN prices', '3.   ADD price * 1.08 TO withTax', '4. END FOR', '5. RETURN withTax')],
      ['ENDFOR in one word', lines('1. SET withTax TO an empty list', '2. FOR EACH price IN prices', '3.   ADD price * 1.08 TO withTax', '4. ENDFOR', '5. OUTPUT withTax')],
      ['SET withTax TO the array []', lines('1. SET withTax TO the array []', '2. FOR EACH price IN prices', '3.   ADD price * 1.08 TO withTax', '4. END FOR', '5. OUTPUT withTax')],
      ['SET withTax TO withTax + price * 1.08', lines('1. SET withTax TO an empty list', '2. FOR EACH price IN prices', '3.   SET withTax TO withTax + price * 1.08', '4. END FOR', '5. OUTPUT withTax')],
      ['FOR EACH price OF the prices', lines('1. SET withTax TO an empty list', '2. FOR EACH price OF the prices', '3.   ADD price * 1.08 TO withTax', '4. END FOR', '5. OUTPUT withTax')],
      ['blank lines between steps', lines('1. SET withTax TO an empty list', '', '2. FOR EACH price IN prices', '', '3.   ADD price * 1.08 TO withTax', '', '4. END FOR', '', '5. OUTPUT withTax')],
    ],
  },
  '3-7-16-chart-spread-vs-rest': {
    frame: (body) => lines('total(...numbers) starts', body, 'back to the caller'),
    muts: [
      ['return inside the loop', ['r6'], lines('1. SET sum TO 0', '2. FOR EACH number IN numbers', '3.   SET sum TO sum + number', '4.   RETURN sum', '5. END FOR', '6. RETURN sum')],
      ['only a return inside the loop', ['r5', 'r6'], lines('1. SET sum TO 0', '2. FOR EACH number IN numbers', '3.   SET sum TO sum + number', '4.   RETURN sum', '5. END FOR')],
      ['sum never started at 0', ['r2'], lines('1. DO NOTHING YET', '2. FOR EACH number IN numbers', '3.   SET sum TO sum + number', '4. END FOR', '5. RETURN sum')],
      ['add outside the loop', ['r4'], lines('1. SET sum TO 0', '2. FOR EACH number IN numbers', '3. END FOR', '4. SET sum TO sum + number', '5. RETURN sum')],
      ['counts instead of adds', ['r4'], lines('1. SET sum TO 0', '2. FOR EACH number IN numbers', '3.   SET sum TO sum + 1', '4. END FOR', '5. RETURN sum')],
      ['adds a name the loop never made', ['r4'], lines('1. SET sum TO 0', '2. FOR EACH n IN numbers', '3.   SET sum TO sum + number', '4. END FOR', '5. RETURN sum')],
      ['nothing returned at all', ['r5'], lines('1. SET sum TO 0', '2. FOR EACH number IN numbers', '3.   SET sum TO sum + number', '4. END FOR', '5. SET done TO true')],
      ['loops over the wrong list', ['r3'], lines('1. SET sum TO 0', '2. FOR EACH number IN scores', '3.   SET sum TO sum + number', '4. END FOR', '5. RETURN sum')],
    ],
    lower: lines('1. set sum = 0', '2. for each n in numbers', '3.   add n to sum', '4. end for', '5. return sum'),
    ok: [
      ['OUTPUT instead of RETURN', lines('1. SET sum TO 0', '2. FOR EACH number IN numbers', '3.   SET sum TO sum + number', '4. END FOR', '5. OUTPUT sum')],
      ['give back sum', lines('1. SET sum TO 0', '2. FOR EACH number IN numbers', '3.   SET sum TO sum + number', '4. END FOR', '5. give back sum')],
      ['sum plus number', lines('1. SET sum TO 0', '2. FOR EACH number IN numbers', '3.   SET sum TO sum plus number', '4. END FOR', '5. RETURN sum')],
      ['sum += number', lines('1. SET sum TO 0', '2. FOR EACH number IN numbers', '3.   sum += number', '4. END FOR', '5. RETURN sum')],
      ['Start sum at 0', lines('1. Start sum at 0', '2. FOR EACH number IN numbers', '3.   SET sum TO sum + number', '4. END FOR', '5. RETURN sum')],
    ],
  },
};

for (const [id, lab] of Object.entries(LABS)) {
  const dir = path.join(root, 'lessons', id);
  const lesson = JSON.parse(readFileSync(path.join(dir, 'lesson.json'), 'utf8'));
  const reqs = lesson.requirements;
  const starter = readFileSync(path.join(dir, 'README.md'), 'utf8');
  const solution = readFileSync(path.join(dir, 'solution', 'README.md'), 'utf8');

  check(lesson.preview === 'console' && !lesson.diagram, `${id}: a console lab with no diagram block`);
  check(!!lesson.planChart?.mermaid && /^flowchart LR/.test(lesson.planChart.mermaid), `${id}: a left-to-right read-only chart above the editor`);
  check(reqs.length === 6 && reqs.every((r) => r.file === 'README.md' && r.stripComments === false && r.pattern), `${id}: six README.md requirements that read comments`);

  // grade(): what lib/grader.ts checkRegex does, minus the comment stripping a pseudocode file must skip
  const results = (text) => Object.fromEntries(reqs.map((r) => [r.id, new RegExp(r.pattern, r.flags ?? '').test(text)]));
  const red = (text) => Object.entries(results(text)).filter(([, ok]) => !ok).map(([k]) => k);

  check(red(starter).length === reqs.length, `${id}: the starter passes nothing (red: ${red(starter)})`);
  check(red(solution).length === 0, `${id}: the reference passes everything (red: ${red(solution)})`);
  check(red(lab.frame(lab.lower)).length === 0, `${id}: lower-case, differently worded answer passes (red: ${red(lab.frame(lab.lower))})`);
  check(solution.split('\n')[0] === starter.split('\n')[0], `${id}: starter and reference share the first line`);

  for (const [name, body] of lab.ok ?? []) {
    const got = red(lab.frame(body));
    check(got.length === 0, `${id}: honest answer "${name}" passes (red: ${got.join() || 'none'})`);
  }
  for (const [name, mustFail, body] of lab.muts) {
    const got = red(lab.frame(body));
    const want = [...mustFail].sort().join();
    check(got.slice().sort().join() === want, `${id}: "${name}" goes red on exactly ${want || 'none'} (got ${got.join() || 'none'})`);
  }
}

console.log(`[test-pseudocode-labs] ${n - failures}/${n} checks passed`);
process.exit(failures ? 1 : 0);
