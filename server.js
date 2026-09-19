import express from 'express';
import next from 'next';
import fs from 'fs/promises';
import path from 'path';
import {
  checkCode,
  cookieName,
  isSafeLessonId,
  isUnlocked,
  parseCookies,
  readLock,
} from './lib/lock.js';

// An unlock lasts one school day, so a lesson re-locks itself overnight.
const UNLOCK_MS = 8 * 60 * 60 * 1000;

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = express();
  server.use(express.json());

  server.post('/api/grade', async (req, res) => {
    const { lessonId, files } = req.body;
    // lessonId reaches the filesystem below, so never trust it raw.
    if (!isSafeLessonId(lessonId)) return res.status(400).json([]);
    try {
      const cookies = parseCookies(req.headers.cookie);
      if (!(await isUnlocked(lessonId, cookies[cookieName(lessonId)]))) {
        return res.status(403).json([]);
      }
      const lessonDir = path.join(process.cwd(), 'lessons', lessonId);
      const meta = JSON.parse(
        await fs.readFile(path.join(lessonDir, 'lesson.json'), 'utf8')
      );
      const results = (meta.requirements || []).map((r) => {
        const content = files?.[r.file] || '';
        const regex = new RegExp(r.pattern, r.flags || 'i');
        const passed = regex.test(content);
        return {
          id: r.id,
          status: passed ? 'passed' : 'failed',
          messages: passed ? [] : [r.description],
        };
      });
      res.json(results);
    } catch {
      res.json([]);
    }
  });

  // Lives here rather than in an app/api route because express.json() above
  // drains the request body before Next ever sees it.
  server.post('/api/unlock', async (req, res) => {
    const { lessonId, code } = req.body || {};
    if (!isSafeLessonId(lessonId)) {
      return res.status(400).json({ ok: false, message: 'Unknown lesson.' });
    }

    const { locked, unlockCode } = await readLock(lessonId);
    if (locked && !unlockCode) {
      return res.status(403).json({
        ok: false,
        message: 'This lesson is closed. Your teacher has to open it.',
      });
    }

    const { ok, token } = await checkCode(lessonId, code);
    if (!ok) {
      // Slow down anyone working through the keyspace.
      await new Promise((resolve) => setTimeout(resolve, 500));
      return res.status(403).json({
        ok: false,
        message: 'That code is not right. Check it and try again.',
      });
    }

    if (token) {
      res.cookie(cookieName(lessonId), token, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        // Flagged secure only when the request already is, so this still works
        // on a plain-http classroom server.
        secure: req.secure || req.headers['x-forwarded-proto'] === 'https',
        maxAge: UNLOCK_MS,
      });
    }
    res.json({ ok: true });
  });

  server.all('*', (req, res) => {
    return handle(req, res);
  });

  const port = process.env.PORT || 3000;
  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
