// Measures what the regex requirements in units 1.2 and 1.3 accept and refuse.
//
// The regex graders drifted strict: they matched the shape of the reference
// solution rather than the shape of a correct answer. Lesson 1.2.18
// ("Comparisons Make Booleans") teaches `let isHot = temperature > 80;`, and
// 1.3.16 then refused it because it only accepted a literal `true`. Same story
// for `var`, for backticks (taught in 1.2.13), for an apostrophe inside a
// string, and for a `typeof` logged with a label.
//
// So this file is two lists, and BOTH matter:
//
//   ACCEPT -- an answer a student could reasonably write. Must score full marks.
//   REJECT -- an answer that has not done the work. Must lose the named
//             requirement. Every lesson's untouched starter file is in here,
//             because a relaxation that lets the starter pass is worse than the
//             strictness it replaced.
//
// Run: node scripts/test-grader-tolerance.mjs   (also part of `npm test`)

import { execFileSync } from 'child_process';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const out = mkdtempSync(path.join(tmpdir(), 'shcode-tolerance-'));

const BT = String.fromCharCode(96);   // backtick -- typing one is not portable
const AP = String.fromCharCode(39);   // apostrophe
const nl = '\n';

// Bundles ship CRLF; a multi-line search string built with '\n' silently misses
// and the case then tests the unmodified solution. Normalise on the way in.
function read(rel) {
  return readFileSync(path.join(root, rel), 'utf8').replace(/\r\n?/g, '\n');
}

function lesson(id) {
  return JSON.parse(read(`lessons/${id}/lesson.json`));
}

function solutionFiles(id) {
  try {
    return {
      'script.js': read(`lessons/${id}/solution/script.js`),
      'README.md': read(`lessons/${id}/solution/README.md`),
    };
  } catch {
    return { 'script.js': read(`lessons/${id}/solution.js`) };
  }
}

function starterFiles(id) {
  const files = { 'script.js': read(`lessons/${id}/script.js`) };
  try { files['README.md'] = read(`lessons/${id}/README.md`); } catch { /* none */ }
  return files;
}

// Replace inside script.js, failing loudly if the anchor has moved -- a silent
// no-op here would leave the case testing the reference solution and passing
// for the wrong reason.
function edit(files, from, to) {
  const src = files['script.js'];
  if (!src.includes(from)) {
    throw new Error(`anchor not found in script.js: ${JSON.stringify(from.slice(0, 60))}`);
  }
  return { ...files, 'script.js': src.replace(from, to) };
}

const L = {
  match: '1-4-3-match-the-language',
  structure: '1-4-12-name-the-structure',
  snippet: '1-4-20-sort-the-snippet',
  fix10: '1-2-28-a1-2-1-fix-ten-declarations',
  object: '1-2-29-a1-2-2-describe-an-object',
  rename: '1-3-11-lab-rename-the-mystery-variables',
  split: '1-3-16-lab-split-the-reused-variable',
  messy: '1-3-19-a1-3-1-document-a-messy-program',
};

const cases = [];
const accept = (id, name, files) => cases.push({ id, name, files, expect: 'pass' });
const reject = (id, name, req, files) => cases.push({ id, name, files, expect: 'fail', req });

// Every lesson: the reference answer scores full marks, the untouched starter
// does not. These two anchor everything else.
for (const id of Object.values(L)) {
  accept(id, 'reference solution', solutionFiles(id));
  reject(id, 'untouched starter', null, starterFiles(id));
}

