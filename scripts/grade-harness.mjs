// Live grader harness. Runs one lesson's AI grader against a provider, N times
// per text, and reports (a) whether the reference answers pass and the starter
// fails, and (b) how often the model changes its verdict on the same text.
//
// Not part of `npm test`: it spends model credits and needs a key or a proxy.
//
//   node --import ./scripts/register-ts.mjs scripts/grade-harness.mjs \
//     --part 3-9-1-ch3-group-pa-design-chart \
//     --provider openrouter --model anthropic/claude-haiku-5.5 --runs 5
//
//   WORKERS_PROXY=http://localhost:8799 node --import ./scripts/register-ts.mjs \
//     scripts/grade-harness.mjs --part 3-9-1-... --provider workers-ai \
//     --model @cf/google/gemma-4-26b-a4b-it --runs 5
//
// PROVIDERS
//   openrouter   env OPENROUTER_API_KEY
//   workers-ai   WORKERS_PROXY (a `wrangler dev --remote` worker that forwards
//                {model, inputs} to env.AI.run), or CLOUDFLARE_API_TOKEN +
//                CLOUDFLARE_ACCOUNT_ID for the REST API. The harness never reads
//                wrangler's own credential store.
//
// SOURCES
//   --source fixtures (default)  the lesson's own reference answer(s) and starter
//   --source d1 --limit 40       recent real submissions for THIS part, names
//                                stripped, for a stability run with no labels
//   --source file --file f.json  texts from a JSON array of {response} or strings
//
// OPTIONS
//   --runs 5   --majority 1|3   --concurrency 3   --json out.json
//
// Exit code 1 when a reference fails, a starter passes, or no call succeeded.

import { execFileSync } from 'child_process';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildPrompt, parseModelJson, shapeResult } from '../lib/grade-written-core.ts';
import { isPassingGrade } from '../lib/grade-pass.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name, def) => {
  const i = process.argv.indexOf('--' + name);
  return i === -1 ? def : process.argv[i + 1];
};
const part = arg('part');
if (!part) {
  console.error('usage: grade-harness.mjs --part <lessonId> [--provider openrouter|workers-ai] [--model id] [--runs 5]');
  process.exit(2);
}
const provider = arg('provider', 'openrouter');
const runs = Number(arg('runs', 5));
// Majority-of-N: grade the same text N times (in parallel) and take the verdict
// that most runs chose for each criterion. Sampling noise is what makes the same
// plan get different cards on different submissions; a majority outvotes it.
const majority = Math.max(1, Number(arg('majority', 1)));
// Binary verdicts: no `partial`. Most of the measured instability lives in the
// met/partial/missing middle zone; this tests whether removing it steadies the grade.
const binary = process.argv.includes('--binary');
const concurrency = Number(arg('concurrency', 3));
const source = arg('source', 'fixtures');
const limit = Number(arg('limit', 40));
const jsonOut = arg('json');
const model = arg('model', provider === 'openrouter' ? 'anthropic/claude-haiku-5.5' : '@cf/google/gemma-4-26b-a4b-it');

// ---------------------------------------------------------------- grader config
const gradersTs = readFileSync(path.join(root, 'functions', '_shared', 'ai-graders.generated.ts'), 'utf8');
const GRADERS = JSON.parse(gradersTs.slice(gradersTs.indexOf('= {') + 2, gradersTs.lastIndexOf(';')));
const g = GRADERS[part];
if (!g) {
  console.error(`no server-side grader for ${part} (not an AI-graded part, or the generator has not run)`);
  process.exit(2);
}
const rubricIds = g.rubric.map((r) => r.id);
const totalPossible = g.rubric.reduce((s, r) => s + r.points, 0);

// ---------------------------------------------------------------- texts
const lf = (s) => String(s).replace(/\r\n?/g, '\n').trim();

function fixtureTexts() {
  const dir = path.join(root, 'lessons', part);
  const out = [];
  const solDir = path.join(dir, 'solution');
  const solFile = path.join(dir, 'solution.js');
  const firstFile = (d) => {
    const files = readdirSync(d).filter((f) => !f.startsWith('.')).sort();
    // Prefer the file that holds the answer itself over a notes file.
    return files.find((f) => /^(script\.js|answer\.md|README\.md)$/i.test(f)) ?? files[0];
  };
  if (existsSync(solFile)) out.push({ name: 'reference', text: lf(readFileSync(solFile, 'utf8')), want: true });
  else if (existsSync(solDir)) {
    out.push({ name: 'reference', text: lf(readFileSync(path.join(solDir, firstFile(solDir)), 'utf8')), want: true });
    const variants = path.join(solDir, 'variants');
    if (existsSync(variants)) {
      for (const v of readdirSync(variants).sort()) {
        const vd = path.join(variants, v);
        if (existsSync(vd)) out.push({ name: 'variant ' + v, text: lf(readFileSync(path.join(vd, firstFile(vd)), 'utf8')), want: true });
      }
    }
  }
  // The untouched starter must not pass. It is the file the student edits.
  for (const f of ['script.js', 'README.md', 'answer.md']) {
    const p = path.join(dir, f);
    if (existsSync(p)) { out.push({ name: 'starter', text: lf(readFileSync(p, 'utf8')), want: false }); break; }
  }
  return out;
}

