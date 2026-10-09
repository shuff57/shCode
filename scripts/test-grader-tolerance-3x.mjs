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

// ---- 3.5.22: arrow with a destructured parameter
accept('3-5-22-lab-destructure-three', 'arrow with destructured parameter',
  js('const book = { title: "T", author: "A", pages: 9 };', 'const { title, author, pages } = book;',
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
reject('3-4-10-lab-implicit-return-drill', 'three arrows that all return the same thing', 't1',
  js('const a = () => 1;', 'const b = () => 1;', 'const c = () => 1;', 'console.log(1);', 'console.log(1);', 'console.log(1);'));
reject('3-5-8-lab-dot-vs-bracket', 'regex literals instead of code', 'r3',
  js('const a = /o["a b"]/, b = /Object.keys(.)/, c = /o[k]/;'));
reject('3-7-21-lab-mutating-sort-drill', 'regex literals instead of code', 'r2',
  js('const r = /a.push(.)/, s = /a.map(.)/;', 'console.log(1);'));
reject('3-5-8-lab-dot-vs-bracket', 'bare lines and nothing printed', 't1',
  js('const laptop = { brand: "F", "screen size": 13 };', 'laptop["screen size"];', 'const k = "brand";', 'laptop[k];', 'Object.keys(laptop);'));
reject('3-5-12-lab-nested-structure', 'bare reads, empty loop, placeholder prints', 't1',
  js('const order = { customer: { name: "Ana" }, items: [{ name: "pen", price: 2 }, { name: "ink", price: 1 }] };', 'order.customer.name;',
     'for (let i = 0; i < 0; i++) { }', 'console.log("x");', 'console.log("x");', 'console.log("x");'));
reject('3-5-25-lab-objects-capstone', 'counter output instead of costs', 't1',
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
reject('3-5-15-lab-add-method', 'the printed line is not what the method returns', 't1',
  js('const student = { name: "Ana", hi: function () { return "Hello"; } };', 'console.log("hi");'));
reject('3-5-22-lab-destructure-three', 'destructuring zero fields', 'r1',
  js('const item = { title: "Pen", cost: 2, quantity: 10 };', 'const {} = item;', 'function describe({ title, quantity }) { return title + quantity; }', 'console.log(describe(item));'));
reject('3-4-19-lab-callback-capstone', 'the helper has no for loop', 't1',
  js('function countMatching(a, t) { let c = 0; let i = 0; while (i < a.length) { if (t(a[i])) { c++; } i++; } return c; }',
     'const readings = [1, 2, 3, 4, 5];', 'console.log(countMatching(readings, n => n > 2), countMatching(readings, n => n < 2));'));
accept('3-5-22-lab-destructure-three', 'default for the whole parameter',
  js('const item = { title: "Pen", cost: 2, quantity: 10 };', 'const { title, cost, quantity } = item;', 'console.log(title + cost + quantity);',
     'function describe({ title, quantity } = {}) { return title + " x" + quantity; }', 'console.log(describe(item));'));

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
