// Proves scripts/measure-chart-agreement.mjs and scripts/export-chart-corpus.mjs on SYNTHETIC data
// only (the repo's own chart fixtures). No database, no student data, no network.
import { spawnSync } from 'child_process';
import { mkdtempSync, rmSync, writeFileSync, existsSync, readFileSync, statSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { CHART_IDS, compileScorer, scrubText, scrubDoc, renderDiagram, isInsideRepo, repoRoot, loadChart } from './lib/chart-corpus.mjs';
import { syntheticRows } from './lib/chart-synthetic.mjs';
import { analyse, MIN_CORPUS_PER_CHART, MAX_HONEST_MARKED_WRONG, MAX_WRONG_CREDITED, FN_PATTERN_MIN_STUDENTS } from './measure-chart-agreement.mjs';
import { mapRow, StudentMapper, pageSql, skippedSql, resultsOf, PAGE_SIZE } from './export-chart-corpus.mjs';
import { VARIANTS, setCurrent } from './chart-fixtures.mjs';

let failures = 0;
const check = (ok, msg) => { if (!ok) { failures += 1; console.error('  FAIL  ' + msg); } else console.log('  ok    ' + msg); };
const tmp = mkdtempSync(path.join(tmpdir(), 'shcode-measure-test-'));
const scorer = await compileScorer();

try {
  check(MAX_HONEST_MARKED_WRONG === 0.02 && MAX_WRONG_CREDITED === 0.05 && FN_PATTERN_MIN_STUDENTS === 3 && MIN_CORPUS_PER_CHART === 20, 'thresholds are the plan values (2%, 5%, 3 students, 20 per chart)');

  const base = syntheticRows({ fromMermaid: scorer.fromMermaid });
  const strip = (rows) => rows.map(({ synthetic, truth, name, ...r }) => r); // what a real export file looks like
  const corpus = strip(base);
  const perChart = Object.fromEntries(CHART_IDS.map((id) => { setCurrent(id); return [id, base.filter((r) => r.lessonId === id)]; }));
  const honestN = Object.fromEntries(CHART_IDS.map((id) => [id, perChart[id].filter((r) => r.truth === 'honest').length]));
  const wrongN = Object.fromEntries(CHART_IDS.map((id) => [id, perChart[id].filter((r) => r.truth === 'wrong').length]));
  check(CHART_IDS.every((id) => perChart[id].length >= 20), `synthetic corpus has >= 20 final submissions per chart (${CHART_IDS.map((id) => perChart[id].length).join(', ')})`);

  // ---- clean corpus: PASS, counts exact, zero disagreements ----
  const clean = analyse(corpus, { scorer });
  check(clean.verdict === 'PASS', 'clean synthetic corpus: PASS (' + clean.blockReasons.concat(clean.insufficient).join('; ') + ')');
  for (const id of CHART_IDS) {
    const c = clean.charts[id];
    check(c.n === perChart[id].length && c.honest === honestN[id] && c.disagreements.length === 0 && c.fn === 0 && c.fp === 0,
      `${id}: n=${c.n}, honest=${c.honest}, no disagreements (rules agree with ground truth on every fixture)`);
    // the mutation row has a judge for only its first heavy criterion: it counts as wrong, not as unjudged
    check(c.wrong === wrongN[id] && c.unjudged === 0, `${id}: wrong=${c.wrong} (gaming fixtures + mutation), unjudged=${c.unjudged}`);
    const first = c.criteria.find((k) => k.id === loadChart(id).heavyIds[0]);
    const off = ['met', 'partial', 'missing'].reduce((t, j) => t + ['met', 'partial', 'missing'].filter((r) => r !== j).reduce((u, r) => u + first.confusion[j][r], 0), 0);
    check(off === 0 && first.nJudged === c.n, `${id}/${first.id}: confusion table has only agreeing cells (judged ${first.nJudged}/${c.n})`);
  }

  // ---- final submission only: an earlier wrong attempt by the same student is not counted ----
  const early = { ...corpus[0], submitted_at: corpus[0].submitted_at - 999999, response: corpus.find((r) => r.lessonId === corpus[0].lessonId && /Start/.test(r.response)).response };
  early.grade_json = corpus[0].grade_json;
  const withEarlier = analyse([early, ...corpus], { scorer });
  check(withEarlier.charts[CHART_IDS[0]].n === perChart[CHART_IDS[0]].length, 'an earlier attempt by the same student does not add a submission');

  // ---- hybrid-era rows (source rules) have no independent judge; null grade_json too ----
  const hybrid = corpus.map((r, i) => (i % 2 ? { ...r, grade_json: JSON.stringify({ criteria: loadChart(r.lessonId).heavyIds.map((h) => ({ id: h, verdict: 'met', source: 'rules', earned: 7, max: 7 })) }) } : { ...r, grade_json: null }));
  const hy = analyse(hybrid, { scorer });
  check(CHART_IDS.every((id) => hy.charts[id].unjudged === hy.charts[id].n && hy.charts[id].honest === 0) && hy.verdict === 'INSUFFICIENT', 'rows with only rule-sourced or null grades carry no judge: INSUFFICIENT, never PASS');
  // ...until a human adjudicates them offline
  const humanMap = {};
  hybrid.forEach((r, i) => { const t = base[i].truth; for (const h of loadChart(r.lessonId).heavyIds) humanMap[i] = { ...(humanMap[i] ?? {}), [h]: t === 'honest' ? 'met' : 'missing' }; });
  const hu = analyse(hybrid, { scorer, human: humanMap });
  check(hu.verdict === 'PASS', 'human adjudications (--human) supply the judge; verdict PASS when the rules agree');

  // ---- injected disagreements: one FP, one FN, exact list ----
  const idA = CHART_IDS[0];
  const fpIdx = corpus.findIndex((r, i) => r.lessonId === idA && base[i].truth === 'honest' && /variant: reworded decision "base > 80"/.test(base[i].name));
  const fnIdx = corpus.findIndex((r, i) => r.lessonId === idA && base[i].truth === 'honest' && /reference/.test(base[i].name));
  const injected = corpus.map((r) => ({ ...r }));
  injected[fpIdx].grade_json = JSON.stringify({ criteria: loadChart(idA).rubric.map((x) => ({ id: x.id, verdict: x.id === 'call-position' ? 'missing' : 'met', earned: x.id === 'call-position' ? 0 : x.points, max: x.points })) });
  const rect = scorer.fromMermaid(readFileSync(path.join(repoRoot, 'lessons', idA, 'solution', 'chart.mmd'), 'utf8'));
  for (const n of rect.nodes) if (n.shape === 'subroutine') n.shape = 'process';
  injected[fnIdx].response = JSON.stringify(rect);
  const inj = analyse(injected, { scorer });
  const dA = inj.charts[idA].disagreements;
  check(dA.length === 3 && dA.some((d) => d.row === fpIdx && d.kind === 'false-positive' && d.criterion === 'call-position') && dA.some((d) => d.row === fnIdx && d.kind === 'false-negative' && d.criterion === 'call-shape'),
    'three criterion-level disagreements (one FP, one FN row failing both criteria) listed with row, criterion, kind: ' + dA.map((d) => `${d.row}/${d.criterion}/${d.kind}`).join(', '));
  check(inj.charts[idA].fn === 1 && inj.charts[idA].fp === 1 && inj.charts[idA].fnCandidates.length === 2 && inj.charts[idA].fpCandidates.length === 1, 'FN candidates list the broken row per criterion, FP candidates the credited one');
  check(inj.verdict === 'BLOCK' && inj.blockReasons.some((r) => /honest charts marked wrong/.test(r)) && inj.blockReasons.some((r) => /wrong charts credited/.test(r)), 'rates above 2% / 5% BLOCK');
  check(dA[0].diagram.split('\n').length >= 10 && /subroutine|process/.test(dA.find((d) => d.kind === 'false-negative').diagram) && /->/.test(dA[0].diagram), 'disagreement carries a compact node/edge rendering');

  // ---- a repeatable false-negative pattern blocks even when the rate is under 2% ----
  const ref0 = corpus[0 + corpus.findIndex((r, i) => r.lessonId === idA && base[i].name === 'reference')];
  const many = Array.from({ length: 200 }, (_, i) => ({ ...ref0, student: 'h' + i, submitted_at: 5 + i }));
  const rectRow = (s) => ({ ...ref0, student: s, response: JSON.stringify(rect) });
  const two = analyse([...corpus, ...many, rectRow('p1'), rectRow('p2')], { scorer });
  check(two.verdict === 'PASS' && two.patterns.length >= 1 && two.patterns.every((p) => p.students === 2 && !p.blocks), 'same failure on 2 students (rate ~0.9%): reported, does not block');
  const three = analyse([...corpus, ...many, rectRow('p1'), rectRow('p2'), rectRow('p3')], { scorer });
  check(three.charts[idA].fnRate < MAX_HONEST_MARKED_WRONG && three.verdict === 'BLOCK' && three.patterns.some((p) => p.blocks && p.students === 3) && three.blockReasons.some((r) => /repeatable false-negative pattern/.test(r)),
    'same failure on 3 distinct students blocks although the rate is only ' + (three.charts[idA].fnRate * 100).toFixed(2) + '%');
  const sameStudent = analyse([...corpus, ...many, rectRow('p1'), { ...rectRow('p1'), submitted_at: 99999999 }, rectRow('p1')], { scorer });
  check(sameStudent.patterns.every((p) => p.students <= 1 && !p.blocks), 'one student repeating the failure counts once');

  // ---- minimum corpus and --pool, through the CLI ----
  const small = CHART_IDS.flatMap((id) => corpus.filter((r) => r.lessonId === id).slice(0, 8));
  const smallPath = path.join(tmp, 'small.json');
  writeFileSync(smallPath, JSON.stringify(small));
  const cli = (...a) => spawnSync(process.execPath, [path.join(repoRoot, 'scripts', 'measure-chart-agreement.mjs'), ...a], { encoding: 'utf8' });
  const np = cli(smallPath, '--json');
  const npRep = JSON.parse(np.stdout);
  check(np.status === 2 && npRep.verdict === 'INSUFFICIENT' && npRep.insufficient.length === 3, '8 per chart without --pool: INSUFFICIENT for each chart, exit 2');
  const pl = cli(smallPath, '--pool');
  check(pl.status === 0 && /VERDICT: PASS/.test(pl.stdout) && /synthetic variants/.test(pl.stdout) && /--pool was used/.test(pl.stdout), '--pool: 24 real rows pass the pooled minimum, synthetic variants are added and the report says so');
  const tiny = path.join(tmp, 'tiny.json');
  writeFileSync(tiny, JSON.stringify(CHART_IDS.flatMap((id) => corpus.filter((r) => r.lessonId === id).slice(0, 5))));
  const tp = cli(tiny, '--pool', '--json');
  check(tp.status === 2 && JSON.parse(tp.stdout).insufficient.some((s) => /POOL: 15/.test(s)), '15 real rows with --pool: still INSUFFICIENT (synthetic rows never satisfy the minimum)');
  const text = cli(smallPath);
  check(/=== 3-2-8-chart-parameter-trace ===/.test(text.stdout) && /confusion \(rows = judge, cols = rules\)/.test(text.stdout) && /VERDICT: INSUFFICIENT/.test(text.stdout), 'text report prints per-chart sections, confusion table and verdict');
  const inRepo = spawnSync(process.execPath, [path.join(repoRoot, 'scripts', 'measure-chart-agreement.mjs'), path.join(repoRoot, 'package.json')], { encoding: 'utf8' });
  check(inRepo.status === 64 && /outside the repo/.test(inRepo.stderr), 'measure refuses a corpus path inside the repo');

  // ---- PII scrub ----
  check(scrubText('mail kid.name@school.org now') === 'mail [redacted] now', "scrub redacts an '@' address");
  check(!/@/.test(scrubText('x@y and @handle and a@b.c')), "scrub leaves no '@' behind");
  check(scrubText('call 530-555-1234 ok') === 'call [redacted] ok' && scrubText('(530) 555 1234') === '[redacted]' && scrubText('+1 530.555.1234') === '[redacted]', 'scrub redacts digits-with-dashes/spaces/dots phone-like strings');
  check(scrubText('Is base over 80?') === 'Is base over 80?' && scrubText('100-20') === '100-20' && scrubText('i = 0 to 12') === 'i = 0 to 12', 'scrub leaves ordinary chart numbers alone');
  const dirty = { version: 1, nodes: [{ id: 'a', shape: 'process', label: 'bob@x.com 555-123-4567', x: 0, y: 0 }], edges: [{ id: 'e', from: 'a', to: 'a', label: 'me@x.org' }] };
  const sd = JSON.stringify(scrubDoc(dirty));
  check(!/@|555-123/.test(sd) && /\[redacted\]/.test(sd), 'scrubDoc cleans node and edge labels');
  check(renderDiagram({ nodes: [{ id: 'n', shape: 'process', label: 'x'.repeat(100) }], edges: [] }).length < 80 && !/@/.test(renderDiagram(dirty)), 'rendering truncates labels to 60 chars and scrubs');

  // ---- exporter: mapping happens in memory, only mapped rows are written ----
  const raw = [
    { rid: 1, kind: 'submission', lesson_id: idA, student_email: 'Kid.One@school.org', response: JSON.stringify(dirty), grade: JSON.stringify([{ id: 'call-shape', verdict: 'met', source: null, earned: 7, max: 7, feedback: 'leak' }]), submitted_at: 10 },
    { rid: 2, kind: 'submission', lesson_id: idA, student_email: 'kid.one@school.org', response: JSON.stringify(dirty), grade: null, submitted_at: 20 },
    { rid: 3, kind: 'draft', lesson_id: idA, student_email: 'other@school.org', response: JSON.stringify(dirty), grade: null, submitted_at: 30 },
    { rid: 4, kind: 'submission', lesson_id: idA, student_email: 'bad@school.org', response: 'not json', grade: null, submitted_at: 40 },
  ];
  const mapper = new StudentMapper();
  const mapped = raw.map((r) => mapRow(r, mapper)).filter(Boolean);
  const mj = JSON.stringify(mapped);
  check(mapped.length === 3 && mapped[0].student === 's1' && mapped[1].student === 's1' && mapped[2].student === 's2' && mapped[2].kind === 'draft', 'emails map to s1..sn consistently (case-insensitive); an unparseable response is dropped');
  check(!/@|school|Kid|leak/i.test(mj) && !/555-123/.test(mj), 'mapped rows contain no email, no phone, no feedback text');
  check(resultsOf([{ results: [{ a: 1 }] }, { results: [{ a: 2 }] }]).length === 2, 'wrangler --json pages are flattened');
  const exportCli = (...a) => spawnSync(process.execPath, [path.join(repoRoot, 'scripts', 'export-chart-corpus.mjs'), ...a], { encoding: 'utf8', input: JSON.stringify([{ results: raw }]) });
  const insideOut = path.join(repoRoot, 'chart-corpus-test-should-not-exist.json');
  const bad = exportCli('--stdin', '--out', insideOut);
  check(bad.status === 1 && /inside the repo/.test(bad.stderr) && !existsSync(insideOut), 'exporter refuses to write inside the repo, and writes nothing');
  const good = path.join(tmp, 'corpus.json');
  const ok = exportCli('--stdin', '--out', good);
  const written = existsSync(good) ? readFileSync(good, 'utf8') : '';
  check(ok.status === 0 && JSON.parse(written).length === 3 && !/@|school/i.test(written) && !/@|school/i.test(ok.stdout) && (statSync(good).mode & 0o077) === 0, 'exporter writes only mapped rows (mode 0600); emails appear in neither the file nor stdout');
  check(isInsideRepo(path.join(repoRoot, 'a', 'b.json')) && !isInsideRepo(good), 'isInsideRepo: repo paths yes, scratch paths no');

  // ---- the SQL itself: read-only, bounded, valid SQLite ----
  const s1 = pageSql('lesson_submissions', 0), s2 = pageSql('lesson_drafts', 7), s3 = skippedSql('lesson_drafts');
  check([s1, s2, s3].every((s) => /^SELECT /.test(s) && !/;|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b|\bALTER\b|"/i.test(s)) && !/\bid\b\s*,/.test(s1.split('FROM')[0].replace(/json_extract\([^)]*\)/g, '')) && s1.includes(`LIMIT ${PAGE_SIZE}`) && s2.includes('rowid > 7'), 'SQL: SELECT only, no double quotes (safe inside --command "..."), paged, no submission id column');
  try {
    const { DatabaseSync } = await import('node:sqlite');
    const db = new DatabaseSync(':memory:');
    db.exec("CREATE TABLE lesson_submissions (id TEXT PRIMARY KEY, student_email TEXT, lesson_id TEXT, response TEXT, grade_json TEXT, score REAL, possible REAL, submitted_at INTEGER); CREATE TABLE lesson_drafts (student_email TEXT, lesson_id TEXT, response TEXT, updated_at INTEGER, PRIMARY KEY (student_email, lesson_id));");
    db.prepare('INSERT INTO lesson_submissions VALUES (?,?,?,?,?,?,?,?)').run('i1', 'a@b.c', idA, '{"nodes":[],"edges":[]}', JSON.stringify({ criteria: [{ id: 'call-shape', verdict: 'met', earned: 7, max: 7, feedback: 'secret words' }], summary: 'x' }), 1, 1, 5);
    db.prepare('INSERT INTO lesson_submissions VALUES (?,?,?,?,?,?,?,?)').run('i2', 'a@b.c', idA, '{}', 'not json', 1, 1, 6);
    db.prepare('INSERT INTO lesson_drafts VALUES (?,?,?,?)').run('a@b.c', idA, '{}', 9);
    const r1 = db.prepare(s1).all(), r2 = db.prepare(pageSql('lesson_drafts', 0)).all();
    check(r1.length === 2 && r2.length === 1 && db.prepare(s3).all()[0].skipped === 0 && !JSON.stringify(r1).includes('secret words') && r1[0].grade.includes('"call-shape"') && r1[1].grade === null, 'SQL runs on SQLite; grade_json is reduced to id/verdict/source/earned/max in the query (no feedback leaves the database; invalid JSON becomes NULL)');
  } catch (e) { console.log('  skip  node:sqlite unavailable (' + e.code + '), SQL execution check skipped'); }
} finally {
  scorer.cleanup();
  rmSync(tmp, { recursive: true, force: true });
}
console.log(failures === 0 ? '[test-measure-chart-agreement] OK' : `[test-measure-chart-agreement] ${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);
