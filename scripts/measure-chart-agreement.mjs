// Do the deterministic chart rules agree with a judge? Run BEFORE the three "Chart the Code" lessons
// (3-2-8-chart-parameter-trace, 3-2-18-chart-chained-calls, 3-3-11-chart-the-array-loop) are flipped
// to count toward the grade.
//
//   node scripts/measure-chart-agreement.mjs <corpus.json> [--pool] [--json] [--human adjudications.json]
//
// <corpus.json>: an array of rows {lessonId, student, response, grade_json, submitted_at} (response =
// the DiagramDoc JSON string; grade_json = string or null; optional kind:'draft'|'submission' and
// human:{criterionId:'met'|'partial'|'missing'}). Produce it with scripts/export-chart-corpus.mjs.
// --human adjudications.json: {"<row index>": {"call-shape": "met", ...}} from an offline read of the
// compact renderings this report prints; a human verdict beats the recorded AI verdict.
//
// PRIVACY: the corpus stays in the scratch directory and is never committed (this script refuses a
// corpus path inside the repo). Only the aggregate tables this prints may be committed.
//
// WHAT IS MEASURED. For each chart, the two heavy criteria are the rubric items with a `check`
// (rules-scored; 7 of 20 points each). The JUDGE is, per criterion: a human verdict if given, else the
// recorded AI verdict from a row that PREDATES the hybrid grader (a heavy criterion without
// source:'rules'). Rows graded by the hybrid grader (source 'rules') carry no independent judge; they
// count toward corpus size and the rules distribution but not toward agreement. Analysis uses each
// student's FINAL submission per chart (latest submitted_at); drafts are ignored.
//   honest chart = every judged heavy criterion met; wrong chart = some judged heavy criterion not met.
//   false negative (FN) = judge met, rules not met ('partial' counts as not met).
//   false positive (FP) = judge not met, rules met.

import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CHART_IDS, loadChart, renderDiagram, scrubText, isInsideRepo, compileScorer } from './lib/chart-corpus.mjs';

// ---- thresholds (the plan's values) --------------------------------------
export const MAX_HONEST_MARKED_WRONG = 0.02; // > 2% of honest charts marked wrong by the rules => BLOCK
export const MAX_WRONG_CREDITED = 0.05; //      > 5% of wrong charts credited by the rules => BLOCK
export const FN_PATTERN_MIN_STUDENTS = 3; //    same rule id failing the same way on >= 3 distinct students => BLOCK
export const MIN_CORPUS_PER_CHART = 20; //      distinct final submissions needed per chart

const VERDICTS = ['met', 'partial', 'missing'];

const normVerdict = (c) => {
  if (!c) return null;
  if (VERDICTS.includes(c.verdict)) return c.verdict;
  if (typeof c.earned === 'number' && typeof c.max === 'number' && c.max > 0) return c.earned >= c.max ? 'met' : c.earned > 0 ? 'partial' : 'missing';
  return null;
};
// quoted text in a rule's feedback is the student's label; drop it so the same failure groups together
const signature = (fb) => String(fb ?? '').replace(/"[^"]*"|'[^']*'|“[^”]*”/g, '""').replace(/\s+/g, ' ').trim().slice(0, 160);

function parseGrade(g) {
  if (g == null) return null;
  try { return typeof g === 'string' ? JSON.parse(g) : g; } catch { return null; }
}

