import express from 'express';
import next from 'next';
import fs from 'fs/promises';
import path from 'path';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

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

        if (type === 'regex') {
          const raw = files?.[r.file] || '';
          const content = stripJsComments(raw);
          const regex = new RegExp(r.pattern, r.flags || 'i');
          passed = regex.test(content);
        }
        // output and function types are handled client-side via Web Worker

        const points = r.points || 0;
        return {
          id: r.id,
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
