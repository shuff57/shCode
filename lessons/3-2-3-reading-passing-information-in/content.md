## Passing Information In

**What you'll learn:**
- Why a function with no parameters can only ever do one fixed thing
- How a parameter leaves a blank in the function for the caller to fill
- How the same function produces a different result for each argument
- That the value you pass in becomes the parameter's value for the length of that call

A function like `printHeader()` does one fixed job. It is useful, but limited: a function that can only ever say one sentence is not much more than a shortcut. Call it twice and you get the same output twice.

```js
function greet() {
  console.log("Hello, Marisol!");
}

greet();
greet();
```

Both calls print `Hello, Marisol!`. To greet somebody else you would have to write a second function, then a third for the next person.

Instead, leave a blank in the function for the caller to fill. The blank is written as a name inside the parentheses:

```js
function greet(name) {
  console.log("Hello, " + name + "!");
}

greet("Marisol");
greet("Dev");
greet("Priya");
```

One function, three greetings. The `name` inside the parentheses is the blank. When you call `greet("Dev")`, the value `"Dev"` is placed into that blank, and for the length of that call `name` behaves like a variable holding `"Dev"`.

**Try it:** Run the block. Then change one of the names passed to `greet` and run it again: the same definition produces whatever you hand it.

```js live plain
function greet(name) {
  console.log("Hello, " + name + "!");
}

greet("Marisol");
greet("Dev");
greet("Priya");
```

The function's *definition* is written once; the value it works on is decided at each *call*. That division is what makes a function reusable across data it could not have known about when it was written.

A function can take more than one blank, separated by commas. Each call supplies its own values:

```js live plain
function describe(name, age) {
  console.log(name + " is " + age + " years old.");
}

describe("Dev", 19);
describe("Priya", 17);
```

Two blanks, two values per call. The function does not care which name goes with which person; it prints what the caller handed it.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **parameter** | The name written inside a function's parentheses; a blank the caller fills |
| **argument** | The actual value passed in at a call site, e.g. the `"Dev"` in `greet("Dev")` |
| **call** | Running the function by writing its name and a pair of parentheses |
| **reusable** | One definition that works on different inputs instead of one fixed output |
