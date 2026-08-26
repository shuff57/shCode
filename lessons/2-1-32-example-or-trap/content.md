**Goal:** See why `day === "Saturday" || "Sunday"` is true on every day of the week, and why the bug never crashes.

## Step 1: The correct version

Each side of `||` is a full comparison.

```js live plain
let day = "Tuesday";

if (day === "Saturday" || day === "Sunday") {
  console.log("It is the weekend.");
} else {
  console.log("It is a weekday.");
}
```

## Step 2: The broken version

This reads fine in plain English: "Saturday or Sunday", but in JavaScript, the second side of `||` is not a comparison at all. It is just the string `"Sunday"` by itself.

```js live plain
let day = "Tuesday";

if (day === "Saturday" || "Sunday") {
  console.log("It is the weekend.");
} else {
  console.log("It is a weekday.");
}
```

## Step 3: See why it always wins

A non-empty string is truthy (`2.1.12 Reading: Truthy and Falsy Values`). `"Sunday"` is truthy no matter what `day` is, so the right side of `||` is always `true`: which makes the whole condition always `true`.

```js live plain
console.log(Boolean("Sunday"));
console.log("Tuesday" === "Saturday" || "Sunday");
```

## Key takeaways

- Every side of `&&` or `||` must be its own complete comparison: `x === a || x === b`, never `x === a || b`.
- The broken version does not crash and does not throw an error. It runs and gives the wrong answer every time, which is what makes this bug easy to miss.
- If a weekend message shows up on a Tuesday, check whether every side of the `||` is really asking a yes/no question.
