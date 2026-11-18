// The gate for a lab's Clef questions (lesson.json `aiCheck.clef`), through the same code path
// production uses (clefInputs -> Clef -> band -> pattern check for unsure cards).
//
// Not part of `npm test`: every program is a real Workers AI call (about $0.0005 each).
//
//   cd scripts/clef-proxy && npx wrangler dev --port 8799        # in another terminal
//   WORKERS_PROXY=http://localhost:8799 node --import ./scripts/register-ts.mjs \
//     scripts/clef-harness.mjs --lab 2-3-29-a2-3-1-print-settings-advisor [--fixtures f.json] [--tolerance] [--json out.json]
//
// Always graded: the lab's reference answer (must have NO red card) and its starter (no card green that the
// lab's pattern check calls red). --fixtures adds labelled programs, a JSON array of {name, code, labels}, where labels
// follow lesson.requirements order and each is 1, 0 or null (null = not scored). Run it after
// generate-ai-graders.mjs before deploying; the harness itself reads the questions from lesson.json.
//
// Exit 1 when the reference or starter fails, a fixture card is wrong, or no call succeeded.

import { execFileSync } from 'child_process';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { grade } from '../lib/grader.ts';
import { CLEF_MODEL, cardsFromAnswer, clefInputs, clefTask, resolveClefCards } from '../lib/clef-check-core.ts';
import { aiCheckText } from '../lib/ai-check.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i < 0 ? d : process.argv[i + 1]; };
const lab = arg('lab');
const proxy = process.env.WORKERS_PROXY;
if (!lab || !proxy) {
  console.error('usage: WORKERS_PROXY=http://localhost:8799 node --import ./scripts/register-ts.mjs scripts/clef-harness.mjs --lab <lessonId> [--fixtures f.json] [--json out.json]');
  process.exit(2);
}

const lf = (s) => String(s).replace(/\r\n?/g, '\n');
const lesson = JSON.parse(readFileSync(path.join(root, 'lessons', lab, 'lesson.json'), 'utf8'));
// The questions, task and kind as the generator builds them (scripts/generate-ai-graders.mjs), read from
// lesson.json itself so several labs can be edited and tested at once without regenerating in between.
const authored = lesson.aiCheck?.clef;
if (!authored?.questions) { console.error(`${lab} has no aiCheck.clef questions`); process.exit(2); }
const cfg = {
  task: clefTask(authored, lesson.aiCheck.prompt),
  kind: lesson.work?.kind === 'plan' ? 'plan' : lesson.preview === 'moshion' ? 'moshion' : 'console',
  questions: Object.fromEntries(Object.entries(authored.questions).map(([k, v]) => [k, String(v).trim()])),
};
if (!cfg.task) { console.error(`${lab}: no task (add aiCheck.clef.task)`); process.exit(2); }
// Only the cards Clef answers are scored here; a card that runs the code (`tests`) has no question and
// keeps its runtime result in the app, which this harness does not run.
const ids = lesson.requirements.map((r) => r.id).filter((id) => id in cfg.questions);
const file = lesson.aiCheck.file ?? 'script.js';

const dir = path.join(root, 'lessons', lab);
const readDir = (d) => Object.fromEntries(readdirSync(d, { withFileTypes: true }).filter((e) => e.isFile()).map((e) => [e.name, lf(readFileSync(path.join(d, e.name), 'utf8'))]));
const starterFiles = Object.fromEntries(Object.entries(readDir(dir)).filter(([n]) => n !== 'lesson.json' && n !== 'content.md' && !n.startsWith('solution')));
// The reference as the Solution panel inserts it: solution.js is script.js; solution/ holds every file.
const refFiles = existsSync(path.join(dir, 'solution.js'))
  ? { ...starterFiles, 'script.js': lf(readFileSync(path.join(dir, 'solution.js'), 'utf8')) }
  : existsSync(path.join(dir, 'solution')) ? { ...starterFiles, ...readDir(path.join(dir, 'solution')) } : null;
