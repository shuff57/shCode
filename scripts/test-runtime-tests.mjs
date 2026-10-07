// The `tests` requirement type: runtime cases against the student's own
// functions (lib/test-harness-source.ts, run by lib/js-runner-source.ts's
// RUNNER_SOURCE; node driver lib/run-tests-node.ts).
//
// Every wrong-but-shaped program from the gap analysis (A-1) must FAIL with the
// first failing case named in student words; the right ones must pass; and
// forged results, hangs, throws and missing functions must all fail closed.
// Grading goes through the SHIPPED grade(), the SHIPPED runner and the SHIPPED
// harness -- nothing here is a copy.
//
// Run: node scripts/test-runtime-tests.mjs   (part of `npm test`)

import { execFileSync } from 'child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
mkdirSync(path.join(root, 'node_modules', '.pkg-load-cache'), { recursive: true });
const out = mkdtempSync(path.join(root, 'node_modules', '.pkg-load-cache', 'shcode-runtime-tests-'));

let failures = 0;
const check = (name, cond, detail) => {
  console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : `  -- ${detail}`}`);
  if (!cond) failures++;
};

try {
  execFileSync(process.execPath, [
    path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
    'lib/run-tests-node.ts', '--outDir', out, '--module', 'commonjs', '--target', 'es2022', '--skipLibCheck',
  ], { cwd: root, stdio: 'inherit' });
  writeFileSync(path.join(out, 'package.json'), '{"type":"commonjs"}');
  const req = createRequire(path.join(out, 'noop.cjs'));
  const { gradeWithTests, runCodeWithTests } = req(path.join(out, 'run-tests-node.js'));
  const { jobsFromRequirements } = req(path.join(out, 'test-harness-source.js'));

  const T = (id, fn, cases, extra = {}) => ({ id, title: id, description: '', status: 'pending', type: 'tests', function: fn, cases, points: 1, ...extra });
  // Run one program against one requirement; return {passed, msg, outcome}.
  async function one(code, reqObj) {
    const report = await gradeWithTests([reqObj], { 'script.js': code }, 0);
    const r = report.results[0];
    return { passed: r.status === 'passed', msg: r.messages.join(' | '), report };
  }
  const expectFail = async (name, code, reqObj, re) => {
    const r = await one(code, reqObj);
    check(name, !r.passed && re.test(r.msg), `passed=${r.passed} msg=${JSON.stringify(r.msg)}`);
    return r;
  };

  console.log('\n(1) correct code passes');
  const findMax = T('max', 'findMax', [
    { args: [[3, 9, 2]], expect: 9 },
    { args: [[-5, -2, -9]], expect: -2 },
    { args: [[7]], expect: 7 },
  ]);
  const goodMax = 'function findMax(a){ let m = a[0]; for (const x of a) if (x > m) m = x; return m; }';
  check('findMax correct', (await one(goodMax, findMax)).passed, JSON.stringify(await one(goodMax, findMax)));
  const arrow = 'const findMax = (a) => Math.max(...a);';
  check('const arrow function is found', (await one(arrow, findMax)).passed, '');
  const varFn = 'var findMax = function (a) { return Math.max.apply(null, a); };';
  check('var function expression is found', (await one(varFn, findMax)).passed, '');

  console.log('\n(2) wrong-but-shaped programs fail, naming the first failing case');
  await expectFail('findMax returns the minimum',
    'function findMax(a){ let m = a[0]; for (const x of a) if (x < m) m = x; return m; }', findMax,
    /^findMax\(\[3, 9, 2\]\) should give 9 but gave 2$/);
  const isEven = T('even', 'isEven', [
    { args: [4], expect: true }, { args: [7], expect: false }, { args: [6], expect: true }, { args: [0], expect: true },
  ]);
  check('isEven correct', (await one('function isEven(n){ return n % 2 === 0; }', isEven)).passed, '');
  await expectFail('isEven tests n % 3', 'function isEven(n){ return n % 3 === 0; }', isEven,
    /^isEven\(4\) should give true but gave false$/);
  const sum = T('sum', 'sumToN', [{ args: [1], expect: 1 }, { args: [4], expect: 10 }, { args: [10], expect: 55 }]);
  check('sumToN correct', (await one('function sumToN(n){ let t = 0; for (let i = 1; i <= n; i++) t += i; return t; }', sum)).passed, '');
  await expectFail('sumToN adds 1 instead of i',
    'function sumToN(n){ let t = 0; for (let i = 1; i <= n; i++) t += 1; return t; }', sum,
    /^sumToN\(4\) should give 10 but gave 4$/);
  await expectFail('sumToN is off by one (i < n)',
    'function sumToN(n){ let t = 0; for (let i = 1; i < n; i++) t += i; return t; }', sum,
    /^sumToN\(1\) should give 1 but gave 0$/);
  const triple = T('triple', 'triple', [{ args: [3], expect: 9 }, { args: [10], expect: 30 }]);
  await expectFail('triple returns n * 7', 'function triple(n){ return n * 7; }', triple,
    /^triple\(3\) should give 9 but gave 21$/);
  const guard = T('guard', 'safeDivide', [{ args: [10, 2], expect: 5 }, { args: [1, 0], expect: 0 }, { args: [9, 3], expect: 3 }]);
  await expectFail('a guard on b > 100 instead of b === 0',
    'function safeDivide(a, b){ if (b > 100) return 0; return a / b; }', guard,
    /^safeDivide\(1, 0\) should give 0 but gave Infinity$/);
  await expectFail('print-only function when a return value is expected',
    'function triple(n){ console.log(n * 3); }', triple,
    /^triple\(3\) should give 9 but gave undefined \(it printed instead of returning a value - use return\)$/);

  console.log('\n   only the FIRST failing case is revealed');
  {
    const r = await one('function triple(n){ return n * 7; }', triple);
    check('second case values are not in the message', !/30|10/.test(r.msg), r.msg);
  }

  console.log('\n   original must be left untouched');
  const sorted = T('sorted', 'sortedCopy', [{ args: [[3, 1, 2]], expect: [1, 2, 3], unchanged: 0 }]);
  check('a copy-then-sort passes', (await one('function sortedCopy(a){ return [...a].sort((x, y) => x - y); }', sorted)).passed, '');
  await expectFail('in-place sort that returns the same array fails "unchanged"',
    'function sortedCopy(a){ return a.sort((x, y) => x - y); }', sorted,
    /^sortedCopy\(\[3, 1, 2\]\) changed the array you gave it\. It should leave the original untouched$/);
  const grid = T('cell', 'setCell', [{ args: [[[0, 0], [0, 0]], 1, 1, 5], after: { 0: [[0, 0], [0, 5]] } }]);
  check('after-check: cell updated passes', (await one('function setCell(g, r, c, v){ g[r][c] = v; }', grid)).passed, '');
  await expectFail('after-check: a function that never updates the cell fails',
    'function setCell(g, r, c, v){ }', grid, /should leave argument 1 as \[\[0, 0\], \[0, 5\]\] but left it as \[\[0, 0\], \[0, 0\]\]/);

  console.log('\n(3) infinite loop in a case');
  {
    const t0 = Date.now();
    const loops = 'console.log("top level fine"); function findMax(a){ while (true) {} }';
    const run = await runCodeWithTests(loops, jobsFromRequirements([{ ...findMax, timeout: 300 }]));
    check('reports a timeout in the case phase, quickly', run.outcome === 'timeout' && run.timeoutPhase === 'case' && Date.now() - t0 < 2500,
      `${run.outcome} ${run.timeoutPhase} ${Date.now() - t0}ms`);
    check('the script output before the cases survives', run.logs.some((l) => l.message === 'top level fine'), JSON.stringify(run.logs));
    check('message says it did not finish', /^findMax\(\[3, 9, 2\]\) did not finish in 0\.3 seconds/.test(run.tests.byId.max.message), run.tests.byId.max.message);
    // A job that finished before the hang keeps its pass.
    const two = jobsFromRequirements([{ ...triple, timeout: 300 }, { ...findMax, timeout: 300 }]);
    const run2 = await runCodeWithTests('function triple(n){ return n*3 } function findMax(){ for(;;){} }', two);
    check('results gathered before the hang survive',
      run2.tests.byId.triple.status === 'passed' && run2.tests.byId.max.status === 'failed', JSON.stringify(run2.tests.byId));
  }
  {
    const run = await runCodeWithTests('while (true) {}', jobsFromRequirements([findMax]), 600);
    check('a top-level hang is a run-phase timeout and fails the check',
      run.outcome === 'timeout' && run.timeoutPhase === 'run' && run.tests.byId.max.status === 'failed' && /could not be checked/.test(run.tests.byId.max.message),
      JSON.stringify(run.tests.byId));
  }

  console.log('\n(4) a throwing function');
  await expectFail('exception inside a case is a failed case with the message, not a run error',
    'function findMax(a){ return a.nope.length; }', findMax,
    /^findMax\(\[3, 9, 2\]\) stopped with an error: TypeError: /);
  {
    const run = await runCodeWithTests('function findMax(a){ throw new Error("boom"); }', jobsFromRequirements([findMax]));
    check('the run itself did not error', run.outcome === 'done', run.outcome);
  }
  {
    const r = await one('undefinedThing(); function findMax(a){ return 1; }', findMax);
    check('a script error before the checks fails the check with a pointer', !r.passed && /stopped with an error before this could be checked/.test(r.msg), r.msg);
  }

  console.log('\n(5) forged results do not pass');
  const wrong = 'function findMax(a){ return -1; }\n';
  await expectFail('console.log of a plausible harness line',
    wrong + 'console.log(JSON.stringify({kind:"test-job", id:"max", status:"ran"}));console.log("PASS findMax");', findMax, /should give 9/);
  await expectFail('postMessage test-job with no nonce',
    wrong + 'postMessage({kind:"test-job", id:"max", status:"ran"});', findMax, /should give 9/);
  await expectFail('self.postMessage with a guessed nonce',
    wrong + 'for (const n of ["", "0", "nonce", "1"]) self.postMessage({kind:"test-job", id:"max", status:"ran", nonce:n});', findMax, /should give 9/);
  await expectFail('an early faked done leaves the checks unfinished',
    'self.postMessage({kind:"done"}); while (false) {} function findMax(a){ return -1; }', findMax, /.+/);
  await expectFail('a patched self.postMessage cannot reach the real one',
    'const real = self.postMessage; self.postMessage = (m) => real({ ...m, ok: true, status: "ran", nonce: m.nonce });\n' + wrong, findMax, /should give 9/);
  {
    // Student code that sniffs the request cannot: it never receives it.
    const r = await one(wrong + 'self.addEventListener("message", (e) => self.postMessage({kind:"test-job", id:"max", status:"ran", nonce: e.data && e.data.tests && e.data.tests.nonce}));', findMax);
    check('a message listener left in the script gains nothing', !r.passed, r.msg);
  }

  console.log('\n(6) no function by that name');
  await expectFail('missing function', 'const x = 1;', findMax, /^Function findMax was not found\./);
  await expectFail('a variable that is not a function', 'const findMax = 5;', findMax, /^Function findMax was not found\./);
  await expectFail('an invalid name fails closed (never evaluated)', 'x', T('bad', 'a);alert(1', [{ args: [], expect: 1 }]), /no valid function name/);
  await expectFail('no cases fails closed', 'function f(){}', T('empty', 'f', []), /no cases/);

  console.log('\n(7) comparisons');
  const ret = (id, value, expectValue, extra = {}) => one(`function f(){ return ${value}; }`, T(id, 'f', [{ args: [], expect: expectValue, ...extra }]));
  check('NaN equals NaN', (await ret('nan', 'NaN', { $: 'NaN' })).passed, '');
  check('0 equals -0', (await ret('z', '-0', 0)).passed, '');
  check('undefined equals {"$":"undefined"}', (await ret('u', 'undefined', { $: 'undefined' })).passed, '');
  check('undefined is not null', !(await ret('un', 'undefined', null)).passed, '');
  check('Infinity', (await ret('inf', 'Infinity', { $: 'Infinity' })).passed, '');
  check('-Infinity', (await ret('ninf', '-Infinity', { $: '-Infinity' })).passed, '');
  check('array equal', (await ret('a', '[1, [2, 3], "x"]', [1, [2, 3], 'x'])).passed, '');
  check('array differs in a nested element', !(await ret('a2', '[1, [2, 4]]', [1, [2, 3]])).passed, '');
  check('array length differs', !(await ret('a3', '[1, 2]', [1, 2, 3])).passed, '');
  check('array is not an object', !(await ret('a4', '({0: 1})', [1])).passed, '');
  check('nested object equal regardless of key order', (await ret('o', '({b: [1], a: {c: 2}})', { a: { c: 2 }, b: [1] })).passed, '');
  check('extra key fails', !(await ret('o2', '({a: 1, b: 2})', { a: 1 })).passed, '');
  check('"1" is not 1', !(await ret('s', '"1"', 1)).passed, '');
  check('0.1 + 0.2 equals 0.3 within the default tolerance', (await ret('fl', '0.1 + 0.2', 0.3)).passed, '');
  {
    const r = await one('function f(){ return 0.1 + 0.2; }', T('fl3', 'f', [{ args: [], expect: 0.3 }], { tolerance: 0 }));
    check('requirement tolerance: 0 makes 0.1 + 0.2 != 0.3', !r.passed, r.msg);
    const r2 = await one('function f(){ return 3.14159; }', T('fl4', 'f', [{ args: [], expect: 3.14 }], { tolerance: 0.01 }));
    check('requirement tolerance: 0.01 accepts 3.14159', r2.passed, r2.msg);
  }
  {
    const r = await one('function f(x){ x.push(1); return x; }', T('fresh', 'f', [{ args: [[]], expect: [1] }, { args: [[]], expect: [1] }]));
    check('each case gets fresh arguments', r.passed, r.msg);
  }
  {
    const r = await one('function f(){ return {a: undefined}; }', T('ob', 'f', [{ args: [], expect: {} }]));
    check('an object with an undefined-valued key is not {}', !r.passed, r.msg);
  }

  console.log('\n(8) output-capturing cases');
  const area = T('area', 'findRectangleArea', [
    { args: [3, 4], expectOutput: ['Area: 12'] },
    { args: [5, 5], expectOutput: ['Area: 25'] },
  ]);
  check('printing function passes', (await one('function findRectangleArea(w, h){ console.log("Area: " + w * h); }', area)).passed, '');
  await expectFail('prints the wrong number',
    'function findRectangleArea(w, h){ console.log("Area: " + (w + h)); }', area,
    /^findRectangleArea\(3, 4\) should print "Area: 12" but printed "Area: 7"$/);
  await expectFail('prints nothing', 'function findRectangleArea(w, h){ return w * h; }', area,
    /^findRectangleArea\(3, 4\) should print "Area: 12" but printed nothing$/);
  const multi = T('multi', 'f', [{ args: [], expectOutput: ['a', 'b'] }]);
  check('multi-line output passes', (await one('function f(){ console.log("a"); console.log("b  "); }', multi)).passed, '');
  await expectFail('second line wrong names line 2 only',
    'function f(){ console.log("a"); console.log("c"); }', multi, /should print "b" on line 2 but printed "c"$/);
  await expectFail('missing second line', 'function f(){ console.log("a"); }', multi, /should print "b" on line 2 but printed only 1 line$/);
  await expectFail('an extra line', 'function f(){ console.log("a"); console.log("b"); console.log("c"); }', multi, /but printed an extra line "c"$/);
  {
    const run = await runCodeWithTests('console.log("start"); function f(){ console.log("INSIDE CASE"); }',
      jobsFromRequirements([T('quiet', 'f', [{ args: [], expectOutput: ['INSIDE CASE'] }])]));
    check('harness-run output is not in the student console; the script\'s own is',
      run.logs.length === 1 && run.logs[0].message === 'start', JSON.stringify(run.logs));
  }
  {
    const r = await one('function f(){ console.log("hi"); return 5; }', T('both', 'f', [{ args: [], expect: 5, expectOutput: ['hi'] }]));
    check('return and output both checked', r.passed, r.msg);
  }

  console.log('\nloose wording: expectOutputContains / expectContains / function lists');
  {
    const area = T('area', 'f', [{ args: [3, 4], expectOutputContains: ['12'] }]);
    const prints = (expr) => `function f(w, h){ console.log(${expr}); }`;
    for (const [name, expr] of [
      ['bare number', 'w * h'], ['label sentence', '"The area is " + w * h'],
      ['label = units', '"Area = " + w * h + " square units"'], ['template literal', '`Area: ${w * h}`'],
      ['upper case and extra spaces', '"AREA:    " + w * h'], ['trailing full stop', '"It is " + w * h + "."'],
      ['number in the middle', '"a " + w * h + " b"'],
    ]) check('contains 12 accepts: ' + name, (await one(prints(expr), area)).passed, '');
    for (const [name, expr, re] of [
      ['112', '"Area: 112"', /should print a line that includes "12" but printed "Area: 112"/],
      ['12.5', '"Area: 12.5"', /but printed "Area: 12\.5"/],
      ['1.12', '"Area: 1.12"', /includes "12"/],
      ['-12', '"Area: -12"', /includes "12"/],
      ['212', '"212"', /includes "12"/],
      ['the width', 'w', /but printed "3"/],
      ['w * w', 'w * w', /but printed "9"/],
      ['no number', '"Area"', /but printed "Area"/],
    ]) await expectFail('contains 12 rejects: ' + name, prints(expr), area, re);
    await expectFail('prints nothing', 'function f(w, h){ return w * h; }', area, /includes "12" but printed nothing$/);
    check('digits split by a word do not join', !(await one('function f(){ console.log("1 2"); }', area)).passed, '');
    check('12 in a later line counts', (await one('function f(w,h){ console.log("start"); console.log(w*h); }', area)).passed, '');
    check('1,200 reads as 1200 and not as 200', (await one('function f(){ console.log("1,200"); }', T('c', 'f', [{ args: [], expectOutputContains: ['1200'] }]))).passed
      && !(await one('function f(){ console.log("1,200"); }', T('c', 'f', [{ args: [], expectOutputContains: ['200'] }]))).passed, '');
    check('decimal and negative needles are whole tokens', (await one('function f(){ console.log("Area is 6.5 now"); }', T('c', 'f', [{ args: [], expectOutputContains: ['6.5'] }]))).passed
      && (await one('function f(){ console.log("temp -3"); }', T('c', 'f', [{ args: [], expectOutputContains: ['-3'] }]))).passed
      && !(await one('function f(){ console.log("temp 3"); }', T('c', 'f', [{ args: [], expectOutputContains: ['-3'] }]))).passed, '');
    const words = T('w', 'f', [{ args: [], expectOutputContains: ['hello world', 'BYE'] }]);
    check('words: case-insensitive, whitespace collapsed, several needles',
      (await one('function f(){ console.log("  Hello \\t  WORLD!"); console.log("bye"); }', words)).passed, '');
    await expectFail('words: names the first missing needle', 'function f(){ console.log("hello world"); }', words, /includes "BYE" but printed "hello world"$/);
    const hidd = T('h', 'f', [{ args: [3, 4], expectOutputContains: ['12'] }, { args: [5, 5], expectOutputContains: ['25'], hidden: true }]);
    check('hidden contains passes when right', (await one('function f(w,h){ console.log("Area " + w*h); }', hidd)).passed, '');
    await expectFail('hidden contains reveals nothing', 'function f(w,h){ console.log(w === 5 ? "x" : w*h); }', hidd, /^A hidden check failed\.$/);
    const ret = T('r', 'f', [{ args: [1], expectContains: 'zero' }, { args: [2], expect: 7 }]);
    check('string return: contains, case-insensitive', (await one('function f(b){ return b === 1 ? "Zero is NOT allowed" : 7; }', ret)).passed, '');
    await expectFail('string return: wrong text', 'function f(b){ return b === 1 ? "Error" : 7; }', ret, /should give text that includes "zero" but gave "Error"$/);
    await expectFail('string return: a number is not text', 'function f(b){ return b === 1 ? 0 : 7; }', ret, /should give text that includes "zero" but gave 0$/);
    await expectFail('string return: printed instead of returned', 'function f(b){ if (b === 1) { console.log("zero"); return; } return 7; }', ret, /use return/);
    await expectFail('combined with expect: the exact part still fails', 'function f(b){ return b === 1 ? "zero" : 8; }', ret, /should give 7 but gave 8/);
    const all = T('a', 'f', [{ args: [], expectContainsAll: ['cannot', 'zero'] }]);
    check('expectContainsAll: all present', (await one('function f(){ return "You cannot use zero here"; }', all)).passed, '');
    await expectFail('expectContainsAll: one missing', 'function f(){ return "zero"; }', all, /includes "cannot"/);
    const both = T('b', 'f', [{ args: [2], expect: 4, expectOutputContains: ['4'] }]);
    check('expect + expectOutputContains both hold', (await one('function f(n){ console.log("got " + n * 2); return n * 2; }', both)).passed, '');
    await expectFail('expect + expectOutputContains: print missing', 'function f(n){ return n * 2; }', both, /includes "4" but printed nothing/);
    // function as a list of acceptable names
    const names = T('n', ['doubled', 'bigger'], [{ args: [4], expect: 8 }]);
    check('function list: first name', (await one('function doubled(n){ return n * 2; }', names)).passed, '');
    check('function list: second name', (await one('function bigger(n){ return n * 2; }', names)).passed, '');
    await expectFail('function list: none defined', 'function other(n){ return n * 2; }', names, /None of these functions was found: doubled, bigger/);
    await expectFail('function list: the found one is judged', 'function bigger(n){ return n; }', names, /^bigger\(4\) should give 8 but gave 4$/);
  }

  console.log('\nhidden cases');
  const hid = T('hid', 'triple', [{ args: [3], expect: 9 }, { args: [123], expect: 369, hidden: true }]);
  check('a correct function passes hidden cases', (await one('function triple(n){ return n * 3; }', hid)).passed, '');
  await expectFail('a failing hidden case reveals no values',
    'function triple(n){ return n < 100 ? n * 3 : 0; }', hid, /^A hidden check failed\.$/);
  {
    const r = await one('function triple(n){ return n < 100 ? n * 3 : 0; }', hid);
    check('...and not the input either', !/123|369/.test(r.msg), r.msg);
  }

  console.log('\nplumbing');
  {
    const r = await one('function findMax(a){ return Math.max(...a); }', { ...findMax, hint: 'Look at the comparison.' });
    check('no hint when passing', r.report.results[0].messages.length === 0, JSON.stringify(r.report.results[0].messages));
    const r2 = await one('function findMax(a){ return 0; }', { ...findMax, hint: 'Look at the comparison.' });
    check('failure message first, hint after', r2.report.results[0].messages.length === 2 && r2.report.results[0].messages[1] === 'Look at the comparison.', JSON.stringify(r2.report.results[0].messages));
    check('points follow the result', r.report.totalScore === 1 && r2.report.totalScore === 0, `${r.report.totalScore}/${r2.report.totalScore}`);
  }
  {
    // grade() with no results is not a pass; stale results are not a pass.
    const { grade } = req(path.join(out, 'grader.js'));
    const code = 'function findMax(a){ return Math.max(...a); }';
    const none = grade([findMax], { 'script.js': code }, 0);
    check('no run yet: not passed, asks for Run', none.results[0].status === 'failed' && /Press Run/.test(none.results[0].messages[0]), JSON.stringify(none.results[0]));
    const run = await runCodeWithTests(code, jobsFromRequirements([findMax]));
    const fresh = grade([findMax], { 'script.js': code }, 0, { testResults: run.tests });
    check('results for this code pass', fresh.results[0].status === 'passed', JSON.stringify(fresh.results[0]));
    const stale = grade([findMax], { 'script.js': code + '\n// edited' }, 0, { testResults: run.tests });
    check('results for OTHER code read as stale', stale.results[0].status === 'failed' && /changed your code/.test(stale.results[0].messages[0]), JSON.stringify(stale.results[0]));
  }
  {
    // Student prompt() inside a function under test must not crash the harness.
    const r = await one('function f(){ return prompt("x"); }', T('pr', 'f', [{ args: [], expect: 'a' }]));
    check('prompt() inside a case fails that case cleanly', !r.passed && /asked for input with prompt/.test(r.msg), r.msg);
  }
  {
    // The script runs exactly once, with or without test jobs.
    const run = await runCodeWithTests('console.log("once"); function f(){ return 1; }', jobsFromRequirements([T('once', 'f', [{ args: [], expect: 1 }])]));
    check('the script runs once', run.logs.filter((l) => l.message === 'once').length === 1, JSON.stringify(run.logs));
  }
} finally {
  rmSync(out, { recursive: true, force: true });
}

if (failures) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log('\nruntime tests: all checks passed');
