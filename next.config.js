/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  trailingSlash: true,
  // NOTE: do not run `npm run build` while `npm run dev` is running. Both own
  // .next, so the dev server rewrites compiled page modules underneath the
  // build's export workers. It surfaces as `Cannot find module <path>` / ENOENT
  // on a different page every run, for a file that is on disk by the time you
  // look. Setting distDir is NOT the fix: with `output: 'export'` it also moves
  // the exported site out of ./out, which is what wrangler deploys.
};

export default nextConfig;
