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
// A points-graded lab (3-1-10): the answer must also score below the lesson's passing score.
const rejectBelowPass = (id, name, req, script) => cases.push({ id, name, files: { 'script.js': script }, expect: 'fail', req, belowPass: true });

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
accept('3-4-13-lab-one-line-callback', 'helper written as a function expression',
  js('const transform = function (value, fn) { return fn(value); };', 'console.log(transform(5, n => n * 3));'));
reject('3-4-13-lab-one-line-callback', 'a block-bodied arrow is not the one-line callback', 'r2',
  js('function transform(value, fn) { return fn(value); }', 'console.log(transform(6, (n) => { return n + 4; }));'));
reject('3-4-13-lab-one-line-callback', 'helper never calls its function parameter', 'r1',
  js('function transform(value, fn) { return value; }', 'console.log(transform(6, n => n + 4));'));

// ---- 3.4.19: arrow helper; a callback named `log` is not console.log
accept('3-4-19-lab-callback-capstone', 'helper written as an arrow',
  js('const countMatching = (nums, test) => {', '  let c = 0;', '  for (const n of nums) { if (test(n)) { c++; } }', '  return c;', '};',
     'const readings = [1, 2, 3, 4, 5];', 'console.log(countMatching(readings, n => n > 2), countMatching(readings, n => n % 2 === 0));'));
reject('3-4-19-lab-callback-capstone', 'second parameter called `log`, never called', 'r3',
  js('function f(a, log) { for (const x of a) { console.log(x); } }', 'console.log(f([1], x => 1), f([2], y => 2));'));

// ---- 3.4.21 (3-1-10): greet as an arrow plus another function; defining greet is not calling it
accept('3-1-10-functions', 'greet as an arrow, second function a declaration',
  js('const greet = (name) => { return "Hi " + name; };', 'function shout(text) { return text + "!"; }', 'console.log(shout(greet("Sam")));'));
reject('3-1-10-functions', 'greet defined but never called', 'req4',
  js('function greet(name) { return "Hi " + name; }', 'const shout = (t) => t + "!";', 'console.log(shout("x"));'));

// ---- 3.5.12: alias and for...of both read a field off a record
accept('3-5-12-lab-nested-structure', 'for...of over the array, field read off the loop variable',
  js('const order = { customer: { name: "Ana" }, items: [{ name: "pen", price: 2 }, { name: "ink", price: 1 }] };',
     'console.log(order.customer.name);', 'for (const item of order.items) { console.log(item.name, item.price); }'));
accept('3-5-12-lab-nested-structure', 'index into the array through an alias',
  js('const order = { customer: { name: "Ana" }, items: [{ name: "pen", price: 2 }, { name: "ink", price: 1 }] };',
     'console.log(order.customer.name);', 'for (let i = 0; i < order.items.length; i++) { const item = order.items[i]; console.log(item.name + " " + item.price); }'));

// ---- 3.5.15: arrow method
accept('3-5-15-lab-add-method', 'method written as an arrow',
  js('const student = { name: "Ana", hi: () => "Hello!" };', 'console.log(student.hi());'));

// ---- 3.5.18: arrow, expression and destructured one-parameter functions; console.log({..}) is no call
accept('3-5-18-lab-params-to-object', 'one-parameter arrow reading a property',
  js('const describeBox = (o) => o.color + o.width + o.height;', 'console.log(describeBox({ width: 2, height: 3, color: "red" }));'));
accept('3-5-18-lab-params-to-object', 'function expression',
  js('const describeBox = function (o) { return o.color + o.width + o.height; };', 'console.log(describeBox({ width: 2, height: 3, color: "red" }));'));
reject('3-5-18-lab-params-to-object', 'function never called, only an object logged', 'r3',
  js('function describeBox(o) { return o.width; }', 'console.log({ width: 2 });'));

// ---- 3.5.22: arrow with a destructured parameter (step 3's sentence uses all three names, r3)
accept('3-5-22-lab-destructure-three', 'arrow with destructured parameter',
  js('const book = { title: "T", author: "A", pages: 9 };', 'const { title, author, pages } = book;', 'console.log(title + " by " + author + ", " + pages + " pages");',
     'const describe = ({ title, quantity }) => title + " " + quantity;', 'console.log(describe({ title: "Pen", quantity: 10 }), author);'));

// ---- 3.6: arrow versions of the named functions; copyBook that just returns its argument
accept('3-6-4-lab-predict-primitive-vs-array', 'arrow versions',
  js('const changeNum = (n) => { n = n + 1; };', 'const changeArr = (a) => { a.push(9); };',
     'let x = 1; const l = [1];', 'changeNum(x); changeArr(l);', 'console.log(x, l);'));
accept('3-6-12-lab-object-param-mutation', 'arrow versions',
  js('const birthday = (p) => { p.age++; };', 'const birthdaySafe = (p) => ({ ...p, age: p.age + 1 });',
     'const user = { name: "A", age: 10 };', 'birthday(user);', 'console.log(user, birthdaySafe(user));'));
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
  js('const settings = { theme: "dark", fontSize: 14, wrap: true };', 'const extended = { ...settings, "font size": 14 };', 'const changed = { ...settings, wrap: false };', 'console.log(extended);', 'console.log(changed);', 'console.log(settings);'));

// ---- runtime checks (step 3 of .gauntlet/SPEC-module-3x-hardening.md): 3.4
reject('3-4-17-lab-fix-broken-arrow', 'parenthesised but the body is wrong (=> 0)', 't1',
  js('const area = (w, h) => 0;', 'console.log(area(3, 4));'));
reject('3-4-17-lab-fix-broken-arrow', 'parenthesised but adds instead of multiplying', 't1',
  js('const area = (w, h) => w + h;', 'console.log(area(3, 4));'));
accept('3-4-17-lab-fix-broken-arrow', 'a block body with return is fine',
  js('const area = (w, h) => { return w * h; };', 'console.log(area(3, 4));'));
reject('3-4-13-lab-one-line-callback', 'transform ignores its function and returns the value', 't1',
  js('function transform(value, fn) { return value; }', 'console.log(transform(6, n => n + 4));'));
reject('3-4-13-lab-one-line-callback', 'transform calls the function but forgets to return', 't1',
  js('function transform(value, fn) { fn(value); }', 'console.log(transform(6, n => n + 4));'));
accept('3-4-13-lab-one-line-callback', 'transform as an arrow',
  js('const transform = (value, fn) => fn(value);', 'console.log(transform(6, n => n + 4));'));
reject('3-4-19-lab-callback-capstone', 'counter goes up for every element, test ignored', 't1',
  js('function countMatching(a, t) { let c = 0; for (const x of a) { t(x); c++; } return c; }',
     'const r = [1, 2, 3, 4, 5];', 'console.log(countMatching(r, n => n > 2), countMatching(r, n => n < 2));'));
reject('3-4-19-lab-callback-capstone', 'helper returns the array length', 't1',
  js('function countMatching(a, t) { for (let i = 0; i < a.length; i++) { t(a[i]); } return a.length; }',
     'const r = [1, 2, 3, 4, 5];', 'console.log(countMatching(r, n => n > 2), countMatching(r, n => n < 2));'));
accept('3-4-19-lab-callback-capstone', 'while-free: forEach is not asked for, a for loop with a ternary is fine',
  js('const countMatching = (a, t) => { let c = 0; for (let i = 0; i < a.length; i++) { c += t(a[i]) ? 1 : 0; } return c; };',
     'const readings = [1, 2, 3, 4, 5];', 'console.log(countMatching(readings, n => n > 2), countMatching(readings, n => n < 2));'));
reject('3-4-10-lab-implicit-return-drill', 'three arrows written, only one result printed', 't1',
  js('const a = n => n * 2;', 'const b = n => n > 0;', 'const c = (x, y) => x + y;', 'console.log(a(2));'));
reject('3-4-16-lab-rewrite-three-arrows', 'three arrows written, only one result printed', 't1',
  js('const a = n => n * 2;', 'const b = n => n > 0;', 'const c = (x, y) => x + y;', 'console.log(a(2));'));

// ---- runtime checks: 3.5
reject('3-5-5-lab-read-update-fields', 'a number named book', 't1',
  js('let book = 1;', 'book.b = 2;', 'console.log(book.b);', 'console.log(book);'));
reject('3-5-12-lab-nested-structure', 'braces everywhere, no customer object', 't1',
  js('const order = { items: [{ a: 1 }, { b: 2 }] };', 'const x = { p: { q: 1 } };', 'console.log(x.p.q);',
     'for (let i = 0; i < order.items.length; i++) { console.log(order.items[i].a); }'));
reject('3-5-15-lab-add-method', 'method with an empty body prints undefined', 't1',
  js('const s = { name: "Ana", hi: function () {} };', 'console.log(s.hi());'));
reject('3-5-18-lab-params-to-object', 'describeBox ignores two of the three values', 't1',
  js('function describeBox(o) { return o.color; }', 'console.log(describeBox({ width: 2, height: 3, color: "red" }));'));
reject('3-5-18-lab-params-to-object', 'still three positional parameters', 't1',
  js('function describeBox(w, h, c) { return c + w + h; }', 'console.log(describeBox({ width: 2, height: 3, color: "red" }));'));
reject('3-5-22-lab-destructure-three', 'describe returns a fixed sentence', 't1',
  js('const book = { title: "T", author: "A", pages: 9 };', 'const { title, author, pages } = book;',
     'function describe({ title, pages }) { return "Pen 10"; }', 'console.log(describe(book), author);'));
reject('3-5-24-lab-parallel-arrays-refactor', 'records built but the old arrays kept', 'r5',
  js('const names = ["Marisol", "Dev", "Priya"];', 'const players = [{ name: "Marisol", score: 92, group: "A" }, { name: "Dev", score: 78, group: "B" }, { name: "Priya", score: 85, group: "A" }];',
     'for (let i = 0; i < players.length; i++) { console.log(players[i].name + players[i].score); }'));
reject('3-5-24-lab-parallel-arrays-refactor', 'parallel arrays kept, one extra record added', 't1',
  js('const names = ["Marisol", "Dev", "Priya"];', 'const players = [{ n: 1 }];',
     'for (let i = 0; i < names.length; i++) { console.log(names[i] + players[0].n); }'));
accept('3-5-24-lab-parallel-arrays-refactor', 'for...of over players',
  js('const players = [{ name: "Marisol", score: 92, group: "A" }, { name: "Dev", score: 78, group: "B" }, { name: "Priya", score: 85, group: "A" }];',
     'for (const p of players) { console.log(p.name + " (" + p.group + "): " + p.score); }'));
reject('3-5-25-lab-objects-capstone', 'empty shapes that satisfy every pattern', 't1',
  js('const x = [{ a: {} }];', 'for (;0;) {}', 'const { a } = x;', 'Object.keys(x);', 'console.log(x[0]);'));

// ---- runtime checks: 3.6
reject('3-6-4-lab-predict-primitive-vs-array', 'changeArr never touches its array', 't1',
  js('function changeNum(n) { n = 99; }', 'function changeArr(a) { }', 'let x = 1; const l = [1];', 'changeNum(x); changeArr(l);', 'console.log(x);', 'console.log(l);'));
reject('3-6-8-lab-fix-reassign-bug', 'addOne does nothing, the caller loop does the work', 't1',
  js('function addOne(scores) { }', 'let quizScores = [10, 20, 30];', 'addOne(quizScores);',
     'for (let i = 0; i < quizScores.length; i++) { quizScores[i] = quizScores[i] + 1; }', 'console.log(quizScores);'));
reject('3-6-8-lab-fix-reassign-bug', 'addOne still reassigns its parameter', 't1',
  js('function addOne(scores) { for (let i = 0; i < scores.length; i++) { scores = scores.map(x => x + 1); } }',
     'let quizScores = [10, 20, 30];', 'addOne(quizScores);', 'console.log(quizScores);'));
accept('3-6-8-lab-fix-reassign-bug', 'for...of over keys() writes by index',
  js('function addOne(scores) { for (const i of scores.keys()) { scores[i]++; } }', 'let quizScores = [10, 20, 30];', 'addOne(quizScores);', 'console.log(quizScores);'));
reject('3-6-12-lab-object-param-mutation', 'birthday copies, birthdaySafe mutates (swapped)', 't1',
  js('function birthday(p) { return { ...p, age: p.age + 1 }; }', 'function birthdaySafe(p) { p.age++; return p; }',
     'const a = { name: "A", age: 10 };', 'birthday(a);', 'console.log(a, birthdaySafe(a));'));
reject('3-6-12-lab-object-param-mutation', 'birthdaySafe mutates its argument', 't2',
  js('function birthday(p) { p.age++; }', 'function birthdaySafe(p) { p.age++; return p; }',
     'const a = { name: "A", age: 10 };', 'birthday(a);', 'console.log(a, { ...a, x: 1 });'));
reject('3-6-12-lab-object-param-mutation', 'Object.assign copy: step 3 asks for spread', 'r4',
  js('function birthday(p) { p.age += 1; }', 'function birthdaySafe(p) { const c = Object.assign({}, p); c.age = p.age + 1; return c; }',
     'const user = { name: "A", age: 10 };', 'birthday(user);', 'console.log("user:", user);', 'console.log(birthdaySafe(user));'));
reject('3-6-13-lab-nested-mutation', 'copies made, nothing printed', 't1',
  js('const s = { n: "A", scores: [1] };', 'const a = { ...s };', 'a.scores.push(2);', 'const b = structuredClone(s);', 'b.scores.push(3);'));
reject('3-6-16-lab-capstone', 'addScore pushes onto the caller\'s array', 't1',
  js('function addScore(s, n) { s.push(n); return s; }', 'function recordPlay(song) { song.plays++; }',
     'function copyBook(b) { return structuredClone(b); }', 'console.log([...[1]], 1);', 'const song = { plays: 0 };', 'recordPlay(song);', 'console.log(song, copyBook({ books: [] }));'));
reject('3-6-16-lab-capstone', 'recordPlay copies instead of changing the song', 't2',
  js('function addScore(s, n) { return [...s, n]; }', 'function recordPlay(song) { return { ...song, plays: song.plays + 1 }; }',
     'function copyBook(b) { return structuredClone(b); }', 'console.log(addScore([1], 2));', 'const song = { plays: 0 };', 'recordPlay(song);', 'console.log(song, copyBook({ books: [] }));'));
reject('3-6-16-lab-capstone', 'copyBook is a shallow copy', 't3',
  js('function addScore(s, n) { return [...s, n]; }', 'function recordPlay(song) { song.plays++; }',
     'function copyBook(b) { const x = structuredClone(1); return { ...b }; }', 'console.log(addScore([1], 2));', 'const song = { plays: 0 };', 'recordPlay(song);', 'console.log(song, copyBook({ books: [] }));'));

// ---- runtime checks: 3.7
reject('3-7-4-lab-map-non-mutating', 'map callback overwrites prices', 't1',
  js('const prices = [10, 20, 30];', 'const doubled = prices.map((x, i) => { prices[i] = x * 2; return x * 2; });', 'console.log(doubled);', 'console.log(prices);'));
accept('3-7-4-lab-map-non-mutating', 'map into a new variable, both printed',
  js('const prices = [10, 20, 30];', 'const doubled = prices.map(p => p * 2);', 'console.log("doubled:", doubled);', 'console.log(prices);'));
reject('3-7-8-lab-slice-sublist', 'items too short, nothing printed', 't1',
  js('const items = [1, 2];', 'const a = items.slice(0, 1);', 'const b = items.slice(1);'));
reject('3-7-11-lab-concat-two-lists', 'joined but only one line printed', 't1',
  js('const a = [1, 2, 3];', 'const b = [4, 5, 6];', 'const c = a.concat(b);', 'console.log(c);'));
reject('3-7-17-lab-spread-array', 'one line printed', 't1',
  js('const a = [1, 2];', 'const b = [3, 4];', 'const c = [...a, ...b];', 'const d = [0, ...a, 9];', 'console.log(c);'));
reject('3-7-18-lab-spread-object', 'the original settings object is changed', 't1',
  js('const settings = { theme: "dark", fontSize: 14, wrap: true };', 'settings.fontSize = 18;',
     'const a = { ...settings, wrap: false };', 'const b = { ...settings, language: "en" };', 'console.log(a);', 'console.log(b);', 'console.log(settings);'));
reject('3-7-22-lab-capstone', 'empty shapes that satisfy every pattern', 't1',
  js('let a = [];', 'a.push(1);', 'a.map(x => x);', 'a.slice();', 'a.concat();', '({ ...a, b: 1 });', 'console.log(1);'));

// ---- runtime checks: 3.8 (the node twin of the runner now has the localStorage stand-in too)
reject('3-8-7-lab-stringify-spot-drops', 'plain object, JSON text printed', 't1',
  js('const counter = { count: 1 };', 'const json = JSON.stringify(counter);', 'console.log(json);'));
reject('3-8-10-lab-round-trip-object', 'restored is the very same object, no round trip', 't1',
  js('const player = { name: "A", score: 4 };', 'const saved = JSON.stringify(1);', 'const restored = player;', 'JSON.parse(saved);', 'console.log(restored.score + 1);', 'console.log(player.name);'));
accept('3-8-10-lab-round-trip-object', 'full round trip',
  js('const player = { name: "A", score: 4 };', 'const saved = JSON.stringify(player);', 'const restored = JSON.parse(saved);', 'console.log(restored.score + 1);', 'console.log(player.name);'));
reject('3-8-11-lab-round-trip-array', 'stringify and parse of something else', 't1',
  js('const gameState = { player: "A", items: [{ name: "x", price: 1 }, { name: "y", price: 2 }] };', 'const saved = JSON.stringify(1);', 'const restored = JSON.parse("1");', 'console.log(12);', 'console.log("y");'));
reject('3-8-14-lab-malformed-json', 'parse outside the try, function still throws', 't1',
  js('function readSave(t) { const r = JSON.parse(t); try { return r; } catch (e) { return {}; } }', 'console.log(readSave("{}"));', 'console.log(readSave("{}"));'));
accept('3-8-14-lab-malformed-json', 'arrow function, ok:false fallback',
  js('const readSave = (text) => { try { return JSON.parse(text); } catch (err) { return { ok: false }; } };', 'console.log(readSave(\'{"a":1}\'));', 'console.log(readSave("junk"));'));
reject('3-8-18-lab-save-by-key', 'a string is stored, not the state', 't1',
  js('const state = { score: 1, level: 2 };', 'JSON.stringify(1);', 'localStorage.setItem("k", "hello");', 'console.log(localStorage.getItem("k"));'));
reject('3-8-19-lab-load-restore', 'restored is a string and nothing real is printed', 't1',
  js('localStorage.setItem("k", JSON.stringify({ a: 1 }));', 'const text = localStorage.getItem("k");', 'let restored = text;', 'if (text === null) { restored = {}; }', 'try { JSON.parse("1"); } catch (e) { }', 'console.log(1);'));
accept('3-8-19-lab-load-restore', 'ternary null guard',
  js('const defaults = { score: 0 };', 'localStorage.setItem("k", JSON.stringify({ score: 5 }));', 'const text = localStorage.getItem("k");',
     'let restored = defaults;', 'if (text) { try { restored = JSON.parse(text); } catch (e) { restored = defaults; } }', 'console.log(restored.score);'));
