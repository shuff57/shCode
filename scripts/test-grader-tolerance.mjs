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
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
mkdirSync(path.join(root, 'node_modules', '.pkg-load-cache'), { recursive: true });
const out = mkdtempSync(path.join(root, 'node_modules', '.pkg-load-cache', 'shcode-tolerance-'));

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
  roundup: '1-2-25-lab-typeof-round-up',
  settle:  '1-5-37-lab-settle-it-in-the-console',
  countLetter: '2-2-17b-lab-count-a-letter',
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

// ---------------------------------------------------------------- 2.2.20
//
// This lab has been widened twice and tightened once, which is exactly the
// shape that loses a fix. The advanced-student lens found it scoring 4/4 with
// the loop body EMPTY -- r3 matched `count = count + 1` anywhere in the file,
// so an increment after the loop satisfied "the counter goes up inside the if"
// and the program printed 1 for a word with three r's. r3 was tightened to
// require the increment inside the if body.
//
// Then r2 and r3 were widened again, to accept clarifying parentheses and
// backticks. A widening is precisely how the earlier tightening gets undone by
// accident, so the gaming answer is pinned here alongside the shapes that must
// keep passing. If a future relaxation lets it back in, this fails.
{
  const C = L.countLetter;
  const loopHead = `for (let i = 0; i < word.length; i++) {${nl}`;
  const head = `let word = "strawberry";${nl}let count = 0;${nl}`;
  const tail = `${nl}console.log(count);${nl}`;

  accept(C, 'clarifying parentheses around the test', {
    'script.js': head + loopHead
      + `  if ((word[i] === "r")) {${nl}    count = count + 1;${nl}  }${nl}}` + tail,
  });
  accept(C, 'count++ rather than the longhand', {
    'script.js': head + loopHead
      + `  if (word[i] === "r") {${nl}    count++;${nl}  }${nl}}` + tail,
  });
  accept(C, 'var throughout, single-quoted letter, += 1', {
    'script.js': `var word = ${AP}strawberry${AP};${nl}var count = 0;${nl}`
      + `for (var i = 0; i < word.length; i++) {${nl}`
      + `  if (word[i] === ${AP}r${AP}) {${nl}    count += 1;${nl}  }${nl}}` + tail,
  });
  accept(C, 'brace on its own line', {
    'script.js': head + `for (let i = 0; i < word.length; i++)${nl}{${nl}`
      + `  if (word[i] === "r")${nl}  {${nl}    count = count + 1;${nl}  }${nl}}` + tail,
  });

  // Prints 1 for a word with three r's. Must lose r3, not score 4/4.
  reject(C, 'empty if body, increment after the loop', 'r3', {
    'script.js': head + loopHead + `  if (word[i] === "r") {}${nl}}${nl}`
      + 'count = count + 1;' + tail,
  });
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
    edit(S, 'const maxStudents = 30;', 'const maxStudents = 15 * 2;'));
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
  reject(L.fix10, 'maxStudents left as let', 'r5',
    edit(S, 'const maxStudents = 30;', 'let maxStudents = 30;'));
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

// ---------------------------------------------------------------- 1.2.25
// Report #9: a completely correct answer that omitted semicolons failed FIVE
// of the six requirements. Every variable-route pattern demanded a trailing
// `;` and refused `var`, but semicolons are optional in JavaScript and `var`
// is still legal. The accept cases below are the reproduction; the reject
// cases keep the real objective shut -- `typeof <theObjectVariable>`, and an
// undefined check a student who never mentions undefined cannot satisfy.
{
  const lines = [
    'let s = "hi"',
    'console.log(typeof s)',
    'let n = 5',
    'console.log(typeof n)',
    'let b = true',
    'console.log(typeof b)',
    'let u',
    'console.log(typeof u)',
    'let z = null',
    'console.log(typeof z)',
    'let o = { name: "Sarah" }',
    'console.log(typeof o)',
  ];
  const base = { 'script.js': lines.join(nl) };
  const dropLine = (gone) => lines.filter((l) => l !== gone);

  accept(L.roundup, 'variable route with no semicolons', base);
  accept(L.roundup, 'var throughout',
    { 'script.js': lines.map((l) => l.replace(/\blet\b/g, 'var')).join(nl) });
  accept(L.roundup, 'variable route with semicolons',
    { 'script.js': lines.map((l) => (l.startsWith('let ') ? l + ';' : l)).join(nl) });
  accept(L.roundup, 'multi-line object literal', { 'script.js': [
    ...dropLine('let o = { name: "Sarah" }').slice(0, -1),
    'let o = {',
    '  tall: 6',
    '}',
    'console.log(typeof o)',
  ].join(nl) });

  reject(L.roundup, 'typeof of a property name, not the object', 'r6',
    { 'script.js': base['script.js'].replace('console.log(typeof o)', 'console.log(typeof tall)') });
  reject(L.roundup, 'undefined never checked', 'r4',
    { 'script.js': dropLine('let u').filter((l) => l !== 'console.log(typeof u)').join(nl) });
}

