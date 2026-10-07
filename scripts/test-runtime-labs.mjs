// The runtime `tests` requirements of the 3.1-3.3 labs, graded for real.
//
// WHY. The regex graders of these labs only see the SHAPE of the code, so the gap
// analysis found wrong-but-shaped programs scoring full marks: findMax returning
// the smaller value, isEven testing n % 3, sumToN adding 1 (or stopping at i < n),
// triple returning n * 7, a guard on b > 100, findRectangleArea printing w * w, a
// "new array" function that quietly changed its input. Each lab now also carries
// a `tests` requirement (type 'tests', lib/test-harness-source.ts) that CALLS the
// student's function.
//
// Every case here runs the shipped grader, the shipped runner and the shipped
// harness against the lab's own lesson.json (nothing is copied), and asserts:
//
//   ACCEPT  at least three different, correct implementations score full marks
//           (loop vs formula-free variants, ternary vs if, template literal vs
//           concatenation, ...);
//   REJECT  each wrong-but-shaped program fails the NAMED tests requirement with
//           the student-words message, and -- the whole point -- still passes
//           every OTHER requirement, i.e. it is exactly the program the regexes
//           alone used to wave through (`shaped: false` marks the few that the
//           regexes already refuse as well).
//
// Run: node scripts/test-runtime-labs.mjs   (part of `npm test`, after test-runtime-tests)

import { execFileSync } from 'child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
mkdirSync(path.join(root, 'node_modules', '.pkg-load-cache'), { recursive: true });
const out = mkdtempSync(path.join(root, 'node_modules', '.pkg-load-cache', 'shcode-runtime-labs-'));
const read = (rel) => readFileSync(path.join(root, rel), 'utf8').replace(/\r\n?/g, '\n');
const lines = (...l) => l.join('\n') + '\n';

let failures = 0;
let checks = 0;
const check = (name, cond, detail) => {
  checks++;
  if (!cond) {
    failures++;
    console.log(`  FAIL  ${name}  -- ${detail}`);
  }
};

