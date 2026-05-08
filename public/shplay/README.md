# shPlay static assets

## three.js vendor copy

`vendor/three@0.180.0/three.module.js` is the official ESM build of three.js 0.180.0, vendored here so the curriculum never depends on an external CDN (unpkg outages, school firewalls, URL changes across years).

Both `runner.html` and (via runner.html's iframe) `sandbox.html` import three from the vendored path via an importmap:

```json
{ "imports": { "three": "/shplay/vendor/three@0.180.0/three.module.js" } }
```

### Upgrade path (when a new three.js version is needed)

1. Download the new ESM build:
   ```
   curl -fsSL https://unpkg.com/three@X.Y.Z/build/three.module.js \
     -o public/shplay/vendor/three@X.Y.Z/three.module.js
   ```
2. Drop the file into a new `vendor/three@X.Y.Z/` folder.
3. Bump the importmap path in `public/shplay/runner.html` to point to the new file.
4. Smoke-test in `sandbox.html` — open the dev server, load a sketch, confirm no `unpkg.com` requests appear in DevTools Network.
5. Delete the old vendor folder once all tests pass.

### Smoke-test checklist

- [ ] Open `http://localhost:3002/shplay/sandbox.html`
- [ ] Select any example and click Run
- [ ] Open DevTools Network tab, filter by domain — no requests to `unpkg.com`
- [ ] 3D scene renders correctly