// ---------------------------------------------------------------- 1.5.37
// Report #12: the "state the rule" comment check only accepted a handful of
// phrasings, so correct comments like "times comes before plus" failed. Each
// rule below is a correct restatement and must pass r3. r4 also needs three
// logs; the third expression of the student's own is a typeof here.
{
  const logs = [
    'console.log(2 + 2 * 3)',
    'console.log((2 + 2) * 3)',
    'console.log(typeof "x")',
  ].join(nl);
  const rules = [
    'you do multiplication before addition',
    'the brackets make the addition happen first',
    'times comes before plus',
    'multiply first, then add',
    'PEMDAS',
  ];
  for (const rule of rules) {
    accept(L.settle, `rule phrased as: ${rule}`, { 'script.js': `// ${rule}${nl}${logs}` });
  }
  reject(L.settle, 'three logs but no rule stated', 'r3',
    { 'script.js': `// here are my answers${nl}${logs}` });
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
  const total = 'const orderTotal = subtotal + subtotal * taxRate; // price after tax is added';
  const readme = (body) => ({ ...S, 'README.md': body });

  accept(L.messy, 'tax kept in its own named variable',
    edit(S, total,
      `const tax = subtotal * taxRate; // the sales tax owed on this order${nl}` +
      'const orderTotal = subtotal + tax; // price after tax is added'));
  accept(L.messy, 'tax written first in the sum',
    edit(S, total, 'const orderTotal = taxRate * subtotal + subtotal; // price after tax'));
  accept(L.messy, 'total as subtotal * (1 + taxRate)',
    edit(S, total, 'const orderTotal = subtotal * (1 + taxRate); // price after tax is added'));
  accept(L.messy, 'title contains an apostrophe',
    edit(S, 'const bookTitle = "The Hobbit";',
      `const bookTitle = "Harry Potter and the Philosopher${AP}s Stone";`));
  accept(L.messy, 'rate written as a division',
    edit(S, 'const taxRate = 0.0725;', 'const taxRate = 7.25 / 100;'));
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
    edit(S, 'const taxRate = 0.0725;', 'let taxRate = 0.0725;'));
  reject(L.messy, 'rate holds text', 'r1',
    edit(S, 'const taxRate = 0.0725;', 'const taxRate = "high";'));
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

