## `constructor` and its parameters

**Read before `5.3.6 Worked Example: You've been using classes`.** About 4 minutes.

By the end of this reading you should be able to answer:

- Where do the arguments you pass to `new Point(3, 4)` actually go?
- What happens if the constructor never assigns `this.y`?

The `constructor` is just a function, but it's the one function that `new` calls automatically. Its job is to receive arguments and park them on `this` so the rest of the class can use them later.

**What you'll learn from it:**

- `constructor(x, y)` receives the same arguments you pass to `new ClassName(x, y)`.
- `this.x = x` stores the first argument on the new instance as a property named `x`.
- If you forget to assign a parameter to `this`, that data is lost the moment the constructor returns.
- A class with no `constructor` at all still works: JavaScript provides a silent empty one.

**Try it:**

```js live
class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}

let p1, p2;

function setup() {
  new Canvas(360, 180);
  p1 = new Point(3, 4);
  p2 = new Point(0, 0);
}

function draw() {
  background('#222');
  fill('white');
  textSize(16);
  text('p1.x = ' + p1.x + '   p1.y = ' + p1.y, 20, 80);
  text('p2.x = ' + p2.x + '   p2.y = ' + p2.y, 20, 120);
}
```

**What you'll see:** `p1.x = 3  p1.y = 4` and `p2.x = 0  p2.y = 0`.

**Try this:** remove the line `this.y = y;` from the constructor and re-run. The second value in each row becomes `undefined`. That property is missing because the constructor never created it.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **`constructor`** | Special method inside a class that `new` calls. Receives args, stores them on `this`. |
| **Parameter** | A named slot in the constructor (or any function) for an incoming argument. |
| **`this.name = value`** | Creates a property named `name` on the current instance and sets it to `value`. |
| **`undefined`** | What you get when you read a property that was never assigned. |
