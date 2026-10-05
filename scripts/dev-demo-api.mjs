// DEV_REAL_DB=1: run the REAL Pages Function handlers for the tries feature over a REAL SQLite
// database (every migrations/*.sql applied) with a FAKE AI grader, so the dev server can show the
// whole student flow -- tries counting, AI feedback, best score, the solution gate -- without
// Cloudflare, an Ollama key, or production data.
//
//   DEV_REAL_DB=1 DEV_ROLE=student npm run dev
//
// What is real: functions/api/{lesson-state,lesson-submissions,grade-written,attempt-reveal,
// quiz-reveal,my-gradebook}. What is fake: the model behind grade-written (a tiny local HTTP server
// that answers /api/chat and "grades" by answer length, so a thin answer scores low and a full one
// scores high), and the database is in memory (gone on restart). Every student identity the dev
// server sees is enrolled in the dev class on first sight, as the existing dev stub assumes.
//
// Teachers release a solution with POST /api/dev/solution-release { lessonId, releaseAt } (epoch
// ms; omit releaseAt to take it back), same as the stub it replaces.

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { openMemoryDb, requireSqlite } from './lib/sqlite-adapter.mjs';
import { onRequestGet as stateIndexGet } from '../functions/api/lesson-state/index.ts';
import { onRequestPost as statePost, onRequestDelete as stateDelete } from '../functions/api/lesson-state/[lessonId].ts';
import { onRequestGet as submissionsGet, onRequestPost as submissionsPost } from '../functions/api/lesson-submissions/index.ts';
import { onRequestGet as gradeGet, onRequestPost as gradePost } from '../functions/api/grade-written.ts';
import { onRequestGet as attemptRevealGet } from '../functions/api/attempt-reveal.ts';
import { onRequestGet as quizRevealGet } from '../functions/api/quiz-reveal.ts';
import { onRequestGet as myGradebookGet } from '../functions/api/my-gradebook.ts';
import { ATTEMPT_CAPS } from '../functions/_shared/pa-pseudocode.generated.ts';
import { COUNT_SINCE } from '../lib/attempt-cap.ts';
import { onRequestGet as classesGet } from '../functions/api/classes/index.ts';
import { onRequestGet as classDetailGet, onRequestPatch as classDetailPatch } from '../functions/api/classes/[id]/index.ts';
import { onRequestGet as classGradebookGet } from '../functions/api/classes/[id]/gradebook.ts';
import { onRequestGet as classProgressGet } from '../functions/api/classes/[id]/progress.ts';
import { onRequestGet as classStudentGet } from '../functions/api/classes/[id]/students/[email].ts';
import { onRequestGet as classNeedsAttentionGet } from '../functions/api/classes/[id]/needs-attention.ts';
import { onRequestGet as classPastDueGet } from '../functions/api/classes/[id]/past-due/index.ts';
import { onRequestGet as classDueDatesGet, onRequestPut as classDueDatesPut } from '../functions/api/classes/[id]/due-dates/index.ts';
import { onRequestGet as classReleasesGet, onRequestPut as classReleasesPut } from '../functions/api/classes/[id]/solution-releases/index.ts';
import { onRequestPost as classArchivePost } from '../functions/api/classes/[id]/archive.ts';
import { onRequestPost as classRegenPost } from '../functions/api/classes/[id]/regenerate-code.ts';

const FAR = 4102444800000;
const CLASS_ID = 'dev-class';

export function openDb(root) {
  requireSqlite('dev-demo-api');
  const sql = openMemoryDb();
  const dir = path.join(root, 'migrations');
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.sql')).sort()) sql.run(fs.readFileSync(path.join(dir, f), 'utf8'));
  sql.run("INSERT INTO classes (id, name, code, owner_email, school_year, created_at) VALUES (?, 'Dev class', 'DEVDEV', 'teacher@dev.local', '2026-2027', 0)", [CLASS_ID]);
  const db = {
    raw: sql,
    async batch(stmts) {
      sql.run('BEGIN');
      try { for (const q of stmts) await q.run(); sql.run('COMMIT'); } catch (e) { sql.run('ROLLBACK'); throw e; }
      return [];
    },
    prepare(text) {
      let args = [];
      const stmt = sql.query(text);
      const q = {
        bind(...a) { args = a; return q; },
        async all() { return { results: stmt.all(...args) }; },
        async first() { return stmt.get(...args) ?? null; },
        async run() { const r = stmt.run(...args); return { success: true, meta: { changes: r.changes } }; },
      };
      return q;
    },
  };
  return db;
}