// ---------------------------------------------------------------- units 3.2 / 3.3 labs
//
// Found by blind student lenses (2026-10-06): the 3.x labs graded the SHAPE of
// the reference answer from text anywhere in the file, so a console.log of a
// string that merely contained `function findMax(` scored full marks, a
// hard-coded `return 0` passed, and an untouched starter could come close.
// Their requirements now set `ignoreStrings` (grader blanks string contents),
// look inside the function they name, and check that the work is done.
// Every reject below names the requirement it must lose.
{
  const js = (...lines) => ({ 'script.js': lines.join(nl) + nl });
  const T = {
    fm: '3-1-8-lab-findmax-iseven', sum: '3-1-9-lab-sum-to-n',
    guard: '3-2-12-lab-guard-clause', fix: '3-2-15-lab-fix-print-not-return',
    comp: '3-2-19-lab-compose-functions', scope: '3-2-21-lab-scope-prediction',
    upd: '3-3-4-lab-update-by-index', q: '3-3-7-lab-shift-unshift-queue',
    sa: '3-2-5-lab-sum-array', filt: '3-3-14-lab-filter-function',
    nest: '3-3-17-lab-nested-array-update', rect: '3-2-7-lab-rectangle-area',
    arr: '3-2-7-arrays',
  };
  for (const id of Object.values(T)) {
    accept(id, 'reference solution', solutionFiles(id));
    reject(id, 'untouched starter', null, starterFiles(id));
    // Every requirement of these labs must ignore string contents, or the
    // smuggle cases below stop meaning anything.
    reject(id, 'every token only inside a string literal', null, js(
      'console.log("function findMax( function isEven( function sumToN( function divide( function area( return x for( .length console.log( .push( .shift( .pop( if (a === b) [[1]][0] scores[0] = 1");',
      `console.log(${BT}function triple( function addSeven( function findRectangleArea( let score let label${BT});`));
  }

  // Dead code must not count: a guard whose condition is a constant, a loop that never runs.
  reject(T.guard, 'a guard if with a constant condition', null, js(
    'function divide(a, b) {', '  if (false) { return 1; }', '  return 2;', '}',
    'console.log(divide(1, 2));', 'console.log(divide(1, 0));'));
  reject(T.sum, 'a loop that can never run', null, js(
    'function sumToN(n) {', '  let total = 0;', '  for (; 0; ) { total += 1; }', '  return total;', '}',
    'console.log(sumToN(5));'));

  // 3.2.22 findMax / isEven
  accept(T.fm, 'ternary and boolean one-liners', js(
    'function findMax(a, b) { return a > b ? a : b; }', 'function isEven(n) { return n % 2 === 0; }',
    'console.log(findMax(3, 7));', 'console.log(isEven(4));'));
  accept(T.fm, 'Math.max and return( with no space', js(
    'function findMax(a, b) {', '  return(Math.max(a, b));', '}', 'function isEven(n) {', '  return(n % 2 === 0);', '}',
    'console.log(findMax(3, 7), isEven(4));'));
  accept(T.fm, 'braceless if and !(n % 2)', js(
    'function findMax(a,b){', '  if (a>b) return a', '  return b', '}', 'function isEven(n){', '  return !(n%2)', '}'));
  reject(T.fm, 'hard-coded returns compare nothing', 'r4', js('function findMax(){return 0}', 'function isEven(){return 0}'));
  reject(T.fm, 'isEven without the remainder operator', 'r5', js(
    'function findMax(a, b) { return Math.max(a, b); }', 'function isEven(n) { return true; }'));
  reject(T.fm, 'function names in the wrong case', 'r1', js('function FINDMAX(){return 1}', 'function iseven(){return 1}'));

  // 3.2.23 sumToN
  accept(T.sum, 'brace-less loop with +=', js(
    'function sumToN(n) {', '  let total = 0;', '  for (let i = 1; i <= n; i += 1) total += i;', '  return total;', '}', 'console.log(sumToN(5));'));
  accept(T.sum, 'i + sum and return(sum)', js(
    'function sumToN(n) {', '  let sum = 0;', '  for (let i = 1; i <= n; i++) { sum = i + sum; }', '  return(sum);', '}'));
  reject(T.sum, 'empty for and a hard-coded return', 'r4', js('function sumToN(n){for(;0;){}return 15}'));
  reject(T.sum, 'decorative for, Gauss formula', 'r4', js('function sumToN(n){for(let i=0;i<0;i++){}', ' return n*(n+1)/2}'));

  // 3.2.12 guard clause
  accept(T.guard, 'brace-less guard with !b', js(
    'function divide(a, b) {', '  if (!b) return "Cannot divide by zero";', '  return a / b;', '}',
    'console.log(divide(10, 2));', 'console.log(divide(10, 0));'));
  accept(T.guard, 'guard condition with a nested call', js(
    'function divide(a, b) {', '  if (isNaN(b) || b === 0) { return("Cannot divide by zero"); }', '  return(a / b);', '}', 'console.log(divide(1, 0));'));
  reject(T.guard, 'no guard at all', 'r5', js('function divide(a,b){if(0){}return 0}', 'console.log(1)'));
  reject(T.guard, 'if/else instead of a guard', 'r6', js(
    'function divide(a,b){ if (b !== 0) { return a / b; } else { return "no"; } }', 'console.log(divide(1,0));'));

  // 3.2.15 fix print-not-return
  accept(T.fix, 'doubled with 2 * a', js(
    'function area(width, height) {', '  return width * height;', '}', 'const a = area(5, 8);',
    'console.log("One room: " + a);', 'console.log("Two rooms: " + 2 * a);'));
  accept(T.fix, 'doubled with a + a', js(
    'function area(width, height) {', '  return width * height;', '}', 'const a = area(5, 8);',
    'console.log("Two rooms: " + (a + a));'));
  accept(T.fix, 'doubled straight from the call', js(
    'function area(width, height) {', '  return width * height;', '}',
    'console.log("Two rooms: " + area(5, 8) * 2);'));
  accept(T.fix, 'a result variable and return( )', js(
    'function area(width, height) {', '  const result = width * height;', '  return(result);', '}',
    'const a = area(5, 8);', 'console.log(a * 2);'));
  reject(T.fix, 'prints AND returns', 'r2', js(
    'function area(width, height) {', '  console.log(width * height);', '  return width * height;', '}',
    'const a = area(5, 8);', 'console.log("Two rooms: " + (a * 2));'));
  {
    const st = starterFiles(T.fix);
    reject(T.fix, 'starter plus a dummy function that returns', 'r2',
      { 'script.js': st['script.js'] + 'function z(){return 1}' + nl });
    reject(T.fix, 'starter plus the old doubling line (area still prints)', 'r2',
      { 'script.js': st['script.js'] + 'console.log("Two rooms: " + (a * 2));' + nl });
    // The starter once shipped with the doubling line already written.
    if (/\ba\s*\*\s*2/.test(st['script.js'])) throw new Error('3-2-15 starter already contains the doubling line');
  }
  reject(T.fix, 'returns, but the result is only concatenated', 'r3', js(
    'function area(width, height) {', '  return width * height;', '}', 'const a = area(5, 8);',
    'console.log("One room: " + a);'));
  reject(T.fix, 'returns, result only logged', 'r3', js(
    'function area(width, height) {', '  return width * height;', '}', 'const a = area(5, 8);', 'console.log(a);'));

  // 3.2.19 compose (triple / addSeven; deliberately not the reading's double / addTen)
  accept(T.comp, 'spaces and newlines in the nesting', js(
    'function triple(n) { return n * 3; }', 'function addSeven(n) { return n + 7; }',
    'console.log(addSeven(', '  triple(4)', '));', 'console.log(triple( addSeven(4) ));'));
  accept(T.comp, 'n + n + n and 7 + n', js(
    'function triple(n) { return(n + n + n); }', 'function addSeven(n) { return(7 + n); }',
    'console.log(addSeven(triple(4)));', 'console.log(triple(addSeven(4)));'));
  reject(T.comp, 'functions return constants', 'r6', js(
    'function triple(n){return 0}', 'function addSeven(n){return 0}', 'console.log(triple(addSeven(1)));', 'console.log(addSeven(triple(1)));'));
  reject(T.comp, 'addSeven that does not add', 'r7', js(
    'function triple(n){return n*3}', 'function addSeven(n){return n*7}', 'console.log(triple(addSeven(1)));', 'console.log(addSeven(triple(1)));'));
  reject(T.comp, 'only one nesting order', 'r8', js(
    'function triple(n){return n*3}', 'function addSeven(n){return n+7}', 'console.log(addSeven(triple(4)));'));
  reject(T.comp, 'the reading\'s double / addTen, not the lab\'s functions', 'r1', js(
    'function double(n){return n*2}', 'function addTen(n){return n+10}', 'console.log(addTen(double(5)));', 'console.log(double(addTen(5)));'));

  // 3.2.21 scope prediction
  if (!lesson(T.scope).grading.expectsRuntimeError) {
    throw new Error('3-2-21 must set grading.expectsRuntimeError: its answer ends in an uncaught ReferenceError');
  }
  accept(T.scope, 'no semicolons', js(
    'let score = 5', 'function showScore() {', '  console.log(score)', '}', 'function describeScore() {',
    '  let label = "x"', '  console.log(score, label)', '}', 'showScore()', 'describeScore()', 'console.log(label)'));
  accept(T.scope, 'step 4 inside try/catch', js(
    'let score = 42;', 'function showScore() { console.log(score); }',
    'function describeScore() { let label = "pts"; console.log(score, label); }',
    'showScore();', 'describeScore();', 'try { console.log(label); } catch (e) { console.log(e.name); }'));
  accept(T.scope, 'describeScore called first', js(
    'let score = 42;', 'function showScore() { console.log(score); }',
    'function describeScore() { let label = "pts"; console.log(score, label); }',
    'describeScore();', 'showScore();', 'console.log(label);'));
  reject(T.scope, 'label declared globally, not in describeScore', 'r2', js(
    'let score = 1;', 'let label = 2;', 'function showScore() { console.log(score); }',
    'function describeScore() { console.log(score, label); }', 'showScore();', 'describeScore();', 'console.log(label);'));
  reject(T.scope, 'both functions defined, never called', 'r4', js(
    'let score = 42;', 'function showScore() { console.log(score); }',
    'function describeScore() { let label = "pts"; console.log(score, label); }', 'console.log(label);'));
  reject(T.scope, 'only showScore called', 'r4', js(
    'let score = 42;', 'function showScore() { console.log(score); }',
    'function describeScore() { let label = "pts"; console.log(score, label); }', 'showScore();', 'console.log(label);'));
  reject(T.scope, 'step 4 left out', 'r5', js(
    'let score = 42;', 'function showScore() { console.log(score); }',
    'function describeScore() { let label = "pts"; console.log(score, label); }', 'showScore();', 'describeScore();'));

  // 3.3.4 update by index
  accept(T.upd, 'last item through scores.length - 1', js(
    'let scores = [88, 91, 76, 60];', 'scores[scores.length - 1] = 99;', 'console.log(scores);'));
  accept(T.upd, 'compound assignment and ++', js(
    'let scores = [88, 91, 76, 60];', 'scores[0] += 5;', 'scores[1]++;', 'console.log(scores);'));
  accept(T.upd, 'index from a variable', js(
    'const scores = [88, 91, 76, 60];', 'let i = 0;', 'scores[i + 1] = 100;', 'console.log("Scores:", scores);'));
  reject(T.upd, 'only a string that looks like an assignment', 'r1', js('console.log("scores[0] = 1")'));
  reject(T.upd, 'assigns, but not to scores', 'r1', js('let a=[1,2,3,4];a[0]=2;console.log(a)'));
  reject(T.upd, 'comparisons are not assignments', 'r1', js(
    'let scores = [88, 91, 76, 60];', 'if (scores[0] == 88) {}', 'if (scores[1] === 91) {}', 'console.log(scores);'));
  reject(T.upd, 'push instead of index assignment', 'r1', js(
    'let scores = [88, 91, 76, 60];', 'scores.push(1);', 'console.log(scores);'));
  reject(T.upd, 'two-item array', 'r3', js('let scores = [88, 91];', 'scores[0] = 1;', 'console.log(scores);'));

  // no-op self-assignment is not an update (3.3.4)
  reject(T.upd, 'scores[0] = scores[0] changes nothing', 'r1', js(
    'let scores = [88, 91, 76, 60];', 'scores[0] = scores[0];', 'console.log(scores);'));
  reject(T.upd, 'scores[1] = scores[1] with no semicolon', 'r1', js(
    'let scores = [88, 91, 76, 60];', 'scores[1] = scores[1]', 'console.log(scores);'));
  accept(T.upd, 'an update that reads the old value (scores[0] = scores[0] + 5)', js(
    'let scores = [88, 91, 76, 60];', 'scores[0] = scores[0] + 5;', 'console.log(scores);'));

  // 3.3.7 queue
  accept(T.q, 'push chained over a newline', js(
    'let line = ["ana", "bob"];', 'line', '  .push("cy");', 'const served = line.shift();', 'console.log(served);', 'console.log(line);'));
  accept(T.q, 'shift into a variable declared earlier', js(
    'let line = ["ana", "bob"];', 'let who;', 'line.push("cy");', 'who = line.shift();', 'console.log(who, line);'));
  accept(T.q, 'shift logged directly', js(
    'let line = ["ana", "bob"];', 'line.push("cy");', 'console.log(line.shift());', 'console.log(line);'));
  reject(T.q, 'push and shift on different arrays', 'r1', js(
    'let a = ["x"];', 'let b = ["y"];', 'a.push("z");', 'let s = b.shift();', 'console.log(s);'));
  reject(T.q, 'shift result thrown away', 'r2', js(
    'let line=["a","b"];', 'line.push("c");', 'line.shift();', 'console.log(line);'));
  reject(T.q, 'shift result stored but never logged', 'r2', js(
    'let line=["a","b"];', 'line.push("c");', 'let s = line.shift();', 'console.log(line);'));
  reject(T.q, 'empty array calls', 'r1', js('[].push();', '[].shift();', 'console.log();'));

  // 3.3.9 sum an array
  accept(T.sa, 'for...of', js(
    'let numbers = [10, 25, 7, 42];', 'let total = 0;', 'for (const n of numbers) {', '  total += n;', '}', 'console.log(total);'));
  accept(T.sa, 'reverse loop, brace-less', js(
    'let numbers = [10, 25, 7, 42];', 'let total = 0;', 'for (let i = numbers.length - 1; i >= 0; i--) total += numbers[i];', 'console.log(total);'));
  accept(T.sa, 'total = numbers[i] + total', js(
    'let numbers = [10, 25, 7, 42];', 'let total = 0;', 'for (let i = 0; i < numbers.length; i++) {', '  total = numbers[i] + total;', '}', 'console.log(total);'));
  reject(T.sa, 'empty loop and a hard-coded total', 'r2', js('for(;0;){}', 'console.log(24);'));
  // Counting items is not summing them (found by the gap analysis: `total += 1` passed).
  reject(T.sa, 'adds 1 per item (total += 1)', 'r2', js(
    'let numbers = [10, 25, 7, 42];', 'let total = 0;', 'for (const n of numbers) {', '  total += 1;', '}', 'console.log(total);'));
  reject(T.sa, 'adds 1 per item (total = total + 1), no semicolon', 'r2', js(
    'let numbers = [10, 25, 7, 42];', 'let total = 0;', 'for (let i = 0; i < numbers.length; i++) {', '  total = total + 1', '}', 'console.log(total);'));
  reject(T.sa, 'brace-less loop that adds 1', 'r2', js(
    'let numbers = [10, 25, 7, 42];', 'let total = 0;', 'for (const n of numbers) total += 1', 'console.log(total);'));
  accept(T.sa, 'index loop with total += numbers[i]', js(
    'let numbers = [10, 25, 7, 42];', 'let total = 0;', 'for (let i = 0; i < numbers.length; i++) {', '  total += numbers[i];', '}', 'console.log(total);'));
  reject(T.sa, 'loop body does not accumulate', 'r2', js(
    'let numbers=[1,2,3,4];', 'let total=0;', 'for(let i=0;i<numbers.length;i++){total=7}', 'console.log(total)'));

  // 3.3.14 filter function
  accept(T.filt, 'index loop', js(
    'function doubled(arr){', ' let out=[];', ' for(let i=0;i<arr.length;i++){ out.push(arr[i]*2);}', ' return out;}',
    'let s=[1,2,3];', 'console.log(doubled(s));', 'console.log(s);'));
  accept(T.filt, 'for...of with push(n + n)', js(
    'function doubled(numbers) {', '  let result = [];', '  for (let n of numbers) {', '    result.push(n + n);', '  }', '  return result;', '}',
    'let g=[72,55];', 'console.log(doubled(g));', 'console.log(g);'));
  // 3.3.14 now names the function and the transformation (doubled), so a filter no longer scores.
  reject(T.filt, 'the 3.3.13 filter shape instead of doubled', 't1', js(
    'function passing(scores) {', '  let result = [];', '  for (let s of scores) {', '    if (s >= 60) {', '      result.push(s);', '    }', '  }', '  return result;', '}',
    'let g=[72,55];', 'console.log(passing(g));', 'console.log(g);'));
  reject(T.filt, 'pushes onto the input and returns it', 'r1', js(
    'function bigger(numbers){for(let i=0;i<3;i++){numbers.push(i*2)}', ' return numbers}',
    'let s=[1,2,3];', 'console.log(bigger(s));', 'console.log(s);'));
  reject(T.filt, 'overwrites the input by index', 'r1', js(
    'function bigger(numbers){for(let i=0;i<numbers.length;i++){numbers[i]=numbers[i]*2}', ' return numbers}',
    'let s=[1,2,3];', 'console.log(bigger(s));', 'console.log(s);'));
  reject(T.filt, 'no return in the function', 'r4', js(
    'function bigger(numbers){', ' let r=[];', ' for (let n of numbers) { r.push(n*2); }', '}',
    'console.log(bigger([1]));', 'console.log([1]);'));
  reject(T.filt, 'plain copy: nothing changed or filtered', 'r5', js(
    'function copy(numbers){', ' let r=[];', ' for (let n of numbers) { r.push(n); }', ' return r;', '}',
    'let s=[1,2,3];', 'console.log(copy(s));', 'console.log(s);'));
  reject(T.filt, 'only one array logged', 'r6', js(
    'function bigger(numbers){', ' let r=[];', ' for (let n of numbers) { r.push(n*2); }', ' return r;', '}',
    'console.log(bigger([1,2,3]));'));

  // 3.3.17 nested arrays
  accept(T.nest, 'brace-less nested for...of', js(
    'let grid = [[1, 2], [3, 4]];', 'console.log(grid[1][0]);', 'grid[1][0] = 8;', 'let total = 0;',
    'for (const row of grid)', '  for (const n of row)', '    total += n;', 'console.log(total);'));
  accept(T.nest, 'an if before the inner loop', js(
    'let grid = [[1, 2], [3, 4]];', 'console.log(grid[1][0]);', 'grid[1][0] = 8;', 'let total = 0;',
    'for (let r = 0; r < grid.length; r++) {', '  if (grid[r].length === 0) { continue; }', '  for (let c = 0; c < grid[r].length; c++) {',
    '    total += grid[r][c];', '  }', '}', 'console.log(total);'));
  reject(T.nest, 'two loops side by side, not nested', 'r3', js(
    'let grid = [[1, 2], [3, 4]];', 'console.log(grid[1][0]);', 'grid[1][0] = 8;', 'let total = 0;',
    'for (let r = 0; r < grid.length; r++) {', '  total += grid[r][0];', '}',
    'for (let c = 0; c < 2; c++) {', '  total += grid[0][c];', '}', 'console.log(total);'));

  // 3.3.17: a cell is really updated and a total is really logged
  accept(T.nest, 'update with += and a template-literal total', js(
    'let grid = [[1, 2], [3, 4]];', 'console.log(grid[0][1]);', 'grid[0][1] += 5;', 'let sum = 0;',
    'for (const row of grid) { for (const n of row) { sum += n; } }', 'console.log(' + BT + 'Total: ${sum}' + BT + ');'));
  accept(T.nest, 'update with ++ and sum = n + sum', js(
    'let grid = [[1, 2], [3, 4]];', 'console.log(grid[0][0]);', 'grid[1][1]++;', 'let sum = 0;',
    'for (let r = 0; r < grid.length; r++) for (let c = 0; c < grid[r].length; c++) sum = grid[r][c] + sum;', 'console.log("Total", sum);'));
  reject(T.nest, 'a cell written back to itself', 'r5', js(
    'let grid = [[1, 2], [3, 4]];', 'console.log(grid[1][0]);', 'grid[1][0] = grid[1][0];', 'let total = 0;',
    'for (const row of grid) for (const n of row) total += n;', 'console.log(total);'));
  reject(T.nest, 'never updates a cell (only reads)', 'r5', js(
    'let grid = [[1, 2], [3, 4]];', 'console.log(grid[1][0]);', 'let total = 0;',
    'for (let r = 0; r < grid.length; r++) { for (let c = 0; c < grid[r].length; c++) { total += grid[r][c]; } }', 'console.log(total);'));
  reject(T.nest, 'total is computed but never logged', 'r6', js(
    'let grid = [[1, 2], [3, 4]];', 'console.log(grid[1][0]);', 'grid[1][0] = 8;', 'let total = 0;',
    'for (const row of grid) for (const n of row) total += n;', 'console.log(grid);'));
  reject(T.nest, 'nothing is summed (hard-coded total)', 'r6', js(
    'let grid = [[1, 2], [3, 4]];', 'console.log(grid[1][0]);', 'grid[1][0] = 8;', 'for (const row of grid) for (const n of row) {}', 'console.log(15);'));

  // 3.2.7 rectangle area
  accept(T.rect, 'template literal and a negative argument', js(
    'function findRectangleArea(width, height) {', '  const area = width * height;', '  console.log(' + BT + 'Area: ${area}' + BT + ');', '}',
    'findRectangleArea(3, 4);', 'findRectangleArea(-2, 5);'));
  reject(T.rect, 'prints a constant, parameters unused', 'r5', js(
    'function findRectangleArea(a,b){console.log(1)}', 'findRectangleArea(1,2)', 'findRectangleArea(3,4)'));
  reject(T.rect, 'a single call only', 'r4', js(
    'function findRectangleArea(w,h){console.log(w*h)}', 'findRectangleArea(3,4);'));
  reject(T.rect, 'multiplies two numbers, not the parameters', 'r5', js(
    'function findRectangleArea(w,h){console.log("Area: " + 3*4)}', 'findRectangleArea(3,4);', 'findRectangleArea(1,2);'));

  // 3.3.18 arrays capstone: every point is needed to pass (passingScore 55 = the 35 points of the
  // five array tasks + 10 each for the countFruit and longFruits function tests)
  if (lesson(T.arr).grading.passingScore !== 55) throw new Error('3-2-7-arrays passingScore must equal its 55 points');
  const FRUIT_FNS = [
    'function countFruit(fruits, name) { let n = 0; for (const f of fruits) { if (f === name) n++; } return n; }',
    'function longFruits(fruits, minLength) { return fruits.filter((f) => f.length >= minLength); }',
  ];
  accept(T.arr, 'search with a call inside the comparison', js(
    'const fruits=["a","b"];', 'fruits.push("d");', 'fruits.pop();',
    'for (const f of fruits) { if (f.toUpperCase() === "B") { console.log("found"); } }', ...FRUIT_FNS));
  accept(T.arr, 'for index, includes() as the search', js(
    'let fruits=["a","b","c"];', 'fruits.push("d");', 'fruits.pop();',
    'for (let i = 0; i < fruits.length; i++) { console.log(fruits[i]); }', 'console.log(fruits.includes("b"));', ...FRUIT_FNS));
  reject(T.arr, 'the five array tasks done, neither function written', 'req6', js(
    'let fruits=["a","b","c"];', 'fruits.push("d");', 'fruits.pop();',
    'for (let i = 0; i < fruits.length; i++) { console.log(fruits[i]); }',
    'for (const f of fruits) { if (f === "b") { console.log("found"); } }'));
  reject(T.arr, 'hollow: empty array, push, pop, empty loop, empty if', 'req4', js(
    'let a=[];', 'a.push(1);', 'a.pop();', 'for(;0;){}', 'if(1===1){}'));
  reject(T.arr, 'forEach is not the for loop the task asks for', 'req4', js(
    'const a=[1];', 'a.push(2);', 'a.pop();', 'a.forEach(x=>console.log(x));', 'for(const x of a){}', 'if(2===2){}'));
  reject(T.arr, 'a comparison with no search loop around it', 'req5', js(
    'const a=["x"];', 'a.push("y");', 'a.pop();', 'for (const x of a) { console.log(x); }', 'if (1 === 1) { console.log("hi"); }'));
}

