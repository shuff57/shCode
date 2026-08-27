# JSCAD API Reference

Hand-authored reference for the `@jscad/modeling` surface the course teaches
(Q3–Q4). Every example below runs in the in-app docs sandbox (`/docs/reshape`)
and was verified against `@jscad/modeling@2.13.0`.

The seventeen exports the course does **not** teach are at the bottom, under
[Beyond the course](#beyond-the-course) — between the two, every function the
fifteen modules export directly is covered here. For the sub-namespaces below
that (`curves.bezier`, `geometries.geom3`, `maths.vec3`, …) see
https://openjscad.xyz/docs/.

## Program skeleton

Every JSCAD program has the same shape:

```js skeleton
const { primitives, transforms } = require('@jscad/modeling')

function main() {
  // build and return a shape or an array of shapes
}

module.exports = { main }
```

- `require('@jscad/modeling')` imports the library; destructure the modules
  you need.
- `main()` is the entry point. It must return a geometry or an array of
  geometries.
- `module.exports = { main }` tells the runner which function to call.

### The shortcut, and why the long form is still worth writing

The in-app runner (`public/reshape/runner.html`) pre-loads every JSCAD module
into scope, so inside shCode both of these do the same thing:

```js shcode-only
function main() {
  return cube({ size: 10 })          // shortcut — no require() needed
}
```

```js
const { primitives } = require('@jscad/modeling')

function main() {
  return primitives.cube({ size: 10 })
}

module.exports = { main }            // the portable form
```

The shortcut is additive: nothing is renamed and nothing is wrapped, so the
`require` / `module.exports` version keeps working here exactly as written.
Write the portable form when you want the file to also run on
https://jscad.app/ — that editor has no such shortcut. Two names inside
`@jscad/modeling` collide with each other, so the bare `utils` and bare
`minkowski` are the top-level modules of those names; `maths.utils` and
`booleans.minkowski` stay reachable through their modules.

That first block, and the reSHape section below, are the only examples in this
file that depend on shCode, and their fences are tagged `shcode-only` for a
reason: `npm test` runs every other example here in a require-only sandbox and
fails the build if one of them needs the shim.

### Converting a whole file to the portable form

Converting a file undoes **two** shortcuts, and a file that only had the first
one undone still does not run. The obvious one is the reSHape names — `box(40, 20, 10)` becomes
`primitives.cuboid({ size: [40, 20, 10] })`. The one that is easy to forget is
the shim above: `translate` and `subtract` and `measureVolume` are bare in
shCode and do not exist on jscad.app at all. Both halves show up in one line
more often than not — `revolve(translate([10, 0, 0], rect(4, 10)))` is an reSHape
name wrapped around a bare real one.

Here is a program in reSHape:

```js shcode-only
function main() {
  const arm = translate([50, 0, 0], box(40, 20, 20))
  const cap = sit(ring(14, 4))

  return [turn(90, arm), cap]
}
```

…and here is exactly what the converter makes of it — `require` header derived
from what was actually emitted, nothing added that is not used:

```js
const { measurements, primitives, utils, transforms } = require('@jscad/modeling')

// reSHape's turn(), written out in the real API. It rotates a shape about its
// OWN middle; transforms.rotate rotates about the world origin.
function turnInPlace(degrees, shape) {
  const spin = Array.isArray(degrees) ? degrees : [0, 0, degrees]
  const bounds = Array.isArray(shape)
    ? measurements.measureAggregateBoundingBox(shape)
    : measurements.measureBoundingBox(shape)
  const mid = [
    (bounds[0][0] + bounds[1][0]) / 2,
    (bounds[0][1] + bounds[1][1]) / 2,
    (bounds[0][2] + bounds[1][2]) / 2
  ]
  const radians = [
    utils.degToRad(spin[0]), utils.degToRad(spin[1]), utils.degToRad(spin[2])
  ]
  return transforms.translate(mid,
    transforms.rotate(radians,
      transforms.translate([-mid[0], -mid[1], -mid[2]], shape)))
}

function main() {
  const arm = transforms.translate([50, 0, 0], primitives.cuboid({ size: [40, 20, 20] }))
  const cap = transforms.align({ modes: ['none', 'none', 'min'], relativeTo: [0, 0, 0], grouped: false }, primitives.torus({ outerRadius: 14, innerRadius: 4 }))

  return [turnInPlace(90, arm), cap]
}

module.exports = { main }
```

**`turn` is the one name that becomes a function rather than a call**, and it is
worth reading rather than skipping. `turn` is three calls around a measurement —
measure the shape, bring it to the origin, rotate, put it back — so there is no
one call to swap it for. Writing it inline would evaluate your shape three
times, which is wrong the moment the argument is `turn(45, subtract(a, b))`. So
the converter writes an ordinary local function into your file. `turnInPlace` is
not a shim and not reSHape in disguise: it is the real API, it travels with the
file, and it is the honest answer to "what was `turn` actually doing". Swapping
it for a plain `transforms.rotate` is **not** the same thing — that pivots on
the world origin.

Two more things it tells you rather than hides:

- **`sit` on a bare name.** `sit(parts)` becomes
  `grouped: Array.isArray(parts)`, because whether `parts` is one shape or a
  list cannot be read off the text — and `grouped: false` on a list drops every
  part separately onto `z = 0` with no error. That decision is printed in
  `notes`.
- **It refuses rather than guesses.** A name your file declares for itself, a
  shorthand property, an options object that is a variable rather than a written
  `{ }` — each is reported in `refusals` with a line number and left exactly as
  you wrote it. Nothing is rewritten on a hunch.

It converts one file. jscad.app also takes a whole folder for a multi-file
project, and nothing here converts a project layout.

## reSHape — the simplified names

Everything else in this file is the real `@jscad/modeling` API, and it is what
you take to jscad.app, to a job, and to Q4. **reSHape** is twelve extra names that
sit on top of it, loaded from `public/reshape/reshape.js` after the shim. They
exist for one reason: to put the object literal where a beginner can see why it
is worth having, instead of on line one where it is just punctuation.

Compare the first line a student writes:

```js shcode-only
function main() {
  return box(40, 20, 10)                      // reSHape — no braces, no arrays
  // return cuboid({ size: [40, 20, 10] })    // the real API — both required
}
```

…with the second one, the first time they need to move something:

```js shcode-only
function main() {
  return box(40, 20, 10, { center: [0, 0, 10] })
  // return cuboid({ size: [40, 20, 10], center: [0, 0, 10] })
}
```

That contrast — no brace, then a brace because the model needed one — is the
whole point, and the real API cannot teach it, because there the brace is
mandatory from the start. So the rule is: **the values a shape cannot exist
without are positional; every named extra rides in an optional trailing `{ }`.**
The option keys are the library's own: `center`, `roundRadius`, `segments`.

Nothing is renamed and nothing is wrapped. Every call below returns exactly
what the real call beside it returns — a `geom2` or a `geom3` — so a reSHape
shape goes straight into `subtract`, `hull`, `colorize` or `extrudeLinear`, and
the two vocabularies mix freely in one file.

#### The twelve names

| reSHape | The real call it stands for |
| --- | --- |
| `box(40, 20, 10)` | `cuboid({ size: [40, 20, 10] })` |
| `box(20, 20, 20, { roundRadius: 3 })` | `roundedCuboid({ size: [20, 20, 20], roundRadius: 3 })` |
| `rect(40, 20)` | `rectangle({ size: [40, 20] })` |
| `rect(40, 20, { roundRadius: 3 })` | `roundedRectangle({ size: [40, 20], roundRadius: 3 })` |
| `disc(6)` | `circle({ radius: 6 })` |
| `ball(20)` | `sphere({ radius: 20 })` |
| `tube(5, 20)` | `cylinder({ radius: 5, height: 20 })` |
| `tube(5, 20, { roundRadius: 1 })` | `roundedCylinder({ radius: 5, height: 20, roundRadius: 1 })` |
| `cone(10, 20)` | `cylinderElliptic({ startRadius: [10, 10], endRadius: [0, 0], height: 20 })` |
| `ring(14, 4)` | `torus({ outerRadius: 14, innerRadius: 4 })` — read the warning below; the pair is inverted |
| `poly(corners)` | `polygon({ points: corners })` |
| `extrude(10, profile)` | `extrudeLinear({ height: 10 }, profile)` |
| `revolve(profile)` | `extrudeRotate({}, profile)` — a full turn is already the default |
| `revolve(profile, { segments: 16 })` | `extrudeRotate({ segments: 16 }, profile)` — the `{ }` swaps ends |
| `sit(shape)` | `align({ modes: ['none','none','min'], relativeTo: [0,0,0] }, shape)` |
| `sit(parts)` — a list of shapes | `align({ modes: ['none','none','min'], relativeTo: [0,0,0], grouped: true }, parts)` |
| `turn(45, shape)` | **not** a plain `rotate` — see below |

Every row of that table is executed by `npm test`, both halves, and the two
results are compared as whole geometry — so it is an answer key, not a
description. `turn` is the one row that is prose, because it is the one name
that has no plain equivalent.

Walking that table is how you leave: swap each reSHape name for the plain
equivalent beside it, then put the shim's bare names back behind their modules
and add the `require` header. See
[Converting a whole file to the portable form](#converting-a-whole-file-to-the-portable-form)
above for both halves, because a file with only the names undone still does not
run.

Every option is passed through untouched: `segments`, `center` and
`roundRadius` mean exactly what they mean in the real call, with the same
defaults. A key a name does not have is refused by name rather than ignored,
**and the refusal tells you the real function that does have it** — so a dead
end in reSHape is always one function name from an answer. A `roundRadius` that
is too big is reported with your own numbers in it instead of the library's
"must be smaller than the radius of all dimensions".

Nothing here is accepted and quietly dropped. `turn`, `sit`, `ring` and `poly`
have no `{ }` at all, so `turn(45, shape, 30)`, `sit(shape, { modes: [...] })`
and `ring(14, 4, { segments: 64 })` are errors, not no-ops — the second one
especially, because `modes` is `align`'s own key and looks like it ought to
work, and the third because `torus` really does accept a `segments` key and
really does throw it away.

Four rows need reading twice.

**`sit` on a list needs `grouped: true`.** reSHape does this for you: handed one
shape it aligns that shape, handed a list it moves the whole assembly as one.
The real `align` defaults to `grouped: false`, which drops *every part
separately* onto `z = 0` — the model collapses into itself, and nothing throws.
That is the single most likely way to graduate a working assembly into a broken
one, so copy the `grouped: true` row, not the plain one.

**`revolve` is the one name whose `{ }` changes ends.** In reSHape every extra
rides in a *trailing* `{ }`, with no exceptions — that is the whole grammar.
The real `extrudeRotate` and `extrudeLinear` take theirs *first*. `extrude`
hides that, because its one required value becomes the leading `{ height: … }`;
`revolve` cannot, because its required value is the shape. So
`revolve(profile, { segments: 16 })` graduates to
`extrudeRotate({ segments: 16 }, profile)` — the same two things, in the other
order. Writing `revolve({ segments: 16 }, profile)` is refused by name rather
than half-working.

**`revolve` makes a full turn, and only a full turn.** `angle` is not one of
reSHape's option keys and it is not going to become one — a part turn is
`extrudeRotate`'s job, and §9.1's own worked example is written that way:
`extrudeRotate({ segments: 8, angle: constants.TAU / 2 }, profile)` sweeps half
way round. (The book writes that angle `TAU / 2`; bare `TAU` is not a name this
runner installs — see [`TAU` is a value, not a name in scope](#tau-is-a-value-not-a-name-in-scope).)
Typing `revolve(profile, { angle: … })` does not half-work either; it is refused
with that real call spelled out in the message. That is the shape of every
refusal here — a name reSHape does not have is answered with the name that does.

**`ring` inverts `torus`'s two radiuses, on purpose, because `torus`'s names are
not true.** JSCAD's `outerRadius` is the radius of the circle the tube travels
*along* — it is not the outside edge of the finished donut, and it is not
anything you can put a caliper on. Its `innerRadius` is the radius of the tube
itself, not the hole. So `ring(ringRadius, tubeRadius)` maps the ring radius to
`outerRadius` and the tube radius to `innerRadius`.

**`tubeRadius` is a true word where `innerRadius` is a false one — and that is
the whole of `ring`'s advantage, not more.** `ringRadius` carries exactly the
same ambiguity `outerRadius` does: read as *"the radius of the ring I am
making"*, meaning its outside edge, it is wrong in the same direction and by the
same amount. So the arithmetic is printed here rather than left to the name to
imply: **the ring radius is `(across − thick) / 2`.**

Read this table twice, because every row but the last builds without
complaining. Measured on the vendored bundle, for a donut **36 across with an
8-thick tube**:

| what you write | what you get |
| --- | --- |
| `ring(14, 4)` — or `torus({ outerRadius: 14, innerRadius: 4 })` | 36 × 36 × 8 — right |
| `ring(18, 4)` — `ringRadius` read as the outer edge | 44 × 44 × 8, silently |
| `ring(14, 8)` — `tubeRadius` read as the tube's *thickness* | 44 × 44 × 16, silently |
| `torus({ outerRadius: 18, innerRadius: 4 })` — `outerRadius` read as the outer edge | 44 × 44 × 8, silently — the same wrong model as `ring(18, 4)` |
| `torus({ outerRadius: 18, innerRadius: 10 })` — and `innerRadius` read as the hole | 56 × 56 × 20, silently |
| `ring(4, 14)` — the full swap | throws, and it says *"a tube 14 thick will not fit round a ring of radius 4 — in `ring(ringRadius, tubeRadius)` the ring radius comes first. `ring(14, 4)` is the one you meant"* |
| `torus({ outerRadius: 4, innerRadius: 14 })` — the same swap | throws too, and it says *"inner circle is too large to rotate about the outer circle"* — two circles you never typed |

Read the two throwing rows together: **`ring` does not catch a swap `torus`
misses.** Both throw. What `ring` wins there is the *message* — your own two
numbers, and the call you meant. The one real safety difference is higher up
the table: there is no `ring` row that means what `innerRadius` read as the hole
means, because `ring` has no word claiming to be the hole.

`ring` has no `{ }` at all, and that is
measured rather than stylistic: `torus` accepts `center` and `segments` and
**silently drops both**, so a `ring` that took them would build a model at the
wrong place with no error. `torus` spells its own segment counts
`outerSegments` and `innerSegments`, and it has no `center` at any spelling —
`translate` it to move it:

```js shcode-only
function main() {
  const donut = ring(14, 4)                                   // reSHape
  // torus({ outerRadius: 14, innerRadius: 4 })

  const chunky = torus({ outerRadius: 14, innerRadius: 4, outerSegments: 8 })
  const fine = torus({ outerRadius: 14, innerRadius: 4, innerSegments: 6 })

  // 36 across and 8 thick. Read it rather than trusting the picture.
  console.log('across and thick:', measureDimensions(donut))

  return [translate([0, 40, 0], donut), chunky, translate([0, -40, 0], fine)]
}
```

**`cone` is the one whose real call is worth seeing before you need it.** A cone
is `cylinderElliptic` with its top radius set to zero, and there is no shorter
way to write it in the real API: `cylinder({ radius: [12, 0] })` is not a cone,
it is an error. `cone(10, 20)` takes `center` and `segments` and nothing else.
Anything else a cone-shaped thing might be — a cut-off point, an oval base, a
pie slice — is `cylinderElliptic`'s job, and each one is spelled out in the
refusal you get for asking:

| what you want | the real call |
| --- | --- |
| a cone | `cone(10, 20)`, or `cylinderElliptic({ startRadius: [10, 10], endRadius: [0, 0], height: 20 })` |
| the point cut off (a frustum) | `cylinderElliptic({ startRadius: [10, 10], endRadius: [4, 4], height: 20 })` |
| an oval base | `cylinderElliptic({ startRadius: [10, 6], endRadius: [0, 0], height: 20 })` |
| half of it, like a pie slice | `cylinderElliptic({ startRadius: [10, 10], endRadius: [0, 0], height: 20, startAngle: 0, endAngle: constants.TAU / 2 })` |

`roundRadius` is refused too, and for a reason worth knowing: it is a real
reSHape option key on three other names, and `cylinderElliptic` **ignores it
silently** — same bounding box, same polygon count, no error. A key that does
nothing is the same class of bug as a missing height.

**`poly` is the one whose positional argument is a list, and that is a smaller
win than the others.** `box(40, 20, 10)` has no punctuation in it at all;
`poly([[0, 0], [20, 0], [10, 15]])` plainly does. What it removes is the object
literal wrapped around a list you already have — `polygon({ points: corners })`
becomes `poly(corners)` — which is worth having and is not the same thing as
"no punctuation". It has no `{ }`, so `polygon`'s other two keys, `paths` and
`orientation`, are on the far side of it; the refusal names `polygon`.

Three of its guards exist because the library's own answer is silence.
`polygon({ points: [] })` hands back a perfectly valid flat shape with no sides
at all and an all-zero bounding box. `polygon({ points: [[0,0],[20,0],[10,'x']] })`
hands back real geometry whose bounding box reads `[[0,null,0],[20,null,0]]`.
Only the two-corner case throws, and it says *"list of points 0 must contain
three or more points"* — naming a list index `poly` has not got.

**The one thing `poly` teaches you that graduation day punishes: `polygon` does
not take a bare list, and it does not say so.** Every other reSHape name
graduates by a rename plus a bracket, and forgetting the bracket throws. This
one does not. Measured on the vendored bundle:

| what you write, after graduating | what you get |
| --- | --- |
| `polygon({ points: corners })` | the shape — this is the right call |
| `polygon(corners)` — the habit `poly(corners)` builds | a real, **valid, empty** shape: 0 sides, bounding box `[[0,0,0],[0,0,0]]`, no error, nothing on screen |

And "always wrap the list" is not the rule either, because `line`, two rows away
from `polygon` in the **primitives** catalogue below, really does take its
points bare: `line([[0, 0], [20, 0]])`. Some of them do. Read the
signature rather than guessing — which is what `polygon(options)` in the book's
own heading is telling you.

```js shcode-only
function main() {
  const corners = [[0, 0], [20, 0], [10, 15]]

  const flat = poly(corners)                     // reSHape
  // polygon({ points: corners })

  const wedge = extrude(6, flat)
  const spun = revolve(translate([30, 0, 0], poly(corners)))
  const spike = cone(10, 20)

  return sit([wedge, translate([70, 0, 0], spun), translate([-30, 0, 0], spike)])
}
```

#### Side by side

```js shcode-only
function main() {
  const plate = subtract(rect(40, 20), disc(6))       // reSHape
  // subtract(rectangle({ size: [40, 20] }), circle({ radius: 6 }))

  const part = extrude(10, plate)                     // reSHape
  // extrudeLinear({ height: 10 }, plate)

  const bushing = subtract(tube(10, 20), tube(4, 22)) // reSHape
  // subtract(cylinder({ radius: 10, height: 20 }),
  //          cylinder({ radius: 4,  height: 22 }))

  const bowl = revolve(translate([10, 0, 0], rect(4, 10)))
  // extrudeRotate({}, translate([10, 0, 0], rectangle({ size: [4, 10] })))

  return [sit(part), sit(bushing), sit(bowl), sit(ball(10))]
  // align({ modes: ['none', 'none', 'min'], relativeTo: [0, 0, 0] }, …)
}
```

`sit` drops a shape until its lowest point rests on `z = 0` — `ball` and `tube`
are built centred on the origin, so half of them starts under the print bed.
Handed a list, it moves the whole assembly as one group rather than dropping
each part separately (that is the `grouped: true` row above, and the reason it
is a separate row).

#### Writing the `{ }`

The layer's whole justification is that it still teaches objects — so here is
the object literal five times, in the order a student meets it. Every key below
is the library's own; nothing on this page is a name reSHape made up.

**One key, because the model needed one.** A `tube` is built centred on the
origin, so half of it starts under the print bed. Nothing is wrong with the
call — the model is wrong, and `center` is what fixes it.

```js shcode-only
function main() {
  const sunk = tube(6, 30)                        // no brace anywhere
  const seated = tube(6, 30, { center: [0, 0, 15] })   // one key, one reason

  // Half of `sunk` is below z = 0. Read it rather than trusting the picture.
  console.log('sunk  ', measureBoundingBox(sunk)[0][2])
  console.log('seated', measureBoundingBox(seated)[0][2])

  return [translate([-20, 0, 0], sunk), translate([20, 0, 0], seated)]
}
```

**A second key, because one was not enough.** `roundRadius` rounds the edges;
`segments` decides how many flat strips stand in for each curve. They are two
separate wishes, so they are two keys in the same `{ }` — not two calls, and
not a second positional number.

```js shcode-only
function main() {
  const sharp = box(30, 20, 10)
  const soft = box(30, 20, 10, { roundRadius: 3 })
  const smooth = box(30, 20, 10, { roundRadius: 3, segments: 24 })

  // Rounding removes material, so the volume falls; segments only changes how
  // finely the curve is drawn, so it barely moves the number at all.
  console.log('sharp ', measureVolume(sharp))
  console.log('soft  ', measureVolume(soft))
  console.log('smooth', measureVolume(smooth))

  return sit([translate([-40, 0, 0], sharp), soft, translate([40, 0, 0], smooth)])
}
```

**`segments` on its own is a shape decision, not a quality setting.** Six
segments is not a rough circle, it is a hexagon — which is how a nut gets made.

```js shcode-only
function main() {
  const nut = extrude(6, disc(10, { segments: 6 }))
  const bolt = extrude(24, disc(4, { segments: 48 }))

  console.log('nut across the corners:', measureDimensions(nut))

  return sit([nut, translate([0, 0, 6], bolt)])
}
```

**Everything at once.** Three keys, one object, and the call still reads left to
right: the two numbers the tube cannot exist without, then everything it merely
wants.

```js shcode-only
function main() {
  return tube(8, 24, { center: [0, 0, 12], roundRadius: 2, segments: 48 })
}
```

**And the richest object writing in the quarter — `getParameterDefinitions`.**
This one is not reSHape's; it is the real JSCAD parameter panel, and §8.4 is
entirely about it. It hands back an **array of objects**, one per control, and
each kind of control is a different set of keys: a `number` carries
`min` / `max` / `step`, a `choice` carries `values` and `captions`. Read it as
the same object literal as above, written five keys at a time and collected in
a list.

```js shcode-only
function getParameterDefinitions() {
  return [
    { name: 'width', type: 'number', initial: 40, min: 10, max: 80, step: 5, caption: 'Width' },
    { name: 'corner', type: 'number', initial: 4, min: 0, max: 9, step: 1, caption: 'Corner radius' },
    { name: 'finish', type: 'choice', values: ['sharp', 'round'],
      captions: ['Sharp', 'Round'], initial: 'round', caption: 'Finish' }
  ]
}

function main(params) {
  // The trailing { } built a key at a time instead of written out. It is the
  // same object either way — box cannot tell the difference.
  const extras = {}
  if (params.finish === 'round' && params.corner > 0) extras.roundRadius = params.corner

  return sit(box(params.width, 20, 10, extras))
}
```

Two things about that panel are worth knowing before you rely on it. There is
no parameter UI in the in-app viewport: the runner reads each definition's
`initial` (or `default`) and calls `main` with those values once, so an example
has to look right at its defaults. And that is exactly why a `checkbox`
misbehaves here — its default is spelled `checked`, which the runner does not
read, so `params.engrave` arrives as `undefined` no matter what you wrote. A
two-value `choice` carries a real `initial` and is the way to say the same
thing in a sketch you want to run in shCode.

#### `turn` is the one that is not a rename

`transforms.rotate` spins geometry around the **world origin**, not around the
shape's own middle. Measured on the vendored bundle: a 40 × 20 × 20 box moved
to `x = 50` occupies `[[30,-10,-10],[70,10,10]]`; rotate it 90° about Z and it
becomes `[[-10,30,-10],[10,70,10]]` — it orbited to `y = 50` instead of turning
where it stood, and nothing threw.

This is not only reSHape's finding. The `/sandbox` visual modeller hit it first
and builds every rotated shape at the origin before moving it into place for
exactly this reason; the rule is pinned there by an assertion named
**"a turned shape spins about itself, not the scene"** in
`scripts/model-codegen-assertions.cjs`, which fails the build if that ordering
is ever reversed. Read that check rather than trusting this paragraph — a
paragraph can go stale, and `npm test` fails here too if that assertion is ever
renamed out from under this citation.

```js shcode-only
function main() {
  const arm = translate([50, 0, 0], box(40, 20, 20))

  return turn(90, arm)                     // turns where it stands
  // rotate([0, 0, Math.PI / 2], arm)      // orbits to y = 50 instead
}
```

So `turn` measures the shape's own middle, brings it to the origin, rotates,
and puts it back — and it takes **degrees**, converted with the library's own
`utils.degToRad`. `turn(45, shape)` spins about Z, which is the 2D case and the
common 3D one; `turn([0, 90, 0], shape)` picks the axis, the same three-slot
order `rotate` uses. It accepts a single shape or a whole assembly. Turning a
flat 2D shape about X or Y is refused, because the real call returns an
invisible degenerate line for it.

#### `turn` also makes the order stop mattering, and that is a loss

That is the *second* way `turn` differs from `rotate`, and unlike the pivot it
is something `turn` takes away. It is written down here rather than left to be
discovered.

Turning a shape about its **own** middle commutes with `translate`: turn then
move, and move then turn, are the same model — every time, for every angle and
every distance. Turning it about the **world** origin does not. Measured on the
vendored bundle with a 40 × 20 × 10 box:

| what you write | where it ends up |
| --- | --- |
| `translate([50, 0, 0], rotate([0, 0, Math.PI / 2], s))` | `[[40,-20,-5],[60,20,5]]` |
| `rotate([0, 0, Math.PI / 2], translate([50, 0, 0], s))` | `[[-10,30,-5],[10,70,5]]` |
| `translate([50, 0, 0], turn(90, s))` | `[[40,-20,-5],[60,20,5]]` |
| `turn(90, translate([50, 0, 0], s))` | `[[40,-20,-5],[60,20,5]]` |

Two different models with `rotate`; one model, twice, with `turn`. So **"the
order you apply transforms in changes the answer" cannot be shown with `turn`.**
No angle and no distance will make it appear.

That fixes what `turn`'s graduation lesson honestly is. It is *not* "this is why
you build at the origin and translate last" — with `turn` that advice makes no
difference, so a whole quarter of reSHape would quietly contradict it. It runs the
other way round:

> `turn` spins your shape around its own middle, which is why it never mattered
> whether you turned it before or after you moved it. `rotate` spins it around
> the middle of the *world*, so with `rotate` it matters very much — and that is
> why every JSCAD example you are about to read builds at the origin and
> translates last.

The order lesson itself is still fully teachable in Q3, because reSHape renames
nothing: `rotate` and `translate` are both bare, both real, and both what the
textbook prints. Show it in `rotate` — that is the only place it exists:

```js shcode-only
function main() {
  const s = box(40, 20, 10)

  // The same two transforms, in the two orders. With rotate these are two
  // different models: the first stands at x = 50, the second has swung round
  // to y = 50. Swap both rotates for turn(90, …) and they become one model.
  const spunThenMoved = translate([50, 0, 0], rotate([0, 0, Math.PI / 2], s))
  const movedThenSpun = rotate([0, 0, Math.PI / 2], translate([50, 0, 0], s))

  return [spunThenMoved, movedThenSpun]
}
```

#### `turn` for shapes, `rotate` for frames

Everything above says `rotate` is the one that surprises you, which makes
swapping in `turn` feel like the safe move everywhere. It is not, and this is
the one place the substitution quietly builds the wrong model.

The two calls answer different questions:

| | turns | use it to |
| --- | --- | --- |
| `turn(degrees, shape)` | the **shape**, about its own middle | tilt a part, stand a lid on edge, angle a bracket |
| `rotate(radians, shape)` | the **world**, about the origin | move a *coordinate frame* — put a flat outline on the xz or yz plane |

Standing a 2D sketch up is the second kind. A flat outline is drawn on the xy
plane, and that plane passes **through the origin** — so turning about the
origin is exactly what "stand this up" means. Use `turn` and the outline pivots
about its own centre instead, landing on no plane at all. Nothing throws; the
extrusion just comes out somewhere it should not be.

The rule is not *prefer `turn`*. It is **`turn` for shapes, `rotate` for
frames** — and if you cannot tell which you have, ask whether the origin is
part of the answer. If it is, you want `rotate`.

This is not hypothetical: shCode's own `/sandbox` builds sketches this way and
keeps a raw `rotateX`/`rotateY` for exactly this step, guarded by an assertion
named "an xz sketch stands up in z, not y" in
`scripts/model-codegen-assertions.cjs`, which fails if that call is ever
replaced with `turn`.

#### Taking your work to jscad.app

reSHape's twelve names live in this runner and nowhere else, so a reSHape program
pasted into <https://jscad.app/> does not run — `box is not defined`. The course
names that editor as the Q3 environment, and your file should outlive this app,
so the graduation table above is the answer key.

Swap each reSHape name for the plain equivalent printed beside it, put the shim's
bare names back behind their modules, and add the `require` header — and you
have the same program written in the real `@jscad/modeling` API, the form that
runs there and the form the book prints. Nothing is approximated: every name in
that table is one the gate already proves builds identical geometry both ways.

Two things it will tell you rather than guess:

- `turn` has no single real-API call, so the converter writes a small
  `turnInPlace()` function into your file instead of pretending `rotate` is the
  same thing. It is not — see above.
- `sit` cannot be read from the text alone, because whether a name holds one
  shape or a list is a runtime fact, so it emits the check rather than choosing.

Anything it cannot convert it refuses **by name and line**, and names the real
call you want, rather than emitting something that half-works.

#### Reading the book

The seven Q3 chapters are written in the real API, so a student reads `cuboid`
and writes `box`. That table goes the other way — real name on the left, the
reSHape word for it on the right — and it is the one to keep open while reading.
Three of these are not guessable backwards, which is exactly why they are here.

| what the book prints | the reSHape word |
| --- | --- |
| `cuboid` | `box` |
| `cube` | `box(10, 10, 10)` — one number in the book, three here. It is the first 3D shape §8.1 prints and the opening runnable block of the whole unit |
| `roundedCuboid` | `box(w, d, h, { roundRadius: n })` |
| `rectangle` | `rect` |
| `roundedRectangle` | `rect(w, h, { roundRadius: n })` |
| `circle` | `disc` |
| `sphere` | `ball` |
| `cylinder` | `tube` |
| `roundedCylinder` | `tube(r, h, { roundRadius: n })` |
| `cylinderElliptic` | `cone(radius, height)` — **when, and only when, it is a cone.** `cone` sets `endRadius` to `[0, 0]` for you. A frustum, an oval tube or a pie slice is still `cylinderElliptic`; type the book's own call |
| `torus` | `ring(ringRadius, tubeRadius)` — **the pair is inverted, and neither of `torus`'s names is true.** `outerRadius` is the radius of the circle the tube travels along, not the outer edge; `innerRadius` is the tube, not the hole. `ring(14, 4)` is 36 across and 8 thick. Read the warning above before swapping one for the other |
| `polygon` | `poly(corners)` — a straight rename, minus the `{ points: … }` wrapper. `polygon`'s other two keys, `paths` and `orientation`, have no reSHape spelling; type the book's own call for those |
| `extrudeLinear` | `extrude` — **a straight extrusion only.** Three of §9.1's five `extrudeLinear` calls also pass `twistAngle` / `twistSteps`, and `extrude` has no such key; type the book's own call, below |
| `extrudeRotate` | `revolve` — **a full turn only.** §9.1 spins one profile half way round, and `revolve` cannot do it; type the book's own call, below |
| `align` | `sit`, but **only when the modes are `['none','none','min']`** — with any other modes `sit` is the wrong answer, and not one of the four `align` calls the seven chapters print is written that way. Read the warning below before you swap one for the other |
| `rotate` | `turn` — **degrees, and about the shape's own middle**, see above |
| `rotateZ` / `rotateX` / `rotateY` | `turn` — same warning. These are single-axis shortcuts for `rotate` and they orbit the world origin exactly the way it does. `rotateZ(a, s)` is `turn(degrees, s)`; `rotateX` / `rotateY` are `turn([d, 0, 0], s)` / `turn([0, d, 0], s)` |

`rotateZ` is typed in two runnable blocks in §8.1, and the three shortcuts are
named nine more times across §8.1, §8.2 and §9.2 in prose and in option tables,
so a student translating a chapter WILL meet them. They are listed separately
because the row above does not cover them by name, and a missing row on this
table reads as "nothing to worry about" — which is the exact opposite of true.
Every one of them swings an off-centre shape around the middle of the scene
with no error.

Four rows above carry a warning rather than a rename. They are the places
where the real call and its reSHape twin do **different things**, quietly.

**`rotate` → `turn` changes the pivot.** That is the warning above, worked
through two sections up: `rotate` spins about the world origin and `turn` spins
about the shape's own middle, so an off-centre shape orbits under one and stays
put under the other, with no error either way.

**`align` → `sit` changes which axes move, and this is the one most likely to
be swapped without noticing.** `sit` is hard-wired to
`modes: ['none','none','min']` — straight down onto `z = 0`, X and Y left
exactly where they were. Not one `align` in the seven chapters is written that
way. All four are `align({ modes: ['center','center','min'] }, s)` (three of
them, in §8.2 and §9.2) or `align({ modes: ['center','min','min'] }, s)` (one,
in §8.2), and both of those also pull the shape onto the middle line. Write
`sit` and the part lands on the bed still off to one side; nothing throws and
the picture looks plausible. So: `sit` when you want a shape brought down and
left alone horizontally, and the book's own `align` for anything else. `align`
is bare and real in here — it needs no translation at all.

**`extrudeRotate` → `revolve` drops the part turn.** `revolve(profile)` is a
full turn, which is already `extrudeRotate`'s default angle, and five of the six
`extrudeRotate` calls in the chapters are exactly that. The sixth, §9.1's first
worked example, is a half turn, and `angle` is not one of reSHape's option keys.
Type the real call for it — it is bare and in scope here:

```js shcode-only
function main() {
  const profile = disc(3, { center: [4, 0] })

  const half = extrudeRotate({ segments: 8, angle: constants.TAU / 2 }, profile)
  const full = revolve(profile, { segments: 16 })

  return [translate([0, -12, 0], half), translate([0, 12, 0], full)]
}
```

**`extrudeLinear` → `extrude` drops the twist, and it is the same shape of
warning one section later.** `extrude(10, profile)` raises a profile straight
up, which is what `extrudeLinear` does when you give it nothing but a height —
and six of the book's nine `extrudeLinear` calls are exactly that. The other
three are §9.1's twisted block and twisted disc, which add `twistAngle` and
`twistSteps`, turning the profile a little at each of `twistSteps` layers on
the way up. Neither is a reSHape option key, and neither is going to become one:
a twist is `extrudeLinear`'s job, so `extrude(10, profile, { twistAngle: … })`
is refused by name with the real call spelled out rather than quietly building
a straight block. Type the book's own call:

```js shcode-only
function main() {
  const profile = rect(10, 20)

  const straight = extrude(10, profile)                                  // reSHape
  const twisted = extrudeLinear(
    { height: 10, twistAngle: constants.TAU / 4, twistSteps: 20 }, profile
  )

  // The twist costs nothing in material — it is the same volume, wrung round.
  console.log(measureVolume(straight), measureVolume(twisted))

  return sit([translate([-15, 0, 0], straight), translate([15, 0, 0], twisted)])
}
```

`twistSteps` is the one to read twice: it is how many separate layers the twist
is cut into, so a large `twistAngle` with the default `twistSteps` comes out
visibly faceted. §9.1 pairs a quarter turn with `twistSteps: 10`.

#### `TAU` is a value, not a name in scope

§9.1 types a bare `TAU` in five runnable blocks and never says where it comes
from, because in the book it is only ever a default listed in an option table.
It is **not** a name this runner installs. Paste `angle: TAU` in here and you
get `TAU is not defined`, which is a real dead end in the one chapter that needs
it most.

It lives at `maths.constants.TAU`, and the shim puts the module's members one
level into scope, so in shCode you write `constants.TAU`. `Math.PI * 2` is the
same number and travels anywhere.

| what the book prints | what to type in shCode |
| --- | --- |
| `TAU` | `constants.TAU`, or `Math.PI * 2` — the portable form is `maths.constants.TAU` |
| `TAU / 2` | `constants.TAU / 2`, or just `Math.PI` — a half turn |

```js shcode-only
function main() {
  console.log(constants.TAU, Math.PI * 2, maths.constants.TAU)
  return revolve(disc(3, { center: [8, 0] }), { segments: 24 })
}
```

#### The book's other names — type what the book typed

reSHape has no word for these, and that is deliberate: they already read as
English, or they belong to a corner of the library the layer does not model.
Every one of them is bare and real inside shCode, so the answer is always the
same — type what the book typed. They get rows anyway, because a name missing
from a table reads as a name with nothing to worry about, and "there is nothing
to translate here" is worth saying out loud once per name.

| what the book prints | what to type in shCode |
| --- | --- |
| `translate` | `translate` — the same call. reSHape ships no `move`; this one is short already |
| `subtract` | `subtract` — unchanged, and order still matters |
| `union` | `union` — unchanged |
| `mirror` | `mirror({ normal: [...] }, s)` — unchanged |
| `intersect` | `intersect` — unchanged |
| `scale` | `scale` — unchanged, and it scales about the **world origin**, the same trap `rotate` has. `turn` has no counterpart here |
| `center` | `center({ axes: [...] }, s)` — unchanged. Handed several shapes it stacks them all on the origin; `sit` and `align` are the ones for an assembly |
| `star` | `star({ vertices: n, outerRadius: a, innerRadius: b })` — unchanged |
| `ellipse` | `ellipse({ radius: [rx, ry] })` — unchanged. A `disc` has one radius; an ellipse has two, and reSHape does not model it |
| `measureVolume` | `measureVolume(shape)` — unchanged |
| `measureDimensions` | `measureDimensions(shape)` — unchanged |
| `hullChain` | `hullChain(a, b, c)` — unchanged. `hull` wraps everything in one skin, `hullChain` joins neighbours pair by pair; they are not synonyms |
| `vectorText` | `vectorText({ height: 8, input: 'J' })` — unchanged, **but the book prints `inputText`, and there is no such option.** Measured on the vendored bundle: `vectorText({ height: 8, inputText: 'J' })` and the same call with `'H'` come back byte-identical, so §8.1's "swap 'J' for 'H' and run again" changes nothing and reports nothing. The real key is `input`. Letters come out as pen strokes, not shapes |
| `extrudeRectangular` | `extrudeRectangular({ size: w, height: h }, shape)` — unchanged. §9.1 uses it to turn a flat outline into a wall `size` thick and `height` tall. Handed a list of paths instead — `vectorText`'s strokes — it returns one solid per path rather than one lump, so measure the group with `measureAggregateBoundingBox`. `extrude` is the wrong tool for a path and fails silently |
| `path2.fromPoints` | `path2.fromPoints({ closed: true }, points)` — unchanged; bare `path2` is in scope here, and `geometries.path2.fromPoints` is the portable spelling. Its `{ }` comes **first**, unlike every reSHape call |

#### The parameter panel — the words that are not calls

Everything above answers a **name**: something with a `(` after it. §8.4 and
§8.5 also print words that are not names and never will be — the `type:`
values inside `getParameterDefinitions`, which are strings sitting in an object
literal. No table of function names can cover them, and the census below counts
calls, so it counts none of them either. That is a real hole and this is the
table that fills it, because a student who has translated every call in §8.5
still has to get past `type: 'float'` on the second line of its first
parameter block.

Measured on the same seven chapters: **27 parameter definitions**, in **seven**
distinct `type:` spellings. Every one of them is typed into shCode exactly as
the book prints it. There is nothing to translate here, and that is worth
saying out loud once per spelling.

| what the book prints | where | what to type in shCode |
| --- | --- | --- |
| `type: 'number'` | §8.4, nine times | `type: 'number'` — unchanged |
| `type: 'int'` | §8.5, six times | `type: 'int'` — unchanged. A whole number: sides, teeth, copies. §8.5's `count`, `rows` and `cols` |
| `type: 'choice'` | §8.4, four times | `type: 'choice'` — unchanged. It is the one that carries `values` and `captions` |
| `type: 'slider'` | §8.4, twice | `type: 'slider'` — unchanged. The same number as `number`, dragged instead of typed |
| `type: 'float'` | §8.5, twice | `type: 'float'` — unchanged. A number allowed a decimal part. §8.5's `ringRadius` |
| `type: 'checkbox'` | §8.4, twice | `type: 'checkbox'` — unchanged, **but its default is spelled `checked`, which this sandbox does not read**; `params.engrave` arrives `undefined`. Say it with a two-value `choice` instead |
| `type: 'group'` | §8.4, twice | `type: 'group'` — unchanged. A heading, not a value: it declares no parameter, so `main(params)` never sees one |

Six of the seven are "type what the book typed" for one reason, and it is the
reason worth carrying out of this section instead of the table: **`type` picks
the control, `initial` carries the value.** Nothing in a JSCAD program reads
`type` — `main(params)` is handed whatever `initial` said — so an unfamiliar
type is a differently-shaped knob, never a value that fails to arrive. The
seventh, `checkbox`, is the exception precisely because it breaks that rule: it
is the one type that spells its default something other than `initial`.

Run it. This is §8.5's circular arrangement in reSHape words — its `count` and
`ringRadius` copied out of the chapter character for character, `int` and
`float` and all — with two more knobs added so that all four numeric spellings
sit in one block and can be compared. The chapter's version is flat; this one
gives the discs a thickness, so `number` has something to do.

```js shcode-only
function getParameterDefinitions() {
  return [
    // §8.5's own two, exactly as the book writes them.
    { name: 'count', type: 'int', initial: 8, min: 3, max: 24 },
    { name: 'ringRadius', type: 'float', initial: 60, min: 20, max: 200 },
    // Two more, so that all four ways of asking for a number are side by side.
    { name: 'size', type: 'slider', initial: 5, min: 2, max: 20, step: 1, caption: 'Disc size' },
    { name: 'thick', type: 'number', initial: 4, min: 1, max: 10, step: 1, caption: 'Thickness' }
  ]
}

function main(params) {
  // int, float, slider, number — four controls, one kind of value. Read it
  // rather than taking the table's word for it.
  console.log(typeof params.count, typeof params.ringRadius,
    typeof params.size, typeof params.thick)

  const shapes = []
  for (let i = 0; i < params.count; i++) {
    const angle = (i / params.count) * Math.PI * 2
    const x = params.ringRadius * Math.cos(angle)
    const y = params.ringRadius * Math.sin(angle)
    // The book's line here is translate([x, y], circle({ radius: 5 })).
    shapes.push(translate([x, y, 0], extrude(params.thick, disc(params.size))))
  }
  return shapes
}
```

Measured on the chapter sources, so that the size of the bridge is a number
rather than an impression: the seven chapters make **273 library calls** in
their runnable editors, **191 of them — 70% — in a spelling reSHape replaces**,
and 82 in a name it has none for. Every name a student can type in
those chapters is on one of the three tables above, and every `type:` the
parameter panel takes is on the fourth. That is the cost of the layer, and
those tables plus the graduation table are what pay it: one of them is always
the right way round.

## Modules

### primitives — basic shapes

| Function | Options | Notes |
|---|---|---|
| `circle` | `{ radius, segments }` | 2D disc; `segments` controls smoothness |
| `ellipse` | `{ radius: [rx, ry], segments }` | 2D squashed circle |
| `rectangle` | `{ size: [w, h] }` | 2D rectangle |
| `square` | `{ size }` | 2D rectangle, all sides equal — `size` is one number |
| `roundedRectangle` | `{ size: [w, h], roundRadius, segments }` | 2D rectangle with rounded corners |
| `polygon` | `{ points: [[x, y], ...] }` | 2D shape from corner points |
| `triangle` | `{ type: 'SSS', values: [a, b, c] }` | 2D triangle from sides and angles |
| `star` | `{ vertices, outerRadius, innerRadius }` | 2D star |
| `arc` | `{ radius, startAngle, endAngle, segments }` | a 2D **path**, not a shape |
| `line` | `([[x, y], ...])` | a 2D **path**, from a bare array |
| `cube` | `{ size }` | 3D cube, all sides equal |
| `cuboid` | `{ size: [x, y, z] }` | 3D box |
| `roundedCuboid` | `{ size: [x, y, z], roundRadius }` | 3D box with rounded edges |
| `sphere` | `{ radius, segments }` | 3D ball, built as a stack of rings |
| `geodesicSphere` | `{ radius, frequency }` | 3D ball, built as near-equal triangles |
| `ellipsoid` | `{ radius: [rx, ry, rz], segments }` | 3D ball with a radius per axis |
| `cylinder` | `{ radius, height, segments }` | 3D cylinder |
| `cylinderElliptic` | `{ height, startRadius: [x, y], endRadius: [x, y] }` | 3D cone or oval tube |
| `roundedCylinder` | `{ radius, height, roundRadius, segments }` | 3D cylinder with rounded rims |
| `torus` | `{ innerRadius, outerRadius }` | 3D donut |
| `polyhedron` | `{ points, faces, orientation }` | 3D solid listed corner by corner |

Every primitive is centred on the origin unless you say otherwise, so half
of it sits below the grid. `center: [x, y, z]` moves it as it is built —
two numbers, not three, for a flat shape — and `transforms.translate`
afterwards does the same job. Three of them take `center` and quietly ignore
it: `geodesicSphere`, `polyhedron`, and `triangle`, which puts its first
corner on the origin rather than its middle.

`segments` is how many flat sides stand in for a curve — 32 by default,
6 for a hexagonal nut, 128 when smoothness matters more than speed. It is
the single biggest lever on how long a model takes to build.
`geodesicSphere` is the exception: it ignores `segments` and takes
`frequency` instead — six or more, rounded down to a multiple of six, so 6
and 11 both give the same 20 triangles. At frequency 6 a radius-10 ball
measures 17.01 across rather than 20, because 20 flat faces cut the corners
off.

`roundRadius` must stay well under half the smallest side; JSCAD stops
rather than guessing. `roundedRectangle` is the flat version, same rule.

A single number where an array was wanted is the commonest primitive error,
and it runs both ways: `square({ size: [10, 20] })` stops with *size must be
positive*, `ellipsoid({ radius: 5 })` with *radius must be an array of X, Y
and Z values*.

`cylinder` does not make a cone — `radius: [12, 0]` stops with *radius must
be positive*. Cones are `cylinderElliptic`, whose two ends are set separately
and each take an `[x, y]` pair: `endRadius: [0, 0]` pulls one end to a
point, `startRadius: [15, 5]` gives an oval tube. Both ends at zero is
refused, and a plain `radius` option is ignored without a word — so a tube
that comes back 2 mm wide is a misspelling, not a bug.

`polyhedron` is the escape hatch when no ready-made shape fits. `points` is
a list of corners; `faces` says which of them to join, written as positions
in that list. List each face's corners counter-clockwise as seen from outside.
Going the other way builds without complaint and points the face inward;
`orientation: 'inward'` does the same thing deliberately, and reports a
negative volume.

`arc` and `line` hand back a path — a line with no inside. Only a closed
path can be extruded: a part-turn `arc` or an open `line` gives *extruded
path must be closed*. With no `endAngle` at all `arc` draws a whole circle,
and that one is closed. `line([[0, 0], [10, 0], [10, 10]])` takes a bare
array with no options object; `line({ points: [...] })` stops with *points
must be an array*. When you want a filled outline, use `polygon`.

```js
const { primitives } = require('@jscad/modeling')

function main() {
  return primitives.cuboid({ size: [30, 20, 10] })
}

module.exports = { main }
```

### transforms — move, rotate, scale

| Function | Arguments | Notes |
|---|---|---|
| `translate` | `([x, y, z], shape)` | move; `[x, y]` for 2D |
| `translateX` / `translateY` / `translateZ` | `(distance, shape)` | single-axis shortcuts |
| `rotate` | `([x, y, z], shape)` | radians, around the origin |
| `rotateX` / `rotateY` / `rotateZ` | `(angle, shape)` | single-axis shortcuts |
| `scale` | `([x, y, z], shape)` | stretch per axis |
| `scaleX` / `scaleY` / `scaleZ` | `(f, shape)` | single-axis shortcuts |
| `mirror` | `({ normal: [x, y, z], origin: [x, y, z] }, shape)` | flip across a plane |
| `mirrorX` / `mirrorY` / `mirrorZ` | `(shape)` | flip across a plane through the origin |
| `center` | `({ axes: [bool, bool, bool] }, shape)` | center at origin |
| `centerX` / `centerY` / `centerZ` | `(shape)` | single-axis shortcuts |
| `align` | `({ modes, relativeTo, grouped }, ...shapes)` | line several shapes up |
| `transform` | `(matrix, shape)` | apply a stored `maths.mat4` move |

Transforms return a new shape; the original is untouched. Nest them:
`transforms.translate([0, 0, 10], primitives.cube({ size: 5 }))`.

**Rotation happens around the origin, never around the shape's own middle.**
That one fact is behind most transform bugs. `rotateZ(a, translate([50, 0, 0], s))`
swings `s` around in a wide arc; `translate([50, 0, 0], rotateZ(a, s))` spins it
in place and then moves it. Build parts centred on the origin, rotate them
there, and translate them into position last.

Angles are radians. `utils.degToRad(90)` converts from degrees, and
`utils.radToDeg` goes back the other way. Written bare inside shCode, `utils`
is the top-level module that owns them; `maths.utils` is a different module
reachable through `maths`.

`mirrorX` flips left-to-right across the plane through the origin, `mirrorY`
front-to-back, `mirrorZ` top-to-bottom. Build the first half entirely on one
side of the origin, so the mirror plane falls exactly where the two halves are
meant to meet. The long form puts the plane where you like: `normal` is the
direction the mirror faces, `origin` any point it passes through, defaulting
to `[0, 0, 0]`.

That options object belongs to the long form **only**, and the shortcuts do
not police it. `mirrorX({ normal: [1, 0, 0] }, half)` reads the object as a
second shape to mirror, throws nothing, and hands back an array holding your
options object and one correctly mirrored shape. The viewport draws the shape
and ignores the object, so it looks right — until you `union` that array and
get an empty solid measuring `[[0,0,0],[0,0,0]]`.

`center({}, shape)` moves a shape's middle onto the origin; `axes` restricts
it to the axes you mark `true`, and `centerX` / `centerY` / `centerZ` are
the shortcuts. Handed several shapes it centres each one separately, stacking
them all on the origin — almost never what an assembly wants.

`align` is the one for several parts at once. Each axis of `modes` takes
`'min'`, `'max'`, `'center'` or `'none'`, and the line is the origin unless
`relativeTo` moves it, with `null` meaning leave that coordinate alone. So
`align({ modes: ['none', 'none', 'min'] }, a, b, c)` drops three parts of
three different heights flat onto the grid in one call, and
`relativeTo: [null, null, 42]` seats one on top of a shelf. The defaults are
`['center', 'center', 'min']` — sensible, and invisible, so write the modes
out. `grouped: true` moves the shapes as one set, keeping the gaps between
them. One shape in gives one shape back; two or more give an **array**. A
misspelled mode is caught, though the message it prints names only three of
the four legal words.

`transform(matrix, shape)` applies a move built by `maths.mat4`:
`mat4.fromTranslation(mat4.create(), [0, 0, 12])` is *go up 12 mm*, and there
is `fromXRotation`, `fromYRotation`, `fromZRotation` and `fromScaling` to
match. Every builder writes its answer into its first argument, which is why
`mat4.create()` sits inside the call, and `mat4.multiply(out, move, turn)`
joins two into one — rightmost first, the same inside-out order as nesting the
named transforms. The payoff is that a move becomes a value you can name,
store, and apply to twenty parts knowing every one got the same treatment.

```js
const { primitives, transforms } = require('@jscad/modeling')

function main() {
  const base = primitives.cuboid({ size: [40, 40, 4] })
  const pillar = transforms.translate([0, 0, 20],
    primitives.cylinder({ radius: 3, height: 40 })
  )
  return [base, pillar]
}

module.exports = { main }
```

### booleans — combine and cut

| Function | Arguments | Notes |
|---|---|---|
| `union` | `(...shapes)` | merge into one solid |
| `subtract` | `(base, ...cutters)` | cut cutters out of base — **order matters** |
| `intersect` | `(...shapes)` | keep only the shared volume |
| `scission` | `(solid)` | split one solid into its separate lumps |

`scission` is the odd one out — every other boolean puts shapes together and
this one takes a solid apart. Saw a 140 mm bar in half with `subtract` and
JSCAD does not hand you two objects: the viewport shows two lumps, and
`measureDimensions` still reads 140, the distance from one far end to the
other straight across the gap. `scission` finds the lumps and hands them back
as an array, 65 mm each, which `main()` can return exactly as it comes. A
solid already in one piece gives an array of one, so index it rather than
testing whether it is an array.

```js
const { primitives, transforms, booleans } = require('@jscad/modeling')

function main() {
  const plate = primitives.cuboid({ size: [40, 40, 4] })
  const hole = primitives.cylinder({ radius: 5, height: 10 })
  return booleans.subtract(plate, hole)
}

module.exports = { main }
```

### extrusions — 2D to 3D

| Function | Options | Notes |
|---|---|---|
| `extrudeLinear` | `{ height }` | push a 2D profile straight up Z |
| `extrudeRotate` | `{ angle, segments }` | spin a profile around the Y axis (vases, bowls) |
| `extrudeHelical` | `{ angle, pitch, radius, height, startAngle, endOffset, segmentsPerRotation }` | spin a profile **and** climb at the same time — springs, threads, screws |
| `extrudeFromSlices` | `{ numberOfSlices, callback }` | morph between shapes (tapers, lofts) |
| `extrudeRectangular` | `{ size, height }` | give a 2D **path** width and depth — this is the one for text |
| `project` | `({ axis, origin }, solid)` | flatten a solid to its 2D shadow |

`extrudeHelical` has two traps worth naming. `height` and `pitch` both set how
far the climb goes, and when you pass both, **`height` wins and `pitch` is
discarded** — measured: `{angle: 4PI, height: 40, pitch: 999}` and
`{angle: 4PI, height: 40}` give the same 4 x 4 x 44 solid. And there is no
`endAngle` and no `segmentPoints`: pass either one and it is silently ignored,
with no error and no change to the shape. The turn is set by `angle` alone, and
smoothness by `segmentsPerRotation` (measured: 4 -> 140 polygons, the default
-> 1036, 64 -> 2060).

`project` runs the other way round: a solid in, and out comes the outline you
would see looking straight down at it. That is the base plate that matches a
part exactly, or the footprint that says whether two parts collide on the bed.
What comes back is 2D, so it needs an extrude of its own before it is solid
again, and a hole that does not go all the way through leaves no mark in the
shadow. `axis` is the direction you are looking from and defaults to
`[0, 0, 1]`; handed a shape that is flat already, `project` returns it
unchanged.

```js
const { primitives, extrusions } = require('@jscad/modeling')

function main() {
  const profile = primitives.circle({ radius: 15, segments: 48 })
  return extrusions.extrudeLinear({ height: 6 }, profile)
}

module.exports = { main }
```

### expansions — rounding, and the fillet that isn't

| Function | Arguments | Notes |
|---|---|---|
| `offset` | `({ delta, corners, segments }, outline)` | grow or shrink a 2D outline |
| `expand` | `({ delta, segments }, shape)` | a rounded skin on a shape |

JSCAD has no fillet function and no chamfer function. The only names in the
library with *round* in them are `roundedCuboid`, `roundedCylinder` and
`roundedRectangle`, which cover a box and a cylinder and nothing else. These
two are the general answer, and which one you call depends on what you already
have: `offset` takes a flat outline, `expand` takes a solid.

`delta` is how far, in millimetres, and it lands on both sides at once: a
60 mm square offset by 10 comes back 80, and a 40 mm cube expanded by 4
measures 48. To finish at the size you meant, build at `size - 2 * delta`.
Negative `delta` pulls a 2D outline inward — never further than half the
narrowest part of the shape, past which the outline folds through itself — and
on a solid it is refused with *radius must be positive*.

`corners` is 2D only. `'edge'` keeps the sharp point and is what you get by
leaving it out, `'chamfer'` slices the point off flat, and `'round'` lays a
curve built from `segments` short straight pieces — 16 is smooth enough for
anything you will print. On a solid the only style is round, and asking for
another stops with *corners must be "round" for 3D geometries*.

Each has one silent failure worth knowing. `offset` handed a solid gives that
same solid straight back, unchanged and without a word. `expand` handed a
path gives back a 2D shape rather than a thicker path.

The recipe worth memorising, and the closest thing to a fillet you get: sketch
the part flat, `offset` the sketch with `corners: 'round'`, then extrude. It
rounds the four upright edges and leaves the top and bottom flat and sharp,
which is what a plate that has to sit on a print bed wants — `expand` would
round those two faces as well, and add twice `delta` to the thickness
besides. Anything to be cut into the plate goes in between the offset and the
extrude, while it is still flat and cheap to cut.

```js
const { primitives, expansions, extrusions, transforms } = require('@jscad/modeling')

function main() {
  const r = 6
  // Sketched one radius smaller on every side, so the offset lands it on 60 x 40.
  const sketch = primitives.rectangle({ size: [60 - 2 * r, 40 - 2 * r] })
  const rounded = expansions.offset({ delta: r, corners: 'round', segments: 16 }, sketch)
  const plate = extrusions.extrudeLinear({ height: 5 }, rounded)

  // 10 x 10 x 4, expanded by 3: it comes out 16 x 16 x 10.
  const knob = expansions.expand({ delta: 3, segments: 12 },
    primitives.cuboid({ size: [10, 10, 4] })
  )

  return [plate, transforms.translate([0, 0, 14], knob)]
}

module.exports = { main }
```

### hulls — organic forms

| Function | Arguments | Notes |
|---|---|---|
| `hull` | `(...shapes)` | smallest convex shape containing all inputs |
| `hullChain` | `(...shapes)` | hull each neighbor pair, keep the shapes visible |
| `hullPoints2` | `([[x, y], ...])` | the outer points of a 2D list |
| `hullPoints3` | `([[x, y, z], ...])` | the outer faces of a 3D list |

The bottom two work a level below the other two: no shapes go in, and no shape
comes out. `hullPoints2` hands back an array of `[x, y]` pairs — feed it
seven points and five come back, the two sitting inside the outline dropped —
and `hullPoints3` hands back an array of faces. That is the trap: return
either straight from `main()` and the viewport shows the grid and the axes
and nothing else, with no error, because a list of numbers is not geometry.
`geometries.geom2.fromPoints(points)` turns the 2D one into a real shape —
one argument, unlike `path2.fromPoints`, which takes an options object first
— and `geometries.geom3.create(faces)` builds the solid from the 3D one.

```js
const { primitives, transforms, hulls } = require('@jscad/modeling')

function main() {
  const a = transforms.translate([-15, 0, 0], primitives.circle({ radius: 8, segments: 32 }))
  const b = transforms.translate([15, 0, 0], primitives.circle({ radius: 8, segments: 32 }))
  return hulls.hull(a, b)
}

module.exports = { main }
```

### measurements — query geometry

| Function | Returns |
|---|---|
| `measureVolume` | volume in cubic units |
| `measureBoundingBox` | `[[minX, minY, minZ], [maxX, maxY, maxZ]]` — two corner arrays, **not** a `{min, max}` object |
| `measureDimensions` | `[dx, dy, dz]` |
| `measureArea` | surface area |
| `measureCenter` | center point |
| `measureCenterOfMass` | `[x, y, z]` — the balance point, which is not the center |
| `measureAggregateBoundingBox` | one bounding box across many shapes, in the same corner-pair form |
| `measureAggregateVolume` | one total volume across many shapes |
| `measureEpsilon` | a comparison margin sized for that shape |

Read a bounding box by index: `box[0][2]` is the lowest Z, `box[1][0] - box[0][0]`
is the width. Translating a shape up by `-box[0][2]` sits it exactly on the grid.

Hand `measureBoundingBox` an **array** of shapes and it returns one box per
shape. When you want the extent of a whole group — and anything built by
`extrudeRectangular` from a list of paths is a group — use
`measureAggregateBoundingBox` instead. `measureAggregateVolume` is its
partner for material: it adds the parts up rather than fusing them, so two
overlapping 10 mm cubes aggregate to 2000 where their `union` measures 1500.

`measureCenter` is the middle of the bounding box. `measureCenterOfMass` is
where the shape would balance on the end of a pencil; on an L-shaped bracket
the two answers sit about 8 mm apart, and neither is guaranteed to be inside
the shape at all. Handed something it cannot weigh — a path — it returns
`[0, 0, 0]` rather than complaining.

Never compare two measured numbers with `===`. Rounding accumulates: spin a
30 mm brick by 30 degrees twelve times, so that it is back exactly where it
started, and its width reads 30.00000000000002. `measureEpsilon(shape)` hands
you a margin sized for that shape — 0.0002 for this brick, larger for a larger
one — so ask whether the gap is under the epsilon instead.

```js
const { primitives, measurements } = require('@jscad/modeling')

function main() {
  const part = primitives.cuboid({ size: [30, 20, 10] })
  console.log('volume:', measurements.measureVolume(part))
  return part
}

module.exports = { main }
```

### colors — paint geometry

| Function | Arguments | Notes |
|---|---|---|
| `colorize` | `(color, shape)` | **an array only** — `[r, g, b]` or `[r, g, b, a]`, every number 0–1 |
| `colorNameToRgb` | `('tomato')` | CSS colour name → the array `colorize` wants |
| `hexToRgb` | `('#3366ff')` | hex code → the same array form |
| `hslToRgb` | `(hue, saturation, lightness)` | hue is a **fraction of a turn, 0–1**, not degrees |

`colorize` does **not** accept a colour string. `colorize('red', shape)` and
`colorize('#ff0000', shape)` both throw `color must be an array`; so does a
misspelled name, because `colorNameToRgb` returns `undefined` rather than
throwing. Convert first, then colorize. Numbers are 0–1, never 0–255, and a
0–255 array is stored unchecked — no error, just the wrong colour.

Colour is display metadata. It does not change geometry and is ignored by a
single-material printer. What it buys you is being able to tell parts apart
while you work, so colour each part as you build it and keep the palette in
one object at the top of the file.

**Build, cut, then paint.** Colour survives moving, turning, scaling and
mirroring, so a coloured part can be copied anywhere. It does **not**
survive a boolean: `union`, `subtract` and `intersect` each build
a new solid and hand it back with no colour at all, silently. Do the booleans
first and colorize the finished part last.

For a different colour on each face, go one level below `colorize`: a solid is
a bag of flat faces, `geometries.geom3.toPolygons(solid)` hands you that bag
(six items for a cuboid), each face may carry its own `color` array, and
`geometries.geom3.create(faces)` puts them back together. The rebuilt solid
measures identically and has no top-level colour of its own. The in-app docs
(`/docs/reshape`, Colors) work this through.

```js
const { primitives, colors } = require('@jscad/modeling')

function main() {
  return colors.colorize([1, 0.2, 0.2, 1], primitives.cube({ size: 10 }))
}

module.exports = { main }
```

### text — text as geometry

| Function | Options | Notes |
|---|---|---|
| `vectorText` | `{ height, input }` | string → one array of points per pen stroke |
| `vectorChar` | `{ height, input }` | single character, same stroke form |

Letters come out as **strokes**, not solid shapes: `vectorText` gives you a list
of point arrays, one per pen line. Two steps turn them into something you can
print — make each stroke a path with `geometries.path2.fromPoints`, then give
the strokes width and depth with `extrusions.extrudeRectangular`.

(`extrudeLinear` is the wrong tool here. It wants a closed 2D area; handed a
raw list of points it returns something the viewer cannot draw, with no error.)

`extrudeRectangular` over a list of paths returns a **list of solids**, one
per stroke — not one lump of lettering. Measure the group with
`measureAggregateBoundingBox`; `measureBoundingBox` would give you a box per
letter and the centring arithmetic that follows would quietly be nonsense.

```js
const { text, extrusions, geometries, transforms } = require('@jscad/modeling')

function main() {
  const strokes = text.vectorText({ height: 12, input: 'HI' })
  const paths = strokes.map((points) => geometries.path2.fromPoints({}, points))
  return transforms.translate([0, 0, 2],
    extrusions.extrudeRectangular({ size: 1, height: 4 }, paths)
  )
}

module.exports = { main }
```

## Parameters

`getParameterDefinitions()` returns an array of parameter objects; the app
renders a panel (sliders, text boxes, checkboxes, dropdowns) and passes the
values to `main(params)`.

**`type` decides how the panel ASKS for a value. `initial` decides what the
value IS.** Keep those apart and the whole table below stops being something
to memorise: nothing in your program ever reads `type`, so picking the wrong
one gives you a differently-shaped control, never a value that fails to
arrive. The in-app sandbox takes that to its limit — it has no panel at all,
so it reads `initial` (or `default`) and never looks at `type` once.

Nine types, and the four in the first block are the same number asked for four
different ways. Every one of them is spelled exactly as the textbook spells it.

| Type | What the panel asks for | Example |
|---|---|---|
| `number` | a number, in a box you type into | `{ name: 'size', type: 'number', initial: 10, min: 1, max: 50, step: 1, caption: 'Size' }` |
| `slider` | the same number, on a bar you drag | `{ name: 'height', type: 'slider', initial: 20, min: 5, max: 60, step: 1, caption: 'Height (mm)' }` |
| `int` | a whole number — sides, teeth, holes, copies | `{ name: 'sides', type: 'int', initial: 6, min: 4, max: 24, step: 1, caption: 'Number of sides' }` |
| `float` | a number allowed a decimal part | `{ name: 'ringRadius', type: 'float', initial: 60, min: 20, max: 200, caption: 'Ring radius' }` |
| `text` | a line of text | `{ name: 'label', type: 'text', initial: 'HI', caption: 'Label' }` |
| `checkbox` | a tick — **its default is `checked`, not `initial`; see below** | `{ name: 'engrave', type: 'checkbox', checked: true, caption: 'Engrave' }` |
| `choice` | one of a list, as a dropdown | `{ name: 'shape', type: 'choice', values: ['cube', 'sphere'], captions: ['Cube', 'Sphere'], initial: 'cube', caption: 'Shape' }` |
| `color` | a colour, written `'#rrggbb'` | `{ name: 'shade', type: 'color', initial: '#ff5555', caption: 'Plate colour' }` |
| `group` | nothing. It is a heading that splits a long panel up | `{ name: 'plateGroup', type: 'group', caption: 'Plate' }` |

`int` and `float` are the two the book reaches for in §8.5 and neither is a
special case: `int` is the one to write when half of something is meaningless
(you cannot have 7.5 sides), `float` when it is not (a radius of 62.5 mm is
fine). Both hand `main(params)` an ordinary JavaScript number.

`group` declares no value, so `main(params)` never sees one — it has no
`initial` and the sandbox skips it. Everything listed after a `group` belongs
to it, until the next one.

`checkbox` is the single type whose default does not reach `main()` in the
in-app sandbox, and it is a spelling problem rather than a missing feature:
its default is spelled `checked`, which is neither `initial` nor `default`, so
`params.engrave` arrives as `undefined` no matter what you wrote. A two-value
`choice` says the same thing and carries a real `initial`.

That is the whole list a 3D model has any use for. JSCAD also accepts `radio`
(a `choice` drawn as a row of buttons instead of a dropdown) and four types
built for web forms — `date`, `email`, `url`, `password`. They are named here
only so that meeting one is not a dead end: they are controls, they still hand
`main(params)` whatever `initial` said, and nothing in the seven Q3 chapters
uses any of them.

```js
const { primitives } = require('@jscad/modeling')

function getParameterDefinitions() {
  return [
    { name: 'size', type: 'number', initial: 10, min: 2, max: 30, step: 1, caption: 'Size' }
  ]
}

function main(params) {
  return primitives.cube({ size: (params && params.size) || 10 })
}

module.exports = { main }
```

And the three numeric spellings side by side, so that "`type` only picks the
control" is something you can run rather than something you were told. All
three arrive at `main` as plain numbers, and the `console.log` prints their
JavaScript types — which are identical.

```js
const { primitives, transforms } = require('@jscad/modeling')

function getParameterDefinitions() {
  return [
    { name: 'radius', type: 'number', initial: 14, min: 4, max: 30, step: 1, caption: 'Radius (mm)' },
    { name: 'height', type: 'slider', initial: 20, min: 5, max: 60, step: 1, caption: 'Height (mm)' },
    { name: 'sides', type: 'int', initial: 6, min: 4, max: 24, step: 1, caption: 'Number of sides' },
    { name: 'lift', type: 'float', initial: 2.5, min: 0, max: 10, caption: 'Lift off the bed (mm)' }
  ]
}

function main(params) {
  console.log(typeof params.radius, typeof params.height,
    typeof params.sides, typeof params.lift)

  return transforms.translateZ(params.lift, primitives.cylinder({
    radius: params.radius,
    height: params.height,
    segments: params.sides
  }))
}

module.exports = { main, getParameterDefinitions }
```

## Patterns

`main()` can return an array of shapes, so loops and `map()` generate
geometry:

```js
const { primitives, transforms } = require('@jscad/modeling')

function main() {
  return Array.from({ length: 5 }, (_, i) =>
    transforms.translate([i * 15 - 30, 0, 0],
      primitives.circle({ radius: 5, segments: 24 })
    )
  )
}

module.exports = { main }
```

## Export formats

The viewport has a **Save STL**, a **Save 3MF** and a **Save OBJ** button in its
top right corner, live once `main()` has returned something drawable. They run
the real `@jscad/{stl,3mf,obj}-serializer` (vendored in
`public/reshape/lib/jscad-io.min.js`), so the bytes are the same bytes jscad.app
writes.

| Format | Carries | Use it for |
|---|---|---|
| **STL** | triangles, nothing else | printing — every slicer reads it |
| **3MF** | triangles + colour + materials, zipped | printing in colour; also the smaller file |
| **OBJ** | a corner list + faces, plain text | handing the model to graphics software |
| **AMF** | XML with colour/material | rare; 3MF replaced it |
| **SVG / DXF** | 2D outlines | laser cutting and other flat fabrication |

A binary STL is a 84-byte header and then 50 bytes per triangle, and nothing
else — `84 + 50 * n` is the whole file. The 10 mm cube below is 684 bytes
(12 triangles); the same cube as OBJ is 214, because OBJ lists each of the
eight corners once and STL writes all three corners of every triangle out in
full.

A 3MF is a zip. Rename one to `.zip`, open it, and `3D/3dmodel.model` inside is
readable XML with a `displaycolor="#RRGGBBAA"` per part.

```js
const { primitives } = require('@jscad/modeling')

function main() {
  return primitives.cuboid({ size: [10, 10, 10], center: [0, 0, 5] })
}

module.exports = { main }
```

## What reaches a printer

Four rules that decide whether a saved file prints:

1. **Millimetres.** There is no units setting. The grid's large squares are
   10 mm and its small ones 1 mm, so you can read a size straight off the
   floor. A common school printer takes about 220 x 220 x 250 mm.
2. **On the plate.** Anything below `z = 0` is under the build plate. Build
   the part where it will print — `center: [0, 0, height / 2]`, or translate it
   up afterwards.
3. **Joined, not touching.** Parts that must print as one piece have to
   overlap. Two shapes that only kiss export as two shells.
4. **Thicker than the nozzle.** A school printer's nozzle is 0.4 mm, so that
   is one line of plastic and the absolute floor for a wall. 1.2 mm (three
   lines) is the thinnest wall worth handling.

## Multi-file projects

The in-app viewport runs a single file, so split a long design into *functions*
here: one that knows what a peg is, one that knows what a plate is, and a
`main()` that only says how they go together.

jscad.app takes a whole folder, and the split then becomes real files with no
other change: `peg.js` ends with `module.exports = { peg }`, `index.js` starts
with `const { peg } = require('./peg.js')`. Same modular idea as the JavaScript
modules in Q1 — one job per file — and each file gets its own git history.

## Recipes

Short answers to the things people ask first. Every one of these is worked
through at more length in the in-app docs (`/docs/reshape`).

### Make a hole

Build the solid, build a cutter where the hole goes, subtract. Make the cutter
longer than the material at **both** ends — a cutter exactly as tall as the
plate leaves two faces touching at zero thickness, and the result is not
reliably a hole.

```js
const { primitives, transforms, booleans } = require('@jscad/modeling')

function main() {
  const plate = primitives.cuboid({ size: [60, 40, 6] })
  const drill = primitives.cylinder({ radius: 5, height: 20, segments: 32 })
  return booleans.subtract(plate, transforms.translate([15, 0, 0], drill))
}

module.exports = { main }
```

### Combine an array of shapes

`union`, `subtract` and `intersect` all take any number of arguments, so spread
the array: `booleans.union(...parts)`.

Returning an array from `main()` shows every shape and is much faster, because
JSCAD never works out where the surfaces meet. Union when you need one solid —
for a later boolean, or for export as a single printable object.

### Sit a part on the grid

```js
const { primitives, transforms, measurements } = require('@jscad/modeling')

function main() {
  const part = primitives.sphere({ radius: 12, segments: 32 })
  const box = measurements.measureBoundingBox(part)
  return transforms.translate([0, 0, -box[0][2]], part)
}

module.exports = { main }
```

Measuring beats hard-coding a number, because it keeps working after somebody
edits the size ten lines above.

### Place copies around a circle

For a circle of radius `r` at angle `a`: `x = r * Math.cos(a)`, `y = r * Math.sin(a)`.
Take the angle from the loop counter: `a = i / count * 2 * Math.PI`. Rotate each
copy **before** translating it if it should face outward.

```js
const { primitives, transforms } = require('@jscad/modeling')

function main() {
  const parts = []
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * 2 * Math.PI
    parts.push(transforms.translate(
      [40 * Math.cos(a), 40 * Math.sin(a), 0],
      transforms.rotateZ(a, primitives.cuboid({ size: [14, 5, 5] }))
    ))
  }
  return parts
}

module.exports = { main }
```

### Round the corners of a box

`primitives.roundedCuboid({ size, roundRadius })` is the one-line answer. The
long way — hulling a sphere at each corner — is worth knowing because it is not
limited to boxes: anything you can place, `hull` will wrap.

```js
const { primitives, transforms, hulls } = require('@jscad/modeling')

function main() {
  const r = 4
  const corner = primitives.sphere({ radius: r, segments: 24 })
  const pts = []
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      for (const sz of [-1, 1]) {
        pts.push(transforms.translate([sx * 16, sy * 8, sz * 2], corner))
      }
    }
  }
  return hulls.hull(...pts)
}

module.exports = { main }
```

## Troubleshooting

### Nothing appears

In rough order of likelihood:

1. `main()` did not return anything — check every path through it, including
   the one inside an `if`.
2. Shapes were built and pushed to an array that was never returned.
3. The shape is 2D and you are looking at it edge-on. Orbit, or extrude it.
4. A boolean consumed it: `subtract` in the wrong order leaves nearly nothing.
5. It is off screen. `measureBoundingBox` will tell you where it went.

### Common errors

| Message | Usually means |
|---|---|
| `cube is not defined` | typo, or the module was never destructured out of `require` |
| `Cannot read properties of undefined` | a misspelled module name — `primtives.cube` |
| `No main() function found` | `main` is missing or misspelled; the runner looks for exactly `main` |
| `main() returned nothing` | a missing `return`, see above |
| `size must be an array of X, Y and Z values` | a single number where `[x, y, z]` was wanted — `cube` vs `cuboid` |

The reported line is where the program gave up, which is not always the line
that is wrong. Change one thing, then run again.

### Print what you cannot see

`console.log` works normally and its output lands in the console pane. Print
the numbers you calculated, especially inside a loop. Printing a shape itself
gives you a wall of polygon data; print `measureDimensions(shape)` instead.

## Beyond the course

Seventeen exports the course does not teach and no assignment needs. They are
documented because they are real and exported, not because they are worth a
lesson. The in-app docs (`/docs/reshape`, Beyond the course) work each one
through with a runnable example.

Between this section and the ones above, every function the fifteen modules
export directly is documented. What is left is one level deeper —
`curves.bezier`, `geometries.geom3`, `maths.vec3`, `extrusions.slice`,
`colors.cssColors` — the machinery the modules are built from.

### modifiers — repairing a mesh

Three functions, **three different call shapes**. This is the part that costs
an afternoon if you guess:

| Call | Shape | Wrong call |
|---|---|---|
| `snap(...shapes)` | geometries only, **no options object**, variadic | `snap({}, shape)` does **not** throw — it returns `[yourOptionsObject, snappedShape]` |
| `generalize(options, ...shapes)` | options **first**, and required | `generalize(shape)` throws `wrong number of arguments` |
| `retessellate(shape)` | exactly **one** geom3, no options, no array | `retessellate({}, shape)` throws `Cannot read properties of undefined (reading '0')`; a 2D shape throws the same with `'map'`; `retessellate(a, b)` throws **nothing** and silently discards `b`, while `retessellate([a, b])` throws — the comma form fails quietly, the array form loudly |

- `snap` rounds every vertex onto a fine grid, so vertices that were nearly
  coincident become exactly coincident.
- `generalize` reads `{ snap, simplify, triangulate }`, **all default `false`**
  — so `generalize({}, shape)` is a no-op copy. A 2D shape or a path is
  returned as the *same object*, whatever the switches say.
- `retessellate` re-cuts faces so coplanar ones merge. It short-circuits on a
  solid that already carries `isRetesselated`, which every result of `union` /
  `subtract` / `intersect` does.

Measured on a geom3 hand-assembled from two stacked 10 mm cubes (12 faces,
never tidied): `retessellate` → 8, `generalize({ simplify: true })` → 8,
`generalize({ triangulate: true })` → 24, `generalize({ snap: true })` → 12.
Volume and dimensions unchanged.

```js
const { primitives, geometries, modifiers } = require('@jscad/modeling')

function main() {
  const raw = geometries.geom3.create([
    ...geometries.geom3.toPolygons(primitives.cuboid({ size: [10, 10, 10] })),
    ...geometries.geom3.toPolygons(primitives.cuboid({ size: [10, 10, 10], center: [0, 0, 10] })),
  ])
  console.log('as built:', raw.polygons.length, '-> tidy:', modifiers.retessellate(raw).polygons.length)
  return modifiers.retessellate(modifiers.snap(raw))
}

module.exports = { main }
```

### minkowski — growing a solid

`minkowskiSum(a, b)` sweeps `a` over every point of `b`. **Exactly two, and
both geom3**: a 2D shape throws `minkowskiSum requires geom3 geometries`, a
third argument throws `minkowskiSum requires exactly two geometries`.

The print-clearance use is the one worth knowing. A 10 mm peg does not fit a
10 mm hole, so grow the peg and subtract *that*:

- `cylinder({ radius: 5, height: 20 })` measures `[10, 10, 20]`.
- Swept with `sphere({ radius: 0.4 })` it measures `[10.8, 10.8, 20.8]` — 0.4 mm
  of clearance in every direction, around whatever shape the peg happens to be.

Faces add, they do not multiply. That 96-face peg comes out at 202 faces
swept with an 8-segment (32-face) ball and 546 with a 32-segment (512-face)
one, for the same finished size; a 64-segment 192-face peg swept with the same
8-segment ball comes out at 362. Both operands cost. Keep the sweeping shape
coarse anyway — nobody sees it, the visible shape is the swept one's.

`booleans.minkowski` is the same function under a second name; bare
`minkowski` in the shim is the module, so bare `minkowskiSum` is the function.

```js
const { primitives, booleans, minkowski } = require('@jscad/modeling')

function main() {
  const peg = primitives.cylinder({ radius: 5, height: 20, segments: 32 })
  const clearance = minkowski.minkowskiSum(peg, primitives.sphere({ radius: 0.4, segments: 8 }))
  return booleans.subtract(primitives.cuboid({ size: [30, 30, 20] }), clearance)
}

module.exports = { main }
```

### measurements — the three that are left

| Function | Returns |
|---|---|
| `measureBoundingSphere` | `[[cx, cy, cz], radius]` — centre point, then radius |
| `measureAggregateArea` | one total area across many shapes, **added, not fused** |
| `measureAggregateEpsilon` | one comparison margin sized from the whole group |

`measureBoundingSphere` on a 10 mm cube is `[[0, 0, 0], 8.660254037844387]` —
half the diagonal. Handed an **array** it returns one answer per shape; there
is no aggregate version.

`measureAggregateArea` is surface area for a solid and enclosed area for a
flat shape: a 4x4 rectangle (16) plus a 32-segment circle of radius 3
(28.09300637032248) aggregates to 44.093006370322485, the plain sum.

`measureAggregateEpsilon` is sized from everything together, so the largest
shape sets it: a 10 mm cube alone gets 0.0001, a 200 mm cube gets 0.002, and
the two together get 0.002.

### colors — reading a colour back out

| Function | Arguments | Notes |
|---|---|---|
| `rgbToHex` | `([r, g, b])` or `([r, g, b, a])` | hex string; a 4th component appends alpha, so 8 digits not 6 |
| `rgbToHsl` | `([r, g, b])` | `[hue, saturation, lightness]`, hue a fraction of a turn |
| `rgbToHsv` | `([r, g, b])` | `[hue, saturation, value]` |
| `hsvToRgb` | `([h, s, v])` or `(h, s, v)` | the `[r, g, b]` array `colorize` wants |
| `hueToColorComponent` | `(p, q, t)` | internal step of `hslToRgb`; not aimed at callers |

**`rgbToHex` is exact only on whole 255ths.** It sums `65536 * 255r + 256 * 255g
+ 255b` and reads the total back as hex, so a fractional component bleeds into
the digits above it. `rgbToHex([0.5, 0.5, 0.5])` returns `#7fffff` — a bright
cyan where `#808080` was meant, with no error. `colorNameToRgb` and `hexToRgb`
hand back exact 255ths and convert correctly; anything out of `hslToRgb`,
`hsvToRgb` or your own arithmetic generally does not. Round first:
`c.map((n) => Math.round(n * 255) / 255)`. The alpha slot shows the same fault
more plainly — `rgbToHex([1, 0, 0, 0.5])` returns `#ff00007f.8`.

`hsvToRgb` differs from `hslToRgb` in the third number only: lightness runs
black → colour → white, value runs black → colour and stops, so dropping the
value gives a set of shades that belong together. A 4th component is carried
through as alpha by all of these.

`hueToColorComponent(p, q, t)` is one step inside `hslToRgb`, which calls it at
`hue + 1/3`, `hue` and `hue - 1/3` for red, green and blue. If you want a
colour, call `hslToRgb`.

```js
const { primitives, colors } = require('@jscad/modeling')

function main() {
  const base = colors.colorNameToRgb('tomato')
  const hsl = colors.rgbToHsl(base)
  console.log(colors.rgbToHex(base), hsl, colors.rgbToHsv(base))

  // Half a turn round the wheel: a second colour that goes with the first.
  const opposite = colors.hslToRgb([(hsl[0] + 0.5) % 1, hsl[1], hsl[2]])
  return [
    colors.colorize(base, primitives.cube({ size: 10, center: [-8, 0, 5] })),
    colors.colorize(opposite, primitives.cube({ size: 10, center: [8, 0, 5] })),
    colors.colorize(colors.hsvToRgb([0.58, 0.7, 0.9]),
      primitives.cube({ size: 10, center: [0, 16, 5] })),
  ]
}

module.exports = { main }
```

### utils — the library's own plumbing

Exported, but not aimed at you. `degToRad` / `radToDeg` are covered under
transforms; these five are the rest.

| Function | Notes |
|---|---|
| `flatten` | list of lists → one flat list, any depth. `list.flat(Infinity)` does the same |
| `fnNumberSort` | a **comparator**, not a sort: returns `a - b`. `[12, 3, 30, 7].sort()` gives `12, 3, 30, 7` (text order); `.sort(fnNumberSort)` gives `3, 7, 12, 30` |
| `insertSorted` | binary-search insert. **Returns `undefined` and mutates the array** |
| `radiusToSegments` | `(radius, maxSideLength, maxAngle)` → segment count |
| `areAllShapesTheSameType` | `true` when every shape in the list is the same kind; `true` for `[]` |

`insertSorted(list, item, compare)` is the one genuine trap:
`const sorted = insertSorted([4, 12, 24], 8, fnNumberSort)` leaves `sorted`
holding `undefined` while the original array becomes `[4, 8, 12, 24]`. The
comparator is not optional — leave it off and it throws.

`radiusToSegments` returns the largest of three things: the count needed for no
side longer than `maxSideLength`, the count needed for no side wider than
`maxAngle` radians, and 4. So `radiusToSegments(20, 0.3, 0.3)` is 419,
`radiusToSegments(20, 4, 0.6)` is 32, and `radiusToSegments(20)` is 4 — the
floor, not an error. Worth it when a size comes from a parameter: a hard-coded
`segments: 32` is right at one size only.

```js
const { primitives, booleans, utils } = require('@jscad/modeling')

function main() {
  const nested = [0, 1, 2].map((row) =>
    [0, 1, 2].map((col) => primitives.cube({ size: 6, center: [col * 10 - 10, row * 10 - 10, 3] })))
  const flat = utils.flatten(nested)
  console.log(flat.length, utils.areAllShapesTheSameType(flat))

  const radius = 20
  const segments = utils.radiusToSegments(radius, 0.3, 0.3)
  const heights = [4, 24]
  utils.insertSorted(heights, 12, utils.fnNumberSort)   // returns undefined
  console.log('segments:', segments, ' heights:', heights)

  return [booleans.union(flat), primitives.cylinder({ radius, height: 4, segments, center: [0, 40, 2] })]
}

module.exports = { main }
```
