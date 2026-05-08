# Anchor Offsets

To make shape A orbit around shape B, you use shape B's current position as the **anchor** and add your own offset.

## The pattern

```js
// Earth orbiting the sun:
earth.position.x = Math.cos(radians(frameCount * 0.6)) * 4;
earth.position.z = Math.sin(radians(frameCount * 0.6)) * 4;

// Moon orbiting the earth (uses earth's position as anchor):
moon.position.x = earth.position.x + Math.cos(radians(frameCount * 2)) * 1.2;
moon.position.z = earth.position.z + Math.sin(radians(frameCount * 2)) * 1.2;
```

The moon's position is `earth.position.x + offset`. Whatever the earth does, the moon follows — plus its own orbital offset on top.

## Why cos for x and sin for z?

The unit circle parameterization traces a circle when you use:
- `x = cos(angle) * radius`
- `z = sin(angle) * radius`

As `angle` increases, the point travels in a circle around the origin. Multiply `frameCount` by a small number to control the speed.

```
angle → 0      x=1, z=0      (rightmost point)
angle → 90°    x=0, z=1      (forward)
angle → 180°   x=-1, z=0     (leftmost)
angle → 270°   x=0, z=-1     (back)
```

## The anchor orbit formula

```js
child.position.x = parent.position.x + Math.cos(radians(frameCount * speed)) * orbitRadius;
child.position.z = parent.position.z + Math.sin(radians(frameCount * speed)) * orbitRadius;
```

- Replace `parent.position.x/z` with the anchor body's current position.
- `speed` controls how fast the orbit is (larger = faster).
- `orbitRadius` controls how far from the anchor.

This is the pattern you will use in B3 (Moon Orbits Earth). The build-up labs (B1, B2) establish the sun and earth first. B0 gives you the formula early so it's not new when you need it.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| anchor | The shape whose position you add your offset to |
| orbit radius | Distance from the anchor to the orbiting body |
| `Math.cos(angle)` | X component of a point on a circle of radius 1 |
| `Math.sin(angle)` | Z component of a point on a circle of radius 1 |
| `radians(deg)` | Converts degrees to radians; used in the angle argument |