// ---------------------------------------------------------------- run
try {
  execFileSync(
    process.execPath,
    [
      path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
      'lib/run-tests-node.ts',
      '--outDir', out,
      '--module', 'commonjs',
      '--target', 'es2022',
      '--skipLibCheck',
    ],
    { cwd: root, stdio: 'inherit' },
  );
  writeFileSync(path.join(out, 'package.json'), '{"type":"commonjs"}');

  const require = createRequire(import.meta.url);
  // gradeWithTests is grade() plus the runtime `tests` cases (lib/run-tests-node.ts);
  // for a lesson with none it is plain grade(), so regex-only lessons behave as before.
  const { gradeWithTests } = require(path.join(out, 'run-tests-node.js').replace(/\\/g, '/'));

  const reqsFor = new Map();
  let failures = 0;

  for (const c of cases) {
    if (!reqsFor.has(c.id)) reqsFor.set(c.id, lesson(c.id).requirements);
    const requirements = reqsFor.get(c.id);
    const report = await gradeWithTests(requirements, c.files, 0);
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

  // ------------------------------------------------- hints on failure
  // Report #9: a student's object answer missed by one token, the check went
  // red with no text next to it, and the grader read as arbitrary. Both
  // renderers already displayed `messages`; grade() hardcoded it empty. This
  // fails if that regresses, or if a 1.2.25 hint is dropped from the lesson.
  let hintFailures = 0;
  {
    const id = '1-2-25-lab-typeof-round-up';
    const reqs = lesson(id).requirements;
    const report = await gradeWithTests(reqs, starterFiles(id), 0);
    // The starter must lose everything, or the loop below checks nothing.
    if (!report.results.some((r) => r.status === 'failed')) {
      hintFailures++;
      console.log('  FAIL  1-2-25  starter passed -- nothing exercised the hint path');
    }
    for (const r of report.results) {
      const authored = reqs.find((q) => q.id === r.id).hint;
      const shown = r.messages.join('');
      if (r.status === 'failed' && shown !== authored) {
        hintFailures++;
        console.log(`  FAIL  1-2-25  ${r.id} failed showing ${JSON.stringify(shown)}, not its hint`);
      }
      if (r.status === 'passed' && shown !== '') {
        hintFailures++;
        console.log(`  FAIL  1-2-25  ${r.id} passed but still showed a hint`);
      }
    }
  }

  const accepts = cases.filter((c) => c.expect === 'pass').length;
  if (failures === 0 && hintFailures === 0) {
    console.log(
      `grader tolerance: ${cases.length} cases OK ` +
      `(${accepts} accepted, ${cases.length - accepts} rejected), hints OK`,
    );
  } else {
    console.log(`grader tolerance: ${failures} of ${cases.length} cases wrong, ${hintFailures} hint problems`);
    process.exit(1);
  }
} finally {
  rmSync(out, { recursive: true, force: true });
}
