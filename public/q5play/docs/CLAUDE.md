# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

This is the distributable source of the **q5play** game engine (v4.0.1), shipped as a single hand-authored JavaScript file plus a hand-authored TypeScript declaration. There is no build step, no bundler, no test suite, and no linter configured.

- `q5play.js` (~8k lines) — the entire engine. Edit directly; do not split without discussion.
- `q5play.d.ts` (~3k lines) — public API types. Keep in sync with runtime behavior in `q5play.js`.
- `package.json` / `deno.json` — dual publishing config (npm + JSR). Versions and exports must be kept identical.
- `LICENSE.md` — q5play Creator License. Educational use requires a separate license; don't assume MIT/standard terms.

## Commands

- `npm run multi` — start a local HTTPS static server with COOP/COEP headers required for WebGPU + WASM SharedArrayBuffer. Uses `local-web-server` (`ws`); install globally (`npm i -g local-web-server`) or via `npx ws` if missing. The Deno equivalent is `deno task multi`.
- `npm run v` / `npm run V` — patch / minor version bump (forced). The `version` hook stages everything and `postversion` pushes to git — only run these when actually cutting a release.

There are no tests, lint, or typecheck scripts. Validate changes by loading a sketch in a browser served via the `multi` command.

## Runtime architecture

q5play is **not** a standalone runtime. It is a plugin that attaches to a [q5.js](https://q5js.org) instance (`Q5`) and requires [Box2D v3 WASM](https://github.com/Birch-san/box2d3-wasm) for physics. The engine registers four lifecycle hooks via `Q5.addHook(...)` at the bottom of `q5play.js`:

- `presetup` → `q5playPreSetup($, q)` — async; imports Box2D WASM, destructures ~200 `b2*` symbols, and installs every engine class onto the Q5 instance (`$`).
- `postsetup` → `q5playPostSetup()` — wires up the user's `update` function and marks setup complete.
- `predraw` → `q5playPreDraw()` — per-frame: updates input devices, runs grab/overlap tracking, calls user `update()`, steps the physics world, auto-culls sprites.
- `postdraw` → `q5playPostDraw()` — per-frame: draws sprites through the camera, decays input edge counters (`press`, `drag`, `kb[key]`), computes FPS.

Everything the engine exposes is hung off `$` (the Q5 instance) inside `q5playPreSetup`. The main classes and where they live in `q5play.js`:

- `$.Q5Play` (~236) — per-sketch engine state: `sprites`, `groups`, `palettes`, `os`, `renderStats`, input/pointer flags.
- `$.Visual` (~566) → `$.Sprite` (~795) — the base drawable and its physics-backed subclass. `Sprite` is the heart of the engine; most behavior lives here.
- `$.Ani` (~3138) `extends Array`, `$.Anis` (~3586) — sprite-sheet animation frames and named-animation container.
- `$.Visuals` (~3684) `extends Array` → `$.Group` (~3877) — collection types. `Group` proxies most `Sprite` properties to its members; `Sprite.prototype.addAni/addAnis` are shared onto `Group.prototype` and `Visuals.prototype` near line 4724.
- `$.World` (~4727) — wraps a Box2D `b2World`; owns gravity, time scale, sub-steps, pre-solve/custom-filter callbacks that route Box2D shape IDs back to JS sprites via `shapeDict`.
- `$.Camera` (~5137).
- `$.Joint` (~5320) and subclasses: `GlueJoint`, `DistanceJoint`, `WheelJoint`, `HingeJoint`, `SliderJoint`, `GrabberJoint`.
- `$.InputDevice` (~6670) → `$._Mouse`, `$._Pointer`, `$._Keyboard`, `$.Contro` (gamepad), `$._Contros extends Array`.
- Utility top-level functions: `$.EmojiImage`, `$.parseTextureAtlas`, `$.animation`, `$.frameRate`, internal `Scale`, `FriendlyError`.

### Key invariants when editing

- **Don't reorder the Box2D destructure** at the top of `q5playPreSetup` unless you also update every call site — symbols are bound as locals and used throughout the file.
- **Sprite ↔ Box2D mapping** is routed through `shapeDict`; the pre-solve and custom-filter callbacks (~4770–4800) assume every live shape's `sprite` is reachable. Preserve that linkage when changing shape creation/destruction paths.
- **Edge-triggered input counters** (`mouse.left`, `kb[key]`, `pointer.press`, `pointer.drag`) rely on the increment/decrement dance in `q5playPostDraw` (~8094–8124). Changing the convention there will silently break `presses()` / `released()` helpers everywhere.
- **Friendly rounding** (`friendlyRounding` in `Q5Play`, ~234) exists to hide Box2D floating-point drift from beginners. Many `Sprite` getters snap values within linear/angular slop. Don't "clean this up" without understanding the beginner-facing rationale called out in `q5play.d.ts:32–43`.
- **`q5play.js` and `q5play.d.ts` ship together** — public API changes must be reflected in both. The `.d.ts` is authored by hand; it is not generated.
- **Dual packaging**: `package.json` (npm) and `deno.json` (JSR) both declare `version`, `exports`/`main`, and `types`. Keep them aligned.

## Consuming q5play (context for user-facing questions)

Users load q5.js first, then q5play.js, then write a global-mode sketch with `setup()` / `update()` / `draw()` and instantiate `Sprite` / `Group` / `World`. The `q5playPostSetup` hook auto-aliases `window.update` onto `$.update`, and `q5playPreDraw` calls `$.update()` each frame before stepping physics — so user-authored `update()` runs in the physics phase, not the render phase.
