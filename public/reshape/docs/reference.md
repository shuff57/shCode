# reSHape Script Reference

A reSHape script is the Build timeline written down. Every call appends one step to the same document the Build tools produce; the same kernel builds it; the same Dimensions panel, handles, timeline chips, refusals, exports and tests apply. There is no second geometry API. Code mode and Build mode are two views of one document.

## The idea

A script is a straight run of steps. You make a shape, then change it: drill a hole, hollow it out, round its edges. Each line adds one step to the timeline, the same way the Build toolbar does. The script is executed top to bottom; the last shape built is what appears.

```js intro-basic
const b = box(40, 40, 20)
hollow(b, { wall: 2 })
hole(b, { across: 6 })
```

A 40 × 40 × 20 box, hollowed to 2 mm walls, then drilled through with a 6 mm hole. Each line adds one step (Box 1, Hollow 1, Hole 1) to the timeline. Hollow comes before the hole on purpose: this kernel cannot hollow a shape that already has a hole or a round in it.

Every call returns the handle it acted on, so you can keep building on the same shape or save intermediate results to variables. Change a number and every part that depends on it changes with it. That is parametric design: the model is a program.

Numbers are millimetres. Angles are degrees. Faces are plain words (`top`, `bottom`, `front`, `back`, `left`, `right`, `side`). Step handles carry IDs that match what the timeline shows (`box1`, `hole1`, `hollow1`).

## Shapes

Every model starts with a shape. Each shape call returns a handle and adds a step to the timeline.

A **box** is a rectangular block, centred at the origin. Specify width, depth, and height. `box(40, 40, 20)` is 40 mm wide (left-right), 40 mm deep (front-back), and 20 mm tall (up-down).

A **cylinder** is round, centred at the origin with its axis pointing up. Specify how wide across and how tall. `cylinder(30, 80)` is 30 mm across and 80 mm tall. Round the edges with an option: `cylinder(30, 80, { corner: 4 })`.

A **sphere** is a ball, centred at the origin. Specify how wide across. `sphere(30)` is 30 mm across in every direction.

A **cone** is round at the base and comes to a point, centred at the origin with the point up. Specify how wide across the base is and how tall. `cone(30, 40)` has a 30 mm base and stands 40 mm tall.

A **ring** is a donut or torus, centred at the origin. Specify two diameters across: the ring diameter (distance across the middle of the donut) and the tube diameter (thickness of the tube). `ring(40, 8)` is 40 mm across the ring and 8 mm thick. Both measurements are diameters, not radii. A typical donut 36 mm across with an 8 mm thick tube uses `ring(36, 8)`.

```js shape-box
const b = box(40, 40, 20)
```

A 40 × 40 × 20 box; 32,000 mm³.

```js shape-cylinder
const c = cylinder(30, 80)
```

A cylinder 30 mm across, 80 mm tall.

```js shape-sphere
const s = sphere(30)
```

A sphere 30 mm across.

```js shape-cone
const c = cone(30, 40)
```

A cone with 30 mm base, tapering to 10 mm, standing 40 mm tall.

```js shape-ring
const r = ring(40, 8)
```

A donut 40 mm across the ring, 8 mm tube diameter.

```js shape-rounded-box
const b = box(30, 30, 20, { corner: 3 })
```

A 30 × 30 × 20 box with all edges rounded.

```js shape-rounded-cylinder
const c = cylinder(30, 80, { corner: 2 })
```

A cylinder 30 mm across, 80 mm tall, with edges rounded.

## Placing things at a location

When you build multiple shapes, they all start at the origin, the point where the red, green, and blue lines meet. That means they land inside each other. Move shapes out of the way with `at: [x, y, z]` when you create them.

**`at` positions the shape's centre.** `box(40, 40, 20, { at: [50, 0, 0] })` places the box's centre at x = 50, y = 0, z = 0. Shifting left-right is x, away-and-back is y, up-down is z. The numbers are millimetres.

