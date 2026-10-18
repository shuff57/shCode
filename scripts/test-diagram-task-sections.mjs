// taskSections keeps the sections a student needs beside the canvas in full screen.
import { readFileSync, readdirSync, existsSync } from 'fs';
import path from 'path';
import ts from 'typescript';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const src = readFileSync(path.join(root, 'lib/diagram-task-sections.ts'), 'utf8');
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const m = { exports: {} };
new Function('module', 'exports', js)(m, m.exports);
const { taskSections } = m.exports;

let bad = 0;
const check = (name, ok, extra = '') => { if (!ok) { bad++; console.log('FAIL', name, extra); } };

const sample = '## Title\n\nintro\n\n### The rule\n\nrule text\n\n### What to draw\n\n| a | b |\n\n### The three things that decide whether this is right\n\n1. one\n\n### The point of the lesson\n\nprose\n\n### Before you submit\n\nPress Check.';
const out = taskSections(sample);
check('keeps what to draw', out.includes('### What to draw'));
check('keeps the three things', out.includes('The three things that decide'));
check('keeps before you submit', out.includes('Press Check.'));
check('drops the rule prose', !out.includes('rule text'));
check('drops the point prose', !out.includes('prose'));
check('fenced hash is not a heading', taskSections('### What to draw\n\n```\n## Not a heading\n```\n\n### Other\n\nx').includes('## Not a heading'));
check('no matching heading keeps all', taskSections('hello\n\n### Misc\n\nworld') === 'hello\n\n### Misc\n\nworld');

// Every real diagram lesson yields a non-empty, shorter-or-equal text.
const dir = path.join(root, 'lessons');
let n = 0;
for (const id of readdirSync(dir)) {
  const lj = path.join(dir, id, 'lesson.json');
  const cm = path.join(dir, id, 'content.md');
  if (!existsSync(lj) || !existsSync(cm)) continue;
  if (JSON.parse(readFileSync(lj, 'utf8')).preview !== 'diagram') continue;
  const md = readFileSync(cm, 'utf8');
  const t = taskSections(md);
  n++;
  check(id + ' non-empty', t.length > 0);
  check(id + ' not longer', t.length <= md.trim().length);
}
console.log(bad ? `${bad} failed` : `ok -- ${n} diagram lessons`);
process.exit(bad ? 1 : 0);
