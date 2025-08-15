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
    } else if (lessonId === 'basic-html') {
      const html = files?.['index.html'] || '';
      const hasH1 = /<h1[^>]*>.*<\/h1>/i.test(html);
      const hasP = /<p[^>]*>.*<\/p>/i.test(html);
      results.push({
        id: 'req1',
        status: hasH1 ? 'passed' : 'failed',
        messages: hasH1 ? [] : ['Missing <h1> element'],
      });
      results.push({
        id: 'req2',
        status: hasP ? 'passed' : 'failed',
        messages: hasP ? [] : ['Missing <p> element'],
      });
    } else if (lessonId === 'debug-camper-bot') {
      const html = files?.['index.html'] || '';
      const js = files?.['script.js'] || '';
      const hasAlt = /<img[^>]*alt=['"]Camper Bot['"][^>]*>/i.test(html);
      const hasLog = /console\.log\(['"]Camper Bot ready['"]\)/.test(js);
      results.push({
        id: 'req1',
        status: hasAlt ? 'passed' : 'failed',
        messages: hasAlt ? [] : ['Image missing alt="Camper Bot"'],
      });
      results.push({
        id: 'req2',
        status: hasLog ? 'passed' : 'failed',
        messages: hasLog ? [] : ['Missing console.log("Camper Bot ready")'],
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
