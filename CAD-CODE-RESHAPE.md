# Code-first CAD on reSHape Script (2026-11-17)

The code-first CAD workspace (`/sandbox/cad/`, `components/SolidCraftCodeStudio.tsx`) runs the student's
files as reSHape Script through the guarded host page (`vendor/solidcraft-preview`, from reshape-cad's
`packages/solidcraft-host`). Nothing reaches SolidCraft except through that path, so a step the engine
cannot build correctly is refused in a sentence beside what did build. The earlier "CAD words" layer,
which sent commands straight to SolidCraft with no guard, is retired.

## How a Run goes

1. `bundleProject()` (`lib/solidcraft-code.ts`) joins the files script.js imports into one script. Each
   imported file becomes a function returning its exports; every file keeps its own line numbers, and
   `locations` maps lines back to files.
2. The host's opaque runner evaluates it (`__host.evaluate`). A script error is shown with its file and line.
3. The same runner evaluates it once more with a closing line that reports which variable holds which part
   (`withVariableProbe`): the guarded build names a part `b_<step>` (b_pull1), a sketch `sk_<step>_0`.
   Nothing is built by this run. The labels, picks and lists name parts by these variables.
4. `__host.setScript` + `__host.runUnconfirmed()`: the guarded build. Refused steps are listed above the code.

## Run builds only what changed

The host page is opened with `keep=on&inc=on`. `keep=on` is new, in shCode's vendored copy only (`vendor/solidcraft-preview/pane/pane.js` `memoForRun`, `src/reply-memory.mjs` `size`); `inc=on` is reshape-cad's existing switch.

- **What it does.** The host's memory of engine replies is kept from one Run to the next.
  - Every step is still translated and every guard still runs.
  - Only command lists the engine has not answered before reach the engine, run on top of what SolidCraft holds.
- **Why it is safe.**
  - A reply depends on its command list alone, so memory never answers a list it has not seen.
  - What SolidCraft holds is trusted only if its document revision is unchanged since the last Run and the engine has not stopped. Anything else drops it: SolidCraft's tools, undo, a reload, or a Run that did not finish.
  - The final rebuild of the view is never answered from memory. It is skipped only when a fresh reading of SolidCraft matches.
- **Measured on the host page** (the same 3 scripts with the default settings, then with `keep=on`):

  | Run | Default | `keep=on` |
  |---|---|---|
  | add a round | 880 ms, 6 engine runs | 648 ms, 2 engine runs |
  | add a pocket | 3263 ms, 10 engine runs | 2500 ms, 4 engine runs |
  | same code again | 3177 ms, 10 engine runs | 457 ms, 0 engine runs |

  The volumes are identical to the last digit.
- **What the status line says.** It gives the time of each Run, and adds "only the changed steps rebuilt" or "nothing new to build".
- reshape-cad's own pane still keeps its memory for one run only. Bringing `keep=on` there is the owner's call.

## The words, then and now

| Was (CAD words, unguarded) | Now (reSHape Script) |
|---|---|
| `sketch('XY' / 'XZ' / 'YZ')` | `sketch('top' / 'front' / 'side')` |
| `sketch(part.face('top'))` | `sketch('top', 10)`: the plane through the face (click or list fills it) |
| `sk.rectangle([x0,y0],[x1,y1])`, `sk.line`, `sk.arc(a, through, b)` | same rectangle and line; `sk.arc(centre, from, to, 'ccw')`; `sk.lines([...])` |
| `sk.circle([x,y], r)` | `sk.circle([x,y], { r })` |
| `extrude(sk, h, { direction })` | `extrude(sk, h, { reversed, midplane })` |
| `cut(sk, depth)` (a pocket) | `pocket(sk, part, depth)` / `{ through: true }`; reSHape's `cut` is subtract |
| `cuboid(l, w, h)` at the origin corner | `cuboid(w, d, h, { at })` centred on `at` |
| `cylinder(r, h)`, `sphere(r)`, `cone(r, h, { topRadius })` | `cylinder(d, h)`, `sphere(d)`, `cone(d, h)` (pointed only), by diameter, centred |
| `shell(part, t, { open: part.face('top') })` | `shell(part, { wall: t, open: 'top' })` |
| `hole(face, { diameter, depth })` | `hole(part, { across, deep, at: [u, v], along: 'z' })` |
| `mirror(part, 'YZ')` | `mirror(part, 'left-right')` |
| `linearPattern(part, dir, n, s)` / `polarPattern(part, 'Z', n)` | `linearPattern(part, { count, step })` / `polarPattern(part, { count })` |
| `translate`, `rotate` | `move`, `turn` |
| `part.edges('top')`, `faceAt`, `edgeAt`, `body('Body1')`, `command(...)` | none (see gaps) |

