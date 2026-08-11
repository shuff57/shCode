**Goal:** See that every comparison expression evaluates to exactly `true` or `false` — and understand why `===` is safer than `==`.

## Step 1 — Basic comparisons return booleans

Run this and notice the output is `true` or `false`, not a number or a word.

```js live console
console.log(5 > 3);
console.log(5 < 3);
console.log(10 >= 10);
console.log(7 !== 8);
```

## Step 2 — Strict equality checks type too

`===` means "same value **and** same type." A number and a string that look the same are not `===` equal.

```js live console
console.log(5 === 5);
console.log(5 === "5");
```

## Step 3 — The loose == trap

`==` converts types before comparing. `5 == "5"` returns `true` because JavaScript quietly turns the string into a number. This is a common source of bugs.

```js live console
console.log(5 == "5");
console.log(5 === "5");
```

## Key takeaways

- Every comparison (`>`, `<`, `>=`, `<=`, `===`, `!==`) produces `true` or `false`.
- `===` checks value **and** type — prefer it in almost every situation.
- `==` coerces types before comparing, which leads to surprising results.
- Use `!==` (not `!=`) when you want strict not-equal.
