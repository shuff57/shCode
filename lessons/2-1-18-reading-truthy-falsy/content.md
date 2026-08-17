## How if decides true or false

**What you'll learn:**
- That `if (...)` converts whatever is inside the parentheses to `true` or `false`
- The six values that convert to `false` ("falsy")
- That every other value converts to `true` ("truthy")
- Why `if (x == true)` is redundant when `x` is already a boolean

`if (...)` does not require a `true`/`false` value directly. It converts whatever you give it. Six values convert to `false`:

- `false`
- `0`
- `""` (empty string)
- `null`
- `undefined`
- `NaN`

A **falsy** value is one of those six. A **truthy** value is anything else — every other number, every non-empty string, every object.

```javascript
if (0) {
  // never runs — 0 is falsy
}

if (1) {
  // always runs — 1 is truthy
}
```

You can also store the converted result in a variable first, using a comparison that already produces `true` or `false`:

```javascript
let cond = (year === 2015);

if (cond) {
  // ...
}
```

If a value is already a boolean, writing `if (x == true)` is redundant — `if (x)` does the same thing. Save the comparison for when you actually need to compare two different things.

**Try it:** Change `cartCount` to `0`, then to `3`, and re-run each time.

```js live plain
let cartCount = 0;

if (cartCount) {
  console.log("You have items in your cart.");
} else {
  console.log("Your cart is empty.");
}
```

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **truthy** | A value that becomes `true` when converted to a boolean |
| **falsy** | A value that becomes `false` when converted to a boolean |
| **the six falsy values** | `false`, `0`, `""`, `null`, `undefined`, `NaN` |
| **boolean conversion** | What `if (...)` does to its condition before deciding which branch to take |
