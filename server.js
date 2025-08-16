import express from 'express';
import next from 'next';
import fs from 'fs/promises';
import path from 'path';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = express();
  server.use(express.json());

  server.post('/api/grade', async (req, res) => {
    const { lessonId, files } = req.body;
    try {
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

  server.all('*', (req, res) => {
    return handle(req, res);
  });

  const port = process.env.PORT || 3000;
  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
