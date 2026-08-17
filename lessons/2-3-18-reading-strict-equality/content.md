## switch compares strictly

**What you'll learn from it:**
- That `case` matches using strict equality (`===`), never `==`
- Why a value coming from outside your program (like text input) can silently fail every case
- What "dead code" means and how to spot it

A `case` matches using strict equality — the same `===` from Conditionals. The value and the case must be the same **type**, not just the same-looking content. This matters more than it sounds, because values that arrive from outside your program are almost always strings.

```js live plain
let answer = "3";

switch (answer) {
  case 1:
    console.log("You chose one.");
    break;
  case 2:
    console.log("You chose two.");
    break;
  case 3:
    console.log("You chose three.");
    break;
  default:
    console.log("Not a valid choice.");
}
```

The string `"3"` is not strictly equal to the number `3`, so `case 3` never matches. It's **dead code** — a line that can never run, sitting in the middle of your program looking perfectly reasonable.

Recall that `==` would have matched `"3"` against `3`, because it converts types before comparing. `switch` gives you no such option — it is always strict. That's a feature, not a limitation: a `switch` never matches something you didn't intend. But it does put the burden on you to know what type your value actually is.

**Try it:** Change `answer` to the number `3` (no quotes) and confirm `case 3` matches this time.

```js live plain
let answer = 3;

switch (answer) {
  case 1:
    console.log("You chose one.");
    break;
  case 2:
    console.log("You chose two.");
    break;
  case 3:
    console.log("You chose three.");
    break;
  default:
    console.log("Not a valid choice.");
}
```

## Strict means no truthiness either

`switch` doesn't test truthiness like `if` does — it tests `===`. A falsy value like `0` doesn't get treated as `false` inside a `switch`.

**Try it:** Predict which case matches before you run it.

```js live plain
let n = 0;

switch (n) {
  case false:
    console.log("matched false");
    break;
  case 0:
    console.log("matched zero");
    break;
  default:
    console.log("matched nothing");
}
```

`0` is falsy, so `if (n)` would treat it as false — but a number is never strictly equal to a boolean. `case false` fails and `case 0` matches.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **Strict equality (`===`)** | Comparison requiring the same type as well as the same value — what `switch` always uses |
| **Dead code** | A line or branch that can never run, such as `case 3:` when the switched value is always a string |
| **Truthiness** | Whether a value counts as true/false in a boolean context — `switch` never checks this, only `===` |