## Gaps (each needs an owner decision; none is built around)

1. **Official names for move and turn.** reSHape's VOCABULARY has `move`/`turn`, not `translate`/`rotate`.
   Adding them touches VOCABULARY (AGENTS.md: editing it rejects the slice).
2. **Sentences use reSHape's own step names.** A refusal says "round1 (hollow)" when the code says
   `fillet`/`shell`; an error says "hollow does not know the face". The wording is the owner's.
3. **Done 2026-11-17: the lists leave out edges reSHape would refuse.** After each Run the studio asks reSHape for its
   name for every labelled edge (one evaluation, nothing built: `withEdgeNameProbe`). The host page's own resolver then
   checks each name against the design that Run built (`__host.checkNames` in the vendored `pane.js`, with `resolveAfter`
   and the G-STALE preflight `staleConsumers`). It answers only from that Run's kept engine replies, or by reading the part
   SolidCraft holds when its document is unchanged; nothing is run. An edge it cannot answer for stays in the list.
   - Two rules come out of this. A round needs its edge to be whole on the part as built: a round on top/front shortens
     top/left. And no round is allowed on a part that a pocket has cut, unless the pocket's result is kept under a name.
   - The starter has a pocket, so its `fillet(part.edge(` list is empty: the build refuses every one of them.
   - Clicking an edge in the view still fills it in, and the build still refuses it with its sentence.
   - Checked against real builds (`/tmp/cad-drive/edges-e2e.py`, 4 scripts × 12 box edges): every listed edge is rounded
     by the build, and every edge the build takes is listed.
4. **Sketch on a face object** (`sketch(part.face('top'))`) is not in reSHape; the plane form
   (`'top', 10`) covers flat faces square to an axis only.
