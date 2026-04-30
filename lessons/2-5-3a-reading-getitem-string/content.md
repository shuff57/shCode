## Why `getItem('x') + 1` becomes "51"

**Read before attempting `2.5.4 Worked Example — High Score with storeItem`.**

What you'll learn from it:

- Every value `getItem` returns is a **string** — even values you wrote as numbers.
- The JS `+` operator concatenates when either operand is a string, so `getItem('x') + 1` produces `"51"`, not `6`.
- `Number(getItem('x'))` coerces the string back to a number before arithmetic.
- `parseInt(getItem('x'))` is an equivalent fix when you need a whole number.
- This is the single most common storage bug in student code.

**Try it:** run the sketch. Look at both console lines. The first shows `"51"` (string + number = concatenation). The second shows `6` (coerced number + number = addition).

```js live
function setup() {
  new Canvas(400, 200);
  storeItem('n', 5);
}

function draw() {
  background('#222');
  if (frameCount === 1) {
    console.log('without coercion:', getItem('n') + 1);   // "51"
    console.log('with    coercion:', Number(getItem('n')) + 1);  // 6
  }
}
```

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **Type coercion** | Forcing a value into a different type — e.g. string `"5"` → number `5`. |
| **`Number(...)`** | Coerces its argument to a JS number — `Number("42")` is `42`. |
| **`parseInt(...)`** | Coerces its argument to an integer, parsing leading digits — `parseInt("42px")` is `42`. |