When you place shapes this way, they sit side by side. A second box built at the origin overlaps the first one built at the origin. Place it at `[80, 0, 0]` and it lands clear. This is why placing things with `at` is faster than building overlapping shapes and cutting them apart: you see the model you meant instead of the hole you have to fill.

```js place-side-by-side
const left = box(30, 30, 20, { at: [-50, 0, 10] })
const right = box(30, 30, 20, { at: [50, 0, 10] })
```

Two 30 × 30 × 20 boxes, 100 mm apart, lifted to sit on the floor.

```js place-stacked
const base = box(40, 40, 10, { at: [0, 0, 5] })
const top = box(20, 20, 10, { at: [0, 0, 15] })
```

A base plate with a smaller box stacked above it.

```js place-assembly
const plate = box(60, 40, 5, { at: [0, 0, 2.5] })
const post = cylinder(6, 20, { at: [0, 0, 10] })
const cap = sphere(8, { at: [0, 0, 28] })
```

A plate, post, and sphere cap arranged vertically.

```js place-clear-of-origin
const small = box(10, 10, 10)
const large = box(40, 40, 20, { at: [60, 0, 0] })
```

A small box at the origin and a larger box placed clear of it.

## Making holes

A **hole** is a pocket or a through-hole drilled into a shape. Specify how wide across and (optionally) how deep.

`hole(b, { across: 6 })` drills a hole 6 mm across, all the way through. The hole's depth is calculated to go through the whole shape—an extent of 2 mm beyond each side ensures it reaches the far surface.

`hole(b, { across: 6, deep: 10 })` drills a pocket 6 mm across and exactly 10 mm deep. The depth is measured from the face you pick, or the first face it encounters if you don't specify one.

**`at` places the hole on the face.** `hole(b, { across: 6, at: [10, 0] })` drills the hole 10 mm to the right of the shape's centre on the first face. The coordinates are local to that face: x and y only, no z.

**`along` drills perpendicular to a different face.** `hole(b, { across: 6, along: 'x' })` drills from the right or left face (perpendicular to the x-axis) rather than from the top. The hole still goes across 6 mm and through (depth extends beyond the shape by 2 mm).

**`holes` drills multiple holes at once in a rectangular pattern.** `holes(b, { across: 6, apart: [15, 10] })` drills four holes—spacing 15 mm apart left-right and 10 mm apart front-back. The pattern is centred on the shape.

```js hole-through
const b = box(40, 40, 20)
hole(b, { across: 6 })
```

A 40 × 40 × 20 box with a 6 mm through-hole at the centre of the top face.

```js hole-pocket
const b = box(40, 40, 20)
hole(b, { across: 6, deep: 10 })
```

A 40 × 40 × 20 box with a 6 mm pocket 10 mm deep on the top face.

```js hole-offset
const b = box(40, 40, 20)
hole(b, { across: 6, at: [10, 0] })
```

A 40 × 40 × 20 box with a 6 mm through-hole offset from the centre.

```js hole-from-side
const b = box(40, 40, 20)
hole(b, { across: 6, along: 'x' })
```

A 40 × 40 × 20 box with a 6 mm through-hole drilled from the side.

```js holes-pattern
const b = box(40, 40, 20)
holes(b, { across: 4, apart: [15, 15] })
```

A 40 × 40 × 20 box with four 4 mm through-holes in a square pattern.

```js hole-multiple
const b = box(40, 40, 20)
hole(b, { across: 3, at: [-10, -10] })
hole(b, { across: 3, at: [10, 10] })
```

A 40 × 40 × 20 box with two 3 mm through-holes at opposite corners.

## Hollowing out

A **hollow** removes the inside of a shape, leaving a shell with walls of a thickness you specify.

`hollow(b, { wall: 2 })` hollows the entire shape, leaving 2 mm thick walls on all sides. The hollow is a closed shell with no opening.

`hollow(b, { wall: 2, open: 'top' })` hollows the shape but leaves one face open—the top in this case. You can now fill the shape from above, like a pencil cup. Open options are `'top'`, `'bottom'`, `'front'`, `'back'`, `'left'`, `'right'`.

