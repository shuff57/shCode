## Class syntax and `new`
**Read before attempting `2.2.4 Worked Example — You've been using classes`.**

What you'll learn from it:
- A **class** is a blueprint; an **instance** is a specific object built from it with `new`.
- `constructor(...)` runs once when `new ClassName(...)` is called — its job is to receive arguments and store them on `this`.
- **Methods** are regular functions written inside the class body, without the `function` keyword.
- Each instance gets its own copies of the constructor-assigned properties; two instances do not share state.

**Try it:** edit the values passed to `new Point(...)` or change what `distanceTo` returns, then hit Run.

```js live
class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  distanceTo(other) {
    let dx = this.x - other.x;
    let dy = this.y - other.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}

let a, b;

function setup() {
  new Canvas(360, 200);
  a = new Point(3, 4);
  b = new Point(0, 0);
}

function draw() {
  background('#222');
  fill('white');
  textSize(14);
  text('a.x = ' + a.x, 20, 60);
  text('b.x = ' + b.x, 20, 90);
  text('a.distanceTo(b) = ' + a.distanceTo(b), 20, 120);
}
```

## `this` inside a method
**Read before attempting `2.2.4 Worked Example — You've been using classes`.**

What you'll learn from it:
- Inside a method, `this` is whichever instance the method was called on (`a.move(...)` → `this = a`).
- `this.x` reads (or writes) the property on the calling instance; an argument like `other.x` reads from a different instance.
- Mutating `this.foo` only affects the calling instance — sibling instances are untouched.
- This is exactly how `new Sprite(...)` works in q5play: each sprite is its own object with its own `pos`, `vel`, `color`.

**Try it:** click the preview to focus it, then hold `→` to call `a.move(2, 0)` every frame. The orange point never moves — only the one whose method was called.

```js live
class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  move(dx, dy) {
    this.x += dx;   // "my x"
    this.y += dy;
  }
}

let a, b;

function setup() {
  new Canvas(360, 200);
  a = new Point(60, 100);
  b = new Point(260, 100);
}

function draw() {
  background('#222');
  fill('deepskyblue'); circle(a.x, a.y, 40);
  fill('orange');      circle(b.x, b.y, 40);

  fill('white'); textSize(12);
  text('hold → to call a.move(2, 0)', 20, 180);

  if (kb.pressing('right')) a.move(2, 0);
}
```

---

## Short glossary (quick reference)

| Term | Definition |
|------|-----------|
| **Class** | Blueprint describing what data an instance holds and what it can do. |
| **Instance** | A specific object built from a class with `new`. Has its own copies of the constructor-assigned properties. |
| **`new`** | Operator that allocates a fresh object, runs the constructor with `this` bound to it, and returns it. |
| **`constructor`** | Special method called by `new`. Receives arguments and stores them on `this`. |
| **`this`** | Inside a constructor or method, refers to the specific instance being built or called. |
| **Method** | A function defined inside a class body, available on every instance. |
| **`Sprite`** | A class defined by q5play. `new Sprite(x, y, w, h)` creates an instance with its own `pos`, `vel`, `color`. |
