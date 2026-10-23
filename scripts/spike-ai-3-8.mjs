// SPIKE: real model, every 3.8 lab's aiCheck. Positive = the lab's own solution.js (all should be met);
// mutant = the solution with its JSON.parse/getItem line(s) removed (the cards about it should flip).
import { execFileSync } from 'child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
if (!process.env.OLLAMA_API_KEY) { console.log('no key'); process.exit(1); }
const ids = ['3-8-7-lab-stringify-spot-drops','3-8-10-lab-round-trip-object','3-8-11-lab-round-trip-array','3-8-14-lab-malformed-json','3-8-18-lab-save-by-key','3-8-19-lab-load-restore','3-8-22-lab-capstone','3-8-23-lab-adapt-to-list'];
mkdirSync(path.join(root, 'node_modules', '.pkg-load-cache'), { recursive: true });
const out = mkdtempSync(path.join(root, 'node_modules', '.pkg-load-cache', 'shcode-spike38-'));
const graders = {}, sols = {};
for (const id of ids) {
  const l = JSON.parse(readFileSync(path.join(root, 'lessons', id, 'lesson.json'), 'utf8'));
  graders[id] = { lessonTitle: l.title, prompt: l.aiCheck.prompt, rubric: l.aiCheck.rubric, contextDocs: [] };
  sols[id] = readFileSync(path.join(root, 'lessons', id, 'solution.js'), 'utf8');
}
const mutate = (s) => s.split('\n').filter((ln) => !/JSON\.parse|getItem/.test(ln)).join('\n');
try {
  execFileSync(process.execPath, [path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'), 'functions/api/grade-written.ts', '--outDir', out, '--module', 'commonjs', '--target', 'es2022', '--skipLibCheck', '--esModuleInterop', '--moduleResolution', 'node', '--types', '@cloudflare/workers-types', '--noCheck'], { cwd: root, stdio: 'pipe' });
  writeFileSync(path.join(out, 'package.json'), '{"type":"commonjs"}');
  writeFileSync(path.join(out, 'functions', '_shared', 'ai-graders.generated.js'), 'Object.defineProperty(exports, "__esModule", { value: true });\nexports.AI_GRADERS = ' + JSON.stringify(graders) + ';\n');
  const { onRequestPost } = await import('file://' + path.join(out, 'functions', 'api', 'grade-written.js').split(path.sep).join('/'));
  const env = { OLLAMA_API_KEY: process.env.OLLAMA_API_KEY, GRADE_WRITTEN_DAILY_LIMIT: '1000',
    ASSETS: { fetch: async () => new Response(JSON.stringify({ lessons: ids.map((i) => ({ id: i, title: i })) }), { headers: { 'Content-Type': 'application/json' } }) },
    DB: { prepare() { const s = { bind: () => s, first: async () => ({ count: 0 }), run: async () => ({}), all: async () => ({ results: [] }) }; return s; } } };
  const grade = async (id, code) => {
    const res = await onRequestPost({ request: new Request('https://x.test/api/grade-written', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lessonId: id, response: code }) }), env, data: { email: 'kid@example.test', role: 'student' }, params: {}, waitUntil() {}, next: async () => new Response(''), functionPath: '/api/grade-written', providedRoles: [] });
    return res.json();
  };
  let pos = 0, posTotal = 0;
  for (const id of ids) {
    const a = await grade(id, sols[id]);
    const m = await grade(id, mutate(sols[id]));
    const row = (b) => b.criteria ? b.criteria.map((c) => `${c.id}:${c.verdict[0]}`).join(' ') : 'ERR ' + JSON.stringify(b).slice(0, 120);
    console.log(`\n${id}\n  solution: ${row(a)}\n  no parse/getItem: ${row(m)}`);
    if (a.criteria) { posTotal += a.criteria.length; pos += a.criteria.filter((c) => c.verdict === 'met').length; }
    if (m.criteria) for (const c of m.criteria.filter((c) => c.verdict !== 'met').slice(0, 2)) console.log(`    ${c.id} note: ${c.feedback}`);
  }
  console.log(`\nsolutions all met: ${pos}/${posTotal}`);
} finally { rmSync(out, { recursive: true, force: true }); }
