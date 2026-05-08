# The update() Pattern

The `update()` pattern puts per-frame logic inside the class itself instead of in `draw()`. This keeps each object self-contained.

## The problem: draw() doing everything

Without OOP, `draw()` directly mutates every shape:

```js
let cube1, cube2, cube3;

function setup() {
  cube1 = new Cube(-2, 0, 0);
  cube2 = new Cube( 0, 0, 0);
  cube3 = new Cube( 2, 0, 0);
}

function draw() {
  background('#111');
  cube1.rotation.y += 0.01;
  cube2.rotation.y += 0.02;
  cube3.rotation.y += 0.03;
}
```

This works for three cubes, but `draw()` grows by one line per cube. With ten cubes, `draw()` has ten rotation lines. The logic is scattered outside the objects.

## The solution: update() inside the class

Move the per-frame logic into the class:

```js
class Spinner {
  constructor(x, speed) {
    this.shape = new Cube(x, 0, 0);
    this.speed = speed;
  }
  update() {
    this.shape.rotation.y += this.speed;
  }
}
```

Now `draw()` just calls `update()` on each instance:

```js
let s1, s2, s3;

function setup() {
  s1 = new Spinner(-2, 0.01);
  s2 = new Spinner( 0, 0.02);
  s3 = new Spinner( 2, 0.03);
}

function draw() {
  background('#111');
  s1.update();
  s2.update();
  s3.update();
}
```

`draw()` stays short no matter how many spinners you add. Each spinner knows its own speed.

## Why this matters

- **Encapsulation:** each object manages its own state and behavior.
- **Scalability:** adding a fourth spinner is one `new Spinner(...)` line, not a new `draw()` line.
- **Readability:** `s1.update()` tells you what happens without exposing how.

---

## Glossary

| Term | Meaning |
|---|---|
| update() | A convention for the per-frame method inside a class |
| per-frame | Runs once every time `draw()` is called (~60 times per second) |
| draw loop | The `draw()` function that shPlay calls every frame |
| encapsulation | Keeping an object's data and behavior together inside the class |
