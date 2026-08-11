// In-app JSCAD reference — hand-authored against the @jscad/modeling API
// surface the curriculum actually uses (Q3–Q4: primitives, transforms,
// booleans, extrusions, hulls, measurements, colors, text, parameters,
// patterns, export). Every code example runs in the docs sandbox, which
// loads @jscad/modeling + @jscad/regl-renderer from unpkg (see
// lib/preview-builder.ts buildJscadPreviewHtml).
//
// Scope-out (stated explicitly so a future maintainer doesn't rediscover
// the boundary): the full @jscad/modeling surface is much larger than this
// (curves, paths, connectors, expand, offset, snap, fillet, chamfer,
// geodesicSphere, ellipsoid, roundedCuboid, ...). Only the functions the
// course teaches are documented here. If a future lesson needs more, add
// pages then.
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
        title: 'What is JSCAD?',
        body: `JSCAD is a JavaScript library for 3D modeling. Instead of clicking and dragging in a design tool, you write code that describes shapes — and the code generates the model. This is called programmatic or parametric design: change a number in your code, and the whole model updates.

The library you'll use is @jscad/modeling. It's split into modules, each with a job: primitives (basic shapes), transforms (move/rotate/scale), booleans (combine/cut shapes), extrusions (push 2D into 3D), hulls (organic forms), measurements (query geometry), colors, and text.

You don't install anything. The browser loads the library for you, and you write one file of JavaScript.`,
        code: `const { primitives } = require('@jscad/modeling')

function main() {
  return primitives.cube({ size: 10 })
}

module.exports = { main }`,
      },
      {
        title: 'The main() function',
        body: `Every JSCAD program has the same skeleton:

1. Import the modules you need with require().
2. Write a main() function that builds and returns geometry.
3. Export main with module.exports.

main() must return a shape, or an array of shapes. Whatever you return is what gets rendered in the viewport.

The require() line pulls the library in. Destructuring — const { primitives, transforms } = ... — grabs just the modules you plan to use.`,
        code: `const { primitives, transforms } = require('@jscad/modeling')

function main() {
  const base = primitives.cuboid({ size: [30, 30, 3] })
  const ball = transforms.translate([0, 0, 20],
    primitives.sphere({ radius: 6 })
  )
  return [base, ball]
}

module.exports = { main }`,
      },
      {
        title: 'Running in the browser',
        body: `JSCAD runs entirely in the browser — no install, no build step. The app loads @jscad/modeling and the renderer from a CDN, runs your main(), and displays the result in a 3D viewport you can orbit with the mouse.

The viewport shows a grid and XYZ axes. The camera starts above and to the side; drag to orbit, scroll to zoom.

If the library fails to load (no internet), the preview shows an error instead of a model. Everything else — writing code, running, seeing errors — works offline.`,
        code: `const { primitives } = require('@jscad/modeling')

function main() {
  return primitives.cylinder({ radius: 5, height: 15 })
}

module.exports = { main }`,
      },
    ],
  },
  {
    slug: 'primitives',
    title: 'Primitives',
    pages: [
      {
        title: '2D primitives',
        body: `2D primitives are flat shapes — the building blocks you'll extrude into 3D later. They live in the primitives module and are created with an options object.

- circle({ radius, segments }) — a disc. segments controls smoothness (more = rounder).
- rectangle({ size: [w, h] }) — a rectangle.
- ellipse({ radius: [rx, ry], segments }) — a squashed circle.
- polygon({ points: [[x, y], ...] }) — any shape from a list of corner points.
- star({ vertices, outerRadius, innerRadius }) — a star.

2D shapes live in the XY plane. You'll see them edge-on in the 3D viewport until you extrude them.`,
        code: `const { primitives, transforms } = require('@jscad/modeling')

function main() {
  const disc = primitives.circle({ radius: 20, segments: 64 })
  const rect = transforms.translate([60, 0, 0],
    primitives.rectangle({ size: [30, 20] })
  )
  const tri = transforms.translate([-60, 0, 0],
    primitives.polygon({ points: [[-15, -10], [15, -10], [0, 15]] })
  )
  return [disc, rect, tri]
}

module.exports = { main }`,
      },
      {
        title: '3D primitives',
        body: `3D primitives are solid shapes. Same pattern: a function from the primitives module, called with an options object.

- cube({ size }) — a cube, all sides equal.
- cuboid({ size: [x, y, z] }) — a box with different dimensions.
- sphere({ radius, segments }) — a ball.
- cylinder({ radius, height, segments }) — a cylinder (radius can be [r1, r2] for a cone).
- torus({ innerRadius, outerRadius }) — a donut.

Every 3D primitive is a solid — it has volume, not just a surface. That matters for booleans and for 3D printing.`,
        code: `const { primitives, transforms } = require('@jscad/modeling')

function main() {
  const box = primitives.cuboid({ size: [20, 20, 10] })
  const ball = transforms.translate([30, 0, 0],
    primitives.sphere({ radius: 8, segments: 32 })
  )
  const donut = transforms.translate([-30, 0, 0],
    primitives.torus({ innerRadius: 4, outerRadius: 10 })
  )
  return [box, ball, donut]
}

module.exports = { main }`,
      },
    ],
  },
  {
    slug: 'transforms',
    title: 'Transforms',
    pages: [
      {
        title: 'translate',
        body: `transforms.translate([x, y, z], shape) moves a shape. The first argument is an array of offsets — [x, y, z] for 3D shapes, [x, y] for 2D.

Translate is a function that takes a shape and returns a new, moved shape. The original is untouched. This is why you'll see nested calls: transforms.translate([0, 0, 10], primitives.cube({ size: 5 })) — build a shape, then move it.

Positioning is how you assemble multi-part designs: build each part, translate it into place, return them all as an array.`,
        code: `const { primitives, transforms } = require('@jscad/modeling')

function main() {
  const base = primitives.cuboid({ size: [40, 40, 4] })
  const pillar = transforms.translate([0, 0, 20],
    primitives.cylinder({ radius: 3, height: 40 })
  )
  const cap = transforms.translate([0, 0, 42],
    primitives.cuboid({ size: [12, 12, 4] })
  )
  return [base, pillar, cap]
}

module.exports = { main }`,
      },
      {
        title: 'rotate',
        body: `transforms.rotate([x, y, z], shape) rotates a shape around the X, Y, and Z axes. Angles are in radians, not degrees — a full turn is 2 * Math.PI, a quarter turn is Math.PI / 2.

For a single axis there are shortcuts: rotateX(angle, shape), rotateY(angle, shape), rotateZ(angle, shape).

Rotation happens around the origin (0, 0, 0), not around the shape's own center. To spin a shape in place, center it first — or build it centered, rotate, then translate.`,
        code: `const { primitives, transforms } = require('@jscad/modeling')

function main() {
  const blade = transforms.rotateZ(Math.PI / 4,
    primitives.rectangle({ size: [40, 8] })
  )
  const hub = primitives.circle({ radius: 5, segments: 32 })
  return [blade, hub]
}

module.exports = { main }`,
      },
      {
        title: 'scale and mirror',
        body: `transforms.scale([x, y, z], shape) stretches or shrinks a shape along each axis. scale([2, 1, 1]) doubles the width, scale([0.5, 0.5, 0.5]) halves everything. Shortcuts: scaleX(f), scaleY(f), scaleZ(f).

transforms.mirror({ normal: [x, y, z] }, shape) flips a shape across a plane. mirror({ normal: [1, 0, 0] }) mirrors across the YZ plane — handy for symmetric designs: build one half, mirror it, union them.

transforms.center({ axes: [true, true, true] }, shape) moves a shape so its center sits at the origin.`,
        code: `const { primitives, transforms } = require('@jscad/modeling')

function main() {
  const wide = transforms.scale([2, 1, 1],
    primitives.circle({ radius: 10, segments: 32 })
  )
  const tall = transforms.scale([1, 3, 1],
    primitives.circle({ radius: 10, segments: 32 })
  )
  return [transforms.translate([-25, 0, 0], wide), transforms.translate([25, 0, 0], tall)]
}

module.exports = { main }`,
      },
    ],
  },
  {
    slug: 'booleans',
    title: 'Booleans',
    pages: [
      {
        title: 'union',
        body: `booleans.union(...shapes) merges shapes into one. The result is a single solid — no seams, no overlapping interior.

Union is how you build complex parts from simple ones: a phone case is a box unioned with a camera bump; a robot is a body unioned with arms and legs.

You can pass any number of shapes: union(a, b, c). The result behaves like one shape for later transforms and booleans.`,
        code: `const { primitives, transforms, booleans } = require('@jscad/modeling')

function main() {
  const body = primitives.cuboid({ size: [30, 20, 10] })
  const head = transforms.translate([0, 0, 10],
    primitives.sphere({ radius: 8, segments: 24 })
  )
  return booleans.union(body, head)
}

module.exports = { main }`,
      },
      {
        title: 'subtract',
        body: `booleans.subtract(base, ...cutters) cuts shapes out of a base shape. Order matters: subtract(A, B) removes B from A — subtract(B, A) removes A from B.

Subtract is how you make holes: a bolt hole is a cylinder subtracted from a plate; a keychain ring is a torus subtracted from a disc.

The cutter doesn't have to be fully inside the base — anything overlapping gets removed. Cutters can stick out; only the overlap matters.`,
        code: `const { primitives, transforms, booleans } = require('@jscad/modeling')

function main() {
  const plate = primitives.cuboid({ size: [40, 40, 4] })
  const hole = primitives.cylinder({ radius: 5, height: 10 })
  const slot = transforms.translate([0, 12, 0],
    primitives.cuboid({ size: [20, 4, 10] })
  )
  return booleans.subtract(plate, hole, slot)
}

module.exports = { main }`,
      },
      {
        title: 'intersect',
        body: `booleans.intersect(...shapes) keeps only the volume where all shapes overlap. Everything outside the shared region is removed.

Intersect is less common than union and subtract, but it's the right tool for clipping: intersect a shape with a box to trim it to a region, or intersect two shapes to find their common volume.

Like union, it takes any number of shapes. The result is a single solid.`,
        code: `const { primitives, transforms, booleans } = require('@jscad/modeling')

function main() {
  const a = transforms.translate([-5, 0, 0],
    primitives.cuboid({ size: [20, 20, 20] })
  )
  const b = transforms.translate([5, 0, 0],
    primitives.cuboid({ size: [20, 20, 20] })
  )
  return booleans.intersect(a, b)
}

module.exports = { main }`,
      },
    ],
  },
  {
    slug: 'extrusions',
    title: 'Extrusions',
    pages: [
      {
        title: 'extrudeLinear',
        body: `extrusions.extrudeLinear({ height }, shape) pushes a 2D shape straight up the Z axis to make a 3D solid. This is the bridge from 2D to 3D: design a profile flat, then give it thickness.

The 2D shape must be centered on the XY plane. The result is a solid with the profile as its top and bottom faces.

This is how you'd turn a gasket, a logo, or a coaster design into a printable part. Add a height parameter and the same design can be a thin plate or a thick block.`,
        code: `const { primitives, extrusions } = require('@jscad/modeling')

function main() {
  const profile = primitives.circle({ radius: 15, segments: 48 })
  return extrusions.extrudeLinear({ height: 6 }, profile)
}

module.exports = { main }`,
      },
      {
        title: 'extrudeRotate',
        body: `extrusions.extrudeRotate({ angle, segments }, shape) spins a 2D profile around the Y axis to make a rotationally symmetric solid — vases, bowls, knobs, cups.

The profile should sit to one side of the Y axis (positive X). The default angle is 2 * Math.PI (a full revolution); use less for a partial sweep.

Because the profile is rotated around the axis, the shape's distance from the Y axis becomes its radius. A profile at x = 10 makes a part with radius 10.`,
        code: `const { primitives, extrusions } = require('@jscad/modeling')

function main() {
  const profile = primitives.polygon({
    points: [[10, 0], [14, 0], [14, 4], [11, 6], [11, 12], [14, 14], [10, 14]]
  })
  return extrusions.extrudeRotate({ segments: 48 }, profile)
}

module.exports = { main }`,
      },
      {
        title: 'Advanced extrusions',
        body: `Two more extrusion tools for special forms:

- extrudeHelical({ height, startAngle, endAngle, segmentPoints }, shape) — extrudes a profile along a spiral. Springs, threads, and corkscrews.
- extrudeFromSlices({ numberOfSlices, callback }, ...shapes) — morphs between shapes. The callback receives a progress value from 0 to 1 and returns the shape for that slice. Tapered and lofted forms.

These are the "advanced techniques" of the course. The rule of thumb: extrudeLinear for straight pushes, extrudeRotate for symmetric sweeps, extrudeHelical for spirals, extrudeFromSlices for morphs.`,
        code: `const { primitives, extrusions } = require('@jscad/modeling')

function main() {
  const spring = extrusions.extrudeHelical({
    height: 30,
    startAngle: 0,
    endAngle: Math.PI * 4,
    segmentPoints: 100
  }, primitives.circle({ radius: 2, segments: 16 }))
  return spring
}

module.exports = { main }`,
      },
    ],
  },
  {
    slug: 'hulls',
    title: 'Hulls',
    pages: [
      {
        title: 'hull',
        body: `hulls.hull(...shapes) wraps a skin around a set of shapes — the smallest convex shape that contains them all. Two circles hulled together make a capsule; a circle and a square make a rounded block.

Hull is the fast way to make smooth, organic-looking parts without hand-drawing curves. It's also how you make a smooth transition between two different shapes.

The result is a single solid. Hull works in 2D and 3D.`,
        code: `const { primitives, transforms, hulls } = require('@jscad/modeling')

function main() {
  const a = transforms.translate([-15, 0, 0], primitives.circle({ radius: 8, segments: 32 }))
  const b = transforms.translate([15, 0, 0], primitives.circle({ radius: 8, segments: 32 }))
  return hulls.hull(a, b)
}

module.exports = { main }`,
      },
      {
        title: 'hullChain',
        body: `hulls.hullChain(...shapes) hulls each pair of neighboring shapes in sequence, then unions the results. Unlike hull, the chain keeps the individual shapes visible — it fills in the gaps between them without swallowing them.

This is the tool for organic tubes, beads, and segmented forms: place a row of circles, hullChain them, and get a smooth snake.

The difference from hull: hull collapses everything into one convex blob; hullChain preserves each shape and smooths only the connections.`,
        code: `const { primitives, transforms, hulls } = require('@jscad/modeling')

function main() {
  const beads = [0, 1, 2, 3, 4].map((i) =>
    transforms.translate([i * 12, 0, 0],
      primitives.circle({ radius: 4 + (i % 2) * 3, segments: 24 })
    )
  )
  return hulls.hullChain(...beads)
}

module.exports = { main }`,
      },
    ],
  },
  {
    slug: 'measurements',
    title: 'Measurements',
    pages: [
      {
        title: 'Measuring geometry',
        body: `The measurements module queries geometry and returns numbers — no rendering needed. Use it to check a design programmatically.

- measureVolume(shape) — volume in cubic units.
- measureBoundingBox(shape) — { min: [x, y, z], max: [x, y, z] } corners of the box that contains the shape.
- measureDimensions(shape) — [dx, dy, dz] width, depth, height.
- measureArea(shape) — surface area.
- measureCenter(shape) — the center point.
- measureAggregateBoundingBox(shapes) — bounding box across many shapes.

Measurements make your code smarter: warn if a part is too big for the printer, or check that a hole is big enough for a bolt. The console shows the results.`,
        code: `const { primitives, measurements } = require('@jscad/modeling')

function main() {
  const part = primitives.cuboid({ size: [30, 20, 10] })
  console.log('volume:', measurements.measureVolume(part))
  console.log('dimensions:', measurements.measureDimensions(part))
  console.log('bounds:', measurements.measureBoundingBox(part))
  return part
}

module.exports = { main }`,
      },
    ],
  },
  {
    slug: 'colors',
    title: 'Colors',
    pages: [
      {
        title: 'colorize',
        body: `colors.colorize(color, shape) paints a shape. The color can be:

- an array of RGBA floats 0–1: colorize([1, 0, 0, 1], shape) is red.
- a named color string: colorize('red', shape).
- a hex string: colorize('#ff0000', shape).

Color doesn't change the geometry — it's metadata for display. Two overlapping shapes of different colors are easier to tell apart, and colored parts preview what a multi-material print might look like.

Colorize each part before returning it from main().`,
        code: `const { primitives, transforms, colors } = require('@jscad/modeling')

function main() {
  const red = colors.colorize([1, 0.2, 0.2, 1],
    transforms.translate([-12, 0, 0], primitives.cuboid({ size: [15, 15, 15] }))
  )
  const blue = colors.colorize([0.2, 0.4, 1, 1],
    transforms.translate([12, 0, 0], primitives.cuboid({ size: [15, 15, 15] }))
  )
  return [red, blue]
}

module.exports = { main }`,
      },
    ],
  },
  {
    slug: 'text',
    title: 'Text',
    pages: [
      {
        title: 'vectorText',
        body: `text.vectorText({ height, input }) turns a string into an array of 2D shapes — one per character. Combined with extrudeLinear, it makes 3D text: nameplates, badges, labels.

- vectorText({ height: 10, input: 'HI' }) — the letters as 2D geometry.
- vectorChar({ height, input }) — a single character, with more detail about its segments.

Text is real geometry, so you can transform it, color it, and extrude it like any other shape. The letters come out as paths — extrude them to give them depth.`,
        code: `const { text, extrusions, transforms } = require('@jscad/modeling')

function main() {
  const letters = text.vectorText({ height: 12, input: 'HI' })
  const raised = letters.map((l) =>
    transforms.translate([0, 0, 2], extrusions.extrudeLinear({ height: 4 }, l))
  )
  return raised
}

module.exports = { main }`,
      },
    ],
  },
  {
    slug: 'parameters',
    title: 'Parameters',
    pages: [
      {
        title: 'getParameterDefinitions',
        body: `getParameterDefinitions() declares the knobs of your design. Return an array of parameter objects, and the app renders a panel with sliders, text boxes, checkboxes, and dropdowns. Change a value and the model regenerates.

Parameter types:

- { name: 'size', type: 'number', initial: 10, min: 1, max: 50, step: 1, caption: 'Size' } — a slider.
- { name: 'label', type: 'text', initial: 'HI', caption: 'Label' } — a text box.
- { name: 'engrave', type: 'checkbox', checked: true, caption: 'Engrave' } — a checkbox.
- { name: 'shape', type: 'choice', values: ['cube', 'sphere'], captions: ['Cube', 'Sphere'], initial: 'cube', caption: 'Shape' } — a dropdown.

The docs sandbox has no parameter panel, so these examples run with defaults. In jscad.app the panel appears automatically.`,
        code: `const { primitives } = require('@jscad/modeling')

function getParameterDefinitions() {
  return [
    { name: 'size', type: 'number', initial: 10, min: 2, max: 30, step: 1, caption: 'Size' },
    { name: 'shape', type: 'choice', values: ['cube', 'sphere'], captions: ['Cube', 'Sphere'], initial: 'cube', caption: 'Shape' }
  ]
}

function main(params) {
  const size = (params && params.size) || 10
  if (params && params.shape === 'sphere') {
    return primitives.sphere({ radius: size / 2, segments: 24 })
  }
  return primitives.cube({ size })
}

module.exports = { main }`,
      },
      {
        title: 'Using params in main',
        body: `main(params) receives the parameter values as an object: params.size, params.label, params.engrave. Every place you'd hardcode a number, you can read it from params instead.

The power of parameterization: one model, infinite variations. Change the size slider and the whole design scales. Flip a checkbox and a feature appears or disappears. A choice dropdown can swap entire construction strategies.

This is the same idea as function parameters from Q1 — getParameterDefinitions just gives those arguments a user interface.`,
        code: `const { primitives, transforms, booleans } = require('@jscad/modeling')

function getParameterDefinitions() {
  return [
    { name: 'size', type: 'number', initial: 20, min: 10, max: 40, step: 1, caption: 'Size' },
    { name: 'hole', type: 'checkbox', checked: true, caption: 'Center hole' }
  ]
}

function main(params) {
  const size = (params && params.size) || 20
  let plate = primitives.cuboid({ size: [size, size, 4] })
  if (!params || params.hole) {
    const hole = primitives.cylinder({ radius: size / 5, height: 10 })
    plate = booleans.subtract(plate, hole)
  }
  return plate
}

module.exports = { main }`,
      },
    ],
  },
  {
    slug: 'patterns',
    title: 'Patterns',
    pages: [
      {
        title: 'Loops and arrays',
        body: `main() can return an array of shapes — so loops can generate geometry. A for loop that places 5 circles in a row is 5 lines of code, and changing one number changes the whole pattern.

The pattern: build an empty array, loop, push a translated shape each iteration, return the array.

This is where code beats manual design tools. A 10×10 grid of shapes is one nested loop — something you'd never draw by hand. And because the loop reads variables, the pattern is parametric: count, spacing, and size can all be sliders.`,
        code: `const { primitives, transforms } = require('@jscad/modeling')

function main() {
  const shapes = []
  for (let i = 0; i < 5; i++) {
    shapes.push(
      transforms.translate([i * 15 - 30, 0, 0],
        primitives.circle({ radius: 5, segments: 24 })
      )
    )
  }
  return shapes
}

module.exports = { main }`,
      },
      {
        title: 'map() and Array.from',
        body: `Array.map() is the functional alternative to a for loop: transform an array of values into an array of shapes in one expression.

Array.from({ length: n }, (_, i) => ...) creates the index array and maps it in one step — no push, no loop body.

Both styles produce the same geometry. The loop is more familiar; map is more compact. Pick whichever you can read back later — the comment explaining your intent matters more than the style.`,
        code: `const { primitives, transforms } = require('@jscad/modeling')

function main() {
  const row = Array.from({ length: 5 }, (_, i) =>
    transforms.translate([i * 15 - 30, 0, 0],
      primitives.circle({ radius: 3 + (i % 2) * 3, segments: 24 })
    )
  )
  return row
}

module.exports = { main }`,
      },
    ],
  },
  {
    slug: 'export',
    title: 'Export & Files',
    pages: [
      {
        title: 'Export formats',
        body: `JSCAD exports your model in several formats. The one you'll use most is STL — the standard format for 3D printing. Slicers (the software that turns a model into printer instructions) read STL.

- STL — the universal 3D-printing format. Simple, widely supported, no color.
- 3MF — a newer format that carries color, materials, and metadata. Better for multi-material prints.
- AMF — an XML format with color and material support; less common than 3MF.
- OBJ — a general 3D format used by graphics software; not for printing.
- SVG / DXF — 2D exports of flat geometry, useful for laser cutting.

Rule of thumb: STL to print, 3MF when color matters, SVG/DXF for 2D fabrication.`,
        code: `const { primitives } = require('@jscad/modeling')

function main() {
  return primitives.cuboid({ size: [20, 20, 5] })
}

module.exports = { main }`,
      },
      {
        title: 'Multi-file projects',
        body: `Big designs get split across files. JSCAD supports the include system: one file can pull in another with require() or include(), so you can keep components, parameters, and the main assembly in separate files.

A typical split:

- components.js — helper functions that build parts (a bolt, a bracket).
- parameters.js — the getParameterDefinitions() list.
- main.js — imports the others, assembles the final model.

This is modular design: each file has one job. It's the same idea as the modules you used in Q1 — and it's why version control matters. With git, each file's history is tracked, and a refactor is a commit you can look back at.

The docs sandbox runs a single file, so multi-file examples live in your project files instead.`,
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
