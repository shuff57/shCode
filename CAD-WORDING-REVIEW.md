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
- ***Revolve:*** ***it turns with options the code cannot write yet*** · ***its angle is an expression*** · ***its sketch
  could not be read*** · ***it turns about an edge or an axis the code cannot name yet*** · ***it turns about an axis that is
  not X, Y or Z through the origin*** · ***it turns part way, from a plane the code cannot start a spin from yet*** · ***its
  profile lies on its axis*** · ***its profile is not on a plane through its axis*** · ***its profile is not one outline of
  straight lines or one circle, which is what spin() takes*** · ***its sketch is not square to the way it turns*** · and the
  shared ones (uses only some regions of its sketch; the part it cuts / joins is not in a variable of script.js).
- ***Torus, mirror, draft:*** ***its radius is an expression*** · ***its place is an expression*** · ***it mirrors more
  than one body, or features*** · ***it keeps the mirrored copy apart from the part, and reSHape's mirror joins them*** ·
  ***its plane is not one the code can name*** · ***its plane is not square to X, Y or Z*** · ***its plane is not at the end
  of the part nearer the origin, which is where reSHape's mirror puts it*** · ***it has no faces*** · ***its angle is an
  expression*** · ***it pulls along a direction the code cannot write yet (reSHape pulls along +X, +Y or +Z)*** · ***its
  neutral plane is not one the code can name*** · ***one of its faces could not be found on the model*** · ***it tilts some
  of the side walls, not one or all of them*** · ***the face it tilts has no name in reSHape Script***.
- *Patterns:* it repeats more than one body, or features · it repeats with options the code cannot write yet · its
  (second) count or spacing is an expression · it turns about an axis that is not Z through the origin · its count or
  angle is an expression.
- *Move and turn:* it moves more than one body · it moves / turns by an expression · **it copies the part, which the
  guarded build does not make yet** · **it turns about an axis that is not X, Y or Z
  through the origin** · **the box of its part could not be read**. (*It moves and turns at once* is gone: since
  2026-11-18 that is written as code.)
- *Hole tool:* ***it has a drill point*** · ***its counterbore is an expression*** · ***its countersink is an
  expression*** · ***it is a {kind} hole, which the code cannot write yet*** · ***its counterbore / countersink is on a face
  the code cannot cut it from yet*** · **its place could not be read** · **its depth is an
  expression** · **it is drilled to a point** · **it is not drilled along X, Y or Z** · **the part it drills is not in a
  variable of script.js** · **it stops part way and is drilled from a face the code cannot drill from yet**.
- *Any:* **it was made in the same go as another step, so where it is cannot be measured; make it on its own** · its part
  is not in a variable of script.js · SolidCraft's {tool} is not one of the code's words yet.

The ones in bold are new since your last look (2026-11-17/18); in bold italics, new on 2026-11-18 (counterbores and
countersinks are now written as code, so *it has a counterbore, countersink or thread* is gone).

## 4. Live sketch (components/CadSketchOverlay.tsx), all new