function d1Texts() {
  const sql = `SELECT response FROM lesson_submissions WHERE lesson_id='${part.replace(/'/g, "''")}' ORDER BY submitted_at DESC LIMIT ${limit}`;
  const raw = execFileSync(process.execPath, [
    '--import', path.join(root, 'scripts', 'register-ts.mjs'),
    path.join(root, 'scripts', 'd1.mjs'), 'execute', 'shcode-commits', '--remote', '--json', '--command', sql,
  ], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const rows = JSON.parse(raw.slice(raw.indexOf('[')))[0].results ?? [];
  // Names are never selected. Identical texts are collapsed so a repeated
  // submission does not dominate the stability count.
  const seen = new Map();
  for (const r of rows) { const k = lf(r.response); if (k) seen.set(k, (seen.get(k) ?? 0) + 1); }
  return [...seen.entries()].map(([text, n], i) => ({ name: `d1 #${i + 1} (${n} submission${n > 1 ? 's' : ''})`, text, want: null }));
}

function fileTexts() {
  const p = arg('file');
  if (!p) { console.error('--source file needs --file <json>'); process.exit(2); }
  const rows = JSON.parse(readFileSync(p, 'utf8'));
  const seen = new Map();
  for (const r of rows) { const k = lf(typeof r === 'string' ? r : r.response); if (k) seen.set(k, (seen.get(k) ?? 0) + 1); }
  // Only texts submitted more than once: those measure repeatability, and they
  // are the same set the comparison runs used.
  return [...seen].filter(([, n]) => n > 1).map(([text, n], i) => ({ name: `real #${i + 1} (${n})`, text, want: null }));
}

const texts = source === 'd1' ? d1Texts() : source === 'file' ? fileTexts() : fixtureTexts();
if (texts.length === 0) { console.error('nothing to grade'); process.exit(2); }

// ---------------------------------------------------------------- transports
async function callOpenRouter(system, user) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('OPENROUTER_API_KEY is not set');
  return chat('https://openrouter.ai/api/v1/chat/completions', {
    Authorization: 'Bearer ' + key,
  }, { model, messages: [{ role: 'system', content: system }, { role: 'user', content: user }], temperature: 0.2, max_tokens: 4000, response_format: { type: 'json_object' } });
}

async function callWorkersAi(system, user) {
  const inputs = { messages: [{ role: 'system', content: system }, { role: 'user', content: user }], response_format: { type: 'json_object' }, temperature: 0.2, max_tokens: 4000, chat_template_kwargs: { enable_thinking: false } };
  const proxy = process.env.WORKERS_PROXY;
  if (proxy) {
    const res = await fetch(proxy, { method: 'POST', body: JSON.stringify({ model, inputs }) });
    if (!res.ok) throw new Error(`proxy HTTP ${res.status}: ${(await res.text()).slice(0, 160)}`);
    return res.json();
  }
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const account = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!token || !account) throw new Error('set WORKERS_PROXY, or CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID');
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${model}`, {
    method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(inputs),
  });
  if (!res.ok) throw new Error(`REST HTTP ${res.status}: ${(await res.text()).slice(0, 160)}`);
  const body = await res.json();
  return body.result ?? body;
}

async function chat(url, headers, body) {
  let res = await fetch(url, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  let text = await res.text();
  // Some providers reject response_format; the parser reads plain JSON anyway.
  if (!res.ok && /response_format|json_object/i.test(text)) {
    const { response_format: _drop, ...rest } = body;
    res = await fetch(url, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(rest) });
    text = await res.text();
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 160)}`);
  return JSON.parse(text);
}

function modelText(body) {
  if (typeof body === 'string') return body;
  return body?.response ?? body?.result?.response ?? body?.choices?.[0]?.message?.content ?? '';
}

const parseJson = parseModelJson;
const shape = shapeResult;

async function once(text) {
  const t0 = Date.now();
  let { system, user } = buildPrompt({ lessonId: part, lessonTitle: g.lessonTitle, prompt: g.prompt, response: text, rubric: g.rubric, strict: g.strict });
  if (binary) {
    system += `

BINARY VERDICTS — use only "met" or "missing" on every criterion. Do not use "partial" at all. If the work does only part of what a criterion describes, decide whether that part actually satisfies the criterion as written; if it does not, mark it "missing".`;
  }
  const body = provider === 'openrouter' ? await callOpenRouter(system, user) : await callWorkersAi(system, user);
  const parsed = parseJson(String(modelText(body)));
  if (!parsed) throw new Error('unparseable model output');
  const shaped = shape(parsed, g.rubric);
  if (binary) {
    for (const c of shaped.criteria) if (c.verdict === 'partial') c.verdict = 'missing';
  }
  return { ...shaped, ms: Date.now() - t0 };
}

