# JSCAD Challenges

Challenge ideas written against the real `@jscad/modeling` API (v2.13.0) and
the course's Q3–Q4 progression. Each challenge has:

- **Concepts** — the API surface it exercises
- **Goal** — a verifiable success condition
- **Stretch** — optional extension

Difficulty scales top to bottom.

---

## Tier 1 — First shapes

### 1. First Cube
**Concepts:** `require`, `main()`, `module.exports`, `primitives.cube`
**Goal:** A program that returns a single cube. Change its `size` and confirm
the model updates.
**Stretch:** Return an array of three cubes of different sizes.

### 2. Shape Zoo
**Concepts:** `primitives` (sphere, cylinder, torus, cuboid)
**Goal:** Return at least 4 different 3D primitives in one scene, each with
different dimensions.
**Stretch:** Add a comment above each shape explaining what it is.

### 3. Flat Shapes
**Concepts:** `circle`, `rectangle`, `polygon`, `star`
**Goal:** Build a 2D scene with at least 3 different 2D primitives. Orbit the
viewport to see them edge-on.
**Stretch:** Use `polygon` to draw a hexagon by computing its corner points
with `cos`/`sin`.

---

## Tier 2 — Position and combine

### 4. Stacked Tower
**Concepts:** `transforms.translate`, 3D coordinates
**Goal:** Stack 4 shapes vertically (a base, two middle parts, a cap) so they
touch but don't overlap.
**Stretch:** Make the tower a parameterized function: `tower(height)`.

### 5. Tilted Shapes
**Concepts:** `rotate`, `rotateZ`, radians
**Goal:** A 2D design with at least two shapes rotated at different angles
(one at exactly 45° = `Math.PI / 4`).
**Stretch:** Build a pinwheel of 8 blades using a loop and `rotateZ`.

### 6. Plate with Holes
**Concepts:** `booleans.subtract`, `cylinder`
**Goal:** A rectangular plate with 4 bolt holes, one in each corner.
**Stretch:** Add a center hole with a different radius, and a slot cut with a
translated cuboid.

### 7. Merged Robot
**Concepts:** `booleans.union`, `translate`
**Goal:** A robot figure (body, head, arms) built from at least 5 primitives,
all unioned into one solid.
**Stretch:** Make the arms from hulled capsules instead of boxes.

---

## Tier 3 — 2D to 3D

### 8. Extruded Logo
**Concepts:** `extrudeLinear`, 2D primitives
**Goal:** Design a 2D profile (your initials, a shape, a symbol) and extrude
it into a 3D solid with a height parameter.
**Stretch:** Cut a hole through the extruded part with `subtract`.

### 9. Vase Profile
**Concepts:** `extrudeRotate`, `polygon`
**Goal:** A rotationally symmetric vase or bowl from a hand-drawn profile
polygon.
**Stretch:** Add a `segments` parameter and compare the smoothness at 16 vs 64.

### 10. Spring
**Concepts:** `extrudeHelical`
**Goal:** A spring with at least 3 full turns.
**Stretch:** Vary the profile radius along the spring using
`extrudeFromSlices`.

---

## Tier 4 — Organic and measured

### 11. Capsule Chain
**Concepts:** `hull`, `hullChain`
**Goal:** A smooth capsule from two hulled circles, and a 5-bead chain from
`hullChain`.
**Stretch:** Build a 3D organic form by hulling spheres of different sizes.

### 12. Measurement Report
**Concepts:** `measureVolume`, `measureDimensions`, `measureBoundingBox`
**Goal:** A program that logs volume, dimensions, and bounding box for a
design, then returns it.
**Stretch:** Add a printability check: warn in the console if any dimension
exceeds 200 units.

---

## Tier 5 — Parametric and patterned

### 13. Parameterized Plate
**Concepts:** `getParameterDefinitions`, number + checkbox params
**Goal:** A plate with a size slider and a checkbox that toggles a center
hole.
**Stretch:** Add a choice dropdown that switches between 3 hole shapes.

### 14. Pattern Grid
**Concepts:** loops, arrays, `translate`
**Goal:** A 3×3 grid of shapes generated with nested loops, spacing controlled
by a variable.
**Stretch:** Make the shape size vary by position (bigger toward the center).

### 15. Nameplate
**Concepts:** `vectorText`, `extrudeLinear`, `colorize`, parameters
**Goal:** A nameplate with your name extruded in 3D text, at least 2 colors,
and parameters for text size and depth.
**Stretch:** Add a border frame around the text using `hull` or `union`.

---

## Notes on progression

- Tiers 1–2 cover everything needed for the first print milestone (A24).
- Tier 3 is the 2D→3D bridge — the biggest conceptual jump.
- Tier 4 adds organic forms and programmatic verification.
- Tier 5 combines everything: parameters, patterns, text, and color.

A reasonable pacing: one challenge per class period for tiers 1–3, two
periods per tier-4 challenge, a full week for each capstone.
