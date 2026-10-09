// Does any console lab ask a student to write something the course has not taught yet?
//
// For every assignment with a starter script (lessons/<id>/script.js), find the language
// features the lab REQUIRES (its steps, requirements and starter, with the "Help:" pointers
// stripped) and look for the earliest lesson, in course order, that teaches each one. A feature
// is TAUGHT when an earlier lesson's content (or its slide deck) mentions it, and SHOWN when an
// earlier lesson has it inside a code block.
//
//   ERROR  required by a lab, but no earlier lesson mentions it at all.
//   WARN   required by a lab, mentioned earlier but never shown in code (or only the reference
//          solution uses it, and nothing earlier teaches it).
//
// Course order is the number in the lesson TITLE (3.4.21 sits after 3.4.20 even though its id is
// 3-1-10-functions). Features come from the catalog below; a feature that is not listed is not
// checked, so add one when a lesson starts using something new.
//
// Known, accepted cases live in scripts/concept-order-allow.json as "labId:feature": reason.
// Run: node scripts/check-concept-order.mjs [--module 3.6] [--warn]   (ERRORs also fail npm test)

import { readFileSync, readdirSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const only = args.includes('--module') ? args[args.indexOf('--module') + 1] : null;
const showWarn = args.includes('--warn');

// [id, label, test] -- test is a RegExp over text (steps, prose) or code. One regex serves both:
// authors write the same tokens (`.map(`, `structuredClone`) in prose and in code.
const C = (id, label, re) => ({ id, label, re });
const CATALOG = [
  C('fn-expression', 'function expression', /=\s*function\s*\(|function expressions?\b/i),
  C('arrow', 'arrow function', /=>|\barrow (?:function|syntax|form|callback)/i),
  C('callback', 'callback / function as an argument', /\bcallbacks?\b|passing a function|function (?:as|you pass as) an argument/i),
  C('default-param', 'default parameter', /\bdefault (?:parameter|argument|value)s?\b|function\s*\w*\s*\([^)]*\b\w+\s*=\s*[^=>)\s]/i),
  C('rest-param', 'rest parameter', /\brest parameters?\b|\(\s*\.\.\.\w+\s*\)/i),
  C('spread-array', 'array spread', /\[\s*\.\.\.\s*\w|\bspread\b/i),
  C('spread-object', 'object spread', /\{\s*\.\.\.\s*\w|\bobject spread\b/i),
  C('destructuring', 'destructuring', /destructur|(?:const|let|var)\s*[\[{][^=\n]*[\]}]\s*=/i),
  C('template-literal', 'template literal', /\$\{|template literals?|backticks?/i),
  C('for-of', 'for...of loop', /for\s*\(\s*(?:const|let|var)\s+\w+\s+of\b|for\.\.\.of|for-of|\bfor of\b/i),
  C('while', 'while loop', /\bwhile\s*\(|\bwhile loops?\b/i),
  C('switch', 'switch statement', /\bswitch\s*\(|\bswitch statement/i),
  C('break-continue', 'break / continue', /\bbreak;|\bcontinue;|\bbreak\b statement|\bcontinue\b statement/i),
  C('push', '.push()', /\.push\b|\bpush\(/),
  C('pop', '.pop()', /\.pop\b/),
  C('shift', '.shift() / .unshift()', /\.(?:un)?shift\b/),
  C('slice', '.slice()', /\.slice\b/),
  C('splice', '.splice()', /\.splice\b/),
  C('concat', '.concat()', /\.concat\b/),
  C('map', '.map()', /\.map\b/),
  C('filter', '.filter()', /\.filter\b/),
  C('reduce', '.reduce()', /\.reduce\b/),
  C('foreach', '.forEach()', /\.forEach\b/),
  C('includes', '.includes()', /\.includes\b/),
  C('indexof', '.indexOf()', /\.indexOf\b/),
  C('sort', '.sort()', /\.sort\b/),
  C('reverse', '.reverse()', /\.reverse\b/),
  C('every-some', '.every() / .some()', /\.(?:every|some)\b/),
  C('find', '.find()', /\.find(?:Index)?\b/),
  C('join', '.join()', /\.join\b/),
  C('split', '.split()', /\.split\b/),
  C('object-keys', 'Object.keys / values / entries', /Object\.(?:keys|values|entries)\b/),
  C('object-assign', 'Object.assign / freeze', /Object\.(?:assign|freeze)\b/),
  C('in-delete', 'in / delete on objects', /\bdelete\s+\w+[.\[]|["']\w+["']\s+in\s+\w+\s*[)&|?]/),
  C('this', 'this', /\bthis\.\w/),
  C('json', 'JSON.stringify / JSON.parse', /JSON\.(?:stringify|parse)\b/),
  C('localstorage', 'localStorage', /localStorage/),
  C('try-catch', 'try / catch', /\btry\s*\{|\bcatch\s*\(|try\s*\/\s*catch|try\.\.\.catch/i),
  C('structuredclone', 'structuredClone', /structuredClone/),
  C('optional-chaining', 'optional chaining ?.', /\?\.\w/),
  C('nullish', 'nullish ??', /\?\?/),
  C('math', 'Math functions', /Math\.(?:max|min|round|floor|ceil|random|abs|pow|sqrt)\b/),
  C('string-methods', 'string methods', /\.(?:toUpperCase|toLowerCase|trim|padStart|padEnd|replace|startsWith|endsWith|charAt)\b/),
  C('number-conv', 'Number() / parseInt / parseFloat', /\bNumber\s*\(|parseInt|parseFloat/),
];

const numOf = (title) => {
  const m = /^(\d+)\.(\d+)\.(\d+)/.exec(title || '');
  return m ? [+m[1], +m[2], +m[3]] : null;
};
const cmp = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
const fmt = (n) => n.join('.');
const read = (p) => (existsSync(p) ? readFileSync(p, 'utf8').replace(/\r\n?/g, '\n') : '');
const stripHelp = (s) => String(s || '').replace(/\s*Help:.*$/s, '');
const codeBlocks = (md) => [...md.matchAll(/```[^\n]*\n([\s\S]*?)```/g)].map((m) => m[1]).join('\n');
const proseOf = (md) => md.replace(/```[^\n]*\n[\s\S]*?```/g, ' ');

// ---- the course, in order
const lessons = [];
for (const d of readdirSync(path.join(root, 'lessons'))) {
  const jp = path.join(root, 'lessons', d, 'lesson.json');
  if (!existsSync(jp)) continue;
  const j = JSON.parse(readFileSync(jp, 'utf8'));
  const num = numOf(j.title);
  if (!num) continue;
  lessons.push({ id: d, j, num });
}
lessons.sort((a, b) => cmp(a.num, b.num));

// What each lesson teaches: its reading/example content and its slide deck.
const taught = new Map(); // lesson id -> { code, prose }
for (const l of lessons) {
  const md = read(path.join(root, 'lessons', l.id, 'content.md'));
  let deck = '';
  if (l.j.slidesUrl) deck = read(path.join(root, 'public', l.j.slidesUrl)).replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ');
  taught.set(l.id, { code: codeBlocks(md), prose: proseOf(md) + '\n' + deck });
}

function firstTeaching(feature, before) {
  let mention = null;
  for (const l of lessons) {
    if (cmp(l.num, before) >= 0) break;
    if (l.j.type === 'assignment' && l.j.preview !== 'assignment') continue; // labs do not teach
    const t = taught.get(l.id);
    if (feature.re.test(t.code)) return { shown: l, mention };
    if (!mention && feature.re.test(t.prose)) mention = l;
  }
  return { shown: null, mention };
}

const allow = JSON.parse(read(path.join(root, 'scripts', 'concept-order-allow.json')) || '{}');
const errors = [];
const warns = [];
let labs = 0;

for (const l of lessons) {
  const j = l.j;
  if (j.type !== 'assignment' || j.preview !== 'console') continue;
  if (only && !fmt(l.num).startsWith(only + '.')) continue;
  const starter = read(path.join(root, 'lessons', l.id, 'script.js'));
  if (!starter) continue;
  labs++;
  const need = [
    ...(j.steps || []).map((s) => s.instructions || ''),
    ...(j.requirements || []).map((r) => `${r.title || ''} ${stripHelp(r.description)}`),
    starter,
  ].join('\n');
  const sol = read(path.join(root, 'lessons', l.id, 'solution.js')) + (existsSync(path.join(root, 'lessons', l.id, 'solution')) ? '\n' + read(path.join(root, 'lessons', l.id, 'solution', 'script.js')) : '');
  for (const f of CATALOG) {
    const required = f.re.test(need);
    const inSolution = f.re.test(sol);
    if (!required && !inSolution) continue;
    const { shown, mention } = firstTeaching(f, l.num);
    const key = `${l.id}:${f.id}`;
    if (key in allow) continue;
    const where = `${fmt(l.num)} ${l.id}`;
    if (required) {
      if (!shown && !mention) errors.push(`${where}: asks for ${f.label}, which no earlier lesson mentions`);
      else if (!shown) warns.push(`${where}: asks for ${f.label}; only mentioned (${fmt(mention.num)}), never shown in code before this lab`);
    } else if (!shown && !mention) {
      warns.push(`${where}: the reference solution uses ${f.label}, which no earlier lesson mentions (not required by the steps)`);
    }
  }
}

console.log(`check-concept-order: ${labs} console labs checked${only ? ` (module ${only})` : ''}, ${CATALOG.length} features`);
if (showWarn) for (const w of warns) console.log('  warn   ' + w);
else if (warns.length) console.log(`  ${warns.length} warning(s) -- run with --warn to list them`);
if (errors.length) {
  console.error(`check-concept-order: ${errors.length} lab(s) ask for something not taught yet\n  ` + errors.join('\n  '));
  process.exit(1);
}
console.log('check-concept-order: every required feature is mentioned in an earlier lesson');
