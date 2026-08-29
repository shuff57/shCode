// Pull the student issue queue out of the deployed app and hand it to a
// coding agent — Claude Code or opencode — then triage or delete from here.
//
// The teacher page at /teacher/issues is the place to READ reports. This is
// the place to ACT on a batch of them: it writes one spec file, drops a note
// in the cross-CLI message center so either agent picks it up, and can flip
// statuses or delete noise afterwards without leaving the terminal.
//
//   node scripts/pull-issues.mjs                     open reports -> ISSUES.md -> msgbox
//   node scripts/pull-issues.mjs --all               include triaged ones too
//   node scripts/pull-issues.mjs --list              print a table, write nothing
//   node scripts/pull-issues.mjs --dispatch opencode ...and launch a build on it
//   node scripts/pull-issues.mjs --close 8,11        mark those fixed
//   node scripts/pull-issues.mjs --status deferred --ids 4
//   node scripts/pull-issues.mjs --delete 12,13      permanent, takes screenshots
//
// Auth is a real login against the deployed API, because every issue-report
// route sits behind functions/_middleware.ts. Put the credentials in the
// environment, never on the command line — argv is visible to every other
// process on the box and lands in your shell history:
//
//   export SHCODE_EMAIL=you@example.org
//   export SHCODE_PASSWORD=...
//   export SHCODE_BASE=https://shcode.pages.dev   # or http://localhost:8789
//
// The account has to be teacher or admin. GET /api/issue-reports returns 403
// for a student, and so does DELETE.

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { homedir } from 'node:os';

const DEFAULT_BASE = 'https://shcode.pages.dev';
const MSG = resolve(homedir(), '.claude/bin/msg.mjs');
const HANDOFF = resolve(homedir(), '.claude/bin/handoff.mjs');

// ---------------------------------------------------------------------------
// args
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const out = { flags: new Set(), opts: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      out.opts[key] = next;
      i++;
    } else {
      out.flags.add(key);
    }
  }
  return out;
}

/** "8, 11,11" -> [8, 11]. Throws on anything that is not a positive integer,
 *  rather than silently sending NaN to a DELETE. */
function parseIds(raw) {
  const ids = [];
  for (const part of String(raw).split(',')) {
    const t = part.trim();
    if (!t) continue;
    const n = Number(t);
    if (!Number.isInteger(n) || n <= 0) die(`Not a report id: "${t}"`);
    if (!ids.includes(n)) ids.push(n);
  }
  if (ids.length === 0) die('No report ids given.');
  return ids;
}

