# SPEC — show constraints on the canvas, and name the ones that disagree

Repo root, absolute: `C:/Users/shuff/Documents/GitHub/shCode`

**If any path in this spec does not exist, STOP and say so rather than guessing.**

## Why

Measured against Onshape 2026-08-29, driving its real UI. Two gaps:

1. **Onshape draws a glyph on the geometry** next to every constrained entity
   (`=`, `∥`, `⊥`, `—`, `|`). Our Rules panel keeps 100% of that state in a
   side table, so a student looking at their shape cannot see which edges are
   related to which.
2. **When rules conflict, Onshape says which.** It shows a banner reading
   "Sketch could not be solved", turns the geometry red, and red-boxes exactly
   the offending glyphs — leaving innocent ones white. We print `off by 3.2`
   (a residual, meaningless to a 14-year-old) and "remove one to settle it",
   naming nothing.

The solver half is already done and committed (`6dc62e7`). Do not redo it.

## The data you have

`lib/sketch-solve.ts` now exports:

```ts
export function residualsOf(pts: Point[], constraints: Constraint[]): number[]
```

One residual per constraint, same order, every entry a distance. `> 1e-3`
means that constraint is not satisfied — that is the flag. `residualOf` is the
max of it. **Do not edit `lib/sketch-solve.ts`.**

## Task 1 — `components/model/SketchConstraints.tsx`

Read the file in full first (367 lines).

### 1a. Mark the disagreeing rules

Compute `residualsOf(points, constraints)` once per render, alongside the
existing `residualOf` call. A constraint whose residual exceeds `1e-3` is *in
conflict*.

Give every control that represents a constraint a conflict state when its
constraint is flagged:

- the Across (`↔`) and Up (`↕`) buttons
- the Length box
- the pair-grid cells
- the pin buttons are exempt — a `lock` always reports 0

Conflict styling: red border `#ff5555` and red text; a set cell keeps its
purple background but takes the red border, so "this rule is on" and "this
rule is losing" read as two different facts. Add a `title` on a conflicting
control saying it disagrees with another rule.

### 1b. Replace the residual number with a sentence

Current header shows `off by {residual.toFixed(1)}` and the note reads
"These rules disagree — the shape is as close as it can get to all of them.
Remove one to settle it."

Replace with wording built from the actual conflict set, using
`describe(c)` (already exported from `lib/sketch-solve.ts`) to name each one:

- header badge: `these rules disagree` (no number)
- note: name them, e.g.
  `These rules cannot all be true: edge 1 across, edge 1 = 10. The shape is as
  close as it can get. Remove one to settle it.`
- if the conflict set is somehow empty while the residual is over tolerance,
  fall back to the existing generic sentence rather than printing an empty list.

Keep the number **only** in a `title` tooltip on the badge, for a teacher.

## Task 2 — glyphs on the canvas

### 2a. `components/SandboxWorkspace.tsx`

At the `SketchOutline` build site (~line 378, inside the `outlines` useMemo),
add the feature's constraints to the object:

```ts
constraints: f.constraints ?? [],
```

Nothing else in this file changes.

### 2b. `components/model/HandleOverlay.tsx`

Read the file in full first (409 lines).

Add to the `SketchOutline` interface:

```ts
  /** The sketch's constraints, so the overlay can mark which edges carry one.
   *  Plain data like everything else here -- the overlay never writes them. */
  constraints?: Constraint[];
```

(import the type from `../../lib/sketch-solve`)

Then, inside the existing `<svg className="sketch-lines">` block that draws the
polygon (~line 246), also render one small glyph per constrained DESIGN edge.

**Positioning.** Do NOT use `projectOutline` — that returns the derived
outline, and constraints are on design edges. Each design corner `i` has a
projected anchor at `at.get(o.corners[i])`. So design edge `e` runs between
corners `e` and `(e + 1) % o.corners.length`, and the glyph goes at the
midpoint of those two anchors' `{x, y}`, offset ~10px perpendicular to the edge
so it does not sit on the line. If either anchor is missing from `at`, skip
that glyph — the same way `projectOutline` returns null when an anchor is not
on screen yet.

**Which glyph.** One per constraint that names an edge:

| kind | glyph |
| --- | --- |
| `horizontal` | `—` |
| `vertical` | `\|` |
| `length` | `↔` |
| `equal` | `=` |
| `parallel` | `∥` |
| `perpendicular` | `⊥` |

`lock` is a corner, not an edge — draw it at that corner's anchor if it is
cheap, otherwise skip it and say so in your reply. For `equal`/`parallel`/
`perpendicular`, draw the glyph on **both** edges named by the constraint —
that is what makes the pairing visible, and it is the whole point of the task.

If one edge carries several constraints, lay the glyphs out side by side rather
than overlapping.

**Styling.** Small (about 9-10px), same Dracula palette as the panel: `#6272a4`
on a `#282a36` chip with slight padding so it stays readable over the outline.
Use `<text>` inside the existing SVG. Keep `aria-hidden` — the panel is the
accessible surface for this information, the canvas is a visual echo.

## Out of scope — do not touch

- `lib/sketch-solve.ts` — done and committed.
- `scripts/sketch-solve-assertions.cjs` — the gate. Not yours to edit.
- `scripts/check-constraint-ui.mjs` — also a gate.
- The pair-grid cycle logic, the Round/Chamfer rows, the pin row.
- Making canvas glyphs clickable. They are display only. A later task.

## Verification — paste the ACTUAL output

```
cd C:/Users/shuff/Documents/GitHub/shCode
npx tsc --noEmit          # must be clean
npm test                  # must exit 0
```

Both gates above are in `npm test` and must still pass.

Plus a **hand-trace in your reply**: for a 4-edge sketch carrying
`{kind:'parallel', edge:0, other:2}`, state (a) which design corners the two
glyphs sit between, (b) what happens if `at` has no anchor for corner 2, and
(c) what the panel renders when `residualsOf` returns `[0.004]` for that one
constraint.

## Reply with

- The verification output, verbatim.
- The hand-trace.
- **One unpinned design decision** you had to make, and which way you went.
- Anything you could NOT check. You have no browser — say so plainly rather
  than implying the visuals were confirmed.