The wall thickness is measured inward from each surface. A 40 × 40 × 20 box hollowed with 2 mm walls becomes a shell with 2 mm thick walls all around.

**Hollow before you drill or round.** You can hollow first, then drill holes. But hollowing after certain operations (like a round or fillet) is sometimes refused by the kernel. The timeline will show the refusal message if that happens.

```js hollow-closed
const b = box(40, 40, 20)
hollow(b, { wall: 2 })
```

A 40 × 40 × 20 box hollowed with 2 mm thick walls, completely sealed.

```js hollow-open-top
const b = box(40, 40, 20)
hollow(b, { wall: 2, open: 'top' })
```

A 40 × 40 × 20 box hollowed with 2 mm thick walls and the top face open, like a cup.

```js hollow-open-side
const b = box(40, 40, 20)
hollow(b, { wall: 2, open: 'front' })
```

A 40 × 40 × 20 box hollowed with the front face open.

```js hollow-then-hole
const b = box(40, 40, 20)
hollow(b, { wall: 2 })
hole(b, { across: 6 })
```

A 40 × 40 × 20 box hollowed first with 2 mm walls, then drilled through. Hollow first, then hole: this kernel cannot hollow a shape that already has a hole in it.

```js hollow-thin-wall
const b = box(40, 40, 20)
hollow(b, { wall: 1 })
```

A 40 × 40 × 20 box with thin 1 mm walls.

```js hollow-thick-wall
const b = box(40, 40, 20)
hollow(b, { wall: 5 })
```

A 40 × 40 × 20 box with thick 5 mm walls.

## Rounding and bevelling edges

A **round** smooths edges into curves. A **bevel** cuts edges at an angle.

`round(b, 3)` rounds every edge of the shape to a 3 mm radius. On a box or cylinder, this softens all the sharp corners at once. On a shape with curved or complex edges, every edge gets the same treatment.

`round(b.edge('top', 'front'), 3)` rounds only the edge between the top and front faces, named by the two faces it connects. This lets you soften one edge while leaving others sharp. Use this for detail work—rounding just the corner where two faces meet, leaving the rest untouched.

`bevel` works the same way, but with a 45-degree cut instead of a smooth curve. `bevel(b.edge('top', 'front'), 3)` bevels that one edge by 3 mm.

Edge names are the six faces: `'top'`, `'bottom'`, `'front'`, `'back'`, `'left'`, `'right'`. A cylinder also has `'side'`. The edge between top and front is written `b.edge('top', 'front')`, and it is the same edge as `b.edge('front', 'top')`.

```js round-all-edges
const b = box(30, 20, 10)
round(b, 3)
```

A 30 × 20 × 10 box with all edges rounded.

```js round-one-edge
const b = box(40, 40, 20)
round(b.edge('top', 'front'), 2)
```

A 40 × 40 × 20 box with only the top-front edge rounded.

```js bevel-one-edge
const b = box(40, 40, 20)
bevel(b.edge('top', 'front'), 3)
```

A 40 × 40 × 20 box with the top-front edge bevelled.

```js round-cylinder-edges
const c = cylinder(30, 60)
round(c.edge('top', 'side'), 2)
```

A cylinder with the top rim rounded.

```js round-then-bevel
const b = box(40, 40, 20)
round(b.edge('top', 'front'), 1)
round(b.edge('top', 'back'), 1)
bevel(b.edge('bottom', 'front'), 2)
```

A 40 × 40 × 20 box with selective rounding and bevelling.

## Repeating and patterns

A **repeat** copies a shape in a line, spaced apart. A **repeatAround** spins copies around a central axis, like petals around a flower.

`repeat(b, { count: 3, step: 60 })` makes 3 copies of a shape, each 60 mm along the x-axis from the last. The copies stack left to right.

`repeat(b, { count: 3, step: [60, 0, 0] })` makes the same pattern explicitly along x. You can specify `step: [0, 60, 0]` to repeat along y or `step: [0, 0, 60]` to repeat along z. Any combination works.

`repeatAround(b, { count: 6, axis: 'z' })` makes 6 copies arranged in a circle around the z-axis, evenly spaced. `axis: 'x'` or `axis: 'y'` rotate around a different axis instead.

