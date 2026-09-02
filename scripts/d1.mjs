// Retrying wrapper around `wrangler d1`. Use it instead of bare wrangler for
// anything touching --remote.
//
//   node scripts/d1.mjs migrations apply shcode-commits --remote
//   npm run d1:migrate
//
// Why this exists. On 2026-09-02, mid-deploy,
// `wrangler d1 migrations list shcode-commits --remote` failed with:
//
//   The given account is not valid or is not authorized to access this
//   service [code: 7403]
//
// which reads exactly like an expired login. It was not. `wrangler whoami`
// showed the right account with `d1 (write)` scope, `wrangler d1 list` -- a
// read against the same account and the same token -- worked throughout, and
// the identical failing command succeeded moments later with no
// re-authentication. Only the /d1/database/<id>/query endpoint was refusing.
//
// The cost was not the outage, which lasted under a minute. The cost was
// believing the error message: 7403 sends you to `wrangler login`, token
// scopes, and the `database_id` in wrangler.toml, none of which are wrong.
// So this wrapper does the two things that turn that into a non-event:
//
//   1. Retries the transient shapes automatically (below), with backoff.
//   2. When retries are exhausted, runs `wrangler d1 list` as a probe and
//      says which kind of failure it was -- because that one command is what
//      separates "Cloudflare is flaking" from "your credentials are wrong",
//      and nobody remembers to run it while staring at an auth error.
//
// Deliberately NOT retried: SQL errors, missing databases, and any exit that
// does not match a transient signature. A retry loop that swallows a real
// error is worse than no wrapper -- it turns one clear failure into three
// slow ones. When in doubt this passes the failure straight through.
//
// Retrying `migrations apply` is safe: the ledger is written per-migration,
// so a re-run skips what already applied. That is wrangler's own recovery
// path for an interrupted apply.

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const MAX_ATTEMPTS = 3;
const BACKOFF_MS = [2000, 5000];

// Substrings that mean "ask again", matched case-insensitively against the
// combined stdout+stderr of a failed run. Each one is a shape actually seen
// from the Cloudflare API, not a guess at what an error might look like.
const TRANSIENT = [
  'code: 7403',            // the 2026-09-02 flake; also a REAL permission error, hence the probe
  'code: 10000',           // Cloudflare's generic "authentication error", frequently spurious
  'internal server error',
  'service temporarily unavailable',
  'bad gateway',
  'fetch failed',
  'socket hang up',
  'econnreset',
  'etimedout',
  'enotfound',
  'network connection lost',
];

// Spawn wrangler's own JS entry with this node, NOT `npx wrangler`. On Windows
// that matters: since Node 18.20 spawning a `.cmd` (which is what `npx` is
// here) without `shell: true` throws EINVAL outright, and turning the shell on
// to work around it would hand argv to cmd.exe for reinterpretation. Going
// straight to the entry file sidesteps both, and skips npx's resolution step.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const WRANGLER = path.join(root, 'node_modules', 'wrangler', 'bin', 'wrangler.js');

if (!fs.existsSync(WRANGLER)) {
  console.error(`[d1] wrangler not found at ${WRANGLER} -- run \`npm install\` first.`);
  process.exit(127);
}

// Runs a wrangler subcommand. Output is piped rather than inherited so the
// text can be pattern-matched, then echoed on so the run still looks normal
// from the outside.
function run(args, { quiet = false } = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [WRANGLER, ...args], {
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: false,
    });

    let combined = '';
    for (const [stream, sink] of [
      [child.stdout, process.stdout],
      [child.stderr, process.stderr],
    ]) {
      stream.setEncoding('utf8');
      stream.on('data', (chunk) => {
        combined += chunk;
        if (!quiet) sink.write(chunk);
      });
    }

    child.on('error', (err) => {
      // Failed to launch at all. Not a Cloudflare problem, so it must not
      // match a transient signature and must not be retried.
      combined += `\n[d1] could not launch wrangler: ${err.message || err}\n`;
      if (!quiet) process.stderr.write(combined);
      resolve({ code: 127, combined });
    });
    child.on('close', (code) => resolve({ code: code ?? 1, combined }));
  });
}

function isTransient(text) {
  const hay = text.toLowerCase();
  return TRANSIENT.find((sig) => hay.includes(sig)) ?? null;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The discriminator. `d1 list` is a read against the same account and the same
// token as whatever just failed, so it separates a flaking endpoint from bad
// credentials. Quiet -- its output is diagnostic, not the user's answer.
//
// Three outcomes, not two. If the probe ALSO dies on a transient signature the
// answer is neither "endpoint flake" nor "bad credentials" -- the machine
// probably cannot reach Cloudflare at all, and reporting an auth problem there
// would send someone down exactly the wrong path this file exists to close.
async function credentialsProbe() {
  const { code, combined } = await run(['d1', 'list'], { quiet: true });
  if (code === 0) return 'ok';
  return isTransient(combined) ? 'unreachable' : 'denied';
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('usage: node scripts/d1.mjs <wrangler d1 args...>');
    console.error('  e.g. node scripts/d1.mjs migrations apply shcode-commits --remote');
    return 2;
  }

  let last = { code: 1, combined: '' };

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    last = await run(['d1', ...args]);
    if (last.code === 0) return 0;

    const signature = isTransient(last.combined);
    if (!signature) {
      // A real error. Pass it through untouched -- the output above is
      // already on the terminal.
      return last.code;
    }

    if (attempt < MAX_ATTEMPTS) {
      const wait = BACKOFF_MS[attempt - 1];
      console.error(
        `\n[d1] attempt ${attempt}/${MAX_ATTEMPTS} failed on a transient signature ` +
          `("${signature}"). Retrying in ${wait / 1000}s...\n`,
      );
      await sleep(wait);
    }
  }

  // Out of retries. Say which kind of failure this was, so nobody spends the
  // cycle on wrangler login that this whole file exists to prevent.
  console.error(`\n[d1] Still failing after ${MAX_ATTEMPTS} attempts.`);
  const verdict = await credentialsProbe();
  if (verdict === 'ok') {
    console.error(
      '[d1] `wrangler d1 list` SUCCEEDS with the same account and token, so your\n' +
        '     login and scopes are fine. This is Cloudflare-side. Do NOT re-run\n' +
        '     `wrangler login` or touch database_id in wrangler.toml. Wait and retry,\n' +
        '     and check https://www.cloudflarestatus.com if it persists.',
    );
  } else if (verdict === 'unreachable') {
    console.error(
      '[d1] `wrangler d1 list` fails the same transient way, so this is very likely\n' +
        '     the network or a Cloudflare-wide outage rather than your credentials.\n' +
        '     Check connectivity first; leave login and wrangler.toml alone.',
    );
  } else {
    console.error(
      '[d1] `wrangler d1 list` fails with a NON-transient error, so this does look\n' +
        '     like a real credential or account problem. Check `npx wrangler whoami`\n' +
        '     for the account, and that the token carries `d1 (write)`.',
    );
  }
  return last.code;
}

// Set exitCode rather than calling process.exit(): on Windows, exiting hard
// while the child's piped stdio is still tearing down trips a libuv assertion
// (`!(handle->flags & UV_HANDLE_CLOSING)`), which turns a clean pass-through of
// wrangler's exit code into a crash with an unrelated one.
main().then((code) => {
  process.exitCode = code;
});
