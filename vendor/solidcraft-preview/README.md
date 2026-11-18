# SolidCraft CAD preview runtime

Static runtime snapshot for the SolidCraft CAD workspace in `/sandbox/` and
`/sandbox/cad/`. SolidCraft **0.30.1**, unmodified web build,
and the guarded host from reshape-cad commit `49993b98bd4dd75ae879634cec787881b0d70d3c`.
The scripts and examples here are public CAD runtime code, not classroom solutions.
Host-only integration update: `pane/pane.js` accepts `?storage=off` so a shCode lesson
uses its own account-scoped saving instead of the demo localStorage keys. The
SolidCraft web build and the guard/translator bundles are unchanged.

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
The development server prepares the tracked runtime before starting Next and
serves `/solidcraft-preview/` directly, including GET and HEAD. If the local pinned
engine builds are available, it links those originals automatically. Override
`RESHAPE_CAD_DIR` and `SOLIDCRAFT_WEB_DIR` for another checkout location. Missing
engines are reported at startup; other app modes still start. The manual prepare
script remains available for static development tools that do not use `server.js`.

See LICENSE-APACHE and LICENSE-MIT for upstream SolidCraft, LICENSE-HOST for the host,
and the bundled font license files. The original upstream build manifest is retained
in `solidcraft/build.json` for integrity and provenance.


The host retains `sketch-only=1` for legacy script-driven 2D previews. Its
`pane/src/sketch-only.mjs` maps one flat constrained sketch through the existing
mapper/solver; it accepts no solid commands. `pane/bundle/host-lib.js` exports that
same mapper for this route. The source lives in reshape-cad's solidcraft-host.
The upstream web application, WASM pin and 3D guard behavior are unchanged.

The sketch lesson now mounts `solidcraft/index.html` directly and uses SolidCraft's
native Sketch toolbar/canvas. The shCode-owned controller in
`lib/solidcraft-native.ts` restricts the classroom UI to XY sketching, uses the normal
native JSON exporter/file-open path to save complete documents, and reads evaluated
solver geometry for checks. Upstream assets are unchanged. V1 shCode sketch recipes
are migrated to native sketches on first open; later saves keep all native
constraints and dimension parameters in the version-2 `sketch.json` envelope.

The native editor iframe uses `credentialless` storage isolation: upstream's own
recovery/prefs files stay in the current page's temporary partition. Browser
support is feature-tested before loading the app; unsupported browsers retain
lesson files and show an explanation. This pilot currently targets Chrome/Edge.
See https://developer.chrome.com/blog/iframe-credentialless for the browser's
partition lifetime. Native upstream code is not modified to implement isolation.

Script-driven 2D uses the same bundled sandbox interpreter as 3D. The shCode-owned
`lib/solidcraft-sketch-script.ts` evaluates code in an opaque iframe, preflights one
bounded XY sketch through this snapshot's `mapSketch`, then sends sketch commands to
the native editor controller. The source is never evaluated in the app origin. Native
records bind the successful source to the exported document; hand changes require a
new Run for script-based checks. No upstream SolidCraft assets are changed.

The main sandbox now mounts `SolidCraftProject` instead of the retired
`ReshapeStudio`. Both entry routes use the same saved project workspace;
`/sandbox/cad/` opens the most recent CAD project or creates one. Existing project
IDs and the internal `reshape` mode key stay unchanged, so drafts, account-owned
cloud saves and History remain attached to the original project.

Each CAD project keeps `script.js` for 3D, `sketch.js` for 2D, `sketch.json` for the
complete native 2D document, and `cad.json` for the last selected view. Changing
views and projects captures the native sketch before leaving. Save waits for an
active 2D Run and keeps the complete file map through the existing sandbox save
and History paths. After a durable save, the controller clears only the captured
native recovery files in the current page's isolated partition. It leaves any
uncaptured revision alone.

The script drives the 3D model; hand edits do not rewrite the saved 3D script.
Teacher policy controls student hand tools in both views. Teachers and admins have
a Drawing tools checkbox for their own sandbox author workspace, off by default;
students have no local override. The retired editor remains available to legacy
lessons that have not yet moved to SolidCraft; this change retires its sandbox
entry, not every older lesson renderer.

Sketch-based parts keep a link in `cad.json`: `sketch.variable` names the public
sketch handle in `sketch.js`. The workflow is code-first: Sketch opens the 2D
script workspace; Finish sketch builds changed source and returns to Model
without adding a solid or rewriting code. Extrude adds a separate guarded 3D
code step. Functions and classes stay in the saved source unchanged. If native
mouse edits no longer match the script, Finish stays in Sketch and asks for an
explicit Run, which preserves the complete native document in History first.
`lib/solidcraft-sketch-finish.ts` checks this source/preview handoff and rejects
source changes during Finish. Older `generatedSource` records remain readable;
they are kept in History and rebuilt from saved source, never re-emitted. The
Model preview's opt-in `project-sketch=1` route draws an unconsumed shared profile
using sketch commands only; solid features retain all existing guards.
At each 3D Run, the host executes
the current sketch source inside a private function scope, returns its handle as
`profile`, then executes the current 3D steps. Sketch source is shared, never
copied into the saved 3D file. Both sources remain editable from the 3D workspace.
The interpreter and guarded translator remain unchanged; no interpreter code
loads into the main app origin. Composed script errors carry their original
file name and line where the interpreter provides one. Save/History retain the
link together with both files.

In browsers with credentialless iframe storage, the 3D host also uses that
page-scoped partition. After a durable project save, the studio removes recovery
only while native input is paused, the current script matches the successful
build, and the engine revision still matches the host's build stamp. Changed code and
hand-edited revisions are left alone. View changes wait for a running build;
newly built parts are fitted to the viewport.

The shCode host records the engine API instance and document revision after a
successful build. Another Run of that same document does not mistake the engine's
dirty flag for a hand edit. A changed revision or reloaded engine still requires
replacement confirmation; the embedded studio shows that prompt in the parent so
its CAD input cover cannot hide it. This compares one document's revision, not
floating-point geometry across engine runs.
