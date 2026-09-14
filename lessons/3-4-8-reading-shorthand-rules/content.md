## The Shorthand Rules

**What you'll learn:**
- That a single-expression body returns automatically (implicit return)
- That adding braces brings `return` back as a requirement
- That parentheses are optional for exactly one parameter
- That empty parentheses are required when there are none

Arrow functions have several optional shortenings. They are worth learning as a set, because you will read all of them in other people's code.

### One expression: the return is implied

When the body is a single expression with no braces, the expression *is* the return value. This is called an **implicit return**.

**Try it:** No braces, no `return` — and it still hands back `10`.

```js live plain
const double = (n) => n * 2;

console.log(double(5));
```

### Braces bring `return` back

The moment you add braces, you are writing a normal function body and you must write `return` yourself.

**Try it:** Compare the two. `doubleWrong` computed `n * 2`, threw it away, and fell off the end — which produces `undefined`.

```js live plain
const doubleWrong = (n) => { n * 2; };
const doubleRight = (n) => { return n * 2; };

console.log(doubleWrong(5));
console.log(doubleRight(5));
```

This is the single most common arrow-function mistake, and it produces `undefined` rather than an error. If an arrow returns `undefined` and the arithmetic looks right, look for braces without a `return`.

Use braces when the body needs more than one statement.

**Try it:** Two statements, so braces and an explicit `return` are required.

```js live plain
const describe = (n) => {
  let kind = "odd";
  if (n % 2 === 0) {
    kind = "even";
  }
  return n + " is " + kind;
};

console.log(describe(7));
```

### One parameter: the parentheses are optional

With exactly one parameter, you may drop the parentheses.

**Try it:** Both `n => n * n` and `(n) => n * n` are correct; this course keeps the parentheses, because they stop being optional the moment a second parameter appears.

```js live plain
const square = n => n * n;

console.log(square(6));
```

### No parameters: empty parentheses are required

**Try it:** With zero parameters, the `()` cannot be dropped — without it there is nothing to the left of the arrow.

```js live plain
const shout = () => "HEY!";

console.log(shout());
```

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **implicit return** | A single-expression arrow body returns that expression with no `return` |
| **block body** | An arrow body in braces; it needs an explicit `return` or yields `undefined` |
| **braces mistake** | Adding `{ }` and forgetting `return`, producing `undefined` |
| **parameter parentheses** | Optional for exactly one parameter; required for zero or two or more |
| **`undefined`** | What falls out of a block body that never hits a `return` |
