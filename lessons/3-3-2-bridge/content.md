# Bridge: OOP from Unit 2.2 in 3D

You already wrote classes in Unit 2.2. The class syntax is identical in 3D — what changes is what you store inside the class.

## What stays exactly the same

- `class Name { constructor() { ... } }` — same declaration
- `this` — still refers to the current instance
- Methods — `this.methodName()` works the same way
- `new ClassName()` — same instantiation syntax
- `let obj = new ClassName()` — storing an instance in a variable

## What changes: the shape inside the class

In Unit 2.2, you stored a **sprite** as a data member:

```js
class Enemy {
  constructor(x, y) {
    this.sprite = new Sprite(x, y, 30, 30);
  }
}
```

In Module 3.3, you store a **3D shape** instead:

```js
class Enemy3D {
  constructor(x, y, z) {
    this.shape = new Cube(x, y, z);
  }
}
```

## The mapping table

| q5play (Unit 2.2) | shPlay (Module 3.3) | Why |
|---|---|---|
| `class Counter { constructor() { ... } }` | Same — class syntax unchanged | JavaScript class syntax is universal |
| `this.sprite = new Sprite(x, y, 30, 30)` | `this.shape = new Cube(x, y, z)` | Store a 3D shape instead of a 2D sprite |
| `this.sprite.x` | `this.shape.position.x` | Position is a sub-object in shPlay |
| `this.sprite.y` | `this.shape.position.y` | Same — `.position.y` for vertical |
| `this.sprite.vel.x = 4` | `this.shape.position.x += 0.05` | No built-in velocity; mutate position directly |
| `this.sprite.rotation = 1.5` | `this.shape.rotation.y = 1.5` | 3D rotation has three axes: `.x`, `.y`, `.z` |

## Key additions in 3D

1. **Three position coordinates:** constructors take `(x, y, z)` instead of `(x, y)`.
2. **`.position` is a sub-object:** access as `this.shape.position.x`, not `this.shape.x`.
3. **Three rotation axes:** `.rotation.x`, `.rotation.y`, `.rotation.z` — each in radians.

## A side-by-side comparison

**Unit 2.2 — q5play class:**

```js
class Planet2D {
  constructor(x, y) {
    this.sprite = new Sprite(x, y, 20, 20);
    this.sprite.color = 'deepskyblue';
  }
  move() {
    this.sprite.vel.x = 2;
  }
}
```

**Module 3.3 — shPlay class:**

```js
class Planet {
  constructor(x, y, z) {
    this.shape = new Sphere(x, y, z, 0.5);
    this.shape.color = 'deepskyblue';
  }
  move() {
    this.shape.position.x += 0.02;
  }
}
```

The class structure is identical. Only the body — sprite vs shape — is different.

---

## Glossary

| Term | Meaning |
|---|---|
| class | A blueprint for creating objects with shared structure and behavior |
| instance | One object created from a class blueprint using `new` |
| constructor | The method that runs when `new ClassName()` is called |
| this | Refers to the current instance inside a class method |
| shape wrapper | A class whose constructor stores a 3D shape as `this.shape` |
