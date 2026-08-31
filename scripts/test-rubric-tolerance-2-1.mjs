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

// Keyed by FOLDER ID, never by display number. Display numbers move every
// time a lesson is inserted or reordered; folder ids do not. Keying on the
// number is what broke this file the first time the unit was resequenced.
const LAB = {
  equals:   '2-1-9b-lab-count-the-equals',
  guardAnd: '2-1-12-lab-guard-and',
  branchOr: '2-1-13-lab-branch-or',
  door:     '2-1-33-lab-debug-door',
  combine:  '2-1-34-lab-combine-logical',
  advisor:  '2-1-38-a2-1-1-grade-advisor',
};
const byNum = {};
for (const [, dir] of Object.entries(LAB)) {
  const f = path.join('lessons', dir, 'lesson.json');
  if (!existsSync(f)) { console.error(`missing lesson folder: ${dir}`); process.exit(1); }
  byNum[dir] = { dir, j: JSON.parse(readFileSync(f, 'utf8')) };
}
// display number is shown in output for readability only
const lessonLabel = (dir) => `${byNum[dir].j.title.split(' ')[0]} ${dir.replace(/^2-1-[0-9a-z]+-/, '')}`;

let failures = 0;
const check = (num, label, src, want) => {
  const e = byNum[num];
  const reqs = e.j.requirements;
  const passed = grade(reqs, { 'script.js': src }).results.filter((r) => r.status === 'passed').length;
  const got = passed === reqs.length ? 'ALL' : (passed === 0 ? 'NONE' : `${passed}/${reqs.length}`);
  const ok = want === 'ALL' ? got === 'ALL' : (want === 'NOT_ALL' ? got !== 'ALL' : got === want);
  if (!ok) failures++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${lessonLabel(num).padEnd(26)} ${label.padEnd(42)} ${got.padEnd(5)} (want ${want})`);
};

// every lesson's reference solution must still score full marks
console.log('MUST PASS — reference solutions');
for (const num of [LAB.equals, LAB.guardAnd, LAB.branchOr, LAB.door, LAB.combine, LAB.advisor]) {
  const e = byNum[num];
  check(num, 'solution.js', readFileSync(path.join('lessons', e.dir, 'solution.js'), 'utf8'), 'ALL');
}

console.log('\nMUST PASS — correct answers in a different shape');
check(LAB.door, 'reversed operands: hasKey && isAlive',
  'const isAlive = true;\nconst hasKey = false;\nif (hasKey && isAlive) { console.log("open"); }', 'ALL');
check(LAB.equals, 'constant-first: 100 === temperature',
  'let temperature = 20;\nif (100 === temperature) { console.log("x"); }\nconsole.log(temperature);', 'ALL');
check(LAB.combine, "lesson's own suggested nested-paren shape",
  'const hasTicket=true, age=10, isBlocked=false;\nif ((hasTicket && (age < 5 || age >= 65)) && !isBlocked) { console.log("in"); }', 'ALL');
check(LAB.guardAnd, 'student picked their own variable names',
  'const temperature = 30;\nconst humidity = 80;\nif (temperature > 20 && humidity > 50) { console.log("muggy"); }', 'ALL');
check(LAB.branchOr, 'bare booleans, no comparison operators',
  'const isWeekend = true;\nconst isHoliday = false;\nif (isWeekend || isHoliday) { console.log("off"); }', 'ALL');
// Both shapes are in cs-student-tester.md's tolerance table and both are
// modelled by the course at 1.3.11. The first tightening of r2 refused them.
check(LAB.guardAnd, 'declare then assign on a later line',
  ['let temperature;', 'let humidity = 80;', 'temperature = 30;',
   'if (temperature > 20 && humidity > 50) { console.log("muggy"); }'].join('\n'), 'ALL');
check(LAB.guardAnd, 'several names on one let',
  ['let a = 1, b = 2;', 'if (a > 0 && b > 0) { console.log("yes"); }'].join('\n'), 'ALL');
check(LAB.branchOr, 'declare then assign on a later line',
  ['let isWeekend;', 'let isHoliday = false;', 'isWeekend = true;',
   'if (isWeekend || isHoliday) { console.log("off"); }'].join('\n'), 'ALL');
check(LAB.branchOr, 'let instead of const, no semicolons',
  'let a = 1\nlet b = 2\nif (a > 0 || b > 0) { console.log("yes") }', 'ALL');
check(LAB.advisor, 'reference shape with two separate ifs',
  readFileSync(path.join('lessons', byNum[LAB.advisor].dir, 'solution.js'), 'utf8'), 'ALL');

console.log('\nMUST FAIL — the gaming answers');
check(LAB.guardAnd, 'if(true&&true){}', 'if(true&&true){}', 'NOT_ALL');
check(LAB.branchOr, 'if(1||0){}', 'if(1||0){}', 'NOT_ALL');
check(LAB.combine, 'three unrelated ifs', 'if(a&&b){}\nif(c||d){}\nif(!e){}', 'NOT_ALL');
check(LAB.advisor, 'placeholder conditions, no real variables',
  'if(1){}else if(1){}else if(1){}\nif(1||1){}\nconsole.log(1);', 'NOT_ALL');
check(LAB.door, 'the untouched || bug',
  'const isAlive = true;\nconst hasKey = false;\nif (isAlive || hasKey) { console.log("open"); }', 'NOT_ALL');

console.log('\nMUST SCORE ZERO — untouched starters');
for (const num of [LAB.equals, LAB.guardAnd, LAB.branchOr, LAB.door, LAB.combine, LAB.advisor]) {
  const e = byNum[num];
  check(num, 'script.js as shipped', readFileSync(path.join('lessons', e.dir, 'script.js'), 'utf8'), 'NONE');
}

console.log(failures ? `\n${failures} FAILURE(S)` : '\nall acceptance cases hold');
process.exit(failures ? 1 : 0);
