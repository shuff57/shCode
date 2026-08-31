// Acceptance matrix for unit 2.1's auto-graders.
//
// Written 2026-08-31 after three cs-student-* lenses reviewed the unit and
// found the same rubrics failing in BOTH directions at once: refusing correct
// answers (2.1.36 demanded one operand order; 2.1.37 r3 refused the lesson's
// own suggested nested-paren shape) while accepting answers that skipped the
// exercise entirely (`if(true&&true){}` scored full marks on 2.1.32, and the
// unit capstone scored 4/4 for `if(1){}else if(1){}...`).
//
// The two failure modes are one bug: requirements checked that a construct was
// PRESENT, never that it related to anything. Tightening alone would have
// re-broken the correct answers, so every case below is paired on purpose --
// a must-pass answer in a shape the course itself teaches, the cheap answer
// that must now fail, and the untouched starter, which must score 0.
//
// Guard when editing these patterns: run this file. It reproduced all seven
// defects before the fix, so it can fail.
// a correct differently-shaped answer that must still PASS, and the untouched
// starter, which must score 0.
import { execFileSync } from 'child_process';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, readdirSync } from 'fs';
import { createRequire } from 'module';
import { tmpdir } from 'os';
import path from 'path';

const root = process.cwd();
const out = mkdtempSync(path.join(tmpdir(), 'fix21-'));
execFileSync(process.execPath, [
  path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
  'lib/grader.ts', '--outDir', out, '--module', 'commonjs', '--target', 'es2022', '--skipLibCheck',
], { cwd: root, stdio: 'inherit' });
writeFileSync(path.join(out, 'package.json'), '{"type":"commonjs"}');
const { grade } = createRequire(import.meta.url)(path.join(out, 'grader.js'));

const byNum = {};
for (const d of readdirSync('lessons')) {
  const f = path.join('lessons', d, 'lesson.json');
  if (!existsSync(f)) continue;
  const j = JSON.parse(readFileSync(f, 'utf8'));
  byNum[j.title.split(' ')[0]] = { dir: d, j };
}

let failures = 0;
const check = (num, label, src, want) => {
  const e = byNum[num];
  const reqs = e.j.requirements;
  const passed = grade(reqs, { 'script.js': src }).results.filter((r) => r.status === 'passed').length;
  const got = passed === reqs.length ? 'ALL' : (passed === 0 ? 'NONE' : `${passed}/${reqs.length}`);
  const ok = want === 'ALL' ? got === 'ALL' : (want === 'NOT_ALL' ? got !== 'ALL' : got === want);
  if (!ok) failures++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${num.padEnd(8)} ${label.padEnd(42)} ${got.padEnd(5)} (want ${want})`);
};

// every lesson's reference solution must still score full marks
console.log('MUST PASS — reference solutions');
for (const num of ['2.1.19', '2.1.32', '2.1.33', '2.1.36', '2.1.37', '2.1.42']) {
  const e = byNum[num];
  check(num, 'solution.js', readFileSync(path.join('lessons', e.dir, 'solution.js'), 'utf8'), 'ALL');
}

console.log('\nMUST PASS — correct answers in a different shape');
check('2.1.36', 'reversed operands: hasKey && isAlive',
  'const isAlive = true;\nconst hasKey = false;\nif (hasKey && isAlive) { console.log("open"); }', 'ALL');
check('2.1.19', 'constant-first: 100 === temperature',
  'let temperature = 20;\nif (100 === temperature) { console.log("x"); }\nconsole.log(temperature);', 'ALL');
check('2.1.37', "lesson's own suggested nested-paren shape",
  'const hasTicket=true, age=10, isBlocked=false;\nif ((hasTicket && (age < 5 || age >= 65)) && !isBlocked) { console.log("in"); }', 'ALL');
check('2.1.32', 'student picked their own variable names',
  'const temperature = 30;\nconst humidity = 80;\nif (temperature > 20 && humidity > 50) { console.log("muggy"); }', 'ALL');
check('2.1.33', 'bare booleans, no comparison operators',
  'const isWeekend = true;\nconst isHoliday = false;\nif (isWeekend || isHoliday) { console.log("off"); }', 'ALL');
check('2.1.33', 'let instead of const, no semicolons',
  'let a = 1\nlet b = 2\nif (a > 0 || b > 0) { console.log("yes") }', 'ALL');
check('2.1.42', 'reference shape with two separate ifs',
  readFileSync(path.join('lessons', byNum['2.1.42'].dir, 'solution.js'), 'utf8'), 'ALL');

console.log('\nMUST FAIL — the gaming answers');
check('2.1.32', 'if(true&&true){}', 'if(true&&true){}', 'NOT_ALL');
check('2.1.33', 'if(1||0){}', 'if(1||0){}', 'NOT_ALL');
check('2.1.37', 'three unrelated ifs', 'if(a&&b){}\nif(c||d){}\nif(!e){}', 'NOT_ALL');
check('2.1.42', 'placeholder conditions, no real variables',
  'if(1){}else if(1){}else if(1){}\nif(1||1){}\nconsole.log(1);', 'NOT_ALL');
check('2.1.36', 'the untouched || bug',
  'const isAlive = true;\nconst hasKey = false;\nif (isAlive || hasKey) { console.log("open"); }', 'NOT_ALL');

console.log('\nMUST SCORE ZERO — untouched starters');
for (const num of ['2.1.19', '2.1.32', '2.1.33', '2.1.36', '2.1.37', '2.1.42']) {
  const e = byNum[num];
  check(num, 'script.js as shipped', readFileSync(path.join('lessons', e.dir, 'script.js'), 'utf8'), 'NONE');
}

console.log(failures ? `\n${failures} FAILURE(S)` : '\nall acceptance cases hold');
process.exit(failures ? 1 : 0);
