import express from 'express';
import next from 'next';
import fs from 'fs/promises';
import path from 'path';
// The REAL anonymiser, not a dev copy of it. If /issues is going to be
// reviewed locally, it has to be reviewed through the same function that
// decides what a student may see in production.
import { publicReport, rankReports, visibleToStudent } from './functions/_shared/issue-reports.ts';
// Both lesson-id routes below resolve paths through this. It lives in lib/ so
// scripts/test-lesson-solution-parity.mjs can compare the real dev behaviour
// against the Pages Function rather than a reimplementation of it.
import { resolveLessonDir as resolveLessonDirIn, readLessonSolution } from './lib/lesson-solution-fs.mjs';

// Who the dev auth stub pretends to be. `DEV_ROLE=student npm run dev` is the
// only way to see the student half of anything here — the real session comes
// from a JWT this server does not issue.
const DEV_EMAIL = 'dev@local';
const DEV_ROLE = process.env.DEV_ROLE === 'student' ? 'student' : process.env.DEV_ROLE === 'admin' ? 'admin' : 'teacher';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// Two routes join a client-supplied id onto a filesystem path (/api/grade and
// /api/lesson-solution) and neither had any validation, which made both
// traversable. The charset check and the realpath containment behind it now
// live in lib/lesson-solution-fs.mjs, so the test can exercise the same guard
// the server runs.
const LESSONS_ROOT = () => path.join(process.cwd(), 'lessons');
const resolveLessonDir = (id) => resolveLessonDirIn(id, LESSONS_ROOT());

// Extract the body of a named function by balancing braces. Returns just
// the code between the opening { and matching closing }, or null if the
// function isn't found. Used so requirements can scope a pattern match to
// "inside draw()" or "inside setup()" rather than anywhere in the file.
function extractFunctionBody(src, name) {
  const re = new RegExp(`function\\s+${name}\\s*\\([^)]*\\)\\s*\\{`);
  const m = src.match(re);
  if (!m || m.index === undefined) return null;
  let depth = 1;
  let i = m.index + m[0].length;
  const bodyStart = i;
  while (i < src.length && depth > 0) {
    const c = src[i];
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return src.slice(bodyStart, i);
    }
    i++;
  }
  return null;
}

