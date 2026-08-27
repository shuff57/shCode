// In-app JSCAD reference — hand-authored against the @jscad/modeling API
// surface the curriculum actually uses (Q3–Q4: primitives, transforms,
// booleans, extrusions, hulls, measurements, colors, text, parameters,
// patterns, export). Every code example runs in the docs sandbox, which
// loads the vendored @jscad/modeling + @jscad/regl-renderer bundles from
// public/reshape/lib/ (see public/reshape/runner.html). Nothing loads from a CDN.
//
// The runner also pre-destructures every module into scope, so cube(...)
// works with no require() line. The examples here deliberately keep the
// require()/module.exports form anyway: that is the form that also runs on
// jscad.app, and it is what the reference teaches.
//
// Scope-out (stated explicitly so a future maintainer doesn't rediscover
// the boundary). Every section up to 'projects' is the taught surface. The
// final section, 'beyond', is the 17 exports the course does NOT teach —
// modifiers, minkowski, three more measurements, five more colour
// conversions and the utils helpers — documented as what they are: past the
// course, needed by no lesson, and there so that a student who goes looking
// finds something. Together those cover every function the fifteen modules
// export directly, which is what scripts/test-reshape-docs.mjs measures.
//
// What is still undocumented is one level deeper: the sub-namespaces
// (curves.bezier, geometries.geom3, maths.vec3, extrusions.slice,
// colors.cssColors). Those are the machinery the modules are built from,
// they are not counted by the coverage check, and nothing in Q3-Q4 needs
// them. If a future lesson does, add pages then.
//
// extrudeHelical is the deliberate omission worth naming, because
// docs/reference.md carried a row for it and that row was wrong: it named
// endAngle and segmentPoints, which the library does not have. The real
// options are { angle, startAngle, pitch, height, endOffset,
// segmentsPerRotation }, and a non-zero height silently overrides pitch.
// Springs and screw threads are not Q3-Q4 work, and teaching it honestly
// costs a page on pitch-vs-height plus the rule that the profile must sit
// clear of the axis. The row was removed rather than reproduced here.
//
// Note: the docs sandbox has no parameter panel — getParameterDefinitions
// examples run with main(params) falling back to defaults. The live
// parameter UI is a jscad.app feature.

import {
  searchDocs as coreSearchDocs,
  getSection as coreGetSection,
  getAllSectionSlugs as coreGetAllSectionSlugs,
  type DocPage,
  type DocSection,
  type DocSearchResult,
} from './docs-core';

export type { DocPage, DocSection, DocSearchResult };

