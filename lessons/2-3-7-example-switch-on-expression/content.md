**Goal:** See that `switch (...)` doesn't need a plain variable: JavaScript works out the value first, then starts matching.

## Step 1: Switch on 2 + 2, not a variable

`a` is `2 + 2`. JavaScript computes that to `4` before it checks a single `case`.

```js live plain
let a = 2 + 2;

switch (a) {
  case 3:
    console.log("Too small");
    break;
  case 4:
    console.log("Exactly!");
    break;
  case 5:
    console.log("Too big");
    break;
  default:
    console.log("I do not know such values");
}
```

## Step 2: case values can be expressions too

The same rule applies on the other side of the colon. `case 3 + 1:` is a perfectly legal way to write `case 4:`, though there's rarely a reason to write it that way.

```js live plain
let a = 4;

switch (a) {
  case 3 + 1:
    console.log("Matched 3 + 1, same as case 4");
    break;
  default:
    console.log("No match");
}
```

## Key takeaways

- `switch (expression)` evaluates the expression once, before comparing it to any case.
- A `case` value can also be an expression: it's worked out the same way.
- This is why `switch (day)` and `switch (Number(day))` behave differently: the *value being matched* is decided up front, not re-checked per case.