// ---------------------------------------------------------------- 1.2.28
{
  const S = solutionFiles(L.fix10);
  accept(L.fix10, 'name in backticks (taught in 1.2.13)',
    edit(S, 'let firstName = "Sam";', `let firstName = ${BT}Sam${BT};`));
  accept(L.fix10, 'name containing an apostrophe',
    edit(S, 'let firstName = "Sam";', `let firstName = "Sam${AP}s";`));
  accept(L.fix10, 'boolean from a comparison (taught in 1.2.18)',
    edit(S, 'let isEnrolled = true;', 'let isEnrolled = 1 === 1;'));
  accept(L.fix10, 'age written as a decimal',
    edit(S, 'let studentAge = 16;', 'let studentAge = 16.5;'));
  accept(L.fix10, 'maximum written as an expression',
    edit(S, 'const MAX_STUDENTS = 30;', 'const MAX_STUDENTS = 15 * 2;'));
  accept(L.fix10, 'var throughout',
    { 'script.js': S['script.js'].replace(/\blet\b/g, 'var') });
  accept(L.fix10, 'no semicolons anywhere',
    { 'script.js': S['script.js'].replace(/;$/gm, '') });

  reject(L.fix10, 'boolean still written as text', 'r3',
    edit(S, 'let isEnrolled = true;', 'let isEnrolled = "true";'));
  reject(L.fix10, 'null still written as text', 'r9',
    edit(S, 'const middleName = null;', 'const middleName = "null";'));
  reject(L.fix10, 'age still written as text', 'r1',
    edit(S, 'let studentAge = 16;', 'let studentAge = "16";'));
  reject(L.fix10, 'finalScore assigned after all', 'r10',
    edit(S, 'let finalScore;', 'let finalScore = 0;'));
  reject(L.fix10, 'MAX_STUDENTS left as let', 'r5',
    edit(S, 'const MAX_STUDENTS = 30;', 'let MAX_STUDENTS = 30;'));
  reject(L.fix10, 'snake_case name left alone', 'r8',
    edit(S, 'let favouriteColour = "blue";', 'let favourite_colour = "blue";'));
}

// ---------------------------------------------------------------- 1.2.29
{
  const S = solutionFiles(L.object);
  const typeofLine = 'console.log(typeof itemHeightCm, typeof itemName, typeof isReusable);';
  const sentence = `console.log(${BT}The \${itemColor} \${itemName} holds \${itemVolumeMl} ml.${BT});`;

  accept(L.object, 'typeof logged with a label',
    edit(S, typeofLine, `console.log("number?", typeof itemHeightCm);`));
  accept(L.object, 'typeof stored, then logged',
    edit(S, typeofLine, `let heightType = typeof itemHeightCm;${nl}console.log(heightType);`));
  accept(L.object, 'sentence spread over several lines',
    edit(S, sentence,
      `console.log(${nl}  ${BT}The \${itemColor} ${BT} +${nl}  ${BT}\${itemName} holds \${itemVolumeMl} ml.${BT}${nl});`));
  accept(L.object, 'string methods outside the example list',
    edit(S, 'console.log(itemName.includes("water"));', 'console.log(itemName.trim());'));
  accept(L.object, 'var throughout',
    { 'script.js': S['script.js'].replace(/\b(let|const)\b/g, 'var') });
  accept(L.object, 'no semicolons anywhere',
    { 'script.js': S['script.js'].replace(/;$/gm, '') });
  accept(L.object, 'declare first, assign after', { 'script.js': [
    'let itemName;', 'itemName = "water bottle";',
    'let itemColor;', 'itemColor = "blue";',
    'let itemHeightCm;', 'itemHeightCm = 25;',
    'let itemVolumeMl;', 'itemVolumeMl = 500;',
    'let isReusable;', 'isReusable = true;',
    'let hasLid;', 'hasLid = false;',
    'console.log(itemColor.toUpperCase());',
    'console.log(itemName.includes("water"));',
    sentence,
    typeofLine,
  ].join(nl) });

  reject(L.object, 'only three variables', 'r1', { 'script.js': [
    'let itemName = "water bottle";',
    'let itemHeightCm = 25;',
    'let isReusable = true;',
    'console.log(itemName.toUpperCase(), itemName.length);',
    sentence,
    typeofLine,
  ].join(nl) });
  reject(L.object, 'no template literal in the sentence', 'r6',
    edit(S, sentence, 'console.log("The " + itemColor + " " + itemName + ".");'));
  reject(L.object, 'no typeof anywhere', 'r7',
    edit(S, typeofLine, 'console.log(itemHeightCm, itemName, isReusable);'));
  reject(L.object, 'no string method used', 'r5',
    edit(S, `console.log(itemColor.toUpperCase());${nl}console.log(itemName.includes("water"));`,
      'console.log(itemColor);'));
}

