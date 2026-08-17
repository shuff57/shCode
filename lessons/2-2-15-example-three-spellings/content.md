**Goal:** See that pseudocode, a `for` loop, and a `while` loop can all describe the exact same plan — the algorithm is the steps, not the syntax.

## Step 1 — The plan, in plain English

Before any code: start at 1, keep going while you're at 5 or less, print the number, add 1 each time. That's the whole algorithm. Every block below is the same four ideas, spelled a different way.

## Step 2 — As a for loop

```js live plain
for (let i = 1; i <= 5; i++) {
  console.log(i);
}
```

## Step 3 — As a while loop

```js live plain
let i = 1;
while (i <= 5) {
  console.log(i);
  i++;
}
```

Run both. The same five lines print, in the same order. The `for` loop puts start, condition, and update on one line; the `while` loop spreads the exact same three parts across three lines. Neither version is more "correct" — they're the same algorithm.

## Step 4 — Predict, then check

Before running this one, write down what you think it prints:

```js live plain
for (let count = 1; count <= 3; count++) {
  console.log("Hello");
}
```

Now change the `3` to `5` and predict again before running. The algorithm did not change — "print Hello, this many times" — only the limit did.

## Key takeaways

- An algorithm is the plan. Pseudocode, a `for` loop, and a `while` loop are three different spellings of the same plan.
- Every language you ever learn has strings, numbers, conditionals, and loops — the ideas transfer even when the syntax doesn't.
- Predicting a loop's output before running it is how you catch a wrong guess before it becomes a bug.
