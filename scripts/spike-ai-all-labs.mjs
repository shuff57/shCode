// SPIKE: real model over every lab that has aiCheck. Positive = the lab's reference solution (all criteria
// should be met). Mutant = the solution with every third code line removed (should lose at least one).
// Usage: node scripts/spike-ai-all-labs.mjs <ids.json> <out.json>   (ids.json: ["lesson-id", ...])
import { execFileSync } from 'child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, existsSync, readdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
if (!process.env.OLLAMA_API_KEY) { console.log('no key'); process.exit(1); }
const ids = JSON.parse(readFileSync(process.argv[2], 'utf8'));
mkdirSync(path.join(root, 'node_modules', '.pkg-load-cache'), { recursive: true });
const out = mkdtempSync(path.join(root, 'node_modules', '.pkg-load-cache', 'shcode-spikeall-'));
const graders = {}, sols = {};
for (const id of ids) {
  const l = JSON.parse(readFileSync(path.join(root, 'lessons', id, 'lesson.json'), 'utf8'));
  graders[id] = { lessonTitle: l.title, prompt: l.aiCheck.prompt, rubric: l.aiCheck.rubric, contextDocs: [] };
  const f = l.aiCheck.file || 'README.md';
  const dir = path.join(root, 'lessons', id, 'solution');
  sols[id] = existsSync(dir) ? readFileSync(path.join(dir, f), 'utf8') : readFileSync(path.join(root, 'lessons', id, 'solution.js'), 'utf8');
}
const mutate = (s) => { let n = 0; return s.split('\n').filter((ln) => { if (!ln.trim() || /^\s*(\/\/|#|\*)/.test(ln)) return true; return ++n % 3 !== 0; }).join('\n'); };
const results = [];
try {
  execFileSync(process.execPath, [path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'), 'functions/api/grade-written.ts', '--outDir', out, '--module', 'commonjs', '--target', 'es2022', '--skipLibCheck', '--esModuleInterop', '--moduleResolution', 'node', '--types', '@cloudflare/workers-types', '--noCheck'], { cwd: root, stdio: 'pipe' });
  writeFileSync(path.join(out, 'package.json'), '{"type":"commonjs"}');
  writeFileSync(path.join(out, 'functions', '_shared', 'ai-graders.generated.js'), 'Object.defineProperty(exports, "__esModule", { value: true });\nexports.AI_GRADERS = ' + JSON.stringify(graders) + ';\n');
  const { onRequestPost } = await import('file://' + path.join(out, 'functions', 'api', 'grade-written.js').split(path.sep).join('/'));
  const env = { OLLAMA_API_KEY: process.env.OLLAMA_API_KEY, GRADE_WRITTEN_DAILY_LIMIT: '100000', GRADE_WRITTEN_GLOBAL_DAILY_LIMIT: '100000',
    ASSETS: { fetch: async () => new Response(JSON.stringify({ lessons: ids.map((i) => ({ id: i, title: i })) }), { headers: { 'Content-Type': 'application/json' } }) },
    DB: { prepare() { const s = { bind: () => s, first: async () => ({ count: 0 }), run: async () => ({}), all: async () => ({ results: [] }) }; return s; } } };
  const grade = async (id, code) => {
    for (let a = 0; a < 3; a++) {
      const res = await onRequestPost({ request: new Request('https://x.test/api/grade-written', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lessonId: id, response: code }) }), env, data: { email: 'kid@example.test', role: 'student' }, params: {}, waitUntil() {}, next: async () => new Response(''), functionPath: '/api/grade-written', providedRoles: [] });
      const b = await res.json(); if (b.criteria) return b; await new Promise((r) => setTimeout(r, 2000));
    }
    return { error: 'failed' };
  };
  let next = 0;
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (next < ids.length) {
      const id = ids[next++];
      const a = await grade(id, sols[id]);
      const m = await grade(id, mutate(sols[id]));
      const r = { id, solution: a.criteria ? a.criteria.map((c) => `${c.id}:${c.verdict[0]}`).join(' ') : 'ERR',
        solutionAllMet: !!a.criteria && a.criteria.every((c) => c.verdict === 'met'),
        solutionMissed: a.criteria ? a.criteria.filter((c) => c.verdict !== 'met').map((c) => `${c.id}: ${c.feedback}`) : [],
        mutantLost: m.criteria ? m.criteria.filter((c) => c.verdict !== 'met').length : -1 };
      results.push(r); console.log(`${r.solutionAllMet ? 'ok  ' : 'MISS'} ${id}  mutant lost ${r.mutantLost}`);
    }
  }));
} finally { rmSync(out, { recursive: true, force: true }); }
writeFileSync(process.argv[3], JSON.stringify(results, null, 1));
console.log(`solutions all met: ${results.filter((r) => r.solutionAllMet).length}/${results.length}; mutants that lost >=1: ${results.filter((r) => r.mutantLost > 0).length}/${results.length}`);
