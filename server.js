import express from 'express';
import next from 'next';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = express();
  server.use(express.json());

  server.post('/api/grade', (req, res) => {
    const { lessonId, files } = req.body;
    let results = [];
    if (lessonId === 'html-intro') {
      const html = files?.['index.html'] || '';
      const js = files?.['script.js'] || '';
      const hasH1 = /<h1>.*<\/h1>/i.test(html);
      const hasLog = /console\.log\(['\"]hi['\"]\)/.test(js);
      results.push({
        id: 'req1',
        status: hasH1 ? 'passed' : 'failed',
        messages: hasH1 ? [] : ['Missing <h1> tag'],
      });
      results.push({
        id: 'req2',
        status: hasLog ? 'passed' : 'failed',
        messages: hasLog ? [] : ['Missing console.log("hi")'],
      });
    }
    res.json(results);
  });

  server.all('*', (req, res) => {
    return handle(req, res);
  });

  const port = process.env.PORT || 3000;
  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