// ---------------------------------------------------------------- 1.3.11
{
  const S = solutionFiles(L.rename);
  const report = 'let gradeReport = subjectName + " final grade: " + finalGrade + "%";';

  accept(L.rename, 'var throughout',
    { 'script.js': S['script.js'].replace(/\blet\b/g, 'var') });
  accept(L.rename, 'report as a template literal',
    edit(S, report, `let gradeReport = ${BT}\${subjectName} final grade: \${finalGrade}%${BT};`));
  accept(L.rename, 'report built over two statements',
    edit(S, report, `let gradeReport = "";${nl}gradeReport = subjectName + " scored " + finalGrade;`));
  accept(L.rename, 'comma-separated declarations', { 'script.js': [
    'let subjectName = "Math", finalGrade = 88;',
    report,
    'console.log(gradeReport);',
    'let hoursWorked = 3, hourlyRate = 2.5;',
    'let totalPay = hoursWorked * hourlyRate;',
    'console.log(totalPay);',
  ].join(nl) });
  accept(L.rename, 'declare first, assign after', { 'script.js': [
    'let subjectName;', 'subjectName = "Math";',
    'let finalGrade;', 'finalGrade = 88;',
    report, 'console.log(gradeReport);',
    'let hoursWorked = 3;', 'let hourlyRate = 2.5;',
    'let totalPay = hoursWorked * hourlyRate;', 'console.log(totalPay);',
  ].join(nl) });
  accept(L.rename, 'pay rounded through a helper',
    edit(S, 'let totalPay = hoursWorked * hourlyRate;',
      'let totalPay = Math.round(hoursWorked * hourlyRate * 100) / 100;'));

  reject(L.rename, 'a single-letter variable survives', 'r7',
    { 'script.js': `${S['script.js']}${nl}let c = 5;${nl}` });
  reject(L.rename, 'report never combines the two names', 'r3',
    edit(S, report, 'let gradeReport = "see above";'));
  reject(L.rename, 'finalGrade holds text instead of a number', 'r2',
    edit(S, 'let finalGrade = 88;', 'let finalGrade = "88";'));
}

// ---------------------------------------------------------------- 1.3.16
{
  const S = solutionFiles(L.split);
  const bool = 'let isGameOver = true;';

  accept(L.split, 'boolean from a comparison: 9 < 10', edit(S, bool, 'let isGameOver = 9 < 10;'));
  accept(L.split, 'boolean from the other variables',
    edit(S, bool, 'let isGameOver = levelCount >= maxScore;'));
  accept(L.split, 'boolean via Boolean()', edit(S, bool, 'let isGameOver = Boolean(0);'));
  accept(L.split, 'boolean via !false', edit(S, bool, 'let isGameOver = !false;'));
  accept(L.split, 'var throughout',
    { 'script.js': S['script.js'].replace(/\blet\b/g, 'var') });
  accept(L.split, 'player name with an apostrophe',
    edit(S, 'let playerName = "Alice";', `let playerName = "O${AP}Brien";`));
  accept(L.split, 'logged with a label and a method call',
    edit(S, 'console.log(maxScore);', 'console.log("Max score: " + maxScore.toString());'));
  accept(L.split, 'the word "stuff" survives in prose',
    { 'script.js': `${S['script.js']}${nl}console.log("that is all the stuff");` });

  reject(L.split, 'boolean written as text', 'r3', edit(S, bool, 'let isGameOver = "true";'));
  reject(L.split, 'boolean written as a number', 'r3', edit(S, bool, 'let isGameOver = 8;'));
  reject(L.split, 'the reused variable is still there', 'r6',
    { 'script.js': `${S['script.js']}${nl}let stuff = 100;${nl}console.log(stuff);` });
  reject(L.split, 'one of the four is never printed', 'r5',
    edit(S, 'console.log(levelCount);', ''));
  reject(L.split, 'playerName holds a number', 'r2',
    edit(S, 'let playerName = "Alice";', 'let playerName = 42;'));
}