reject('3-8-22-lab-capstone', 'no functions defined at all', 't1',
  js('const t = localStorage.getItem("k");', 'if (t === null) { }', 'try { JSON.parse("1"); } catch (e) { }', 'localStorage.setItem("k", JSON.stringify({}));', 'console.log(1);'));
reject('3-8-22-lab-capstone', 'loadState returns a hard-coded object', 't1',
  js('const defaults = { score: 0, level: 1 };', 'function saveState(s) { localStorage.setItem("k", JSON.stringify(s)); }',
     'function loadState() { return { score: 75, level: 5 }; }', 'saveState({ score: 75, level: 5 });', 'console.log(loadState().score);'));
accept('3-8-22-lab-capstone', 'all-arrow version',
  js('const defaults = { score: 0, level: 1 };', 'const saveState = (s) => localStorage.setItem("state", JSON.stringify(s));',
     'const loadState = () => { const t = localStorage.getItem("state"); if (t === null) return defaults; try { return JSON.parse(t); } catch (e) { return defaults; } };',
     'saveState({ score: 75, level: 5 });', 'const restored = loadState();', 'console.log(restored.score);'));
reject('3-8-23-lab-adapt-to-list', 'the list is never restored', 't1',
  js('const records = [{ name: "a", v: 1 }, { name: "b", v: 2 }];', 'localStorage.setItem("k", JSON.stringify(1));', 'const restored = JSON.parse("1");', 'console.log(1);', 'console.log(2);'));

// ---- batch 1 of the browser walkthrough fixes (2026-10-09)
// honest answers that were refused
accept('3-4-10-lab-implicit-return-drill', 'three results in one console.log',
  js('const a = (n) => n * 2;', 'const b = (n) => n > 0;', 'const c = (x, y) => x + " " + y;', 'console.log(a(4), b(2), c("Ada", "Lovelace"));'));
accept('3-4-13-lab-one-line-callback', 'function first, value second',
  js('function transform(fn, value) { return fn(value); }', 'console.log(transform((n) => n + 4, 6));'));
accept('3-5-15-lab-add-method', 'shorthand method',
  js('const student = { name: "Rex", speak() { return "Woof"; } };', 'console.log(student.speak());'));
accept('3-8-7-lab-stringify-spot-drops', 'shorthand method, labelled print',
  js('const counter = { count: 1, note: undefined, describe() { return "hi"; } };', 'const json = JSON.stringify(counter);', 'console.log("json:", json);'));
accept('3-8-14-lab-malformed-json', 'catch without a binding',
  js('function readSave(text) { try { return JSON.parse(text); } catch { return { ok: false }; } }', 'console.log(readSave(\'{"a":1}\'));', 'console.log(readSave("junk"));'));
accept('3-8-19-lab-load-restore', 'ternary guard',
  js('const defaults = { score: 0 };', 'localStorage.setItem("k", JSON.stringify({ score: 5 }));', 'const text = localStorage.getItem("k");',
     'let restored = defaults;', 'try { restored = text ? JSON.parse(text) : defaults; } catch (e) { restored = defaults; }', 'console.log("score:", restored.score);'));
accept('3-8-23-lab-adapt-to-list', 'length and field in one console.log',
  js('const records = [{ name: "Pen", price: 2 }, { name: "Pad", price: 5 }];', 'localStorage.setItem("records", JSON.stringify(records));',
     'const restored = JSON.parse(localStorage.getItem("records"));', 'console.log(restored.length, restored[0].name);'));
accept('3-7-11-lab-concat-two-lists', 'labelled prints',
  js('const first = [1, 2, 3];', 'const second = [4, 5, 6];', 'const joined = first.concat(second);', 'console.log("joined:", joined);', 'console.log("first:", first);', 'console.log("second:", second);'));
// answers that only look right
// (t1 no longer asks for different printed values -- honest arrows can print `true true true`;
// r4 refuses this one instead: no parameters, and none of the three is ever called)
reject('3-4-10-lab-implicit-return-drill', 'three arrows that all return the same thing', 'r4',
  js('const a = () => 1;', 'const b = () => 1;', 'const c = () => 1;', 'console.log(1);', 'console.log(1);', 'console.log(1);'));
reject('3-5-8-lab-dot-vs-bracket', 'regex literals instead of code', 'r3',
  js('const a = /o["a b"]/, b = /Object.keys(.)/, c = /o[k]/;'));
reject('3-7-21-lab-mutating-sort-drill', 'regex literals instead of code', 'r2',
  js('const r = /a.push(.)/, s = /a.map(.)/;', 'console.log(1);'));
reject('3-5-8-lab-dot-vs-bracket', 'bare lines and nothing printed', 't2',
  js('const laptop = { brand: "F", "screen size": 13 };', 'laptop["screen size"];', 'const k = "brand";', 'laptop[k];', 'Object.keys(laptop);'));
reject('3-5-12-lab-nested-structure', 'bare reads, empty loop, placeholder prints', 't2',
  js('const order = { customer: { name: "Ana" }, items: [{ name: "pen", price: 2 }, { name: "ink", price: 1 }] };', 'order.customer.name;',
     'for (let i = 0; i < 0; i++) { }', 'console.log("x");', 'console.log("x");', 'console.log("x");'));
reject('3-5-25-lab-objects-capstone', 'counter output instead of costs', 't2',
  js('const cart = [{ name: "a", price: 1.5, quantity: 10, details: { c: 1 } }, { name: "b", price: 3, quantity: 4, "item code": "x" }, { name: "c", price: 2, quantity: 5 }];',
     'cart[0].name;', 'for (let k = 0; k < 8; k++) { console.log(k); }'));
reject('3-8-14-lab-malformed-json', 'only text that starts with a brace is parsed', 't1',
  js('function readSave(t) { if (t[0] === "{") { return JSON.parse(t); } return { ok: false }; }', 'console.log(readSave(\'{"a":1}\'));', 'console.log(readSave("junk"));'));
reject('3-8-22-lab-capstone', 'loadState has no guard around the parse', 't1',
  js('const defaults = { score: 0, level: 1 };', 'function saveState(s) { localStorage.setItem("k", JSON.stringify(s)); }',
     'function loadState() { const t = localStorage.getItem("k"); if (t === null) { return defaults; } return JSON.parse(t); }',
     'try { } catch (e) { }', 'saveState({ score: 75, level: 5 });', 'console.log(loadState().score);'));

// ---- batch 4: identity, stored values and printed-method checks (2026-10-09)
reject('3-8-10-lab-round-trip-object', 'restored is the very same object as player', 't1',
  js('const player = { name: "A", score: 4 };', 'const saved = JSON.stringify(player);', 'const restored = player;', 'JSON.parse(saved);', 'console.log(restored.score + 1);', 'console.log(player.name);'));
reject('3-8-23-lab-adapt-to-list', 'restored is the very same array as records', 't1',
  js('const records = [{ name: "Pen", price: 2 }, { name: "Pad", price: 5 }];', 'localStorage.setItem("records", JSON.stringify(records));',
     'const restored = records;', 'JSON.parse(localStorage.getItem("records"));', 'console.log(restored.length, restored[0].name);'));
reject('3-7-11-lab-concat-two-lists', 'joined is just first', 't1',
  js('const first = [1, 2, 3];', 'const second = [4, 5, 6];', 'const joined = first;', 'first.push(4, 5, 6);', 'console.log(joined, first, second);'));
reject('3-6-13-lab-nested-mutation', 'deep is the same object as student', 't1',
  js('const student = { name: "A", scores: [1] };', 'const shallow = { ...student };', 'const deep = student;', 'structuredClone(1);', 'shallow.scores.push(2);', 'deep.scores.push(3);', 'console.log(shallow.scores);', 'console.log(student.scores);', 'console.log(deep.scores);', 'console.log(deep.scores);'));
reject('3-8-18-lab-save-by-key', 'state is printed as JSON but never stored', 't1',
  js('const state = { score: 1, level: 2 };', 'localStorage.setItem("k", "x");', 'localStorage.getItem("k");', 'console.log(JSON.stringify(state));'));
reject('3-8-19-lab-load-restore', 'restored is a literal, nothing loaded', 't1',
  js('const restored = { score: 1 };', 'JSON.parse("{}");', 'localStorage.getItem("k");', 'if (restored) { }', 'try { } catch (e) { }', 'console.log(restored.score);'));
// (r2 refuses this one since 2026-10-14: the method is never called, so its result cannot be printed)
reject('3-5-15-lab-add-method', 'the printed line is not what the method returns', 'r2',
  js('const student = { name: "Ana", hi: function () { return "Hello"; } };', 'console.log("hi");'));
reject('3-5-22-lab-destructure-three', 'destructuring zero fields', 'r1',
  js('const item = { title: "Pen", cost: 2, quantity: 10 };', 'const {} = item;', 'function describe({ title, quantity }) { return title + quantity; }', 'console.log(describe(item));'));
reject('3-4-19-lab-callback-capstone', 'the helper has no for loop', 't1',
  js('function countMatching(a, t) { let c = 0; let i = 0; while (i < a.length) { if (t(a[i])) { c++; } i++; } return c; }',
     'const readings = [1, 2, 3, 4, 5];', 'console.log(countMatching(readings, n => n > 2), countMatching(readings, n => n < 2));'));
accept('3-5-22-lab-destructure-three', 'default for the whole parameter',
  js('const item = { title: "Pen", cost: 2, quantity: 10 };', 'const { title, cost, quantity } = item;', 'console.log(title + cost + quantity);',
     'function describe({ title, quantity } = {}) { return title + " x" + quantity; }', 'console.log(describe(item));'));

// ---- batch 5: the four minor lab holes and the 3.5.24 starter signal
reject('3-5-24-lab-parallel-arrays-refactor', 'records built, printed by a literal, no loop over players', 'r3',
  js('const players = [{ name: "Marisol", score: 92, group: "A" }, { name: "Dev", score: 78, group: "B" }, { name: "Priya", score: 85, group: "A" }];',
     'console.log("Marisol Dev Priya 92 78 85");'));
reject('3-5-24-lab-parallel-arrays-refactor', 'the old loop over names is not the new loop', 'r3',
  js('const names = ["Marisol", "Dev", "Priya"];', 'const players = [{ name: "Marisol", score: 92, group: "A" }, { name: "Dev", score: 78, group: "B" }, { name: "Priya", score: 85, group: "A" }];',
     'for (let i = 0; i < names.length; i++) { console.log(names[i]); }'));
reject('3-5-5-lab-read-update-fields', 'a property assigned to itself changes nothing', 'r3',
  js('const book = { title: "T", pages: 472 };', 'console.log(book.title);', 'book.title = book.title;', 'console.log(book);'));
accept('3-5-5-lab-read-update-fields', 'one += and one new field',
  js('const book = { title: "T", pages: 472 };', 'console.log(book.title);', 'book.pages += 10;', 'book.author = "H";', 'console.log(book);'));
// (a one-line arrow stored in a const and passed by name is accepted since batch 6; a declaration is not)
reject('3-4-13-lab-one-line-callback', 'an arrow elsewhere, transform given a named declaration', 'r2',
  js('function transform(value, fn) { return fn(value); }', 'function plus(n) { return n + 4; }', 'console.log([1, 2].map(n => n * 2));', 'console.log(transform(6, plus));'));
accept('3-4-13-lab-one-line-callback', 'arrow in the first argument slot, multi-line call',
  js('function transform(fn, value) { return fn(value); }', 'console.log(transform(', '  (n) => n + 4,', '  6));'));
reject('3-6-8-lab-fix-reassign-bug', 'the parameter is reassigned deep inside nested blocks', 'r4',
  js('function addOne(scores) { for (let i = 0; i < scores.length; i++) { if (i >= 0) { if (true) { scores = []; } } } scores[0] = scores[0] + 1; }',
     'let quizScores = [10, 20, 30];', 'addOne(quizScores);', 'console.log(quizScores);'));
reject('3-6-8-lab-fix-reassign-bug', 'reassigned with +=', 'r4',
  js('function addOne(scores) { scores += 1; for (let i = 0; i < scores.length; i++) { scores[i] = scores[i] + 1; } }',
     'let quizScores = [10, 20, 30];', 'addOne(quizScores);', 'console.log(quizScores);'));
accept('3-6-8-lab-fix-reassign-bug', 'comments and strings that mention the old line',
  js('function addOne(scores) {', '  // the broken version did scores = [scores[0] + 1]', '  const note = "scores = x";', '  for (let i = 0; i < scores.length; i++) { scores[i] = scores[i] + 1; }', '}',
     'let quizScores = [10, 20, 30];', 'addOne(quizScores);', 'console.log(quizScores);'));

// ---- batch 6: module 3.4 graders after the three-lens review (2026-10-13)
// 3.4.10 and 3.4.16: three DIFFERENT named arrows, each with a parameter and each called (r4); no
// arrow body starts with a brace (r2); three printed values (t1), which may coincide (E1).
{
  const D16 = js('function triple(n) { return n * 3; }', 'function isNeg(n) { return n < 0; }', 'function label(a, b) { return a + ": " + b; }');
  for (const [id, pre] of [['3-4-10-lab-implicit-return-drill', ''], ['3-4-16-lab-rewrite-three-arrows', D16]]) {
    accept(id, 'E1: three booleans that all print true',
      pre + js('const isEven = n => n % 2 === 0;', 'const isPositive = n => n > 0;', 'const isSmall = n => n < 10;', 'console.log(isEven(4), isPositive(4), isSmall(4));'));
    accept(id, 'E1: double, add and square of 2 all print 4',
      pre + js('const double = n => n * 2;', 'const add = (a, b) => a + b;', 'const square = n => n * n;', 'console.log(double(2));', 'console.log(add(2, 2));', 'console.log(square(2));'));
    accept(id, 'object-literal body, body on the next line, each call right after its arrow',
      pre + js('const mk = n => ({ v: n });', 'console.log(mk(1).v);', 'const dbl = n =>', '  n * 2;', 'console.log(dbl(2));', 'const up = s => s.toUpperCase();', 'console.log(up("a"));'));
    accept(id, 'let and var, three calls in one template literal',
      pre + js('let a = n => n + 1;', 'var b = (n) => n * 5;', 'const c = (x, y) => x + y;', 'console.log(`${a(1)} ${b(2)} ${c(3, 4)}`);'));
    reject(id, 'three arrows never called, a literal printed', 'r4',
      pre + js('const a = n => n;', 'const b = n => n;', 'const c = n => n;', 'console.log("one two three");'));
    reject(id, 'one arrow called three times', 'r4',
      pre + js('const a = n => n;', 'const b = n => n;', 'const c = n => n;', 'console.log(a(1), a(2), a(3));'));
    reject(id, 'three zero-parameter constants', 'r4',
      pre + js('const a = () => 1;', 'const b = () => 2;', 'const c = () => 3;', 'console.log(a(), b(), c());'));
    reject(id, 'three anonymous arrows', 'r4',
      pre + js('n => n;', 'n => n;', 'n => n;', 'console.log(1, 2, 3);'));
    reject(id, 'two of the three arrows keep a block body', 'r2',
      pre + js('const a = n => { return n; };', 'const b = n => { return n * 2; };', 'const c = n => n + 1;', 'console.log(a(1), b(1), c(1));'));
    reject(id, 'only two results printed', 't1',
      pre + js('const a = n => n + 1;', 'const b = n => n * 5;', 'const c = n => n - 1;', 'console.log(a(1), b(2));', 'c(3);'));
  }
  // 3.4.16 step 1: the three declarations stay in the file beside the arrows (r5)
  reject('3-4-16-lab-rewrite-three-arrows', 'step 1 skipped: arrows only, no declarations', 'r5',
    js('const a = n => n * 2;', 'const b = n => n > 0;', 'const c = (x, y) => x + y;', 'console.log(a(2), b(2), c(2, 3));'));
  reject('3-4-16-lab-rewrite-three-arrows', 'two declarations only', 'r5',
    js('function f(n) { return n + 1; }', 'function g(n) { return n; }', 'const a = n => n * 2;', 'const b = n => n > 0;', 'const c = (x, y) => x + y;', 'console.log(a(2), b(2), c(2, 3));'));
  reject('3-4-16-lab-rewrite-three-arrows', 'the declarations exist only inside a string', 'r5',
    js('const s = "function a(n) { } function b(n) { } function c(n) { }";', 'const a = n => n * 2;', 'const b = n => n > 0;', 'const c = (x, y) => x + y;', 'console.log(a(2), b(2), c(2, 3));'));
}

// 3.4.5: the body uses the parameter (r4); no printed line may contain undefined (t1)
accept('3-4-5-lab-declaration-to-expression', 'no semicolons, let',
  js('let double = function (n) { return n * 2 }', 'console.log(double(7))'));
accept('3-4-5-lab-declaration-to-expression', 'intermediate variable over several lines',
  js('const f =', '  function (n) {', '    const r = n * 2;', '    return r;', '  };', 'console.log(f(7));'));
accept('3-4-5-lab-declaration-to-expression', 'if/else with nested braces',
  js('const sign = function (n) {', "  if (n > 0) { return 'plus'; } else { return 'minus'; }", '};', 'console.log(sign(7));'));
accept('3-4-5-lab-declaration-to-expression', 'two parameters, called twice',
  js('var add = function (a, b) { return a + b; };', 'const x = add(3, 4);', 'console.log(x, add(1, 1));'));
reject('3-4-5-lab-declaration-to-expression', 'returns a constant and ignores its parameter', 'r4',
  js('const f = function (x) { return 1; };', 'console.log(f(0));'));
reject('3-4-5-lab-declaration-to-expression', 'no parameter at all', 'r4',
  js('const f = function () { return 5; };', 'console.log(f());'));
reject('3-4-5-lab-declaration-to-expression', 'no return: prints undefined beside a 1', 't1',
  js('const f = function (x) { x; };', 'console.log(f(1), 1);'));
reject('3-4-5-lab-declaration-to-expression', 'no return: prints "result: undefined"', 't1',
  js('const f = function (x) { x * 2; };', 'console.log("result:", f(1));'));

// 3.4.17: area ITSELF is the two-parameter arrow (r4); r3 needs the file to run and print, so the
// starter's own console.log line no longer turns it green before the fix
accept('3-4-17-lab-fix-broken-arrow', 'block body, renamed parameters',
  js('const area = (width, height) => { return width * height; };', 'console.log(area(3, 4));'));
accept('3-4-17-lab-fix-broken-arrow', 'the starter with only the parentheses added',
  read('lessons/3-4-17-lab-fix-broken-arrow/script.js').replace('const area = w, h => w * h;', 'const area = (w, h) => w * h;'));
reject('3-4-17-lab-fix-broken-arrow', 'the untouched starter fails r5 as well', 'r5',
  read('lessons/3-4-17-lab-fix-broken-arrow/script.js'));
reject('3-4-17-lab-fix-broken-arrow', 'fixed, but nothing printed', 'r5',
  js('const area = (w, h) => w * h;', 'area(3, 4);'));
reject('3-4-17-lab-fix-broken-arrow', 'a declaration beside a decoy arrow', 'r4',
  js('function area(w, h) { return w * h; }', 'const decoy = (a, b) => 0;', 'console.log(area(3, 4));'));
reject('3-4-17-lab-fix-broken-arrow', 'a function expression beside a decoy arrow', 'r4',
  js('const area = function (w, h) { return w * h; };', 'const _ = (a, b) => a;', 'console.log(area(3, 4));'));