try {
  execFileSync(process.execPath, [
    path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
    'lib/run-tests-node.ts', '--outDir', out, '--module', 'commonjs', '--target', 'es2022', '--skipLibCheck',
  ], { cwd: root, stdio: 'inherit' });
  writeFileSync(path.join(out, 'package.json'), '{"type":"commonjs"}');
  const { gradeWithTests } = createRequire(path.join(out, 'noop.cjs'))(path.join(out, 'run-tests-node.js'));

  const reqCache = new Map();
  const reqs = (id) => {
    if (!reqCache.has(id)) reqCache.set(id, JSON.parse(read(`lessons/${id}/lesson.json`)).requirements);
    return reqCache.get(id);
  };
  const grade = async (id, code) => {
    const report = await gradeWithTests(reqs(id), { 'script.js': code }, 0);
    const failed = report.results.filter((r) => r.status === 'failed');
    return { failed, ids: failed.map((r) => r.id), msgs: Object.fromEntries(report.results.map((r) => [r.id, r.messages[0] ?? ''])),
      hints: Object.fromEntries(report.results.map((r) => [r.id, r.messages.slice(1)])) };
  };

  const accept = async (id, name, code) => {
    const r = await grade(id, code);
    check(`${id} accepts ${name}`, r.ids.length === 0, `lost ${r.ids.join(', ')}: ${r.ids.map((i) => r.msgs[i]).join(' || ')}`);
  };
  // `req` is the tests requirement that must fail with a message matching `msg`.
  const reject = async (id, name, code, req, msg, { shaped = true } = {}) => {
    const r = await grade(id, code);
    check(`${id} rejects ${name}`, r.ids.includes(req) && msg.test(r.msgs[req]),
      `failed [${r.ids.join(', ')}]; ${req} said ${JSON.stringify(r.msgs[req])}`);
    if (shaped) {
      check(`${id} / ${name}: the regex requirements alone would have passed it`, r.ids.every((i) => i === req),
        `also failed ${r.ids.filter((i) => i !== req).join(', ')}`);
    }
  };

  // Every lab: reference full, starter not, and the tests requirement is a real one.
  const LABS = {
    rect: '3-2-7-lab-rectangle-area', guard: '3-2-12-lab-guard-clause', fix: '3-2-15-lab-fix-print-not-return',
    comp: '3-2-19-lab-compose-functions', fm: '3-1-8-lab-findmax-iseven', sum: '3-1-9-lab-sum-to-n',
    filt: '3-3-14-lab-filter-function', arr: '3-2-7-arrays',
    // The practice drills inserted into 3.2 and 3.3 (2026-10-06).
    shout: '3-2-drill-shout', dflt: '3-2-drill-default-greeting', sq: '3-2-drill-square', ini: '3-2-drill-initials',
    big: '3-2-drill-largest-of-three', off: '3-3-drill-off-by-one', rot: '3-3-drill-rotate-line',
    cw: '3-3-drill-count-words', last: '3-3-drill-last-item', small: '3-3-drill-smallest',
  };
  for (const [key, id] of Object.entries(LABS)) {
    const ref = read(`lessons/${id}/solution.js`);
    check(`${id}: reference scores full`, (await grade(id, ref)).ids.length === 0, JSON.stringify((await grade(id, ref)).ids));
    const starter = await grade(id, read(`lessons/${id}/script.js`));
    check(`${id}: the untouched starter does not`, starter.ids.length > 0, 'starter passed everything');
    const tr = reqs(id).filter((r) => r.type === 'tests');
    check(`${id}: has a tests requirement`, tr.length > 0, key);
    for (const t of tr) {
      check(`${id}/${t.id}: 4 to 9 cases`, t.cases.length >= 4 && t.cases.length <= 9, String(t.cases.length));
      check(`${id}/${t.id}: at least one hidden case`, t.cases.some((c) => c.hidden === true), 'none hidden');
    }
    // A comment that names the function is not a function.
    const fns = tr.map((t) => t.function);
    const r = await grade(id, '// ' + fns.map((f) => `function ${f}(){}`).join(' ') + '\nconsole.log("done");\n');
    check(`${id}: an empty program fails the tests`, tr.every((t) => r.ids.includes(t.id)), JSON.stringify(r.ids));
  }

  // ------------------------------------------------------------ 3.2.9 findRectangleArea (prints)
  {
    const id = LABS.rect;
    const calls = 'findRectangleArea(3, 4);\nfindRectangleArea(10, 2);\n';
    await accept(id, 'a template literal', lines('function findRectangleArea(width, height) {', '  const area = width * height;', '  console.log(`Area: ${area}`);', '}') + calls);
    await accept(id, 'string concatenation, other parameter names', lines('function findRectangleArea(w, h) {', '  console.log("Area: " + w * h);', '}') + calls);
    await accept(id, 'a result variable and (width * height) in parentheses', lines('function findRectangleArea(width, height) {', '  let result = width * height;', '  console.log("Area: " + result);', '}') + calls);
    const fnWith = (...body) => lines('function findRectangleArea(width, height) {', ...body.map((b) => '  ' + b), '}') + calls;
    // Wording is free: the number is the check (2026-10-07).
    await accept(id, 'a sentence around the number', fnWith('console.log("The area is " + width * height);'));
    await accept(id, 'a label with = and units', fnWith('console.log("Area = " + width * height + " square units");'));
    await accept(id, 'only the bare number', fnWith('console.log(width * height);'));
    await accept(id, 'lower case label, a full stop', fnWith('console.log("area: " + width * height + ".");'));
    await accept(id, 'a template literal with a sentence', fnWith('console.log(`A ${width} by ${height} rectangle has area ${width * height}`);'));
    await accept(id, 'printing the line twice (the wording is free, so is the count)', fnWith('console.log("Area: " + width * height);', 'console.log("Area: " + width * height);'));
    await reject(id, 'printing width * width', fnWith('console.log("Area: " + width * width);'),
      't1', /^findRectangleArea\(3, 4\) should print a line that includes "12" but printed "Area: 9"$/);
    await reject(id, 'printing width + height', fnWith('console.log("Area: " + (width * height * 0 + width + height));'),
      't1', /^findRectangleArea\(3, 4\) should print a line that includes "12" but printed "Area: 7"$/);
    await reject(id, 'printing 112 (a longer number holding 12)', fnWith('console.log("Area: 1" + width * height);'),
      't1', /^findRectangleArea\(3, 4\) should print a line that includes "12" but printed "Area: 112"$/);
    await reject(id, 'printing 12.5', fnWith('console.log("Area: " + (width * height + 0.5));'),
      't1', /but printed "Area: 12\.5"$/);
    await reject(id, 'printing only the width', fnWith('console.log(width);'),
      't1', /should print a line that includes "12" but printed "3"$/, { shaped: false });
    await reject(id, 'printing just the label', fnWith('console.log("Area:");'),
      't1', /but printed "Area:"$/, { shaped: false });
    await reject(id, 'printing a blank line', fnWith('console.log();'),
      't1', /^findRectangleArea\(3, 4\) should print a line that includes "12" but printed ""$/, { shaped: false });
    await reject(id, 'returning the area instead of printing it', lines('function findRectangleArea(width, height) {', '  console.log();', '  return width * height;', '}') + calls,
      't1', /^findRectangleArea\(3, 4\) should print a line that includes "12" but printed/);
    await reject(id, 'printing nothing at all', lines('function findRectangleArea(width, height) {', '  const area = width * height;', '}') + calls,
      't1', /should print a line that includes "12" but printed nothing$/, { shaped: false });
  }

  // ------------------------------------------------------------ 3.2.15 divide guard
  {
    const id = LABS.guard;
    const calls = 'console.log(divide(10, 2));\nconsole.log(divide(10, 0));\n';
    await accept(id, 'if (b === 0) with a braced return', lines('function divide(a, b) {', '  if (b === 0) {', '    return "Cannot divide by zero";', '  }', '  return a / b;', '}') + calls);
    await accept(id, 'brace-less if (!b)', lines('function divide(a, b) {', '  if (!b) return "Cannot divide by zero";', '  return a / b;', '}') + calls);
    await accept(id, 'a differently worded message', lines('function divide(a, b) {', '  if (b === 0) {', '    return "cannot divide by zero!";', '  }', '  return a / b;', '}') + calls);
    await accept(id, 'another message that says zero', lines('function divide(a, b) {', '  if (b === 0) { return "Zero is not allowed"; }', '  return a / b;', '}') + calls);
    await accept(id, 'if (b == 0) and the quotient in a variable', lines('function divide(x, y) {', '  if (y == 0) { return "Cannot divide by zero"; }', '  const q = x / y;', '  return q;', '}') + calls);
    await reject(id, 'a guard on b > 100', lines('function divide(a, b) {', '  if (b > 100) { return "Cannot divide by zero"; }', '  return a / b;', '}') + calls,
      't1', /^divide\(10, 0\) should give text that includes "zero" but gave Infinity$/);
    await reject(id, 'a guard on a === 0 instead of b', lines('function divide(a, b) {', '  if (a === 0) { return "Cannot divide by zero"; }', '  return a / b;', '}') + calls,
      't1', /^divide\(10, 0\) should give text that includes "zero" but gave Infinity$/);
    await reject(id, 'a guard that is too wide (b <= 0)', lines('function divide(a, b) {', '  if (b <= 0) { return "Cannot divide by zero"; }', '  return a / b;', '}') + calls,
      't1', /^divide\(5, -1\) \(a negative b is not a bad value\) should give -5 but gave "Cannot divide by zero"$/);
    await reject(id, 'a different message', lines('function divide(a, b) {', '  if (b === 0) { return "Error"; }', '  return a / b;', '}') + calls,
      't1', /^divide\(10, 0\) should give text that includes "zero" but gave "Error"$/);
    await reject(id, 'a message that says 0 but never the word zero', lines('function divide(a, b) {', '  if (b === 0) { return "Division by 0"; }', '  return a / b;', '}') + calls,
      't1', /^divide\(10, 0\) should give text that includes "zero" but gave "Division by 0"$/);
    await reject(id, 'the guard returns a number', lines('function divide(a, b) {', '  if (b === 0) { return 0; }', '  return a / b;', '}') + calls,
      't1', /^divide\(10, 0\) should give text that includes "zero" but gave 0$/);
    await reject(id, 'the guard prints instead of returning', lines('function divide(a, b) {', '  if (b === 0) { console.log("Cannot divide by zero"); return; }', '  return a / b;', '}') + calls,
      't1', /^divide\(10, 0\) should give text that includes "zero" but gave undefined \(it printed instead of returning a value - use return\)$/, { shaped: false });
  }

  // ------------------------------------------------------------ 3.2.18 area must return
  {
    const id = LABS.fix;
    const use = 'const a = area(5, 8);\nconsole.log("One room: " + a);\nconsole.log("Two rooms: " + a * 2);\n';
    await accept(id, 'return width * height', lines('function area(width, height) {', '  return width * height;', '}') + use);
    await accept(id, 'a result variable and return(...)', lines('function area(width, height) {', '  const result = width * height;', '  return(result);', '}') + use);
    await accept(id, 'other parameter names, area used inline', lines('function area(w, h) {', '  return h * w;', '}', 'console.log("Two rooms: " + area(5, 8) * 2);'));
    await reject(id, 'the starter: it still prints and hands back nothing', read(`lessons/${id}/script.js`),
      't1', /^area\(5, 8\) should give 40 but gave undefined \(it printed instead of returning a value - use return\)$/, { shaped: false });
    await reject(id, 'it returns the sum, not the product', lines('function area(width, height) {', '  return width + height;', '}') + use,
      't1', /^area\(5, 8\) should give 40 but gave 13$/);
    await reject(id, 'it prints AND returns', lines('function area(width, height) {', '  console.log(width * height);', '  return width * height;', '}') + use,
      't1', /^area\(5, 8\) should print 0 lines but printed an extra line "40"$/, { shaped: false });
  }

  // ------------------------------------------------------------ 3.2.23 triple / addSeven
  {
    const id = LABS.comp;
    const chain = 'console.log(addSeven(triple(4)));\nconsole.log(triple(addSeven(4)));\n';
    await accept(id, 'n * 3 and n + 7', lines('function triple(n) { return n * 3; }', 'function addSeven(n) { return n + 7; }') + chain);
    await accept(id, 'n + n + n and 7 + n', lines('function triple(n) { return(n + n + n); }', 'function addSeven(n) { return(7 + n); }') + chain);
    await accept(id, 'a named result and other parameter names', lines('function triple(x) {', '  const result = 3 * x;', '  return result;', '}', 'function addSeven(y) {', '  let total = y + 7;', '  return total;', '}') + chain);
    await reject(id, 'triple returning n * 7', lines('function triple(n) { return n * 7; }', 'function addSeven(n) { return n + 7; }') + chain,
      't1', /^triple\(4\) should give 12 but gave 28$/);
    await reject(id, 'addSeven returning n + 3', lines('function triple(n) { return n * 3; }', 'function addSeven(n) { return n + 3; }') + chain,
      't2', /^addSeven\(4\) should give 11 but gave 7$/);
    await reject(id, 'addSeven returning n * 7', lines('function triple(n) { return n * 3; }', 'function addSeven(n) { return n * 7; }') + chain,
      't2', /^addSeven\(4\) should give 11 but gave 28$/, { shaped: false });
    await reject(id, 'triple that prints instead of returning', lines('function triple(n) { console.log(n * 3); return; }', 'function addSeven(n) { return n + 7; }') + chain,
      't1', /^triple\(4\) should give 12 but gave undefined \(it printed instead of returning a value - use return\)$/);
  }

  // ------------------------------------------------------------ 3.1.8 findMax / isEven
  {
    const id = LABS.fm;
    const use = 'console.log(findMax(3, 7));\nconsole.log(isEven(4));\n';
    await accept(id, 'if / return and n % 2 === 0', lines('function findMax(a, b) {', '  if (a > b) {', '    return a;', '  }', '  return b;', '}', 'function isEven(n) {', '  return n % 2 === 0;', '}') + use);
    await accept(id, 'a ternary and !(n % 2)', lines('function findMax(a, b) { return a > b ? a : b; }', 'function isEven(n) { return !(n % 2); }') + use);
    await accept(id, 'Math.max and an if/else returning true or false', lines('function findMax(a, b) { return Math.max(a, b); }', 'function isEven(n) {', '  if (n % 2 == 0) { return true; }', '  return false;', '}') + use);
    await accept(id, 'if (b > a) first', lines('function findMax(x, y) {', '  if (y > x) { return y; }', '  return x;', '}', 'function isEven(n) { return n % 2 === 0; }') + use);
    await reject(id, 'findMax returning the smaller value', lines('function findMax(a, b) {', '  if (a < b) {', '    return a;', '  }', '  return b;', '}', 'function isEven(n) { return n % 2 === 0; }') + use,
      't1', /^findMax\(3, 9\) should give 9 but gave 3$/);
    await reject(id, 'findMax that always answers b', lines('function findMax(a, b) {', '  if (a > b) { return b; }', '  return b;', '}', 'function isEven(n) { return n % 2 === 0; }') + use,
      't1', /^findMax\(9, 3\) should give 9 but gave 3$/);
    await reject(id, 'isEven testing n % 3', lines('function findMax(a, b) { return a > b ? a : b; }', 'function isEven(n) { return n % 3 === 0; }') + use,
      't2', /^isEven\(4\) should give true but gave false$/);
    await reject(id, 'isEven returning the remainder, not a boolean', lines('function findMax(a, b) { return a > b ? a : b; }', 'function isEven(n) { return n % 2; }') + use,
      't2', /^isEven\(4\) should give true but gave 0$/);
    await reject(id, 'isEven that is true for odd numbers', lines('function findMax(a, b) { return a > b ? a : b; }', 'function isEven(n) { return n % 2 === 1; }') + use,
      't2', /^isEven\(4\) should give true but gave false$/);
  }

  // ------------------------------------------------------------ 3.1.9 sumToN
  {
    const id = LABS.sum;
    const use = 'console.log(sumToN(5));\nconsole.log(sumToN(10));\n';
    await accept(id, 'i from 1, total += i', lines('function sumToN(n) {', '  let total = 0;', '  for (let i = 1; i <= n; i++) {', '    total += i;', '  }', '  return total;', '}') + use);
    await accept(id, 'counting down, sum = i + sum', lines('function sumToN(n) {', '  let sum = 0;', '  for (let i = n; i >= 1; i--) {', '    sum = i + sum;', '  }', '  return sum;', '}') + use);
    await accept(id, 'i from 0 and i < n + 1', lines('function sumToN(n) {', '  let total = 0;', '  for (let i = 0; i < n + 1; i++) { total = total + i; }', '  return(total);', '}') + use);
    await reject(id, 'adding 1 instead of the counter', lines('function sumToN(n) {', '  let total = 0;', '  for (let i = 1; i <= n; i++) {', '    total += 1;', '  }', '  return total;', '}') + use,
      't1', /^sumToN\(5\) should give 15 but gave 5$/);
    await reject(id, 'the off-by-one i < n', lines('function sumToN(n) {', '  let total = 0;', '  for (let i = 1; i < n; i++) {', '    total += i;', '  }', '  return total;', '}') + use,
      't1', /^sumToN\(5\) should give 15 but gave 10$/);
    await reject(id, 'a return inside the loop', lines('function sumToN(n) {', '  let total = 0;', '  for (let i = 1; i <= n; i++) {', '    total += i;', '    return total;', '  }', '  return total;', '}') + use,
      't1', /^sumToN\(5\) should give 15 but gave 1$/);
    await reject(id, 'starting the total at 1', lines('function sumToN(n) {', '  let total = 1;', '  for (let i = 1; i <= n; i++) {', '    total += i;', '  }', '  return total;', '}') + use,
      't1', /^sumToN\(5\) should give 15 but gave 16$/);
    await reject(id, 'a counter that starts at 2', lines('function sumToN(n) {', '  let total = 0;', '  for (let i = 2; i <= n; i++) {', '    total += i;', '  }', '  return total;', '}') + use,
      't1', /^sumToN\(5\) should give 15 but gave 14$/);
  }

  // ------------------------------------------------------------ 3.3.19 doubled
  {
    const id = LABS.filt;
    const use = 'let sample = [1, 2, 3];\nconsole.log(doubled(sample));\nconsole.log(sample);\n';
    await accept(id, 'for...of and push(n * 2)', lines('function doubled(numbers) {', '  let result = [];', '  for (let n of numbers) {', '    result.push(n * 2);', '  }', '  return result;', '}') + use);
    await accept(id, 'an index loop and push(n + n)', lines('function doubled(arr) {', '  const out = [];', '  for (let i = 0; i < arr.length; i++) {', '    out.push(arr[i] + arr[i]);', '  }', '  return out;', '}') + use);
    await accept(id, 'copying first with slice, then doubling the copy', lines('function doubled(numbers) {', '  let result = numbers.slice();', '  for (let i = 0; i < result.length; i++) {', '    result[i] = result[i] * 2;', '  }', '  const extra = [];', '  extra.push(result.length * 1);', '  return result;', '}') + use);
    await reject(id, 'changing the input array and returning it (aliased, so the regex cannot see it)', lines('function doubled(numbers) {', '  let result = numbers;', '  let log = [];', '  for (let i = 0; i < result.length; i++) {', '    result[i] = result[i] * 2;', '    log.push(i * 2);', '  }', '  return result;', '}') + use,
      't1', /^doubled\(\[1, 2, 3\]\) changed the array you gave it\. It should leave the original untouched$/);
    await reject(id, 'a new array that is only tripled', lines('function doubled(numbers) {', '  let result = [];', '  for (let n of numbers) {', '    result.push(n * 3);', '  }', '  return result;', '}') + use,
      't1', /^doubled\(\[1, 2, 3\]\) should give \[2, 4, 6\] but gave \[3, 6, 9\]$/);
    await reject(id, 'a plain copy that changes nothing', lines('function doubled(numbers) {', '  let result = [];', '  for (let n of numbers) {', '    if (n > 0) { result.push(n); }', '  }', '  return result;', '}') + use,
      't1', /^doubled\(\[1, 2, 3\]\) should give \[2, 4, 6\] but gave \[1, 2, 3\]$/);
    await reject(id, 'a seed value left in the result (breaks the empty array)', lines('function doubled(numbers) {', '  let result = [0];', '  for (let n of numbers) {', '    result.push(n * 2);', '  }', '  return result;', '}') + use,
      't1', /^doubled\(\[1, 2, 3\]\) should give \[2, 4, 6\] but gave \[0, 2, 4, 6\]$/);
    await reject(id, 'a function that prints the new array but returns nothing', lines('function doubled(numbers) {', '  let result = [];', '  for (let n of numbers) {', '    result.push(n * 2);', '  }', '  console.log(result);', '  return;', '}') + use,
      't1', /^doubled\(\[1, 2, 3\]\) should give \[2, 4, 6\] but gave undefined \(it printed instead of returning a value - use return\)$/, { shaped: false });
  }

  // ------------------------------------------------------------ 3.3.24 capstone functions
  {
    const id = LABS.arr;
    const base = lines('let fruits = ["apple", "banana", "cherry"];', 'fruits.push("date");', 'fruits.pop();',
      'for (let i = 0; i < fruits.length; i++) { console.log(fruits[i]); }',
      'let found = false;', 'for (let i = 0; i < fruits.length; i++) { if (fruits[i] === "banana") { found = true; } }', 'console.log(found);');
    const count = lines('function countFruit(fruits, name) {', '  let count = 0;', '  for (let i = 0; i < fruits.length; i++) {', '    if (fruits[i] === name) { count++; }', '  }', '  return count;', '}');
    const long = lines('function longFruits(fruits, minLength) {', '  const result = [];', '  for (const f of fruits) {', '    if (f.length >= minLength) { result.push(f); }', '  }', '  return result;', '}');
    await accept(id, 'for loops and for...of', base + count + long);
    await accept(id, 'arrow functions with filter', base + lines('const countFruit = (list, wanted) => list.filter((f) => f === wanted).length;', 'const longFruits = (list, n) => list.filter((f) => f.length >= n);'));
    await accept(id, 'a reduce count and a for...of filter', base + lines('function countFruit(fruits, name) {', '  return fruits.reduce((n, f) => (f === name ? n + 1 : n), 0);', '}') + long);
    await reject(id, 'countFruit answering true/false (includes)', base + lines('function countFruit(fruits, name) { return fruits.includes(name); }') + long,
      'req6', /^countFruit\(\["apple", "banana", "apple", "cherry"\], "apple"\) should give 2 but gave true$/);
    await reject(id, 'countFruit that stops at the first match', base + lines('function countFruit(fruits, name) {', '  for (const f of fruits) { if (f === name) { return 1; } }', '  return 0;', '}') + long,
      'req6', /^countFruit\(\["apple", "banana", "apple", "cherry"\], "apple"\) should give 2 but gave 1$/);
    await reject(id, 'countFruit with the name written into it', base + lines('function countFruit(fruits, name) {', '  let count = 0;', '  for (const f of fruits) { if (f === "apple") { count++; } }', '  return count;', '}') + long,
      'req6', /^countFruit\(\["apple", "banana", "apple", "cherry"\], "banana"\) should give 1 but gave 2$/);
    await reject(id, 'countFruit that prints and returns nothing', base + lines('function countFruit(fruits, name) {', '  let count = 0;', '  for (const f of fruits) { if (f === name) { count++; } }', '  console.log(count);', '}') + long,
      'req6', /gave undefined \(it printed instead of returning a value - use return\)$/);
    await reject(id, 'longFruits using > instead of >=', base + count + lines('function longFruits(fruits, minLength) {', '  const result = [];', '  for (const f of fruits) { if (f.length > minLength) { result.push(f); } }', '  return result;', '}'),
      'req7', /^longFruits\(\["fig", "apple", "kiwi", "banana"\], 5\) should give \["apple", "banana"\] but gave \["banana"\]$/);
    await reject(id, 'longFruits that removes the short ones from the original', base + count + lines('function longFruits(fruits, minLength) {', '  for (let i = fruits.length - 1; i >= 0; i--) {', '    if (fruits[i].length < minLength) { fruits.splice(i, 1); }', '  }', '  return fruits;', '}'),
      'req7', /^longFruits\(\["fig", "apple", "kiwi", "banana"\], 5\) changed the array you gave it\. It should leave the original untouched$/);
    await reject(id, 'longFruits returning how many, not which', base + count + lines('function longFruits(fruits, minLength) {', '  let n = 0;', '  for (const f of fruits) { if (f.length >= minLength) { n++; } }', '  return n;', '}'),
      'req7', /^longFruits\(\["fig", "apple", "kiwi", "banana"\], 5\) should give \["apple", "banana"\] but gave 2$/);
    // The five array tasks alone no longer reach the pass line: 35 of 55.
    const only = await gradeWithTests(reqs(id), { 'script.js': base }, 55);
    check(`${id}: the five array tasks alone score 35 of 55`, only.totalScore === 35 && only.totalPossible === 55, `${only.totalScore}/${only.totalPossible}`);
  }
  // ------------------------------------------------------------ 3.2.6 shout (prints; return is not taught yet)
  {
    const id = LABS.shout;
    const calls = 'shout("hello");\nshout("watch out");\n';
    await accept(id, 'console.log(word.toUpperCase())', lines('function shout(word) {', '  console.log(word.toUpperCase());', '}') + calls);
    await accept(id, 'a variable, other parameter name', lines('function shout(w) {', '  let loud = w.toUpperCase();', '  console.log(loud);', '}') + calls);
    await accept(id, 'a template literal', lines('function shout(word) {', '  console.log(`${word.toUpperCase()}`);', '}') + calls);
    await reject(id, 'printing the word as typed', lines('function shout(word) {', '  let loud = word.toUpperCase();', '  console.log(word);', '}') + calls,
      't1', /^shout\("hello"\) should print "HELLO" but printed "hello"$/);
    await reject(id, 'capitalising only the first letter', lines('function shout(word) {', '  console.log(word[0].toUpperCase() + word.slice(1));', '}') + calls,
      't1', /^shout\("hello"\) should print "HELLO" but printed "Hello"$/);
    await reject(id, 'printing it twice', lines('function shout(word) {', '  console.log(word.toUpperCase());', '  console.log(word.toUpperCase());', '}') + calls,
      't1', /^shout\("hello"\) should print 1 line but printed an extra line "HELLO"$/);
    await reject(id, 'returning instead of printing', lines('function shout(word) {', '  return word.toUpperCase();', '}') + calls,
      't1', /^shout\("hello"\) should print "HELLO" but printed nothing$/);
  }

  // ------------------------------------------------------------ 3.2.8 greet with a default parameter
  {
    const id = LABS.dflt;
    const calls = 'greet();\ngreet("Priya");\n';
    await accept(id, 'concatenation', lines('function greet(name = "friend") {', '  console.log("Hello, " + name + "!");', '}') + calls);
    await accept(id, 'a template literal and another parameter name', lines('function greet(who = "friend") {', '  console.log(`Hello, ${who}!`);', '}') + calls);
    await accept(id, 'single quotes and a message variable', lines("function greet(name = 'friend') {", '  const message = "Hello, " + name + "!";', '  console.log(message);', '}') + calls);
    await accept(id, 'lower case and extra words (case and surroundings are free, the Hello, name! shape is not)', lines('function greet(name = "friend") {', '  console.log("hello, " + name + "! welcome");', '}') + calls);
    await reject(id, 'the wrong default word', lines('function greet(name = "pal") {', '  console.log("Hello, " + name + "!");', '}') + calls,
      't1', /^greet\(\) \(no argument\) should print a line that includes "Hello, friend!" but printed "Hello, pal!"$/);
    await reject(id, 'a default that always wins over the argument', lines('function greet(name = "friend") {', '  name = "friend";', '  console.log("Hello, " + name + "!");', '}') + calls,
      't1', /^greet\("Priya"\) should print a line that includes "Hello, Priya!" but printed "Hello, friend!"$/);
    await reject(id, 'a missing exclamation mark', lines('function greet(name = "friend") {', '  console.log("Hello, " + name);', '}') + calls,
      't1', /^greet\(\) \(no argument\) should print a line that includes "Hello, friend!" but printed "Hello, friend"$/);
    await reject(id, 'returning instead of printing', lines('function greet(name = "friend") {', '  return "Hello, " + name + "!";', '}') + calls,
      't1', /^greet\(\) \(no argument\) should print a line that includes "Hello, friend!" but printed nothing$/);
  }

  // ------------------------------------------------------------ 3.2.13 square
  {
    const id = LABS.sq;
    const use = 'const result = square(5);\nconsole.log(result + 1);\n';
    await accept(id, 'return n * n', lines('function square(n) {', '  return n * n;', '}') + use);
    await accept(id, 'n ** 2 and another parameter name', lines('function square(x) {', '  return x ** 2;', '}') + use);
    await accept(id, 'a result variable and return(...)', lines('function square(n) {', '  const product = n * n;', '  return(product);', '}') + use);
    await reject(id, 'returning n + n', lines('function square(n) {', '  return n + n;', '}') + use,
      't1', /^square\(4\) should give 16 but gave 8$/);
    await reject(id, 'returning n * 2', lines('function square(n) {', '  return n * 2;', '}') + use,
      't1', /^square\(4\) should give 16 but gave 8$/);
    await reject(id, 'returning n itself', lines('function square(n) {', '  return n;', '}') + use,
      't1', /^square\(4\) should give 16 but gave 4$/);
    await reject(id, 'printing the square and returning nothing', lines('function square(n) {', '  console.log(n * n);', '  return;', '}') + use,
      't1', /^square\(4\) should give 16 but gave undefined \(it printed instead of returning a value - use return\)$/);
  }

  // ------------------------------------------------------------ 3.2.19 initials
  {
    const id = LABS.ini;
    const use = 'console.log(initials("Ada", "Lovelace"));\n';
    await accept(id, 'first[0] + last[0]', lines('function initials(first, last) {', '  return first[0] + last[0];', '}') + use);
    await accept(id, 'a template literal and other parameter names', lines('function initials(a, b) {', '  return `${a[0]}${b[0]}`;', '}') + use);
    await accept(id, 'two variables, then joined', lines('function initials(first, last) {', '  const f = first[0];', '  const l = last[0];', '  return f + l;', '}') + use);
    await accept(id, 'charAt(0) on both', lines('function initials(first, last) {', '  return first.charAt(0) + last.charAt(0);', '}') + use);
    await reject(id, 'the whole last name', lines('function initials(first, last) {', '  return first[0] + last;', '}') + use,
      't1', /^initials\("Ada", "Lovelace"\) should give "AL" but gave "ALovelace"$/);
    await reject(id, 'the letters in the wrong order', lines('function initials(first, last) {', '  return last[0] + first[0];', '}') + use,
      't1', /^initials\("Ada", "Lovelace"\) should give "AL" but gave "LA"$/);
    await reject(id, 'a space between the letters', lines('function initials(first, last) {', '  return first[0] + " " + last[0];', '}') + use,
      't1', /^initials\("Ada", "Lovelace"\) should give "AL" but gave "A L"$/);
    await reject(id, 'the second letters', lines('function initials(first, last) {', '  return first[1] + last[1];', '}') + use,
      't1', /^initials\("Ada", "Lovelace"\) should give "AL" but gave "do"$/);
    await reject(id, 'upper-casing letters that were typed in lower case', lines('function initials(first, last) {', '  return (first[0] + last[0]).toUpperCase();', '}') + use,
      't1', /^initials\("mia", "chen"\) \(typed in lower case, so the letters stay lower case\) should give "mc" but gave "MC"$/);
    await reject(id, 'printing instead of returning', lines('function initials(first, last) {', '  console.log(first[0] + last[0]);', '  return;', '}') + use,
      't1', /^initials\("Ada", "Lovelace"\) should give "AL" but gave undefined \(it printed instead of returning a value - use return\)$/);
  }

  // ------------------------------------------------------------ 3.2.27 largest of three
  {
    const id = LABS.big;
    const use = 'console.log(largest(9, 4, 6));\nconsole.log(largest(4, 6, 9));\n';
    await accept(id, 'a biggest-so-far variable', lines('function largest(a, b, c) {', '  let biggest = a;', '  if (b > biggest) { biggest = b; }', '  if (c > biggest) { biggest = c; }', '  return biggest;', '}') + use);
    await accept(id, 'Math.max with three arguments', lines('function largest(a, b, c) { return Math.max(a, b, c); }') + use);
    await accept(id, 'an if / else if chain and other parameter names', lines('function largest(x, y, z) {', '  if (x >= y && x >= z) {', '    return x;', '  } else if (y >= z) {', '    return y;', '  }', '  return z;', '}') + use);
    await accept(id, 'nested ternaries', lines('function largest(a, b, c) { return a > b ? (a > c ? a : c) : (b > c ? b : c); }') + use);
    await reject(id, 'comparing only the first two', lines('function largest(a, b, c) {', '  if (a > b) { return a; }', '  return b;', '}') + use,
      't1', /^largest\(1, 2, 3\) \(biggest last\) should give 3 but gave 2$/);
    await reject(id, 'an else-if chain that falls back to a', lines('function largest(a, b, c) {', '  if (a > b && a > c) { return a; }', '  else if (b > c) { return b; }', '  return a;', '}') + use,
      't1', /^largest\(1, 2, 3\) \(biggest last\) should give 3 but gave 1$/);
    await reject(id, 'the smallest instead of the largest', lines('function largest(a, b, c) {', '  let pick = a;', '  if (b < pick) { pick = b; }', '  if (c < pick) { pick = c; }', '  return pick;', '}') + use,
      't1', /^largest\(1, 2, 3\) \(biggest last\) should give 3 but gave 1$/);
    await reject(id, 'printing the biggest and returning nothing', lines('function largest(a, b, c) {', '  let biggest = a;', '  if (b > biggest) { biggest = b; }', '  if (c > biggest) { biggest = c; }', '  console.log(biggest);', '  return;', '}') + use,
      't1', /^largest\(1, 2, 3\) \(biggest last\) should give 3 but gave undefined \(it printed instead of returning a value - use return\)$/);
  }

  // ------------------------------------------------------------ 3.3.6 fix the off-by-one loop
  {
    const id = LABS.off;
    const call = 'printPrices([5, 12, 8]);\n';
    await accept(id, 'i < prices.length', lines('function printPrices(prices) {', '  for (let i = 0; i < prices.length; i++) {', '    console.log(prices[i]);', '  }', '}') + call);
    await accept(id, 'i <= prices.length - 1', lines('function printPrices(prices) {', '  for (let i = 0; i <= prices.length - 1; i++) {', '    console.log(prices[i]);', '  }', '}') + call);
    await accept(id, 'for...of and another parameter name', lines('function printPrices(list) {', '  for (const p of list) {', '    console.log(p);', '  }', '}') + call);
    await reject(id, 'the untouched starter (still one round too long)', read(`lessons/${id}/script.js`),
      't1', /^printPrices\(\[5, 12, 8\]\) should print 3 lines but printed an extra line "undefined"$/, { shaped: false });
    await reject(id, 'starting the counter at 1 (the first price goes missing)', lines('function printPrices(prices) {', '  for (let i = 1; i < prices.length; i++) {', '    console.log(prices[i]);', '  }', '}') + call,
      't1', /^printPrices\(\[5, 12, 8\]\) should print "5" on line 1 but printed "12"$/);
    await reject(id, 'stopping one round early (the last price goes missing)', lines('function printPrices(prices) {', '  for (let i = 0; i < prices.length - 1; i++) {', '    console.log(prices[i]);', '  }', '}') + call,
      't1', /^printPrices\(\[5, 12, 8\]\) should print "8" on line 3 but printed only 2 lines$/);
    await reject(id, 'printing every price twice', lines('function printPrices(prices) {', '  for (let i = 0; i < prices.length; i++) {', '    console.log(prices[i]);', '    console.log(prices[i]);', '  }', '}') + call,
      't1', /^printPrices\(\[5, 12, 8\]\) should print "12" on line 2 but printed "5"$/);
    // The extra line hidden by a guard still leaves the loop condition wrong, so the regex requirement r2 is what refuses it.
    const guarded = await grade(id, lines('function printPrices(prices) {', '  for (let i = 0; i <= prices.length; i++) {', '    if (prices[i] !== undefined) { console.log(prices[i]); }', '  }', '}') + call);
    check(`${id} refuses a guard that hides the extra line instead of fixing the loop`, guarded.ids.length === 1 && guarded.ids[0] === 'r2', `failed [${guarded.ids.join(', ')}]`);
  }

  // ------------------------------------------------------------ 3.3.9 rotate
  {
    const id = LABS.rot;
    const call = 'console.log(rotate(["ana", "bob", "cy"]));\n';
    await accept(id, 'push(shift()) in place', lines('function rotate(items) {', '  items.push(items.shift());', '  return items;', '}') + call);
    await accept(id, 'a variable for the front item', lines('function rotate(line) {', '  const first = line.shift();', '  line.push(first);', '  return line;', '}') + call);
    await accept(id, 'a new array built by a loop, then rotated', lines('function rotate(items) {', '  const copy = [];', '  for (const x of items) { copy.push(x); }', '  copy.push(copy.shift());', '  return copy;', '}') + call);
    await reject(id, 'taking the first item off and never putting it back', lines('function rotate(items) {', '  items.shift();', '  return items;', '}') + call,
      't1', /^rotate\(\["ana", "bob", "cy"\]\) should give \["bob", "cy", "ana"\] but gave \["bob", "cy"\]$/);
    await reject(id, 'returning the item that came off, not the array', lines('function rotate(items) {', '  const first = items.shift();', '  items.push(first);', '  return first;', '}') + call,
      't1', /^rotate\(\["ana", "bob", "cy"\]\) should give \["bob", "cy", "ana"\] but gave "ana"$/);
    await reject(id, 'putting the item back twice', lines('function rotate(items) {', '  const first = items.shift();', '  items.push(first);', '  items.push(first);', '  return items;', '}') + call,
      't1', /^rotate\(\["ana", "bob", "cy"\]\) should give \["bob", "cy", "ana"\] but gave \["bob", "cy", "ana", "ana"\]$/);
    await reject(id, 'moving the last item to the front instead (shift is also used, so the regexes pass)', lines('function rotate(items) {', '  const first = items.shift();', '  items.unshift(first);', '  items.unshift(items.pop());', '  return items;', '}') + call,
      't1', /^rotate\(\["ana", "bob", "cy"\]\) should give \["bob", "cy", "ana"\] but gave \["cy", "ana", "bob"\]$/);
    await reject(id, 'printing the line and returning nothing', lines('function rotate(items) {', '  items.push(items.shift());', '  console.log(items);', '  return;', '}') + call,
      't1', /^rotate\(\["ana", "bob", "cy"\]\) should give \["bob", "cy", "ana"\] but gave undefined \(it printed instead of returning a value - use return\)$/);
  }

  // ------------------------------------------------------------ 3.3.11 countWords
  {
    const id = LABS.cw;
    const call = 'console.log(countWords("one two three"));\n';
    await accept(id, 'split(" ").length', lines('function countWords(text) {', '  return text.split(" ").length;', '}') + call);
    await accept(id, 'a words variable, single quotes, other parameter name', lines('function countWords(sentence) {', "  const words = sentence.split(' ');", '  return words.length;', '}') + call);
    await accept(id, 'counting the pieces with a loop', lines('function countWords(text) {', '  let count = 0;', '  for (const w of text.split(" ")) {', '    count++;', '  }', '  return count;', '}') + call);
    await reject(id, 'splitting at "" (letters, not words)', lines('function countWords(text) {', '  return text.split("").length;', '}') + call,
      't1', /^countWords\("one two three"\) should give 3 but gave 13$/);
    await reject(id, 'counting the spaces instead of the words', lines('function countWords(text) {', '  return text.split(" ").length - 1;', '}') + call,
      't1', /^countWords\("one two three"\) should give 3 but gave 2$/);
    await reject(id, 'splitting at line breaks', lines('function countWords(text) {', '  return text.split("\\n").length;', '}') + call,
      't1', /^countWords\("one two three"\) should give 3 but gave 1$/);
    await reject(id, 'returning the array of words, not how many', lines('function countWords(text) {', '  return text.split(" ");', '}') + call,
      't1', /^countWords\("one two three"\) should give 3 but gave \["one", "two", "three"\]$/);
    await reject(id, 'printing the count and returning nothing', lines('function countWords(text) {', '  console.log(text.split(" ").length);', '  return;', '}') + call,
      't1', /^countWords\("one two three"\) should give 3 but gave undefined \(it printed instead of returning a value - use return\)$/);
  }

  // ------------------------------------------------------------ 3.3.16 lastItem
  {
    const id = LABS.last;
    const call = 'let names = ["ana", "bob", "cy"];\nconsole.log(lastItem(names));\nconsole.log(names);\n';
    await accept(id, 'items[items.length - 1]', lines('function lastItem(items) {', '  return items[items.length - 1];', '}') + call);
    await accept(id, 'an index variable and another parameter name', lines('function lastItem(list) {', '  const last = list.length - 1;', '  return list[last];', '}') + call);
    await accept(id, 'a loop that remembers the latest item', lines('function lastItem(items) {', '  let found;', '  for (const x of items) { found = x; }', '  return found;', '}') + call);
    await reject(id, 'reading one place past the end', lines('function lastItem(items) {', '  return items[items.length];', '}') + call,
      't1', /^lastItem\(\["a", "b", "c"\]\) should give "c" but gave undefined$/);
    await reject(id, 'the first item', lines('function lastItem(items) {', '  return items[0];', '}') + call,
      't1', /^lastItem\(\["a", "b", "c"\]\) should give "c" but gave "a"$/);
    await reject(id, 'the second to last item', lines('function lastItem(items) {', '  return items[items.length - 2];', '}') + call,
      't1', /^lastItem\(\["a", "b", "c"\]\) should give "c" but gave "b"$/);
    await reject(id, 'pop(): the right value, but it removes it from the array', lines('function lastItem(items) {', '  return items.pop();', '}') + call,
      't1', /^lastItem\(\["a", "b", "c"\]\) changed the array you gave it\. It should leave the original untouched$/);
  }

  // ------------------------------------------------------------ 3.3.18 smallest
  {
    const id = LABS.small;
    const call = 'console.log(smallest([4, 2, 9]));\n';
    await accept(id, 'for...of seeded with numbers[0]', lines('function smallest(numbers) {', '  let best = numbers[0];', '  for (let n of numbers) {', '    if (n < best) { best = n; }', '  }', '  return best;', '}') + call);
    await accept(id, 'an index loop from 1', lines('function smallest(list) {', '  let low = list[0];', '  for (let i = 1; i < list.length; i++) {', '    if (list[i] < low) { low = list[i]; }', '  }', '  return low;', '}') + call);
    await accept(id, 'Math.min on the running answer', lines('function smallest(numbers) {', '  let best = numbers[0];', '  for (const n of numbers) { best = Math.min(best, n); }', '  return best;', '}') + call);
    await reject(id, 'a running answer that starts at 0', lines('function smallest(numbers) {', '  let best = 0;', '  for (let n of numbers) {', '    if (n < best) { best = n; }', '  }', '  return best;', '}') + call,
      't1', /^smallest\(\[4, 2, 9\]\) should give 2 but gave 0$/, { shaped: false });
    await reject(id, 'a start of 0 with numbers[0] read somewhere else (the regex sees [0])', lines('function smallest(numbers) {', '  let first = numbers[0];', '  let best = 0;', '  for (let n of numbers) {', '    if (n < best) { best = n; }', '  }', '  return best;', '}') + call,
      't1', /^smallest\(\[4, 2, 9\]\) should give 2 but gave 0$/);
    await reject(id, 'a made-up start of 1000', lines('function smallest(numbers) {', '  let first = numbers[0];', '  let best = 1000;', '  for (let n of numbers) {', '    if (n < best) { best = n; }', '  }', '  return best;', '}') + call,
      't1', /^A hidden check failed\.$/);
    await reject(id, 'the largest instead of the smallest', lines('function smallest(numbers) {', '  let best = numbers[0];', '  for (let n of numbers) {', '    if (n > best) { best = n; }', '  }', '  return best;', '}') + call,
      't1', /^smallest\(\[4, 2, 9\]\) should give 2 but gave 9$/);
    await reject(id, 'never updating the first item', lines('function smallest(numbers) {', '  let best = numbers[0];', '  return best;', '}') + call,
      't1', /^smallest\(\[4, 2, 9\]\) should give 2 but gave 4$/);
    await reject(id, 'sorting the original array to find it', lines('function smallest(numbers) {', '  numbers.sort();', '  let best = numbers[0];', '  return best;', '}') + call,
      't1', /^smallest\(\[4, 2, 9\]\) changed the array you gave it\. It should leave the original untouched$/);
  }
} finally {
  rmSync(out, { recursive: true, force: true });
}

if (failures) {
  console.error(`\n${failures} failure(s) of ${checks} checks`);
  process.exit(1);
}
console.log(`runtime labs: ${checks} checks passed`);
