# Cylinder

A `Cylinder` is a tube shape with the same radius at both ends — no taper. Think of a can, a pillar, or a barrel.

## Constructor

```js
new Cylinder(x, y, z, radius, height)
```

- **x, y, z** — position of the center.
- **radius** — how wide the cylinder is (same at top and bottom).
- **height** — how tall it is.

## Example

```js
let pillar;

function setup() {
  pillar = new Cylinder(0, 0, 0, 0.5, 3);  // radius 0.5, height 3
  pillar.color = 'slategray';
}

function draw() {
  background('#111');
}
```

## Cone vs Cylinder

| Shape | Base | Top | Key difference |
|-------|------|-----|---------------|
| `Cone` | circle (radius r) | point | tapers to a tip |
| `Cylinder` | circle (radius r) | circle (radius r) | uniform — no taper |

Both share the same `(x, y, z, radius, height)` constructor order.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| `Cylinder` | Tube shape; uniform radius from base to top |
| radius | Width of the tube (same at both ends) |
| height | Distance from bottom cap to top cap |
| uniform | Same value along the entire length — no taper |