// The fake model. It reads the rubric lines the real prompt carries ("- [id] (N pts) title") and the
// student's text between the """ fences, and scores by length: under 12 words earns nothing, under 35
// words half, anything longer full marks. Deterministic, so a demo repeats.
function startFakeOllama(onReady) {
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      let user = '';
      try { user = (JSON.parse(body).messages || []).find((m) => m.role === 'user')?.content || ''; } catch { /* empty */ }
      const fenced = /"""\s*([\s\S]*?)\s*"""/.exec(user);
      const words = (fenced ? fenced[1] : user).trim().split(/\s+/).filter(Boolean).length;
      const level = words < 12 ? 0 : words < 35 ? 0.5 : 1;
      const criteria = [...user.matchAll(/^- \[([^\]]+)\] \((\d+(?:\.\d+)?) pts\)/gm)].map(([, id, pts]) => ({
        id,
        earned: Number(pts) * level,
        verdict: level === 1 ? 'met' : level === 0.5 ? 'partial' : 'missing',
        feedback: level === 1 ? 'Demo grader: this covers the idea well.' : level === 0.5 ? 'Demo grader: on the right track, but add more detail.' : 'Demo grader: this needs to say more before it can earn credit.',
      }));
      const content = JSON.stringify({ criteria, summary: level === 1 ? 'Demo grader: a full answer.' : 'Demo grader: add more detail and try again.', hints: level === 1 ? [] : ['Say what each step does, in your own words.'] });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: { content }, done: true }));
    });
  });
  server.listen(0, '127.0.0.1', () => onReady(server.address().port));
  return server;
}