// Strip JS line (//) and block (/* */) comments so regex autograder can't
// be tricked by answer code commented out in the starter. Respects strings
// so commented tokens inside "// not a comment" aren't dropped. Naive: no
// template-literal or regex-literal handling, which is fine for student code.
function stripJsComments(src) {
  let out = '';
  let i = 0;
  const n = src.length;
  let inStr = null; // '"' | "'" | '`' when inside a string, else null
  while (i < n) {
    const c = src[i];
    const next = src[i + 1];
    if (inStr) {
      out += c;
      if (c === '\\' && i + 1 < n) { out += src[i + 1]; i += 2; continue; }
      if (c === inStr) inStr = null;
      i++;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { inStr = c; out += c; i++; continue; }
    if (c === '/' && next === '/') {
      while (i < n && src[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && next === '*') {
      i += 2;
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

app.prepare().then(() => {
  const server = express();

  // ---- public/_headers, for the one prefix that cannot work without it ----
  //
  // Cloudflare Pages reads public/_headers; this Express server does not, so
  // without this the local preview and production differ on exactly the thing
  // that makes the B-rep kernel loadable at all.
  //
  // The preview iframe is sandboxed WITHOUT allow-same-origin, which puts it in
  // an OPAQUE origin, so its fetches carry `Origin: null`. A classic
  // <script src> is no-cors and loads fine -- which is why JSCAD never needed
  // this -- but an ES module is always fetched in CORS mode, and so is the wasm
  // an emscripten module pulls in. Missing header, and the kernel is blocked
  // before its wasm is even requested.
  //
  // Failing only in dev would be bad enough; the reverse is worse. Whichever way
  // round it went, the difference would be found by a person, in a classroom.
  // Kept deliberately narrow to the same prefix public/_headers grants, and
  // NOT applied to /api/*, which stays same-origin and cookie-gated.
  server.use('/reshape/kernel', (_req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  });

  // ---- Dev-only auth + lesson-state stubs --------------------------------
  // The real /api/auth/* and /api/lesson-state* are Cloudflare Pages
  // Functions (functions/api/**), which this local Express server does NOT
  // emulate. Without these stubs every lesson past the first in a module
  // renders "Lesson locked" because the client sees role=null. Production
  // (Cloudflare Pages) ignores this file entirely — dev convenience only.
  // A `dev_student=<name>` cookie (set by a test harness on its browser
  // context) gives that browser its own progress, so several headless
  // students can walk a module on one server without unlocking each other's
  // lessons. No cookie means the single shared DEV_EMAIL identity.
  const devIdentity = (req) => {
    const m = /(?:^|;\s*)dev_student=([^;]+)/.exec(req.headers.cookie || '');
    return m ? decodeURIComponent(m[1]) : DEV_EMAIL;
  };
  server.get('/api/me', (req, res) => {
    res.json({ email: devIdentity(req), role: DEV_ROLE });
  });
  server.post('/api/auth/login', (req, res) => {
    res.json({ email: devIdentity(req), role: DEV_ROLE });
  });
  server.post('/api/auth/logout', (_req, res) => {
    res.json({ ok: true });
  });
  // Teacher gates (migrations/0016_lesson_modes.sql). Held in memory rather
  // than D1 because this server does not have a D1 binding; the real routes
  // are functions/api/classes/[id]/lesson-modes.ts and my-lesson-modes.ts.
  // POST here is dev-only and matches the real POST's body shape so the client
  // and the browser gate exercise the same path.
  const devLessonModes = { classDefault: null, lessons: {} };
  server.get('/api/my-lesson-modes', (_req, res) => {
    res.json(devLessonModes);
  });
  server.post('/api/dev/lesson-modes', express.json(), (req, res) => {
    const { lessonId, mode } = req.body || {};
    if (lessonId === '*') devLessonModes.classDefault = mode ?? null;
    else if (typeof lessonId === 'string') {
      if (mode) devLessonModes.lessons[lessonId] = mode;
      else delete devLessonModes.lessons[lessonId];
    }
    res.json({ ok: true, ...devLessonModes });
  });

  // Held in memory for the life of the process so `DEV_ROLE=student` walks a
  // module the way a student does: Submit turns the lesson green and the next
  // one unlocks after navigation. Before this, POST was a no-op and GET always
  // returned {}, so every lesson past the first read "Lesson locked" the
  // moment the page reloaded. Restarting the server is the reset.
  const devLessonStates = new Map();
  const devStateFor = (req) => {
    const id = devIdentity(req);
    if (!devLessonStates.has(id)) devLessonStates.set(id, { states: {}, scores: {} });
    return devLessonStates.get(id);
  };
  server.get('/api/lesson-state', (req, res) => {
    res.json({ ...devStateFor(req), role: DEV_ROLE });
  });
  server.post('/api/lesson-state/:lessonId', express.json(), (req, res) => {
    const st = devStateFor(req);
    const { lessonId } = req.params;
    const { state, score } = req.body || {};
    if (state === 'completed') {
      st.states[lessonId] = 'completed';
      if (typeof score === 'number') st.scores[lessonId] = score;
    } else if (state === 'started' && !st.states[lessonId]) {
      st.states[lessonId] = 'started';
    }
    res.json({ ok: true });
  });
  server.delete('/api/lesson-state/:lessonId', (req, res) => {
    const st = devStateFor(req);
    delete st.states[req.params.lessonId];
    delete st.scores[req.params.lessonId];
    res.json({ ok: true });
  });
  // Submit records a submission before it marks the lesson complete and
  // refuses to complete when that POST fails (LessonWorkspace.confirmSubmit),
  // so without this stub no graded lesson can ever turn green in dev. The
  // real route is functions/api/lesson-submissions.ts.
  const devSubmissions = [];
  server.get('/api/lesson-submissions', (req, res) => {
    const lessonId = req.query.lessonId;
    res.json({ submissions: devSubmissions.filter((s) => !lessonId || s.lessonId === lessonId) });
  });
  server.post('/api/lesson-submissions', express.json({ limit: '1mb' }), (req, res) => {
    const body = req.body || {};
    devSubmissions.push({ ...body, studentEmail: devIdentity(req), submittedAt: Date.now() });
    res.json({ ok: true, id: body.id });
  });
  // The student gradebook on /progress. The real route is
  // functions/api/my-gradebook.ts, reading lesson_state + lesson_submissions
  // out of D1, which this server does not have. Without a stub the page shows
  // its "could not load" card in dev and the table is unreviewable locally,
  // so this serves a fixture that hits every status the component renders --
  // including `pending` (grader outage) and a teacher override with feedback,
  // the two states that are hardest to produce on purpose against real data.
  server.get('/api/my-gradebook', async (_req, res) => {
    const day = 86400000;
    const now = Date.now();
    let ids = [];
    try {
      const raw = await fs.readFile(path.join(process.cwd(), 'public', 'lessons-manifest.json'), 'utf8');
      ids = JSON.parse(raw).lessons.filter((l) => l.type === 'assignment').slice(0, 5).map((l) => l.id);
    } catch {
      ids = [];
    }
    const base = {
      state: null, score: null, submittedScore: null, possible: null,
      late: false, pending: false, completedAt: null, submittedAt: null,
      teacherFeedback: null, teacherReviewedAt: null,
    };
    const fixtures = [
      { ...base, state: 'completed', score: 100, completedAt: now - 6 * day, due: now - 7 * day + day },
      { ...base, state: 'completed', score: 90, submittedScore: 18, possible: 20, completedAt: now - day, late: true, due: now - 3 * day },
      { ...base, state: 'completed', score: 75, submittedScore: 15, possible: 20, completedAt: now - 2 * day,
        teacherFeedback: 'Nice work on the nested loop. Next time give the counter a clearer name than i, and add a comment above draw() saying what it animates.',
        teacherReviewedAt: now - day, due: now - 2 * day },
      { ...base, pending: true, submittedAt: now - 3600000, due: now + 2 * day },
      { ...base, late: true, due: now - day },
    ];
    const cells = {};
    const dueDates = {};
    ids.forEach((id, i) => {
      const { due, ...cell } = fixtures[i];
      cells[id] = cell;
      if (due) dueDates[id] = due;
    });
    res.json({ cells, dueDates });
  });
  // Reference solutions (admin/teacher "View solution" button). Dev reads the
  // lesson straight from disk; the Pages Function serves the generated map.
  // Both must answer with the same shape, so this mirrors
  // functions/api/lesson-solution/[id].ts.
  //
  // It used to read solution.js and nothing else, so every lesson using the
  // solution/ DIRECTORY form 404'd locally while working in production --
  // 1.3.19, 7.1.1 and 1.6.1. That is the form CLAUDE.md documents for an
  // assignment grading more than one file, and it is also how a diagram
  // lesson stores its reference chart, so "no solution" in the browser meant
  // "not implemented in dev" rather than anything about the lesson.
  server.get('/api/lesson-solution/:id', async (req, res) => {
    // NOT decodeURIComponent(req.params.id) -- Express has ALREADY decoded the
    // param, so decoding again turns %252e%252e into .. after the router has
    // stopped looking. CLAUDE.md's always-decode rule is about Pages Functions,
    // which do not decode for you. Express does.
    const found = await readLessonSolution(req.params.id, LESSONS_ROOT());
    if (!found) return res.status(404).json({ error: 'No solution for this lesson' });
    res.json(found);
  });

  // Scope express.json() to the Express-owned route only. Applying it globally
  // consumes the request body stream, which breaks Next App Router route
  // handlers (they need to read the raw body themselves).
  server.post('/api/grade', express.json(), async (req, res) => {
    const { lessonId, files } = req.body;
    try {
      // Same traversal guard as /api/lesson-solution. lessonId arrives in a
      // JSON body here rather than the path, which makes it MORE attacker-
      // shaped, not less -- nothing upstream normalises it at all.
      const lessonDir = await resolveLessonDir(lessonId);
      if (!lessonDir) return res.status(404).json({ error: 'No such lesson' });
      const meta = JSON.parse(
        await fs.readFile(path.join(lessonDir, 'lesson.json'), 'utf8')
      );
      const passingScore = meta.grading?.passingScore || 0;

      const results = (meta.requirements || []).map((r) => {
        const type = r.type || 'regex';
        let passed = false;

        // Default flags is '' (case-sensitive). Set "flags": "i" explicitly
        // in lesson.json if you want case-insensitive matching — moSHion
        // identifiers like Canvas / Sprite / kb / world are case-sensitive
        // so the default must be strict.
        const flags = r.flags ?? '';

        if (type === 'regex') {
          const raw = files?.[r.file] || '';
          const content = r.stripComments === false ? raw : stripJsComments(raw);
          const regex = new RegExp(r.pattern, flags);
          passed = regex.test(content);
        } else if (type === 'inFunction') {
          // Scope the pattern to the named function's body. Use this for
          // checks like "background() must be called inside draw()".
          const raw = files?.[r.file] || '';
          const content = stripJsComments(raw);
          const body = extractFunctionBody(content, r.function || 'draw');
          if (body !== null) {
            const regex = new RegExp(r.pattern, flags);
            passed = regex.test(body);
          }
        }
        // output and function types are handled client-side via Web Worker

        const points = r.points || 0;
        return {
          id: r.id,
          title: r.title,
          status: passed ? 'passed' : 'failed',
          messages: passed ? [] : [r.description],
          pointsEarned: passed ? points : 0,
          pointsPossible: points,
        };
      });

      const totalScore = results.reduce((sum, r) => sum + r.pointsEarned, 0);
      const totalPossible = results.reduce((sum, r) => sum + r.pointsPossible, 0);

      res.json({
        results,
        totalScore,
        totalPossible,
        passed: totalScore >= passingScore,
        passingScore,
      });
    } catch {
      res.json({ results: [], totalScore: 0, totalPossible: 0, passed: false, passingScore: 0 });
    }
  });

  // ---- Dev-only issue-report + upload stubs ------------------------------
  // functions/api/issue-reports/** and functions/api/uploads/** are Pages
  // Functions with D1 and R2 bindings, so like the auth stubs above they do
  // not run here. Held in memory: restarting the server empties the queue,
  // which is what you want when reviewing the form rather than the data.
  //
  // These mirror the real routes' SHAPES, not their security. The real ones
  // sniff magic bytes, enforce quotas, check upload ownership, and gate on
  // session role; none of that is repeated here, because there is no session
  // and no other user to protect anything from. Do not read this as a second
  // implementation to keep in sync -- it exists so the Report an issue button
  // and /teacher/issues can be clicked through without wrangler.
  const devIssues = [];
  const devUploads = new Map();
  let devIssueSeq = 0;
  let devUploadSeq = 0;
  // key `${reportId}|${email}` -> 1 | -1. The real store is
  // migrations/0021_issue_report_votes.sql, keyed the same way so one person
  // can hold at most one vote per report.
  const devVotes = new Map();

  function devTally(reportId) {
    let up = 0;
    let down = 0;
    let myVote = 0;
    for (const [key, vote] of devVotes) {
      const [id, email] = key.split('|');
      if (Number(id) !== reportId) continue;
      if (vote === 1) up++;
      else down++;
      if (email === DEV_EMAIL) myVote = vote;
    }
    return { up, down, myVote };
  }

  server.post('/api/uploads', express.raw({ type: '*/*', limit: '4mb' }), (req, res) => {
    if (!req.body || !req.body.length) return res.status(400).json({ error: 'That file is empty.' });
    devUploadSeq++;
    // Shaped like the real 32-hex CSPRNG id so isUploadId() would accept it.
    const id = devUploadSeq.toString(16).padStart(32, 'a');
    const type = req.headers['content-type'] || 'image/png';
    devUploads.set(id, { buf: req.body, type });
    res.status(201).json({ id, url: '/uploads/' + id + '.png', filename: 'dev', contentType: type, bytes: req.body.length });
  });

  server.delete('/api/uploads/:id', (req, res) => {
    const had = devUploads.delete(req.params.id);
    console.log('  [dev] upload delete ' + req.params.id + (had ? ' -> gone' : ' -> was not there'));
    if (!had) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: req.params.id });
  });

  server.get('/uploads/:name', (req, res) => {
    const item = devUploads.get(String(req.params.name).split('.')[0]);
    if (!item) return res.status(404).send('Not found');
    res.set('Content-Type', item.type).set('X-Content-Type-Options', 'nosniff').send(item.buf);
  });

  server.get('/api/issue-reports', (req, res) => {
    const sorted = [...devIssues].sort((a, b) => b.created_at - a.created_at);
    if (req.query.format === 'md' && DEV_ROLE === 'student') {
      return res.status(403).json({ error: 'Staff only' });
    }
    if (req.query.format === 'md') {
      const lines = ['# Issue reports (dev server)', ''];
      for (const r of sorted) {
        lines.push('## #' + r.id + ' [' + r.kind.toUpperCase() + '] ' + (r.title || ''), '', r.message, '');
      }
      return res
        .set('Content-Type', 'text/markdown; charset=utf-8')
        .set('Content-Disposition', 'attachment; filename="issue-reports-dev.md"')
        .send(lines.join('\n'));
    }
    if (DEV_ROLE === 'student') {
      // context_json is a string in D1; the dev store already holds it parsed,
      // so re-serialise before handing it to the real publicReport().
      const rows = sorted.map((r) => ({ ...r, context_json: r.context ? JSON.stringify(r.context) : null }));
      const visible = rows.filter((r) => visibleToStudent(r, DEV_EMAIL));
      return res.json({ reports: rankReports(visible.map((r) => publicReport(r, devTally(r.id), DEV_EMAIL))) });
    }

    res.json({ reports: sorted.map((r) => { const t = devTally(r.id); return { ...r, ...t, score: t.up - t.down }; }) });
  });

  server.post('/api/issue-reports/:id/vote', express.json(), (req, res) => {
    const id = Number(req.params.id);
    const report = devIssues.find((x) => x.id === id);
    if (!report) return res.status(404).json({ error: 'Report not found' });
    const { vote } = req.body || {};
    if (vote !== 1 && vote !== -1 && vote !== 0) {
      return res.status(400).json({ error: 'vote must be one of: 1, -1, 0' });
    }
    const key = id + '|' + DEV_EMAIL;
    if (vote === 0) devVotes.delete(key);
    else devVotes.set(key, vote);
    const t = devTally(id);
    res.json({ ok: true, id, up: t.up, down: t.down, score: t.up - t.down, myVote: vote });
  });

  server.post('/api/issue-reports', express.json({ limit: '1mb' }), (req, res) => {
    const { kind, title, message, context, screenshotId } = req.body || {};
    if (!['bug', 'quirk', 'enhancement'].includes(kind)) {
      return res.status(400).json({ error: 'kind must be one of: bug, quirk, enhancement' });
    }
    // Same two guards the real route applies, because they are the two the
    // form can actually trip and you want to see the error rendering.
    if (typeof title !== 'string' || title.trim().length < 3) {
      return res.status(400).json({ error: 'Please give this a short title (at least 3 characters).' });
    }
    if (typeof message !== 'string' || message.trim().length < 3) {
      return res.status(400).json({ error: 'Please describe the issue (at least 3 characters).' });
    }
    devIssueSeq++;
    devIssues.push({
      id: devIssueSeq,
      reporter_email: 'dev@local',
      kind,
      title: title.trim(),
      message: message.trim(),
      status: 'open',
      triaged_by: null,
      triaged_at: null,
      context: context ?? null,
      screenshot_id: screenshotId ?? null,
      screenshot_shared: 0,
      withdrawn_at: null,
      created_at: Date.now(),
    });
    console.log('  [dev] issue #' + devIssueSeq + ' [' + kind + '] ' + title.trim());
    res.status(201).json({ id: devIssueSeq, ok: true });
  });

  server.post('/api/issue-reports/:id/status', express.json(), (req, res) => {
    const r = devIssues.find((x) => x.id === Number(req.params.id));
    if (!r) return res.status(404).json({ error: 'Report not found' });
    const { status } = req.body || {};
    if (!['open', 'in-progress', 'fixed', 'deferred'].includes(status)) {
      return res.status(400).json({ error: 'status must be one of: open, in-progress, fixed, deferred' });
    }
    r.status = status;
    r.triaged_by = 'dev@local';
    r.triaged_at = Date.now();
    res.json({ ok: true, id: r.id, status });
  });

  server.post('/api/issue-reports/:id/withdraw', express.json(), (req, res) => {
    const r = devIssues.find((x) => x.id === Number(req.params.id));
    if (!r) return res.status(404).json({ error: 'Report not found' });
    const { withdrawn } = req.body || {};
    if (typeof withdrawn !== 'boolean') {
      return res.status(400).json({ error: 'withdrawn must be a boolean' });
    }
    // Dev stub has one identity (DEV_EMAIL) and no other reporter to be
    // blocked from withdrawing someone else's report, unlike the real route.
    r.withdrawn_at = withdrawn ? Date.now() : null;
    res.json({ ok: true, id: r.id, withdrawn });
  });

  server.post('/api/issue-reports/:id/share-screenshot', express.json(), (req, res) => {
    if (DEV_ROLE === 'student') return res.status(403).json({ error: 'Staff only' });
    const r = devIssues.find((x) => x.id === Number(req.params.id));
    if (!r) return res.status(404).json({ error: 'Report not found' });
    const { shared } = req.body || {};
    if (typeof shared !== 'boolean') {
      return res.status(400).json({ error: 'shared must be a boolean' });
    }
    if (!r.screenshot_id) return res.status(400).json({ error: 'This report has no screenshot to share.' });
    r.screenshot_shared = shared ? 1 : 0;
    res.json({ ok: true, id: r.id, shared });
  });

  server.delete('/api/issue-reports/:id', (req, res) => {
    const i = devIssues.findIndex((x) => x.id === Number(req.params.id));
    if (i === -1) return res.status(404).json({ error: 'Report not found' });
    const [gone] = devIssues.splice(i, 1);
    let screenshotDeleted = false;
    if (gone.screenshot_id) screenshotDeleted = devUploads.delete(gone.screenshot_id);
    console.log('  [dev] issue #' + gone.id + ' deleted' + (screenshotDeleted ? ' (+ screenshot)' : ''));
    res.json({ deleted: gone.id, screenshotDeleted });
  });

  server.all('*', (req, res) => {
    return handle(req, res);
  });

  const port = process.env.PORT || 3002;
  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