export function analyse(rows, { scorer, pool = false, human = {}, minCorpus = MIN_CORPUS_PER_CHART, syntheticRows = [] }) {
  const charts = {};
  for (const id of CHART_IDS) charts[id] = { chart: loadChart(id), finals: [], unparseable: 0, drafts: 0, ignoredOther: 0 };

  const tagged = rows.map((r, i) => ({ ...r, __i: i }));
  const all = [...tagged, ...syntheticRows.map((r, j) => ({ ...r, __i: `syn${j}` }))];
  const latest = new Map();
  for (const r of all) {
    const c = charts[r.lessonId];
    if (!c) { continue; }
    if (r.kind === 'draft') { c.drafts++; continue; }
    const key = r.lessonId + '|' + (r.synthetic ? 'synthetic:' : '') + r.student;
    const prev = latest.get(key);
    if (!prev || (r.submitted_at ?? 0) >= (prev.submitted_at ?? 0)) latest.set(key, r);
  }

  const patternMap = new Map();
  for (const r of latest.values()) {
    const c = charts[r.lessonId];
    let doc;
    try {
      doc = JSON.parse(r.response);
      if (!doc || !Array.isArray(doc.nodes) || !Array.isArray(doc.edges)) throw new Error('shape');
    } catch { c.unparseable++; continue; }
    let sc;
    try { sc = scorer.scoreDiagram(doc, c.chart.ruleItems, c.chart.gate); } catch { c.unparseable++; continue; }
    const rules = Object.fromEntries(sc.criteria.map((x) => [x.id, { verdict: x.verdict, feedback: x.feedback }]));
    const grade = parseGrade(r.grade_json);
    const gcrit = Array.isArray(grade?.criteria) ? grade.criteria : [];
    const hum = { ...(r.human ?? {}), ...(human[String(r.__i)] ?? {}) };
    const judge = {};
    const storedRules = {};
    for (const h of c.chart.heavyIds) {
      if (VERDICTS.includes(hum[h])) { judge[h] = { verdict: hum[h], by: 'human' }; continue; }
      const rec = gcrit.find((x) => x.id === h && x.source !== 'rules');
      const v = normVerdict(rec);
      if (v) judge[h] = { verdict: v, by: 'old-ai' };
      const sr = gcrit.find((x) => x.id === h && x.source === 'rules');
      if (sr) storedRules[h] = normVerdict(sr);
    }
    c.finals.push({ r, doc, rules, judge, storedRules, synthetic: !!r.synthetic });
  }

  const report = { charts: {}, patterns: [], blockReasons: [], insufficient: [], pooled: pool };
  const statFor = (finals, heavyIdsByLesson) => {
    const crit = {};
    let honest = 0, wrong = 0, fn = 0, fp = 0, unjudged = 0;
    const disagreements = [], fnCands = [], fpCands = [];
    for (const f of finals) {
      const ids = heavyIdsByLesson[f.r.lessonId];
      const judged = ids.filter((h) => f.judge[h]);
      const rulesAllMet = ids.every((h) => f.rules[h].verdict === 'met');
      for (const h of ids) {
        const key = f.r.lessonId + '/' + h;
        const k = (crit[key] ??= { lesson: f.r.lessonId, id: h, n: 0, nJudged: 0, rules: { met: 0, partial: 0, missing: 0 }, judge: { met: 0, partial: 0, missing: 0 }, confusion: Object.fromEntries(VERDICTS.map((j) => [j, { met: 0, partial: 0, missing: 0 }])), recordedRulesDrift: 0 });
        k.n++;
        k.rules[f.rules[h].verdict]++;
        if (f.storedRules[h] && f.storedRules[h] !== f.rules[h].verdict) k.recordedRulesDrift++;
        const j = f.judge[h];
        if (!j) continue;
        k.nJudged++;
        k.judge[j.verdict]++;
        k.confusion[j.verdict][f.rules[h].verdict]++;
        const jm = j.verdict === 'met', rm = f.rules[h].verdict === 'met';
        if (jm !== rm) {
          const item = {
            row: f.r.__i, student: f.r.student, lesson: f.r.lessonId, criterion: h, rules: f.rules[h].verdict, judge: j.verdict, judgeBy: j.by,
            kind: jm ? 'false-negative' : 'false-positive',
            reason: `rules ${f.rules[h].verdict}${f.rules[h].feedback ? ' (' + scrubText(f.rules[h].feedback).slice(0, 160) + ')' : ''}; ${j.by} ${j.verdict}`,
            diagram: renderDiagram(f.doc),
            synthetic: f.synthetic,
          };
          disagreements.push(item);
          (jm ? fnCands : fpCands).push(item);
          if (jm) {
            const pk = [f.r.lessonId, h, f.rules[h].verdict, signature(f.rules[h].feedback)].join('|');
            const p = patternMap.get(pk) ?? { lesson: f.r.lessonId, criterion: h, rulesVerdict: f.rules[h].verdict, signature: signature(f.rules[h].feedback), students: new Set(), rows: [] };
            p.students.add(f.r.student); p.rows.push(f.r.__i);
            patternMap.set(pk, p);
          }
        }
      }
      if (judged.length === 0) { unjudged++; continue; }
      const allJudgedMet = judged.every((h) => f.judge[h].verdict === 'met');
      if (allJudgedMet && judged.length === ids.length) { honest++; if (!rulesAllMet) fn++; }
      else if (!allJudgedMet) { wrong++; if (rulesAllMet) fp++; }
    }
    return { n: finals.length, unjudged, honest, wrong, fn, fp, fnRate: honest ? fn / honest : null, fpRate: wrong ? fp / wrong : null, criteria: Object.values(crit), disagreements, fnCandidates: fnCands, fpCandidates: fpCands };
  };

  const heavy = Object.fromEntries(CHART_IDS.map((id) => [id, charts[id].chart.heavyIds]));
  for (const id of CHART_IDS) {
    const c = charts[id];
    const realN = c.finals.filter((f) => !f.synthetic).length;
    report.charts[id] = { ...statFor(c.finals, heavy), realN, syntheticN: c.finals.length - realN, unparseable: c.unparseable, draftsIgnored: c.drafts };
  }
  const allFinals = CHART_IDS.flatMap((id) => charts[id].finals);
  report.pool = statFor(allFinals, heavy);
  report.pool.realN = allFinals.filter((f) => !f.synthetic).length;
  report.pool.syntheticN = allFinals.length - report.pool.realN;

  report.patterns = [...patternMap.values()].map((p) => ({ lesson: p.lesson, criterion: p.criterion, rulesVerdict: p.rulesVerdict, signature: p.signature, students: p.students.size, rows: p.rows, blocks: p.students.size >= FN_PATTERN_MIN_STUDENTS })).sort((a, b) => b.students - a.students);
  for (const p of report.patterns) if (p.blocks) report.blockReasons.push(`repeatable false-negative pattern: ${p.lesson}/${p.criterion} fails (${p.rulesVerdict}) the same way on ${p.students} distinct students: "${p.signature}"`);

  const units = pool ? [['POOL', report.pool]] : CHART_IDS.map((id) => [id, report.charts[id]]);
  for (const [name, u] of units) {
    if (u.realN < minCorpus) report.insufficient.push(`${name}: ${u.realN} distinct final submissions < ${minCorpus}`);
    else if (!u.honest || !u.wrong) report.insufficient.push(`${name}: judged honest=${u.honest}, wrong=${u.wrong}; both need at least one (rows from the hybrid grader carry no independent judge; adjudicate offline and pass --human)`);
    if (u.fnRate !== null && u.fnRate > MAX_HONEST_MARKED_WRONG) report.blockReasons.push(`${name}: ${u.fn}/${u.honest} honest charts marked wrong by the rules (${(u.fnRate * 100).toFixed(1)}% > ${MAX_HONEST_MARKED_WRONG * 100}%)`);
    if (u.fpRate !== null && u.fpRate > MAX_WRONG_CREDITED) report.blockReasons.push(`${name}: ${u.fp}/${u.wrong} wrong charts credited by the rules (${(u.fpRate * 100).toFixed(1)}% > ${MAX_WRONG_CREDITED * 100}%)`);
  }
  report.verdict = report.blockReasons.length ? 'BLOCK' : report.insufficient.length ? 'INSUFFICIENT' : 'PASS';
  return report;
}

