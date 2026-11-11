import fs from 'node:fs';
import path from 'node:path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  trailingSlash: true,
  // The export writes ~1,030 pages (every lesson under both /lesson/ and
  // /assignment/). On a Windows-mounted checkout the per-page default of 60s
  // is not enough, and a page that trips it fails the whole build after three
  // attempts — on a different page each run, since it is I/O contention rather
  // than anything about the page.
  staticPageGenerationTimeout: 300,
  // @shuff57/reshape-* (file: deps into ../reshape-cad/packages/*, B1
  // extraction) are real symlinks into a sibling repo with its own
  // node_modules/react -- without this, webpack bundles react out of THEIR
  // real location instead of shCode's, duplicating it (silent "Invalid hook
  // call" risk at runtime, not a build-time error). Matches tsconfig.json's
  // preserveSymlinks, which fixes the same duplication for type-checking.
  webpack: (config) => {
    config.resolve.symlinks = false;
    // Every student page with an editor broke ("Unrecognized extension value ...
    // multiple instances of @codemirror/state are loaded", then "t is not
    // iterable" in the highlighter): the production bundle held five copies of
    // @codemirror/state and more of the @lezer packages, because their package
    // maps `import` and `require` to different files. These objects are
    // checked with instanceof and shared NodeProp/Tag identities, so pin each
    // package to its one ESM file. Check with: grep -o 'Unrecognized extension
    // value' out/_next/static/chunks/*.js (one match in one chunk, not five).
    const singletons = [
      '@codemirror/state', '@codemirror/view', '@codemirror/language', '@codemirror/commands',
      '@codemirror/autocomplete', '@codemirror/search', '@codemirror/lint', '@codemirror/lang-javascript',
      '@lezer/common', '@lezer/highlight', '@lezer/lr', '@lezer/javascript',
      // React Flow's pan/zoom runs on d3. d3-transition adds .interrupt() to
      // d3-selection's prototype as a side effect, so a second copy of
      // d3-selection (one that d3-transition never touched) throws
      // "selection.interrupt is not a function" the first time anything sets
      // the viewport from code. Wheel and drag never hit that path, so the
      // figures looked fine and fitView / setViewport silently did nothing.
      'd3-selection', 'd3-transition', 'd3-zoom', 'd3-drag', 'd3-interpolate',
      'd3-dispatch', 'd3-timer', 'd3-ease', 'd3-color',
    ];
    const alias = { ...config.resolve.alias };
    for (const name of singletons) {
      const dir = path.resolve(import.meta.dirname, 'node_modules', name);
      const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
      alias[name + '$'] = path.join(dir, pkg.module || 'dist/index.js');
    }
    config.resolve.alias = alias;
    return config;
  },
  // NOTE: do not run `npm run build` while `npm run dev` is running. Both own
  // .next, so the dev server rewrites compiled page modules underneath the
  // build's export workers. It surfaces as `Cannot find module <path>` / ENOENT
  // on a different page every run, for a file that is on disk by the time you
  // look. Setting distDir is NOT the fix: with `output: 'export'` it also moves
  // the exported site out of ./out, which is what wrangler deploys.
};

export default nextConfig;
