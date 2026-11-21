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
| Renderer | three.js on **WebGL2** | Runs on the Ultra 7 and on Chromebooks from one code path. The headless browser here has no WebGPU, and shallot (WebGPU-only, Rust/wasm, 14 MB package) failed its first spike. WebGPU can come later **behind the same API**. |
| Name of a 3D object | **`Thing`** (provisional) | `Body` is the obvious word but collides with the DOM's global `Body` interface (the fetch mixin): `class Body` merges with it and every object grows `.text()`/`.json()` in editor typings. `Thing`, `Solid`, `Shape`, `Piece`, `Actor` are all free. One identifier to rename while this is only a spec. |
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
- Jolt running in the browser (only Node was tested), including the build with a
  separate `.wasm` file. See the integration notes.

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

## Open questions

- Should a 3D world start with gravity on? moSHion starts at 0 (nothing falls
  until `world.gravity.y` is set); the old shPlay fell by default. The spec
  follows moSHion; a 14-year-old's first cube will not fall until told to.
- `torus` is dropped from the physics shapes (no primitive collider in either
  library); shPlay had one. Keep it visual-only, or drop it?
- The name `Thing`. Free in the DOM and in moSHion. Cheap to change now.
- Shared declarations (`Kb`, `Mouse`, `Sound`, storage, maths) are copied in slim
  form so the file stands alone. A build step should merge them from moSHion's
  file instead, or they will drift.

## Next steps

1. Run the benchmark on the real Ultra 7 desktop, and a Chromebook if one is handy.
2. Run Jolt in a browser, inside a sandboxed iframe, from `public/` with the
   header entry above. This is the real test of the choice.
3. Build the engine core against `spashial.d.ts`: world, `Thing`, `Group`, the
   touch verbs, `update()` at a fixed step, a perf HUD and the render-scale
   fallback. Then assets, then the Sandbox mode (which needs a migration for the
   new project type; not applied without asking), then multiplayer (needs a
   protocol extension and a `workers/live` deploy).
