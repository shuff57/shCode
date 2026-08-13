**Goal:** Use `&&`, `||`, and `!` to combine or flip conditions inside an `if` statement.

## Step 1 — && requires both sides to be true

A "teen" check: the age must be at least 13 **and** at most 19. Try changing `age` to 12 or 20 and re-run.

```js live plain
let age = 16;

if (age >= 13 && age <= 19) {
  console.log("You are a teenager.");
} else {
  console.log("Not a teenager.");
}
```

## Step 2 — || only needs one side to be true

The weekend check fires when the day is Saturday **or** Sunday. Either one is enough.

```js live plain
let day = "Sat";

if (day === "Sat" || day === "Sun") {
  console.log("It's the weekend!");
} else {
  console.log("Weekday.");
}
```

## Step 3 — ! flips a boolean

`!` turns `true` into `false` and `false` into `true`. Here, if `isRaining` is `false`, then `!isRaining` is `true` — so we go outside.

```js live plain
let isRaining = false;

if (!isRaining) {
  console.log("Great day for a walk.");
} else {
  console.log("Stay inside.");
}
```

## Key takeaways

- `&&` (and) — both conditions must be true for the whole expression to be true.
- `||` (or) — at least one condition must be true.
- `!` (not) — flips `true` to `false` and vice versa.
- You can use these inside any `if` condition; keep it readable — one idea at a time.
