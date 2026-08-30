# Onshape sketch constraints — interaction flow, and where ours differs

Captured 2026-08-29 driving the real Onshape UI (`scratch-constraint-parity`,
since trashed). Evidence: `.gauntlet/onshape-capture/*.png`; the 10m31s screen
recording is `~/Documents/onshape-reference/onshape-constraints.webm` (21 MB,
too big to track here).

This file is the *flow* record. `parity-sketch.json` is the *vocabulary* record
(which Onshape tool maps to which of ours); it does not describe interaction.

## Onshape's model: select entities, then apply a verb

1. Open sketch on a plane. **Show constraints** is a checkbox in the sketch
   dialog and is **checked** in every captured frame (`sketch-open.png`
   onward). Whether that is the shipped default or something the session
   toggled is NOT established — do not cite it as a default.
2. Click one entity, shift-click a second. Selection turns orange; the
   right-click menu counts them ("Delete 2 sketch entities"), and the status
   bar reads a live measurement ("Length: 96.158 mm"). `selected-two.png`
3. Apply from the constraint flyout, or by single key. `constraint-flyout.png`
   is the full list with shortcuts:

   | Constraint | Key | | Constraint | Key |
   |---|---|---|---|---|
   | Coincident | `i` | | Perpendicular | `shift l` |
   | Concentric | `shift o` | | Equal | `e` |
   | Parallel | `b` | | Midpoint | `shift m` |
   | Tangent | `t` | | Normal | `shift k` |
   | Horizontal | `h` | | Pierce | `shift g` |
   | Vertical | `v` | | Symmetric | `shift q` |

   Note `b` for Parallel and `shift l` for Perpendicular — not the mnemonic
   letters you would guess.
4. Geometry snaps to satisfy the constraint and a glyph tile appears near the
   line. `after-parallel.png`, `after-equal.png`

## What Onshape does when the rules conflict

`overconstrained.png`, and `onsh_conflict_zoom.png` for the detail:

- A dismissible banner over the canvas: **"⚠ Sketch could not be solved."**
  Amber triangle, plain language, an × to close.
- **The geometry itself turns red.** Both lines go from blue to red.
- The feature-tree entry (`Sketch 1`) turns red, and `Features` takes a red
  error badge.
- Glyph tiles sit **side by side** below the line, and are coloured
  **individually**: on the top line the `—` (Horizontal) tile is RED while the
  `=` (Equal) tile beside it stays WHITE. Only the constraints that actually
  lose are marked.

That last point is the subtle one and is worth protecting: a satisfied
constraint sitting next to a losing one must not be painted as failing.

## Where ours matches

| | Onshape | reSHape |
| --- | --- | --- |
| glyph tiles at the edge, laid out side by side | yes | yes |
| **per-glyph** colouring, satisfied stays neutral | yes | yes — `HandleOverlay.tsx:370` |
| plain-language sentence, no solver jargon | "Sketch could not be solved." | names the rules: "These rules cannot all be true: edge 1 = edge 3." |
| marks only the offending rules in the panel | n/a (no panel) | 1 of 18 controls in the measured case |

Ours says *which* rules disagree; Onshape only says that some do. That is a
deliberate divergence in our favour for a beginner audience — keep it.

## Where ours differs, and whether that is a defect

1. **Geometry does not turn red.** Onshape's loudest conflict signal. A
   student looking at the shape rather than the panel currently sees only two
   small chips. *Gap. Cheap to close.*
2. **No banner over the canvas.** Our message lives in the side panel only. If
   the panel is scrolled or narrow the conflict is silent. *Gap.*
3. **The `Sketch 1` chip is not marked.** Onshape reddens the tree entry.
   *Minor; our tree is one chip, not a tree.*
4. **Interaction model is different by design.** Onshape is select-then-verb
   with hidden single-key shortcuts; ours is a lower-triangular grid where
   every legal pair is a visible cell. Select-then-verb is faster once you
   know the verbs exist and undiscoverable before then. *Not a defect —
   revisit only if the grid stops scaling past ~6 edges.*

## Open question the capture does not settle

Onshape draws pair constraints (Equal, Parallel) as one tile near **one** of
the two entities in these frames — top line carries `—` + `=`, bottom carries
`\` + `|`. We draw a pair glyph on **both** edges, which is what makes the
pairing visible. Whether Onshape also does this and the second tile is simply
out of frame is not resolved by any captured still. Re-check before citing
Onshape as precedent for either choice.

## Not captured

Dragging geometry against a constraint; removing a constraint by clicking its
glyph (ours are display-only by design); dimensions/angles; anything involving
arcs.
