# What is .scale?

Every shape has a `.scale` property — a Vector3 with `.x`, `.y`, and `.z` fields. Each defaults to **1.0**.

```js
shape.scale.x   // width multiplier (default 1)
shape.scale.y   // height multiplier (default 1)
shape.scale.z   // depth multiplier (default 1)
```

A scale of 1 means "original size." A scale of 2 doubles that dimension; 0.5 halves it.

## Per-axis scaling (non-uniform)

You can stretch a shape on one axis without affecting the others:

```js
cube.scale.x = 2;    // twice as wide
cube.scale.y = 0.5;  // half as tall
// cube.scale.z stays 1 — same depth
```

This turns a unit Cube into a flat, wide slab.

## Uniform scaling with .size

If you want to change all three axes by the same factor, use the `.size` shorthand:

```js
cube.size = 2;     // same as: scale.x = 2; scale.y = 2; scale.z = 2;
cube.size = 0.5;   // shrinks uniformly to half size
```

`.size` is a write-only convenience setter — it sets all three scale components at once.

## Summary

| Property | What it does |
|----------|-------------|
| `scale.x` | Stretches width |
| `scale.y` | Stretches height |
| `scale.z` | Stretches depth |
| `size` | Sets all three equally (uniform) |

Scale is a multiplier — it works relative to the shape's original geometry, not absolute world units.
