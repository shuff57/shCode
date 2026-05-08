# Cone

A `Cone` is a shape with a circular base that tapers to a point at the top.

## Constructor

```js
new Cone(x, y, z, radius, height)
```

- **x, y, z** — position of the center (base midpoint).
- **radius** — how wide the circular base is.
- **height** — how tall the cone is from base to tip.

## Example

```js
let hat;

function setup() {
  hat = new Cone(0, 0, 0, 0.8, 2);   // radius 0.8, height 2
  hat.color = 'orange';
}

function draw() {
  background('#111');
  hat.rotation.y += 0.01;
}
```

The tip points **up** (+Y direction) by default.

## Tip vs base

The center of a Cone sits at the position you pass in. The base extends downward; the tip points upward. If you want the base to sit on a Plane at `y = -1`, position the Cone at `y = -1 + height/2`.

```js
// Cone with height 2, sitting on a floor at y = -1:
new Cone(0, 0, 0, 0.8, 2)  // center at y=0, base at y=-1, tip at y=1
```

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| `Cone` | Tapered 3D shape; circular base, pointed tip |
| radius | Width of the circular base |
| height | Distance from base center to tip |
| tip | The pointed top of the cone (default points +Y) |
