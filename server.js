import express from 'express';
import next from 'next';
import fs from 'fs/promises';
import path from 'path';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

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

  // ---- Dev-only auth + lesson-state stubs --------------------------------
  // The real /api/auth/* and /api/lesson-state* are Cloudflare Pages
  // Functions (functions/api/**), which this local Express server does NOT
  // emulate. Without these stubs every lesson past the first in a module
  // renders "Lesson locked" because the client sees role=null. Production
  // (Cloudflare Pages) ignores this file entirely — dev convenience only.
  server.get('/api/me', (_req, res) => {
    res.json({ email: 'dev@local', role: 'teacher' });
  });
  server.post('/api/auth/login', (_req, res) => {
    res.json({ email: 'dev@local', role: 'teacher' });
  });
  server.post('/api/auth/logout', (_req, res) => {
    res.json({ ok: true });
  });
  server.get('/api/lesson-state', (_req, res) => {
    res.json({ states: {}, scores: {}, role: 'teacher' });
  });
  server.post('/api/lesson-state/:lessonId', (_req, res) => {
    res.json({ ok: true });
  });
  // Reference solutions (admin/teacher "View solution" button). Serves the
  // same map the Pages Function reads, so the sandbox's solution panel works
  // locally.
  // Reference solutions (admin/teacher "View solution" button). Dev reads the
  // lesson's solution.js straight from disk; the Pages Function serves the
  // generated map instead.
  server.get('/api/lesson-solution/:id', async (req, res) => {
    const id = decodeURIComponent(req.params.id);
    try {
      const solution = await fs.readFile(path.join(process.cwd(), 'lessons', id, 'solution.js'), 'utf8');
      res.json({ solution });
    } catch {
      res.status(404).json({ error: 'No solution for this lesson' });
    }
  });

  // Scope express.json() to the Express-owned route only. Applying it globally
  // consumes the request body stream, which breaks Next App Router route
  // handlers (they need to read the raw body themselves).
  server.post('/api/grade', express.json(), async (req, res) => {
    const { lessonId, files } = req.body;
    try {
      const lessonDir = path.join(process.cwd(), 'lessons', lessonId);
      const meta = JSON.parse(
        await fs.readFile(path.join(lessonDir, 'lesson.json'), 'utf8')
      );
      const passingScore = meta.grading?.passingScore || 0;

      const results = (meta.requirements || []).map((r) => {
        const type = r.type || 'regex';
        let passed = false;

        // Default flags is '' (case-sensitive). Set "flags": "i" explicitly
        // in lesson.json if you want case-insensitive matching — shPlay
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

  server.all('*', (req, res) => {
    return handle(req, res);
  });

  const port = process.env.PORT || 3002;
  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
