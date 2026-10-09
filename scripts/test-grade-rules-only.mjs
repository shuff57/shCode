// POST /api/grade-written for a chart whose rubric is scored entirely by rules (the nine
// 3.4-3.8 "Chart the Code" lessons): the REAL Pages Function, the REAL generated grader config, and
// an Ollama address nothing listens on, so a model call would fail the test. It proves the
// server marks the chart from its drawing alone and the relevance gate still applies.
//   - the reference chart earns 20/20, graderModel 'rules'
//   - the same chart with every label "step N" is capped at 13/20 (below the 16 pass line)
//   - a submission without the drawing is refused (400), nothing is graded from the text
import { execFileSync } from 'child_process';
import { mkdtempSync, mkdirSync, rmSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
const ok = (c, m) => { if (c) console.log('  PASS ' + m); else { failures++; console.log('  FAIL ' + m); } };

mkdirSync(path.join(root, 'node_modules', '.pkg-load-cache'), { recursive: true });
const out = mkdtempSync(path.join(root, 'node_modules', '.pkg-load-cache', 'shcode-rulesonly-'));
const ID = '3-7-5-chart-map-trace';
try {
  execFileSync(process.execPath, [
    path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'), 'functions/api/grade-written.ts',
    '--outDir', out, '--module', 'commonjs', '--target', 'es2022', '--skipLibCheck', '--esModuleInterop',
    '--moduleResolution', 'node', '--types', '@cloudflare/workers-types', '--noCheck',
  ], { cwd: root, stdio: 'pipe' });
  writeJson(path.join(out, 'package.json'), { type: 'commonjs' });
  const { onRequestPost } = await import('file://' + path.join(out, 'functions', 'api', 'grade-written.js').split(path.sep).join('/'));
  const { fromMermaid } = await import('file://' + path.join(out, 'lib', 'diagram-mermaid.js').split(path.sep).join('/'));
  const ref = fromMermaid(readFileSync(path.join(root, 'lessons', ID, 'solution', 'chart.mmd'), 'utf8'));
  const junk = { ...ref, nodes: ref.nodes.map((n, i) => (n.shape === 'terminal' ? n : { ...n, label: `step ${i}` })) };

  const env = {
    OLLAMA_API_KEY: 'unused', OLLAMA_HOST: 'http://127.0.0.1:9', GRADE_WRITTEN_DAILY_LIMIT: '30',
    ASSETS: { fetch: async (req) => {
      const p = new URL(typeof req === 'string' ? req : req.url).pathname;
      return new Response(p.includes('lessons-manifest') ? JSON.stringify({ lessons: [{ id: ID, title: '3.7.5 Chart' }] }) : '{}', { headers: { 'Content-Type': 'application/json' } });
    } },
    DB: { prepare() { const s = { bind: () => s, first: async () => ({ count: 0 }), run: async () => ({}), all: async () => ({ results: [] }) }; return s; } },
  };
  const call = (artifact) => onRequestPost({
    request: new Request('https://example.test/api/grade-written', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lessonId: ID, response: 'A chart drawn for this lesson, graded from its shapes and arrows.', ...(artifact ? { artifact: { doc: artifact } } : {}) }) }),
    env, data: { email: 'kid@example.test', role: 'student' }, params: {}, waitUntil: () => {}, next: async () => new Response(''), functionPath: '/api/grade-written', providedRoles: [],
  });

  let res = await call(ref); let body = await res.json();
  ok(res.status === 200 && body.ok, `reference chart is graded (HTTP ${res.status})`);
  ok(body.totalEarned === 20 && body.totalPossible === 20, `reference earns 20/20 (${body.totalEarned}/${body.totalPossible})`);
  ok(body.graderModel === 'rules', `no model was used (graderModel ${body.graderModel})`);
  res = await call(junk); body = await res.json();
  ok(res.status === 200 && body.totalEarned <= 13, `nonsense labels are capped at 13 (${body.totalEarned}/${body.totalPossible})`);
  res = await call(null);
  ok(res.status === 400, `a submission without the drawing is refused (HTTP ${res.status})`);
} finally {
  rmSync(out, { recursive: true, force: true });
}
function writeJson(p, v) { execFileSync(process.execPath, ['-e', `require('fs').writeFileSync(process.argv[1], process.argv[2])`, p, JSON.stringify(v)]); }
if (failures) { console.log(`rules-only grading: ${failures} failed`); process.exit(1); }
console.log('rules-only grading: all checks passed');