```js repeat-linear
const b = box(20, 20, 10)
repeat(b, { count: 3, step: 60 })
```

Three 20 × 20 × 10 boxes in a line, spaced 60 mm apart.

```js repeat-along-y
const c = cylinder(10, 30)
repeat(c, { count: 4, step: [0, 40, 0] })
```

Four cylinders arranged in a line along the y-axis, 40 mm apart.

```js repeat-vertical
const b = box(30, 30, 10)
repeat(b, { count: 3, step: [0, 0, 15] })
```

Three 30 × 30 × 10 boxes stacked vertically, 15 mm apart.

```js repeat-around-circle
const b = box(10, 30, 10, { at: [25, 0, 0] })
repeatAround(b, { count: 6, axis: 'z' })
```

Six boxes arranged in a circle around the z-axis.

```js repeat-around-with-hole
const b = box(6, 20, 6, { at: [20, 0, 0] })
repeatAround(b, { count: 4, axis: 'z' })
hole(b, { across: 3 })
```

Four boxes in a circle, each with a hole drilled through.

## Mirroring

A **mirror** flips a shape across a plane, creating a symmetrical copy.

`mirror(b, 'left-right')` mirrors the shape across the vertical plane that runs front-to-back. The original stays at its location, and a flipped copy appears on the other side.

Mirror options are `'left-right'` (mirror across the y-z plane), `'front-back'` (mirror across the x-z plane), and `'top-bottom'` (mirror across the x-y plane).

```js mirror-left-right
const b = box(30, 40, 20, { at: [30, 0, 10] })
mirror(b, 'left-right')
```

A box and its left-right mirror.

```js mirror-front-back
const b = box(40, 30, 20, { at: [0, 30, 10] })
mirror(b, 'front-back')
```

A box and its front-back mirror.

```js mirror-top-bottom
const b = box(40, 40, 10, { at: [0, 0, 20] })
mirror(b, 'top-bottom')
```

A box and its top-bottom mirror.

## Moving and rotating

A **move** shifts a shape to a new location. A **turn** rotates a shape around its own centre.

`move(b, [20, 0, 0])` shifts the shape 20 mm to the right. This is different from `at` when creating a shape—`at` positions the centre, while move adds to the shape's current position.

`turn(b, [0, 0, 45])` rotates the shape 45 degrees around the z-axis (spinning in place). The rotation happens around the shape's own middle, not the world origin. Angles are degrees. Specify all three axes as `[x-rotation, y-rotation, z-rotation]`, or just the z-rotation as a single number for the common case.

```js move-shape
const b = box(20, 20, 10)
move(b, [40, 0, 0])
```

A 20 × 20 × 10 box moved 40 mm to the right.

```js turn-around-z
const b = box(30, 20, 10, { at: [0, 0, 5] })
turn(b, [0, 0, 45])
```

A 30 × 20 × 10 box rotated 45 degrees, tilted on one corner.

```js turn-around-x
const b = box(40, 20, 10, { at: [0, 0, 5] })
turn(b, [90, 0, 0])
```

A 40 × 20 × 10 box rotated 90 degrees, standing up on one edge.

```js move-and-turn
const b = box(20, 20, 10)
turn(b, [0, 0, 30])
move(b, [30, 0, 0])
```

A 20 × 20 × 10 box moved and then rotated.

## Combining shapes

**Join** glues two shapes together (union). **Cut** removes one shape from another. **Keep** finds the overlap (intersection).

`join(a, b)` combines two shapes into one. Where they touch or overlap, they become one solid. After joining, the result is one shape you can drill, hollow, or round.

`cut(a, b)` subtracts b from a. The volume of b is removed from a, leaving a hole. This is how you cut complex features into a shape when drilling doesn't fit.

`keep(a, b)` keeps only the part where a and b overlap. The result is their intersection—the shape where both exist.

The first argument is the one you keep. `cut(a, b)` removes b from a; `cut(b, a)` removes a from b. The order matters.