// 3.4.19: two countMatching call sites, each with its own arrow inside the parentheses (r6)
accept('3-4-19-lab-callback-capstone', 'results stored first, helper an arrow',
  js('const countMatching = (arr, test) => { let n = 0; for (const x of arr) { if (test(x)) n += 1; } return n; };', 'const readings = [4, -2, 7, 0, -9, 3];',
     'const pos = countMatching(readings, n => n > 0);', 'const even = countMatching(readings, n => n % 2 === 0);', 'console.log(pos, even);'));
accept('3-4-19-lab-callback-capstone', 'both calls in one log, parenthesised bodies',
  js('function countMatching(list, predicate) { let total = 0; for (let i = 0; i < list.length; i++) { if (predicate(list[i])) { total++; } } return total; }',
     'const readings = [4, -2, 7, 0, -9, 3];', 'console.log(countMatching(readings, (n) => (n % 2) === 0), countMatching(readings, (n) => (n % 2) === 1));'));
accept('3-4-19-lab-callback-capstone', 'each call spread over several lines',
  js('function countMatching(a, t) { let c = 0; for (let i = 0; i < a.length; i++) { if (t(a[i])) { c++; } } return c; }', 'const readings = [4, -2, 7, 0, -9, 3];',
     'console.log(countMatching(', '  readings,', '  (n) => n > 0', '));', 'console.log(countMatching(', '  readings,', '  (n) => n < 0', '));'));
reject('3-4-19-lab-callback-capstone', 'one call only', 'r6',
  js('const countMatching = (a, t) => { let c = 0; for (let i = 0; i < a.length; i++) { if (t(a[i])) c++; } return c; };', 'const readings = [1, 2, 3, 4, 5];',
     'console.log(countMatching(readings, n => n > 2));'));
reject('3-4-19-lab-callback-capstone', 'test passed by name, an unused arrow elsewhere', 'r6',
  js('const countMatching = (a, t) => { let c = 0; for (let i = 0; i < a.length; i++) { if (t(a[i])) c++; } return c; };', 'function big(n) { return n > 2; }',
     'const readings = [1, 2, 3, 4, 5];', 'const unused = n => n;', 'console.log(countMatching(readings, big));'));
reject('3-4-19-lab-callback-capstone', 'two calls by name, no semicolons, arrows on the lines after', 'r6',
  js('function countMatching(a, t) { let c = 0; for (let i = 0; i < a.length; i++) { if (t(a[i])) c++ } return c }', 'function big(n) { return n > 2 }',
     'const readings = [1, 2, 3, 4, 5]', 'console.log(countMatching(readings, big))', 'console.log(countMatching(readings, big))', 'const x = n => n', 'const y = n => n'));
reject('3-4-19-lab-callback-capstone', 'an arrow inside the helper body, one real call', 'r6',
  js('function countMatching(a, t) { let c = 0; for (let i = 0; i < a.length; i++) { c += [a[i]].filter((x) => t(x)).length; } return c; }',
     'const readings = [1, 2, 3, 4, 5];', 'console.log(countMatching(readings, n => n > 2));'));

// 3.4.13: a one-line arrow stored in a const and passed by name counts (r2); the helper must still
// call its function parameter (r1, t1); the call's result must be what is printed (r4)
accept('3-4-13-lab-one-line-callback', 'a named one-line arrow passed by name',
  js('function transform(value, fn) { return fn(value); }', 'const double = (n) => n * 2;', 'console.log(transform(5, double));'));
accept('3-4-13-lab-one-line-callback', 'a named arrow with no parentheses, function first',
  js('function transform(fn, value) { return fn(value); }', 'const plus4 = n => n + 4;', 'console.log(transform(plus4, 6));'));
accept('3-4-13-lab-one-line-callback', 'result stored, then printed with a label',
  js('function transform(value, fn) { return fn(value); }', 'const result = transform(6, n => n + 4);', 'console.log("result:", result);'));
accept('3-4-13-lab-one-line-callback', 'call inside String(...) inside console.log',
  js('function transform(value, fn) { return fn(value); }', 'console.log(String(transform(6, n => n + 4)));'));
accept('3-4-13-lab-one-line-callback', 'labelled log built with +',
  js('function transform(value, fn) { return fn(value); }', 'console.log("6 + 4 = " + transform(6, n => n + 4));'));
accept('3-4-13-lab-one-line-callback', 'call inside a template literal',
  js('const transform = (value, callback) => callback(value);', 'console.log(`${transform("a", s => s + "b")}`);'));
accept('3-4-13-lab-one-line-callback', 'first argument nests two calls deep',
  js('function transform(value, fn) { return fn(value); }', 'console.log(transform(Math.max(Math.abs(-3), 2), n => n + 4));'));
reject('3-4-13-lab-one-line-callback', 'a named block-bodied arrow passed by name', 'r2',
  js('function transform(value, fn) { return fn(value); }', 'const plus = (n) => { return n + 4; };', 'console.log(transform(6, plus));'));
reject('3-4-13-lab-one-line-callback', 'the named arrow is CALLED in the argument, not passed', 'r2',
  js('function transform(value, fn) { return typeof fn === "function" ? fn(value) : fn; }', 'const plus = (n) => n + 4;', 'console.log(transform(6, plus(1)));'));
reject('3-4-13-lab-one-line-callback', 'helper never calls its parameter, named arrow passed', 'r1',
  js('function transform(value, fn) { return value; }', 'const plus = n => n + 4;', 'console.log(transform(6, plus));'));
reject('3-4-13-lab-one-line-callback', 'transform called, an unrelated value printed', 'r4',
  js('function transform(v, f) { return f(v); }', 'transform(6, n => n + 4);', 'console.log("hi");'));
reject('3-4-13-lab-one-line-callback', 'log on one line, the call on the next, no semicolons', 'r4',
  js('function transform(v, f) { return f(v) }', 'console.log(1)', 'transform(6, n => n + 4)'));

// 3.4.21 (3-1-10, A3.4.8): implicit-return arrows and `return(` count as returning (req2); greet
// called after `return`, `?`, `:` or `=>` counts (req4); greet must really return a greeting with the
// name (t1) and something must be printed (req6). Grading stays points-based: 40, pass at 25.
accept('3-1-10-functions', 'every function an arrow with an implicit return',
  js('const greet = (name) => "Hello, " + name + "!";', 'const farewell = (name) => "Bye, " + name;', 'const shout = name => name.toUpperCase();',
     'console.log(greet("Ava"));', 'console.log(farewell("Ava"));', 'console.log(shout("Ava"));'));
accept('3-1-10-functions', 'E3: greet called only from another function',
  js('function greet(name) { return "Hello, " + name; }', 'function loud(name) { return greet(name).toUpperCase(); }', 'const twice = (s) => s + s;', 'console.log(loud("Ava"), twice("x"));'));
accept('3-1-10-functions', 'E3: greet called inside an arrow body',
  js('function greet(name) { return "Hello, " + name; }', 'const loud = (n) => greet(n).toUpperCase();', 'const twice = (s) => s + s;', 'console.log(loud("Ava"), twice("x"));'));
accept('3-1-10-functions', 'E4: return( with no space, greet picked by a ternary',
  js('function greet(name) { return("Hello, " + name); }', 'function bye(name) { return "Bye, " + name; }', 'const up = (s) => s.toUpperCase();', 'const formal = true;',
     'console.log(formal ? greet("Ava") : bye("Ava"), up("a"));'));
accept('3-1-10-functions', 'greet called inside an array literal',
  js('function greet(name) { return "Hi " + name; }', 'const bye = (n) => "Bye " + n;', 'const list = [greet("Ava"), bye("Ava")];', 'console.log(list);'));
rejectBelowPass('3-1-10-functions', 'gameable minimum: greet returns 1, nothing printed', 't1',
  js('function greet(n) { return 1 }', 'const f = () => 0;', 'greet();'));
rejectBelowPass('3-1-10-functions', 'gameable minimum: wrong greet, printed, every regex satisfied', 't1',
  js('function greet(n) { return 1 }', 'const f = () => 0;', 'console.log(greet(), f());'));
rejectBelowPass('3-1-10-functions', 'gameable minimum: does not parse', 't1',
  js('function greet(n) { return n }', 'const f = () =>;', 'greet(;'));
reject('3-1-10-functions', 'gameable minimum: everything inside if (false)', 't1',
  js("if (false) { function greet(n) { return 'Hi ' + n; } const f = () => 0; console.log(greet('a')); }"));
reject('3-1-10-functions', 'greet prints instead of returning', 't1',
  js('function greet(name) { console.log("Hi " + name); }', 'const f = (n) => n;', 'greet("Ava");', 'console.log(f(1));'));
reject('3-1-10-functions', 'nothing printed', 'req6',
  js('function greet(name) { return "Hi " + name; }', 'const f = (n) => n;', 'greet("Ava");', 'f(1);'));

