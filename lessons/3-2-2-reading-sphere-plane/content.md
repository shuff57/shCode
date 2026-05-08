# Sphere and Plane

Module 3.1 used only `Cube`. Module 3.2 introduces five new primitives — starting with `Sphere` and `Plane`.

## Sphere

A `Sphere` takes four arguments: x, y, z position and a radius.

```js
let ball;

function setup() {
  ball = new Sphere(0, 0, 0, 1);   // center at origin, radius 1
  ball.color = 'deepskyblue';
}

function draw() {
  background('#111');
  ball.rotation.y += 0.01;
}
```

- The first three parameters place the center of the sphere in 3D space.
- The fourth parameter is the **radius** — half the diameter. A radius of `1` gives a sphere roughly 2 units wide.
- All transform properties (`.position`, `.rotation`, `.scale`, `.size`) work the same as on a Cube.

## Plane

A `Plane` is a flat rectangular surface. It takes five arguments: x, y, z position plus width and height.

```js
let floor;

function setup() {
  floor = new Plane(0, -1, 0, 10, 10);  // centered at y = -1, 10 units wide, 10 units deep
  floor.color = '#444';
}

function draw() {
  background('#111');
}
```

- By default a Plane faces upward (normal pointing along +Y). Place it at a negative Y to create a floor below your other shapes.
- Width and height are independent — `new Plane(0, -1, 0, 20, 10)` makes a wide, shallow floor.
- Planes do not receive shadows by default; they are purely visual.

## Key difference from Cube

| Shape | Constructor | Key parameter |
|-------|-------------|--------------|
| `Cube` | `new Cube(x, y, z)` | size uniform (default 1) |
| `Sphere` | `new Sphere(x, y, z, radius)` | 4th arg = radius |
| `Plane` | `new Plane(x, y, z, width, height)` | 4th + 5th args = dimensions |

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| `Sphere` | Round 3D primitive; 4th arg is radius |
| `Plane` | Flat rectangular surface; 4th + 5th args are width and height |
| radius | Distance from center to surface; half the diameter |
| normal | The direction a flat surface "faces"; Plane default is +Y (up) |
| `.color` | Works identically on all shPlay shapes |
