## A class is a blueprint. `new` builds one instance from it.

**Read before `2.2.3a Reading — The new operator`.** About 4 minutes.

By the end of this reading you should be able to complete the sentences:

- "A class is a ____."
- "An instance is a ____."

---

`Point` is the **blueprint** — a description of what data a Point holds. It is not a Point itself. `new Point(3, 4)` is the **build instruction**: it produces one object — one *instance* — stamped out from the blueprint.

**Each instance has its own copies.** `let a = new Point(3, 4)` and `let b = new Point(0, 0)` are two separate objects. Changing `a.x` does not touch `b.x`.

```js live
class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}

let a, b;

function setup() {
  new Canvas(360, 180);
  a = new Point(3, 4);
  b = new Point(0, 0);
}

function draw() {
  background('#222');
  fill('white');
  textSize(16);
  text('a.x = ' + a.x, 20, 80);
  text('b.x = ' + b.x, 20, 110);
}
```

**What you'll see:** `a.x = 3` and `b.x = 0` — two instances, two independent values.

**Try this:** change `new Point(0, 0)` to `new Point(99, 0)` and re-run. Only `b.x` changes; `a.x` stays 3. That's what "independent copies" means.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **Class** | Blueprint describing what data an instance holds. |
| **Instance** | A specific object built from a class with `new`. |