// ---------------------------------------------------------------- 1.3.19
{
  const S = solutionFiles(L.messy);
  const total = 'const orderTotal = subtotal + subtotal * TAX_RATE; // price after tax is added';
  const readme = (body) => ({ ...S, 'README.md': body });

  accept(L.messy, 'tax kept in its own named variable',
    edit(S, total,
      `const tax = subtotal * TAX_RATE; // the sales tax owed on this order${nl}` +
      'const orderTotal = subtotal + tax; // price after tax is added'));
  accept(L.messy, 'tax written first in the sum',
    edit(S, total, 'const orderTotal = TAX_RATE * subtotal + subtotal; // price after tax'));
  accept(L.messy, 'total as subtotal * (1 + TAX_RATE)',
    edit(S, total, 'const orderTotal = subtotal * (1 + TAX_RATE); // price after tax is added'));
  accept(L.messy, 'title contains an apostrophe',
    edit(S, 'const bookTitle = "The Hobbit";',
      `const bookTitle = "Harry Potter and the Philosopher${AP}s Stone";`));
  accept(L.messy, 'rate written as a division',
    edit(S, 'const TAX_RATE = 0.0725;', 'const TAX_RATE = 7.25 / 100;'));
  accept(L.messy, 'block comments instead of //',
    { ...S, 'script.js': S['script.js'].replace(/\/\/ ([^\n]*)/g, '/* $1 */') });
  accept(L.messy, 'a slash inside a printed string',
    { ...S, 'script.js': `${S['script.js']}console.log("Ships 1/2 now");${nl}` });
  accept(L.messy, 'README answered in short bullets', readme([
    '# Book Order Total', '',
    '## What is it?', '', '- Costs a book order', '',
    '## How to run?', '', '- Press Run to see it', '',
    '## Know first?', '', '- The tax rate', '',
  ].join(nl)));
  // A real submission, 2026-08-25: this student answered all three prompts but
  // wrote each ANSWER with a '##' prefix, matching the heading style around it.
  // r9 skipped every line starting with '#' to stop a blank starter passing on
  // its own prompts, so it skipped their answers too and cost them a
  // requirement. Length cannot separate the three shapes -- '- The tax rate'
  // (12 chars) sits between the starter's 'Know first?' (11) and everything
  // else -- so r9 now excludes the four prompt texts by name instead.
  accept(L.messy, 'README answers carry the same ## prefix as the prompts', readme([
    '# (name it)', '',
    '## What is it?', '  ## It is a price calculator',
    '## How to run?', '  ## Input the book, the price per book, and how many you are buying, then press run',
    '## Know first?', '  ## The program prints the title of the book, the subTotal, then the Total including tax', '',
  ].join(nl)));

  reject(L.messy, 'operators still crammed together', 'r7',
    edit(S, 'const subtotal = unitPrice * quantity;', 'const subtotal = unitPrice*quantity;'));
  reject(L.messy, 'rate is not a constant', 'r1',
    edit(S, 'const TAX_RATE = 0.0725;', 'let taxRate = 0.0725;'));
  reject(L.messy, 'rate holds text', 'r1',
    edit(S, 'const TAX_RATE = 0.0725;', 'const TAX_RATE = "high";'));
  reject(L.messy, 'fewer than four comments', 'r8',
    { ...S, 'script.js': S['script.js'].replace(/ \/\/ [^\n]*/g, '') });
  reject(L.messy, 'README left as empty headings', 'r9',
    readme(read(`lessons/${L.messy}/README.md`)));
  reject(L.messy, 'README never mentions the tax rate', 'r10',
    readme(S['README.md'].replace(/tax/gi, 'extra')));
  reject(L.messy, 'total ignores the rate', 'r5',
    edit(S, total, 'const orderTotal = subtotal; // no tax yet'));
}


