// Every book element a chapter-2 lesson cites must still exist in the book.
//
// `sourceRef` in a chapter-2 `lesson.json` is the only link between a lesson and
// the textbook it was written from. Nothing renders it and nothing else reads
// it, so when the book moves, the reference rots in silence.
//
// It has rotted once already. The book renumbered its worked elements from two
// parts to three -- `Example 2.4` became `Example 2.1.5` -- and 58 lessons kept
// pointing at numbers the book no longer had. The offset was NOT constant: §2.1
// gained an example partway through, so `Try It Now 2.2` moved +1 while
// `Example 2.12` moved +0. A mechanical renumber would have landed three
// references on the wrong example and nothing would have said so.
//
// What this checks, and only this:
//
//   * a LABELLED element -- `Definition 2.1.2`, `Example 2.4.7`,
//     `Try It Now 2.3.2`, `Problem Set 2.5.13` -- names a heading (or, for a
//     problem set, a numbered item) that is in the book today, under that label.
//   * a `book N.S` / `book N.S.K` anchor names a real section or subsection.
//
// What it deliberately does NOT check: a bare three-part number with no label in
// front of it. Those are ambiguous by design -- `ahead of 2.3.30` is a shCode
// lesson, `practice for 2.5.4 Concepts in Practice` is a book subsection, and
// both are ordinary prose in the same field. Gating on them would flag dozens of
// correct references, and a gate that cries wolf gets switched off, taking the
// real findings with it. The count of skipped numbers is printed so the size of
// that blind spot stays visible.
//
// Scope is chapter 2 (`lessons/2-*`), because chapter 2 is the only chapter with
// `sourceRef` at all -- units 1 and 3-8 have zero, across 378 lessons.
//
// The book is a SEPARATE REPO. If it is not on disk this exits 1 and says so
// rather than passing: a book checker that goes quiet when the book is missing
// is worse than no checker, because it reports green for a question it never
// asked. That is also why this is NOT in `npm test` -- it would fail on any
// machine without bookSHelf checked out. Run it deliberately:
//
//   npm run test:book-refs
//   BOOKSHELF=/path/to/bookSHelf npm run test:book-refs
//
// Run it after ANY edit to chapter 2 of the book, and after adding a lesson.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ------------------------------------------------------------- find the book
const CHAPTER_DIR = path.join(
  'projects', 'Introduction to Programming Concepts and Methodologies',
  'remastered', 'Chapter_2_Numbered');

// An explicit BOOKSHELF that does not resolve is an error, not a hint: falling
// back to the sibling clone would check a DIFFERENT book than the one asked for
// and still print green.
const candidates = (process.env.BOOKSHELF
  ? [process.env.BOOKSHELF]
  : [path.join(root, '..', 'bookSHelf')]
).map((p) => path.resolve(p, CHAPTER_DIR));

const bookDir = candidates.find((p) => fs.existsSync(p));
if (!bookDir) {
  console.error('[check-book-refs] cannot find the book. Looked for:');
  for (const c of candidates) console.error(`  ${c}`);
  console.error('\nSet BOOKSHELF to the bookSHelf repo root, or clone it beside shCode.');
  console.error('Exiting 1 on purpose — passing here would mean reporting green for');
  console.error('a question this script never got to ask.');
  process.exit(1);
}

// ------------------------------------------------------------ index the book
// (kind, number) pairs. Kinds are namespaced: Problem Set 2.2.3 and Example
// 2.2.3 are different things that happen to share a number.
const book = new Set();
const sections = new Set();
const key = (kind, num) => `${kind} ${num}`;

const ELEMENT = /^###\s+(Definition|Example|Try It Now)\s+(\d+\.\d+\.\d+)/;
const SUBSECTION = /^##\s+(\d+\.\d+\.\d+)\s/;
const PROBLEM_SET_HEAD = /^##\s+Problem Set\s+(\d+\.\d+)\s*$/;
const PROBLEM_ITEM = /^\*\*(\d+\.\d+\.\d+)\*\*/;

