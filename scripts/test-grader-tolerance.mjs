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

  // 3.2.26 findMax / isEven
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

  // 3.2.28 sumToN
  accept(T.sum, 'brace-less loop with +=', js(
    'function sumToN(n) {', '  let total = 0;', '  for (let i = 1; i <= n; i += 1) total += i;', '  return total;', '}', 'console.log(sumToN(5));'));
  accept(T.sum, 'i + sum and return(sum)', js(
    'function sumToN(n) {', '  let sum = 0;', '  for (let i = 1; i <= n; i++) { sum = i + sum; }', '  return(sum);', '}'));
  reject(T.sum, 'empty for and a hard-coded return', 'r4', js('function sumToN(n){for(;0;){}return 15}'));
  reject(T.sum, 'decorative for, Gauss formula', 'r4', js('function sumToN(n){for(let i=0;i<0;i++){}', ' return n*(n+1)/2}'));

  // 3.2.15 guard clause
  accept(T.guard, 'brace-less guard with !b', js(
    'function divide(a, b) {', '  if (!b) return "Cannot divide by zero";', '  return a / b;', '}',
    'console.log(divide(10, 2));', 'console.log(divide(10, 0));'));
  accept(T.guard, 'guard condition with a nested call', js(
    'function divide(a, b) {', '  if (isNaN(b) || b === 0) { return("Cannot divide by zero"); }', '  return(a / b);', '}', 'console.log(divide(1, 0));'));
  reject(T.guard, 'no guard at all', 'r5', js('function divide(a,b){if(0){}return 0}', 'console.log(1)'));
  reject(T.guard, 'if/else instead of a guard', 'r6', js(
    'function divide(a,b){ if (b !== 0) { return a / b; } else { return "no"; } }', 'console.log(divide(1,0));'));

  // 3.2.18 fix print-not-return
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

  // 3.2.23 compose (triple / addSeven; deliberately not the reading's double / addTen)
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

  // 3.2.25 scope prediction
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
  // The starter now gives the scores (72, 85, 90, 64) and the lab ends with 77, 85, 90, 70.
  accept(T.upd, 'last item through scores.length - 1', js(
    'let scores = [72, 85, 90, 64];', 'scores[0] = 77;', 'scores[scores.length - 1] = 70;', 'console.log(scores);'));
  accept(T.upd, 'compound assignment', js(
    'let scores = [72, 85, 90, 64];', 'scores[0] += 5;', 'scores[3] += 6;', 'console.log(scores);'));
  accept(T.upd, 'index from a variable', js(
    'const scores = [72, 85, 90, 64];', 'let i = 0;', 'scores[i] = 77;', 'scores[i + 3] = 70;', 'console.log("Scores:", scores);'));
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
    'let scores = [72, 85, 90, 64];', 'scores[0] = scores[0] + 5;', 'scores[3] = scores[3] + 6;', 'console.log(scores);'));

  // 3.3.8 queue
  accept(T.q, 'push chained over a newline', js(
    'let line = ["ana", "bob"];', 'line', '  .push("cy");', 'const served = line.shift();', 'console.log(served);', 'console.log(line);'));
  accept(T.q, 'shift into a variable declared earlier', js(
    'let line = ["ana", "bob"];', 'let served;', 'line.push("cy");', 'served = line.shift();', 'console.log(served, line);'));
  // The regexes still allow logging the shift directly, but the lab asks for a variable called served.
  reject(T.q, 'shift logged directly, no variable called served', 't1', js(
    'let line = ["ana", "bob"];', 'line.push("cy");', 'console.log(line.shift());', 'console.log(line);'));
  reject(T.q, 'push and shift on different arrays', 'r1', js(
    'let a = ["x"];', 'let b = ["y"];', 'a.push("z");', 'let s = b.shift();', 'console.log(s);'));
  reject(T.q, 'shift result thrown away', 'r2', js(
    'let line=["a","b"];', 'line.push("c");', 'line.shift();', 'console.log(line);'));
  reject(T.q, 'shift result stored but never logged', 'r2', js(
    'let line=["a","b"];', 'line.push("c");', 'let s = line.shift();', 'console.log(line);'));
  reject(T.q, 'empty array calls', 'r1', js('[].push();', '[].shift();', 'console.log();'));

  // 3.3.12 sum an array
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

  // 3.3.19 filter function
  accept(T.filt, 'index loop', js(
    'function doubled(arr){', ' let out=[];', ' for(let i=0;i<arr.length;i++){ out.push(arr[i]*2);}', ' return out;}',
    'let s=[1,2,3];', 'console.log(doubled(s));', 'console.log(s);'));
  accept(T.filt, 'for...of with push(n + n)', js(
    'function doubled(numbers) {', '  let result = [];', '  for (let n of numbers) {', '    result.push(n + n);', '  }', '  return result;', '}',
    'let g=[72,55];', 'console.log(doubled(g));', 'console.log(g);'));
  // #57: the doubled value held in a variable first is still a changed value.
  accept(T.filt, 'doubled value held in a variable, then pushed', js(
    'function doubled(numbers) {', '  let result = [];', '  for (let n of numbers) {', '    let a = (n * 2);', '    result.push(a);', '  }', '  return result;', '}',
    'console.log(doubled([2, 4, 5]));', 'console.log([2, 4, 5]);'));
  // 3.3.19 now names the function and the transformation (doubled), so a filter no longer scores.
  reject(T.filt, 'the 3.3.17 filter shape instead of doubled', 't1', js(
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

  // 3.3.22 nested arrays
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

  // 3.3.22: a cell is really updated and a total is really logged
  accept(T.nest, 'update with += and a template-literal total', js(
    'let grid = [[1, 2], [3, 4]];', 'console.log(grid[1][0]);', 'grid[1][0] += 5;', 'let total = 0;',
    'for (const row of grid) { for (const n of row) { total += n; } }', 'console.log(' + BT + 'Total: ${total}' + BT + ');'));
  accept(T.nest, 'update by reading the old cell and total = n + total', js(
    'let grid = [[1, 2], [3, 4]];', 'console.log(grid[1][0]);', 'grid[1][0] = grid[1][0] + 5;', 'let total = 0;',
    'for (let r = 0; r < grid.length; r++) for (let c = 0; c < grid[r].length; c++) total = grid[r][c] + total;', 'console.log("Total", total);'));
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

  // 3.2.9 rectangle area
  accept(T.rect, 'template literal and a negative argument', js(
    'function findRectangleArea(width, height) {', '  const area = width * height;', '  console.log(' + BT + 'Area: ${area}' + BT + ');', '}',
    'findRectangleArea(3, 4);', 'findRectangleArea(-2, 5);'));
  reject(T.rect, 'prints a constant, parameters unused', 'r5', js(
    'function findRectangleArea(a,b){console.log(1)}', 'findRectangleArea(1,2)', 'findRectangleArea(3,4)'));
  reject(T.rect, 'a single call only', 'r4', js(
    'function findRectangleArea(w,h){console.log(w*h)}', 'findRectangleArea(3,4);'));
  reject(T.rect, 'multiplies two numbers, not the parameters', 'r5', js(
    'function findRectangleArea(w,h){console.log("Area: " + 3*4)}', 'findRectangleArea(3,4);', 'findRectangleArea(1,2);'));

  // 3.3.24 arrays capstone: every point is needed to pass (passingScore 55 = the 35 points of the
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

// ---------------------------------------------------------------- audit sweep, 2026-10-18 (batch 1)
//
// The same defect as report #63, found in older labs: a regex hard-coded one way of
// writing a correct answer that the lesson never asked for. Each lab below gets
// the answers that were refused, and a near miss that must still be refused, so a
// widening here cannot quietly turn into "anything passes".
{
  const D = '2-4-4-lab-write-both-loops';
  const sol = solutionFiles(D);
  const loop = (cond, body) => edit(sol, `while (total <= 100) {${nl}  total = total * 2;${nl}}`, `while (${cond}) {${nl}  ${body}${nl}}`);
  accept(D, 'total + total', loop('total <= 100', 'total = total + total;'));
  accept(D, '2 * total', loop('total <= 100', 'total = 2 * total;'));
  accept(D, 'total += total', loop('total <= 100', 'total += total;'));
  accept(D, 'total < 101', loop('total < 101', 'total *= 2;'));
  accept(D, 'not greater than 100', loop('!(total > 100)', 'total = total * 2;'));
  reject(D, 'adds one each pass, not a doubling', 'r2', loop('total <= 100', 'total = total + 1;'));
  reject(D, 'loop that never doubles', 'r2', loop('total <= 100', 'console.log(total); total = 200;'));
}
{
  const D = '2-3-29-a2-3-1-print-settings-advisor';
  const sol = solutionFiles(D);
  accept(D, 'a bracket in the printed text', edit(sol, "console.log('Temperature: 200, Speed: 60');", "console.log('PLA temperature (C): 200, speed (mm/s): 60');"));
  // r9 matches ANY filament case, so the near miss has to take the word out of all four.
  reject(D, 'the word speed only in a comment', 'r9', { 'script.js': sol['script.js'].replace(/, Speed: (\d+)'\);/g, "'); // speed $1") });
}
{
  const D = '1-5-43-lab-debug-the-order-total';
  const sol = solutionFiles(D);
  accept(D, 'discounted = subtotal * 0.9', edit(sol, 'let discounted = subtotal - discount;', 'let discounted = subtotal * 0.9;'));
  accept(D, 'discounted = (1 - rate) * subtotal', edit(sol, 'let discounted = subtotal - discount;', 'let discounted = (1 - discountRate) * subtotal;'));
  accept(D, 'total = tax + discounted', edit(sol, 'let total = discounted + tax;', 'let total = tax + discounted;'));
  reject(D, 'discount added, not taken off', 'r2', edit(sol, 'let discounted = subtotal - discount;', 'let discounted = subtotal + discount;'));
  reject(D, 'tax taken off, not added', 'r3', edit(sol, 'let total = discounted + tax;', 'let total = discounted - tax;'));
}
{
  const D = '2-7-3-ch2-individual-pa-find-and-fix';
  const sol = solutionFiles(D);
  accept(D, 'total = subtotal + shipping + tax', edit(sol, 'let total = beforeTax + tax;', 'let total = subtotal + shipping + tax;'));
  reject(D, 'the misspelled name left in', 'r2', edit(sol, 'let total = beforeTax + tax;', 'let total = beforTax + tax;'));
}
{
  const D = '2-3-26-lab-traffic-light';
  const sol = solutionFiles(D);
  accept(D, 'a comment between the label and the log', edit(sol, "case 'green':\n    console.log('Go');", "case 'green':\n    // go\n    console.log('Go');"));
  accept(D, 'braces around the case body', edit(sol, "case 'red':\n    console.log('Stop');\n    break;", "case 'red': {\n    console.log('Stop');\n    break;\n  }"));
  reject(D, 'the green case has no console.log', 'r2', edit(sol, "case 'green':\n    console.log('Go');", "case 'green':\n    break;\n  case 'unused':\n    console.log('Go');"));
}

// ---------------------------------------------------------------- audit sweep, 2026-10-18 (batch 2)
{
  const D = '1-2-28-a1-2-1-fix-ten-declarations';
  const sol = solutionFiles(D);
  const rename = (name) => ({ 'script.js': sol['script.js'].split('favouriteColour').join(name) });
  accept(D, 'favoriteColor, the American spelling', rename('favoriteColor'));
  accept(D, 'favoriteColour, mixed', rename('favoriteColour'));
  reject(D, 'still snake_case', 'r8', rename('favourite_colour'));
  reject(D, 'lowercase run together', 'r8', rename('favouritecolour'));
}
{
  const D = '1-5-31-a1-5-1-implement-your-plan';
  const sol = solutionFiles(D);
  accept(D, 'comparison stored in a const, then if (flag)',
    edit(sol, 'if (pagesRequested <= creditRemaining) {', 'const canPrint = pagesRequested <= creditRemaining;' + nl + 'if (canPrint) {'));
  reject(D, 'a const that is never compared', 'r4',
    edit(sol, 'if (pagesRequested <= creditRemaining) {', 'const canPrint = true;' + nl + 'if (canPrint) {'));
}
{
  const D = '1-5-37-lab-settle-it-in-the-console';
  const logs = ['console.log(2 + 2 * 3)', 'console.log((2 + 2) * 3)', 'console.log(typeof "x")'].join(nl);
  accept(D, 'Without brackets it is 8, with brackets it is 12',
    { 'script.js': `// Without brackets the answer is 8, with brackets it is 12${nl}${logs}` });
}
{
  const D = '2-1-5-lab-first-if';
  const sol = solutionFiles(D);
  accept(D, '70 <= score, the other way round', edit(sol, 'if (score >= 70) {', 'if (70 <= score) {'));
  reject(D, 'score > 70 leaves out exactly 70', 'r1', edit(sol, 'if (score >= 70) {', 'if (score > 70) {'));
}

// ---------------------------------------------------------------- 5.1.26 (optional math grid)
//
// An optional, ungraded preview of world.origin = 'math'. Lax on purpose: any
// quote style, any spacing, with or without semicolons, any grid spacing and
// any sprite above the centre. What it must still refuse: the mode named only
// in a comment, a comparison instead of an assignment, a sprite below the
// centre, and the overlays called from setup() (they draw for one frame).
{
  const D = '5-1-25-math-grid';
  const sol = solutionFiles(D);
  const origin = `world.origin = ${AP}math${AP};`;
  accept(D, 'reference solution', sol);
  reject(D, 'untouched starter', null, starterFiles(D));
  accept(D, 'double quotes', edit(sol, origin, 'world.origin = "math";'));
  accept(D, 'backticks', edit(sol, origin, `world.origin = ${BT}math${BT};`));
  accept(D, 'no spaces, no semicolon', edit(sol, origin, `world.origin=${AP}math${AP}`));
  accept(D, 'set before new Canvas', edit(edit(sol, origin, ''), 'new Canvas(400, 400);', origin + nl + '  new Canvas(400, 400);'));
  accept(D, 'a different grid spacing', edit(sol, 'showGrid(50);', 'showGrid(25);'));
  accept(D, 'a sprite left of the centre, not stored', edit(sol, 'box = new Sprite(100, 50, 40, 40);', 'new Sprite(-80, 120, 30, 30);'));
  accept(D, 'a decimal y', edit(sol, 'box = new Sprite(100, 50, 40, 40);', 'box = new Sprite(100, 0.5, 40, 40);'));
  reject(D, 'math mode only in a comment', 'r2', edit(sol, origin, `// ${origin}`));
  reject(D, 'a comparison, not an assignment', 'r2', edit(sol, origin, `world.origin === ${AP}math${AP};`));
  reject(D, 'a sprite below the centre', 'r3', edit(sol, 'new Sprite(100, 50, 40, 40)', 'new Sprite(100, -50, 40, 40)'));
  reject(D, 'a sprite on the x axis', 'r3', edit(sol, 'new Sprite(100, 50, 40, 40)', 'new Sprite(100, 0, 40, 40)'));
  reject(D, 'showGrid in setup() only', 'r1', edit(edit(sol, '  showGrid(50);' + nl, ''), origin, origin + nl + '  showGrid(50);'));
  reject(D, 'showMouse in setup() only', 'r4', edit(edit(sol, '  showMouse();' + nl, ''), origin, origin + nl + '  showMouse();'));
}

// ---------------------------------------------------------------- Chapter 5 flagged requirements
//
// The Chapter 5 aiCheck live sample (codehs-review/loop/aicheck-ch5-live-sample.md)
// listed 23 regex requirements that refused a shape the course taught, or let the
// wrong idea through. The AI Check grades these labs when it is reachable; the
// regex is what marks the cards when it is not, so each fix is pinned here: the
// honest shapes that must now pass, and the wrong idea each card must still refuse.
{
  const sol = solutionFiles;
  const starter = starterFiles;
  const A = (name, files) => ({ name, files, expect: 'pass' });
  const R = (name, req, files) => ({ name, files, expect: 'fail', req });
  const run = (id, list) => {
    for (const c of list) {
      if (c.expect === 'pass') accept(id, c.name, c.files);
      else reject(id, c.name, c.req, c.files);
    }
  };

  // 5.1.23 r6
  {
    const id = '5-1-21-a10-1-sprite-playground'; const S = sol(id);
    const line = '  mover.x = 80 + Math.sin(frameCount * 0.05) * 60;';
    run(id, [
      A('reference', S), R('starter', 'r6', starter(id)),
      A('rotation and x nudged every frame', edit(S, line, '  mover.rotation += 2;' + nl + '  mover.x += 1;')),
      A('x = x + 1 longhand', edit(S, line, '  mover.x = mover.x + 1;')),
      A('mover.x++', edit(S, line, '  mover.x++;')),
      A('velocity set once in setup (5.1.18)', edit(edit(S, line, ''), "mover.color = 'orange';", "mover.color = 'orange';" + nl + '  mover.vel.x = 2;')),
      A('rotationSpeed set once in setup', edit(edit(S, line, ''), "mover.color = 'orange';", "mover.color = 'orange';" + nl + '  mover.rotationSpeed = 3;')),
      A('velocity set in draw', edit(S, line, '  mover.vel.y = 1;')),
      A('frameCount-driven, inside a braced if', edit(S, line, '  if (true) {' + nl + '    mover.rotation = frameCount * 2;' + nl + '  }')),
      R('moves only while a key is held', 'r6', edit(S, line, "  if (kb.pressing('m')) mover.x += 2;")),
      R('frameCount line put in setup (runs once)', 'r6', edit(edit(S, line, ''), "mover.color = 'orange';", "mover.color = 'orange';" + nl + '  mover.x = 80 + Math.sin(frameCount * 0.05) * 60;')),
      R('a nudge of zero', 'r6', edit(S, line, '  mover.x += 0;')),
      R('velocity of zero in setup', 'r6', edit(edit(S, line, ''), "mover.color = 'orange';", "mover.color = 'orange';" + nl + '  mover.vel.x = 0;')),
    ]);
  }

  // 5.1.25 r4
  {
    const id = '5-1-23-challenges';
    const base = (body) => ({ 'script.js': [
      'let player;', '', 'function setup() {', '  new Canvas(400, 400);', '  player = new Sprite(200, 200, 40, 40);', "  player.color = 'deepskyblue';", '}', '',
      'function draw() {', "  background('#222');", body, '}', ''].join(nl) });
    run(id, [
      A('reference', sol(id)), R('starter', 'r4', starter(id)),
      A('challenge 1: kb.pressing changes the colour', base("  if (kb.pressing('left')) player.color = 'red';" + nl + "  else player.color = 'deepskyblue';")),
      A('challenge 1 with braces and ||', base("  if (kb.pressing('left') || kb.pressing('right')) {" + nl + "    player.color = 'orange';" + nl + '  } else {' + nl + "    player.color = 'deepskyblue';" + nl + '  }')),
      A('challenge 1: moves and recolours in one block', base("  if (kb.pressing('left')) {" + nl + '    player.vel.x = -3;' + nl + "    player.color = 'red';" + nl + '  } else {' + nl + '    player.vel.x = 0;' + nl + '  }')),
      A('challenge 1 as a ternary', base("  player.color = kb.pressing('left') ? 'red' : 'deepskyblue';")),
      R('keys only move the player', 'r4', base("  if (kb.pressing('left')) player.vel.x = -3;" + nl + '  else player.vel.x = 0;')),
      R('colour set with no key test', 'r4', base("  if (kb.pressing('left')) player.vel.x = -3;" + nl + "  player.color = 'red';")),
    ]);
  }

  // ---------------------------------------------------------------- 5.1 lab batch, 2026-11-03
  // Owner policy: lax. Each card accepts every honest shape the course taught (or that the AI
  // prompt already accepts) and refuses only the wrong idea. A helper function of the student's
  // own counts wherever the card says "in draw()". Since batch 2 (below) the cards are inFunction
  // with `followCalls` (lib/grader.ts): draw() and update(), plus the helpers they CALL, two calls
  // deep, found by linear scans in the grader rather than inside one regex (that cost 20+ s on
  // adversarial input). No pattern here uses lookbehind, and each stays under a few ms on
  // 5000-character adversarial input.

  // 5.1.23 r3-r7: helpers, the arrow-key spellings the AI prompt accepts, the stop shapes (r5),
  // and r6 any name for the mover, which must itself be what changes and must not be the
  // sprite the keys drive.
  {
    const id = '5-1-21-a10-1-sprite-playground'; const S = sol(id);
    const line = '  mover.x = 80 + Math.sin(frameCount * 0.05) * 60;';
    const w = (to) => edit(S, line, to);
    const inSetup = (to) => edit(edit(S, line, ''), "mover.color = 'orange';", "mover.color = 'orange';" + nl + to);
    const keys = "  if      (kb.pressing('a')) player.vel.x = -4;" + nl + "  else if (kb.pressing('d')) player.vel.x =  4;" + nl + "  else                       player.vel.x =  0;" + nl + "  if      (kb.pressing('w')) player.vel.y = -4;" + nl + "  else if (kb.pressing('s')) player.vel.y =  4;" + nl + "  else                       player.vel.y =  0;";
    const label = "  fill('white');" + nl + '  textSize(14);' + nl + "  text('WASD to move the blue sprite', 12, 24);";
    const helpers = (src, above) => {
      const f = edit(edit(edit(src, keys, '  movePlayer();'), line, '  moveMover();'), label, '  drawLabel();');
      const fns = 'function movePlayer() {' + nl + keys + nl + '}' + nl + nl + 'function moveMover() {' + nl + line + nl + '}' + nl + nl + 'function drawLabel() {' + nl + label + nl + '}' + nl;
      return above ? { 'script.js': f['script.js'].replace('function draw() {', fns + nl + 'function draw() {') } : { 'script.js': f['script.js'] + nl + fns };
    };
    const braced = "  if (kb.pressing('a')) {" + nl + '    player.vel.x = -4;' + nl + "  } else if (kb.pressing('d')) {" + nl + '    player.vel.x = 4;' + nl + '  } else {' + nl + '    player.vel.x = 0;' + nl + '  }' + nl + "  if (kb.pressing('w')) {" + nl + '    player.vel.y = -4;' + nl + "  } else if (kb.pressing('s')) {" + nl + '    player.vel.y = 4;' + nl + '  } else {' + nl + '    player.vel.y = 0;' + nl + '  }';
    const rename = (f, a, b) => ({ 'script.js': f['script.js'].split(a).join(b) });
    const four = "  if (kb.pressing('a')) player.vel.x = -4;" + nl + "  if (kb.pressing('d')) player.vel.x = 4;" + nl + "  if (kb.pressing('w')) player.vel.y = -4;" + nl + "  if (kb.pressing('s')) player.vel.y = 4;";
    const frameLabel = (f) => edit(f, "text('WASD to move the blue sprite', 12, 24);", "text('frame ' + frameCount, 12, 24);");
    run(id, [
      A('pos.x = pos.x + 1, the 5.1.9 line', w('  mover.pos.x = mover.pos.x + 1;')),
      A('pos.y = pos.y - 1', w('  mover.pos.y = mover.pos.y - 1;')),
      A('pos.x += 2', w('  mover.pos.x += 2;')),
      A('rotation = frameCount * 2', w('  mover.rotation = frameCount * 2;')),
      A('sin of frameCount on pos.y', w('  mover.pos.y = 200 + sin(frameCount * 0.05) * 80;')),
      A('frameCount through a variable', w('  const t = frameCount * 0.05;' + nl + '  mover.x = 80 + Math.sin(t) * 60;')),
      A('x = frameCount % 500', w('  mover.x = frameCount % 500;')),
      A('velocity from a variable, in setup', edit(inSetup('  mover.vel.x = speed;'), 'let player, mover;', 'let player, mover;' + nl + 'let speed = 2;')),
      A('the mover named enemy', rename(S, 'mover', 'enemy')),
      A('the mover named enemy, velocity in setup', rename(inSetup('  mover.vel.x = 2;'), 'mover', 'enemy')),
      A('keys, mover and label in helpers below draw()', helpers(S, false)),
      A('keys, mover and label in helpers above draw()', helpers(S, true)),
      A('braced key chain, player named hero', rename(edit(S, keys, braced), 'player', 'hero')),
      A('roles swapped: the keys drive mover, player swings', rename(rename(rename(S, 'player', 'TMP'), 'mover', 'player'), 'TMP', 'mover')),
      A('ternary keys ending in 0 (r5)', edit(S, keys, "  player.vel.x = kb.pressing('a') ? -4 : kb.pressing('d') ? 4 : 0;" + nl + "  player.vel.y = kb.pressing('w') ? -4 : kb.pressing('s') ? 4 : 0;")),
      A('set to 0 at the top, then four ifs (r5)', edit(S, keys, '  player.vel.x = 0;' + nl + '  player.vel.y = 0;' + nl + four)),
      A("'ArrowLeft' spellings (r3, r4)", { 'script.js': S['script.js'].replace(/'a'/g, "'ArrowLeft'").replace(/'d'/g, "'ArrowRight'").replace(/'w'/g, "'ArrowUp'").replace(/'s'/g, "'ArrowDown'") }),
      R('the mover line deleted, frameCount only in the label', 'r6', frameLabel(w(''))),
      R('the key-driven player spins, the mover sits still', 'r6', w('  player.rotation = frameCount;')),
      R('braced keys drive hero, the mover sits still', 'r6', rename(edit(w(''), keys, braced), 'player', 'hero')),
      R('a key speeds up the player, the mover sits still', 'r6', edit(w(''), "if      (kb.pressing('a')) player.vel.x = -4;", "if      (kb.pressing('a')) player.vel.x += 0.5;")),
      R('let t = frameCount, nothing moves', 'r6', w('  let t = frameCount;')),
      R('the mover held at a fixed x, frameCount label', 'r6', frameLabel(w('  mover.x = 100;'))),
      R('the mover nudged only in a comment', 'r6', w('  // mover.x += 1;')),
      R('drift: four ifs, nothing sets 0 (r5)', 'r5', edit(S, keys, four)),
      R('set to 0 after the ifs, so it never moves (r5)', 'r5', edit(S, keys, four + nl + '  player.vel.x = 0;' + nl + '  player.vel.y = 0;')),
      R('text() only in setup() (r7)', 'r7', edit(edit(S, "  text('WASD to move the blue sprite', 12, 24);", ''), "mover.color = 'orange';", "mover.color = 'orange';" + nl + "  text('hi', 10, 10);")),
      R('keys read only in setup() (r3)', 'r3', edit(edit(S, keys, ''), "mover.color = 'orange';", "mover.color = 'orange';" + nl + "  if (kb.pressing('a')) player.vel.x = -4;")),
      // #75: with no semicolons, r6 read the line after a key line as part of that key
      // expression, so the mover below it was taken for the sprite the keys drive.
      A('key subtraction, no semicolons, mover on the next line', { 'script.js': edit(S, keys, "  player.vel.x = (kb.pressing('d') - kb.pressing('a')) * 4" + nl + "  player.vel.y = (kb.pressing('s') - kb.pressing('w')) * 4")['script.js'].replace(line, '  mover.x = 80 + Math.sin(frameCount * 0.05) * 60') }),
      A('if/else keys, no semicolons, mover on the next line', { 'script.js': S['script.js'].replace(/;\n/g, '\n') }),
      A('braced keys, no semicolons, unindented mover', { 'script.js': edit(S, keys, braced)['script.js'].replace(/;\n/g, '\n').replace(line.replace(';', ''), line.trim().replace(';', '')) }),
      R('no semicolons: a key nudges the mover on the next line', 'r6', { 'script.js': w("  if (kb.pressing('m'))" + nl + '    mover.x += 2;')['script.js'].replace(/;\n/g, '\n') }),
      R('no semicolons: the mover speed comes from the keys over two lines', 'r6', { 'script.js': w("  mover.vel.x = (kb.pressing('l') -" + nl + "    kb.pressing('j')) * 3")['script.js'].replace(/;\n/g, '\n') }),
    ]);
  }

  // 5.1.20 r3-r6: the lab's steps ask for the else that stops the sprite (s3, and both hints), so
  // r5/r6 now check it: else-to-zero, else if, 0 at the top of draw(), a ternary ending in 0, or
  // a speed worked out from the keys. Four independent ifs (5.1.14's colour model) drift, and fail.
  {
    const id = '5-1-20-moshion-move-keys'; const S = sol(id);
    const keys = "  if      (kb.pressing('a')) player.vel.x = -4;" + nl + "  else if (kb.pressing('d')) player.vel.x =  4;" + nl + "  else                       player.vel.x =  0;" + nl + nl + "  if      (kb.pressing('w')) player.vel.y = -4;" + nl + "  else if (kb.pressing('s')) player.vel.y =  4;" + nl + "  else                       player.vel.y =  0;";
    const k = (to) => edit(S, keys, to);
    const four = "  if (kb.pressing('a')) player.vel.x = -4;" + nl + "  if (kb.pressing('d')) player.vel.x = 4;" + nl + "  if (kb.pressing('w')) player.vel.y = -4;" + nl + "  if (kb.pressing('s')) player.vel.y = 4;";
    const helper = (above) => {
      const f = k('  move();');
      const fn = 'function move() {' + nl + keys + nl + '}' + nl;
      return above ? { 'script.js': f['script.js'].replace('function draw() {', fn + nl + 'function draw() {') } : { 'script.js': f['script.js'] + nl + fn };
    };
    run(id, [
      A('reference', S), R('starter', 'r5', starter(id)),
      A('braced if / else if / else', k("  if (kb.pressing('a')) {" + nl + '    player.vel.x = -4;' + nl + "  } else if (kb.pressing('d')) {" + nl + '    player.vel.x = 4;' + nl + '  } else {' + nl + '    player.vel.x = 0;' + nl + '  }' + nl + "  if (kb.pressing('w')) {" + nl + '    player.vel.y = -4;' + nl + "  } else if (kb.pressing('s')) {" + nl + '    player.vel.y = 4;' + nl + '  } else {' + nl + '    player.vel.y = 0;' + nl + '  }')),
      A('0 at the top of draw(), then four ifs', k('  player.vel.x = 0;' + nl + '  player.vel.y = 0;' + nl + four)),
      A('0 at the top, chained', k('  player.vel.x = player.vel.y = 0;' + nl + four)),
      A('ternaries ending in 0', k("  player.vel.x = kb.pressing('a') ? -4 : (kb.pressing('d') ? 4 : 0);" + nl + "  player.vel.y = kb.pressing('w') ? -4 : (kb.pressing('s') ? 4 : 0);")),
      A('worked out from the keys: (d - a) * 4', k("  player.vel.x = (kb.pressing('d') - kb.pressing('a')) * 4;" + nl + "  player.vel.y = (kb.pressing('s') - kb.pressing('w')) * 4;")),
      A('else if (!a && !d) sets 0', k("  if (kb.pressing('a')) player.vel.x = -4;" + nl + "  else if (kb.pressing('d')) player.vel.x = 4;" + nl + "  else if (!kb.pressing('a') && !kb.pressing('d')) player.vel.x = 0;" + nl + "  if (kb.pressing('w')) player.vel.y = -4;" + nl + "  else if (kb.pressing('s')) player.vel.y = 4;" + nl + "  else if (!kb.pressing('w')) player.vel.y = 0;")),
      A('if (!a && !d) sets 0 after four ifs', k(four + nl + "  if (!kb.pressing('a') && !kb.pressing('d')) player.vel.x = 0;" + nl + "  if (!kb.pressing('w') && !kb.pressing('s')) player.vel.y = 0;")),
      A('else 0.0', k(keys.replace(/= {2}0;/g, '= 0.0;'))),
      A("'ArrowLeft' spellings", { 'script.js': S['script.js'].replace(/'a'/g, "'ArrowLeft'").replace(/'d'/g, "'ArrowRight'").replace(/'w'/g, "'ArrowUp'").replace(/'s'/g, "'ArrowDown'") }),
      A('the keys in a helper below draw()', helper(false)),
      A('the keys in a helper above draw()', helper(true)),
      A('the keys in update()', { 'script.js': S['script.js'].replace(keys, '').replace(/\}\s*$/, '}' + nl + nl + 'function update() {' + nl + keys + nl + '}' + nl) }),
      R('drift: four ifs, nothing sets 0 (x)', 'r5', k(four)),
      R('drift: four ifs, nothing sets 0 (y)', 'r6', k(four)),
      R('the final else left off', 'r5', k("  if (kb.pressing('a')) player.vel.x = -4;" + nl + "  else if (kb.pressing('d')) player.vel.x = 4;" + nl + "  if (kb.pressing('w')) player.vel.y = -4;" + nl + "  else if (kb.pressing('s')) player.vel.y = 4;")),
      R('x stops, y drifts', 'r6', k("  if (kb.pressing('a')) player.vel.x = -4;" + nl + "  else if (kb.pressing('d')) player.vel.x = 4;" + nl + '  else player.vel.x = 0;' + nl + "  if (kb.pressing('w')) player.vel.y = -4;" + nl + "  if (kb.pressing('s')) player.vel.y = 4;")),
      R('0 set after the ifs, so it never moves', 'r5', k(four + nl + '  player.vel.x = 0;' + nl + '  player.vel.y = 0;')),
      R('a ternary with no 0 never stops', 'r5', k("  player.vel.x = kb.pressing('a') ? -4 : 4;" + nl + "  player.vel.y = kb.pressing('w') ? -4 : 4;")),
      R('the 0 only in setup()', 'r5', edit(k(four), "player.color = 'deepskyblue';", "player.color = 'deepskyblue';" + nl + '  player.vel.x = 0;')),
      R('the keys read only in setup() (r3)', 'r3', edit(k('  player.vel.x = 0;'), "player.color = 'deepskyblue';", "player.color = 'deepskyblue';" + nl + "  if (kb.pressing('a')) player.vel.x = -4;")),
    ]);
  }

  // 5.1.19 r1-r3: a ternary ending in 0 and "0 at the top, then independent ifs" stop the sprite too.
  // r3 no longer reads the kb in a ternary as the speed, so a ternary still at 4 is not "your own".
  {
    const id = '5-1-18-lab-else-to-zero'; const S = sol(id);
    const both = "  if (kb.pressing('a')) player.vel.x = -3;" + nl + "  else if (kb.pressing('d')) player.vel.x = 3;" + nl + '  else player.vel.x = 0;' + nl + nl + "  if (kb.pressing('w')) player.vel.y = -3;" + nl + "  else if (kb.pressing('s')) player.vel.y = 3;" + nl + '  else player.vel.y = 0;';
    const b = (to) => edit(S, both, to);
    const four = (n) => `  if (kb.pressing('a')) player.vel.x = -${n};` + nl + `  if (kb.pressing('d')) player.vel.x = ${n};` + nl + `  if (kb.pressing('w')) player.vel.y = -${n};` + nl + `  if (kb.pressing('s')) player.vel.y = ${n};`;
    run(id, [
      A('reference', S), R('starter: still speed 4', 'r3', starter(id)),
      A('a ternary ending in 0', b("  player.vel.x = kb.pressing('d') ? 3 : kb.pressing('a') ? -3 : 0;" + nl + "  player.vel.y = kb.pressing('s') ? 3 : kb.pressing('w') ? -3 : 0;")),
      A('0 at the top, then four ifs', b('  player.vel.x = 0;' + nl + '  player.vel.y = 0;' + nl + four(3))),
      A('(d - a) * 3', b("  player.vel.x = (kb.pressing('d') - kb.pressing('a')) * 3;" + nl + "  player.vel.y = (kb.pressing('s') - kb.pressing('w')) * 3;")),
      A('else 0.0', b(both.replace(/= 0;/g, '= 0.0;'))),
      R('the else lines deleted (drift)', 'r1', b(four(3))),
      R('only the y else deleted', 'r2', edit(S, nl + '  else player.vel.y = 0;', '')),
      R('0 set after the ifs, so it never moves', 'r1', b(four(3) + nl + '  player.vel.x = 0;' + nl + '  player.vel.y = 0;')),
      R('a ternary with no 0 never stops', 'r1', b("  player.vel.x = kb.pressing('d') ? 3 : -3;" + nl + "  player.vel.y = kb.pressing('s') ? 3 : -3;")),
      R('a ternary still at 4', 'r3', b("  player.vel.x = kb.pressing('d') ? 4 : kb.pressing('a') ? -4 : 0;" + nl + "  player.vel.y = kb.pressing('s') ? 4 : kb.pressing('w') ? -4 : 0;")),
      R('0 at the top, still 4', 'r3', b('  player.vel.x = 0;' + nl + '  player.vel.y = 0;' + nl + four(4))),
    ]);
  }

  // 5.1.25 r4: a spin, a frameCount timer, plain shapes (the array-plus-circle trail) and the
  // see-through rgba background trail. r4 reads strings now (ignoreStrings false), because the
  // trail's colour IS a string; a challenge in a helper of the student's own counts too.
  {
    const id = '5-1-23-challenges';
    const base = (body, top = '') => ({ 'script.js': [
      'let player;' + top, '', 'function setup() {', '  new Canvas(400, 400);', '  player = new Sprite(200, 200, 40, 40);', "  player.color = 'deepskyblue';", '}', '',
      'function draw() {', "  background('#222');", body, '}', ''].join(nl) });
    const move = "  if (kb.pressing('left')) player.vel.x = -3;" + nl + '  else player.vel.x = 0;';
    const bg = (to) => ({ 'script.js': base(move)['script.js'].replace("background('#222');", to) });
    const trail = '  trail.push({ x: player.pos.x, y: player.pos.y });' + nl + '  if (trail.length > 20) trail.shift();' + nl + '  for (let i = 0; i < trail.length; i++) {' + nl + "    fill('rgba(255, 255, 255, ' + (i / trail.length) + ')');" + nl + '    circle(trail[i].x, trail[i].y, 6);' + nl + '  }';
    run(id, [
      A('a spin: rotation = frameCount * 2', base('  player.rotation = frameCount * 2;')),
      A('a spin: rotation += 3', base('  player.rotation += 3;')),
      A('a trail: an array drawn with circle()', base(move + nl + trail, nl + 'let trail = [];')),
      A("a trail: background('rgba(34, 34, 34, 0.1)')", bg("background('rgba(34, 34, 34, 0.1)');")),
      A('a trail: rgba in double quotes', bg('background("rgba(0,0,0,0.1)");')),
      A('a frameCount timer', base("  if (frameCount > 120) player.color = 'red';")),
      A('challenge 5 in a helper bob()', { 'script.js': base('  bob();')['script.js'] + nl + 'function bob() {' + nl + '  player.pos.y = 200 + sin(frameCount * 0.05) * 80;' + nl + '}' + nl }),
      A('challenge 3 in a helper above draw()', { 'script.js': base('  showX();')['script.js'].replace('function draw() {', 'function showX() {' + nl + "  text('x: ' + player.pos.x, 10, 20);" + nl + '}' + nl + nl + 'function draw() {') }),
      R('a solid background in another colour', 'r4', bg("background('#111');")),
      R('rgba only in setup()', 'r4', { 'script.js': base(move)['script.js'].replace("player.color = 'deepskyblue';", "player.color = 'deepskyblue';" + nl + "  background('rgba(34, 34, 34, 0.1)');") }),
      R('circle() only in setup()', 'r4', { 'script.js': base(move)['script.js'].replace("player.color = 'deepskyblue';", "player.color = 'deepskyblue';" + nl + '  circle(10, 10, 5);') }),
      R('circle() and frameCount only in a comment', 'r4', base(move + nl + '  // circle(1, 1, 1); frameCount')),
    ]);
  }

  // 5.1.7 r1, r2: a negative or decimal number is a real move or resize; 180.0 and 60.0 are not.
  {
    const id = '5-1-7-lab-one-sprite'; const S = sol(id);
    const w = (args) => edit(S, "  new Sprite(60, 60, 140, 30).color = 'gold';", `  new Sprite(${args}).color = 'gold';`);
    run(id, [
      A('reference', S), R('starter', 'r1', starter(id)),
      A('a negative x', w('-20, 60, 140, 30')),
      A('a decimal x', w('60.5, 60, 140, 30')),
      A('a decimal width', w('60, 60, 140.5, 30')),
      R('180.0, 180.0 is still the centre', 'r1', w('180.0, 180.0, 140, 30')),
      R('a negative x, still 60 by 60', 'r2', w('-20, 60, 60, 60')),
      R('60.0 by 60.0 is still 60 by 60', 'r2', w('-20, 60, 60.0, 60.0')),
    ]);
  }

  // 5.1.26 r3: the y may come from a variable or a sum; 0 * 5 is still on the axis.
  {
    const id = '5-1-25-math-grid'; const S = sol(id);
    const sp = 'box = new Sprite(100, 50, 40, 40);';
    run(id, [
      A('y from a variable', edit(edit(S, sp, 'box = new Sprite(100, y, 40, 40);'), 'let box;', 'let box;' + nl + 'let y = 50;')),
      A('y = 25 * 2', edit(S, sp, 'box = new Sprite(100, 25 * 2, 40, 40);')),
      A('y = height / 4', edit(S, sp, 'box = new Sprite(100, height / 4, 40, 40);')),
      R('0 * 5 is on the axis', 'r3', edit(S, sp, 'box = new Sprite(100, 0 * 5, 40, 40);')),
    ]);
  }

  // ---------------------------------------------------------------- 5.1 lab batch 2, 2026-11-03
  // Owner decisions, each pinned both ways:
  //  1. A misplaced else (`if (left) ...; if (right) ...; else vel.x = 0;`) leaves one key dead,
  //     so the stop cards refuse a direction undone later in the same frame (an else under a
  //     second, separate if, or an unconditional 0 after it). Chains, 0 at the top, ternaries,
  //     a guarded else-if and an else on the FIRST if (which works) all still pass.
  //  2. "Make your sprite once, in setup()": new Sprite( in setup() (or a helper setup() calls)
  //     and no new Sprite( / new Canvas( in draw(), update() or a helper they call.
  //  3. A helper counts only when it is CALLED from draw()/update() (two calls deep).
  //  4. Playground: the mover moves by its own rule (no key test, no copy of the player's
  //     speed), and the stop card needs both axes.
  //  5-7. 5.1.19 follows a called helper; Challenges accepts rotationSpeed once in setup(), a
  //     sprite that grows, pulses or wanders, and reads strings blank except for the rgba trail;
  //     5.1.26 accepts its overlays in a called helper.
  {
    const code = (s) => ({ 'script.js': s });
    // ---- 5.1.20
    {
      const id = '5-1-20-moshion-move-keys'; const S = sol(id);
      const keys = "  if      (kb.pressing('a')) player.vel.x = -4;" + nl + "  else if (kb.pressing('d')) player.vel.x =  4;" + nl + "  else                       player.vel.x =  0;" + nl + nl + "  if      (kb.pressing('w')) player.vel.y = -4;" + nl + "  else if (kb.pressing('s')) player.vel.y =  4;" + nl + "  else                       player.vel.y =  0;";
      const k = (to) => edit(S, keys, to);
      const yChain = "  if (kb.pressing('w')) player.vel.y = -4;" + nl + "  else if (kb.pressing('s')) player.vel.y = 4;" + nl + '  else player.vel.y = 0;';
      const xChain = "  if (kb.pressing('a')) player.vel.x = -4;" + nl + "  else if (kb.pressing('d')) player.vel.x = 4;" + nl + '  else player.vel.x = 0;';
      const misX = "  if (kb.pressing('left'))  player.vel.x = -4;" + nl + "  if (kb.pressing('right')) player.vel.x = 4;" + nl + '  else player.vel.x = 0;';
      const misY = "  if (kb.pressing('up'))    player.vel.y = -4;" + nl + "  if (kb.pressing('down'))  player.vel.y = 4;" + nl + '  else player.vel.y = 0;';
      const helper = (body, name = 'move') => code(k(`  ${name}();`)['script.js'] + nl + `function ${name}() {` + nl + body + nl + '}' + nl);
      const unused = code(k('')['script.js'] + nl + 'function unused() {' + nl + keys + nl + '}' + nl);
      const setupLine = "  player.color = 'deepskyblue';";
      const made = '  player = new Sprite(200, 200, 40, 40);';
      run(id, [
        A('0 at the top, braced ifs with a colour first', k('  player.vel.x = 0;' + nl + '  player.vel.y = 0;' + nl + "  if (kb.pressing('a')) {" + nl + "    player.color = 'red';" + nl + '    player.vel.x = -4;' + nl + '  }' + nl + "  if (kb.pressing('d')) player.vel.x = 4;" + nl + "  if (kb.pressing('w')) player.vel.y = -4;" + nl + "  if (kb.pressing('s')) player.vel.y = 4;")),
        A('two ifs, the second an else if guarded by !a', k("  if (kb.pressing('a')) player.vel.x = -4;" + nl + "  if (kb.pressing('d')) player.vel.x = 4;" + nl + "  else if (!kb.pressing('a')) player.vel.x = 0;" + nl + yChain)),
        A('an else on the FIRST if, a plain if after it (both keys work)', k("  if (kb.pressing('a')) player.vel.x = -4;" + nl + '  else player.vel.x = 0;' + nl + "  if (kb.pressing('d')) player.vel.x = 4;" + nl + "  if (kb.pressing('w')) player.vel.y = -4;" + nl + '  else player.vel.y = 0;' + nl + "  if (kb.pressing('s')) player.vel.y = 4;")),
        A('nested: else { if (d) ... else 0 }', k("  if (kb.pressing('a')) player.vel.x = -4;" + nl + '  else {' + nl + "    if (kb.pressing('d')) player.vel.x = 4;" + nl + '    else player.vel.x = 0;' + nl + '  }' + nl + yChain)),
        A('braced chain, a colour then 0 in the else block', k("  if (kb.pressing('a')) {" + nl + '    player.vel.x = -4;' + nl + "    player.color = 'red';" + nl + "  } else if (kb.pressing('d')) {" + nl + '    player.vel.x = 4;' + nl + '  } else {' + nl + "    player.color = 'deepskyblue';" + nl + '    player.vel.x = 0;' + nl + '  }' + nl + yChain)),
        A('arrow names in double quotes', code(S['script.js'].replace(/'a'/g, '"left"').replace(/'d'/g, '"right"').replace(/'w'/g, '"up"').replace(/'s'/g, '"down"'))),
        A('two levels: draw -> controls -> moveX / moveY', code(k('  controls();')['script.js'] + nl + 'function controls() {' + nl + '  moveX();' + nl + '  moveY();' + nl + '}' + nl + 'function moveX() {' + nl + xChain + nl + '}' + nl + 'function moveY() {' + nl + yChain + nl + '}' + nl)),
        A('a helper with a parameter: steer(player)', code(k('  steer(player);')['script.js'] + nl + 'function steer(p) {' + nl + keys.split('player').join('p') + nl + '}' + nl)),
        A('the sprite made in a helper that setup() calls', edit(edit(S, made, '  makePlayer();'), 'function draw() {', 'function makePlayer() {' + nl + made + nl + '}' + nl + nl + 'function draw() {')),
        A('background() in a helper that draw() calls', edit(edit(S, "  background('#222');", '  wipe();'), 'function draw() {', 'function wipe() {' + nl + "  background('#222');" + nl + '}' + nl + nl + 'function draw() {')),
        R('misplaced else: the left key never works', 'r5', k(misX + nl + yChain)),
        R('misplaced else: the up key never works', 'r6', k(xChain + nl + misY)),
        R('misplaced else, braced', 'r5', k("  if (kb.pressing('a')) {" + nl + '    player.vel.x = -4;' + nl + '  }' + nl + "  if (kb.pressing('d')) {" + nl + '    player.vel.x = 4;' + nl + '  } else {' + nl + '    player.vel.x = 0;' + nl + '  }' + nl + yChain)),
        R('misplaced else, the y ifs in between', 'r5', k("  if (kb.pressing('a')) player.vel.x = -4;" + nl + "  if (kb.pressing('w')) player.vel.y = -4;" + nl + "  if (kb.pressing('d')) player.vel.x = 4;" + nl + '  else player.vel.x = 0;' + nl + "  if (kb.pressing('s')) player.vel.y = 4;" + nl + '  else player.vel.y = 0;')),
        R('two separate ifs, each with an else', 'r5', k("  if (kb.pressing('a')) player.vel.x = -4;" + nl + '  else player.vel.x = 0;' + nl + "  if (kb.pressing('d')) player.vel.x = 4;" + nl + '  else player.vel.x = 0;' + nl + yChain)),
        R('0 at the top, then the misplaced else', 'r5', k('  player.vel.x = 0;' + nl + misX + nl + yChain)),
        R('the right chain, then 0 again after it', 'r5', k(xChain + nl + '  player.vel.x = 0;' + nl + yChain)),
        R('the misplaced else inside a called helper', 'r5', helper(misX + nl + yChain)),
        R('0 first, then a speed with no key test', 'r5', k("  kb.pressing('a');" + nl + "  kb.pressing('w');" + nl + '  player.vel.x = 0;' + nl + '  player.vel.y = 0;' + nl + '  player.vel.x = 4;' + nl + '  player.vel.y = 4;')),
        R('the keys in a helper nobody calls (r3)', 'r3', unused), R('the keys in a helper nobody calls (r4)', 'r4', unused),
        R('the keys in a helper nobody calls (r5)', 'r5', unused), R('the keys in a helper nobody calls (r6)', 'r6', unused),
        R('the keys in a helper only setup() calls', 'r3', edit(code(k('')['script.js'] + nl + 'function move() {' + nl + keys + nl + '}' + nl), setupLine, setupLine + nl + '  move();')),
        R('the helper call only in a comment', 'r5', code(k('  // move();')['script.js'] + nl + 'function move() {' + nl + keys + nl + '}' + nl)),
        R('the sprite made in draw()', 'r8', edit(edit(S, made + nl + setupLine, ''), "  background('#222');", "  background('#222');" + nl + made)),
        R('a second sprite made when a key is pressed', 'r8', edit(S, "  background('#222');", "  background('#222');" + nl + "  if (kb.pressing('space')) new Sprite(100, 100, 10, 10);")),
        R('the canvas made in draw()', 'r8', edit(edit(S, '  new Canvas(400, 400);', ''), "  background('#222');", '  new Canvas(400, 400);' + nl + "  background('#222');")),
        R('the sprite made in a helper that draw() calls', 'r8', code(edit(edit(S, made + nl + setupLine, ''), "  background('#222');", "  background('#222');" + nl + '  spawn();')['script.js'] + nl + 'function spawn() {' + nl + made + nl + '}' + nl)),
        R('a helper called from setup() AND draw()', 'r8', code(edit(edit(S, made, '  spawn();'), "  background('#222');", "  background('#222');" + nl + '  spawn();')['script.js'] + nl + 'function spawn() {' + nl + made + nl + '}' + nl)),
        R('no sprite at all', 'r8', edit(S, made, '')),
        R('the sprite only inside a string', 'r8', edit(S, made, "  let s = 'new Sprite(1, 2)';")),
      ]);
    }

    // ---- 5.1.23 Playground
    {
      const id = '5-1-21-a10-1-sprite-playground'; const S = sol(id);
      const line = '  mover.x = 80 + Math.sin(frameCount * 0.05) * 60;';
      const w = (to) => edit(S, line, to);
      const keys = "  if      (kb.pressing('a')) player.vel.x = -4;" + nl + "  else if (kb.pressing('d')) player.vel.x =  4;" + nl + "  else                       player.vel.x =  0;" + nl + "  if      (kb.pressing('w')) player.vel.y = -4;" + nl + "  else if (kb.pressing('s')) player.vel.y =  4;" + nl + "  else                       player.vel.y =  0;";
      const label = "  fill('white');" + nl + '  textSize(14);' + nl + "  text('WASD to move the blue sprite', 12, 24);";
      const frameLabel = (f) => edit(f, "text('WASD to move the blue sprite', 12, 24);", "text('frame ' + frameCount, 12, 24);");
      const unused = code(edit(edit(edit(S, keys, ''), line, ''), label, '')['script.js'] + nl + 'function unused() {' + nl + keys + nl + line + nl + label + nl + '}' + nl);
      const both = "  if (kb.pressing('a')) {" + nl + '    player.vel.x = -4;' + nl + '    mover.vel.x = -4;' + nl + "  } else if (kb.pressing('d')) {" + nl + '    player.vel.x = 4;' + nl + '    mover.vel.x = 4;' + nl + '  } else {' + nl + '    player.vel.x = 0;' + nl + '    mover.vel.x = 0;' + nl + '  }' + nl + "  if (kb.pressing('w')) player.vel.y = -4;" + nl + "  else if (kb.pressing('s')) player.vel.y = 4;" + nl + '  else player.vel.y = 0;';
      const sprites = '  player = new Sprite(250, 200, 40, 40);' + nl + "  player.color = 'deepskyblue';" + nl + '  mover = new Sprite(80, 200, 30, 30);' + nl + "  mover.color = 'orange';";
      run(id, [
        A('++mover.x', w('  ++mover.x;')),
        A('frameCount through a variable, no sin', w('  let t = frameCount;' + nl + '  mover.x = t % 500;')),
        A('an orbit around the player worked out from frameCount', w('  mover.x = player.x + cos(frameCount * 0.05) * 60;' + nl + '  mover.y = player.y + sin(frameCount * 0.05) * 60;')),
        A('a velocity set in a helper that setup() calls', edit(edit(edit(S, line, ''), "mover.color = 'orange';", "mover.color = 'orange';" + nl + '  launch();'), 'function draw() {', 'function launch() {' + nl + '  mover.vel.x = 2;' + nl + '}' + nl + nl + 'function draw() {')),
        A('a template-string label', edit(S, "text('WASD to move the blue sprite', 12, 24);", 'text(`frame ${frameCount}`, 12, 24);')),
        A('background() in a helper that draw() calls', edit(edit(S, "  background('#222');", '  wipe();'), 'function draw() {', 'function wipe() {' + nl + "  background('#222');" + nl + '}' + nl + nl + 'function draw() {')),
        R('mover.x = start (a variable), frameCount in the label', 'r6', frameLabel(edit(w('  mover.x = start;'), 'let player, mover;', 'let player, mover;' + nl + 'let start = 80;'))),
        R('let t = frameCount; mover.x = 80', 'r6', w('  let t = frameCount;' + nl + '  mover.x = 80;')),
        R('a nudge of 0.0', 'r6', w('  mover.x += 0.0;')),
        R('the mover copies the player velocity', 'r6', w('  mover.vel.x = player.vel.x;' + nl + '  mover.vel.y = player.vel.y;')),
        R('the mover nudged by the player velocity', 'r6', w('  mover.x += player.vel.x;')),
        R('the mover moved inside the key branches', 'r6', edit(w(''), keys, both)),
        R('the mover nudged inside a braced key if', 'r6', w("  if (kb.pressing('m')) {" + nl + "    mover.color = 'red';" + nl + '    mover.x += 2;' + nl + '  }')),
        R('the mover speed set from a key ternary', 'r6', w("  mover.vel.x = kb.pressing('m') ? 2 : 0;")),
        R('only x stops, y has no else (r5)', 'r5', edit(S, keys, "  if (kb.pressing('a')) player.vel.x = -4;" + nl + "  else if (kb.pressing('d')) player.vel.x = 4;" + nl + '  else player.vel.x = 0;' + nl + "  if (kb.pressing('w')) player.vel.y = -4;" + nl + "  else if (kb.pressing('s')) player.vel.y = 4;")),
        R('misplaced else on x (r5)', 'r5', edit(S, keys, "  if (kb.pressing('a')) player.vel.x = -4;" + nl + "  if (kb.pressing('d')) player.vel.x = 4;" + nl + '  else player.vel.x = 0;' + nl + "  if (kb.pressing('w')) player.vel.y = -4;" + nl + "  else if (kb.pressing('s')) player.vel.y = 4;" + nl + '  else player.vel.y = 0;')),
        R('misplaced else on y (r5)', 'r5', edit(S, keys, "  if (kb.pressing('a')) player.vel.x = -4;" + nl + "  else if (kb.pressing('d')) player.vel.x = 4;" + nl + '  else player.vel.x = 0;' + nl + "  if (kb.pressing('w')) player.vel.y = -4;" + nl + "  if (kb.pressing('s')) player.vel.y = 4;" + nl + '  else player.vel.y = 0;')),
        R('keys, mover and label in a helper nobody calls (r3)', 'r3', unused),
        R('keys, mover and label in a helper nobody calls (r5)', 'r5', unused),
        R('keys, mover and label in a helper nobody calls (r6)', 'r6', unused),
        R('keys, mover and label in a helper nobody calls (r7)', 'r7', unused),
        R('both sprites made in draw()', 'r9', edit(edit(S, sprites, ''), "  background('#222');", "  background('#222');" + nl + '  player = new Sprite(250, 200, 40, 40);' + nl + '  mover = new Sprite(80 + frameCount, 200, 30, 30);')),
        R('the mover made again each frame', 'r9', edit(S, "  background('#222');", "  background('#222');" + nl + '  mover = new Sprite(80, 200, 30, 30);')),
      ]);
    }

    // ---- 5.1.11
    {
      const id = '5-1-11-moshion-intro'; const S = sol(id);
      const made = '  player = new Sprite(200, 200, 40, 40);';
      run(id, [
        A('the sprite made in a helper that setup() calls', edit(edit(S, made, '  makePlayer();'), 'function draw() {', 'function makePlayer() {' + nl + made + nl + '}' + nl + nl + 'function draw() {')),
        A('background() in a helper that draw() calls', edit(edit(S, "  background('#222');", '  paint();'), 'function draw() {', 'function paint() {' + nl + "  background('#222');" + nl + '}' + nl + nl + 'function draw() {')),
        R('the starter (r5)', 'r5', starter(id)),
        R('the sprite made in draw()', 'r5', edit(edit(S, made + nl + "  player.color = 'deepskyblue';", ''), "  background('#222');", "  background('#222');" + nl + made + nl + "  player.color = 'deepskyblue';")),
        R('the canvas made in draw()', 'r5', edit(edit(S, '  new Canvas(400, 400);', ''), "  background('#222');", '  new Canvas(400, 400);' + nl + "  background('#222');")),
        R('the sprite made at the top of the file', 'r5', edit(edit(S, made, ''), 'let player;', 'let player = new Sprite(200, 200, 40, 40);')),
        R('background() in a helper nobody calls', 'r4', edit(edit(S, "  background('#222');", ''), 'function draw() {', 'function paint() {' + nl + "  background('#222');" + nl + '}' + nl + nl + 'function draw() {')),
      ]);
    }

    // ---- 5.1.19
    {
      const id = '5-1-18-lab-else-to-zero'; const S = sol(id);
      const both = "  if (kb.pressing('a')) player.vel.x = -3;" + nl + "  else if (kb.pressing('d')) player.vel.x = 3;" + nl + '  else player.vel.x = 0;' + nl + nl + "  if (kb.pressing('w')) player.vel.y = -3;" + nl + "  else if (kb.pressing('s')) player.vel.y = 3;" + nl + '  else player.vel.y = 0;';
      const b = (to) => edit(S, both, to);
      run(id, [
        A('the whole pattern in a helper draw() calls', code(b('  steer();')['script.js'] + nl + 'function steer() {' + nl + both + nl + '}' + nl)),
        A('the pattern in update()', code(b('')['script.js'] + nl + 'function update() {' + nl + both + nl + '}' + nl)),
        R('the pattern in a helper nobody calls', 'r1', code(b('')['script.js'] + nl + 'function steer() {' + nl + both + nl + '}' + nl)),
        R('the x else put back under the wrong if', 'r1', b("  if (kb.pressing('a')) player.vel.x = -3;" + nl + "  if (kb.pressing('d')) player.vel.x = 3;" + nl + '  else player.vel.x = 0;' + nl + "  if (kb.pressing('w')) player.vel.y = -3;" + nl + "  else if (kb.pressing('s')) player.vel.y = 3;" + nl + '  else player.vel.y = 0;')),
        R('the y else put back under the wrong if', 'r2', b("  if (kb.pressing('a')) player.vel.x = -3;" + nl + "  else if (kb.pressing('d')) player.vel.x = 3;" + nl + '  else player.vel.x = 0;' + nl + "  if (kb.pressing('w')) player.vel.y = -3;" + nl + "  if (kb.pressing('s')) player.vel.y = 3;" + nl + '  else player.vel.y = 0;')),
      ]);
    }

    // ---- 5.1.25 Challenges r4
    {
      const id = '5-1-23-challenges';
      const base = (body, setupExtra = '') => code([
        'let player;', '', 'function setup() {', '  new Canvas(400, 400);', '  player = new Sprite(200, 200, 40, 40);', "  player.color = 'deepskyblue';" + setupExtra, '}', '',
        'function draw() {', "  background('#222');", body, '}', ''].join(nl));
      const move = "  if (kb.pressing('left')) player.vel.x = -3;" + nl + '  else player.vel.x = 0;';
      const bg = (to) => code(base(move)['script.js'].replace("background('#222');", to));
      run(id, [
        A('a spin: rotationSpeed set once in setup()', base(move, nl + '  player.rotationSpeed = 3;')),
        A('a spin: rotationSpeed in draw()', base('  player.rotationSpeed = 2;')),
        A('grow: player.w += 1', base('  player.w += 1;')),
        A('grow while space is held', base("  if (kb.pressing('space')) player.w += 1;")),
        A('pulse: player.scale *= 1.01', base('  player.scale *= 1.01;')),
        A('wander: x += Math.random() * 4 - 2', base('  player.x += Math.random() * 4 - 2;')),
        A('wander: random(-2, 2) on vel', base('  player.vel.x = random(-2, 2);')),
        A('trail: rgba in backticks', bg('background(`rgba(0, 0, 0, 0.2)`);')),
        A('trail: the rgba background in a helper draw() calls', code(bg('fade();')['script.js'] + nl + 'function fade() {' + nl + "  background('rgba(34, 34, 34, 0.1)');" + nl + '}' + nl)),
        A('challenge 3 with round()', base("  text('x: ' + round(player.pos.x), 10, 20);")),
        R('keys move the player by x, nothing else', 'r4', base("  if (kb.pressing('left')) player.x -= 3;")),
        R("text( only inside a string", 'r4', base(move + nl + '  let s = "text(";')),
        R("sin( only inside a string", 'r4', base(move + nl + "  let s = 'sin(frameCount)';")),
        R("background('rgba( only inside a string", 'r4', base(move + nl + "  let s = \"background('rgba(0,0,0,0.1)')\";")),
        R('rotationSpeed 0 in setup()', 'r4', base(move, nl + '  player.rotationSpeed = 0;')),
        R('the challenge in a helper nobody calls', 'r4', code(base(move)['script.js'] + nl + 'function unused() {' + nl + '  player.pos.y = 200 + sin(frameCount * 0.05) * 80;' + nl + '}' + nl)),
      ]);
    }

    // ---- 5.1.26 r1, r4
    {
      const id = '5-1-25-math-grid'; const S = sol(id);
      const two = '  showGrid(50);' + nl + '  showMouse();';
      const helperDef = 'function overlay() {' + nl + two + nl + '}' + nl;
      run(id, [
        A('showGrid and showMouse in a helper draw() calls', code(edit(S, two, '  overlay();')['script.js'] + nl + helperDef)),
        A('the helper written above draw()', edit(edit(S, two, '  overlay();'), 'function draw() {', helperDef + nl + 'function draw() {')),
        R('the overlay helper never called', 'r1', code(edit(S, two, '')['script.js'] + nl + helperDef)),
        R('the overlay helper called only from setup()', 'r4', edit(code(edit(S, two, '')['script.js'] + nl + helperDef), "  box.color = 'deepskyblue';", "  box.color = 'deepskyblue';" + nl + '  overlay();')),
      ]);
    }
  }

  // 5.10.2 r1
  {
    const id = '5-10-defender-2-lab-a-field-of-enemies'; const S = sol(id);
    const two = "  const e = new Sprite(x, y, 30, 30);" + nl + "  e.collider = 'none';";
    run(id, [
      A('reference', S),
      A("'none' as the fifth argument", edit(S, two, "  const e = new Sprite(x, y, 30, 30, 'none');")),
      A('"none" in double quotes as the fifth argument', edit(S, two, '  const e = new Sprite(x, y, 30, 30, "none");')),
      R('sprite left solid', 'r1', edit(S, two, '  const e = new Sprite(x, y, 30, 30);')),
      R("fifth argument 'static'", 'r1', edit(S, two, "  const e = new Sprite(x, y, 30, 30, 'static');")),
    ]);
  }

  // 5.2.23 r3
  {
    const id = '5-2-11-lab-reaching-the-goal'; const S = sol(id);
    run(id, [
      A('reference', S),
      A('goal.remove()', edit(S, 'goal.delete();', 'goal.remove();')),
      R('goal only hidden', 'r3', edit(S, 'goal.delete();', 'goal.visible = false;')),
    ]);
  }

  // 5.2.13 r3
  {
    const id = '5-2-5-lab-add-a-jump'; const S = sol(id);
    const head = "  if (kb.presses(' ') && player.colliding(ground)) {";
    const block = head + nl + '    player.vel.y = -7;' + nl + '  }';
    run(id, [
      A('reference', S),
      A('nested ifs on one line', edit(S, head, "  if (kb.presses(' ')) if (player.colliding(ground)) {")),
      A('nested ifs, each braced', edit(S, block, "  if (kb.presses(' ')) {" + nl + '    if (player.colliding(ground)) {' + nl + '      player.vel.y = -7;' + nl + '    }' + nl + '  }')),
      A('nested ifs, ground test outside', edit(S, block, '  if (player.colliding(ground)) {' + nl + "    if (kb.presses(' ')) {" + nl + '      player.vel.y = -7;' + nl + '    }' + nl + '  }')),
      R('two separate ifs that can each launch', 'r3', edit(S, block, "  if (kb.presses(' ')) player.vel.y = -7;" + nl + '  if (player.colliding(ground)) {' + nl + '    player.vel.y = -7;' + nl + '  }')),
      R('joined with ||', 'r3', edit(S, head, "  if (kb.presses(' ') || player.colliding(ground)) {")),
    ]);
  }

  // 5.2.4 r3
  {
    const id = '5-2-random-3-lab-random-spot-and-colour'; const S = sol(id);
    const line = 'roll = floor(random(1, 7));';
    const w = (to) => edit(S, line, to);
    run(id, [
      A('reference', S),
      A('round(random(1, 6))', w('roll = round(random(1, 6));')),
      A('int(random(1, 7))', w('roll = int(random(1, 7));')),
      A('Math.floor(random(1, 7))', w('roll = Math.floor(random(1, 7));')),
      A('floor(random(0, 6)) + 1', w('roll = floor(random(0, 6)) + 1;')),
      A('1 + int(random(6))', w('roll = 1 + int(random(6));')),
      A('Math.floor(Math.random() * 6 + 1)', w('roll = Math.floor(Math.random() * 6 + 1);')),
      A('Math.round(random(1, 6))', w('roll = Math.round(random(1, 6));')),
      R('a decimal', 'r3', w('roll = random(1, 7);')),
      R('0 to 5', 'r3', w('roll = floor(random(0, 6));')),
      R('never 6', 'r3', w('roll = floor(random(1, 6));')),
      R('round of 0 to 6 can give 0', 'r3', w('roll = round(random(0, 6));')),
    ]);
  }

  // 5.2.5 r2
  {
    const id = '5-2-random-4-lab-beat-and-one-shot'; const S = sol(id);
    const line = '    on = !on;';
    const w = (to) => edit(S, line, to);
    run(id, [
      A('reference', S), R('starter', 'r2', starter(id)),
      A('if/else flips it', w('    if (on) {' + nl + '      on = false;' + nl + '    } else {' + nl + '      on = true;' + nl + '    }')),
      A('if/else without braces', w('    if (on === true) on = false;' + nl + '    else on = true;')),
      A('if (!on) on = true else false', w('    if (!on) {' + nl + '      on = true;' + nl + '    } else {' + nl + '      on = false;' + nl + '    }')),
      A('ternary', w('    on = on ? false : true;')),
      A('on = on === false', w('    on = on === false;')),
      R('the beat only sets on = true', 'r2', w('    on = true;')),
      R('the beat only sets on = false', 'r2', w('    on = false;')),
    ]);
  }

  // 5.6.14 r2
  {
    const id = '5-3-13-lab-build-sprite'; const S = sol(id);
    run(id, [
      A('reference', S),
      A("a fifth 'static' argument", edit(S, 'rect = new Sprite(120, 150, 80, 50);', "rect = new Sprite(120, 150, 80, 50, 'static');")),
      R('no rectangle at all', 'r2', edit(S, 'rect = new Sprite(120, 150, 80, 50);', 'rect = new Sprite(120, 150, 80);')),
    ]);
  }

  // 5.7.13 r1
  {
    const id = '5-3-26-lab-array-of-instances'; const S = sol(id);
    const five = [50, 130, 210, 290, 370];
    const pushes = S['script.js'].match(/  enemies\.push\(new Enemy\(50[\s\S]*?6\)\);/)[0];
    run(id, [
      A('reference', S), R('starter', 'r1', starter(id)),
      A('five built straight into the array', edit(S, pushes, '  enemies = [' + five.map((x) => `new Enemy(${x}, 100, 3)`).join(', ') + '];')),
      A('a single push', edit(S, pushes, '  enemies.push(new Enemy(50, 100, 5));')),
      A('made first, then pushed', edit(S, pushes, '  const e = new Enemy(50, 100, 5);' + nl + '  enemies.push(e);')),
      A('pushed in a loop', edit(S, pushes, '  for (let i = 0; i < 5; i++) {' + nl + '    enemies.push(new Enemy(50 + i * 80, 100, 3));' + nl + '  }')),
      R('five separate variables', 'r1', edit(S, pushes, five.map((x, i) => `  let e${i} = new Enemy(${x}, 100, 3);`).join(nl))),
    ]);
  }

  // 5.7.14 r1
  {
    const id = '5-3-27-lab-loop-instances'; const S = sol(id);
    const loop = '  for (let e of enemies) {' + nl + '    e.render();' + nl + '  }';
    run(id, [
      A('reference', S), R('starter', 'r1', starter(id)),
      A('forEach with an arrow', edit(S, loop, '  enemies.forEach((e) => e.render());')),
      A('forEach with a function', edit(S, loop, '  enemies.forEach(function (e) {' + nl + '    e.render();' + nl + '  });')),
      A('index loop', edit(S, loop, '  for (let i = 0; i < enemies.length; i++) {' + nl + '    enemies[i].render();' + nl + '  }')),
      R('only the first enemy', 'r1', edit(S, loop, '  enemies[0].render();')),
      R('forEach that never renders', 'r1', edit(S, loop, '  enemies.forEach((e) => e.hp);')),
    ]);
  }

  // 5.7.19 r3
  {
    const id = '5-3-31-a12-1-collectible'; const S = sol(id);
    const body = '    this.sprite.delete();' + nl + '    return this.value;';
    const w = (to) => edit(S, body, to);
    run(id, [
      A('reference', S),
      A('kept in a variable, remove(), then returned', w('    const v = this.value;' + nl + '    this.sprite.remove();' + nl + '    return v;')),
      A('delete inside an if, then return', w('    if (this.sprite) {' + nl + '      this.sprite.delete();' + nl + '    }' + nl + '    return this.value;')),
      R('delete after the return never runs', 'r3', w('    return this.value;' + nl + '    this.sprite.delete();')),
      R('return only', 'r3', w('    return this.value;')),
      R('delete only', 'r3', w('    this.sprite.delete();')),
    ]);
  }

  // 5.6.10 r2
  {
    const id = '5-3-9-lab-write-property'; const S = sol(id);
    run(id, [
      A('reference', S), R('starter', 'r2', starter(id)),
      A('kb.pressing', edit(S, "if (kb.presses('space')) {", "if (kb.pressing('space')) {")),
      R('no key test, a timer instead', 'r2', edit(S, "if (kb.presses('space')) {", 'if (frameCount % 60 === 0) {')),
    ]);
  }

  // 5.3.6 r1 (gravity is on: the lab that drops the ball; the old four-step lab moved here when 5.3 was split)
  {
    const id = '5-3-pinball-3a-lab-drop-a-bouncy-ball'; const S = sol(id);
    const w = (to) => edit(S, 'world.gravity.y = 10;', to);
    run(id, [
      A('reference', S),
      A('a decimal', w('world.gravity.y = 9.8;')),
      A('through a variable', w('const G = 10;' + nl + '  world.gravity.y = G;')),
      R('negative: the ball rises', 'r1', w('world.gravity.y = -10;')),
      R('negative through a variable', 'r1', w('const G = -10;' + nl + '  world.gravity.y = G;')),
      R('zero', 'r1', w('world.gravity.y = 0;')),
      // #86: in math coordinates y grows up, so falling is a NEGATIVE gravity (5.1.25 teaches the mode).
      A('math origin, negative', w("world.origin = 'math';" + nl + '  world.gravity.y = -10;')),
      A('math origin, negative decimal', w('world.origin = "math";' + nl + '  world.gravity.y = -9.8;')),
      A('math origin, negative through a variable', w("world.origin = 'math';" + nl + '  const G = -10;' + nl + '  world.gravity.y = G;')),
      R('math origin, positive: the ball rises', 'r1', w("world.origin = 'math';" + nl + '  world.gravity.y = 10;')),
      R('math origin, positive through a variable', 'r1', w("world.origin = 'math';" + nl + '  const G = 10;' + nl + '  world.gravity.y = G;')),
      A('math origin only in a comment, positive', w("// world.origin = 'math';" + nl + '  world.gravity.y = 10;')),
    ]);
  }

  // 5.3.8 r1, r2
  {
    const id = '5-3-pinball-7-lab-three-bumpers-three-values'; const S = sol(id);
    run(id, [
      A('reference', S), R('starter', 'r1', starter(id)),
      A('counting loop that stops at 3', edit(S, '  for (const b of bumpers) {', '  for (let i = 0; i < 3; i++) {' + nl + '    const b = bumpers[i];')),
      A('counting loop over the length', edit(S, '  for (const b of bumpers) {', '  for (let i = 0; i < bumpers.length; i++) {' + nl + '    const b = bumpers[i];')),
      R('three separate ifs', 'r1', edit(S, '  for (const b of bumpers) {', '  {' + nl + '    const b = bumpers[0];')),
      A('if/else sets the memory to true / false', edit(S, '    b.wasTouching = touching;', '    if (touching) {' + nl + '      b.wasTouching = true;' + nl + '    } else {' + nl + '      b.wasTouching = false;' + nl + '    }')),
      A('if/else without braces', edit(S, '    b.wasTouching = touching;', '    if (touching) b.wasTouching = true;' + nl + '    else b.wasTouching = false;')),
      A('memory set straight from colliding()', edit(edit(S, '    b.wasTouching = touching;', '    b.wasTouching = ball.colliding(b);'), '    const touching = ball.colliding(b);' + nl + '    if (touching && !b.wasTouching) {', '    if (ball.colliding(b) && !b.wasTouching) {')),
      R('one shared memory', 'r2', { 'script.js': edit(edit(S, '!b.wasTouching', '!wasTouching'), '    b.wasTouching = touching;', '    wasTouching = touching;')['script.js'].replace('let bumpers = [];', 'let bumpers = [];' + nl + 'let wasTouching = false;') }),
      R('one shared memory, if/else', 'r2', { 'script.js': edit(edit(S, '!b.wasTouching', '!wasTouching'), '    b.wasTouching = touching;', '    if (touching) wasTouching = true;' + nl + '    else wasTouching = false;')['script.js'].replace('let bumpers = [];', 'let bumpers = [];' + nl + 'let wasTouching = false;') }),
    ]);
  }

  // 5.3.8 r3: the memory is any property the student names (r2 already took any name); r3 used to
  // demand the exact word wasTouching. It must still refuse a score on every touching frame.
  {
    const id = '5-3-pinball-7-lab-three-bumpers-three-values'; const S = sol(id);
    const named = (name) => ({ 'script.js': S['script.js'].split('wasTouching').join(name) });
    const H = named('hit');
    const ifLine = '    if (touching && !b.hit) {';
    const scoreIf = ifLine + nl + '      score += b.worth;' + nl + '    }';
    run(id, [
      A('memory named hit', H),
      A('memory named touchedLast', named('touchedLast')),
      A('memory named lastFrame, set straight from colliding()', edit(edit(named('lastFrame'), '    b.lastFrame = touching;', '    b.lastFrame = ball.colliding(b);'), '    const touching = ball.colliding(b);' + nl + '    if (touching && !b.lastFrame) {', '    if (ball.colliding(b) && !b.lastFrame) {')),
      A('memory named hit, if/else true / false', edit(H, '    b.hit = touching;', '    if (touching) {' + nl + '      b.hit = true;' + nl + '    } else {' + nl + '      b.hit = false;' + nl + '    }')),
      A('memory named hit, bumpers[i] in a counting loop', edit(H, '  for (const b of bumpers) {' + nl + '    const touching = ball.colliding(b);' + nl + scoreIf + nl + '    b.hit = touching;', '  for (let i = 0; i < bumpers.length; i++) {' + nl + '    const touching = ball.colliding(bumpers[i]);' + nl + '    if (touching && !bumpers[i].hit) {' + nl + '      score += bumpers[i].worth;' + nl + '    }' + nl + '    bumpers[i].hit = touching;')),
      A('memory named hit, == false', edit(H, '!b.hit', 'b.hit == false')),
      A('memory named hit, nested ifs', edit(H, scoreIf, '    if (touching) {' + nl + '      if (!b.hit) {' + nl + '        score += b.worth;' + nl + '      }' + nl + '    }')),
      A('memory named hit, braceless score line', edit(H, scoreIf, ifLine.replace(' {', '') + ' score += b.worth;')),
      R('worth on every touching frame', 'r3', edit(S, '    if (touching && !b.wasTouching) {', '    if (ball.colliding(b)) {')),
      R('touching alone, no memory in the test', 'r3', edit(H, ifLine, '    if (touching) {')),
      R('memory named hit, === false (it holds a number)', 'r3', edit(H, '!b.hit', 'b.hit === false')),
      R('a property that is not a memory: ball.vel.y', 'r3', edit(H, ifLine, '    if (touching && ball.vel.y > 0) {')),
      R('the worth itself in the test', 'r3', edit(H, ifLine, '    if (touching && b.worth > 0) {')),
      R('memory named hit, adds 1 instead of the worth', 'r3', edit(H, 'score += b.worth;', 'score += 1;')),
    ]);
  }

  // 5.4.7 r1
  {
    const id = '5-4-flappy-6-lab-score-a-gap'; const S = sol(id);
    const forOf = '  for (const p of pipes) {' + nl + '    if (p.x < bird.x && !p.passed) {' + nl + '      score += 1;' + nl + '      p.passed = true;' + nl + '    }' + nl + '  }' + nl;
    const delLoop = '  for (let i = pipes.length - 1; i >= 0; i--) {';
    const fe = '  pipes.forEach((p) => {' + nl + '    if (p.x < bird.x && !p.passed) {' + nl + '      score += 1;' + nl + '      p.passed = true;' + nl + '    }' + nl + '  });' + nl + nl;
    run(id, [
      A('reference', S), R('starter', 'r1', starter(id)),
      A('forEach above the delete loop', edit(edit(S, forOf, ''), delLoop, fe + delLoop)),
      A('scoring inside the delete loop', edit(edit(S, forOf, ''), delLoop, delLoop + nl + '    if (pipes[i].x < bird.x && !pipes[i].passed) {' + nl + '      score += 1;' + nl + '      pipes[i].passed = true;' + nl + '    }')),
      A('index loop, braceless body', edit(S, forOf, '  for (let i = 0; i < pipes.length; i++) if (pipes[i].x < bird.x && !pipes[i].passed) {' + nl + '    score += 1;' + nl + '    pipes[i].passed = true;' + nl + '  }' + nl)),
      R('no scoring, a bird.x line after the delete loop', 'r1', edit(S, forOf, '  bird.x = 100;' + nl)),
    ]);
  }

  // 5.4.8 r2, r6: a gameOver flag with the crash and the restart in helpers (endRound(), startRound()).
  // The flag flips inside the helper, so r2 must follow the call from the collision into the helper's
  // body, and r6 must know that if (gameOver) means the round is over because the crash helper set it true.
  {
    const id = '5-4-flappy-7-lab-crash-and-start-again'; const S = sol(id);
    const crash = '        playing = false;' + nl + '        world.gravity.y = 0;' + nl + '        bird.vel.y = 0;' + nl + '        for (const q of pipes) {' + nl + '          q.vel.x = 0;' + nl + '          q.mate.vel.x = 0;' + nl + '        }';
    const restart = '    for (const p of pipes) {' + nl + '      p.mate.delete();' + nl + '      p.delete();' + nl + '    }' + nl + '    pipes = [];' + nl + '    bird.y = 200;' + nl + '    bird.vel.y = 0;' + nl + '    world.gravity.y = 20;' + nl + '    score = 0;' + nl + '    playing = true;';
    const startFn = 'function startRound() {' + nl + restart.replace(/^ {2}/gm, '').replace('playing = true;', 'gameOver = false;') + nl + '}' + nl;
    const endFn = 'function endRound() {' + nl + crash.replace(/^ {6}/gm, '').replace('playing = false;', 'gameOver = true;') + nl + '}' + nl;
    const helpers = (src, above) => {
      let s = edit(src, 'let bird, pipes, score, playing;', 'let bird, pipes, score, gameOver;');
      s = edit(s, '  pipes = [];' + nl + '  score = 0;' + nl + '  playing = true;' + nl + '}' + nl, '  pipes = [];' + nl + '  startRound();' + nl + '}' + nl + nl + (above ? startFn + nl + endFn : ''));
      s = edit(s, crash, '        endRound();');
      s = edit(s, restart, '    startRound();');
      s = edit(s, '  if (playing) {', '  if (!gameOver) {');
      s = edit(s, '  if (!playing) {', '  if (gameOver) {');
      return above ? s : { 'script.js': s['script.js'] + nl + startFn + nl + endFn };
    };
    const G = helpers(S, true);
    run(id, [
      A('gameOver + endRound()/startRound() written above draw()', G),
      A('gameOver + endRound()/startRound() written at the bottom', helpers(S, false)),
      A('helper takes an argument', edit(edit(G, 'function endRound() {', 'function endRound(reason) {'), '        endRound();', "        endRound('pipe');")),
      A('braceless collision if calls the helper', edit(G, '      if (bird.colliding(p) || bird.colliding(p.mate)) {' + nl + '        endRound();' + nl + '      }', '      if (bird.colliding(p) || bird.colliding(p.mate)) endRound();')),
      A('the pipe asks about the bird', edit(G, 'bird.colliding(p) || bird.colliding(p.mate)', 'p.colliding(bird) || p.mate.colliding(bird)')),
      A('the flag set last in endRound()', edit(edit(G, '  gameOver = true;' + nl, ''), '    q.mate.vel.x = 0;' + nl + '  }' + nl + '}', '    q.mate.vel.x = 0;' + nl + '  }' + nl + '  gameOver = true;' + nl + '}')),
      A('if (gameOver === true) and GAME OVER', edit(G, "  if (gameOver) {" + nl + '    textSize(28);' + nl + "    text('Game over'", "  if (gameOver === true) {" + nl + '    textSize(28);' + nl + "    text('GAME OVER'")),
      A('playing flag kept, endRound() sets it false', edit(edit(edit(edit(edit(G, 'let bird, pipes, score, gameOver;', 'let bird, pipes, score, playing;'), '  gameOver = false;', '  playing = true;'), '  gameOver = true;', '  playing = false;'), '  if (!gameOver) {', '  if (playing) {'), '  if (gameOver) {', '  if (!playing) {')),
      R('endRound() only freezes, nothing flips the flag', 'r2', edit(G, '  gameOver = true;' + nl, '')),
      R('if (playing) shows Game over', 'r6', edit(edit(edit(edit(edit(G, 'let bird, pipes, score, gameOver;', 'let bird, pipes, score, playing;'), '  gameOver = false;', '  playing = true;'), '  gameOver = true;', '  playing = false;'), '  if (!gameOver) {', '  if (playing) {'), '  if (gameOver) {', '  if (playing) {')),
      R('Game over drawn on every frame', 'r6', edit(G, '  if (gameOver) {' + nl + '    textSize(28);' + nl + "    text('Game over', 130, 190);" + nl + '    textSize(14);' + nl + "    text('press R to play again', 130, 215);" + nl + '  }', "  text('Game over', 130, 190);")),
    ]);
  }

  // 5.5.4 r1: every key sets BOTH dx and dy inside its own if. The old pattern looked for one value in the
  // 80 characters after the key test, so up and down could set only dy (the block then moves diagonally).
  {
    const id = '5-5-snake-4-lab-steer-it'; const S = sol(id);
    const four = "  if (kb.presses('up') && dy === 0) { dx = 0; dy = -1; }" + nl + "  if (kb.presses('down') && dy === 0) { dx = 0; dy = 1; }" + nl + "  if (kb.presses('left') && dx === 0) { dx = -1; dy = 0; }" + nl + "  if (kb.presses('right') && dx === 0) { dx = 1; dy = 0; }";
    const w = (to) => edit(S, four, to);
    const keys = [['up', 0, -1, 'dy'], ['down', 0, 1, 'dy'], ['left', -1, 0, 'dx'], ['right', 1, 0, 'dx']];
    run(id, [
      A('reference', S), R('starter', 'r1', starter(id)),
      A('one statement per line, dy first', w(keys.map(([k, x, y, g]) => `  if (kb.presses('${k}') && ${g} === 0) {` + nl + `    dy = ${y};` + nl + `    dx = ${x};` + nl + '  }').join(nl))),
      A('else-if chain', w(keys.map(([k, x, y, g], i) => (i ? '  } else if' : '  if') + ` (kb.presses('${k}') && ${g} === 0) {` + nl + `    dx = ${x};` + nl + `    dy = ${y};`).join(nl) + nl + '  }')),
      A('the guard first, then the key', w(keys.map(([k, x, y, g]) => `  if (${g} === 0 && kb.presses('${k}')) { dx = ${x}; dy = ${y}; }`).join(nl))),
      A('nested: the key, then the guard', w(keys.map(([k, x, y, g]) => `  if (kb.presses('${k}')) {` + nl + `    if (${g} === 0) {` + nl + `      dx = ${x};` + nl + `      dy = ${y};` + nl + '    }' + nl + '  }').join(nl))),
      A('nested: one guard holds two keys', w('  if (dy === 0) {' + nl + keys.slice(0, 2).map(([k, x, y]) => `    if (kb.presses('${k}')) { dx = ${x}; dy = ${y}; }`).join(nl) + nl + '  }' + nl + '  if (dx === 0) {' + nl + keys.slice(2).map(([k, x, y]) => `    if (kb.presses('${k}')) { dx = ${x}; dy = ${y}; }`).join(nl) + nl + '  }')),
      A('kb.pressing and double quotes', w(four.replace(/presses\('(\w+)'\)/g, 'pressing("$1")'))),
      A('braceless, both set with a comma', w(keys.map(([k, x, y, g]) => `  if (kb.presses('${k}') && ${g} === 0) dx = ${x}, dy = ${y};`).join(nl))),
      R('up and down set only dy', 'r1', w(keys.map(([k, x, y, g]) => `  if (kb.presses('${k}') && ${g} === 0) { ${g === 'dy' ? '' : `dx = ${x}; `}dy = ${y}; }`).join(nl))),
      R('only up sets only dy', 'r1', edit(S, "{ dx = 0; dy = -1; }", '{ dy = -1; }')),
      R('left and right set only dx', 'r1', w(keys.map(([k, x, y, g]) => `  if (kb.presses('${k}') && ${g} === 0) { dx = ${x};${g === 'dx' ? '' : ` dy = ${y};`} }`).join(nl))),
      R('up and down swapped', 'r1', w(four.replace('dy = -1;', 'dy = TMP;').replace('dy = 1;', 'dy = -1;').replace('dy = TMP;', 'dy = 1;'))),
      R('dx = 0 once, outside every key', 'r1', w('  dx = 0;' + nl + keys.map(([k, x, y, g]) => `  if (kb.presses('${k}') && ${g} === 0) { ${g === 'dy' ? '' : `dx = ${x}; `}dy = ${y}; }`).join(nl))),
    ]);
  }

  // 5.4.11 r1
  {
    const id = '5-4-flappy-9-challenges-make-it-yours'; const T = starter(id);
    const vel = '  top.vel.x = -2;' + nl + '  bottom.vel.x = -2;';
    const topH = '  const topH = gapY - 65;' + nl + '  const botH = 400 - (gapY + 65);';
    run(id, [
      A('reference', sol(id)), R('starter', 'r1', T),
      R('looks only: fill from the score', 'r1', edit(T, "  fill('white');" + nl + '  textSize(22);', "  fill(score > 5 ? 'gold' : 'white');" + nl + '  textSize(22);')),
      R('looks only: score drawn ten times bigger', 'r1', edit(T, "text('score: ' + score, 20, 36);", "text('score: ' + score * 10, 20, 36);")),
      A('speed worked out from the score', edit(T, vel, '  top.vel.x = -(2 + score * 0.2);' + nl + '  bottom.vel.x = top.vel.x;')),
      A('faster past 5, in an if', edit(T, vel, vel + nl + '  if (score > 5) {' + nl + '    top.vel.x = -3;' + nl + '    bottom.vel.x = -3;' + nl + '  }')),
      A('a level variable from the score', edit(T, vel, '  const level = floor(score / 5);' + nl + '  top.vel.x = -2 - level;' + nl + '  bottom.vel.x = -2 - level;')),
      A('a narrower gap', edit(T, topH, '  const gap = 130 - score * 5;' + nl + '  const topH = gapY - gap / 2;' + nl + '  const botH = 400 - (gapY + gap / 2);')),
      A('best score named highScore', edit(edit(edit(T, 'let bird, pipes, score, playing;', 'let bird, pipes, score, playing;' + nl + 'let highScore = 0;'), '  playing = false;' + nl + '  world.gravity.y = 0;', '  playing = false;' + nl + '  if (score > highScore) {' + nl + '    highScore = score;' + nl + '  }' + nl + '  world.gravity.y = 0;'), "text('score: ' + score, 20, 36);", "text('score: ' + score + '  best: ' + highScore, 20, 36);")),
      A('best score with max', edit(edit(T, 'let bird, pipes, score, playing;', 'let bird, pipes, score, playing;' + nl + 'let best = 0;'), '  playing = false;' + nl + '  world.gravity.y = 0;', '  playing = false;' + nl + '  best = max(best, score);' + nl + '  world.gravity.y = 0;')),
      A('wobble from random', edit(T, vel, vel + nl + '  const wob = random(0.3, 0.7);' + nl + '  top.vel.y = wob;' + nl + '  bottom.vel.y = wob;')),
    ]);
  }

  // 5.5.6 r2
  {
    const id = '5-5-snake-6-lab-grow-and-eat'; const S = sol(id);
    const two = '    const tail = segments.pop();' + nl + '    tail.delete();';
    run(id, [
      A('reference', S),
      A('tail.remove()', edit(S, 'tail.delete();', 'tail.remove();')),
      A('pop chained with remove()', edit(S, two, '    segments.pop().remove();')),
      R('popped but never deleted', 'r2', edit(S, two, '    segments.pop();')),
    ]);
  }

  // 5.5.11 r1
  {
    const id = '5-5-snake-11-challenges-make-it-yours'; const T = starter(id);
    const over = '    playing = false;' + nl + '    return;';
    const decl = 'let segments, food, dx, dy, score, playing;';
    run(id, [
      A('reference', sol(id)), R('starter', 'r1', T),
      A('best score named highScore', edit(edit(T, decl, decl + nl + 'let highScore = 0;'), over, '    playing = false;' + nl + '    if (score > highScore) highScore = score;' + nl + '    return;')),
      A('highScore with max', edit(edit(T, decl, decl + nl + 'let highScore = 0;'), over, '    playing = false;' + nl + '    highScore = max(highScore, score);' + nl + '    return;')),
      A('highScore, braced', edit(edit(T, decl, decl + nl + 'let highScore = 0;'), over, '    playing = false;' + nl + '    if (highScore < score) {' + nl + '      highScore = score;' + nl + '    }' + nl + '    return;')),
      R('a highScore that is only shown', 'r1', edit(edit(T, decl, decl + nl + 'let highScore = 0;'), "text('score: ' + score, 20, 32);", "text('score: ' + score + ' best: ' + highScore, 20, 32);")),
    ]);
  }

  // 5.8.13 r1, r2
  {
    const id = '5-5-13-lab-reap-the-dead'; const S = sol(id);
    const line = '  enemies = enemies.filter((e) => e.isAlive());';
    const loop = (test) => '  for (let i = enemies.length - 1; i >= 0; i--) {' + nl + `    if (${test}) {` + nl + '      enemies.splice(i, 1);' + nl + '    }' + nl + '  }';
    run(id, [
      A('reference', S), R('starter', 'r1', starter(id)),
      A('backward loop splices the dead', edit(S, line, loop('!enemies[i].isAlive()'))),
      A('backward loop, hp <= 0, braceless', edit(S, line, '  for (let i = enemies.length - 1; i >= 0; i--) if (enemies[i].hp <= 0) enemies.splice(i, 1);')),
      A('backward loop, a local and === false', edit(S, line, '  for (let i = enemies.length - 1; i >= 0; i--) {' + nl + '    const e = enemies[i];' + nl + '    if (e.isAlive() === false) {' + nl + '      enemies.splice(i, 1);' + nl + '    }' + nl + '  }')),
      R('backward loop splices the living', 'r2', edit(S, line, loop('enemies[i].isAlive()'))),
      R('backward loop splices every enemy', 'r1', edit(S, line, '  for (let i = enemies.length - 1; i >= 0; i--) {' + nl + '    enemies.splice(i, 1);' + nl + '  }')),
    ]);
  }

  // 5.8.13 r1, r2: every honest way to rebuild the list of the living, not only filter and the backward
  // splice: a new list filled with push in a loop and stored back, a while loop that splices or shifts out
  // the dead, and a loop from the start that splices and steps its counter back.
  {
    const id = '5-5-13-lab-reap-the-dead'; const S = sol(id);
    const line = '  enemies = enemies.filter((e) => e.isAlive());';
    const w = (to) => edit(S, line, to);
    const pushed = (head, test, item, close = '  }') => w('  const alive = [];' + nl + head + nl + `    if (${test}) {` + nl + `      alive.push(${item});` + nl + '    }' + nl + close + nl + '  enemies = alive;');
    run(id, [
      A('for...of pushes the living into a new list', pushed('  for (const e of enemies) {', 'e.isAlive()', 'e')),
      A('for...of push, braceless, let', w('  let living = [];' + nl + '  for (let e of enemies) if (e.isAlive()) living.push(e);' + nl + '  enemies = living;')),
      A('for...of push, hp > 0', pushed('  for (const e of enemies) {', 'e.hp > 0', 'e')),
      A('for...of push, isAlive() === true', pushed('  for (const e of enemies) {', 'e.isAlive() === true', 'e')),
      A('for...of push, continue past the dead', w('  const alive = [];' + nl + '  for (const e of enemies) {' + nl + '    if (!e.isAlive()) continue;' + nl + '    alive.push(e);' + nl + '  }' + nl + '  enemies = alive;')),
      A('counting loop pushes the living', pushed('  for (let i = 0; i < enemies.length; i++) {', 'enemies[i].isAlive()', 'enemies[i]')),
      A('forEach pushes the living', pushed('  enemies.forEach((e) => {', 'e.isAlive()', 'e', '  });')),
      A('while splices the dead, else steps on', w('  let i = 0;' + nl + '  while (i < enemies.length) {' + nl + '    if (!enemies[i].isAlive()) {' + nl + '      enemies.splice(i, 1);' + nl + '    } else {' + nl + '      i++;' + nl + '    }' + nl + '  }')),
      A('while from the end', w('  let i = enemies.length - 1;' + nl + '  while (i >= 0) {' + nl + '    if (enemies[i].hp <= 0) enemies.splice(i, 1);' + nl + '    i--;' + nl + '  }')),
      A('while shifts the dead off the front', w('  while (enemies.length > 0 && !enemies[0].isAlive()) {' + nl + '    enemies.shift();' + nl + '  }')),
      A('while shifts, braceless, hp <= 0', w('  while (enemies.length && enemies[0].hp <= 0) enemies.shift();')),
      A('loop from the start splices, then i--', w('  for (let i = 0; i < enemies.length; i++) {' + nl + '    if (!enemies[i].isAlive()) {' + nl + '      enemies.splice(i, 1);' + nl + '      i--;' + nl + '    }' + nl + '  }')),
      A('filter kept in a variable first', w('  const alive = enemies.filter((e) => e.isAlive());' + nl + '  enemies = alive;')),
      A('filter with a function and return', w('  enemies = enemies.filter(function (e) {' + nl + '    return e.isAlive();' + nl + '  });')),
      R('new list never stored back', 'r1', w('  const alive = [];' + nl + '  for (const e of enemies) {' + nl + '    if (e.isAlive()) alive.push(e);' + nl + '  }')),
      R('new list keeps the dead', 'r2', pushed('  for (const e of enemies) {', '!e.isAlive()', 'e')),
      R('new list keeps hp <= 0', 'r2', pushed('  for (const e of enemies) {', 'e.hp <= 0', 'e')),
      R('new list keeps everyone', 'r2', w('  const alive = [];' + nl + '  for (const e of enemies) {' + nl + '    alive.push(e);' + nl + '  }' + nl + '  enemies = alive;')),
      R('while splices the living', 'r2', w('  let i = 0;' + nl + '  while (i < enemies.length) {' + nl + '    if (enemies[i].isAlive()) {' + nl + '      enemies.splice(i, 1);' + nl + '    } else {' + nl + '      i++;' + nl + '    }' + nl + '  }')),
      R('while empties the list', 'r1', w('  while (enemies.length > 0) {' + nl + '    enemies.shift();' + nl + '  }')),
      R('while shifts the living', 'r2', w('  while (enemies.length > 0 && enemies[0].isAlive()) enemies.shift();')),
      R('loop from the start splices without stepping back', 'r1', w('  for (let i = 0; i < enemies.length; i++) {' + nl + '    if (!enemies[i].isAlive()) {' + nl + '      enemies.splice(i, 1);' + nl + '    }' + nl + '  }')),
      R('filter result thrown away', 'r1', w('  enemies.filter((e) => e.isAlive());')),
    ]);
  }

  // 5.8.18 r4
  {
    const id = '5-5-18-lab-wave-spawner'; const S = sol(id);
    const line = '  enemies = enemies.filter((e) => e.isAlive());';
    run(id, [
      A('reference', S), R('starter', 'r4', starter(id)),
      A('backward loop splices the dead', edit(S, line, '  for (let i = enemies.length - 1; i >= 0; i--) {' + nl + '    if (!enemies[i].isAlive()) {' + nl + '      enemies.splice(i, 1);' + nl + '    }' + nl + '  }')),
      R('backward loop splices the living', 'r4', edit(S, line, '  for (let i = enemies.length - 1; i >= 0; i--) {' + nl + '    if (enemies[i].isAlive()) {' + nl + '      enemies.splice(i, 1);' + nl + '    }' + nl + '  }')),
    ]);
  }

  // 5.2.16 r1
  {
    const id = 'moshion-bounce'; const S = sol(id);
    const plain = { 'script.js': S['script.js'].replace(/, 'static'\);/g, ');').replace("  top.color = '#445';", "  top.collider = 'static';" + nl + "  bottom.collider = 'static';" + nl + "  leftWall.collider = 'static';" + nl + "  rightWall.collider = 'static';" + nl + "  top.color = '#445';") };
    run(id, [
      A('reference', S), R('starter', 'r1', starter(id)),
      A("walls made plain, then .collider = 'static'", plain),
      R('only one static wall', 'r1', { 'script.js': S['script.js'].replace(/, 'static'\);/g, ');').replace("  top.color = '#445';", "  top.collider = 'static';" + nl + "  top.color = '#445';") }),
    ]);
  }
}

// ---------------------------------------------------------------- 5.2.29 (update) and 5.3.14 (sound)
//
// Two labs appended on 2026-11-02 so 5.1-5.5 teach update() and a first sound.
// Lax on purpose: every shape the course taught for the move, the jump, the load
// and the play must pass. What each card must still refuse is the version that
// does not work in a browser: an update() moSHion never calls (misspelled, or
// written inside another function), a sound loaded where only setup() sees it
// or every frame, and a play() that runs on every frame of a touch (a buzz).
{
  const run = (id, list) => {
    for (const [name, req, files] of list) {
      if (req === 'pass') accept(id, name, files);
      else reject(id, name, req, files);
    }
  };

  // 5.2.29 Lab: Rules in update(), picture in draw()
  {
    const id = '5-2-update-2-lab-rules-in-update';
    const S = solutionFiles(id);
    const move = "  if (kb.pressing('a'))       player.vel.x = -4;" + nl + "  else if (kb.pressing('d'))  player.vel.x = 4;" + nl + "  else                        player.vel.x = 0;";
    const jump = "  if (kb.presses(' ') && player.colliding(ground)) {" + nl + '    player.vel.y = -7;' + nl + '  }';
    const head = 'function update() {';
    const words = "  text('a and d move, space jumps', 20, 26);";
    // the whole update() block, cut out and pasted after draw()
    const upd = S['script.js'].slice(S['script.js'].indexOf(head), S['script.js'].indexOf('// the picture'));
    run(id, [
      ['reference', 'pass', S],
      ['untouched starter', 'r1', starterFiles(id)],
      ['update(step) with a parameter', 'pass', edit(S, head, 'function update(step) {')],
      ['no spaces, brace on the next line', 'pass', edit(S, head, 'function update()' + nl + '{')],
      ['update() written after draw()', 'pass', { 'script.js': S['script.js'].replace(upd, '') + nl + upd }],
      ['arrow keys', 'pass', edit(edit(S, "kb.pressing('a')", "kb.pressing('left')"), "kb.pressing('d')", "kb.pressing('right')")],
      ['movement with braces', 'pass', edit(S, move, "  if (kb.pressing('a')) {" + nl + '    player.vel.x = -4;' + nl + "  } else if (kb.pressing('d')) {" + nl + '    player.vel.x = 4;' + nl + '  } else {' + nl + '    player.vel.x = 0;' + nl + '  }')],
      ['movement as a ternary', 'pass', edit(S, move, "  player.vel.x = kb.pressing('d') ? 4 : kb.pressing('a') ? -4 : 0;")],
      ['movement by changing x', 'pass', edit(S, move, "  if (kb.pressing('a')) player.x -= 4;" + nl + "  if (kb.pressing('d')) player.x += 4;")],
      ['jump as two nested ifs', 'pass', edit(S, jump, "  if (kb.presses(' ')) {" + nl + '    if (player.colliding(ground)) {' + nl + '      player.vel.y = -7;' + nl + '    }' + nl + '  }')],
      ['the ground asks about the player', 'pass', edit(S, 'player.colliding(ground)', 'ground.colliding(player)')],
      ["'space' as the key name", 'pass', edit(S, "kb.presses(' ')", "kb.presses('space')")],
      ['the ground test in a variable first', 'pass', edit(S, jump, '  const onGround = player.colliding(ground);' + nl + "  if (kb.presses(' ') && onGround) {" + nl + '    player.vel.y = -7;' + nl + '  }')],
      ['double quotes everywhere', 'pass', { 'script.js': S['script.js'].replace(/'/g, '"') }],
      ['draw() with only the background', 'pass', edit(edit(edit(S, words, ''), "  fill('white');" + nl, ''), '  textSize(14);' + nl, '')],
      ['update only in a comment', 'r1', edit(S, head, '// ' + head + nl + 'function rules() {')],
      ['Update with a capital U', 'r1', edit(S, head, 'function Update() {')],
      ['update() written inside setup()', 'r1', { 'script.js': S['script.js'].replace(upd, '').replace("  ground.color = 'gray';" + nl + '}', "  ground.color = 'gray';" + nl + nl + '  ' + upd.trim() + nl + '}') }],
      ['empty update(), nothing moved', 'r2', edit(starterFiles(id), '// STEP 1: add an empty update() function here, below setup().', 'function update() {' + nl + '}')],
      ['movement copied into update() but left in draw() too', 'r4', edit(S, words, words + nl + move)],
      ['jump left in draw()', 'r3', edit(edit(S, jump, ''), words, words + nl + jump)],
      ['jump on || in update()', 'r3', edit(S, "kb.presses(' ') && player", "kb.presses(' ') || player")],
      ['jump on kb.pressing alone', 'r3', edit(S, jump, "  if (kb.pressing(' ')) {" + nl + '    player.vel.y = -7;' + nl + '  }')],
      ['background() moved into update()', 'r4', edit(edit(S, "  background('#222');" + nl, ''), head, head + nl + "  background('#222');")],
      ['update() sets a speed with no key test', 'r2', edit(S, move, '  player.vel.x = 4;')],
    ]);
  }

  // 5.3.14 Lab: A chime on every bumper hit
  {
    const id = '5-3-pinball-sound-2-lab-a-chime-on-every-hit';
    const S = solutionFiles(id);
    const load = "  chime = loadSound('/moshion/assets/coin.wav');";
    const hit = '    if (touching && !b.wasTouching) {' + nl + '      score += b.worth;' + nl + '      chime.play();' + nl + '    }';
    const noPlay = '    if (touching && !b.wasTouching) {' + nl + '      score += b.worth;' + nl + '    }';
    const mem = '    b.wasTouching = touching;';
    const p = (s) => "loadSound('" + s + "')";
    const helperBelow = { 'script.js': edit(S, hit, '    if (touching && !b.wasTouching) {' + nl + '      score += b.worth;' + nl + '      ding();' + nl + '    }')['script.js'] + nl + 'function ding() {' + nl + '  chime.play();' + nl + '}' + nl };
    const helperAbove = edit(edit(S, hit, '    if (touching && !b.wasTouching) {' + nl + '      score += b.worth;' + nl + '      ding();' + nl + '    }'), 'function draw() {', 'function ding() {' + nl + '  chime.play();' + nl + '}' + nl + nl + 'function draw() {');
    const loopStart = '  for (const b of bumpers) {';
    const loopEnd = mem + nl + '  }' + nl;
    const src = S['script.js'];
    const loop = src.slice(src.indexOf(loopStart), src.indexOf(loopEnd) + loopEnd.length);
    run(id, [
      ['reference', 'pass', S],
      ['untouched starter', 'r1', starterFiles(id)],
      // r1: the load
      ['double quotes', 'pass', edit(S, p('/moshion/assets/coin.wav'), 'loadSound("/moshion/assets/coin.wav")')],
      ['backticks', 'pass', edit(S, p('/moshion/assets/coin.wav'), 'loadSound(' + BT + '/moshion/assets/coin.wav' + BT + ')')],
      ['the short path assets/coin.wav', 'pass', edit(S, p('/moshion/assets/coin.wav'), p('assets/coin.wav'))],
      ['./assets/coin.wav', 'pass', edit(S, p('/moshion/assets/coin.wav'), p('./assets/coin.wav'))],
      ['music.wav instead', 'pass', edit(S, p('/moshion/assets/coin.wav'), p('/moshion/assets/music.wav'))],
      ['loaded first, before the canvas', 'pass', edit(edit(S, load + nl, ''), '  new Canvas(440, 420);', load + nl + '  new Canvas(440, 420);')],
      ['on the same line as the score', 'pass', edit(edit(S, load + nl, ''), '  score = 0;', '  score = 0; ' + load.trim())],
      ['a volume line after it', 'pass', edit(S, load, load + nl + '  chime.volume = 0.5;')],
      ['another name, no semicolons', 'pass', { 'script.js': src.replace(/chime/g, 'ding').replace("loadSound('/moshion/assets/coin.wav');", "loadSound('/moshion/assets/coin.wav')").replace('ding.play();', 'ding.play()') }],
      ['var at the top', 'pass', edit(S, 'let chime;', 'var chime;')],
      ['a sound on each bumper', 'pass', edit(edit(S, load, "  b1.ding = loadSound('/moshion/assets/coin.wav');" + nl + "  b2.ding = loadSound('/moshion/assets/coin.wav');" + nl + "  b3.ding = loadSound('/moshion/assets/coin.wav');"), 'chime.play();', 'b.ding.play();')],
      ['sounds kept in a list', 'pass', edit(edit(edit(S, 'let chime;', 'let sounds = [];'), load, "  sounds.push(loadSound('/moshion/assets/coin.wav'));"), 'chime.play();', 'sounds[0].play();')],
      ['let in front, inside setup()', 'r1', edit(S, load, '  let ' + load.trim())],
      ['const in front, inside setup()', 'r1', edit(S, load, '  const ' + load.trim())],
      ['path typo: asset', 'r1', edit(S, p('/moshion/assets/coin.wav'), p('/moshion/asset/coin.wav'))],
      ['a file that does not exist: coin.mp3', 'r1', edit(S, p('/moshion/assets/coin.wav'), p('/moshion/assets/coin.mp3'))],
      ['loaded again in draw()', 'r1', edit(S, "  background('#222');", "  background('#222');" + nl + load)],
      ['loaded only in draw()', 'r1', edit(edit(S, load + nl, ''), "  background('#222');", "  background('#222');" + nl + load)],
      ['the load only in a comment', 'r1', edit(S, load, '  // ' + load.trim())],
      ['loaded at the top of the file, not in setup() (not taught)', 'r1', edit(edit(S, load + nl, ''), 'let chime;', "let chime = loadSound('/moshion/assets/coin.wav');")],
      // r2: the play
      ['play above the score line', 'pass', edit(S, hit, '    if (touching && !b.wasTouching) {' + nl + '      chime.play();' + nl + '      score += b.worth;' + nl + '    }')],
      ['a second braceless if', 'pass', edit(S, hit, noPlay + nl + '    if (touching && !b.wasTouching) chime.play();')],
      ['the two tests the other way round', 'pass', edit(S, 'touching && !b.wasTouching', '!b.wasTouching && touching')],
      ['colliding() inline, memory set from it', 'pass', edit(edit(S, '    const touching = ball.colliding(b);' + nl + '    if (touching && !b.wasTouching) {', '    if (ball.colliding(b) && !b.wasTouching) {'), mem, '    b.wasTouching = ball.colliding(b);')],
      ['nested: touching, then not before', 'pass', edit(S, hit, '    if (touching) {' + nl + '      if (!b.wasTouching) {' + nl + '        score += b.worth;' + nl + '        chime.play();' + nl + '      }' + nl + '    }')],
      ['nested: not before, then touching', 'pass', edit(S, hit, '    if (!b.wasTouching) {' + nl + '      if (touching) {' + nl + '        score += b.worth;' + nl + '        chime.play();' + nl + '      }' + nl + '    }')],
      ['the hit in a variable first', 'pass', edit(S, hit, '    const isHit = touching && !b.wasTouching;' + nl + '    if (isHit) {' + nl + '      score += b.worth;' + nl + '      chime.play();' + nl + '    }')],
      ['memory tested with == false', 'pass', edit(S, '!b.wasTouching', 'b.wasTouching == false')],
      ['a helper written below draw()', 'pass', helperBelow],
      ['a helper written above draw()', 'pass', helperAbove],
      ['optional chaining', 'pass', edit(S, 'chime.play();', 'chime?.play();')],
      ['the loop moved into update() (5.2.28)', 'pass', { 'script.js': src.replace(loop, '') + nl + 'function update() {' + nl + loop + '}' + nl }],
      ['play straight in draw()', 'r2', edit(edit(S, hit, noPlay), "  background('#222');", "  background('#222');" + nl + '  chime.play();')],
      ['play in the loop, after the if', 'r2', edit(edit(S, hit, noPlay), mem, mem + nl + '    chime.play();')],
      ['play under if (touching) alone', 'r2', edit(S, hit, noPlay + nl + '    if (touching) chime.play();')],
      ['play under colliding() alone', 'r2', edit(S, hit, noPlay + nl + '    if (ball.colliding(b)) {' + nl + '      chime.play();' + nl + '    }')],
      ['play under ||', 'r2', edit(S, hit, noPlay + nl + '    if (touching || !b.wasTouching) chime.play();')],
      ['play in the else', 'r2', edit(S, hit, noPlay + ' else {' + nl + '      chime.play();' + nl + '    }')],
      ['play under the R key', 'r2', edit(edit(S, hit, noPlay), "  if (kb.presses('r')) {", "  if (kb.presses('r')) {" + nl + '    chime.play();')],
      ['play only in setup()', 'r2', edit(edit(S, hit, noPlay), load, load + nl + '  chime.play();')],
      ['play only in a comment', 'r2', edit(S, '      chime.play();', '      // chime.play();')],
      ['memory tested with === false (never true)', 'r2', edit(S, '!b.wasTouching', 'b.wasTouching === false')],
      ['if (!b.wasTouching) alone (every frame apart)', 'r2', edit(S, hit, noPlay + nl + '    if (!b.wasTouching) chime.play();')],
    ]);
  }
}

// ---------------------------------------------------------------- 5.3.17, 5.3.19, 5.3.21 (Pinball polish)
//
// Appended 2026-11-03 (codehs-review/DEEPEN-GAMES.md section 3.1). Lax: every honest shape of a
// label, a popup, a nudge, a mass and debug passes, wherever it sits (setup(), the loop, update(), a
// helper). Each card is tied to its place, so what it refuses is the version that does not work or
// does not do the job: a popup made on every frame of a touch (a stream) or once in setup(), a
// .life on the ball or a bumper (it deletes them), a push made by changing vel.x (it ignores mass),
// a push under kb.presses (one frame), and a fade or a mass that never changes. No pattern uses
// lookbehind; each stays under ~10 ms on 5000-character adversarial input.
{
  const run = (id, list) => {
    for (const [name, req, files] of list) {
      if (req === 'pass') accept(id, name, files);
      else reject(id, name, req, files);
    }
  };
  const swap = (f, a, b) => ({ 'script.js': f['script.js'].split(a).join(b) });

  // 5.3.17 Lab: Show the worth, pop the points
  {
    const id = '5-3-pinball-polish-3-lab-show-the-worth-pop-the-points';
    const S = solutionFiles(id);
    const lab = (n) => '  b' + n + '.text = b' + n + '.worth;' + nl;
    const noLabels = (f) => edit(edit(edit(f, lab(1), ''), lab(2), ''), lab(3), '');
    const push = '  bumpers.push(b1, b2, b3);';
    const popLines = "      const pop = new Sprite(b.x, b.y - 24, 28);" + nl + "      pop.collider = 'none';" + nl + "      pop.color = 'gold';" + nl + "      pop.text = '+' + b.worth;" + nl + "      pop.textColor = 'black';" + nl + '      pop.textSize = 13;' + nl + '      pop.vel.y = -1;' + nl + '      pop.life = 40;' + nl;
    const popBlock = nl + '      // the popup: made once, on the frame the hit starts' + nl + popLines;
    const noPop = edit(S, popBlock, '');
    const mem = '    b.wasTouching = touching;';
    const hitOpen = '    if (touching && !b.wasTouching) {';
    const afterChime = '      chime.play();' + nl;
    const indent = (s, by) => s.split(nl).map((l) => (l ? by + l : l)).join(nl);
    const helper = 'function popAt(b) {' + nl + indent(popLines.replace(/^ {6}/gm, ''), '  ') + '}' + nl;
    const lifeOn = (who) => edit(S, '      pop.life = 40;', '      ' + who + '.life = 40;');
    run(id, [
      ['reference', 'pass', S],
      ['untouched starter', 'r1', starterFiles(id)],
      // r1: the labels
      ['labels by a loop in setup()', 'pass', edit(noLabels(S), push, push + nl + '  for (const b of bumpers) b.text = b.worth;')],
      ['labels set every frame in the loop', 'pass', edit(noLabels(S), mem, mem + nl + '    b.text = b.worth;')],
      ['label joined to words', 'pass', edit(S, lab(1), "  b1.text = 'worth ' + b1.worth;" + nl)],
      ['label in a template string', 'pass', edit(S, lab(1), '  b1.text = ' + BT + '${b1.worth}' + BT + ';' + nl)],
      ['label with String()', 'pass', edit(S, lab(1), '  b1.text = String(b1.worth);' + nl)],
      ['labels as plain numbers', 'pass', edit(edit(edit(S, lab(1), '  b1.text = 1;' + nl), lab(2), '  b2.text = 5;' + nl), lab(3), '  b3.text = 10;' + nl)],
      ['labels as numbers in quotes', 'pass', edit(edit(edit(S, lab(1), "  b1.text = '1';" + nl), lab(2), "  b2.text = '5';" + nl), lab(3), "  b3.text = '10';" + nl)],
      ['labels with a colour and a size', 'pass', edit(S, lab(1), lab(1) + "  b1.textColor = 'black';" + nl + '  b1.textSize = 12;' + nl)],
      ['text() draws each worth every frame', 'pass', edit(noLabels(S), mem, mem + nl + '    text(b.worth, b.x, b.y - 20);')],
      ['labels in a counting loop', 'pass', edit(noLabels(S), push, push + nl + '  for (let i = 0; i < bumpers.length; i++) {' + nl + '    bumpers[i].text = bumpers[i].worth;' + nl + '  }')],
      ['the worth through a variable first', 'pass', edit(S, lab(1), '  const w1 = b1.worth;' + nl + '  b1.text = w1;' + nl)],
      ['no labels: the worth through a variable only for the popup', 'r1', edit(edit(noLabels(S), '      score += b.worth;', '      const w = b.worth;' + nl + '      score += w;'), "pop.text = '+' + b.worth;", "pop.text = '+' + w;")],
      ['no labels: only the popup wears words', 'r1', noLabels(S)],
      ['only the ball wears a word', 'r1', edit(noLabels(S), "  ball.bounciness = 0;", "  ball.bounciness = 0;" + nl + "  ball.text = 'ball';")],
      ['labels only in a comment', 'r1', edit(noLabels(S), push, push + nl + '  // b1.text = b1.worth;')],
      // r2: the popup on the hit
      ['popup above the score line', 'pass', edit(noPop, hitOpen + nl, hitOpen + nl + popLines)],
      ['popup in a helper written below draw()', 'pass', { 'script.js': edit(S, popBlock, nl + '      popAt(b);' + nl)['script.js'] + nl + helper }],
      ['popup in a helper written above draw()', 'pass', edit(edit(S, popBlock, nl + '      popAt(b);' + nl), 'function draw() {', helper + nl + 'function draw() {')],
      ['popup with another name and let', 'pass', { 'script.js': S['script.js'].replace('const pop =', 'let plus =').replace(/\bpop\./g, 'plus.') }],
      ['popup made at the ball', 'pass', edit(S, 'new Sprite(b.x, b.y - 24, 28)', 'new Sprite(ball.x, ball.y - 20, 28)')],
      ['nested: touching, then not before', 'pass', edit(S, hitOpen, '    if (touching) if (!b.wasTouching) {')],
      ['nested with braces', 'pass', edit(edit(S, hitOpen, '    if (touching) {' + nl + '    if (!b.wasTouching) {'), '      pop.life = 40;' + nl + '    }', '      pop.life = 40;' + nl + '    }' + nl + '    }')],
      ['the hit in a variable first', 'pass', edit(S, hitOpen, '    const isHit = touching && !b.wasTouching;' + nl + '    if (isHit) {')],
      ['memory tested with == false', 'pass', edit(S, '!b.wasTouching', 'b.wasTouching == false')],
      ['clarifying parentheses', 'pass', edit(S, hitOpen, '    if ((touching) && !(b.wasTouching)) {')],
      ['brace on its own line', 'pass', edit(S, hitOpen, '    if (touching && !b.wasTouching)' + nl + '    {')],
      ['double quotes everywhere', 'pass', { 'script.js': S['script.js'].replace(/'/g, '"') }],
      ['the loop moved into update()', 'pass', (() => {
        const src = S['script.js'];
        const from = src.indexOf('  for (const b of bumpers) {');
        const to = src.indexOf(mem + nl + '  }' + nl) + (mem + nl + '  }' + nl).length;
        const loop = src.slice(from, to);
        return { 'script.js': src.replace(loop, '') + nl + 'function update() {' + nl + loop + '}' + nl };
      })()],
      ['popup made on every frame of a touch', 'r2', edit(noPop, mem, '    if (touching) {' + nl + popLines + '    }' + nl + mem)],
      ['popup under colliding() alone', 'r2', edit(noPop, mem, '    if (ball.colliding(b)) {' + nl + popLines + '    }' + nl + mem)],
      ['popup straight in draw()', 'r2', edit(noPop, "  if (kb.presses('r')) {", popLines.replace(/b\.(x|y|worth)/g, '20') + "  if (kb.presses('r')) {")],
      ['popup in the else', 'r2', edit(noPop, mem, mem.replace(mem, '    if (touching && !b.wasTouching) {} else {' + nl + popLines + '    }' + nl + mem))],
      ['popup under the R key', 'r2', edit(noPop, "  if (kb.presses('r')) {", "  if (kb.presses('r')) {" + nl + popLines.replace(/b\.(x|y|worth)/g, '20'))],
      ['popup made once in setup()', 'r2', edit(noPop, '  score = 0;', popLines.replace(/b\.(x|y|worth)/g, '20') + '  score = 0;')],
      ['popup only in a comment', 'r2', edit(S, '      const pop = new Sprite(', '      // const pop = new Sprite(')],
      ['memory tested with === false (never true)', 'r2', edit(S, '!b.wasTouching', 'b.wasTouching === false')],
      ['if (!b.wasTouching) alone (every frame apart)', 'r2', edit(noPop, mem, '    if (!b.wasTouching) {' + nl + popLines + '    }' + nl + mem)],
      ['popup under ||', 'r2', edit(noPop, mem, '    if (touching || !b.wasTouching) {' + nl + popLines + '    }' + nl + mem)],
      // fix round (advanced lens F1): an if with && and a ! that is not about the hit makes a popup every frame
      ['popup under an if on the score and a flag', 'r2', edit(edit(noPop, mem, '    if (score >= 0 && !over) {' + nl + popLines + '    }' + nl + mem), 'let bumpers = [];', 'let bumpers = [];' + nl + 'let over = false;')],
      ['popup under a key press and a flag', 'r2', edit(edit(noPop, mem, "    if (kb.presses('r') && !done) {" + nl + popLines + '    }' + nl + mem), 'let bumpers = [];', 'let bumpers = [];' + nl + 'let done = false;')],
      ['popup under if (true) { if (!done) }', 'r2', edit(edit(noPop, mem, '    if (true) {' + nl + '      if (!done) {' + nl + popLines + '      }' + nl + '    }' + nl + mem), 'let bumpers = [];', 'let bumpers = [];' + nl + 'let done = false;')],
      ['touching === 1 (the first frame of a touch)', 'pass', edit(S, hitOpen, '    if (touching === 1) {')],
      ['colliding() == 1 inline', 'pass', edit(S, hitOpen, '    if (ball.colliding(b) == 1) {')],
      ['touching made true/false first, memory === false', 'pass', edit(edit(S, '    const touching = ball.colliding(b);', '    const touching = ball.colliding(b) > 0;'), '!b.wasTouching', 'b.wasTouching === false')],
      ['touching made true/false first, memory !== true', 'pass', edit(edit(S, '    const touching = ball.colliding(b);', '    const touching = ball.colliding(b) > 0;'), '!b.wasTouching', 'b.wasTouching !== true')],
      ['colliding() > 0 inline with === false', 'pass', edit(edit(S, '    const touching = ball.colliding(b);' + nl + hitOpen, '    if (ball.colliding(b) > 0 && b.wasTouching === false) {'), mem, '    b.wasTouching = ball.colliding(b) > 0;')],
      ['a hit variable of its own name', 'pass', edit(S, hitOpen, '    const isHit = touching && !b.wasTouching;' + nl + '    if (isHit) {')],
      // r3: the popup removes itself
      ['life from a constant', 'pass', edit(edit(S, '      pop.life = 40;', '      pop.life = POP_LIFE;'), 'let bumpers = [];', 'let bumpers = [];' + nl + 'const POP_LIFE = 40;')],
      ['life of half a second', 'pass', edit(S, '      pop.life = 40;', '      pop.life = 30;')],
      ['a countdown of their own that ends in delete()', 'pass', edit(edit(edit(S, '      pop.life = 40;', '      pop.timer = 40;' + nl + '      pops.push(pop);'), 'let bumpers = [];', 'let bumpers = [];' + nl + 'let pops = [];'), "  if (kb.presses('r')) {", '  for (const p of pops) {' + nl + '    p.timer -= 1;' + nl + '    if (p.timer <= 0) p.delete();' + nl + '  }' + nl + nl + "  if (kb.presses('r')) {")],
      ['no life at all', 'r3', edit(S, '      pop.life = 40;' + nl, '')],
      ['life on the ball', 'r3', lifeOn('ball')],
      ['life on the bumper', 'r3', lifeOn('b')],
      ['life of 0', 'r3', edit(S, 'pop.life = 40', 'pop.life = 0')],
      ['life of -1 (never runs out)', 'r3', edit(S, 'pop.life = 40', 'pop.life = -1')],
      ['life only in a comment', 'r3', edit(S, '      pop.life = 40;', '      // pop.life = 40;')],
      ['popup with its life made once in setup()', 'r3', edit(noPop, '  score = 0;', popLines.replace(/b\.(x|y|worth)/g, '20') + '  score = 0;')],
    ]);
  }

  // 5.3.19 Lab: Nudge the table
  {
    const id = '5-3-pinball-polish-5-lab-nudge-the-table';
    const S = solutionFiles(id);
    const nudge = "  if (kb.pressing('left')) ball.applyForce(-5, 0);" + nl + "  if (kb.pressing('right')) ball.applyForce(5, 0);";
    const n = (to) => edit(S, nudge, to);
    const mass = '  ball.mass = 1;';
    const dbg = '  ball.debug = true;';
    run(id, [
      ['reference', 'pass', S],
      ['untouched starter', 'r1', starterFiles(id)],
      // r1: a held key pushes the ball
      ['braces', 'pass', n("  if (kb.pressing('left')) {" + nl + '    ball.applyForce(-5, 0);' + nl + "  } else if (kb.pressing('right')) {" + nl + '    ball.applyForce(5, 0);' + nl + '  }')],
      ['one key only', 'pass', n("  if (kb.pressing('right')) ball.applyForce(5, 0);")],
      ['a and d', 'pass', swap(swap(S, "kb.pressing('left')", "kb.pressing('a')"), "kb.pressing('right')", "kb.pressing('d')")],
      ['a force from a constant', 'pass', edit(n("  if (kb.pressing('left')) ball.applyForce(-PUSH, 0);" + nl + "  if (kb.pressing('right')) ball.applyForce(PUSH, 0);"), 'let bumpers = [];', 'let bumpers = [];' + nl + 'const PUSH = 5;')],
      ['the key read into a variable first', 'pass', n("  const left = kb.pressing('left');" + nl + "  const right = kb.pressing('right');" + nl + '  if (left) ball.applyForce(-5, 0);' + nl + '  if (right) ball.applyForce(5, 0);')],
      ['the key inside the force, as a ternary', 'pass', n("  ball.applyForce(kb.pressing('right') ? 5 : kb.pressing('left') ? -5 : 0, 0);")],
      ['a helper with the keys inside', 'pass', { 'script.js': n('  nudge();')['script.js'] + nl + 'function nudge() {' + nl + nudge + nl + '}' + nl }],
      ['a helper called from the key branch', 'pass', { 'script.js': n("  if (kb.pressing('left')) push(-5);" + nl + "  if (kb.pressing('right')) push(5);")['script.js'] + nl + 'function push(f) {' + nl + '  ball.applyForce(f, 0);' + nl + '}' + nl }],
      ['pushes in update()', 'pass', { 'script.js': n('')['script.js'] + nl + 'function update() {' + nl + nudge + nl + '}' + nl }],
      ['both keys in one if with ||', 'pass', n("  if (kb.pressing('left') || kb.pressing('right')) ball.applyForce(kb.pressing('left') ? -5 : 5, 0);")],
      ['clarifying parentheses', 'pass', swap(S, "if (kb.pressing('left'))", "if ((kb.pressing('left')))")],
      ['double quotes everywhere', 'pass', { 'script.js': S['script.js'].replace(/'/g, '"') }],
      ['a direction set under the keys, then one push (5.1.16)', 'pass', n('  let dir = 0;' + nl + "  if (kb.pressing('left')) dir = -5;" + nl + "  else if (kb.pressing('right')) dir = 5;" + nl + '  ball.applyForce(dir, 0);')],
      ['a direction with braces', 'pass', n('  let push = 0;' + nl + "  if (kb.pressing('left')) {" + nl + '    push = -5;' + nl + "  } else if (kb.pressing('right')) {" + nl + '    push = 5;' + nl + '  }' + nl + '  ball.applyForce(push, 0);')],
      ['a direction set, but the push ignores it', 'r1', n('  let dir = 0;' + nl + "  if (kb.pressing('left')) dir = -5;" + nl + '  ball.applyForce(5, 0);')],
      ['a direction set under kb.presses (one frame)', 'r1', n('  let dir = 0;' + nl + "  if (kb.presses('left')) dir = -5;" + nl + '  ball.applyForce(dir, 0);')],
      ['the push changes vel.x instead', 'r1', n("  if (kb.pressing('left')) ball.vel.x -= 0.3;" + nl + "  if (kb.pressing('right')) ball.vel.x += 0.3;")],
      ['a force on every frame, no key', 'r1', n('  ball.applyForce(5, 0);')],
      ['a push under kb.presses (one frame)', 'r1', swap(S, 'kb.pressing(', 'kb.presses(')],
      ['the push only in a comment', 'r1', n("  // if (kb.pressing('right')) ball.applyForce(5, 0);")],
      ['the push only in a string', 'r1', n("  const note = \"if (kb.pressing('right')) ball.applyForce(5, 0)\";")],
      // r2: the weight
      ['a decimal mass', 'pass', edit(S, mass, '  ball.mass = 0.8;')],
      ['a mass from a constant', 'pass', edit(edit(S, mass, '  ball.mass = BALL_MASS;'), 'let bumpers = [];', 'let bumpers = [];' + nl + 'const BALL_MASS = 2;')],
      ['density instead of mass', 'pass', edit(S, mass, '  ball.density = 3;')],
      ['the mass set again on R', 'pass', edit(edit(S, mass + nl, ''), "  if (kb.presses('r')) {", "  if (kb.presses('r')) {" + nl + '    ball.mass = 2;')],
      ['no mass', 'r2', edit(S, mass + nl, '')],
      ['mass only in a comment', 'r2', edit(S, mass, '  // ball.mass = 1;')],
      ['mass compared, not set', 'r2', edit(S, mass, '  if (ball.mass == 1) score = 0;')],
      // r3: debug
      ['debug from a flag variable', 'pass', edit(edit(S, dbg, '  ball.debug = SHOW;'), 'let bumpers = [];', 'let bumpers = [];' + nl + 'const SHOW = true;')],
      ['debug set to null', 'r3', edit(S, dbg, '  ball.debug = null;')],
      ['debug flipped by a key', 'pass', edit(edit(S, dbg + nl, ''), "  if (kb.presses('r')) {", "  if (kb.presses('d')) ball.debug = !ball.debug;" + nl + "  if (kb.presses('r')) {")],
      ['debug on a bumper instead', 'pass', edit(edit(S, dbg + nl, ''), '  b1.text = b1.worth;', '  b1.text = b1.worth;' + nl + '  b1.debug = true;')],
      ['debug on every bumper in a loop', 'pass', edit(edit(S, dbg + nl, ''), '  bumpers.push(b1, b2, b3);', '  bumpers.push(b1, b2, b3);' + nl + '  for (const b of bumpers) b.debug = true;')],
      ['no debug', 'r3', edit(S, dbg + nl, '')],
      ['debug set to false', 'r3', edit(S, dbg, '  ball.debug = false;')],
      ['debug only in a comment', 'r3', edit(S, dbg, '  // ball.debug = true;')],
      ['debug only in a string', 'r3', edit(S, dbg, "  const tip = 'ball.debug = true';")],
    ]);
  }

  // 5.3.21 Challenges: Polish it your way (one card, any challenge)
  {
    const id = '5-3-pinball-polish-7-challenges-polish-it-your-way';
    const S = solutionFiles(id);
    const T = starterFiles(id);
    const popEnd = '      pop.life = 40;';
    const rKey = "  if (kb.presses('r')) {";
    const top = 'let bumpers = [];';
    const fade = (line) => edit(edit(edit(T, top, top + nl + 'let pops = [];'), popEnd, popEnd + nl + '      pops.push(pop);'), rKey, '  for (const p of pops) {' + nl + '    ' + line + nl + '  }' + nl + nl + rKey);
    run(id, [
      ['reference: all three', 'pass', S],
      ['untouched starter', 'r1', T],
      ['fade from life', 'pass', fade('p.opacity = p.life / 40;')],
      ['fade by a step each frame', 'pass', fade('p.opacity -= 0.025;')],
      ['fade by a multiplier', 'pass', fade('p.opacity *= 0.9;')],
      ['tilt with a frameCount window', 'pass', edit(edit(T, top, top + nl + 'let nudges = 0;'), rKey, "  if (kb.presses('left') || kb.presses('right')) nudges += 1;" + nl + '  if (frameCount % 120 === 0) nudges = 0;' + nl + '  if (nudges > 3) ball.y = 500;' + nl + rKey)],
      ['tilt counted on a key, reset by R', 'pass', edit(edit(edit(T, top, top + nl + 'let nudges = 0;'), rKey, "  if (kb.presses('left')) {" + nl + '    nudges++;' + nl + '  }' + nl + rKey), rKey, rKey + nl + '    nudges = 0;')],
      ['heavier from round 2, in the R key', 'pass', edit(edit(T, top, top + nl + 'let roundNumber = 1;'), rKey, rKey + nl + '    roundNumber = roundNumber + 1;' + nl + '    if (roundNumber >= 2) ball.mass = 3;')],
      ['mass worked out from the round', 'pass', edit(edit(T, top, top + nl + 'let level = 1;'), rKey, rKey + nl + '    level += 1;' + nl + '    ball.mass = level;')],
      // fix round: honest shapes the lenses found refused
      ['heavier in a nextRound() helper called from R', 'pass', { 'script.js': edit(edit(T, top, top + nl + 'let roundNumber = 1;'), rKey, rKey + nl + '    nextRound();')['script.js'] + nl + 'function nextRound() {' + nl + '  roundNumber++;' + nl + '  ball.mass = 3;' + nl + '}' + nl }],
      ['fade through a variable first', 'pass', fade('const fade = p.life / 40;' + nl + '    p.opacity = fade;')],
      ['a stepped fade under an if on life', 'pass', fade('if (p.life < 20) p.opacity = 0.5;')],
      ['tilt as a budget that counts down', 'pass', edit(edit(T, top, top + nl + 'let budget = 3;'), rKey, "  if (kb.presses('left') || kb.presses('right')) budget -= 1;" + nl + '  if (budget < 0) ball.y = 500;' + nl + rKey)],
      ['own idea: a score multiplier', 'pass', edit(T, '      score += b.worth;', '      score += b.worth * 2;')],
      ['own idea: a combo bonus', 'pass', edit(edit(T, top, top + nl + 'let combo = 0;'), '      score += b.worth;', '      combo += 1;' + nl + '      score += b.worth + combo;')],
      ['own idea: a bouncier ball', 'pass', edit(T, '  ball.bounciness = 0;', '  ball.bounciness = 0.4;')],
      ['gravityScale set to its default 1', 'r1', edit(T, '  ball.mass = 1;', '  ball.mass = 1;' + nl + '  ball.gravityScale = 1;')],
      ['rotationLock set to its default false', 'r1', edit(T, '  ball.mass = 1;', '  ball.mass = 1;' + nl + '  ball.rotationLock = false;')],
      ['popup opacity set once inside the hit', 'r1', edit(T, '      pop.life = 40;', '      pop.life = 40;' + nl + '      pop.opacity = 0.7;')],
      ['own idea: gravityScale', 'pass', edit(T, '  ball.mass = 1;', '  ball.mass = 1;' + nl + '  ball.gravityScale = 0.7;')],
      ['own idea: rotationLock', 'pass', edit(T, '  ball.mass = 1;', '  ball.mass = 1;' + nl + '  ball.rotationLock = true;')],
      ['popup opacity set once (no fade)', 'r1', edit(T, popEnd, popEnd + nl + '      pop.opacity = 0.5;')],
      ['only a colour changed', 'r1', edit(T, "pop.color = 'gold';", "pop.color = 'orange';")],
      ['the mass changed once, in setup()', 'r1', edit(T, '  ball.mass = 1;', '  ball.mass = 3;')],
      ['the rule only in a comment', 'r1', { 'script.js': '// My polish: the popups fade with opacity and frameCount.' + nl + T['script.js'] }],
      ['frameCount only in a string', 'r1', edit(T, "text('click the game, then press R to drop the ball', 20, 26);", "text('frameCount', 20, 26);")],
    ]);
  }
}

// ---------------------------------------------------------------- 6.22-6.26 (Trail)
//
// Three student lenses walked the Trail chain in a browser (2026-11-07). Each accept
// below is an answer a student actually wrote, or the shape a course screen modelled,
// that an early card refused. The rejects are the smuggles that early cards let
// through: a long string that merely CONTAINS `'J' at += 2` once scored the letter
// cards. Those cards now keep 1-letter literals (`keepShortStrings`) and want the
// letter in a comparison or a case.
{
  const T = {
    sb1: '6-22-trail-3-sub-a-path-from-a-list', lay: '6-22-trail-4-lab-lay-the-trail',
    die: '6-23-trail-2-sub-one-die-two-turns', turns: '6-23-trail-3-lab-take-turns-to-the-finish',
    sq: '6-24-trail-2-sub-a-square-that-does-something', jsw: '6-24-trail-3-lab-jump-slide-and-wait',
    sb4: '6-25-trail-2-sub-send-and-receive-one-number', online: '6-25-trail-3-lab-trail-online',
    yours: '6-26-trail-3-challenges-make-it-yours',
  };
  // The reference with one exact piece swapped. A piece that is not there is a broken
  // case, not a pass, so it throws.
  const swap = (id, ...pairs) => {
    let code = solutionFiles(id)['script.js'];
    for (let k = 0; k < pairs.length; k += 2) {
      if (!code.includes(pairs[k])) throw new Error(`Trail case for ${id}: ${JSON.stringify(pairs[k])} is not in the reference`);
      code = code.split(pairs[k]).join(pairs[k + 1]);
    }
    return { 'script.js': code };
  };
  const plus = (id, extra) => ({ 'script.js': starterFiles(id)['script.js'] + nl + extra + nl });
  for (const id of Object.values(T)) {
    accept(id, 'reference solution', solutionFiles(id));
    reject(id, 'untouched starter', null, starterFiles(id));
  }

  const draw = 'text(String(i), path[i].x - 5, path[i].y + 6, 16, ' + AP + 'white' + AP + ');';
  accept(T.sb1, 'text(1 + i, ...)', swap(T.sb1, draw, 'text(1 + i, path[i].x - 5, path[i].y + 6, 16, ' + AP + 'white' + AP + ');'));
  accept(T.sb1, 'a bare number in text()', swap(T.sb1, draw, 'text(i, path[i].x - 5, path[i].y + 6);'));

  const body = [
    '    const r = floor(i / COLS);', '    let c = i % COLS;', '    if (r % 2 === 1) c = COLS - 1 - c;',
    '    squares.push({ x: c * SIZE + SIZE / 2, y: TOP + r * SIZE + SIZE / 2, kind: track[i] });',
  ].join(nl);
  const loop = '  for (let i = 0; i < track.length; i++) {' + nl + body + nl + '  }';
  accept(T.lay, 'a while loop over the track', swap(T.lay, loop,
    '  let i = 0;' + nl + '  while (i < track.length) {' + nl + body + nl + '    i++;' + nl + '  }'));
  accept(T.lay, 'a hard-coded 31', swap(T.lay, 'i < track.length', 'i < 31'));
  accept(T.lay, 'nested row and column loops, as 6.14.9 models', swap(T.lay, loop, [
    '  for (let r = 0; r < 4; r++) {', '    for (let col = 0; col < COLS; col++) {', '      const i = r * COLS + col;',
    '      if (i >= track.length) continue;', '      const c = r % 2 === 1 ? COLS - 1 - col : col;',
    '      squares.push({ x: c * SIZE + SIZE / 2, y: TOP + r * SIZE + SIZE / 2, kind: track[i] });', '    }', '  }'].join(nl)));
  accept(T.lay, 'fields set one at a time, then pushed', swap(T.lay,
    '    squares.push({ x: c * SIZE + SIZE / 2, y: TOP + r * SIZE + SIZE / 2, kind: track[i] });',
    ['    const sq = {};', '    sq.x = c * SIZE + SIZE / 2;', '    sq.y = TOP + r * SIZE + SIZE / 2;', '    sq.kind = track[i];', '    squares.push(sq);'].join(nl)));
  accept(T.lay, 'squares[i] = { ... }', swap(T.lay, 'squares.push({ x: c * SIZE + SIZE / 2, y: TOP + r * SIZE + SIZE / 2, kind: track[i] });',
    'squares[i] = { x: c * SIZE + SIZE / 2, y: TOP + r * SIZE + SIZE / 2, kind: track[i] };'));

  const pass2 = 'turn = (turn + 1) % 2;';
  accept(T.die, '(1 + turn) % 2', swap(T.die, pass2, 'turn = (1 + turn) % 2;'));
  accept(T.die, '!turn ? 1 : 0', swap(T.die, pass2, 'turn = !turn ? 1 : 0;'));
  accept(T.die, '1 - turn', swap(T.die, pass2, 'turn = 1 - turn;'));
  accept(T.die, 'round(random(1, 6))', swap(T.die, 'floor(random(1, 7))', 'round(random(1, 6))'));
  accept(T.die, 'Math.floor(Math.random() * 6) + 1', swap(T.die, 'floor(random(1, 7))', 'Math.floor(Math.random() * 6) + 1'));

  const passN = 'turn = (turn + 1) % players.length;';
  accept(T.turns, 'add one, then take the remainder', swap(T.turns, passN, 'turn = turn + 1;' + nl + '  turn = turn % players.length;'));
  accept(T.turns, '(1 + turn) % players.length', swap(T.turns, passN, 'turn = (1 + turn) % players.length;'));
  accept(T.turns, 'a ternary wrap', swap(T.turns, passN, 'turn = turn === players.length - 1 ? 0 : turn + 1;'));
  accept(T.turns, 'a ternary clamp instead of min', swap(T.turns, 'p.at = min(p.at + r, last);', 'p.at = p.at + r > last ? last : p.at + r;'));
  accept(T.turns, 'a player field called square', swap(T.turns, '.at', '.square', 'at: 0', 'square: 0'));

  accept(T.sq, 'substring for the letter', swap(T.sq, "ROW[at] === 'J'", "ROW.substring(at, at + 1) === 'J'"));
  accept(T.sq, 'two ++ for the jump', swap(T.sq, 'at = min(at + 2, ROW.length - 1);', 'at++; at++;'));
  accept(T.sq, "'J' === ROW[at]", swap(T.sq, "ROW[at] === 'J'", "'J' === ROW[at]"));
  accept(T.sq, 'a switch', swap(T.sq,
    "    if (ROW[at] === 'J') { at = min(at + 2, ROW.length - 1); note = 'jumped ahead 2'; }" + nl +
    "    else if (ROW[at] === 'S') { at = 0; note = 'back to the start'; }",
    '    switch (ROW[at]) {' + nl + "      case 'J': at = min(at + 2, ROW.length - 1); break;" + nl + "      case " + BT + 'S' + BT + ': at = 0; break;' + nl + '    }'));
  reject(T.sq, 'the J only inside a long string', 'r2', plus(T.sq, 'const cheat = "' + AP + 'J' + AP + ' at += 2  ' + AP + 'S' + AP + ' at = 0";'));
  reject(T.sq, 'the S only inside a long string', 'r3', plus(T.sq, 'const cheat = "' + AP + 'J' + AP + ' at += 2  ' + AP + 'S' + AP + ' at = 0";'));

  accept(T.jsw, 'a lowercase jump constant', swap(T.jsw, 'p.at = min(p.at + 3, last);', 'p.at = min(p.at + jump, last);', 'const COLORS', 'const jump = 3;' + nl + 'const COLORS'));
  accept(T.jsw, '3 + p.at', swap(T.jsw, 'min(p.at + 3, last)', 'min(3 + p.at, last)'));
  accept(T.jsw, 'while the next player is waiting', swap(T.jsw, '  if (players[turn].waiting) {', '  while (players[turn].waiting) {'));
  accept(T.jsw, "'J' === kind", swap(T.jsw, "kind === 'J'", "'J' === kind"));
  const cheat = 'const cheat = "kind === ' + AP + 'J' + AP + ' p.at + 3 ' + AP + 'S' + AP + ' - 3 ' + AP + 'W' + AP + ' = true";';
  reject(T.jsw, 'J only inside a long string', 'r1', plus(T.jsw, cheat));
  reject(T.jsw, 'S only inside a long string', 'r2', plus(T.jsw, cheat));
  reject(T.jsw, 'W only inside a long string', 'r3', plus(T.jsw, cheat));

  accept(T.online, 'the seat kept in a variable', swap(T.online, 'return online.status === ' + AP + 'ready' + AP + ' && online.seat === turn;',
    'const me = online.seat;' + nl + '  return online.status === ' + AP + 'ready' + AP + ' && me === turn;'));
  accept(T.online, "send when 'ready', otherwise take the turn", swap(T.online,
    "  if (online.status === 'off') takeTurn(r);" + nl + '  else online.send({ roll: r });',
    "  if (online.status === 'ready') online.send({ roll: r });" + nl + '  else takeTurn(r);'));
  reject(T.online, "only the H line tests status 'off'", 'r4', plus(T.online,
    'function draw2() {' + nl + "  if (kb.presses('h') && online.status === 'off') { newGame(); online.host(); }" + nl + '}'));

  accept(T.yours, 'three players made in a loop', swap(T.yours, "const TRACK = '....J....S..W..J...B.S..W.J.S.F';", "const TRACK = '....J....S..W..J.....S..W.J.S.F';",
    "  if (kind === 'B') { p.at = 0; message += ', back to the start'; }" + nl, '',
    '  players = [' + nl + "    { name: 'Red', color: 'tomato', at: 0, waiting: false }," + nl + "    { name: 'Blue', color: 'dodgerblue', at: 0, waiting: false }," + nl + '  ];',
    "  players = [];" + nl + "  const NAMES = ['Red', 'Blue', 'Green'];" + nl + '  for (let i = 0; i < 3; i++) players.push({ name: NAMES[i], color: COLORS.J, at: 0, waiting: false });'));
  accept(T.yours, '++p.at in a hop', swap(T.yours, "  if (kind === 'B') { p.at = 0; message += ', back to the start'; }", '  if (hops > 0) ++p.at;'));
  accept(T.yours, 'p.at = 1 + p.at in a hop', swap(T.yours, "  if (kind === 'B') { p.at = 0; message += ', back to the start'; }", '  if (hops > 0) p.at = 1 + p.at;'));
  accept(T.yours, 'a lowercase letter', swap(T.yours, "kind === 'B'", "kind === 'b'"));
  reject(T.yours, 'a new letter only inside a long string', 'r1', plus(T.yours, 'const note = "kind === ' + AP + 'B' + AP + '";'));
}

// ---------------------------------------------------------------- 6.27-6.32 (Checkers)
//
// The second board game (2026-11-07), built with the Trail walks' lessons in from the
// start. Each accept below is a correct answer in another shape: other names, Math.abs,
// a ternary, a !== form, nested ifs, a switch, a helper function. The rejects are the
// smuggles: a letter or a number that only appears inside a long string, and an online
// handler that makes every move without asking the rules first.
{
  const K = {
    sb1: '6-27-checkers-3-sub-a-checkered-board', board: '6-27-checkers-4-lab-set-up-the-board',
    pick: '6-28-checkers-2-sub-pick-up-and-put-down', step: '6-28-checkers-3-lab-pick-a-piece-and-step',
    sb3: '6-29-checkers-2-sub-jump-and-take', jump: '6-29-checkers-3-lab-jumps-and-jumping-again',
    crown: '6-30-checkers-2-sub-crown-a-king', kings: '6-30-checkers-3-lab-kings-and-the-win',
    sb5: '6-31-checkers-2-sub-send-a-click', online: '6-31-checkers-3-lab-checkers-online',
    yours: '6-32-checkers-3-challenges-make-it-yours',
  };
  const swap = (id, ...pairs) => {
    let code = solutionFiles(id)['script.js'];
    for (let k = 0; k < pairs.length; k += 2) {
      if (!code.includes(pairs[k])) throw new Error(`Checkers case for ${id}: ${JSON.stringify(pairs[k])} is not in the reference`);
      code = code.split(pairs[k]).join(pairs[k + 1]);
    }
    return { 'script.js': code };
  };
  const plus = (id, extra) => ({ 'script.js': starterFiles(id)['script.js'] + nl + extra + nl });
  for (const id of Object.values(K)) {
    accept(id, 'reference solution', solutionFiles(id));
    reject(id, 'untouched starter', null, starterFiles(id));
  }

  const shade = "fill((r + c) % 2 === 1 ? '#7a5a40' : '#ead9b6');";
  accept(K.sb1, '% 2 !== 0', swap(K.sb1, '% 2 === 1', '% 2 !== 0'));
  accept(K.sb1, 'if / else instead of a ternary', swap(K.sb1, shade, "if ((r + c) % 2 === 1) fill('#7a5a40');" + nl + "      else fill('#ead9b6');"));
  accept(K.sb1, 'the test kept in a variable', swap(K.sb1, shade, 'const dark = (r + c) % 2 === 1;' + nl + "      fill(dark ? '#7a5a40' : '#ead9b6');"));
  accept(K.sb1, 'a while loop inside the for', swap(K.sb1, '    for (let c = 0; c < N; c++) {', '    let c = 0;' + nl + '    while (c < N) {', '      rect(c * CELL, r * CELL, CELL, CELL);', '      rect(c * CELL, r * CELL, CELL, CELL);' + nl + '      c++;'));
  accept(K.sb1, 'the corner kept in x and y first', swap(K.sb1, '      rect(c * CELL, r * CELL, CELL, CELL);', '      const x = c * CELL;' + nl + '      const y = r * CELL;' + nl + '      rect(x, y, CELL, CELL);'));
  accept(K.sb1, 'only x kept in a name', swap(K.sb1, '      rect(c * CELL, r * CELL, CELL, CELL);', '      const x = c * CELL;' + nl + '      rect(x, r * CELL, CELL, CELL);'));

  const black = "      if ((r + c) % 2 === 1 && r < 3) p = 'b';";
  const red = "      if ((r + c) % 2 === 1 && r > 4) p = 'r';";
  accept(K.board, 'nested ifs', swap(K.board, black + nl + red, "      if ((r + c) % 2 === 1) {" + nl + "        if (r < 3) p = 'b';" + nl + "        if (r > 4) p = 'r';" + nl + '      }'));
  accept(K.board, 'r <= 2 and r >= 5', swap(K.board, 'r < 3)', 'r <= 2)', 'r > 4)', 'r >= 5)'));
  accept(K.board, 'a ternary chain', swap(K.board, black + nl + red, "      if ((r + c) % 2 === 1) p = r < 3 ? 'b' : r > 4 ? 'r' : '';"));
  accept(K.board, '% 2 !== 0, the rows tested first', swap(K.board, black + nl + red, "      if (r < 3 && (r + c) % 2 !== 0) p = 'b';" + nl + "      if (r > 4 && (r + c) % 2 !== 0) p = 'r';"));
  accept(K.board, 'an isDark helper', swap(K.board, black + nl + red, "      if (isDark(r, c) && r < 3) p = 'b';" + nl + "      if (isDark(r, c) && r >= N - 3) p = 'r';",
    'function colorOf(p)', 'function isDark(r, c) { return (r + c) % 2 === 1; }' + nl + 'function colorOf(p)'));
  accept(K.board, 'row numbers one by one', swap(K.board, 'r < 3)', '(r === 0 || r === 1 || r === 2))'));
  reject(K.board, 'pieces on every square of their rows', 'r1', swap(K.board, black + nl + red, "      if (r < 3) p = 'b';" + nl + "      if (r > 4) p = 'r';"));
  reject(K.board, "the 'b' only inside a long string", 'r2', plus(K.board, 'const note = "(r + c) % 2 === 1 && r < 3 ' + AP + 'b' + AP + '";'));
  accept(K.board, 'one push with a ternary', swap(K.board, black + nl + red + nl + '      row.push(p);', "      row.push((r + c) % 2 === 1 ? (r < 3 ? 'b' : r > 4 ? 'r' : '') : '');"));
  accept(K.board, 'a pieceAt helper that returns the letter', swap(K.board, black + nl + red, '      p = pieceAt(r, c);',
    'function colorOf(p)', "function pieceAt(r, c) {" + nl + "  if ((r + c) % 2 === 0) return '';" + nl + "  if (r < 3) return 'b';" + nl + "  if (r > 4) return 'r';" + nl + "  return '';" + nl + '}' + nl + nl + 'function colorOf(p)'));
  accept(K.board, 'switch (true)', swap(K.board, black + nl + red, '      switch (true) {' + nl + "        case (r + c) % 2 === 1 && r < 3: p = 'b'; break;" + nl + "        case (r + c) % 2 === 1 && r > 4: p = 'r'; break;" + nl + '      }'));
  accept(K.board, 'a ROWS constant for the three rows', swap(K.board, 'const TOP = 50;', 'const TOP = 50;' + nl + 'const ROWS = 3;',
    black + nl + red, "      if ((r + c) % 2 === 1 && r < ROWS) p = 'b';" + nl + "      if ((r + c) % 2 === 1 && r >= N - ROWS) p = 'r';"));
  // A letter after a comma in an unrelated call is not a placed piece.
  const commas = "console.log((0 + 1) % 2, 0 < 3, 'b', 5 > 4, 'r');";
  reject(K.board, 'letters after commas in a console.log (dark test)', 'r1', plus(K.board, commas));
  reject(K.board, 'letters after commas in a console.log (black)', 'r2', plus(K.board, commas));
  reject(K.board, 'letters after commas in a console.log (red)', 'r3', plus(K.board, commas));

  accept(K.pick, 'Math.floor and Math.abs', swap(K.pick, 'floor(mouse.x', 'Math.floor(mouse.x', 'floor(mouse.y', 'Math.floor(mouse.y', 'abs(r - pr)', 'Math.abs(r - pr)', 'abs(c - pc)', 'Math.abs(c - pc)'));
  accept(K.pick, 'one row up or down, written out', swap(K.pick, 'abs(r - pr) === 1 && abs(c - pc) === 1', '(r === pr - 1 || r === pr + 1) && (c === pc - 1 || c === pc + 1)'));
  accept(K.pick, 'a square of the difference', swap(K.pick, 'abs(r - pr) === 1 && abs(c - pc) === 1', '(r - pr) * (r - pr) === 1 && (c - pc) * (c - pc) === 1'));

  accept(K.step, 'Math.floor and Math.abs', swap(K.step, 'floor(', 'Math.floor(', 'abs(', 'Math.abs('));
  accept(K.step, 'forward as two ifs', swap(K.step, "  const ahead = turn === 'r' ? dr < 0 : dr > 0;" + nl + "  if (!ahead) return '';",
    "  if (turn === 'r' && dr > 0) return '';" + nl + "  if (turn === 'b' && dr < 0) return '';"));
  accept(K.step, 'forward as a direction number', swap(K.step, "  const ahead = turn === 'r' ? dr < 0 : dr > 0;" + nl + "  if (!ahead) return '';",
    "  const dir = turn === 'r' ? -1 : 1;" + nl + "  if (dr !== dir && dr !== 2 * dir) return '';"));
  accept(K.step, 'the turn passes with if / else', swap(K.step, "  turn = turn === 'r' ? 'b' : 'r';", "  if (turn === 'r') turn = 'b';" + nl + "  else turn = 'r';"));
  accept(K.step, 'the turn passes in a switch', swap(K.step, "  turn = turn === 'r' ? 'b' : 'r';", '  switch (turn) {' + nl + "    case 'r': turn = 'b'; break;" + nl + '    default: turn = ' + BT + 'r' + BT + ';' + nl + '  }'));
  accept(K.step, 'the turn passes through a helper', swap(K.step, "  turn = turn === 'r' ? 'b' : 'r';", '  turn = other(turn);', 'function onBoard', "function other(t) { return t === 'r' ? 'b' : 'r'; }" + nl + 'function onBoard'));
  accept(K.step, 'turn === colorOf(p), object shorthand', swap(K.step, "  if (p !== '' && colorOf(p) === turn) {" + nl + '    picked = { r: r, c: c };', "  if (p !== '' && turn === colorOf(p)) {" + nl + '    picked = { r, c };'));
  accept(K.step, 'a player called side', swap(K.step, 'turn', 'side'));
  accept(K.step, 'a player called current', swap(K.step, 'turn', 'current'));
  accept(K.step, 'picked set by a ternary', swap(K.step, "  if (p !== '' && colorOf(p) === turn) {" + nl + '    picked = { r: r, c: c };' + nl + '    return;' + nl + '  }',
    "  if (p !== '') {" + nl + '    picked = colorOf(p) === turn ? { r, c } : picked;' + nl + '    if (colorOf(p) === turn) return;' + nl + '  }'));
  const ahead = "  const ahead = turn === 'r' ? dr < 0 : dr > 0;" + nl + "  if (!ahead) return '';";
  accept(K.step, 'forward from a lookup object', swap(K.step, ahead, '  const dir = { r: -1, b: 1 }[turn];' + nl + "  if (Math.sign(dr) !== dir) return '';"));
  accept(K.step, 'forward with dir = -1 for red', swap(K.step, ahead, '  let dir = 1;' + nl + "  if (colorOf(p) === 'r') dir = -1;" + nl + "  if (dr !== dir) return '';"));
  accept(K.step, 'RED and BLACK constants', swap(K.step, "let turn = 'r';", "const RED = 'r';" + nl + "const BLACK = 'b';" + nl + 'let turn = RED;',
    "  const ahead = turn === 'r' ? dr < 0 : dr > 0;", '  const ahead = turn === RED ? dr < 0 : dr > 0;',
    "  turn = turn === 'r' ? 'b' : 'r';", '  turn = turn === RED ? BLACK : RED;'));
  accept(K.step, 'the turn passes through nextTurn()', swap(K.step, "  turn = turn === 'r' ? 'b' : 'r';", '  turn = nextTurn();', 'function onBoard', "function nextTurn() { return turn === 'r' ? 'b' : 'r'; }" + nl + 'function onBoard'));
  accept(K.step, 'the turn passes through a lookup object', swap(K.step, "let turn = 'r';", "let turn = 'r';" + nl + "const NEXT = { r: 'b', b: 'r' };", "  turn = turn === 'r' ? 'b' : 'r';", '  turn = NEXT[turn];'));
  accept(K.step, 'the turn passes through an inline lookup', swap(K.step, "  turn = turn === 'r' ? 'b' : 'r';", "  turn = { r: 'b', b: 'r' }[turn];"));

  accept(K.sb3, 'Math.abs and the halfway written as start plus half', swap(K.sb3, 'abs(r - picked.r)', 'Math.abs(r - picked.r)', 'abs(c - picked.c)', 'Math.abs(c - picked.c)',
    'const mr = (r + picked.r) / 2;', 'const mr = picked.r + (r - picked.r) / 2;'));
  accept(K.sb3, "'b' === the halfway square", swap(K.sb3, "if (grid[mr][mc] === 'b')", "if ('b' === grid[mr][mc])"));
  accept(K.sb3, 'two rows up, written out', swap(K.sb3, 'abs(r - picked.r) === 2', 'r === picked.r - 2'));
  reject(K.sb3, "'b' only inside a long string", 'r2', plus(K.sb3, 'const note = "(r + picked.r) / 2 === ' + AP + 'b' + AP + '";'));

  accept(K.jump, 'the halfway square from the sum of the ends', swap(K.jump, 'const mid = grid[fr + dr / 2][fc + dc / 2];', 'const mid = grid[(fr + tr) / 2][(fc + tc) / 2];'));
  accept(K.jump, 'the other colour by name', swap(K.jump, "if (mid !== '' && colorOf(mid) !== turn) return 'jump';", "if (colorOf(mid) === (turn === 'r' ? 'b' : 'r')) return 'jump';"));
  accept(K.jump, 'the halfway square kept in two names', swap(K.jump, "  if (kind === 'jump') grid[(fr + tr) / 2][(fc + tc) / 2] = '';",
    '  const mr = (fr + tr) / 2;' + nl + '  const mc = (fc + tc) / 2;' + nl + "  if (kind === 'jump') grid[mr][mc] = '';"));
  accept(K.jump, 'a chain flag called again', swap(K.jump, 'chain', 'again'));
  accept(K.jump, 'Math.abs', swap(K.jump, 'abs(', 'Math.abs('));
  const chainIf = "  if (kind === 'jump' && canJumpFrom(tr, tc)) {" + nl + '    picked = { r: tr, c: tc };' + nl + '    chain = true;' + nl + "    message = nameOf(turn) + ' jumps again!';" + nl + '    return;' + nl + '  }' + nl +
    '  picked = null;' + nl + '  chain = false;' + nl + "  turn = turn === 'r' ? 'b' : 'r';" + nl + '  message = nameOf(turn) + "' + AP + 's turn";';
  const passTurn = '    picked = null;' + nl + "    turn = turn === 'r' ? 'b' : 'r';" + nl + '    message = nameOf(turn) + "' + AP + 's turn";';
  accept(K.jump, 'the chain as if / else, no early return', swap(K.jump, chainIf, "  if (kind === 'jump' && canJumpFrom(tr, tc)) {" + nl + '    picked = { r: tr, c: tc };' + nl + '    chain = true;' + nl + "    message = nameOf(turn) + ' jumps again!';" + nl + '  } else {' + nl + '    chain = false;' + nl + passTurn + nl + '  }'));
  accept(K.jump, 'chain = the test, then if (!chain)', swap(K.jump, chainIf, "  chain = kind === 'jump' && canJumpFrom(tr, tc);" + nl + '  if (chain) {' + nl + '    picked = { r: tr, c: tc };' + nl + "    message = nameOf(turn) + ' jumps again!';" + nl + '  }' + nl + '  if (!chain) {' + nl + passTurn + nl + '  }'));
  accept(K.jump, 'the flag set in a nested if with an else', swap(K.jump, chainIf, '  chain = false;' + nl + "  if (kind === 'jump') {" + nl + '    if (canJumpFrom(tr, tc)) {' + nl + '      chain = true;' + nl + '      picked = { r: tr, c: tc };' + nl + "      message = nameOf(turn) + ' jumps again!';" + nl + '    } else {' + nl + '      chain = false;' + nl + '    }' + nl + '  }' + nl + '  if (!chain) {' + nl + passTurn + nl + '  }'));
  accept(K.jump, 'const again = the test; if (again) return', swap(K.jump, "  if (kind === 'jump' && canJumpFrom(tr, tc)) {", "  const again = kind === 'jump' && canJumpFrom(tr, tc);" + nl + '  if (again) {'));
  reject(K.jump, 'a jump always keeps the turn, never asking canJumpFrom', 'r4', swap(K.jump, "  if (kind === 'jump' && canJumpFrom(tr, tc)) {", "  if (kind === 'jump') {"));

  accept(K.crown, 'a ternary crown', swap(K.crown, "      if (pr === 0) piece = 'R';", "      piece = pr === 0 ? 'R' : piece;"));
  accept(K.crown, 'toUpperCase', swap(K.crown, "      if (pr === 0) piece = 'R';", '      if (pr === 0) piece = piece.toUpperCase();'));
  accept(K.crown, 'the king test first', swap(K.crown, "(up || (down && piece === 'R'))", "(up || (piece === 'R' && down))"));
  reject(K.crown, 'a king that still only steps up', 'r2', swap(K.crown, "(up || (down && piece === 'R'))", 'up'));
  reject(K.crown, 'toUpperCase only on a message', 'r1', plus(K.crown, "let note = 'crowned';" + nl + 'function hud() { text(note.toUpperCase(), 10, 20, 16, ' + AP + 'white' + AP + '); }'));
  accept(K.crown, 'a king as its own else if', swap(K.crown, "abs(c - pc) === 1 && (up || (down && piece === 'R'))) {", "abs(c - pc) === 1 && up || picked && piece === 'R' && abs(r - pr) === 1 && abs(c - pc) === 1) {"));

  accept(K.kings, 'toUpperCase to crown, the row tested first', swap(K.kings, "  if (p === 'r' && r === 0) { grid[r][c] = 'R'; return true; }", "  if (r === 0 && p === 'r') { grid[r][c] = p.toUpperCase(); return true; }"));
  accept(K.kings, 'the king test written out', swap(K.kings, "  if (!ahead && !isKing(p)) return '';", "  if (!ahead && p !== 'R' && p !== 'B') return '';"));
  accept(K.kings, 'a king flag first', swap(K.kings, "  if (!ahead && !isKing(p)) return '';", "  const king = isKing(p);" + nl + "  if (!king && !ahead) return '';"));
  accept(K.kings, 'no move found with isLegal', swap(K.kings, "if (moveKind(r, c, r + d, c + d) !== '' || moveKind(r, c, r + d, c - d) !== '') return true;", 'if (isLegal(r, c, r + d, c + d) || isLegal(r, c, r + d, c - d)) return true;'));
  accept(K.kings, 'R tested after the winner', swap(K.kings, "  if (kb.presses('r') && winner !== '') newGame();", "  if (winner !== '' && kb.presses('r')) newGame();"));
  accept(K.kings, 'R in its own if', swap(K.kings, "  if (kb.presses('r') && winner !== '') newGame();", "  if (kb.presses('r')) {" + nl + "    if (winner !== '') newGame();" + nl + '  }'));
  reject(K.kings, "the crown only inside a long string", 'r1', plus(K.kings, 'const note = "r === 0 = ' + AP + 'R' + AP + '";'));
  reject(K.kings, 'toUpperCase only on a message', 'r1', plus(K.kings, 'function shout() { text(message.toUpperCase(), 10, 40, 16, ' + AP + 'white' + AP + '); }'));
  accept(K.kings, 'a king is a letter that is not lowercase', swap(K.kings, "  if (!ahead && !isKing(p)) return '';", "  if (!ahead && p === p.toLowerCase()) return '';"));
  accept(K.kings, 'a crowned flag', swap(K.kings, "  if (!ahead && !isKing(p)) return '';", "  const crowned = p === 'R' || p === 'B';" + nl + "  if (!ahead && !crowned) return '';"));
  const anyMove = '  for (let r = 0; r < N; r++) {' + nl + '    for (let c = 0; c < N; c++) {' + nl + '      for (const d of [-2, -1, 1, 2]) {' + nl +
    "        if (moveKind(r, c, r + d, c + d) !== '' || moveKind(r, c, r + d, c - d) !== '') return true;" + nl + '      }' + nl + '    }' + nl + '  }' + nl + '  return false;';
  const fromHere = "[-2, -1, 1, 2].some((d) => moveKind(r, c, r + d, c + d) !== '' || moveKind(r, c, r + d, c - d) !== '')";
  accept(K.kings, 'hasAnyMove with .some()', swap(K.kings, anyMove, '  return grid.some((row, r) => row.some((p, c) => ' + fromHere + '));'));
  accept(K.kings, 'hasAnyMove with for...of over the rows', swap(K.kings, anyMove, '  let r = 0;' + nl + '  for (const row of grid) {' + nl + '    for (let c = 0; c < row.length; c++) {' + nl + '      if (' + fromHere + ') return true;' + nl + '    }' + nl + '    r += 1;' + nl + '  }' + nl + '  return false;'));
  accept(K.kings, 'hasAnyMove with the inner loop in a helper', swap(K.kings, anyMove, '  for (let r = 0; r < N; r++) {' + nl + '    if (rowCanGo(r)) return true;' + nl + '  }' + nl + '  return false;' + nl + '}' + nl + nl +
    'function rowCanGo(r) {' + nl + '  for (let c = 0; c < N; c++) {' + nl + '    if (' + fromHere + ') return true;' + nl + '  }' + nl + '  return false;'));
  const winBlock = '  if (!hasAnyMove()) {' + nl + "    winner = turn === 'r' ? 'b' : 'r';" + nl + "    message = nameOf(winner) + ' wins! Press R to play again';" + nl + '  }' + nl;
  accept(K.kings, 'winner = other(turn)', swap(K.kings, "    winner = turn === 'r' ? 'b' : 'r';", '    winner = other(turn);', 'function onBoard', "function other(t) { return t === 'r' ? 'b' : 'r'; }" + nl + 'function onBoard'));
  accept(K.kings, 'a gameOver flag instead of a winner letter', swap(K.kings, "let winner = '';", "let winner = '';" + nl + 'let gameOver = false;',
    "  winner = '';", "  winner = '';" + nl + '  gameOver = false;',
    "    winner = turn === 'r' ? 'b' : 'r';" + nl + "    message = nameOf(winner)", '    gameOver = true;' + nl + "    message = nameOf(turn === 'r' ? 'b' : 'r')",
    "mouse.presses() && winner === ''", 'mouse.presses() && !gameOver', "kb.presses('r') && winner !== ''", "kb.presses('r') && gameOver"));
  reject(K.kings, 'no winner is ever declared', 'r4', swap(K.kings, winBlock, ''));
  reject(K.kings, 'R starts a new game, and no winner is ever declared', 'r4', swap(K.kings, winBlock, '', "  if (kb.presses('r') && winner !== '') newGame();", "  if (kb.presses('r')) newGame();"));

  accept(K.sb5, 'onMove given a named function', swap(K.sb5, '  online.onMove((m, seat) => {' + nl + '    marks.push({ r: m.r, c: m.c, seat: seat });' + nl + '  });', '  online.onMove(gotMove);',
    'function draw() {', 'function gotMove(m, seat) {' + nl + '  marks.push({ r: m.r, c: m.c, seat: seat });' + nl + '}' + nl + nl + 'function draw() {'));

  const handler = "  online.onMove((m, seat) => {" + nl + "    if (goodMove(m) && seat === seatOf(turn) && winner === '' && isLegal(m.fr, m.fc, m.tr, m.tc)) {" + nl + '      doMove(m.fr, m.fc, m.tr, m.tc);' + nl + '    }' + nl + '  });';
  accept(K.online, 'the seat named who, tested second', swap(K.online, handler, "  online.onMove((m, who) => {" + nl + "    if (isLegal(m.fr, m.fc, m.tr, m.tc) && seatOf(turn) === who && winner === '') doMove(m.fr, m.fc, m.tr, m.tc);" + nl + '  });'));
  accept(K.online, 'early returns in the handler', swap(K.online, handler, '  online.onMove((m, seat) => {' + nl + '    if (seat !== seatOf(turn)) return;' + nl + '    if (!isLegal(m.fr, m.fc, m.tr, m.tc)) return;' + nl + '    doMove(m.fr, m.fc, m.tr, m.tc);' + nl + '  });'));
  accept(K.online, 'the handler as a named function', swap(K.online, handler, '  online.onMove(arrived);', 'function seatOf(t)', "function arrived(m, seat) {" + nl + "  if (seat === seatOf(turn) && winner === '' && isLegal(m.fr, m.fc, m.tr, m.tc)) doMove(m.fr, m.fc, m.tr, m.tc);" + nl + '}' + nl + nl + 'function seatOf(t)'));
  accept(K.online, "send when 'ready', otherwise move", swap(K.online,
    "  if (online.status === 'off') doMove(fr, fc, tr, tc);" + nl + '  else online.send({ fr: fr, fc: fc, tr: tr, tc: tc });',
    "  if (online.status === 'ready') online.send({ fr, fc, tr, tc });" + nl + '  else doMove(fr, fc, tr, tc);'));
  reject(K.online, 'every move made without asking the rules', 'r3', swap(K.online, handler, '  online.onMove((m, seat) => doMove(m.fr, m.fc, m.tr, m.tc));'));
  reject(K.online, "only the H line tests status 'off'", 'r4', plus(K.online,
    'function draw2() {' + nl + "  if (kb.presses('h') && online.status === 'off') { newGame(); online.host(); }" + nl + '}'));

  const dots = [
    '    // Challenge 1: a dot on every square the picked piece may move to.', '    for (let r = 0; r < N; r++) {', '      for (let c = 0; c < N; c++) {',
    '        if (isLegal(picked.r, picked.c, r, c)) {', "          fill('rgba(124, 252, 0, 0.6)');", '          circle(c * CELL + CELL / 2, TOP + r * CELL + CELL / 2, 18);',
    '        }', '      }', '    }'].join(nl) + nl;
  accept(K.yours, 'the legal test kept in a variable', swap(K.yours, "        if (isLegal(picked.r, picked.c, r, c)) {", '        const ok = isLegal(picked.r, picked.c, r, c);' + nl + '        if (ok) {'));
  accept(K.yours, 'a draw after 40 quiet moves', swap(K.yours, dots, '', 'let message = ' + AP + AP + ';', 'let message = ' + AP + AP + ';' + nl + 'let quiet = 0;',
    '  const kind = moveKind(fr, fc, tr, tc);' + nl + '  grid[tr][tc]', '  const kind = moveKind(fr, fc, tr, tc);' + nl + "  if (kind === 'jump') quiet = 0; else quiet += 1;" + nl + "  if (quiet >= 40) winner = 'draw';" + nl + '  grid[tr][tc]'));
  accept(K.yours, 'jumps you must take', swap(K.yours, dots, '', 'function canJumpFrom(r, c) {',
    'function anyJump() {' + nl + '  for (let r = 0; r < N; r++) {' + nl + '    for (let c = 0; c < N; c++) {' + nl + '      if (colorOf(grid[r][c]) === turn && canJumpFrom(r, c)) return true;' + nl + '    }' + nl + '  }' + nl + '  return false;' + nl + '}' + nl + nl + 'function canJumpFrom(r, c) {',
    "  if (kind === '') return false;", "  if (kind === '') return false;" + nl + "  if (kind === 'step' && anyJump()) return false;"));
  accept(K.yours, 'jumps you must take, asked through a helper', swap(K.yours, dots, '', "  if (kind === '') return false;", "  if (kind === '') return false;" + nl + "  if (kind !== 'jump' && mustJump()) return false;",
    'function canJumpFrom(r, c) {', 'function mustJump() {' + nl + '  let found = false;' + nl + '  grid.forEach((row, r) => row.forEach((p, c) => { if (colorOf(p) === turn && canJumpFrom(r, c)) found = true; }));' + nl + '  return found;' + nl + '}' + nl + nl + 'function canJumpFrom(r, c) {'));
  reject(K.yours, 'a 40 only inside a string', 'r1', plus(K.yours, 'const note = "quiet >= 40";'));
  reject(K.yours, 'the dots only in a comment', 'r1', plus(K.yours, '// if (isLegal(picked.r, picked.c, r, c)) { fill(0); }'));
  // 6.31-6.32 cases pinned by the 6.31/6.32 fix pass (2026-11-07).
  const sfix = (id, from, to) => {
    const s = starterFiles(id)['script.js'];
    if (!s.includes(from)) throw new Error(`Checkers case for ${id}: ${JSON.stringify(from)} is not in the starter`);
    return { 'script.js': s.replace(from, to) };
  };
  // ---- 6.31.2 r1
  const sbH = '  online.onMove((m, seat) => {' + nl + '    marks.push({ r: m.r, c: m.c, seat: seat });' + nl + '  });';
  accept(K.sb5, 'destructured ({ r, c }, seat)', swap(K.sb5, sbH, '  online.onMove(({ r, c }, seat) => {' + nl + '    marks.push({ r, c, seat });' + nl + '  });'));  // card r1
  accept(K.sb5, 'one parameter, no parentheses', swap(K.sb5, sbH, '  online.onMove(m => marks.push({ r: m.r, c: m.c, seat: 0 }));'));  // card r1
  accept(K.sb5, 'a function expression', swap(K.sb5, sbH, '  online.onMove(function (m, seat) {' + nl + '    marks.push({ r: m.r, c: m.c, seat: seat });' + nl + '  });'));  // card r1
  reject(K.sb5, 'onMove only in a comment', 'r1', plus(K.sb5, '// online.onMove((m, seat) => {});'));

  // ---- 6.31.3
  const playLine = "  if (online.status === 'off') doMove(fr, fc, tr, tc);" + nl + '  else online.send({ fr: fr, fc: fc, tr: tr, tc: tc });   // applied in onMove, on both computers';
  accept(K.online, 'destructured ({ fr, fc, tr, tc }, seat)', swap(K.online, handler, "  online.onMove(({ fr, fc, tr, tc }, seat) => {" + nl + "    if (seat === seatOf(turn) && winner === '' && isLegal(fr, fc, tr, tc)) doMove(fr, fc, tr, tc);" + nl + '  });'));
  accept(K.online, 'named function declared above setup', swap(K.online, handler, '  online.onMove(arrived);', 'function setup() {', "function arrived(m, seat) {" + nl + "  if (seat === seatOf(turn) && winner === '' && isLegal(m.fr, m.fc, m.tr, m.tc)) doMove(m.fr, m.fc, m.tr, m.tc);" + nl + '}' + nl + nl + 'function setup() {'));
  accept(K.online, 'const arrow handler declared below', swap(K.online, handler, '  online.onMove(arrived);', 'function seatOf(t)', "const arrived = (m, seat) => {" + nl + "  if (seat === seatOf(turn) && winner === '' && isLegal(m.fr, m.fc, m.tr, m.tc)) doMove(m.fr, m.fc, m.tr, m.tc);" + nl + '};' + nl + nl + 'function seatOf(t)'));
  accept(K.online, 'const arrow handler declared above setup', swap(K.online, handler, '  online.onMove(arrived);', 'function setup() {', "const arrived = (m, seat) => {" + nl + "  if (seat === seatOf(turn) && winner === '' && isLegal(m.fr, m.fc, m.tr, m.tc)) doMove(m.fr, m.fc, m.tr, m.tc);" + nl + '};' + nl + nl + 'function setup() {'));
  accept(K.online, 'const destructured handler, no braces', swap(K.online, handler, '  online.onMove(arrived);', 'function seatOf(t)', "const arrived = ({ fr, fc, tr, tc }, who) => seatOf(turn) === who && isLegal(fr, fc, tr, tc) && doMove(fr, fc, tr, tc);" + nl + nl + 'function seatOf(t)'));
  accept(K.online, 'the old handler without goodMove', swap(K.online, handler, "  online.onMove((m, seat) => {" + nl + "    if (seat === seatOf(turn) && winner === '' && isLegal(m.fr, m.fc, m.tr, m.tc)) {" + nl + '      doMove(m.fr, m.fc, m.tr, m.tc);' + nl + '    }' + nl + '  });'));
  accept(K.online, 'early returns in the handler', swap(K.online, handler, '  online.onMove((m, seat) => {' + nl + '    if (!goodMove(m)) return;' + nl + '    if (seat !== seatOf(turn)) return;' + nl + '    if (!isLegal(m.fr, m.fc, m.tr, m.tc)) return;' + nl + '    doMove(m.fr, m.fc, m.tr, m.tc);' + nl + '  });'));
  reject(K.online, 'named handler that never checks', 'r3', swap(K.online, handler, '  online.onMove(arrived);', 'function seatOf(t)', 'function arrived(m, seat) { doMove(m.fr, m.fc, m.tr, m.tc); }' + nl + 'function seatOf(t)'));
  reject(K.online, 'const handler that never checks', 'r3', swap(K.online, handler, '  online.onMove(arrived);', 'function seatOf(t)', 'const arrived = (m, seat) => doMove(m.fr, m.fc, m.tr, m.tc);' + nl + 'function seatOf(t)'));

  accept(K.online, 'early return in play()', swap(K.online, playLine, "  if (online.status !== 'off') {" + nl + '    online.send({ fr: fr, fc: fc, tr: tr, tc: tc });' + nl + '    return;' + nl + '  }' + nl + '  doMove(fr, fc, tr, tc);'));  // card r4
  accept(K.online, 'const solo = status off', swap(K.online, playLine, "  const solo = online.status === 'off';" + nl + '  if (solo) doMove(fr, fc, tr, tc);' + nl + '  else online.send({ fr, fc, tr, tc });'));  // card r4
  accept(K.online, 'if (!solo) send, else move', swap(K.online, playLine, "  const solo = online.status === 'off';" + nl + '  if (!solo) online.send({ fr, fc, tr, tc });' + nl + '  else doMove(fr, fc, tr, tc);'));  // card r4
  accept(K.online, 'online.code === null', swap(K.online, playLine, '  if (online.code === null) doMove(fr, fc, tr, tc);' + nl + '  else online.send({ fr: fr, fc: fc, tr: tr, tc: tc });'));  // card r4
  accept(K.online, 'an extra line before doMove', swap(K.online, playLine, "  if (online.status === 'off') {" + nl + '    picked = null;' + nl + '    doMove(fr, fc, tr, tc);' + nl + '  } else {' + nl + '    online.send({ fr: fr, fc: fc, tr: tr, tc: tc });' + nl + '  }'));  // card r4
  accept(K.online, 'an isOffline() helper below', swap(K.online, playLine, '  if (isOffline()) doMove(fr, fc, tr, tc);' + nl + '  else online.send({ fr: fr, fc: fc, tr: tr, tc: tc });', 'function drawBoard() {', "function isOffline() {" + nl + "  return online.status === 'off';" + nl + '}' + nl + nl + 'function drawBoard() {'));  // card r4
  accept(K.online, 'an isOffline arrow above', swap(K.online, playLine, '  if (isOffline()) doMove(fr, fc, tr, tc);' + nl + '  else online.send({ fr: fr, fc: fc, tr: tr, tc: tc });', 'function setup() {', "const isOffline = () => online.status === 'off';" + nl + nl + 'function setup() {'));  // card r4
  accept(K.online, 'a ternary', swap(K.online, playLine, "  online.status === 'off' ? doMove(fr, fc, tr, tc) : online.send({ fr, fc, tr, tc });"));  // card r4
  accept(K.online, 'send braced, move in braced else', swap(K.online, playLine, "  if (online.status !== 'off') {" + nl + '    online.send({ fr, fc, tr, tc });' + nl + '  } else {' + nl + '    doMove(fr, fc, tr, tc);' + nl + '  }'));  // card r4
  reject(K.online, "the H line, the R line and myTurn, but play always sends", 'r4', swap(K.online, playLine, '  online.send({ fr: fr, fc: fc, tr: tr, tc: tc });'));
  reject(K.online, "isOffline helper written but never asked", 'r4', swap(K.online, playLine, '  online.send({ fr: fr, fc: fc, tr: tr, tc: tc });', 'function drawBoard() {', "function isOffline() {" + nl + "  return online.status === 'off';" + nl + '}' + nl + nl + 'function drawBoard() {'));

  // ---- 6.32.3 (dots, above, is the Challenge 1 block of the reference)
  const noDots = (...pairs) => swap(K.yours, dots, '', ...pairs);
  const draw40 = (cmp, decl = '') => noDots("let message = '';", "let message = '';" + nl + 'let quiet = 0;' + decl,
    '  const kind = moveKind(fr, fc, tr, tc);' + nl + '  grid[tr][tc]', '  const kind = moveKind(fr, fc, tr, tc);' + nl + "  if (kind === 'jump') quiet = 0; else quiet += 1;" + nl + '  if (' + cmp + ") winner = 'draw';" + nl + '  grid[tr][tc]');
  accept(K.yours, 'quiet > 39', draw40('quiet > 39'));
  accept(K.yours, 'const LIMIT = 40; quiet >= LIMIT', draw40('quiet >= LIMIT', nl + 'const LIMIT = 40;'));
  accept(K.yours, 'a draw limit of 50, literal', draw40('quiet >= 50'));
  accept(K.yours, 'a draw limit of 50 in a constant', draw40('quiet >= DRAW_AT', nl + 'const DRAW_AT = 50;'));
  accept(K.yours, 'LIMIT <= quiet', draw40('LIMIT <= quiet', nl + 'const LIMIT = 40;'));
  accept(K.yours, 'quiet++ and quiet === 50', noDots("let message = '';", "let message = '';" + nl + 'let quiet = 0;', '  const kind = moveKind(fr, fc, tr, tc);' + nl + '  grid[tr][tc]', '  const kind = moveKind(fr, fc, tr, tc);' + nl + "  if (kind === 'jump') quiet = 0;" + nl + '  else quiet++;' + nl + "  if (quiet === 50) winner = 'draw';" + nl + '  grid[tr][tc]'));
  accept(K.yours, 'a legalSquares() helper returning a list', noDots('function drawPieces() {',
    'function legalSquares(fr, fc) {' + nl + '  const list = [];' + nl + '  for (let r = 0; r < N; r++) {' + nl + '    for (let c = 0; c < N; c++) {' + nl + '      if (isLegal(fr, fc, r, c)) list.push({ r: r, c: c });' + nl + '    }' + nl + '  }' + nl + '  return list;' + nl + '}' + nl + nl + 'function drawPieces() {',
    '    rect(picked.c * CELL, TOP + picked.r * CELL, CELL, CELL);' + nl, '    rect(picked.c * CELL, TOP + picked.r * CELL, CELL, CELL);' + nl + '    for (const s of legalSquares(picked.r, picked.c)) circle(s.c * CELL + CELL / 2, TOP + s.r * CELL + CELL / 2, 18);' + nl));
  const dotIf = '        if (isLegal(picked.r, picked.c, r, c)) {' + nl + "          fill('rgba(124, 252, 0, 0.6)');" + nl + '          circle(c * CELL + CELL / 2, TOP + r * CELL + CELL / 2, 18);' + nl + '        }';
  accept(K.yours, 'if (!isLegal(...)) continue;', swap(K.yours, dotIf,
    '        if (!isLegal(picked.r, picked.c, r, c)) continue;' + nl + "        fill('rgba(124, 252, 0, 0.6)');" + nl + '        circle(c * CELL + CELL / 2, TOP + r * CELL + CELL / 2, 18);'));
  accept(K.yours, 'isLegal(...) && dot(r, c)', swap(K.yours, dotIf,
    '        isLegal(picked.r, picked.c, r, c) && dot(r, c);', 'function drawPieces() {', 'function dot(r, c) {' + nl + "  fill('rgba(124, 252, 0, 0.6)');" + nl + '  circle(c * CELL + CELL / 2, TOP + r * CELL + CELL / 2, 18);' + nl + '}' + nl + nl + 'function drawPieces() {'));
  reject(K.yours, 'const TOP = 40 alone', 'r1', sfix(K.yours, 'const TOP = 50;', 'const TOP = 40;'));
  reject(K.yours, 'const CELL = 40 alone', 'r1', sfix(K.yours, 'const CELL = 60;', 'const CELL = 40;'));
  reject(K.yours, 'let x = 40 alone', 'r1', plus(K.yours, 'let x = 40;'));
  reject(K.yours, 'a constant compared only in a comment', 'r1', plus(K.yours, 'const LIMIT = 40;' + nl + '// if (quiet >= LIMIT) winner = 1;'));
  reject(K.yours, 'a guard against clicks above the board (y < TOP)', 'r1', sfix(K.yours, '  if (!onBoard(r, c)) return;', '  if (y < TOP || y >= TOP + N * CELL) return;' + nl + '  if (!onBoard(r, c)) return;'));
  reject(K.yours, 'a 6.31.3 handler with isLegal first (carried)', 'r1', sfix(K.yours, "if (goodMove(m) && seat === seatOf(turn) && winner === '' && isLegal(m.fr, m.fc, m.tr, m.tc)) {", "if (isLegal(m.fr, m.fc, m.tr, m.tc) && seatOf(turn) === seat && goodMove(m)) {"));
}

// ---------------------------------------------------------------- 7.16-7.21 (Quest)
//
// The turn-based RPG (2026-11-07), one Fighter class and composition, built with the Trail and
// Checkers walks' lessons in from the start. Each accept below is a correct answer in another
// shape: other names, Math.max / Math.floor, the floor written as an if, the bar width kept in a
// variable or made with map(), a loop or forEach to draw, a ternary or % 2 for the turn, a named
// function handed to after(), early returns in onMove. The rejects are the things that do nothing:
// a method defined but never called, a hit that skips takeHit, a flag that is never cleared, a
// count that is never spent, after() handed a call instead of a function, an online handler that
// acts without checking the seat or the move, and letters or numbers only in a string or comment.
{
  const Q = {
    sb1: '7-16-quest-3-sub-an-object-that-draws-itself', fighters: '7-16-quest-4-lab-two-fighters',
    sb2: '7-17-quest-2-sub-one-object-hits-another', blows: '7-17-quest-3-lab-trade-blows',
    sb3: '7-18-quest-2-sub-a-flag-and-a-count-inside-an-object', actions: '7-18-quest-3-lab-attack-guard-or-potion',
    sb4: '7-19-quest-2-sub-a-list-of-kinds-becomes-a-list-of-objects', run: '7-19-quest-3-lab-a-run-of-enemies',
    sb5: '7-20-quest-2-sub-send-an-action', duel: '7-20-quest-3-lab-duel-a-classmate',
    yours: '7-21-quest-3-challenges-make-it-yours',
  };
  const swap = (id, ...pairs) => {
    let code = solutionFiles(id)['script.js'];
    for (let k = 0; k < pairs.length; k += 2) {
      if (!code.includes(pairs[k])) throw new Error(`Quest case for ${id}: ${JSON.stringify(pairs[k])} is not in the reference`);
      code = code.split(pairs[k]).join(pairs[k + 1]);
    }
    return { 'script.js': code };
  };
  const sfix = (id, ...pairs) => {
    let code = starterFiles(id)['script.js'];
    for (let k = 0; k < pairs.length; k += 2) {
      if (!code.includes(pairs[k])) throw new Error(`Quest case for ${id}: ${JSON.stringify(pairs[k])} is not in the starter`);
      code = code.split(pairs[k]).join(pairs[k + 1]);
    }
    return { 'script.js': code };
  };
  const plus = (id, extra) => ({ 'script.js': starterFiles(id)['script.js'] + nl + extra + nl });
  for (const id of Object.values(Q)) {
    accept(id, 'reference solution', solutionFiles(id));
    reject(id, 'untouched starter', null, starterFiles(id));
  }

  // ---- 7.16.3 / 7.16.4: a method that draws, a bar scaled by hp / maxHp, both drawn
  const bar = '    rect(x, y, 200 * this.value / this.max, 16);';
  accept(Q.sb1, 'value * 200 / max', swap(Q.sb1, bar, '    rect(x, y, this.value * 200 / this.max, 16);'));
  accept(Q.sb1, 'the width kept in a variable', swap(Q.sb1, bar, '    const w = 200 * this.value / this.max;' + nl + '    rect(x, y, w, 16);'));
  accept(Q.sb1, 'the width made with map()', swap(Q.sb1, bar, '    rect(x, y, map(this.value, 0, this.max, 0, 200), 16);'));
  accept(Q.sb1, 'the method called show', swap(Q.sb1, '  draw(x, y) {', '  show(x, y) {', 'health.draw(', 'health.show(', 'magic.draw(', 'magic.show('));
  accept(Q.sb1, 'both drawn with forEach', swap(Q.sb1, '  health.draw(20, 40);' + nl + '  magic.draw(20, 80);', '  [health, magic].forEach((b, i) => b.draw(20, 40 + i * 40));'));
  reject(Q.sb1, 'a share worked out but never used for the width', 'r2', swap(Q.sb1, bar, '    const share = this.value / this.max;' + nl + '    rect(x, y, 200, 16);'));
  reject(Q.sb1, 'only one bar drawn', 'r3', swap(Q.sb1, '  magic.draw(20, 80);' + nl, ''));
  reject(Q.sb1, 'the draw method only in a comment', 'r1', plus(Q.sb1, '// draw(x, y) { rect(x, y, 200, 16); }'));
  const hpBar = '    rect(x - 60, y + 70, 120 * this.hp / this.maxHp, 10);';
  accept(Q.fighters, 'hp * 120 / maxHp', swap(Q.fighters, hpBar, '    rect(x - 60, y + 70, this.hp * 120 / this.maxHp, 10);'));
  accept(Q.fighters, '(hp / maxHp) * 120', swap(Q.fighters, hpBar, '    rect(x - 60, y + 70, (this.hp / this.maxHp) * 120, 10);'));
  accept(Q.fighters, 'Math.max-free share in a let', swap(Q.fighters, hpBar, '    let full = this.hp / this.maxHp;' + nl + '    rect(x - 60, y + 70, 120 * full, 10);'));
  accept(Q.fighters, 'both drawn in a for loop', swap(Q.fighters, '  fighters[0].draw(130, 150);' + nl + '  fighters[1].draw(350, 150);', '  for (let i = 0; i < fighters.length; i++) fighters[i].draw(130 + i * 220, 150);'));
  accept(Q.fighters, 'both drawn with for...of', swap(Q.fighters, '  fighters[0].draw(130, 150);' + nl + '  fighters[1].draw(350, 150);', '  let x = 130;' + nl + '  for (const f of fighters) {' + nl + '    f.draw(x, 150);' + nl + '    x += 220;' + nl + '  }'));
  accept(Q.fighters, 'the enemy drawn first', swap(Q.fighters, '  fighters[0].draw(130, 150);' + nl + '  fighters[1].draw(350, 150);', '  fighters[1].draw(350, 150);' + nl + '  fighters[0].draw(130, 150);'));
  reject(Q.fighters, 'the bar never shrinks', 'r2', swap(Q.fighters, hpBar, '    rect(x - 60, y + 70, 120, 10);'));
  reject(Q.fighters, 'hp / maxHp only in the numbers text', 'r2', swap(Q.fighters, hpBar, '    rect(x - 60, y + 70, 120, 10);' + nl + '    text(this.hp / this.maxHp, x, y, 12, ' + AP + 'white' + AP + ');'));
  reject(Q.fighters, 'only the hero drawn', 'r3', swap(Q.fighters, '  fighters[1].draw(350, 150);' + nl, ''));
  // Fix pass 2026-11-07: the width from a helper method is right; a width that never looks at hp is not.
  const isAliveM = '  isAlive() {' + nl + '    return this.hp > 0;' + nl + '  }' + nl;
  accept(Q.fighters, 'the width from a helper method above draw', swap(Q.fighters, hpBar, '    rect(x - 60, y + 70, 120 * this.fraction(), 10);', isAliveM, isAliveM + nl + '  fraction() {' + nl + '    return this.hp / this.maxHp;' + nl + '  }' + nl));
  accept(Q.fighters, 'the width from a helper method below draw', swap(Q.fighters, hpBar, '    rect(x - 60, y + 70, 120 * this.share(), 10);', "    text(this.hp + '/' + this.maxHp, x - 60, y + 98, 12, '#ccc');" + nl + '  }' + nl, "    text(this.hp + '/' + this.maxHp, x - 60, y + 98, 12, '#ccc');" + nl + '  }' + nl + nl + '  share() {' + nl + '    return this.hp / this.maxHp;' + nl + '  }' + nl));
  accept(Q.sb1, 'the width from a helper method', swap(Q.sb1, bar, '    rect(x, y, 200 * this.full(), 16);', '  draw(x, y) {', '  full() {' + nl + '    return this.value / this.max;' + nl + '  }' + nl + nl + '  draw(x, y) {'));
  reject(Q.fighters, 'maxHp / maxHp: the bar never shrinks', 'r2', swap(Q.fighters, hpBar, '    rect(x - 60, y + 70, 120 * this.maxHp / this.maxHp, 10);'));
  reject(Q.fighters, '120 / maxHp: no hp in the width', 'r2', swap(Q.fighters, hpBar, '    rect(x - 60, y + 70, 120 / this.maxHp, 10);'));
  reject(Q.fighters, 'a helper that never looks at hp', 'r2', swap(Q.fighters, hpBar, '    rect(x - 60, y + 70, 120 * this.fraction(), 10);', isAliveM, isAliveM + nl + '  fraction() {' + nl + '    return this.maxHp / this.maxHp;' + nl + '  }' + nl));
  reject(Q.sb1, 'max / max: the bar never shrinks', 'r2', swap(Q.sb1, bar, '    rect(x, y, 200 * this.max / this.max, 16);'));
  reject(Q.sb1, '200 / max: no value in the width', 'r2', swap(Q.sb1, bar, '    rect(x, y, 200 / this.max, 16);'));

  // ---- 7.17.2 / 7.17.3: the floor, a hit through takeHit, the turn, after(), the end and R
  const floorLine = '    this.hp = max(this.hp - n, 0);';
  accept(Q.sb2, 'the floor as an if', swap(Q.sb2, floorLine, '    this.hp -= n;' + nl + '    if (this.hp < 0) this.hp = 0;'));
  accept(Q.sb2, 'Math.max(0, ...)', swap(Q.sb2, floorLine, '    this.hp = Math.max(0, this.hp - n);'));
  accept(Q.sb2, 'the method called strike(target)', swap(Q.sb2, '  hit(other) {' + nl + '    other.takeHit(this.power);', '  strike(target) {' + nl + '    target.takeHit(this.power);', '.hit(', '.strike('));
  accept(Q.sb2, 'after() handed a named function', swap(Q.sb2, "    after(45, () => {" + nl + '      if (right.isAlive()) {' + nl + '        right.hit(left);' + nl + "        note = 'Right hits back';" + nl + '      }' + nl + '    });', '    after(45, hitBack);',
    'function drawTop() {', 'function hitBack() {' + nl + '  if (right.isAlive()) {' + nl + '    right.hit(left);' + nl + "    note = 'Right hits back';" + nl + '  }' + nl + '}' + nl + nl + 'function drawTop() {'));
  reject(Q.sb2, 'no floor at all', 'r1', swap(Q.sb2, floorLine, '    this.hp -= n;'));
  reject(Q.sb2, 'hit changes the other hp itself', 'r2', swap(Q.sb2, '    other.takeHit(this.power);', '    other.hp -= this.power;'));
  reject(Q.sb2, 'hit written but never called', 'r2', swap(Q.sb2, '    left.hit(right);', '    right.takeHit(4);', '        right.hit(left);', '        left.takeHit(3);'));
  reject(Q.sb2, 'after() handed a call, not a function', 'r3', swap(Q.sb2, "    after(45, () => {" + nl + '      if (right.isAlive()) {' + nl + '        right.hit(left);' + nl + "        note = 'Right hits back';" + nl + '      }' + nl + '    });', '    after(45, right.hit(left));'));
  // Fix pass 2026-11-07: more floors, the student's own hit method, and an after() that does nothing.
  for (const id of [Q.sb2, Q.blows]) {
    accept(id, 'take the hit, then max(this.hp, 0)', swap(id, floorLine, '    this.hp -= n;' + nl + '    this.hp = max(this.hp, 0);'));
    accept(id, 'take the hit, then max(0, this.hp)', swap(id, floorLine, '    this.hp = this.hp - n;' + nl + '    this.hp = Math.max(0, this.hp);'));
    accept(id, 'if (n >= this.hp) this.hp = 0; else this.hp -= n', swap(id, floorLine, '    if (n >= this.hp) this.hp = 0;' + nl + '    else this.hp -= n;'));
    accept(id, 'if (this.hp <= n) { ... } else { ... }', swap(id, floorLine, '    if (this.hp <= n) {' + nl + '      this.hp = 0;' + nl + '    } else {' + nl + '      this.hp -= n;' + nl + '    }'));
    accept(id, 'this.hp -= min(n, this.hp)', swap(id, floorLine, '    this.hp -= min(n, this.hp);'));
  }
  accept(Q.sb2, 'the hit through the student own loseHp', swap(Q.sb2, '  takeHit(n) {', '  loseHp(n) {', 'other.takeHit(', 'other.loseHp('));
  accept(Q.sb2, 'the hit through wound()', swap(Q.sb2, '  takeHit(n) {', '  wound(n) {', 'other.takeHit(', 'other.wound('));
  accept(Q.blows, 'the attack through lowerHp()', swap(Q.blows, '  takeHit(n) {', '  lowerHp(n) {', 'target.takeHit(', 'target.lowerHp('));
  accept(Q.sb2, 'after(0.75 * 60, ...)', swap(Q.sb2, '    after(45, () => {', '    after(0.75 * 60, () => {'));
  reject(Q.sb2, 'max(this.hp - 0, 0): no hit at all', 'r1', swap(Q.sb2, floorLine, '    this.hp = max(this.hp - 0, 0);'));
  reject(Q.sb2, 'hit hands the other a hit of 0', 'r2', swap(Q.sb2, '    other.takeHit(this.power);', '    other.takeHit(0);'));
  reject(Q.sb2, 'after() handed a function that only answers 1', 'r3', swap(Q.sb2, "    after(45, () => {" + nl + '      if (right.isAlive()) {' + nl + '        right.hit(left);' + nl + "        note = 'Right hits back';" + nl + '      }' + nl + '    });', '    after(45, () => 1);'));
  reject(Q.sb2, 'after() handed an empty function', 'r3',swap(Q.sb2, "    after(45, () => {" + nl + '      if (right.isAlive()) {' + nl + '        right.hit(left);' + nl + "        note = 'Right hits back';" + nl + '      }' + nl + '    });', '    after(45, () => {});'));

  accept(Q.blows, 'turn = (turn + 1) % 2', swap(Q.blows, '  turn = 1 - turn;', '  turn = (turn + 1) % 2;'));
  accept(Q.blows, 'turn = turn === 0 ? 1 : 0', swap(Q.blows, '  turn = 1 - turn;', '  turn = turn === 0 ? 1 : 0;'));
  accept(Q.blows, 'the turn passes with if / else', swap(Q.blows, '  turn = 1 - turn;', '  if (turn === 0) turn = 1;' + nl + '  else turn = 0;'));
  accept(Q.blows, 'after(45, () => enemyTurn())', swap(Q.blows, 'after(45, enemyTurn)', 'after(45, () => enemyTurn())'));
  accept(Q.blows, 'R tested second', swap(Q.blows, "  if (kb.presses('r') && over) newGame();", "  if (over && kb.presses('r')) newGame();"));
  accept(Q.blows, 'the end tested with hp <= 0', swap(Q.blows, '  if (!them.isAlive()) {', '  if (them.hp <= 0) {'));
  accept(Q.blows, 'the end sets the flag right there', swap(Q.blows, '  if (!them.isAlive()) {' + nl + '    fightOver(t);', '  if (!them.isAlive()) {' + nl + '    over = true;' + nl + '    fightOver(t);'));
  accept(Q.blows, 'attack called strike', swap(Q.blows, '  attack(target, roll) {', '  strike(target, roll) {', 'me.attack(them, roll)', 'me.strike(them, roll)'));
  accept(Q.blows, 'the floor as an if', swap(Q.blows, floorLine, '    this.hp -= n;' + nl + '    if (this.hp <= 0) {' + nl + '      this.hp = 0;' + nl + '    }'));
  reject(Q.blows, 'attack skips takeHit', 'r2', swap(Q.blows, '    return target.takeHit(this.power + roll);', '    target.hp -= this.power + roll;' + nl + '    return this.power + roll;'));
  reject(Q.blows, 'the turn never passes', 'r3', swap(Q.blows, '  turn = 1 - turn;' + nl, ''));
  reject(Q.blows, 'after() handed a call', 'r4', swap(Q.blows, 'after(45, enemyTurn)', 'after(45, enemyTurn())'));
  reject(Q.blows, 'nothing ever ends the fight', 'r5', swap(Q.blows, '    fightOver(t);' + nl + '    return;', '    return;'));
  reject(Q.blows, "an 'r' only in a string", 'r5', swap(Q.blows, "  if (kb.presses('r') && over) newGame();", '  const help = "kb.presses(' + AP + 'r' + AP + ') newGame()";'));
  // Fix pass 2026-11-07: the turn, the pause and the end in other correct shapes.
  accept(Q.blows, 'turn = turn ? 0 : 1', swap(Q.blows, '  turn = 1 - turn;', '  turn = turn ? 0 : 1;'));
  accept(Q.blows, 'turn = 1 - t', swap(Q.blows, '  turn = 1 - turn;', '  turn = 1 - t;'));
  accept(Q.blows, 'turn = them === fighters[0] ? 0 : 1', swap(Q.blows, '  turn = 1 - turn;', '  turn = them === fighters[0] ? 0 : 1;'));
  accept(Q.blows, 'after(0.75 * 60, enemyTurn)', swap(Q.blows, 'after(45, enemyTurn)', 'after(0.75 * 60, enemyTurn)'));
  accept(Q.blows, 'after(PAUSE * 2, enemyTurn)', swap(Q.blows, 'after(45, enemyTurn)', 'after(PAUSE * 2, enemyTurn)', 'let fighters;', 'const PAUSE = 23;' + nl + 'let fighters;'));
  const endIf = '  if (!them.isAlive()) {' + nl + '    fightOver(t);' + nl + '    return;' + nl + '  }' + nl + '  turn = 1 - turn;' + nl + '  if (turn === 1) after(45, enemyTurn);';
  accept(Q.blows, 'if (them.isAlive()) { ... } else { fightOver(t); }', swap(Q.blows, endIf, '  if (them.isAlive()) {' + nl + '    turn = 1 - turn;' + nl + '    if (turn === 1) after(45, enemyTurn);' + nl + '  } else {' + nl + '    fightOver(t);' + nl + '  }'));
  accept(Q.blows, 'const dead = !them.isAlive(); if (dead)', swap(Q.blows, '  if (!them.isAlive()) {', '  const dead = !them.isAlive();' + nl + '  if (dead) {'));
  accept(Q.blows, 'over = !them.isAlive()', swap(Q.blows, '  if (!them.isAlive()) {' + nl + '    fightOver(t);' + nl + '    return;' + nl + '  }', '  over = !them.isAlive();' + nl + "  if (over) {" + nl + "    message = me.name + ' wins! Press R';" + nl + '    return;' + nl + '  }'));
  accept(Q.blows, 'the method called alive()', swap(Q.blows, 'isAlive()', 'alive()'));
  accept(Q.blows, 'the end function called wrapUp', swap(Q.blows, 'fightOver(', 'wrapUp('));
  accept(Q.blows, 'the restart function called freshFight', swap(Q.blows, 'newGame()', 'freshFight()'));
  accept(Q.blows, 'R tested in a block', swap(Q.blows, "  if (kb.presses('r') && over) newGame();", "  if (kb.presses('r')) {" + nl + '    if (over) newGame();' + nl + '  }'));

  // ---- 7.18.2 / 7.18.3: the guard flag, the potion count, keys 1-3, the enemy's choice
  const halve = '    if (this.guarding) n = floor(n / 2);';
  accept(Q.sb3, 'halved with a ternary', swap(Q.sb3, halve, '    n = this.guarding ? floor(n / 2) : n;'));
  accept(Q.sb3, 'Math.floor, cleared inside braces', swap(Q.sb3, halve + nl + '    this.guarding = false;', '    if (this.guarding) {' + nl + '      n = Math.floor(n / 2);' + nl + '      this.guarding = false;' + nl + '    }'));
  accept(Q.sb3, 'the cap written as an if', swap(Q.sb3, '    this.hp = min(this.hp + 12, this.maxHp);', '    this.hp += 12;' + nl + '    if (this.hp > this.maxHp) this.hp = this.maxHp;'));
  accept(Q.sb3, 'potions-- and a > 0 test', swap(Q.sb3, '    if (this.potions === 0) return 0;' + nl + '    this.potions -= 1;', '    if (!(this.potions > 0)) return 0;' + nl + '    this.potions--;'));
  accept(Q.sb3, 'Math.min the other way round', swap(Q.sb3, '    this.hp = min(this.hp + 12, this.maxHp);', '    this.hp = Math.min(this.maxHp, this.hp + 12);'));
  reject(Q.sb3, 'the guard never ends', 'r1', swap(Q.sb3, halve + nl + '    this.guarding = false;', halve));
  reject(Q.sb3, 'guard() never turns the flag on', 'r1', swap(Q.sb3, '    this.guarding = true;', '    this.hp = this.hp;'));
  reject(Q.sb3, 'a potion with no cap', 'r2', swap(Q.sb3, '    this.hp = min(this.hp + 12, this.maxHp);', '    this.hp += 12;'));
  reject(Q.sb3, 'a potion that never runs out', 'r2', swap(Q.sb3, '    this.potions -= 1;' + nl, ''));
  reject(Q.sb3, 'keys 2 and 3 only in a string', 'r3', plus(Q.sb3, 'const help = "kb.presses(' + AP + '2' + AP + ') k.guard() kb.presses(' + AP + '3' + AP + ') k.heal()";'));

  const keys = "    if (kb.presses('1')) a = 1;" + nl + "    if (kb.presses('2')) a = 2;" + nl + "    if (kb.presses('3')) a = 3;";
  accept(Q.actions, 'keys as an else-if chain calling choose', swap(Q.actions, keys, "    if (kb.presses('1')) choose(1);" + nl + "    else if (kb.presses('2')) choose(2);" + nl + "    else if (kb.presses('3')) choose(3);"));
  accept(Q.actions, 'the enemy guards on floor(random(0, 4)) === 0', swap(Q.actions, '  else if (random() < 0.25) a = 2;', '  else if (floor(random(0, 4)) === 0) a = 2;'));
  accept(Q.actions, 'the enemy calls guard and heal itself', swap(Q.actions, '  if (e.hp < e.maxHp / 3 && e.potions > 0) a = 3;' + nl + '  else if (random() < 0.25) a = 2;' + nl + '  act(1, a, floor(random(0, 4)));', '  if (e.potions > 0 && e.hp < 8) act(1, 3, 0);' + nl + '  else act(1, 1, floor(random(0, 4)));'));
  accept(Q.actions, 'the guard cleared at the end of takeHit', swap(Q.actions, halve + nl + '    this.guarding = false;' + nl + '    this.hp = max(this.hp - n, 0);', halve + nl + '    this.hp = max(this.hp - n, 0);' + nl + '    this.guarding = false;'));
  reject(Q.actions, 'only keys 1 and 2', 'r3', swap(Q.actions, nl + "    if (kb.presses('3')) a = 3;", ''));
  reject(Q.actions, 'the enemy only ever attacks', 'r4', swap(Q.actions, '  if (e.hp < e.maxHp / 3 && e.potions > 0) a = 3;' + nl + '  else if (random() < 0.25) a = 2;' + nl, ''));
  reject(Q.actions, 'a potion with no cap', 'r2', swap(Q.actions, '    this.hp = min(this.hp + 12, this.maxHp);', '    this.hp = this.hp + 12;'));
  // Fix pass 2026-11-07: the guard, the potion, the keys and the enemy in other correct shapes,
  // and a card for the hero left at four values (black body, "potions gold", NaN on a potion).
  for (const id of [Q.sb3, Q.actions]) {
    accept(id, 'the flag kept in a const, cleared, then used', swap(id, halve + nl + '    this.guarding = false;', '    const g = this.guarding;' + nl + '    this.guarding = false;' + nl + '    if (g) n = floor(n / 2);'));
    accept(id, 'guarding as 0 and 1', swap(id, halve + nl + '    this.guarding = false;', '    if (this.guarding === 1) n = floor(n / 2);' + nl + '    this.guarding = 0;', '    this.guarding = true;', '    this.guarding = 1;', '    this.guarding = false;' + nl + '  }', '    this.guarding = 0;' + nl + '  }'));
    accept(id, 'the cap as a ternary', swap(id, '    this.hp = min(this.hp + 12, this.maxHp);', '    this.hp = this.hp + 12 > this.maxHp ? this.maxHp : this.hp + 12;'));
    accept(id, 'min(12, maxHp - hp) gained', swap(id, '    const before = this.hp;' + nl + '    this.hp = min(this.hp + 12, this.maxHp);' + nl + '    return this.hp - before;', '    const gained = min(12, this.maxHp - this.hp);' + nl + '    this.hp += gained;' + nl + '    return gained;'));
    accept(id, 'min(12 + this.hp, this.maxHp)', swap(id, '    this.hp = min(this.hp + 12, this.maxHp);', '    this.hp = min(12 + this.hp, this.maxHp);'));
    accept(id, 'constrain(this.hp + 12, 0, this.maxHp)', swap(id, '    this.hp = min(this.hp + 12, this.maxHp);', '    this.hp = constrain(this.hp + 12, 0, this.maxHp);'));
    accept(id, '--this.potions', swap(id, '    this.potions -= 1;', '    --this.potions;'));
  }
  accept(Q.actions, 'keys in a for loop with String(i)', swap(Q.actions, keys, '    for (let i = 1; i <= 3; i++) if (kb.presses(String(i))) a = i;'));
  accept(Q.actions, 'keys as a ternary chain', swap(Q.actions, keys, "    a = kb.presses('1') ? 1 : kb.presses('2') ? 2 : kb.presses('3') ? 3 : 0;"));
  const rule = '  let a = 1;' + nl + '  if (e.hp < e.maxHp / 3 && e.potions > 0) a = 3;' + nl + '  else if (random() < 0.25) a = 2;';
  accept(Q.actions, 'the enemy rule as a nested ternary', swap(Q.actions, rule, '  const a = e.hp < e.maxHp / 3 && e.potions > 0 ? 3 : random() < 0.25 ? 2 : 1;'));
  accept(Q.actions, 'the enemy rule in a helper returning 3, 2 or 1', swap(Q.actions, rule, '  const a = pickFor(e);', 'function fightOver(winner) {', 'function pickFor(e) {' + nl + '  if (e.hp < e.maxHp / 3 && e.potions > 0) return 3;' + nl + '  if (random() < 0.25) return 2;' + nl + '  return 1;' + nl + '}' + nl + nl + 'function fightOver(winner) {'));
  const made = "  fighters = [new Fighter('Hero', 30, 3, 2, 'gold'), new Fighter('Goblin', 24, 5, 1, 'orange')];";
  accept(Q.actions, 'five values, one of them a call', swap(Q.actions, made, "  fighters = [new Fighter('Hero', 30, 3, 2, color(255, 215, 0)), new Fighter('Goblin', 24, 5, 1, 'orange')];"));
  accept(Q.actions, 'the hero made on its own line', swap(Q.actions, made, "  const hero = new Fighter('Hero', 30, 3, 2, 'gold');" + nl + "  fighters = [hero, new Fighter('Goblin', 24, 5, 1, 'orange')];"));
  reject(Q.actions, 'the hero left at four values', 'r5', swap(Q.actions, made, "  fighters = [new Fighter('Hero', 30, 3, 'gold'), new Fighter('Goblin', 24, 5, 1, 'orange')];"));
  reject(Q.actions, 'the goblin left at four values', 'r5', swap(Q.actions, made, "  fighters = [new Fighter('Hero', 30, 3, 2, 'gold'), new Fighter('Goblin', 24, 5, 'orange')];"));

  // ---- 7.19.2 / 7.19.3: map (or a loop), next, levelUp, the last win
  accept(Q.sb4, 'a loop that pushes', swap(Q.sb4, '  monsters = KINDS.map((k) => new Monster(k.name, k.hp));', '  monsters = [];' + nl + '  for (let i = 0; i < KINDS.length; i++) {' + nl + '    monsters.push(new Monster(KINDS[i].name, KINDS[i].hp));' + nl + '  }'));
  accept(Q.sb4, 'forEach that pushes', swap(Q.sb4, '  monsters = KINDS.map((k) => new Monster(k.name, k.hp));', '  monsters = [];' + nl + '  KINDS.forEach((k) => monsters.push(new Monster(k.name, k.hp)));'));
  accept(Q.sb4, 'map with a function', swap(Q.sb4, '  monsters = KINDS.map((k) => new Monster(k.name, k.hp));', '  monsters = KINDS.map(function (k) { return new Monster(k.name, k.hp); });'));
  accept(Q.sb4, 'next with min()', swap(Q.sb4, "  if (kb.presses('n') && which < monsters.length - 1) which += 1;", "  if (kb.presses('n')) which = min(which + 1, monsters.length - 1);"));
  accept(Q.sb4, 'next with a nested if and ++', swap(Q.sb4, "  if (kb.presses('n') && which < monsters.length - 1) which += 1;", "  if (kb.presses('n')) {" + nl + '    if (which < monsters.length - 1) which++;' + nl + '  }'));
  reject(Q.sb4, 'map that keeps the plain kinds', 'r1', swap(Q.sb4, '  monsters = KINDS.map((k) => new Monster(k.name, k.hp));', '  monsters = KINDS.map((k) => k);'));
  reject(Q.sb4, 'N runs off the end of the list', 'r2', swap(Q.sb4, "  if (kb.presses('n') && which < monsters.length - 1) which += 1;", "  if (kb.presses('n')) which += 1;"));

  const mapLine = '  enemies = KINDS.map((k) => new Fighter(k.name, k.hp, k.power, k.potions, k.color));';
  accept(Q.run, 'enemies from a loop', swap(Q.run, mapLine, '  enemies = [];' + nl + '  for (const k of KINDS) enemies.push(new Fighter(k.name, k.hp, k.power, k.potions, k.color));'));
  accept(Q.run, 'which++', swap(Q.run, '  which += 1;' + nl + '  fighters[0].levelUp();', '  which++;' + nl + '  fighters[0].levelUp();'));
  accept(Q.run, 'the next one taken with enemies[which + 1]', swap(Q.run, '  which += 1;' + nl + '  fighters[0].levelUp();' + nl + '  fighters[1] = enemies[which];', '  fighters[0].levelUp();' + nl + '  fighters[1] = enemies[which + 1];' + nl + '  which = which + 1;'));
  accept(Q.run, 'levelUp written long-hand', swap(Q.run, '    this.maxHp += 5;', '    this.maxHp = this.maxHp + 5;', '    this.power += 1;', '    this.power = this.power + 1;'));
  accept(Q.run, 'the last one tested with which + 1 === length', swap(Q.run, '  if (which === enemies.length - 1) {', '  if (which + 1 === enemies.length) {'));
  accept(Q.run, 'the last one tested with >=', swap(Q.run, '  if (which === enemies.length - 1) {', '  if (which >= enemies.length - 1) {'));
  reject(Q.run, 'levelUp written but never called', 'r3', swap(Q.run, '  fighters[0].levelUp();' + nl, ''));
  reject(Q.run, 'levelUp that only heals', 'r3', swap(Q.run, '    this.maxHp += 5;' + nl, '', '    this.power += 1;' + nl, ''));
  reject(Q.run, 'the next enemy never comes', 'r2', swap(Q.run, '  fighters[1] = enemies[which];' + nl, ''));
  // Fix pass 2026-11-07: next, map, the next enemy and the last win in other correct shapes.
  const nLine = "  if (kb.presses('n') && which < monsters.length - 1) which += 1;";
  accept(Q.sb4, 'next with the condition the other way round', swap(Q.sb4, nLine, "  if (which < monsters.length - 1 && kb.presses('n')) which += 1;"));
  accept(Q.sb4, 'next with a const last', swap(Q.sb4, nLine, '  const last = monsters.length - 1;' + nl + "  if (kb.presses('n') && which < last) which++;"));
  accept(Q.run, 'KINDS.map(makeEnemy)', swap(Q.run, mapLine, '  enemies = KINDS.map(makeEnemy);', 'function draw() {', 'function makeEnemy(k) {' + nl + '  return new Fighter(k.name, k.hp, k.power, k.potions, k.color);' + nl + '}' + nl + nl + 'function draw() {'));
  accept(Q.run, 'KINDS.map((k) => makeEnemy(k))', swap(Q.run, mapLine, '  enemies = KINDS.map((k) => makeEnemy(k));', 'function draw() {', 'function makeEnemy(k) {' + nl + '  return new Fighter(k.name, k.hp, k.power, k.potions, k.color);' + nl + '}' + nl + nl + 'function draw() {'));
  accept(Q.run, 'Array.from(KINDS, ...)', swap(Q.run, mapLine, '  enemies = Array.from(KINDS, (k) => new Fighter(k.name, k.hp, k.power, k.potions, k.color));'));
  accept(Q.run, 'a static Fighter.from(k)', swap(Q.run, mapLine, '  enemies = KINDS.map((k) => Fighter.from(k));', '  isAlive() {', '  static from(k) {' + nl + '    return new Fighter(k.name, k.hp, k.power, k.potions, k.color);' + nl + '  }' + nl + nl + '  isAlive() {'));
  reject(Q.run, 'map that keeps the plain kinds', 'r1', swap(Q.run, mapLine, '  enemies = KINDS.map((k) => k);'));
  reject(Q.run, 'map to a helper that makes no Fighter', 'r1', swap(Q.run, mapLine, '  enemies = KINDS.map(copyKind);', 'function draw() {', 'function copyKind(k) {' + nl + '  return k;' + nl + '}' + nl + nl + 'function draw() {'));
  const nextLines = '  which += 1;' + nl + '  fighters[0].levelUp();' + nl + '  fighters[1] = enemies[which];';
  accept(Q.run, 'which = which + 1', swap(Q.run, nextLines, '  which = which + 1;' + nl + '  fighters[0].levelUp();' + nl + '  fighters[1] = enemies[which];'));
  accept(Q.run, 'fighters[1] = enemies.shift()', swap(Q.run, nextLines, '  which += 1;' + nl + '  fighters[0].levelUp();' + nl + '  fighters[1] = enemies.shift();'));
  accept(Q.run, 'fighters = [fighters[0], enemies[which]]', swap(Q.run, nextLines, '  which += 1;' + nl + '  fighters[0].levelUp();' + nl + '  fighters = [fighters[0], enemies[which]];'));
  reject(Q.run, 'levelUp that adds 0 and counts a level', 'r3', swap(Q.run, '    this.maxHp += 5;', '    this.maxHp += 0;', '    this.power += 1;', '    this.level++;'));
  const lastIf = '  if (which === enemies.length - 1) {';
  accept(Q.run, 'const isLast, then if (isLast)', swap(Q.run, lastIf, '  const isLast = which === enemies.length - 1;' + nl + '  if (isLast) {'));
  accept(Q.run, 'the last one tested with !enemies[which + 1]', swap(Q.run, lastIf, '  if (!enemies[which + 1]) {'));
  accept(Q.run, 'a named end function', swap(Q.run, lastIf + nl + '    over = true;' + nl + "    message = 'You beat them all! Press R to play again';" + nl + '    return;', lastIf + nl + '    victory();' + nl + '    return;', 'function drawTop() {', 'function victory() {' + nl + '  over = true;' + nl + "  message = 'You beat them all! Press R to play again';" + nl + '}' + nl + nl + 'function drawTop() {'));
  reject(Q.run, 'no last fight: the run never ends in a win', 'r4',swap(Q.run, "  if (which === enemies.length - 1) {" + nl + '    over = true;' + nl + "    message = 'You beat them all! Press R to play again';" + nl + '    return;' + nl + '  }' + nl, ''));

  // ---- 7.20.2 / 7.20.3: send, act in onMove, the seat and goodMove, offline still works
  const sbH = '  online.onMove((m, seat) => {' + nl + "    if ([1, 2, 3].includes(m.act)) got.push('seat ' + seat + ': ' + NAMES[m.act]);" + nl + '  });';
  accept(Q.sb5, 'onMove given a named function', swap(Q.sb5, sbH, '  online.onMove(gotMove);', 'function draw() {', 'function gotMove(m, seat) {' + nl + "  got.push('seat ' + seat + ': ' + NAMES[m.act]);" + nl + '}' + nl + nl + 'function draw() {'));
  accept(Q.sb5, 'a function expression', swap(Q.sb5, sbH, '  online.onMove(function (m, seat) {' + nl + "    got.push('seat ' + seat);" + nl + '  });'));
  reject(Q.sb5, 'onMove only in a comment', 'r1', plus(Q.sb5, '// online.onMove((m, seat) => {});'));

  const handler = '  online.onMove((m, seat) => {' + nl + '    if (duel && !over && seat === turn && goodMove(m)) act(turn, m.act, m.roll);' + nl + '  });';
  const send = '  if (duel) online.send({ act: a, roll: roll });' + nl + '  else act(turn, a, roll);';
  accept(Q.duel, 'early returns in the handler', swap(Q.duel, handler, '  online.onMove((m, seat) => {' + nl + '    if (!duel || over) return;' + nl + '    if (seat !== turn) return;' + nl + '    if (!goodMove(m)) return;' + nl + '    act(turn, m.act, m.roll);' + nl + '  });'));
  accept(Q.duel, 'the handler as a named function below', swap(Q.duel, handler, '  online.onMove(arrived);', 'function goodMove(m) {', 'function arrived(m, who) {' + nl + '  if (duel && !over && who === turn && goodMove(m)) act(turn, m.act, m.roll);' + nl + '}' + nl + nl + 'function goodMove(m) {'));
  accept(Q.duel, 'a const arrow handler above setup', swap(Q.duel, handler, '  online.onMove(arrived);', 'function setup() {', 'const arrived = (m, seat) => {' + nl + '  if (duel && !over && goodMove(m) && turn === seat) act(turn, m.act, m.roll);' + nl + '};' + nl + nl + 'function setup() {'));
  accept(Q.duel, 'the move checked inline with includes', swap(Q.duel, handler, '  online.onMove((m, seat) => {' + nl + '    if (seat === turn && m !== null && [1, 2, 3].includes(m.act) && [0, 1, 2, 3].includes(m.roll)) act(turn, m.act, m.roll);' + nl + '  });'));
  accept(Q.duel, "send when 'ready', otherwise act", swap(Q.duel, send, "  if (online.status === 'ready') online.send({ act: a, roll });" + nl + '  else act(turn, a, roll);'));
  accept(Q.duel, 'act first, then else send', swap(Q.duel, send, '  if (!duel) act(turn, a, roll);' + nl + '  else online.send({ act: a, roll: roll });'));
  accept(Q.duel, 'a ternary', swap(Q.duel, send, '  duel ? online.send({ act: a, roll: roll }) : act(turn, a, roll);'));
  accept(Q.duel, 'an early return after sending', swap(Q.duel, send, '  if (duel) {' + nl + '    online.send({ act: a, roll: roll });' + nl + '    return;' + nl + '  }' + nl + '  act(turn, a, roll);'));
  reject(Q.duel, 'every move acted on without a check', 'r3', swap(Q.duel, handler, '  online.onMove((m, seat) => act(turn, m.act, m.roll));'));
  reject(Q.duel, 'the seat checked but not the move', 'r3', swap(Q.duel, handler, '  online.onMove((m, seat) => {' + nl + '    if (duel && !over && seat === turn) act(turn, m.act, m.roll);' + nl + '  });'));
  reject(Q.duel, 'a named handler that never checks', 'r3', swap(Q.duel, handler, '  online.onMove(arrived);', 'function goodMove(m) {', 'function arrived(m, seat) { act(turn, m.act, m.roll); }' + nl + nl + 'function goodMove(m) {'));
  reject(Q.duel, 'a handler that only writes a message', 'r2', swap(Q.duel, handler, '  online.onMove((m, seat) => {' + nl + "    message = 'got a move';" + nl + '  });'));
  reject(Q.duel, 'choose always sends', 'r4', swap(Q.duel, send, '  online.send({ act: a, roll: roll });'));

  // ---- 7.21.3: any one challenge
  const ogre = "  { name: 'Ogre', hp: 36, power: 7, potions: 1, color: 'mediumpurple' }," + nl;
  accept(Q.yours, 'a fourth kind only', sfix(Q.yours, ogre, ogre + "  { name: 'Wyrm', hp: 50, power: 9, potions: 2, color: 'teal' }," + nl));
  accept(Q.yours, 'a fourth kind pushed onto KINDS', plus(Q.yours, "KINDS.push({ name: 'Wyrm', hp: 50, power: 9, potions: 2, color: 'teal' });"));
  const k3 = "    if (kb.presses('3')) a = 3;" + nl;
  const cool = (test, tick) => sfix(Q.yours, 'let duel = false;', 'let duel = false;' + nl + 'let cooldown = 0;',
    k3, k3 + "    if (" + test + ') a = 4;' + nl,
    '  const them = fighters[1 - t];' + nl, '  const them = fighters[1 - t];' + nl + '  ' + tick + nl +
    "  if (a === 4) { message = me.name + ' power-hits for ' + me.attack(them, me.power + roll); cooldown = 3; }" + nl);
  accept(Q.yours, 'a cooldown, === 0', cool("kb.presses('4') && cooldown === 0", 'if (t === 0 && cooldown > 0) cooldown -= 1;'));
  accept(Q.yours, 'a cooldown tested first, <= 0, cooldown--', cool("cooldown <= 0 && kb.presses('4')", 'if (t === 0 && cooldown > 0) cooldown--;'));
  accept(Q.yours, 'a cooldown counted down with max()', cool("kb.presses('4') && cooldown < 1", 'if (t === 0) cooldown = max(cooldown - 1, 0);'));
  const shop = (test, spend) => sfix(Q.yours, 'let duel = false;', 'let duel = false;' + nl + 'let gold = 0;',
    '  which += 1;' + nl + '  fighters[0].levelUp();', '  gold += 10;' + nl + '  which += 1;' + nl + '  fighters[0].levelUp();',
    k3, k3 + '    if (' + test + ') { ' + spend + ' fighters[0].potions += 1; }' + nl);
  accept(Q.yours, 'a shop, gold >= 10', shop("kb.presses('5') && gold >= 10", 'gold -= 10;'));
  accept(Q.yours, 'a shop with a PRICE constant', { 'script.js': shop("kb.presses('5') && gold >= PRICE", 'gold -= PRICE;')['script.js'].replace('let gold = 0;', 'let gold = 0;' + nl + 'const PRICE = 10;') });
  reject(Q.yours, 'a fourth kind only in a comment', 'r1', sfix(Q.yours, ogre, ogre + "  // { name: 'Wyrm', hp: 50, power: 9, potions: 2, color: 'teal' }," + nl));
  reject(Q.yours, 'key 4 only in a string', 'r1', plus(Q.yours, 'const help = "kb.presses(' + AP + '4' + AP + ') && cooldown === 0; cooldown -= 1";'));
  reject(Q.yours, 'a cooldown that never counts down', 'r1', cool("kb.presses('4') && cooldown === 0", ''));
  reject(Q.yours, 'gold earned but never spent', 'r1', sfix(Q.yours, 'let duel = false;', 'let duel = false;' + nl + 'let gold = 0;', '  which += 1;' + nl + '  fighters[0].levelUp();', '  gold += 10;' + nl + '  which += 1;' + nl + '  fighters[0].levelUp();'));
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