```js join-shapes
const base = box(40, 40, 10, { at: [0, 0, 5] })
const post = cylinder(6, 20, { at: [0, 0, 10] })
join(base, post)
```

A base and post combined into one shape.

```js cut-hole
const b = box(40, 40, 20, { at: [0, 0, 10] })
const cutter = box(20, 20, 30, { at: [0, 0, 15] })
cut(b, cutter)
```

A 40 × 40 × 20 box with a rectangular block subtracted from its centre.

```js keep-overlap
const a = box(40, 40, 20, { at: [0, 0, 10] })
const b = sphere(20, { at: [0, 0, 20] })
keep(a, b)
```

The intersection of a box and sphere.

```js boolean-sequence
const base = box(40, 40, 20, { at: [0, 0, 10] })
const notch = box(15, 40, 10, { at: [-20, 0, 10] })
cut(base, notch)
round(base, 2)
```

A box with a notch cut out and edges rounded.

## Sketches and extrusion

A **sketch** is a flat drawing. You can extrude a sketch upward (**pull**), spin it around an axis (**spin**), or blend between two sketches (**blend**).

`sketch('top')` starts a flat drawing on the top face. Options are `'top'`, `'front'`, and `'side'`. You can also specify an offset: `sketch('top', 10)` draws on a plane 10 mm above the top face.

On the sketch, draw shapes with `rect`, `circle`, and `polygon`, all positioned with a local x-y coordinate system.

`sk.rect(20, 10)` draws a rectangle 20 mm wide and 10 mm tall, centred on the origin of that plane.

`sk.circle(8)` draws a circle 8 mm across, centred on the origin. Use `at: [x, y]` to move it: `sk.circle(8, { at: [10, 0] })`.

`sk.polygon([[0, 0], [20, 0], [10, 15]])` draws a polygon from a list of corners.

Once you have a sketch, extrude it into a 3D shape.

`pull(sk, 30)` extrudes the sketch upward 30 mm, creating a solid. The extrusion runs perpendicular to the plane the sketch is drawn on.

`spin(sk, 360)` revolves the sketch around an axis 360 degrees (a full turn). This is useful for rotational symmetry—draw a profile and spin it to create a 3D shape.

`blend(sk1, sk2, 20)` smoothly transitions from one sketch to another over 20 mm, creating a lofted surface between them.

```js sketch-rect
const sk = sketch('top')
sk.rect(20, 10)
const shape = pull(sk, 30)
```

A rectangular prism extruded from a sketch.

```js sketch-circle
const sk = sketch('front')
sk.circle(10)
const shape = pull(sk, 40)
```

A cylinder created by extruding a circle.

```js sketch-polygon
const sk = sketch('top')
sk.polygon([[0, 0], [20, 0], [10, 15]])
const shape = pull(sk, 30)
```

A triangular prism extruded from a polygon.

```js sketch-spin
const sk = sketch('front', 0)
sk.rect(30, 10, { at: [40, 0] })
const shape = spin(sk, 360)
```

A shape created by spinning a rectangle around an axis.

```js sketch-blend
const sk1 = sketch('top')
sk1.circle(15)
const sk2 = sketch('top', 30)
sk2.circle(5)
const shape = blend(sk1, sk2, 30)
```

A cone-like shape blended from one circle to another.

```js sketch-complex
const sk = sketch('front')
sk.rect(30, 10, { at: [0, 5] })
sk.circle(5, { at: [-10, -5] })
sk.circle(5, { at: [10, -5] })
const shape = pull(sk, 25)
```

A complex shape extruded from a sketch with multiple elements.

## Parameters

A **param** is a named number that appears as a slider on the Dimensions panel. Change the slider and the model rebuilds automatically.

`param('wall', 2, { min: 0.5, max: 10 })` creates a slider called `wall` with an initial value of 2, a minimum of 0.5, and a maximum of 10. The value is stored in the variable and used in the rest of the script.

Every number in your model is already a slider. Unnamed numbers get automatic captions from the Build tool defaults. `param` lets you name it and set bounds.

