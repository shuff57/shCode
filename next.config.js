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
