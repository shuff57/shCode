# Methods That Move Shapes

Once a class stores `this.shape`, methods can read and write the shape's position and rotation.

## A method that moves the shape

```js
class Planet {
  constructor(x, y, z) {
    this.shape = new Sphere(x, y, z, 0.5);
  }
  move() {
    this.shape.position.x += 0.02;
  }
}
```

Calling `p.move()` shifts the planet's sphere right by 0.02 units each call.

## A method that spins the shape

```js
class Planet {
  constructor(x, y, z) {
    this.shape = new Sphere(x, y, z, 0.5);
  }
  spin() {
    this.shape.rotation.y += 0.03;
  }
}
```

Calling `p.spin()` rotates the sphere on the Y axis each call.

## A method that changes the color

Methods can also take parameters:

```js
class Planet {
  constructor(x, y, z) {
    this.shape = new Sphere(x, y, z, 0.5);
  }
  setColor(c) {
    this.shape.color = c;
  }
}

let p = new Planet(0, 0, 0);
p.setColor('gold');
```

`setColor('gold')` receives `'gold'` as `c` and sets `this.shape.color`.

## All three methods in one class

Methods can coexist in the same class:

```js
class Planet {
  constructor(x, y, z) {
    this.shape = new Sphere(x, y, z, 0.5);
  }
  move() {
    this.shape.position.x += 0.02;
  }
  spin() {
    this.shape.rotation.y += 0.03;
  }
  setColor(c) {
    this.shape.color = c;
  }
}
```

Each method does exactly one thing. Call the ones you need in `setup()` or `draw()`.

## What `this.shape.position` and `this.shape.rotation` are

- `this.shape.position` is a Vector3 with `.x`, `.y`, `.z` fields.
- `this.shape.rotation` is also a Vector3 with `.x`, `.y`, `.z` fields (in radians).

You can read or write any field at any time.

---

## Glossary

| Term | Meaning |
|---|---|
| method | A function inside a class body that operates on `this` |
| this.shape.position | The position Vector3 of the wrapped shape; has .x, .y, .z |
| this.shape.rotation | The rotation Vector3 of the wrapped shape; has .x, .y, .z in radians |
| mutation | Changing a value in place (e.g. `+= 0.02` modifies without replacing) |