A variable cannot share a name with a tool: `const holes = param('holes', 3)` is refused because `holes()` is the four-corners tool. Call it `count` instead.

```js param-basic
const wall = param('wall', 2, { min: 0.5, max: 10 })
const b = box(40, 40, 20)
hollow(b, { wall })
```

A 40 × 40 × 20 box with a parametric wall thickness.

```js param-multiple
const width = param('width', 40, { min: 20, max: 80 })
const height = param('height', 20, { min: 10, max: 40 })
const count = param('holes', 3, { min: 1, max: 6 })
const b = box(width, 40, height, { at: [60, 0, 0] })
repeatAround(b, { count: count, axis: 'z' })
hole(b, { across: 4 })
```

A parametric box with adjustable dimensions and hole count.

```js param-dimensions
const size = param('size', 30, { min: 10, max: 80 })
const c = cylinder(size / 2, size)
round(c, 2)
```

A cylinder whose height and diameter scale together from a single parameter.

## Reading the timeline and panel

The **timeline** shows every step you built, in order. Each step is a chip with the operation name and the shape ID (e.g., `Box 1`, `Hole 1`, `Hollow 1`). Click a chip to select that step in the viewport, highlighting it and showing its parameters.

The **Dimensions panel** shows sliders for every number in the model. Drag a slider to change a value, and the model rebuilds instantly. Named parameters appear with their own captions; unnamed numbers get automatic names from the Build tools.

Each number in the timeline has a corresponding slider. If you used `param('wall', 2)`, that slider is named "wall". If you just wrote `hollow(b, { wall: 2 })` without `param`, the slider appears as "hollow wall" or similar, generated from the operation and field name.

You can see exactly which number is which by clicking a timeline chip—it highlights the corresponding slider in the panel.

```js timeline-example
const b = box(40, 40, 20)
hollow(b, { wall: 2 })
hole(b, { across: 6 })
round(b.edge('top', 'front'), 3)
```

Four timeline steps appear: Box 1, Hole 1, Hollow 1, Round 1. Each is a chip you can click to edit its parameters.

## When a step is refused

Sometimes the kernel cannot build what you ask. A refusal message appears in the timeline, blocking that step and everything after it. The message tells you exactly why and how to fix it.

**Message: "Hollowing Hollow 1 to 15 thick would collapse it—the wall has to be under 10."**
You asked for walls thicker than the shape allows. Reduce the wall thickness parameter or make the shape larger.

**Message: "Hole 1 cannot drill through this face—the face is too small or oddly shaped."**
The hole's diameter is larger than the face can accommodate, or the geometry is too complex to calculate. Make the hole smaller or pick a different face.

**Message: "Round 1 refused—Fillet on this edge is too complex; try a smaller radius."**
The fillet radius is too large for the edge. Reduce the radius or try bevelling instead of rounding.

**Message: "Hollow 1 refused—Cannot hollow after certain operations."**
You tried to hollow after a round or fillet. Try hollowing first, before rounding the interior walls instead.

The refusal stops the timeline there. All steps before it are valid and visible. Fix the refused step by changing its parameters, and the timeline updates.

## Exporting your model

Your finished model is a solid 3D shape ready to print, analyse, or use in other software.

**Export as STL** for 3D printing. STL is the standard format for 3D printers worldwide. The file contains a mesh of triangles that define the shape.

**Export as STEP** for CAD software. STEP preserves the model's structure—edges, faces, and construction history—so you can edit it later in another program.

**Export as IGES** for advanced CAD tools. IGES is an older format but widely supported.

Click Export in the toolbar to save your model. Choose the format and a filename. Most 3D printers accept STL directly.

For 3D printing, make sure your model is closed (no holes or gaps), dimensions are correct, and walls are thick enough to print (generally at least 0.5 mm for most printers). Test-print small parts first.

```js export-printable
const base = box(40, 40, 5, { at: [0, 0, 2.5] })
const post = cylinder(6, 20, { at: [0, 0, 10] })
join(base, post)
round(post.edge('top', 'side'), 1)
```

A completed model ready for export: a base plate with a centred post and smooth top edge.
