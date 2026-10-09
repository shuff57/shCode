// Grader checks for the console labs in modules 3.4-3.8 (regex requirements).
//
// Found by the three student lenses (2026-10-09): every requirement matched text
// inside string literals, so `console.log("<the reference solution as text>")`
// scored full marks in 28 of 34 labs, and after 3.4 taught three ways to write a
// function, a dozen labs accepted only `function name(`.
//
// Two lists, both matter (same idea as test-grader-tolerance.mjs):
//   ACCEPT -- an answer a student could reasonably write; must score full marks.
//   REJECT -- an answer that has not done the work; must lose a requirement.
// Generic cases run for EVERY lab: reference passes, starter fails, and the
// reference printed as a string (the smuggle) fails.
//
// Run: node scripts/test-grader-tolerance-3x.mjs   (also part of `npm test`)

import { execFileSync } from 'child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, readdirSync, existsSync } from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
mkdirSync(path.join(root, 'node_modules', '.pkg-load-cache'), { recursive: true });
const out = mkdtempSync(path.join(root, 'node_modules', '.pkg-load-cache', 'shcode-tol3x-'));
const nl = '\n';

const read = (rel) => readFileSync(path.join(root, rel), 'utf8').replace(/\r\n?/g, '\n');
const lesson = (id) => JSON.parse(read(`lessons/${id}/lesson.json`));

function solutionFiles(id) {
  const dir = path.join(root, 'lessons', id, 'solution');
  if (existsSync(dir)) {
    const files = {};
    for (const f of readdirSync(dir)) files[f] = read(`lessons/${id}/solution/${f}`);
    return files;
  }
  return { 'script.js': read(`lessons/${id}/solution.js`) };
}
function starterFiles(id) {
  const files = { 'script.js': read(`lessons/${id}/script.js`) };
  if (existsSync(path.join(root, 'lessons', id, 'README.md'))) files['README.md'] = read(`lessons/${id}/README.md`);
  return files;
}

// Every console lab with regex requirements whose title starts 3.4 - 3.8.
const LABS = readdirSync(path.join(root, 'lessons')).filter((d) => {
  const p = path.join(root, 'lessons', d, 'lesson.json');
  if (!existsSync(p)) return false;
  const j = JSON.parse(readFileSync(p, 'utf8'));
  return /^3\.[4-8]\.\d+/.test(j.title || '') && j.preview === 'console' && (j.requirements || []).length > 0;
});

const cases = [];
const accept = (id, name, script) => cases.push({ id, name, files: { 'script.js': script }, expect: 'pass' });
const reject = (id, name, req, script) => cases.push({ id, name, files: { 'script.js': script }, expect: 'fail', req });

for (const id of LABS) {
  const sol = solutionFiles(id);
  cases.push({ id, name: 'reference solution', files: sol, expect: 'pass' });
  cases.push({ id, name: 'untouched starter', files: starterFiles(id), expect: 'fail' });
  // The smuggle: the whole reference, printed as a string, with nothing else.
  cases.push({
    id, name: 'reference printed as a string',
    files: { 'script.js': `console.log(${JSON.stringify(sol['script.js'])});${nl}` },
    expect: 'fail',
  });
}

const js = (...lines) => lines.join(nl) + nl;

// ---- 3.4.5: the result may be stored first; a function that is never called fails
accept('3-4-5-lab-declaration-to-expression', 'call stored in a variable, then logged',
  js('const double = function (n) { return n * 2; };', 'const r = double(7);', 'console.log(r);'));
accept('3-4-5-lab-declaration-to-expression', 'call inside a longer log expression',
  js('const double = function (n) { return n * 2; };', 'console.log("x = " + double(7));'));
reject('3-4-5-lab-declaration-to-expression', 'expression defined, never called, unrelated call logged', 'r2',
  js('const f = function () {};', 'console.log(Number(1));'));

// ---- 3.4.13: one-parameter arrow without parentheses; arrow and expression helpers
accept('3-4-13-lab-one-line-callback', 'n => n + 4 without parentheses',
  js('function transform(value, fn) { return fn(value); }', 'console.log(transform(6, n => n + 4));'));
