// Build the chart-agreement corpus from the production D1 -- READ ONLY, and NOT to be run without the
// owner's approval of the data pull.
//
//   node scripts/export-chart-corpus.mjs --sql
//       Prints the exact read-only SQL (and the d1.mjs command for each) it would run. Touches nothing.
//   node scripts/export-chart-corpus.mjs --run --out <path outside the repo> [--force]
//       Runs the paged SELECTs through `node scripts/d1.mjs execute shcode-commits --remote --json`,
//       keeping every result in memory, maps each email to an opaque s1..sn id IN MEMORY, scrubs the
//       labels, and writes ONLY the mapped rows. Emails are never written to disk, never printed.
//   node scripts/export-chart-corpus.mjs --stdin --out <path>      (tests / piping one d1 --json page)
//
// PRIVACY RULE. The corpus stays in the scratch directory and is never committed. This script refuses
// an --out path inside the repo and writes the file with mode 0600. Only aggregate tables (counts,
// rates, the verdict) from measure-chart-agreement.mjs may be committed. Mitigations in the data
// itself: (1) the SQL selects the email only to be mapped, never the submission id; (2) grade_json is
// reduced IN SQL to [{id, verdict, source, earned, max}] -- the model's free-text feedback never leaves
// the database; (3) every label and edge label is scrubbed: any token containing '@' and any
// phone-looking digit run (>= 7 digits) becomes "[redacted]"; (4) the mapping s1..sn is not saved.
//
// SIZES AND PAGING. D1 caps a result and a statement; charts are small, but pages are 25 rows
// (keyset on rowid) and rows with a response over 60000 characters are skipped and counted.

import { execFileSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CHART_IDS, isInsideRepo, scrubDoc, scrubText, repoRoot } from './lib/chart-corpus.mjs';

export const PAGE_SIZE = 25;
export const MAX_RESPONSE_CHARS = 60000;
const IDS = CHART_IDS.map((i) => `'${i}'`).join(',');

const COMPACT_GRADE = `CASE WHEN json_valid(grade_json) THEN (SELECT json_group_array(json_object('id', json_extract(value,'$.id'), 'verdict', json_extract(value,'$.verdict'), 'source', json_extract(value,'$.source'), 'earned', json_extract(value,'$.earned'), 'max', json_extract(value,'$.max'))) FROM json_each(grade_json,'$.criteria')) ELSE NULL END`;

/** The two paged SELECTs (single quotes only, so the string survives double-quoting in a shell). */
export function pageSql(table, afterRowid) {
  if (table === 'lesson_submissions') {
    return `SELECT rowid AS rid, 'submission' AS kind, lesson_id, student_email, response, ${COMPACT_GRADE} AS grade, submitted_at FROM lesson_submissions WHERE lesson_id IN (${IDS}) AND length(response) <= ${MAX_RESPONSE_CHARS} AND rowid > ${Number(afterRowid) | 0} ORDER BY rowid LIMIT ${PAGE_SIZE}`;
  }
  return `SELECT rowid AS rid, 'draft' AS kind, lesson_id, student_email, response, NULL AS grade, updated_at AS submitted_at FROM lesson_drafts WHERE lesson_id IN (${IDS}) AND length(response) <= ${MAX_RESPONSE_CHARS} AND rowid > ${Number(afterRowid) | 0} ORDER BY rowid LIMIT ${PAGE_SIZE}`;
}
export const skippedSql = (table) => `SELECT count(*) AS skipped FROM ${table} WHERE lesson_id IN (${IDS}) AND length(response) > ${MAX_RESPONSE_CHARS}`;

