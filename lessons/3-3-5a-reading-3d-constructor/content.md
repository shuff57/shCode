# The 3D Constructor Pattern

The core pattern for Module 3.3 is: store a 3D shape inside a class constructor using `this.shape`.

## The pattern

```js
class Planet {
  constructor(x, y, z, radius) {
    this.shape = new Sphere(x, y, z, radius);
  }
}
```

- `this.shape` — a data member that holds a `Sphere` object
- `new Sphere(x, y, z, radius)` — creates the sphere at the given position with the given radius
- `x, y, z, radius` — constructor parameters passed in when you write `new Planet(...)`

## Why `this.shape`?

Storing the shape as `this.shape` means every method in the class can access it. Any method that needs to move, rotate, or recolor the shape just uses `this.shape`:

```js
class Planet {
  constructor(x, y, z, radius) {
    this.shape = new Sphere(x, y, z, radius);
  }
  setColor(c) {
    this.shape.color = c;    // this.shape is accessible here
  }
}
```

## Why pass coordinates to the constructor?

Passing `x, y, z` to the constructor lets you place each instance at a different location:

```js
let earth = new Planet(-2, 0, 0, 0.6);
let mars  = new Planet(3, 0, 0, 0.4);
```

Each call to `new Planet(...)` creates a separate `Sphere` at a different spot. Without constructor parameters, every planet would land at the same position.

## Creating and using an instance

```js
let p;

function setup() {
  p = new Planet(0, 0, 0, 1);
  p.shape.color = 'deepskyblue';
}

function draw() {
  background('#000');
  p.shape.rotation.y += 0.01;
}
```

`p.shape` gives you direct access to the underlying `Sphere` from outside the class too.

---

## Glossary

| Term | Meaning |
|---|---|
| data member | A value stored on an instance using `this.name = value` in the constructor |
| this.shape | The convention for storing a single 3D shape inside a class |
| constructor parameter | A value passed to `new ClassName(value)` that the constructor receives |
| shape wrapper | A class whose sole purpose is to wrap one 3D shape and give it behavior |
