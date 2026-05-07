# Unit 3: shPlay — 3D Game Development
## Implementation Plan

**File path:** `C:\Users\shuff57\Documents\GitHub\shCode\plans\unit-3-shplay.md`

---

## Section 1: Plan Overview

### Goal

Unit 3 teaches high-school students how to program interactive 3D scenes using shPlay, the hand-written three.js facade that mirrors q5play's beginner API. By the end students can construct a 3D world from primitive shapes, wrap shapes in OOP classes, manage collections of objects with distance-based interaction, control a camera in 3D space, compose a scene with intentional lighting and materials, and deliver a playable 3D Platformer as the unit final.

### Audience and Prerequisites

Students entering Unit 3 have completed:
- Unit 1 — JS basics: variables, conditionals, loops, functions, arrays
- Unit 2 — q5play: Sprite, Group, kb, camera.x/y, lerp, storeItem/getItem, switch-based state machines

They are comfortable with `setup()` / `draw()`, classes with constructors and methods, and the pattern of declaring a let at top scope and assigning it in `setup()`.

They have **not** worked in 3D before. The coordinate system (three axes, handedness, Y-up), the concept of a camera as an object with a position and a direction, and the idea that lighting changes how surfaces look are all new.

### High-Level Phase Map (13 modules)

Modules sized to ~20 lessons each per the soft target in `plans/lesson-numbering-convention.md` Section 6. Larger v3 modules split at concept boundaries — no lessons removed, just rebalanced into smaller modules.

```
Phase 0  — Library expansion + preview infrastructure (parallel with all lesson writing)
Phase 1  — Module 3.1:  Coordinates & Transforms       → Project: Spinning Sculpture       (~22)
Phase 2  — Module 3.2:  Shapes & Composition           → Project: Solar System              (~25)
Phase 3  — Module 3.3:  OOP in 3D — Foundations        (single-shape classes, methods)      (~21)
Phase 4  — Module 3.4:  OOP in 3D — Composition        → Project: Custom 3D Character       (~18)
Phase 5  — Module 3.5:  Groups — Foundations           (Group, distance, despawn)           (~18)
Phase 6  — Module 3.6:  Groups — Collector Game        → Project: Collector Game            (~18; mid-unit writeup)
Phase 7  — Module 3.7:  Camera in 3D                   (position, lookAt, follow, orbit)    (~16)
Phase 8  — Module 3.8:  Animation & Walkable Scene     → Project: Walkable Scene            (~17)
Phase 9  — Module 3.9:  Lighting Foundations           (ambient + directional)              (~15)
Phase 10 — Module 3.10: Light Studio                   → Project: Light Studio              (~15)
Phase 11 — Module 3.11: Materials & Atmosphere         → Project: Mood Scene                (~26)
Phase 12 — Module 3.12: 3D Platformer — Mechanics      (physics, jump, WASD integration)    (~15)
Phase 13 — Module 3.13: 3D Platformer — Build & Ship   → Project: 3D Platformer (Unit Final, last writeup) (~14)
```

**Total: ~240 lessons across 13 modules.** Soft target ~20 per module; range 14–26.

Modules are sequenced by concept dependency, not calendar; teachers pace as needed.

**Why ~20 per module:** intro-course audiences benefit from "I finished a module today" momentum every few class sessions, not every fortnight. ~20 lessons fits ~3–4 class periods at this pace. Wave-by-wave authoring scales linearly with module size; ~20 is the largest comfortable batch. Returning students after an absence pick up at the next module boundary without missing five concept clusters.

**Plan-doc note:** Section 3 below has six top-level module sections (the v3 8-module structure with two further splits not yet inlined). The lesson tables and project specs in those sections are accurate; the further sub-splits documented here (3.3→3.3+3.4, 3.4→3.5+3.6, 3.5→3.7+3.8, 3.6→3.9+3.10, 3.7→3.11, 3.8→3.12+3.13) happen during the bulk rename — no inline table rewrite needed. Each affected v3 section has a banner pointing to the convention file's split-point note.

**Module size justification:** the intro-course constraint (one new concept per lesson, never compound) drives the lesson count. A module with 4–5 new API concepts needs 4–5 readings, 4–5 labs, 2–3 worked examples, 5–6 build-up labs, a named project assignment, optionally a writeup, and a challenge. That math produces 18–25 lessons per module. Modules over 25 split; modules under 14 absorb a sibling sandbox or merge.

---

## Section 2: Phase 0 — shPlay Library Expansion

All additions go into `public/shplay/shplay.js`. Current line count: 236. Estimated post-Phase-0 line count: ~590.

### 2.1 New Primitives: Cone, Cylinder, Torus

**API:**
```js
new Cone(x, y, z, radiusBottom, height)     // defaults: 0,0,0, 0.5, 1
new Cylinder(x, y, z, radius, height)        // defaults: 0,0,0, 0.5, 1
new Torus(x, y, z, radius, tube)            // defaults: 0,0,0, 0.6, 0.2
```

Each class has `.position`, `.rotation`, `.scale`, `.color` getter/setter, `.remove()` — identical to `Cube`.

**`.size` clarification:** `.size` (uniform-scale shorthand) is exposed ONLY on `Cube` and `Sphere`, where uniform scale has a single intuitive meaning. Cone/Cylinder/Torus have separate radius and height (or ring/tube radii) parameters; a single `.size` setter would be ambiguous. Students adjust those shapes via `.scale.x/y/z` (per-axis) instead. **Also:** add a `.size` setter to `Plane` during this Phase 0 task — the live `public/shplay/shplay.js` (lines 74–90) currently lacks one, breaking the API parity claim.

Cone maps to `THREE.ConeGeometry(radiusBottom, height, 32)`. Cylinder maps to `THREE.CylinderGeometry(radius, radius, height, 32)`. Torus maps to `THREE.TorusGeometry(radius, tube, 16, 64)`.

All three use `MeshStandardMaterial` matching the existing primitives.

**Files to modify:** `public/shplay/shplay.js` — add three classes after `Plane` (~lines 91–120 post-expansion); add `window.Cone = Cone; window.Cylinder = Cylinder; window.Torus = Torus;` to the globals block.

**Sandbox test:** Add example `shapes2` to `public/shplay/sandbox.html`: a Cone, Cylinder, and Torus at x = −2, 0, +2 each slowly rotating on Y.

**Acceptance criteria:** All three shapes appear in the sandbox. `.color`, `.rotation.y += 0.01`, and `.remove()` behave identically to Cube. Cone tip points up by default (ConeGeometry default orientation is already Y-up).

**Blocks:** Module 3.1 (students need more than Cube/Sphere/Plane to make interesting scenes from day one).

---

### 2.2 random(min, max) Helper

**API:**
```js
random(min, max)  // returns a float in [min, max)
```

Maps to `Math.random() * (max - min) + min`. Exposed as `window.random`. Matches q5play's `random()` semantics students already know.

**Files to modify:** `public/shplay/shplay.js` — 3-line function, one globals assignment.

**Sandbox test:** Add example `randomColors` — a grid of 25 cubes each with `cube.color = '#' + Math.floor(random(0, 0xffffff)).toString(16).padStart(6,'0')` spawned in setup.

**Acceptance criteria:** `random(0, 10)` returns a float in 0–10 across 100 calls.

**Blocks:** Module 3.1 (first labs use random positions and colors).

---

### 2.3 degrees(rad) and radians(deg) Helpers

**API:**
```js
degrees(rad)   // rad * 180 / Math.PI
radians(deg)   // deg * Math.PI / 180
```

Exposed as `window.degrees` and `window.radians`. Rationale: rotations in shPlay are in radians (three.js default), but introducing radians as a concept to intro students while they are also learning 3D for the first time compounds two novel things. These helpers let Module 3.1 use `cube.rotation.y = radians(45)` immediately and defer the radian explanation to a single focused reading in 3.1.

**Files to modify:** `public/shplay/shplay.js` — 4 lines total.

**Sandbox test:** No separate sandbox needed; integrated into the `spin3d` example update.

**Acceptance criteria:** `radians(90)` returns `Math.PI / 2` ± 1e-6; `degrees(Math.PI)` returns 180 ± 1e-6.

**Blocks:** Module 3.1 (rotation labs use `radians()` on day one).

---

### 2.4 distance(a, b) and intersects(a, b)

**API:**
```js
distance(a, b)     // returns THREE.Vector3.distanceTo between a.mesh.position and b.mesh.position
intersects(a, b)   // returns boolean: sphere-sphere overlap using each object's bounding sphere radius
```

`distance(a, b)` — delegates to `a.mesh.position.distanceTo(b.mesh.position)`. Works on any shPlay shape object (they all have `.mesh`).

`intersects(a, b)` — computes each mesh's bounding sphere radius by calling `mesh.geometry.computeBoundingSphere()` and reading `mesh.geometry.boundingSphere.radius`, then checks `distance(a, b) < (rA + rB)`. This is fast and good enough for beginner collision detection; it is NOT pixel-perfect AABB. Document this honestly in the reading: "works well for sphere-shaped objects; may miss corner hits on cubes."

**Files to modify:** `public/shplay/shplay.js` — ~20 lines. Add `window.distance = distance; window.intersects = intersects;` to globals.

**Sandbox test:** Add example `collide` to sandbox — two slowly-drifting spheres that turn red when `intersects(a, b)` is true.

**Acceptance criteria:** `distance(a, b)` matches `THREE.Vector3.distanceTo` exactly; `intersects` returns true when two spheres are clearly overlapping and false when separated by more than 2 radii.

**Blocks:** Module 3.3 (collectibles + despawn logic).

---

### 2.5 Group Class

**API:**
```js
const g = new Group()
g.add(shapeObj)           // pushes shape into internal array
g.remove(shapeObj)        // removes shape AND calls shape.remove() (disposes geometry/material)
g.forEach(fn)             // iterates, fn receives each shape object
g.filter(fn)              // returns plain JS array (does not mutate g)
get g.length              // number of members
```

`Group` is a thin wrapper over a plain JS array. It does NOT subclass `Array` (that causes prototype confusion). It IS iterable via `[Symbol.iterator]` so `for (let s of group)` works.

**Defensive remove:** `g.remove(shape)` is silently a no-op if `shape` is not in the group. Beginner refactors call `group.remove(s)` twice; the no-op behavior prevents "shape not in group" errors from surfacing as confusion.

Rationale for adding Group rather than teaching bare arrays: Module 3.3 is explicitly the parallel to Unit 2.3. Having `Group` lets lesson text and grader patterns match the Unit 2 mental model. A plain array would require students to remember `.splice()` and backwards-iteration patterns before those have been taught in 3D context. `Group.remove()` handles the `shape.remove()` + array splice in one call, eliminating the "I forgot to dispose geometry" class of bug that produces memory leaks.

**Files to modify:** `public/shplay/shplay.js` — ~40 lines. Add `window.Group = Group;`.

**Sandbox test:** Add example `groupDemo` — spawn a grid of cubes into a Group; press Space to remove them one by one with `g.remove(g.filter(...)[0])`.

**Acceptance criteria:** `g.add(cube); g.length === 1; g.remove(cube); g.length === 0`; the cube disappears from the scene on remove; `for (let s of g)` iterates without error.

**Blocks:** Module 3.3.

---

### 2.6 Light Controls

**API:**
```js
// Returned by shPlay internally; exposed as globals after spawnDefaults()
window.ambientLight     // { get/set intensity, get/set color }
window.sunLight         // { get/set intensity, get/set color, position: Vector3 }

// Factory for additional lights
new PointLight(x, y, z, color, intensity)   // adds a THREE.PointLight to scene
new SpotLight(x, y, z, color, intensity)    // adds a THREE.SpotLight to scene
// Both return objects with .position (Vector3), .color setter, .intensity setter, .remove()
```

`ambientLight` and `sunLight` are handles over the existing `ambient` and `sun` lights that `spawnDefaults()` already creates. Currently those are private locals; this addition stores them in module scope and exposes read/write handles.

`PointLight` and `SpotLight` are factory classes parallel to shape classes, using `THREE.PointLight` and `THREE.SpotLight` internally.

**Files to modify:** `public/shplay/shplay.js` — modify `spawnDefaults()` to store `ambient` and `sun` in module-scope variables; add handle objects; add PointLight and SpotLight classes (~80 lines total). Add globals: `window.ambientLight`, `window.sunLight`, `window.PointLight`, `window.SpotLight`.

**Sandbox test:** Add example `lights` — start with sunLight.intensity = 0; a PointLight orbits a cube using `Math.sin/cos(frameCount * 0.03)`; press L to toggle `ambientLight.intensity` between 0 and 0.5.

**Acceptance criteria:** Changing `ambientLight.intensity = 0` visibly darkens the scene. Moving `sunLight.position.x` changes shadow angle (even without shadow maps, directional lighting direction changes). PointLight turns off scene on `.remove()`.

**Blocks:** Module 3.5 entirely.

---

### 2.7 Material Controls

**API:**
```js
// On any shape object (Cube, Sphere, etc.)
shapeObj.metalness   // getter/setter, 0.0–1.0, maps to material.metalness
shapeObj.roughness   // getter/setter, 0.0–1.0, maps to material.roughness
shapeObj.wireframe   // getter/setter boolean, maps to material.wireframe
```

No new material types — all shapes already use `MeshStandardMaterial` which supports `metalness` and `roughness`. Just add the three property accessors to all shape classes. A shared mixin function `addMaterialProps(instance)` avoids repeating the accessors in every class.

**Files to modify:** `public/shplay/shplay.js` — add `addMaterialProps(obj)` function (~15 lines); call it in the constructor of Cube, Sphere, Plane, Cone, Cylinder, Torus (~6 lines total).

**Sandbox test:** Add example `materials` — a row of 5 spheres with metalness from 0 to 1, roughness from 1 to 0.

**Acceptance criteria:** A sphere with `metalness=1, roughness=0` looks visibly shinier than one with `metalness=0, roughness=1`.

**Blocks:** Module 3.5.

---

### 2.8 camera.follow(target) and camera.orbit(speed)

**API:**
```js
camera.follow(target)       // sticky — sets camera position each frame to target.position + offset(0,3,7)
camera.follow(target, dx, dy, dz)  // custom offset
camera.clearFollow()        // cancel follow
camera.orbit(speed)         // rotates camera around origin at `speed` radians/frame (optional)
```

`camera.follow()` stores the target and offset, then in the render loop updates `_camera.position` to `target.mesh.position.clone().add(offset)` and calls `_camera.lookAt(target.mesh.position)` before each frame.

**Precedence rule (camera modes):** `orbit > follow > lookAt`; the most recently set mode wins. `camera.clearFollow()` and `camera.clearOrbit()` reset to manual mode (where `camera.lookAt()` works again). Manual `camera.position.x = ...` and `camera.lookAt(...)` calls take effect ONLY in manual mode. While `follow` or `orbit` is active, manual lookAt is silently overridden each frame — document this explicitly in lesson `3-4-005c-reading-lookat` so students don't think their lerp lab is broken.

**Existing-code fix:** the live `public/shplay/shplay.js` (lines 150–151) calls `_camera.lookAt(_lookAtTarget)` unconditionally each frame. Update that loop to check active mode (`_followTarget` ? `_orbitSpeed` ? `_lookAtTarget`) before applying.

**Files to modify:** `public/shplay/shplay.js` — add follow/orbit state to `_camHandle`; modify `frame()` to apply follow/orbit each tick with mode precedence (~45 lines).

**Sandbox tests:** Add two examples to `public/shplay/sandbox.html`:
1. `camera-follow` — a moving cube on a sine path; `camera.follow(cube)` tracks it.
2. `camera-orbit` — a static scene; `camera.orbit(0.01)` rotates the camera around origin.

**Acceptance criteria:** `camera.follow(cube)` keeps the cube centered as it moves. `camera.clearFollow()` returns to manual; subsequent `camera.lookAt()` works. `camera.orbit(speed)` rotates around origin; `camera.clearOrbit()` returns to manual. `camera.lookAt()` while following is a documented no-op (and the reading explains why).

**Blocks:** Modules 3.4 and 3.6.

---

### 2.9 frameRate / deltaTime

**API:**
```js
window.deltaTime    // seconds since last frame, capped at 0.1 (so paused-tab spikes don't explode physics)
```

Computed in the `frame()` function using `performance.now()`. Exposed as `window.deltaTime`. Not used until Module 3.4 (time-based animation), but adding it in Phase 0 costs 5 lines.

**Files to modify:** `public/shplay/shplay.js` — 5 lines in `frame()` + globals.

**Blocks:** Modules 3.4 and 3.6.

---

### 2.10 Simple Y-axis Physics (opt-in)

**API:**
```js
// Per-shape opt-in physics
const cube = new Cube(0, 5, 0)
cube.usePhysics = true    // opt-in
cube.vel = { x: 0, y: 0, z: 0 }  // exposed on shape objects with usePhysics
cube.onGround             // read-only boolean

window.gravity = 9.8      // world-level gravity constant (m/s^2 equivalent in scene units)
```

**Frame tick order** (each frame, before student `draw()`):

1. For each shape `S` with `usePhysics`: `S.vel.y -= gravity * deltaTime`
2. For each shape `S` with `usePhysics`: `S.position.x/y/z += S.vel.x/y/z * deltaTime`
3. **Ground-collision pass** (AABB — see below)
4. At start of next tick, clear `S.onGround` to `false` (it gets re-set in step 3 if applicable)

**Ground-collision pass (AABB) — the platform fix:**

```
For each shape S with usePhysics and S.vel.y <= 0:
  For each registered ground G in _grounds[]:
    If S.position.y - S.halfHeight <= G.position.y + G.halfHeight:
      If S.position.x within [G.position.x - G.halfWidth, G.position.x + G.halfWidth]:
        If S.position.z within [G.position.z - G.halfDepth, G.position.z + G.halfDepth]:
          S.position.y = G.position.y + G.halfHeight + S.halfHeight   // clamp to top
          S.vel.y = 0
          S.onGround = true
          break  // first-hit wins
```

This fixes the "player falls through every platform" bug — flat-floor-only collision (the prior spec) breaks Module 3.6 entirely.

**Friction/drag:**
- When `S.onGround === true`: `S.vel.x *= S.friction; S.vel.z *= S.friction;` (default `friction = 0.85`, sliding stop on ground)
- When `S.onGround === false` (in air): `vel.x/z` persist unchanged (Mario-style horizontal control freeze on jump)
- Students can opt out per-shape: `shape.friction = 1.0` disables dampening

**Registration:**
- Setting `usePhysics = true` auto-registers the shape into `_physicsObjects[]` for the gravity loop.
- Setting `isGround = true` auto-registers the shape into `_grounds[]` as a collision target.
- `Plane` defaults `isGround = true`. `Cube.isGround` is set explicitly by Module 3.6 platforms.
- `shape.remove()` deregisters from both lists (tested in sandbox).