/** Maps emails to s1..sn in memory. The map is never serialised. */
export class StudentMapper {
  #m = new Map();
  id(email) {
    const k = String(email ?? '').trim().toLowerCase();
    if (!this.#m.has(k)) this.#m.set(k, 's' + (this.#m.size + 1));
    return this.#m.get(k);
  }
  get size() { return this.#m.size; }
}

/** One raw D1 row -> one corpus row (scrubbed, email replaced). Returns null if it cannot be used. */
export function mapRow(raw, mapper) {
  let doc;
  try { doc = JSON.parse(raw.response); } catch { return null; }
  if (!doc || !Array.isArray(doc.nodes) || !Array.isArray(doc.edges)) return null;
  let grade = null;
  if (raw.grade) {
    try {
      const crit = (typeof raw.grade === 'string' ? JSON.parse(raw.grade) : raw.grade)
        .filter((c) => c && typeof c.id === 'string')
        .map((c) => ({ id: c.id, verdict: c.verdict ?? undefined, source: c.source ?? undefined, earned: c.earned ?? undefined, max: c.max ?? undefined }));
      grade = JSON.stringify({ criteria: crit });
    } catch { grade = null; }
  }
  return {
    lessonId: String(raw.lesson_id),
    student: mapper.id(raw.student_email),
    response: JSON.stringify(scrubDoc(doc)),
    grade_json: grade,
    submitted_at: Number(raw.submitted_at) || 0,
    kind: raw.kind === 'draft' ? 'draft' : 'submission',
  };
}

/** wrangler's --json is an array of {results:[...]} (or one such object). */
export function resultsOf(parsed) {
  const arr = Array.isArray(parsed) ? parsed : [parsed];
  return arr.flatMap((x) => (x && Array.isArray(x.results) ? x.results : []));
}

function checkOut(out) {
  if (!out) throw new Error('--out <path> is required');
  if (isInsideRepo(out)) throw new Error(`Refusing: ${scrubText(out)} is inside the repo (${repoRoot}). The corpus must stay in the scratch directory.`);
}
function write(out, rows, force) {
  if (existsSync(out) && !force) throw new Error('Output exists; pass --force to overwrite.');
  writeFileSync(out, JSON.stringify(rows), { mode: 0o600 });
}

function d1(sql) {
  const txt = execFileSync(process.execPath, [path.join(repoRoot, 'scripts', 'd1.mjs'), 'execute', 'shcode-commits', '--remote', '--json', '--command', sql], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'inherit'] });
  return resultsOf(JSON.parse(txt.slice(txt.indexOf('['))));
}

async function main() {
  const args = process.argv.slice(2);
  const has = (f) => args.includes(f);
  const val = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : undefined; };
  if (has('--sql') || args.length === 0) {
    for (const t of ['lesson_submissions', 'lesson_drafts']) {
      console.log(`-- page 1 of ${t} (repeat with rowid > <last rid> until fewer than ${PAGE_SIZE} rows come back)`);
      console.log(`node scripts/d1.mjs execute shcode-commits --remote --json --command "${pageSql(t, 0)}"`);
      console.log(`-- rows skipped for size:\nnode scripts/d1.mjs execute shcode-commits --remote --json --command "${skippedSql(t)}"\n`);
    }
    return;
  }
  const out = val('--out');
  checkOut(out);
  const mapper = new StudentMapper();
  const rows = [];
  if (has('--stdin')) {
    for (const r of resultsOf(JSON.parse(readFileSync(0, 'utf8')))) { const m = mapRow(r, mapper); if (m) rows.push(m); }
  } else if (has('--run')) {
    for (const t of ['lesson_submissions', 'lesson_drafts']) {
      let after = 0;
      for (;;) {
        const page = d1(pageSql(t, after));
        for (const r of page) { const m = mapRow(r, mapper); if (m) rows.push(m); after = Math.max(after, Number(r.rid) || 0); }
        if (page.length < PAGE_SIZE) break;
      }
      const sk = d1(skippedSql(t))[0]?.skipped ?? 0;
      if (sk) console.error(`${t}: ${sk} oversized row(s) skipped`);
    }
  } else { console.error('use --sql, --run --out <path>, or --stdin --out <path>'); process.exit(64); }
  write(path.resolve(out), rows, has('--force'));
  console.log(`wrote ${rows.length} rows, ${mapper.size} students (opaque ids) to ${path.resolve(out)}; keep it out of git`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(String(e.message || e)); process.exit(1); });
}
