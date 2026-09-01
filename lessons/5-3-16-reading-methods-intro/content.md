## Methods: functions that live on a class

**Read before `5.4.2 Lab: Method with no params`.** About 4 minutes.

By the end of this reading you should be able to answer:

- How does a method declaration differ from a `function` declaration?
- Can you spot a method in a 6-line class body?

A method is a function that lives inside a class body and has access to `this`. The only syntax difference from a regular function is that you drop the `function` keyword.

**What you'll learn from it:**

- Inside a class body, write `methodName(params) { ... }`: no `function` keyword.
- Adding `function` before the method name is a syntax error; the engine won't run the file.
- A method is available on every instance of the class: you don't create it separately.
- Calling a method on an instance: `instance.methodName(args)`.

**Try it:**

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
  new Canvas(360, 180);
  a = new Point(0, 0);
  b = new Point(3, 4);
}

function draw() {
  background('#222');
  fill('white');
  textSize(16);
  text('distance = ' + a.distanceTo(b), 20, 100);
}
```

**What you'll see:** `distance = 5`. The `distanceTo` method is called on `a` with `b` as the argument.

**Try this:** in the editor above, add the word `function` before `distanceTo` (so it reads `function distanceTo(other) {`). Click Run and watch the on-canvas console. You'll see a syntax error. Remove `function` again and confirm it works.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **Method** | A function defined inside a class body: no `function` keyword, just `name(params) { }`. |
| **Method call** | Invoking a method on an instance: `instance.method(args)`. |
| **`this`** | Inside a method, the instance the method was called on. |
