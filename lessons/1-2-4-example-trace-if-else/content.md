**Goal:** Predict which branch of an if/else chain fires before you run the code — then verify it.

## Step 1 — Run the grade chain

`score` is 85. Before you hit Run, read each condition top to bottom and decide which one is true first. Then run and check your prediction.

```js live console
let score = 85;

if (score >= 90) {
  console.log("Grade: A");
} else if (score >= 80) {
  console.log("Grade: B");
} else if (score >= 70) {
  console.log("Grade: C");
} else if (score >= 60) {
  console.log("Grade: D");
} else {
  console.log("Grade: F");
}
```

## Step 2 — Change the value and re-predict

Change `score` to `55`. Which branch will fire now? Predict first, then run.

```js live console
let score = 55;

if (score >= 90) {
  console.log("Grade: A");
} else if (score >= 80) {
  console.log("Grade: B");
} else if (score >= 70) {
  console.log("Grade: C");
} else if (score >= 60) {
  console.log("Grade: D");
} else {
  console.log("Grade: F");
}
```

## Step 3 — Hit the else

Set `score` to `30`. No `if` or `else if` condition will be true, so the `else` at the bottom catches it.

```js live console
let score = 30;

if (score >= 90) {
  console.log("Grade: A");
} else if (score >= 80) {
  console.log("Grade: B");
} else if (score >= 70) {
  console.log("Grade: C");
} else if (score >= 60) {
  console.log("Grade: D");
} else {
  console.log("Grade: F");
}
```

## Key takeaways

- JavaScript checks conditions **top to bottom** and stops at the first one that is true.
- Only **one branch** ever runs per evaluation — the rest are skipped.
- `else` is the fallback: it runs when every condition above it was false.
- Predicting before running is the key habit — it turns reading code into understanding code.
