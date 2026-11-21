# spaSHial: the 3D engine (planning, 2026-11-21)

The 3D sibling of moSHion (2D) and reSHape (CAD). Branch `spaSHial`.
This folder is the contract and the decisions behind it. No engine code has
changed yet.

- `spashial.d.ts` is the API contract, written the way `moshion.d.ts` is. It
  typechecks standalone (`tsc --noEmit --strict --target es2022 --lib es2022,dom`).
- `../../scripts/spashial-bench/` is the physics benchmark that settled the
  library choice below. `results.json` there is the raw run.

## Goals and constraints (owner's answers, 2026-11-21)

- Primary device: a medium-weight desktop, Core Ultra 7, integrated graphics only.
  Chromebook-class machines are the second target.
- Capabilities, all four: real physics and collisions, glTF models, textures and
  sounds from the moSHion Library, online multiplayer. Order: physics, assets,
  sandbox mode, multiplayer last.
- API mirrors moSHion; first milestone includes a Sandbox mode.
- The 80 parked Unit 3 lessons stay parked (tag `backup/shallot-ge-pre-rebase`).

## Decisions so far

| Decision | Choice | Why |
| --- | --- | --- |
| Renderer | three.js on **WebGL2** | Runs on the Ultra 7 and on Chromebooks from one code path. The headless browser here has no WebGPU. WebGPU can come later **behind the same API**. Shallot (WebGPU-only) is not ruled out on size: see "Shallot, measured". |
| Name of a 3D object | **`Asset`** (owner's choice, 2026-11-21) | `Body` is the obvious word but collides with the DOM's global `Body` interface (the fetch mixin): `class Body` merges with it and every object grows `.text()`/`.json()` in editor typings. `Asset` is free in the DOM and in moSHion. **Caution:** shCode already says "assets" for Library items (pictures, sounds, fonts, models; `/api/games/[id]/assets`, `itemAssets.ts`), so a sentence like "the game's assets" is now ambiguous. Docs should say "Library items" for the files. |
| Gravity | **Off** by default (owner's choice) | Like moSHion: `world.gravity.y = -10` makes things fall. |
| Torus | Real collider, **kept** (owner's choice) | A ring of 16 capsules; see "Torus collider" below. Neither library has a torus primitive. |
| Units, axes, angles | Y up, right-handed, ~1 unit = 1 m, **degrees** | Degrees match moSHion. shPlay used radians plus a helper. |
| Colliders and touch verbs | moSHion's, word for word | `'dynamic' \| 'static' \| 'kinematic' \| 'none'`; `collides/colliding/collided/overlaps...` |
| Hooks | `setup / update / draw / drawTop / preload` | `drawTop()` is a 2D screen layer, so moSHion's `text()`, `rect()` etc. build the HUD unchanged. |
| Physics library | **Jolt** (see below), behind the facade | |

## Physics benchmark

Same seeded scene through each library: 1 m boxes and 0.4 m spheres, gravity -10,
friction 0.6, one fixed 1/60 step, each library in its own process. Machine:
AMD Ryzen AI 9 HX 370 (a recent high-end CPU; probably quicker than the Ultra 7
target, but that is not measured). Frame budget
at 60 fps is 16.7 ms for everything. Mean step in ms:

| awake bodies | Rapier 0.21 | cannon-es 0.20 | Jolt 1.1.1 |
| --- | --- | --- | --- |
| 200 | 1.49 | 4.24 | 1.14 |
| 400 | 2.88 | 9.92 | 2.93 |
| 600 | 6.33 | 18.54 | 5.61 |
| 900 | 8.26 | 34.85 | 8.43 |
| 1200 | 13.84 | 61.11 | 12.17 |

| | Rapier | cannon-es | Jolt |
| --- | --- | --- | --- |
| 105-box pyramid stands (0 = good) | 0 moved | **58 of 105 moved** | 0 moved |
| 20,000 raycasts | 109 ms | 708 ms | 114 ms |
| peak process memory | 239 MB | 207 MB | 123 MB |
| shippable size, gzip | 1.17 MB wasm + 35 KB JS | 75 KB | 0.75 MB wasm + 136 KB JS |
| load + init | 164 ms | 31 ms | 120 ms |
| last release | 2026-09 | **2022** | 2026-10 |
| licence | Apache-2.0 | MIT | MIT |

What this says, and how sure I am:

- **cannon-es is out.** It is 4-6x slower, its pyramid collapsed, and it has not
  been released since 2022. This is the clearest result.
- **Rapier and Jolt are a speed tie.** Run to run they differ by about 20% (my two
  runs of Rapier gave 11.2 and 13.8 ms for 1200 bodies), which is bigger than the
  gap between them. Do not read "Jolt is faster" or "Rapier is faster" out of it.
- Jolt is the lighter of the two (about a quarter smaller to download, about half
  the process memory), which should matter most on a low-memory Chromebook (not
  measured on one). It also ships a character controller,
  joints including a fixed weld, cylinder/capsule/tapered-capsule/hull/mesh/heightfield
  shapes, vehicles and ragdolls. Rapier has a character controller, the same joint
  kinds, cone/cylinder/capsule/hull/trimesh/heightfield. For what the spec needs
  they are equivalent.
- Jolt's costs: its API is verbose (layer filters, manual `destroy()` on every
  object it hands back, so a leak is easy), and it is a larger C++ surface. Both
  are contained inside one facade module, which is the point of the contract.
- **Sleeping did not help** in this scene: one big pile is one island, and any
  jitter keeps it awake. Do not plan on sleeping to rescue a body-count budget.
- Contact-event counts are not comparable across libraries (cannon-es reports a
  begin event again and again). Event cost was within noise for Rapier and Jolt.

**Budget to design lessons to:** about 300-400 awake dynamic bodies. That is
2.9 ms of the frame on this CPU, and rendering shares the frame. The Ultra 7 may
be slower than this machine, so treat it as an upper bound until measured there.

### What this benchmark does not show
- GPU cost. Headless Chrome here renders with software GL (SwiftShader), so no
  frame-rate number from this machine says anything about integrated graphics.
  Physics is CPU-bound and is meaningful; rendering needs a real Ultra 7 box.
- Anything on the Ultra 7 or a Chromebook. Re-run `node bench.mjs` there; the
  script writes `results.json` with the machine's CPU.
- Jolt in a browser on the target machines. It was tested in headless Chrome 157
  on this one (see "Jolt in the sandbox"), not on the Ultra 7 or a Chromebook.

### What Jolt is

An open-source (MIT) C++ rigid-body physics library by Jorrit Rouwé. Its README
says it is used by *Horizon Forbidden West* and *Death Stranding 2*, and it claims
a deterministic simulation (identical inputs give identical results, which could
let a multiplayer game send only inputs; the limits are in its docs, and whether
the npm WebAssembly build keeps that guarantee is **not verified**). The npm
package `jolt-physics` is JoltPhysics.js, the same library compiled to WebAssembly.

## Torus collider (experiment, `scripts/spashial-bench/torus.mjs`)

Jolt has no torus primitive, so a torus is a compound shape: a ring of N capsules
along the major circle. With R = 1, tube r = 0.3, N = 16:

- A ball of radius 0.5 (fits the 0.7 hole) falls through a static ring: PASS.
- A ball of radius 0.9 rests on the ring at y = 2.645; an exact torus gives 2.663
  (1.8 cm off, matching the ring's approximation error of 1.9 cm at N = 16): PASS.
- A dynamic torus dropped tilted settles flat at y = 0.291 (exact 0.3), at rest: PASS.
- **Cost is the catch:** 200 awake tori cost 11.6 ms/step (12 capsules), 13.4 ms
  (16) or 19.4 ms (24), against 2.1 ms for 200 spheres, so about 6x a sphere. A
  torus should be treated as an expensive object. Static tori were not measured.

Accuracy (ring error, m, at R = 1): 0.034 at N = 12, 0.019 at N = 16, 0.009 at N = 24.
N = 16 is the default in the spec. Rapier has compound shapes as well, but this
was only tried in Jolt.

## Jolt in the sandbox (`scripts/spashial-bench/browser/`)

The real test of the choice: Jolt's separate-`.wasm` build (`jolt-physics.wasm.js`
+ `.wasm`, single-threaded, so no SharedArrayBuffer or COOP/COEP headers needed)
loaded and run inside an iframe with the exact attributes of
`components/MoshionPreview.tsx` (`allow-scripts allow-downloads allow-modals`).
`serve.mjs` serves it like Cloudflare Pages would. Headless Chrome 157, this machine.

- **Without CORS headers it does not load.** `Access-Control-Allow-Origin` absent
  gives `Access to script ... from origin 'null' has been blocked by CORS policy`.
  This is the failure predicted from the `/reshape/kernel/*` precedent, reproduced.
- **With the two headers it works.** Three runs, all with `self.origin === 'null'`
  and `localStorage` throwing (so the sandbox really was on; note `location.origin`
  is derived from the URL and says otherwise, so do not test with that):
  the 105-box pyramid stood (0 boxes moved), nothing escaped the bin, no console errors.
- Load + init 174-310 ms. Pyramid step 1.2-1.5 ms mean. 400 awake bodies
  2.9-4.0 ms mean (Node gave 2.9 ms), so the Node numbers carry over to the browser
  within noise on this machine.
- Headers needed on whatever folder holds the files (same two as `/reshape/kernel/*`):

      /spashial/vendor/*
        Access-Control-Allow-Origin: *
        Cross-Origin-Resource-Policy: cross-origin

  Cloudflare Pages serves `.wasm` as `application/wasm`. Not applied to
  `public/_headers` yet: where the files live is undecided (below).
- Not tested: a strict CSP (the site sets none in `_headers` or the middleware, so
  none applies today), the Ultra 7, a Chromebook, Safari or Firefox.

## Shallot, measured (`~/Documents/GitHub/shallot`, v0.10.5 / 0.11.0-next.1)

An earlier note called it a "14 MB package". That is the npm tarball (sources,
tests, 30 examples), not what a game ships. Built from its own examples, gzipped:

| | gzip |
| --- | --- |
| minimal example (renderer + ECS, no physics) | 0.71 MB |
| physics example (adds physics, plus a Svelte UI and a font) | 2.1 MB |
| of which its physics solver wasm (1.22 MB raw) | 0.45 MB |
| for comparison: Jolt wasm + JS, and three.js | 0.88 MB + 0.19 MB = 1.07 MB |

So size does not separate them: shallot's solver is smaller than Jolt's, and a
whole shallot game is comparable to Jolt plus three.js. What does separate them:
shallot is **WebGPU-only** (unproven on school Chromebooks; the headless browser
here cannot run it), pre-1.0 with frequent API changes, and would need a beginner
facade over its ECS. Its physics is a Box3D port (Box2D's author), the same
lineage as moSHion's planck, which may make behaviour feel familiar. Its physics
speed and stacking were **not benchmarked**. Open: add it to `bench.mjs` and test
its WebGPU render on the Ultra 7 and a Chromebook before deciding. This does not
change the work done against `spashial.d.ts`, which is the seam either way.

## Integration facts that bite (found while checking)

1. **The preview iframe is sandboxed without `allow-same-origin`**, so it has an
   opaque origin and ES modules and `.wasm` are fetched in CORS mode. There is a
   proven precedent in `public/_headers` (`/reshape/kernel/*` carries
   `Access-Control-Allow-Origin: *` and `Cross-Origin-Resource-Policy:
   cross-origin`, measured 2026-09-01 with OpenCascade's wasm in this same
   sandbox). spaSHial's physics wasm and three.js need the same entry. Without
   it they fail before the wasm is even requested.
2. **`components/ShPlayPreview.tsx` has no `sandbox` attribute.** If it were wired
   up as is, student code would run same-origin with the signed-in session and
   could call `/api/*`. moSHion's iframe is sandboxed for exactly this reason
   (`allow-scripts allow-downloads allow-modals`; never `allow-same-origin`). The
   component is not mounted anywhere, so nothing is exposed today. **It must be
   sandboxed before it is ever used.**
3. **`public/shplay/runner.html` still imports three.js from unpkg.com**, although
   `vendor/three@0.180.0/three.module.js` exists and the README and the Wave 0
   commit say the runner uses it. School firewalls and the sandbox's CORS rule
   both argue for the vendored copy.
4. The vendored `three.module.js` and Jolt both want a header entry like (1).

## Milestone 1: what exists (2026-11-21)

Runnable now, standalone, no lesson wiring. Try it:

    node scripts/build-spashial-vendor.mjs      # Jolt + three.js into public/spashial/vendor/ (prebuild does it too)
    node scripts/spashial-serve.mjs             # serves public/ with the CORS headers; open /spashial/sandbox.html

| File | What it is |
| --- | --- |
| `public/spashial/physics.js` | The only file that talks to Jolt. No three.js. 53 tests in Node (`scripts/test-spashial-physics.mjs`, in `npm test`). |
| `public/spashial/spashial.js` | The sketch API on top: `Asset`, `Group`, `world`, `camera`, lights, `kb`, `mouse`, the fixed-step loop, perf panel, auto quality. |
| `public/spashial/runner.html` | The sandboxed preview page. Same `preview-console` / `preview-error` messages as the moSHion runner, code via `?code=` base64url. |
| `public/spashial/sandbox.html` | Standalone dev page: editor, seven example sketches, the exact production iframe sandbox. |
| `scripts/drive-spashial.py` | Browser test (56 checks, run by hand): drives the sandbox page and asserts on numbers read from inside the sandboxed iframe. |

**Built and tested in a browser:** `Asset` with box, sphere, cylinder, capsule, cone and
torus; live `pos`, `vel` (units per frame), `rotation` (degrees), `angularVelocity`;
`w/h/d/diameter/shape/scale`, `color/opacity/visible/metalness/roughness`;
`collider` (dynamic, static, kinematic, none), `friction/bounciness/density/mass/lockRotation`;
forces, impulses, `lookAt`, `distanceTo`, `moveTowards/Away`, `clone`, `remove`; the six touch
verbs on an Asset and on a `Group`, with callbacks; `Group` (`new g.Asset()`, `add`, `remove`,
`amount`, `cull`, cascading properties); `world.gravity`, `rayCast`, `rayCastAll`, `getAssetAt`,
`explodeAt`, `allowSleeping`, `autoStep`/`physicsUpdate`; `camera` (`pos`, `lookAt`, `fov`,
`follow`, `orbit`, `free`); ambient, sun, point and spot lights; `background`; `kb`; `mouse`;
a 2D HUD layer for `drawTop()` (`fill`, `text`, `rect`, `circle`, `line`, ...); `showPerf`;
`quality`; errors with plain words and line numbers; the loop stops on the first error.

**Not built yet** (in the spec, absent from the engine): textures, glTF models, joints, `Tiles`,
the billboard `text` label, `hull`/`mesh` shapes, `maxSpeed`, sounds, storage, `multiplayer`/`online`,
`Walls`-style helpers. Setting an unknown property is silently allowed, as in moSHion; so a
sketch that sets `a.texture = 'coin'` today does nothing and says nothing.

**Choices made while building (change any of them):**
- **Friction defaults to 0.5, not moSHion's 0.** Jolt (like Box2D) grips with the geometric mean of
  the two frictions, so a 0 default means nothing in a 3D scene ever stops sliding.
- Gravity starts at 0, as decided. Changing it wakes sleeping bodies (found by a test; Jolt does not).
- `Floor` has its top surface at y = 0. A new `Asset()` with no arguments sits where the camera looks.
- Physics is fixed at 60 Hz and the picture is interpolated between steps, so a 144 Hz screen is smooth.
- Auto quality cannot read GPU headroom (frame time is pinned at 16.7 ms on a 60 Hz screen either way),
  so it drops the render scale when frames run long and occasionally *tries* a step back up,
  waiting longer after each failure. Render scale never exceeds 1.
- Shadows and antialiasing are off by default.

**Found by testing, not by reading:**
- Jolt leaves sleeping bodies asleep when gravity changes (fixed).
- The Group touch verbs answered "yes" whenever asked, whatever the members said: a copy-paste
  `merge: () => true`. Caught by the browser driver, fixed.
- A clone is made on top of its original, so two solid bodies overlap and push apart. That is
  documented moSHion behaviour, and it made one of my own tests fail until I understood it.

**Known limits and next work:**
- One draw call per Asset (67 calls for 80 bodies in the Rain example). 300 bodies means about 300
  calls. Instancing identical shapes is the obvious next performance step; not measured on an Ultra 7.
- Frame rate was only seen on software GL (30 fps for 80 bodies, scale 0.5), which says nothing
  about integrated graphics. Run the Rain example with `showPerf()` on the real machine.
- Pointer lock (`mouse.lock()`) needs `allow-pointer-lock` in the iframe's sandbox; the production
  sandbox does not have it, so a first-person camera needs that decision.
- The keyboard needs the preview to have focus: click the picture first.
- Jolt shapes are not yet released when an Asset is removed (reference counting); a long session that
  makes and removes thousands of shapes may grow. Not measured.
- Nothing here is wired into LessonWorkspace or the Sandbox modes, and no migration exists.

## Open questions

- Is `Asset` clear enough next to the Library's "assets"? See the caution in the
  decisions table. If it causes confusion in docs, renaming is one identifier in
  `spashial.d.ts` while nothing is built on it.
- Should a torus (or any compound shape) show a cost warning in the perf HUD?
- Shared declarations (`Kb`, `Mouse`, `Sound`, storage, maths) are copied in slim
  form so the file stands alone. A build step should merge them from moSHion's
  file instead, or they will drift.

## Next steps

1. Run the benchmark on the real Ultra 7 desktop, and a Chromebook if one is handy.
2. Decide how Jolt's files reach `public/`: commit them (about 3 MB raw: 2.0 MB
   wasm + 0.97 MB JS, versus the 1.2 MB three.js already committed), or copy
   them from `node_modules` at prebuild like `public/reshape/kernel/` is. Then
   add the `_headers` entry above. (Running Jolt in a sandboxed browser iframe
   is done: see "Jolt in the sandbox".)
3. Build the engine core against `spashial.d.ts`: world, `Asset`, `Group`, the
   touch verbs, `update()` at a fixed step, a perf HUD and the render-scale
   fallback. Then assets, then the Sandbox mode (which needs a migration for the
   new project type; not applied without asking), then multiplayer (needs a
   protocol extension and a `workers/live` deploy).