// ---------------------------------------------------------------- unit 1.4
// Three one-word-answer labs. Each requirement is pinned to an ordinal --
// r3 means "the THIRD answer", not "the word appears somewhere". Before that,
// every pattern searched the whole file, so a student who mapped every job to
// the wrong language still scored full marks. The swap cases below are what
// hold that shut; they passed before the fix.
//
// The ordinal counts ANSWER-CARRYING console.log calls, not every call, so a
// header, a label or a leftover debug print does not shift the answers under
// it. Both halves are load-bearing and both are measured here: relax the
// counting to "appears somewhere" and the swap cases go green; count every
// call again and the label cases go red.
{
  const labs = [
    { id: L.match, answers: ['SQL', 'Swift', 'C', 'JavaScript', 'Python'] },
    { id: L.structure, answers: ['sequence', 'selection', 'repetition', 'selection and repetition'] },
    { id: L.snippet, answers: ['procedural', 'object-oriented', 'functional', 'multi-paradigm'] },
  ];

  for (const { id, answers } of labs) {
    const log = (q, a) => `console.log(${q}${a}${q});`;
    const inOrder = (list) => ({ 'script.js': list.map((a) => log('"', a)).join(nl) });
    accept(id, 'answers in double quotes',
      { 'script.js': answers.map((a) => log('"', a)).join(nl) });
    accept(id, 'answers in single quotes',
      { 'script.js': answers.map((a) => log(AP, a)).join(nl) });
    // taught at 1.2.13, refused by every one of these labs until 2026-08-24
    accept(id, 'answers in backticks (taught in 1.2.13)',
      { 'script.js': answers.map((a) => log(BT, a)).join(nl) });
    accept(id, 'answers logged with spacing round the call',
      { 'script.js': answers.map((a) => `console.log( "${a}" );`).join(nl) });

    reject(id, 'one answer missing', null,
      { 'script.js': answers.slice(0, -1).map((a) => log('"', a)).join(nl) });
    reject(id, 'answers written as bare comments', null,
      { 'script.js': answers.map((a) => `// ${a}`).join(nl) });

    // Every answer present, every one under the wrong step. This scored full
    // marks until the requirements were bound to ordinal console.log calls.
    const swapped = answers.slice();
    [swapped[0], swapped[answers.length - 1]] = [swapped[answers.length - 1], swapped[0]];
    reject(id, 'first and last answers swapped', 'r1', inOrder(swapped));

    const rotated = answers.slice(1).concat(answers[0]);
    reject(id, 'every answer shifted one step', 'r1', inOrder(rotated));

    reject(id, 'answers reversed', 'r1', inOrder(answers.slice().reverse()));

    // This used to be a reject, pinned as "[cost of binding]": the ordinal
    // counted EVERY console.log, so a chatty header shifted all the answers by
    // one and failed all of them at once. The comment predicted a student
    // would rediscover it, and one did.
    //
    // The ordinal now counts only ANSWER-CARRYING logs, so the binding above
    // still holds — swapped, rotated and reversed answers are all still
    // rejected at r1 — while output that answers nothing is ignored. That
    // matters most for the labelled style 1.4.18 teaches two lessons before
    // 1.4.20: console.log("hot days: ", hot).
    accept(id, 'a header log before the answers',
      { 'script.js': [`console.log("My answers:");`, ...answers.map((a) => log('"', a))].join(nl) });
    accept(id, 'a label log before each answer',
      { 'script.js': answers.flatMap((a, i) => [`console.log("STEP ${i + 1}:");`, log('"', a)]).join(nl) });
    accept(id, 'answers logged with a label argument (the 1.4.18 style)',
      { 'script.js': answers.map((a, i) => `console.log("STEP ${i + 1}: ", "${a}");`).join(nl) });

    // Corrupt one answer at a time: the requirement that fails must be the one
    // for THAT position. A swap case only proves "something failed", so an
    // off-by-one in the ordinal counting would slip past it silently.
    const reqIds = lesson(id).requirements.map((r) => r.id);
    answers.forEach((_, i) => {
      const a = answers.slice();
      a[i] = 'wrongword';
      reject(id, `only answer ${i + 1} wrong`, reqIds[i], inOrder(a));
    });
  }

  // 1.4.20 already tolerated a space for the hyphen; keep it that way.
  accept(L.snippet, 'hyphenated answers written with a space', { 'script.js': [
    'console.log("procedural");',
    'console.log("object oriented");',
    'console.log("functional");',
    'console.log("multi paradigm");',
  ].join(nl) });

  // 1.4.12 step 4 wants both names in ONE string, selection first.
  accept(L.structure, 'both structures in one string, comma instead of "and"', { 'script.js': [
    'console.log("sequence");',
    'console.log("selection");',
    'console.log("repetition");',
    'console.log("selection, then repetition");',
  ].join(nl) });
  reject(L.structure, 'step 4 logged as two separate calls', 'r4', { 'script.js': [
    'console.log("sequence");',
    'console.log("selection");',
    'console.log("repetition");',
    'console.log("selection");' + nl + 'console.log("repetition");',
  ].join(nl) });
}