**Globals exposed:**
```js
window.gravity = 9.8        // editable per-sketch (set in setup)
shape.usePhysics = true     // opt-in
shape.vel = { x, y, z }     // exposed when usePhysics is true
shape.onGround              // read-only boolean
shape.isGround              // boolean; defaults: Plane=true, Cube=false
shape.friction = 0.85       // dampens vel.x/z on ground
shape.halfHeight/halfWidth/halfDepth  // computed from geometry, read-only
```

**Files to modify:** `public/shplay/shplay.js` — ~85 lines (frame-tick loop, AABB pass, registration in shape constructors and `remove()`, friction loop, new globals, halfDimension getters).

**Sandbox tests:** Add two examples to `public/shplay/sandbox.html`:
1. `physics-floor` — a Sphere dropped from y=5 onto the Plane floor; bounces are dampened to rest.
2. `physics-platforms` — a Sphere with `usePhysics` lands on a layout of 3 Cube platforms (`isGround = true`) at varied (x, y, z); WASD nudges horizontal velocity to walk between them.

**Acceptance:** Sphere lands on raised platforms (not just the floor) and stays put with `vel.y === 0` and `onGround === true`. Removing a platform via `cube.remove()` deregisters it; subsequent landings on the empty space fall through to the floor.

**Blocks:** Module 3.13 (3D Platformer — Build & Ship, Unit Final — hard requirement). Module 3.5/3.6's collision lessons reference the same AABB intuition.

---

### 2.11 Infrastructure: Preview Type + Component

**2.11a — `lib/types.ts` line 82**

Change:
```typescript
preview?: 'html' | 'console' | 'jscad' | 'q5play' | 'reading' | 'video' | 'example' | 'challenge' | 'assignment' | 'slides';
```
To:
```typescript
preview?: 'html' | 'console' | 'jscad' | 'q5play' | 'shplay' | 'reading' | 'video' | 'example' | 'challenge' | 'assignment' | 'slides';
```

**2.11b — `components/ShPlayPreview.tsx`** (new file, mirrors `components/Q5PlayPreview.tsx`)

```typescript
'use client';
import { forwardRef, useEffect, useRef } from 'react';
import { encodeCode } from '@/lib/encode-code';

interface Props { code: string; runKey: number; }

const ShPlayPreview = forwardRef<HTMLIFrameElement, Props>(function ShPlayPreview({ code, runKey }, ref) {
  const localRef = useRef<HTMLIFrameElement | null>(null);
  // Dispose WebGL on unmount to avoid Chrome's ~16-context cap
  useEffect(() => {
    return () => {
      try { localRef.current?.contentWindow?.postMessage({ source: 'shplay-host', type: 'dispose' }, '*'); } catch {}
    };
  }, []);
  if (runKey === 0 || !code.trim()) {
    return <div className="jscad-empty"><p>Click <strong>Run</strong> to execute your shPlay sketch.</p></div>;
  }
  const src = `/shplay/runner.html?code=${encodeCode(code)}&r=${runKey}`;
  return (
    <iframe ref={(el) => { localRef.current = el; if (typeof ref === 'function') ref(el); else if (ref) ref.current = el; }}
      key={runKey} id="preview" className="jscad-frame"
      allow="autoplay; fullscreen; gamepad; clipboard-write" src={src} />
  );
});
export default ShPlayPreview;
```

**Extract `encodeCode` to `lib/encode-code.ts`** — currently lives in `components/Q5PlayPreview.tsx`; move it so both previews import the same source. This is a 5-minute refactor: move the function, add `export`, update `Q5PlayPreview.tsx` to import from the new path.

**Dispose contract (both sides):**
- `ShPlayPreview` posts `{ source: 'shplay-host', type: 'dispose' }` to its iframe on unmount.
- `public/shplay/runner.html` adds a `window.addEventListener('message', ...)` listener that calls `renderer.dispose()`, `scene.clear()`, and clears the rAF loop. This frees the WebGL context immediately rather than waiting for GC; avoids the "Too many active WebGL contexts" Chrome warning during fast lesson navigation.

**2.11c — `components/LessonWorkspace.tsx` — branch sweep**

The component currently has ~8 references to `isQ5Mode` (a boolean derived from preview type). Each branch needs a shplay disposition. Add `const isShPlayMode = lesson.preview === 'shplay';` alongside `isQ5Mode`. Add `import ShPlayPreview from './ShPlayPreview';`. Then sweep every `isQ5Mode` reference:

| Branch (search for `isQ5Mode`) | Current behavior in q5 mode | shPlay disposition |
|---|---|---|
| Run button label | "Run q5 sketch" | "Run 3D sketch" when `isShPlayMode`; share the same enable/disable logic |
| Run handler | `runQ5()` | Add `runShPlay()` with identical shape (snapshot `files['script.js']`, bump `shplayRunKey`); dispatch by mode |
| Preview render | `<Q5PlayPreview code={q5Code} runKey={runKey}/>` | Add branch: `isShPlayMode ? <ShPlayPreview code={shplayCode} runKey={shplayRunKey}/> : ...` |
| Submit gate | requires green `requirements` | Same logic; applies uniformly |
| Status badge | shows q5 status | Show shplay status (parent listens for `shplay-status` postMessages) |
| Score header units | "iterations" or commits count | "frames" or commits count (cosmetic) |
| Docs drawer link | `/docs/q5play` | `/docs/shplay` when `isShPlayMode` |
| AI-help context routing | passes `unit` to ai-help | Same — ai-help.ts switches on `lessonId` prefix (see 2.11d) |

State variables added: `const [shplayCode, setShplayCode] = useState('');` and `const [shplayRunKey, setShplayRunKey] = useState(0);` parallel to the existing `q5Code`/`runKey`. ~50 lines added total.

**Verification step for the dev:** `grep -n "isQ5Mode" components/LessonWorkspace.tsx` must show every match has either an `isShPlayMode` companion or the comment `// q5-only branch — shplay never enters here` justifying why not.

**2.11d — `lib/shplay-docs.ts`** (new file)

```typescript
import type { DocSection, DocPage } from './q5play-docs';
// Reuse the existing types — extract them to lib/docs-types.ts if a sibling rewrite needs them.

export const SHPLAY_DOCS: DocSection[] = [
  // 13 sections — see table below
];

export function findRelevantDocs(keywords: string[], n = 3): DocPage[] {
  // Same algorithm as q5play-docs.findRelevantDocs:
  // tokenize each section's body, score by keyword overlap, return top-n DocPages
}
```

**13 DocSection entries** (skeleton; content authored in Wave 0):

| Slug | Title | Covers |
|---|---|---|
| `shplay-overview` | Overview | setup/draw lifecycle, coordinate system, Y-up |
| `shplay-shapes` | Shapes | Cube, Sphere, Plane, Cone, Cylinder, Torus constructors |
| `shplay-transforms` | Transforms | `.position`, `.rotation`, `.scale`, `.size` |
| `shplay-color` | Color | named colors, hex, `.color` setter |
| `shplay-input` | Input (kb) | `kb.pressing`, `kb.presses`, `kb.releases` (identical to q5play) |
| `shplay-camera` | Camera | `camera.position`, `camera.lookAt`, `camera.follow`, `camera.orbit`, precedence rule |
| `shplay-lights` | Lights | `ambientLight`, `sunLight`, `PointLight`, `SpotLight` |
| `shplay-materials` | Materials | `.metalness`, `.roughness`, `.wireframe` |
| `shplay-groups` | Groups | `Group`, `.add`, `.remove`, `.forEach`, `[Symbol.iterator]` |
| `shplay-collision` | Collision | `distance(a, b)`, `intersects(a, b)`, bounding-sphere semantics |
| `shplay-physics` | Physics | `usePhysics`, `vel`, `onGround`, `gravity`, `isGround`, AABB |
| `shplay-parenting` | Parenting | `parent(child, parentObj)` (see Section 2.12) |
| `shplay-helpers` | Helpers | `random`, `radians`, `degrees`, `frameCount`, `deltaTime`, `background` |

**`functions/api/ai-help.ts` routing (update existing endpoint):**
```ts
import { SHPLAY_DOCS, findRelevantDocs as findShplayDocs } from '../../lib/shplay-docs';
import { Q5PLAY_DOCS, findRelevantDocs as findQ5Docs } from '../../lib/q5play-docs';

// Inside the request handler, after parsing body:
const lessonId: string = body.lessonId || '';
const useShplay = lessonId.startsWith('3-');
const findRelevant = useShplay ? findShplayDocs : findQ5Docs;
// ... use findRelevant(keywords, 3) instead of the current single-source call
```

**Unit-string allowlist validator** (also in `ai-help.ts`):
```ts
const UNIT_RE = /^[123]\.\d+ /;   // matches "1.1 ", "2.3 ", "3.5 ", etc.
if (!UNIT_RE.test(body.unit || '')) {
  return new Response(JSON.stringify({ error: 'invalid lesson.unit' }), { status: 400 });
}
```

This prevents lesson-author typos (e.g., `"3.1 Foundations "` with trailing space) from creating separate AI-help quota buckets.

**Blocks:** Every shplay lesson that uses `preview: 'shplay'` (i.e., all labs, examples, assignments, challenges in modules 3.1–3.6).

---

### 2.12 Parenting helper (`parent(child, parentObj)`)

**API:**
```js
parent(child, parentObj)   // attaches child.mesh as a child of parentObj.mesh
unparent(child)            // detaches; child returns to scene root
```

Internally calls `parentObj.mesh.add(child.mesh)` (three.js parent-child). The child's `position`, `rotation`, and `scale` become **local** — relative to the parent's transform — not world. Move the parent and the children come along.

**Why:** Module 3.2's Custom 3D Character (Robot) project composes a body Cube + head Sphere + arm Cylinders into one logical character. Without parenting, a `bob()` method that animates `body.position.y` leaves the head and arms floating in midair. With parenting, the entire robot moves as one. This pattern is the 3D analog of a q5play class wrapping a single Sprite — Module 3.2's whole pedagogical premise depends on it.

**Tradeoff to teach:** parenting changes the coordinate frame. A child's `position.x = 0` after `parent(child, body)` is at the body's center, not the world origin. Module 3.2 introduces this with a dedicated reading.

**Naming caveat:** `parent` shadows `window.parent` (DOM parent frame), but the runner iframe has no meaningful `window.parent` access pattern in shPlay sketches — collision is intentional and worth the q5-style brevity. Document the shadow in `shplay.js` with a comment.

**Files to modify:** `public/shplay/shplay.js` — ~15 lines (parent + unparent + globals registration). Add `window.parent = parent; window.unparent = unparent;`.

**Sandbox test:** Add example `parenting` to `public/shplay/sandbox.html` — a Sphere parented to a Cube; the Cube oscillates left/right via `position.x`; the Sphere visibly tags along.

**Acceptance:** A child's world position equals `parent.position + child.localPosition` after `parent(...)`. `unparent(...)` returns the child to scene root with its world position preserved.

**Blocks:** Module 3.2 (Robot project requires this).

---

### 2.13 Vendor three.js into `public/shplay/vendor/`

**Problem:** Current `public/shplay/runner.html` and `sandbox.html` import three.js via importmap from `https://unpkg.com/three@0.180.0/build/three.module.js`. Multi-year school-district curriculum should NOT depend on a third-party CDN — risks include CDN outage during exams, school firewall blocking unpkg, URL rewrites in 2027+, and old Chromebooks lacking importmap support (Chrome 89+, March 2021).

**Action:**
1. Download `three@0.180.0` `three.module.js` (~600 KB) into `public/shplay/vendor/three@0.180.0/three.module.js`. Same for any addon (e.g., none currently needed; OrbitControls is unused).
2. Update both importmaps:
   ```html
   <script type="importmap">
   { "imports": { "three": "/shplay/vendor/three@0.180.0/three.module.js" } }
   </script>
   ```
3. Add `public/shplay/README.md` documenting the upgrade path (curl new version → drop in vendor folder → bump importmap path → test in sandbox).

**Acceptance:** App loads with no requests to `unpkg.com` in DevTools Network tab. Works offline (after initial cache).

**Files to modify:** `public/shplay/runner.html`, `public/shplay/sandbox.html`. **New files:** `public/shplay/vendor/three@0.180.0/three.module.js`, `public/shplay/README.md`.

**Blocks:** Nothing strictly, but should land before Wave 1 ships so students never depend on the CDN even briefly.

---

## Section 2 closing notes

- **Post-Phase-0 line count for `public/shplay/shplay.js`**: revised estimate **~640 lines** (up from prior ~590). Adds account for: Group iterator + defensive remove (~10 lines), physics deregistration in shape `remove()` (~10 lines), parenting (~15 lines), camera mode precedence (~10 lines), `Plane.size` (~5 lines), halfDimension getters (~10 lines), section banner comments. Real total may land 620–650.
- **Section banner comments:** organize `shplay.js` with `// === SECTION: Lights ===` style banners matching Section 2 numbering. When the file eventually splits (probably at ~1200 lines if particles or tweening are added), banners become natural file boundaries.

---

## Section 3: Modules 3.1–3.6

### Legend for lesson tables

| Column | Meaning |
|--------|---------|
| ID | Lesson folder name and `lesson.json` id |
| Type | reading / video / example / lab / assignment / challenge / slides / sandbox |
| Preview | `shplay`, `reading`, `video`, `example`, `slides`, `assignment`, `challenge` |
| Graded | yes = has requirements array |
| Concept | One new idea this lesson teaches |
| Scaffold note | What is pre-filled vs empty with STEP comments (graded lessons only) |

**Examples convention:** All `type: 'example'` lessons use `preview: 'shplay'` (runnable in the iframe). Their lesson folder contains `lesson.json` + `script.js` (a complete, finished demo — no `// STEP N:` breadcrumbs, no requirements array). Students open the lesson, read the optional `description` field in `lesson.json`, click Run, and see the demo live. They can modify the code freely; nothing is graded. The `type` stays `'example'` so it is filterable as a distinct lesson kind in the curriculum list.

**Sandbox convention:** Sandbox lessons are fully runnable (`preview: 'shplay'`, finished `script.js`, no STEPs, no requirements). They are framed as "play, don't follow steps" — students explore what they have learned so far without grader pressure. `type: 'sandbox'`.

**Lesson ID convention:** Mirrors q5play (Unit 2) — see `plans/lesson-numbering-convention.md` for full rules. Pattern: `M-X-N[a-z]?[-aWW-N]-slug` with raw integers, **no zero-padding**. The natural-numeric sort in `components/HeaderLessonNav.tsx:40` (`localeCompare(b, undefined, { numeric: true })`) handles `9 < 10` correctly. The teacher gradebook at `app/teacher/page.tsx:339,565` currently uses bare `localeCompare` — fix by adding `{ numeric: true }` rather than re-encoding folder names. **Module size is capped at 40 lessons**; modules over 40 split (see Section 1 phase map and convention Section 7 for the rename map applied to this plan's pre-split tables).

**Build-up cumulative-state convention:** Build-up labs (`B1`–`Bn`) follow a cumulative starter pattern. Each `B<N>`'s `script.js` starter contains the cumulative boilerplate from `B<1>`...`B<N-1>` already filled in (using the prior labs' canonical solutions), plus only this `B<N>`'s new STEP comment(s). The lesson author writes this manually per lesson — students don't have to copy-paste from their commits. This preserves momentum and makes the build-ups self-contained; students who skip a B-lab still get a working starter for the next one.

**Sandbox/example completion semantics:** Sandbox and example lessons have no `requirements[]`, so the standard "all-green-to-pass" submit gate would never fire. Decision: **auto-mark complete on iframe load.** When a `'shplay'` preview lesson with `type: 'sandbox' | 'example'` mounts and the iframe heartbeat (`{source: 'shplay-status', text: 'running...'}`) arrives, the LessonWorkspace fires `PUT /api/lesson-state/[lessonId]` with `state: 'completed'`. The student sees a "✓ Complete — explore freely or move on" badge. For runnable examples, the lesson `description` field ends with `Click your browser's Refresh button to reset the code.` so students who modify the demo know how to revert.

---

### Module 3.1: Coordinates & Transforms (split — first half of original 3.1)

> **Split note:** This is the first half of pre-split 3.1 ("Foundations"). Coverage: bridges from q5play, axes, transforms (position/rotation/scale), radians helper, color/background/frameCount basics. Stops short of the other primitive shapes (Sphere/Plane/Cone/Cylinder/Torus) — those move to **Module 3.2: Shapes & Composition** (next section). Lesson IDs in the table below stay at `3-1-` for this half. The Solar System content (rows for Sphere, Plane, Cone, Cylinder, Torus, random, Shape Zoo, Anchor reading, Solar System build-ups, Solar System project, Solar System challenges) **moves to 3.2** with bulk-rename to `3-2-`.
>
> **Approximate row split:** lessons through `3-1-9a-sandbox-transform` and the color/background/frameCount labs (`3-1-10x` cluster) stay in 3.1. Everything from the Sphere/Plane reading onward moves to 3.2. See `plans/lesson-numbering-convention.md` Section 7 for the precise mapping.

**Theme:** "You are now in three dimensions." Establish the coordinate system, position, rotation, scale, radians, color, background, and frameCount-driven motion — using only `Cube` as the demonstration shape (the other primitives wait for 3.2).

**Module Project: Spinning Sculpture** — a single Cube (or two stacked) with multi-axis rotation patterns driven by frameCount + sin/cos modulation. Demonstrates mastery of position, rotation (all three axes), scale, radians, color cycling, and time-based animation. The project deliberately uses one shape type so that integration is about transforms, not composition — students show they understand WHAT each axis does before they start mixing shapes.

**Concepts taught (new in Unit 3):**
1. Bridge from q5play 2D to shPlay 3D — what stays, what changes
2. X axis — right is positive X
3. Y axis — up is positive Y (not down as in screen coordinates)
4. Z axis — positive Z comes toward the viewer, negative Z goes into the scene
5. Right-hand rule and handedness
6. The world origin — center of the 3D scene
7. `.position` is a Vector3 sub-object with `.x`, `.y`, `.z` fields
8. Mutating `.position.x` (and by extension .y, .z) in draw
9. `.rotation` is an Euler sub-object with `.x`, `.y`, `.z` fields (in radians)
10. Radians — what they are, why three.js uses them
11. `radians(deg)` helper — convert degrees to radians for readable code
12. `.scale` is a Vector3 sub-object; `.size` is the uniform-scale shorthand
13. `background(color)` in 3D clears the scene color
14. `frameCount` drives time-based rotation (same as q5play)
15. `Cube`, `Sphere`, `Plane` constructors with x/y/z position
16. Sphere radius parameter; Plane width/height parameters
17. `.color` setter — named colors and hex (same parseColor as q5play)
18. `random(min, max)` — returns float in range
19. `Cone(x,y,z,radius,height)` — tip points up by default
20. `Cylinder(x,y,z,radius,height)` — no taper, uniform radius
21. `Torus(x,y,z,ringRadius,tubeRadius)` — two distinct radius parameters

