#!/usr/bin/env node
// jscad-render-check.mjs — the half of the JSCAD gate that needs a real GPU.
//
// scripts/test-jscad.mjs covers everything a node vm can reach. It cannot
// reach render(): ~160 lines in public/jscad/runner.html that call
// regl.prepareRender, which needs a live WebGL context. Those lines were
// correct-by-assertion until this script existed.
//
// It is NOT part of `npm test`, because it needs a browser binary that is not
// a repo dependency. Run it by hand when runner.html's rendering changes:
//
//     node scripts/jscad-render-check.mjs                     # chromium
//     node scripts/jscad-render-check.mjs --browser=firefox
//     node scripts/jscad-render-check.mjs --browser=webkit
//
// Playwright is resolved from the repo first, then from a global install. If
// neither is present the script says so and exits 2 (skipped), never 0 —
// "no browser available" must not read as "the renderer is fine".
//
// What a PASS actually establishes, measured rather than asserted:
//   * runner.html serves and runs with ZERO requests off the local origin
//     (the whole point of vendoring the two bundles)
//   * the shim installs, and bare / namespaced / require() all resolve
//   * main() is found in both the portable and the bare-name form
//   * render() completes and regl paints real pixels
//   * a thrown error reaches the parent as a preview-error carrying the
//     student's own file, line, column and source line
//
// PHASE 2 runs only when out/ exists (i.e. after `npm run build`) and is the
// reachability proof: it opens the BUILT /docs/jscad pages, clicks Run, and
// reads which runner the sandbox actually mounted. The REACH group in
// test-jscad.mjs asserts that wire from source; this one watches it happen.
// It checks /docs/shplay in the same pass, because the failure that shipped
// last time was two wires crossed, not one wire missing.
//
// Cross-browser, measured 2026-08-22 on playwright chromium / firefox / webkit:
// all three PASS 7/7. Two engine differences a student would actually notice,
// neither of them a break:
//   * error WORDING differs for the same fault — chromium and firefox say
//     "primtives is not defined", webkit says "Can't find variable: primtives".
//     The assertion matches the identifier, not the phrasing.
//   * error LOCATION used to be broken on webkit — "script.js:0" where the
//     other two gave "script.js:2:3" — because webkit ignores the
//     //# sourceURL pragma and labels an injected script with the DOCUMENT
//     url, so runner.html's stack regex found no *.js it recognised. Fixed by
//     engineFrame() in public/jscad/runner.html. All three engines now blame
//     the same LINE; only the column differs (JSC points at the identifier,
//     V8 at the start of the call), which nothing depends on.
//
// Note on the harness, not on the runner: swiftshader's FIRST WebGL context in
// a fresh browser is reliably lost. Measuring without burning a warm-up page
// reports a false blank canvas on whichever case happens to run first.

import http from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { createRequire } from 'node:module';

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const CANDIDATES = [
  resolve(REPO, 'node_modules/playwright/index.js'),
  resolve(REPO, 'node_modules/playwright-core/index.js'),
  process.env.PLAYWRIGHT_PATH,
  'C:/Users/shuff57/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright/index.js',
].filter(Boolean);

// --browser=chromium|firefox|webkit. Chromium is the default because it is the
// only engine guaranteed to be installed; the other two need
// `npx playwright install firefox webkit` first. Run all three when the runner
// or its iframe attributes change — sandbox + WebGL is the most engine-variable
// part of this stack, and Chromium alone does not speak for a classroom iPad.
const ENGINE = (process.argv.find((a) => a.startsWith('--browser=')) || '').slice(10) || 'chromium';
if (!['chromium', 'firefox', 'webkit'].includes(ENGINE)) {
  console.error(`unknown --browser=${ENGINE}; expected chromium, firefox or webkit`);
  process.exit(2);
}

