# reSHape Script Reference

A reSHape script is the Build timeline written down. Every call appends one step to the same document the Build tools produce; the same kernel builds it; the same Dimensions panel, handles, timeline chips, refusals, exports and tests apply. There is no second geometry API. Code mode and Build mode are two views of one document.

## The idea

A script is a straight run of steps. You make a shape, then change it: drill a hole, hollow it out, round its edges. Each line adds one step to the timeline, the same way the Build toolbar does. The script is executed top to bottom; the last shape built is what appears.

```js intro-basic
const b = cuboid(40, 40, 20)
shell(b, { wall: 2 })
hole(b, { across: 6 })
```

A 40 × 40 × 20 box, hollowed to 2 mm walls, then drilled through with a 6 mm hole. Each line adds one step (Box 1, Hollow 1, Hole 1) to the timeline. Hollow comes before the hole on purpose: this kernel cannot hollow a shape that already has a hole or a round in it.

Every call returns the handle it acted on, so you can keep building on the same shape or save intermediate results to variables. Change a number and every part that depends on it changes with it. That is parametric design: the model is a program.

Numbers are millimetres. Angles are degrees. Faces are plain words (`top`, `bottom`, `front`, `back`, `left`, `right`, `side`). Step handles carry IDs that match what the timeline shows (`box1`, `hole1`, `hollow1`).

## Shapes

Every model starts with a shape. Each shape call returns a handle and adds a step to the timeline.

A **box** is a rectangular block, centred at the origin. Specify width, depth, and height. `cuboid(40, 40, 20)` is 40 mm wide (left-right), 40 mm deep (front-back), and 20 mm tall (up-down).

A **cylinder** is round, centred at the origin with its axis pointing up. Specify how wide across and how tall. `cylinder(30, 80)` is 30 mm across and 80 mm tall. Round the edges with an option: `cylinder(30, 80, { corner: 4 })`.

A **sphere** is a ball, centred at the origin. Specify how wide across. `sphere(30)` is 30 mm across in every direction.

A **cone** is round at the base and comes to a point, centred at the origin with the point up. Specify how wide across the base is and how tall. `cone(30, 40)` has a 30 mm base and stands 40 mm tall.

A **ring** is a donut or torus, centred at the origin. Specify two diameters across: the ring diameter (distance across the middle of the donut) and the tube diameter (thickness of the tube). `torus(40, 8)` is 40 mm across the ring and 8 mm thick. Both measurements are diameters, not radii. A typical donut 36 mm across with an 8 mm thick tube uses `torus(36, 8)`.

```js shape-box
const b = cuboid(40, 40, 20)
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
const r = torus(40, 8)
```

A donut 40 mm across the ring, 8 mm tube diameter.

```js shape-rounded-box
const b = cuboid(30, 30, 20, { corner: 3 })
```

A 30 × 30 × 20 box with all edges rounded.

```js shape-rounded-cylinder
const c = cylinder(30, 80, { corner: 2 })
```

A cylinder 30 mm across, 80 mm tall, with edges rounded.

A **prism** is a straight post with 3 to 12 equal sides. `prism(6, 20, 10)` is a hexagon 20 mm across its corners and 10 mm tall. The width is the whole distance corner to corner, a diameter like every other width here. Its volume is (sides / 2) × (across / 2)² × sin(360 / sides) × tall: the hexagon is 2598.08 mm³ and a triangle of the same size is 1299.04 mm³. Place one with `at: [x, y, z]`.

```js shape-prism
const hex = prism(6, 20, 10)
const tri = prism(3, 20, 10, { at: [30, 0, 0] })
```

A hexagonal post and a triangular post beside it.

A **wedge** is a block cut corner to corner along its height, so the end is a right triangle: a ramp, a stop or a gusset. `wedge(10, 20, 30)` is exactly half of a 10 × 20 × 30 block, so its volume is 10 × 20 × 30 / 2 = 3000 mm³. It is centred on the origin until you place it with `{ at: [x, y, z] }` or slide it later with `move(w, [x, y, z])`.

```js shape-wedge
const a = wedge(10, 20, 30, { at: [20, 0, 0] })
```

One ramp, 3000 mm³, placed 20 mm along x.

## Placing things at a location

When you build multiple shapes, they all start at the origin, the point where the red, green, and blue lines meet. That means they land inside each other. Move shapes out of the way with `at: [x, y, z]` when you create them.

**`at` positions the shape's centre.** `cuboid(40, 40, 20, { at: [50, 0, 0] })` places the box's centre at x = 50, y = 0, z = 0. Shifting left-right is x, away-and-back is y, up-down is z. The numbers are millimetres.

When you place shapes this way, they sit side by side. A second box built at the origin overlaps the first one built at the origin. Place it at `[80, 0, 0]` and it lands clear. This is why placing things with `at` is faster than building overlapping shapes and cutting them apart: you see the model you meant instead of the hole you have to fill.

```js place-side-by-side
const left = cuboid(30, 30, 20, { at: [-50, 0, 10] })
const right = cuboid(30, 30, 20, { at: [50, 0, 10] })
```

Two 30 × 30 × 20 boxes, 100 mm apart, lifted to sit on the floor.