accept('3-4-13-lab-one-line-callback', 'helper written as an arrow',
  js('const transform = (value, fn) => fn(value);', 'console.log(transform(6, (n) => n + 4));'));
accept('3-4-13-lab-one-line-callback', 'helper written as a function expression, callback first',
  js('const run = function (fn, value) { return fn(value); };', 'console.log(run(n => n * 3, 5));'));
reject('3-4-13-lab-one-line-callback', 'a block-bodied arrow is not the one-line callback', 'r2',
  js('function transform(value, fn) { return fn(value); }', 'console.log(transform(6, (n) => { return n + 4; }));'));
reject('3-4-13-lab-one-line-callback', 'helper never calls its function parameter', 'r1',
  js('function transform(value, fn) { return value; }', 'console.log(transform(6, n => n + 4));'));

// ---- 3.4.19: arrow helper; a callback named `log` is not console.log
accept('3-4-19-lab-callback-capstone', 'helper written as an arrow',
  js('const countMatching = (nums, test) => {', '  let c = 0;', '  for (const n of nums) { if (test(n)) { c++; } }', '  return c;', '};',
     'console.log(countMatching([1, 2, 3, 4], n => n > 2), countMatching([1, 2, 3, 4], n => n % 2 === 0));'));
reject('3-4-19-lab-callback-capstone', 'second parameter called `log`, never called', 'r3',
  js('function f(a, log) { for (const x of a) { console.log(x); } }', 'console.log(f([1], x => 1), f([2], y => 2));'));

// ---- 3.4.21 (3-1-10): greet as an arrow plus another function; defining greet is not calling it
accept('3-1-10-functions', 'greet as an arrow, second function a declaration',
  js('const greet = (name) => { return "Hi " + name; };', 'function shout(text) { return text + "!"; }', 'console.log(shout(greet("Sam")));'));
reject('3-1-10-functions', 'greet defined but never called', 'req4',
  js('function greet(name) { return "Hi " + name; }', 'const shout = (t) => t + "!";', 'console.log(shout("x"));'));

// ---- 3.5.12: alias and for...of both read a field off a record
accept('3-5-12-lab-nested-structure', 'for...of over the array, field read off the loop variable',
  js('const order = { customer: { name: "Ana" }, items: [{ name: "pen", qty: 2 }, { name: "ink", qty: 1 }] };',
     'console.log(order.customer.name);', 'for (const item of order.items) { console.log(item.name); }'));
accept('3-5-12-lab-nested-structure', 'index into the array through an alias',
  js('const order = { customer: { name: "Ana" }, items: [{ name: "pen", qty: 2 }] };',
     'console.log(order.customer.name);', 'for (let i = 0; i < order.items.length; i++) { const item = order.items[i]; console.log(item.name); }'));

// ---- 3.5.15: arrow method
accept('3-5-15-lab-add-method', 'method written as an arrow',
  js('const s = { name: "Ana", hi: () => "Hello!" };', 'console.log(s.hi());'));

// ---- 3.5.18: arrow, expression and destructured one-parameter functions; console.log({..}) is no call
accept('3-5-18-lab-params-to-object', 'one-parameter arrow reading a property',
  js('const describe = (o) => o.width * o.height;', 'console.log(describe({ width: 2, height: 3 }));'));
accept('3-5-18-lab-params-to-object', 'function expression',
  js('const describe = function (o) { return o.width * o.height; };', 'console.log(describe({ width: 2, height: 3 }));'));
reject('3-5-18-lab-params-to-object', 'function never called, only an object logged', 'r3',
  js('function describe(o) { return o.width; }', 'console.log({ width: 2 });'));

// ---- 3.5.22: arrow with a destructured parameter
accept('3-5-22-lab-destructure-three', 'arrow with destructured parameter',
  js('const book = { title: "T", author: "A", pages: 9 };', 'const { title, author, pages } = book;',
     'const d = ({ title, pages }) => title + pages;', 'console.log(d(book), author);'));