// ---- batch 7: module 3.5 graders after the three-lens review (2026-10-14)
// Every taught way of building and reading the structures is accepted (push, assignment, a
// variable placed into an object, destructuring in a loop, a cached length, forEach), and an
// answer that only decorates the file with the right words loses a requirement.
{
  // 3.5.5: the dot read is printed (r2); r3 needs a field the literal already had to change
  const id = '3-5-5-lab-read-update-fields';
  accept(id, 'label + concat read', js('const book = { title: "t", pages: 1 };', 'console.log("Title: " + book.title);', 'book.pages = 2;', 'book.author = "x";', 'console.log(book);'));
  accept(id, 'template read', js('const book = { title: "t", pages: 1 };', 'console.log(`${book.title}`);', 'book.title = "u";', 'book.author = "x";', 'console.log(book);'));
  accept(id, 'whole object printed first, field after', js('const book = { title: "t", pages: 1 };', 'console.log(book);', 'book.pages = 480;', 'book.author = "x";', 'console.log(book.pages);', 'console.log(book);'));
  accept(id, 'pages++ then a new field, no semicolons', js('let book = { title: "t", pages: 1 }', 'console.log(book.title)', 'book.pages++', 'book.author = "x"', 'console.log(book)'));
  reject(id, 'empty object, three fields added, a literal printed', 'r3', js('let book = {};', 'book.a = 1;', 'book.b = 2;', 'book.c = 3;', 'console.log(1);', 'console.log(book);'));
  reject(id, 'empty object, three fields added, a literal printed (no dot read)', 'r2', js('let book = {};', 'book.a = 1;', 'book.b = 2;', 'book.c = 3;', 'console.log(1);', 'console.log(book);'));
  reject(id, 'two new fields, nothing it had is changed', 'r3', js('const book = { title: "t", pages: 1 };', 'book.x = 1;', 'book.y = 2;', 'console.log(book.title);', 'console.log(book);'));
  reject(id, 'no dot read printed', 'r2', js('const book = { title: "t", pages: 1 };', 'book.pages = 480;', 'book.author = "x";', 'console.log("t");', 'console.log(book);'));
}
{
  // 3.5.8: a backtick key counts (r2); the keys are walked by a loop over Object.keys with a
  // bracket read (r3): no loop, or for...in beside a bare Object.keys call, is not that
  const id = '3-5-8-lab-dot-vs-bracket';
  const pre = ['const laptop = { "screen size": 13, ram: 16 };', 'console.log(laptop["screen size"]);', 'const k = "ram";', 'console.log(laptop[k]);'];
  accept(id, 'backtick key in the brackets', js('const laptop = { "screen size": 13, ram: 16 };', 'console.log(laptop[`screen size`]);', 'const k = "ram";', 'console.log(laptop[k]);', 'for (const key of Object.keys(laptop)) { console.log(key + ": " + laptop[key]); }'));
  accept(id, 'index loop over a keys array', js(...pre, 'const keys = Object.keys(laptop);', 'for (let i = 0; i < keys.length; i++) { console.log(keys[i] + ": " + laptop[keys[i]]); }'));
  accept(id, 'index loop, key alias', js(...pre, 'const keys = Object.keys(laptop);', 'for (let i = 0; i < keys.length; i++) {', '  const key = keys[i];', '  console.log(key + ": " + laptop[key]);', '}'));
  accept(id, 'forEach with an arrow', js(...pre, 'Object.keys(laptop).forEach(key => console.log(key + ": " + laptop[key]));'));
  accept(id, 'braceless loop, template literal', js(...pre, 'for (const key of Object.keys(laptop)) console.log(`${key}: ${laptop[key]}`);'));
  reject(id, 'no loop: the keys printed whole', 'r3', js('const laptop = { "screen size": 13 };', 'const k = "screen size";', 'console.log(laptop["screen size"]);', 'console.log(laptop[k]);', 'console.log(Object.keys(laptop));'));
  reject(id, 'for...in loop beside a bare Object.keys call', 'r3', js('const laptop = { "a b": 1, c: 2 };', 'console.log(laptop["a b"]);', 'const k = "c";', 'console.log(laptop[k]);', 'for (const key in laptop) { console.log(key, laptop[key]); }', 'Object.keys(laptop);'));
}
{
  // 3.5.12: order may be built by assignment or from variables (r1, r2); the customer chain is
  // order.customer.name, not order.items.length (r3); the loop over the items prints what it
  // reads (r5); each item gets a line of its own (t1)
  const id = '3-5-12-lab-nested-structure';
  const O = 'const order = { customer: { name: "Ana" }, items: [{ name: "Pen", price: 2 }, { name: "Ink", price: 3 }] };';
  accept(id, 'built by assignment', js('const order = {};', 'order.customer = { name: "Ana" };', 'order.items = [{ name: "Pen", price: 2 }, { name: "Ink", price: 3 }];',
    'console.log(order.customer.name);', 'for (let i = 0; i < order.items.length; i++) { console.log(order.items[i].name + ": " + order.items[i].price); }'));
  accept(id, 'customer and items built first, then placed in', js('const customer = { name: "Ana" };', 'const items = [{ name: "Pen", price: 2 }, { name: "Ink", price: 3 }];', 'const order = { customer, items };',
    'console.log(order.customer.name);', 'for (let i = 0; i < order.items.length; i++) { console.log(order.items[i].name, order.items[i].price); }'));
  accept(id, 'records built first, listed in the array', js('const pen = { name: "Pen", price: 2 };', 'const ink = { name: "Ink", price: 3 };', 'const order = { customer: { name: "Ana" }, items: [pen, ink] };',
    'console.log(order.customer.name);', 'for (const item of order.items) { console.log(item.name, item.price); }'));
  accept(id, 'items pushed in', js('const order = { customer: { name: "Ana" }, items: [] };', 'order.items.push({ name: "Pen", price: 2 });', 'order.items.push({ name: "Ink", price: 3 });',
    'console.log(order.customer.name);', 'for (let i = 0; i < order.items.length; i++) { console.log(order.items[i].name + " " + order.items[i].price); }'));
  accept(id, 'template literals', js(O, 'console.log(`Customer: ${order.customer.name}`);', 'for (let i = 0; i < order.items.length; i++) { console.log(`${order.items[i].name} ${order.items[i].price}`); }'));
  accept(id, 'bracket chain for the customer', js(O, 'console.log(order["customer"]["name"]);', 'for (let i = 0; i < order.items.length; i++) { console.log(order.items[i].name, order.items[i].price); }'));
  accept(id, 'customer name stored first', js(O, 'const who = order.customer.name;', 'console.log(who);', 'for (const item of order.items) { console.log(item.name, item.price); }'));
  accept(id, 'braceless for', js(O, 'console.log(order.customer.name);', 'for (const item of order.items) console.log(item.name, item.price);'));
  accept(id, 'multi-line body with locals', js(O, 'console.log(order.customer.name);', 'for (let i = 0; i < order.items.length; i++) {', '  const name = order.items[i].name;', '  const price = order.items[i].price;', '  console.log(name + ": " + price);', '}'));
  accept(id, 'cached length', js(O, 'console.log(order.customer.name);', 'const count = order.items.length;', 'for (let i = 0; i < count; i++) { console.log(order.items[i].name, order.items[i].price); }'));
  accept(id, 'name and price on separate lines', js(O, 'console.log(order.customer.name);', 'for (const item of order.items) {', '  console.log(item.name);', '  console.log(item.price);', '}'));
  accept(id, 'item names where one contains the other', js('const order = { customer: { name: "Ana" }, items: [{ name: "Pen", price: 2 }, { name: "Pencil", price: 3 }] };', 'console.log(order.customer.name);', 'for (const item of order.items) { console.log(item.name + ": " + item.price); }'));
  reject(id, 'only order.items.length, no customer chain', 'r3', js(O, 'for (let i = 0; i < order.items.length; i++) { console.log(order.items[i].name, order.items[i].price); }', 'console.log("Ana");'));
  reject(id, 'empty loop, a literal printed', 'r5', js(O, 'const n = order.items.length;', 'const f = order.items[0].name;', 'for (let i = 0; i < 0; i++) {}', 'console.log(order.customer.name + " Pen 2 Ink 3");'));
  reject(id, 'empty loop, the reads printed after it', 'r5', js(O, 'for (const item of order.items) {}', 'console.log(order.customer.name, order.items[0].name, order.items[0].price, order.items[1].name, order.items[1].price);'));
  reject(id, 'a literal in the loop', 'r5', js(O, 'console.log(order.customer.name);', 'for (const item of order.items) { const n = item.name; console.log("Pen 2 Ink 3"); }'));
  reject(id, 'one line holds every item', 't2', js(O, 'console.log(order.customer.name);', 'for (let i = 0; i < order.items.length; i++) { console.log(i); }', 'console.log(order.items[0].name, order.items[0].price, order.items[1].name, order.items[1].price);'));
}
{
  // 3.5.15: graded on what is printed, with no replay of the method: a method with a parameter
  // (the 3.5.14 step 3 model) and a method that changes the object both pass; the call must be
  // printed (r2); a printed undefined fails (t1)
  const id = '3-5-15-lab-add-method';
  accept(id, 'method with a parameter, assigned after (the 3.5.14 model)', js('const student = { name: "Marisol" };', 'student.greet = function (who) {', '  return "Hello, " + who + "! I am " + student.name + ".";', '};', 'console.log(student.greet("Dev"));'));
  accept(id, 'method that changes the object each call', js('const student = { name: "Ana", points: 0, addPoint: function () { student.points = student.points + 1; return student.name + " has " + student.points; } };',
    'console.log(student.addPoint());', 'console.log(student.addPoint());'));
  accept(id, 'shorthand method reading this', js('const student = { name: "Ana", greet() { return "Hi " + this.name; } };', 'console.log(student.greet());'));
  accept(id, 'result stored, then printed', js('const student = { name: "Ana", greet() { return "Hi " + this.name; } };', 'const msg = student.greet();', 'console.log(msg);'));
  accept(id, 'bracket call', js('const student = { name: "Ana", greet() { return "Hi " + this.name; } };', 'console.log(student["greet"]());'));
  accept(id, 'call inside a template literal', js('const student = { name: "Ana", greet: () => "Hello" };', 'console.log(`${student.greet()} there`);'));
  reject(id, 'method never called, its text typed in', 'r2', js('const student = { name: "Ana", hi: () => "Hello" };', 'console.log("Hello");'));
  reject(id, 'method called on its own line, a literal printed', 'r2', js('const student = { name: "Ana", hi: () => "Hello" };', 'student.hi();', 'console.log("Hello");'));
  reject(id, 'arrow method reading this prints undefined', 't2', js('const student = { name: "Ana", greet: () => "Hi " + this.name };', 'console.log(student.greet());'));
  reject(id, 'a method with a parameter called without one', 't2', js('const student = { name: "Ana", greet(who) { return "Hello, " + who; } };', 'console.log(student.greet());'));
}
{
  // 3.5.18: the call passes an object literal (r3), a declaration with a destructured parameter
  // is not a call; describeBox is graded on whether each value changes the text, so upper-case
  // colours and an area are fine (t1)
  const id = '3-5-18-lab-params-to-object';
  const B = 'function describeBox(options) { return options.color + options.width + options.height; }';
  accept(id, 'upper-case colour and an area', js('function describeBox(options) {', '  return options.color.toUpperCase() + " box, area " + options.width * options.height;', '}', 'console.log(describeBox({ width: 2, height: 3, color: "red" }));'));
  accept(id, 'destructured parameter, literal call', js('function describeBox({ width, height, color }) { return color + " " + width + "x" + height; }', 'console.log(describeBox({ width: 2, height: 3, color: "red" }));'));
  accept(id, 'result stored first', js(B, 'const text = describeBox({ width: 2, height: 3, color: "red" });', 'console.log(text);'));
  accept(id, 'multi-line literal', js(B, 'console.log(describeBox({', '  width: 2,', '  height: 3,', '  color: "red"', '}));'));
  accept(id, 'a default for the options object', js('function describeBox(options = {}) { return options.color + " " + options.width + " by " + options.height; }', 'console.log(describeBox({ width: 2, height: 3, color: "red" }));'));
  reject(id, 'destructured declaration, called with a variable', 'r3', js('function describeBox({ width, height, color }) { return color + width + height; }', 'const o = { width: 2, height: 3, color: "red" };', 'console.log(describeBox(o));'));
  reject(id, 'destructured declaration, never called', 'r3', js('function describeBox({ width, height, color }) { return color + width + height; }', 'console.log("done");'));
  reject(id, 'an unrelated call takes the literal', 'r3', js(B, 'const o = { width: 2, height: 3, color: "red" };', 'console.log(describeBox(o), String({}));'));
  reject(id, 'the height is never used', 't1', js('function describeBox(options) { return options.color.toUpperCase() + " " + options.width; }', 'console.log(describeBox({ width: 2, height: 3, color: "red" }));'));
}
{
  // 3.5.22: describe is the function that destructures (r2); all three unpacked names are used
  // (r3); describe is tested with the keys the student chose to unpack (t1)
  const id = '3-5-22-lab-destructure-three';
  const I = ['const item = { title: "Pen", cost: 2, quantity: 10 };', 'const { title, cost, quantity } = item;', 'console.log(title + " costs " + cost + ", " + quantity + " left");'];
  accept(id, 'describe unpacks keys of the student\'s own object', js('const book = { title: "T", author: "A", pages: 9 };', 'const { title, author, pages } = book;', 'console.log(`${title} by ${author}, ${pages} pages`);',
    'function describe({ title, author }) { return title + " by " + author; }', 'console.log(describe(book));'));
  accept(id, 'describe multiplies two of its names, upper-cases a third', js(...I, 'function describe({ title, cost, quantity }) { return title.toUpperCase() + ": " + cost * quantity; }', 'console.log(describe(item));'));
  accept(id, 'describe formats a number', js(...I, 'const describe = ({ cost, quantity }) => "total " + (cost * quantity).toFixed(2);', 'console.log(describe(item));'));
  accept(id, 'renamed while unpacking', js('const item = { title: "Pen", cost: 2, quantity: 10 };', 'const { title: t, cost: c, quantity: q } = item;', 'console.log(t, c, q);', 'function describe({ title, quantity }) { return title + " x" + quantity; }', 'console.log(describe(item));'));
  accept(id, 'multi-line let, sentence stored first', js('const item = { title: "Pen", cost: 2, quantity: 10 };', 'let {', '  title,', '  cost,', '  quantity', '} = item;', 'const sentence = title + " costs " + cost + " (" + quantity + ")";', 'console.log(sentence);',
    'function describe({ title, quantity }) {', '  return title + " x" + quantity;', '}', 'console.log(describe(item));'));
  reject(id, 'describe reads with dots, a decoy destructures nothing', 'r2', js(...I, 'function describe(o) { return o.title + " x" + o.quantity; }', 'function decoy({}) {}', 'console.log(describe(item));'));
  reject(id, 'the unpacked names are never used', 'r3', js('const item = { title: "Pen", cost: 2, quantity: 10 };', 'const { title, cost, quantity } = item;', 'function describe({ title, quantity }) { return title + " x" + quantity; }', 'console.log(describe(item));'));
  reject(id, 'two of the three names used', 'r3', js('const item = { title: "Pen", cost: 2, quantity: 10 };', 'const { title, cost, quantity } = item;', 'console.log(title + " " + cost);', 'function describe({ title, quantity }) { return title + " x" + quantity; }', 'console.log(describe(item));'));
  reject(id, 'describe unpacks two names and uses one', 't1', js(...I, 'function describe({ title, quantity }) { return "Item: " + title; }', 'console.log(describe(item));'));
  reject(id, 'describe unpacks in its body, not its parameter list', 't1', js(...I, 'function describe(o) { const { title, quantity } = o; return title + " x" + quantity; }', 'console.log(describe(item));'));
}
{
  // 3.5.24: players may be pushed in (r1), read through destructuring or forEach (r2), looped with
  // a cached length (r3); a literal printed in the loop (r3, t1) and the old arrays under new
  // names (r5) fail
  const id = '3-5-24-lab-parallel-arrays-refactor';
  const PL = 'const players = [{ name: "Marisol", score: 92, group: "A" }, { name: "Dev", score: 78, group: "B" }, { name: "Priya", score: 85, group: "A" }];';
  accept(id, 'records pushed in', js('const players = [];', 'players.push({ name: "Marisol", score: 92, group: "A" });', 'players.push({ name: "Dev", score: 78, group: "B" });', 'players.push({ name: "Priya", score: 85, group: "A" });',
    'for (let i = 0; i < players.length; i++) { console.log(players[i].name + " (" + players[i].group + "): " + players[i].score); }'));
  accept(id, 'destructuring in the loop body', js(PL, 'for (const p of players) {', '  const { name, score, group } = p;', '  console.log(name + " (" + group + "): " + score);', '}'));
  accept(id, 'destructuring players[i] in an index loop', js(PL, 'for (let i = 0; i < players.length; i++) {', '  const { name, score, group } = players[i];', '  console.log(`${name} (${group}): ${score}`);', '}'));
  accept(id, 'destructuring in the loop head', js(PL, 'for (const { name, score, group } of players) {', '  console.log(name, group, score);', '}'));
  accept(id, 'cached players.length', js(PL, 'const count = players.length;', 'for (let i = 0; i < count; i++) {', '  console.log(players[i].name + " " + players[i].score + " " + players[i].group);', '}'));
  accept(id, 'forEach with an arrow', js(PL, 'players.forEach((p) => console.log(p.name + " (" + p.group + "): " + p.score));'));
  accept(id, 'forEach with a function', js(PL, 'players.forEach(function (p) {', '  console.log(p.name, p.group, p.score);', '});'));
  accept(id, 'braceless for...of, template literal', js(PL, 'for (const p of players) console.log(`${p.name} (${p.group}): ${p.score}`);'));
  reject(id, 'a literal printed in the loop', 'r3', js(PL, 'for (const p of players) { const n = p.name; console.log("Marisol Dev Priya 92 78 85"); }'));
  reject(id, 'a literal printed in the loop (one line names everyone)', 't2', js(PL, 'for (const p of players) { const n = p.name; console.log("Marisol Dev Priya 92 78 85"); }'));
  reject(id, 'the old arrays kept under new names', 'r5', js('const nm = ["Marisol", "Dev", "Priya"];', 'const sc = [92, 78, 85];', PL,
    'for (let i = 0; i < players.length; i++) { console.log(nm[i] + " " + sc[i] + " " + players[i].group); }'));
  reject(id, 'forEach that prints a literal', 'r3', js(PL, 'players.forEach((p) => { const n = p.name; console.log("x"); });', 'console.log("Marisol 92");', 'console.log("Dev 78");', 'console.log("Priya 85");'));
}
{
  // 3.5.25: the cart may be pushed in (r1); the loop over cart multiplies two dot reads (r5);
  // the destructured names are used (r6); Object.keys is walked by a loop with a bracket read (r7)
  const id = '3-5-25-lab-objects-capstone';
  const CT = 'const cart = [{ name: "A", price: 1.5, quantity: 2, details: { color: "red" } }, { name: "B", price: 3, quantity: 4, "item code": "x" }, { name: "C", price: 5, quantity: 6 }];';
  const READS = ['console.log(cart[0].name);', 'console.log(cart[1]["item code"]);', 'console.log(cart[0].details.color);'];
  const TAIL = ['const { name, price } = cart[0];', 'console.log(name + " costs " + price);', 'for (const key of Object.keys(cart[0])) { console.log(key + ": " + cart[0][key]); }'];
  accept(id, 'cart pushed in', js('const cart = [];', 'cart.push({ name: "A", price: 1.5, quantity: 2, details: { color: "red" } });', 'cart.push({ name: "B", price: 3, quantity: 4, "item code": "x" });', 'cart.push({ name: "C", price: 5, quantity: 6 });',
    ...READS, 'for (const item of cart) { console.log(item.name + ": " + item.price * item.quantity); }', ...TAIL));
  accept(id, 'for...of with a cost variable', js(CT, ...READS, 'for (const item of cart) {', '  const cost = item.price * item.quantity;', '  console.log(item.name + ": " + cost);', '}', ...TAIL));
  accept(id, 'index loop with an alias, quantity first', js(CT, ...READS, 'for (let i = 0; i < cart.length; i++) {', '  const item = cart[i];', '  console.log(item.name + ": " + item.quantity * item.price);', '}', ...TAIL));
  accept(id, 'forEach and a keys array', js(CT, ...READS, 'cart.forEach((item) => console.log(item.name, item.price * item.quantity));', 'const { name, price } = cart[0];', 'console.log(`${name} costs ${price}`);',
    'const keys = Object.keys(cart[1]);', 'for (let i = 0; i < keys.length; i++) { console.log(keys[i] + ": " + cart[1][keys[i]]); }'));
  accept(id, 'braceless loop, sentence stored first', js(CT, ...READS, 'for (const item of cart) console.log(item.name, (item.price * item.quantity).toFixed(2));', 'const { name, price } = cart[0];', 'const line = name + " costs " + price;', 'console.log(line);',
    'const first = cart[0];', 'for (const key of Object.keys(first)) { console.log(key + ": " + first[key]); }'));
  reject(id, 'costs typed in, an empty loop', 'r5', js(CT, ...READS, 'console.log(3); console.log(12); console.log(30);', 'for (;0;) {}', ...TAIL));
  reject(id, 'a product in a loop that is not over cart', 'r5', js(CT, ...READS, 'for (let i = 0; i < 0; i++) { console.log(cart[i].price * cart[i].quantity); }', 'console.log(3); console.log(12); console.log(30);', ...TAIL));
  reject(id, 'the destructured names are never used', 'r6', js(CT, ...READS, 'for (const item of cart) { console.log(item.name + ": " + item.price * item.quantity); }', 'const { name, price } = cart[0];', 'console.log(cart[0].name);',
    'for (const key of Object.keys(cart[0])) { console.log(key + ": " + cart[0][key]); }'));
  reject(id, 'a bare Object.keys call, every key typed in', 'r7', js(CT, ...READS, 'for (const item of cart) { console.log(item.name + ": " + item.price * item.quantity); }', 'const { name, price } = cart[0];', 'console.log(name + " costs " + price);',
    'Object.keys(cart[0]);', 'console.log("name: A");', 'console.log("price: 1.5");'));
}