```js place-stacked
const base = cuboid(40, 40, 10, { at: [0, 0, 5] })
const top = cuboid(20, 20, 10, { at: [0, 0, 15] })
```

A base plate with a smaller box stacked above it.

```js place-assembly
const plate = cuboid(60, 40, 5, { at: [0, 0, 2.5] })
const post = cylinder(6, 20, { at: [0, 0, 10] })
const cap = sphere(8, { at: [0, 0, 28] })
```

A plate, post, and sphere cap arranged vertically.

```js place-clear-of-origin
const small = cuboid(10, 10, 10)
const large = cuboid(40, 40, 20, { at: [60, 0, 0] })
```

A small box at the origin and a larger box placed clear of it.

## Making holes

A **hole** is a pocket or a through-hole drilled into a shape. Specify how wide across and (optionally) how deep.

`hole(b, { across: 6 })` drills a hole 6 mm across, all the way through. A through-hole needs to know how thick the part is, and it does for boxes, cylinders, cones, prisms, spheres, tori and wedges you have not turned, for a box or cylinder you have turned (at any angle), and for shapes pulled from a flat sketch, joined together, repeated in a line, moved or cut: a 30 × 20 pulled shape 20 mm tall takes `hole(t, { across: 6 })` straight through and leaves 12000 − 180π = 11434.51 mm³. A hole that stops short (`deep:`) also has to know exactly where the top is, so it works on those but stops with "cannot find where the top of this ... is" on a cut shape or a prism drilled across its corners. A turned cone, prism, torus or wedge, a polarPattern, an overlap or a mirror drilled along its own mirror axis still stops with "cannot find how thick" and asks you to give it a depth (and a `deep:` you give such a shape drills from its middle, so the kernel refuses one that would leave a sealed cavity).

`hole(b, { across: 6, deep: 10 })` drills a pocket 6 mm across and exactly 10 mm deep. The depth is measured from the face the hole is drilled into: a blind `deep:` hole starts at that face, so the pocket is open there and never a sealed cavity inside the part.

**`at` places the hole on the face.** `hole(b, { across: 6, at: [10, 0] })` drills the hole 10 mm to the right of the shape's centre on the first face. The coordinates are local to that face: x and y only, no z.

**`along` drills perpendicular to a different face.** `hole(b, { across: 6, along: 'x' })` drills from the right or left face (perpendicular to the x-axis) rather than from the top. The hole still goes across 6 mm and through.

**`holes` drills multiple holes at once in a rectangular pattern.** `holes(b, { across: 6, apart: [15, 10] })` drills four holes—spacing 15 mm apart left-right and 10 mm apart front-back. The pattern is centred on the shape.

```js hole-through
const b = cuboid(40, 40, 20)
hole(b, { across: 6 })
```

A 40 × 40 × 20 box with a 6 mm through-hole at the centre of the top face.

```js hole-pocket
const b = cuboid(40, 40, 20)
hole(b, { across: 6, deep: 10 })
```

A 40 × 40 × 20 box with a 6 mm pocket 10 mm deep on the top face.

**`size` names a bolt instead of a width.** `hole(b, { size: 'M6' })` looks up the clearance hole that bolt passes through, in millimetres (the ISO medium fit): M3 3.4, M4 4.5, M5 5.5, M6 6.6, M8 9, M10 11, M12 13.5. The name is not case-sensitive, so `'m6'` works. `size` is another way to say `across`: give one or the other, never both. A size that is not in the list stops the script, with the valid names in the message. An M6 hole through a 40 × 40 × 20 block leaves 32000 − 217.8π = 31315.76 mm³.

```js hole-size
const b = cuboid(40, 40, 20)
hole(b, { size: 'M6' })
```

A 40 × 40 × 20 box with an M6 clearance hole (6.6 mm across) through it.

```js hole-offset
const b = cuboid(40, 40, 20)
hole(b, { across: 6, at: [10, 0] })
```

A 40 × 40 × 20 box with a 6 mm through-hole offset from the centre.

```js hole-from-side
const b = cuboid(40, 40, 20)
hole(b, { across: 6, along: 'x' })
```

A 40 × 40 × 20 box with a 6 mm through-hole drilled from the side.

```js holes-pattern
const b = cuboid(40, 40, 20)
holes(b, { across: 4, apart: [15, 15] })
```

A 40 × 40 × 20 box with four 4 mm through-holes in a square pattern.

```js hole-multiple
const b = cuboid(40, 40, 20)
hole(b, { across: 3, at: [-10, -10] })
hole(b, { across: 3, at: [10, 10] })
```

A 40 × 40 × 20 box with two 3 mm through-holes at opposite corners.

## Hollowing out

A **hollow** removes the inside of a shape, leaving a shell with walls of a thickness you specify.

`shell(b, { wall: 2 })` hollows the entire shape, leaving 2 mm thick walls on all sides. The hollow is a closed shell with no opening.

`shell(b, { wall: 2, open: 'top' })` hollows the shape but leaves one face open—the top in this case. You can now fill the shape from above, like a pencil cup. Open options are `'top'`, `'bottom'`, `'front'`, `'back'`, `'left'`, `'right'`.

