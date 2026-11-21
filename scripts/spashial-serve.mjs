#!/usr/bin/env node
// Serve public/ for working on spaSHial, the way Cloudflare Pages would serve it:
//   node scripts/spashial-serve.mjs [port]      then open /spashial/sandbox.html
//
// It applies the same two headers public/_headers gives /spashial/* (the preview iframe
// is sandboxed with an opaque origin, so its module and wasm fetches are CORS requests),
// and serves .wasm as application/wasm. Run `node scripts/build-spashial-vendor.mjs` first.
// A plain `python -m http.server` will NOT do: without the headers the engine cannot load.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const pub = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const port = Number(process.argv[2] ?? 38477);
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.wasm': 'application/wasm', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml',
};

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  let file = path.normalize(path.join(pub, decodeURIComponent(url.pathname)));
  if (!file.startsWith(pub)) { res.writeHead(403); return res.end('forbidden'); }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) { res.writeHead(404); return res.end('not found'); }
  const headers = { 'Content-Type': MIME[path.extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' };
  if (url.pathname.startsWith('/spashial/')) {
    headers['Access-Control-Allow-Origin'] = '*';
    headers['Cross-Origin-Resource-Policy'] = 'cross-origin';
  }
  res.writeHead(200, headers);
  fs.createReadStream(file).pipe(res);
}).listen(port, '127.0.0.1', () => console.log(`http://127.0.0.1:${port}/spashial/sandbox.html`));
