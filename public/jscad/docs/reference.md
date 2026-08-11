# JSCAD API Reference

Hand-authored reference for the `@jscad/modeling` surface the course teaches
(Q3–Q4). Every example below runs in the in-app docs sandbox (`/docs/jscad`)
and was verified against `@jscad/modeling@2.13.0`.

The full library surface is much larger — see https://openjscad.xyz/docs/ for
everything else.

## Program skeleton

Every JSCAD program has the same shape:

```js
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

## Modules

### primitives — basic shapes

| Function | Options | Notes |
|---|---|---|
| `circle` | `{ radius, segments }` | 2D disc; `segments` controls smoothness |
| `rectangle` | `{ size: [w, h] }` | 2D rectangle |
| `ellipse` | `{ radius: [rx, ry], segments }` | 2D squashed circle |
| `polygon` | `{ points: [[x, y], ...] }` | 2D shape from corner points |
| `star` | `{ vertices, outerRadius, innerRadius }` | 2D star |
| `cube` | `{ size }` | 3D cube, all sides equal |
| `cuboid` | `{ size: [x, y, z] }` | 3D box |
| `sphere` | `{ radius, segments }` | 3D ball |
| `cylinder` | `{ radius, height, segments }` | 3D cylinder; `radius: [r1, r2]` makes a cone |
| `torus` | `{ innerRadius, outerRadius }` | 3D donut |

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
| `rotate` | `([x, y, z], shape)` | radians, around the origin |
| `rotateX` / `rotateY` / `rotateZ` | `(angle, shape)` | single-axis shortcuts |
| `scale` | `([x, y, z], shape)` | stretch per axis |
| `scaleX` / `scaleY` / `scaleZ` | `(f, shape)` | single-axis shortcuts |
| `mirror` | `({ normal: [x, y, z] }, shape)` | flip across a plane |
| `center` | `({ axes: [bool, bool, bool] }, shape)` | center at origin |

Transforms return a new shape; the original is untouched. Nest them:
`transforms.translate([0, 0, 10], primitives.cube({ size: 5 }))`.

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
| `extrudeHelical` | `{ height, startAngle, endAngle, segmentPoints }` | spiral (springs, threads) |
| `extrudeFromSlices` | `{ numberOfSlices, callback }` | morph between shapes (tapers, lofts) |

```js
const { primitives, extrusions } = require('@jscad/modeling')

function main() {
  const profile = primitives.circle({ radius: 15, segments: 48 })
  return extrusions.extrudeLinear({ height: 6 }, profile)
}

module.exports = { main }
```

### hulls — organic forms

| Function | Arguments | Notes |
|---|---|---|
| `hull` | `(...shapes)` | smallest convex shape containing all inputs |
| `hullChain` | `(...shapes)` | hull each neighbor pair, keep the shapes visible |

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
| `measureBoundingBox` | `{ min: [x, y, z], max: [x, y, z] }` |
| `measureDimensions` | `[dx, dy, dz]` |
| `measureArea` | surface area |
| `measureCenter` | center point |
| `measureAggregateBoundingBox` | bounding box across many shapes |

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

`colors.colorize(color, shape)` — color is RGBA floats 0–1, a named color
string, or a hex string. Color is display metadata; it doesn't change geometry.

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
| `vectorText` | `{ height, input }` | string → array of 2D letter shapes |
| `vectorChar` | `{ height, input }` | single character, with segment detail |

Letters are real geometry — extrude them for 3D text.

```js
const { text, extrusions, transforms } = require('@jscad/modeling')

function main() {
  const letters = text.vectorText({ height: 12, input: 'HI' })
  return letters.map((l) =>
    transforms.translate([0, 0, 2], extrusions.extrudeLinear({ height: 4 }, l))
  )
}

module.exports = { main }
```

## Parameters

`getParameterDefinitions()` returns an array of parameter objects; the app
renders a panel (sliders, text boxes, checkboxes, dropdowns) and passes the
values to `main(params)`.

| Type | Example |
|---|---|
| number | `{ name: 'size', type: 'number', initial: 10, min: 1, max: 50, step: 1, caption: 'Size' }` |
| text | `{ name: 'label', type: 'text', initial: 'HI', caption: 'Label' }` |
| checkbox | `{ name: 'engrave', type: 'checkbox', checked: true, caption: 'Engrave' }` |
| choice | `{ name: 'shape', type: 'choice', values: ['cube', 'sphere'], captions: ['Cube', 'Sphere'], initial: 'cube', caption: 'Shape' }` |

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

- **STL** — the universal 3D-printing format. Use this to print.
- **3MF** — carries color, materials, metadata. Use when color matters.
- **AMF** — XML format with color/material support; less common.
- **OBJ** — general 3D format for graphics software, not printing.
- **SVG / DXF** — 2D exports for laser cutting and other flat fabrication.

## Multi-file projects

Split big designs across files with the include system: `components.js`
(part builders), `parameters.js` (the parameter list), `main.js` (assembly).
Each file has one job — the same modular idea as Q1 modules. Track the
refactor with git.
