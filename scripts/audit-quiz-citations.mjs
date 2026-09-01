// Asks whether each quiz question cites the RIGHT lesson.
//
// `sourceIds` (pin-quiz-sources.mjs) and the drift check in
// check-lesson-numbers.mjs together guarantee one thing only: that the display
// number written in `source` still resolves to the lesson it resolved to when
// it was pinned. That catches renumber rot, which is the failure that shipped.
//
// It cannot catch the citation that was wrong on the day it was written, and
// pinning actively freezes those in place -- 86 of chapter 1's citations were
// pinned as-found, unread. This script is the other half.
//
// Method: score every lesson in the course against the question's own words,
// then report where the CITED lesson ranks. A question about `typeof` should
// rank the `typeof` reading near the top. When the cited lesson ranks 40th and
// something else ranks 1st, the citation is worth reading by hand.
//
// This is a SCREEN, not a verdict. Rank is a proxy for topicality:
//   - a question that quotes no distinctive vocabulary ranks everything badly
//   - a lesson that is genuinely the right target can still rank low when the
//     question is phrased in different words than the lesson uses
//   - two lessons covering the same idea legitimately swap places
// Every flag needs a human. A clean rank is weak evidence; a bad rank is a
// strong hint. Read the flagged ones, do not bulk-repoint them.
//
//   node scripts/audit-quiz-citations.mjs          # flagged only
//   node scripts/audit-quiz-citations.mjs --all    # every question with its rank
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lessonsDir = path.join(root, 'lessons');
const ALL = process.argv.includes('--all');

const STOP = new Set(`the and that this with what which when your you for are was were
have has had from does did will would could should than then them they their there here
into out over under about after before once only just also both each more most other some
such very much many any all can may might must not but its it's how why who whom whose
lesson lessons code line lines run runs running write writes writing read reads reading
value values thing things does doing done make makes making take takes using used use
program programs answer answers question questions correct wrong true false`.split(/\s+/));

const terms = (s) => {
  const out = [];
  for (const w of String(s).toLowerCase().match(/[a-z_$][a-z0-9_$]{2,}/g) ?? []) {
    if (!STOP.has(w)) out.push(w);
  }
  return out;
};

// ------------------------------------------------------------- corpus
const docs = [];
for (const d of fs.readdirSync(lessonsDir).sort()) {
  const cfg = path.join(lessonsDir, d, 'lesson.json');
  const md = path.join(lessonsDir, d, 'content.md');
  if (!fs.existsSync(cfg)) continue;
  let j;
  try { j = JSON.parse(fs.readFileSync(cfg, 'utf8')); } catch { continue; }
  const body = (fs.existsSync(md) ? fs.readFileSync(md, 'utf8') : '')
    + ' ' + (j.title ?? '') + ' ' + (j.description ?? '');
  const tf = new Map();
  for (const t of terms(body)) tf.set(t, (tf.get(t) ?? 0) + 1);
  docs.push({ id: d, title: j.title ?? d, tf });
}

// inverse document frequency: a term in every lesson tells you nothing about
// which lesson to cite, so it must not drive the ranking.
const df = new Map();
for (const doc of docs) for (const t of doc.tf.keys()) df.set(t, (df.get(t) ?? 0) + 1);
const idf = (t) => Math.log(docs.length / (1 + (df.get(t) ?? 0)));

function rank(queryTerms) {
  const q = [...new Set(queryTerms)];
  return docs
    .map((doc) => ({
      id: doc.id,
      title: doc.title,
      score: q.reduce((s, t) => s + (doc.tf.has(t) ? idf(t) * Math.log(1 + doc.tf.get(t)) : 0), 0),
    }))
    .sort((a, b) => b.score - a.score);
}

// ------------------------------------------------------------- questions
let total = 0;
let flagged = 0;
const rows = [];

for (const d of fs.readdirSync(lessonsDir).sort()) {
  const cfg = path.join(lessonsDir, d, 'lesson.json');
  if (!fs.existsSync(cfg)) continue;
  let j;
  try { j = JSON.parse(fs.readFileSync(cfg, 'utf8')); } catch { continue; }
  const qs = j.quiz?.questions;
  if (!Array.isArray(qs)) continue;

  qs.forEach((q, i) => {
    const ids = q.sourceIds ?? [];
    if (!ids.length) return;
    total++;
    // The question, the code it shows, the correct option, and the explanation.
    // Wrong options are left out on purpose: a distractor is usually about a
    // DIFFERENT concept, and including it drags the ranking toward that lesson.
    const query = terms([
      q.question, q.code ?? '',
      Array.isArray(q.options) ? q.options[q.answer] ?? '' : '',
      q.explanation ?? '',
    ].join(' '));

    const ranked = rank(query);
    const best = ranked.filter((r) => r.score > 0);
    const positions = ids.map((id) => ({
      id, at: best.findIndex((r) => r.id === id) + 1,
    }));
    // Rank of the best-placed cited lesson: a question citing two lessons is
    // fine if either one is on topic.
    const hit = positions.reduce((a, b) => (a.at > 0 && (b.at === 0 || a.at < b.at) ? a : b));
    const bad = hit.at === 0 || hit.at > 12;
    if (bad) flagged++;
    if (bad || ALL) {
      rows.push({
        bad, from: d, n: i + 1, q: q.question, at: hit.at,
        cited: hit.id, top: best.slice(0, 3),
      });
    }
  });
}

for (const r of rows) {
  console.log(`${r.bad ? 'FLAG' : '  ok'}  ${r.from} q${r.n}`);
  console.log(`      Q: ${r.q.slice(0, 96)}`);
  console.log(`      cites ${r.cited} — ranks ${r.at === 0 ? 'NOWHERE' : '#' + r.at}`);
  if (r.bad) {
    for (const t of r.top) console.log(`         top: ${t.title}   [${t.id}]`);
  }
}

console.log(`\n[audit-quiz-citations] ${total} pinned question(s), ${flagged} flagged for review`);
console.log('Rank is a proxy for topicality. Read every flag; do not bulk-repoint.');