export const sections: DocSection[] = [
  {
    slug: 'overview',
    title: 'Overview',
    pages: [
      {
        title: 'What is reSHape?',
        body: `reSHape builds 3D models out of code. Instead of pushing shapes around with a mouse, you describe the object and the code builds it. Change one number, run it again, and every part that depended on that number changes with it. That is parametric design: the model is a program, not a drawing.

Underneath it is JSCAD, a JavaScript library that does the same job with longer names and more punctuation around them. reSHape is twelve words laid over the top — box, rect, disc, ball, tube, cone, ring, poly, extrude, revolve, turn, sit — so that building a shape is a call with its measurements in it and nothing else. JSCAD comes back on the last page of this section, because that is where your model leaves this app.

There is nothing to bring in. All twelve names are in scope the moment your file runs, and so is the rest of the library behind them: translate and rotate move a shape, union and subtract glue shapes together and cut holes in them.

So the call below reads as plainly as it sounds. box(size, size, size / 4) is a box that wide, that deep, and a quarter as tall; tube(size / 8, size) is a rod of that radius and that height. Every reSHape program is one function called main that builds something and hands it back, and the next page takes that apart.`,
        code: `function main() {
  // Change this one number and every part below follows it.
  const size = 20

  const plate = box(size, size, size / 4)
  const post = tube(size / 8, size)

  // Both parts are built centred on the middle of the grid, which is why the
  // post pokes out underneath as well. "Where a shape sits" explains that.
  return [plate, post]
}`,
      },
      {
        title: 'The three lines around main()',
        body: `Every reSHape program is one function, called main, with nothing above it and nothing below it.

main must return one shape, or an array of shapes. Returning is the only thing that draws: build a shape and never hand it back and nothing appears — no error, no red bar, just an empty viewport.

There is no line at the top bringing the library in, because the names are already in scope, and no line at the bottom saying who to call, because the app looks for main by name. Spell it main, in lower case; Main and mian are the two usual ways to end up with No main() function found.

Two habits worth starting now. Give each part its own variable, named for what it is. And when there is more than one part, return them in an array: [plate, sphere] draws both. Below, the plate is 3 tall and straddles the floor, so its top face is at 1.5; add the ball's radius of 6 and 7.5 is where the ball has to sit to rest on it. Working that out is the next page's subject.`,
        code: `function main() {
  const plate = box(30, 30, 3)

  // The plate is 3 tall and sits astride the floor, so its top face is at 1.5.
  // Add the sphere's radius of 6 and the sphere rests on the plate.
  const sphere = translate([0, 0, 7.5],
    ball(6)
  )

  return [plate, sphere]
}`,
      },
      {
        title: 'What the browser does with your file',
        body: `Pressing Run kicks off four steps, and knowing them tells you where to look when something breaks.

1. The page loads the library from this app itself. Nothing comes off the internet, so it works offline.
2. Your file runs top to bottom. Definitions are read; no shape is built yet.
3. The runner calls main() and catches what comes back.
4. The result is drawn in the viewport.

Drag to orbit, hold Shift and drag to slide the view sideways, scroll to zoom. console.log output lands in the lesson editor's console panel, or your browser's own console (F12) where there is no panel. An error puts a red bar across the top of the viewport naming the problem and a line in script.js — the name this app gives your file.

Step 1 does one extra thing worth knowing about. Before your file runs it puts the twelve reSHape names in scope, and every name the library underneath has as well. So box(20, 20, 20) works, and so does the longer spelling that box was written to replace, and the two build exactly the same shape. This course writes the short one. The last page of this section is where the long one starts to matter.`,
        code: `function main() {
  console.log('main() is running')

  // The library underneath spells this one cuboid({ size: [20, 20, 20] }),
  // and that works here too. Same shape, more punctuation.
  const part = box(20, 20, 20)

  console.log('built it - now handing it back to be drawn')
  return part
}`,
      },
      {
        title: 'Where a shape sits: the origin',
        body: `Every shape you build starts centred on the origin — the point [0, 0, 0] where the three coloured lines meet. Red is X, green is Y, blue is Z.

Centred means centred in all three directions, up and down included. A cube of size 10 does not sit on the floor; it straddles it, 5 mm above and 5 mm below. Your first model looking half buried is not a bug, and it is the most common surprise there is.

translate([x, y, z], shape) hands back a copy moved by that much. To put something on the floor, lift it by half its height: a cube of size 10 needs translate([0, 0, 5], ...), and a plate 3 mm thick needs 1.5. That habit is what makes a model printable, because a printer builds upwards from a flat bed and has nothing to build the buried half onto.

Do that arithmetic by hand while it is still new. reSHape has sit(shape) for it — hand it a shape and it finds the lowest point and drops that onto the floor — but sit is a shortcut for a sum you should be able to do yourself, and it is worth meeting after the sum rather than instead of it.

X runs left and right, Y runs away from you and back, Z runs up and down. Numbers are millimetres, so a cube of size 10 is about a fingernail wide. The floor is ruled every 10 mm with finer lines every 1 mm. Sizes are written [x, y, z], and so are positions.`,
        code: `function main() {
  // Built where it lands: half of this one is under the floor.
  const buried = box(10, 10, 10)

  // The same cube, lifted by half its height so it sits on the floor,
  // and slid 20 to the right so you can see both at once.
  const sitting = translate([20, 0, 5],
    box(10, 10, 10)
  )

  return [buried, sitting]
}`,
      },
      {
        title: 'Shapes are values',
        body: `This is the idea that makes the rest of it make sense: a shape is a value, exactly like a number or a string.

You can put a shape in a variable, hand it to a function, or keep several in an array. Nothing appears on screen at the moment you build one. A shape is drawn only when main returns it.

That is also why translate is a function that takes a shape and gives one back. It does not move the shape you handed it; it hands you a moved copy, and the original is untouched and ready to use again. Below, one brick is built once and placed three times, and brick still holds the original when the last line runs.

So a reSHape program is really just this: make some values, combine them, return the result.`,
        code: `function main() {
  // One brick, built once and stored in a variable.
  const brick = box(20, 10, 5)

  // translate hands back a NEW brick each time, so the original is untouched
  // and the same variable can be used three times over. Each lift is 5 more
  // than the last, because the brick is 5 tall.
  const bottom = translate([0, 0, 2.5], brick)
  const middle = translate([0, 0, 7.5], brick)
  const top = translate([0, 0, 12.5], brick)

  return [bottom, middle, top]
}`,
      },
      {
        title: "When your first run doesn't work",
        body: `Four things go wrong on a first run more often than everything else put together, and each has a symptom you can read straight off the screen.

Red bar, No main() function found. The function is missing, or spelled Main, or mian. The runner looks for exactly main, in lower case.

Red bar, main() returned nothing. You built shapes and never handed them back — usually by pushing parts into an array and forgetting the return at the end. A return sitting inside an if that never ran does the same thing.

Red bar, box is not defined. A name you used is not in scope, and with nothing to bring in that means a typo: bxo for box, Ball for ball, cyl for tube. The names are case-sensitive, and the Primitives section lists all twelve.

Half the model is under the floor. Not an error, so no bar appears. Shapes are built centred on the origin; lift it with translate.

Then two habits. Print before you change anything, and change one thing at a time — changing three and running once tells you nothing about which one it was. When the trouble is the geometry rather than the skeleton around it, the Debugging section goes further.`,
        code: `function main() {
  const plate = translate([0, 0, 2],
    box(20, 20, 4)
  )
  const knob = translate([0, 0, 7],
    box(6, 6, 6)
  )

  const parts = []
  parts.push(plate)
  parts.push(knob)

  // If the viewport comes up empty, print the count before changing anything.
  console.log('returning', parts.length, 'shapes')

  return parts
}`,
      },
      {
        title: 'Taking your model to jscad.app',
        body: `jscad.app is the JSCAD editor the library's own authors run, and your file goes there unchanged as long as it has the require line and the export line.

Open https://jscad.app/ and drag your .js file onto the page, or paste the code into its editor. Same library, same functions, same numbers, same picture.

Two things you get there that this app does not have: an Export button, which writes an STL file for a 3D printer or a 3MF file for a colour one, and a parameter panel for designs that declare their own settings.

It works in the other direction too. An example from the JSCAD website, or a file from a classmate, pastes in here and runs — which makes this a good place to read somebody else's model a line at a time.

The tag below is a file worth taking over. subtract cuts the second shape out of the first, which is how the keyring hole gets made; the Booleans section covers it properly. The hole is deliberately taller than the plate so the cut goes all the way through, and the tag already sits on the floor, ready to print as it stands.`,
        code: `function main() {
  const thickness = 4

  const plate = translate([0, 0, thickness / 2],
    box(60, 20, thickness)
  )

  const hole = translate([-22, 0, thickness / 2],
    tube(3, thickness * 3)
  )

  return subtract(plate, hole)
}`,
      },
    ],
  },
  {
    slug: 'primitives',
    title: 'Primitives',
    pages: [
      {
        title: 'Your first solid',
        body: `A primitive is a ready-made shape. You call it by name, hand it the measurements, and get geometry back.

box() makes a box. Three numbers: width along X, depth along Y, height along Z. It is built around the origin, so box(30, 20, 10) runs from -15 to 15 across. Each big square on the viewer's grid is 10 units wide, so you can count it.

Anything beyond the measurements rides in an options object — settings inside curly braces, written after the numbers. center is the one you will reach for first: box(6, 6, 30, { center: [0, 0, 20] }) is the same post built somewhere else. The braces turn up only when the shape needs something it cannot exist without, which is why the first line you ever write has none.

main() must return a shape, or an array of shapes. The library underneath spells this one primitives.cuboid({ size: [30, 20, 10] }); every page in this section names its long form the same way, so that taking a model to jscad.app later is a lookup rather than a translation.`,
        code: `function main() {
  const slab = box(30, 20, 10)          // -15..15, -10..10, -5..5
  const post = box(6, 6, 30, { center: [0, 0, 20] })
  return [slab, post]
}`,
      },
      {
        title: 'A cube is a box with three equal numbers',
        body: `There is no separate cube. box(20, 20, 20) is one, and typing the number three times is the whole trick — no size array, no second function to remember.

That is worth dwelling on, because the library underneath does have two of them and they are where a first mistake usually happens. cube({ size: 20 }) takes a plain number; cuboid({ size: [20, 20, 20] }) takes an array; swap them and you get size must be an array of width, depth and height values. box has no array to get wrong.

It does count. box(10) stops with box needs three numbers: box(width, depth, height). The depth is missing. And box({ size: 20 }) — the object form, copied out of the real docs — is answered by name: box takes plain numbers: box(width, depth, height). The JSCAD version that takes a { } object is called cuboid.

One mistake gets no complaint from either. A zero is legal: box(20, 0, 20) builds a box with no faces at all and renders as nothing. If a shape vanishes, look for a zero.`,
        code: `function main() {
  // Three equal numbers is a cube. Change one and it is not.
  const solid = box(20, 20, 20)
  const slab = box(20, 20, 4, { center: [30, 0, 0] })
  return [solid, slab]
}`,
      },
      {
        title: 'ball, and what segments cost',
        body: `ball() takes a radius. A radius of 10 gives a ball 20 units across.

A computer cannot store a real curve, so it is faked with flat faces. segments is how many slices it cuts going around, and it is the option you will meet on nearly every round shape. The default is 32.

The price rises fast, as the comments below show. All three balls are exactly 20 units across — segments changes only how smooth it looks and how long everything after it takes to compute. Work at a low number and raise it once, at the end, before you save the model.

Underneath, ball is primitives.sphere({ radius: 10 }).`,
        code: `function main() {
  const rough = ball(10, { segments: 8, center: [-25, 0, 0] })   // 32 faces
  const plain = ball(10)                                    // 512 faces
  const smooth = ball(10, { segments: 64, center: [25, 0, 0] }) // 2048 faces
  return [rough, plain, smooth]
}`,
      },
      {
        title: 'geodesicSphere, a ball built from triangles',
        body: `geodesicSphere() is the other ball, and it is the first shape on these pages with no short name of its own. reSHape covers twelve; everything else in the library you call by the name it already has, exactly the way you call translate. Nothing is missing, the word is just longer.

Every one of its faces is a triangle of nearly the same size — a football, or a climbing wall — instead of a ball's stack of rings.

It ignores segments. Its detail knob is frequency, which must be six or more and rounds down to the nearest multiple of six: 12 and 17 both give the same 80 triangles, 6 gives 20, 18 gives 180, 24 gives 320.

It ignores center too, so the example below moves it with translate() instead. One more surprise: at frequency 6 a radius-10 ball measures 17.01 across, not 20, because 20 flat triangles cut the corners off.`,
        code: `function main() {
  const geo = geodesicSphere({ radius: 10, frequency: 12 })
  const round = ball(10, { segments: 16 })
  return [translate([-13, 0, 0], geo), translate([13, 0, 0], round)]
}`,
      },
      {
        title: 'ellipsoid, a ball stretched by axis',
        body: `ellipsoid() is a ball with a separate radius for each direction, and another of the library's own names. Its radius option is an array of three numbers — X, Y, Z — so radius [20, 10, 10] gives an egg 40 long, 20 wide and 20 tall.

Unlike ball() it will not take a plain number: ellipsoid({ radius: 5 }) stops with radius must be an array of X, Y and Z values.

Give it three equal radii and you get a ball — same 512 faces, same shape. So reach for it whenever a design might need squashing later: change one number in the array instead of swapping the shape out.`,
        code: `function main() {
  const egg = ellipsoid({ radius: [20, 10, 10] })
  const pebble = ellipsoid({ radius: [8, 8, 3], center: [0, 0, 20] })
  return [egg, pebble]
}`,
      },
      {
        title: 'tube, for posts and discs',
        body: `tube() needs a radius and a height. It stands up the Z axis and is centred on the origin, so tube(4, 40) reaches from -20 to 20 and measures 8 across.

segments works the same way it did on the ball, but the cost is far gentler: a tube spends three faces per segment — one panel of the side wall and a wedge of each end cap. So 8 segments is 24 faces where a ball at 8 already costs 32.

A short, wide tube is a disc. A tall, thin one is a post or a peg. Most of the holes you will ever cut are tubes too.

Underneath, tube is primitives.cylinder({ radius: 4, height: 40 }).`,
        code: `function main() {
  const post = tube(4, 40)   // 8 across, z -20..20, 96 faces
  const base = tube(20, 3, { center: [0, 0, -21] })
  return [post, base]
}`,
      },
      {
        title: 'cone, and oval tubes',
        body: `A tube has one radius all the way up. cone() has a radius at the bottom and a point at the top: cone(12, 30) is 24 across, 30 tall, and takes the same center and segments options everything else round does.

There is no tapering option on a tube, and no half-measure between the two. Worth saying plainly, because you will read otherwise: the library's cylinder({ radius: [12, 0] }) does not make a cone. It stops with radius must be positive.

Underneath, cone is cylinderElliptic — a shape with a pair of radii at each end, an X radius and a Y radius, which is more than cone's two numbers carry. That pair is what makes an oval tube: startRadius and endRadius of [15, 5] gives a tube 30 wide and 10 deep, as below. Ask cone for a startRadius and it hands you that call back, spelled out. Zeroing both ends of cylinderElliptic() fails too — at least one radius must be positive.`,
        code: `function main() {
  const point = cone(12, 30)
  const oval = cylinderElliptic({
    height: 30,
    startRadius: [15, 5],
    endRadius: [15, 5],
    center: [45, 0, 0]
  })
  return [point, oval]
}`,
      },
      {
        title: 'ring, the donut',
        body: `ring(ringRadius, tubeRadius) is a donut. The first number is the radius of the circle the tube travels along; the second is how thick the tube is.

So ring(10, 4) is 28 across overall, and the hole through the middle is exactly 12 across: a post of radius 6 slides through untouched, one of radius 6.2 does not.

Fix that order in your head, because the library underneath has it the other way about and names both radii misleadingly. torus({ outerRadius: 10, innerRadius: 4 }) is the same donut — its outerRadius is the travel circle, not the outside edge, and its innerRadius is the tube. ring exists to say those two things in the order you think them, and it catches the swap by name: ring(4, 10) stops with a tube 10 thick will not fit round a ring of radius 4 — ring(10, 4) is the one you meant.

ring takes no options at all, because the library's torus has none worth passing on: it has no center and no segments and drops both silently. So translate a ring to move it, and call torus itself when you want innerSegments and outerSegments.`,
        code: `function main() {
  const smooth = ring(10, 4)   // 2048 faces
  const chunky = torus({                                      // 128 faces
    outerRadius: 10,
    innerRadius: 4,
    innerSegments: 8,
    outerSegments: 8
  })
  return [translate([-16, 0, 0], smooth), translate([16, 0, 0], chunky)]
}`,
      },
      {
        title: 'Rounding the edges off a solid',
        body: `Real objects rarely have knife-sharp edges. box, rect and tube all take roundRadius — how big that curve is — and filing the edges down is the only thing it changes.

The outside size does not move. box(30, 20, 10, { roundRadius: 3 }) still measures 30 by 20 by 10. The face count does, because a curve has to be built from flat faces like every other curve: 614 instead of 6. Lower segments if that gets slow — 8 brings the same box down to 62.

The roundRadius has to fit, and the refusal comes back in your numbers rather than the library's. Too big on a box gives roundRadius 12 is too big for a 30 x 20 x 10 box — it must be less than 5. A tube has two ways to fail and answers each separately: too big for its radius, or too big for a tube 8 tall.

Underneath, roundRadius is what picks the second function. box becomes primitives.roundedCuboid, tube becomes primitives.roundedCylinder, rect becomes primitives.roundedRectangle; without one you get plain cuboid, cylinder and rectangle.`,
        code: `function main() {
  const pad = box(30, 20, 10, { roundRadius: 3 })                  // 614 faces, not 6
  const pill = tube(6, 30, { roundRadius: 3, center: [40, 0, 0] }) // 544 faces, not 96
  return [pad, pill]
}`,
      },
      {
        title: 'polyhedron, a solid you describe corner by corner',
        body: `When no ready-made shape fits, polyhedron() builds one from scratch. It is the library's own, with no short name here. points is a list of corners in 3D; faces says which of them to join, written as positions in that list, so [0, 1, 4] is the surface joining the first, second and fifth corner.

The square pyramid below has five corners and five faces — a four-cornered base and four triangles meeting at the tip. It comes out 20 by 20 by 15, volume 2000.

List each face's corners counter-clockwise as seen from outside. Nothing will warn you if you go the other way: the face quietly points inward, the volume still reads 2000, and the only clue is the picture. One thing is checked — if you pass colors, that list must be the same length as faces.`,
        code: `function main() {
  return polyhedron({
    points: [
      [-10, -10, 0], [10, -10, 0], [10, 10, 0], [-10, 10, 0],
      [0, 0, 15]
    ],
    faces: [
      [0, 3, 2, 1],
      [0, 1, 4], [1, 2, 4], [2, 3, 4], [3, 0, 4]
    ]
  })
}`,
      },
      {
        title: 'rect, the flat box',
        body: `The rest of the primitives are flat. They live in the XY plane with no thickness at all, and the Extrusions section is where they turn into solids.

Expect them to look wrong at first. A rect has a real width and height but a thickness of exactly 0, so from most camera angles it is a hairline. Spin the view until you are looking down on it.

rect(width, height) is the flat box: two numbers where box takes three, and the same options after them. center takes two numbers here rather than three, and roundRadius rounds the corners the same way it files the edges off a box. There is no separate square either — rect(20, 20) is one.

Underneath, rect is primitives.rectangle({ size: [30, 20] }), or roundedRectangle when it has a roundRadius. The library's square({ size: 20 }) takes a plain number rather than an array, which is the flat twin of the cube/cuboid confusion box does away with.`,
        code: `function main() {
  const wide = rect(30, 20)                                        // 4 corners
  const even = rect(20, 20, { center: [40, 0] })
  const soft = rect(30, 20, { roundRadius: 5, center: [-40, 0] })  // 36 corners
  return [wide, even, soft]
}`,
      },
      {
        title: 'disc, and ellipse',
        body: `disc(radius) is the flat version of the ball, and takes the same two options: center, and segments for how many corners it is really made of. The default is 32.

Here you can measure the lie. A true circle of radius 12 covers 452.4 square units; disc(12) covers 449.5 at the default 32 segments, 451.7 at 64, and only 374.1 at 6 — where you have plainly asked for a hexagon.

ellipse() is to disc what ellipsoid is to ball: its radius is an array, [across, up]. It is the library's own name, with no short form here. Everything you extrude, and every hole you cut, starts as one of these two.

Underneath, disc is primitives.circle({ radius: 12 }).`,
        code: `function main() {
  const hexagon = disc(12, { segments: 6, center: [-30, 0] })
  const round = disc(12)
  const squashed = ellipse({ radius: [20, 8], center: [40, 0] })  // 40 wide, 16 tall
  return [hexagon, round, squashed]
}`,
      },
      {
        title: 'poly, any outline you can list',
        body: `poly(points) draws whatever outline you can describe as a list of corners: an array of [x, y] pairs, walked in order, with the last joined back to the first for you.

The L below is six corners, 30 by 25, covering 594 square units.

Walk the corners counter-clockwise. Go round the other way and it still builds, but the area comes back as -594 instead of 594 — a negative area means an outline drawn inside-out, which will confuse anything you feed the shape into later.

Two corners is not an outline, and poly says so in those words: poly needs at least three corners to enclose anything. You gave it two. Underneath is primitives.polygon({ points: [...] }), which answers the same mistake with list of points 0 must contain three or more points — naming a list index you never wrote, which is the reason poly checks first. polygon is the one to call when you want several outlines at once, or control over their orientation.`,
        code: `function main() {
  return poly([[0, 0], [30, 0], [30, 12], [18, 12], [18, 25], [0, 25]])
}`,
      },
      {
        title: 'triangle, by sides or by angles',
        body: `triangle() is the one primitive you describe the way a geometry class would, and another of the library's own names. type is three letters — S for a side you know, A for an angle you know, in the order you list them — and values holds those three numbers. Angles are in radians, so a half turn is Math.PI.

type 'SSS' with [30, 40, 50] is the classic right triangle, exactly 30 by 40. type 'ASA' with [PI/3, 30, PI/3] is a 60 degree angle, a 30-unit side, another 60 degree angle: 30 wide, 25.98 tall.

It checks your arithmetic: sides that cannot close give SSS triangle is incorrect, as the longest side is longer than the sum of the other sides, and angles that do not add up give ASA triangles require angles that sum to PI. With no options at all you get a triangle 1 unit wide — easy to lose.`,
        code: `function main() {
  const sides = triangle({ type: 'SSS', values: [30, 40, 50] })
  const angles = triangle({ type: 'ASA', values: [Math.PI / 3, 30, Math.PI / 3] })
  return [sides, translate([50, 0], angles)]
}`,
      },
      {
        title: 'star',
        body: `star() takes vertices for how many points it has, outerRadius out to the tips and innerRadius in to the valleys between them. A five-pointed star is ten corners: a tip, a valley, a tip, a valley, all the way round. It is the library's own name, like triangle.

outerRadius 15 does not give you a shape 30 across. It comes out 27.1 by 28.5, because on a five-pointed star no tip sits directly opposite another one.

Leave innerRadius out and one is worked out from density — how many points to skip as you draw, the way you draw a star without lifting your pen. The default is 2, and density must be two or more. Ask for 4 on a five-pointed star and the lines fold back over each other: it builds without complaint and covers zero area.`,
        code: `function main() {
  const sheriff = star({ vertices: 5, outerRadius: 15, innerRadius: 7, center: [-40, 0] })
  const spiky = star({ vertices: 5, outerRadius: 15 })   // no innerRadius: density 2
  const gear = star({ vertices: 12, outerRadius: 15, innerRadius: 12, center: [40, 0] })
  return [sheriff, spiky, gear]
}`,
      },
      {
        title: 'arc and line are paths, not shapes',
        body: `The last two primitives give back something different. arc() and line() make a path: a line you could draw with a pen, with no inside to it. Everything else on these pages is a shape with an inside. Both are the library's own names.

arc() takes radius, startAngle and endAngle in radians, plus segments. line() takes a bare array of points and no options object at all — line({ points: [...] }) stops with points must be an array.

A path has no area, so an open one cannot be extruded: extrude() on one gives extruded path must be closed. Called with no options arc() draws a whole circle, and that one is closed. When what you want is a filled outline rather than a stroke, use poly().`,
        code: `function main() {
  // a quarter turn: 7 points, running from [20, 0] round to [0, 20]
  const curve = arc({ radius: 20, startAngle: 0, endAngle: Math.PI / 2, segments: 24 })
  const zigzag = line([[-45, 0], [-35, 15], [-25, 0], [-15, 15]])   // a bare array
  const solid = poly([[10, -12], [34, -12], [34, 12], [10, 12]])
  return [curve, zigzag, solid]
}`,
      },
    ],
  },
  {
  slug: 'transforms',
  title: 'Transforms',
  pages: [
    {
      title: 'A transform hands back a new shape',
      body: `A transform is a function that takes a shape and gives you back a changed copy of it. It never touches the shape you handed it.

That one sentence is the whole mental model. translate([0, 0, 8], brick) does not move brick. It builds a second brick, 8 mm higher, and hands that to you. The first brick is still exactly where it was, ready to be used again.

So a shape is worth keeping in a variable. Build a part once, then make as many placed copies of it as you like — every copy costs you one line and the original never gets used up.

If you ever write translate([0, 0, 8], brick) on a line of its own and wonder why nothing moved: nothing was meant to. The copy was made and then thrown away, because you did not keep it.`,
      code: `function main() {
  const brick = box(24, 10, 4)

  // Each of these is a NEW brick. The original is untouched.
  const middle = translate([0, 0, 8], brick)
  const top = translate([0, 0, 16], brick)

  return [brick, middle, top]
}`,
    },
    {
      title: 'translate: sliding a shape',
      body: `translate([x, y, z], shape) slides a shape without turning it or resizing it. The three numbers are how far to go along each axis, in millimetres, and any of them can be negative.

Notice the order of the two arguments: the settings come first and the shape comes last. Every transform in the library is written that way, so once you have the pattern you have all of them.

A 2D shape takes two numbers instead of three — translate([10, 5], disc) — because a flat shape has no Z to move along.

This is how a design with several parts gets assembled: build each part at the origin, where the numbers are easy to think about, then translate it into its place in the finished object.`,
      code: `function main() {
  const leg = box(6, 6, 30, { center: [0, 0, 15] })

  const parts = []
  for (const x of [-20, 20]) {
    for (const y of [-20, 20]) {
      parts.push(translate([x, y, 0], leg))
    }
  }

  parts.push(translate([0, 0, 32],
    box(56, 56, 4)
  ))
  return parts
}`,
    },
    {
      title: 'Moving along one axis',
      body: `Most moves only go one way, and writing two zeroes to say so gets tiring.

- translateX(distance, shape) is translate([distance, 0, 0], shape).
- translateY(distance, shape) is translate([0, distance, 0], shape).
- translateZ(distance, shape) is translate([0, 0, distance], shape).

They are not new powers, just shorter spellings of one you already have. A stack of plates reads better as translateZ(12, plate) than as translate([0, 0, 12], plate), because the one number on the screen is the one number that matters.

Where the long form wins is a diagonal move, or placing a part with all three coordinates at once. One translate([x, y, z], part) beats three calls chained together.`,
      code: `function main() {
  const plate = box(40, 40, 3)

  const stack = [plate]
  for (const height of [10, 20, 30]) {
    stack.push(translateZ(height, plate))
  }

  // The long form is the one to reach for when more than one axis moves.
  stack.push(translate([60, 0, 15], plate))
  return stack
}`,
    },
    {
      title: 'rotate: turning a shape',
      body: `rotate([x, y, z], shape) turns a shape around all three axes at once, and there is a shortcut for each axis on its own: rotateX(angle, shape), rotateY(angle, shape), rotateZ(angle, shape).

Picture each one as a skewer through the shape. rotateZ spins it like a record on a turntable. rotateX tips it forward, the way a book tips off a shelf. rotateY rolls it sideways.

Angles are in radians, not degrees. A full turn is 2 * Math.PI, a half turn is Math.PI, and a quarter turn is Math.PI / 2. Those three cover most of what you need; the next page deals with the awkward angles in between.`,
      code: `function main() {
  const bar = box(40, 6, 2)

  const flat = translateY(-20, bar)
  const tipped = rotateX(Math.PI / 2, bar)
  const turned = translateY(20, rotateZ(Math.PI / 2, bar))

  return [flat, tipped, turned]
}`,
    },
    {
      title: 'Turning by degrees',
      body: `Nobody thinks in radians. An angle like 37 degrees is a calculator trip every single time, and the number you end up typing tells the next reader nothing.

degToRad(degrees) does the conversion, so you can write the angle you actually mean. degToRad(90) is a quarter turn. degToRad(30) is a twelfth of a circle. There is a matching radToDeg(radians) for going back the other way, which is mostly for printing an angle you worked out.

Careful with one name. Written on its own inside this app, utils is the top-level utils module, and that is the one that owns degToRad. The maths module has a utils of its own that does not; reach that one as 

In the example the hand is built running out from the middle, so turning it sweeps a clock face rather than spinning on the spot.`,
      code: `function main() {
  // Built from the middle outwards, so a turn sweeps it like a clock hand.
  const hand = box(30, 3, 3, { center: [15, 0, 0] })

  console.log('90 degrees is', degToRad(90), 'radians')

  const clock = []
  for (const deg of [0, 30, 60, 90, 120, 150]) {
    clock.push(rotateZ(degToRad(deg), hand))
  }
  return clock
}`,
    },
    {
      title: 'Rotation swings around the origin',
      body: `A rotation always happens around the origin, the point [0, 0, 0] where the coloured axis lines meet. It does not happen around the middle of the shape. That one fact is behind most of the transform bugs you are going to write.

A shape sitting at the origin spins on the spot. Move it 50 mm away first and the same rotation swings it around in a wide arc, like a conker on the end of a string.

So these two lines do completely different things:

- rotateZ(a, translate([50, 0, 0], arm)) — move it out, then swing it around the middle.
- translate([50, 0, 0], rotateZ(a, arm)) — spin it where it stands, then move it out.

Neither is wrong. Swinging is how you arrange parts in a ring; spinning in place is how you tilt one part of an assembly. Just decide which one you meant, and read the line from the inside out to check.`,
      code: `function main() {
  const arm = box(30, 6, 6)

  // Moved out first, so the turn swings it around the origin.
  const swung = rotateZ(Math.PI / 4, translate([50, 0, 0], arm))

  // Turned first, so it spins on the spot and then moves out.
  const spun = translate([-50, 0, 0], rotateZ(Math.PI / 4, arm))

  return [arm, swung, spun]
}`,
    },
    {
      title: 'scale: bigger, smaller, squashed',
      body: `scale([x, y, z], shape) multiplies a shape along each axis. The three numbers are multipliers, not millimetres.

- scale([2, 2, 2], shape) is twice the size in every direction.
- scale([0.5, 0.5, 0.5], shape) is half.
- scale([3, 1, 1], shape) is three times as wide and exactly as deep and tall as it was, which is how a circle becomes an oval.

A multiplier of 1 means leave that axis alone, so two of the three numbers are usually 1. The single-axis shortcuts say the same thing more briefly: scaleX(f, shape), scaleY(f, shape), scaleZ(f, shape).

Scaling a solid scales everything about it, including wall thickness and hole diameters. A case scaled up by 2 has holes twice as wide, which is rarely what anyone wanted — resize a part by changing the numbers you built it from, and keep scale for squashing and stretching.`,
      code: `function main() {
  const block = box(16, 16, 16)

  const wide = translateX(-45, scale([2, 1, 1], block))
  const tall = translateX(45, scaleZ(2, block))

  return [block, wide, tall]
}`,
    },
    {
      title: 'Scaling moves a shape as well',
      body: `Scaling multiplies every point of a shape by your number, and where the shape sits is made of points too. So a shape that is not at the origin does not only get bigger — it also moves further away from the origin.

Measure it and the surprise goes away. The ball below is built 30 mm out along X, so it runs from 20 to 40. Scaled by 2 it runs from 40 to 80: twice as wide, and its middle has moved from 30 out to 60. Run the example and read the two lines the console prints.

That is not a bug, it is what multiplying by 2 means. It does explain the classic mess, where scaling one part of an assembly sends it flying off to somewhere it was never meant to be.

The habit that avoids it: scale a shape while it is still at the origin, and translate it into place afterwards. Same rule as rotation, and the same reason.`,
      code: `function main() {
  const sphere = ball(10, { segments: 24, center: [30, 0, 0] })
  const doubled = scale([2, 2, 2], sphere)

  console.log('before:', measureBoundingBox(sphere))
  console.log('after :', measureBoundingBox(doubled))

  return [sphere, doubled]
}`,
    },
    {
      title: 'mirror: building the other half',
      body: `Plenty of objects are symmetric: a bracket, a pair of clips, a game controller. Modelling both halves is twice the work and twice the chances of getting one of them slightly wrong.

mirrorX(shape) hands you the shape flipped left-to-right, across the plane that runs through the origin facing X. mirrorY(shape) flips it front-to-back, and mirrorZ(shape) flips it top-to-bottom.

The trick is where you build the first half. Build it entirely on one side of the origin, so the mirror line falls exactly where the two halves are meant to meet. A half that straddles the origin comes back overlapping itself.

Mirroring is not the same as turning. A mirrored part is a reflection, like your left hand against your right, and no amount of rotating will make one sit on top of the other.`,
      code: `function main() {
  // Both pieces are built entirely to the left of x = 0.
  const wall = box(8, 40, 20, { center: [-16, 0, 10] })
  const foot = box(24, 40, 4, { center: [-12, 0, 2] })

  const rightWall = mirrorX(wall)
  const rightFoot = mirrorX(foot)

  return [wall, foot, rightWall, rightFoot]
}`,
    },
    {
      title: 'Mirroring across any plane',
      body: `The three shortcuts flip across a plane through the origin. The long form lets you choose the plane yourself: mirror({ normal: [x, y, z], origin: [x, y, z] }, shape).

normal is the direction the mirror faces, not a line drawn on it — [0, 1, 0] is a mirror facing along Y, so the shape gets flipped front-to-back. origin is any point the mirror passes through, and it defaults to [0, 0, 0]. In the example the mirror faces Y and stands at [0, 10, 0], right where the wall is, and it sends a tab that ran from y = 20 to y = 30 across to y = 0 to y = -10: the same 10 mm clear of the wall, on the other side.

One trap, because it does not announce itself. The options object belongs to the long form only. Hand one to a shortcut — mirrorX({ normal: [1, 0, 0] }, half) — and the shortcut takes that object for a second shape to mirror. Nothing throws. Back comes an array holding your options object and one correctly mirrored shape, and the viewport ignores the object and draws the shape, so at a glance it looks fine. The damage lands at the next step: union that array and you get an empty solid, measuring [[0,0,0],[0,0,0]]. A symmetric part that measures as nothing is the symptom to look for.`,
      code: `function main() {
  const wall = box(40, 2, 12, { center: [0, 10, 6] })
  const tab = box(30, 10, 4, { center: [0, 25, 2] })

  // A mirror facing Y, standing at y = 10 — the plane the wall sits on.
  const flipped = mirror({ normal: [0, 1, 0], origin: [0, 10, 0] }, tab)

  return [wall, tab, flipped]
}`,
    },
    {
      title: 'center: putting a shape back in the middle',
      body: `center({}, shape) moves a shape so the middle of it lands on the origin. The empty options object means take the defaults, which is all three axes at once.

That is worth having because rotation and scaling both work from the origin. A shape you have already moved somewhere will swing or fly when you transform it; centre it first, transform it, then move it back into place.

You can centre one axis at a time, either with options — center({ axes: [true, false, false] }, shape) leaves Y and Z where they are — or with the shortcuts centerX(shape), centerY(shape), centerZ(shape).

Hand center several shapes at once and it centres each one separately, so they all end up stacked on the origin instead of keeping their spacing. That is almost never what an assembly wants. align, on the next page, is the tool for lining several parts up.`,
      code: `function main() {
  const off = box(20, 10, 6, { center: [30, 12, 9] })

  const middled = center({}, off)
  const dropped = centerZ(off)

  console.log('before:', measureBoundingBox(off))
  console.log('after :', measureBoundingBox(middled))

  return [off, middled, dropped]
}`,
    },
    {
      title: 'align: lining parts up',
      body: `align({ modes: [x, y, z] }, ...shapes) lines shapes up on the axes you name. Each axis gets one of four words:

- 'min' — the low edge of the shape lands on the line.
- 'max' — the high edge lands on it.
- 'center' — the middle lands on it.
- 'none' — leave that axis exactly as it is.

The line is the origin unless you say otherwise. So modes ['none', 'none', 'min'] leaves X and Y alone and drops every shape until its lowest point is at z = 0: three parts of three different heights, all resting flat on the grid, in one call and with no arithmetic.

Write the modes out even when the defaults would do. Called with no modes at all it uses ['center', 'center', 'min'], which is a sensible default and an invisible one.

The measurements section does this same job by hand — measure the bounding box, then translate up by -box[0][2]. Keep both. Measuring hands you the number, and a number can be used in arithmetic; align is the shorter road when all you want is the part on the floor.`,
      code: `function main() {
  const shortOne = box(16, 16, 10, { center: [-30, 0, 25] })
  const middleOne = box(16, 16, 24, { center: [0, 0, 40] })
  const tallOne = box(16, 16, 40, { center: [30, 0, 5] })

  // Leave X and Y alone; drop each one until it rests on the grid.
  return align(
    { modes: ['none', 'none', 'min'] }, shortOne, middleOne, tallOne
  )
}`,
    },
    {
      title: 'Aligning against a point',
      body: `The origin is not always the line you want to line up against. relativeTo moves it: align({ modes, relativeTo: [x, y, z] }, shape) lines the shape up against your point instead.

Any axis you are not interested in gets null, and null means leave that coordinate of the line alone. relativeTo: [null, null, 42] with modes ['none', 'none', 'min'] reads as one sentence — put the bottom of this part at z = 42 and do not touch X or Y. That is how a boss lands exactly on top of a shelf.

There is one more option worth knowing about before you need it. By default each shape is aligned on its own, which is what let the previous page drop three separate towers onto the grid. Add grouped: true and the shapes move together as one set, keeping the gaps between them — which is what you want when the thing being aligned is a finished assembly rather than a pile of parts.`,
      code: `function main() {
  const shelf = box(60, 30, 4, { center: [0, 0, 40] })
  const boss = box(10, 10, 14, { center: [20, 8, 0] })

  // The top of the shelf is at z = 42. Put the bottom of the boss there.
  const seated = align(
    { modes: ['none', 'none', 'min'], relativeTo: [null, null, 42] }, boss
  )

  return [shelf, seated]
}`,
    },
    {
      title: 'transform: a move you can keep',
      body: `Every transform on the pages before this one is the same machinery underneath. A move, a turn and a scale are all stored as a matrix: a list of sixteen numbers describing one change of position. mat4 is the module that builds them, and transform(matrix, shape) applies one to a shape.

mat4.create() makes an empty matrix, which means do nothing. The builders fill it in: mat4.fromTranslation(mat4.create(), [0, 0, 12]) is a matrix meaning go up 12 mm. There is fromXRotation, fromYRotation, fromZRotation and fromScaling to match.

The odd part of the spelling is that the first argument is where the answer gets written. The builder fills that matrix in and then hands it back, which is why mat4.create() sits inside the call.

Doing it this way buys you one thing: the move becomes a value. You can name it, keep it in an array, pass it to a function, and apply the identical move to twenty different parts knowing every one of them got exactly the same treatment.`,
      code: `function main() {
  // One move, stored: up 12 mm. Now it has a name.
  const lift = mat4.fromTranslation(mat4.create(), [0, 0, 12])

  const cuboid = box(12, 12, 4)
  const sphere = ball(5, { segments: 24 })

  return [
    cuboid,
    transform(lift, cuboid),
    translateX(30, transform(lift, sphere)),
  ]
}`,
    },
    {
      title: 'Two matrices in one',
      body: `Two matrices can be joined into a single one that does both jobs: mat4.multiply(mat4.create(), first, second). Again, the first argument is where the answer is written.

The rule to remember is that the rightmost matrix happens first. multiply(out, move, spin) means spin the shape, then move it — the same result as writing translate([50, 0, 0], rotateZ(a, bar)), which also reads from the inside out.

Swap the two and you get a different object, not a different spelling of the same one. The example prints both bounding boxes: spin-then-move leaves the bar out at x = 50 pointing along Y, while move-then-spin swings the whole thing round so it sits out at y = 50 instead. That is the arc-versus-spin page again, in matrix form.

You do not need any of this to build things — the named transforms do everything a lesson asks for. It starts being worth the trouble when the same combined move is applied over and over, because a joined matrix is one step where nested calls are two.`,
      code: `function main() {
  const bar = box(30, 6, 6, { center: [15, 0, 0] })

  const spin = mat4.fromZRotation(mat4.create(), Math.PI / 2)
  const move = mat4.fromTranslation(mat4.create(), [50, 0, 0])

  // Rightmost first: spin, then move.
  const spinThenMove = mat4.multiply(mat4.create(), move, spin)
  // The other way round: move, then spin.
  const moveThenSpin = mat4.multiply(mat4.create(), spin, move)

  const a = transform(spinThenMove, bar)
  const b = transform(moveThenSpin, bar)

  console.log('spin then move:', measureBoundingBox(a))
  console.log('move then spin:', measureBoundingBox(b))

  return [bar, a, b]
}`,
    },
  ],
},
  {
  slug: 'booleans',
  title: 'Booleans',
  pages: [
    {
      title: 'union',
      body: `union(a, b) glues shapes together and hands back one solid. Not two shapes touching each other — one shape, with no wall between them any more.

The console shows what that costs. Measure the bar and the post on their own and the volumes add up to 189000. The union is 162000, because the part where they overlap belongs to one solid now and is only counted once.

Change the 30 in translateZ to 80 so the two never touch. union still returns one solid, and now the two numbers match.

union takes as many shapes as you like: union(a, b, c).`,
      code: `function main() {
  const bar = box(120, 30, 30)
  const post = translateZ(30,
    box(30, 30, 90)
  )

  const merged = union(bar, post)

  const apart = measureVolume(bar) + measureVolume(post)
  console.log('measured separately:', Math.round(apart))
  console.log('after union:', Math.round(measureVolume(merged)))

  return merged
}`,
    },
    {
      title: 'subtract',
      body: `subtract(base, cutter) takes a bite out of the first shape wherever the second one overlaps it. That is how every hole gets made.

The cutter is not part of the finished object. It is a shape you build only to describe the missing bit, and it is gone the moment the cut happens — nothing of it is drawn.

Nothing says a cutter has to be round, either. A box cuts a slot, a star cuts a star.

Change radius from 20 to 35 and the hole grows with it.`,
      code: `function main() {
  const plate = box(120, 80, 12)

  // Taller than the plate on purpose. Two pages on is about why.
  const drill = tube(20, 40, { segments: 48 })

  return subtract(plate, drill)
}`,
    },
    {
      title: 'Order matters',
      body: `subtract is the one boolean where swapping the two shapes changes the answer.

subtract(plate, drill) is a plate with a hole in it. subtract(drill, plate) is the drill with a plate-shaped slice bitten out of it — a much smaller object, and almost never the one anybody wanted. The console prints both volumes, so you can see they are two different objects rather than two views of one.

union and intersect do not care. union(a, b) and union(b, a) are the same solid.

Swap the two names in the return line to look at the other one.`,
      code: `function main() {
  const plate = box(120, 80, 12)
  const drill = tube(20, 40, { segments: 48 })

  const plateWithHole = subtract(plate, drill)
  const drillWithBite = subtract(drill, plate)

  console.log('subtract(plate, drill):', Math.round(measureVolume(plateWithHole)))
  console.log('subtract(drill, plate):', Math.round(measureVolume(drillWithBite)))

  return plateWithHole
}`,
    },
    {
      title: 'Make the cutter longer than the material',
      body: `A cutter should reach past the material at both ends.

One exactly as tall as the plate does cut — but it leaves you no room. Move either shape by 2 mm, because you changed the thickness or centred it somewhere else, and the cut stops short. That is what short does here: it misses the top face by 2 mm and leaves a lid over the hole, which is why the viewport shows a plate with no hole in it.

The console counts the damage: 102669 against 100163 is 2506 cubic mm that should have been drilled away and was not.

The extra length costs nothing — it is thrown away with the rest of the cut. Change short to through in the return line and the hole opens.`,
      code: `function main() {
  const plate = box(120, 80, 12)

  // Same height as the plate, and 2 mm out of line.
  const short = translateZ(-2,
    tube(20, 12, { segments: 48 })
  )

  // Longer at both ends. Nothing to line up, so nothing to get wrong.
  const through = tube(20, 40, { segments: 48 })

  console.log('cutter the same height:', Math.round(measureVolume(subtract(plate, short))))
  console.log('cutter made longer:', Math.round(measureVolume(subtract(plate, through))))

  return subtract(plate, short)
}`,
    },
    {
      title: 'intersect',
      body: `intersect(a, b) keeps only the part where every shape overlaps. Anything belonging to just one of them is thrown away.

That makes it the tool for trimming. Here a 200 mm rod stands up through a 40 mm slab. Neither shape survives whole: what comes back is the slice of rod that was inside the slab and nothing else — a 40 mm puck.

The console prints the rod's volume and the puck's, so you can see how much of it went.

Change the slab's 40 to 160 and the puck grows into most of the rod.`,
      code: `function main() {
  const rod = tube(45, 200, { segments: 48 })
  const slab = box(140, 140, 40)

  const puck = intersect(rod, slab)

  console.log('the whole rod:', Math.round(measureVolume(rod)))
  console.log('the shared part:', Math.round(measureVolume(puck)))

  return puck
}`,
    },
    {
      title: 'When a boolean gives back nothing',
      body: `A boolean can succeed and still hand you an empty solid. Nothing is drawn, no red error appears, and the viewport simply looks broken.

The two blocks here are stacked 120 mm apart, so they share no volume at all, and intersect gives back a solid with nothing inside it. measureVolume prints 0, and that number is how you tell an empty result from a shape that is merely off screen.

subtract does the same thing whenever the cutter covers the whole of the base.

Return shared on its own instead of the array, and the viewport goes completely empty.`,
      code: `function main() {
  const lower = box(80, 80, 40)
  const upper = translateZ(120,
    box(80, 80, 40)
  )

  const shared = intersect(lower, upper)
  console.log('volume of the shared part:', measureVolume(shared))

  return [lower, upper]
}`,
    },
    {
      title: 'scission: taking a solid apart',
      body: `scission(solid) is the odd one out. Every other boolean puts shapes together; this one takes a solid apart.

Cut a bar in half and JSCAD does not hand you two objects. The viewport shows two lumps, but measure it and it is still one solid 140 mm long — that is the distance from one far end to the other, straight across the gap.

scission finds the separate lumps and hands them back in an array. Each one measures 65 mm, and main() can return that array exactly as it comes.

Give scission a solid that is already in one piece and you get an array of one.`,
      code: `function main() {
  const bar = box(140, 40, 20)
  const saw = box(10, 60, 40)

  // One solid, even though it now holds two lumps that never touch.
  const cut = subtract(bar, saw)
  console.log('the cut bar measures:', measureDimensions(cut))

  const pieces = scission(cut)
  console.log('pieces found:', pieces.length)
  console.log('one piece measures:', measureDimensions(pieces[0]))

  return pieces
}`,
    },
    {
      title: 'Build, cut, then paint',
      body: `Colour is display information, and a boolean throws it away.

colorize gives a shape a colour, and that colour survives every transform — move a red part, turn it, scale it, and it is still red. It does not survive union, subtract or intersect. Each of those builds a brand new solid and hands it back with no colour on it at all, and nothing warns you.

So the order is: build the parts, do the booleans, colorize what comes out. Paint first and you get an orange part and no explanation.

The console prints undefined for the plate that was painted too early, and the four numbers of tomato for the one painted last.`,
      code: `function main() {
  const plate = box(120, 80, 12)
  const drill = tube(20, 40, { segments: 48 })

  // colorize wants an array of numbers, so turn the name into one first.
  const tomato = colorNameToRgb('tomato')

  const paintedTooEarly = subtract(colorize(tomato, plate), drill)
  console.log('painted, then cut:', paintedTooEarly.color)

  const paintedLast = colorize(tomato, subtract(plate, drill))
  console.log('cut, then painted:', paintedLast.color)

  return paintedLast
}`,
    },
  ],
},
  {
  slug: 'extrusions',
  title: 'Extrusions',
  pages: [
    {
      title: 'From flat to solid',
      body: `An extrusion takes a flat drawing and gives it thickness. The flat drawing is called a profile — a rect, a disc, a poly, any 2D shape lying on the grid.

There are two reSHape names for it. extrude pushes a profile straight up; revolve spins it around. Everything else in this section is the library's own, called by the name it already has, and each one differs only in the direction of the push.

Below are two shapes: the profile on its own, still flat, and the solid that extrude made out of it. The outline did not change at all. It only gained a third dimension.`,
      code: `function main() {
  const outline = rect(40, 20)
  const solid = extrude(8, outline)

  return [
    translateX(-40, outline),
    translateX(40, solid)
  ]
}`,
    },
    {
      title: 'extrude',
      body: `extrude(height, profile) pushes a profile straight up and hands back a solid. The profile becomes the bottom face, a copy of it becomes the top face, and flat sides join the two.

The height comes first and comes plain — no braces anywhere in the call. Change that one number and the same outline is a thin badge or a tall post, with nothing else in the file touched, which is most of the reason for designing in code rather than by dragging.

Below, one disc is extruded twice at two different heights. The disc itself is written once.

Underneath, extrude is extrusions.extrudeLinear({ height: 3 }, profile). That call takes its object first, so a student who writes extrude({ height: 3 }, profile) is told which function that spelling belongs to rather than left with a message about the height.`,
      code: `function main() {
  const badge = disc(12, { segments: 48 })

  return [
    translateX(-20, extrude(3, badge)),
    translateX(20, extrude(45, badge))
  ]
}`,
    },
    {
      title: 'An extrusion sits on the grid',
      body: `Primitives are built around the origin: tube(10, 20) reaches from z = -10 up to z = +10, half of it below the grid. An extrusion does not do that. It starts at z = 0 and grows upward, so the same 20 of height lands entirely above the grid.

Neither behaviour is wrong, but mixing the two without noticing is how parts end up half sunk into one another.

To centre an extrusion the way a primitive is centred, move it down by half its height with translateZ. All three shapes below are 20 tall. The other way round — putting a primitive on the floor rather than an extrusion in the middle — is what sit is for.`,
      code: `function main() {
  const outline = disc(10, { segments: 48 })
  const post = extrude(20, outline)

  return [
    translateX(-25, post),
    tube(10, 20, { segments: 48 }),
    translateX(25, translateZ(-10, post))
  ]
}`,
    },
    {
      title: 'Cut the detail while it is still flat',
      body: `Do your cutting in 2D, before the extrude, not after it.

A hole cut into a flat outline is a subtract over a handful of edges. The very same hole cut through a finished solid is a subtract over every triangle in the model — slower to compute, and much easier to get subtly wrong along the way.

So learn the whole thing as one move: draw the outline, subtract the details, extrude once at the end. The plate below is one rect, one disc taken out of it, and one extrude. Reordering those three lines would cost you nothing but time.`,
      code: `function main() {
  const plate = rect(50, 30)
  const hole = disc(6, { segments: 32 })

  const outline = subtract(plate, hole)

  return extrude(6, outline)
}`,
    },
    {
      title: 'It has to be a flat shape',
      body: `extrude needs a 2D profile, and hand it a solid instead and it stops: extrude needs a flat 2D shape — you gave it a solid. Build the flat outline first (rect, disc, or a boolean of them), then extrude that.

That refusal exists because the library underneath does not complain. extrudeLinear hands the very same solid straight back, unchanged — no error message to read, nothing in the viewer to see, and an extrude that appears to have done nothing at all. A shape you already extruded once, or a box you built by mistake, sails through untouched.

Below, the flat square grows into a tall post. The box, put through the library's extrudeLinear on the very next line, comes back a box.`,
      code: `function main() {
  const flat = rect(20, 20)
  const solid = box(20, 20, 20)

  // extrude(40, solid) would stop here instead, and say why.
  return [
    translateX(-20, extrude(40, flat)),
    translateX(20, extrudeLinear({ height: 40 }, solid))
  ]
}`,
    },
    {
      title: 'Twisting on the way up',
      body: `A twist turns the top face relative to the bottom one on the way up. extrude has no options object at all, so this is one of the places you step down to the library: extrudeLinear({ height, twistAngle, twistSteps }, profile). Ask extrude for a twistAngle and it hands you that call spelled out.

twistSteps says how many layers to build on the way up. More steps, smoother twist; too few and you can count the flats.

Angles in the library are measured in radians, not degrees. Rather than memorise what a half turn is in radians, write degToRad(180) and let it do the conversion. Every angle in this section works that way, so the number you read in the code is always the number you meant. reSHape's own turn is the exception — it takes degrees, because it was written for the common case.

A twist also widens the shape, because the corners of the profile swing outward as they turn.`,
      code: `function main() {
  const bar = rect(20, 20)

  const straight = extrude(60, bar)
  const twisted = extrudeLinear({
    height: 60,
    twistAngle: degToRad(180),
    twistSteps: 24
  }, bar)

  return [
    translateX(-20, straight),
    translateX(20, twisted)
  ]
}`,
    },
    {
      title: 'revolve',
      body: `revolve(profile) spins a profile all the way round to make a solid that is round about one axis — a vase, a bowl, a knob, a wheel.

Picture the profile as one slice cut through the finished object and then laid out flat on the page. How far it sits from the vertical line x = 0 becomes its radius in the solid, and how tall it stands on the page becomes how tall the solid is.

The profile below is the wall and the floor of a vase, drawn as if you had sliced the vase in half and were looking at the cut. Spin it and you get the whole vessel — hollow inside, closed underneath — with no subtract anywhere.

revolve is the one name whose options object trades places with the library's. revolve(profile, { segments: 48 }) is extrusions.extrudeRotate({ segments: 48 }, profile), because everything in reSHape puts its extras last. Write the library's order by mistake and you are told which function that spelling belongs to.`,
      code: `function main() {
  const profile = poly([
    [0, 0], [14, 0], [14, 4], [11, 6], [11, 26], [14, 28], [10, 28], [10, 3], [0, 3]
  ])

  return revolve(profile, { segments: 48 })
}`,
    },
    {
      title: 'Keep the profile out of the middle',
      body: `The line the profile spins around is x = 0, and no point of the profile may sit at a negative x. Touching the line is fine; crossing it is not, and whatever crossed is thrown away — with no error, and nothing in the viewer to say so.

Below, both profiles are the same 10 by 10 square. The one drawn clear of the line spins into a wide ring with a hole down the middle. The one drawn straddling the line loses the half that crossed, so what comes back is a small solid plug — no ring and no hole.

A profile drawn entirely on the wrong side produces nothing at all.`,
      code: `function main() {
  const clear = rect(10, 10, { center: [10, 5] })
  const straddling = rect(10, 10, { center: [0, 5] })

  return [
    translateX(-25, revolve(clear, { segments: 48 })),
    translateX(25, revolve(straddling, { segments: 48 }))
  ]
}`,
    },
    {
      title: 'How round is round',
      body: `segments is how many flat faces the spin gets chopped into. Six is an obvious hexagon; sixty-four reads as smooth. It is the only option revolve takes.

What a high number costs you is model size. Every extra segment is more triangles to build, to hold in memory, and to write into the file you export, and a laptop starts to feel it once a scene holds a few dozen parts. So work at a low segment count while you are still moving things around and deciding on sizes, then raise it once at the end for the export.

Fewer than three segments is not a circle at all, and it is refused.`,
      code: `function main() {
  const profile = translateX(18, disc(6, { segments: 32 }))

  return [
    translateX(-35, revolve(profile, { segments: 6 })),
    translateX(35, revolve(profile, { segments: 64 }))
  ]
}`,
    },
    {
      title: 'Sweeping part of a turn',
      body: `revolve always goes all the way round. When you want it to stop partway, that is the library's extrudeRotate, whose angle option says how far to sweep — and asking revolve for an angle hands you exactly that call, ready to paste.

Less than a full turn leaves one flat face where the sweep began and another where it finished. Those two faces are the useful part: they are how you make a pipe elbow, a fan of steps, a wedge cut out of a wheel, or a cutaway that shows what is inside a part.

Write the angle with degToRad, the same helper the twist page used.`,
      code: `function main() {
  const profile = translateX(20, disc(5, { segments: 24 }))

  const full = revolve(profile, { segments: 48 })
  const part = extrudeRotate({ segments: 48, angle: degToRad(120) }, profile)

  return [
    translateX(-30, full),
    translateX(30, part)
  ]
}`,
    },
    {
      title: 'extrudeRectangular',
      body: `Every profile so far has been a filled area, with an inside and an outside. A path is a different thing: a bare line, drawn from point to point, with no inside at all.

extrudeRectangular walks along a path and leaves a rectangular bar behind it. size is how wide that bar is, height is how tall. A line you could only ever look at turns into something you could actually print. It is the library's own name, with no short form here — like everything left in this section.

path2.fromPoints({}, points) is how you build the path. This is the tool for lettering, wire frames, rails, and anything else that is a stroke rather than a shape.`,
      code: `function main() {
  const stroke = path2.fromPoints({}, [[-25, -10], [0, 15], [25, -10]])

  return extrudeRectangular({ size: 3, height: 8 }, stroke)
}`,
    },
    {
      title: 'A closed outline gives walls, not a block',
      body: `Hand extrudeRectangular a filled 2D shape rather than a path and it will not fill it in. It traces the outline, builds a wall along it, and leaves the middle hollow.

Below, the same disc goes into extrudeRectangular and into extrude. One comes back a tube, the other a solid disc. Both are legitimate, and which one you get depends entirely on which function you called.

Hollow is often exactly what you wanted — a cup, a fence, a planter, a box with an open top. It is a problem only when you were expecting a block.`,
      code: `function main() {
  const outline = disc(15, { segments: 48 })

  return [
    translateX(-20, extrudeRectangular({ size: 2, height: 10 }, outline)),
    translateX(20, extrude(10, outline))
  ]
}`,
    },
    {
      title: 'extrudeFromSlices',
      body: `The last extrusion builds a solid out of cross-sections that you write yourself, stacked up and skinned over.

numberOfSlices is how many cross-sections to make. callback is a function run once per slice to get each one: it is handed progress — 0 at the bottom slice, 1 at the top — and it returns a slice, which you build from a list of [x, y, z] points with slice.fromPoints.

slice is the one name here that needs a line of its own. Everything else in the library is already in scope, but slice lives one level further down, inside the extrusions module, so const { slice } = extrusions is how you reach it.

Pass the starting shape as the second argument as well, even when the callback ignores it completely, as this one does. Leave that argument out and the call fails.`,
      code: `const { slice } = extrusions

function main() {
  const base = rect(30, 30)

  return extrudeFromSlices({
    numberOfSlices: 2,
    callback: function (progress) {
      const half = 15 - 10 * progress
      const z = progress * 25
      return slice.fromPoints([
        [-half, -half, z], [half, -half, z], [half, half, z], [-half, half, z]
      ])
    }
  }, base)
}`,
    },
    {
      title: 'Letting progress shape the slice',
      body: `Because progress is a plain number running from 0 to 1, any formula you can write can drive the shape.

Here a helper builds a ring of points at whatever radius and height you ask it for, and the callback feeds that helper a radius that rises and falls as progress climbs. Six lines of arithmetic, and the result is a vase with a wavy side that no other extrusion in this section could have made.

Raise numberOfSlices for a smoother surface and lower it to see the steps. Two is the minimum, and anything smaller is refused.`,
      code: `const { slice } = extrusions

const SIDES = 48

function loop(radius, z) {
  const points = []
  for (let i = 0; i < SIDES; i++) {
    const angle = degToRad(i * 360 / SIDES)
    points.push([radius * Math.cos(angle), radius * Math.sin(angle), z])
  }
  return slice.fromPoints(points)
}

function main() {
  const base = disc(14, { segments: SIDES })

  return extrudeFromSlices({
    numberOfSlices: 40,
    callback: function (progress) {
      return loop(10 + 4 * Math.sin(progress * 6), progress * 60)
    }
  }, base)
}`,
    },
    {
      title: 'project',
      body: `project runs the other way round: it takes a solid and flattens it into the 2D outline you would see looking straight down at it from above. A shadow, essentially.

Use it when you want a base plate that matches a part exactly, or an outline to cut on a laser cutter, or a footprint to check that two parts do not overlap on the bed of a printer.

What comes back is 2D, so it needs an extrude of its own before it is solid again. And a hole that does not go all the way through leaves no mark in the shadow.`,
      code: `function main() {
  const part = subtract(
    box(40, 25, 10),
    tube(6, 20, { segments: 32 })
  )

  const shadow = project({}, part)

  return [
    translateX(-25, part),
    translateX(25, extrude(1, shadow))
  ]
}`,
    },
    {
      title: 'Springs and threads with extrudeHelical',
      body: `revolve spins a profile in a circle and closes the loop. extrudeHelical does the same spin but climbs while it turns, so the ends never meet. That is a helix, and it is how you get a spring, a screw thread, or a spiral ramp.

Four numbers control it. radius is how far the profile sits from the centre pole, so it sets how wide the coil is. pitch is how far it climbs in one full turn. angle is how much turning happens in total, in radians — Math.PI * 2 is one turn, so multiply that by the number of coils you want. segmentsPerRotation is smoothness, the same idea as segments on a disc.

Two traps, both worth knowing before you lose an afternoon. If you pass height as well as pitch, height wins and your pitch is thrown away. And there is no endAngle and no segmentPoints: pass either one and it is ignored silently — no error, no warning, and a shape that is not the one you asked for. The turning is set by angle, and nothing else.

The profile is the wire itself, seen end-on. A disc gives round wire like a pen spring; a rect gives flat wire like a watch spring.`,
      code: `function main() {
  // The profile is the wire, seen end-on.
  const wire = disc(1.5, { segments: 16 })

  const spring = extrudeHelical({
    radius: 10,                 // how wide the coil is
    pitch: 6,                   // how far it climbs per turn
    angle: Math.PI * 2 * 5,     // five full turns
    segmentsPerRotation: 48,    // smoothness
  }, wire)

  // Helices build upward from z = 0, so drop it to sit centred.
  return translate([0, 0, -15], spring)
}`,
    },
    {
      title: 'Which extrusion do I want?',
      body: `Start with extrude. It covers most parts, and a flat outline you can cut details into is the easiest thing there is to design and the easiest to fix later.

Reach for revolve when the object is round about one axis. Reach for extrudeRectangular when you are working from a line rather than from an area. Reach for extrudeFromSlices only when the cross-section genuinely changes as it climbs — it is the most code in this section, for the least common shape.

When none of them fits, draw the outline flat and extrude it anyway. It is nearly always enough.`,
      code: `function main() {
  const outline = subtract(
    rect(50, 50),
    disc(10, { segments: 48 })
  )

  return extrude(8, outline)
}`,
    },
  ],
},
  {
    slug: 'hulls',
    title: 'Hulls',
    pages: [
      {
        title: 'hull',
        body: `hull(...shapes) stretches a skin around everything you hand it and keeps whatever ends up inside. Picture a rubber band pulled around a handful of pins stuck in a board: the band touches the outermost pins and ignores the rest. The shape that skin makes is called the hull.

The example hulls two circles of radius 8 — one moved 15 to the left by translate, one moved 15 to the right. What comes back is a single shape, a capsule 46 units across and 16 tall.

Change either 15 to a 25 and the capsule stretches to 66 across, still 16 tall. The circles decide where the ends are; hull fills in everything between them.`,
        code: `function main() {
  const left = translate([-15, 0, 0],
    disc(8, { segments: 32 })
  )
  const right = translate([15, 0, 0],
    disc(8, { segments: 32 })
  )
  return hull(left, right)
}`,
      },
      {
        title: 'A hull has no dents',
        body: `Convex means no dents: every edge bulges outward, so a straight line drawn between any two points inside the shape stays inside it. A hull is always convex. That one fact explains every surprise hull will ever give you.

The example builds an L out of two rects joined with union, then puts the plain L on the left and hull of the same L on the right. The notch is gone. The L has six corners and covers 600 square units; its hull has five and covers 900. The extra 300 is exactly the triangle that filled in the notch.

Both fit the same bounding box, to the last decimal place. A hull never shrinks a shape and never reaches past it — it only fills in.`,
        code: `function main() {
  const tall = rect(10, 40)
  const foot = translate([15, -15, 0],
    rect(20, 10)
  )
  const ell = union(tall, foot)

  return [
    translate([-30, 0, 0], ell),
    translate([30, 0, 0], hull(ell))
  ]
}`,
      },
      {
        title: 'One kind of shape at a time',
        body: `Hull works on flat 2D shapes and on 3D solids, but never on a mix of the two. Hand it a circle and a cube in the same call and it stops with "only hulls of the same type are supported". Two flats give you a flat; two solids give you a solid.

Hulling two solids that are nothing alike is where hull earns its keep. The example hulls a 30 by 30 plate 4 thick against a ball of radius 6 sitting high above it. The result is a tapered stalk: square at the bottom, round at the top, smoothly blended the whole way.

Watch the coordinates. The plate is centred on the origin, so it runs from z = -2 up to z = 2, and the ball reaches z = 34. The stalk is 36 tall.`,
        code: `function main() {
  const foot = box(30, 30, 4)
  const sphere = translate([0, 0, 28],
    ball(6, { segments: 32 })
  )
  return hull(foot, sphere)
}`,
      },
      {
        title: 'Rounding a box with hull',
        body: `Here is the trick that makes hull worth learning. Put a small sphere wherever a corner of a box should be, hull all eight, and the skin wraps them into a box with perfectly rounded corners. The sphere's radius is the corner radius.

The spheres sit at the corners, so the part ends up one radius bigger in every direction than the box through their centres. Subtract the radius from each half-size first — that is what 20 - r is doing — and it measures exactly 40 by 24 by 12.

hull(...corners) uses the spread operator: three dots in front of an array unpack it into separate arguments, because hull wants shapes one after another, not one array holding them.

Leave segments at 16. Each ball is then 128 flat pieces and the hull returns 182; at 48 it is 1152 each and the hull returns 1302 — seven times the detail on a corner nobody inspects. A roundRadius on box does this in one line; hull is the version that is not limited to boxes.`,
        code: `function main() {
  const r = 4
  const half = [20 - r, 12 - r, 6 - r]
  const bead = ball(r, { segments: 16 })

  const corners = []
  for (let i = 0; i < 8; i++) {
    const x = (i % 2 === 0) ? -half[0] : half[0]
    const y = (Math.floor(i / 2) % 2 === 0) ? -half[1] : half[1]
    const z = (i < 4) ? -half[2] : half[2]
    corners.push(translate([x, y, z], bead))
  }
  return hull(...corners)
}`,
      },
      {
        title: 'hullChain',
        body: `hullChain(...shapes) hulls each neighbouring pair in turn — the first with the second, the second with the third, and so on — then joins all of those results together. Give it a row of circles and you get a smooth snake threading through every one of them.

What comes back is still one shape, not seven. The name is the clue: a chain, not a bag. And because only neighbours get hulled, the finished shape is free to bend. A plain hull can never bend, because a hull is always convex.

The example lays seven circles of radius 5 along a zig-zag, 14 apart, alternating 8 above and 8 below the centre line. The snake fills a 94 by 26 box and follows every turn.`,
        code: `function main() {
  const beads = []
  for (let i = 0; i < 7; i++) {
    const y = (i % 2 === 0) ? -8 : 8
    beads.push(translate([i * 14, y, 0],
      disc(5, { segments: 24 })
    ))
  }
  return hullChain(...beads)
}`,
      },
      {
        title: 'hull or hullChain?',
        body: `The example runs the same five circles through both and stacks the answers: hull on top, hullChain underneath.

They fill the same 66 by 26 box, and that is where the resemblance ends. The blob covers 1382 square units with 28 corners. The snake covers 904 with 50, because it traces in and out of every bend instead of cutting the corners off.

Order is the other difference. Shuffle the five circles and hull returns the identical blob — it only cares which shapes it was given, not what order they came in. Shuffle them for hullChain and you get a different snake, because you changed who counts as a neighbour.

Use hull when you want one rounded lump. Use hullChain when the shape has to follow a path.`,
        code: `function main() {
  const beads = []
  for (let i = 0; i < 5; i++) {
    const y = (i % 2 === 0) ? -8 : 8
    beads.push(translate([i * 14, y, 0],
      disc(5, { segments: 24 })
    ))
  }

  const blob = hull(...beads)
  const snake = hullChain(...beads)

  return [
    translate([0, 25, 0], blob),
    translate([0, -25, 0], snake)
  ]
}`,
      },
      {
        title: 'Points instead of shapes',
        body: `hullPoints2 does the same job one level down. You hand it a plain list of coordinates and it hands back only the ones on the outside — no shapes involved at either end.

That is also the trap. What comes back is an array of [x, y] pairs, not a 2D shape. Return it from main() and the viewport shows the grid and the axes and nothing else — no error, no red message, because a list of numbers is not geometry. geometries.geom2.fromPoints turns those points into a real shape, and extrude gives it thickness so there is something solid to look at.

The example feeds in seven points and keeps five. [0, 14] and [18, 10] are dropped, because each sits inside the outline the other five make.

hullPoints3(points) is the 3D twin: points in, faces out, and geometries.geom3.create builds the solid from those faces.`,
        code: `function main() {
  const dots = [[0, 0], [20, 0], [20, 14], [0, 14], [10, 26], [-8, 8], [18, 10]]

  const edge = hullPoints2(dots)
  console.log('kept ' + edge.length + ' of ' + dots.length + ' points')

  const outline = geom2.fromPoints(edge)
  return extrude(4, outline)
}`,
      },
    ],
  },
  {
    slug: 'expansions',
    title: 'Expansions',
    pages: [
      {
        title: 'There is no fillet, and no chamfer',
        body: `Every other CAD program has a fillet button: click a sharp edge, type a radius, and the edge softens. JSCAD has no fillet function, and no chamfer function either — a chamfer being the other way to kill a sharp edge, slicing it off flat instead of curving it.

What there is instead is roundRadius, and it reaches exactly three shapes: box, tube and rect. The library underneath has no fourth — roundedCuboid, roundedCylinder and roundedRectangle are the whole list, and they are the three those options call. Hulling a sphere at each corner, the trick from the Hulls section, reaches further — but hull only ever makes convex shapes, and it fills in any hollow the part had.

The expansions module is the general answer, and it holds two functions. Both push the outside of a shape outward by a set distance, laying a curve wherever that outside used to turn a corner. Which one you call depends on what you already have: offset takes a flat outline, expand takes a solid.

The example softens a cross — a shape no primitive gives you.`,
        code: `function main() {
  // A cross: two flat rects, unioned. No primitive makes this shape.
  const cross = union(
    rect(60, 20),
    rect(20, 60)
  )

  const sharp = extrude(8, cross)

  const softened = extrude(8, offset({ delta: 6, corners: 'round', segments: 16 }, cross)
  )

  return [
    translate([-45, 0, 0], sharp),
    translate([45, 0, 0], softened),
  ]
}`,
      },
      {
        title: 'offset: reshaping a flat outline',
        body: `offset(options, outline) takes a flat shape and hands back a new one, further out or further in. Two settings decide what comes back.

delta is how far, in millimetres. Positive pushes the outline outward — a delta of 10 turns a 60 mm square into an 80 mm one, because it grows on both sides at once. Negative pulls it inward, with a limit: never pull in further than half the narrowest part of the shape. At exactly half there is nothing left, and past that the outline folds through itself and comes back as rubbish.

corners decides what happens where the outline turns.

- 'edge' keeps the sharp point, and is what you get if you leave the setting out.
- 'chamfer' slices the point off flat.
- 'round' lays a curve; segments is how many short straight pieces it is built from. 16 is smooth enough for anything you will print.

offset only speaks flat. Hand it a solid and you get the very same solid back, unchanged and without a word of complaint.`,
        code: `function main() {
  const start = rect(60, 60)

  // The same delta three times over. Only the corner treatment changes.
  const styles = ['edge', 'chamfer', 'round']
  const grown = styles.map((style, i) =>
    translate([i * 95 - 95, 0, 0],
      extrude(6, offset({ delta: 10, corners: style, segments: 16 }, start)
      )
    )
  )

  // The outline all three started from, parked behind them for scale.
  const original = translate([0, 95, 0],
    extrude(6, start)
  )

  return [original, ...grown]
}`,
      },
      {
        title: 'expand: a rounded skin on a solid',
        body: `expand(options, solid) is offset's counterpart for something 3D. Picture dipping the model in paint: every face slides outward by delta, and every edge and corner comes back rounded.

On a solid, round is the only corner style there is. Ask for corners: 'edge' or corners: 'chamfer' and JSCAD stops with corners must be "round" for 3D geometries. Leave corners out and you get round. A negative delta stops it too: on a solid, expand only grows.

It grows by more than people expect, because delta goes on at the left and again at the right — a 40 mm cube expanded by 4 measures 48. To finish at the size you actually wanted, build it at size - 2 * delta and let the skin make up the difference. The example does it both ways, beside a plain 40 mm cube.

segments costs real money here: that cube is 62 faces at 8 segments and 614 at 32.`,
        code: `function main() {
  const delta = 4
  const reference = box(40, 40, 40)

  // Built at 40 and expanded: it ends up 48, wider than the reference.
  const tooBig = expand({ delta: delta, segments: 8 },
    box(40, 40, 40)
  )

  // Built at 40 - 2 * delta, so the skin brings it back to exactly 40.
  const justRight = expand({ delta: delta, segments: 8 },
    box(40 - 2 * delta, 40 - 2 * delta, 40 - 2 * delta)
  )

  console.log('too big:   ', measureDimensions(tooBig))
  console.log('just right:', measureDimensions(justRight))

  return [
    translate([-70, 0, 0], reference),
    tooBig,
    translate([70, 0, 0], justRight),
  ]
}`,
      },
      {
        title: 'Round the outline, then extrude',
        body: `The recipe worth memorising, and the closest thing to a fillet you get: sketch the part flat, offset the sketch with corners: 'round', then extrude it.

It rounds the four upright edges and leaves the top and bottom faces flat and sharp, which is what a plate that has to sit on a table or a print bed wants. expand would round those two faces as well, so the plate rocks — and it would add twice delta to the thickness besides.

The arithmetic from the previous page does the real work: the sketch is drawn at 60 - 2 * 6 by 40 - 2 * 6, so once it is offset by 6 the outline measures exactly the 60 by 40 it was meant to. The plain plate beside it in the viewport is there so your eyes can check.

Anything you want cut into the plate — bolt holes, a slot, lettering — goes in between the offset and the extrude, while it is still flat and cheap to cut.`,
        code: `function main() {
  const width = 60
  const depth = 40
  const radius = 6

  // One radius smaller on every side, so the offset lands it on 60 by 40.
  const sketch = rect(width - 2 * radius, depth - 2 * radius)
  const rounded = offset(
    { delta: radius, corners: 'round', segments: 16 }, sketch
  )

  const plate = extrude(5, rounded)

  // A plain 60 by 40 plate, to check the size came out right.
  const sharp = extrude(5, rect(width, depth)
  )

  return [
    translate([0, 25, 0], plate),
    translate([0, -25, 0], sharp),
  ]
}`,
      },
    ],
  },
  {
  slug: 'paths',
  title: 'Paths',
  pages: [
    {
      title: 'A path is a line, not a shape',
      body: `Everything you have built so far has had an inside. A box is solid all the way through; even a flat disc is an area, with a middle you could colour in.

A path is different. A path is a line — a pencil stroke. It has a place where the pencil went down, a place where it came up, and a list of corners in between. It has no inside at all.

The JSCAD name for one is path2, which is short for "a path in 2D". There is no path3; paths are always flat, lying on the XY plane like the 2D  It lives in the geometries module, so the full name is geometries.path2.

geometries.path2.fromPoints({}, points) builds one. points is a list of [x, y] pairs written in the order you would draw them, and the empty object in front is where options go — the next page has the one option that matters.

Return a path from main() and you can see it: a thin line on the grid, no thickness, nothing filled in. Ask JSCAD to measure it and it agrees. measureArea and measureVolume both come back 0, because there is nothing there to measure.

So why bother? Two reasons, both later in this section. A path is the easiest way to describe an outline that has a curve in it, and a path that loops back to its own start turns into a solid in a single call.`,
      code: `function main() {
  // Four corners, in the order you would draw them with a pencil.
  const line = path2.fromPoints({}, [
    [-30, -10], [-10, 20], [10, -20], [30, 10],
  ])

  console.log('points:', path2.toPoints(line).length)
  console.log('is it a loop?', line.isClosed)

  return line
}`,
    },
    {
      title: 'Open paths and closed paths',
      body: `A path is either open or closed, and that one fact decides most of what you can do with it.

An open path is a stroke with two loose ends, like a road. A closed path is a loop, like the outline of a coin: the last corner joins back up to the first one, and there are no loose ends anywhere.

That empty options object from the last page is where you say which you want. fromPoints({ closed: true }, points) makes a loop out of the same corners.

The path itself will tell you which it is. Read path.isClosed and you get true or false. Notice in the example that both paths have four points — closing a loop does not add a fifth point that repeats the first. The join is understood, not written down.

The reason to care: only a closed path can be filled in and given thickness. An open one is a line forever, until you close it. That is what the close page is for, further along.`,
      code: `function main() {
  const path2 = geometries.path2
  const corners = [[-12, -12], [12, -12], [12, 12], [-12, 12]]

  const open = path2.fromPoints({}, corners)
  const loop = path2.fromPoints({ closed: true }, corners)

  console.log('open.isClosed:', open.isClosed)
  console.log('loop.isClosed:', loop.isClosed)

  return [
    transforms.translate([-20, 0, 0], open),
    transforms.translate([20, 0, 0], loop),
  ]
}`,
    },
    {
      title: 'appendPoints',
      body: `Writing every corner into one long list works, but it stops working the moment the corners come out of a loop or a calculation. appendPoints lets you build the path a step at a time instead.

geometries.path2.appendPoints(points, path) takes a list of new corners and a path, and hands back a longer path. The path goes last, the way the shape goes last in translate and subtract — almost everything in JSCAD is written that way.

Here is the part that catches people. It hands back a longer path; it does not lengthen the one you gave it. Paths are values, exactly like shapes are, so nothing is ever changed in place. That means the variable holding your path has to be a let, and every call has to be stored back into it:

  stairs = path2.appendPoints([[10, 4]], stairs)

Drop the "stairs =" and the new corner is built, thrown away, and your path is still the length it was. Nothing errors and nothing warns.

You can add several corners in one call, which is handy inside a loop where each turn adds a whole step. What you cannot do is add to a closed path — a loop has no loose end to add to, and JSCAD says so: "Cannot concatenate to a closed path".`,
      code: `function main() {
  const path2 = geometries.path2

  // Start with the pencil down at one point.
  let stairs = path2.fromPoints({}, [[-30, 0]])

  // Each call hands back a LONGER path, so store it back in the variable.
  stairs = path2.appendPoints([[-30, 8]], stairs)
  stairs = path2.appendPoints([[-20, 8]], stairs)

  // A loop adds the rest of the steps: up, then across, four times.
  for (let i = 0; i < 4; i++) {
    const x = -20 + i * 10
    const y = 16 + i * 8
    stairs = path2.appendPoints([[x, y], [x + 10, y]], stairs)
  }

  console.log('points now:', path2.toPoints(stairs).length)
  return stairs
}`,
    },
    {
      title: 'appendArc',
      body: `appendPoints draws straight lines. appendArc draws a curve — a piece of a circle — from wherever the path currently ends to a point you name.

geometries.path2.appendArc(options, path) takes these options:

- endpoint: [x, y] — where the curve has to finish. This is the only one you must give.
- radius: [rx, ry] — how tightly it curves. Two numbers, so a squashed curve is possible; keep them equal for an ordinary circular one.
- clockwise: true or false — which way round it bends.
- large: true or false — take the short way round the circle, or the long way.
- segments: how many little straight steps stand in for the curve, exactly as on a circle.

Why two extra true-or-false options? Because a start, an end and a radius do not describe one single curve. Draw two dots on paper and there are four different arcs of the same radius that join them: a short bulge each way, and a long sweep each way. clockwise and large are you picking one of the four. If the curve bows the wrong way, flip clockwise; if it takes a wild trip round the outside, set large to false.

The example rounds off a corner. The path runs along the bottom and stops early, the arc cuts across where the sharp corner would have been, and then it goes straight again. A rounded-off corner like that has a name worth knowing: a fillet.

One quiet behaviour to watch for. If the radius is too small to stretch between the two points, JSCAD does not complain — it grows the radius just enough to reach, which gives you a half circle. A curve that comes out as an unexpected semicircle usually means the radius is too small, not that the endpoint is wrong.`,
      code: `function main() {
  const path2 = geometries.path2

  // Along the bottom, stopping short of the corner.
  let track = path2.fromPoints({}, [[-30, -20], [10, -20]])

  // Curve up to [30, 0] instead of turning the corner sharply.
  track = path2.appendArc({
    endpoint: [30, 0],
    radius: [20, 20],
    clockwise: false,
    large: false,
    segments: 32,
  }, track)

  // Straight again once the corner is behind us.
  track = path2.appendPoints([[30, 20]], track)

  console.log('points, arc included:', path2.toPoints(track).length)
  return track
}`,
    },
    {
      title: 'appendBezier',
      body: `An arc is a piece of a circle, so it bends by the same amount the whole way along. When you want a curve that eases in and out — the side of a guitar, the hook of a letter — you want a Bezier.

A Bezier curve is steered by control points. A control point is not somewhere the curve goes; it is somewhere the curve is pulled toward, like a magnet just off the side of the road. The curve leans toward each one in turn and never quite reaches it.

geometries.path2.appendBezier({ controlPoints, segments }, path) starts from wherever the path ends and follows those magnets. The last entry in controlPoints is the exception to everything just said: that one is the finish line, and the curve does land exactly on it. So three control points means two magnets and an endpoint.

Move a magnet further out and the curve bulges harder toward it. Two magnets pulling opposite ways give you the S-shape in the example.

segments is the smoothness, the same idea as on a circle, but here it is a ceiling rather than a promise: JSCAD uses at most that many little straight steps and skips the ones the curve does not need. Ask for 32, count the points afterwards, and you will find rather fewer. That is normal, and it is why the example prints the count — so the number does not surprise you later.`,
      code: `function main() {
  const path2 = geometries.path2

  let hook = path2.fromPoints({}, [[-30, -20]])

  // Two handles to pull the curve toward, then the point it must finish on.
  hook = path2.appendBezier({
    controlPoints: [[-30, 20], [30, 20], [30, -20]],
    segments: 32,
  }, hook)

  const pts = path2.toPoints(hook)
  console.log('little straight steps:', pts.length)
  console.log('ends at:', pts[pts.length - 1])

  return hook
}`,
    },
    {
      title: 'close',
      body: `You have an outline drawn with points, arcs and curves, and the two ends are near each other but not joined. geometries.path2.close(path) draws that last edge for you, straight from the final point back to the first one, and marks the path as a loop.

It is the same result as passing { closed: true } to fromPoints, and you will use it far more often, because you usually do not know a path is finished until it is.

Two small things it saves you from. You do not type the first corner again at the end — close makes that join itself, and adding a duplicate point by hand just leaves a zero-length edge sitting in the geometry. And calling close on a path that is already a loop does nothing at all rather than erroring, so it is safe inside a function where you are not sure.

Closing is a door that opens one way only. Once a path is a loop it has no loose end, so appendPoints and appendArc both refuse it from then on. Finish the drawing first, close last.

The payoff is the next page: a closed path is the one thing in this section that can become a solid.`,
      code: `function main() {
  const path2 = geometries.path2

  let roof = path2.fromPoints({}, [[-20, -15], [20, -15], [20, 5], [0, 25], [-20, 5]])
  console.log('before close:', roof.isClosed)

  roof = path2.close(roof)
  console.log('after close: ', roof.isClosed)

  return roof
}`,
    },
    {
      title: 'From a closed path to a solid',
      body: `This is what the whole section has been walking toward, and it is one line.

extrude(height, closedPath) takes a closed path and pushes it straight up into a solid, exactly the way it does with a disc or a rect. The loop becomes the top and bottom faces, and height is how far apart they are. Like any extrusion it grows upward from z = 0, so the part is already sitting on the grid rather than sunk half into it.

Hand the same call an open path and it stops with a message that says precisely what is wrong: "extruded path must be closed". If you see that, you forgot the close.

So the full pipeline for a shape no primitive could have given you is four steps: start the path, append the straight bits and the curved bits, close it, extrude it. The example does all four, and prints the volume so you can see that something solid really came out the other end.

It is worth the effort only when the outline has something a primitive cannot do. A plain four-cornered outline is still rect(w, h). Reach for a path when the shape has a fillet in it, a swooping side, or a run of corners that a loop generated.`,
      code: `function main() {
  const path2 = geometries.path2

  let outline = path2.fromPoints({}, [[-25, -15], [25, -15], [25, 5]])
  outline = path2.appendArc({
    endpoint: [5, 25], radius: [20, 20], clockwise: false, large: false, segments: 32,
  }, outline)
  outline = path2.appendPoints([[-25, 25]], outline)
  outline = path2.close(outline)

  const part = extrusions.extrudeLinear({ height: 6 }, outline)
  console.log('volume:', Math.round(measurements.measureVolume(part)))
  return part
}`,
    },
    {
      title: 'Which way round you drew it',
      body: `A path has a direction, because you drew it in an order. Going round an outline anticlockwise — right along the bottom, up the far side, back across the top — is the direction JSCAD expects. Anticlockwise is the way the hands of a clock do not go.

Draw the same outline the other way round and it still looks perfectly fine on screen. The line is in the same place, after all. Extrude it, though, and you get a solid that is inside out: its surfaces face inward instead of outward.

You cannot see that, but you can measure it. measureVolume comes back as a negative number, which is JSCAD's way of saying the inside and the outside have swapped over. The example prints both, so you can watch the minus sign appear and then leave.

Where it actually hurts is  Cut a plate with an inside-out cutter and the result flips: instead of a plate with a bite out of it, you are left with only the piece where the two overlapped — the very part you were trying to remove. When a subtract gives you a baffling result, print the volume of both shapes before you change anything else.

The fix is one call. geometries.path2.reverse(path) hands back the same path drawn the other way round, and everything downstream behaves.`,
      code: `function main() {
  const path2 = geometries.path2

  // Drawn clockwise: up the left side first, instead of along the bottom.
  const backwards = path2.fromPoints({ closed: true }, [
    [-20, -15], [-20, 5], [0, 25], [20, 5], [20, -15],
  ])
  console.log('backwards volume:', Math.round(
    measurements.measureVolume(extrusions.extrudeLinear({ height: 6 }, backwards))
  ))

  const fixed = path2.reverse(backwards)
  const part = extrusions.extrudeLinear({ height: 6 }, fixed)
  console.log('reversed volume: ', Math.round(measurements.measureVolume(part)))

  return part
}`,
    },
    {
      title: 'Cutting a hole in an outline',
      body: `Sooner or later you will want to punch a hole in an outline before you extrude it, because cutting a flat shape is far cheaper than cutting a finished solid.

Try it on the path itself and JSCAD refuses, with "only subtract of the types are supported". That is not a bug. union, subtract and intersect work on areas and on solids, and a path is neither — it is a line, and a line has no inside for anything to be removed from.

The conversion is two functions you already have, one inside the other:

  const face = geometries.geom2.fromPoints(geometries.path2.toPoints(outline))

toPoints reads the corners back out of the path as a plain list. geom2.fromPoints takes a list of corners and builds a geom2 — a flat area, the same kind of thing disc and rect hand you. From there it is an ordinary 2D shape: cut it, union it, then extrude it.

Two details. geom2.fromPoints joins the last corner back to the first for you, so it does not mind whether the path was closed, though closing first keeps your intent obvious. And it needs at least three corners; hand it two and it says so.

Anticlockwise still matters here, exactly as it did on the last page. The corners arrive in the order the path had them, so a backwards path makes a backwards area.`,
      code: `function main() {
  const path2 = geometries.path2

  // A tag outline with one rounded corner.
  let outline = path2.fromPoints({}, [[-30, -12], [30, -12], [30, 4]])
  outline = path2.appendArc({
    endpoint: [22, 12], radius: [8, 8], clockwise: false, large: false, segments: 24,
  }, outline)
  outline = path2.appendPoints([[-30, 12]], outline)
  outline = path2.close(outline)

  // A path cannot be cut. Hand its points to geom2 and it becomes an area.
  const face = geometries.geom2.fromPoints(path2.toPoints(outline))

  const hole = transforms.translate([-20, 0],
    primitives.circle({ radius: 4, segments: 32 })
  )
  const cut = booleans.subtract(face, hole)

  return extrusions.extrudeLinear({ height: 4 }, cut)
}`,
    },
    {
      title: 'Walls from an open path',
      body: `Everything since the close page has needed a loop. Open paths have an extrusion of their own, and it does something different: instead of filling the outline in, it builds a wall that runs along the line.

extrudeRectangular({ size, height }, path) gives the line a rectangular cross-section. height is how tall the wall stands. size is how far it reaches out sideways from the line — and it reaches out on both sides, so the wall comes out twice as thick as the number you wrote. size: 3 is a 6 mm wall, centred on the path. If a wall is double the thickness you expected, that is why. Leave size out entirely and you get 1, which means 2 mm.

Nothing else has to change: any path works, drawn with points, arcs, Beziers or all three. Closed paths work too, and give you a ring of wall with a hollow middle — a cookie cutter rather than a biscuit.

This is also the tool behind the name tag in the text section. vectorText hands back pen strokes, each stroke becomes a path with path2.fromPoints, and extrudeRectangular is what turns those hairlines into letters you can actually print. One warning carries over from there: handed a list of paths it returns a list of solids, one per path, so measure the group with measureAggregateBoundingBox rather than measureBoundingBox.`,
      code: `function main() {
  const path2 = geometries.path2

  let track = path2.fromPoints({}, [[-35, -20], [0, -20]])
  track = path2.appendArc({
    endpoint: [35, 15], radius: [35, 35], clockwise: false, large: false, segments: 48,
  }, track)
  track = path2.appendPoints([[35, 25]], track)

  // size reaches out from the line on BOTH sides, so this wall is 6 mm thick.
  const wall = extrusions.extrudeRectangular({ size: 3, height: 10 }, track)

  console.log('wall size:', measurements.measureDimensions(wall))
  return wall
}`,
    },
  ],
},
  {
  slug: 'geometry-types',
  title: 'Geometry Types',
  pages: [
    {
      title: 'Three kinds of shape',
      body: `Every shape in JSCAD is one of exactly three kinds, and almost every confusing error message in the library comes from mixing them up.

A solid is a closed volume — it has an inside. Its name in the code is geom3.

A flat shape is an area lying in the XY plane with no thickness at all. It is not a very thin solid; it has no thickness to be thin. Its name is geom2.

A path is a run of points joined end to end, like a pen line. It does not have to close up into a loop. Its name is path2.

You can tell which is which by looking. The viewport shades a solid, so it catches the light and you can see its faces. A flat shape and a path have no faces to shade, so they are drawn as plain lines instead. That is not a bug and it does not mean the shape is broken — it is what a shape with no volume looks like.

Below, left to right: a shaded box, the outline of a square lying on the grid, and an open zigzag.`,
      code: `function main() {
  const solid = box(20, 20, 20)
  const flat = rect(20, 20)

  // fromPoints takes an options object first. There is nothing worth
  // setting here, so {} is the whole of it.
  const line = path2.fromPoints({}, [[0, 0], [10, 14], [20, 0], [30, 14]])

  return [
    translate([-45, 0, 10], solid),
    flat,
    translate([30, -7, 0], line),
  ]
}`,
    },
    {
      title: 'Asking a shape what it is',
      body: `Looking at the viewport tells you what you got. When you want the program to tell you, each kind has a test function that answers true or false.

- geometries.geom3.isA(shape) — is it a solid?
- geometries.geom2.isA(shape) — is it flat?
- geometries.path2.isA(shape) — is it a path?

All three are safe to call on anything. Hand one a number, or a value that is not a shape at all, and it returns false instead of throwing.

This is the fastest way to settle an argument with the library. When a function complains about types and you cannot see why, print the kind of each thing you passed it. Nine times out of ten one of them is not what you assumed it was — usually because a line further up already extruded it.

The helper below is worth keeping in your file while you are debugging.`,
      code: `function whatIsIt(shape) {
  if (geom3.isA(shape)) return 'geom3 — a solid'
  if (geom2.isA(shape)) return 'geom2 — flat'
  if (path2.isA(shape)) return 'path2 — a line'
  return 'not a shape at all'
}

function main() {
  const sketch = disc(12, { segments: 48 })
  const solid = extrude(8, sketch)

  console.log('sketch:', whatIsIt(sketch))
  console.log('solid:', whatIsIt(solid))
  console.log('the number 7:', whatIsIt(7))

  return [
    translate([-20, 0, 0], sketch),
    translate([20, 0, 0], solid),
  ]
}`,
    },
    {
      title: 'Which maker gives you which kind',
      body: `You do not choose the kind. The function you called already did.

These make a flat shape: rect, disc and poly, plus the library's own ellipse, star and triangle.

These make a solid: box, ball, tube, cone and ring, plus ellipsoid, geodesicSphere and polyhedron.

These make a path: line, for a run of straight segments, and arc, for part of a circle. geometries.path2.fromPoints does the same job from a list of points you worked out yourself.

And two change kind rather than making one. extrude and revolve each take something flat and hand back a solid; project runs the other way.

The pattern is easier to remember than the list. A name that describes something you could cut out of paper is flat; a name that describes something you could hold is solid.

One place the pattern misleads people: vectorText does not make paths. It hands back plain arrays of numbers, one array per pen stroke, and you turn each of those into a path yourself with fromPoints. The Text section works that through.`,
      code: `function main() {
  const flat = star({ vertices: 5, outerRadius: 14, innerRadius: 6 })
  const solid = ring(12, 3)

  // Angles are radians, so Math.PI is half a turn — this is a semicircle.
  const line = arc({
    radius: 12, startAngle: 0, endAngle: Math.PI, segments: 32,
  })

  return [
    translate([-40, 0, 0], flat),
    solid,
    translate([40, 0, 0], line),
  ]
}`,
    },
    {
      title: 'Extruding turns flat into solid',
      body: `Extruding is the move that changes a shape's kind. It is the only one you will use often.

extrude, revolve, extrudeHelical, extrudeFromSlices and extrudeRectangular all take something flat and hand back a solid. Whatever went in, a solid comes out.

That is why the usual way to build a part is: draw the outline flat, cut any 2D detail into it while it is still flat and cheap, and extrude once at the end. After the extrude you are holding a different kind of thing, and the rules change with it.

Below, the same disc appears twice — on the left as itself, an outline lying on the grid, and on the right after extrude, a shaded solid with sides you can see. One call, two kinds.

Note what did not happen: the circle on the left is untouched. Extruding does not convert the shape you handed it. Like every other JSCAD function, it builds a new shape and gives that back.`,
      code: `function main() {
  const sketch = disc(12, { segments: 48 })
  const solid = extrude(18, sketch)

  return [
    translate([-20, 0, 0], sketch),
    translate([20, 0, 0], solid),
  ]
}`,
    },
    {
      title: 'A path is a line, not an area',
      body: `A flat shape and a path both draw as lines in the viewport, which makes them easy to confuse. They are not interchangeable.

A flat shape encloses an area. A path is only the line. An open path has two loose ends and no inside, so there is nothing there to give thickness to. Ask extrude to do it anyway and it stops with:

extruded path must be closed

There are two ways forward. If the line was always meant to be a loop, close it — geometries.path2.close(path) joins the last point back to the first, and the result extrudes like any flat shape. If it was always meant to stay a line, use extrudeRectangular instead: it sweeps a small bar along the path, so the line becomes a thin wall you can print. That is how the Text section turns letter strokes into raised lettering.

Below is the same zigzag both ways — the bare path on the left, and on the right the wall extrudeRectangular makes from it.`,
      code: `function main() {
  const zigzag = path2.fromPoints({}, [[0, 0], [10, 14], [20, 0], [30, 14]])

  // extrude(6, zigzag) would stop here with
  //   extruded path must be closed
  // because an open line has no inside to give thickness to.
  const wall = extrudeRectangular({ size: 2, height: 8 }, zigzag)

  return [
    translate([-45, -7, 0], zigzag),
    translate([10, -7, 0], wall),
  ]
}`,
    },
    {
      title: 'project goes the other way',
      body: `Extruding is not quite a one-way door. One function in the extrusions module runs backwards: project takes a solid and hands back a flat shape.

What it gives you is the shadow the solid would cast straight down onto the grid — its outline seen from above, flattened onto the XY plane at z = 0. A hole that goes all the way through stays a hole; anything the solid overhangs is filled in.

This is genuinely useful. The shadow of a part is the footprint it needs on the print bed, and it is also the outline you would cut if you were making the same thing flat.

project is the exception worth remembering, because the shape of the library otherwise says flat goes to solid and stays there. Its first argument is the usual options object; leaving it as {} projects straight down, which is what you want almost every time.

Below, a donut and the ring its shadow makes — hole and all. The two printed numbers are not the same measurement: a solid's area is its whole outer skin, a flat shape's is the ground it covers.`,
      code: `function main() {
  const donut = ring(14, 4)
  const shadow = project({}, donut)

  console.log('donut is a solid; area of its skin:', measureArea(donut))
  console.log('shadow is flat; area it covers:', measureArea(shadow))

  return [
    translate([-22, 0, 0], donut),
    translate([22, 0, 0], shadow),
  ]
}`,
    },
    {
      title: 'Both sides have to match',
      body: `union, subtract, intersect and hull each take two or more shapes, and every one of them refuses to mix kinds. Hand hull a flat circle and a solid sphere and it stops before doing any work:

only hulls of the same type are supported

The other three complain in almost the same words: only unions of the same type are supported, only subtract of the types are supported, only intersect of the types are supported. The wording is clumsy, but "type" always means the same thing — solid, flat, or path. Sizes and positions are never even looked at.

Inside one kind you are free, and the result keeps that kind. Two flat circles hull into a flat stadium outline. Two spheres hull into a solid capsule. Subtracting one flat shape from another gives you a flat shape with a hole in it.

The fix is always to make both sides agree, and usually that means extruding the flat one first.`,
      code: `function main() {
  const circle = disc(8, { segments: 48 })
  const flatHull = hull(circle, translate([30, 0, 0], circle))

  const sphere = ball(8, { segments: 32 })
  const solidHull = hull(sphere, translate([30, 0, 0], sphere))

  // hull(circle, sphere) never gets this far. It stops with:
  //   only hulls of the same type are supported

  return [
    translate([-15, 25, 0], flatHull),
    translate([-15, -25, 0], solidHull),
  ]
}`,
    },
    {
      title: 'Extruding a solid does nothing',
      body: `That was a mismatch that stops you. This is one that does not, and it is worse for it.

The library's extrudeLinear expects something flat. Give it a solid and it hands the very same solid straight back — no error, no warning, nothing in the console. The program runs, something renders, and the number you typed was ignored. reSHape's extrude refuses instead, which is the whole reason it checks: extrude needs a flat 2D shape — you gave it a solid.

Both boxes below are 20 x 20 x 5 mm. The one on the right was asked for a height of 40. The two printed lines are their real dimensions, and they are identical.

So when a part comes out flatter than you meant it to be, and nothing is red, this is the first thing to check. Was the shape you extruded still flat, or had an earlier line already turned it into a solid? The isA test from earlier in this section answers that in one line.`,
      code: `function main() {
  const solid = box(20, 20, 5)

  // Asking the library for 40 mm of height on something already solid.
  // reSHape's extrude(40, solid) would refuse instead of doing this.
  const noTaller = extrudeLinear({ height: 40 }, solid)

  console.log('solid:', measureDimensions(solid))
  console.log('after asking for height 40:', measureDimensions(noTaller))

  return [
    translate([-15, 0, 0], solid),
    translate([15, 0, 0], noTaller),
  ]
}`,
    },
    {
      title: 'Sketch flat, extrude, then turn',
      body: `The last rule of the section is about order, and it is the one that costs people an afternoon.

A flat shape has no thickness, so turning it out of the XY plane does not stand it up. It squashes it. Rotate a 20 x 20 square a quarter turn and what is left has zero area — no shape inside it any more. Extruding that afterwards will not rescue it; extrude stops with slices must have 3 or more edges to calculate a plane.

The viewport will not show you this, which is exactly why it is worth a page. The renderer draws the outline the square had before the turn, so a squashed sketch looks like a perfectly good square standing on its edge. Your eyes are no help here. Measure it instead — that is what the two printed lines below are for: 400 before the turn, 0 after.

The order that works is the other one. Extrude the sketch while it is still flat, then rotate the solid. That is the version on screen: the flat sketch on the left, and on the right the same sketch given 5 mm of thickness and stood up into a wall.`,
      code: `function main() {
  const sketch = rect(20, 20)

  // The wrong order. Deliberately not returned: the viewport cannot show you
  // what is wrong with it, and the measurement can.
  const squashed = rotateX(Math.PI / 2, sketch)   // a quarter turn
  console.log('area of the flat sketch:', measureArea(sketch))
  console.log('area after rotating it:', measureArea(squashed))

  // The right order: thickness first, then stand the solid up.
  const wall = rotateX(Math.PI / 2,
    extrude(5, sketch))

  return [
    translate([-25, 0, 0], sketch),
    translate([25, 0, 10], wall),
  ]
}`,
    },
  ],
},
  {
  slug: 'measurements',
  title: 'Measurements',
  pages: [
    {
      title: 'Reading numbers off a shape',
      body: `You can measure a shape the same way you would measure a real object — except the answer comes back as a number your program can use.

measureDimensions(shape) hands back [width, depth, height] in millimetres. measureVolume(shape) hands back how much material is inside, in cubic millimetres, which is near enough to how much plastic a print will use.

Neither one changes the shape. They read it and hand back numbers, so you can call them whenever you like.

console.log prints an answer where you can read it — the console panel beside your code in a lesson, or your browser's own console anywhere else. The tray below is hollowed out, so nobody can work out its volume by reading the code. The program can.`,
      code: `function main() {
  const body = box(120, 80, 20)
  const scoop = translate([0, 0, 4], box(110, 70, 20))
  const tray = subtract(body, scoop)

  console.log('size mm:', measureDimensions(tray))
  console.log('plastic used, cubic mm:', Math.round(measureVolume(tray)))

  return tray
}`,
    },
    {
      title: 'measureBoundingBox — the two corners',
      body: `Every shape fits inside an invisible box that is tight against it on all six sides. That is its bounding box, and measureBoundingBox(shape) gives you two opposite corners of it: [[minX, minY, minZ], [maxX, maxY, maxZ]].

It is a pair of arrays, not an object with .min and .max on it. Writing box.min gives you undefined and no warning, so read it by number instead: box[0] is the low corner, box[1] is the high one, and box[1][0] - box[0][0] is the width.

The blob below came out of hull(), so its size is written nowhere in the code. The two small cubes sit on the corners the measurement found.`,
      code: `function main() {
  const blob = hull(
    ball(10, { segments: 24 }),
    translate([40, 20, 15], ball(5, { segments: 24 }))
  )

  const bounds = measureBoundingBox(blob)
  console.log('low corner: ', bounds[0])
  console.log('high corner:', bounds[1])
  console.log('width:', bounds[1][0] - bounds[0][0])

  const dot = box(5, 5, 5)
  return [blob, translate(bounds[0], dot), translate(bounds[1], dot)]
}`,
    },
    {
      title: 'Sitting a shape on the grid',
      body: `box[0][2] is the lowest point a shape reaches — its smallest Z. When that number is negative, part of the shape is underground.

Move the shape up by minus that number and its bottom lands exactly on the grid, whatever the shape is: translate([0, 0, -box[0][2]], shape).

Measuring and then moving keeps working when the design changes. Hard-coding translate([0, 0, 8]) is right until somebody edits a number ten lines above it, and then it is quietly wrong.

When all you want is a shape centred on the origin, center({ axes: [true, true, true] }, shape) does that in one call.

Below is the same pin twice. Only the right-hand one was measured first.`,
      code: `function main() {
  const pin = hull(
    ball(8, { segments: 24 }),
    translate([0, 0, 22], ball(4, { segments: 24 }))
  )

  const bounds = measureBoundingBox(pin)
  const lift = -bounds[0][2]
  console.log('lowest point sits at z =', bounds[0][2])
  console.log('so lift it by', lift)

  const sitting = translate([0, 0, lift], pin)
  return [translate([-20, 0, 0], pin), translate([20, 0, 0], sitting)]
}`,
    },
    {
      title: 'measureCenter — the middle',
      body: `measureCenter(shape) gives the middle of the bounding box: halfway along X, halfway along Y, halfway along Z.

That is not the balance point — the spot where the shape would sit still on the end of a pencil. There is a separate function for that one, measureCenterOfMass(shape), and on the L-shaped bracket below the two answers are about 8 mm apart.

The middle of the box is not even guaranteed to be inside the shape. Move this bracket by minus its own centre and the three coloured axis lines cross in the empty notch — in mid-air, exactly where the measurement said the middle was.`,
      code: `function main() {
  const arm = box(60, 12, 12, { center: [30, 6, 6] })
  const post = box(12, 12, 40, { center: [6, 6, 20] })
  const bracket = union(arm, post)

  const middle = measureCenter(bracket)
  console.log('middle of the box:', middle)
  console.log('balance point:    ', measureCenterOfMass(bracket))

  return translate([-middle[0], -middle[1], -middle[2]], bracket)
}`,
    },
    {
      title: 'Surface area, and what a hole costs',
      body: `measureArea(shape) is the surface area — every face added up, in square millimetres. It is the number to reach for when something has to be painted, coated or wrapped, because paint covers a surface rather than filling a space.

Area and volume do not move together. Drilling a hole through the block below takes plastic away, and at the same time it carves a new wall for the paint to cover: the volume drops from 27000 to 17602 while the area climbs from 5400 to 6657.

Flat shapes are worth a warning. A rect has an area, but its volume is 0 and its height is 0. Nothing has gone wrong — there is just nothing there to fill.`,
      code: `function main() {
  const block = box(30, 30, 30)
  const drill = tube(10, 40, { segments: 48 })
  const drilled = subtract(block, drill)

  console.log('solid:   paint', Math.round(measureArea(block)),
    'plastic', Math.round(measureVolume(block)))
  console.log('drilled: paint', Math.round(measureArea(drilled)),
    'plastic', Math.round(measureVolume(drilled)))

  return [translate([-20, 0, 0], block), translate([20, 0, 0], drilled)]
}`,
    },
    {
      title: 'measureEpsilon — when 30 is not 30',
      body: `Computers store numbers with a tiny bit of rounding in them, and every turn and move a shape goes through adds a little more. Spin a 30 mm brick by 30 degrees twelve times and it is back exactly where it started — but its measured width comes back as 30.00000000000002, so width === 30 is false.

measureEpsilon(shape) hands you a sensible margin for that particular shape: about 0.0002 mm for this brick, and a bigger margin for a bigger shape, because bigger numbers carry bigger rounding.

So never compare two measured numbers with ===. Ask whether the gap between them is smaller than the epsilon instead.`,
      code: `function main() {
  const brick = box(30, 20, 10)

  let spun = brick
  for (let i = 0; i < 12; i++) {
    spun = rotateZ(Math.PI / 6, spun)
  }

  const width = measureDimensions(spun)[0]
  const eps = measureEpsilon(spun)
  console.log('width after 12 turns:', width)
  console.log('is it exactly 30?', width === 30)
  console.log('is it within', eps, '?', Math.abs(width - 30) < eps)

  return [translate([-25, 0, 0], brick), translate([25, 0, 0], spun)]
}`,
    },
    {
      title: 'Measuring a whole group at once',
      body: `main() often returns an array of parts instead of one shape. Hand that array to measureBoundingBox and you get an array straight back — one box per part, not one box around the lot.

For the group there is a second family of functions with Aggregate in the name: measureAggregateBoundingBox(shapes) for the box around everything, and measureAggregateVolume(shapes) for the total material. Anything built by extrudeRectangular out of a list of paths counts as a group too.

The staircase below is five separate blocks. Measured one by one you get five boxes; measured as a group it runs from [-52, -8, 0] to [52, 8, 22] and uses 17920 cubic millimetres of plastic.`,
      code: `function main() {
  const steps = []
  for (let i = 0; i < 5; i++) {
    const h = 6 + i * 4
    const step = box(16, 16, h)
    steps.push(translate([i * 22 - 44, 0, h / 2], step))
  }

  console.log('boxes handed back:', measureBoundingBox(steps).length)

  const whole = measureAggregateBoundingBox(steps)
  console.log('the group runs from', whole[0], 'to', whole[1])
  console.log('plastic for all 5:', Math.round(measureAggregateVolume(steps)))

  return steps
}`,
    },
  ],
},
  {
    slug: 'colors',
    title: 'Colors',
    pages: [
      {
        title: 'colorize',
        body: `Everything you build shows up the same orange. colorize(color, shape) hands back a copy of that shape wearing a colour you picked.

The colour is an array of numbers: [red, green, blue]. Each one runs from 0, none of it, to 1, all of it. So [1, 0.2, 0.2] is a strong red and [0.2, 0.4, 1] is a strong blue.

Colour is not part of the shape. It changes nothing about the size or the geometry — only what you see. That is worth doing while you work: three parts in three colours are three parts you can tell apart.`,
        code: `function main() {
  const block = box(15, 15, 15)

  const red = colorize([1, 0.2, 0.2, 1], translate([-20, 0, 0], block))
  const green = colorize([0.3, 0.9, 0.4, 1], block)
  const blue = colorize([0.2, 0.4, 1, 1], translate([20, 0, 0], block))

  return [red, green, blue]
}`,
      },
      {
        title: 'Zero to one, not zero to 255',
        body: `Every colour picker on the web gives you numbers from 0 to 255. JSCAD wants 0 to 1. Divide by 255 and you are there.

Get it wrong and nothing complains. colorize stores [214, 92, 39, 1] exactly as you typed it, and the viewer pulls every number above 1 back down to 1 — so 214, 92 and 39 all become 1, and 1, 1, 1 is white.

That is the left-hand block: no brick colour, no shading either, just flat white. The right-hand block is the same three numbers divided by 255.`,
        code: `function main() {
  const block = box(18, 18, 18)

  const wrong = colorize([214, 92, 39, 1], translate([-12, 0, 0], block))
  const right = colorize([214 / 255, 92 / 255, 39 / 255, 1], translate([12, 0, 0], block))

  return [wrong, right]
}`,
      },
      {
        title: 'The fourth number is see-through',
        body: `The array can carry a fourth number, called alpha: 1 is solid, 0 is invisible, and anything in between lets what is behind show through.

The gold wall in the example never changes. The four blue panes in front of it run 1, 0.6, 0.3 and 0.1. The first hides the wall completely. By the last one the wall is almost as clear as if the pane were not there at all.

Leave the fourth number out and you get 1. colorize fills it in, so [1, 0, 0] and [1, 0, 0, 1] are the same solid red.`,
        code: `function main() {
  const wall = box(90, 6, 30, { center: [0, 14, 15] })
  const parts = [colorize([1, 0.85, 0.2, 1], wall)]

  const alphas = [1, 0.6, 0.3, 0.1]
  for (let i = 0; i < alphas.length; i++) {
    const pane = box(18, 6, 30, { center: [i * 22 - 33, 0, 15] })
    parts.push(colorize([0.3, 0.8, 1, alphas[i]], pane))
  }

  return parts
}`,
      },
      {
        title: 'A colour name is not a colour',
        body: `colorize takes an array and nothing else. colorize('red', shape) looks like it ought to work, and it throws: color must be an array. So does '#ff0000'.

Convert the name into an array first, then colorize. The next three pages are three ways to get that array.

Uncomment the line in the example and run it — the red banner across the top of the viewer is that error, word for word. Worth seeing once, because it is also what a misspelled colour name gets you, for a reason the next page explains.`,
        code: `function main() {
  const block = box(20, 20, 20)

  // colorize('red', block)   <- "color must be an array"
  return colorize(colorNameToRgb('red'), block)
}`,
      },
      {
        title: 'colorNameToRgb',
        body: `colorNameToRgb('tomato') takes any of the 147 CSS colour names — the same list a web page uses — and hands back the array colorize wants. Capital letters do not matter.

A name it does not know is where this turns sharp. colorNameToRgb('tomatoe') does not complain. It quietly returns undefined, and colorize then throws color must be an array, which points at the wrong line.

So if you see that error and you are sure you passed an array, check the spelling of the colour name first.`,
        code: `function main() {
  const names = ['tomato', 'gold', 'mediumseagreen', 'deepskyblue', 'orchid']
  const blocks = []

  for (let i = 0; i < names.length; i++) {
    const block = box(14, 14, 14)
    blocks.push(colorize(colorNameToRgb(names[i]), translate([i * 18 - 36, 0, 0], block)))
  }

  return blocks
}`,
      },
      {
        title: 'hexToRgb',
        body: `A hex code is the six-digit form every colour picker offers to copy: #ff5555. hexToRgb('#ff5555') turns it into the array colorize wants, and the # is optional.

Eight digits instead of six carry alpha as well. '#ff555580' is that same red, about half see-through.

The three-digit shorthand you may have met in CSS is not accepted here: hexToRgb('#f0f') throws the given notation must contain 3 or more hex values. Write the code out in full — '#ff00ff'.

The colors module also carries the converters that run the other way, rgb back to hex and rgb to hsl. Nothing in this course needs them.`,
        code: `function main() {
  const codes = ['#ff5555', '#f1fa8c', '#50fa7b', '#bd93f9']
  const blocks = []

  for (let i = 0; i < codes.length; i++) {
    const block = box(16, 16, 16)
    blocks.push(colorize(hexToRgb(codes[i]), translate([i * 20 - 30, 0, 0], block)))
  }

  return blocks
}`,
      },
      {
        title: 'hslToRgb',
        body: `hslToRgb(hue, saturation, lightness) describes a colour the way you would say it out loud: which colour, how strong, how light. All three numbers run 0 to 1.

Hue is the one that catches everybody. It is a position round the colour wheel measured as a fraction of one whole turn, not in degrees: 0 is red, a third of the way round is green, two thirds is blue, and 1 is back to red. The twelve spokes step round it.

Both bars in front ask for green. Passing 120 asks for 120 whole turns, and what comes back is black. Passing 120 / 360 is green.`,
        code: `function main() {
  const parts = []

  for (let i = 0; i < 12; i++) {
    const spoke = box(18, 6, 6, { center: [26, 0, 0] })
    parts.push(colorize(hslToRgb(i / 12, 1, 0.5),
      rotateZ(i / 12 * 2 * Math.PI, spoke)))
  }

  // Both bars ask for green. Only the one that divides by 360 gets it.
  parts.push(colorize(hslToRgb(120, 1, 0.5),
    box(16, 8, 6, { center: [-10, -46, 0] })))
  parts.push(colorize(hslToRgb(120 / 360, 1, 0.5),
    box(16, 8, 6, { center: [10, -46, 0] })))

  return parts
}`,
      },
      {
        title: 'Paint last',
        body: `Colour survives being moved, turned, scaled and mirrored. Paint a part once and you can place copies of it anywhere.

Colour does not survive a boolean. union, subtract and intersect each build a brand new solid out of the surfaces where the old ones met, and hand it back with no colour at all — silently, no error.

Both blocks in the example are the same plate with the same hole. The left one was painted blue and then drilled, and it is back to the default orange. The right one was drilled first and painted last. Build, cut, then paint.`,
        code: `function main() {
  const plate = box(30, 30, 8)
  const drill = tube(6, 20, { segments: 32 })
  const blue = [0.2, 0.5, 1, 1]

  const lost = subtract(colorize(blue, plate), drill)
  const kept = colorize(blue, subtract(plate, drill))

  return [translate([-20, 0, 0], lost), translate([20, 0, 0], kept)]
}`,
      },
      {
        title: 'One palette for the whole design',
        body: `Once a design has more than about three parts the seams stop showing and you cannot see where one part ends. Colour each part in the same expression that creates it, and a part can never reach the screen unpainted.

Keep the colours in one object at the top of the file. Changing the scheme is then one edit instead of nine, and names like base, post and top say what each colour is for rather than what it looks like.

Nothing here is unioned. Each part is still its own solid; main() returns the array.`,
        code: `const PALETTE = {
  base: colorNameToRgb('slategray'),
  post: colorNameToRgb('goldenrod'),
  top: hexToRgb('#ff5555'),
}

function main() {
  const base = colorize(PALETTE.base,
    box(50, 50, 6, { center: [0, 0, 3] }))

  const post = colorize(PALETTE.post,
    tube(4, 40, { segments: 32, center: [0, 0, 26] }))

  const top = colorize(PALETTE.top,
    box(20, 20, 8, { roundRadius: 2, center: [0, 0, 50] }))

  return [base, post, top]
}`,
      },
      {
        title: 'A different colour on every face',
        body: `colorize paints a whole solid one colour. For one colour per face, go one level down.

A solid is a bag of flat faces. geometries.geom3.toPolygons(solid) hands you the bag — six of them for a box — every face can carry a colour array of its own, and geometries.geom3.create(faces) puts the bag back together into a solid.

The rebuilt cube is a real solid: same size, same volume, and you can still subtract from it. What you cannot have is both. Run a boolean on it and every face colour goes — the same rule as Paint last, two pages back.`,
        code: `function main() {
  const cube = box(30, 30, 30)
  const faces = geom3.toPolygons(cube)

  for (let i = 0; i < faces.length; i++) {
    faces[i].color = hslToRgb(i / faces.length, 0.8, 0.55)
  }

  return geom3.create(faces)
}`,
      },
    ],
  },
  {
    slug: 'text',
    title: 'Text',
    pages: [
      {
        title: 'Letters are lines, not shapes',
        body: `A cube is solid — it has an inside. A letter is not. vectorText hands you letters the way you would draw them: as strokes, the separate pen lines a character is made of. Ask for HI and you get four strokes of two points each.

Three steps turn strokes into something you could hold, and the example is all three:

- vectorText({ height, input }) — the strokes, each one a list of points.
- path2.fromPoints({}, stroke) — one stroke becomes a path, a line JSCAD can work with.
- extrudeRectangular({ size, height }, paths) — a rectangular bar walks along every path. size is how fat the pen is; height is how far the ink rises off the ground.

Two bits of JavaScript may be new. The curly braces on line 1 pull three modules out of the library and give them names. And "for (const stroke of strokes)" runs the lines inside it once per stroke.

Read this program once. Every page after it changes one piece and leaves the rest alone. Start by changing HI to your own name.`,
        code: `function main() {
  const strokes = vectorText({ height: 10, input: 'HI' })

  const paths = []
  for (const stroke of strokes) {
    paths.push(path2.fromPoints({}, stroke))
  }

  return extrudeRectangular({ size: 1, height: 2 }, paths)
}`,
      },
      {
        title: 'How tall, how fat',
        body: `Three numbers shape the letters, and two of them are called height.

height inside vectorText is not the height of a capital. It is the height of a lowercase x. At height 10 an x is 10 mm tall, a capital X comes out 15, and the tail of a g hangs 5 mm below the line. So this page asks for 6 and the C in shCode arrives 9 mm tall. Pick the size you want your lowercase letters to be.

size inside extrudeRectangular is half the pen width: size 1 draws a 2 mm stroke, size 0.5 a 1 mm one. Leave it out and you get 1 — a 2 mm pen, a third of the height of a 6 mm letter. Hence 0.5 here.

height inside extrudeRectangular is the odd one out. It is how far the letters stand up off the ground, and has nothing to do with letter size. Read which braces each one sits in.`,
        code: `function main() {
  const strokes = vectorText({ height: 6, input: 'shCode' })

  const paths = []
  for (const stroke of strokes) {
    paths.push(path2.fromPoints({}, stroke))
  }

  return extrudeRectangular({ size: 0.5, height: 2 }, paths)
}`,
      },
      {
        title: 'Why not extrude',
        body: `extrude is the usual way to push a flat shape upward, so it is the obvious thing to reach for — and it is the wrong tool. It needs a closed outline: a line that finishes where it started, so there is an inside to fill. Letter strokes are open.

Use it anyway and what happens depends on what you hand it. Neither answer is friendly:

- Raw strokes, straight out of vectorText: no complaint at all. For HI it hands back an array of sixteen plain numbers, the coordinates flattened. Empty viewport, no error anywhere.
- Real paths, the ones fromPoints made: it throws "extruded path must be closed".

O is the exception, and this page uses it. O arrives as one stroke of 21 points whose last point is the first point again, so fromPoints marks that path closed and extrude fills it happily. Two Os appear: the left one solid through and through, the right one an outline. Same letter, two functions, volume 419 against 257.

extrudeRectangular never asks whether a path closes. That is why this section uses it everywhere else.`,
        code: `function main() {
  const strokes = vectorText({ height: 10, input: 'O' })
  const loop = path2.fromPoints({}, strokes[0])

  const filled = extrude(3, loop)
  const outline = extrudeRectangular({ size: 1, height: 3 }, [loop])

  return [filled, translate([20, 0, 0], outline)]
}`,
      },
      {
        title: 'Finding the middle of a word',
        body: `vectorText starts every word at the origin and runs right, so a long word sits off to one side of the grid. To centre it you need its width — and you only know that once it is built, because every letter is a different width.

measureAggregateBoundingBox gives the smallest box the whole group fits inside. A box is two corners: box[0] is the low one, written [x, y, z], and box[1] is the high one. So box[0][0] is the left edge, box[1][0] the right, and the width is one minus the other. SHCODE at height 10 measures 86.7 mm across.

Half that width is not quite the answer, because the word does not begin at exactly zero. Subtract the left edge first, then half the width.

The trap is the other measure function. Twelve paths make twelve separate solids, and measureBoundingBox on a list of twelve gives twelve boxes — so box[0][0] is a corner, [1.14, -1, 0], not a number. Subtracting one array from another in JavaScript is NaN, and nothing objects: translate takes NaN without a word, every x in the model becomes NaN, and no error appears anywhere. NaN is not a place anything can be drawn. On a group, use the Aggregate one.`,
        code: `function main() {
  const strokes = vectorText({ height: 10, input: 'SHCODE' })

  const paths = []
  for (const stroke of strokes) {
    paths.push(path2.fromPoints({}, stroke))
  }
  const letters = extrudeRectangular({ size: 1, height: 2 }, paths)

  const bounds = measureAggregateBoundingBox(letters)
  const width = bounds[1][0] - bounds[0][0]

  return translate([-bounds[0][0] - width / 2, 0, 0], letters)
}`,
      },
      {
        title: 'A name tag',
        body: `Everything so far, plus a plate to sit on. The same paths are extruded twice, because there are two ways to put a name on an object and this page does both.

Raised letters sit on top, and union glues plate and letters into one solid. For that they have to touch: the plate is 3 mm thick and centred so its top face lands at z = 3, so the letters are lifted by exactly 3.

Engraved letters are cut in, and subtract takes the letter shapes out of the plate. A cut has to overlap the surface it cuts — two faces sitting exactly on top of each other is asking for trouble — so the cutter is 2 mm tall and lifted only 2. It pokes 1 mm above and cuts 1 mm in.

That 1 mm is the number to remember. Letters standing 1 mm proud read clearly and print reliably; 5 mm looks like a mistake and snaps off in a pocket. Engraved, 1 mm deep is the same story.

The plate sizes itself from the measured width, so a longer name still fits: width + 14 leaves 7 mm past each end. The two tags come back 30 mm apart.`,
        code: `function main() {
  const strokes = vectorText({ height: 8, input: 'ADA' })

  const paths = []
  for (const stroke of strokes) {
    paths.push(path2.fromPoints({}, stroke))
  }

  const raised = extrudeRectangular({ size: 0.9, height: 1 }, paths)
  const cutter = extrudeRectangular({ size: 0.9, height: 2 }, paths)

  const cuboid = measureAggregateBoundingBox(raised)
  const width = cuboid[1][0] - cuboid[0][0]
  const shift = -cuboid[0][0] - width / 2

  const plate = box(width + 14, 24, 3, { roundRadius: 1.4, center: [0, 0, 1.5] })

  const tag = union(plate, translate([shift, -6, 3], raised))
  const dug = subtract(plate, translate([shift, -6, 2], cutter))

  return [tag, translate([0, 30, 0], dug)]
}`,
      },
      {
        title: 'One letter at a time',
        body: `vectorText picks the spacing for you. vectorChar hands you one character and lets you pick it yourself.

vectorChar({ height: 10, input: 'R' }) returns an object holding three things: segments, the strokes for that letter — R has three; width, how far along the next letter should start — R is 15 mm; and height, the number you asked for.

So the loop keeps a variable x meaning "where the next letter goes", moves each path there, then pushes x along by that letter's width plus 4 mm of extra air. Change the 4 and the whole word breathes differently.

Two things to notice. "for (const character of 'ADA LAB')" walks a string one character at a time. And a space is a real character: width 11.4 mm, zero segments — so the inner loop never runs while x moves along anyway, which is exactly what a space is for.

Guard that zero. extrudeRectangular refuses an empty list, with the unhelpful message "wrong number of arguments". Collecting every path into one list and extruding once at the end means a space can never hand it an empty one.`,
        code: `function main() {
  const paths = []
  let x = 0

  for (const character of 'ADA LAB') {
    const letter = vectorChar({ height: 10, input: character })
    for (const stroke of letter.segments) {
      const path = path2.fromPoints({}, stroke)
      paths.push(translate([x, 0], path))
    }
    x = x + letter.width + 4
  }

  return extrudeRectangular({ size: 1, height: 2 }, paths)
}`,
      },
    ],
  },
  {
  slug: 'maths',
  title: 'Maths',
  pages: [
    {
      title: 'A position is three numbers',
      body: `Every position you have written so far has been three numbers in an array: translate([0, 0, 20], ball). The maths module has a name for that array. It is a vec3 — a vector of three numbers — and the module comes with a small pile of functions for doing arithmetic on them.

A vec3 is a plain JavaScript array and nothing more. No new kind of object, no class, no methods hanging off it. vec3.fromValues(24, 14, 6) hands back exactly [24, 14, 6], and translate takes it happily, because it is the same array you would have typed out by hand.

So why bother? Because a position that has a name can be worked on. Once corner is a variable, the functions on the next pages can measure from it, add to it and halve it — and every shape built from it moves together when you edit the one line that made it.

Two spellings reach the module: vec3, or const { vec3 } = maths once you have pulled maths out of require. There is a vec3.create() as well, which hands back [0, 0, 0] — a blank one, which turns out to matter on the next page.`,
      code: `const { vec3 } = maths

function main() {
  const cuboid = box(48, 28, 12)

  // A vec3 IS the array. fromValues just builds [24, 14, 6] and hands it back.
  const corner = vec3.fromValues(24, 14, 6)
  console.log('corner is', corner)

  // So it goes straight into translate, which wanted an [x, y, z] all along.
  const marker = translate(corner,
    ball(3, { segments: 24 })
  )

  return [cuboid, marker]
}`,
    },
    {
      title: 'Adding and halving positions',
      body: `Three functions do most of the work. vec3.add puts two vectors together, vec3.subtract takes one away from the other, and vec3.scale multiplies one by a number — scale by 0.5 to halve it, by 2 to double it, by -1 to flip it round.

They are called in a way that looks wrong the first time. Each one takes an extra first argument, and that argument is where the answer gets written:

  vec3.add(vec3.create(), hub, reach)

The blank vec3.create() is the destination. The function fills it in and hands it back, so the line still reads like an expression that gives you the sum. JSCAD works this way because a real model does this arithmetic thousands of times, and filling in an array you already have is faster than making a fresh one every time.

Pass a new vec3.create() and you never have to think about it again. Pass one of your own vectors instead and it gets overwritten — vec3.add(hub, hub, reach) changes hub, and the position it used to hold is gone. That is the same pass-by-reference behaviour every JavaScript array has; it is just easier to walk into here, because overwriting is what the argument is for.

Not everything wants a destination. The ones that build a vector out of nothing — create and fromValues — have nothing to write over, and the ones that hand back a plain number have nowhere to put it.`,
      code: `const { vec3 } = maths

function main() {
  const hub = vec3.fromValues(0, 0, 6)
  const reach = vec3.fromValues(30, 0, 0)

  // Each answer is written into a fresh blank vector.
  const right = vec3.add(vec3.create(), hub, reach)
  const left = vec3.subtract(vec3.create(), hub, reach)
  const halfway = vec3.add(vec3.create(), hub, vec3.scale(vec3.create(), reach, 0.5))
  console.log('left', left, 'right', right)

  const sphere = ball(5, { segments: 24 })
  const pin = ball(3, { segments: 24 })

  // Edit reach, and all three of these move.
  return [
    translate(left, sphere),
    translate(right, sphere),
    translate(halfway, pin),
  ]
}`,
    },
    {
      title: 'How far apart two points are',
      body: `vec3.distance(a, b) gives the straight-line distance between two positions, in millimetres. It takes no destination, because what comes back is a single number rather than a vector.

This is the function that lets a part size itself. The ring below has to reach two pegs, so its radius is half the distance between them; it has to sit between them, so its position is the two pegs added together and scaled by 0.5. Both numbers are measured from the pegs. Neither is typed in.

That is worth the extra line, because the alternative is reading the gap off the screen once and writing 26.93. Move a peg after that and the typed number is quietly wrong. Nothing complains — the ring just misses.

So test it. Change either peg to anything you like, including numbers with a Z in them, and the ring still lands on both. It has to: the radius and the centre are both worked out from wherever the two pegs ended up.

Measuring a shape you already built, rather than two points you chose, is a different module — see Measurements, under Centering something you did not build.`,
      code: `const { vec3 } = maths

function main() {
  // Move either peg. The band still lands on both.
  const a = vec3.fromValues(-20, -10, 0)
  const b = vec3.fromValues(30, 10, 0)

  const gap = vec3.distance(a, b)
  console.log('the pegs are', gap.toFixed(2), 'mm apart')

  // Halfway between them: add the two, then take half.
  const mid = vec3.scale(vec3.create(), vec3.add(vec3.create(), a, b), 0.5)
  console.log('halfway is', mid)

  const band = subtract(
    tube(gap / 2 + 2, 4, { segments: 64 }),
    tube(gap / 2 - 2, 6, { segments: 64 })
  )

  const peg = tube(3, 16, { segments: 24 })

  return [
    translate(mid, band),
    translate(a, peg),
    translate(b, peg),
  ]
}`,
    },
    {
      title: 'A direction with no length',
      body: `Subtract one position from another and what comes back is not a position. b minus a is the trip from a to b: which way, and how far. It only becomes a place again when you add it to something.

Often you want the which-way half without the how-far half. vec3.normalize(vec3.create(), v) hands back a vector pointing exactly the same way but exactly 1 mm long. A vector of length 1 is called a unit vector, and it is the ordinary way to write down a direction, because you can then scale it to whatever length you actually need.

That is the trick below. Normalize the trip from peg to peg, scale the result to 10, and you have a step of exactly 10 mm in the right direction. Adding that step over and over walks a line of beads from one peg to the other, 10 mm apart, whichever way the pegs happen to lie.

vec3.length(v) is how you check. It hands back how long a vector is, and for a normalized one it says 1. Print it and see.

One thing to know before it bites: normalizing [0, 0, 0] gives [0, 0, 0] back with no error at all, because a vector of no length has no direction to keep. If a row of copies piles up in a single spot instead of spreading out, that is the symptom — the two points you subtracted are the same point.`,
      code: `const { vec3 } = maths

function main() {
  const a = vec3.fromValues(-20, -10, 0)
  const b = vec3.fromValues(30, 10, 0)

  const along = vec3.subtract(vec3.create(), b, a)     // the whole trip
  const unit = vec3.normalize(vec3.create(), along)    // same way, 1 mm long
  const step = vec3.scale(vec3.create(), unit, 10)     // same way, 10 mm long
  console.log('unit is', vec3.length(unit).toFixed(3), 'mm long')
  console.log('step is', step[0].toFixed(2), step[1].toFixed(2), step[2].toFixed(2),
    'and', vec3.length(step).toFixed(3), 'mm long')

  const bead = ball(3, { segments: 24 })
  const peg = tube(2, 14, { segments: 24 })

  const parts = [translate(a, peg), translate(b, peg)]
  const hops = Math.floor(vec3.length(along) / 10)
  for (let i = 0; i <= hops; i++) {
    const out = vec3.scale(vec3.create(), step, i)
    parts.push(translate(vec3.add(vec3.create(), a, out), bead))
  }
  return parts
}`,
    },
    {
      title: 'Radians are a distance',
      body: `rotate and rotateZ want radians, and a radian is not a secret code for a degree. It is a distance.

Stand an arm 30 mm long on the origin and turn it by 1 radian. The tip travels 30 mm around the rim — one arm's length of rim. Turn it by 2 radians and the tip travels 60 mm. That is the whole definition: the angle is how far around you went, counted in arm lengths. Which is also why the numbers look untidy. All the way round is 6.283185… arm lengths of rim, never a round number, while 360 is a figure somebody made up because it divides nicely.

A whole turn has a name in the library: constants.TAU, which is that 6.283185… So half a turn is constants.TAU / 2 and a quarter is constants.TAU / 4. All three ways of writing a quarter turn below — Math.PI / 2, degToRad(90), constants.TAU / 4 — are the same number, and the run proves it: three arms land on top of each other and you see one.

Write the whole path, not a bare TAU. Books and forum answers write angle: TAU because most JSCAD editors put it in scope; this runner does not, so a bare TAU is not defined and you get TAU is not defined with nothing else to go on. Destructure maths the way the block below does and write constants.TAU, or take the shorter constants.TAU that this runner also puts in scope.

The fourth arm is the mistake this page exists to prevent. rotateZ(90) is perfectly legal and means 90 radians, which is fourteen whole turns and a bit, finishing at 116.6 degrees. Nothing warns you. You just get an arm pointing somewhere odd.

degToRad and radToDeg live in the top-level utils module, covered in Transforms, under Turning by degrees. Watch the name: written bare, utils is that top-level module, and the maths module has a different utils of its own that you reach as `,
      code: `function main() {
  const arm = box(40, 3, 3, { center: [20, 0, 0] })

  // The same quarter turn, spelled three ways.
  const quarterTurn = [Math.PI / 2, degToRad(90), constants.TAU / 4]
  console.log('three spellings of a quarter turn:', quarterTurn.join(' '))

  const parts = [arm]
  for (let i = 0; i < quarterTurn.length; i++) {
    parts.push(rotateZ(quarterTurn[i], arm))
  }

  // The mistake: this is 90 RADIANS, not 90 degrees. Lifted so you can see it.
  const wrong = rotateZ(90, translateZ(8, arm))
  console.log('90 radians lands at', radToDeg(90 % constants.TAU).toFixed(1), 'degrees')
  parts.push(wrong)

  return parts
}`,
    },
    {
      title: 'A point on a circle, from the angle',
      body: `A vec2 is the same idea as a vec3 with one fewer number: a plain array of two, [x, y], for when height is not part of the question. It has its own set of functions — vec2.create(), vec2.add, vec2.scale — and they work exactly like the vec3 ones, destination first and all.

It also has something vec3 does not. vec2.fromAngleDegrees(vec2.create(), 30) hands you the point on a circle of radius 1 that sits 30 degrees round from the X axis. Scale that by your radius and you have the point on your circle. No sine, no cosine, no stopping to remember which one is x.

vec2.fromAngleRadians is the same function for an angle already in radians, which is what you want when the angle came out of a calculation rather than out of you.

The catch is that translate wants three numbers and a vec2 has two, so the height goes in by hand: [at[0], at[1], 0].

This is the same ring as Patterns, under A ring with sin and cos, and the same numbers come out of it. Use whichever one says more clearly what you meant. There is no vec3 twin of these two, because a direction in 3D takes two angles to pin down, not one.`,
      code: `const { vec2 } = maths

function main() {
  const radius = 40
  const parts = [tube(12, 6, { segments: 48 })]
  const post = tube(4, 12, { segments: 24 })

  for (let i = 0; i < 12; i++) {
    // The point on a circle of radius 1, straight from the angle.
    const dir = vec2.fromAngleDegrees(vec2.create(), i * 30)
    const at = vec2.scale(vec2.create(), dir, radius)
    // A vec2 is two numbers; translate wants three.
    parts.push(translate([at[0], at[1], 0], post))
  }
  return parts
}`,
    },
    {
      title: 'A placement you can keep',
      body: `A mat4 is sixteen numbers holding a move, a turn and a resize all at once — one placement, as a single value. You have been making them all along without seeing them: every translate, rotate and scale builds a mat4 and applies it to your shape.

Building one yourself pays off when the same placement has to happen to more than one part. Overview, under Shapes are values, made the case that a shape is a value you can name and reuse. A placement is a value too, and naming it is why the four parts of the crane below are placed by one variable instead of four hand-matched pairs of lines.

Three functions build it. mat4.fromTranslation(mat4.create(), [50, 0, 0]) is a move. mat4.fromZRotation(mat4.create(), Math.PI / 2) is a turn. mat4.multiply(mat4.create(), move, spin) joins them into one, and the right-hand one happens first — the same order as a nest, where the inner call goes first. Transforms, under Order matters, is why that order changes the answer.

transform(placement, shape) applies it, and like every transform it hands back a new shape and leaves the original alone. Run it and there are two cranes: the base swings a quarter turn and slides 50 mm out, and the mast, boom and head come with it, still bolted together the same way. Change the 50 and the whole crane moves — one number, four parts.

For a single shape, translate and rotate are shorter and you should keep using them. The matrix earns its place the moment a placement needs a name.`,
      code: `const { mat4 } = maths

// Four parts, each built where it belongs on the crane.
function crane() {
  return [
    box(20, 20, 4, { center: [0, 0, 2] }),
    box(4, 4, 24, { center: [0, 0, 16] }),
    box(20, 4, 4, { center: [10, 0, 26] }),
    ball(4, { segments: 24, center: [20, 0, 26] }),
  ]
}

function main() {
  // One placement: turn a quarter turn, then move 50 mm along X.
  const place = mat4.multiply(mat4.create(),
    mat4.fromTranslation(mat4.create(), [50, 0, 0]),
    mat4.fromZRotation(mat4.create(), Math.PI / 2)
  )

  const parts = crane()
  const copy = []
  for (let i = 0; i < parts.length; i++) {
    copy.push(transform(place, parts[i]))
  }
  return parts.concat(copy)
}`,
    },
  ],
},
  {
    slug: 'parameters',
    title: 'Parameters',
    pages: [
      {
        title: 'A number with a name',
        body: `Every shape so far has had its numbers typed straight in: box(40, 30, 4). That works until someone asks for the same plate, only wider — and then you go hunting through the file for the 40.

A parameter is a value your design asks for by name instead of spelling out. You list the ones you want in a function called getParameterDefinitions, which hands back an array of small objects. JSCAD collects the values and passes them to main as one object, so the width arrives as params.width.

Every knob needs a name and a starting value, and the starting value goes in a field called initial.

This sandbox finds getParameterDefinitions wherever you declare it. jscad.app does not: there a file has to export it, next to main, or it gets no panel at all. "Taking your model to jscad.app" has the export line.

There is no panel beside this page — the sliders and boxes are a jscad.app feature. Here the editor is the panel: change initial: 40 to 70 and press Ctrl+Enter.`,
        code: `function getParameterDefinitions() {
  return [
    { name: 'width', type: 'number', initial: 40, caption: 'Width (mm)' }
  ]
}

function main(params) {
  return primitives.cuboid({ size: [params.width, 30, 4] })
}`,
      },
      {
        title: 'One knob, many places',
        body: `A parameter earns its keep when it decides more than one number.

This tray is built from a single knob. size sets the outside width, the outside depth, the height (half the width), and — once three millimetres of wall is taken off each side — the hollow scooped out of the middle. Five measurements, one place to change them.

The rule of thumb: type a number straight into main only when it genuinely has nothing to do with any other number. Wall thickness is its own decision, so it would deserve its own knob. The inside size is not a decision at all — it is the outside size minus two walls — so it should be arithmetic, never a second knob that somebody can set wrong.

Change initial: 40 to 100 and run it. Then try 20. The tray keeps its proportions both times, because every measurement was worked out from the one you changed.`,
        code: `function getParameterDefinitions() {
  return [
    { name: 'size', type: 'number', initial: 40, caption: 'Outside size (mm)' }
  ]
}

function main(params) {
  const size = params.size
  const outside = primitives.cuboid({ size: [size, size, size / 2] })
  const scoop = primitives.cuboid({ size: [size - 6, size - 6, size / 2] })
  return booleans.subtract(outside, transforms.translateZ(3, scoop))
}`,
      },
      {
        title: 'Asking for a number',
        body: `Four of the types hand you a number. They differ only in how the panel asks for it — and the number that reaches main() is the same ordinary JavaScript number every time.

number is a box you type into. slider is a bar you drag — the same value, but far better when you are hunting for a size by eye. int is for counts: sides, teeth, holes, anything with no sensible half. float is for the ones where half makes perfect sense: a radius of 62.5 mm, a gap of 1.6 mm.

Do not read int and float as two kinds of number. JavaScript has one kind. The word is telling the panel whether to let you type a decimal point, nothing more, which is why choosing the wrong one changes the knob and never changes the value.

All four take min, max and step. min and max are the ends of the range, and step is how far one nudge moves. Pick them from what the model can actually survive rather than from what looks tidy. A cylinder needs at least four segments — segments is how many flat faces it is built from — and asking for three stops the build with "segments must be four or more". That is why sides starts at min: 4.

Turn sides up to 24 and run it. The cylinder stops looking like a pencil and starts looking round.`,
        code: `function getParameterDefinitions() {
  return [
    { name: 'radius', type: 'number', initial: 14, min: 4, max: 30, step: 1, caption: 'Radius (mm)' },
    { name: 'height', type: 'slider', initial: 20, min: 5, max: 60, step: 1, caption: 'Height (mm)' },
    { name: 'sides', type: 'int', initial: 6, min: 4, max: 24, step: 1, caption: 'Number of sides' },
    { name: 'lift', type: 'float', initial: 2.5, min: 0, max: 10, caption: 'Lift off the bed (mm)' }
  ]
}

function main(params) {
  // All four are typeof 'number'. The type only decided the control.
  console.log(typeof params.radius, typeof params.height,
    typeof params.sides, typeof params.lift)

  return transforms.translateZ(params.lift, primitives.cylinder({
    radius: params.radius,
    height: params.height,
    segments: params.sides
  }))
}`,
      },
      {
        title: 'Asking for yes or no',
        body: `checkbox is a knob with two positions, and params.keyring arrives as true or false. Use it for a feature that is either there or it is not: a lid, a keyring hole, engraved initials.

The code that reads one is nearly always an early return or an if. Here the tag is built first and the hole is subtracted only when the box is ticked, so the off case is a single line and hard to get wrong.

A checkbox is the one type that wants two fields. initial: true is the value main receives; checked: true is the one the panel reads to draw the tick. Give them the same value and never think about it again.

Write checked on its own — as plenty of older examples on the web do — and params.keyring arrives as undefined. undefined is falsy, so the hole quietly never gets cut, no error appears, and the only clue is a tag that came out plain.`,
        code: `function getParameterDefinitions() {
  return [
    { name: 'keyring', type: 'checkbox', initial: true, checked: true, caption: 'Keyring hole' }
  ]
}

function main(params) {
  const tag = primitives.roundedCuboid({ size: [40, 20, 5], roundRadius: 2 })
  if (!params.keyring) return tag

  const hole = primitives.cylinder({ radius: 2.5, height: 10 })
  return booleans.subtract(tag, transforms.translate([-15, 0, 0], hole))
}`,
      },
      {
        title: 'Asking for one of a few',
        body: `When the answer is one of a short fixed list, do not make anybody type it. choice draws a drop-down.

It takes two lists, and they must be the same length. values is what your code sees, so keep those short and lowercase. captions is what the person reads, so those get capital letters and spaces. initial has to be one of the strings in values — a caption there matches nothing, and every branch falls through.

Compare with === and let the last line be the fallback, so an unrecognised value still builds something instead of returning nothing.

radio is the identical object with one word changed. It draws every option at once as a row of buttons instead of hiding them behind a drop-down. Three or four options, use radio; more than that and the row gets long, so use choice.`,
        code: `function getParameterDefinitions() {
  return [
    {
      name: 'shape', type: 'choice', initial: 'ball',
      values: ['cube', 'ball', 'post'],
      captions: ['Cube', 'Ball', 'Post'],
      caption: 'Shape'
    }
  ]
}

function main(params) {
  if (params.shape === 'ball') return primitives.sphere({ radius: 12, segments: 32 })
  if (params.shape === 'post') return primitives.cylinder({ radius: 6, height: 40 })
  return primitives.cuboid({ size: [20, 20, 20] })
}`,
      },
      {
        title: 'Asking for words and colour',
        body: `text hands main a string — whatever was typed, letters and spaces and all. vectorText turns that string into the outlines of its letters, and extrudeRectangular gives the outlines thickness.

color hands main a string too, but a hex one. '#ff5555' is six digits saying how much red, then green, then blue. colorize cannot read hex; it wants three numbers from 0 to 1, so hexToRgb goes in between.

Change '#ff5555' to '#50fa7b' and run it. The whole tag turns green.

One trap lives on this page. Delete every letter of the name and vectorText has nothing to outline, so extrudeRectangular is handed an empty list and stops with "wrong number of arguments". An empty text box is a perfectly normal thing for a person to leave behind, which makes it your job to expect.`,
        code: `function getParameterDefinitions() {
  return [
    { name: 'label', type: 'text', initial: 'SAM', caption: 'Name' },
    { name: 'shade', type: 'color', initial: '#ff5555', caption: 'Plate colour' }
  ]
}

function main(params) {
  const strokes = text.vectorText({ height: 10, input: params.label })
  const paths = strokes.map((points) => geometries.path2.fromPoints({}, points))
  const letters = extrusions.extrudeRectangular({ size: 1.2, height: 2 }, paths)

  const plate = primitives.cuboid({ size: [70, 22, 3] })
  const tag = booleans.union(plate, transforms.translate([-30, -5, 1], letters))

  return colors.colorize(colors.hexToRgb(params.shade), tag)
}`,
      },
      {
        title: 'caption and group',
        body: `caption is the words the panel prints beside the knob. Leave it out and the panel falls back to the variable name, and whoever opens your design has to work out for themselves what bore means. Put the units in it: "Width (mm)" answers a question nobody should have to ask.

group is furniture rather than a knob. It draws a heading, and every knob listed after it belongs under that heading until the next group comes along. It holds no value of its own — plateGroup never turns up in params at all, and main has no reason to look for it. Giving a group initial: 'closed' starts its section folded up, which is how an advanced knob stays out of a beginner's way without being deleted.

JSCAD has a few more types built for web forms: date, email, url and password. A 3D model rarely has a use for any of them.`,
        code: `function getParameterDefinitions() {
  return [
    { name: 'plateGroup', type: 'group', caption: 'Plate' },
    { name: 'width', type: 'number', initial: 60, min: 20, max: 120, step: 5, caption: 'Width (mm)' },
    { name: 'depth', type: 'number', initial: 40, min: 20, max: 120, step: 5, caption: 'Depth (mm)' },

    { name: 'holeGroup', type: 'group', initial: 'closed', caption: 'Mounting hole' },
    { name: 'bore', type: 'number', initial: 4, min: 2, max: 10, step: 0.5, caption: 'Hole width (mm)' }
  ]
}

function main(params) {
  const plate = primitives.cuboid({ size: [params.width, params.depth, 5] })
  const hole = primitives.cylinder({ radius: params.bore / 2, height: 20 })
  return booleans.subtract(plate, hole)
}`,
      },
      {
        title: 'Guard the numbers yourself',
        body: `min and max are guard rails the panel draws, and there is no panel here. The editor beside this page is standing in for it, and nothing in the editor stops you typing initial: 50 into a knob whose max is 10. int is no stricter: segments: 6.5 raises no complaint, it quietly builds the same eighteen faces as 6 would.

So the arithmetic inside main has to hold up on its own. This cup is a cylinder with a smaller cylinder taken out of it, and the smaller one's radius is outer minus wall. Let wall grow past outer and that radius turns negative, and JSCAD stops with "radius must be positive".

Math.min is the whole fix. It refuses to let wall climb past outer minus one, whatever number turns up. Delete that line, set wall to 50, press Run, and read the error. Put the line back and the very same 50 builds a sensible cup.`,
        code: `function getParameterDefinitions() {
  return [
    { name: 'outer', type: 'number', initial: 30, min: 12, max: 60, step: 1, caption: 'Outside radius (mm)' },
    { name: 'wall', type: 'number', initial: 3, min: 1.2, max: 10, step: 0.2, caption: 'Wall (mm)' }
  ]
}

function main(params) {
  // The panel stops at max: 10. Nothing stops a typed value, so clamp here.
  const wall = Math.min(params.wall, params.outer - 1)

  const outside = primitives.cylinder({ radius: params.outer, height: 40 })
  const inside = primitives.cylinder({ radius: params.outer - wall, height: 40 })
  return booleans.subtract(outside, transforms.translateZ(4, inside))
}`,
      },
    ],
  },
  {
    slug: 'patterns',
    title: 'Patterns',
    pages: [
      {
        title: 'A list of shapes is a valid answer',
        body: `Up to now main() has returned one shape. It can also return a list of them — in JavaScript a list is called an array, and you write it as values inside square brackets, separated by commas: [a, b, c].

The viewport draws everything in the array. Nothing merges: three shapes in an array are three separate solids that happen to be sitting near each other. If you need them fused into one object, that is what union is for, and there is a page on doing that to a whole array further down.

This one fact is what makes the rest of this section possible. A loop's job is to build an array, and main() is happy to be handed one.`,
        code: `function main() {
  const left = translate([-22, 0, 0], box(12, 12, 12))
  const middle = ball(7, { segments: 32 })
  const right = translate([22, 0, 0],
    tube(6, 12, { segments: 32 })
  )
  return [left, middle, right]
}`,
      },
      {
        title: 'Your first loop',
        body: `Copy and paste gets you three of something. A loop gets you thirty, and it does it with fewer lines than the copy-paste version needed for three.

A for loop repeats a block of code, counting as it goes. for (let i = 0; i < 5; i++) means: start the counter i at 0, keep going while i is under 5, and add one to i each time round. So the block runs with i equal to 0, 1, 2, 3, 4 — five times, starting at zero, which is how counting works nearly everywhere in JavaScript.

The recipe is always the same three moves. Make an empty array. Inside the loop, build one shape and push it onto the end of the array. After the loop, return the array.

The only line that does anything interesting is the position, and it is the counter times a spacing. i * 14 puts each post 14 mm further along X than the one before.`,
        code: `function main() {
  const posts = []
  for (let i = 0; i < 5; i++) {
    const post = box(8, 8, 30)
    posts.push(translate([i * 14, 0, 15], post))
  }
  return posts
}`,
      },
      {
        title: 'Give the numbers names',
        body: `The loop on the last page has two numbers buried in it: the 5 that decides how many, and the 14 that decides how far apart. Buried numbers are the reason a design is painful to change — you have to find them first, and 14 looks like every other 14 in the file.

Lift them to the top of main() as variables with names. Now count and spacing say what they are, changing the row means editing one obvious line, and later on you can hand those same names to a parameter slider without rewriting anything else.

The row also runs off to the right, because the first post sits at x = 0 and the rest march away from it. To centre it on the origin, work out how wide the whole row is — the gaps between the posts, which is (count - 1) * spacing — and slide everything back by half of that.

Nine posts, 14 mm apart, is a row 112 mm wide. Subtracting 56 puts the middle post at x = 0 and the ends at -56 and +56.`,
        code: `function main() {
  const count = 9
  const spacing = 14
  const width = (count - 1) * spacing

  const posts = []
  for (let i = 0; i < count; i++) {
    posts.push(translate([i * spacing - width / 2, 0, 15],
      box(8, 8, 30)
    ))
  }
  return posts
}`,
      },
      {
        title: 'map(): one shape per value',
        body: `Sometimes you do not want a shape per number-you-counted-to; you want a shape per item in a list you already have. Five bar heights, six hole positions, the letters of a name.

Every array has a .map() method. It walks the array, hands each value to a function you supply, and collects whatever that function returns into a new array. Give it a function that turns a number into a shape and you get an array of shapes — exactly what main() wants.

The function is written in the short arrow form: (h, i) => ... means "given h and i, produce this". The first parameter is the value out of the array, the second is its position in the array, counting from 0 — the same counter the for loop was giving you.

Nothing here is magic and nothing is faster. The same row could be written with a for loop. map is worth knowing because when the data comes first, it reads in the order you thought of it: here are the heights, turn each one into a bar.`,
        code: `function main() {
  const heights = [10, 24, 18, 32, 12]
  const spacing = 12
  const width = (heights.length - 1) * spacing

  return heights.map((h, i) =>
    translate([i * spacing - width / 2, 0, h / 2],
      box(9, 9, h)
    )
  )
}`,
      },
      {
        title: 'Array.from(): when there is no list yet',
        body: `map() needs an array to walk. If all you have is a count, there is nothing to walk — you would have to build [0, 1, 2, 3, 4] by hand first, which is exactly the tedium you were trying to avoid.

Array.from({ length: count }, (_, i) => ...) does both steps at once: it makes an array of that length and fills each slot with whatever your function returns for that position. So the whole row becomes one expression, with no empty array to declare and no push to remember.

The underscore in (_, i) is a real parameter, holding the value in the slot — which is nothing, because the slots start out empty. Naming it _ is the usual way of saying "this one is here so I can reach the one after it, and I am not going to use it".

Use whichever of the three forms you can read back in a month. A for loop when the body has several steps in it, map when you already have the data, Array.from when you only have a count. They all produce the same array of shapes.`,
        code: `function main() {
  const count = 7
  const spacing = 13
  const width = (count - 1) * spacing

  return Array.from({ length: count }, (_, i) =>
    translate([i * spacing - width / 2, 0, 0],
      tube(5, 6, { segments: 32 })
    )
  )
}`,
      },
      {
        title: 'A grid: two loops',
        body: `A grid is a row of rows. Put one loop inside another — nested is the word for it — and the inner loop runs all the way through, start to finish, for every single step of the outer one. Six columns each containing four rows is twenty-four trips through the inner body.

Both counters need names you can tell apart. Call them col and row rather than i and j, because the whole exercise is using them in the same translate: one drives X, the other drives Y. If your grid comes out as a diagonal line, you used the same counter for both.

Centring works the way it did for the row, just twice — half the width off X, half the depth off Y.

The plate is pushed into the array before the loop runs. An array of shapes does not care where its contents came from, so a loop's output and a single hand-placed part can sit in the same list.`,
        code: `function main() {
  const cols = 6
  const rows = 4
  const pitch = 12
  const xShift = (cols - 1) * pitch / 2
  const yShift = (rows - 1) * pitch / 2

  const parts = [
    box(cols * pitch, rows * pitch, 4, { center: [0, 0, -2] })
  ]
  for (let col = 0; col < cols; col++) {
    for (let row = 0; row < rows; row++) {
      parts.push(translate(
        [col * pitch - xShift, row * pitch - yShift, 3],
        tube(4, 6, { segments: 24 })
      ))
    }
  }
  return parts
}`,
      },
      {
        title: 'Copies that change as they go',
        body: `So far the loop has been a photocopier: same shape every time, only the position moving. The counter is an ordinary number, though, and you can put it anywhere a number is allowed — including inside the size.

Here the height is 5 + i * 4. Step 0 is 5 mm tall, step 1 is 9, and by step 9 it is 41. One line, and the row of identical posts has become a staircase.

Watch the Z position when a size changes. box builds centred on the point you put it at, so a 41 mm step placed at z = 0 would sink halfway through the floor. Moving it up by half its own height — height / 2 — lands every step flat on the grid no matter how tall it is. That is the same trick every time: half of whatever the size is.

This is where a loop stops being a way to save typing and starts being a design. A curve, a wedge, a spiral, a set of shelves that get deeper towards the bottom — all of them are one arithmetic expression away from the row you already have.`,
        code: `function main() {
  const count = 10
  const spacing = 11
  const width = (count - 1) * spacing

  const steps = []
  for (let i = 0; i < count; i++) {
    const height = 5 + i * 4
    steps.push(translate([i * spacing - width / 2, 0, height / 2],
      box(9, 24, height)
    ))
  }
  return steps
}`,
      },
      {
        title: 'Skipping and alternating',
        body: `Not every copy has to be built, and not every copy has to be the same. An if inside the loop body decides, once per trip, what happens this time round.

continue means "stop this trip and go straight to the next one". Nothing gets pushed, so that position in the pattern comes out empty. Two continues in the middle of a comb leave a gap where a cable can pass through.

For every-other-one behaviour, use the remainder operator, written %. It gives you what is left over after a division, so i % 2 is 0 for even counters and 1 for odd ones. Testing i % 2 === 0 splits the loop into two alternating cases; i % 3 === 0 would mark every third one instead.

Both tests read the counter, so both survive a change to count. Twelve teeth or forty, the gap stays in the middle and the tall ones stay alternating.`,
        code: `function main() {
  const count = 12
  const spacing = 10
  const width = (count - 1) * spacing

  const teeth = []
  for (let i = 0; i < count; i++) {
    if (i === 5 || i === 6) continue
    const height = i % 2 === 0 ? 26 : 14
    teeth.push(translate([i * spacing - width / 2, 0, height / 2],
      box(6, 6, height)
    ))
  }
  return teeth
}`,
      },
      {
        title: 'A ring with sin and cos',
        body: `Rows and grids place things by multiplying the counter. A ring needs the point on a circle for a given angle, and that is the one job sine and cosine have.

For a circle of radius r at angle a: x is r * Math.cos(a) and y is r * Math.sin(a). That is the entire formula; everything else on this page is bookkeeping.

The angle comes from the counter, by sharing one full turn among the copies: angle = i / count * 2 * Math.PI. A full turn is 2 * Math.PI because JavaScript measures angles in radians rather than degrees, and JSCAD's rotate functions expect radians too — which is convenient here, since the same angle does both jobs.

If each copy should face outward, rotate it before you move it. rotateZ turns a shape about the origin, so a shape still sitting at the origin spins on the spot; one that has already been translated 40 mm out would swing around the centre instead. Turn first, then translate.

There is a second way to get a ring, and it is not this one: revolve sweeps a single 2D shape into one continuous solid. Loop when you want separate copies with gaps between them. Sweep when you want an unbroken ring.`,
        code: `function main() {
  const count = 12
  const radius = 40

  const spokes = [
    tube(34, 5, { segments: 64, center: [0, 0, 2.5] })
  ]
  for (let i = 0; i < count; i++) {
    const angle = i / count * 2 * Math.PI
    const spoke = box(16, 5, 5)
    spokes.push(translate(
      [radius * Math.cos(angle), radius * Math.sin(angle), 2.5],
      rotateZ(angle, spoke)
    ))
  }
  return spokes
}`,
      },
      {
        title: 'From a list of shapes to one solid',
        body: `Leaving the copies separate is the fast answer, and usually the right one: JSCAD never works out where the neighbouring surfaces meet, so an array of a hundred shapes costs no more than a hundred shapes. Fuse them when something downstream needs one solid — a later boolean that has to cut through the lot, or an export meant to print as a single object. The booleans functions take shapes one after another — union(a, b, c), subtract(block, hole) — but a loop hands you an array instead, and passing the array itself gives you an error rather than a shape.

Three dots fix it. Written in front of an array in a call, ... is the spread operator: it unpacks the array into separate arguments. union(...parts) is union(parts[0], parts[1], parts[2], ...) without you knowing how many there are.

The same move does holes, which is the more useful half. Build the solid, loop to build an array of the shapes you want gone, then subtract them all in one call: subtract(plate, ...holes). Six holes or sixty, the line does not change.

Make each hole longer than the material it passes through. The cylinders here are 10 mm tall in a 6 mm plate, so they poke out both faces. A hole exactly as deep as the plate leaves the two surfaces touching at the top and bottom, and a boolean between two surfaces in the same place is the classic way to get a hole that does not quite go through.`,
        code: `function main() {
  const plate = box(90, 30, 6)

  const holes = []
  for (let i = 0; i < 6; i++) {
    holes.push(translate([i * 14 - 35, 0, 0],
      tube(3.5, 10, { segments: 32 })
    ))
  }

  return subtract(plate, ...holes)
}`,
      },
      {
        title: 'Wrapping a pattern in a function',
        body: `The ring loop is eight lines, and the second you want two rings you are looking at sixteen nearly-identical ones. That is the signal to lift the pattern into a function of its own.

A function's parameters are the parts you want to vary. Here they are the count, the radius, and the shape being repeated, so around(6, 16, peg) and around(18, 40, tooth) are two very different results out of one body of code. It is not called ring, because that name is taken by the donut. The function does not know or care what shape it was handed, which is what makes it worth writing.

It returns an array, so spreading it — the same three dots from the last page — pours both rings into one list for main() to return.

Naming the pattern is most of the benefit. A month from now, around(18, 40, tooth) still says what it builds; the loop it replaced would need reading line by line before you could be sure.`,
        code: `// One job: hand back count copies of a shape, spaced around a circle.
// Not called ring: that name is already a donut.
function around(count, radius, shape) {
  return Array.from({ length: count }, (_, i) => {
    const angle = i / count * 2 * Math.PI
    return translate(
      [radius * Math.cos(angle), radius * Math.sin(angle), 0],
      rotateZ(angle, shape)
    )
  })
}

function main() {
  const peg = tube(3, 12, { segments: 24 })
  const tooth = box(9, 4, 12)
  return [
    ...around(6, 16, peg),
    ...around(18, 40, tooth)
  ]
}`,
      },
      {
        title: 'Counting the cost',
        body: `A loop will build whatever you ask for, including more than the browser can draw. It is worth being able to estimate the bill before you press run, and the arithmetic is not hard.

Every curved primitive is really a lot of flat faces, and segments is how many. A ball at segments: 16 is 128 flat faces. At 32 it is 512, and at 64 it is 2048 — doubling segments quadruples the count, because it doubles them around and up at once. A box is 6 faces at any size.

Multiply that by your loop. The twenty spheres below are 20 x 128 = 2560 faces, which is nothing. The same twenty at segments: 64 would be 40,960, for a difference nobody can see at this size. A 60 x 60 grid is 3600 copies before you have chosen a shape at all — that is the number to be suspicious of, not the segments.

So: pick the smallest segments that still looks round at the size the part will actually be, and sanity-check the count with a console.log before you scale a working pattern up. If the viewport goes quiet after an edit, the shape count is the first thing to check.`,
        code: `function main() {
  const count = 20
  const spacing = 9
  const width = (count - 1) * spacing

  const balls = []
  for (let i = 0; i < count; i++) {
    balls.push(translate([i * spacing - width / 2, 0, 0],
      ball(4, { segments: 16 })
    ))
  }
  console.log('shapes returned:', balls.length)
  return balls
}`,
      },
    ],
  },
  {
    slug: 'export',
    title: 'Export & Printing',
    pages: [
      {
        title: 'Save STL',
        body: `Run this and three buttons appear in the top right of the viewport. Press Save STL. A file called model.stl lands in your downloads folder, and that file is the one a 3D printer wants.

STL holds exactly one thing: a list of triangles. Every curve in your model has already been chopped into flat triangles by the time it is written — this washer becomes 696 of them, which is why the file is 34 KB for a shape you described in four lines.

The program that turns an STL into instructions for a printer is called a slicer. Cura, PrusaSlicer and Bambu Studio are all slicers. Open model.stl in any of them and the same washer is sitting there, ready to print.`,
        code: `function main() {
  const plate = tube(20, 4, { segments: 64, center: [0, 0, 2] })
  const hole = tube(6, 10, { segments: 64, center: [0, 0, 2] })
  return subtract(plate, hole)
}`,
      },
      {
        title: 'STL forgets colour, 3MF remembers',
        body: `This model has a grey body and a gold cap, and the viewport shows both. Press Save STL, then press Save 3MF, and compare what you got.

The STL is 10 KB of nothing but triangles. There is nowhere in the format to put a colour, so both parts arrive grey.

3MF is newer, and underneath it is a zip file. Rename model.3mf to model.zip, open it, and read 3D/3dmodel.model inside. It is plain text, and it says displaycolor="#FFD633FF" — the exact gold you asked for — beside displaycolor="#9999A5FF" for the body. It is also the smaller of the two files, because zipping text is cheap.

Printing in one colour: STL. Printing in two, or on a printer that can swap filament: 3MF.`,
        code: `function main() {
  const body = colorize([0.6, 0.6, 0.65],
    box(20, 20, 20, { center: [0, 0, 10] })
  )
  const cap = colorize([1, 0.84, 0],
    tube(6, 6, { segments: 48, center: [0, 0, 23] })
  )
  return [body, cap]
}`,
      },
      {
        title: 'OBJ, and choosing between the three',
        body: `Press Save OBJ on this ten-millimetre cube and open model.obj in any text editor. It is 214 bytes and you can read the whole thing: eight lines starting with v, one for each corner of the cube, then twelve lines starting with f, each naming the three corners of one triangle.

Save the same cube as STL and it is 684 bytes. STL has no corner list — it writes all three corner positions out again for every triangle, so a shape with eight corners is stored as 36 of them.

Which format:

- STL — printing. Every slicer reads it.
- 3MF — printing in colour, or when the file needs to be small.
- OBJ — handing the model to graphics software like Blender. Not for printing.`,
        code: `function main() {
  return box(10, 10, 10, { center: [0, 0, 5] })
}`,
      },
      {
        title: 'Every number is a millimetre',
        body: `JSCAD has no units setting. A 10 is ten millimetres — in this viewport, in the saved file, and in the slicer — and nothing you can write will change that.

The grid under your model is the ruler. Each large square is 10 mm across and each small one is 1 mm, so you can count this box off the floor: five big squares one way, three the other, one deep. The console line agrees: 50, 30, 10.

Check the size before you print, not after. A common school printer can make something about 220 mm wide, 220 mm deep and 250 mm tall, and no bigger. Anything larger has to be cut into pieces and glued, which is much better to find out now than six hours in.`,
        code: `function main() {
  const part = box(50, 30, 10, { center: [0, 0, 5] })
  console.log('size in mm:', measureDimensions(part))
  return part
}`,
      },
      {
        title: 'Put it on the plate',
        body: `Two identical 20 mm cubes. The left one was built at the origin, so half of it is under the grid — its lowest point is at z = -10. The right one was lifted by half its height and rests on the grid, lowest point z = 0.

The grid is the build plate. A slicer has nowhere to put a buried half: some quietly drop the whole model onto the plate for you, some refuse to open it, and neither is what you meant.

So build the part where it is going to be printed. Give the shape a center as you make it — center: [0, 0, 10] for a 20 mm cube — or translate it up afterwards. The two do the same job, so pick whichever reads better in the line you are writing.`,
        code: `function main() {
  const shape = box(20, 20, 20)

  // Left: built at the origin, so half of it is under the grid.
  const sunk = translate([-18, 0, 0], shape)

  // Right: lifted by half its height, so it rests on the plate.
  const standing = translate([18, 0, 10], shape)

  return [sunk, standing]
}`,
      },
      {
        title: 'The printer only prints what is joined',
        body: `The knob here floats 2 mm above the plate. Orbit round and you can see daylight underneath it. The viewport does not mind, the Save button does not mind, and the printer will cheerfully start laying plastic in mid-air.

The console line is the giveaway. With the gap, the volume is 7983 cubic mm — the plate's 7200 plus the knob's 783, two separate things added together. Change lift to -1 so the knob sinks 1 mm into the plate and the number drops to 7905, because the millimetre they now share is counted once instead of twice. That drop is what one solid looks like as a number.

Parts that must come out as one piece have to overlap. Exactly touching is not enough.`,
        code: `function main() {
  const lift = 2   // the gap, in mm — change it to -1 and watch the number drop

  const plate = box(30, 30, 8, { center: [0, 0, 4] })
  const knob = tube(5, 10, { segments: 48, center: [0, 0, 8 + lift + 5] })

  const part = union(plate, knob)
  console.log('volume in cubic mm:', Math.round(measureVolume(part)))
  return part
}`,
      },
      {
        title: 'A wall thinner than the nozzle disappears',
        body: `Four upright walls: 0.2, 0.4, 1.2 and 2.4 mm thick, left to right. On screen the thin one is a hairline. On a printer it is nothing at all.

A printer squeezes melted plastic out through a small hole called the nozzle, and on almost every school machine that hole is 0.4 mm across. One line of plastic is therefore 0.4 mm wide, and that is the thinnest thing the machine can make. The slicer looks at the 0.2 mm wall, finds it cannot fit a single line inside, and skips it — so the part comes out with a gap where the wall was.

0.4 mm is the floor. Three lines, 1.2 mm, is the thinnest wall worth printing on anything that will be picked up and handled.`,
        code: `function main() {
  const walls = []
  const thicknesses = [0.2, 0.4, 1.2, 2.4]

  for (let i = 0; i < thicknesses.length; i++) {
    const t = thicknesses[i]
    walls.push(translate([i * 12 - 18, 0, 10],
      box(t, 20, 20)
    ))
  }

  return walls
}`,
      },
      {
        title: 'One file, many parts',
        body: `A design gets long. The answer is never a longer main() — it is giving the parts names.

Here peg() knows what a peg is, plate() knows what a plate is, and main() only says how they go together. Change the radius passed to peg and all three pegs change, because there is only one description of a peg in the file.

When a project outgrows one file, jscad.app takes a whole folder instead: peg.js ends with module.exports = { peg }, and index.js starts with const { peg } = require('./peg.js'). Nothing else about the code changes — the same functions, in different files.

This viewport runs a single file, so keep the parts as functions here. The split is worth knowing about for the day the file reaches 400 lines.`,
        code: `// What a peg is.
function peg(radius, height) {
  return tube(radius, height, { segments: 32 })
}

// What a plate is.
function plate(width, depth, thickness) {
  return box(width, depth, thickness, { roundRadius: 2, center: [0, 0, thickness / 2] })
}

// How they go together.
function main() {
  const parts = [plate(60, 40, 6)]
  for (const x of [-20, 0, 20]) {
    parts.push(translate([x, 0, 9], peg(4, 12)))
  }
  return union(...parts)
}`,
      },
    ],
  },
  {
    slug: 'debugging',
    title: 'Debugging',
    pages: [
      {
        title: 'What the red bar is telling you',
        body: `When a program stops, a red bar drops across the top of the viewport. It is not a telling-off. It is the most useful three lines of writing in the whole app, and it always has the same three parts.

Here is one:

  TypeError: bxo is not a function  @ script.js:8:10

First comes the kind of problem — TypeError here. There are only a handful of kinds and you will learn all of them from this section. Then the message: what actually went wrong. Then, after the @, where the program gave up: file script.js, line 8, character 10. The same message shows up again in the console pane below the viewport, with the position in round brackets instead of after an @.

Read the middle part backwards. In is not a function, the thing named just before it is what you asked for — so bxo is the word to look at, and everything up to it is fine.

Ten messages come up more often than all the rest put together, and each of them gets a page here, in roughly the order you will meet them, with the words you will see and the thing to change. After those comes a list of the leftovers, and then three pages for when there is no message at all, which is the harder half.

One rule underneath all of it: change one thing, then run again. Change three things and run once and you have learned nothing about which of the three it was.`,
        code: `function main() {
  // The smallest program that works. When you are lost, come back to
  // something this size, check that it runs, then add one piece at a time.
  return box(10, 10, 10)
}`,
      },
      {
        title: 'Why the examples have no extra lines',
        body: `An empty file in this app really is empty. Type box(10, 10, 10) on the first line and it works. All twelve reSHape names are already sitting there waiting for you — box, rect, disc, ball, tube, cone, ring, poly, extrude, revolve, turn, sit — and so is every name in the library underneath them, translate and subtract and hull among them. Nothing to import, nothing to set up.

That is worth saying out loud, because most of the JSCAD you will find elsewhere does not look like this. A file written for https://jscad.app/ opens with a require line that fetches the library into a variable, and closes with module.exports = { main } to say which function to start from. That editor has no head start, so it needs both.

Neither line is an error here. Write them and they work. But nothing in these docs uses them, because nothing here needs them, and a line that does nothing is a line you have to explain to yourself every time you read the file.

Where they come back is "Taking your model to jscad.app", in the Overview section, along with everything else that has to change on the way out. Until then, if you open someone else's file and those two lines look like noise, now you know what they are for.`,
        code: `function main() {
  // Nothing above this line, and nothing below the closing brace.
  // box is already here.
  return box(10, 10, 10)
}`,
      },
      {
        title: 'SyntaxError: nothing ran at all',
        body: `A syntax error is a sentence JavaScript cannot finish reading, so it never starts. This one is different from every other error in this section: the viewport goes blank, and none of your own console.log output appears either. That silence is the tell. If you printed something and it did not print, the file never ran.

Five you will see, and what each one means:

SyntaxError: Unexpected end of input — the file ended while something was still open. A missing closing curly brace, nearly always.
SyntaxError: missing ) after argument list — a call opened its round bracket and never closed it.
SyntaxError: Unexpected token ')' — a bracket closed in the wrong order, so the ) turned up where a ] was due.
SyntaxError: Invalid or unexpected token — usually a quote mark opened and never closed, so the rest of the line got swallowed into a piece of 
SyntaxError: Unexpected number — two values with no comma between them, as in [0 0 10].

None of those messages name your mistake. They name the spot where the sentence stopped making sense, which is usually a little after it.

The fix is mechanical, not clever. Brackets close in the reverse of the order they open: the last one opened is the first one closed. Put the cursor next to a bracket and the editor highlights its partner — an opening bracket with no partner is your answer.`,
        code: `function main() {
  // Count outward from the middle. cube( opens one, { opens two,
  // then } closes two and ) closes one, in that order.
  return translate([0, 0, 5], box(10, 10, 10))
}`,
      },
      {
        title: 'Error: No main() function found.',
        body: `The full message:

  Error: No main() function found.

  Your program needs a function called main that returns a shape:

    function main() {
      return cube({ size: 10 })
    }

Everything in a JSCAD file is preparation. Nothing is built until the runner finds one particular function and calls it, and the name it looks for is main — five letters, all lower case, no capital.

So there are only three ways to see this. Either there is no function called main at all, or it is spelled differently — Main, mian, main2, makeMain — or it is tucked inside another function, where the runner cannot reach it. That last one is easy to do by accident when you add a brace in the wrong place: the whole of main slides inside the function above it and disappears from view.

The message also mentions an export line. Do not let that distract you here: nothing in this app needs one, and adding it will not fix a name that is wrong. Fix the spelling first.

Helper functions can be called anything you like, and having several is a good sign. Just make sure the one at the top of the chain is main.`,
        code: `// Helpers can be called anything. Only the one the runner starts from
// has to be spelled main, in lower case.
function buildLid(width) {
  return box(width, width, 3)
}

function main() {
  return buildLid(30)
}`,
      },
      {
        title: 'Error: main() returned nothing.',
        body: `The full message:

  Error: main() returned nothing. Make sure you return a shape.

  Example:  return cube({ size: 10 })

This one is friendlier than it looks, because it proves a lot already works. Your file had no syntax error. The runner found main. It called it. Your code ran all the way to the end. It just never handed a shape back.

Four ways that happens, in the order they are common:

There is no return at all. Building a shape and leaving it in a variable is not the same as returning it — the runner cannot see inside your function.

The return is inside an if that turned out false. Every path through the function needs one. A function that runs off the bottom hands back nothing, silently.

Shapes were pushed into an array and the array was never returned. This is the classic. The loop is right, the shapes are right, the last line is missing.

The array came back empty. A loop that never ran, or a filter that matched nothing, returns [] — and the runner counts an empty array as nothing, because there is genuinely nothing to draw.

Returning several shapes at once is fine and often faster than joining them: return an array and every shape in it is drawn.`,
        code: `function main() {
  const parts = []
  for (let i = 0; i < 4; i++) {
    parts.push(translateX(i * 14, box(10, 10, 10)))
  }
  return parts        // <- the one that is easy to forget
}`,
      },
      {
        title: 'ReferenceError: count is not defined',
        body: `  ReferenceError: count is not defined

A name was used that nothing in the file owns. JavaScript looked everywhere it is allowed to look, found no count, and stopped. The name in the message is your own word, so this error is unusually easy to read: it is quoting you back at yourself.

Three causes.

A spelling difference between where you made the name and where you used it. You wrote const boxSize on one, then boxSize on another with the capital in a different place. JavaScript treats those as two unrelated words.

The name was made inside something and used outside it. A const declared between the braces of a for loop, or inside an if, or inside another function, exists only in there. From outside, it has never existed. Move the declaration out to where both places can see it, as the example does.

You used it above the point where you made it. Reading order matters — a const is not ready until the reading gets to it.

Worth knowing: inside shCode, cube is not defined never means you forgot to import anything, because nothing needs importing here. If a JSCAD name comes back not defined, you misspelled it — cubee, or Cube with a capital.`,
        code: `const count = 5       // out here, so every function below can see it

function main() {
  const parts = []
  for (let i = 0; i < count; i++) {
    parts.push(translateX(i * 12, box(8, 8, 8)))
  }
  return parts
}`,
      },
      {
        title: "TypeError: Cannot read properties of undefined (reading 'length')",
        body: `  TypeError: Cannot read properties of undefined (reading 'length')

The longest message you will meet, and the one worth learning to read properly, because once you can it says exactly what happened.

Read it backwards. The word in quotes at the end, length, is what you asked for. The word before it, undefined, is what you asked it of. Put together: you wrote something.length, and that something turned out to be nothing at all.

undefined is JavaScript's word for a value that was never set. It is not zero and not an error — it is the blank you get from reading a name that exists but holds nothing yet, or a group that has no such member.

So the mistake is never on the word in quotes. It is on whatever came before the dot, and usually on an earlier line entirely. Ask an array for a slot it does not have — parts[5] on a list of four — and nothing complains, because parts[5] is simply undefined. The complaint arrives at the next line that reads something off it, pointing at a line that is perfectly correct.

That is the habit worth building from this page: when a message names a spot, ask where the value at that spot came from, and go and look there. Two other shapes of the same message, both meaning the same thing: reading a member of an array slot that is empty, and reading a member of null, which is the value you get when something deliberately handed back an empty answer.`,
        code: `function main() {
  // parts[5] on a list of four is undefined, and asking undefined for its
  // .length is the error above. The complaint lands on the line that READ
  // it, not the line that made it.
  const parts = [box(10, 10, 10)]
  console.log('parts has', parts.length, 'in it')
  return parts
}`,
      },
      {
        title: 'TypeError: bxo is not a function',
        body: `  TypeError: bxo is not a function

Next door to the last one, and the difference between them is worth a minute.

Cannot read properties of undefined means the value was missing before you ever called anything. Is not a function means the name reached something — JavaScript looked it up and got an answer — and that answer is not a thing you can put round brackets after. A misspelled name gives undefined, and calling undefined is exactly this.

The message quotes the name back at you, which makes it the easiest error in this section to fix. Read the quoted word letter by letter against the one you meant.

There are twelve reSHape names and they are all short, which makes them easy to nearly-type: box, rect, disc, ball, tube, cone, ring, poly, extrude, revolve, turn, sit. Everything else is the library's, and its names are longer but no less exact — colorize with one L, measureBoundingBox with the B capital in the middle. Check the spelling against the page that taught it before you check anything else.

The same words turn up for a plain variable too. part is not a function means you put brackets after something that is a shape, not a function. part.push is not a function means you used an array trick on something that is not an array.`,
        code: `function main() {
  // box, rect, disc, ball, tube, cone, ring, poly, extrude, revolve,
  // turn, sit. Twelve names, all short, all case-sensitive.
  return box(30, 20, 10)
}`,
      },
      {
        title: 'Error: size must be an array of width, depth and height values',
        body: `  Error: size must be an array of width, depth and height values

The first message in this section that comes from JSCAD itself rather than from JavaScript. It means the value was the wrong shape — not the wrong spelling, not missing, just not laid out the way that function wants.

You will not get this one from box, and that is the point of the page: it is what a shape maker says when its size is laid out the wrong way, and the library underneath is full of them. cube({ size: 10 }) wants one number; cuboid({ size: [30, 20, 10] }) wants three in square brackets; hand cuboid a single number and you get the message above. box(30, 20, 10) has no brackets to get wrong.

Make the mistake the other way — cube({ size: [10, 10, 10] }) — and you get Error: size must be positive instead, which is confusing until you know why: cube looked for one number, found a list, could not compare a list against zero, and gave up there.

So the habit this page is really teaching is for the moment you step down into the library, or paste in somebody else's file: when a message talks about the shape of a value rather than a name, count. How many numbers does this one want, and are they in square brackets?

reSHape's own version of the same complaint counts for you: box needs three numbers: box(width, depth, height). The depth is missing.`,
        code: `function main() {
  const evenSided = box(10, 10, 10)              // one number
  const boxy = box(30, 20, 10)       // three numbers
  return [translateX(-25, evenSided), translateX(15, boxy)]
}`,
      },
      {
        title: 'Error: offset must be an array',
        body: `  Error: offset must be an array

Same idea as the last page, now among the movers. translate needs to know how far along each of the three directions to go, so it wants three numbers in square brackets: translate([20, 0, 0], part). Give it the bare number 20 and you get the message above. An offset is just a distance-and-direction, and one number cannot say which direction.

Its two neighbours phrase the same complaint in their own vocabulary, so learn the three together:

rotate(90, part) gives Error: angles must be an array. It wants rotate([0, 0, 1.57], part) — one turn amount per direction, and in radians rather than degrees.

scale(2, part) gives Error: factors must be an array. It wants scale([2, 2, 2], part) — one stretch factor per direction.

Now the reason this trips people twice. The single-direction shortcuts do take a bare number, on purpose: translateZ(20, part) lifts something 20 straight up, rotateZ(1.57, part) spins it flat, scaleZ(2, part) makes it twice as tall. So both forms are correct JSCAD, and which one is right depends on the name you typed. Square brackets for the plain name, a bare number for the one ending in X, Y or Z.`,
        code: `function main() {
  const part = ball(6, { segments: 32 })
  const moved = translate([20, 0, 0], part)   // three numbers
  const lifted = translateZ(20, part)         // one number
  return [part, moved, lifted]
}`,
      },
      {
        title: 'Error: color must be an array',
        body: `  Error: color must be an array

Reasonable-looking code, refused. colorize('red', part) is what almost everybody writes first, and this version of JSCAD will not take it: a colour name in quotes is a piece of text, and colorize only accepts numbers.

What it wants is four of them, in square brackets, each between 0 and 1: red, green, blue, and how see-through it is. So colorize([1, 0.2, 0.2, 1], part) is a solid soft red. Full brightness is 1, not 255. Leave the fourth number off and you get a solid colour anyway, which is why three numbers is also accepted.

You do not have to work those numbers out yourself. There are two converters, and both hand back exactly the list colorize is waiting for:

colorNameToRgb('gold') turns a CSS colour name into the numbers.
hexToRgb('#3366ff') does the same for a hex code, the six-character form you meet in web pages.

So the fix for colorize('gold', part) is colorize(colorNameToRgb('gold'), part) — the name still does the work, it just gets translated on the way in.

One thing that will save you a puzzled minute later: colour is decoration only. It never changes the geometry, it makes no difference to cutting or joining shapes, and a printer with one reel of plastic ignores it entirely. It is there so you can tell your own parts apart.`,
        code: `function main() {
  const part = box(10, 10, 10)
  const red = colorize([1, 0.2, 0.2, 1], part)
  const named = colorize(colorNameToRgb('gold'), part)
  const hex = colorize(hexToRgb('#3366ff'), part)
  return [
    translateX(-15, red),
    named,
    translateX(15, hex),
  ]
}`,
      },
      {
        title: 'Error: only unions of the same type are supported',
        body: `  Error: only unions of the same type are supported

The last of the ten, and the one that is really about an idea rather than a typo.

Shapes come in two kinds. Flat ones, with an outline and no thickness — disc, rect, poly, star. Solid ones, with volume — box, ball, tube, cone, ring. The combiners refuse to mix them, because there is no sensible answer to what a disc joined to a box would be.

Its three siblings say the same thing in slightly different words, and the grammar of two of them is a bit rough. Learn to recognise the shape of the sentence rather than the exact wording:

  Error: only subtract of the types are supported
  Error: only intersect of the types are supported
  Error: only hulls of the same type are supported

The fix is to bring both to the same kind before combining, and in practice that means giving the flat one thickness. extrude(4, outline) takes a flat shape and pushes it straight up into a solid one, and after that the union is fine — which is what the example does.

The same message turns up if a shape is missing rather than flat: joining anything with a variable that holds undefined produces it too, because nothing is not the same kind as a cube either.`,
        code: `function main() {
  const circle = disc(8, { segments: 32 })  // flat, 2D
  const post = extrude(4, circle)   // now 3D
  const slab = box(30, 30, 4)
  return union(slab, post)
}`,
      },
      {
        title: 'The rest of the messages, at a glance',
        body: `That is the ten. Here is the rest of what JSCAD says, so that when you meet one you have seen the words before. Every one of these is the library checking a number against a limit, and the fix is always to move the number.

  size values must be positive — one of the three numbers you gave box is below zero.
  radius must be positive — a radius below zero, or a list of numbers where a single one belongs.
  factors must be positive — a scale factor of zero or less.
  segments must be three or more — flat round shapes need at least three sides.
  segments must be four or more — solid round ones need four.
  roundRadius must be smaller than the radius of all dimensions — a roundRadius has eaten the whole side. reSHape rewrites this one in your own numbers before you see it.
  inner circle is too large to rotate about the outer circle — a ring whose tube is thicker than the ring radius. reSHape rewrites this one too, and names the swap.
  list of points 0 must contain three or more points — an outline with fewer than three corners, from the library's own polygon. The 0 counts which list, not which point; poly says it in plainer words.
  wrong number of arguments — a function got fewer things than it needs. Nearly always a forgotten second argument: translate([0, 0, 10]) with no shape after the comma.

Two from JavaScript rather than JSCAD:

  Assignment to constant variable. — you changed something declared with const. Declare it with let if it needs to change.
  Maximum call stack size exceeded — a function called itself with no way out. Look for a function whose name appears inside its own body.`,
        code: `function main() {
  // Every number here is inside a limit the library checks:
  // sizes above zero, segments of 3 or more (4 for anything round in 3D),
  // and a roundRadius well under half the smallest side.
  const lid = box(40, 30, 6, { roundRadius: 2 })
  const peg = tube(4, 20, { segments: 24 })
  return [lid, translateZ(13, peg)]
}`,
      },
      {
        title: 'When there is no message at all',
        body: `Now the harder half. A program with no red bar can still be wrong, and the commonest way is a shape that refuses to move.

Every mover hands back a new shape and leaves the original exactly as it was. Nothing is ever moved in place. So a line like this, sitting on its own, does nothing whatsoever:

  translateZ(50, part)

The lifted shape was made and then thrown away, because nobody caught it. What you meant was to keep it:

  const moved = translateZ(50, part)

and then to use moved from there on. The give-away is a program where a change to the numbers makes no difference to the picture at all. If turning 50 into 500 changes nothing, the result is not reaching the screen, and this is why.

The same rule catches a second, sneakier one. Hand a mover something that is not a shape and it hands the same thing straight back with no complaint: translate([0, 0, 10], 5) is 5. So a variable holding a number rather than a shape can travel a long way down a program before anything goes wrong, and when it does the message will be about somewhere else.

The example prints the middle of both shapes so you can watch the original stay put.`,
        code: `function main() {
  const part = box(10, 10, 10)

  translateZ(50, part)                  // thrown away
  const moved = translateZ(50, part)    // kept

  console.log('part is still at', measureCenter(part))
  console.log('moved is at', measureCenter(moved))
  return moved
}`,
      },
      {
        title: 'Nothing is showing up',
        body: `An empty viewport with no red bar. Work down this list in order — it is roughly the order of how often each one is the answer.

It was never returned. Shapes built and left in a variable, or pushed into an array that the last line forgot. You would normally get main() returned nothing for this, so if there is no message, keep going.

It is off screen. One extra zero in a translate puts a part 400 units away, past the edge of the view. Measure it rather than guessing: measureBoundingBox hands back two corners, the lowest and the highest, and if those numbers are nowhere near zero you have found it. Scroll to zoom out, or move it back as the example does.

It is flat and you are looking at its edge. A disc or a rect has no thickness at all, so from straight above it can be a hairline or nothing. Drag to orbit the camera, or give it thickness with extrude.

A size is zero. This one is nasty, because a zero is allowed without a word: box(10, 0, 5) builds a perfectly valid shape with no surfaces, and a shape with no surfaces draws as nothing. A number below zero would have been refused with a message; exactly zero slips through. If a size comes from arithmetic, print it.

A combiner ate it. subtract cuts its later shapes out of its first one, so the wrong order can remove everything.`,
        code: `function main() {
  const part = translateZ(400, box(20, 20, 20))
  const bounds = measureBoundingBox(part)

  console.log('lowest corner', bounds[0])
  console.log('highest corner', bounds[1])
  console.log('size', measureDimensions(part))

  // 400 units up is off screen. Drop it back onto the grid.
  return translateZ(-bounds[0][2], part)
}`,
      },
      {
        title: 'Print what you cannot see',
        body: `You cannot look inside a 3D model and see a variable, so print it. console.log works here exactly as it does anywhere else in JavaScript, and everything it prints lands in the console pane under the viewport.

This is the tool that turns guessing into checking, and there are three things worth printing.

The numbers you worked out, especially inside a loop. One console.log line naming the loop counter and the positions you calculated from it will tell you in a single run whether your arithmetic is right, and it usually costs less time than staring at the code does.

Measurements. measureDimensions gives the width, depth and height of a shape as three numbers, and measureAggregateBoundingBox gives the two far corners of a whole group of them at once. Between them they answer will it fit and is it where I think it is without a ruler.

Markers. A print before and after a slow step shows you which part of a long program is the slow one.

What not to print: the shape itself. A shape is a list of every flat face it is made of, so printing one fills the console with hundreds of lines of coordinates and tells you nothing. Print its measurements instead.

Take the noisy ones out when you are done. A print on every turn of a two-thousand-turn loop is slower than the shapes it is describing.`,
        code: `function main() {
  const parts = []
  for (let i = 0; i < 5; i++) {
    const size = 6 + i * 3
    const x = i * 20 - 40
    console.log('step', i, 'size', size, 'at x', x)
    parts.push(translate([x, 0, size / 2], box(size, size, size)))
  }
  console.log('the lot fits in', measureAggregateBoundingBox(parts))
  return parts
}`,
      },
    ],
  },
  {
    slug: 'projects',
    title: 'Projects',
    pages: [
      {
        title: 'Project: a keychain tag',
        body: `Everything so far, in one printable object. Read the code as four moves.

First the plate: a rect with its corners rounded off, sitting on the grid rather than straddling it, so it is ready to print without further thought.

Then the hole for the keyring. It is a cylinder, and it is taller than the plate on purpose, for the reason the booleans section gave.

Then the letters, built the way the name tag page built them, measured and slid back so they land in the middle of the plate instead of running off the end of it.

Finally one boolean each way: subtract the hole, union the letters. That order matters — cut the hole from the plate before the letters go on, or the subtraction has to chew through the lettering as well.

Change the label and everything else follows, because the plate is sized from the measured text rather than from a number somebody typed.`,
        code: `function main() {
  const label = 'CS'
  const thickness = 3

  const strokes = vectorText({ height: 12, input: label })
  const paths = strokes.map((points) => path2.fromPoints({}, points))
  const letters = extrudeRectangular({ size: 1.4, height: 1.5 }, paths)

  const bounds = measureAggregateBoundingBox(letters)
  const textWidth = bounds[1][0] - bounds[0][0]
  const plateWidth = textWidth + 26

  const plate = box(plateWidth, 20, thickness, { roundRadius: 1.4, center: [0, 0, thickness / 2] })

  const keyHole = tube(2.5, 20, { segments: 32, center: [-plateWidth / 2 + 6, 0, 0] })

  const raised = translate(
    [-textWidth / 2 + 5, -6, thickness], letters
  )

  return colorize(colorNameToRgb('goldenrod'),
    union(subtract(plate, keyHole), raised)
  )
}`,
      },
      {
        title: 'Project: a phone stand',
        body: `A part that has to work in the real world, which means the numbers stop being decorative.

The stand is a wedge. Start from a 2D triangle — three corner points — and extrude it sideways to give it width. That is the sketch-to-part pipeline again, and it is much easier than trying to rotate a box into a wedge.

Then two cuts. A slot across the front holds the phone; make it a millimetre or two wider than the phone is thick, because a slot exactly as wide as the phone will not accept the phone. A channel through the base lets the charging cable out of the bottom.

The angle is set by where you put the top corner of the triangle. Move that one point and the whole stand leans differently, which is the parametric idea in its simplest possible form.

Print it on its side and the sloping face comes out smooth with no supports.`,
        code: `function main() {
  const width = 70
  const depth = 60
  const height = 55
  const slot = 12

  // A wedge is a triangle, extruded sideways.
  const profile = polygon({
    points: [[0, 0], [depth, 0], [0, height]],
  })
  const wedge = rotateX(Math.PI / 2,
    extrude(width, profile)
  )

  // The lip the phone leans back against.
  const lip = box(slot, width + 4, 26, { center: [14, width / 2, 8] })

  // A way out for the charging cable.
  const cable = box(30, 16, 20, { center: [12, width / 2, -2] })

  return translate([-depth / 2, -width / 2, 0],
    subtract(wedge, lip, cable)
  )
}`,
      },
    ],
  },
  {
    slug: 'beyond',
    title: 'Beyond the course',
    pages: [
      {
        title: 'What this section is',
        body: `Everything before this page is the part of JSCAD the course teaches. This section is the rest of it.

Seventeen functions sit in @jscad/modeling that no lesson uses and no assignment needs. They are here because they are real, they are in the same library, and until now a student who went looking for them found nothing. That is the whole reason for the section. None of it is required, none of it is on any test, and a good model can be built without ever opening it.

They come in five groups.

1. modifiers — snap, generalize and retessellate, which tidy up the faces a solid is made of.
2. minkowski — the module holding minkowskiSum, which grows one solid by the shape of another. It is in scope bare, and as booleans.minkowski.
3. Three more measurements — measureBoundingSphere, measureAggregateArea and measureAggregateEpsilon.
4. Five more colour conversions — rgbToHex, rgbToHsl, rgbToHsv, hsvToRgb and hueToColorComponent.
5. utils — flatten, fnNumberSort, insertSorted, radiusToSegments and areAllShapesTheSameType, which are the library's own plumbing rather than anything aimed at you.

The first four are worth reading if you are curious. The fifth is worth reading mainly so you know what it is when you meet it.

That is the whole of what the fifteen modules export directly. What is still undocumented here sits one level deeper — curves.bezier, geometries.geom3, vec3 and their neighbours, which are the machinery the modules themselves are built out of.`,
        code: `function main() {
  const radius = 12

  // utils: how many flat sides does a 12 mm curve need to look round?
  const segments = utils.radiusToSegments(radius, 0.3, 0.3)
  console.log('segments:', segments)

  const disc = primitives.cylinder({ radius, height: 4, segments })

  // colors: a colour picked by hue instead of by three separate numbers.
  const paint = colors.hsvToRgb([0.58, 0.7, 0.9])
  console.log('paint:', paint)

  // measurements: the smallest ball the disc fits inside — centre, then radius.
  console.log('bounding sphere:', measurements.measureBoundingSphere(disc))

  return colors.colorize(paint, disc)
}`,
      },
      {
        title: 'Repairing a mesh: three call shapes',
        body: `A solid is a bag of flat faces. Most of the time you never think about that, because everything in this app hands back a bag that has already been tidied. modifiers is the drawer for when it has not been.

Three functions live there, and they take three different call shapes. That is the part worth writing down, because no two of them are spelled the same way.

snap(shape) — geometries only, no options object. It takes as many as you like: one shape in, one shape out; two in, an array of two out.

generalize(options, shape) — the options object comes first, and it is not optional. generalize(shape) throws. Geometries after it, as many as you like.

retessellate(shape) — exactly one solid. No options object, no array, no second shape.

What the three of them do:

snap rounds every corner onto a fine grid, so corners that were nearly in the same place end up exactly in the same place.

generalize does whatever its options ask for, and nothing at all if they ask for nothing. The next page but one takes the options apart.

retessellate re-cuts the faces so that faces lying flat against one another merge into fewer, larger ones. It short-circuits: a solid the library built already carries a flag saying this has been done, and retessellate hands such a solid straight back untouched.

The example builds a solid the library has never seen — two cubes' faces poured into one bag by hand — so that there is something left to fix. Twelve faces go in and eight come out, with the volume and the overall size unchanged.`,
        code: `function main() {
  const lower = box(10, 10, 10)
  const upper = box(10, 10, 10, { center: [0, 0, 10] })

  // Both boxes' faces tipped into one bag: a solid nothing has tidied yet.
  const raw = geom3.create([
    ...geom3.toPolygons(lower),
    ...geom3.toPolygons(upper),
  ])

  // snap: geometries only, no options object, one or several.
  const snapped = snap(raw)

  // generalize: options FIRST, and the object is not optional.
  const merged = generalize({ simplify: true }, snapped)

  // retessellate: exactly one solid, and nothing else.
  const tidy = retessellate(raw)

  console.log('as built:    ', raw.polygons.length)
  console.log('generalize:  ', merged.polygons.length)
  console.log('retessellate:', tidy.polygons.length)

  return tidy
}`,
      },
      {
        title: 'What the wrong call shape gets you',
        body: `Call these the wrong way and three of the mistakes stop you with a message. Two do not, and those two are the reason the previous page is worth reading twice.

generalize(shape), with the options object left off, throws wrong number of arguments.

retessellate({}, shape), with an options object added, throws Cannot read properties of undefined (reading '0'). That is the library reading your options object as if it were a solid and finding no faces on it.

retessellate handed a flat 2D shape throws Cannot read properties of undefined (reading 'map'), for the same reason: it only knows about solids.

snap({}, shape) throws nothing. snap takes any number of geometries, so an options object is simply another item in the list, and what comes back is an array of two: your options object, untouched, followed by the snapped solid. Return that array from main() and half of it is not a shape. There is no message and no red bar — just something missing from the viewport.

retessellate(a, b) throws nothing either, and this one is quieter still. It takes exactly one solid, so the second is not merged, not returned, and not complained about — it is simply dropped, and what comes back is a tidied a. Measured: a union measuring 15 by 10 by 10 handed a radius-8 sphere as a second argument comes back 15 by 10 by 10, with the sphere gone. Wrap the pair in an array instead and it does throw — retessellate([a, b]) gives Cannot read properties of undefined (reading '0') — so the array form fails loudly and the comma form fails silently, which is the opposite of what you would guess.

The example runs all four calls and prints what each one actually said.`,
        code: `function main() {
  const block = box(20, 20, 20)
  const flat = rect(10, 10)

  try {
    generalize(block)
  } catch (e) {
    console.log('generalize(block)      ->', e.message)
  }

  try {
    retessellate({}, block)
  } catch (e) {
    console.log('retessellate({}, block) ->', e.message)
  }

  try {
    retessellate(flat)
  } catch (e) {
    console.log('retessellate(flat)      ->', e.message)
  }

  // snap does not complain. It hands the options object straight back.
  const wrong = snap({}, block)
  console.log('snap({}, block) gave back', wrong.length, 'things')
  console.log('the first one is a shape?', Array.isArray(wrong[0].polygons))

  return snap(block)
}`,
      },
      {
        title: 'generalize and its three switches',
        body: `generalize reads three switches out of its options object, and all three start off.

snap — round every corner onto a grid, which is the same thing snap does on its own.
simplify — merge faces that lie flat against one another.
triangulate — cut every face into triangles.

Because they all start off, generalize({}, shape) does nothing: it copies the solid and hands it back the same size it was. Ask for something and the face count moves. On the hand-built pair of stacked cubes from two pages ago, twelve faces become twelve with snap alone, eight with simplify, and twenty-four with triangulate.

simplify and retessellate land on the same eight faces here, because on a solid this simple they have the same work in front of them. They are still not the same function, and retessellate is the one the library reaches for itself: anything that comes out of union, subtract or intersect already carries the flag saying it has been retessellated.

triangulate is the switch with a use outside this drawer. An STL file stores nothing but triangles, so saving one triangulates the model anyway; doing it yourself first lets you count the triangles before you save.

A flat shape is left alone entirely. Hand generalize a 2D shape or a path with all three switches on and you get back the very same object, not a copy — the library has no generalizing to do on something flat and does not pretend otherwise.`,
        code: `function main() {
  const lower = box(10, 10, 10)
  const upper = box(10, 10, 10, { center: [0, 0, 10] })
  const raw = geom3.create([
    ...geom3.toPolygons(lower),
    ...geom3.toPolygons(upper),
  ])

  console.log('as built:   ', raw.polygons.length)
  console.log('no switches:', generalize({}, raw).polygons.length)
  console.log('snap:       ', generalize({ snap: true }, raw).polygons.length)
  console.log('simplify:   ', generalize({ simplify: true }, raw).polygons.length)
  console.log('triangulate:', generalize({ triangulate: true }, raw).polygons.length)

  // A flat shape comes back exactly as it went in, whatever you ask for.
  const flat = rect(10, 10)
  const asked = generalize({ snap: true, simplify: true, triangulate: true }, flat)
  console.log('the same 2D shape back?', asked === flat)

  return generalize({ simplify: true, triangulate: true }, raw)
}`,
      },
      {
        title: 'minkowskiSum: growing a solid',
        body: `minkowskiSum(a, b) sweeps one solid over every point of the other and keeps everything the sweep touched. The short version: it grows a by the shape of b.

Exactly two solids, and both have to be solids. A flat shape throws minkowskiSum requires geom3 geometries, and a third argument throws minkowskiSum requires exactly two geometries.

The use worth knowing is clearance. A 10 mm peg will not go into a 10 mm hole — a printer lays plastic a little wide, and the part comes out a little large — so the hole has to be bigger than the peg in every direction, including around whatever shape the peg happens to be. Sweeping a small ball over the peg is exactly that: minkowskiSum(peg, sphere({ radius: 0.4 })) is the peg grown by 0.4 mm everywhere, so a 10 x 10 x 20 peg becomes a 10.8 x 10.8 x 20.8 hole. Cut that out of the block instead of the peg itself and the two parts fit.

The cost is faces, and it is not a product. The 96-face peg below comes out at 202 faces swept with an 8-segment ball (32 faces of its own) and 546 swept with a 32-segment one (512 faces), for exactly the same finished size — sixteen times the ball for under three times the result. Double the peg instead, to a 64-segment 192-face cylinder, sweep it with that same 8-segment ball, and the answer is 362. Both shapes cost, roughly in step with the two face counts added rather than multiplied, and per face added it is the peg's own faces that cost more: the ball's extra 480 faces bought 344, the peg's extra 96 bought 160. Keeping the growing shape coarse is still right, though — nobody can see it, because the shape you see is the peg's.`,
        code: `function main() {
  const peg = tube(5, 20, { segments: 32 })

  // Grow a copy of the peg by 0.4 mm all round, then cut THAT out of the block.
  const clearance = minkowski.minkowskiSum(peg, ball(0.4, { segments: 8 }))
  console.log('peg: ', measureDimensions(peg))
  console.log('hole:', measureDimensions(clearance))

  // What the faces actually do. Count them yourself rather than taking my word.
  const finerBall = minkowski.minkowskiSum(peg, ball(0.4, { segments: 32 }))
  const finerPeg = minkowski.minkowskiSum(
    tube(5, 20, { segments: 64 }),
    ball(0.4, { segments: 8 })
  )
  console.log('peg faces:      ', peg.polygons.length)
  console.log('with a coarse ball:', clearance.polygons.length)
  console.log('with a fine ball:  ', finerBall.polygons.length)
  console.log('finer peg, coarse ball:', finerPeg.polygons.length)

  const socket = subtract(box(30, 30, 20), clearance)

  return [translate([-25, 0, 0], peg), socket]
}`,
      },
      {
        title: 'measureBoundingSphere',
        body: `measureBoundingSphere(shape) hands back two things in one array: a centre point, and a radius. Together they describe a ball the shape fits inside.

Read it by index, the way a bounding box is read. answer[0] is the centre and answer[1] is the radius. A 10 mm cube measures [[0, 0, 0], 8.660254037844387] — half the length of the cube's diagonal, because the eight corners are the only part of a cube that touches the ball around it.

It is a looser fit than measureBoundingBox: a ball around a long thin part is mostly empty air. What it buys you is a single number for how far a shape reaches from one point, which is the question a spinning part asks (does it clear the case?) and the question a camera asks (how far back do I have to stand?).

Hand it an array of shapes and you get an array of answers back, one per shape — not one ball around the group. There is no aggregate version of this one.

The example measures a blob built by hull(), whose size appears nowhere in the code, and puts the ball it found beside it.`,
        code: `function main() {
  const blob = hulls.hull(
    primitives.sphere({ radius: 10, segments: 24 }),
    transforms.translate([30, 0, 0], primitives.sphere({ radius: 4, segments: 24 }))
  )

  const answer = measurements.measureBoundingSphere(blob)
  const centre = answer[0]
  const radius = answer[1]
  console.log('centre:', centre)
  console.log('radius:', radius)

  const ball = primitives.sphere({ radius, segments: 16, center: centre })
  return [blob, transforms.translate([0, 70, 0], ball)]
}`,
      },
      {
        title: 'The other two aggregates',
        body: `The Measurements section covered measureAggregateBoundingBox and measureAggregateVolume. Two more exist.

measureAggregateArea(a, b, ...) is the area of several shapes at once, and it adds rather than fuses: two overlapping shapes count their overlap twice, exactly the way measureAggregateVolume does. It works on both kinds of shape — for a flat shape it is the area enclosed, for a solid it is the surface area. A 4 x 4 rectangle measures 16 and a 32-segment circle of radius 3 measures 28.09300637032248, and the two together measure 44.093006370322485, which is the one added to the other.

measureAggregateEpsilon(a, b, ...) is the same idea for the comparison margin. measureEpsilon sizes a margin for one shape; the aggregate version sizes one margin from everything together, so the biggest shape in the group decides it. A 10 mm cube on its own gets 0.0001 and a 200 mm cube gets 0.002, and the two of them together get 0.002.

That is what it is for: when you are comparing measured numbers across a whole assembly, one margin for the lot is more honest than a different margin per part.`,
        code: `function main() {
  const plate = rect(4, 4)
  const circle = disc(3, { segments: 32 })

  console.log('one at a time:', measureArea(plate), measureArea(circle))
  console.log('added up:     ', measureAggregateArea(plate, circle))
  console.log('epsilon each: ', measureEpsilon(plate), measureEpsilon(circle))
  console.log('epsilon group:', measureAggregateEpsilon(plate, circle))

  return [translate([-5, 0, 0], plate), translate([5, 0, 0], circle)]
}`,
      },
      {
        title: 'Colour, the other way round',
        body: `colorNameToRgb, hexToRgb and hslToRgb all turn something into the [r, g, b] array colorize wants. Three more go the other way: they take that array and tell you what is in it.

rgbToHex([r, g, b]) gives a string such as #ff6347. Add a fourth number and the alpha is appended to the end of the string, so [1, 0, 0, 1] gives #ff0000ff — eight digits, not six. Read the next page before you trust it on a colour you calculated.

rgbToHsl([r, g, b]) gives [hue, saturation, lightness].

rgbToHsv([r, g, b]) gives [hue, saturation, value].

Hue is a fraction of a turn in both — 0 to 1, not 0 to 360 — and a fourth number you passed in comes back on the end untouched.

Going out to hsl and back is how you shift a colour rather than pick a new one. Add half a turn to the hue and leave saturation and lightness alone, and you have the colour opposite it on the wheel: a second colour that goes with the first without anybody guessing at numbers. Tomato is [1, 0.388, 0.278]; the opposite comes back as [0.278, 0.890, 1], which is the same colour read backwards.`,
        code: `function main() {
  const base = colorNameToRgb('tomato')
  console.log('as rgb:', base)
  console.log('as hex:', rgbToHex(base))
  console.log('as hsl:', rgbToHsl(base))
  console.log('as hsv:', rgbToHsv(base))

  // Same saturation, same lightness, half a turn round the wheel.
  const hsl = rgbToHsl(base)
  const opposite = hslToRgb([(hsl[0] + 0.5) % 1, hsl[1], hsl[2]])
  console.log('the opposite:', opposite)

  return [
    colorize(base, box(10, 10, 10, { center: [-8, 0, 5] })),
    colorize(opposite, box(10, 10, 10, { center: [8, 0, 5] })),
  ]
}`,
      },
      {
        title: 'rgbToHex is exact for some colours only',
        body: `rgbToHex is right for some colours and quietly wrong for others, and it is worth knowing which is which before you print one.

Inside, it multiplies each of your three numbers by 255 and adds the three results into one big number — red times 65536, green times 256, blue as it is — then reads that number back as hex. That works perfectly as long as all three multiplications land on whole numbers. It falls apart when one of them does not, because the fraction left over from the green runs into the digits that belong to the red.

Middle grey is the shortest demonstration. [0.5, 0.5, 0.5] should be #808080. rgbToHex hands back #7fffff, which is a bright cyan. No error, no warning, nothing in the console.

Colours you did not calculate are safe: colorNameToRgb and hexToRgb both hand back numbers that are already whole 255ths, so anything from those converts exactly — which is why the tomato on the previous page came out right. A colour that came out of hslToRgb, hsvToRgb, or arithmetic of your own, usually will not.

The fix is one line. Round each number onto the 255 grid first, and the result is exact:

  const stepped = paint.map(function (c) { return Math.round(c * 255) / 255 })

The fourth number has the same fault and shows it more plainly: rgbToHex([1, 0, 0, 0.5]) hands back #ff00007f.8, with a decimal point in the middle of a colour code.`,
        code: `function main() {
  const grey = [0.5, 0.5, 0.5]

  // Middle grey, twice. One of these two hex codes is a bright cyan.
  console.log('straight in:  ', rgbToHex(grey))
  const stepped = grey.map(function (c) { return Math.round(c * 255) / 255 })
  console.log('rounded first:', rgbToHex(stepped))

  // A colour that came from colorNameToRgb or hexToRgb is already on the grid.
  console.log('a named colour:', rgbToHex(colorNameToRgb('tomato')))

  // The fourth number has the same problem, and can grow a decimal point.
  console.log('half see-through:', rgbToHex([1, 0, 0, 0.5]))

  return [
    colorize(hexToRgb(rgbToHex(grey)),
      box(14, 14, 14, { center: [-10, 0, 7] })),
    colorize(hexToRgb(rgbToHex(stepped)),
      box(14, 14, 14, { center: [10, 0, 7] })),
  ]
}`,
      },
      {
        title: 'hsvToRgb: a set of shades from one hue',
        body: `hsvToRgb goes from [hue, saturation, value] to the [r, g, b] array colorize wants. It is the partner of hslToRgb, and the difference between the two is entirely in the third number.

Lightness, in hsl, runs from black at 0, through the colour at 0.5, to white at 1. Value, in hsv, runs from black at 0 up to the colour at 1 and stops — there is no white end. So turning value down gives you the same colour, darker, which is exactly what a set of shades that belong together needs. Turning lightness down does the same thing, but turning it up washes the colour out instead of brightening it.

Either call shape works: hsvToRgb([0, 1, 1]) and hsvToRgb(0, 1, 1) both give [1, 0, 0]. A fourth number is carried through as alpha.

One hue and four values is a palette. The four bars below are the same blue at a quarter, a half, three quarters and full value.`,
        code: `function main() {
  const hue = 0.58

  return [0.25, 0.5, 0.75, 1].map(function (value, i) {
    const paint = hsvToRgb([hue, 0.7, value])
    console.log('value', value, 'gives', paint)
    return colorize(paint, box(8, 8, 24, { center: [i * 10 - 15, 0, 12] }))
  })
}`,
      },
      {
        title: 'hueToColorComponent, which is not for you',
        body: `hueToColorComponent is not really a function anybody meant to offer you. It is one step of the arithmetic inside hslToRgb, exported along with everything else in the module because that is how the module is put together.

It takes three numbers and returns one colour component. hslToRgb works the first two out from your saturation and lightness, then calls this three times: once at hue + 1/3 for the red, once at hue for the green, once at hue - 1/3 for the blue.

The example rebuilds hslToRgb by hand out of it and prints both answers so you can see they match. That is the only thing it is good for — understanding what hslToRgb is doing. If what you want is a colour, call hslToRgb.

It is in this section for the same reason as the rest: it is exported, so somebody was going to find it, and finding it with no explanation is worse than finding it with one.`,
        code: `function main() {
  const h = 0.6
  const s = 0.8
  const l = 0.5

  // This is hslToRgb, written out by hand.
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const byHand = [
    hueToColorComponent(p, q, h + 1 / 3),
    hueToColorComponent(p, q, h),
    hueToColorComponent(p, q, h - 1 / 3),
  ]

  console.log('by hand: ', byHand)
  console.log('hslToRgb:', hslToRgb([h, s, l]))

  return colorize(byHand, box(24, 24, 24, { roundRadius: 3 }))
}`,
      },
      {
        title: 'The helper drawer',
        body: `The utils module holds seven functions. The Transforms section already covered two of them, degToRad and radToDeg, because the course uses those. The other five are the library's own plumbing: JSCAD needed a way to flatten a list and a way to sort numbers, wrote them, and exported them along with everything else. They are not aimed at you, and none of them does anything the JavaScript you already know cannot do.

Three of them still read clearly enough to be worth a look.

flatten(list) turns a list of lists into one flat list, however deeply it is nested. A loop inside a loop leaves exactly that shape and JSCAD wants one flat array of shapes, so this is the one you might genuinely reach for. Plain JavaScript spells it list.flat(Infinity).

fnNumberSort(a, b) is a comparison function, not a sort. It returns a minus b, and its use is as the argument to sort. This matters because plain sort() compares numbers as if they were text: [12, 3, 30, 7].sort() gives 12, 3, 30, 7, and [12, 3, 30, 7].sort(fnNumberSort) gives 3, 7, 12, 30.

areAllShapesTheSameType(list) is true when every shape in the list is the same kind — all solids, or all flat shapes, or all paths — and false when they are mixed. It answers the same question the booleans ask before refusing a mixed list with only unions of the same type are supported. An empty list is true.

The remaining two get a page each, because both of them behave in a way that is worth being warned about.`,
        code: `function main() {
  // A list of lists, the shape a loop inside a loop leaves behind.
  const nested = [0, 1, 2].map(function (row) {
    return [0, 1, 2].map(function (col) {
      return box(6, 6, 6, { center: [col * 10 - 10, row * 10 - 10, 3] })
    })
  })

  const flat = flatten(nested)
  console.log('rows:', nested.length, ' shapes:', flat.length)
  console.log('all one kind?', areAllShapesTheSameType(flat))
  console.log('mixed?', areAllShapesTheSameType([flat[0], disc(2)]))

  const heights = [12, 3, 30, 7]
  console.log('sorted the default way:', heights.slice().sort())
  console.log('sorted as numbers:     ', heights.slice().sort(fnNumberSort))

  return union(flat)
}`,
      },
      {
        title: 'insertSorted returns nothing',
        body: `insertSorted(list, item, compare) drops one item into an already-sorted list, in the right place. It finds the place by repeatedly halving the list rather than walking down it, then splices the item in.

The surprise is what it hands back: nothing. It returns undefined every time, and the list you passed in is what changed. So

  const sorted = insertSorted(heights, 8, fnNumberSort)

leaves sorted holding undefined while heights quietly became the answer you were after. That catches people, because nearly everything else in JSCAD hands back a new thing and leaves what you gave it alone — translate, colorize, subtract, all of them.

The compare argument is not optional. Leave it off and it throws, because it has nothing to compare the item with.

Plain JavaScript does the same job in two steps that are harder to misread: list.push(item) and then list.sort(fnNumberSort).`,
        code: `function main() {
  const heights = [4, 12, 24]

  // insertSorted hands back nothing at all. The array is what changed.
  const answer = insertSorted(heights, 8, fnNumberSort)
  console.log('what it returned:', answer)
  console.log('what the array is now:', heights)

  return heights.map(function (h, i) {
    return box(6, 6, h, { center: [i * 10 - 15, 0, h / 2] })
  })
}`,
      },
      {
        title: 'radiusToSegments',
        body: `Every curve in JSCAD is really a run of short straight sides, and segments is how many. Too few and a cylinder looks like a nut; too many and the file grows for no visible gain. radiusToSegments works the number out from what you actually care about instead.

radiusToSegments(radius, maxSideLength, maxAngle) returns whichever of these three is largest:

1. the number of sides needed for no side to be longer than maxSideLength,
2. the number needed for no side to span more than maxAngle radians,
3. and 4.

So the two limits are demands rather than suggestions, and the stricter one wins. At a radius of 20, radiusToSegments(20, 0.3, 0.3) is 419 and radiusToSegments(20, 4, 0.6) is 32. Leave both limits off and you get 4 — not an error, just the floor, and a four-sided cylinder is a square post.

It earns its place when a design's size comes from a parameter. Hard-coding segments: 32 is right for the size you tested it at and wrong everywhere else: on a 3 mm knob it is wasted detail, and on a 200 mm ring it is visibly faceted. Asking for a maximum side length of 0.3 mm is right at every size, because the number of sides then follows the radius on its own.`,
        code: `function main() {
  const radius = 20

  // No side longer than 0.3 mm, and no side wider than 0.3 radians.
  const fine = utils.radiusToSegments(radius, 0.3, 0.3)
  const coarse = utils.radiusToSegments(radius, 4, 0.6)
  console.log('fine:', fine, ' coarse:', coarse)
  console.log('asked for nothing:', utils.radiusToSegments(radius))

  return [
    transforms.translate([-25, 0, 0], primitives.cylinder({ radius, height: 6, segments: coarse })),
    transforms.translate([25, 0, 0], primitives.cylinder({ radius, height: 6, segments: fine })),
  ]
}`,
      },
    ],
  },
];

export function getSection(slug: string): DocSection | undefined {
  return coreGetSection(sections, slug);
}

export function getAllSectionSlugs(): string[] {
  return coreGetAllSectionSlugs(sections);
}

export function searchDocs(query: string, limit = 30): DocSearchResult[] {
  return coreSearchDocs(sections, query, limit);
}