function die(msg) {
  console.error(`pull-issues: ${msg}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// session
// ---------------------------------------------------------------------------

/**
 * Log in and keep the session cookie. Returns a fetch wrapper that carries it.
 *
 * The cookie is read from Set-Cookie rather than assembled by hand: its name
 * lives in functions/_shared/auth.ts and duplicating it here is how this
 * script would break silently the day it changes.
 */
async function signIn(base) {
  const email = process.env.SHCODE_EMAIL;
  const password = process.env.SHCODE_PASSWORD;
  if (!email || !password) {
    die('Set SHCODE_EMAIL and SHCODE_PASSWORD in the environment first.');
  }

  const res = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    redirect: 'manual',
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    die(`Login failed (HTTP ${res.status}). ${body.slice(0, 200)}`);
  }

  const setCookies = res.headers.getSetCookie?.() ?? [];
  const cookie = setCookies.map((c) => c.split(';')[0]).join('; ');
  if (!cookie) die('Login succeeded but returned no session cookie.');

  const who = await res.json().catch(() => ({}));
  if (who.role !== 'teacher' && who.role !== 'admin') {
    die(`Account ${who.email} has role "${who.role}". Issue reports are staff only.`);
  }
  console.log(`signed in as ${who.email} (${who.role})`);

  return async function api(path, init = {}) {
    const r = await fetch(`${base}${path}`, {
      ...init,
      headers: { ...(init.headers || {}), Cookie: cookie },
    });
    return r;
  };
}

async function readError(res) {
  try {
    const b = await res.json();
    return b.error || `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
}

// ---------------------------------------------------------------------------
// spec rendering
// ---------------------------------------------------------------------------

const FENCE = '```';

function headline(r) {
  const t = (r.title || '').trim();
  if (t) return t;
  const first = String(r.message || '').split('\n')[0].trim();
  return first.slice(0, 120) || '(no text)';
}

/**
 * The work order. Same shape as the teacher page's "Copy for agent" button and
 * the ?format=md export, with one addition that matters for an unattended
 * build: an explicit instruction to report per-id rather than summarise, so
 * the reply can be matched back to reports when it is time to close them.
 *
 * Concatenation, not template literals, because the body embeds code fences.
 */
function renderSpec(reports, base) {
  const out = [
    '# shCode issue reports',
    '',
    'Filed by students from the "Report an issue" button in the app.',
    '',
    '## How to work this',
    '',
    '- Reproduce each report if you can, then fix the ROOT CAUSE.',
    '- Do not change anything a report does not touch. No opportunistic refactors.',
    '- If a report is not actionable, say so and why. Do not guess at a fix.',
    '- Report back per id, in the form "#12: fixed — <what changed>" or',
    '  "#12: not actionable — <why>". Those lines are how the reports get closed.',
    '- Run `npm test` before you reply. It is a long suite; all of it must pass.',
    '',
    'Base URL for anything you need to fetch: ' + base,
    '',
    '---',
    '',
  ];

  for (const r of reports) {
    const c = r.context || {};
    out.push('## #' + r.id + ' [' + r.kind + '] ' + headline(r), '');
    out.push('- status: ' + r.status);
    out.push('- reporter: ' + r.reporter_email);
    out.push('- filed: ' + new Date(r.created_at).toISOString());
    if (c.path) out.push('- page: ' + c.path);
    if (c.lessonId) {
      out.push('- lesson: ' + c.lessonId + (c.lessonTitle ? ' (' + c.lessonTitle + ')' : ''));
    }
    if (c.currentFile) out.push('- file open: ' + c.currentFile);
    if (c.userAgent) out.push('- browser: ' + c.userAgent);
    if (r.screenshot_id) out.push('- screenshot: ' + base + '/uploads/' + r.screenshot_id + '.png');
    out.push('', '### What they said', '', String(r.message || '').trim(), '');

    if (typeof c.currentFileContent === 'string' && c.currentFileContent) {
      out.push('### Their code at the time', '', FENCE, c.currentFileContent, FENCE);
      if (c.currentFileContentTruncated) out.push('', '(snapshot was truncated)');
      out.push('');
    }
    out.push('---', '');
  }

  return out.join('\n');
}

function table(reports) {
  if (reports.length === 0) return '  (none)';
  return reports
    .map((r) => {
      const id = String(r.id).padStart(4);
      const kind = r.kind.padEnd(11);
      const status = r.status.padEnd(11);
      return `  ${id}  ${kind}  ${status}  ${headline(r).slice(0, 60)}`;
    })
    .join('\n');
}

// ---------------------------------------------------------------------------
// side effects
// ---------------------------------------------------------------------------

/** Fire-and-report: a missing msg.mjs is a warning, not a failed pull. */
function sendToMsgbox(specPath, count) {
  const text =
    `${count} shCode issue report(s) pulled from the student queue. ` +
    `Full work order with reproduction context: ${specPath}. ` +
    'Reply per id ("#12: fixed — ...") so they can be closed.';
  const r = spawnSync(
    process.execPath,
    [MSG, 'send', '--from', 'claude', '--to', 'opencode', '--text', text],
    { stdio: 'inherit' },
  );
  if (r.status !== 0) {
    console.warn(`  ! msgbox send failed (exit ${r.status}) — spec file is still on disk`);
    return false;
  }
  return true;
}

/**
 * Dispatch through handoff.mjs, never a bare `opencode run`. The wrapper is
 * what refuses to launch on an unresolvable spec path, puts the task in the
 * prompt instead of behind an inbox read, and exits non-zero when a run
 * finishes cleanly having done nothing. See ~/.claude/CLAUDE.md.
 */
function dispatch(specPath) {
  console.log(`  dispatching via handoff.mjs -> ${specPath}`);
  const r = spawnSync(
    process.execPath,
    [HANDOFF, '--spec', specPath, '--note', 'shCode student issue reports; reply per id.'],
    { stdio: 'inherit' },
  );
  if (r.status !== 0) die(`handoff.mjs exited ${r.status} — the run did nothing useful.`);
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main() {
  const { flags, opts } = parseArgs(process.argv.slice(2));
  const base = (opts.base || process.env.SHCODE_BASE || DEFAULT_BASE).replace(/\/+$/, '');
  const api = await signIn(base);

  // --- write actions first: they are the reason you ran this a second time ---

  if (opts.delete) {
    const ids = parseIds(opts.delete);
    console.log(`deleting ${ids.length} report(s) — permanent, screenshots included`);
    for (const id of ids) {
      const res = await api(`/api/issue-reports/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        console.error(`  #${id}  FAILED: ${await readError(res)}`);
        continue;
      }
      const body = await res.json().catch(() => ({}));
      console.log(`  #${id}  deleted${body.screenshotDeleted ? ' (+ screenshot)' : ''}`);
    }
    return;
  }

  if (opts.close || opts.status) {
    const status = opts.status || 'fixed';
    const ids = parseIds(opts.close || opts.ids || die('--status needs --ids'));
    console.log(`setting ${ids.length} report(s) to "${status}"`);
    for (const id of ids) {
      const res = await api(`/api/issue-reports/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      console.log(`  #${id}  ${res.ok ? status : 'FAILED: ' + (await readError(res))}`);
    }
    return;
  }

  // --- read path ---

  const res = await api('/api/issue-reports');
  if (!res.ok) die(`Could not read the queue: ${await readError(res)}`);
  const all = (await res.json()).reports || [];
  const reports = flags.has('all') ? all : all.filter((r) => r.status === 'open');

  const counts = ['open', 'in-progress', 'fixed', 'deferred']
    .map((s) => `${s} ${all.filter((r) => r.status === s).length}`)
    .join(' · ');
  console.log(`${all.length} report(s) total — ${counts}`);
  console.log(`${reports.length} selected${flags.has('all') ? ' (--all)' : ' (open only)'}:`);
  console.log(table(reports));

  if (flags.has('list')) return;
  if (reports.length === 0) {
    console.log('nothing to hand off.');
    return;
  }

  const outPath = resolve(process.cwd(), opts.out || 'ISSUES.md');
  writeFileSync(outPath, renderSpec(reports, base), 'utf8');
  console.log(`wrote ${outPath}`);

  if (!flags.has('no-msg')) sendToMsgbox(outPath, reports.length);
  if (opts.dispatch) {
    if (opts.dispatch !== 'opencode') die(`Unknown --dispatch target "${opts.dispatch}".`);
    dispatch(outPath);
  }
}

main().catch((e) => die(e?.stack || String(e)));
