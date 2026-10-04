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

const FAR = 4102444800000;
const CLASS_ID = 'dev-class';

function openDb(root) {
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
