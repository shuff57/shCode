// Tiny local control server for dispatch-wire.html. No deps -- node:http only.
// Gives the page three things a static file can never have: live polling of .msgbox
// (no manual regen step), buttons to launch/kill a dispatch, and the launched
// process's raw stdout/stderr streamed back for viewing in the page.
//
//   node .msgbox/wire-server.mjs [port]   (default 4173)
//
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn, exec } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.dirname(DIR);
const HANDOFF = path.join(os.homedir(), '.claude', 'bin', 'handoff.mjs');
const PORT = Number(process.argv[2]) || 4173;
const LOG_CAP = 200_000; // chars kept per dispatch's captured output

// spec -> { pid, child, spec, model, startedAt, log: string, running: bool }
const running = new Map();

function readJsonl(p, src) {
  if (!fs.existsSync(p)) return [];
  return fs.readFileSync(p, 'utf8').trim().split('\n').filter(Boolean).map((l) => ({ ...JSON.parse(l), src }));
}

function currentEntries() {
  const log = readJsonl(path.join(DIR, 'log.jsonl'), 'log');
  const events = readJsonl(path.join(DIR, 'events.jsonl'), 'events');
  return [...log, ...events].sort((a, b) => new Date(a.ts) - new Date(b.ts));
}

function resolveSpec(spec) {
  const p = path.isAbsolute(spec) ? spec : path.join(REPO_ROOT, spec);
  return p.replace(/\\/g, '/');
}

function launch(spec, model, variant) {
  const resolved = resolveSpec(spec);
  if (!fs.existsSync(resolved)) return { ok: false, error: `spec not found: ${resolved}` };
  if (running.has(resolved) && running.get(resolved).running) return { ok: false, error: 'already running' };

  const args = [HANDOFF, '--spec', resolved, '--model', model || 'ollama-cloud/glm-5.3-flash'];
  if (variant) args.push('--variant', variant);
  const child = spawn('node', args, { cwd: REPO_ROOT, stdio: ['ignore', 'pipe', 'pipe'] });

  const rec = { pid: child.pid, child, spec: resolved, model, startedAt: new Date().toISOString(), log: '', running: true };
  running.set(resolved, rec);

  const append = (buf) => {
    rec.log += buf.toString();
    if (rec.log.length > LOG_CAP) rec.log = rec.log.slice(-LOG_CAP);
  };
  child.stdout.on('data', append);
  child.stderr.on('data', append);
  child.on('exit', () => { rec.running = false; });

  return { ok: true, pid: child.pid };
}

function kill(spec) {
  const resolved = resolveSpec(spec);
  const rec = running.get(resolved);
  if (!rec || !rec.running) return { ok: false, error: 'not running here' };
  return new Promise((resolve) => {
    exec(`taskkill /PID ${rec.pid} /T /F`, (err) => {
      rec.running = false;
      resolve(err ? { ok: false, error: String(err) } : { ok: true });
    });
  });
}

function reply(text) {
  return new Promise((resolve) => {
    const msg = path.join(os.homedir(), '.claude', 'bin', 'msg.mjs');
    exec(`node "${msg}" send --from claude --to opencode --re last --text ${JSON.stringify(text)}`, { cwd: REPO_ROOT }, (err, stdout, stderr) => {
      resolve(err ? { ok: false, error: String(err), stderr } : { ok: true, stdout });
    });
  });
}

function send(res, code, body, type = 'application/json') {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(type === 'application/json' ? JSON.stringify(body) : body);
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => { data += c; });
    req.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch { resolve({}); } });
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === 'GET' && url.pathname === '/') {
    return send(res, 200, fs.readFileSync(path.join(DIR, 'dispatch-wire.html'), 'utf8'), 'text/html');
  }

  if (req.method === 'GET' && url.pathname === '/api/state') {
    return send(res, 200, {
      entries: currentEntries(),
      running: [...running.values()].filter((r) => r.running).map((r) => ({ spec: r.spec, pid: r.pid, model: r.model, startedAt: r.startedAt })),
    });
  }

  if (req.method === 'GET' && url.pathname === '/api/log') {
    const spec = resolveSpec(url.searchParams.get('spec') || '');
    const rec = running.get(spec);
    return send(res, 200, { log: rec ? rec.log : '', running: rec ? rec.running : false });
  }

  if (req.method === 'POST' && url.pathname === '/api/dispatch') {
    const { spec, model, variant } = await readBody(req);
    if (!spec) return send(res, 400, { ok: false, error: 'spec required' });
    return send(res, 200, launch(spec, model, variant));
  }

  if (req.method === 'POST' && url.pathname === '/api/kill') {
    const { spec } = await readBody(req);
    return send(res, 200, await kill(spec || ''));
  }

  if (req.method === 'POST' && url.pathname === '/api/reply') {
    const { text } = await readBody(req);
    if (!text) return send(res, 400, { ok: false, error: 'text required' });
    return send(res, 200, await reply(text));
  }

  send(res, 404, { ok: false, error: 'not found' });
});

server.listen(PORT, () => {
  console.log(`Dispatch Wire control server: http://localhost:${PORT}`);
  console.log(`repo root: ${REPO_ROOT}`);
  console.log(`handoff:   ${HANDOFF}`);
});