**Concepts re-applied from Unit 2:**
- `setup()` / `draw()` lifecycle (identical pattern)
- `kb.pressing()` for keyboard movement (identical API)
- Declaring let at top scope, assigning in setup

**Library prerequisites:** Sections 2.1 (Cone/Cylinder/Torus), 2.2 (random), 2.3 (degrees/radians), 2.11 (ShPlayPreview + shplay preview type).

**Lesson count: 47** (added 3.1.B0 anchor reading)

| ID | Title | Type | Preview | Graded | Concept |
|----|-------|------|---------|--------|---------|
| `3-1-1-slides` | 3.1.1 Module Slides | slides | slides | no | Unit orientation |
| `3-1-2-bridge` | 3.1.2 Reading — Bridge: q5play 2D to shPlay 3D | reading | reading | no | What stays (setup/draw/kb), what changes (no canvas call, x/y/z, shape classes, rotation is 3 axes) |
| `3-1-3-video-3d-intro` | 3.1.3 Video — Welcome to 3D | video | video | no | Why 3D, what shPlay is |
| `3-1-4a-reading-axis-x` | 3.1.4a Reading — The X Axis | reading | reading | no | Positive X = right, negative X = left |
| `3-1-4b-reading-axis-y` | 3.1.4b Reading — The Y Axis | reading | reading | no | Positive Y = up — the key mental shift from screen coordinates |
| `3-1-4c-reading-axis-z` | 3.1.4c Reading — The Z Axis | reading | reading | no | Positive Z toward viewer, negative Z into scene |
| `3-1-4d-reading-handedness` | 3.1.4d Reading — Handedness and the Right-Hand Rule | reading | reading | no | Right-hand rule: curl fingers X→Y, thumb points Z |
| `3-1-4e-reading-origin` | 3.1.4e Reading — The World Origin | reading | reading | no | (0,0,0) is the center; camera defaults at (0,3,7) looking at origin |
| `3-1-5a-sandbox-axes` | 3.1.5a Sandbox — Axes Explorer | sandbox | shplay | no | Free play: a Cube at origin, students move it on each axis to feel directions |
| `3-1-6a-reading-position` | 3.1.6a Reading — What is .position? | reading | reading | no | `.position` is a Vector3 object with `.x`, `.y`, `.z` number fields |
| `3-1-6b-reading-mutate-position` | 3.1.6b Reading — Mutating position in draw() | reading | reading | no | `shape.position.x += 0.05` each frame moves the shape |
| `3-1-6c-reading-rotation` | 3.1.6c Reading — What is .rotation? | reading | reading | no | `.rotation` is an Euler with `.x`, `.y`, `.z` in radians |
| `3-1-6d-reading-radians` | 3.1.6d Reading — Radians vs Degrees | reading | reading | no | What a radian is; `radians(90)` = PI/2; why three.js uses radians |
| `3-1-6e-reading-scale` | 3.1.6e Reading — What is .scale? | reading | reading | no | `.scale.x/y/z` stretches the shape; `.size` setter is uniform shorthand |
| `3-1-7a-lab-place-cube` | 3.1.7a Lab — Place a Cube | lab | shplay | yes | `new Cube(x, y, z)`, `.color` |
| `3-1-7b-lab-move-position` | 3.1.7b Lab — Move with position.x | lab | shplay | yes | `cube.position.x += 0.05` in draw |
| `3-1-7c-lab-rotate-y` | 3.1.7c Lab — Rotate on Y | lab | shplay | yes | `cube.rotation.y += 0.01` in draw |
| `3-1-7d-lab-scale-shape` | 3.1.7d Lab — Scale a shape | lab | shplay | yes | `cube.scale.x = 2; cube.scale.y = 0.5` |
| `3-1-7e-lab-radians` | 3.1.7e Lab — radians() helper | lab | shplay | yes | `cube.rotation.y = radians(45)` in setup |
| `3-1-8-example-spinning-scene` | 3.1.8 Example — Spinning Scene | example | shplay | no | Cube spinning on Y+Z simultaneously while Sphere sits at offset |
| `3-1-9a-sandbox-transform` | 3.1.9a Sandbox — Transform Playground | sandbox | shplay | no | A Cube: students adjust position/rotation/scale values and Run to see result |
| `3-1-10a-reading-color` | 3.1.10a Reading — Color in 3D | reading | reading | no | Named colors, hex colors, `.color` setter |
| `3-1-10b-reading-background` | 3.1.10b Reading — background() in 3D | reading | reading | no | `background('#000')` clears scene to black each frame |
| `3-1-10c-reading-framecount` | 3.1.10c Reading — frameCount for Animation | reading | reading | no | `frameCount` increments each draw; drives time-based rotation |
| `3-1-11a-lab-color` | 3.1.11a Lab — Color and background | lab | shplay | yes | Set `.color` on 3 shapes; `background('#111')` |
| `3-1-11b-lab-framecount-rotate` | 3.1.11b Lab — Animate with frameCount | lab | shplay | yes | `cube.rotation.y = frameCount * 0.02` |
| `3-1-12-reading-sphere-plane` | 3.1.12 Reading — Sphere and Plane | reading | reading | no | Sphere radius param; Plane as floor (width, height) |
| `3-1-12a-lab-sphere-color` | 3.1.12a Lab — Sphere with color | lab | shplay | yes | `new Sphere(x,y,z,r)`, `.color` |
| `3-1-12b-lab-plane-floor` | 3.1.12b Lab — Plane as floor | lab | shplay | yes | `new Plane(0,-1,0,10,10)` |
| `3-1-13a-reading-cone` | 3.1.13a Reading — Cone | reading | reading | no | `Cone(x,y,z,radius,height)` — tip up by default, what radius and height mean |
| `3-1-13b-reading-cylinder` | 3.1.13b Reading — Cylinder | reading | reading | no | `Cylinder(x,y,z,radius,height)` — uniform radius, no taper |
| `3-1-13c-reading-torus` | 3.1.13c Reading — Torus | reading | reading | no | `Torus(x,y,z,ringRadius,tubeRadius)` — two distinct radius params; visual diagram |
| `3-1-14a-lab-cone` | 3.1.14a Lab — Add a Cone | lab | shplay | yes | `new Cone(x,y,z,r,h)` visible in scene |
| `3-1-14b-lab-cylinder` | 3.1.14b Lab — Add a Cylinder | lab | shplay | yes | `new Cylinder(x,y,z,r,h)` visible in scene |
| `3-1-14c-lab-torus` | 3.1.14c Lab — Add a Torus | lab | shplay | yes | `new Torus(x,y,z,r,tube)` — set both radii to different values |
| `3-1-14d-reading-random` | 3.1.14d Reading — random(min, max) | reading | reading | no | `random(min,max)` returns float; same as q5play |
| `3-1-14e-lab-random-colors` | 3.1.14e Lab — random() colors | lab | shplay | yes | Spawn 5 Spheres at `random(-5,5)` positions; each a random color |
| `3-1-15-example-shape-zoo` | 3.1.15 Example — Shape Zoo | example | shplay | no | All 6 primitives in one scene, different colors, all rotating |
| `3-1-15a-sandbox-shapes` | 3.1.15a Sandbox — Shape Gallery | sandbox | shplay | no | All 6 shapes pre-placed; students adjust radii, heights, colors and Run |
| `3-1-b0-reading-anchor` | 3.1.B0 Reading — Anchor Offsets | reading | reading | no | "To orbit shape A around shape B, take B's `.position.x/z` and add your offset." Bridges to B3 without compounding concepts. |
| `3-1-b1-lab-sun` | 3.1.B1 Build-Up — Create the Sun | lab | shplay | yes | Large yellow Sphere at origin, `background('#000')` |
| `3-1-b2-lab-earth-orbit` | 3.1.B2 Build-Up — Earth Orbits | lab | shplay | yes | Blue Sphere; `earth.position.x = Math.cos(radians(frameCount * 0.6)) * 4` |
| `3-1-b3-lab-moon-orbit` | 3.1.B3 Build-Up — Moon Orbits Earth | lab | shplay | yes | Gray Sphere; `moon.position.x = earth.position.x + Math.cos(...) * 1.2` (anchor pattern from B0) |
| `3-1-b4-lab-orbit-speed` | 3.1.B4 Build-Up — Tune Orbit Speeds | lab | shplay | yes | Adjust multiplier constants so earth is slow, moon is fast |
| `3-1-b5-lab-spin-sun` | 3.1.B5 Build-Up — Sun Rotates | lab | shplay | yes | `sun.rotation.y += 0.005` in draw |
| `3-1-16-solar-system` | 3.1.16 Project — Solar System | assignment | shplay | yes | Integrate all build-ups into one scene |
| `3-1-17-3d-writeup` | 3.1.17 Writeup — 3D Foundations | assignment | assignment | yes (AI) | Written reflection: how 3D differs from 2D |
| `3-1-18-challenges` | 3.1.18 Challenges | challenge | challenge | yes | 3 project extensions |

**3.1.8 Example — Spinning Scene (runnable):** Cube spinning on Y and Z simultaneously while a Sphere sits at offset position. No scaffold — finished demo.

**3.1.15 Example — Shape Zoo (runnable):** Six primitives (Cube, Sphere, Plane, Cone, Cylinder, Torus) placed at x = −5, −3, −1, 1, 3, 5, all slowly rotating on Y, each a different color.

**3.1.5a Sandbox — Axes Explorer (runnable):** A Cube at origin and three colored axis guides (thin Cylinders along X/Y/Z). Students change the Cube's position.x/y/z values and re-run to see which direction each axis points. Script is pre-filled and editable; no grader.

**3.1.9a Sandbox — Transform Playground (runnable):** Same Cube scene. Students toggle position/rotation/scale assignments in the pre-filled script and run repeatedly. Comment blocks guide: "try changing position.y", "try changing rotation.x".

**3.1.15a Sandbox — Shape Gallery (runnable):** All 6 shapes pre-placed with editable constructor arguments. Students play with `radius`, `height`, `tube` values to see shape changes live.

**3.1.16 — Project — Solar System scaffold:**
Pre-filled: `let sun, earth, moon, myPlanet;` at top. `background('#000')` in draw.
STEPs: STEP 1 create sun (Sphere at origin, yellow), STEP 2 create earth (Sphere offset, blue), STEP 3 create moon (Sphere near earth, gray), STEP 4 rotate earth around sun: `earth.position.x = Math.cos(radians(frameCount * 0.6)) * 4` and `earth.position.z = Math.sin(radians(frameCount * 0.6)) * 4` (uses the `radians()` helper introduced in lessons 3.1.6d / 3.1.7e), STEP 5 make moon orbit earth via the anchor pattern from B0/B3, STEP 6 spin sun on Y, STEP 7 **add a third orbiting body of YOUR choice** (Mars, Jupiter, a custom comet, etc.) with its own radius, color, and orbit speed — this is the creative element that goes beyond what build-ups gave you.

**Project requirements (literal regex patterns):**
| ID | Pattern (regex) | What it checks |
|----|-----------------|---------------|
| r1 | `new\s+Sphere\s*\(` (count ≥ 4) | Sun + earth + moon + student-chosen body |
| r2 | `radians\s*\(` | Uses the `radians()` helper at least once |
| r3 | `\.position\.x\s*=.*Math\.(cos|sin)` | Orbit math on at least one body |
| r4 | `\w+\.position\.[xz]\s*\+\s*Math\.(cos|sin)` OR `Math\.(cos|sin).*\+\s*\w+\.position\.[xz]` | Anchor offset (moon orbiting earth) |
| r5 | `\w+\.rotation\.y\s*[+\-]?=` | Sun spins on Y |
| r6 | `// my planet:|let myPlanet|new Sphere.*\/\/.*planet` (heuristic) — OR `new\s+Sphere` with at least 4 distinct calls | Student-added 4th body present |

**3.1.17 — Writeup prompt:** "Explain three ways that programming in 3D is different from 2D. Use specific examples from your Solar System sketch to illustrate each difference."
AI rubric: (1) coordinate system difference named with specific axis, (2) rotation concept explained in own words, (3) specific Solar System code described correctly.

**3.1.18 — Challenges:**
1. Add a Saturn-style ring using a Torus, positioned and oriented so it wraps around a sphere.
2. Use `random()` to spawn 10 asteroid Spheres at random positions, each slowly rotating at a random speed.
3. Add a second planet so the solar system has earth + mars, each with different orbit radii and speeds.

---

#### Module 3.1 (split-half) project: Spinning Sculpture

The pre-split 3.1 table above contains the Solar System project that moves to Module 3.2 (next section). Module 3.1 — the first half of the split — needs its own project that uses ONLY transforms on `Cube`, since shapes other than Cube live in 3.2. This project replaces the prior Solar System for 3.1.

**Project: Spinning Sculpture** — Two stacked Cubes that rotate independently on different axes with frameCount-modulated speeds and per-axis color cycling.

**3.1 build-up labs (replace pre-split B0–B5; keep the same `3-1-bN` slots):**
- `3-1-b1-lab-base-cube` — single yellow Cube at origin, `background('#000')`
- `3-1-b2-lab-rotate-y` — `cube.rotation.y = radians(frameCount * 1.5)`
- `3-1-b3-lab-rotate-multi-axis` — add `.rotation.x` and `.rotation.z` with different multipliers
- `3-1-b4-lab-stack-cube` — second Cube parented above, smaller scale, opposite-direction rotation
- `3-1-b5-lab-color-cycle` — color shifts per frame using `Math.sin(radians(frameCount))` mapped to RGB

**3.1.16 — Project — Spinning Sculpture scaffold:**
Pre-filled: `let bigCube, smallCube;` at top, `background('#000')` in draw, both cubes declared and instantiated in setup.
STEPs:
- STEP 1: rotate `bigCube` on the Y axis using `radians()` and `frameCount`
- STEP 2: also rotate `bigCube` on X with a different (slower) multiplier
- STEP 3: stack `smallCube` on top via `parent(smallCube, bigCube)` and a local position offset
- STEP 4: rotate `smallCube` opposite-direction on Z
- STEP 5: cycle colors using `Math.sin(radians(frameCount * SPEED))` mapped to a color channel
- STEP 6: **add ONE creative element** — examples: a third orbiting Cube (uses parenting), pulsing scale via `cube.size = 1 + Math.sin(...)`, axis labels using thin Cylinder Cubes. Document with `// MY ELEMENT:`.

**Project requirements (literal regex patterns):**
| ID | Pattern (regex) | What it checks |
|----|-----------------|---------------|
| r1 | `\.rotation\.y\s*=` AND `\.rotation\.[xz]\s*=` | At least 2 axes rotated |
| r2 | `radians\s*\(` (count ≥ 2) | Helper used in rotation math |
| r3 | `parent\s*\(` | Second cube parented |
| r4 | `\.color\s*=.*Math\.(sin\|cos\|floor\|abs)` OR `\.color\s*=.*frameCount` | Color cycling |
| r5 | `\/\/\s*MY ELEMENT` (case-insensitive) | Student documented their creative element |

**3.1.18 — Challenges (project extensions for Spinning Sculpture):**
1. Add a third Cube parented to `smallCube` so the chain rotates as a tree.
2. Drive scale (`.size`) by `Math.sin(radians(frameCount))` so the sculpture pulses in size.
3. Add a `kb.pressing('space')` toggle that freezes/unfreezes the rotation (uses a `let frozen = false;` state).

> The Solar System content (`3-1-b0` anchor reading + Solar System build-ups + 3.1.16 Solar System project + 3.1.17 writeup + 3.1.18 Saturn-ring challenges) listed in the table above is the content for the **next** module (3.2). When folder-creating, those rows get prefix `3-2-` and re-sequenced position numbers.

---

### Module 3.2: Shapes & Composition (split — second half of original 3.1)

> **Split note:** This module is the second half of pre-split 3.1. Coverage: the other primitive shapes (Sphere, Plane, Cone, Cylinder, Torus), `random()`, multi-shape composition, anchor offsets, and the Solar System project. Lesson IDs in the pre-split 3.1 table that belong here: `3-1-12-reading-sphere-plane`, `3-1-12a-lab-sphere-color`, `3-1-12b-lab-plane-floor`, `3-1-13a-reading-cone`, `3-1-13b-reading-cylinder`, `3-1-13c-reading-torus`, `3-1-14a-lab-cone`, `3-1-14b-lab-cylinder`, `3-1-14c-lab-torus`, `3-1-14d-reading-random`, `3-1-14e-lab-random-colors`, `3-1-15-example-shape-zoo`, `3-1-15a-sandbox-shapes`, `3-1-b0-reading-anchor`, `3-1-b1-lab-sun`, `3-1-b2-lab-earth-orbit`, `3-1-b3-lab-moon-orbit`, `3-1-b4-lab-orbit-speed`, `3-1-b5-lab-spin-sun`, `3-1-16-solar-system`, `3-1-17-3d-writeup`, `3-1-18-challenges`. Bulk-rename all of these from `3-1-` to `3-2-` and re-sequence position numbers from 1.

**Theme:** Five new primitive shapes + `random()` + multi-shape scenes. Where 3.1 mastered transforms on a single Cube, 3.2 masters composition: combining shape variety, anchor offsets, and orbital math to build a recognizable scene.

**Module Project: Solar System** — sun + earth + moon orbiting via `frameCount`-driven Math.sin/cos, space background, color differentiation per body, plus a 4th body of the student's choice. Project spec, build-up labs, scaffold STEPs, requirements regex, and challenges are documented in the pre-split 3.1 section above (rows `3-1-b0` through `3-1-18`). Bulk-rename to `3-2-` per `plans/lesson-numbering-convention.md` Section 7.

**Concepts taught (new in 3.2 vs 3.1):**
- Sphere, Plane, Cone, Cylinder, Torus constructors with their distinct geometry parameters
- `random(min, max)` helper
- Multi-shape scene composition — coordinating positions across many shape types
- Anchor offsets — using one shape's `.position` as a base for another's
- Why orbital math uses `cos` for x and `sin` for z (or vice versa) — the unit-circle parameterization

**Concepts re-applied from 3.1:**
- `radians()` helper (still used in orbit math)
- `.position`, `.rotation`, `.scale` on Cube generalize identically to other shapes
- `frameCount`-driven motion (now anchoring orbits)
- `background()` and color setting