The wall thickness is measured inward from each surface. A 40 × 40 × 20 box hollowed with 2 mm walls becomes a shell with 2 mm thick walls all around.

**The order that always builds: shape, hollow, holes, then single-edge rounds and bevels.** `hollow` comes first because this kernel cannot hollow a shape that already has a hole or a round in it; asked later, the timeline shows "Hollowing Hollow 1 did not work after the steps before it -- this kernel cannot hollow a shape that already has a hole or a round. Hollow first, then drill or round. Hollow 1 is shown without it." A hollowed shape rounds its edges one at a time, with `fillet(b.edge('top', 'front'), 1)`. Rounding every edge at once (`fillet(b, 3)`) is a property of the shape itself, and a shape cannot have both that and a hollow: before the hollow, the kernel refuses the hollow; after it, the script stops with "Rounding works on a shape, not a hollowed-out one. A hollow shape rounds its edges one at a time: pick an edge and round that." Round every edge only on shapes you do not hollow, and before any hole.

```js hollow-closed
const b = cuboid(40, 40, 20)
shell(b, { wall: 2 })
```

A 40 × 40 × 20 box hollowed with 2 mm thick walls, completely sealed.

```js hollow-open-top
const b = cuboid(40, 40, 20)
shell(b, { wall: 2, open: 'top' })
```

A 40 × 40 × 20 box hollowed with 2 mm thick walls and the top face open, like a cup.

```js hollow-open-side
const b = cuboid(40, 40, 20)
shell(b, { wall: 2, open: 'front' })
```

A 40 × 40 × 20 box hollowed with the front face open.

```js hollow-then-hole
const b = cuboid(40, 40, 20)
shell(b, { wall: 2 })
hole(b, { across: 6 })
```

A 40 × 40 × 20 box hollowed first with 2 mm walls, then drilled through. Hollow first, then hole: this kernel cannot hollow a shape that already has a hole in it.

```js hollow-full-order
const b = cuboid(40, 40, 20)
shell(b, { wall: 2 })
hole(b, { across: 6 })
fillet(b.edge('top', 'front'), 1)
```

Every kind of step on one box, in the order that builds: the shape, a 2 mm hollow, a 6 mm hole through, and one edge of the result rounded to 1.

```js hollow-open-round-rim
const b = cuboid(40, 40, 20)
shell(b, { wall: 2, open: 'top' })
fillet(b.edge('top', 'front'), 1)
```

A 40 × 40 × 20 box hollowed with 2 mm walls and the top open, with the top-front rim edge -- the boundary the opening left behind, not a face of the hollow itself -- rounded to 1 mm; ≈8663 mm³.

```js hollow-thin-wall
const b = cuboid(40, 40, 20)
shell(b, { wall: 1 })
```

A 40 × 40 × 20 box with thin 1 mm walls.

```js hollow-thick-wall
const b = cuboid(40, 40, 20)
shell(b, { wall: 5 })
```

A 40 × 40 × 20 box with thick 5 mm walls.

## Rounding and bevelling edges

A **round** smooths edges into curves. A **bevel** cuts edges at an angle.

`fillet(b, 3)` rounds every edge of the shape to a 3 mm radius. On a box or cylinder, this softens all the sharp corners at once, and it shows in the timeline as part of the shape ("Box 1, corner 3") rather than as its own step, because it is a property of the shape. Rounding one edge is its own step ("Round 1").

`fillet(b.edge('top', 'front'), 3)` rounds only the edge between the top and front faces, named by the two faces it connects. This lets you soften one edge while leaving others sharp. Use this for detail work—rounding just the corner where two faces meet, leaving the rest untouched.

`bevel` works the same way, but with a 45-degree cut instead of a smooth curve. `chamfer(b.edge('top', 'front'), 3)` bevels that one edge by 3 mm.

Edge names are the six faces: `'top'`, `'bottom'`, `'front'`, `'back'`, `'left'`, `'right'`. A cylinder also has `'side'`. The edge between top and front is written `b.edge('top', 'front')`, and it is the same edge as `b.edge('front', 'top')`.

```js round-all-edges
const b = cuboid(30, 20, 10)
fillet(b, 3)
```

A 30 × 20 × 10 box with all edges rounded.

```js round-one-edge
const b = cuboid(40, 40, 20)
fillet(b.edge('top', 'front'), 2)
```

A 40 × 40 × 20 box with only the top-front edge rounded.

```js bevel-one-edge
const b = cuboid(40, 40, 20)
chamfer(b.edge('top', 'front'), 3)
```

A 40 × 40 × 20 box with the top-front edge bevelled.

```js round-cylinder-edges
const c = cylinder(30, 60)
fillet(c.edge('top', 'side'), 2)
```

A cylinder with the top rim rounded.

```js round-then-bevel
const b = cuboid(40, 40, 20)
fillet(b.edge('top', 'front'), 1)
fillet(b.edge('top', 'back'), 1)
chamfer(b.edge('bottom', 'front'), 2)
```

A 40 × 40 × 20 box with selective rounding and bevelling.

