// Per-criterion lesson pointers -- batch 10: modules 3.5, 3.8 (final batch).

import { readFileSync, writeFileSync } from 'fs';

const POINTERS = {
  '3-5-5-lab-read-update-fields': { target: '3.5.4', note: 'Reading and Changing Properties' },
  '3-5-8-lab-dot-vs-bracket': { target: '3.5.6', note: 'Square Brackets and Computed Keys' },
  '3-5-12-lab-nested-structure': { target: '3.5.9', note: 'Objects Inside Objects and Arrays' },
  '3-5-15-lab-add-method': { target: '3.5.13', note: 'Methods' },
  '3-5-18-lab-params-to-object': { target: '3.5.16', note: 'Objects as Named Arguments' },
  '3-5-22-lab-destructure-three': { target: '3.5.19', note: 'Destructuring' },
  '3-5-24-lab-parallel-arrays-refactor': { target: '3.5.9', note: 'Objects Inside Objects and Arrays' },
  '3-5-25-lab-objects-capstone': { target: '3.5.2', note: 'Grouping Related Values' },

  '3-8-7-lab-stringify-spot-drops': { target: '3.8.6', note: 'What Does Not Survive' },
  '3-8-10-lab-round-trip-object': { target: '3.8.4', note: 'JSON.stringify — Object to Text' },
  '3-8-11-lab-round-trip-array': { target: '3.8.4', note: 'JSON.stringify — Object to Text' },
  '3-8-14-lab-malformed-json': { target: '3.8.12', note: 'Parsing Can Fail' },
  '3-8-18-lab-save-by-key': { target: '3.8.15', note: 'Saving by Key' },
  '3-8-19-lab-load-restore': { target: '3.8.15', note: 'Saving by Key' },
  '3-8-22-lab-capstone': { target: '3.8.15', note: 'Saving by Key' },
  '3-8-23-lab-adapt-to-list': { target: '3.8.15', note: 'Saving by Key' },
};

const PER_CRITERION = {
  '3-5-12-lab-nested-structure\u0000loop present':
    { target: '3.3.5', note: 'Looping Over Arrays (for / for…of)' },
  '3-5-24-lab-parallel-arrays-refactor\u0000loop present':
    { target: '3.3.5', note: 'Looping Over Arrays (for / for…of)' },
  '3-5-25-lab-objects-capstone\u0000loop present':
    { target: '3.3.5', note: 'Looping Over Arrays (for / for…of)' },
  '3-5-25-lab-objects-capstone\u0000nested object present':
    { target: '3.5.9', note: 'Objects Inside Objects and Arrays' },
  '3-5-25-lab-objects-capstone\u0000bracket access used':
    { target: '3.5.6', note: 'Square Brackets and Computed Keys' },
  '3-5-25-lab-objects-capstone\u0000destructuring used':
    { target: '3.5.19', note: 'Destructuring' },

  '3-8-7-lab-stringify-spot-drops\u0000JSON.stringify used':
    { target: '3.8.4', note: 'JSON.stringify — Object to Text' },
  '3-8-10-lab-round-trip-object\u0000Saved with stringify':
    { target: '3.8.4', note: 'JSON.stringify — Object to Text' },
  '3-8-10-lab-round-trip-object\u0000Restored with parse':
    { target: '3.8.8', note: 'JSON.parse — Text Back to Object' },
  '3-8-11-lab-round-trip-array\u0000Saved with stringify':
    { target: '3.8.4', note: 'JSON.stringify — Object to Text' },
  '3-8-11-lab-round-trip-array\u0000Restored with parse':
    { target: '3.8.8', note: 'JSON.parse — Text Back to Object' },
  '3-8-14-lab-malformed-json\u0000Parse attempted':
    { target: '3.8.8', note: 'JSON.parse — Text Back to Object' },
  '3-8-14-lab-malformed-json\u0000try block present':
    { target: '2.5.4', note: 'try...catch: Attempt and Recover' },
  '3-8-14-lab-malformed-json\u0000catch block present':
    { target: '2.5.4', note: 'try...catch: Attempt and Recover' },
  '3-8-19-lab-load-restore\u0000Restored with parse':
    { target: '3.8.8', note: 'JSON.parse — Text Back to Object' },
  '3-8-19-lab-load-restore\u0000try/catch guard':
    { target: '2.5.4', note: 'try...catch: Attempt and Recover' },
  '3-8-22-lab-capstone\u0000State converted with stringify':
    { target: '3.8.4', note: 'JSON.stringify — Object to Text' },
  '3-8-22-lab-capstone\u0000Parse guarded':
    { target: '2.5.4', note: 'try...catch: Attempt and Recover' },
  '3-8-23-lab-adapt-to-list\u0000Converted with stringify':
    { target: '3.8.4', note: 'JSON.stringify — Object to Text' },
  '3-8-23-lab-adapt-to-list\u0000List restored with parse':
    { target: '3.8.8', note: 'JSON.parse — Text Back to Object' },
};