const programs = [];
if (refFiles) programs.push({ name: 'reference', files: refFiles, rule: 'no-red' });
programs.push({ name: 'starter', files: starterFiles, rule: 'no-green' });
const fx = arg('fixtures');
// A fixture's labels follow lesson.requirements order; keep only the cards scored here.
const allIds = lesson.requirements.map((r) => r.id);
const pick = (labels) => (Array.isArray(labels) ? ids.map((id) => labels[allIds.indexOf(id)] ?? null) : labels);
if (fx) for (const f of JSON.parse(readFileSync(fx, 'utf8'))) programs.push({ name: f.name, files: f.files ?? { ...starterFiles, [file]: lf(f.code) }, labels: pick(f.labels) });
// --tolerance: the lab's ACCEPT / REJECT cases from scripts/test-grader-tolerance.mjs (dumped through
// TOLERANCE_CASES_OUT). ACCEPT = every card green; REJECT = its named card red, the others not scored.
if (process.argv.includes('--tolerance')) {
  const tolCases = [];
  for (const t of ['test-grader-tolerance.mjs', 'test-grader-tolerance-3x.mjs']) {
    const dump = path.join(root, 'node_modules', '.pkg-load-cache', `tolerance-cases-${t}.json`);
    // Reuse a dump newer than the test file (a run over many labs dumps once).
    const fresh = existsSync(dump) && statSync(dump).mtimeMs > statSync(path.join(root, 'scripts', t)).mtimeMs;
    if (!fresh) execFileSync(process.execPath, ['--import', path.join(root, 'scripts/register-ts.mjs'), path.join(root, 'scripts', t)],
      { cwd: root, env: { ...process.env, TOLERANCE_CASES_OUT: dump }, stdio: 'pipe' });
    tolCases.push(...JSON.parse(readFileSync(dump, 'utf8')));
  }
  for (const c of tolCases.filter((c) => c.id === lab)) {
    if (c.expect === 'fail' && !ids.includes(c.req)) continue;
    const files = Object.fromEntries(Object.entries(c.files ?? {}).map(([k, v]) => [k, lf(v)]));
    const labels = c.expect === 'pass' ? ids.map(() => 1) : ids.map((id) => (id === c.req ? 0 : null));
    programs.push({ name: `${c.expect === 'pass' ? 'ACCEPT' : 'REJECT ' + c.req}: ${c.name}`, files, labels });
  }
}

async function ask(code) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(proxy, { method: 'POST', body: JSON.stringify({ model: CLEF_MODEL, inputs: clefInputs(cfg, code) }) });
    const j = await res.json().catch(() => ({ ok: false, error: 'bad proxy answer' }));
    if (j.ok) return { ms: j.ms, cards: cardsFromAnswer(j.out, Object.keys(cfg.questions)), tokens: j.out?.usage?.input_tokens ?? null };
    if (attempt === 2) throw new Error(j.error);
    await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
  }
}

let ok = 0, bad = 0, calls = 0, scored = 0, right = 0;
const rows = [];
const pool = 6;
const queue = programs.slice();
await Promise.all(Array.from({ length: pool }, async () => {
  while (queue.length) {
    const p = queue.shift();
    try {
      const a = await ask(aiCheckText(lesson.aiCheck, p.files));
      calls++;
      const report = grade(lesson.requirements, p.files);
      const { verdicts, decidedBy } = resolveClefCards(a.cards, report);
      rows.push({ ...p, ...a, verdicts, decidedBy });
    } catch (e) {
      rows.push({ ...p, error: String(e.message || e) });
    }
  }
}));

const order = new Map(programs.map((p, i) => [p.name, i]));
rows.sort((a, b) => order.get(a.name) - order.get(b.name));
for (const r of rows) {
  if (r.error) { bad++; console.log(`ERROR ${r.name}: ${r.error}`); continue; }
  const byId = new Map(r.cards.map((c) => [c.id, c]));
  const cells = ids.map((id) => {
    const v = r.verdicts[id]?.passed ? 1 : 0;
    const c = byId.get(id);
    const tag = r.decidedBy[id] === 'pattern' ? '?' : '';
    return `${id}=${v}${tag}(${c?.p == null ? '-' : c.p.toFixed(2)})`;
  });
  let verdict = '';
  if (r.rule === 'no-red') verdict = ids.every((id) => r.verdicts[id]?.passed) ? 'ok' : 'FAIL: a red card on the reference';
  // The starter: no card green that the lab's own pattern check calls red. (Some cards are green on the
  // starter by design, e.g. 1.1.3's "the first statement is still present".)
  else if (r.rule === 'no-green') {
    const pat = new Map(grade(lesson.requirements, r.files).results.map((x) => [x.id, x.status === 'passed']));
    const extra = ids.filter((id) => r.verdicts[id]?.passed && !pat.get(id));
    verdict = extra.length ? `FAIL: green on the starter where the pattern check is red: ${extra.join(',')}` : 'ok';
  }
  else if (r.labels) {
    const wrong = ids.filter((id, k) => r.labels[k] != null && (r.verdicts[id]?.passed ? 1 : 0) !== r.labels[k]);
    scored += r.labels.filter((x) => x != null).length;
    right += r.labels.filter((x) => x != null).length - wrong.length;
    verdict = wrong.length ? `FAIL: ${wrong.join(',')}` : 'ok';
  }
  if (verdict.startsWith('FAIL')) bad++; else ok++;
  console.log(`${verdict.padEnd(6)} ${r.name.slice(0, 50).padEnd(50)} ${r.ms} ms  ${cells.join(' ')}`);
}
const unsure = rows.filter((r) => !r.error).reduce((s, r) => s + Object.values(r.decidedBy).filter((d) => d === 'pattern').length, 0);
const cells = rows.filter((r) => !r.error).length * ids.length;
console.log(`\n${lab}: ${ok} ok, ${bad} failing, ${calls} calls; ${unsure}/${cells} cards went to the pattern check ("?")` +
  (scored ? `; fixtures ${right}/${scored} cards right (${(100 * right / scored).toFixed(1)}%)` : ''));
if (arg('json')) writeFileSync(arg('json'), JSON.stringify(rows, null, 1));
process.exit(bad || calls === 0 ? 1 : 0);
