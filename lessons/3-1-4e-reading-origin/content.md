# The World Origin

The **origin** is the point `(0, 0, 0)` — zero on every axis. It is the center of the 3D scene.

## The default camera

shPlay's default camera is positioned at `(0, 3, 7)` and looks directly at the origin:

- `x = 0` — centered left-to-right
- `y = 3` — three units above the ground
- `z = 7` — seven units in front of the scene

This means when you write `new Cube(0, 0, 0)`, the cube appears directly in the center of what you see.

## Placing shapes relative to the origin

Once you know where the camera is, placing shapes is straightforward:

```js
new Cube(0, 0, 0);    // center of scene — directly in view
new Cube(2, 0, 0);    // two units to the right
new Cube(0, 1, 0);    // one unit above ground
new Cube(0, 0, -3);   // three units deeper into the scene
```

## Think of it as the anchor

All positions you set with `.position.x/y/z` are measured from the origin. A shape at `(2, 0, 0)` is 2 units to the right *of the origin*, not 2 units to the right of the camera.

You can't move the origin. But you can move any shape to wherever you want relative to it.