// ---- 3.6: arrow versions of the named functions; copyBook that just returns its argument
accept('3-6-4-lab-predict-primitive-vs-array', 'arrow versions',
  js('const changeNum = (n) => { n = n + 1; };', 'const changeArr = (a) => { a.push(9); };',
     'let x = 1; const l = [1];', 'changeNum(x); changeArr(l);', 'console.log(x, l);'));
accept('3-6-12-lab-object-param-mutation', 'arrow versions',
  js('const birthday = (p) => { p.age++; };', 'const birthdaySafe = (p) => ({ ...p, age: p.age + 1 });',
     'const a = { age: 10 };', 'birthday(a);', 'console.log(a, birthdaySafe(a));'));
accept('3-6-16-lab-capstone', 'arrow versions, structuredClone inside copyBook',
  js('const addScore = (s, n) => [...s, n];', 'const recordPlay = (song) => { song.plays++; };',
     'const copyBook = (b) => structuredClone(b);', 'console.log(addScore([1], 2), copyBook({ a: [1] }));',
     'const song = { plays: 0 }; recordPlay(song); console.log(song);'));
reject('3-6-16-lab-capstone', 'copyBook returns its argument; structuredClone used elsewhere', 'r5',
  js('function addScore(s, n) { return [...s, n]; }', 'function recordPlay(song) { song.plays++; }',
     'function copyBook(b) { return b; }', 'const z = structuredClone({});', 'console.log(addScore([1], 2), copyBook({}), z);'));

// ---- 3.7: filter is a non-mutating method; a quoted key can be the override
accept('3-7-21-lab-mutating-sort-drill', 'filter as the non-mutating call',
  js('const a = [1, 2, 3];', 'a.push(4);', 'console.log(a.filter((n) => n > 1));', 'console.log(a);'));
accept('3-7-18-lab-spread-object', 'quoted key as the override',
  js('const s = { theme: "dark" };', 'const t = { ...s, "font size": 14 };', 'console.log(t);'));

try {
  execFileSync(process.execPath, [
    path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'), 'lib/run-tests-node.ts',
    '--outDir', out, '--module', 'commonjs', '--target', 'es2022', '--skipLibCheck',
  ], { cwd: root, stdio: 'inherit' });
  writeFileSync(path.join(out, 'package.json'), '{"type":"commonjs"}');
  const require = createRequire(import.meta.url);
  const { gradeWithTests } = require(path.join(out, 'run-tests-node.js').replace(/\\/g, '/'));

  const reqsFor = new Map();
  let failures = 0;
  for (const c of cases) {
    if (!reqsFor.has(c.id)) reqsFor.set(c.id, lesson(c.id).requirements);
    const report = await gradeWithTests(reqsFor.get(c.id), c.files, 0);
    const failed = report.results.filter((r) => r.status === 'failed');
    let ok, detail = '';
    if (c.expect === 'pass') {
      ok = failed.length === 0;
      if (!ok) detail = `lost ${failed.map((f) => f.id).join(', ')}`;
    } else if (c.req) {
      ok = failed.some((f) => f.id === c.req);
      if (!ok) detail = failed.length ? `expected ${c.req} to fail, ${failed.map((f) => f.id).join(', ')} did` : `expected ${c.req} to fail, everything passed`;
    } else {
      ok = failed.length > 0;
      if (!ok) detail = 'expected some requirement to fail, everything passed';
    }
    if (!ok) {
      failures++;
      console.log(`  FAIL  ${c.id}  ${c.expect === 'pass' ? 'accept' : 'reject'}: ${c.name}  -- ${detail}`);
    }
  }
  const accepts = cases.filter((c) => c.expect === 'pass').length;
  if (failures === 0) {
    console.log(`grader tolerance 3.4-3.8: ${cases.length} cases OK (${accepts} accepted, ${cases.length - accepts} rejected, ${LABS.length} labs)`);
  } else {
    console.log(`grader tolerance 3.4-3.8: ${failures} of ${cases.length} cases wrong`);
    process.exit(1);
  }
} finally {
  rmSync(out, { recursive: true, force: true });
}