| # | Where | Text |
|---|---|---|
| 4.1 | button, not sketching | New sketch |
| 4.2 | bar while choosing | **New sketch** Click a flat face in the view, or a plane: [Top] [Front] [Side] [Cancel] |
| 4.3 | over the view while choosing | Click a flat face for the new sketch |
| 4.4 | notes | That face is curved; a sketch needs a flat face. · No face there. Click a flat face, or choose a plane. |
| 4.5 | sketch bar | **Sketch {name}** {top plane at 10} · grid {5} mm [Line] [Rectangle] [Centre rectangle] [Circle] [Arc] [Tangent arc] ***[Slot]*** [Polyline] [Polygon] [Mirror] [Pattern] [Offset] ***[Round]*** ***[Chamfer]*** [Trim] [Extend] [Select] ***[Delete]*** [Finish], opening a panel (named Finish the sketch for screen readers) with: depth [10] [one way / both ways / through (pocket)] [Extrude] [Pocket] [about its y axis / about its x axis] angle [360] [Revolve]; then [Done] |
| 4.6 | notes | Give a depth above 0. · Pocket needs the part the sketch is on, kept in a variable of script.js (Run first). |
| 4.7 | after a tool, drag or click | Added: {code} · Moved {[x, y]} to {[x, y]} · Inserted: {[x, y]} · ***Removed: {line}*** |
| 4.8 | readout by the pointer | {lid} ({top plane at 10}): {[x, y]} · {kind}, where kind is one of: corner, middle of an edge, centre of a face, end of a line, middle of a line, centre of a circle, centre of an arc, end of an arc, point of the sketch, origin of the sketch, grid {5} mm. With "· drag to move it" on a point that can be dragged; "Move {[x, y]} to {[x, y]}" while dragging; "{Tool}: " first while a tool is on. |
| 4.9 | readout, no sketch at the cursor | top plane, no sketch at the cursor: {[x, y]} |
| 4.9b | ***readout, Delete on*** | ***Delete: {line} · click to remove it*** · ***Delete: finding the line that drew it…*** |
| 4.9c | ***readout, a size typed*** | ***{Tool}: length {25} · Enter to put it at {[25, 0]}*** · ***width {30}, height {20}*** · ***{8} square*** · ***radius {7.5}*** · ***angle {90}°*** |
| 4.9d | ***dimensions on the curves*** | ***{25}*** (a length) · ***r {7.5}*** (a radius) · tooltip ***Click to type a new size*** · the box's label ***New size*** · after Enter ***Size changed to {7.5}*** |
| 4.9e | Round | readout: Round: Click a corner where two lines or arcs meet · Round: corner {[40, 25]} · click to round it · Round: radius {5} · click to round the corner (Enter in place of click when typed) · the sentences that change nothing: Only a corner where two lines or arcs meet can be rounded. · The two lines run straight on there: there is no corner to round. · They run on smoothly there: there is no corner to round. (a line or arc that meets another without a corner) · A radius of {30} does not fit between these lines; the largest is {20}. (between the line and the arc, between the two arcs when the corner has arcs) · Give a radius above 0. · That corner is written with a variable or a sum; change it in the code. · That corner is written with more than nine decimals; change it in the code. · Still finding the lines that drew that corner; try again in a moment. · after it is written: Rounded the corner at {[40, 25]}: {code} |
| 4.9f | Chamfer | as Round (4.9e), with: Chamfer: corner {[40, 25]} · click to chamfer it · Chamfer: distance {5} · click to chamfer the corner · Only a corner where two lines or arcs meet can be chamfered. · The two lines run straight on there: there is no corner to chamfer. · They run on smoothly there: there is no corner to chamfer. · A distance of {25} does not fit along these lines; the largest is {20}. (along the line and the arc, along the two arcs) · Give a distance above 0. · after it is written: Chamfered the corner at {[40, 25]}: {code} |
| 4.9g | Trim | readout: Trim: Click the piece of a line, arc or circle to cut away · Trim: click to cut away this piece of the {line} ({line}, {arc} or {circle}) · Trim: nothing crosses this {line}: click to remove it · the sentences that change nothing: Only a line, an arc or a circle can be trimmed. · That {line} is written with a variable or a sum; change it in the code. · That {line} is written with more than nine decimals; change it in the code. · Still finding the line that drew it; try again in a moment. · after it is written: Trimmed the {line}: {code} · Removed the {line} |
| 4.9h | angle dimensions | {60}° (at a corner where two lines meet) · tooltip Click to type a new angle · the box's label New angle · after Enter Angle changed to {60}° |
| 4.9i | Extend | readout: Extend: Click near the end of a line or arc to extend it · Extend: click to extend this {line} to {[45, 5]} ({line} or {arc}) · the sentences that change nothing: Nothing lies ahead of this end of the {line}. · Only a line or an arc can be extended. · That {line} is written with a variable or a sum; change it in the code. · That {line} is written with more than nine decimals; change it in the code. · Still finding the line that drew it; try again in a moment. · after it is written: Extended the {line}: {code} |
| 4.9j | Tangent arc | readout: Tangent arc: Click the free end of a line or arc to start the arc · Tangent arc: end {[40, 10]} · click to start the arc there · Tangent arc: radius {10} · click to end the arc at {[40, 30]} · the sentences that draw nothing: Two curves end there: click the free end of a line or arc. · Click the end of a line or arc. · That point is straight on from the end: no arc reaches it leaving that way. · after it is written: Added: {code} (4.7) |
| 4.9k | Mirror | readout: Mirror: Click the line to mirror about · Mirror: click to mirror about this line · Mirror: Click a line, arc or circle to mirror it · Mirror: click to mirror this {line} ({line}, {arc} or {circle}) · the sentences that write nothing: Only a line can be mirrored about. · Only a line, an arc or a circle can be mirrored. · This {line} is its own mirror image. · Its mirror image is drawn already. · after it is written: Added: {code} (4.7) |
| 4.9l | Offset | readout: Offset: Click a line, arc or circle to offset it, with the curves joined to it · Offset: click to offset this {line} ({line}, {arc} or {circle}) · Offset: click to offset this outline · Offset: click to offset these {3} joined curves · Offset: distance {5} · click to offset the {outline} (Enter in place of click when typed; {line}, {arc}, {circle}, {outline} or {curves}) · the sentences that write nothing: Only a line, an arc or a circle can be offset. · Give a distance above 0. · At {10} the offset runs into itself; give a smaller distance. · At {10} two of these curves no longer meet; give a smaller distance. · after it is written: Added: {code} (4.7) |
| 4.9m | snaps and guides | in the readout's kind (4.8): crossing of two curves · level with {[10, 35]} · upright from {[33.3, 6]} (both, joined by ·, where the two guides cross) |
| 4.9n | Polygon, Centre rectangle | in the bar while Polygon is on: sides [6] (its box labelled Sides) · in the bar when it is not 3 to 24: Give a number of sides from 3 to 24. · a typed size (4.9c): Polygon: radius {8} · Enter to put it at {[53, 20]} · Centre rectangle: width {10}, height {6} · after it is written: Added: {code} (4.7) |
| 4.9o | Pattern | in the bar while Pattern is on: a choice in a row / round a centre (labelled Pattern) · count [4] (its box labelled Count) · readout: Pattern: Click a line, arc or circle to pattern it, with the curves joined to it · Pattern: click to pattern this {circle} ({line}, {arc}, {circle}, {outline}; these {3} joined curves) · Pattern: {4} in a row, {10} apart · click to put them there · Pattern: {4} round {[50, 20]}, every {90}° · click to put them there · the sentences that write nothing: Only a line, an arc or a circle can be patterned. · Give a count from 2 to 50. · Click where the first copy goes, away from where it is now. · Every copy is drawn already. · after it is written: Added: {code} (4.7) |
| 4.9p | Select, Move, Copy | in the bar once curves are chosen: {5} chosen [Move] [Copy] · readout: Select: Drag a box round curves to choose them, or click a curve · Select: click to choose this {line} / click to leave out this {line} · Select: {5} chosen · Move or Copy in the bar, or drag a box to choose again · Select: Click the point to {move} them from: {[5, 5]} · Select: {move} them by {[5, 15]} · click to put them there (Enter when typed) · {0,} · type how far across and up, as dx, dy · the sentences that change nothing: That curve is written with a variable or a sum; change it in the code. · Choose a curve first. · Click where they go, away from where they are. · Still finding the lines that drew them; try again in a moment. · after: Moved by {[5, 15]} · a copy: Added: {code} (4.7) |
| 4.9q | one way, both ways, through | the choice beside the depth, labelled Way: one way · both ways · through (pocket) · in the bar for Extrude with through: Only a pocket goes through; for Extrude choose one way or both ways. |
| 4.9r | Revolve | in the bar: the choice labelled Axis: about its y axis · about its x axis · angle [360] (labelled Angle) · [Revolve] · the sentences in the bar that write nothing: Give an angle from 1 to 360 degrees. · Revolve takes one closed outline of straight lines, or one circle. · It turns only about X, Y or Z through the origin: draw it on a plane through the origin. · From this plane only a whole turn can be written: give 360. · The profile lies on the axis it turns about. · The profile crosses the axis it turns about. · For part of a turn, draw the profile on the positive side of the axis. · after: Added: {code} (4.7) |
| 4.10 | plane names in the readout and bar | top plane · front plane · side plane · {top} plane at {10} · a slanted plane |

Approved by the owner as written, 2026-11-20: 4.9e (Round), 4.9f (Chamfer), 4.9g (Trim), 4.9h (angle dimensions), 4.9i (Extend), 4.9j (Tangent arc), 4.9k (Mirror), 4.9l (Offset), 4.9m (snaps and guides), 4.9n (Polygon, Centre rectangle), 4.9o (Pattern), 4.9p (Select, Move, Copy), 4.9q (one way, both ways, through), 4.9r (Revolve), and in 4.5 [Trim], [Extend], [Tangent arc], [Mirror], [Offset], [Centre rectangle], [Polygon], [Pattern], [Select], the way choice, the axis choice, angle and [Revolve], and [Finish] with its panel's name.

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
