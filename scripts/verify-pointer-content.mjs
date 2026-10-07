// Content verification: does the linked lesson's BODY teach what the pointer claims?
//
// Every pointer carries the concept it names in its `note` -- "Logical
// Operators", "break and Fall-Through", "Array Basics: Index, push, pop". This
// checks that the target lesson's content.md actually mentions that concept, so
// a pointer cannot be satisfied by a title alone.
//
// This is a SIGNAL, not proof. A reading can teach a concept without using the
// exact phrase, so a miss is a prompt to look, not a failure. A hit is good
// evidence. What it cannot do is confirm a reading teaches something well.
//
// Coverage gap it cannot see: a target with no content.md (19 of them -- videos,
// labs, quizzes) gets "no body" and is reported separately rather than silently
// passing.

import { readFileSync, readdirSync, existsSync } from 'fs';

const BATCHES = [
  'apply-criterion-pointers-2-1.mjs', 'apply-criterion-pointers-3-1.mjs',
  'apply-criterion-pointers-batch3.mjs', 'apply-criterion-pointers-batch4.mjs',
  'apply-criterion-pointers-batch5.mjs', 'apply-criterion-pointers-batch6.mjs',
  'apply-criterion-pointers-batch7.mjs', 'apply-criterion-pointers-batch8.mjs',
  'apply-criterion-pointers-batch9.mjs', 'apply-criterion-pointers-batch10.mjs',
  'apply-criterion-pointers-batch11.mjs',
];

// folder -> { target, note } for every reviewed decision.
const CLAIMS = new Map();
for (const b of BATCHES) {
  const src = readFileSync(`scripts/${b}`, 'utf8');
  const defs = [...(src.match(/const POINTERS = \{([\s\S]*?)\n\};/) || [])[1]?.matchAll(
    /'([^']+)':\s*\{\s*target:\s*'([\d.]+)',\s*note:\s*'((?:[^'\\]|\\.)*)'\s*\}/g) ?? [],
  ];
  // Stored as an entries map, NOT as a bare {target, note}: iterating a bare
  // object yields its KEYS, so every lesson reported a criterion called
  // "target" and one called "note".
  for (const m of defs) CLAIMS.set(m[1], { '(lesson default)': { target: m[2], note: m[3] } });
  const per = [...(src.match(/const PER_CRITERION = \{([\s\S]*?)\n\};/) || [])[1]?.matchAll(
    /'([^']+)\\u0000((?:[^'\\]|\\.)*)'\s*:\s*\{\s*target:\s*'([\d.]+)',\s*note:\s*'((?:[^'\\]|\\.)*)'\s*\}/g) ?? [],
  ];
  for (const m of per) {
    const folder = m[1];
    const list = CLAIMS.get(folder) ?? {};
    list[m[2]] = { target: m[3], note: m[4] };
    CLAIMS.set(folder, list);
  }
}

// lesson number -> { title, body }
const LESSONS = new Map();
for (const d of readdirSync('lessons', { withFileTypes: true })) {
  if (!d.isDirectory()) continue;
  const f = `lessons/${d.name}/lesson.json`;
  if (!existsSync(f)) continue;
  let j;
  try { j = JSON.parse(readFileSync(f, 'utf8')); } catch { continue; }
  const m = String(j.title ?? '').match(/^(\d+\.\d+\.\d+)/);
  if (!m) continue;
  const c = `lessons/${d.name}/content.md`;
  LESSONS.set(m[1], {
    title: j.title.slice(m[0].length).trim(),
    body: existsSync(c) ? readFileSync(c, 'utf8').toLowerCase() : '',
  });
}

// Words too common in this corpus to be evidence of anything. Without this,
// "If / Else if / Else" reduces to the single word "else" and every switch
// lesson "passes" on it.
const STOP = /^(and|with|from|that|this|your|what|when|into|one|two|else|case|value|values|number|numbers|object|objects|array|arrays|code|data|first|then|than|does|did|have|they|them|were|been|only|also|each|every|some|more|other|such|there|their|which|while|where|about|three|four|five|six|seven|eight|nine|ten)$/;

// A pointer is SUPPORTED only when the target's body mentions most of the
// distinctive words in its concept. One hit out of three is a coincidence, not
// evidence that the reading teaches the thing.
const REQUIRED = 0.6;

// The distinctive words in a concept name. Punctuation and the words a lesson
// title is made of are dropped: "Reading:", "moSHion docs:", "Lab:", backticks.
function keywords(note) {
  return note
    .toLowerCase()
    .replace(/reading|worked example|moshion docs|slides|video|lab|quiz|chart the code/g, ' ')
    .replace(/[`:,]/g, ' ')
    // Split on whitespace AND hyphens BEFORE stripping punctuation. Titles
    // hyphenate -- "Function-Call", "Object-Oriented", "Multi-Paradigm" -- and
    // keeping those whole meant no lesson body could ever contain the token.
    .split(/[\s-]+/)
    .map((w) => w.replace(/[^a-z0-9+#.\$]+/gi, ''))
    .filter((w) => w.length >= 5 && !STOP.test(w));
}

// A concept word counts as present if the body has it in any ordinary English
// form: "conditionals" matches "conditional", "effects" matches "effect".
function present(body, word) {
  if (body.includes(word)) return true;
  for (const form of [word.replace(/s$/, ''), word + 's', word.replace(/es$/, '')]) {
    if (form.length >= 4 && body.includes(form)) return true;
  }
  return false;
}

let hit = 0;
let untestable = 0;
const misses = [];
const noBody = [];

for (const [folder, claims] of CLAIMS) {
  for (const [crit, { target, note }] of Object.entries(claims)) {
    const lesson = LESSONS.get(target);
    if (!lesson) { misses.push({ folder, crit, target, note, why: 'target not found' }); continue; }
    if (!lesson.body.trim()) { noBody.push(`${folder} -> ${target} (${lesson.title})`); continue; }
    const words = keywords(note);
    if (words.length === 0) {
      // The concept name is made only of common words, so there is nothing to
      // test. Counted separately rather than passing silently.
      untestable++;
      continue;
    }
    const found = words.filter((w) => present(lesson.body, w));
    const ratio = found.length / words.length;
    if (ratio >= REQUIRED) hit++;
    else misses.push({ folder, crit, target, note, title: lesson.title, ratio: ratio.toFixed(2), words: words.join('/') });
  }
}

console.log(`pointer concepts checked against lesson bodies\n`);
console.log(`  ${hit} supported -- the target's body mentions >=60% of the concept's words`);
console.log(`  ${misses.length} NOT supported -- read these`);
console.log(`  ${untestable} concept name is all common words, so untestable by keyword`);
console.log(`  ${noBody.length} target has no content.md (video/lab/quiz) -- not checked\n`);

if (misses.length) {
  console.log('NOT FOUND BY KEYWORD (a miss is a prompt to look, not a failure):');
  for (const m of misses.slice(0, 40)) {
    console.log(`  ${m.folder} -> ${m.target} (${m.title ?? '?'})  [${m.note}]  ${m.ratio} of "${m.words}"`);
  }
  if (misses.length > 40) console.log(`  ... and ${misses.length - 40} more`);
}
