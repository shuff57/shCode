#!/usr/bin/env node
// Stage the AI-tutor safety models into public/models/.
//
// WHAT THIS IS FOR. lib/pii-guard.ts runs two small ONNX classifiers in a Web
// Worker before a tutor message is sent: Llama Prompt Guard 2 22M (prompt
// injection) and bert-small-pii-detection (structured PII the regex gate in
// lib/pii-check.ts cannot see). transformers.js fetches them from /models/ at
// runtime, so the files have to be on disk before `next build` copies public/
// into the export.
//
// WHY NOT THE HF CDN AT RUNTIME. The site is a static export on Cloudflare
// Pages; a client fetching huggingface.co at runtime is an external dependency
// and a CORS surface for no benefit. Same reasoning as build-brep-kernel.mjs.
//
// WHY THE OUTPUT IS NOT COMMITTED. ~96 MB of weights plus the ONNX runtime
// wasm. Generated, gitignored, rebuilt on demand.
//
// OFFLINE / CI. Every file is skipped when already present, so a warm tree
// costs a few stat() calls. A download failure is a WARNING, not a build
// failure: lib/pii-guard.ts fails open when the models are unreachable, so the
// app degrades to the regex-only gate, and a school network that blocks
// huggingface.co must not be able to break `npm run build`.
//
//   SKIP_PII_GUARD_MODELS=1   skip the whole script (offline builds)
//   --force                   re-download even when a file is already present
//
// The ONNX runtime wasm and the transformers.js browser bundle are copied out
// of node_modules rather than downloaded -- they ship with the dependency and
// pinning them to the installed version is the point.

import { copyFileSync, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { createWriteStream } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline as streamPipeline } from 'node:stream/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const dest = path.join(root, 'public', 'models');

const force = process.argv.includes('--force');

const mb = (n) => `${(n / 1024 / 1024).toFixed(1)} MiB`;


if (process.env.SKIP_PII_GUARD_MODELS === '1') {
  console.log('SKIP_PII_GUARD_MODELS=1 -- not staging the safety models.');
  process.exit(0);
}

const HF = 'https://huggingface.co';

// [remote path, destination relative to public/models/]
//
// The prompt-guard mirror names its int8 file `model.quant.onnx` at the repo
// root; it is renamed to the `onnx/model_quantized.onnx` layout transformers.js
// looks for under `dtype: 'q8'`, so the worker needs no `model_file_name` /
// `subfolder` overrides. The PII repo already uses that layout.
const DOWNLOADS = [
  // Llama Prompt Guard 2 22M -- int8. The gravitee-io mirror is the ungated
  // ONNX export of meta-llama/Llama-Prompt-Guard-2-22M (the original is gated
  // and has no ONNX export at all).
  ['gravitee-io/Llama-Prompt-Guard-2-22M-onnx/resolve/main/model.quant.onnx', 'prompt-guard/onnx/model_quantized.onnx'],
  ['gravitee-io/Llama-Prompt-Guard-2-22M-onnx/resolve/main/config.json', 'prompt-guard/config.json'],
  ['gravitee-io/Llama-Prompt-Guard-2-22M-onnx/resolve/main/tokenizer.json', 'prompt-guard/tokenizer.json'],
  ['gravitee-io/Llama-Prompt-Guard-2-22M-onnx/resolve/main/tokenizer_config.json', 'prompt-guard/tokenizer_config.json'],
  ['gravitee-io/Llama-Prompt-Guard-2-22M-onnx/resolve/main/special_tokens_map.json', 'prompt-guard/special_tokens_map.json'],

  // bert-small-pii-detection -- int8, Apache-2.0.
  ['onnx-community/bert-small-pii-detection-ONNX/resolve/main/onnx/model_quantized.onnx', 'pii/onnx/model_quantized.onnx'],
  ['onnx-community/bert-small-pii-detection-ONNX/resolve/main/config.json', 'pii/config.json'],
  ['onnx-community/bert-small-pii-detection-ONNX/resolve/main/tokenizer.json', 'pii/tokenizer.json'],
  ['onnx-community/bert-small-pii-detection-ONNX/resolve/main/tokenizer_config.json', 'pii/tokenizer_config.json'],
  ['onnx-community/bert-small-pii-detection-ONNX/resolve/main/special_tokens_map.json', 'pii/special_tokens_map.json'],
  ['onnx-community/bert-small-pii-detection-ONNX/resolve/main/vocab.txt', 'pii/vocab.txt'],
];

