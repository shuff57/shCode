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

  // ------------------------------------------------------------ 3.2.7 findRectangleArea (prints)
  {
    const id = LABS.rect;
    const calls = 'findRectangleArea(3, 4);\nfindRectangleArea(10, 2);\n';
    await accept(id, 'a template literal', lines('function findRectangleArea(width, height) {', '  const area = width * height;', '  console.log(`Area: ${area}`);', '}') + calls);
    await accept(id, 'string concatenation, other parameter names', lines('function findRectangleArea(w, h) {', '  console.log("Area: " + w * h);', '}') + calls);
    await accept(id, 'a result variable and (width * height) in parentheses', lines('function findRectangleArea(width, height) {', '  let result = width * height;', '  console.log("Area: " + result);', '}') + calls);
    await reject(id, 'printing width * width', lines('function findRectangleArea(width, height) {', '  console.log("Area: " + width * width);', '}') + calls,
      't1', /^findRectangleArea\(3, 4\) should print "Area: 12" but printed "Area: 9"$/);
    await reject(id, 'printing width + height', lines('function findRectangleArea(width, height) {', '  console.log("Area: " + (width * height * 0 + width + height));', '}') + calls,
      't1', /^findRectangleArea\(3, 4\) should print "Area: 12" but printed "Area: 7"$/);
    await reject(id, 'a bare number with no Area: label', lines('function findRectangleArea(width, height) {', '  console.log(width * height);', '}') + calls,
      't1', /^findRectangleArea\(3, 4\) should print "Area: 12" but printed "12"$/);
    await reject(id, 'returning the area instead of printing it', lines('function findRectangleArea(width, height) {', '  console.log();', '  return width * height;', '}') + calls,
      't1', /^findRectangleArea\(3, 4\) should print "Area: 12" but printed/);
    await reject(id, 'printing the area twice', lines('function findRectangleArea(width, height) {', '  console.log("Area: " + width * height);', '  console.log("Area: " + width * height);', '}') + calls,
      't1', /but printed an extra line "Area: 12"$/);
  }

  // ------------------------------------------------------------ 3.2.12 divide guard
  {
    const id = LABS.guard;
    const calls = 'console.log(divide(10, 2));\nconsole.log(divide(10, 0));\n';
    await accept(id, 'if (b === 0) with a braced return', lines('function divide(a, b) {', '  if (b === 0) {', '    return "Cannot divide by zero";', '  }', '  return a / b;', '}') + calls);
    await accept(id, 'brace-less if (!b)', lines('function divide(a, b) {', '  if (!b) return "Cannot divide by zero";', '  return a / b;', '}') + calls);
    await accept(id, 'if (b == 0) and the quotient in a variable', lines('function divide(x, y) {', '  if (y == 0) { return "Cannot divide by zero"; }', '  const q = x / y;', '  return q;', '}') + calls);
    await reject(id, 'a guard on b > 100', lines('function divide(a, b) {', '  if (b > 100) { return "Cannot divide by zero"; }', '  return a / b;', '}') + calls,
      't1', /^divide\(10, 0\) should give "Cannot divide by zero" but gave Infinity$/);
    await reject(id, 'a guard on a === 0 instead of b', lines('function divide(a, b) {', '  if (a === 0) { return "Cannot divide by zero"; }', '  return a / b;', '}') + calls,
      't1', /^divide\(10, 0\) should give "Cannot divide by zero" but gave Infinity$/);
    await reject(id, 'a guard that is too wide (b <= 0)', lines('function divide(a, b) {', '  if (b <= 0) { return "Cannot divide by zero"; }', '  return a / b;', '}') + calls,
      't1', /^divide\(5, -1\) \(a negative b is not a bad value\) should give -5 but gave "Cannot divide by zero"$/);
    await reject(id, 'a different message', lines('function divide(a, b) {', '  if (b === 0) { return "Error"; }', '  return a / b;', '}') + calls,
      't1', /^divide\(10, 0\) should give "Cannot divide by zero" but gave "Error"$/);
    await reject(id, 'the guard prints instead of returning', lines('function divide(a, b) {', '  if (b === 0) { console.log("Cannot divide by zero"); return; }', '  return a / b;', '}') + calls,
      't1', /^divide\(10, 0\) should give "Cannot divide by zero" but gave undefined \(it printed instead of returning a value - use return\)$/, { shaped: false });
  }

  // ------------------------------------------------------------ 3.2.15 area must return
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

  // ------------------------------------------------------------ 3.2.19 triple / addSeven
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

  // ------------------------------------------------------------ 3.3.14 doubled
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

  // ------------------------------------------------------------ 3.3.18 capstone functions
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
} finally {
  rmSync(out, { recursive: true, force: true });
}

if (failures) {
  console.error(`\n${failures} failure(s) of ${checks} checks`);
  process.exit(1);
}
console.log(`runtime labs: ${checks} checks passed`);
