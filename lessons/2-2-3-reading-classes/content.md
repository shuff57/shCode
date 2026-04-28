# JavaScript classes

Read this before `2.2.4 Worked Example — You've been using classes`. About 6 minutes.

By the end of this reading you should be able to answer:

- What does `class Foo { ... }` define, and what does `new Foo(...)` actually do?
- What is `constructor(x, y)` for? Where do `x` and `y` end up?
- Inside a method, what does `this` refer to?
- Why does mutating `this.x` only change the instance the method was called on?

You've already used `new Sprite(...)` for two weeks. This reading shows you what `new` is *actually* doing — and writing your own class is the same recipe q5play used to make `Sprite`.

---

## A class is a blueprint. `new` builds one instance from it.

```js
class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}
```

`Point` is the **blueprint** — a description of what data a Point holds. It is not a Point itself.

`new Point(3, 4)` is the **build instruction**. It allocates a fresh, empty object, runs `constructor` with `this` pointing at that object, and returns the now-filled object. So `new Point(3, 4)` produces an object that looks like `{ x: 3, y: 4 }`.

**Each instance has its own copies.** `let a = new Point(3, 4)` and `let b = new Point(0, 0)` are two separate objects. Changing `a.x` does not change `b.x`.

---

## `constructor` is the method `new` calls

`constructor(x, y)` runs once, the moment `new Point(...)` is called. Its job is to receive arguments and store them on `this`:

```js
constructor(x, y) {
  this.x = x;   // "store the first arg on me"
  this.y = y;   // "store the second arg on me"
}
```

If you call `new Point(3, 4)`, then inside the constructor `x === 3` and `y === 4`. After the lines run, the new instance has `.x = 3` and `.y = 4`.

---

## Methods are functions inside the class body

Methods are written **without** the `function` keyword:

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

**What you'll see:** three lines of white text — `a.x = 3`, `b.x = 0`, and the distance from `a` to `b`, which is `5` (because `a` is at (3,4) and `b` is at the origin: √(3² + 4²) = 5).

**Try this:** change `new Point(3, 4)` to `new Point(6, 8)` and re-run. The displayed distance should now be `10`. You never had to touch `distanceTo` — the method works on whatever values the constructor stored.

---

## `this` is "the instance the method was called on"

Methods don't take an "instance" parameter — they get one implicitly through `this`. When you call `a.distanceTo(b)`:

- `this` inside `distanceTo` is `a`. So `this.x` reads `a`'s x.
- `other` is `b`. So `other.x` reads `b`'s x.

The dot before the method name decides what `this` will be.

**Mutating `this.foo` only affects one instance.** A `move(dx, dy)` method that updates `this.x` and `this.y` only updates the instance the method was called on:

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

**What you'll see:** two circles — blue (point `a`) on the left and orange (point `b`) on the right. Click the preview to focus, then hold the right arrow.

**Try this:** the orange circle never moves — only `a` is being moved because only `a.move(...)` is being called. Change the line to `b.move(2, 0)` and re-run; now the *orange* circle moves and the blue one stays put.

---

## This is exactly how `Sprite` works

q5play's `Sprite` is a class. `new Sprite(180, 180, 60, 60)` runs a constructor that stores `pos`, `vel`, `color`, and other defaults on the new instance. When you write `player.vel.x = 4`, you're setting a property on one specific instance — the same machinery as `a.x` above.

You've been using OOP for two weeks. This reading just gave you the vocabulary for what was already happening.

---

## Quick reference

| Term | Meaning |
|------|---------|
| **Class** | Blueprint describing what data an instance holds and what it can do. |
| **Instance** | A specific object built from a class with `new`. |
| **`new`** | Operator that allocates a fresh object, runs the constructor with `this` bound to it, and returns it. |
| **`constructor`** | Special method `new` calls. Receives arguments, stores them on `this`. |
| **`this`** | Inside a method, refers to the instance the method was called on. |
| **Method** | A function defined inside a class body. Available on every instance. |

---

Once you can answer the four questions at the top, open `2.2.4 Worked Example — You've been using classes`.