const SKIP_TITLE = {
  'Result logged': 'console.log -- foundational',
  'Both logged': 'console.log -- foundational',
  'Output printed': 'console.log -- foundational',
  'Both paths logged': 'console.log -- foundational',
  'result printed': 'console.log -- foundational',
  'sentence printed': 'console.log -- foundational',
  'whole object printed': 'console.log -- foundational',
  'Stored text logged': 'console.log -- foundational',
  'Restored state logged': 'console.log -- foundational',
  'Restored list logged': 'console.log -- foundational',
  // covered by the lesson default
  'object literal created': 'covered by the default pointer on this lesson',
  'property read with a dot': 'covered by the default pointer on this lesson',
  'existing field changed': 'covered by the default pointer on this lesson',
  'square bracket access used': 'covered by the default pointer on this lesson',
  'spaced key reached in brackets': 'covered by the default pointer on this lesson',
  'value fetched with brackets': 'covered by the default pointer on this lesson',
  'nested object built': 'covered by the default pointer on this lesson',
  'array of objects built': 'covered by the default pointer on this lesson',
  'nested chain read': 'covered by the default pointer on this lesson',
  'index then field read': 'covered by the default pointer on this lesson',
  'method defined on the object': 'covered by the default pointer on this lesson',
  'method called with parentheses': 'covered by the default pointer on this lesson',
  'return used': 'covered by the default pointer on this lesson',
  'function defined': 'declaring a function is 3.1.2, earlier than this module',
  'reads a property off the options object': 'covered by the default pointer on this lesson',
  'called with an object literal': 'covered by the default pointer on this lesson',
  'object destructuring used': 'covered by the default pointer on this lesson',
  'parameter destructured': 'covered by the default pointer on this lesson',
  'array of object records built': 'covered by the default pointer on this lesson',
  'array of records built': 'covered by the default pointer on this lesson',
  'record fields read with a dot': 'covered by the default pointer on this lesson',
  'dot access used': 'covered by the default pointer on this lesson',
  'Object.keys used': 'Object.keys is on 3.5.6, the default pointer here',
  'Object declared': 'covered by the default pointer on this lesson',
  'Game-state object declared': 'covered by the default pointer on this lesson',
  'An array of objects inside': 'covered by the default pointer on this lesson',
  'Array of objects declared': 'covered by the default pointer on this lesson',
  'A function value in the object': 'covered by the default pointer on this lesson',
  'State object declared': 'covered by the default pointer on this lesson',
  'Stored by key': 'covered by the default pointer on this lesson',
  'Converted with stringify': 'covered by the default pointer on this lesson',
  'List saved by key': 'covered by the default pointer on this lesson',
  'Key read back': 'covered by the default pointer on this lesson',
  'Read by key': 'covered by the default pointer on this lesson',
  'Missing key checked': 'covered by the default pointer on this lesson',
  'Missing key handled': 'covered by the default pointer on this lesson',
  'Save function stores by key': 'covered by the default pointer on this lesson',
  'Load reads the key': 'covered by the default pointer on this lesson',
};

const DRY = process.argv.includes('--dry-run');
let added = 0;
let skipped = 0;
let touched = 0;

const folders = [...new Set([
  ...Object.keys(POINTERS),
  ...Object.keys(PER_CRITERION).map((k) => k.split('\u0000')[0]),
])];

for (const folder of folders) {
  const file = `lessons/${folder}/lesson.json`;
  let lesson;
  try {
    lesson = JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    console.log(`  SKIP  ${folder} -- no readable lesson.json`);
    continue;
  }
  for (const req of lesson.requirements ?? []) {
    const title = String(req.title ?? '');
    if (/\d+\.\d+\.\d+/.test(String(req.description ?? ''))) {
      console.log(`  KEEP     ${folder}  "${title.slice(0, 50)}"`);
      continue;
    }
    const perCrit = Object.entries(PER_CRITERION)
      .filter(([k]) => k.split('\u0000')[0] === folder && title.includes(k.split('\u0000')[1]))
      .sort((a, b) => b[0].length - a[0].length)[0];
    const skip = Object.entries(SKIP_TITLE).find(([t]) => title.includes(t));
    const target = perCrit ? perCrit[1] : skip ? null : POINTERS[folder];
    if (!target) {
      skipped++;
      console.log(`  no ptr  ${folder}  "${title.slice(0, 50)}" -- ${skip ? skip[1] : 'no teaching lesson identified'}`);
      continue;
    }
    const desc = String(req.description ?? '');
    const next = /\.$/.test(desc) ? desc : `${desc}.`;
    req.description = `${next} Help: ${target.target} (${target.note})`;
    added++;
    console.log(`  ${DRY ? 'would add' : 'add   '}  ${folder} -> ${target.target}  "${title.slice(0, 50)}"`);
  }
  if (!DRY) {
    writeFileSync(file, `${JSON.stringify(lesson, null, 2)}\n`);
    touched++;
  }
}

console.log(
  `\n${DRY ? 'DRY RUN: ' : ''}${added} pointer(s) across ${touched} lesson(s). ` +
  `${skipped} criterion/criteria deliberately left without one.`,
);