let chromium = null;
for (const p of CANDIDATES) {
  if (!existsSync(p)) continue;
  try {
    chromium = createRequire(p)(p)[ENGINE];
    console.log('playwright:', p, `(${ENGINE})`);
    break;
  } catch { /* try the next one */ }
}
if (!chromium) {
  console.error('SKIPPED — no playwright found. Tried:\n  ' + CANDIDATES.join('\n  '));
  console.error('Install one (npm i -D playwright) or set PLAYWRIGHT_PATH, then re-run.');
  process.exit(2);
}

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.md': 'text/plain',
};

const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const file = join(REPO, 'public', url === '/' ? '/index.html' : url);
  if (!existsSync(file)) { res.writeHead(404); res.end('not found'); return; }
  res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
});

const b64url = (s) =>
  Buffer.from(s, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

// Three programs: the portable form, the bare-name shim form, and one that
// throws — so the error protocol is exercised too, not just the happy path.
const WAIT = Number(process.env.WAIT || 2500);

const CASES = [
  {
    name: 'portable require/module.exports form',
    code: `const { primitives, transforms, booleans } = require('@jscad/modeling')
function main() {
  const plate = primitives.cuboid({ size: [40, 40, 8] })
  const hole = transforms.translate([0, 0, 0], primitives.cylinder({ radius: 8, height: 30, segments: 32 }))
  return booleans.subtract(plate, hole)
}
module.exports = { main }`,
    expectDrawn: true,
  },
  {
    name: 'bare-name shim form (shCode only)',
    code: `function main() {
  return union(cube({ size: 20 }), translate([20, 0, 0], sphere({ radius: 12, segments: 32 })))
}`,
    expectDrawn: true,
  },
  {
    name: 'a program that throws',
    code: `function main() {
  return primtives.cube({ size: 10 })
}`,
    expectDrawn: false,
    // Engine-specific WORDING for the same fault, so match either — and still
    // require the offending identifier by name, which is the part a student
    // actually needs and which neither engine is allowed to drop:
    //   chromium/firefox  "primtives is not defined"
    //   webkit            "Can't find variable: primtives"
    // Broadening this is fixing a Chromium-centric assertion, not loosening a
    // check: the runner behaves identically on all three, only the message text
    // differs. Measured 2026-08-22 on playwright chromium/firefox/webkit.
    expectError: /primtives/i,
    // The typo is on line 2 of the program above. All three engines must agree.
    expectLine: 2,
  },
  {
    name: 'main() returns nothing',
    code: `function main() { }
module.exports = { main }`,
    expectDrawn: false,
    expectError: /returned nothing/i,
  },
];

await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const base = `http://127.0.0.1:${port}`;

// The swiftshader flags are chromium-only; firefox and webkit reject unknown
// args outright, so they get a plain launch and use whatever GL they have.
const browser = await chromium.launch(ENGINE === 'chromium'
  ? { args: ['--enable-unsafe-swiftshader', '--use-gl=swiftshader', '--ignore-gpu-blocklist'] }
  : {});

// Swiftshader's first WebGL context in a fresh browser is reliably lost
// ("CONTEXT_LOST_WEBGL: loseContext") — an artifact of this harness, not of
// runner.html. Burn one throwaway page before measuring anything.
{
  const warm = await browser.newPage({ viewport: { width: 320, height: 240 } });
  await warm.setContent('<canvas id=c></canvas><script>document.getElementById("c").getContext("webgl")</script>');
  await warm.waitForTimeout(1500);
  await warm.close();
}

let failures = 0;
for (const c of CASES) {
  const page = await browser.newPage({ viewport: { width: 640, height: 480 } });

  const clog = [];
  page.on('console', (m) => clog.push(m.type() + ': ' + m.text()));
  page.on('pageerror', (e) => clog.push('pageerror: ' + e.message));
  const external = [];
  page.on('request', (r) => {
    const u = r.url();
    if (!u.startsWith(base) && !u.startsWith('data:') && !u.startsWith('blob:')) external.push(u);
  });

  // A parent page that hosts the runner in an iframe and records the exact
  // postMessage protocol LessonWorkspace.tsx listens for. setContent serves
  // from about:blank, so the iframe's absolute URL is what puts it on the
  // local origin — and any request that leaves that origin shows up in
  // `external`, which is how the no-CDN claim gets measured rather than read.
  //
  // The sandbox attribute below must MIRROR components/JscadPreview.tsx. Drop
  // it and this check quietly starts proving a configuration that never ships:
  // the runner would run same-origin here and opaque-origin in the app, so a
  // regression that only breaks under the sandbox would pass.
  await page.setContent(`<body style="margin:0">
    <script>
      window.__msgs = [];
      window.addEventListener('message', function (e) {
        if (e.data && typeof e.data === 'object' && e.data.source) window.__msgs.push(e.data);
      });
    </script>
    <iframe id="f" style="width:640px;height:480px;border:0"
      sandbox="allow-scripts allow-downloads"
      src="${base}/jscad/runner.html?code=${b64url(c.code)}&r=1"></iframe>
  </body>`, { waitUntil: 'load' });

  // Give the render loop a few frames.
  await page.waitForTimeout(WAIT);

  const frame = page.frames().find((f) => f.url().includes('/jscad/runner.html'));
  const probe = frame
    ? await frame.evaluate(() => {
        const canvas = document.querySelector('#__jscadViewer canvas');
        const out = {
          hasViewer: !!document.getElementById('__jscadViewer'),
          hasCanvas: !!canvas,
          w: canvas ? canvas.width : 0,
          h: canvas ? canvas.height : 0,
          errorVisible: (document.getElementById('__jscadError') || {}).style?.display === 'block',
          errorText: (document.getElementById('__jscadError') || {}).textContent || '',
          statusText: (document.getElementById('__jscadStatus') || {}).textContent || '',
          scriptCompleted: !!window.__jscadScriptCompleted,
          lost: window.__jscadBareNamesLost || null,
          skipped: window.__jscadBareNamesSkipped || null,
          bareCube: typeof window.cube,
          nsCube: typeof (window.jscadModeling && window.jscadModeling.primitives.cube),
          requireWorks: (() => { try { return typeof window.require('@jscad/modeling').primitives.cube; } catch (e) { return 'threw: ' + e.message; } })(),
        };
        return out;
      })
    : null;

  // Did regl actually paint? Screenshot the iframe and count distinct colours.
  let drawn = false, distinct = 0;
  if (probe && probe.hasCanvas) {
    const shot = await page.locator('#f').screenshot();
    // Cheap non-blank test: a solid-colour PNG compresses to almost nothing.
    // A rendered scene with a grid, axes and a shaded solid does not.
    distinct = shot.length;
    drawn = shot.length > 6000;
  }

  const msgs = await page.evaluate(() => window.__msgs);
  const errs = msgs.filter((m) => m.source === 'preview-error');

  const problems = [];
  if (external.length) problems.push(`external requests: ${external.join(', ')}`);
  if (c.expectDrawn) {
    if (!probe?.hasCanvas) problems.push('no <canvas> in the viewer');
    if (!drawn) problems.push(`canvas looks blank (png ${distinct} bytes)`);
    if (errs.length) problems.push(`unexpected preview-error: ${errs[0].error.message}`);
  } else {
    if (!errs.length) problems.push('expected a preview-error message and got none');
    else if (c.expectLine && errs[0].error.line !== c.expectLine) {
      // Locks in the engineFrame() fix in runner.html. Before it, webkit
      // reported line 0 here while chromium and firefox reported 2 — a silent
      // degradation that a message-only assertion could never catch.
      problems.push(`blamed line ${errs[0].error.line}, expected ${c.expectLine} (snippet: ${JSON.stringify(errs[0].error.snippet)})`);
    }
    else if (c.expectError && !c.expectError.test(errs[0].error.message)) {
      problems.push(`preview-error message was ${JSON.stringify(errs[0].error.message)}`);
    }
  }

  console.log(`\n--- ${c.name}`);
  console.log('   probe   :', JSON.stringify(probe));
  console.log('   msgs    :', msgs.map((m) => m.source).join(', ') || '(none)');
  if (errs.length) console.log('   error   :', JSON.stringify(errs[0].error));
  console.log('   png     :', distinct, 'bytes ->', drawn ? 'PAINTED' : 'blank');
  console.log('   external:', external.length);
  console.log('   console :', clog.slice(0, 6).join(' || ') || '(none)');
  console.log(problems.length ? `   RESULT  : FAIL — ${problems.join(' | ')}` : '   RESULT  : PASS');
  if (problems.length) failures++;

  await page.close();
}

// ---------------------------------------------------------------------------
// PHASE 2 - the built site, if there is one
// ---------------------------------------------------------------------------

const OUT = join(REPO, 'out');
let reachTotal = 0, reachBad = 0;

if (!existsSync(join(OUT, 'docs/jscad'))) {
  console.log('\nphase 2 skipped - no out/docs/jscad. Run `npm run build` first to check reachability.');
} else {
  const outServer = http.createServer((req, res) => {
    let file = join(OUT, decodeURIComponent(req.url.split('?')[0]));
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
    if (!existsSync(file) && existsSync(file + '.html')) file += '.html';
    if (!existsSync(file)) { res.writeHead(404); res.end('nf'); return; }
    res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(readFileSync(file));
  });
  await new Promise((r) => outServer.listen(0, '127.0.0.1', r));
  const outBase = `http://127.0.0.1:${outServer.address().port}`;

  const TARGETS = [
    { url: '/docs/jscad/overview/', expect: '/jscad/runner.html', label: 'JSCAD docs - overview' },
    { url: '/docs/jscad/booleans/', expect: '/jscad/runner.html', label: 'JSCAD docs - booleans' },
    { url: '/docs/shplay/overview/', expect: '/shplay/runner.html', label: 'shPlay docs - wires not crossed' },
  ];
  reachTotal = TARGETS.length;

  for (const t of TARGETS) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const perrs = [];
    page.on('pageerror', (e) => perrs.push(e.message));
    await page.goto(outBase + t.url, { waitUntil: 'networkidle' });

    const runBtn = page.locator('.docs-sandbox-run').first();
    if (!(await runBtn.count())) {
      console.log(`\n${t.label}\n   RESULT  : FAIL - no Run button; this page has no live sandbox`);
      reachBad++; await page.close(); continue;
    }
    await runBtn.click();
    await page.waitForTimeout(WAIT + 1500);

    const src = await page.locator('iframe.jscad-frame').first().getAttribute('src').catch(() => null);
    const rframe = page.frames().find((f) => /runner\.html/.test(f.url()));
    const inner = rframe
      ? await rframe.evaluate(() => ({
          canvas: !!document.querySelector('canvas'),
          err: (document.getElementById('__jscadError') || document.getElementById('error') || {}).textContent || '',
          requireType: typeof window.require,
        })).catch(() => null)
      : null;

    const problems = [];
    if (!src || !src.startsWith(t.expect)) problems.push(`mounted ${src} - expected ${t.expect}`);
    // The exact symptom the previous build shipped.
    if (inner && /require is not defined/i.test(inner.err)) problems.push('runner reported "require is not defined"');
    if (perrs.length) problems.push(`page error: ${perrs[0]}`);

    console.log(`\n${t.label}  ${t.url}`);
    console.log('   mounted :', src ? src.split('?')[0] : '(no iframe)');
    console.log('   frame   :', JSON.stringify(inner));
    console.log(problems.length ? `   RESULT  : FAIL - ${problems.join(' | ')}` : '   RESULT  : PASS');
    if (problems.length) reachBad++;
    await page.close();
  }
  outServer.close();
}

await browser.close();
server.close();

const total = CASES.length + reachTotal;
const bad = failures + reachBad;
console.log(`\nrender-check [${ENGINE}]: ${bad ? 'FAIL' : 'PASS'} - ${total - bad}/${total}` +
  (reachTotal
    ? ` (${CASES.length - failures}/${CASES.length} render, ${reachTotal - reachBad}/${reachTotal} reach)`
    : ' (reach phase skipped)'));
process.exit(bad ? 1 : 0);
