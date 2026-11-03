# jsfxr (vendored)

Source: https://github.com/chr15m/jsfxr
License: Unlicense (public domain). See `UNLICENSE` in this folder.
Vendored: 2026-11-03, from `master`.

`riffwave.cjs` and `sfxr.cjs` are the repo's `riffwave.js` and `sfxr.js`,
byte for byte apart from the `.cjs` extension. The extension is load-bearing:
Next's dev React Refresh loader injects `import.meta.webpackHot` into modules it
treats as ESM, and a subdirectory `package.json` declaring `"type": "commonjs"`
made webpack parse these UMD files as CommonJS while the loader still injected
`import.meta`, so `/sound` answered 500 with "Cannot use 'import.meta' outside a
module". A `.cjs` file is CommonJS by extension and stays out of that loader.

`sfxr.mjs` and `riffwave.mjs` are the repo's ESM wrappers with the import path
changed to the `.cjs` files. Nothing else was changed.
