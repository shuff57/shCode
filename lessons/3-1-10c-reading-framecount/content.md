# frameCount for Animation

`frameCount` is a number that starts at 0 when your sketch begins and increases by 1 every time `draw()` runs. Since `draw()` runs about 60 times per second, after one second `frameCount ≈ 60`.

## Using frameCount for rotation

There are two common patterns:

**Pattern 1 — Accumulate with +=**
```js
function draw() {
  background('#111');
  cube.rotation.y += 0.02;   // adds a little each frame
}
```

**Pattern 2 — Assign from frameCount**
```js
function draw() {
  background('#111');
  cube.rotation.y = frameCount * 0.02;   // grows every frame
}
```

Both patterns produce the same visual result. Pattern 2 is useful when you want to compute the rotation mathematically and reference `frameCount` directly.

## Multiplier controls speed

The multiplier is the speed control:
- `frameCount * 0.01` → slow spin
- `frameCount * 0.05` → faster
- `frameCount * 0.1` → quite fast

## Using Math.sin with frameCount

`Math.sin(frameCount * speed)` produces a smooth oscillation between -1 and +1. This is the trick behind rocking/wobbling motion:

```js
cube.rotation.z = Math.sin(frameCount * 0.02) * radians(30);
```

This makes the cube rock 30 degrees left-right continuously. You will use this pattern in the Spinning Sculpture project.

## frameCount in q5play

`frameCount` works identically in q5play. If you used it there for animations, the same approach carries over to shPlay unchanged.
