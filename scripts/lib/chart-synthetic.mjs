// Synthetic export rows built from the repo's own fixtures (scripts/chart-fixtures.mjs). No student
// data. Honest = reference + legitimate variants; wrong = gaming fixtures and one mutation.
// Each row carries a pre-hybrid style grade_json whose heavy criteria are the "old AI verdict",
// derived from ground truth: gaming fixtures list the rule points they should earn (0, 3.5, 7),
// which maps onto the two heavy criteria in rubric order (7 = first met, second missing).

import { CHART_IDS, loadChart } from './chart-corpus.mjs';
import { refText, setCurrent, VARIANTS, GAMES, JUNK, MIN, SANDWICH, INJECT, STUFFED } from '../chart-fixtures.mjs';

const verdictOf = (earned, max) => (earned >= max ? 'met' : earned > 0 ? 'partial' : 'missing');

function oldAiGrade(chart, verdicts) {
  // verdicts: {criterionId: 'met'|'partial'|'missing'} for heavy ids; wording items are 'met' filler.
  const criteria = chart.rubric.map((r) => {
    const v = verdicts[r.id] ?? 'met';
    const earned = v === 'met' ? r.points : v === 'partial' ? r.points / 2 : 0;
    return { id: r.id, title: r.title, earned, max: r.points, verdict: v, feedback: '' };
  }); // no `source`: a pre-hybrid row
  return JSON.stringify({ ok: true, criteria });
}

function truthFromExpected(chart, expected) {
  const [a, b] = chart.heavyIds;
  if (expected >= 14) return { [a]: 'met', [b]: 'met' };
  if (expected >= 7) return { [a]: 'met', [b]: 'missing' };
  if (expected > 0) return { [a]: 'partial', [b]: 'missing' };
  return { [a]: 'missing', [b]: 'missing' };
}

/** Rows: [{lessonId, student, response, grade_json, submitted_at, synthetic:true, truth:'honest'|'wrong', name}] */
export function syntheticRows({ fromMermaid, studentPrefix = 'syn', t0 = 1_700_000_000_000 }) {
  const rows = [];
  let k = 0;
  const add = (chart, name, mmd, verdicts, truth) => {
    k += 1;
    rows.push({
      lessonId: chart.id,
      student: `${studentPrefix}${k}`,
      response: JSON.stringify(fromMermaid(mmd)),
      grade_json: oldAiGrade(chart, verdicts),
      submitted_at: t0 + k * 1000,
      synthetic: true,
      truth,
      name,
    });
  };
  for (const id of CHART_IDS) {
    const chart = loadChart(id);
    setCurrent(id);
    const ref = refText(id);
    const met = Object.fromEntries(chart.heavyIds.map((h) => [h, 'met']));
    add(chart, 'reference', ref, met, 'honest');
    for (const [name, mmd] of VARIANTS[id]()) add(chart, 'variant: ' + name, mmd, met, 'honest');
    const games = [['generic junk', JUNK, 0], ['Start -> End', MIN, 0], ['sandwich', SANDWICH, 0], ['injected label', INJECT, 0], ['label stuffing', STUFFED, 0], ...GAMES[id](ref)];
    for (const [name, mmd, expected] of games) add(chart, 'game: ' + name, mmd, truthFromExpected(chart, expected), 'wrong');
    // one mutation with an unambiguous per-criterion truth: the required shape turned into a rectangle
    // (verdict recorded for the FIRST heavy criterion only; the second is left to the rules alone)
    const doc = fromMermaid(ref);
    const key = chart.ruleItems[0].check.steps[0].match.kind;
    for (const n of doc.nodes) if (n.shape === key) n.shape = 'process';
    k += 1;
    rows.push({
      lessonId: id, student: `${studentPrefix}${k}`, response: JSON.stringify(doc),
      grade_json: JSON.stringify({ ok: true, criteria: [{ id: chart.heavyIds[0], earned: 0, max: chart.ruleItems[0].points, verdict: 'missing' }] }),
      submitted_at: t0 + k * 1000, synthetic: true, truth: 'wrong', name: `mutation: ${key} -> process`,
    });
  }
  return rows;
}