// ---- batch 8: module 3.5 second pass (2026-10-14). What a step asks to be PRINTED must reach
// console.log (directly, or through a variable that is printed); a read on a line of its own
// beside typed-in output no longer counts. A loop must walk a NAMED array or object, so a loop
// over [] or Object.keys({}) that never runs is not the loop the step asks for.
const rejectSome = (id, name, script) => cases.push({ id, name, files: { 'script.js': script }, expect: 'fail' });
{
  // 3.5.5 r3: the added field must be one the literal did not have (three fields to start, so t1's
  // "at least three properties" cannot be what refuses these)
  const id = '3-5-5-lab-read-update-fields';
  const B = 'const book = { title: "t", pages: 1, author: "a" };';
  reject(id, 'the same field changed twice, nothing added', 'r3', js(B, 'console.log(book.title);', 'book.pages = 2;', 'book.pages = 3;', 'console.log(book);'));
  reject(id, 'a field bumped by += 0 and ++, nothing added', 'r3', js(B, 'console.log(book.title);', 'book.pages += 0;', 'book.pages++;', 'console.log(book);'));
  reject(id, 'both fields the literal had changed, nothing added', 'r3', js(B, 'console.log(book.title);', 'book.pages = 480;', 'book.title = "u";', 'console.log(book);'));
  reject(id, 'the new field is assigned to itself', 'r3', js(B, 'console.log(book.title);', 'book.pages = 480;', 'book.year = book.year;', 'console.log(book);'));
  accept(id, 'field added before the change', js(B, 'console.log(book.title);', 'book.year = 1965;', 'book.pages = 480;', 'console.log(book);'));
  accept(id, 'new field built from an old one, single quotes', js("let book = { title: 'Dune', pages: 412 };", 'console.log(book.title);', 'book.pages -= 2;', "book.label = book.title + ' (' + book.pages + ')';", 'console.log(book);'));
}
{
  // 3.5.8 r3: the value fetched with brackets inside the keys loop is printed; Object.keys of laptop
  const id = '3-5-8-lab-dot-vs-bracket';
  const pre = ['const laptop = { "screen size": 13, ram: 16 };', 'console.log(laptop["screen size"]);', 'const k = "ram";', 'console.log(laptop[k]);'];
  accept(id, 'index loop with Object.keys inline', js(...pre, 'for (let i = 0; i < Object.keys(laptop).length; i++) {', '  const key = Object.keys(laptop)[i];', '  console.log(key + " = " + laptop[key]);', '}'));
  accept(id, 'index loop, the whole read inline', js(...pre, 'for (let i = 0; i < Object.keys(laptop).length; i++) { console.log(Object.keys(laptop)[i], laptop[Object.keys(laptop)[i]]); }'));
  accept(id, 'value stored, then printed', js(...pre, 'for (const key of Object.keys(laptop)) {', '  const value = laptop[key];', '  console.log(key, value);', '}'));
  accept(id, 'forEach with a function, single quotes', js("const laptop = { 'screen size': 13, ram: 16 };", "console.log(laptop['screen size']);", "const k = 'ram';", 'console.log(laptop[k]);', "Object.keys(laptop).forEach(function (key) { console.log(key + ': ' + laptop[key]); });"));
  accept(id, 'multi-line console.log in the loop', js(...pre, 'for (const key of Object.keys(laptop)) {', '  console.log(', '    key,', '    laptop[key]', '  );', '}'));
  reject(id, 'bare bracket read in the loop, every key typed in', 'r3', js(...pre, 'for (const key of Object.keys(laptop)) { laptop[key]; }', 'console.log("screen size: 13");', 'console.log("ram: 16");'));
  reject(id, 'value stored in the loop, a literal printed', 'r3', js(...pre, 'for (const key of Object.keys(laptop)) { const v = laptop[key]; console.log("x"); }', 'console.log("screen size 13 ram 16");'));
  reject(id, 'a loop over the keys of an empty object', 'r3', js(...pre, 'for (const key of Object.keys({})) { console.log(key + laptop[key]); }', 'console.log("screen size: 13");', 'console.log("ram: 16");'));
  reject(id, 'only keys[i] printed from a keys array, values typed in', 'r3', js(...pre, 'const keys = Object.keys(laptop);', 'for (let i = 0; i < keys.length; i++) { console.log(keys[i]); }', 'console.log(13, 16);'));
  reject(id, 'only the inline key printed, values typed in', 'r3', js(...pre, 'for (let i = 0; i < Object.keys(laptop).length; i++) { console.log(Object.keys(laptop)[i]); }', 'console.log(13, 16);'));
}
{
  // 3.5.12 and 3.5.24: a loop over a literal array never runs
  rejectSome('3-5-12-lab-nested-structure', 'a loop over [] that never runs, the items typed in',
    js('const order = { customer: { name: "Ana" }, items: [{ name: "Pen", price: 2 }, { name: "Ink", price: 3 }] };', 'console.log(order.customer.name);',
       'for (const item of []) { console.log(item.name, item.price); }', 'console.log("Pen 2");', 'console.log("Ink 3");'));
  rejectSome('3-5-24-lab-parallel-arrays-refactor', 'a loop over [] that never runs, the records typed in',
    js('const players = [{ name: "Marisol", score: 92, group: "A" }, { name: "Dev", score: 78, group: "B" }, { name: "Priya", score: 85, group: "A" }];',
       'for (const p of []) { console.log(p.name + " (" + p.group + "): " + p.score); }', 'console.log("Marisol (A): 92");', 'console.log("Dev (B): 78");', 'console.log("Priya (A): 85");'));
}
{
  // 3.5.15 r2: the method called is one the student defined, not a built-in every object has
  const id = '3-5-15-lab-add-method';
  const S = 'const student = { name: "Ana", greet: function () { return "Hi " + student.name; } };';
  reject(id, 'toString printed instead of the method', 'r2', js(S, 'console.log(student.toString());'));
  reject(id, 'hasOwnProperty printed instead of the method', 'r2', js(S, 'console.log(student.hasOwnProperty("name"));'));
  reject(id, 'valueOf stored, then printed', 'r2', js(S, 'const v = student.valueOf();', 'console.log(v);'));
  reject(id, 'a data field read, never a call', 'r2', js(S, 'console.log(student.name.toUpperCase());'));
  accept(id, 'arrow method with a bare parameter, assigned after', js("const student = { name: 'Ana' };", "student.greet = who => 'Hi ' + who + ', I am ' + student.name;", "console.log(student.greet('Dev'));"));
  accept(id, 'two methods, the second one printed', js('const student = { name: "Ana", hi() { return "hi"; }, bye: function () { return "bye " + this.name; } };', 'console.log(student.bye());'));
  accept(id, 'multi-line console.log', js(S, 'console.log(', '  student.greet()', ');'));
  accept(id, 'call inside a longer expression, no semicolons', js('const student = { name: "Ana", greet() { return "Hi" } }', 'console.log("Says: " + student.greet())'));
}
{
  // 3.5.18 r3: the call with the object literal is what gets printed
  const id = '3-5-18-lab-params-to-object';
  const B = 'function describeBox(options) { return options.color + " " + options.width + "x" + options.height; }';
  reject(id, 'the call is never printed, "done" printed instead', 'r3', js(B, 'describeBox({ width: 2, height: 3, color: "red" });', 'console.log("done");'));
  reject(id, 'the call is stored and never printed', 'r3', js(B, 'const t = describeBox({ width: 2, height: 3, color: "red" });', 'console.log("red 2x3");'));
  accept(id, 'call inside a template literal', js(B, 'console.log(`Box: ${describeBox({ width: 2, height: 3, color: "red" })}`);'));
  accept(id, 'arrow with a destructured parameter, let then assignment', js("const describeBox = ({ width, height, color }) => color + ' ' + width + ' by ' + height;", 'let text;', "text = describeBox({ width: 2, height: 3, color: 'red' });", 'console.log(text);'));
  accept(id, 'labelled print beside the call', js(B, 'console.log("result:", describeBox({ color: "red", width: 2, height: 3 }));'));
}
{
  // 3.5.22 r3: every unpacked name reaches console.log, directly or through a printed variable
  const id = '3-5-22-lab-destructure-three';
  const I = ['const item = { title: "Pen", cost: 2, quantity: 10 };', 'const { title, cost, quantity } = item;'];
  const D = ['function describe({ title, quantity }) { return title + " x" + quantity; }', 'console.log(describe(item));'];
  reject(id, 'names copied into variables nobody prints', 'r3', js(...I, 'const a = title;', 'const b = cost;', 'const c = quantity;', 'console.log("hi");', ...D));
  reject(id, 'a sentence built with += and never printed', 'r3', js(...I, 'let s = title;', 's += cost;', 's += quantity;', 'console.log("Pen costs 2");', ...D));
  reject(id, 'the names appear only as an arrow describe\'s parameters', 'r3', js(...I, 'const describe = ({ title, cost, quantity }) => title + " " + cost + " " + quantity;', 'console.log(describe(item));'));
  accept(id, 'sentence grown with +=, then printed', js(...I, 'let s = title;', 's += " costs " + cost;', 's += ", " + quantity + " left";', 'console.log(s);', ...D));
  accept(id, 'template literal', js(...I, 'console.log(`${title} costs ${cost} (${quantity} left)`);', ...D));
  accept(id, 'one name per line inside console.log', js(...I, 'console.log(', '  title,', '  cost,', '  quantity', ');', ...D));
  accept(id, 'sentence spread over two lines, no semicolons', js('const item = { title: "Pen", cost: 2, quantity: 10 }', 'const { title, cost, quantity } = item', 'const line = title + " costs " +', '  cost + ", " + quantity + " left"', 'console.log(line)',
    'function describe({ title, quantity }) { return title + " x" + quantity }', 'console.log(describe(item))'));
  accept(id, 'the names passed to describe inside console.log', js(...I, 'console.log(title, cost, quantity);', 'const describe = ({ title, cost }) => title + " at " + cost;', 'console.log(describe({ title, cost }));'));
}
{
  // 3.5.25: step 3's three reads are printed (r3 dot, r4 spaced key, r9 chain); the cost is printed
  // (r5); the unpacked names reach console.log (r6); each key's value is printed (r7)
  const id = '3-5-25-lab-objects-capstone';
  const ref = solutionFiles(id)['script.js'];
  const cut = (...lines) => { let s = ref; for (const l of lines) { if (!s.includes(l)) throw new Error('3.5.25 anchor missing: ' + l); s = s.replace(l + '\n', ''); } return s; };
  reject(id, 'the reference without its three step-3 prints', 'r4', cut('console.log(cart[0].name);', 'console.log(cart[1]["item code"]);', 'console.log(cart[0].details.color);'));
  reject(id, 'the reference without its three step-3 prints (no chain)', 'r9', cut('console.log(cart[0].name);', 'console.log(cart[1]["item code"]);', 'console.log(cart[0].details.color);'));
  reject(id, 'the reference without the spaced-key print', 'r4', cut('console.log(cart[1]["item code"]);'));
  reject(id, 'the reference without the chain print', 'r9', cut('console.log(cart[0].details.color);'));
  reject(id, 'the reads on bare lines, their values typed in', 'r4', ref.replace('console.log(cart[1]["item code"]);', 'cart[1]["item code"];\nconsole.log("NB-04");').replace('console.log(cart[0].details.color);', 'cart[0].details.color;\nconsole.log("blue");'));
  const CT = 'const cart = [{ name: "A", price: 1.5, quantity: 2, details: { color: "red" } }, { name: "B", price: 3, quantity: 4, "item code": "x" }, { name: "C", price: 5, quantity: 6 }];';
  const READS = ['console.log(cart[0].name);', 'console.log(cart[1]["item code"]);', 'console.log(cart[0].details.color);'];
  const LOOP = 'for (const item of cart) { console.log(item.name + ": " + item.price * item.quantity); }';
  const TAIL = ['const { name, price } = cart[0];', 'console.log(name + " costs " + price);', 'for (const key of Object.keys(cart[0])) { console.log(key + ": " + cart[0][key]); }'];
  reject(id, 'every read uses brackets, nothing read with a dot is printed', 'r3', js(CT, 'console.log(cart[0]["name"]);', 'console.log(cart[1]["item code"]);', 'console.log(cart[0]["details"]["color"]);',
    'for (let i = 0; i < cart.length; i++) { console.log(cart[i]["name"], cart[i]["price"] * cart[i]["quantity"]); }', ...TAIL));
  reject(id, 'the cost is worked out but never printed, typed in after', 'r5', js(CT, ...READS, 'for (const item of cart) { const c = item.price * item.quantity; console.log(item.name); }', 'console.log(3); console.log(12); console.log(30);', ...TAIL));
  reject(id, 'a bare product in the loop, costs typed in', 'r5', js(CT, ...READS, 'for (const item of cart) { item.price * item.quantity; }', 'console.log(3); console.log(12); console.log(30);', ...TAIL));
  rejectSome(id, 'a loop over [] that never runs, costs typed in', js(CT, ...READS, 'for (const item of []) { console.log(item.name + ": " + item.price * item.quantity); }', 'console.log("A: 3"); console.log("B: 12"); console.log("C: 30");', ...TAIL));
  reject(id, 'the unpacked names copied into variables nobody prints', 'r6', js(CT, ...READS, LOOP, 'const { name, price } = cart[0];', 'const a = name;', 'const b = price;', 'console.log("A costs 1.5");',
    'for (const key of Object.keys(cart[0])) { console.log(key + ": " + cart[0][key]); }'));
  reject(id, 'bare bracket read in the keys loop, values typed in', 'r7', js(CT, ...READS, LOOP, 'const { name, price } = cart[0];', 'console.log(name + " costs " + price);',
    'for (const key of Object.keys(cart[0])) { cart[0][key]; }', 'console.log("name: A");', 'console.log("price: 1.5");', 'console.log("quantity: 2");'));
  reject(id, 'a keys loop over an empty object, values typed in', 'r7', js(CT, ...READS, LOOP, 'const { name, price } = cart[0];', 'console.log(name + " costs " + price);',
    'for (const key of Object.keys({})) { console.log(key + ": " + cart[0][key]); }', 'console.log("name: A");', 'console.log("price: 1.5");'));
  accept(id, 'keys walked by an index loop with Object.keys inline', js(CT, ...READS, LOOP, 'const { name, price } = cart[0];', 'console.log(name + " costs " + price);',
    'const record = cart[1];', 'for (let i = 0; i < Object.keys(record).length; i++) {', '  const key = Object.keys(record)[i];', '  console.log(key + " = " + record[key]);', '}'));
  accept(id, 'step-3 reads stored first, then printed', js(CT, 'const first = cart[0].name;', 'const code = cart[1]["item code"];', 'const color = cart[0].details.color;', 'console.log(first);', 'console.log(code);', 'console.log(color);', LOOP, ...TAIL));
  accept(id, 'single quotes, reads inside template literals', js(CT.replace(/"/g, "'"), "console.log(`first: ${cart[0].name}`);", "console.log(`code: ${cart[1]['item code']}`);", "console.log(`color: ${cart[0].details.color}`);",
    LOOP.replace(/"/g, "'"), "const { name, price } = cart[0];", "console.log(`${name} costs ${price}`);", "for (const key of Object.keys(cart[0])) { console.log(`${key}: ${cart[0][key]}`); }"));
  accept(id, 'cached length, cost stored, names in a stored sentence, keys value stored', js(CT, ...READS, 'const n = cart.length;', 'for (let i = 0; i < n; i++) {', '  const cost = cart[i].price * cart[i].quantity;', '  console.log(cart[i].name, cost);', '}',
    'const { name, price } = cart[0];', 'let line = name;', 'line += " costs " + price;', 'console.log(line);', 'for (const key of Object.keys(cart[0])) {', '  const value = cart[0][key];', '  console.log(key, value);', '}'));
  accept(id, 'forEach with a block body, cost formatted', js(CT, ...READS, 'cart.forEach(function (item) {', '  console.log(item.name + ": " + (item.price * item.quantity).toFixed(2));', '});', ...TAIL));
}

// ---- batch 9: module 3.5 third pass (2026-10-14). A print counts only when it RUNS: not behind
// `false &&`, and not inside a function nobody calls (a helper called from the loop or the top level
// does count). A read printed through a variable counts. Printed undefined / NaN means a read found
// nothing. A loop may be for, while or forEach, on the array or a one-step alias of it.
{
  // 3.5.5 r2: book's field is what is printed (stored first is fine); Math.PI, dead prints are not
  const id = '3-5-5-lab-read-update-fields';
  const B = 'const book = { title: "T", pages: 9 };';
  const TAIL = ['book.pages = 10;', 'book.author = "A";', 'console.log(book);'];
  accept(id, 'read stored in a variable, then printed', js(B, 'const t = book.title;', 'console.log(t);', ...TAIL));
  accept(id, 'let declared first, assigned, printed with a label', js(B, 'let t;', 't = book.title;', 'console.log("Title: " + t);', ...TAIL));
  accept(id, 'read printed from a helper that is called', js(B, 'function show() { console.log(book.title); }', 'show();', ...TAIL));
  reject(id, 'Math.PI is the only dot read printed', 'r2', js(B, 'console.log(Math.PI);', ...TAIL));
  reject(id, 'the read is printed only inside a function nobody calls', 'r2', js(B, 'function f() { console.log(book.title); }', 'console.log("x");', ...TAIL));
  reject(id, 'the read is printed only behind false &&', 'r2', js(B, 'false && console.log(book.title);', 'console.log("x");', ...TAIL));
  reject(id, 'the read is stored, a literal printed', 'r2', js(B, 'const t = book.title;', 'console.log("T");', ...TAIL));
}
{
  // 3.5.8 r4: a variable holds a key name and laptop[that variable] is printed; r3 walks laptop's
  // own keys in a loop that runs; t1 refuses a printed undefined
  const id = '3-5-8-lab-dot-vs-bracket';
  const LA = 'const laptop = { brand: "F", ram: 16, "screen size": 13 };';
  const LOOP = 'for (const key of Object.keys(laptop)) { console.log(key + ": " + laptop[key]); }';
  accept(id, 'key value stored, then printed', js(LA, 'console.log(laptop["screen size"]);', "let wanted = 'brand';", 'const v = laptop[wanted];', 'console.log(v);', LOOP));
  accept(id, 'the keys loop inside a function that is called', js(LA, 'console.log(laptop["screen size"]);', 'const k = "ram";', 'console.log(laptop[k]);', 'function showAll() {', '  for (const key of Object.keys(laptop)) {', '    console.log(key + ": " + laptop[key]);', '  }', '}', 'showAll();'));
  accept(id, 'the keys loop inside an arrow that is called', js(LA, 'console.log(laptop["screen size"]);', 'const k = "ram";', 'console.log(laptop[k]);', 'const showAll = () => { for (const key of Object.keys(laptop)) { console.log(key, laptop[key]); } };', 'showAll();'));
  reject(id, 'steps 3 and 4 skipped: no key name held in a variable', 'r4', js(LA, 'console.log(laptop["screen size"]);', LOOP));
  reject(id, 'the key variable read with a dot instead', 'r4', js(LA, 'console.log(laptop["screen size"]);', 'const k = "ram";', 'console.log(laptop.ram, k);', LOOP));
  reject(id, 'the bracket read with the variable is never printed', 'r4', js(LA, 'console.log(laptop["screen size"]);', 'const k = "ram";', 'laptop[k];', 'console.log(16);', LOOP));
  reject(id, 'the keys loop sits in a function nobody calls, JSON printed', 'r3', js(LA, 'console.log(laptop["screen size"]);', 'const k = "ram";', 'console.log(laptop[k]);', 'function show() { for (const key of Object.keys(laptop)) { console.log(key + laptop[key]); } }', 'console.log(JSON.stringify(laptop));'));
  reject(id, 'the keys loop walks an empty object, the output typed', 'r3', js(LA, 'console.log(laptop["screen size"]);', 'const k = "ram";', 'console.log(laptop[k]);', 'const e = {};', 'for (const key of Object.keys(e)) { console.log(key + ": " + e[key]); }', 'console.log("brand F ram 16 screen size 13");'));
  reject(id, 'the loop prints the key only, the values typed', 'r3', js(LA, 'console.log(laptop["screen size"]);', 'const k = "ram";', 'console.log(laptop[k]);', 'for (const key of Object.keys(laptop)) { laptop[key]; console.log(key); }', 'console.log("F 16 13");'));
  reject(id, 'a misspelled key prints undefined', 't2', js(LA, 'console.log(laptop["screen size"]);', 'const k = "rom";', 'console.log(laptop[k]);', LOOP));
}
{
  // 3.5.12: `{ customer, items }` (A1); an alias of the items array, while and forEach (A2); the
  // customer object held in a variable (A2); the reads must be PRINTED (B1); no undefined (B2)
  const id = '3-5-12-lab-nested-structure';
  const O = 'const order = { customer: { name: "Ana" }, items: [{ name: "Pen", price: 2 }, { name: "Ink", price: 3 }] };';
  const CUST = 'console.log(order.customer.name);';
  const LOOP = 'for (let i = 0; i < order.items.length; i++) { console.log(order.items[i].name + ": " + order.items[i].price); }';
  accept(id, '{ customer, items } shorthand, prints built with +', js('const customer = { name: "Ana" };', 'const items = [{ name: "Pen", price: 2 }, { name: "Ink", price: 3 }];', 'const order = { customer, items };', CUST,
    'for (let i = 0; i < order.items.length; i++) { console.log(order.items[i].name + " " + order.items[i].price); }'));
  accept(id, '{ items, customer: customer }', js("const customer = { name: 'Ana' };", "const items = [{ name: 'Pen', price: 2 }, { name: 'Ink', price: 3 }];", 'const order = { items, customer: customer };', CUST, 'for (const item of order.items) { console.log(item.name + " " + item.price); }'));
  accept(id, 'an alias of the items array, index loop', js(O, CUST, 'const list = order.items;', 'for (let i = 0; i < list.length; i++) { console.log(list[i].name + ": " + list[i].price); }'));
  accept(id, 'a while loop', js(O, CUST, 'let i = 0;', 'while (i < order.items.length) {', '  console.log(order.items[i].name, order.items[i].price);', '  i++;', '}'));
  accept(id, 'an alias, a while loop and a record variable', js(O, CUST, 'const list = order.items;', 'let i = 0;', 'while (i < list.length) { const item = list[i]; console.log(item.name, item.price); i += 1; }'));
  accept(id, 'forEach with an arrow', js(O, CUST, 'order.items.forEach(item => console.log(item.name + ": " + item.price));'));
  accept(id, 'forEach with a function', js(O, CUST, 'order.items.forEach(function (item) {', '  console.log(item.name, item.price);', '});'));
  accept(id, 'forEach on an alias', js(O, CUST, 'const list = order.items;', 'list.forEach((item) => { console.log(item.name + " " + item.price); });'));
  accept(id, 'the customer object held in a variable (the 3.5.10 model)', js(O, 'const c = order.customer;', 'console.log(c.name);', LOOP));
  reject(id, 'the chains on lines of their own, the values typed', 'r3', js(O, 'order.customer.name;', 'order.items[0].name;', 'console.log("Ana");', 'console.log("Pen 2");', 'console.log("Ink 3");', 'for (let i = 0; i < order.items.length; i++) { console.log(i); }'));
  reject(id, 'the loop prints the index only', 'r5', js(O, CUST, 'for (let i = 0; i < order.items.length; i++) { order.items[i].name; console.log(i); }', 'console.log("Pen 2");', 'console.log("Ink 3");'));
  reject(id, 'the loop prints whole items, fields read on their own', 'r5', js(O, 'console.log(order.customer);', 'order.customer.name; order.items[0].name;', 'for (const it of order.items) { console.log(it); }'));
  reject(id, 'whole items printed, no field read printed', 'r4', js(O, CUST, 'for (const item of order.items) { item.name; console.log(item); }'));
  reject(id, 'the customer held in a variable, never printed', 'r3', js(O, 'const c = order.customer;', 'c.name;', 'console.log("Ana");', LOOP));
  reject(id, 'forEach that prints a literal', 'r5', js(O, CUST, 'order.items.forEach((item) => { const n = item.name; console.log("x"); });', 'console.log("Pen 2");', 'console.log("Ink 3");'));
  reject(id, 'a misspelled field prints undefined beside typed lines', 't2', js(O, CUST, 'for (let i = 0; i < order.items.length; i++) { console.log(order.items[i].nmae); }', 'console.log("Pen 2");', 'console.log("Ink 3");'));
}
{
  // 3.5.15 r2: the call is printed by a console.log that runs; greet("Dev") (the hint's form) passes
  const id = '3-5-15-lab-add-method';
  const S = 'const student = { name: "Ana", greet() { return "Hi " + this.name; } };';
  accept(id, 'printed from a helper that is called', js(S, 'function show() { console.log(student.greet()); }', 'show();'));
  accept(id, 'method with a parameter, called with one', js('const student = { name: "Ana", greet(who) { return "Hi " + who; } };', 'console.log(student.greet("Dev"));'));
  reject(id, 'the call printed only behind false &&', 'r2', js(S, 'false && console.log(student.greet());', 'console.log("Hi Ana");'));
  reject(id, 'the call printed only inside a function nobody calls', 'r2', js(S, 'function later() { console.log(student.greet()); }', 'console.log("Hi Ana");'));
}
{
  // 3.5.18: describeBox reads three values off its options with a dot (t1); something is printed
  // (t1); the print of the call runs (r3); a positional helper may stay under another name
  const id = '3-5-18-lab-params-to-object';
  const CALL = 'console.log(describeBox({ width: 2, height: 3, color: "red" }));';
  accept(id, 'the positional version kept under another name', js('function describeBoxOld(w, h, c) { return c + " " + w + "x" + h; }', 'function describeBox(options) { return options.color + " " + options.width + "x" + options.height; }', CALL));
  accept(id, 'arrow with a default for the options object', js('const describeBox = (o = {}) => `${o.color} ${o.width}x${o.height}`;', CALL));
  accept(id, 'destructured parameter with defaults', js('function describeBox({ width = 1, height = 1, color = "grey" }) { return color + " " + width + "x" + height; }', CALL));
  reject(id, 'JSON.stringify of the options, one bare dot read', 't1', js('function describeBox(o) { o.width; return JSON.stringify(o); }', CALL));
  reject(id, 'Object.values joined, one bare dot read', 't1', js('function describeBox(options) { options.x; return Object.values(options).join(" "); }', CALL));
  reject(id, 'the only print sits in if (false)', 't2', js('function describeBox(o) { return o.color + o.width + o.height; }', 'if (false) { ' + CALL + ' }'));
  reject(id, 'the only print sits in a function nobody calls', 'r3', js('function describeBox(o) { return o.color + o.width + o.height; }', 'function go() { ' + CALL + ' }'));
}
{
  // 3.5.22: names printed by a console.log that runs (r3); something printed, no undefined (t1)
  const id = '3-5-22-lab-destructure-three';
  const I = ['const item = { title: "Pen", cost: 2, quantity: 10 };', 'const { title, cost, quantity } = item;'];
  const D = 'function describe({ title, quantity }) { return title + " x" + quantity; }';
  accept(id, 'sentence printed from a helper that is called', js(...I, 'function say() { console.log(title + " costs " + cost + ", " + quantity + " left"); }', 'say();', D));
  reject(id, 'unpacked from an empty object: three undefineds printed', 't2', js('const { a, b, c } = {};', 'console.log(a, b, c);', D));
  reject(id, 'a third name the object lacks prints undefined', 't2', js('const item = { title: "Pen", cost: 2 };', 'const { title, cost, quantity } = item;', 'console.log(title + " costs " + cost + " each, " + quantity + " in stock");', D));
  reject(id, 'the names printed only inside a function nobody calls', 'r3', js(...I, 'function never() { console.log(title, cost, quantity); }', D, 'console.log(describe(item));'));
  reject(id, 'the names printed only behind false &&', 'r3', js(...I, 'false && console.log(title + cost + quantity);', 'console.log("Pen costs 2");', D));
}
{
  // 3.5.24: while (A3), a helper called from the loop (A3), records built in variables (A3); a dot
  // read must be PRINTED (B4)
  const id = '3-5-24-lab-parallel-arrays-refactor';
  const PL = 'const players = [{ name: "Marisol", score: 92, group: "A" }, { name: "Dev", score: 78, group: "B" }, { name: "Priya", score: 85, group: "A" }];';
  const SHOW = 'function show(p) { console.log(p.name + " (" + p.group + "): " + p.score); }';
  accept(id, 'a while loop', js(PL, 'let i = 0;', 'while (i < players.length) {', '  console.log(players[i].name + " (" + players[i].group + "): " + players[i].score);', '  i++;', '}'));
  accept(id, 'a helper called from an index loop', js(PL, SHOW, 'for (let i = 0; i < players.length; i++) { show(players[i]); }'));
  accept(id, 'a helper defined after the for...of that calls it', js(PL, 'for (const p of players) {', '  show(p);', '}', SHOW));
  accept(id, 'an arrow helper handed to forEach', js(PL, 'const show = (p) => console.log(`${p.name} (${p.group}): ${p.score}`);', 'players.forEach(show);'));
  accept(id, 'records built in variables, then listed', js('const player1 = { name: "Marisol", score: 92, group: "A" };', 'const player2 = { name: "Dev", score: 78, group: "B" };', 'const player3 = { name: "Priya", score: 85, group: "A" };',
    'const players = [player1, player2, player3];', 'for (let i = 0; i < players.length; i++) { console.log(players[i].name + " (" + players[i].group + "): " + players[i].score); }'));
  reject(id, 'the helper prints a literal', 'r3', js(PL, 'function show(p) { console.log("player"); }', 'for (const p of players) { show(p); }'));
  reject(id, 'the helper is never called, the loop prints a literal', 'r3', js(PL, SHOW, 'for (const p of players) { const n = p.name; console.log("x"); }'));
  reject(id, 'whole records printed, fields read on their own', 'r2', js(PL, 'for (const p of players) { p.name; console.log(p); }'));
  reject(id, 'a field read bare, the record printed as JSON', 'r2', js(PL, 'for (let i = 0; i < players.length; i++) { players[i].name; console.log(JSON.stringify(players[i])); }'));
  reject(id, 'players.length is the only dot read printed', 'r2', js(PL, 'for (const p of players) { p.name; console.log(players.length, p); }'));
}
{
  // 3.5.25: step 3's first read is one record's field (r3); the loop multiplies price by quantity
  // (r5); no undefined / NaN (t1); for...in is not the keys loop (r7)
  const id = '3-5-25-lab-objects-capstone';
  const ref = solutionFiles(id)['script.js'];
  const CT = 'const cart = [{ name: "A", price: 1.5, quantity: 2, details: { color: "red" } }, { name: "B", price: 3, quantity: 4, "item code": "x" }, { name: "C", price: 5, quantity: 6 }];';
  const READS = ['console.log(cart[0].name);', 'console.log(cart[1]["item code"]);', 'console.log(cart[0].details.color);'];
  const TAIL = ['const { name, price } = cart[0];', 'console.log(name + " costs " + price);', 'for (const key of Object.keys(cart[0])) { console.log(key + ": " + cart[0][key]); }'];
  const LOOP = 'for (const item of cart) { console.log(item.name + ": " + item.price * item.quantity); }';
  if (!ref.includes('console.log(cart[0].name);\n')) throw new Error('3.5.25 anchor missing');
  reject(id, 'step 3\'s dot read dropped, the loop\'s reads remain', 'r3', ref.replace('console.log(cart[0].name);\n', ''));
  accept(id, 'one record held in a variable, its field printed', js(CT, 'const pen = cart[0];', 'console.log(pen.name);', ...READS.slice(1), LOOP, ...TAIL));
  accept(id, 'the last record by number', js(CT, 'console.log(cart[2].price);', ...READS.slice(1), LOOP, ...TAIL));
  reject(id, 'price times name in the loop, the costs typed', 'r5', js(CT, ...READS, 'for (const item of cart) { console.log(item.price * item.name); }', 'console.log("A: 3"); console.log("B: 12"); console.log("C: 30");', ...TAIL));
  reject(id, 'quantity times quantity in the loop', 'r5', js(CT, ...READS, 'for (const item of cart) { console.log(item.name, item.quantity * item.quantity, item.price); }', 'console.log(3, 12, 30);', ...TAIL));
  reject(id, 'the nested read misspelled prints undefined', 't2', js(CT, 'console.log(cart[0].name);', 'console.log(cart[1]["item code"]);', 'console.log(cart[0].details.colour);', LOOP, ...TAIL));
  reject(id, 'name times name prints NaN', 't2', js(CT, ...READS, 'for (const item of cart) { console.log(item.name * item.name, item.price * item.quantity); }', ...TAIL));
  reject(id, 'for...in walks the keys', 'r7', js(CT, ...READS, LOOP, 'const { name, price } = cart[0];', 'console.log(name + " costs " + price);', 'for (const key in cart[0]) { console.log(key + ": " + cart[0][key]); }'));
}

// ---- batch 10: module 3.5 fourth pass (2026-10-15). Execution evidence: a `tests` requirement
// with "trace" sees which console.log calls RAN and, with "perturb", whether what they printed
// changes when the named data does (lib/test-harness-source.ts, EXECUTION TRACE). Each lab's t1
// is now about the data only and t2 about the prints, so a print that is undefined or never runs
// no longer turns the data card red. A function counts as called only where the call is reached.
// rejectNot: `req` fails and `notReq` (the data card) stays green.
const rejectNot = (id, name, req, notReq, script) => cases.push({ id, name, files: { 'script.js': script }, expect: 'fail', req, notReq });
// rejectMsg: `req` fails and what it tells the student matches `msg` (the right reason).
const rejectMsg = (id, name, req, msg, script) => cases.push({ id, name, files: { 'script.js': script }, expect: 'fail', req, msg });
const rejectNotMsg = (id, name, req, notReq, msg, script) => cases.push({ id, name, files: { 'script.js': script }, expect: 'fail', req, notReq, msg });
{
  // 3.5.5 (1a) a parenthesised mention of the function is not a call; (1b) prints that never run, or
  // print typed text, fail t2; (2) r3 is tied to book and reads quoted keys
  const id = '3-5-5-lab-read-update-fields';
  const B = 'const book = { title: "T", pages: 9 };';
  const TAIL = ['book.pages = 10;', 'book.author = "A";', 'console.log(book);'];
  const SHOW = 'function show() { console.log(book.title); }';
  reject(id, 'the print sits in a function only named in typeof (show)', 'r2', js(B, SHOW, 'console.log(typeof (show));', ...TAIL));
  reject(id, 'the print sits in a function only named as a parameter', 'r2', js(B, SHOW, 'function g(show) { return 1; }', 'console.log("T");', ...TAIL));
  reject(id, 'the function calls itself and nobody else calls it', 'r2', js(B, 'function show() { console.log(book.title); show(); }', 'console.log("T");', ...TAIL));
  reject(id, 'the only call sits inside another function nobody calls', 'r2', js(B, SHOW, 'function g() { show(); }', 'console.log("T");', ...TAIL));
  reject(id, 'a method definition show() { } is not a call', 'r2', js(B, SHOW, 'const o = { show() { return 1; } };', 'console.log("T");', ...TAIL));
  accept(id, 'the function handed to forEach', js(B, 'const show = () => console.log(book.title);', '[1].forEach(show);', ...TAIL));
  accept(id, 'the function called from a loop', js(B, SHOW, 'for (let i = 0; i < 1; i++) { show(); }', ...TAIL));
  for (const [name, line] of [
    ['behind if (false)', 'if (false) { console.log(book.title); }'],
    ['behind 0 ?', '0 ? console.log(book.title) : 0;'],
    ['in a forEach over []', '[].forEach(() => console.log(book.title));'],
    ['in a for...of over []', 'for (const x of []) { console.log(book.title); }'],
    ['in while (0)', 'while (0) { console.log(book.title); }'],
    ['in a function expression nobody invokes', '(function () { console.log(book.title); });'],
    ['behind true ||', 'true || console.log(book.title);'],
    ['in a recursive function called with 0', 'function r(n) { if (n > 0) { console.log(book.title); r(n - 1); } }\nr(0);'],
  ]) reject(id, 'the field print never runs: ' + name + ', the value typed', 't2', js(B, line, 'console.log("T");', ...TAIL));
  reject(id, 'the read is thrown away, the value typed beside it', 't2', js(B, 'console.log(book.title.slice(0, 0) + "T");', ...TAIL));
  reject(id, 'a store that never runs, the variable holds typed text', 't2', js(B, 'let t = "T";', 'if (false) { t = book.title; }', 'console.log(t);', ...TAIL));
  reject(id, 'the whole object is typed, not printed', 't2', js(B, 'console.log(book.title);', 'book.pages = 10;', 'book.author = "A";', 'console.log("{ title: T, pages: 10, author: A }");'));
  accept(id, 'quoted keys in the literal', js('const book = {"title":"T","pages":9};', 'console.log(book.title);', ...TAIL));
  accept(id, 'single-quoted keys, the read stored first', js("let book = { 'title': 'T', 'pages': 9 };", 'const t = book.title;', 'console.log(t);', "book.pages = 10;", "book.author = 'A';", 'console.log(book);'));
  accept(id, 'the changed field printed after the change', js(B, 'book.pages = 10;', 'console.log(book.pages);', 'book.author = "A";', 'console.log(book);'));
  reject(id, 'quoted keys, the same field changed twice', 'r3', js('const book = {"title":"T","pages":9,"author":"A"};', 'console.log(book.title);', 'book.pages = 2;', 'book.pages = 3;', 'console.log(book);'));
  reject(id, 'quoted keys, two fields the literal had changed: nothing added', 't1', js('const book = {"title":"T","pages":9,"author":"A"};', 'console.log(book.title);', 'book.pages = 2;', 'book.title = "u";', 'console.log(book);'));
  reject(id, 'the change and the add are made on another object', 'r3', js('const book = { title: "T", pages: 9, author: "A" };', 'const x = { a: 1 };', 'console.log(book.title);', 'x.a = 2;', 'x.b = 3;', 'console.log(book);'));
}
{
  // 3.5.8: r2 is laptop's spaced key, r4 reads laptop; t2 runs the reads; t1 stays green on a misspelled key
  const id = '3-5-8-lab-dot-vs-bracket';
  const LA = 'const laptop = { brand: "F", ram: 16, "screen size": 13 };';
  const LOOP = 'for (const key of Object.keys(laptop)) { console.log(key + ": " + laptop[key]); }';
  reject(id, 'a spaced key read off another object', 'r2', js(LA, 'const x = { "a b": 1 };', 'console.log(x["a b"]);', 'const k = "ram";', 'console.log(laptop[k]);', LOOP));
  reject(id, 'an unspaced quoted key in brackets', 'r2', js(LA, 'console.log(laptop["ram"]);', 'const k = "brand";', 'console.log(laptop[k]);', LOOP));
  reject(id, 'the key variable used on another object', 'r4', js(LA, 'console.log(laptop["screen size"]);', 'const other = { ram: 1 };', 'const k = "ram";', 'console.log(other[k]);', LOOP));
  accept(id, 'single-quoted spaced key', js("const laptop = { brand: 'F', ram: 16, 'screen size': 13 };", "console.log(laptop['screen size']);", "const k = 'ram';", 'console.log(laptop[k]);', LOOP));
  reject(id, 'the spaced-key print sits behind if (false), the value typed', 't2', js(LA, 'if (false) { console.log(laptop["screen size"]); }', 'console.log(13);', 'const k = "ram";', 'console.log(laptop[k]);', LOOP));
  reject(id, 'the key-variable print never runs, the value typed', 't2', js(LA, 'console.log(laptop["screen size"]);', 'const k = "ram";', 'false && console.log(laptop[k]);', 'console.log(16);', LOOP));
  reject(id, 'the keys loop never runs, the values joined in one line', 't2', js(LA, 'console.log(laptop["screen size"]);', 'const k = "ram";', 'console.log(laptop[k]);', 'if (false) { ' + LOOP + ' }', 'console.log(Object.entries(laptop).join(" "));'));
  rejectNot(id, 'a misspelled key: the data card stays green', 't2', 't1', js(LA, 'console.log(laptop["screen size"]);', 'const k = "rom";', 'console.log(laptop[k]);', LOOP));
}
{
  // 3.5.12: numeric loop bounds and while (item 5), a helper called from the loop; t2 runs the reads
  const id = '3-5-12-lab-nested-structure';
  const O = 'const order = { customer: { name: "Ana" }, items: [{ name: "Pen", price: 2 }, { name: "Ink", price: 3 }] };';
  const CUST = 'console.log(order.customer.name);';
  accept(id, 'numeric bound i < 2', js(O, CUST, 'for (let i = 0; i < 2; i++) { console.log(order.items[i].name, order.items[i].price); }'));
  accept(id, 'numeric bound i <= 1', js(O, CUST, 'for (let i = 0; i <= 1; i++) { console.log(order.items[i].name + " " + order.items[i].price); }'));
  accept(id, 'while with a numeric bound', js(O, CUST, 'let i = 0;', 'while (i < 2) { console.log(order.items[i].name, order.items[i].price); i++; }'));
  accept(id, 'a helper show(item) called from the loop', js(O, CUST, 'function show(item) { console.log(item.name + ": " + item.price); }', 'for (const item of order.items) { show(item); }'));
  accept(id, 'a helper with a brace-pattern parameter handed to forEach', js(O, CUST, 'const show = ({ name, price }) => console.log(name, price);', 'order.items.forEach(show);'));
  reject(id, 'a literal-body loop for (;0;), the items typed', 'r5', js(O, CUST, 'for (;0;) { console.log(order.items[0].name); }', 'console.log("Pen 2");', 'console.log("Ink 3");'));
  reject(id, 'a numeric loop that never runs (i < 0)', 'r5', js(O, CUST, 'for (let i = 0; i < 0; i++) { console.log(order.items[i].name, order.items[i].price); }', 'console.log("Pen 2");', 'console.log("Ink 3");'));
  reject(id, 'a numeric loop that prints the customer each time, the items typed', 't2', js(O, CUST, 'for (let i = 0; i < 2; i++) { console.log(order.customer.name); }', 'console.log("Pen 2");', 'console.log("Ink 3");'));
  reject(id, 'the customer print sits behind if (false), the name typed', 't2', js(O, 'if (false) { console.log(order.customer.name); }', 'console.log("Ana");', 'for (const item of order.items) { console.log(item.name, item.price); }'));
  rejectNot(id, 'a field that is not a key prints undefined: the data card stays green', 't2', 't1', js(O, CUST, 'for (const item of order.items) { console.log(item.name, item.cost); }'));
}
{
  // 3.5.15 (1a, 1b, item 5): the method's own result, printed by code that runs
  const id = '3-5-15-lab-add-method';
  const S = 'const student = { name: "Ana", greet: function () { return "Hi " + student.name; } };';
  const LATER = 'function later() { console.log(student.greet()); }';
  reject(id, 'the print sits in a function only named in typeof (later)', 'r2', js(S, LATER, 'console.log(typeof (later));'));
  reject(id, 'the print sits in a function that only calls itself', 'r2', js(S, 'function later() { console.log(student.greet()); later(); }', 'console.log("Hi Ana");'));
  reject(id, 'the only call sits inside another function nobody calls', 'r2', js(S, LATER, 'function g() { later(); }', 'console.log("Hi Ana");'));
  for (const [name, line] of [
    ['behind if (false)', 'if (false) { console.log(student.greet()); }'],
    ['behind 0 ?', '0 ? console.log(student.greet()) : 0;'],
    ['in a forEach over []', '[].forEach(() => console.log(student.greet()));'],
    ['in a function expression nobody invokes', '(function () { console.log(student.greet()); });'],
    ['behind true ||', 'true || console.log(student.greet());'],
  ]) reject(id, 'the call print never runs: ' + name + ', the text typed', 't2', js(S, line, 'console.log("Hi Ana");'));
  reject(id, 'the comma operator throws the result away', 't2', js(S, 'console.log((student.greet(), "Hi Ana"));'));
  reject(id, 'a dead ternary prints typed text', 't2', js(S, 'console.log(0 ? student.greet() : "Hi Ana");'));
  reject(id, 'student["toString"]() printed', 't2', js(S, 'console.log(student["toString"]());'));
  reject(id, 'the result cut to nothing, typed text added', 't2', js(S, 'console.log(student.greet().slice(0, 0) + "Hi Ana");'));
  accept(id, 'student held in another variable', js(S, 'const s2 = student;', 'console.log(s2.greet());'));
  accept(id, 'the method held in a variable, then called', js(S, 'const g = student.greet;', 'console.log(g());'));
  rejectNot(id, 'an arrow reading this: the data card stays green', 't2', 't1', js('const student = { name: "Ana", greet: () => "Hi " + this.name };', 'console.log(student.greet());'));
}
{
  // 3.5.18 (1a, 1b, item 7, item 8)
  const id = '3-5-18-lab-params-to-object';
  const D = 'function describeBox(options) { return options.color + " " + options.width + "x" + options.height; }';
  const CALL = 'console.log(describeBox({ width: 2, height: 3, color: "red" }));';
  reject(id, 'the print sits in a function only named in typeof (go)', 'r3', js(D, 'function go() { ' + CALL + ' }', 'console.log(typeof (go));'));
  reject(id, 'the print sits in a function that only calls itself', 'r3', js(D, 'function go() { ' + CALL + ' go(); }', 'console.log("red 2x3");'));
  reject(id, 'the comma operator throws the result away', 't2', js(D, 'console.log((describeBox({ width: 2, height: 3, color: "red" }), "red 2x3"));'));
  reject(id, 'a dead ternary prints typed text', 't2', js(D, 'console.log(0 ? describeBox({ width: 2, height: 3, color: "red" }) : "red 2x3");'));
  reject(id, 'the call print sits in a forEach over []', 't2', js(D, '[].forEach(() => ' + CALL.slice(0, -1) + ');', 'console.log("red 2x3");'));
  // Pass 5 (item C) reversed these two: a printed undefined now turns the function card red
  // too, naming the key (batch 11 below).
  rejectMsg(id, 'a missing key prints undefined: the function card names it', 't1', /called without color/, js(D, 'console.log(describeBox({ width: 10, height: 4 }));'));
  rejectMsg(id, 'a misspelled key (colour) prints undefined: the function card names it', 't1', /called without color \(the object you passed has colour instead\)/, js(D, 'console.log(describeBox({ width: 10, height: 4, colour: "red" }));'));
  rejectNot(id, 'the call is never printed: the function card stays green', 't2', 't1', js(D, 'describeBox({ width: 2, height: 3, color: "red" });', 'console.log("done");'));
  reject(id, 'three stray reads beside JSON.stringify(options)', 't1', js('function describeBox(o) { o.width; o.height; o.color; return JSON.stringify(o); }', CALL));
}
{
  // 3.5.22 (1a, 1b, item 8)
  const id = '3-5-22-lab-destructure-three';
  const I = ['const item = { title: "Pen", cost: 2, quantity: 10 };', 'const { title, cost, quantity } = item;'];
  const D = 'function describe({ title, quantity }) { return title + " x" + quantity; }';
  reject(id, 'the sentence print sits in a function only named in typeof (say)', 'r3', js(...I, 'function say() { console.log(title + " " + cost + " " + quantity); }', 'console.log(typeof (say));', D));
  reject(id, 'unpacked from a literal written in place', 'r1', js('const { title, cost, quantity } = { title: "Pen", cost: 2, quantity: 10 };', 'console.log(title + " " + cost + " " + quantity);', D));
  reject(id, 'typeof of each name printed', 'r3', js(...I, 'console.log(typeof title, typeof cost, typeof quantity);', D));
  reject(id, 'the sentence print sits behind if (false), the text typed', 't2', js(...I, 'if (false) { console.log(title + cost + quantity); }', 'console.log("Pen 2 10");', D));
  reject(id, 'a store that never runs, the sentence typed', 't2', js(...I, 'let s = "Pen costs 2, 10 left";', 'if (false) { s = title + " costs " + cost + ", " + quantity + " left"; }', 'console.log(s);', D));
}
{
  // 3.5.24 (item 5, item 8, item 7)
  const id = '3-5-24-lab-parallel-arrays-refactor';
  const PL = 'const players = [{ name: "Marisol", score: 92, group: "A" }, { name: "Dev", score: 78, group: "B" }, { name: "Priya", score: 85, group: "A" }];';
  const PRINT = 'console.log(p.name + " (" + p.group + "): " + p.score);';
  accept(id, 'a helper that returns the line, printed from the loop', js(PL, 'function line(p) { return p.name + " (" + p.group + "): " + p.score; }', 'for (const p of players) { console.log(line(p)); }'));
  accept(id, 'helper of a helper', js(PL, 'function line(p) { return p.name + " (" + p.group + "): " + p.score; }', 'function show(p) { console.log(line(p)); }', 'for (let i = 0; i < players.length; i++) { show(players[i]); }'));
  accept(id, 'an arrow line helper inside forEach', js(PL, 'const line = (p) => `${p.name} (${p.group}): ${p.score}`;', 'players.forEach((p) => console.log(line(p)));'));
  accept(id, 'a helper with a brace-pattern parameter', js(PL, 'function show({ name, group, score }) { console.log(name + " (" + group + "): " + score); }', 'for (const p of players) { show(p); }'));
  accept(id, 'numeric bound i < 3', js(PL, 'for (let i = 0; i < 3; i++) { console.log(players[i].name + " (" + players[i].group + "): " + players[i].score); }'));
  accept(id, 'numeric bound i <= 2', js(PL, 'for (let i = 0; i <= 2; i++) { console.log(players[i].name, players[i].group, players[i].score); }'));
  accept(id, 'while with a numeric bound', js(PL, 'let i = 0;', 'while (i < 3) { console.log(players[i].name, players[i].group, players[i].score); i++; }'));
  const LOOP = 'for (const p of players) { ' + PRINT + ' }';
  for (const [name, line] of [
    ['an array of Number("...") calls', 'const scores = [Number("92"), Number("78"), Number("85")];'],
    ['a list made with split', 'const names = "Marisol,Dev,Priya".split(",");'],
    ['declared first, assigned a list later', 'let names;\nnames = ["Marisol", "Dev", "Priya"];'],
    ['a new Set', 'const groups = new Set(["A", "B", "A"]);'],
    ['Array.of', 'const names = Array.of("Marisol", "Dev", "Priya");'],
  ]) reject(id, 'a parallel list kept as ' + name, 'r5', js(PL, line, LOOP));
  reject(id, 'the loop sits behind if (false), the lines typed', 't2', js(PL, 'if (false) { ' + LOOP + ' }', 'console.log("Marisol (A): 92");', 'console.log("Dev (B): 78");', 'console.log("Priya (A): 85");'));
  rejectNot(id, 'a field that is not a key prints undefined: the data card stays green', 't2', 't1', js(PL, 'for (const p of players) { console.log(p.name + " (" + p.team + "): " + p.score); }'));
}
{
  // 3.5.25 (item 3, item 5, item 8, item 7, 1b)
  const id = '3-5-25-lab-objects-capstone';
  const CT = 'const cart = [{ name: "A", price: 1.5, quantity: 2, details: { color: "red" } }, { name: "B", price: 3, quantity: 4, "item code": "x" }, { name: "C", price: 5, quantity: 6 }];';
  const READS = ['console.log(cart[0].name);', 'console.log(cart[1]["item code"]);', 'console.log(cart[0].details.color);'];
  const LOOP = 'for (const item of cart) { console.log(item.name + ": " + item.price * item.quantity); }';
  const NAMES = ['const { name, price } = cart[0];', 'console.log(name + " costs " + price);'];
  const KEYS = 'for (const key of Object.keys(cart[0])) { console.log(key + ": " + cart[0][key]); }';
  accept(id, 'a cost helper called from the loop', js(CT, ...READS, 'function cost(r) { return r.price * r.quantity; }', 'for (const item of cart) { console.log(item.name, cost(item)); }', ...NAMES, KEYS));
  accept(id, 'an arrow cost helper inside forEach', js(CT, ...READS, 'const cost = (r) => r.price * r.quantity;', 'cart.forEach((item) => console.log(item.name + " " + cost(item)));', ...NAMES, KEYS));
  accept(id, 'price and quantity read into variables first', js(CT, ...READS, 'for (let i = 0; i < cart.length; i++) {', '  const p = cart[i].price;', '  const q = cart[i].quantity;', '  console.log(cart[i].name, p * q);', '}', ...NAMES, KEYS));
  accept(id, 'the fields unpacked in the loop header', js(CT, ...READS, 'for (const { name, price, quantity } of cart) { console.log(name, price * quantity); }', ...NAMES, KEYS));
  accept(id, 'numeric bound i < 3', js(CT, ...READS, 'for (let i = 0; i < 3; i++) { console.log(cart[i].name, cart[i].price * cart[i].quantity); }', ...NAMES, KEYS));
  accept(id, 'a while loop', js(CT, ...READS, 'let i = 0;', 'while (i < cart.length) { console.log(cart[i].name, cart[i].price * cart[i].quantity); i++; }', ...NAMES, KEYS));
  accept(id, 'the keys of a record held in a variable', js(CT, ...READS, LOOP, ...NAMES, 'const record = cart[1];', 'for (const key of Object.keys(record)) { console.log(key + ": " + record[key]); }'));
  reject(id, 'Object.keys(cart) walks the indexes, not a record', 'r7', js(CT, ...READS, LOOP, ...NAMES, 'for (const key of Object.keys(cart)) { console.log(key + ": " + cart[key]); }'));
  reject(id, 'a chain that ends in .length', 'r9', js(CT, READS[0], READS[1], 'console.log(cart[0].name.length);', LOOP, ...NAMES, KEYS));
  reject(id, 'an unspaced quoted key in brackets', 'r4', js(CT, READS[0], 'console.log(cart[1]["name"]);', READS[2], LOOP, ...NAMES, KEYS));
  reject(id, 'names unpacked from a literal written in place', 'r6', js(CT, ...READS, LOOP, 'const { name, price } = { name: "A", price: 1.5 };', 'console.log(name + " costs " + price);', KEYS));
  reject(id, 'typeof of the unpacked names printed', 'r6', js(CT, ...READS, LOOP, 'const { name, price } = cart[0];', 'console.log(typeof name, typeof price);', KEYS));
  reject(id, 'the step-3 field print sits behind if (false), the value typed', 't2', js(CT, 'if (false) { console.log(cart[0].name); }', 'console.log("A");', READS[1], READS[2], LOOP, ...NAMES, KEYS));
  reject(id, 'the chain print sits in a function nobody calls, the value typed', 't2', js(CT, READS[0], READS[1], 'function c() { console.log(cart[0].details.color); }', 'console.log("red");', LOOP, ...NAMES, KEYS));
  reject(id, 'the cost loop sits behind false &&, the costs typed', 't2', js(CT, ...READS, 'false && cart.forEach((item) => console.log(item.name + ": " + item.price * item.quantity));', 'console.log("A: 3"); console.log("B: 12"); console.log("C: 30");', ...NAMES, KEYS));
  rejectNot(id, 'a misspelled nested key prints undefined: the data card stays green', 't2', 't1', js(CT, READS[0], READS[1], 'console.log(cart[0].details.colour);', LOOP, ...NAMES, KEYS));
}

// ---- batch 11: module 3.5 fifth pass (2026-10-15). The changed run's markers are random per Run
// (no "~" to guess), a changed run that crashed or printed nothing is no evidence, a number counts
// only when the two changed runs agree (Math.random and the clock do not), flags left on globals are
// wiped between runs, a method's result is marked apart from data and recorded (numbers and
// true/false too), each destructured key gets its own marker, a regex card passes when its `orTest`
// passed on the same code (a helper, an alias, a stored result), and a run that throws after printing
// still shows the print cards it met.
{
  // 3.5.5 (A1 crash or skip in the changed run, A2 random/flag/guess/stash, A5 whole object, A6 console.log
  // replaced, B3 print through an alias, B10 bracket assignment)
  const id = '3-5-5-lab-read-update-fields';
  const B = 'const book = { title: "Dune", pages: 412 };';
  const TAIL = ['book.pages = 480;', 'book.author = "H";', 'console.log(book);'];
  reject(id, 'A1: the changed run crashes on purpose, the read thrown away', 't2', js(B, 'if (book.title[0] === "~") { throw 1; }', 'console.log(book.title.length * 0);', ...TAIL));
  reject(id, 'A1: the field print is skipped in the changed run', 't2', js(B, 'if (book.title[0] !== "~") { console.log(book.title.length * 0); }', ...TAIL));
  reject(id, 'A1: the whole-object print is skipped in the changed run', 't2', js(B, 'console.log(book.title);', 'book.pages = 480;', 'book.author = "H";', 'if (book.title[0] !== "~") { console.log(book); }', 'console.log("{ title: Dune }");'));
  reject(id, 'A2: Math.random beside a thrown-away read', 't2', js(B, 'console.log(book.title.length * 0, Math.random());', ...TAIL));
  reject(id, 'A2: Date.now beside a thrown-away read', 't2', js(B, 'console.log(book.title.length * 0 + Date.now());', ...TAIL));
  reject(id, 'A2: a number flag left on globalThis', 't2', js(B, 'const s = globalThis.__r ? 1243 : 412;', 'globalThis.__r = true;', 'console.log(book.pages * 0 + s);', ...TAIL));
  reject(id, 'A2: a counter stashed on Math', 't2', js(B, 'Math.__n = (Math.__n || 0) + 1;', 'console.log(book.title.length * 0 + Math.__n);', ...TAIL));
  reject(id, 'A2: a counter in localStorage', 't2', js(B, 'const n = Number(localStorage.getItem("n") || 0) + 1;', 'localStorage.setItem("n", n);', 'console.log(book.title.length * 0 + n);', ...TAIL));
  reject(id, 'A2: the "~" marker guessed', 't2', js(B, 'console.log(book.title[0] === "~" ? "~Dune~" : "Dune");', ...TAIL));
  rejectMsg(id, 'A5: the "whole object" print is a wrapper holding one field', 't2', /prints an object, but not book itself/, js(B, 'console.log(book.title);', 'book.pages = 480;', 'book.author = "H";', 'console.log({ t: book.title });'));
  accept(id, 'A5: the whole object as JSON.stringify(book)', js(B, 'console.log(book.title);', 'book.pages = 480;', 'book.author = "H";', 'console.log(JSON.stringify(book));'));
  accept(id, 'A5: the whole object with a label', js(B, 'console.log(book.title);', 'book.pages = 480;', 'book.author = "H";', 'console.log("Book:", book);'));
  reject(id, 'A6: console.log replaced by one that prints nothing', 't2', js(B, 'const t = book.title;', 'console.log = function () {};', 'console.log(t);', ...TAIL));
  accept(id, 'A6: console.log wrapped by one that still prints', js(B, 'const old = console.log;', 'console.log = (...a) => old(">", ...a);', 'console.log(book.title);', ...TAIL));
  accept(id, 'B3: the print sits in a function reached through a variable', js(B, 'function show(b) { console.log(b.title); }', 'const go = show;', 'go(book);', ...TAIL));
  accept(id, 'B3: a number field printed through a parameter', js(B, 'const show = (b) => console.log(b.pages);', 'show(book);', ...TAIL));
  accept(id, 'A2/B1: the title length (a number made from the data)', js(B, 'console.log(book.title.length);', ...TAIL));
  rejectMsg(id, 'B10: the change is made with brackets', 'r3', /with a dot.*Square brackets/i, js(B, 'console.log(book.title);', 'book["pages"] = 500;', 'book.author = "H";', 'console.log(book);'));
}
{
  // 3.5.8 (A2, B5 while / numeric bound / helper / separate prints, B11 Object.entries and for...in)
  const id = '3-5-8-lab-dot-vs-bracket';
  const LA = 'const laptop = { brand: "F", ram: 16, "screen size": 13 };';
  const PRE = [LA, 'console.log(laptop["screen size"]);', 'const k = "ram";', 'console.log(laptop[k]);'];
  accept(id, 'B5: a while loop over Object.keys', js(...PRE, 'const ks = Object.keys(laptop);', 'let i = 0;', 'while (i < ks.length) { console.log(ks[i], laptop[ks[i]]); i++; }'));
  accept(id, 'B5: a hard-coded i < 3 over keys[i]', js(...PRE, 'const keys = Object.keys(laptop);', 'for (let i = 0; i < 3; i++) { console.log(keys[i] + ": " + laptop[keys[i]]); }'));
  accept(id, 'B5: a helper called from the loop reads laptop[key]', js(...PRE, 'function show(key) { console.log(key + ": " + laptop[key]); }', 'for (const key of Object.keys(laptop)) { show(key); }'));
  accept(id, 'B5: key and value on separate prints', js(...PRE, 'for (const key of Object.keys(laptop)) {', '  console.log(key);', '  console.log(laptop[key]);', '}'));
  rejectMsg(id, 'B11: Object.entries walks the pairs', 't2', /use Object\.keys/, js(...PRE, 'for (const [key, value] of Object.entries(laptop)) { console.log(key, value); }'));
  rejectMsg(id, 'B11: for...in walks the keys', 't2', /for\.\.\.in is not part of this course/, js(...PRE, 'for (const key in laptop) { console.log(key, laptop[key]); }'));
  reject(id, 'B11: Object.entries fails the loop card too', 'r3', js(...PRE, 'for (const [key, value] of Object.entries(laptop)) { console.log(key, value); }'));
  reject(id, 'A2: Math.random beside a thrown-away spaced-key read', 't2', js(LA, 'console.log(laptop["screen size"] * 0 + Math.random());', 'const k = "ram";', 'console.log(laptop[k]);', 'for (const key of Object.keys(laptop)) { console.log(key + ": " + laptop[key]); }'));
}
{
  // 3.5.12 (A1, B4 a helper that returns the line)
  const id = '3-5-12-lab-nested-structure';
  const O = 'const order = { customer: { name: "Ana" }, items: [{ name: "Pen", price: 2 }, { name: "Ink", price: 3 }] };';
  const CUST = 'console.log(order.customer.name);';
  const LINE = 'function line(item) { return item.name + ": " + item.price; }';
  accept(id, 'B4: a helper returns the line, printed from a for...of', js(O, CUST, LINE, 'for (const item of order.items) { console.log(line(item)); }'));
  accept(id, 'B4: a helper returns the line, printed from an index loop', js(O, CUST, LINE, 'for (let i = 0; i < order.items.length; i++) { console.log(line(order.items[i])); }'));
  reject(id, 'A1: the changed run crashes on purpose, the items typed', 't2', js(O, 'if (order.customer.name[0] === "~") { throw 1; }', 'console.log("Ana");', 'for (const item of order.items) { item.name; }', 'console.log("Pen 2");', 'console.log("Ink 3");'));
  rejectMsg(id, 'whole items printed: t2 says so', 't2', /as a whole object/, js(O, CUST, 'for (const item of order.items) { console.log(item); }'));
}
{
  // 3.5.15 (A3 typed guillemets, B1 numbers / state / true-false, B2 stored, alias, wrapper)
  const id = '3-5-15-lab-add-method';
  const S = 'const student = { name: "Ana", greet: function () { return "Hi " + student.name; } };';
  reject(id, 'A3: the call is tested, typed guillemets printed', 't2', js(S, 'const r = student.greet();', 'console.log(r ? "«ok»" : "");'));
  reject(id, 'A3: the call and typed guillemets joined with &&', 't2', js(S, 'console.log(student.greet() && "«Hi Ana»");'));
  accept(id, 'B1: a method returns a number made from this', js('const student = { name: "Ana", age: 15, nextAge: function () { return this.age + 1; } };', 'console.log(student.nextAge());'));
  accept(id, 'B1: a method doubles its argument', js('const student = { name: "Ana", double: function (n) { return n * 2; } };', 'console.log(student.double(21));'));
  accept(id, 'B1: a method counts visits', js('const student = { name: "Ana", visits: 0, visit: function () { this.visits++; return this.visits; } };', 'console.log(student.visit());'));
  accept(id, 'B1: a method adds up this.scores', js('const student = { name: "Ana", scores: [3, 4], total: function () { let t = 0; for (const s of this.scores) { t += s; } return t; } };', 'console.log(student.total());'));
  accept(id, 'B1: a true/false that changes with the data', js('const student = { name: "Ana", age: 15, isTeen: function () { return this.age < 20; } };', 'console.log(student.isTeen());'));
  rejectMsg(id, 'B1: a true/false that never changes says why', 't2', /true or false says too little/, js('const student = { name: "Ana", age: 15, isBorn: function () { return this.age > 0; } };', 'console.log(student.isBorn());'));
  accept(id, 'B2: the result joined into a stored sentence', js(S, 'const out = "Said: " + student.greet();', 'console.log(out);'));
  accept(id, 'B2: the print sits in a function reached through an alias', js(S, 'function announce() { console.log(student.greet()); }', 'const run = announce;', 'run();'));
  accept(id, 'B2: the print sits in a function handed a callback', js(S, 'function show(f) { console.log(f()); }', 'show(function () { return student.greet(); });'));
}
{
  // 3.5.18 (A3, B8 a helper that prints, unpacked in the body, brackets; C a key missing or misspelled)
  const id = '3-5-18-lab-params-to-object';
  const D = 'function describeBox(options) { return options.color + " " + options.width + "x" + options.height; }';
  reject(id, 'A3: the call is tested, typed guillemets printed', 't2', js(D, 'const r = describeBox({ width: 2, height: 3, color: "red" });', 'console.log(r ? "«x»" : "");'));
  rejectNot(id, 'B8: a helper that prints and is called bare: the function card stays green', 'r3', 't1', js('function describeBox(options) { console.log(options.color + " " + options.width + "x" + options.height); }', 'describeBox({ width: 2, height: 3, color: "red" });'));
  rejectNot(id, 'B8: the values unpacked in the body: the function card stays green', 'r2', 't1', js('function describeBox(options) { const { width, height, color } = options; return color + " " + width + "x" + height; }', 'console.log(describeBox({ width: 2, height: 3, color: "red" }));'));
  rejectMsg(id, 'B8: bracket reads are refused with the dot named', 't1', /square brackets.*dot reads/, js('function describeBox(options) { return options["color"] + " " + options["width"] + "x" + options["height"]; }', 'console.log(describeBox({ width: 2, height: 3, color: "red" }));'));
  rejectMsg(id, 'C: height misspelled at the call (hieght), "red 10xundefined"', 't1', /called without height \(the object you passed has hieght instead\)/, js(D, 'console.log(describeBox({ width: 10, hieght: 4, color: "red" }));'));
  rejectMsg(id, 'C: height left out of the call', 't1', /called without height/, js(D, 'console.log(describeBox({ width: 10, color: "red" }));'));
  rejectMsg(id, 'C: height misspelled where describeBox reads it', 't1', /reads options\.heigth, but the key is height/, js('function describeBox(options) { return options.color + " " + options.width + "x" + options.heigth; }', 'console.log(describeBox({ width: 10, height: 4, color: "red" }));'));
  rejectMsg(id, 'C: a NaN from a misspelled key', 't1', /printed NaN: describeBox was called without height/, js('function describeBox(options) { return options.color + " area " + options.width * options.height; }', 'console.log(describeBox({ width: 10, hieght: 4, color: "red" }));'));
}
{
  // 3.5.22 (A4 names mentioned without contributing, B7 assigned later / frozen)
  const id = '3-5-22-lab-destructure-three';
  const I = ['const item = { title: "Pen", cost: 2, quantity: 10 };', 'const { title, cost, quantity } = item;'];
  const D = 'function describe({ title, quantity }) { return title + " x" + quantity; }';
  rejectMsg(id, 'A4: the names thrown away by a comma, the dot reads printed', 't2', /value of title that you unpacked/, js(...I, 'console.log(item.title + " " + item.cost + (title, cost, quantity, ""));', D));
  reject(id, 'A4: the names times zero beside the dot reads', 't2', js(...I, 'console.log(item.title + " " + item.cost + " " + item.quantity + (title.length * 0 + cost * 0 + quantity * 0));', D));
  reject(id, 'A4: the names beside Math.random', 't2', js(...I, 'console.log(item.title, Math.random() + title.length * 0 + cost * 0 + quantity * 0);', D));
  accept(id, 'B7: declared first, the literal assigned later', js('let item;', 'item = { title: "Pen", cost: 2, quantity: 10 };', 'const { title, cost, quantity } = item;', 'console.log(title + " costs " + cost + ", " + quantity + " left");', D));
  accept(id, 'B7: the literal frozen as it is assigned', js('const item = Object.freeze({ title: "Pen", cost: 2, quantity: 10 });', 'const { title, cost, quantity } = item;', 'console.log(title + " costs " + cost + ", " + quantity + " left");', D));
  accept(id, 'the sentence printed through a helper', js(...I, 'function say(s) { console.log(s); }', 'say(title + " costs " + cost + ", " + quantity + " left");', D));
  // r1 rewritten to scan in linear time (it hung on a brace that never closes): same answers
  accept(id, 'r1: a default value and a renamed name in the pattern', js(I[0], 'const { title: t, cost = 0, quantity } = item;', 'console.log(t + " costs " + cost + ", " + quantity + " left");', D));
  reject(id, 'r1: only two names unpacked', 'r1', js(I[0], 'const { title, cost } = item;', 'console.log(title + " costs " + cost + ", " + item.quantity + " left");', D));
}
{
  // 3.5.24 (A1, B4 a stored helper line, B9 a crash after the loop)
  const id = '3-5-24-lab-parallel-arrays-refactor';
  const PL = 'const players = [{ name: "Marisol", score: 92, group: "A" }, { name: "Dev", score: 78, group: "B" }, { name: "Priya", score: 85, group: "A" }];';
  const LINE = 'function line(p) { return p.name + " (" + p.group + "): " + p.score; }';
  accept(id, 'B4: a helper line stored, then printed', js(PL, LINE, 'for (const p of players) { const s = line(p); console.log(s); }'));
  reject(id, 'A1: the changed run crashes on purpose, the lines typed', 't2', js(PL, 'if (players[0].name[0] === "~") { throw 1; }', 'for (const p of players) { p.name; }', 'console.log("Marisol (A): 92");', 'console.log("Dev (B): 78");', 'console.log("Priya (A): 85");'));
  rejectNotMsg(id, 'B9: a crash after the loop: the print card stays green, the data card says why', 't1', 't2', /stopped with an error/, js(PL, 'for (const p of players) { console.log(p.name + " (" + p.group + "): " + p.score); }', 'console.log(players[5].name);'));
  rejectMsg(id, 'B9: a crash before the loop prints anything', 't2', /stopped with an error/, js(PL, 'console.log(players[5].name);', 'for (const p of players) { console.log(p.name + " (" + p.group + "): " + p.score); }'));
}
{
  // 3.5.25 (A4, B5 separate key and value prints, B6 a cost helper that prints)
  const id = '3-5-25-lab-objects-capstone';
  const CT = 'const cart = [{ name: "A", price: 1.5, quantity: 2, details: { color: "red" } }, { name: "B", price: 3, quantity: 4, "item code": "x" }, { name: "C", price: 5, quantity: 6 }];';
  const READS = ['console.log(cart[0].name);', 'console.log(cart[1]["item code"]);', 'console.log(cart[0].details.color);'];
  const LOOP = 'for (const item of cart) { console.log(item.name + ": " + item.price * item.quantity); }';
  const NAMES = ['const { name, price } = cart[0];', 'console.log(name + " costs " + price);'];
  const KEYS = 'for (const key of Object.keys(cart[0])) { console.log(key + ": " + cart[0][key]); }';
  accept(id, 'B6: a cost helper that prints, called from the loop', js(CT, ...READS, 'function show(r) { console.log(r.name + ": " + r.price * r.quantity); }', 'for (const item of cart) { show(item); }', ...NAMES, KEYS));
  accept(id, 'B5: key and value on separate prints', js(CT, ...READS, LOOP, ...NAMES, 'for (const key of Object.keys(cart[0])) {', '  console.log(key);', '  console.log(cart[0][key]);', '}'));
  reject(id, 'A4: the names thrown away by a comma', 't2', js(CT, ...READS, LOOP, 'const { name, price } = cart[0];', 'console.log(cart[0].name + " costs " + cart[0].price + (name, price, ""));', KEYS));
  reject(id, 'A4: the names beside Math.random', 't2', js(CT, ...READS, LOOP, 'const { name, price } = cart[0];', 'console.log(cart[0].name, Math.random() + name.length * 0 + price * 0);', KEYS));
}

// ---- batch 12: module 3.5 sixth pass (2026-10-15). What the student SEES must be what the data
// printed: the real run's line must match the changed run's line at the same call (markers taken
// out, numbers read as '#'), or differ only in words while every marked value is in it too (a label
// the changed numbers flipped). Typed text in the real run behind a test of the data no longer passes.
{
  const B = 'const book = { title: "Dune", pages: 412 };';
  const TAIL = ['book.pages = 480;', 'book.author = "H";', 'console.log(book);'];
  const id5 = '3-5-5-lab-read-update-fields';
  reject(id5, 'echo: TYPED behind a test of the title', 't2', js(B, 'const live = book.title !== "Dune";', 'console.log(live ? book.title : "TY" + "PED");', ...TAIL));
  reject(id5, 'echo: TYPED behind a performance.mark count', 't2', js(B, 'performance.mark("zq");', 'const live = performance.getEntriesByName("zq").length > 1;', 'console.log(live ? book.title : "TY" + "PED");', ...TAIL));
  reject(id5, 'echo: TYPED behind Error.stackTraceLimit', 't2', js(B, 'Error.stackTraceLimit = Error.stackTraceLimit === 10 ? 11 : Error.stackTraceLimit + 1;', 'const live = Error.stackTraceLimit > 11;', 'console.log(live ? book.title : "TY" + "PED");', ...TAIL));
  accept(id5, 'echo: a label the changed numbers flip, beside the title', js(B, 'console.log(book.title + " is " + (book.pages > 500 ? "long" : "short"));', ...TAIL));
  accept(id5, 'echo: the title upper-cased', js(B, 'console.log(book.title.toUpperCase());', ...TAIL));
  accept(id5, 'echo: pages with a thousands comma', js(B, 'console.log("Pages: " + book.pages.toLocaleString("en-US"));', ...TAIL));

  const id8 = '3-5-8-lab-dot-vs-bracket';
  const LA = 'const laptop = { brand: "F", ram: 16, "screen size": 13 };';
  reject(id8, 'echo: TYPED behind a test of a value', 't2', js(LA, 'const k = "ram";', 'const live = laptop["screen size"] !== 13;', 'console.log(live ? laptop["screen size"] : "TY" + "PED");', 'console.log(live ? laptop[k] : "TY" + "PED");', 'for (const key of Object.keys(laptop)) { console.log(key + ": " + (live ? laptop[key] : "TY" + "PED")); }'));

  const id12 = '3-5-12-lab-nested-structure';
  const O = 'const order = { customer: { name: "Ana" }, items: [{ name: "Pen", price: 2 }, { name: "Ink", price: 30 }] };';
  reject(id12, 'echo: typed lines behind a test of the name', 't2', js(O, 'const live = order.customer.name !== "Ana";', 'console.log(live ? order.customer.name : "TY" + "PED");', 'for (const item of order.items) { console.log(live ? item.name + ": " + item.price : "TY" + "PED"); }'));
  reject(id12, 'echo: only the item lines typed', 't2', js(O, 'const live = order.customer.name !== "Ana";', 'console.log(order.customer.name);', 'for (const item of order.items) { console.log(live ? item.name + ": " + item.price : "TY" + "PED"); }'));
  accept(id12, 'echo: a cheap tag the changed prices flip', js(O, 'console.log(order.customer.name);', 'for (const item of order.items) { console.log(item.name + ": " + item.price + (item.price < 10 ? " cheap" : "")); }'));

  const id22 = '3-5-22-lab-destructure-three';
  const D = 'function describe({ title, quantity }) { return title + " x" + quantity; }';
  reject(id22, 'echo: TYPED behind a test of an unpacked name', 't2', js('const item = { title: "Pen", cost: 2, quantity: 10 };', 'const { title, cost, quantity } = item;', 'const live = title !== "Pen";', 'console.log(live ? title + " costs " + cost + ", " + quantity + " left" : "TY" + "PED");', D));
  accept(id22, 'echo: a stock label the changed numbers flip', js('const item = { title: "Pen", cost: 2, quantity: 10 };', 'const { title, cost, quantity } = item;', 'console.log(title + " costs " + cost + ", " + quantity + (quantity > 50 ? " plenty" : " low"));', D));

  const id24 = '3-5-24-lab-parallel-arrays-refactor';
  const PL = 'const players = [{ name: "Marisol", score: 92, group: "A" }, { name: "Dev", score: 78, group: "B" }, { name: "Priya", score: 85, group: "A" }];';
  reject(id24, 'echo: typed lines behind a test of a name', 't2', js(PL, 'const live = players[0].name !== "Marisol";', 'for (const p of players) { console.log(live ? p.name + " (" + p.group + "): " + p.score : "TY" + "PED"); }'));
  accept(id24, 'echo: passed / needs work, flipped by the changed scores', js(PL, 'for (const p of players) { console.log(p.name + " (" + p.group + "): " + p.score + (p.score >= 80 ? " passed" : " needs work")); }'));

  const id25 = '3-5-25-lab-objects-capstone';
  const CT = 'const cart = [{ name: "A", price: 1.5, quantity: 2, details: { color: "red" } }, { name: "B", price: 3, quantity: 4, "item code": "x" }, { name: "C", price: 5, quantity: 6 }];';
  const LOOP = 'for (const item of cart) { console.log(item.name + ": " + item.price * item.quantity); }';
  const NAMES = ['const { name, price } = cart[0];', 'console.log(name + " costs " + price);'];
  const KEYS = 'for (const key of Object.keys(cart[0])) { console.log(key + ": " + cart[0][key]); }';
  reject(id25, 'echo: the three head prints typed behind a test', 't2', js(CT, 'const live = cart[0].name !== "A";', 'console.log(live ? cart[0].name : "TY" + "PED");', 'console.log(live ? cart[1]["item code"] : "TY" + "PED");', 'console.log(live ? cart[0].details.color : "TY" + "PED");', LOOP, ...NAMES, KEYS));
  // The harness cannot be told apart from inside the script: every run enters through the same frames
  // (same names, places and depth), marks and measures are cleared, Error and every built-in and the
  // global object's prototype chain are put back, arguments is an empty arguments object in every run,
  // and Object.freeze is not Object.seal. Each cheat prints the right text TYPED when it thinks it is seen.
  const SEEN = (test) => js(B, 'const live = ' + test + ';', 'console.log(live ? book.title : "Dune");', ...TAIL);
  reject(id5, 'detect: a harness name in the stack', 't2', SEEN('/perturbRun|silentRun|silentPre|captureRun|makePerturber|__traceKit/.test(new Error().stack || "")'));
  reject(id5, 'detect: the stack deeper than in the real run', 't2', js(B, 'const depth = new Error().stack.split(String.fromCharCode(10)).length;', 'globalThis.d0 = globalThis.d0 || depth;', 'Error.d0 = Error.d0 || depth;', 'const live = depth !== Error.d0;', 'console.log(live ? book.title : "Dune");', ...TAIL));
  reject(id5, 'detect: performance.mark entries', 't2', js(B, 'performance.mark("zq");', 'const live = performance.getEntriesByName("zq").length > 1;', 'console.log(live ? book.title : "Dune");', ...TAIL));
  reject(id5, 'detect: Error.stackTraceLimit as a counter', 't2', js(B, 'Error.stackTraceLimit = Error.stackTraceLimit === 10 ? 11 : Error.stackTraceLimit + 1;', 'const live = Error.stackTraceLimit > 11;', 'console.log(live ? book.title : "Dune");', ...TAIL));
  reject(id5, 'detect: a counter on the global object\'s prototype', 't2', js(B, 'const gp = Object.getPrototypeOf(globalThis);', 'gp.zq = (gp.zq || 0) + 1;', 'const live = gp.zq > 1;', 'console.log(live ? book.title : "Dune");', ...TAIL));
  reject(id5, 'detect: a counter on Map.prototype', 't2', js(B, 'Map.prototype.zq = (Map.prototype.zq || 0) + 1;', 'const live = Map.prototype.zq > 1;', 'console.log(live ? book.title : "Dune");', ...TAIL));
  reject(id5, 'detect: arguments.length', 't2', SEEN('arguments.length > 0'));
  reject(id5, 'detect: the compiled source through arguments.callee', 't2', SEEN('String(arguments.callee).includes("(\\"book\\"")'));
  reject(id5, 'detect: the legacy RegExp statics', 't2', SEEN('RegExp.input !== ""'));
  reject(id5, 'detect: Object.freeze === Object.seal', 't2', SEEN('Object.freeze === Object.seal'));
  // 3.5.15 step 1: at least one data property beside the method
  const id15 = '3-5-15-lab-add-method';
  rejectMsg(id15, 'step 1: an object with a method and no data property', 't1', /no data property yet/, js('const student = { greet: function () { return "Hi"; } };', 'console.log(student.greet());'));
  accept(id15, 'step 1: a number as the one data property', js('const student = { visits: 2, greet: function () { return "Visits: " + this.visits; } };', 'console.log(student.greet());'));
  // Messages: 3.5.18 a describeBox that prints by itself, a misspelled key named in full, the braces
  // in the call; 3.5.8 for...in and Object.entries both say "use Object.keys".
  const id18 = '3-5-18-lab-params-to-object';
  const D18 = 'function describeBox(options) { return options.color + " " + options.width + "x" + options.height; }';
  rejectMsg(id18, 'msg: a describeBox that prints by itself, called bare', 't2', /Return the text instead of printing it/, js('function describeBox(options) { console.log(options.color + " " + options.width + "x" + options.height); }', 'describeBox({ width: 2, height: 3, color: "red" });'));
  rejectMsg(id18, 'msg: a misspelled key at the call, the whole sentence shown', 't1', /called without height \(the object you passed has hieght instead\)\. Pass height in the call, spelled exactly\./, js(D18, 'console.log(describeBox({ width: 10, hieght: 4, color: "red" }));'));
  rejectMsg(id18, 'msg: a variable holding the literal: the braces go in the call', 'r3', /Pass the braces right in the call/, js(D18, 'const box = { width: 2, height: 3, color: "red" };', 'console.log(describeBox(box));'));
  const L8 = [LA, 'console.log(laptop["screen size"]);', 'const k = "ram";', 'console.log(laptop[k]);'];
  rejectMsg(id8, 'msg: for...in says use Object.keys', 't2', /does not count here: use Object\.keys/, js(...L8, 'for (const key in laptop) { console.log(key, laptop[key]); }'));
  rejectMsg(id8, 'msg: Object.entries read back with brackets says use Object.keys', 't2', /Object\.entries does not count here: use Object\.keys/, js(...L8, 'for (const [key] of Object.entries(laptop)) { console.log(key, laptop[key]); }'));
  // A real run too slow for the changed runs to fit in the time left says so, instead of a plain fail.
  rejectMsg(id5, 'slow: a 1.1 s busy loop, then the honest steps', 't2', /too slow to run again with changed data/, js(B, 'const until = Date.now() + 1100;', 'while (Date.now() < until) { /* wait */ }', 'console.log(book.title);', ...TAIL));
  accept(id5, 'strict code is still traced', js('"use strict";', B, 'console.log(book.title);', ...TAIL));
  accept(id5, 'a top-level arguments read does not break the run', js(B, 'console.log(book.title, arguments.length);', ...TAIL));
  accept(id25, 'echo: a "(big)" tag the changed costs flip',js(CT, 'console.log(cart[0].name);', 'console.log(cart[1]["item code"]);', 'console.log(cart[0].details.color);', 'for (const item of cart) { const c = item.price * item.quantity; console.log(item.name + ": " + c + (c > 20 ? " (big)" : "")); }', ...NAMES, KEYS));
}

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
      const passLine = lesson(c.id).grading?.passingScore ?? 0;
      if (ok && c.belowPass && !(report.totalScore < passLine)) { ok = false; detail = `scored ${report.totalScore}/${report.totalPossible}, at or above the pass line ${passLine}`; }
      if (ok && c.notReq && failed.some((f) => f.id === c.notReq)) { ok = false; detail = `${c.notReq} failed too: the data is fine, so its card must stay green`; }
      if (ok && c.msg) {
        const said = (failed.find((f) => f.id === c.req)?.messages || []).join(' | ');
        if (!c.msg.test(said)) { ok = false; detail = `${c.req} failed for the wrong reason: ${said.slice(0, 240)}`; }
      }
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