A **draft** tilts the side walls so a part can release from a mould, or come away cleanly from a print. `draft(shape, angle, { whole: true })` leans every side wall by `angle` degrees. The wall at the middle height stays where it was; the top leans in and the bottom flares out. For a 40 × 40 × 20 block drafted 8 degrees the volume is 32000 + (8/3) × 10³ × tan(8°)² = 32052.67 mm³. A very steep angle collapses a wall, and then the panel tells you so in a sentence.

```js draft-whole
const b = cuboid(40, 40, 20)
draft(b, 8, { whole: true })
```

A 40 × 40 × 20 block with all four walls drafted 8 degrees.

## Repeating and patterns

A **repeat** copies a shape in a line, spaced apart. A **repeatAround** spins copies around a central axis, like petals around a flower.

`linearPattern(b, { count: 3, step: 60 })` makes 3 copies of a shape, each 60 mm along the x-axis from the last. The copies stack left to right.

`linearPattern(b, { count: 3, step: [60, 0, 0] })` makes the same pattern explicitly along x. You can specify `step: [0, 60, 0]` to repeat along y or `step: [0, 0, 60]` to repeat along z. Any combination works.

`polarPattern(b, { count: 6, axis: 'z' })` makes 6 copies arranged in a circle around the z-axis, evenly spaced. `axis: 'x'` or `axis: 'y'` rotate around a different axis instead.

```js repeat-linear
const b = cuboid(20, 20, 10)
linearPattern(b, { count: 3, step: 60 })
```

Three 20 × 20 × 10 boxes in a line, spaced 60 mm apart.

```js repeat-along-y
const c = cylinder(10, 30)
linearPattern(c, { count: 4, step: [0, 40, 0] })
```

Four cylinders arranged in a line along the y-axis, 40 mm apart.

```js repeat-vertical
const b = cuboid(30, 30, 10)
linearPattern(b, { count: 3, step: [0, 0, 15] })
```

Three 30 × 30 × 10 boxes stacked vertically, 15 mm apart.

```js repeat-around-circle
const b = cuboid(10, 30, 10, { at: [25, 0, 0] })
polarPattern(b, { count: 6, axis: 'z' })
```

Six boxes arranged in a circle around the z-axis.

```js repeat-around-with-hole
const b = cuboid(6, 20, 6, { at: [20, 0, 0] })
polarPattern(b, { count: 4, axis: 'z' })
hole(b, { across: 3, deep: 6 })
```

Four boxes in a circle, each with a hole drilled through.

## Mirroring

A **mirror** flips a shape across a plane, creating a symmetrical copy.

`mirror(b, 'left-right')` mirrors the shape across the vertical plane that runs front-to-back. The original stays at its location, and a flipped copy appears on the other side.

Mirror options are `'left-right'` (mirror across the y-z plane), `'front-back'` (mirror across the x-z plane), and `'top-bottom'` (mirror across the x-y plane).

```js mirror-left-right
const b = cuboid(30, 40, 20, { at: [30, 0, 10] })
mirror(b, 'left-right')
```

A box and its left-right mirror.

```js mirror-front-back
const b = cuboid(40, 30, 20, { at: [0, 30, 10] })
mirror(b, 'front-back')
```

A box and its front-back mirror.

```js mirror-top-bottom
const b = cuboid(40, 40, 10, { at: [0, 0, 20] })
mirror(b, 'top-bottom')
```

A box and its top-bottom mirror.

## Moving and rotating

A **move** shifts a shape to a new location. A **turn** rotates a shape around its own centre.

`move(b, [20, 0, 0])` shifts the shape 20 mm to the right. This is different from `at` when creating a shape—`at` positions the centre, while move adds to the shape's current position.

`turn(b, [0, 0, 45])` rotates the shape 45 degrees around the z-axis (spinning in place). The rotation happens around the shape's own middle, not the world origin. Angles are degrees. Specify all three axes as `[x-rotation, y-rotation, z-rotation]`, or just the z-rotation as a single number for the common case.

```js move-shape
const b = cuboid(20, 20, 10)
move(b, [40, 0, 0])
```

A 20 × 20 × 10 box moved 40 mm to the right.

```js turn-around-z
const b = cuboid(30, 20, 10, { at: [0, 0, 5] })
turn(b, [0, 0, 45])
```

A 30 × 20 × 10 box rotated 45 degrees, tilted on one corner.

```js turn-around-x
const b = cuboid(40, 20, 10, { at: [0, 0, 5] })
turn(b, [90, 0, 0])
```

A 40 × 20 × 10 box rotated 90 degrees, standing up on one edge.

```js move-and-turn
const b = cuboid(20, 20, 10)
turn(b, [0, 0, 30])
move(b, [30, 0, 0])
```

A 20 × 20 × 10 box moved and then rotated.

## Combining shapes

**Join** glues two shapes together (union). **Cut** removes one shape from another. **Keep** finds the overlap (intersection).

`union(a, b)` combines two shapes into one. Where they touch or overlap, they become one solid. After joining, the result is one shape you can drill, hollow, or round.

`subtract(a, b)` subtracts b from a. The volume of b is removed from a, leaving a hole. This is how you cut complex features into a shape when drilling doesn't fit.

`intersect(a, b)` keeps only the part where a and b overlap. The result is their intersection—the shape where both exist.

