// 2.7.3's checklist must not go green on a fix that was only ever written
// in a comment, must not stay red on a correct fix that mentions the
// typo in a comment, and must report nothing at all for a check the browser
// was not given the means to run.
//
// WHY THIS EXISTS. Three defects, none of them visible from the shipped
// starter (which scores 0 and the reference scores 5, so
// scripts/check-starters.mjs was satisfied with all of them):
//
// 1. THE ONE THAT MADE EVERY CARD GREEN. lib/quiz-redact.ts strips `pattern`
//    from a summative lesson's browser copy, because on a find-and-fix the
//    pattern is the answer key. lib/grader.ts then compiled the absent pattern
//    with `new RegExp(req.pattern || '')`, and an empty regex matches every
//    string there is -- so all five cards reported PASSED on the untouched
//    starter. Confirmed against the running dev server: the served RSC payload
//    carries `"pattern":"$undefined"` for this lesson. checkRegex now fails
//    closed on a missing pattern, and components/LessonWorkspace.tsx leaves
//    `status` undefined for such a requirement so its card renders grey, not
//    red. This one affects every test part in the course, not only this lesson.
//
// 2. Every requirement here set "stripComments": false, which switches off
//    lib/grader.ts's only defence -- the comment stripper exists so "a
//    commented-out answer can't pass a regex requirement". With it off,
//    appending four `// the fix is ...` lines scored green on r1 and r4.
//
// 3. r2 is `(?![\s\S]*\bbeforTax\b)(?=[\s\S]*\btotal\s*=\s*(?:beforeTax +
//    tax|...))`: the typo must appear nowhere in the file. The lesson tells the
//    student to write a comment naming each bug, and the natural comment for
//    bug 2 is "runtime: beforTax was misspelled" -- so a student who fixed it
//    correctly and wrote the comment the lesson asked for was marked red.
//
// Fixing (3) needed the other half: with comment stripping ON, an unterminated
// `"` still desynchronized the scanner. It entered string mode and never left,
// so every comment below that line survived verbatim as "string content" and a
// fix written in one of them still satisfied the regex. stripJsComments now
// ends a " or ' string at the newline and only treats a quote as a string start
// when that quote has a partner before the end of the line.
//
//   node scripts/test-2-7-3-comments.mjs

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(import.meta.dirname, '..');
const DIR = path.join(ROOT, 'lessons', '2-7-3-ch2-individual-pa-find-and-fix');

const lesson = JSON.parse(fs.readFileSync(path.join(DIR, 'lesson.json'), 'utf8'));
const reqs = lesson.requirements;
// Normalized to LF: script.js checks out CRLF on Windows and every pattern
// here uses [\s\S], but the count of "//" lines below does not.
const starter = fs.readFileSync(path.join(DIR, 'script.js'), 'utf8').replace(/\r\n/g, '\n');
const solution = fs.readFileSync(path.join(DIR, 'solution.js'), 'utf8').replace(/\r\n/g, '\n');

// The lesson's own guard rail: the starter must contain bug 1's unterminated
// string, or these cases are testing nothing (the defect needs that line to
// desynchronize the scanner).
if (!starter.includes('let itemName = "Notebook;')) {
  console.error('[test-2-7-3-comments] FAIL — script.js no longer opens with the');
  console.error('  unterminated string these cases depend on. Re-read it and update');
  console.error('  the comment-based cases below.');
  process.exit(1);
}

