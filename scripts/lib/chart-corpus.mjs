// Shared helpers for the chart-agreement tooling (export-chart-corpus.mjs,
// measure-chart-agreement.mjs and their test). Pure, offline, no network.
//
// PRIVACY RULE (applies to everything built on this file): a corpus of real student
// submissions stays in the scratch directory and is NEVER committed or written inside the
// repo. Only aggregate tables (counts, rates, verdicts) may be committed. Emails never reach
// disk: the exporter maps them to s1..sn in memory and writes only the mapped rows.

import { execFileSync } from 'child_process';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, realpathSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export const CHART_IDS = ['3-2-8-chart-parameter-trace', '3-2-18-chart-chained-calls', '3-3-11-chart-the-array-loop'];

/** Resolve a path through symlinks even when the leaf does not exist yet (walk up to a real parent). */
function realish(p) {
  let cur = path.resolve(p);
  const tail = [];
  while (!existsSync(cur)) {
    tail.unshift(path.basename(cur));
    const up = path.dirname(cur);
    if (up === cur) break;
    cur = up;
  }
  return path.join(realpathSync(cur), ...tail);
}

/** True when `p` is the repo root or anywhere under it. */
export function isInsideRepo(p) {
  const rel = path.relative(realish(repoRoot), realish(p));
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

// ---------------------------------------------------------------------------
// PII scrub

const EMAIL_TOKEN = /\S*@\S*/g;
const PHONE_LIKE = /[+(]?\d[\d\s().-]{5,}\d/g;

/** Redact anything containing '@' and any phone-looking digit run (>= 7 digits). */
export function scrubText(s) {
  if (typeof s !== 'string') return s;
  let t = s.replace(EMAIL_TOKEN, '[redacted]');
  t = t.replace(PHONE_LIKE, (m) => (m.replace(/\D/g, '').length >= 7 ? '[redacted]' : m));
  return t;
}

/** A DiagramDoc with every label scrubbed (nodes and edges). Returns a new object. */
export function scrubDoc(doc) {
  const d = JSON.parse(JSON.stringify(doc));
  for (const n of d.nodes ?? []) if ('label' in n) n.label = scrubText(String(n.label ?? ''));
  for (const e of d.edges ?? []) if ('label' in e && e.label != null) e.label = scrubText(String(e.label));
  return d;
}

const trunc = (s, n = 60) => {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n - 1) + '…' : t;
};

/** Compact text of a chart for offline human adjudication. Labels are scrubbed and cut at 60. */
export function renderDiagram(doc) {
  const lines = [];
  for (const n of doc.nodes ?? []) lines.push(`${n.id} ${n.shape} "${trunc(scrubText(n.label))}"`);
  for (const e of doc.edges ?? []) lines.push(`${e.from} -> ${e.to}` + (e.label ? ` [${trunc(scrubText(e.label), 30)}]` : ''));
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Lesson config and the TypeScript scorer (compiled to a temp dir, like the other tests)

export function loadChart(id) {
  const cfg = JSON.parse(readFileSync(path.join(repoRoot, 'lessons', id, 'lesson.json'), 'utf8'));
  const g = cfg.diagram.aiGrader;
  const ruleItems = g.rubric.filter((r) => r.check);
  return { id, rubric: g.rubric, ruleItems, heavyIds: ruleItems.map((r) => r.id), gate: g.gate };
}

export async function compileScorer() {
  const out = mkdtempSync(path.join(tmpdir(), 'shcode-chartagree-'));
  execFileSync(process.execPath, [
    path.join(repoRoot, 'node_modules', 'typescript', 'bin', 'tsc'),
    'lib/diagram-types.ts', 'lib/diagram-mermaid.ts', 'lib/diagram-check.ts', 'lib/diagram-score.ts',
    '--outDir', out, '--module', 'commonjs', '--target', 'es2022', '--skipLibCheck',
  ], { cwd: repoRoot, stdio: 'inherit' });
  writeFileSync(path.join(out, 'package.json'), '{"type":"commonjs"}');
  const url = (f) => 'file://' + path.join(out, f).replace(/\\/g, '/');
  const { fromMermaid } = await import(url('diagram-mermaid.js'));
  const { scoreDiagram } = await import(url('diagram-score.js'));
  return { fromMermaid, scoreDiagram, cleanup: () => rmSync(out, { recursive: true, force: true }) };
}
