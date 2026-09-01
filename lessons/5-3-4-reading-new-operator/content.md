## The `new` operator

**Read before `5.3.5 Reading: constructor and its parameters`.** About 4 minutes.

By the end of this reading you should be able to answer:

- What three things does `new` do, in order?
- What is the return value of `new Tag('hello')`?

Every time you've written `new Sprite(...)` or `new Canvas(...)`, the JavaScript engine ran the same three steps. This reading names them so you can predict what happens when you write your own classes.

**What you'll learn from it:**

- `new` creates a fresh, empty object and binds `this` to it.
- `new` then runs the constructor function with whatever arguments you passed.
- `new` returns the finished object automatically: no `return` needed in the constructor.
- The variable on the left of `=` ends up holding that returned object.

**Try it:**

```js live
class Tag {
  constructor(label) {
    this.label = label;
  }
}

let t1, t2;

function setup() {
  new Canvas(360, 160);
  t1 = new Tag('hello');
  t2 = new Tag('world');
}

function draw() {
  background('#222');
  fill('white');
  textSize(18);
  text('t1.label = ' + t1.label, 20, 70);
  text('t2.label = ' + t2.label, 20, 110);
}
```

**What you'll see:** two lines: `t1.label = hello` and `t2.label = world`.

**Try this:** change `new Tag('hello')` to `new Tag('goodbye')` and re-run. Predict what the first line prints before you run it. Then change the second label too.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **`new`** | Operator that (1) allocates a fresh object, (2) calls the constructor with `this` bound to it, and (3) returns the object. |
| **Constructor** | The method `new` calls. Responsible for storing arguments on `this`. |
| **Instance** | The object `new` returns: one specific copy built from the class. |
