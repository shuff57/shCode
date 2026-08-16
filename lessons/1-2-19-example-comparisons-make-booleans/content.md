**Goal:** Stop reading a comparison as a *question* and start reading it as a *value*. `10 > 5` is not asking anything — it **is** `true`, the same way `2 + 3` **is** `5`.

## Step 1 — Four comparisons

Predict each answer before you run it.

```js live plain
console.log( 10 > 5 );
console.log( 3 < 1 );
console.log( "apple" === "orange" );
console.log( 100 === 100 );
```

`true`, `false`, `false`, `true`. Every comparison evaluates to one of exactly two values — there is nothing else it could produce.

`===` means "is exactly equal to". One `=` assigns a value, three `=` ask whether two values match. Chapter 2 spends real time on that difference; for now just read `===` as "is the same as".

## Step 2 — A comparison is a value, so you can store it

```js live plain
let temperature = 91;

let isHot = temperature > 80;

console.log(isHot);
console.log(typeof isHot);
```

`isHot` does not hold the question. It holds `true`. The comparison ran once, produced a boolean, and that boolean was stored like any other value.

Change `91` to `60` and run it again — `isHot` becomes `false`. The variable is a snapshot of the answer at the moment the line ran, not a live link to `temperature`.

## Step 3 — Which is why comparisons and booleans are the same thing

```js live plain
let score = 88;

let passedByComparison = score >= 60;   // computed
let passedByHand = true;                // typed

console.log(passedByComparison);
console.log(passedByHand);
console.log( typeof passedByComparison === typeof passedByHand );
```

The last line compares the two *types* and prints `true`. Whether a boolean was computed by a comparison or typed by a person, JavaScript cannot tell the difference afterwards — a boolean is a boolean.

## Key takeaways

- A comparison is an expression that produces a value, like `2 + 3` does.
- That value is always `true` or `false` — never anything else.
- You can store it, print it, and check its type like any other value.
- `===` means "exactly equal to"; a single `=` assigns instead. Chapter 2 goes deeper.
