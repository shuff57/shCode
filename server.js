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
      const passingScore = meta.grading?.passingScore || 0;

      const results = (meta.requirements || []).map((r) => {
        const type = r.type || 'regex';
        let passed = false;

        if (type === 'regex') {
          const content = files?.[r.file] || '';
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
