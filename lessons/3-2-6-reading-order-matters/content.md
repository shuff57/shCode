## Order Matters

**What you'll learn:**
- That a function matches arguments to parameters by position, not by name
- That putting the arguments in the wrong order is not an error
- Why two parameters of the same type are the dangerous case
- What to check when a result is mysteriously wrong
- That a missing argument is `undefined`, and how a default parameter gives it a fallback

A function with several parameters matches them to arguments **by position**, not by name. The first argument goes to the first parameter, always. It does not look at the names, and it does not look at the types.

```js
function describe(name, age) {
  console.log(name + " is " + age + " years old.");
}

describe("Dev", 19);
describe(19, "Dev");
```

**Try it:** Run the block and read both lines. The second call is not an error: JavaScript does exactly what it was told.

```js live plain
function describe(name, age) {
  console.log(name + " is " + age + " years old.");
}

describe("Dev", 19);
describe(19, "Dev");
```

The second call prints `19 is Dev years old.` Nothing crashes; the sentence is just nonsense. `name` became `19` and `age` became `"Dev"`, because position decides the pairing, not the names and not what would make sense.

The same trap bites arithmetic. Subtraction is not symmetric, so swapping two arguments changes the sign of the answer:

```js live plain
function subtract(a, b) {
  console.log(a - b);
}

subtract(10, 3);
subtract(3, 10);
```

`7` then `-7`. Same function, same two numbers, a different result because the order differed.

This is a whole category of bug. A function taking `(width, height)` called as `(height, width)` produces a number, not an error: the wrong number, silently. When two parameters have the same type, nothing in the language can catch the swap for you. Name them precisely, and check the order at the call site when a result is mysteriously wrong.

### A missing argument is `undefined`

JavaScript does not require you to pass an argument for every parameter. A parameter that is never given a value holds `undefined`, the same value you met in Unit 1.

```js live plain
function greet(name) {
  console.log("Hello, " + name + "!");
}

greet();
```

`Hello, undefined!` Nothing crashes: the parameter exists, it just has nothing in it. You can give it a fallback with `=` in the definition. That is a **default parameter**, and it is used only when the argument is missing:

```js live plain
function greet(name = "friend") {
  console.log("Hello, " + name + "!");
}

greet();
greet("Priya");
```

`Hello, friend!` then `Hello, Priya!`.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **positional match** | Arguments pair with parameters by order, not by name |
| **argument order** | The sequence in which values are written inside the call parentheses |
| **silent bug** | A wrong result that raises no error, so nothing tells you it happened |
| **symmetric operation** | One where swapping the operands gives the same answer, like addition |
| **missing argument** | A parameter the call did not supply; it holds `undefined` |
| **default parameter** | A fallback written with `=` in the definition, used only when the argument is missing |