// Copied from node_modules, not downloaded. Both variants of the ORT wasm are
// staged because onnxruntime-web picks between them at runtime: the asyncify
// build is the default, and Safari below 26 without WebGPU gets the plain one.
// Staging only the default would leave Safari fetching jsdelivr, which is the
// external dependency this script exists to remove.
const LOCAL_COPIES = [
  ['node_modules/@huggingface/transformers/dist/transformers.min.js', 'transformers.min.js'],
  ['node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.asyncify.mjs', 'ort/ort-wasm-simd-threaded.asyncify.mjs'],
  ['node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.asyncify.wasm', 'ort/ort-wasm-simd-threaded.asyncify.wasm'],
  ['node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.mjs', 'ort/ort-wasm-simd-threaded.mjs'],
  ['node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm', 'ort/ort-wasm-simd-threaded.wasm'],
  // The inference worker. Written first-party in scripts/, served as a static
  // module worker from /models/pii-guard-worker.js -- same shape as the ORT
  // wasm: a heavy runtime asset that must not go through the bundler.
  ['scripts/pii-guard-worker-source.js', 'pii-guard-worker.js'],
];

// Files OVER the 25 MiB Pages limit ship through the R2-backed route
// (functions/models-files/[[path]].ts) instead of the static export. The
// staging script still downloads them locally (the probe needs them), but a
// small marker file replaces them in public/ so the deploy doesn't carry
// 96 MB of dead weight — and Pages' per-file check never sees the real bytes.
const OVER_PAGES_LIMIT = [
  'pii/onnx/model_quantized.onnx',
  'prompt-guard/onnx/model_quantized.onnx',
  'ort/ort-wasm-simd-threaded.asyncify.wasm',
];

async function download(url, to) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
  await streamPipeline(Readable.fromWeb(res.body), createWriteStream(to));
}

mkdirSync(dest, { recursive: true });

let staged = 0;
let skipped = 0;
const failed = [];

for (const [remote, rel] of DOWNLOADS) {
  const to = path.join(dest, rel);
  if (!force && existsSync(to) && statSync(to).size > 0) {
    skipped++;
    continue;
  }
  mkdirSync(path.dirname(to), { recursive: true });
  try {
    await download(`${HF}/${remote}`, to);
    console.log(`  ${rel}  ${mb(statSync(to).size)}`);
    staged++;
  } catch (err) {
    failed.push(`${rel} (${err instanceof Error ? err.message : String(err)})`);
  }
}

for (const [from, rel] of LOCAL_COPIES) {
  const to = path.join(dest, rel);
  // The first-party worker is CODE, not a pinned dependency asset: it edits,
  // so skip-if-present would ship a stale worker forever (this exact bug --
  // the staged copy kept pointing at /models/ after the /models-files edit).
  // node_modules copies (transformers, ORT) stay skip-if-present: they are
  // pinned to the installed version and re-copying is pointless churn.
  const always = rel === 'pii-guard-worker.js';
  if (!force && !always && existsSync(to) && statSync(to).size > 0) {
    skipped++;
    continue;
  }
  const src = path.join(root, from);
  if (!existsSync(src)) {
    failed.push(`${rel} (missing ${from} -- run npm install)`);
    continue;
  }
  mkdirSync(path.dirname(to), { recursive: true });
  copyFileSync(src, to);
  console.log(`  ${rel}  ${mb(statSync(to).size)}  (from ${from})`);
  staged++;
}

// Swap the over-limit files for marker files in the LOCAL TREE ONLY. The real
// bytes stay on disk for the probe; `next build` copies the marker into out/, and
// the browser fetches the real bytes from /models-files/<rel> (R2 route).
// transformers.js is pointed at that path by the worker's env config below.
for (const rel of OVER_PAGES_LIMIT) {
  const to = path.join(dest, rel);
  const real = path.join(root, '.pii-guard-cache', rel);
  if (statSync(to).size > 25 * 1024 * 1024) {
    mkdirSync(path.dirname(real), { recursive: true });
    copyFileSync(to, real);
    writeFileSync(to, 'served from R2 via /models-files -- see functions/models-files/[[path]].ts');
    console.log(`  ${rel}  moved to .pii-guard-cache (over the 25 MiB Pages limit; served by the R2 route)`);
  }
}

console.log(`\npublic/models/: ${staged} staged, ${skipped} already present.`);

if (failed.length) {
  console.log('\nNOT staged:');
  for (const f of failed) console.log(`  ${f}`);
  console.log(
    '\nThe tutor still works: lib/pii-guard.ts fails open when the models are\n'
    + 'unreachable, so the regex gate in lib/pii-check.ts stays the only filter.\n'
    + 'Re-run `node scripts/build-pii-guard-models.mjs` on a network that can\n'
    + 'reach huggingface.co to enable the ML layer.',
  );
}
