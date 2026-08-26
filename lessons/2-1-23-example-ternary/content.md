**Goal:** Build a ternary expression step by step and see it produce a value directly.

## Step 1: Set the age

Nothing new here, just the input the ternary will check.

```js live plain
let age = 8;
console.log(age);
```

## Step 2: Add the ternary

`(age < 12) ? 10: 15` is one expression. It evaluates to `10` when `age < 12` is true, and `15` otherwise. The whole thing sits on the right of `=`, exactly like a number literal would.

```js live plain
let age = 8;
let price = (age < 12) ? 10: 15;
console.log(price);
```

## Step 3: Change the age and re-run

Set `age` to `15`. Predict the price before running: `age < 12` is now false, so the ternary should return the second value.

```js live plain
let age = 15;
let price = (age < 12) ? 10: 15;
console.log(price);
```

## Key takeaways

- A ternary is one expression: `condition ? value1: value2`.
- It can sit anywhere a value is expected: assigned to a variable, passed to `console.log`, anything.
- The parentheses around the condition aren't required, but they make the boundary between "the question" and "the two answers" easy to read.
- If the two branches were more than a single value: say, several `console.log` calls each: a ternary would be the wrong tool. Use `if`/`else` for that.
