// Serves the harness the way Cloudflare Pages would serve the real site, so the
// sandboxed iframe sees what it would in production.
//   node serve.mjs [port] [--no-cors]
// /vendor/jolt/*  -> node_modules/jolt-physics/dist/*   (the files we would ship)
// With CORS on, /vendor/* gets the same two headers public/_headers gives
// /reshape/kernel/*. --no-cors leaves them off, to reproduce the failure.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(here, '..', 'node_modules', 'jolt-physics', 'dist');
const port = Number(process.argv.find((a) => /^\d+$/.test(a)) ?? 38476);
const cors = !process.argv.includes('--no-cors');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.wasm': 'application/wasm' };

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  let file;
  if (url.pathname.startsWith('/vendor/jolt/')) file = path.join(dist, path.basename(url.pathname));
  else file = path.join(here, url.pathname === '/' ? 'harness.html' : path.basename(url.pathname));
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); return res.end('not found'); }
  const headers = { 'Content-Type': MIME[path.extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' };
  if (cors && url.pathname.startsWith('/vendor/')) {
    headers['Access-Control-Allow-Origin'] = '*';
    headers['Cross-Origin-Resource-Policy'] = 'cross-origin';
  }
  res.writeHead(200, headers);
  fs.createReadStream(file).pipe(res);
}).listen(port, '127.0.0.1', () => console.log(`serving on http://127.0.0.1:${port}/  (cors ${cors ? 'ON' : 'OFF'})`));
