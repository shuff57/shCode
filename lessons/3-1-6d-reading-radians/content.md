# Radians vs Degrees

three.js (and therefore shPlay) measures angles in **radians**, not degrees. Here is why, and how to work with them.

## What is a radian?

Imagine a circle with radius 1. If you walk along the edge for a distance equal to the radius (1 unit), the angle you swept is **1 radian**.

A full circle = 2 × PI radians ≈ 6.28 radians = 360 degrees.

## The key conversions

| Degrees | Radians | Approximate value |
|---------|---------|-------------------|
| 360°    | 2 × PI  | ≈ 6.28            |
| 180°    | PI      | ≈ 3.14            |
| 90°     | PI / 2  | ≈ 1.57            |
| 45°     | PI / 4  | ≈ 0.785           |
| 0°      | 0       | 0                 |

## The radians() helper

Memorizing the conversions is unnecessary. shPlay provides `radians(deg)` which converts for you:

```js
radians(90)    // returns 1.5708...  (PI/2)
radians(45)    // returns 0.7854...  (PI/4)
radians(180)   // returns 3.1416...  (PI)
radians(360)   // returns 6.2832...  (2*PI)
```

## Use radians() whenever you think in degrees

```js
// Bad — hard to read:
cube.rotation.y = 0.7854;

// Good — clearly "45 degrees":
cube.rotation.y = radians(45);
```

## Why does three.js use radians?

Radians are the "natural" unit for angles in mathematics — they make trigonometry formulas cleaner (no 180/PI factor everywhere). Three.js follows math convention; we follow three.js.