// lib/grader.ts is TypeScript. Compile it next to the repo and require it, the
// way scripts/check-starters.mjs does, so the case list exercises the real
// grader and not a copy of the patterns.
const { execFileSync } = require('node:child_process');
const out = fs.mkdtempSync(path.join(ROOT, 'node_modules', '.grader-'));
try {
  execFileSync(
    process.execPath,
    [path.join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc'),
     path.join(ROOT, 'lib', 'grader.ts'), '--outDir', out,
     '--module', 'commonjs', '--target', 'es2022', '--skipLibCheck'],
    { cwd: ROOT, stdio: 'ignore' },
  );
  fs.writeFileSync(path.join(out, 'package.json'), '{"type":"commonjs"}');
  const { grade } = require(path.join(out, 'grader.js'));

  const green = (src) =>
    grade(reqs, { 'script.js': src }, 0).results
      .filter((r) => r.status === 'passed')
      .map((r) => r.id);

  const cases = [
    // --- the four fixes written as comments, the code untouched ---
    ['four "// the fix is ..." lines, bugs intact', starter + [
      '// let itemName = "Notebook";   // syntax',
      '// let total = beforeTax + tax; // runtime',
      '// savings = savings + DEPOSIT;  // logic',
      '// i++; continue;',
      '',
    ].join('\n'), ['r5']],
    ['buggy code deleted, fix left only as a comment', starter
      .replace('let itemName = "Notebook;', '// let itemName = "Notebook";  // syntax')
      .replace('let total = beforTax + tax;', '// let total = beforeTax + tax;  // runtime')
      .replace('  savings = savings + DEPOSIT;\n', '  // savings = savings + DEPOSIT;  // logic\n')
      .replace('  i++;\n', '  // i++;\n'), ['r5']],

    // --- the comment the lesson asks for must not cost the mark ---
    ['reference, plus a comment naming the typo', solution
      .replace('// Bug 2 -- runtime:', '// Bug 2 -- runtime: beforTax was misspelled\n// the fix:'), ['r1', 'r2', 'r3', 'r4', 'r5']],

    // --- the two anchors everything else is measured against ---
    ['the untouched starter', starter, []],
    ['the reference solution', solution, ['r1', 'r2', 'r3', 'r4', 'r5']],
  ];

  let failures = 0;
  for (const [name, src, want] of cases) {
    const got = green(src);
    if (got.join(',') !== want.join(',')) {
      failures++;
      console.error(`  FAIL  ${name} — green: [${got.join(',')}], expected [${want.join(',')}]`);
    }
  }

  // The feature that motivated the scanner in the first place: a // inside a
  // real string is text, not a comment. This is the case the new lookahead
  // could have broken -- that quote HAS a partner on its line, so it must
  // still be read as a string.
  const inString = grade(
    [{ id: 'x', title: 'x', type: 'regex', file: 'a.js', pattern: '// not a comment' }],
    { 'a.js': 'console.log("// not a comment");' }, 0,
  ).results[0].status;
  if (inString !== 'passed') {
    failures++;
    console.error('  FAIL  a // inside a real string is still text, not a comment');
  }

  // The guard that stopped every card on this lesson reading green. A summative
  // lesson reaches the browser with `pattern` stripped, so this is the shape the
  // grader actually sees there -- and it must fail CLOSED, on the untouched
  // starter and on the reference alike, because there is nothing left to test
  // against. Before the guard `new RegExp('')` matched both and every card went
  // green.
  const redacted = reqs.map(({ pattern, ...rest }) => rest);
  for (const [name, src] of [
    ['the untouched starter', starter],
    ['the reference solution', solution],
  ]) {
    const got = grade(redacted, { 'script.js': src }, 0).results
      .filter((r) => r.status === 'passed')
      .map((r) => r.id);
    if (got.length) {
      failures++;
      console.error(`  FAIL  pattern stripped (as the browser gets it), ${name} — green: [${got.join(',')}]`);
    }
  }
  if (inString !== 'passed') {
    failures++;
    console.error('  FAIL  a // inside a real string is still text, not a comment');
  }

  if (failures > 0) {
    console.error(`\n[test-2-7-3-comments] FAIL — ${failures} of ${cases.length + 3} cases disagree`);
    process.exit(1);
  }
  console.log(`[test-2-7-3-comments] ok — ${cases.length + 3} cases against 2.7.3's checklist`);
} finally {
  fs.rmSync(out, { recursive: true, force: true });
}