function printReport(rep, usedSynthetic) {
  const L = [];
  const pct = (x) => (x === null ? 'n/a' : (x * 100).toFixed(1) + '%');
  L.push('CHART RULES vs JUDGE AGREEMENT');
  L.push(`thresholds: honest-marked-wrong > ${MAX_HONEST_MARKED_WRONG * 100}% blocks; wrong-credited > ${MAX_WRONG_CREDITED * 100}% blocks; same rule failing the same way on >= ${FN_PATTERN_MIN_STUDENTS} students blocks; min ${MIN_CORPUS_PER_CHART} final submissions per chart`);
  if (usedSynthetic) L.push('NOTE: --pool was used; synthetic variants from scripts/test-diagram-chart-lessons.mjs fixtures are mixed in (marked "synthetic"). Pooled evidence is weaker than per-chart evidence.');
  const sections = [...CHART_IDS.map((id) => [id, rep.charts[id]]), ['POOL (all three charts)', rep.pool]];
  for (const [name, c] of sections) {
    L.push('', '=== ' + name + ' ===');
    L.push(`final submissions: ${c.n} (real ${c.realN}${c.syntheticN ? ', synthetic ' + c.syntheticN : ''}${c.unparseable !== undefined ? ', unparseable ' + c.unparseable + ', drafts ignored ' + c.draftsIgnored : ''}); no judge verdict: ${c.unjudged}`);
    L.push(`honest (judge met): ${c.honest}  marked wrong by rules: ${c.fn}  (${pct(c.fnRate)})`);
    L.push(`wrong  (judge not met): ${c.wrong}  credited by rules: ${c.fp}  (${pct(c.fpRate)})`);
    for (const k of c.criteria) {
      if (name.startsWith('POOL')) break;
      L.push(`  criterion ${k.id}: n=${k.n}, judged=${k.nJudged}; rules met/partial/missing = ${k.rules.met}/${k.rules.partial}/${k.rules.missing}; judge = ${k.judge.met}/${k.judge.partial}/${k.judge.missing}` + (k.recordedRulesDrift ? `; recorded rules verdict differs from today's rules on ${k.recordedRulesDrift}` : ''));
      L.push('    confusion (rows = judge, cols = rules):      met  partial  missing');
      for (const j of VERDICTS) L.push(`      judge ${j.padEnd(8)} ${String(k.confusion[j].met).padStart(14)} ${String(k.confusion[j].partial).padStart(7)} ${String(k.confusion[j].missing).padStart(8)}`);
    }
    if (!name.startsWith('POOL')) {
      const show = (title, list) => {
        L.push(`  ${title}: ${list.length}`);
        for (const d of list) {
          L.push(`    - row ${d.row} student ${d.student} ${d.criterion}: ${d.reason}${d.synthetic ? ' [synthetic]' : ''}`);
          for (const ln of d.diagram.split('\n')) L.push('        ' + ln);
        }
      };
      show('DISAGREEMENTS', c.disagreements);
      L.push(`  false-negative candidates (rules fail, judge met): ${c.fnCandidates.map((d) => `row ${d.row}/${d.criterion}`).join(', ') || 'none'}`);
      L.push(`  false-positive candidates (rules credit, judge not met): ${c.fpCandidates.map((d) => `row ${d.row}/${d.criterion}`).join(', ') || 'none'}`);
    }
  }
  L.push('', 'FALSE-NEGATIVE PATTERNS (same rule id, same way, distinct students):');
  if (!rep.patterns.length) L.push('  none');
  for (const p of rep.patterns) L.push(`  ${p.blocks ? 'BLOCKS' : 'ok    '} ${p.lesson}/${p.criterion} ${p.rulesVerdict} on ${p.students} student(s): "${p.signature}"`);
  L.push('');
  for (const r of rep.blockReasons) L.push('BLOCK reason: ' + r);
  for (const r of rep.insufficient) L.push('INSUFFICIENT: ' + r);
  L.push('', 'VERDICT: ' + rep.verdict);
  return L.join('\n');
}

