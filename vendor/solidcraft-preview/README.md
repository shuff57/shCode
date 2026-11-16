# SolidCraft CAD preview runtime

Static runtime snapshot for `/sandbox/cad/`. SolidCraft **0.30.1**, unmodified web build,
and the guarded host from reshape-cad commit `49993b98bd4dd75ae879634cec787881b0d70d3c`.
The scripts and examples here are public CAD runtime code, not classroom solutions.

The two engine WASM files exceed Cloudflare Pages' 25 MiB asset limit. They are stored
under content-addressed `solidcraft-runtime/` keys in the existing `shcode-uploads`
R2 bucket. `functions/solidcraft-preview/[[path]].ts` serves only the two pinned paths
from `functions/_shared/solidcraft-runtime.ts`; student uploads are never exposed by it.

Before deploying a new pin, upload and verify the engines:

```
node --import ./scripts/register-ts.mjs scripts/upload-solidcraft-assets.mjs --remote
```

The uploader verifies SHA-256 hashes and sizes before writing. Its source defaults
match `scripts/prepare-solidcraft-preview.mjs`; override `RESHAPE_CAD_DIR` and
`SOLIDCRAFT_WEB_DIR` when needed. `npm run build` stages the tracked static snapshot
into `public/solidcraft-preview/`, without local paths, symlinks or WASM binaries.
For local development with the prebuilt engines, run the existing prepare script
after a production build. It serves the same originals directly.

See LICENSE-APACHE and LICENSE-MIT for upstream SolidCraft, LICENSE-HOST for the host,
and the bundled font license files. The original upstream build manifest is retained
in `solidcraft/build.json` for integrity and provenance.