**Library prerequisites:** All of Section 2.1 (Cone/Cylinder/Torus), 2.2 (random), 2.12 (parenting if used in challenges).

**Lesson count: 25** (the count is the second-half row count from pre-split 3.1).

**Writeup placement:** Module 3.1 keeps the "first-3D writeup" (3.1.17 in pre-split numbering, becomes 3.2's first row in the rename only if you treat the writeup as topical to Solar System rather than 3D-foundations broadly. **Decision: assign the writeup to Module 3.1** as planned — it reflects on 3D-vs-2D fundamentals which 3.1 establishes, not Solar System composition. Drop the writeup from 3.2; 3.2 has only the project + challenges as graded artifacts.

---

### Module 3.3: OOP in 3D — Classes That Wrap Shapes

> **Split & renumber note:** This v3 section (39 lessons) splits into TWO final modules at the composition reading (`3-2-11a-reading-composition-3d`):
> - **Final 3.3 OOP — Foundations** (~21): rows from slides through procedural-vs-OOP example. Single-shape class wrappers, constructor/this/methods, instances. Bulk-rename `3-2-` → `3-3-`.
> - **Final 3.4 OOP — Composition** (~18): rows from composition reading through challenges. Multi-shape classes, parenting (`parent()` API), Robot build-ups + project + challenges. Bulk-rename `3-2-` → `3-4-`.
>
> See `plans/lesson-numbering-convention.md` Section 7 for the complete row mapping. The single Robot-class project stays in 3.4 (the composition module, where it belongs pedagogically — single-shape classes in 3.3 don't have enough surface area for the full Robot).

**Theme:** Transfer the Unit 2.2 OOP pattern directly into 3D. A class that wraps a shPlay shape is identical in structure to a class that wraps a q5play Sprite.

**Module Project: Custom 3D Character** — a `Robot` class composed of multiple primitive shapes (Cube body, Sphere head, Cylinder arms) with methods `wave()`, `spin()`, `bob()`. Masters: class composition, methods, multiple instances.

**Concepts taught (new in Unit 3):**
1. Bridge from 2.2 OOP to 3D — same class/this/methods pattern, new body is a shape not a Sprite
2. 3D class wraps a shape object: `this.shape = new Cube(...)`
3. Constructor parameters map to 3D coordinates
4. Methods that update `.position` and `.rotation` on `this.shape`
5. The `update()` pattern — per-frame logic inside the class, called in draw
6. Multiple instances of a 3D class arranged in 3D space
7. Array of 3D instances, looped with `for...of`
8. Multi-shape composition in one class — `this.body`, `this.head`, `this.armL`
9. Class-managed lifecycle: method calls `this.shape.remove()`

**Concepts re-applied from Unit 2:**
- Class declaration, constructor, `this`, methods (all from 2.2)
- `new ClassName(...)` instantiation
- Array of instances, `for...of` loop over them
- "Class bundles data + behavior" principle

**Library prerequisites:** Section 2.11 only.

**Lesson count: 39** (added 3.2.B0 parenting reading; cut 3.2.15 writeup per keep-3-of-6 policy)

| ID | Title | Type | Preview | Graded | Concept |
|----|-------|------|---------|--------|---------|
| `3-2-1-slides` | 3.2.1 Module Slides | slides | slides | no | Module orientation |
| `3-2-2-bridge` | 3.2.2 Reading — Bridge: OOP from 2.2 in 3D | reading | reading | no | What stays identical (class, constructor, this, methods); what changes (this.sprite → this.shape, .position/.rotation instead of .x/.vel) |
| `3-2-3-refresher-oop` | 3.2.3 Reading — Refresher: class, constructor, this | reading | reading | no | Re-states Unit 2.2 pattern; shows a q5play Sprite class side-by-side with a blank shPlay class |
| `3-2-4-video-oop-in-3d` | 3.2.4 Video — OOP in 3D | video | video | no | Why classes in 3D, the wrapping pattern |
| `3-2-5a-reading-3d-constructor` | 3.2.5a Reading — The 3D Constructor Pattern | reading | reading | no | `this.shape = new Cube(x,y,z)` stores a shape as a data member |
| `3-2-5b-reading-methods-3d` | 3.2.5b Reading — Methods That Move Shapes | reading | reading | no | Methods mutating `this.shape.position.x` and `this.shape.rotation.y` |
| `3-2-6a-lab-build-planet-class` | 3.2.6a Lab — Build a Planet class | lab | shplay | yes | Class with Sphere, position constructor args |
| `3-2-6b-lab-read-property-3d` | 3.2.6b Lab — Read a 3D property | lab | shplay | yes | `console.log(p.shape.position.x)` |
| `3-2-6c-lab-write-property-3d` | 3.2.6c Lab — Write a 3D property via method | lab | shplay | yes | `p.setColor('blue')` method sets `this.shape.color = color` |
| `3-2-6d-lab-two-instances-3d` | 3.2.6d Lab — Two 3D instances | lab | shplay | yes | Two `new Planet(...)` at different coords |
| `3-2-7-example-planet-orbit` | 3.2.7 Example — Planet Orbit Class | example | shplay | no | Full class with `orbit()` method using frameCount |
| `3-2-8a-reading-update-method` | 3.2.8a Reading — The update() Pattern | reading | reading | no | Putting per-frame logic inside the class; calling `instance.update()` in draw |
| `3-2-8b-lab-update-in-class` | 3.2.8b Lab — update() inside a class | lab | shplay | yes | Method called in draw every frame; shape moves |
| `3-2-8c-lab-method-returns` | 3.2.8c Lab — Method that returns data | lab | shplay | yes | `isAbove(y)` boolean method |
| `3-2-8d-lab-method-calls-method` | 3.2.8d Lab — Method calling this.method | lab | shplay | yes | `spin()` calls `this.recolor()` |
| `3-2-9-reading-multiple-instances` | 3.2.9 Reading — Arrays of 3D Instances | reading | reading | no | `for...of` over array of shape classes |
| `3-2-9a-lab-array-of-instances` | 3.2.9a Lab — Array of 3 instances | lab | shplay | yes | Push 3 `new Planet(...)` into array |
| `3-2-9b-lab-loop-instances` | 3.2.9b Lab — Loop: call update() on each | lab | shplay | yes | `for (let p of planets) p.update()` |
| `3-2-9c-lab-loop-mutate` | 3.2.9c Lab — Loop: mutate a property | lab | shplay | yes | Set `.shape.color` on each in loop |
| `3-2-10-example-enemy-3d` | 3.2.10 Example — Enemy3D class | example | shplay | no | Full class with constructor/update/remove |
| `3-2-11a-reading-composition-3d` | 3.2.11a Reading — Composition: multiple shapes in one class | reading | reading | no | `this.body`, `this.head`, `this.arm` — class owns all shape members |
| `3-2-11b-reading-lifecycle-class` | 3.2.11b Reading — Class-Managed Lifecycle | reading | reading | no | Method that calls `this.body.remove(); this.head.remove()` — class is responsible for cleanup |
| `3-2-11c-lab-remove-in-class` | 3.2.11c Lab — remove() via method | lab | shplay | yes | `destroy()` method calls `this.shape.remove()` |
| `3-2-11d-lab-spawn-and-despawn` | 3.2.11d Lab — Spawn 5, despawn on key | lab | shplay | yes | Array of instances; call `e.destroy()` on Space |
| `3-2-12-reading-when-oop-3d` | 3.2.12 Reading — When OOP helps in 3D | reading | reading | no | Repetition, reuse, 3D-specific gains |
| `3-2-13-example-proc-vs-oop-3d` | 3.2.13 Example — Procedural vs OOP 3D | example | shplay | no | Same scene built both ways |
| `3-2-13a-sandbox-oop` | 3.2.13a Sandbox — OOP Playground | sandbox | shplay | no | A pre-built Enemy3D class; students add a method and call it |
| `3-2-b0-reading-parent` | 3.2.B0 Reading — Parenting Shapes | reading | reading | no | New `parent(child, parentObj)` API (Section 2.12). Child's transform is now LOCAL to the parent. Move the parent and children come along. Critical for the Robot to move as one body. |
| `3-2-b1-lab-robot-body` | 3.2.B1 Build-Up — Robot Body | lab | shplay | yes | `class Robot` with `this.body = new Cube(x,y,z)` in constructor |
| `3-2-b2-lab-robot-head` | 3.2.B2 Build-Up — Robot Head (parented) | lab | shplay | yes | Add `this.head = new Sphere(...)` then `parent(this.head, this.body)`; head's local position is offset above body |
| `3-2-b3-lab-robot-arms` | 3.2.B3 Build-Up — Robot Arms (parented) | lab | shplay | yes | Add `this.armL` and `this.armR` as Cylinders, each `parent(this.armX, this.body)` so arms swing with body |
| `3-2-b4-lab-robot-wave` | 3.2.B4 Build-Up — wave() Method | lab | shplay | yes | Method oscillates `this.armR.rotation.z` via `Math.sin(frameCount)` — local rotation now |
| `3-2-b5-lab-robot-bob` | 3.2.B5 Build-Up — bob() Method | lab | shplay | yes | Method oscillates `this.body.position.y`; head + arms tag along because they're parented |
| `3-2-b6-lab-robot-two-instances` | 3.2.B6 Build-Up — Two Robots | lab | shplay | yes | Two Robots at different x positions; `update()` on each in draw |
| `3-2-14-custom-character` | 3.2.14 Project — Custom 3D Character | assignment | shplay | yes | Class with 3+ shape parts (parented), 2+ methods, 2+ instances, plus ONE method of student's own design |
| `3-2-16-challenges` | 3.2.16 Challenges | challenge | challenge | yes | 3 project extensions |

**3.2.7 Example — Planet Orbit Class (runnable):** Complete `Planet` class with constructor storing `this.shape = new Sphere(...)`, an `orbit(radius, speed)` method driven by frameCount, and two instances orbiting at different radii.

**3.2.10 Example — Enemy3D class (runnable):** A `Enemy3D` class with `this.shape = new Cone(...)`, `update()` method that moves toward origin, and `remove()` method that calls `this.shape.remove()`. Five enemies instantiated and looped.

**3.2.13 Example — Procedural vs OOP 3D (runnable):** Comment block shows procedural code (5 individual cubes each with manual rotation vars), rewritten as a class. Both live in one script; toggle a comment block.

**3.2.14 — Project — Custom 3D Character scaffold:**
Pre-filled: `class Robot { constructor(x, y, z) { /* STEP 1 + STEP 2 */ } wave() { /* STEP 3 */ } bob() { /* STEP 4 */ } myMove() { /* STEP 5 */ } update() { this.wave(); this.bob(); this.myMove(); } }` with `let robots = [];`
STEPs:
- STEP 1: build body (Cube), head (Sphere), two arms (Cylinders) at correct local offsets
- STEP 2: `parent(this.head, this.body)`, `parent(this.armL, this.body)`, `parent(this.armR, this.body)` so the robot moves as one
- STEP 3: `wave()` oscillates one arm's `rotation.z` via `Math.sin(radians(frameCount * 6))`
- STEP 4: `bob()` oscillates `this.body.position.y` (head + arms follow because parented)
- STEP 5: **`myMove()` — your own method.** A movement OR appearance change of your design. Examples: `dance()` rotates the whole body, `salute()` raises one arm to forehead, `walk()` swings both arms opposite. Name it whatever fits.
- STEP 6: push 3 `new Robot(...)` at different x in setup; STEP 7: loop `robots.forEach(r => r.update())` in draw.

**Project requirements (literal regex patterns):**
| ID | Pattern (regex) | What it checks |
|----|-----------------|---------------|
| r1 | `class\s+\w+\s*\{` | A class is defined |
| r2 | `this\.\w+\s*=\s*new\s+(Cube|Sphere|Plane|Cone|Cylinder|Torus)` (count ≥ 3) | At least 3 shape parts as instance properties |
| r3 | `parent\s*\(\s*this\.` (count ≥ 2) | At least 2 parts parented to the body |
| r4 | `\w+\s*\([^)]*\)\s*\{[^}]*Math\.(sin|cos|sin\(radians)` (within class body) | A method that uses sin/cos for animation |
| r5 | `myMove\b\|dance\b\|salute\b\|walk\b\|jump\b\|nod\b` — heuristic for the student-named method, OR ≥ 4 distinct method names defined | Student's own method exists |
| r6 | `new\s+Robot\s*\(` (or whatever class name) (count ≥ 2) OR `\.push\(\s*new\s+\w+\s*\(` | Instantiated 2+ times |

**3.2.16 — Challenges:**
1. Add a `spin()` method that rotates the entire robot by incrementing rotation.y on all its body parts each frame.
2. Add a `health` property; write a `hit()` method that changes the head color to red and eventually calls remove on all parts.
3. Write a second character class (e.g., `Alien`) with different primitives and methods, placed next to the Robot.

---

### Module 3.4: Groups & Collisions — Collections in 3D

> **Split & renumber note:** This v3 section (36 lessons) splits into TWO final modules at the collectible-pattern reading (`3-3-13a-reading-collect-pattern`):
> - **Final 3.5 Groups — Foundations** (~18): rows from slides through safe-despawn lab. Bridge, Group readings + labs, distance/intersects readings + labs, safe-despawn pattern, Timed Spawn example. Bulk-rename `3-3-` → `3-5-`.
> - **Final 3.6 Groups — Collector Game** (~18): rows from collectible-pattern reading through wave-spawn example. Collectible pattern, Collector Game build-ups + project + writeup (mid-unit) + challenges. Bulk-rename `3-3-` → `3-6-`.
>
> The mid-unit writeup (`3-3-16-groups-writeup`) lives in **final 3.6** (Collector Game module).

**Theme:** Manage dynamic collections of 3D objects. Spawn, iterate, detect proximity, despawn. Directly parallel to Unit 2.3.

**Module Project: Collector Game** — player Cube on a Plane floor, a Group of collectible Spheres, WASD movement, distance-based collection on intersect, score counter.

**Concepts taught (new in Unit 3):**
1. Bridge from 2.3 Groups in 3D — q5play Group → shPlay Group, method names are identical
2. `new Group()` — shPlay's collection type
3. `group.add(shape)` — add to the collection
4. `group.remove(shape)` — dispose and remove from collection
5. `group.forEach(fn)` — iterate a Group
6. `group.length` — check size
7. `distance(a, b)` — scalar 3D distance between two shape positions
8. `intersects(a, b)` — sphere-sphere bounding-volume boolean
9. The safe-despawn pattern: iterate a copy, mutate the original
10. Score counter updated by collision

**Concepts re-applied from Unit 2:**
- Group mental model (same name, parallel methods)
- Spawn cadence: `frameCount % N === 0`
- Safe-despawn iteration pattern (translated from q5play)
- `kb.pressing` for player movement (identical)

**Library prerequisites:** Sections 2.4 (distance/intersects), 2.5 (Group).

**Lesson count: 36** (added 3.3.10c collision-radius reading; kept 3.3.16 writeup as the unit's middle reflection per keep-3-of-6 policy)

| ID | Title | Type | Preview | Graded | Concept |
|----|-------|------|---------|--------|---------|
| `3-3-1-slides` | 3.3.1 Module Slides | slides | slides | no | — |
| `3-3-2-bridge` | 3.3.2 Reading — Bridge: Groups from 2.3 in 3D | reading | reading | no | q5play Group vs shPlay Group — method names identical; `.overlaps()` → `intersects()`; despawn pattern is the same |
| `3-3-3-refresher-group` | 3.3.3 Reading — Refresher: q5play Group from Unit 2.3 | reading | reading | no | Re-states the q5play Group API and despawn pattern to activate prior knowledge |
| `3-3-4-video-groups-3d` | 3.3.4 Video — Groups in 3D | video | video | no | Why collections, Group vs bare array |
| `3-3-5a-reading-group-create` | 3.3.5a Reading — new Group() and add() | reading | reading | no | Group constructor, `.add()`, `.length` |
| `3-3-5b-reading-group-foreach` | 3.3.5b Reading — forEach and for...of | reading | reading | no | Iterating a Group |
| `3-3-5c-reading-group-remove` | 3.3.5c Reading — remove() disposes the shape | reading | reading | no | `group.remove(shape)` calls shape.remove() AND deletes from collection |
| `3-3-6a-lab-group-add` | 3.3.6a Lab — add() to a Group | lab | shplay | yes | Create Group, add 3 Cubes; log `g.length` |
| `3-3-6b-lab-group-foreach` | 3.3.6b Lab — forEach spin | lab | shplay | yes | `g.forEach(s => s.rotation.y += 0.01)` |
| `3-3-6c-lab-group-remove` | 3.3.6c Lab — remove one on key | lab | shplay | yes | Space removes first member |
| `3-3-7-example-spawn-loop` | 3.3.7 Example — Timed Spawn Loop | example | shplay | no | `frameCount % 60` adds to Group |
| `3-3-8-video-distance` | 3.3.8 Video — distance() in 3D | video | video | no | Euclidean distance, three.js Vector3 |
| `3-3-9a-reading-distance` | 3.3.9a Reading — distance(a, b) | reading | reading | no | Scalar return, units match scene units |
| `3-3-9b-lab-distance-check` | 3.3.9b Lab — print distance | lab | shplay | yes | `console.log(distance(cube, sphere))` in draw |
| `3-3-10a-reading-intersects` | 3.3.10a Reading — intersects(a, b) | reading | reading | no | Bounding-sphere overlap, honest limitation for cube corners |
| `3-3-10b-lab-intersects-check` | 3.3.10b Lab — color on intersect | lab | shplay | yes | Change color when `intersects(a,b)` is true |
| `3-3-10c-reading-collision-radius` | 3.3.10c Reading — Effective Collision Radius | reading | reading | no | `intersects()` uses bounding-sphere radius. For Cube with side `s`, effective radius = `s * sqrt(3)/2`. For Cylinder with radius `r` and height `h`, effective radius = `sqrt(r² + (h/2)²)`. Lets students reason about why a flag-Cylinder triggers earlier than expected. |
| `3-3-11-video-despawn` | 3.3.11 Video — Safe Despawn in 3D | video | video | no | Iterate-copy pattern, why modifying while iterating breaks |
| `3-3-12a-reading-safe-despawn` | 3.3.12a Reading — The Safe Despawn Pattern | reading | reading | no | `[...group]` copy then `group.remove(s)` inside forEach |
| `3-3-12b-example-safe-despawn` | 3.3.12b Example — Safe Despawn | example | shplay | no | Two drifting spheres; intersect triggers safe removal |
| `3-3-12c-lab-despawn-far` | 3.3.12c Lab — Despawn off-screen | lab | shplay | yes | Remove shape when `position.z < -20` |
| `3-3-13a-reading-collect-pattern` | 3.3.13a Reading — The Collectible Pattern | reading | reading | no | distance < threshold → remove + increment score |
| `3-3-13b-lab-collect` | 3.3.13b Lab — First collectible | lab | shplay | yes | One sphere; on intersect remove and log score |
| `3-3-14-sandbox` | 3.3.14 Groups Sandbox | sandbox | shplay | no | Free-play: Group of 20 random spheres; experiment with remove/forEach |
| `3-3-b1-lab-floor-and-player` | 3.3.B1 Build-Up — Floor and Player | lab | shplay | yes | Plane floor + Cube player at origin |
| `3-3-b2-lab-spawn-group` | 3.3.B2 Build-Up — Spawn Group of Collectibles | lab | shplay | yes | `collectibles = new Group()`, add 5 Spheres at `random(-5,5)` x/z |
| `3-3-b3-lab-wasd-movement` | 3.3.B3 Build-Up — WASD Player Movement | lab | shplay | yes | `kb.pressing('w')` moves `player.position.z -= speed * deltaTime` |
| `3-3-b4-lab-detect-collect` | 3.3.B4 Build-Up — Detect and Despawn | lab | shplay | yes | `[...collectibles].forEach`; `if (intersects(player, s)) collectibles.remove(s)` |
| `3-3-b5-lab-score-counter` | 3.3.B5 Build-Up — Track Score | lab | shplay | yes | `let score = 0`; increment on collect; `console.log('Score:', score)` |
| `3-3-15-collector-game` | 3.3.15 Project — Collector Game | assignment | shplay | yes | Full: player, Group, WASD, score |
| `3-3-16-groups-writeup` | 3.3.16 Writeup — Groups & Collisions | assignment | assignment | yes (AI) | Written: compare Group in 2D vs 3D |
| `3-3-17-challenges` | 3.3.17 Challenges | challenge | challenge | yes | 3 project extensions |
| `3-3-18-video-group-patterning` | 3.3.18 Video — Patterns with Groups | video | video | no | Offset/grid spawning, visual variety |
| `3-3-19-example-wave-spawn` | 3.3.19 Example — Wave Spawner | example | shplay | no | Waves of enemies, Group management |

**3.3.7 Example — Timed Spawn Loop (runnable):** Every 60 frames a new Cube spawns at random position, drifts forward on Z, is removed when z < −20. Group size stays stable.

**3.3.12b Example — Safe Despawn (runnable):** Two spheres approach each other. Intersect triggers `[...group].forEach(s => { if (intersects(player, s)) group.remove(s); })`. Demonstrates the copy-then-remove pattern.

**3.3.19 Example — Wave Spawner (runnable):** `let wave = 1; let enemies = new Group();`. After all enemies removed, `wave++` and new wave spawns with more enemies.

**3.3.15 — Project — Collector Game scaffold:**
Pre-filled: `let player, collectibles; let score = 0;`
STEPs:
- STEP 1 create player Cube; STEP 2 `collectibles = new Group()`, add 10 Spheres at random x/z; STEP 3 WASD moves player; STEP 4 safe-despawn forEach with intersects and score increment.
- STEP 5: **add ONE collectible behavior of your own design** (creative element). Examples: regenerate at a new position after collection, double-value golden sphere, collectibles that drift toward the player when within range, collectibles that spin while uncollected. Pick one and implement it. Document your choice in a `// MY BEHAVIOR:` comment at the top.

**Project requirements (literal regex patterns):**
| ID | Pattern (regex) | What it checks |
|----|-----------------|---------------|
| r1 | `new\s+Group\s*\(\s*\)` | A Group is created |
| r2 | `\.add\s*\(` (count ≥ 5) | At least 5 collectibles added |
| r3 | `kb\.pressing\s*\(\s*['"]w['"]\s*\)` AND `\['s'\]\|\['a'\]\|\['d'\]` (any of) | WASD movement present |
| r4 | `intersects\s*\(\s*player` | Collision check between player and Group members |
| r5 | `\[\.\.\..*\]\.forEach` OR `for\s*\(.*of\s*\[\.\.\.` | Safe-despawn pattern (copy before iterate) |
| r6 | `\.remove\s*\(` AND `score\s*[+\-]?=` | Despawn + score increment in same flow |
| r7 | `\/\/\s*MY BEHAVIOR` (case-insensitive) | Student documented their creative element |

**3.3.16 — Writeup prompt:** "Compare how you used Group in your Collector Game to how you used Group in Unit 2. What was the same? What was different? Explain what `intersects()` does and why you needed it. Describe the custom behavior you added in STEP 5 and what made you choose it."
*This is the unit's mid-point AI-graded writeup (kept per the keep-first/middle/last policy).*

**3.3.17 — Challenges:**
1. Make collectibles regenerate at a new random position 3 seconds after being collected.
2. Add a power-up sphere (different color) that doubles score value for 5 collectibles.
3. Add a despawn animation: shrink `.size` each frame over 10 frames before `.remove()`.

---

### Module 3.5: Camera & Animation — Moving Through 3D Space

> **Split & renumber note:** This v3 section (33 lessons) splits into TWO final modules at the time-based-motion reading (`3-4-8b-reading-timebased-motion`). The deltaTime reading itself (`3-4-8a-reading-deltatime`) stays with the camera module so camera labs can use deltaTime.
> - **Final 3.7 Camera in 3D** (~16): rows from slides through camera-sandbox `3-4-12a` (and `3-4-8a-reading-deltatime`). Bridge, refresher, camera readings (position, lookAt, follow, orbit), camera labs, follow-precedence reading, smooth-follow example. Bulk-rename `3-4-` → `3-7-`.
> - **Final 3.8 Animation & Walkable Scene** (~17): rows from `3-4-8b-reading-timebased-motion` (excluding `3-4-8a` which goes to 3.7) through animation-patterns video. Time-based motion, lerp, sin/cos paths, Walkable Scene build-ups + project + challenges. Bulk-rename `3-4-` → `3-8-`.
>
> The Walkable Scene project lives in **final 3.8**.

**Theme:** Move the camera, create smooth motion with lerp and deltaTime, animate objects using time-based formulas. Direct parallel to Unit 2.4.

**Module Project: Walkable Scene** — camera.follow on a player avatar, lerp smoothing for camera lag, animated scene decorations.

**Concepts taught (new in Unit 3):**
1. Bridge from 2.4 Camera in 3D — q5play camera.x/y → shPlay camera.position.x/y/z + camera.lookAt(); the lerp pattern transfers identically; sticky lookAt is new
2. `camera.position` is a Vector3 with x/y/z fields
3. `camera.lookAt(x, y, z)` — sticky: must be called each frame to stay pointed
4. `camera.follow(target)` — automatic per-frame follow with default offset (0,3,7)
5. `camera.clearFollow()` — cancel follow
6. Where is the camera by default? (0, 3, 7) looking at origin
7. `deltaTime` — seconds since last frame, frame-rate independence
8. Time-based motion: `position.x += speed * deltaTime`
9. What is lerp? (pure concept: linear interpolation)
10. Lerp in 3D for smooth camera: `cam.x += (target - cam.x) * 0.1`
11. Math.sin / Math.cos for circular path animation
12. `camera.orbit(speed)` — passive orbit

**Concepts re-applied from Unit 2:**
- `lerp()` smoothing concept (2.4)
- Camera-follows-player pattern (2.4)
- `kb.pressing` for player movement (identical)

**Library prerequisites:** Sections 2.8 (camera.follow), 2.9 (deltaTime).

**Lesson count: 33** (added 3.4.9d follow-precedence reading; cut 3.4.14 writeup per keep-3-of-6 policy)

| ID | Title | Type | Preview | Graded | Concept |
|----|-------|------|---------|--------|---------|
| `3-4-1-slides` | 3.4.1 Module Slides | slides | slides | no | — |
| `3-4-2-bridge` | 3.4.2 Reading — Bridge: Camera from 2.4 in 3D | reading | reading | no | q5play camera.x/y → shPlay camera.position.x/y/z + lookAt; lerp pattern identical; sticky lookAt is new |
| `3-4-3-refresher-camera2d` | 3.4.3 Reading — Refresher: camera.x/y from Unit 2.4 | reading | reading | no | Re-states the q5play camera API and follow pattern |
| `3-4-4-video-camera-3d` | 3.4.4 Video — The 3D Camera | video | video | no | Camera as an object in 3D space |
| `3-4-5a-reading-camera-default` | 3.4.5a Reading — Where is the Camera by Default? | reading | reading | no | Default position (0,3,7) looking at origin; what that means for your scene |
| `3-4-5b-reading-camera-position` | 3.4.5b Reading — camera.position is a Vector3 | reading | reading | no | Move camera by setting `.position.x/y/z` |
| `3-4-5c-reading-lookat` | 3.4.5c Reading — camera.lookAt and sticky behavior | reading | reading | no | Point camera at world coord; must call each frame to keep pointing at moving target |
| `3-4-5d-reading-camera-follow` | 3.4.5d Reading — camera.follow(target) | reading | reading | no | Auto-follow mode with offset (0,3,7); clearFollow() cancels |
| `3-4-6a-lab-move-camera` | 3.4.6a Lab — Move camera position | lab | shplay | yes | `camera.position.y += 0.05` in draw |
| `3-4-6b-lab-lookat-target` | 3.4.6b Lab — lookAt a shape | lab | shplay | yes | `camera.lookAt(cube.position.x, cube.position.y, cube.position.z)` each frame |
| `3-4-6c-lab-follow-player` | 3.4.6c Lab — camera.follow a cube | lab | shplay | yes | `camera.follow(cube)` in setup; cube moves on key |
| `3-4-7-example-dolly-shot` | 3.4.7 Example — Dolly Shot | example | shplay | no | Camera moves on arc while lookAt-ing a stationary cube |
| `3-4-8a-reading-deltatime` | 3.4.8a Reading — deltaTime | reading | reading | no | Seconds since last frame; why frame-rate independence matters |
| `3-4-8b-reading-timebased-motion` | 3.4.8b Reading — Time-Based Motion | reading | reading | no | `position.x += speed * deltaTime` — separate concept from deltaTime itself |
| `3-4-8c-lab-deltatime-move` | 3.4.8c Lab — Move with deltaTime | lab | shplay | yes | `cube.position.x += 2 * deltaTime` |
| `3-4-9a-reading-what-is-lerp` | 3.4.9a Reading — What is Lerp? | reading | reading | no | Linear interpolation: `a + (b - a) * t`; pure concept, no 3D API yet |
| `3-4-9b-reading-lerp-3d` | 3.4.9b Reading — Lerp for Camera Smoothing in 3D | reading | reading | no | Applying lerp to `camera.position.x` for smooth follow |
| `3-4-9c-lab-lerp-camera` | 3.4.9c Lab — Lerp the camera X | lab | shplay | yes | `camera.position.x += (target.position.x - camera.position.x) * 0.1` |
| `3-4-9d-reading-follow-ordering` | 3.4.9d Reading — `camera.follow` Precedence | reading | reading | no | While `camera.follow` is active, manual `camera.position.x = ...` and manual `camera.lookAt()` are silently overridden each frame. To do manual lerp on the camera, call `camera.clearFollow()` first. (See Section 2.8 precedence rule.) Prevents the "my lerp lab seems broken" confusion. |
| `3-4-10a-reading-sincos-path` | 3.4.10a Reading — sin/cos Circular Paths | reading | reading | no | `x = cos(t) * r`, `z = sin(t) * r` — how orbits work |
| `3-4-10b-lab-sincos-orbit` | 3.4.10b Lab — Orbit using sin/cos | lab | shplay | yes | Cube orbits origin via `Math.sin/cos(frameCount * 0.02) * 4` |
| `3-4-11-example-smooth-follow` | 3.4.11 Example — Smooth Camera Follow | example | shplay | no | Lerp + follow combined; WASD player |
| `3-4-12-example-cinematic-pan` | 3.4.12 Example — Cinematic Pan | example | shplay | no | Camera arc shot using sin/cos |
| `3-4-12a-sandbox-camera` | 3.4.12a Sandbox — Camera Sandbox | sandbox | shplay | no | A moving cube pre-built; students switch between `camera.follow`, manual position, and lookAt |
| `3-4-b1-lab-avatar-and-floor` | 3.4.B1 Build-Up — Player Avatar and Floor | lab | shplay | yes | Sphere player on Plane; `camera.follow(player)` in setup |
| `3-4-b2-lab-wasd-3d` | 3.4.B2 Build-Up — WASD in 3D World | lab | shplay | yes | `kb.pressing` moves player on X and Z via deltaTime |
| `3-4-b3-lab-lerp-camera-lag` | 3.4.B3 Build-Up — Lerp Camera Lag | lab | shplay | yes | Manual lerp on camera.position so it trails 0.08 behind player |
| `3-4-b4-lab-windmill` | 3.4.B4 Build-Up — Animated Decoration | lab | shplay | yes | Cylinder + two Plane blades class; `blade.rotation.z += 0.03 * deltaTime * 60` |
| `3-4-b5-lab-populate-scene` | 3.4.B5 Build-Up — Populate Scene | lab | shplay | yes | 3+ windmill instances at different positions; player walks among them |
| `3-4-13-walkable-scene` | 3.4.13 Project — Walkable Scene | assignment | shplay | yes | Player avatar, follow camera with lerp, animated decorations, plus ONE student-designed interactive element |
| `3-4-15-challenges` | 3.4.15 Challenges | challenge | challenge | yes | 3 project extensions |
| `3-4-16-video-animation-patterns` | 3.4.16 Video — Animation Patterns | video | video | no | Survey of procedural animation types |
| `3-4-17-example-figure8` | 3.4.17 Example — Figure-8 Path | example | shplay | no | Lemniscate via parametric sin/cos |

**3.4.7 Example — Dolly Shot (runnable):** Camera moves along arc (sin/cos of frameCount) while always lookAt-ing a stationary cube.

**3.4.11 Example — Smooth Camera Follow (runnable):** WASD player; camera lerps with factor 0.08 rather than snapping.

**3.4.12 Example — Cinematic Pan (runnable):** Camera orbits scene on slow circular path.

**3.4.17 Example — Figure-8 Path (runnable):** Sphere traces lemniscate via parametric equations.

**3.4.13 — Project — Walkable Scene scaffold:**
Pre-filled: `let player; let decorations = [];`
STEPs:
- STEP 1: create player Sphere, `camera.follow(player)`
- STEP 2: WASD moves player via deltaTime
- STEP 3: lerp-based camera lag (call `camera.clearFollow()` first if doing manual lerp on camera.position; see 3.4.9d)
- STEP 4: create Windmill (or your own decoration) class
- STEP 5: instantiate 3+ Windmills at varied positions
- STEP 6: call `w.update()` on each in draw
- STEP 7: **add ONE interactive scene element of your design** (creative element). Examples: a moving NPC the player can walk around, a light that gets brighter as the player approaches, a particle that follows behind the player, a switch that changes background color when the player overlaps it. Document it with a `// MY ELEMENT:` comment.

**Project requirements (literal regex patterns):**
| ID | Pattern (regex) | What it checks |
|----|-----------------|---------------|
| r1 | `camera\.follow\s*\(` | Follow-camera engaged |
| r2 | `kb\.pressing` (multiple) AND `\.position\.[xz]\s*[+\-]?=.*deltaTime` | WASD moves player with deltaTime |
| r3 | `\+\=\s*\(.*\-.*\)\s*\*\s*0?\.\d+` OR `\+\s*\(.*\-.*\)\s*\*` (lerp formula) | Lerp smoothing somewhere |
| r4 | `class\s+\w+` | A decoration class is defined |
| r5 | `new\s+\w+\s*\(` (count of decoration class instances ≥ 3) | At least 3 instances |
| r6 | `\/\/\s*MY ELEMENT` (case-insensitive) | Student documented their interactive element |

**3.4.15 — Challenges:**
1. Add a swaying-tree class: Cylinder trunk with Sphere canopy; canopy bobs with `Math.sin(frameCount * 0.02) * 0.1`.
2. Add "cinematic mode" — press C to clearFollow and have camera auto-pan.
3. Add a collectible system using Group + intersects from Module 3.3.

---

### Module 3.6: Lighting (v3 first half of original 3.5; further splits into final 3.9 + 3.10)

> **Split & renumber note:** This v3 section (~30 lessons covering the lighting half of pre-split 3.5) splits AGAIN at the point-light reading:
> - **Final 3.9 Lighting Foundations** (~15): "what is light" + ambient + directional readings + labs + first sandbox. Bulk-rename `3-5-` → `3-9-` for these specific rows.
> - **Final 3.10 Light Studio** (~15): point + spot light readings + labs, light color, intensity, multi-light composition, three-point example, animated-light, Light Studio build-ups + project + challenges. Bulk-rename `3-5-` → `3-10-`.
>
> The Light Studio project lives in **final 3.10**.

**Theme:** Light sources, surface properties, and scene composition. No Unit 2 parallel — this is the uniquely-3D module. Emphasis on visual exploration.

**Module Project: Mood Scene** — a static composition demonstrating intentional lighting design. Students pick a theme (sunset, neon arcade, or spooky moonlit); unified rubric: multiple lights, varied materials, mood legible from scene alone.

**Concepts taught (all new):**
1. Bridge — Why q5play didn't have lights (2D draws pixels with explicit colors; no surface direction; 3D needs lights to see surfaces)
2. What is light? (conceptual — not an API lesson)
3. Ambient light — every surface gets the same amount, intensity 0 = black
4. Directional / sun light — parallel rays like the sun; position sets direction not location
5. Directional light position vs target — position alone changes highlight angle
6. Point light — omnidirectional from a position; falls off with distance
7. Point light position — where it sits in the scene
8. Light color — separate from intensity; tints what you see
9. Lab: tint directional light orange
10. Lab: tint point light blue
11. Light intensity — how bright, separate from color
12. Lab: dim/brighten a light
13. Multiple lights composition — additive mixing
14. Lab: ambient + directional + point in same scene
15. SpotLight — cone-shaped, focus angle
16. What is a material? (conceptual intro)
17. `metalness` — how mirror-like a surface is (0.0–1.0)
18. Lab: high vs low metalness
19. `roughness` — how diffuse vs glossy (0.0–1.0)
20. Lab: high vs low roughness
21. `wireframe` — diagnostic view
22. q5play `.color` parallel — same API, different effect in 3D lighting
23. Scene composition — floor, backdrop, light placement as art direction

**Library prerequisites:** Sections 2.6 (light controls), 2.7 (material controls).

**Design note:** Readings describe what the student will see before they see it — "the right side will be bright white, the left will be almost black" — then the lab confirms this.

**Lesson count: 56** (cut 3.5.18 writeup per keep-3-of-6 policy. Oracle additionally recommends trimming to ~41 by collapsing metalness/roughness reading-lab pairs and dropping the additive-mixing standalone reading; that trim is deferred to authoring time when each lesson's content is being written, so authors can decide pair-by-pair what's truly compoundable.)

| ID | Title | Type | Preview | Graded | Concept |
|----|-------|------|---------|--------|---------|
| `3-5-1-slides` | 3.5.1 Module Slides | slides | slides | no | — |
| `3-5-2-bridge` | 3.5.2 Reading — Bridge: Why q5play Didn't Have Lights | reading | reading | no | 2D draws pixels with explicit colors, no surface normals; 3D needs lights to "see" surfaces at all |
| `3-5-3-video-lighting-intro` | 3.5.3 Video — How Lighting Works in 3D | video | video | no | Ambient vs directional vs point, real-world analogy |
| `3-5-4a-reading-what-is-light` | 3.5.4a Reading — What is Light? | reading | reading | no | Conceptual: light source + surface direction = visible 3D form; no API in this lesson |
| `3-5-4b-reading-ambient` | 3.5.4b Reading — Ambient Light | reading | reading | no | Every surface gets the same light; intensity 0 = pitch black; 1 = flat, no shadows |
| `3-5-4c-lab-ambient-intensity` | 3.5.4c Lab — Adjust Ambient Intensity | lab | shplay | yes | `ambientLight.intensity = 0.05` then `0.9`; observe difference |
| `3-5-5a-reading-directional` | 3.5.5a Reading — Directional Light (sunLight) | reading | reading | no | Parallel rays like the sun; position sets direction not a physical location |
| `3-5-5b-reading-directional-position` | 3.5.5b Reading — sunLight position vs target | reading | reading | no | Moving `sunLight.position.x` rotates the highlight; not the same as a point light's location |
| `3-5-5c-lab-sunlight-position` | 3.5.5c Lab — Move the Sun | lab | shplay | yes | `sunLight.position.x = Math.sin(frameCount * 0.01) * 10` |
| `3-5-5d-sandbox-ambient-sun` | 3.5.5d Sandbox — Ambient + Sun Playground | sandbox | shplay | no | A Sphere; sliders concept: edit ambientLight.intensity and sunLight.position.x in code and re-run |
| `3-5-6a-reading-pointlight` | 3.5.6a Reading — Point Light | reading | reading | no | Omnidirectional from a position; falls off with distance like a lantern |
| `3-5-6b-reading-pointlight-position` | 3.5.6b Reading — Point Light Position | reading | reading | no | Where the PointLight sits in the scene determines what surfaces it brightens |
| `3-5-6c-lab-pointlight-add` | 3.5.6c Lab — Add a PointLight | lab | shplay | yes | `new PointLight(0, 3, 0, 'white', 2)` above a sphere |
| `3-5-6d-lab-pointlight-orbit` | 3.5.6d Lab — Orbit a PointLight | lab | shplay | yes | Move PointLight position with sin/cos each frame |
| `3-5-6e-sandbox-pointlight` | 3.5.6e Sandbox — PointLight Playground | sandbox | shplay | no | Sphere + pre-placed PointLight; students move position and observe falloff |
| `3-5-7a-reading-light-color` | 3.5.7a Reading — Light Color | reading | reading | no | Setting `.color` on a light tints everything it illuminates; separate from intensity |
| `3-5-7b-lab-tint-directional-orange` | 3.5.7b Lab — Tint Directional Light Orange | lab | shplay | yes | `sunLight.color = 'orange'` — warm light effect; observe color shift on white sphere |
| `3-5-7c-lab-tint-pointlight-blue` | 3.5.7c Lab — Tint PointLight Blue | lab | shplay | yes | `pLight.color = '#4488ff'` — cool fill light |
| `3-5-8a-reading-light-intensity` | 3.5.8a Reading — Light Intensity | reading | reading | no | How bright the light is; separate from color; combining dim + vivid-color vs bright + pastel-color |
| `3-5-8b-lab-dim-brighten` | 3.5.8b Lab — Dim and Brighten | lab | shplay | yes | `ambientLight.intensity = 0.05; sunLight.intensity = 5` — extreme contrast |
| `3-5-9a-reading-multi-lights` | 3.5.9a Reading — Multiple Lights: Additive Mixing | reading | reading | no | Lights add together; two warm + one cool = complex scene; no single "correct" mix |
| `3-5-9b-lab-three-lights` | 3.5.9b Lab — Ambient + Directional + Point | lab | shplay | yes | All three light types in one scene; tweak intensities until scene looks intentional |
| `3-5-10-example-three-point` | 3.5.10 Example — Three-Point Lighting | example | shplay | no | Key PointLight + fill PointLight (half intensity) + back SpotLight. Sphere in center |
| `3-5-11a-reading-spotlight` | 3.5.11a Reading — SpotLight | reading | reading | no | Cone-shaped light; focus angle; use for theatrical highlight |
| `3-5-11b-lab-spotlight` | 3.5.11b Lab — Add a SpotLight | lab | shplay | yes | Spotlight on a sphere from above |
| `3-5-12a-sandbox-lights` | 3.5.12a Sandbox — Lights Playground | sandbox | shplay | no | A cube scene with ambientLight, sunLight, one PointLight all pre-coded; students edit color/intensity/position and re-run |
| `3-5-13a-reading-what-is-material` | 3.5.13a Reading — What is a Material? | reading | reading | no | Surface description: how light bounces off; no API yet — concept only |
| `3-5-13b-reading-color-in-lights` | 3.5.13b Reading — shape.color in a Lit Scene | reading | reading | no | q5play .color parallel; in 3D, color interacts with lights rather than just drawing that pixel |
| `3-5-13c-reading-metalness` | 3.5.13c Reading — metalness | reading | reading | no | 0 = matte, 1 = mirror-like; PBR model |
| `3-5-13d-lab-metalness` | 3.5.13d Lab — Metalness Spectrum | lab | shplay | yes | Row of 5 spheres; metalness 0 to 1 |
| `3-5-13e-reading-roughness` | 3.5.13e Reading — roughness | reading | reading | no | 0 = shiny specular, 1 = diffuse flat; distinct from metalness |
| `3-5-13f-lab-roughness` | 3.5.13f Lab — Roughness Spectrum | lab | shplay | yes | Row of 5 spheres; roughness 0 to 1 |
| `3-5-13g-lab-wireframe` | 3.5.13g Lab — Wireframe Toggle | lab | shplay | yes | `shape.wireframe = !shape.wireframe` on key press |
| `3-5-14-example-materials-showcase` | 3.5.14 Example — Materials Showcase | example | shplay | no | 5×5 grid of spheres; X = metalness 0→1, Y = roughness 0→1 |
| `3-5-14a-sandbox-materials` | 3.5.14a Sandbox — Materials Playground | sandbox | shplay | no | A sphere with editable metalness/roughness; students change values and re-run |
| `3-5-15-reading-scene-composition` | 3.5.15 Reading — Scene Composition | reading | reading | no | Floor, backdrop, light placement as design choices; art direction in code |
| `3-5-16-example-mood-lighting` | 3.5.16 Example — Mood Lighting | example | shplay | no | Press 1/2/3 to switch: warm/sunny, cold/blue, dramatic-orange. Same geometry, only lights change |
| `3-5-b1-lab-choose-theme` | 3.5.B1 Build-Up — Set the Stage | lab | shplay | yes | Pick a theme; set background color, ambient intensity, sunLight angle matching the mood |
| `3-5-b2-lab-add-pointlights` | 3.5.B2 Build-Up — Add Point Lights | lab | shplay | yes | Place 2+ PointLights with theme-appropriate colors and intensities |
| `3-5-b3-lab-material-surfaces` | 3.5.B3 Build-Up — Material Surfaces | lab | shplay | yes | Set metalness/roughness on at least 3 shapes to reinforce the mood |
| `3-5-b4-lab-animated-light` | 3.5.B4 Build-Up — Animate One Light | lab | shplay | yes | One PointLight or SpotLight that moves per frame |
| `3-5-b5-lab-composition-review` | 3.5.B5 Build-Up — Composition Review | lab | shplay | yes | Add backdrop Sphere or Plane; adjust all lights until mood reads clearly |
| `3-5-17-mood-scene` | 3.5.17 Project — Mood Scene | assignment | shplay | yes | Complete mood scene: theme, 2+ lights, varied materials, mood is legible, plus a unique theme of student's own design |
| `3-5-19-challenges` | 3.5.19 Challenges | challenge | challenge | yes | 3 project extensions |

*(Note: Module 3.5 had one pre-existing sandbox `3-5-15-sandbox` in the original, split here into 4 targeted sandboxes at 3-5-5d, 3-5-6e, 3-5-12a, 3-5-14a — one per concept cluster.)*

**3.5.10 Example — Three-Point Lighting (runnable):** Studio-style rig: key PointLight upper-left, fill PointLight lower-right half intensity, back SpotLight from behind. Sphere in center.

**3.5.14 Example — Materials Showcase (runnable):** 5×5 grid of Spheres. X axis metalness 0→1, Y axis roughness 0→1.

**3.5.16 Example — Mood Lighting (runnable):** Press 1/2/3 to switch between three full light rig presets.

**3.5.17 — Project — Mood Scene scaffold:**
Pre-filled: shape declarations and `ambientLight.intensity = 0.1` in setup. A `// THEME:` placeholder comment at the top of the file.
STEPs:
- STEP 1: choose your theme. Suggested options: sunset, neon arcade, spooky moonlit. **OR — your own theme** (creative element). Document with `// THEME: <your theme>` at top.
- STEP 2: set background and sunLight angle to match the theme
- STEP 3: add at least 2 PointLights with themed colors and intensities
- STEP 4: set metalness/roughness on at least 3 surfaces to reinforce the mood
- STEP 5: animate at least one light each frame (oscillate position, lerp color, etc.)
- STEP 6: add a backdrop or floor plane to frame the composition

**Project requirements (literal regex patterns):**
| ID | Pattern (regex) | What it checks |
|----|-----------------|---------------|
| r1 | `\/\/\s*THEME:` (case-insensitive) | Student declared their theme |
| r2 | `new\s+(PointLight\|SpotLight)\s*\(` (count ≥ 2) | At least 2 lights instantiated |
| r3 | `\.metalness\s*=` (count ≥ 1) | Metalness set on at least one surface |
| r4 | `\.roughness\s*=` (count ≥ 1) | Roughness set on at least one surface |
| r5 | `(PointLight\|SpotLight\|sunLight\|ambientLight).*\.position\.[xyz]\s*[+\-]?=` OR `\.intensity\s*=.*frameCount` (within draw) | At least one light animated per frame |
| r6 | `background\s*\(` AND `new\s+Plane\s*\(` | Backdrop / floor plane present |

**3.5.19 — Challenges:**
1. Day/night cycle — over 600 frames, lerp sunLight.color from deep red through white and back.
2. Key-triggered full mood swap — press a key to change all light colors + background without reloading.
3. "Flashlight" — SpotLight whose position updates to match a moving Cube each frame.

---

#### Module 3.6 (split-half) project: Light Studio

The Mood Scene project above is **3.7's** project (next section). Module 3.6 — Lighting only — needs its own project that demonstrates each light type's role without yet involving materials. Light Studio replaces Mood Scene for 3.6.

**Project: Light Studio** — a single Sphere on a Plane floor, lit progressively with each light type. Ambient → directional → point → spot, each with deliberate color and intensity choices. Final scene shows 4 lights collaborating; student tweaks each in turn to demonstrate they understand its specific contribution.

**3.6 build-up labs (replace Mood Scene build-ups; use slot `3-5-bN` in pre-split, rename to `3-6-bN`):**
- `3-5-b1-lab-ambient-only` — Sphere + Plane visible only via ambientLight; directional + point both off
- `3-5-b2-lab-add-directional` — re-enable sunLight at moderate intensity; observe shadow direction
- `3-5-b3-lab-add-point` — add a colored PointLight off to one side
- `3-5-b4-lab-add-spot` — add a SpotLight aimed at the Sphere; observe cone falloff
- `3-5-b5-lab-tune-intensities` — adjust each light's intensity to balanced studio composition
- `3-5-b6-lab-animate-one` — animate one light's position via `Math.sin/cos(radians(frameCount))`

**3.6.17 — Project — Light Studio scaffold:**
Pre-filled: `let subject, floor;` at top, both instantiated in setup, `ambientLight.intensity = 0.1` set initially.
STEPs:
- STEP 1: tune `ambientLight.intensity` and `ambientLight.color` to a base level
- STEP 2: position `sunLight` and set its intensity + color
- STEP 3: instantiate at least one `new PointLight(...)` with a contrasting color
- STEP 4: instantiate at least one `new SpotLight(...)` aimed at the subject
- STEP 5: animate ONE of the four lights (position OR intensity OR color) per frame
- STEP 6: **add ONE creative element** — examples: a second PointLight that orbits the subject, color-cycling on the SpotLight, a key-pressed toggle that swaps between "studio" and "concert" presets. Document with `// MY ELEMENT:`.

**Project requirements (literal regex patterns):**
| ID | Pattern (regex) | What it checks |
|----|-----------------|---------------|
| r1 | `ambientLight\.\w+\s*=` | Ambient light tuned |
| r2 | `sunLight\.\w+\s*=` | Directional sun light tuned |
| r3 | `new\s+PointLight\s*\(` | At least one point light |
| r4 | `new\s+SpotLight\s*\(` | At least one spot light |
| r5 | `(ambientLight\|sunLight\|\w+Light)\.(position\|intensity\|color)\.?[xyzset]?\s*[+\-]?=.*frameCount\|Math\.(sin\|cos)` | At least one light animated per frame |
| r6 | `\/\/\s*MY ELEMENT` (case-insensitive) | Student documented their creative element |

**3.6.19 — Challenges (project extensions for Light Studio):**
1. Day/night cycle — over 600 frames, lerp `sunLight.color` from deep red through white through red again.
2. Key-triggered preset swap — press 1/2/3 to switch between studio / concert / horror lighting presets.
3. "Lighthouse" — a SpotLight that rotates 360° around the subject, sweeping the scene.

---

### Module 3.7: Materials & Atmosphere (v3 second half of original 3.5; final number 3.11)

> **Renumber note:** This v3 section (~26 lessons) does NOT split further (26 is within the 14–25 range; close enough to ~20). Final module number is **3.11**. Bulk-rename from `3-5-` to `3-11-`.
> - Coverage: materials (color, metalness, roughness, wireframe), material + lighting interplay, Mood Scene build-ups + project + challenges.
> - The Mood Scene project lives in **final 3.11**.

**Theme:** Materials change how surfaces *respond* to the lights established in 3.6. Mastery of `metalness`, `roughness`, and material color, then composing a complete mood scene that uses both lights and materials intentionally.

**Module Project: Mood Scene** — a static composition that demonstrates intentional lighting + material design. Three suggested themes (sunset, neon arcade, spooky moonlit) plus a creative-element fourth option. Project spec, scaffold STEPs, requirements regex, and challenges are documented in the pre-split 3.5 section above (Mood Scene Project block). Bulk-rename to `3-7-`.

**Concepts taught (new in 3.7 vs 3.6):**
- What a material is (separate from a shape's geometry)
- Standard material's color channel (now distinct from `.color` on the shape — they alias for MeshStandardMaterial but the concept distinction matters)
- `metalness` (0–1) — surface reflectivity
- `roughness` (0–1) — surface scattering / sharpness of reflections
- `wireframe` (boolean, if exposed) — geometry-only render
- The interplay: same material looks completely different under different lights from 3.6

**Concepts re-applied from 3.6:**
- All four light types — used together to compose the mood
- Light color and intensity choices reinforce the chosen theme

**Library prerequisites:** Section 2.7 (Material Controls — metalness/roughness/wireframe).

**Lesson count: 26** (the second-half row count from pre-split 3.5).

**Writeup placement:** Per the keep-3-of-6 (now keep-3-of-8) writeup policy: keep first (3.1.17), middle (3.4.16, the Collector Game writeup), last (3.8.9, the Platformer writeup). Module 3.7 has NO writeup.

---

### Module 3.8: 3D Platformer (v3 numbering; final number splits into 3.12 + 3.13)

> **Split & renumber note:** This v3 section (29 lessons) splits into TWO final modules at the boundary between B3c (WASD + Jump integration) and B4 (Coins):
> - **Final 3.12 3D Platformer — Mechanics** (~15): rows from slides through `3-6-b3c-lab-wasd-jump-integrated`. Bridge, refresher (game states), physics readings + labs (gravity, vel, onGround, usePhysics, jump, ground-check), jump example, B1 player-physics, B2 platforms, B3a/B3b/B3c WASD+jump build-ups. Bulk-rename `3-6-` → `3-12-`.
> - **Final 3.13 3D Platformer — Build & Ship (Unit Final)** (~14): rows from `3-6-b4-lab-coins` through final-sandbox. B4 coins, B5 win-condition, B6 game-state, B7 atmosphere, Project, AI-graded writeup (last writeup of the unit), challenges, sandbox. Bulk-rename `3-6-` → `3-13-`.
>
> Build-up lab numbering re-sequences within each final module: 3.12 keeps B1–B3c, 3.13 starts fresh at B1 (was B4). The Project, Writeup, and Challenges all live in **final 3.13** (Unit Final). The Unit Final unlock gate (Section 5.4) protects `3-13-*` IDs, not `3-8-*`.

**Theme:** Students apply everything from 3.1–3.5 to build one complete 3D platformer. Single linear module. All prior modules must be completed before 3.6 unlocks.

**Concepts integrated (all from prior modules):**
- Shapes, position, rotation (3.1)
- Classes with multiple shape parts and methods (3.2)
- Group, distance, intersects (3.3)
- camera.follow, lerp smoothing (3.4)
- ambientLight, sunLight, PointLight, materials (3.5)
- **New:** `usePhysics`, `vel.x/y/z`, `onGround`, `gravity` (Section 2.10)

**Concepts taught (new in 3.6):**
1. Bridge — Physics in shPlay vs q5play: q5play world.gravity + sprite.vel.x/y on by default; shPlay physics is opt-in: `usePhysics = true` flag
2. Refresher — game states from Unit 2.6: `let gameState = 'play' | 'win'` switch pattern
3. What is gravity in shPlay? — a constant that pulls vel.y down each frame
4. `vel.x`, `vel.y`, `vel.z` — the three velocity components; separate concepts from gravity
5. `onGround` flag — what it checks, when it fires (position.y hits groundY)
6. `usePhysics = true` — opt-in registration; why not all shapes have physics (3D physics is expensive)
7. Platformer architecture — game states, level design in 3D, physics + camera combo

**Library prerequisites:** Section 2.10 (physics system).

**Lesson count: 29** (added 3.6.B3c WASD+Jump integration build-up; reordered B6/B7 so B6=game-state and B7=atmosphere — mechanical build-ups uninterrupted, polish layer last)

| ID | Title | Type | Preview | Graded | Concept |
|----|-------|------|---------|--------|---------|
| `3-6-1-slides` | 3.6.1 Module Slides | slides | slides | no | Unit final orientation |
| `3-6-2-bridge` | 3.6.2 Reading — Bridge: Physics in shPlay vs q5play | reading | reading | no | q5play: vel.x/y on all sprites, gravity always on. shPlay: usePhysics opt-in; vel.x/y/z; gravity constant; why opt-in |
| `3-6-3-refresher-gamestates` | 3.6.3 Reading — Refresher: Game States from Unit 2.6 | reading | reading | no | Re-states `let gameState = 'play'` switch pattern from q5play; will apply identically in platformer |
| `3-6-4a-reading-gravity` | 3.6.4a Reading — What is Gravity in shPlay? | reading | reading | no | `gravity` constant; each frame `vel.y -= gravity * deltaTime`; net effect: shapes fall |
| `3-6-4b-reading-vel-components` | 3.6.4b Reading — vel.x, vel.y, vel.z | reading | reading | no | Three separate velocity components; vel.y is the one gravity affects; vel.x/z used for horizontal movement |
| `3-6-4c-reading-onground` | 3.6.4c Reading — The onGround Flag | reading | reading | no | Set to true when shape's position.y hits groundY; cleared every frame until shape lands |
| `3-6-4d-reading-usephysics` | 3.6.4d Reading — usePhysics Opt-In | reading | reading | no | Why not all shapes have physics; how to register a shape; how to deregister on remove() |
| `3-6-5-example-jump-demo` | 3.6.5 Example — Jump Mechanic | example | shplay | no | Minimal: Sphere, `usePhysics = true`, Space sets `vel.y = 5` when `onGround`. Plane floor. Nothing else |
| `3-6-6a-lab-optin-physics` | 3.6.6a Lab — Opt-In Physics: Observe Falling | lab | shplay | yes | `cube.usePhysics = true`; observe it fall to ground; adjust gravity constant |
| `3-6-6b-lab-gravity-tuning` | 3.6.6b Lab — Gravity Tuning | lab | shplay | yes | Change `gravity` from 9.8 to 2 and 20; observe fall speed changes |
| `3-6-6c-lab-jump-impulse` | 3.6.6c Lab — Jump Impulse | lab | shplay | yes | Space bar sets `player.vel.y = 5`; no guard yet |
| `3-6-6d-lab-ground-check` | 3.6.6d Lab — Ground Check Before Jump | lab | shplay | yes | `if (player.onGround) player.vel.y = 5` — prevents double-jump |
| `3-6-6e-sandbox-physics` | 3.6.6e Sandbox — Physics Sandbox | sandbox | shplay | no | Several shapes with `usePhysics = true` falling from different heights; students observe and tweak gravity |
| `3-6-7-reading-platformer-arch` | 3.6.7 Reading — Platformer Architecture | reading | reading | no | Game states, level design in 3D, physics + camera combo, planning the build-up |
| `3-6-b1-lab-player-physics` | 3.6.B1 Build-Up — Player with Physics | lab | shplay | yes | `player.usePhysics = true`; falls and lands on Plane |
| `3-6-b2-lab-platforms` | 3.6.B2 Build-Up — Platform Level | lab | shplay | yes | 5+ Cube platforms at varied x/y/z; player lands on floor Plane |
| `3-6-b3a-lab-wasd-only` | 3.6.B3a Build-Up — WASD Only | lab | shplay | yes | WASD moves `player.vel.x/z`; no jump yet; `camera.follow(player)` in setup |
| `3-6-b3b-lab-jump-only` | 3.6.B3b Build-Up — Jump Only | lab | shplay | yes | Space jumps when `player.onGround`; WASD not yet added; tests jump guard in isolation |
| `3-6-b3c-lab-wasd-jump-integrated` | 3.6.B3c Build-Up — WASD + Jump Together | lab | shplay | yes | Combine B3a + B3b in one sketch — first time both are integrated. Resolves the "missing integration step" gap. |
| `3-6-b4-lab-coins` | 3.6.B4 Build-Up — Collectible Coins | lab | shplay | yes | `coins = new Group()`, gold Spheres on platforms; intersects collect + remove |
| `3-6-b5-lab-win-condition` | 3.6.B5 Build-Up — Win Condition | lab | shplay | yes | Flag Cylinder at far end; `intersects(player, flag)` → `gameState = 'win'` |
| `3-6-b6-lab-game-state` | 3.6.B6 Build-Up — Game State | lab | shplay | yes | `gameState === 'play'` guards movement; win state stops movement and logs result. (Reordered before atmosphere so mechanical build-ups stay uninterrupted.) |
| `3-6-b7-lab-atmosphere` | 3.6.B7 Build-Up — Lit Atmosphere | lab | shplay | yes | sunLight angle, one PointLight near flag, metalness on platforms. Polish layer added LAST. |
| `3-6-8-platformer` | 3.6.8 Project — 3D Platformer | assignment | shplay | yes | Complete platformer with two-tier requirements: core (pass) and full (exemplary). Plus ONE student-designed feature. |
| `3-6-9-platformer-writeup` | 3.6.9 Writeup — 3D Platformer | assignment | assignment | yes (AI) | Written: architecture, hardest part, what you'd add |
| `3-6-10-challenges` | 3.6.10 Challenges | challenge | challenge | yes | 3 project extensions |
| `3-6-11-sandbox` | 3.6.11 Final Sandbox | sandbox | shplay | no | Free-play — no requirements |

**3.6.5 Example — Jump Mechanic (runnable):** Sphere at origin with `usePhysics = true`. Space sets `player.vel.y = 5` when `player.onGround`. Plane floor. Nothing else — just the pure jump loop.

**3.6.8 — Project — 3D Platformer scaffold:**
Pre-filled: `let player, platforms, coins, flag; let score = 0; let gameState = 'play';`
STEPs:
- **CORE STEPs (pass bar):**
  - STEP 1: create player Sphere, `player.usePhysics = true`; create Plane floor (`isGround = true` is default for Plane)
  - STEP 2: WASD moves `player.vel.x/z` when `gameState === 'play'`
  - STEP 3: Space jumps when `player.onGround`
  - STEP 4: `camera.follow(player)` in setup
  - STEP 5: at least 1 collectible Sphere; `intersects(player, coin)` removes it
- **FULL STEPs (exemplary):**
  - STEP 6: 5+ Cube platforms with `isGround = true`, varied (x, y, z) — students walk + jump between them
  - STEP 7: convert single coin into `coins = new Group()` with multiple gold Spheres distributed on platforms
  - STEP 8: flag Cylinder at far end; `if (intersects(player, flag)) gameState = 'win'`
  - STEP 9: track + display `score` (console.log or update a backdrop element)
  - STEP 10: sunLight angle + one PointLight + metalness on at least 2 surfaces (atmosphere)
- **CREATIVE STEP** (replaces the "one element not in build-ups"):
  - STEP 11: **add ONE feature you design**. Examples: enemy Sphere that patrols and respawns the player on contact, a key Cube that must be touched before the flag works, a double-jump (track jumps used since last `onGround === true`), a moving platform timed to a song. Document with `// MY FEATURE:`.

**Two-tier requirements (separate `requirements[]` arrays in `lesson.json`):**

| Tier | ID | Pattern (regex) | What it checks |
|------|----|-----------------|---------------|
| core (pass) | r1 | `\.usePhysics\s*=\s*true` | Player opt-in physics |
| core (pass) | r2 | `\.vel\.y\s*=` AND `onGround` | Jump impulse with ground guard |
| core (pass) | r3 | `camera\.follow\s*\(` | Follow-camera engaged |
| core (pass) | r4 | `intersects\s*\(\s*player` | At least one collectible |
| core (pass) | r5 | `gameState` | State variable defined |
| full (bonus) | r6 | `\.isGround\s*=\s*true` (count ≥ 5) OR `new Cube` count ≥ 5 with isGround set | At least 5 platforms |
| full (bonus) | r7 | `new Group\s*\(\s*\)` AND `intersects.*flag\|flag.*intersects` | Coin Group + win flag |
| full (bonus) | r8 | `(new PointLight\|sunLight\.\w+\s*=).*\.metalness\s*=` (within file) | Atmosphere applied |
| full (bonus) | r9 | `\bscore\b` updated (`score\s*[+\-]?=`) | Score updates |
| creative | r10 | `\/\/\s*MY FEATURE` (case-insensitive) | Student documented their feature |

Lesson UI shows core green = pass; full green = exemplary. Students who can't complete the full set still ship.

**3.6.9 — Writeup prompt:** "Describe your 3D Platformer. Explain: (1) how the physics system works — what happens each frame to make the player fall and land, (2) the hardest part of building the game and how you solved it, (3) one feature you would add next."

**3.6.10 — Challenges:**
1. Moving platforms — one or more Cubes oscillate horizontally with `Math.sin(frameCount * 0.02)`.
2. Lives system — fall below y = −10 → respawn at (0,2,0), decrement `lives`; game over at 0.
3. Second level — all coins collected + flag reached → reload new platform layout.

---

## Section 4: Build Sequence

### Wave 0 — Library and Infrastructure (must complete before any shplay lessons ship)

**Definition of done:** All items below are implemented and manually verified in sandbox; `preview: 'shplay'` renders correctly in the app for a test lesson.

**Library (`public/shplay/shplay.js`) — Phase 0 additions, ~404 lines net (236 → ~640):**
- [ ] Add `Cone`, `Cylinder`, `Torus` classes (~80 lines)
- [ ] Add `.size` setter to `Plane` (the live file currently lacks one) (~5 lines)
- [ ] Add `random(min, max)` helper + global (3 lines)
- [ ] Add `degrees(r)` and `radians(d)` helpers + globals (4 lines)
- [ ] Add `addMaterialProps()` mixin; apply to all 6 shape classes (~20 lines)
- [ ] Add `distance(a, b)` and `intersects(a, b)` functions + globals (~20 lines)
- [ ] Add `Group` class with `[Symbol.iterator]` + defensive `remove()` no-op + global (~45 lines)
- [ ] Expose light handles (`ambientLight`, `sunLight`); modify `spawnDefaults()` to store; add `PointLight`, `SpotLight` classes (~80 lines)
- [ ] **Camera precedence rule** — fix the existing `_camHandle` so `lookAt` is conditional; add `camera.follow()` / `clearFollow()` / `camera.orbit()` / `clearOrbit()` (~45 lines)
- [ ] Add `deltaTime` global computed in `frame()` (5 lines)
- [ ] **Y-axis physics with AABB platform collision** (Section 2.10) — frame tick order, ground-collision pass against `_grounds[]`, friction loop, registration in shape constructors and `remove()`, `halfHeight/Width/Depth` getters from geometry, `gravity` global (~85 lines)
- [ ] **Parenting helper** `parent(child, parentObj)` and `unparent(child)` + globals (~15 lines)
- [ ] **Dispose method** — register `message` listener for `{type: 'dispose'}` to call `renderer.dispose()` + `scene.clear()` + cancel rAF (~15 lines, mostly in `runner.html`)
- [ ] Add `// === SECTION ===` banner comments matching Section 2 numbering for future-split hygiene

**Vendor three.js (Section 2.13):**
- [ ] Download `three@0.180.0` `three.module.js` (~600 KB) into `public/shplay/vendor/three@0.180.0/three.module.js`
- [ ] Update `public/shplay/runner.html` importmap to `/shplay/vendor/three@0.180.0/three.module.js`
- [ ] Update `public/shplay/sandbox.html` importmap similarly
- [ ] Create `public/shplay/README.md` documenting upgrade path
- [ ] Verify offline operation: DevTools Network tab shows zero unpkg.com requests

**Sandbox (`public/shplay/sandbox.html`):**
- [ ] Add new sample sketches: `shapes2`, `randomColors`, `collide`, `groupDemo`, `lights`, `materials`, `camera-follow`, `camera-orbit`, `physics-floor`, `physics-platforms`, `parenting` (~11 new entries)

**Runner (`public/shplay/runner.html`):**
- [ ] Update importmap (vendoring)
- [ ] Add `window.addEventListener('message', e => { if (e.data?.type === 'dispose') { renderer.dispose(); scene.clear(); cancelAnimationFrame(_raf); } })`

**Type system & components:**
- [ ] `lib/types.ts` line 82 — add `'shplay'` to preview union (1-line change)
- [ ] `lib/encode-code.ts` — extract `encodeCode` from `Q5PlayPreview.tsx` (move + export)
- [ ] `components/Q5PlayPreview.tsx` — replace local `encodeCode` with import from `lib/encode-code` (~7 lines diff)
- [ ] `components/ShPlayPreview.tsx` — new file (~35 lines, including `useEffect` dispose post on unmount)
- [ ] `components/LessonWorkspace.tsx` — import ShPlayPreview; add `isShPlayMode`; sweep all `isQ5Mode` branches per Section 2.11c table (Run button label, preview render, status, score header units, docs link, AI-help routing); add `runShPlay()`, `shplayCode`/`shplayRunKey` state (~50 lines)
- [ ] **Verification:** `grep -n "isQ5Mode" components/LessonWorkspace.tsx` — every match has either an `isShPlayMode` companion branch or a comment explaining why it's q5-only

**Docs & routing:**
- [ ] `lib/shplay-docs.ts` — new file with 13 `DocSection` skeletons + `findRelevantDocs()` (~800–1200 lines authored over Wave 0–1)
- [ ] `functions/api/ai-help.ts` — `lessonId`-prefix routing for `3-` → shplay-docs; unit-string allowlist validator regex `/^[123]\.\d+ /` (~25 lines)
- [ ] `functions/api/lesson-state/[lessonId].ts` (or wherever `PUT` lives) — backend gate: reject `3-13-*` IDs (Unit Final) unless Module 3.11's Mood Scene project is completed (~10 lines)

**Curriculum + test lesson:**
- [ ] `curriculum/modules/3.[1-6]_*.md` — create 6 module manifest files
- [ ] `lessons/3-0-sandbox/` — test lesson (`lesson.json` + `script.js`) to verify the render pipeline before authoring real Wave 1 content

### Wave 1 — Module 3.1: Coordinates & Transforms (~22 folders, post-split)

**Dependency:** Wave 0 complete.

Apply the rename map (`plans/lesson-numbering-convention.md` Section 7) to the **first half** of pre-split 3.1's table — rows from `3-1-1-slides` through `3-1-11b-lab-framecount-rotate` keep their `3-1-` prefix and re-sequence positions if needed. Then add the new Spinning Sculpture project artifacts:

- [ ] All first-half folders from pre-split 3.1 table (slides, bridge, intro video, axis readings, sandbox-axes, transform readings, transform labs, spinning-scene example, transform-playground sandbox, color/background/frameCount readings + labs)
- [ ] `lessons/3-1-bN-lab-…` × 5 — Spinning Sculpture build-ups (replace pre-split B0–B5 since those go to 3.2)
- [ ] `lessons/3-1-N-spinning-sculpture/` (lesson.json + script.js + solution.js) — Module project
- [ ] `lessons/3-1-N+1-3d-writeup/` (lesson.json + content.md) — first-3D AI-graded writeup (kept)
- [ ] `lessons/3-1-N+2-challenges/` (lesson.json + content.md + script.js + solution.js)
- [ ] `curriculum/modules/3.1_coordinates-and-transforms.md`

### Wave 2 — Module 3.2: Shapes & Composition (~25 folders, post-split)

**Dependency:** Wave 1 complete.

Apply the rename map to the **second half** of pre-split 3.1's table — rows from `3-1-12-reading-sphere-plane` through `3-1-18-challenges` get prefix `3-2-` with re-sequenced positions:

- [ ] All second-half folders from pre-split 3.1 (Sphere/Plane reading + 2 labs, Cone/Cylinder/Torus readings + labs, random reading + lab, Shape Zoo example, Shape Gallery sandbox, anchor reading, Solar System B0–B5 build-ups, Solar System project, Solar System challenges)
- [ ] `curriculum/modules/3.2_shapes-and-composition.md`

### Wave 3 — Module 3.3: OOP in 3D — Foundations (~21 folders)

**Dependency:** Wave 2 complete.

Pre-split 3.2 (39 lessons) splits at the composition reading. Apply the rename map for the **first ~21 rows** (slides through procedural-vs-OOP example): bulk-rename `3-2-` → `3-3-`. Single-shape OOP, constructors, methods, instances.

- [ ] First-half folders from pre-split 3.2 (rows ending at `3-2-13a-sandbox-oop` or equivalent) → `3-3-*`
- [ ] `curriculum/modules/3.3_oop-foundations.md`

### Wave 4 — Module 3.4: OOP in 3D — Composition (~18 folders)

**Dependency:** Wave 3 complete.

Pre-split 3.2 (39 lessons) — second half. Apply the rename map for rows from composition reading (`3-2-11a-reading-composition-3d`) through challenges: bulk-rename `3-2-` → `3-4-`. Multi-shape classes, parenting, Robot project.

- [ ] Second-half folders from pre-split 3.2 (composition reading + lifecycle + B0 parent + B1–B6 Robot build-ups + Custom 3D Character project + challenges) → `3-4-*`
- [ ] `curriculum/modules/3.4_oop-composition.md`

### Wave 5 — Module 3.5: Groups — Foundations (~18 folders)

**Dependency:** Wave 4 complete; Wave 0 Group + distance/intersects items verified.

Pre-split 3.3 (36 lessons) splits at the collectible-pattern reading. Rows from slides through safe-despawn lab: bulk-rename `3-3-` → `3-5-`. Group, distance, intersects, despawn pattern.

- [ ] First-half folders from pre-split 3.3 → `3-5-*`
- [ ] `curriculum/modules/3.5_groups-foundations.md`

### Wave 6 — Module 3.6: Groups — Collector Game (~18 folders)

**Dependency:** Wave 5 complete.

Pre-split 3.3 — second half. Rows from collectible-pattern reading (`3-3-13a`) through wave-spawn example: bulk-rename `3-3-` → `3-6-`. Collector Game project + mid-unit writeup.

- [ ] Second-half folders from pre-split 3.3 (collectible pattern + Groups Sandbox + Collector Game build-ups B1–B5 + Project + Writeup + Challenges + extra examples) → `3-6-*`
- [ ] `curriculum/modules/3.6_collector-game.md`

### Wave 7 — Module 3.7: Camera in 3D (~16 folders)

**Dependency:** Wave 6 complete; Wave 0 camera.follow + deltaTime items verified.

Pre-split 3.4 (33 lessons) splits at the time-based-motion reading. Camera-related rows + the deltaTime reading itself (`3-4-8a`): bulk-rename `3-4-` → `3-7-`. Position, lookAt, follow, orbit, precedence.

- [ ] Camera-half folders from pre-split 3.4 (rows through `3-4-12a-sandbox-camera` plus `3-4-8a-reading-deltatime`) → `3-7-*`
- [ ] `curriculum/modules/3.7_camera-in-3d.md`

### Wave 8 — Module 3.8: Animation & Walkable Scene (~17 folders)

**Dependency:** Wave 7 complete.

Pre-split 3.4 — second half. Rows from `3-4-8b-reading-timebased-motion` through animation-patterns video: bulk-rename `3-4-` → `3-8-`. Time-based motion, lerp, sin/cos paths, Walkable Scene project.

- [ ] Animation-half folders from pre-split 3.4 (time-based motion lab, lerp readings + lab, sin/cos paths, smooth-camera + cinematic-pan examples, B1–B5 Walkable Scene build-ups, Project, Challenges, extra example) → `3-8-*`
- [ ] `curriculum/modules/3.8_animation-walkable-scene.md`

### Wave 9 — Module 3.9: Lighting Foundations (~15 folders)

**Dependency:** Wave 8 complete; Wave 0 light controls verified.

Pre-split 3.5 (56 lessons) splits THREE ways. First chunk: "what is light", ambient + directional readings + labs, first sandbox. Bulk-rename targeted rows `3-5-` → `3-9-`.

- [ ] Lighting-foundations folders from pre-split 3.5 → `3-9-*`
- [ ] `curriculum/modules/3.9_lighting-foundations.md`

### Wave 10 — Module 3.10: Light Studio (~15 folders)

**Dependency:** Wave 9 complete.

Pre-split 3.5 — second chunk. Point + spot light readings + labs, light color, intensity, multi-light composition, three-point example, animated-light, Light Studio build-ups + project + challenges. Bulk-rename targeted rows `3-5-` → `3-10-`.

- [ ] Light-Studio folders from pre-split 3.5 → `3-10-*`
- [ ] `curriculum/modules/3.10_light-studio.md`

### Wave 11 — Module 3.11: Materials & Atmosphere (~26 folders)

**Dependency:** Wave 10 complete; Wave 0 material controls verified.

Pre-split 3.5 — third chunk. Materials readings (color, metalness, roughness, wireframe), Materials Showcase example, Mood-Lighting example, Mood Scene build-ups + project + challenges. Bulk-rename targeted rows `3-5-` → `3-11-`.

- [ ] Materials + Mood Scene folders from pre-split 3.5 → `3-11-*`
- [ ] `curriculum/modules/3.11_materials-atmosphere.md`

### Wave 12 — Module 3.12: 3D Platformer — Mechanics (~15 folders)

**Dependency:** Wave 11 complete; Wave 0 physics system + parenting + AABB collision verified.

Pre-split 3.6 (29 lessons) splits at the B3c→B4 boundary. Rows from slides through `3-6-b3c-lab-wasd-jump-integrated`: bulk-rename `3-6-` → `3-12-`. Physics readings, jump example, B1–B3c integration.

- [ ] Mechanics folders from pre-split 3.6 → `3-12-*`. Per-folder list (renumbered):
  - [ ] `lessons/3-12-1-slides/`
  - [ ] `lessons/3-12-2-bridge/`
  - [ ] `lessons/3-12-3-refresher-gamestates/`
  - [ ] `lessons/3-12-4a-reading-gravity/`
  - [ ] `lessons/3-12-4b-reading-vel-components/`
  - [ ] `lessons/3-12-4c-reading-onground/`
  - [ ] `lessons/3-12-4d-reading-usephysics/`
  - [ ] `lessons/3-12-5-example-jump-demo/`
  - [ ] `lessons/3-12-6a-lab-optin-physics/`
  - [ ] `lessons/3-12-6b-lab-gravity-tuning/`
  - [ ] `lessons/3-12-6c-lab-jump-impulse/`
  - [ ] `lessons/3-12-6d-lab-ground-check/`
  - [ ] `lessons/3-12-6e-sandbox-physics/`
  - [ ] `lessons/3-12-7-reading-platformer-arch/`
  - [ ] `lessons/3-12-b1-lab-player-physics/`
  - [ ] `lessons/3-12-b2-lab-platforms/`
  - [ ] `lessons/3-12-b3a-lab-wasd-only/`
  - [ ] `lessons/3-12-b3b-lab-jump-only/`
  - [ ] `lessons/3-12-b3c-lab-wasd-jump-integrated/`
- [ ] `curriculum/modules/3.12_platformer-mechanics.md`

### Wave 13 — Module 3.13: 3D Platformer — Build & Ship (Unit Final, ~14 folders)

**Dependency:** Wave 12 complete.

Pre-split 3.6 — second half. Rows from `3-6-b4-lab-coins` through final-sandbox. Bulk-rename `3-6-` → `3-13-`. Build-up labs renumber from B1 (was B4 pre-split). Final project + last AI-graded writeup + challenges.

- [ ] Build-Ship folders from pre-split 3.6 → `3-13-*`. Per-folder list (renumbered, build-ups re-sequence from B1):
  - [ ] `lessons/3-13-b1-lab-coins/` (was `3-6-b4`)
  - [ ] `lessons/3-13-b2-lab-win-condition/` (was `3-6-b5`)
  - [ ] `lessons/3-13-b3-lab-game-state/` (was `3-6-b6`)
  - [ ] `lessons/3-13-b4-lab-atmosphere/` (was `3-6-b7`)
  - [ ] `lessons/3-13-1-platformer/` (Project; was `3-6-8`)
  - [ ] `lessons/3-13-2-platformer-writeup/` (last writeup of unit; was `3-6-9`)
  - [ ] `lessons/3-13-3-challenges/` (was `3-6-10`)
  - [ ] `lessons/3-13-4-sandbox/` (was `3-6-11`)
- [ ] `curriculum/modules/3.13_platformer-build-ship.md`
  - [ ] `lessons/3-8-11-sandbox/`
- [ ] `curriculum/modules/3.8_platformer.md`

---

## Section 5: Open Questions / Risks

*(Resolved & dropped from v3: three.js CDN drift — handled by vendoring in Section 2.13. Reset button — refresh-to-reset, documented in description fields per Section 3 Legend. Capstone unlock single-vs-three-track — moot now that Module 3.6 is a single linear Platformer. Build-up cumulative state — pre-loaded prior B's solution per Section 3 Legend. Sandbox/example completion — auto-mark on iframe-load heartbeat per Section 3 Legend.)*

### 5.1 Performance Budget — Mobile Devices in Classrooms

**Risk: MEDIUM.** Three.js with MeshStandardMaterial + multiple PointLights is GPU-intensive. On Chromebook or older iPads, scenes with 50+ dynamic objects and 3 PointLights may drop below 30fps. Mitigation: cap default PointLight count to 4 in the shPlay docs (write it as a best practice); `_renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))` is already in shplay.js line ~210; verify Module 3.13 platformer hits ≥30fps on a mid-range Chromebook before Wave 13 ships. The opt-in physics loop adds a per-frame iteration — keep `_physicsObjects` < 20 shapes per sketch in lesson scaffolds.

### 5.2 Radians — Teach or Shim?

**Resolved.** Shim WITH the `radians(deg)` helper AND teach radians in one dedicated reading (3-1-006d). The helper is not hidden — it's introduced as the preferred beginner tool. Students who read the radian explanation can use raw `Math.PI/2` if they want. The Solar System project STEPs use `radians()` consistently (per the rigor critic's catch on the prior pedagogy mismatch).

### 5.3 AI-Help Quota with 6 Modules

**Status: Not a blocker.** The `ai_help_usage` table keys on `(student_email, unit, day)` where `unit` = `lesson.unit`. Each module has a distinct unit string (e.g. `"3.1 Foundations"`). Students get `AI_HELP_DAILY_LIMIT` (default 10) requests per module per day → up to 60/day across Unit 3. Matches Unit 2 behavior. The `lesson.unit` allowlist validator (Section 2.11d) prevents typos from creating phantom buckets.

### 5.4 Module 3.13 (Unit Final) Unlock Gate

**Recommendation: backend reject in `PUT /api/lesson-state` for `3-13-*` lesson IDs** when the calling student has not completed `3-11-N-mood-scene` (Module 3.11's Mood Scene project; final position N depends on the rename pass). Frontend hides 3.13 in the lesson list as polish. The backend gate prevents students who clear localStorage or craft direct API requests from skipping ahead. ~10 lines in the existing handler.

**Earlier-module gates (optional polish):** to enforce strict module-by-module progression, gate each module's first lesson on the previous module's project completion. Recommended only if classroom feedback shows students racing ahead and missing dependencies; otherwise the curriculum-page sort order is sufficient guidance.

### 5.5 Per-Frame Shape Spawn Footgun

**Document in shape readings.** Calling `new Cube(...)` (or any shape constructor) inside `draw()` without a `frameCount % N === 0` guard creates a new THREE.js mesh every frame — leaks WebGL resources within seconds. Add a callout box to `3-1-008a-reading-position` and the Module 3.3 Group readings: "Never call `new Cube(...)` inside `draw()` without a frame-counter guard."

### 5.6 WebGL Context Lifecycle on Fast Navigation

**Resolved by 2.11b dispose contract.** ShPlayPreview posts `dispose` to its iframe on unmount; `runner.html` listens and calls `renderer.dispose()` + `scene.clear()`. Frees the WebGL context immediately, avoiding Chrome's ~16-context cap when students click between lessons quickly. Verify in DevTools: `Get-Counter '\GPU Engine\* time'` style profiling on a mid-range Chromebook navigating 20 lessons in 2 minutes.

### 5.7 Touch-Only Devices (iPads without keyboards)

**Risk: LOW for current audience, defer.** Modules 3.3+ require WASD/Space input. If any deployed cohort uses iPad-only without a keyboard, those modules become unfinishable. Add a pre-Wave-1 audit of the school's hardware deployment; if iPad-only is in scope, plan a touch-button overlay in `runner.html` (4 directional buttons + jump button positioned over the canvas) for Wave 6.

### 5.8 Gradebook CSV Width

**Risk: LOW, operational.** Adding 240 columns to `/api/classes/[id]/gradebook` CSV export pushes a typical class export from ~50 KB to ~250 KB. Excel handles it. Google Sheets caps at 18,278 columns — fine. Verify the current exporter streams or buffers — no fix needed unless a school exports for a class of 100+ students simultaneously.

---

## Section 6: Files to Create / Modify Inventory

### Files to Modify

| File | Change | Estimate |
|------|--------|----------|
| `public/shplay/shplay.js` | Add Phase 0 items: Cone/Cylinder/Torus + Plane.size, random, radians/degrees, material props mixin, distance/intersects, Group + iterator + defensive remove, lights, camera precedence + orbit, deltaTime, AABB physics with isGround, parenting, dispose, banner comments | +~404 lines (236 → ~640) |
| `public/shplay/runner.html` | Update importmap to vendored three.js path; add `dispose` postMessage listener that calls `renderer.dispose()` + `scene.clear()` | +~10 lines |
| `public/shplay/sandbox.html` | Update importmap to vendored three.js path; add new sample sketches: shapes2, randomColors, collide, groupDemo, lights, materials, camera-follow, camera-orbit, physics-floor, physics-platforms, parenting | +~220 lines |
| `lib/types.ts` | Add `'shplay'` to preview union (line 82) | +1 char |
| `components/Q5PlayPreview.tsx` | Remove local `encodeCode` definition; import from `lib/encode-code` | −6 lines, +1 line |
| `components/LessonWorkspace.tsx` | Import ShPlayPreview; add `isShPlayMode`; sweep all `isQ5Mode` branches per Section 2.11c table; add `runShPlay()`; add `shplayCode`/`shplayRunKey` state; add shPlay branch in preview render | +~50 lines |
| `functions/api/ai-help.ts` | Add `lessonId`-prefix routing for `3-` → shplay-docs; add unit-string allowlist validator | +~25 lines |
| `functions/api/lesson-state/[lessonId].ts` (or wherever PUT handler lives) | Backend gate: reject `3-13-*` IDs (Unit Final) unless Module 3.11's Mood Scene project is completed (Section 5.4) | +~10 lines |

### New Files

| File | What it is |
|------|-----------|
| `public/shplay/vendor/three@0.180.0/three.module.js` | Vendored three.js (~600 KB binary; download once, commit, never depend on unpkg again) |
| `public/shplay/README.md` | Vendoring docs, upgrade path, importmap file locations |
| `lib/encode-code.ts` | Shared `encodeCode` helper extracted from Q5PlayPreview |
| `components/ShPlayPreview.tsx` | ShPlay iframe preview component; posts `dispose` on unmount |
| `lib/shplay-docs.ts` | In-app shPlay API reference: 13 `DocSection` entries + `findRelevantDocs()` |
| `curriculum/modules/3.1_coordinates-and-transforms.md` | Module manifest |
| `curriculum/modules/3.2_shapes-and-composition.md` | Module manifest |
| `curriculum/modules/3.3_oop-foundations.md` | Module manifest |
| `curriculum/modules/3.4_oop-composition.md` | Module manifest |
| `curriculum/modules/3.5_groups-foundations.md` | Module manifest |
| `curriculum/modules/3.6_collector-game.md` | Module manifest |
| `curriculum/modules/3.7_camera-in-3d.md` | Module manifest |
| `curriculum/modules/3.8_animation-walkable-scene.md` | Module manifest |
| `curriculum/modules/3.9_lighting-foundations.md` | Module manifest |
| `curriculum/modules/3.10_light-studio.md` | Module manifest |
| `curriculum/modules/3.11_materials-atmosphere.md` | Module manifest |
| `curriculum/modules/3.12_platformer-mechanics.md` | Module manifest |
| `curriculum/modules/3.13_platformer-build-ship.md` | Module manifest |
| `plans/lesson-numbering-convention.md` | Folder-naming convention + Unit 3 split rename map (companion file to this plan) |
| `lessons/3-0-sandbox/lesson.json` | Test lesson for pipeline validation (counted separately from the 240-folder unit total) |
| `lessons/3-0-sandbox/script.js` | Trivial shplay sketch |

### Lesson Folders (~240 total, 13 modules — Unit 3 only; excludes the `3-0-sandbox` test folder)

Modules sized to ~20 lessons each per the soft target. IDs use bare q5play-style numbering (no zero-padding) — `components/HeaderLessonNav.tsx:40` already handles natural numeric sort.

| Wave | Module (final) | Count | Source |
|------|----------------|-------|--------|
| 1 | 3.1 Coordinates & Transforms | ~22 | First half of pre-split 3.1 + new Spinning Sculpture project |
| 2 | 3.2 Shapes & Composition | ~25 | Second half of pre-split 3.1 (Solar System + shapes) |
| 3 | 3.3 OOP in 3D — Foundations | ~21 | First half of pre-split 3.2 (single-shape classes, methods) |
| 4 | 3.4 OOP in 3D — Composition | ~18 | Second half of pre-split 3.2 (parenting, Robot project) |
| 5 | 3.5 Groups — Foundations | ~18 | First half of pre-split 3.3 (Group, distance, despawn) |
| 6 | 3.6 Groups — Collector Game | ~18 | Second half of pre-split 3.3 (Collector Game project + mid-unit writeup) |
| 7 | 3.7 Camera in 3D | ~16 | Camera half of pre-split 3.4 (position, lookAt, follow, orbit) |
| 8 | 3.8 Animation & Walkable Scene | ~17 | Animation half of pre-split 3.4 (deltaTime, lerp, Walkable Scene) |
| 9 | 3.9 Lighting Foundations | ~15 | Lighting-foundations chunk of pre-split 3.5 (ambient + directional) |
| 10 | 3.10 Light Studio | ~15 | Light-Studio chunk of pre-split 3.5 (point, spot, project) |
| 11 | 3.11 Materials & Atmosphere | ~26 | Materials chunk of pre-split 3.5 (metalness, roughness, Mood Scene) |
| 12 | 3.12 3D Platformer — Mechanics | ~15 | First half of pre-split 3.6 (physics, jump, WASD integration) |
| 13 | 3.13 3D Platformer — Build & Ship (Unit Final) | ~14 | Second half of pre-split 3.6 (coins, win, Project, last writeup) |
| **Total** | | **~240** | No lessons removed by the splits |

**Bulk rename order before any folders are created** (per `plans/lesson-numbering-convention.md` Section 7, applied high-to-low to avoid prefix collisions):

1. Pre-split `3-6-*` lessons split TWO ways: rows for slides through B3c → `3-12-*`; rows for B4 through final-sandbox → `3-13-*`. Re-sequence positions.
2. Pre-split `3-5-*` lessons split THREE ways: lighting-foundations rows → `3-9-*`; light-studio rows → `3-10-*`; materials + Mood Scene rows → `3-11-*`. Re-sequence positions.
3. Pre-split `3-4-*` lessons split TWO ways: camera rows + `3-4-8a-reading-deltatime` → `3-7-*`; animation rows from `3-4-8b` onward → `3-8-*`. Re-sequence.
4. Pre-split `3-3-*` lessons split TWO ways: Groups foundations rows through safe-despawn → `3-5-*`; collectible-pattern reading onward → `3-6-*`. Re-sequence.
5. Pre-split `3-2-*` lessons split TWO ways: OOP foundations rows through procedural-vs-OOP example → `3-3-*`; composition reading onward + Robot → `3-4-*`. Re-sequence.
6. Pre-split `3-1-*` lessons split TWO ways: transforms-content stays at `3-1-*`; shapes + Solar System → `3-2-*`. Re-sequence.

**File contents by lesson category:**

| Category | Files in folder |
|----------|----------------|
| Graded lab / assignment / challenge | `lesson.json` + `script.js` + `solution.js` |
| Reading | `lesson.json` + `content.md` |
| Example (all modules) | `lesson.json` + `script.js` (finished runnable demo — no solution.js, no requirements) |
| Sandbox | `lesson.json` + `script.js` |
| Slides / video | `lesson.json` only |

### Auth / Middleware Changes

None. Students are already enrolled in classes. The session JWT and middleware at `functions/_middleware.ts` are unchanged. Unit 3 lessons use the same `lesson_state` and `commits` tables as Units 1–2.