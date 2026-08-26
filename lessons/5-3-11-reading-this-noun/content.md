## `this` is a noun

**Read before `2.2.5a Worked Example: this is a pronoun`.** About 4 minutes.

By the end of this reading you should be able to answer:

- What does `this` refer to inside a method?
- If you call `g1.greet()`, what is `this` during that call?

`this` is a keyword that always names one concrete thing: the specific instance the method was called on. It is not a concept or a shorthand for the class: it is the actual object.

**What you'll learn from it:**

- Inside any method, `this` is set automatically to the instance on the left of the dot at the call site.
- The same method definition can run on many different instances; `this` changes each time.
- `this.name` reads or writes a property on whichever instance is currently running the method.
- Two greeters, two different `this` values: same code, different data.

**Try it:**

```js live
class Greeter {
  constructor(name) {
    this.name = name;
  }

  greet() {
    return 'hi ' + this.name;
  }
}

let g1, g2;

function setup() {
  new Canvas(360, 180);
  g1 = new Greeter('Alice');
  g2 = new Greeter('Bob');
}

function draw() {
  background('#222');
  fill('white');
  textSize(18);
  text(g1.greet(), 20, 80);
  text(g2.greet(), 20, 120);
}
```

**What you'll see:** `hi Alice` and `hi Bob`. Same `greet()` method, different `this` each time.

**Try this:** add a third `Greeter` with your own name and call `.greet()` on it. Predict exactly what it will print before you run it. Then confirm.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **`this`** | Inside a method, the specific instance the method was called on. Set automatically at the call site. |
| **Call site** | The line of code where a method is invoked: `g1.greet()` is the call site. |
| **Method** | A function defined inside a class body. Gets `this` bound automatically when called. |
