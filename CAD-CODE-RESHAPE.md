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

   Still not written:
   - **Copies:** the guarded build refuses `move(…, { copy: true })` ("a copying move is not mapped").
   - A blind hole from below, or a counterbore or countersink there: the guarded build cuts them from the face at the high end
     of the axis only.
   - A hole with a drill point, and turns about a slanted axis (reSHape turns about the box's centre, which moves after
     each turn, so it cannot be written as several turns from the box before).
   - A hole or turn made in the same go as another step, because its place is measured from the part before both.

   After writing, the part is rebuilt from the code and compared by volume and box, as before. It is now also compared by
   every flat face's area and centre and by the curved faces' total area, so a hole in the wrong place or a part turned
   the wrong way is reported, not passed. Round trips: `/tmp/cad-drive/tools2-e2e.py` (12 of 12 the same part, with the counterbore, the countersink and the move with a turn).
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
- **Arc tool.** Click the centre, the start, then the end, which is put on the circle; it writes
  `sk.arc(c, a, b, 'ccw')`.
- **Drag.** A drawn point written as plain numbers can be dragged. Every `[x, y]` in the sketch's block with that value
  is rewritten (`movePointEdits`), so two lines' shared corner moves together. A point written with a variable is not.
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

## Checked

- Unit: `scripts/test-solidcraft-code.mjs` (files, joining with lines kept, the variable probe, lists,
  picks), `scripts/test-solidcraft-ui-to-code.mjs` (planes from SolidCraft's frames, sketches, features, refusals).
- Browser, on the guarded host:
  - **Words, labels, fill and lists (16 checks).** The starter builds at the hand-worked volume. Labels and the plane names show; a face fills `sketch()` as its plane; an edge fills `fillet()`. The list highlight selects in the view. A filled-in round builds at its volume. Refusals are shown beside the code: an edge changed by a pocket, and a round too big for its face. An imported class builds, an error in it names its file and line, and nothing is sent to the server.
  - **Tools to code (10 checks).** Each of these is rewritten as reSHape Script and rebuilt to the same part: a round, a sketch on the top face, a pocket, and a sketch on SolidCraft's XZ plane extruded to the front. A copy-move is explained, with Undo.
  - **Known engine defects through the same path.** Shell family C is refused by the hollow check, and an outline open by 1e-5 mm is refused as an open outline.