// A small class to look at: six students at different places, due dates that have passed for the first
// four modules and not yet for the fifth, one waiver. Enough to see "up to date", "behind", "late",
// "waived" and "nothing yet" side by side. Built from the real manifest, so the graded lessons are real.
function seedClass(sql, root, teacherEmail) {
  const man = JSON.parse(fs.readFileSync(path.join(root, 'public', 'lessons-manifest.json'), 'utf8')).lessons;
  const modOf = (t) => /^(\d+\.\d+)\.\d+/.exec(t || '')?.[1] ?? null;
  const graded = man.filter((l) => (l.assignmentCode || l.preview === 'quiz' || l.scoreKind === 'written') && modOf(l.title));
  const inMods = (mods) => graded.filter((l) => mods.includes(modOf(l.title)));
  const now = Date.now();
  const DAY = 86400000;
  sql.run('UPDATE classes SET owner_email = ?, name = ? WHERE id = ?', [teacherEmail, 'Period 3 Intro Programming', CLASS_ID]);
  for (const [m, at] of [['1.1', now - 20 * DAY], ['1.2', now - 14 * DAY], ['1.3', now - 7 * DAY], ['1.4', now - 2 * DAY], ['1.5', now + 7 * DAY]]) {
    sql.run("INSERT INTO class_due_dates (class_id, scope, scope_id, due_at, set_by, set_at) VALUES (?, 'module', ?, ?, ?, 0)", [CLASS_ID, m, at, teacherEmail]);
  }
  const locked = inMods(['1.5'])[0];
  if (locked) sql.run("INSERT INTO class_open_dates (class_id, scope, scope_id, open_at, set_by, set_at) VALUES (?, 'lesson', ?, ?, ?, 0)", [CLASS_ID, locked.id, now + 3 * DAY, teacherEmail]);
  const students = [
    ['ada@school.test', 'Ada', 'Lovelace', 'all'],
    ['ben@school.test', 'Ben', 'Franklin', 'early'],
    ['cleo@school.test', 'Cleo', 'Patra', 'partial'],
    ['dev@school.test', 'Dev', 'Patel', 'none'],
    ['eli@school.test', 'Eli', 'Whitney', 'late'],
    ['fay@school.test', 'Fay', 'Ray', 'waived'],
  ];
  const put = (email, l, state, completedAt, score) =>
    sql.run('INSERT OR REPLACE INTO lesson_state (student_email, lesson_id, state, started_at, completed_at, score) VALUES (?, ?, ?, ?, ?, ?)', [email, l.id, state, now - 30 * DAY, completedAt, score]);
  for (const [email, first, last, kind] of students) {
    sql.run('INSERT OR IGNORE INTO students (email, password_hash, created_at, first_name, last_name) VALUES (?, ?, 0, ?, ?)', [email, 'x', first, last]);
    sql.run('INSERT OR IGNORE INTO enrollments (class_id, student_email, enrolled_at, expires_at) VALUES (?, ?, 0, ?)', [CLASS_ID, email, FAR]);
    const full = (l) => (l.maxScore ? l.maxScore : null);
    if (kind === 'all' || kind === 'waived') for (const l of inMods(kind === 'all' ? ['1.1', '1.2', '1.3', '1.4'] : ['1.1', '1.2', '1.3'])) put(email, l, 'completed', now - 25 * DAY, full(l));
    if (kind === 'early') for (const l of inMods(['1.1', '1.2'])) put(email, l, 'completed', now - 15 * DAY, full(l));
    if (kind === 'late') for (const l of inMods(['1.1', '1.2', '1.3', '1.4'])) put(email, l, 'completed', now - 1 * DAY, full(l));
    if (kind === 'partial') {
      const ls = inMods(['1.1', '1.2', '1.3']);
      ls.slice(0, Math.ceil(ls.length / 2)).forEach((l) => put(email, l, 'completed', now - 18 * DAY, l.maxScore ? Math.max(1, Math.round(l.maxScore * 0.6)) : null));
      if (ls[ls.length - 1]) put(email, ls[ls.length - 1], 'started', null, null);
    }
    if (kind === 'early') {
      // Ben has used 2 of 3 tries on a capped part and not passed: it shows "Tried" with one try left.
      const capId = Object.keys(ATTEMPT_CAPS).find((id) => man.some((l) => l.id === id));
      if (capId) {
        const cl = man.find((l) => l.id === capId);
        put(email, cl, 'started', null, 1.5);
        for (const n of [1, 2]) sql.run("INSERT INTO lesson_submissions (id, student_email, lesson_id, response, grade_json, score, possible, submitted_at) VALUES (?, ?, ?, 'attempt', ?, 1.5, 3, ?)", ['seed-' + n, email, capId, JSON.stringify({ criteria: [] }), Math.max(COUNT_SINCE, now) + n]);
      }
    }
    if (kind === 'all') {
      // Ada's first graded lesson was reviewed by the teacher, with a note.
      const first = inMods(['1.1'])[0];
      if (first) sql.run("INSERT INTO lesson_submissions (id, student_email, lesson_id, response, grade_json, score, possible, submitted_at) VALUES ('seed-ada', ?, ?, 'x', ?, 5, 5, ?)", [email, first.id, JSON.stringify({ teacherFeedback: 'Nice work. Your comments made the idea clear.', teacherReviewedAt: now - 3 * DAY }), now - 3 * DAY]);
    }
    if (kind === 'none') {
      // Dev's hand-in sat in a grader outage: it needs the teacher (Today's badge, the grid's "..." cell).
      const f = inMods(['1.2']).find((l) => !(l.id in ATTEMPT_CAPS));
      if (f) sql.run("INSERT INTO lesson_submissions (id, student_email, lesson_id, response, grade_json, score, possible, submitted_at) VALUES ('seed-pending', ?, ?, 'answer', ?, NULL, NULL, ?)", [email, f.id, JSON.stringify({ gradingFailed: true, error: 'grader unavailable' }), now - DAY]);
    }
    if (kind === 'waived') for (const l of inMods(['1.4'])) sql.run("INSERT OR IGNORE INTO lesson_due_waivers (class_id, student_email, lesson_id, granted_by, granted_at) VALUES (?, ?, ?, ?, 0)", [CLASS_ID, email, l.id, teacherEmail]);
  }
}