async function main() {
  const args = process.argv.slice(2);
  const flag = (f) => args.includes(f);
  const valueOf = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : undefined; };
  const humanPath = valueOf('--human');
  const file = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--human');
  if (!file) { console.error('usage: node scripts/measure-chart-agreement.mjs <corpus.json> [--pool] [--json] [--human adjudications.json]'); process.exit(64); }
  if (isInsideRepo(file)) { console.error('Refusing: the corpus must stay outside the repo (privacy rule). Move it to the scratch directory.'); process.exit(64); }
  const rows = JSON.parse(readFileSync(path.resolve(file), 'utf8'));
  if (!Array.isArray(rows)) { console.error('corpus must be a JSON array of rows'); process.exit(64); }
  const human = humanPath ? JSON.parse(readFileSync(path.resolve(humanPath), 'utf8')) : {};
  const scorer = await compileScorer();
  try {
    const pool = flag('--pool');
    let synthetic = [];
    if (pool) {
      const { syntheticRows } = await import('./lib/chart-synthetic.mjs');
      synthetic = syntheticRows({ fromMermaid: scorer.fromMermaid });
    }
    const rep = analyse(rows, { scorer, pool, human, syntheticRows: synthetic });
    if (flag('--json')) console.log(JSON.stringify(rep));
    else console.log(printReport(rep, pool));
    process.exit(rep.verdict === 'PASS' ? 0 : rep.verdict === 'BLOCK' ? 1 : 2);
  } finally { scorer.cleanup(); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
