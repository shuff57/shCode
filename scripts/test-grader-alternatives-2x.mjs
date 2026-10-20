// Chapter 2 graders: 2.7.3 r3 (savings) and r4 (walking log), 2.4.23 r4, 2.3.26 r2-r5. Each must accept the fixes a
// student can reasonably reach besides the reference's, and still refuse the
// untouched starter. Reported while auditing grader tolerance: both patterns
// demanded the reference's exact move (savings above the skip; i++ before a
// continue), so a correct fix that removed the continue turned red.
//
//   node scripts/test-grader-alternatives-2x.mjs

import fs from 'node:fs';
import path from 'node:path';

const LESSONS = path.resolve(import.meta.dirname, '..', 'lessons');
const DIR = path.join(LESSONS, '2-7-3-ch2-individual-pa-find-and-fix');
const re = (id, lessonDir = '2-7-3-ch2-individual-pa-find-and-fix') => {
  const lesson = JSON.parse(fs.readFileSync(path.join(LESSONS, lessonDir, 'lesson.json'), 'utf8'));
  const r = lesson.requirements.find((x) => x.id === id);
  return new RegExp(r.pattern, r.flags || '');
};
const strip = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
const read = (f) => fs.readFileSync(path.join(DIR, f), 'utf8').replace(/\r\n/g, '\n');
const starter = strip(read('script.js'));
const solution = strip(read('solution.js'));

const loop3 = (body) => `const DEPOSIT = 10;\nlet savings = 0;\nfor (let w = 1; w <= 4; w++) {\n${body}\n}\n`;
const loop4 = (body) => `let i = 0;\nwhile (i < 5) {\n${body}\n}\n`;

const cases = [
  ['r3', 'starter is refused', starter, false],
  ['r3', 'reference passes', solution, true],
  ['r3', 'guard instead of continue', loop3('  savings += DEPOSIT;\n  if (w !== 3) {\n    console.log("Week " + w);\n  }'), true],
  ['r3', 'guard written != 3', loop3('  if (w != 3) console.log("Week " + w);\n  savings = savings + DEPOSIT;'), true],
  ['r3', 'continue still above the deposit', loop3('  if (w === 3) {\n    continue;\n  }\n  savings += DEPOSIT;\n  console.log("Week " + w);'), false],
  ['r3', 'deposit only inside the guard', loop3('  if (w !== 3) {\n    savings += DEPOSIT;\n    console.log("Week " + w);\n  }'), true],
  ['r4', 'starter is refused', starter, false],
  ['r4', 'reference passes', solution, true],
  ['r4', 'increment first, no continue', loop4('  i++;\n  if (i % 2 !== 0) {\n    console.log("Week " + i);\n  }'), true],
  ['r4', 'increment inside the skip', loop4('  if (i % 2 === 0) {\n    i++;\n    continue;\n  }\n  console.log("Week " + i);\n  i++;'), true],
  ['r4', 'increment still after the continue', loop4('  if (i % 2 === 0) {\n    continue;\n  }\n  console.log("Week " + i);\n  i++;'), false],
];

const sw = (body) => `const light = 'green';\nlet msg;\nswitch (light) {\n${body}\n}\nconsole.log(msg);\n`;
const swCases = ['r2', 'r3', 'r4', 'r5'].flatMap((id) => {
  const label = { r2: "case 'green':", r3: "case 'yellow':", r4: "case 'red':", r5: 'default:' }[id];
  const others = ["case 'green':", "case 'yellow':", "case 'red':", 'default:'].filter((l) => l !== label);
  const body = (l) => `  ${l}\n    msg = 'x';\n    break;`;
  return [
    [id, 'message variable set in the case', sw([label, ...others].map(body).join('\n')), true],
    [id, 'case missing', sw(others.map(body).join('\n')), false],
  ];
});
const k = (update, bodyLog = 'console.log(k);') => `for (let k = 1; k <= 5; ${update}) {\n  ${bodyLog}\n}\n`;
const kCases = [
  ['r4k', 'k++', k('k++'), true],
  ['r4k', 'k += 1', k('k += 1'), true],
  ['r4k', 'k = k + 1', k('k = k + 1'), true],
  ['r4k', 'k-- is still refused', k('k--'), false],
  ['r4k', 'no log in the body', k('k++', ''), false],
];
cases.push(...swCases, ...kCases);

let bad = 0;
for (const [id, name, src, want] of cases) {
  const got = id === 'r4k' ? re('r4', '2-4-23-a2-4-1-debug-five-loops').test(src)
    : name.startsWith('message') || name === 'case missing' ? re(id, '2-3-26-lab-traffic-light').test(src)
    : re(id).test(src);
  if (got !== want) {
    bad++;
    console.error(`FAIL ${id}: ${name} -- expected ${want ? 'pass' : 'refuse'}`);
  }
}
if (bad) process.exit(1);
console.log(`[test-grader-alternatives-2x] ${cases.length} cases ok`);