// -------------------------------------------- audit sweep, 2026-08-24
// Found by scripts/audit-grader-tolerance.mjs across all 121 regex-graded
// lessons. Pinned here because the auditor only reports -- this is what
// stops them coming back.
{
  const anyQuote = [
    '1-1-3-first-statement',
    '1-1-7-classify-the-task',
    '1-1-11-name-that-umbrella',
    '1-2-10-lab-predict-the-number',
    '2-5-9-lab-what-runs',
    '2-5-20-lab-after-a-throw',
    '2-5-25-lab-predict-try-catch-finally',
  ];
  for (const id of anyQuote) {
    const S = solutionFiles(id);
    accept(id, 'reference solution', S);
    // 1.2.13 teaches template literals; these graders took only "double".
    accept(id, 'strings written as template literals', {
      ...S,
      'script.js': S['script.js'].replace(/"([^"\\\n]*)"/g,
        (m, inner) => (inner.includes('${') || inner.includes(BT) ? m : BT + inner + BT)),
    });
  }

  // Automatic semicolon insertion makes a bare `break` / `continue` valid, so
  // demanding the semicolon failed students writing correct JavaScript.
  for (const id of ['2-4-12-lab-break-square', '2-4-19-lab-multiples-of-three',
                    '6-6-24-a16-2-game-states']) {
    const S = solutionFiles(id);
    accept(id, 'reference solution', S);
    accept(id, 'break/continue without a semicolon', {
      ...S,
      'script.js': S['script.js'].replace(/\b(break|continue)[ \t]*;/g, '$1'),
    });
  }

  // r3 was type:"inFunction" AND re-matched `function draw() {` -- the header
  // checkInFunction had already stripped. It could not pass for anybody; the
  // reference solution calls background() in draw() and scored 4/5.
  accept('5-1-23-challenges', 'reference solution now passes its own grader',
    solutionFiles('5-1-23-challenges'));
}

// ---------------------------------------------------------------- run
try {
  execFileSync(
    process.execPath,
    [
      path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
      'lib/grader.ts',
      '--outDir', out,
      '--module', 'commonjs',
      '--target', 'es2022',
      '--skipLibCheck',
    ],
    { cwd: root, stdio: 'inherit' },
  );
  writeFileSync(path.join(out, 'package.json'), '{"type":"commonjs"}');

  const require = createRequire(import.meta.url);
  const { grade } = require(path.join(out, 'grader.js').replace(/\\/g, '/'));

  const reqsFor = new Map();
  let failures = 0;

  for (const c of cases) {
    if (!reqsFor.has(c.id)) reqsFor.set(c.id, lesson(c.id).requirements);
    const requirements = reqsFor.get(c.id);
    const report = grade(requirements, c.files, 0);
    const failed = report.results.filter((r) => r.status === 'failed');
    const short = c.id.replace(/^(\d+-\d+-\d+).*$/, '$1');

    let ok;
    let detail = '';
    if (c.expect === 'pass') {
      ok = failed.length === 0;
      if (!ok) detail = `lost ${failed.map((f) => f.id).join(', ')}`;
    } else if (c.req) {
      ok = failed.some((f) => f.id === c.req);
      if (!ok) {
        detail = failed.length
          ? `expected ${c.req} to fail, ${failed.map((f) => f.id).join(', ')} did`
          : `expected ${c.req} to fail, everything passed`;
      }
    } else {
      ok = failed.length > 0;
      if (!ok) detail = 'expected some requirement to fail, everything passed';
    }

    if (!ok) {
      failures++;
      console.log(`  FAIL  ${short}  ${c.expect === 'pass' ? 'accept' : 'reject'}: ${c.name}  -- ${detail}`);
    }
  }

  const accepts = cases.filter((c) => c.expect === 'pass').length;
  if (failures === 0) {
    console.log(
      `grader tolerance: ${cases.length} cases OK ` +
      `(${accepts} accepted, ${cases.length - accepts} rejected)`,
    );
  } else {
    console.log(`grader tolerance: ${failures} of ${cases.length} cases wrong`);
    process.exit(1);
  }
} finally {
  rmSync(out, { recursive: true, force: true });
}