The first argument is the one you keep. `subtract(a, b)` removes b from a; `subtract(b, a)` removes a from b. The order matters.

```js join-shapes
const base = cuboid(40, 40, 10, { at: [0, 0, 5] })
const post = cylinder(6, 20, { at: [0, 0, 10] })
union(base, post)
```

A base and post combined into one shape.

```js cut-hole
const b = cuboid(40, 40, 20, { at: [0, 0, 10] })
const cutter = cuboid(20, 20, 30, { at: [0, 0, 15] })
subtract(b, cutter)
```

A 40 × 40 × 20 box with a rectangular block subtracted from its centre.

```js keep-overlap
const a = cuboid(40, 40, 20, { at: [0, 0, 10] })
const b = sphere(20, { at: [0, 0, 20] })
intersect(a, b)
```

The intersection of a box and sphere.

```js boolean-sequence
const base = cuboid(40, 40, 20, { at: [0, 0, 10] })
const notch = cuboid(15, 40, 10, { at: [-20, 0, 10] })
subtract(base, notch)
fillet(base, 2)
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

`extrude(sk, 30)` extrudes the sketch upward 30 mm, creating a solid. The extrusion runs perpendicular to the plane the sketch is drawn on.

`revolve(sk, 360)` revolves the sketch around an axis 360 degrees (a full turn). This is useful for rotational symmetry—draw a profile and spin it to create a 3D shape.

`loft(sk1, sk2, 20)` smoothly transitions from one sketch to another over 20 mm, creating a lofted surface between them.

```js sketch-rect
const sk = sketch('top')
sk.rect(20, 10)
const shape = extrude(sk, 30)
```

A rectangular prism extruded from a sketch.

```js sketch-circle
const sk = sketch('front')
sk.circle(10)
const shape = extrude(sk, 40)
```

A cylinder created by extruding a circle.

```js sketch-polygon
const sk = sketch('top')
sk.polygon([[0, 0], [20, 0], [10, 15]])
const shape = extrude(sk, 30)
```

A triangular prism extruded from a polygon.

```js sketch-spin
const sk = sketch('front', 0)
sk.rect(30, 10, { at: [40, 0] })
const shape = revolve(sk, 360)
```

A shape created by spinning a rectangle around an axis.

```js sketch-blend
const sk1 = sketch('top')
sk1.circle(15)
const sk2 = sketch('top', 30)
sk2.circle(5)
const shape = loft(sk1, sk2, 30)
```

A cone-like shape blended from one circle to another.

`pocket(sk, shape, depth)` is `extrude` in reverse: it pushes the sketch into a shape and takes that block away instead of adding one. Say the sketch first, then the shape it cuts, then how deep. A 10 × 10 pocket 5 mm deep leaves 40 × 40 × 20 − 10 × 10 × 5 = 31500 mm³. The sketch has to sit on the face you cut from, because the cut runs from the sketch plane down into the shape. `sketch('top')` alone is the plane through the middle of a shape centred on the origin, so a pocket there would be a sealed cavity inside the part. The second argument of `sketch()` moves the plane: a 20 mm tall box centred on the origin has its top face at z = +10, so `sketch('top', 10)` puts the sketch on it. The pocket has 11 faces (the 6 of the box, 4 pocket walls and a floor). One pocket per shape: a second pocket cut into a shape that already has one stops the script today, with "not fully enclosed".

```js sketch-pocket
const b = cuboid(40, 40, 20)
const sk = sketch('top', 10)
sk.rect(10, 10)
pocket(sk, b, 5)
```

A rectangular pocket 5 mm deep, open on the top face of a block.

`groove(sk, shape, angle)` is `revolve` in reverse: it spins the sketch around the vertical middle line of its plane (the world y axis, for a `'front'` sketch) and takes the solid it sweeps out away from the shape. Say the sketch, the shape, then the turn in degrees. The profile has to reach the part's surface, or the cut stays sealed inside the part instead of opening onto a face. The kernel builds a groove whose profile touches the axis (a solid disc, not a ring) and runs past a face, with a full 360 degree turn; a ring-shaped groove, and a partial turn other than a half turn, are not supported yet. Here the 6 × 8 profile spans radius 0 to 6 from the axis and height 14 to 22, and the 40 × 40 × 20 block ends at y = +20, so the profile pokes 2 mm out of that face. A full turn removes a cylinder of radius 6 and length 6: π × 6² × 6 = 216π mm³ from the 32000 mm³ block, leaving 31321.42 mm³. The result is a round blind hole in the face, with 8 faces and 16 edges.

```js sketch-groove
const b = cuboid(40, 40, 20)
const sk = sketch('front', 0)
sk.rect(6, 8, { at: [3, 18] })
groove(sk, b, 360)
```

A disc groove cut through the top face of a block by spinning a small rectangle.

`sk.slot([x1, y1], [x2, y2], r)` draws a rounded slot: the two points are the centres of the two end caps and `r` is the cap radius, so the slot is 2r wide. Centres 40 apart with radius 5 give a 40 × 10 rectangle plus two half-discs, and extruded 10 mm it is 4000 + 250π = 4785.40 mm³.

`sketch({ origin: [x, y, z], u: [...], v: [...] })` draws on a plane you describe instead of a named one. `origin` is where the sketch's (0, 0) sits; `u` is the direction its x runs and `v` the direction its y runs. `u` and `v` must each be exactly unit length and at right angles to each other, or the script stops with a sentence saying which is wrong. The sketch faces u × v, and `extrude` pushes along that direction. Swapping `u` and `v` turns the part the other way. This part is 30 × 20 × 10 = 6000 mm³, spanning x from −10 to 20, y from −4 to 16 and z from 7 to 17.

```js sketch-frame
const sk = sketch({ origin: [5, 6, 7], u: [1, 0, 0], v: [0, 1, 0] })
sk.rect(30, 20)
const shape = extrude(sk, 10)
```

A 30 × 20 block extruded 10 mm from a plane placed at [5, 6, 7].

`plane('top')`, `plane('front')` and `plane('side')` name a flat surface, and `plane('top', 10)` slides it 10 mm along its own normal. `plane({ origin: [x, y, z], u: [...], v: [...] })` describes one yourself, with the same rules as a frame in `sketch()`: `u` and `v` each exactly unit length and at right angles, or a plain sentence says which is wrong. Draw on it with `sketch(pl)`. `plane()` makes the surface a step of its own: it shows up in the timeline as Plane 1 (or Custom plane, for one you described yourself) and the sketches that use it are drawn on it, but it adds no material to the part by itself. Deleting a plane also deletes every sketch on it and everything built from those sketches, and the delete tells you so first. A plane is frozen: it is a place in space, not a face of anything, so it does not move when a box height param changes. This sketches a 40 × 25 rectangle on the plane at z = 10 and pulls it 12: a 40 × 25 × 12 = 12000 mm³ slab spanning z from 10 to 22.

```js sketch-plane
const top = plane({ origin: [0, 0, 10], u: [1, 0, 0], v: [0, 1, 0] })
const sk = sketch(top)
sk.rect(40, 25)
const slab = extrude(sk, 12)
```

A slab built on a plane you described, 10 mm above the top plane.

One named plane can carry two sketches, and both stay level with each other. Here `plane('top', 10)` carries a 20 × 10 rectangle pulled 6 and a circle 5 across pulled 6 beside it, joined: 1200 + 37.5π = 1317.81 mm³, spanning z from 10 to 16.

```js sketch-plane-shared
const level = plane('top', 10)
const a = sketch(level)
a.rect(20, 10, { at: [-20, 0] })
const slab = extrude(a, 6)
const b = sketch(level)
b.circle(5, { at: [20, 0] })
const post = extrude(b, 6)
join(slab, post)
```

Two sketches on one plane, joined into a slab and a post.

`sk.geom([...])` draws a sketch from rows instead of one call per shape. Each row says what it is with `k`: `'point'` (`p: [x, y]`), `'line'` (`a` and `b`, its two ends), `'circle'` (`c` for the centre, `r` for the radius) or `'arc'` (`c`, `r`, `a`, `b` and `sense`). Every row has an `id`, a positive whole number. A row marked `construction: true` is scaffolding for rules and is left out of the outline. `sk.rules([...])` ties rows together, for example `{ k: 'coincident', a: 1, aEnd: 'b', b: 2, bEnd: 'a' }` welds the end of line 1 to the start of line 2. Here four lines make a 40 × 25 rectangle with a circle of radius 5 cut out of it: 10000 − 250π = 9214.60 mm³.

```js sketch-geom
const sk = sketch('top')
sk.geom([
  { k: 'line', id: 1, a: [0, 0], b: [40, 0] },
  { k: 'line', id: 2, a: [40, 0], b: [40, 25] },
  { k: 'line', id: 3, a: [40, 25], b: [0, 25] },
  { k: 'line', id: 4, a: [0, 25], b: [0, 0] },
  { k: 'circle', id: 5, c: [20, 12.5], r: 5 }
])
sk.rules([
  { k: 'coincident', a: 1, aEnd: 'b', b: 2, bEnd: 'a' },
  { k: 'coincident', a: 2, aEnd: 'b', b: 3, bEnd: 'a' },
  { k: 'coincident', a: 3, aEnd: 'b', b: 4, bEnd: 'a' },
  { k: 'coincident', a: 4, aEnd: 'b', b: 1, bEnd: 'a' }
])
const shape = extrude(sk, 10)
```

A rectangle drawn from rows, with a circular hole.

An arc row is `{ k: 'arc', id, c, r, a, b, sense }`: a centre, a radius, two ends on the circle and a sense, `'cw'` or `'ccw'`. The order of the ends sets the direction of travel around the outline, and the sense alone does not. A `'cw'` arc must start at its lower point and end at its upper one to round the outer side of a slot's end; the fix for a wrong curve is to reverse the ends, not the sense.

```js sketch-complex
const sk = sketch('front')
sk.rect(30, 10, { at: [0, 5] })
sk.circle(5, { at: [-10, -5] })
sk.circle(5, { at: [10, -5] })
const shape = extrude(sk, 25)
```

A complex shape extruded from a sketch with multiple elements.

**Rules on a sketch.** The Rules panel's own rules -- Across, Up, Length, the equal/parallel/perpendicular pair grid, and Pin a corner -- are also script calls, one per row, in the panel's own words. Edge and corner numbers are 1-based, the same numbers the panel shows. A rule call adds to whatever rules the sketch already has and settles through the exact same path a click in the panel uses, so a rule you set with the mouse is still there after Code -> Run, and a rule you set in a script is still there in the panel on Build.

`sk.across(1)` holds edge 1 horizontal, the panel's "Across" column.

`sk.up(2)` holds edge 2 vertical, the panel's "Up" column.

`sk.length(1, 40)` holds edge 1 at exactly 40 mm.

`sk.equal(2, 4)` holds edges 2 and 4 to the same length as each other.

`sk.parallel(1, 3)` holds edges 1 and 3 parallel to each other.

`sk.perpendicular(1, 2)` holds edges 1 and 2 at a right angle to each other.

`sk.pin(1)` locks corner 1 in place -- the solver may not move it to satisfy anything else.

**Rules between corners.** Four more rules name corners rather than edges. They are the panel's "Point rules" section, in the same words.

`sk.distX(1, 3, 12)` holds corners 1 and 3 exactly 12 mm apart measured across.

`sk.distY(1, 3, 10)` holds corners 1 and 3 exactly 10 mm apart measured up.

`sk.symmetric(1, 3, 2)` holds corner 2 exactly halfway between corners 1 and 3 -- on both axes, not just the obvious one.

`sk.angle(1, 2, 30)` holds edges 1 and 2 at a 30 degree turn to each other.

These four numbers can be **negative**, unlike a length. `sk.distX(1, 3, -12)` asks for corner 3 to sit 12 mm to the LEFT of corner 1, which is a genuinely different shape from 12 mm to the right -- measured, the rectangle mirrors. A minus sign here is an instruction, not a mistake.

Not every pair of these can hold at once. Asking a rectangle for both a `distX` and a `distY` across the same diagonal is asking it to be two shapes, so the older rule is dropped with a note in the panel, exactly like any other conflict.

```js rule-across
const sk = sketch('top')
sk.polygon([[0, 0], [40, 0], [40, 25], [0, 25]])
sk.across(1)
const shape = extrude(sk, 12)
```

```js rule-up
const sk = sketch('top')
sk.polygon([[0, 0], [40, 0], [40, 25], [0, 25]])
sk.up(2)
const shape = extrude(sk, 12)
```

```js rule-length
const sk = sketch('top')
sk.polygon([[0, 0], [40, 0], [40, 25], [0, 25]])
sk.length(1, 40)
const shape = extrude(sk, 12)
```

```js rule-equal
const sk = sketch('top')
sk.polygon([[0, 0], [40, 0], [40, 25], [0, 25]])
sk.equal(2, 4)
const shape = extrude(sk, 12)
```

```js rule-parallel
const sk = sketch('top')
sk.polygon([[0, 0], [40, 0], [40, 25], [0, 25]])
sk.parallel(1, 3)
const shape = extrude(sk, 12)
```

```js rule-perpendicular
const sk = sketch('top')
sk.polygon([[0, 0], [40, 0], [40, 25], [0, 25]])
sk.perpendicular(1, 2)
const shape = extrude(sk, 12)
```

```js rule-pin
const sk = sketch('top')
sk.polygon([[0, 0], [40, 0], [40, 25], [0, 25]])
sk.pin(1)
const shape = extrude(sk, 12)
```

A rectangular prism, same as `sk.rect(40, 25)` would draw -- these seven examples exist to show the call, not a different shape.

The four corner rules are the exception: each of these does change the shape, because that is the whole point of naming a distance or a symmetry.

```js rule-distx
const sk = sketch('top')
sk.polygon([[0, 0], [40, 0], [40, 25], [0, 25]])
sk.distX(1, 3, 30)
const shape = extrude(sk, 12)
```

```js rule-disty
const sk = sketch('top')
sk.polygon([[0, 0], [40, 0], [40, 25], [0, 25]])
sk.distY(1, 3, 15)
const shape = extrude(sk, 12)
```

```js rule-symmetric
const sk = sketch('top')
sk.polygon([[0, 0], [40, 0], [40, 25], [0, 25]])
sk.symmetric(1, 3, 2)
const shape = extrude(sk, 12)
```

```js rule-angle
const sk = sketch('top')
sk.polygon([[0, 0], [40, 0], [40, 25], [0, 25]])
sk.angle(1, 2, 60)
const shape = extrude(sk, 12)
```

A rule call never stops the script. It settles the same way a click on the panel does: if dropping one OLDER rule would make the new one fit, that rule quietly goes, and the sketch keeps building. If nothing does, the new rule is still added, and the sketch is left fighting -- the same thing you would see by clicking the same rule into the panel by hand:

- **"Edge 1 = edge 2 cannot hold along with the rules already on this sketch -- the shape is as close as it can get to all of them. Remove one to settle it."** Means the two rules genuinely disagree. Switch to Build and remove one from the Rules panel.

## Parameters

A **param** is a named number that appears as a slider on the Dimensions panel. Change the slider and the model rebuilds automatically.

`param('wall', 2, { min: 0.5, max: 10 })` creates a slider called `wall` with an initial value of 2, a minimum of 0.5, and a maximum of 10. The value is stored in the variable and used in the rest of the script.

Every number in your model is already a slider. Unnamed numbers get automatic captions from the Build tool defaults. `param` lets you name it and set bounds.

A variable cannot share a name with a tool: `const holes = param('holes', 3)` is refused because `holes()` is the four-corners tool. Call it `count` instead.

```js param-basic
const wall = param('wall', 2, { min: 0.5, max: 10 })
const b = cuboid(40, 40, 20)
shell(b, { wall })
```

A 40 × 40 × 20 box with a parametric wall thickness.

```js param-multiple
const width = param('width', 40, { min: 20, max: 80 })
const height = param('height', 20, { min: 10, max: 40 })
const count = param('holes', 3, { min: 1, max: 6 })
const b = cuboid(width, 40, height, { at: [60, 0, 0] })
polarPattern(b, { count: count, axis: 'z' })
hole(b, { across: 4, deep: 40 })
```

A parametric box with adjustable dimensions and hole count.

```js param-dimensions
const size = param('size', 30, { min: 10, max: 80 })
const c = cylinder(size / 2, size)
fillet(c, 2)
```

A cylinder whose height and diameter scale together from a single parameter.

## Reading the timeline and panel

The **timeline** shows every step you built, in order. Each step is a chip with the operation name and the shape ID (e.g., `Box 1`, `Hole 1`, `Hollow 1`). Click a chip to select that step in the viewport, highlighting it and showing its parameters.

The **Dimensions panel** shows sliders for every number in the model. Drag a slider to change a value, and the model rebuilds instantly. Named parameters appear with their own captions; unnamed numbers get automatic names from the Build tools.

Each number in the timeline has a corresponding slider. If you used `param('wall', 2)`, that slider is named "wall". If you just wrote `shell(b, { wall: 2 })` without `param`, the slider appears as "hollow wall" or similar, generated from the operation and field name.

You can see exactly which number is which by clicking a timeline chip—it highlights the corresponding slider in the panel.

```js timeline-example
const b = cuboid(40, 40, 20)
shell(b, { wall: 2 })
hole(b, { across: 6 })
fillet(b.edge('top', 'front'), 3)
```

Four timeline steps appear: Box 1, Hole 1, Hollow 1, Round 1. Each is a chip you can click to edit its parameters.

## When a step is refused

Two different things can go wrong, and they look different on screen.

**The kernel refuses a step.** The step gets a warning chip, the panel says why, and the shape is shown without that step; everything after it still builds. The sentences are the Build tools' own:

- **"Hollowing Hollow 1 to 15 thick would collapse it -- the wall has to be under 10. Hollow 1 is shown without it."** Make the wall thinner than the number it names.
- **"Boring Hole 1 at diameter 100 would not fit Box 1 -- Hole 1 is shown without it."** Make the hole smaller than the face it goes through.
- **"Rounding Round 1 at 30 would not fit its edge -- Round 1 is shown without it."** Use a smaller radius, or `bevel` instead.
- **"Hollowing Hollow 1 did not work after the steps before it -- this kernel cannot hollow a shape that already has a hole or a round. Hollow first, then drill or round. Hollow 1 is shown without it."** Move the `hollow` line above the `hole` and single-edge `round` lines.

**The script stops at a line.** Some orders cannot be a step at all, so the script stops there and the message names the line:

- **"Rounding works on a shape, not a hollowed-out one. A hollow shape rounds its edges one at a time: pick an edge and round that."** `fillet(b, 3)` and `hollow` cannot both be on one shape, in either order. Round the hollowed shape's edges one at a time: `fillet(b.edge('top', 'front'), 1)`.
- **"Rounding works on the shape, not the hole cut into it. Round the shape before you drill it."** The same rule, before `hole`.
- **"Rounding works on a shape, not a combination. Round the shape before you cut it."** The same rule, before `join`, `cut` or `keep`.

```js refusal-wall
const b = cuboid(40, 40, 20)
shell(b, { wall: 15 })
```

This one is refused on purpose so you can see what it looks like: Hollow 1 gets the warning chip and the box is shown solid. Change 15 to anything under 10 and the hollow appears.

## Exporting your model

Your finished model is a solid 3D shape ready to print, analyse, or use in other software.

**Export as STL** for 3D printing. STL is the standard format for 3D printers worldwide. The file contains a mesh of triangles that define the shape.

**Export as STEP** for CAD software. STEP preserves the model's structure—edges, faces, and construction history—so you can edit it later in another program.

**Export as IGES** for advanced CAD tools. IGES is an older format but widely supported.

Click Export in the toolbar to save your model. Choose the format and a filename. Most 3D printers accept STL directly.

For 3D printing, make sure your model is closed (no holes or gaps), dimensions are correct, and walls are thick enough to print (generally at least 0.5 mm for most printers). Test-print small parts first.

```js export-printable
const base = cuboid(40, 40, 5, { at: [0, 0, 2.5] })
const post = cylinder(6, 20, { at: [0, 0, 10] })
union(base, post)
fillet(post.edge('top', 'side'), 1)
```

A completed model ready for export: a base plate with a centred post and smooth top edge.