let files = 0;
for (const f of fs.readdirSync(bookDir).sort()) {
  // The _Solutions files restate every problem number; indexing them would let a
  // reference to a problem that only exists in the answer key pass.
  if (!/^2\.\d+_.*\.md$/.test(f) || /_Solutions/.test(f)) continue;
  files++;
  const section = f.slice(0, f.indexOf('_'));
  sections.add(section);
  let inProblemSet = false;
  for (const line of fs.readFileSync(path.join(bookDir, f), 'utf8').split(/\r?\n/)) {
    if (PROBLEM_SET_HEAD.test(line)) { inProblemSet = true; continue; }
    if (/^##\s/.test(line) && !PROBLEM_SET_HEAD.test(line)) inProblemSet = false;

    const el = ELEMENT.exec(line);
    if (el) { book.add(key(el[1].toLowerCase(), el[2])); continue; }
    const sub = SUBSECTION.exec(line);
    if (sub) { book.add(key('subsection', sub[1])); continue; }
    if (inProblemSet) {
      const pr = PROBLEM_ITEM.exec(line);
      if (pr) book.add(key('problem set', pr[1]));
    }
  }
}
if (files !== 5) {
  console.error(`[check-book-refs] expected 5 chapter-2 section files, found ${files} in`);
  console.error(`  ${bookDir}`);
  process.exit(1);
}

// ------------------------------------------------------------- read the refs
const lessonsDir = path.join(root, 'lessons');
const lessons = [];
for (const d of fs.readdirSync(lessonsDir).sort()) {
  if (!d.startsWith('2-')) continue;
  const p = path.join(lessonsDir, d, 'lesson.json');
  if (!fs.existsSync(p)) continue;
  let j;
  try { j = JSON.parse(fs.readFileSync(p, 'utf8')); } catch {
    console.error(`[check-book-refs] ${d}/lesson.json is not valid JSON`);
    process.exit(1);
  }
  if (typeof j.sourceRef === 'string' && j.sourceRef.trim()) {
    lessons.push({ dir: d, title: j.title ?? '', ref: j.sourceRef });
  }
}

// A label carries across a chain: `Example 2.1.9/2.1.10/2.1.11`,
// `Problem Set 2.5.11, 2.5.13, 2.5.14`, `Problem Set 2.1.7-2.1.10`. Match the
// label once, then walk the numbers that follow while the separators stay in
// the chain alphabet.
const LABEL = /\b(Definition|Example|Try It Now|Problem Set)\s+(\d+(?:\.\d+)+)((?:\s*(?:[/,&-]|and)\s*\d+(?:\.\d+)+)*)/gi;
const CHAINED = /\d+(?:\.\d+)+/g;
// `book 2.4.6:`, `book 2.1 Problem Set`, `informed by book 2.2.4 Insight Note`.
// `§2.1` is a curriculum-plan section, not a book anchor, and is skipped.
const ANCHOR = /\bbook\s+(\d+\.\d+(?:\.\d+)?)/gi;
// Every three-part number, to size what the two rules above did not look at.
const ANY_NUM = /(?<![\w.])\d+\.\d+\.\d+(?![\w.])/g;

const problems = [];
let checkedElements = 0;
let checkedAnchors = 0;
let skipped = 0;

for (const l of lessons) {
  const seen = new Set();
  const flag = (msg) => problems.push(`${l.dir} (${l.title.split(' ')[0]}) ${msg}`);

  for (const m of l.ref.matchAll(LABEL)) {
    const kind = m[1].toLowerCase().replace(/\s+/g, ' ');
    for (const num of [m[2], ...(m[3] ? m[3].match(CHAINED) ?? [] : [])]) {
      seen.add(num);
      checkedElements++;
      if (num.split('.').length !== 3) {
        flag(`cites two-part "${m[1]} ${num}" — the book numbers every element`
          + ' in three parts. This is the renumber rot; resolve it by TITLE, not'
          + ' by adding a digit (the offset is not constant).');
      } else if (!book.has(key(kind, num))) {
        flag(`cites "${m[1]} ${num}", which chapter 2 does not contain`);
      }
    }
  }

  for (const m of l.ref.matchAll(ANCHOR)) {
    const num = m[1];
    seen.add(num);
    checkedAnchors++;
    if (num.split('.').length === 2) {
      if (!sections.has(num)) flag(`anchors to book §${num}, which is not a chapter-2 section`);
    } else if (!book.has(key('subsection', num))) {
      flag(`anchors to book §${num}, which is not a subsection of chapter 2`);
    }
  }

  for (const m of l.ref.matchAll(ANY_NUM)) if (!seen.has(m[0])) skipped++;
}

// --------------------------------------------------------------- the verdict
console.log(`[check-book-refs] book: ${bookDir}`);
console.log(`[check-book-refs] indexed ${book.size} elements across ${files} sections`);
console.log(`[check-book-refs] ${lessons.length} chapter-2 lessons carry a sourceRef;`
  + ` checked ${checkedElements} labelled element(s) + ${checkedAnchors} section anchor(s)`);
if (skipped) {
  console.log(`[check-book-refs] ${skipped} bare number(s) not checked — unlabelled numbers`
    + ' are ambiguous between book subsections and shCode lesson numbers.');
}
if (problems.length) {
  console.error(`\n[check-book-refs] ${problems.length} reference(s) name nothing in the book:\n`);
  for (const p of problems) console.error(`  STALE  ${p}`);
  console.error('\nThe book moved and the lessons did not. Match each one to the book'
    + ' element with the SAME TITLE — do not shift the number by a constant.');
  process.exit(1);
}
console.log('[check-book-refs] every cited book element exists');
