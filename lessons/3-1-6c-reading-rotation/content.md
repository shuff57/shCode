# What is .rotation?

Every shape has a `.rotation` property — an **Euler** object with three number fields:

```js
shape.rotation.x   // tilt forward/back (nodding)
shape.rotation.y   // spin left/right (like a top)
shape.rotation.z   // tilt left/right (rolling)
```

Each field is an angle **in radians** (more on radians in the next two lessons).

## What "Euler" means

Euler (pronounced "OY-ler") angles represent orientation as three sequential rotations — one per axis. Setting `.rotation.y = 1` rotates the shape 1 radian (~57 degrees) around the Y axis.

## Setting rotation once (static tilt)

```js
function setup() {
  cube = new Cube(0, 0, 0);
  cube.rotation.y = 0.8;   // tilts the cube 0.8 radians on Y
}
```

## Spinning in draw()

Add a small amount each frame to create continuous spin:

```js
function draw() {
  background('#111');
  cube.rotation.y += 0.01;   // spins ~0.6 degrees per frame
}
```

## Multiple axes at once

You can rotate on more than one axis simultaneously — the shape will tilt in a compound direction:

```js
cube.rotation.y += 0.02;
cube.rotation.x += 0.005;
```

## The 2D comparison

In q5play, `sprite.rotation` was a single number (one angle on a flat screen). In 3D you have three separate axes — that is the main new thing. Everything else works the same.
