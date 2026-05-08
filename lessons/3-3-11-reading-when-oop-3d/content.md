# When OOP Helps in 3D

OOP is a tool — not every situation calls for it. Here is how to decide.

## When OOP helps

### 1. Repetition: many objects of the same kind

If you find yourself writing nearly identical code multiple times, that is a sign a class would help:

```js
// Procedural — repetitive
let e1 = new Cone(-3, 0, 0, 0.4, 1);
let e2 = new Cone( 0, 0, 0, 0.4, 1);
let e3 = new Cone( 3, 0, 0, 0.4, 1);

function draw() {
  background('#111');
  e1.rotation.y += 0.02; e1.position.z += 0.01;
  e2.rotation.y += 0.02; e2.position.z += 0.01;
  e3.rotation.y += 0.02; e3.position.z += 0.01;
}
```

With a class:

```js
class Enemy3D {
  constructor(x) {
    this.shape = new Cone(x, 0, 0, 0.4, 1);
  }
  update() {
    this.shape.rotation.y += 0.02;
    this.shape.position.z += 0.01;
  }
}

let enemies = [];

function setup() {
  enemies.push(new Enemy3D(-3));
  enemies.push(new Enemy3D( 0));
  enemies.push(new Enemy3D( 3));
}

function draw() {
  background('#111');
  for (let e of enemies) e.update();
}
```

Adding a fourth enemy is one line. The per-enemy logic lives in one place.

### 2. Reuse: different stats per instance

Each instance can carry its own data:

```js
class Enemy3D {
  constructor(x, speed) {
    this.shape = new Cone(x, 0, 0, 0.4, 1);
    this.speed = speed;    // each enemy has its own speed
  }
  update() {
    this.shape.position.z += this.speed;
  }
}
```

### 3. 3D-specific gain: independent transforms

In 3D, each shape has its own `.position` and `.rotation`. A class ties the behavior directly to its shape — nothing else can accidentally move the wrong shape.

## When procedural is simpler

If you have one or two shapes that behave differently, a class adds structure for no gain:

```js
// One sun, one planet — no repetition
let sun = new Sphere(0, 0, 0, 1.5);
let planet = new Sphere(4, 0, 0, 0.5);

function draw() {
  background('#000');
  sun.rotation.y += 0.005;
  planet.position.x = Math.cos(radians(frameCount * 0.5)) * 4;
  planet.position.z = Math.sin(radians(frameCount * 0.5)) * 4;
}
```

Two shapes, simple logic — keeping it procedural is the right call here.

## The rule of thumb

Use a class when you have **three or more objects of the same kind**, or when the per-object logic is complex enough that keeping it inside the object makes `draw()` clearer.

---

## Glossary

| Term | Meaning |
|---|---|
| encapsulation | Keeping an object's data and behavior together inside the class |
| instance state | Data stored on an individual instance (e.g. `this.speed`) |
| reuse | Writing logic once in a class and applying it to many instances |
| procedural | Code written as a sequence of direct instructions, without class wrappers |
