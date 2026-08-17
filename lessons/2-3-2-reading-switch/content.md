## switch statements

**What you'll learn from it:**
- How a `switch` statement compares one value against many cases
- Why `break` is required at the end of each case
- How `default` acts as the fallback when no case matches
- When to prefer `switch` over a long `if/else if` chain

A `switch` statement takes one value — written once, in the parentheses — and compares it against a list of `case` values, in order. When a `case` matches, its code runs. This is Definition 2.3.1: a `switch` statement compares a single value against a list of `case` values in order and runs the code belonging to the first case that matches. An optional `default` clause runs when no case matches.

```
switch (value) {
  case "A":
    // runs when value === "A"
    break;
  case "B":
    // runs when value === "B"
    break;
  default:
    // runs when nothing matched
}
```

**The `break` matters.** Without it, JavaScript keeps running into the next case even after a match — this is called "fall-through" and is almost always a bug for beginners. Always end each case with `break`. (You'll see exactly what fall-through does in the next reading.)

**Try it:** Change `grade` to `"A"`, `"B"`, and something that matches nothing, like `"Z"`.

```js live plain
let grade = "B";

switch (grade) {
  case "A":
    console.log("Excellent");
    break;
  case "B":
    console.log("Good");
    break;
  default:
    console.log("See me after class");
}
```

## default doesn't have to be written last

`default` is checked only after every `case` has failed to match — that's true no matter *where* in the block it's written. Putting it in the middle of a `switch` is legal. It's also confusing to read, which is why the convention is to write it last, even though JavaScript doesn't require it.

**Try it:** `n` is `99`, which matches no case. Trace through and predict which line prints before you run it — then move `default` to the very end and confirm the output doesn't change.

```js live plain
let n = 99;

switch (n) {
  case 1:
    console.log("one");
    break;
  default:
    console.log("something else");
    break;
  case 2:
    console.log("two");
    break;
}
```

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **`switch`** | Evaluates one expression and jumps to the matching `case` |
| **`case`** | A label that matches a specific value using strict equality (`===`) |
| **`break`** | Exits the `switch` block; without it, execution falls into the next case |
| **`default`** | The fallback block that runs when no `case` matched — legal anywhere in the block, but written last by convention |
| **fall-through** | What happens when `break` is missing — execution continues into the next case |