export function mountDemoApi({ server, express, devIdentity, role, root }) {
  const db = openDb(root);
  let fakePort = 0;
  startFakeOllama((p) => { fakePort = p; });
  const env = {
    DB: db,
    ASSETS: {
      async fetch(input) {
        const u = new URL(typeof input === 'string' ? input : input.url);
        const file = path.join(root, 'public', u.pathname);
        try { return new Response(fs.readFileSync(file), { headers: { 'Content-Type': 'application/json' } }); } catch { return new Response('not found', { status: 404 }); }
      },
    },
    OLLAMA_API_KEY: 'demo',
    get OLLAMA_HOST() { return `http://127.0.0.1:${fakePort}`; },
    GRADE_WRITTEN_DAILY_LIMIT: '1000',
  };

  seedClass(db.raw, root, devIdentity({ headers: {} }));
  const enrolled = new Set();
  const ensure = (email) => {
    if (enrolled.has(email)) return;
    enrolled.add(email);
    db.raw.run('INSERT OR IGNORE INTO students (email, password_hash, created_at) VALUES (?, ?, 0)', [email, 'x']);
    db.raw.run('INSERT OR IGNORE INTO enrollments (class_id, student_email, enrolled_at, expires_at) VALUES (?, ?, 0, ?)', [CLASS_ID, email, FAR]);
  };

  const route = (handler, paramNames = []) => async (req, res) => {
    const email = devIdentity(req);
    ensure(email);
    const url = `http://localhost${req.originalUrl}`;
    const request = new Request(url, {
      method: req.method,
      headers: { 'content-type': 'application/json' },
      body: req.method === 'GET' || req.method === 'DELETE' ? undefined : JSON.stringify(req.body ?? {}),
    });
    const params = {};
    for (const n of paramNames) params[n] = req.params[n];
    try {
      const out = await handler({ request, env, params, data: { email, role }, waitUntil() {} });
      res.status(out.status);
      const type = out.headers.get('content-type');
      if (type) res.type(type);
      res.send(await out.text());
    } catch (e) {
      console.error('  [demo] handler threw:', e);
      res.status(500).json({ error: String(e && e.message ? e.message : e) });
    }
  };
  const json = express.json({ limit: '1mb' });

  server.get('/api/lesson-state', route(stateIndexGet));
  server.post('/api/lesson-state/:lessonId', json, route(statePost, ['lessonId']));
  server.delete('/api/lesson-state/:lessonId', route(stateDelete, ['lessonId']));
  server.get('/api/lesson-submissions', route(submissionsGet));
  server.post('/api/lesson-submissions', json, route(submissionsPost));
  server.get('/api/grade-written', route(gradeGet));
  server.post('/api/grade-written', json, route(gradePost));
  server.get('/api/attempt-reveal', route(attemptRevealGet));
  server.get('/api/quiz-reveal', route(quizRevealGet));
  server.get('/api/my-gradebook', route(myGradebookGet));
  // Teacher side: the class pages' real handlers, so the grid, the roster and the drawer show real numbers.
  server.get('/api/classes', route(classesGet));
  server.get('/api/classes/:id', route(classDetailGet, ['id']));
  server.patch('/api/classes/:id', json, route(classDetailPatch, ['id']));
  server.get('/api/classes/:id/gradebook', route(classGradebookGet, ['id']));
  server.get('/api/classes/:id/progress', route(classProgressGet, ['id']));
  server.get('/api/classes/:id/students/:email', route(classStudentGet, ['id', 'email']));
  server.get('/api/classes/:id/needs-attention', route(classNeedsAttentionGet, ['id']));
  server.get('/api/classes/:id/past-due', route(classPastDueGet, ['id']));
  server.get('/api/classes/:id/due-dates', route(classDueDatesGet, ['id']));
  server.put('/api/classes/:id/due-dates', json, route(classDueDatesPut, ['id']));
  server.get('/api/classes/:id/solution-releases', route(classReleasesGet, ['id']));
  server.put('/api/classes/:id/solution-releases', json, route(classReleasesPut, ['id']));
  server.post('/api/classes/:id/archive', json, route(classArchivePost, ['id']));
  server.post('/api/classes/:id/regenerate-code', json, route(classRegenPost, ['id']));
  server.post('/api/dev/solution-release', json, (req, res) => {
    const { lessonId, releaseAt } = req.body || {};
    if (typeof lessonId !== 'string') return res.status(400).json({ error: 'lessonId required' });
    db.raw.run("DELETE FROM class_solution_releases WHERE class_id = ? AND scope = 'lesson' AND scope_id = ?", [CLASS_ID, lessonId]);
    if (typeof releaseAt === 'number') {
      db.raw.run("INSERT INTO class_solution_releases (class_id, scope, scope_id, release_at, set_by, set_at) VALUES (?, 'lesson', ?, ?, 'teacher@dev.local', ?)", [CLASS_ID, lessonId, releaseAt, Date.now()]);
    }
    res.json({ ok: true });
  });
  console.log('  [demo] DEV_REAL_DB: real tries handlers over in-memory SQLite, fake AI grader');
}