const RANK = { met: 2, partial: 1, missing: 0 };
function majorityOf(results) {
  if (results.length === 1) return results[0];
  const criteria = g.rubric.map((r) => {
    const votes = results.map((x) => x.criteria.find((c) => c.id === r.id)?.verdict ?? 'missing');
    const count = {};
    for (const v of votes) count[v] = (count[v] || 0) + 1;
    // Ties (even sample counts) go to the stricter verdict.
    const winner = Object.entries(count).sort((a, b) => b[1] - a[1] || RANK[a[0]] - RANK[b[0]])[0][0];
    const picked = results.find((x) => x.criteria.find((c) => c.id === r.id)?.verdict === winner) ?? results[0];
    return { ...picked.criteria.find((c) => c.id === r.id), verdict: winner };
  });
  const key = (xs) => xs.criteria.map((c) => c.verdict).join(',');
  const chosen = results.find((x) => key(x) === key({ criteria })) ?? results[0];
  const possible = results[0].totalPossible;
  const earned = possible === 0 ? 0 : criteria.reduce((s, c) => s + (Number(c.earned) || 0), 0);
  return { ...chosen, criteria, totalEarned: earned, totalPossible: possible };
}

async function grade(text) {
  if (majority === 1) return once(text);
  const t0 = Date.now();
  const rs = await Promise.all(Array.from({ length: majority }, () => once(text).catch((e) => ({ err: String(e.message) }))));
  const good = rs.filter((r) => !r.err);
  if (good.length === 0) throw new Error(rs[0].err || 'all samples failed');
  return { ...majorityOf(good), ms: Date.now() - t0 };
}

async function pool(items, limitN, fn) {
  const out = new Array(items.length); let next = 0;
  await Promise.all(Array.from({ length: limitN }, async () => {
    while (next < items.length) { const i = next++; out[i] = await fn(items[i]); }
  }));
  return out;
}

// ---------------------------------------------------------------- run
const pass = (r) => isPassingGrade(r);
const code = (v) => (v === 'met' ? 'M' : v === 'partial' ? 'p' : 'X');
console.log(`part ${part} · ${g.rubric.length} criteria · ${totalPossible} pts`);
console.log(`provider ${provider} · model ${model} · runs ${runs} · majority ${majority}${binary ? ' · binary' : ''} · source ${source}`);

const jobs = texts.flatMap((t, ti) => Array.from({ length: runs }, (_, ri) => ({ t, ti, ri })));
const results = await pool(jobs, concurrency, async (j) => {
  for (let a = 0; a < 3; a++) {
    try { return { ...j, r: await grade(j.t.text) }; }
    catch (e) { if (a === 2) return { ...j, err: String(e.message) }; await new Promise((r) => setTimeout(r, 1500)); }
  }
});

let failures = 0, errors = 0, ms = 0, ok = 0;
let flipTexts = 0, flipCells = 0, cells = 0, passFlips = 0;
const report = [];
for (let ti = 0; ti < texts.length; ti++) {
  const rs = results.filter((r) => r.ti === ti).sort((a, b) => a.ri - b.ri);
  const good = rs.filter((r) => r.r);
  errors += rs.length - good.length;
  good.forEach((r) => { ms += r.r.ms; ok++; });
  const vs = good.map((r) => r.r.criteria.map((c) => c.verdict));
  let flipped = false;
  rubricIds.forEach((_, ci) => {
    if (good.length > 1) cells++;
    if (new Set(vs.map((v) => v[ci])).size > 1) { flipCells++; flipped = true; }
  });
  const passes = good.map((r) => pass(r.r));
  if (new Set(passes).size > 1) passFlips++;
  if (flipped) flipTexts++;
  const verdict = passes.length === 0 ? 'ERR' : passes.some(Boolean) ? 'PASS' : 'fail';
  if (texts[ti].want === true && !passes.some(Boolean)) failures++;
  if (texts[ti].want === false && passes.some(Boolean)) failures++;
  console.log(`  ${texts[ti].name.padEnd(26)} ${rs.map((r) => r.err ? 'ERR' : r.r.criteria.map((c) => code(c.verdict)).join('') + (pass(r.r) ? 'P' : 'F')).join(' ')}  ${verdict}`);
  report.push({ name: texts[ti].name, want: texts[ti].want, runs: rs.map((r) => r.err ? { err: r.err } : { verdicts: r.r.criteria.map((c) => c.verdict), pass: pass(r.r), ms: r.r.ms }) });
}

console.log(`\nstability: ${flipTexts}/${texts.length} texts flipped a criterion, ${flipCells}/${cells} cells, ${passFlips} pass/fail flips`);
console.log(`latency: ${ok ? Math.round(ms / ok) : 0} ms mean · errors ${errors}/${jobs.length}`);
if (source === 'fixtures') {
  console.log(failures === 0 ? 'fixtures: every reference passed and every starter failed' : `fixtures: ${failures} WRONG`);
}
if (jsonOut) {
  writeFileSync(jsonOut, JSON.stringify({ part, provider, model, runs, source, totalPossible, report }, null, 2));
  console.log('wrote ' + jsonOut);
}
process.exit(failures === 0 && errors < jobs.length ? 0 : 1);
