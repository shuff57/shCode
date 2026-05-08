# Torus

A `Torus` is a donut (ring) shape. It is the only shPlay primitive with **two radius parameters** — you need both to describe a ring.

## Constructor

```js
new Torus(x, y, z, ringRadius, tubeRadius)
```

- **x, y, z** — position of the center.
- **ringRadius** — distance from the center of the ring to the center of the tube. Controls how big the hole is.
- **tubeRadius** — how thick the tube itself is.

## Visual diagram

```
       tubeRadius
          ↕
    ←——ringRadius——→ (center of ring to center of tube)
```

Think of it this way: if you bent a hose into a ring, `ringRadius` is the size of the ring and `tubeRadius` is the width of the hose.

## Example

```js
let ring;

function setup() {
  ring = new Torus(0, 0, 0, 1.5, 0.3);  // ring radius 1.5, tube thickness 0.3
  ring.color = 'gold';
}

function draw() {
  background('#111');
  ring.rotation.x += 0.01;
}
```

## Two radii compared

| Parameter | Controls |
|-----------|---------|
| `ringRadius` | How far out from center the tube travels (hole size) |
| `tubeRadius` | How thick the tube is (donut fatness) |

A thin torus: `new Torus(0, 0, 0, 2, 0.1)` — large ring, very thin tube.
A fat torus: `new Torus(0, 0, 0, 1, 0.6)` — smaller ring, thick tube.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| `Torus` | Donut/ring shape; the only shPlay primitive with two radii |
| ringRadius | Distance from ring center to tube center (hole size) |
| tubeRadius | Thickness of the tube itself |
