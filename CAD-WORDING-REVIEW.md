# CAD studio: wording for the owner (2026-11-18)

Every sentence or label a student sees in the code-first CAD studio that I wrote, not you. The guarded build's refusal
sentences (reshape-cad's layer) are not here; they are already yours. Mark each one OK, or write the words you want; I
change the code to match.

`file:line` is where the text is. `{…}` is filled in at run time.

## 1. The toolbar and the hint line (components/SolidCraftCodeStudio.tsx)

| # | Where | Text |
|---|---|---|
| 1.1 | switch | Points |
| 1.2 | its tooltip, :530 | Show the [x, y] under the pointer on the plane of the sketch your cursor is in. Click to put the point in your code. |
| 1.3 | switch | Live sketch |
| 1.4 | its tooltip, :531 | With your cursor in a sketch's lines, the view turns to its plane, with a grid and sketch tools. |
| 1.5 | hint, Points on | Points: the pointer shows `[x, y]` on the sketch your cursor is in. Click to put the point at your cursor. |
| 1.6 | hint, otherwise | In `sketch()`, `fillet()` or `part.edge()`, choose from the list, or click a face, edge or plane label in the view. |
| 1.7 | a refusal's line link, :537 | {script.js line 7}, tooltip "Show this line" |
| 1.8 | after a pick fills the code | Filled in: {code} · Inserted: {code} · {name} does not go in these brackets. · {name} has no name in reSHape Script. |

## 2. Run status (components/SolidCraftCodeStudio.tsx)

| # | Text |
|---|---|
| 2.1 | Ready · Running your code… · Building in SolidCraft… |
| 2.2 | Your files do not fit together yet. Fix the line shown, then Run. |
| 2.3 | Your code stopped before building. Fix the line shown, then Run. |
| 2.4 | Run rebuilds the model from your code. Changes made with SolidCraft’s tools since the last Run are not in your code, so they will be replaced. Continue? (a confirm box) |
| 2.5 | Run cancelled. The model on screen is kept. · The build did not finish. Run again. · Nothing was built. |
| 2.6 | Built {N} steps in {t} s · Built {k} of {N} steps in {t} s · …, only the changed steps rebuilt · …, nothing new to build |
| 2.7 | Code changed · Run to rebuild |

## 3. Steps made with SolidCraft's tools, written as code (SolidCraftCodeStudio.tsx :463–485)

| # | Text |
|---|---|
| 3.1 | Added to script.js: {n} line(s) for {steps}. The part built from the code is the one you made. |
| 3.2 | Added to script.js: {n} line(s) for {sketches}. The part is rebuilt from the code when a step uses the sketch. |
| 3.3 | Added to script.js for {steps}, but the part built from the code is not quite the one you made (volume {a} against {b} mm³). Check the new lines; History has your code from before. |
| 3.4 | The code written for {steps} did not build as it is. Check the new lines at the end of script.js and the message above; History has your code from before. |
| 3.5 | {reason below} It stays on screen until the next Run replaces it with what your code makes. (+ button "Undo in SolidCraft") |
| 3.6 | A step was removed with SolidCraft’s tools. Your code still makes it: Run puts it back, or delete its line from your code. |
| 3.7 | A step was changed with SolidCraft’s tools. Change it in your code instead: Run puts back what your code makes. |
| 3.8 | This computer could not keep a copy in History, so the steps were not added to your code. |

**The reasons (lib/solidcraft-ui-to-code.ts)**, each shown as "{Step} (made in SolidCraft) cannot be written as code: {reason}.":
- *Sketches:* its plane could not be read · its plane's axes are not square to each other · it has construction lines,
  which the code cannot draw yet · it has a {kind}, which the code cannot draw yet.
- *Extrude and cut:* its sketch is not in the code · it uses only some regions of its sketch · it has extent options the
  code cannot write yet · its distance is an expression · it goes both ways by a distance the code cannot write yet ·
  it cuts through everything both ways · it is extruded through everything · the part it cuts / joins is not in a
  variable of script.js · its operation is {op}.
- *Round, bevel, hollow:* it has no edges · it has options the code cannot write yet · its size is an expression · one of
  its edges has no name in reSHape Script (it is not where two named faces meet) · one of its edges could not be found on
  the model · one of its edges is not given by a point · its wall goes outside · it opens more than one face · its wall
  is an expression · the face it opens has no name in reSHape Script.
- *Shapes and joins:* it is placed by distances from edges · its radius / height is an expression · it does not stand
  along Z · it has a flat top, and reSHape's cone is pointed · it keeps its tools or makes a component · its bodies are
  not named · one of its parts is not in a variable of script.js.
- *Patterns:* it repeats more than one body, or features · it repeats with options the code cannot write yet · its
  (second) count or spacing is an expression · it turns about an axis that is not Z through the origin · its count or
  angle is an expression.
- *Move and turn:* it moves more than one body · it moves / turns by an expression · **it copies the part, which the
  guarded build does not make yet** · **it moves and turns at once** · **it turns about an axis that is not X, Y or Z
  through the origin** · **the box of its part could not be read**.
- *Hole tool:* **it has a counterbore, countersink or thread** · **its place could not be read** · **its depth is an
  expression** · **it is drilled to a point** · **it is not drilled along X, Y or Z** · **the part it drills is not in a
  variable of script.js** · **it stops part way and is drilled from a face the code cannot drill from yet**.
- *Any:* **it was made in the same go as another step, so where it is cannot be measured; make it on its own** · its part
  is not in a variable of script.js · SolidCraft's {tool} is not one of the code's words yet.

The ones in bold are new since your last look (2026-11-17/18).

## 4. Live sketch (components/CadSketchOverlay.tsx), all new

| # | Where | Text |
|---|---|---|
| 4.1 | button, not sketching | New sketch |
| 4.2 | bar while choosing | **New sketch** Click a flat face in the view, or a plane: [Top] [Front] [Side] [Cancel] |
| 4.3 | over the view while choosing | Click a flat face for the new sketch |
| 4.4 | notes | That face is curved; a sketch needs a flat face. · No face there. Click a flat face, or choose a plane. |
| 4.5 | sketch bar | **Sketch {name}** {top plane at 10} · grid {5} mm [Line] [Rectangle] [Circle] [Arc] [Polyline] depth [10] [Extrude] [Pocket] [Done] |
| 4.6 | notes | Give a depth above 0. · Pocket needs the part the sketch is on, kept in a variable of script.js (Run first). |
| 4.7 | after a tool, drag or click | Added: {code} · Moved {[x, y]} to {[x, y]} · Inserted: {[x, y]} |
| 4.8 | readout by the pointer | {lid} ({top plane at 10}): {[x, y]} · {kind}, where kind is one of: corner, middle of an edge, centre of a face, end of a line, middle of a line, centre of a circle, centre of an arc, end of an arc, point of the sketch, origin of the sketch, grid {5} mm. With "· drag to move it" on a point that can be dragged; "Move {[x, y]} to {[x, y]}" while dragging; "{Tool}: " first while a tool is on. |
| 4.9 | readout, no sketch at the cursor | top plane, no sketch at the cursor: {[x, y]} |
| 4.10 | plane names in the readout and bar | top plane · front plane · side plane · {top} plane at {10} · a slanted plane |

## 5. reshape-cad's sketch-only view (packages/solidcraft-host/pane/src/sketch-only.mjs, pane.js; only behind ?sketch-only=1)

Written by another session; I committed it. shCode's 2D sketch lessons already show these.

| # | Text |
|---|---|
| 5.1 | This lesson accepts one flat 2D sketch only. |
| 5.2 | The sketch cannot be drawn: {sentences} |
| 5.3 | This lesson accepts sketch commands only. |
| 5.4 | The sketch was not accepted: {error}. |
| 5.5 | Sketch updated (the status line) · drawn as a flat sketch (the step's row) |
| 5.6 | This host is not a sketch-only view. (an error to the page, not usually seen) |