5. **No unnamed faces or edges** (`faceAt`/`edgeAt`), **no `edges(face)`**, **no frustum cone**.
6. **`revolve` takes one plain `rect()`** sketch: a friendly `rectangle()` is refused.
7. **Tools → code, 2026-11-17.** Now written:
   - **The Hole tool:** plain holes along X, Y or Z, as `hole(part, { across, deep, at, along })`. `at` is measured from
     the centre of the part's box; a blind hole only from the face at the high end of its axis.
   - **A turn about X, Y or Z through the origin:** `turn(part, [..])` followed by the `move` that makes up for reSHape
     turning about the centre of the part's box.
   - **Patterns in two directions:** two `linearPattern` calls.
   - **Cuts both ways:** `pocket(…, { midplane: true })`; both programs measure the total depth.
   - **Sketches on slanted planes:** `sketch({ origin, u, v })`.
   - **Counterbore and countersink holes** (2026-11-18), through or blind, from the face at the high end of the axis:
     `counterbore: { across, deep }`, `countersink: { across, angle }` (SolidCraft's `cb_*` and `cs_*`, the included angle
     and the width at the face in both).
   - **A move and a turn at once** (2026-11-18): SolidCraft turns about the axis through the origin, then moves (x' = R·x + t),
     so it is `turn` and then one `move` by R·c − c + t.
   - **A revolve** (2026-11-18), about X, Y or Z through the origin, as `spin` (new part), `union(part, spin(…))` (joined)
     or `groove` (cut). reSHape's `spin(sk, a)` does not turn the sketch where it is drawn: the sketch is a profile, its x the
     distance out from the axis and its y the height along it, and the axis is the plane's normal through the origin (Z for
     `'top'`, Y for `'front'`, X for `'side'`), turned right-handed by a from +X (+Y for `'side'`), measured in the guarded
     build. So the writer adds a new sketch with the profile laid out that way (`sk2.polygon([…])` or `sk2.circle(d, { at })`, d the diameter,
     one plain outline, which is what spin takes) and the spin; the sketch drawn with the tools stays as it was.
     - **Part way,** the sense is SolidCraft's: it turns the profile towards its sketch's normal.
     - **A whole turn** is the same solid from any plane through the axis, so its profile is laid out by its distance from
       the axis.
     - **Still refused:** two sides, symmetric and "to" turns, an axis on an edge or a sketch line, a profile that is not one
       outline of straight lines or one circle, and a part-way turn from a plane reSHape does not start in.
     - **Checked:** the guarded build refuses a spin of a sketch drawn with the drawing words ("a spin takes one plain
       outline") and builds the polygon one. tools2-e2e has six round trips: Z, Y and X part way, a whole turn from the YZ
       plane, a groove, and a join, each the same part.

   Still not written:
   - **Copies:** the guarded build refuses `move(…, { copy: true })` ("a copying move is not mapped").
   - A blind hole from below, or a counterbore or countersink there: the guarded build cuts them from the face at the high end
     of the axis only.
   - A hole with a drill point, and turns about a slanted axis (reSHape turns about the box's centre, which moves after
     each turn, so it cannot be written as several turns from the box before).
   - A hole or turn made in the same go as another step, because its place is measured from the part before both.

   After writing, the part is rebuilt from the code and compared by volume and box, as before. It is now also compared by
   every flat face's area and centre and by the curved faces' total area, so a hole in the wrong place or a part turned
   the wrong way is reported, not passed. Round trips: `/tmp/cad-drive/tools2-e2e.py` (25 of 25 the same part, with the counterbore, the countersink, the move with a turn, seven revolves, a torus, two mirrors and three drafts).
8. **Done 2026-11-17: a refused step points at its line.** The line is found by evaluating the script cut short after each
   top-level statement of script.js until the step appears (`stepLines`; interpreter only, nothing built). A step made in
   an imported class goes on the script.js line that called it. The refusal shows "script.js line N" as a link, and the
   line is marked in the editor with the sentence as its tooltip; the mark follows edits until the next Run.
9. SolidCraft shows its own "autosave" toast inside the frame (storage is off in the host page).

## Points on a sketch's plane (2026-11-18; with Live sketch off, or outside a sketch's block)

- **What it does.** The **Points** switch in the studio's toolbar shows, over the view, the `[x, y]` under the pointer on
  the plane of the sketch the editor cursor is in. That sketch is the variable of `lid.circle(` on the cursor's line or a
  line above, or of its `const lid = sketch(...)`. With no sketch there, the top plane is used.
  - It snaps to a part's corners, edge middles and face centres within 10 px; otherwise it rounds to 0.5 mm.
  - A point off the plane is dropped onto it: a bottom corner reads as its x and y on a top-plane sketch.
  - A click writes `[x, y]` at the editor cursor, after `, ` when it follows another point. It selects nothing in
    SolidCraft, and a drag still turns the view.
- **How.**
  - The plane comes from reSHape's own document after each Run, with one more evaluation that builds nothing. So
    `sketch('top', height)` has its real offset, and a framed sketch its frame.
  - SolidCraft has `ui.worldToScreen` but nothing that goes the other way. A plane maps onto the screen by a projective
    map, so four of its points, projected by SolidCraft, give that map exactly, and its inverse turns the pointer into
    plane coordinates (`lib/sketch-plane-points.ts`).
- **Fixed on the way.** The variable probe took a friendly sketch (a proxy that answers any property) for a part, so no
  sketch variable was known. It now asks for a sketch id first.
- **Checked.** `scripts/test-sketch-plane-points.mjs` (planes, the map, the active sketch, the written point). In the
  browser, `/tmp/cad-drive/points-e2e.py`, 10 of 10:
  - a top corner reads `[60, 40]` on `sketch('top', 10)` and a click writes it;
  - a free point reads to 0.5 mm;
  - a front-plane sketch reads x and z;
  - Points off shows nothing.

## Live sketch (2026-11-18)

- **What it does.** With **Live sketch** on (the default), putting the editor cursor in a sketch's block puts the studio in
  sketch mode, as SolidCraft is when a sketch is started on a face. The block is its `const lid = sketch(...)` line and the
  `lid.…(…)` lines right after it.
  - **The view.** It turns to face the sketch's plane, u to the right and v up, and turns back to where it was when the
    cursor leaves the block or Done is pressed.
  - **The grid.** A snap grid is drawn on the plane, its step following the zoom (0.1 to 500 mm, cells at least 14 px).
    The part's edges that lie on the plane are drawn over it, so the face the sketch is on is outlined. Face labels are
    hidden meanwhile.
  - **The sketch.** Its own lines, circles and arcs are drawn as the code is typed, from reSHape's document re-read about
    half a second after each change; nothing is built.
  - **The tools.** The hint bar shows Line, Rectangle, Circle, Polyline and Done.
    - Clicks snap to the sketch's own ends and centres, the part's corners, edge middles and face centres, else the grid.
    - Each tool writes its reSHape line (`lid.rectangle(a, b);`, `lid.circle(c, { r });`, `lid.line(a, b);`,
      `lid.lines([...]);`) at the end of the sketch's block, as one undoable edit.
    - Polyline ends on its first point (closed) or Enter (open); Escape drops the points so far; a drag still turns the view.
- **How.**
  - **Camera angles.** SolidCraft's angles were measured: front is yaw 0 and pitch 0, right is yaw −π/2, top is pitch π/2,
    and a positive roll turns the picture clockwise.
  - **Facing the plane.** The eye is set along u × v, then rolled until u is level on the screen (`viewAngles` in
    `lib/sketch-plane-points.ts`).
  - **Drawing.** The grid and the curves are mapped through the plane-to-screen projective map, worked out again whenever
    the camera moves (`components/CadSketchOverlay.tsx`).
- **Checked.** Unit tests in `scripts/test-sketch-plane-points.mjs`. In the browser, `/tmp/cad-drive/sketch-mode-e2e.py`,
  14 of 14:
  - the top view for `sketch('top', 10)`, x to the right, and the front view for a front sketch;
  - the grid, the face outline and the circle drawn;
  - the code each of Rectangle, Circle and closed Polyline writes;
  - a typed line drawn without a Run;
  - Done turning the view back;
  - the drawn code builds.

## Starting and finishing a sketch (2026-11-18)

- **New sketch.** It sits in the hint bar while Live sketch is on and script.js is open.
  - Click a flat face, or choose Top, Front or Side. That writes `const sk = sketch('top', 10);` at the end of script.js
    and starts sketch mode on it.
  - A slanted face is written in the frame form, its normal the face's outward one (`faceSketchArgs`).
- **Arc tool.** Click the centre, the start, then the end, which is put on the circle (written to 1e-9, so it is on it); it writes
  `sk.arc(c, a, b, 'ccw')`.
- **Drag.** A drawn point written as plain numbers can be dragged. Every `[x, y]` in the sketch's block with that value
  is rewritten (`movePointEdits`), so two lines' shared corner moves together. A point written with a variable is not.
  - A plain `sk.rectangle(a, b)` can also be dragged by the two corners its code does not write (2026-11-19): that
    corner moves, the opposite one stays, and both of the rectangle's points are rewritten so its sides stay level and
    upright. Checked: `sketch-drag-e2e.py`, 5 of 5, the moved rectangle extruding at its new size.
- **Extrude and Pocket**, with a depth, write the step after the sketch's block and Run.
  - **Extrude on a face** of a part in a variable writes `union(part, extrude(sk, d))`; elsewhere,
    `const partN = extrude(sk, d)`.
  - **Pocket** writes `pocket(sk, part, d)`.
  - **Direction.** Both are turned round with `{ reversed: true }` when reSHape's sweep would go into the part (extrude)
    or out of it (pocket); `finishDirections`, from the part's box centre.
- **The grid** is kept to the face the sketch sits on: the part's edges on the plane, joined into outlines
  (`planeOutlines`), clip it. A sketch on no face keeps the plane around the part.
- **Checked.** `/tmp/cad-drive/sketch-flow-e2e.py`, 17 of 17:
  - a new sketch on the top face;
  - the grid clipped to the face;
  - a rectangle, then a corner dragged without the view turning;
  - Pocket cut 200 mm³ and the part rebuilt;
  - a new sketch on the front face, extruded outwards (+250 mm³, the box to y = −5);
  - the Arc tool.

  Plus unit tests in `scripts/test-sketch-plane-points.mjs`.

## Torus, mirror and draft written as code (2026-11-18)

- **Torus:** `ring(across, tubeAcross, { at })`, across the outside diameter 2·(major + minor), tubeAcross 2·minor.
- **Mirror:** `mirror(part, 'left-right' | 'front-back' | 'top-bottom')`. reSHape's mirror joins the part with its reflection
  across the plane square to the word's axis at the end of the part's box nearer zero (the guarded build's own placement). So a
  SolidCraft mirror is written only when it joins (combine), across an origin plane or a custom one square to X, Y or Z, and its
  plane is at that end of the part's box. A mirrored copy kept apart, a plane across the middle of the part or at its far end,
  and a slanted plane are refused.
- **Draft:** `draft(part, a)` when every side wall is tilted, `draft(part.face('right'), a)` for one named face, with
  `{ neutral: n }` for a neutral plane off zero. Only a pull along +X, +Y or +Z is written (reSHape has no other); some of the
  side walls, another pull, or a neutral plane that is a face are refused.
- **Checked:** tools2-e2e, the same part for a torus, a mirror across YZ and across the bottom face, a draft of every side
  wall, a draft of one face about a plane part way up, and a draft of one face of an extruded plate (reSHape names an
  extruded part's faces for draft as it does a cuboid's); unit tests for each refusal.

## More sketch tools (2026-11-18)

- **Delete.** With the tool on, the curve under the pointer is marked in red with every curve its line drew (all of a
  rectangle's four sides), and the readout names the line; a click removes that line from the code.
  - **Which line drew which curve** is found by evaluating the script cut short after each line of the sketch's block and
    counting the sketch's curves (nothing is built; `sketchStatementLines`, `curveOwners`). So a line written with variables
    is found too. When the counts do not add up, nothing is removed.
  - It is shown when script.js is open, as New sketch is.
- **Slot.** Click the centres of its two caps, then its radius (the pointer's distance from the line between them, on the
  grid's step) or type the radius. It is written in the drawing words, its two sides and two caps
  (`sk.line(…)` ×2, `sk.arc(…, 'ccw')` ×2): reSHape's own `sk.slot(a, b, r)` cannot share a sketch with them ("Do not mix the two
  ways on one sketch"). Checked: the outline extrudes to the volume reSHape's slot() gives (1051.289 mm³ for 20 × 8 with r 4
  and 5 deep; the exact 1051.327 is 3.7e-5 above both, the engine's measure of a curved part, the same for either).
- **Dimensions.** In sketch mode each line shows its length at its middle, and each circle and arc its radius on it
  (`dimensionOf`). A size written as plain numbers is a button: a click opens it for typing, Enter writes the new size into
  the code, Escape leaves it (`resizeEdits`):
  - a side of `sk.rectangle(a, b)`: b moves along that side, so the rectangle gets that width or height and a stays;
  - a circle: its `r` (the one-shape `sk.circle(d, { at })`: its diameter, twice the radius);
  - any other line: its end moves along it, with every `[x, y]` of the block that is that end, so a corner it shares moves
    too; only when that line's own code holds the end as plain numbers.

  A size written with a name (`[5 + w, 35]`) is shown but cannot be clicked: it is changed in the code. Which line drew which
  curve comes from the same cut-short evaluation as Delete. Checked: `/tmp/cad-drive/sketch-dims-e2e.py`, 7 of 7.
- **Angle dimensions** (2026-11-20). Each corner where exactly two lines end shows the angle between them, inside the corner
  with a small arc across it (`angleDims`). A level and an upright line meeting at a right angle show none (every rectangle
  would have four), nor do two lines running straight on, a corner where an arc or a third curve ends, or a corner too small
  on screen for its label (its lines under about 45 px; it shows when the view comes closer).
  - **Changing it** (`angleEdits`): a click opens the angle for typing (above 0, below 180), and the later-drawn line turns
    about the corner, keeping its length. Its far end is written to 1e-9 with every `[x, y]` of the block that is that end,
    so a side sharing that end follows (a closed polyline stays closed). When the later line cannot turn, the earlier one does.
  - A line turns only when its far end is written as plain numbers in its own line and only lines end there, none of them a
    rectangle's side: an arc or a circle there would be left off its curve, and a rectangle's corner moves only level and
    upright. Otherwise the angle is shown but cannot be clicked. `movePointEdits` takes how to write the new point for this.
  - Checked: unit tests (a triangle's three angles, no angle at a rectangle, straight on, three lines, an arc; turning the
    later line with the side that follows, the earlier one when the later is written with a variable, neither, a circle
    centred or a rectangle's corner on the end, 180 and 0 refused). In the browser, `/tmp/cad-drive/sketch-angle-e2e.py`, 10 of 10:
    - a triangle's 63.435°, 45° and 71.565° and a small triangle's two angles shown, a rectangle's none, each with its arc;
    - the small triangle's corner whose two far ends are written with variables shown but not clickable;
    - 45° typed as 60: the right side turns to `[25.857864376, 29.494897428]` and the closing side follows; the other two
      corners then show 57.081° and 62.919°; 200 changes nothing; Escape leaves the code;
    - the sketch extrudes at 5 × (150√6 + 100 + 70) more than the part, within 1e-3.
- **Round.** A click on a corner where two lines meet, then the radius: from the pointer (its distance from the corner times
  tan of half the angle, so at a right angle the distance itself, on the grid's step, never above the largest that fits) or
  typed and Enter (`roundEdits` in `lib/sketch-plane-points.ts`).
  - The two lines are shortened to where the round meets them, a distance r / tan(θ/2) from the corner, and
    `sk.arc(centre, from, to, 'ccw')` is written after the later of them, the short way round. Its points are written to
    1e-9 (see "Points on an arc" below).
  - A rectangle or a polyline the corner belongs to is written out as its separate `sk.line(…)` lines first: the drawing
    words have no rounded rectangle, and reSHape's own `rect().round(k, r)` belongs to the plain outline, which does not mix
    with them.
  - A radius that uses up a whole line drops the line, and the arc meets the next one; a bigger one changes nothing and says
    the largest that fits.
  - Not rounded, each with a sentence: an end where three curves meet, two lines in a straight line or a line and an arc
    that run on smoothly, and a corner written with a variable or a sum, or with more than nine decimals.
  - Which line drew which curve comes from the same cut-short evaluation as Delete.
  - Checked: unit tests (a right angle either way round, 60°, a rectangle, a line used up, too big, a variable, an arc at the
    corner) and `/tmp/cad-drive/sketch-round-e2e.py`, 11 of 11: a rectangle rounded at two corners, one with a radius that
    uses up a side, extrudes at the volume worked out by hand, 24000 + 5 × (600 − (25 + 400)(1 − π/4)), less 3.6e-5 of the
    rounded block: the engine's measure of a curved part, as for the slot.
- **Chamfer.** The same as Round, with a distance in place of the radius: the two lines are shortened by it, each along
  itself, and `sk.line(…)` is written across the corner after them (`chamferEdits`; one equal distance, as SolidCraft's
  sketch chamfer). The pointer's distance from the corner gives it, on the grid's step and never above the shorter line;
  a distance that uses up a line drops it. Round and Chamfer share the rewriting of the corner's lines (`cornerCutEdits`).
  Checked: unit tests (a right angle, a slanted corner, a rectangle, a line used up, too big) and
  `/tmp/cad-drive/sketch-chamfer-e2e.py`, 10 of 10: a rectangle chamfered at two corners extrudes at exactly
  24000 + 5 × (600 − 12.5 − 200).
- **Round and Chamfer where a line meets an arc, or two arcs meet** (2026-11-19). The corner is any end where exactly two
  curves meet, each a line or an arc, at an angle (`cornerAt`, `cutCorners`).
  - **Round.** The round's centre is where the two curves' offsets by r towards the inside of the corner cross: a line's
    offset is a line, an arc's a circle of radius R + r (the corner outside its circle) or R − r (inside it). Of the
    crossings, the one nearest the corner whose touching points lie on both curves (`roundAt`). The largest radius is found
    by halving, to 0.001.
  - **Chamfer.** On an arc, the cut is the point the distance from the corner in a straight line; the largest is the chord
    to the arc's far end (its diameter past half a turn).
  - **The arc that is cut** is written again from its far end (`cutCurve`): reSHape takes an arc's radius from its start,
    so its radius stays what it was. A curve used up goes, as a line does.
  - Checked: unit tests (a line and an arc worked out by hand: the centre at x = 30 − √(100 + 20r); the largest round, 40,
    using up the line; the chamfer; an arc whose corner is its end; smooth joins; two arcs at a right angle) and
    `/tmp/cad-drive/sketch-arc-corner-e2e.py`, 13 of 13: a rectangle with a quarter circle cut from a corner, rounded where the
    bottom meets the arc and chamfered where the arc meets the side, extrudes at the area worked out by Green's theorem over
    the exact curves (within 1e-4 of the cut block).
- **Trim** (2026-11-19). With the tool on, the piece of a line, arc or circle under the pointer is marked in red; a click
  cuts it away (`trimGeom`, `trimEdits`).
  - **The piece** runs between the two places nearest the pointer where the curve crosses or touches another curve (another
    curve's end lying on it counts; a line lying along another line does not), or the curve's own end.
  - **What is left:** a line or an arc keeps up to two pieces, an arc in its own sense. A circle crossed at two places or
    more becomes the arc that is left. A curve that nothing crosses goes whole.
  - **The code:** the line that drew it is written again in the drawing words (a rectangle or a polyline as its separate
    lines), through the same rewriting as Round and Chamfer (`rewriteCurves`), which now also takes `sk.circle(c, { r })`.
    - A crossing is written to 1e-9. A crossing within 1e-7 of another curve's end is put on that end exactly, so the two
      meet by value.
    - A line written with a variable or a sum is not changed, and a sentence says so.
  - Checked: unit tests (a line crossed once and twice, a rectangle's side, a line ending on another, a circle and the line
    through it, an arc and a slanted line, a crossing on an end written to 1e-9, nothing crossing, lines lying along each
    other, a variable). In the browser, `/tmp/cad-drive/sketch-trim-e2e.py`, 11 of 11:
    - two overlapping rectangles made one outline by cutting away the four pieces inside the overlap;
    - a circle on one side made a bump by cutting away its inner half and the side between its crossings;
    - a stray line removed whole;
    - the outline extrudes at (800 + 12.5π) × 5 more than the part, within 1e-4.
- **Points on an arc are written to 1e-9** (2026-11-19). reSHape refuses a sketch whose arc's two ends miss one circle by
  more than 1e-6 mm ("The rules of this sketch have to move its shape…"). A point rounded to 0.001 misses by up to about
  7e-4 wherever the geometry is not exact. So a Round at a slanted corner wrote an arc the build refuses (at the test's
  triangle corner, r 3, the old points miss by 2e-4), and so did the Arc tool, whose end is put on the circle and then
  rounded (refused in the browser at a 6.8e-4 miss). Both now write those points to 1e-9 (`fmt9`,
  `pointExact`), and a number exact to 0.001 is still written short, so right angles look as before. The Slot tool was never
  affected: its caps' two ends sit either side of the centre and round alike. It is written the same way now anyway.
  Checked: `/tmp/cad-drive/sketch-exact-arcs-e2e.py`, 6 of 6:
  - the wedge the Arc tool used to write is refused;
  - the Arc tool's wedge now builds, as far short of the area worked out by hand as a whole circle of that radius is (the
    engine measures a curve by straight pieces);
  - a round at a slanted corner of two lines, and a slanted slot, both drawn with the tools, extrude at the volume worked out
    by hand.
- **Typed sizes.** After a tool's first click, a number typed shows in the readout with where Enter puts the point, and Enter
  puts it down there, in the pointer's direction (`typedPoint`):
  - Line and Polyline: the length from the last point;
  - Rectangle: `30, 20` (or `30 x 20`) for width and height, one number for a square, into the pointer's quarter;
  - Circle: the radius, kept as typed (not put on the grid);
  - Arc, after its centre and start: the angle it turns counter-clockwise.

  Backspace takes back a character; Escape clears the number first and the points the second time. Checked:
  `/tmp/cad-drive/sketch-typed-e2e.py`, 9 of 9.
- **Plain outlines are drawn.** `sk.polygon(…)`, `sk.rect(…)` and `sk.circle(d, { at })` (d the diameter) are kept by reSHape as points only;
  Live sketch now draws them from those (`sketchGeoms`), snaps to their corners, and Delete and drag work on them. An outline
  with rounded, chamfered or bulged corners is not drawn, rather than drawn with straight sides.
- **Checked.** `/tmp/cad-drive/sketch-delete-e2e.py`, 11 of 11: a rectangle written with a variable marked and removed whole,
  a circle on its own, the click not reaching SolidCraft, the rest of the code untouched and still building, and a polygon
  drawn and marked by its line.

**Fixed: a revolved circle was written at half its size.** reSHape's one-shape `sk.circle(d, { at })` takes the diameter, and
the revolve writer gave it the radius. The check after writing would have said "not quite the one you made" (the volume is a
quarter), so it was never passed as right. Now written with the diameter; a revolved circle (a ring) is one of the round trips.

**Loft is not written.** reSHape's nearest word is `blend(a, b, gap)`, but the guarded build refuses every blend ("a loft
between two sketches is not available in this version yet", measured with drawn and plain sketches), so a loft made with the
tools stays refused as before.

**A fix in the check after writing.** The part built from the code was compared face by face after sorting the flat faces by
area. A revolve's two rings have areas that differ in the 16th digit, and SolidCraft and reSHape list them the other way round,
so the top ring was compared with the bottom one and a right part was called "not quite the one you made". The faces are now
matched one to one within the same tolerances, in any order (`matchFaces`). This can only have reported a right part as wrong,
never a wrong one as right.

## Checked

- Unit: `scripts/test-solidcraft-code.mjs` (files, joining with lines kept, the variable probe, lists,
  picks), `scripts/test-solidcraft-ui-to-code.mjs` (planes from SolidCraft's frames, sketches, features, refusals).
- Browser, on the guarded host:
  - **Words, labels, fill and lists (16 checks).** The starter builds at the hand-worked volume. Labels and the plane names show; a face fills `sketch()` as its plane; an edge fills `fillet()`. The list highlight selects in the view. A filled-in round builds at its volume. Refusals are shown beside the code: an edge changed by a pocket, and a round too big for its face. An imported class builds, an error in it names its file and line, and nothing is sent to the server.
  - **Tools to code (10 checks).** Each of these is rewritten as reSHape Script and rebuilt to the same part: a round, a sketch on the top face, a pocket, and a sketch on SolidCraft's XZ plane extruded to the front. A copy-move is explained, with Undo.
  - **Known engine defects through the same path.** Shell family C is refused by the hollow check, and an outline open by 1e-5 mm is refused as an open outline.
