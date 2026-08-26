## When ordinary numbers stop being exact

The `number` type cannot safely represent integers larger than `2^53 - 1`: that is `9007199254740991`, or smaller than the negative of it. Past that range, calculations quietly lose precision. Not an error. Not a warning. A wrong answer, delivered confidently.

> **Definition 1.2.2: BigInt.** A data type for integers of arbitrary length. Create one by adding **`n`** to the end of an integer.

`BigInt` has no upper limit but the memory in your machine. The trade is that you have to ask for it, and you cannot mix `BigInt` and `number` in the same calculation.

For most everyday programming the ordinary `number` range is plenty: nine quadrillion covers a lot of shopping carts. `BigInt` matters for cryptography, precise timestamps, and anywhere very large integers must be exact.

**What you'll learn from it:**
- `number` is only exact up to `9007199254740991` (`2^53 - 1`).
- Past that, arithmetic loses precision silently: no error is raised.
- `BigInt` handles integers of any length; write one by appending `n`.
- Use it for cryptography and exact large integers, not for everyday maths.

**Try it:**

The first two lines are the whole argument for `BigInt`.

```js live plain
console.log(9007199254740991 + 1);
console.log(9007199254740991 + 2);

// the "n" at the end means BigInt
const big = 1234567890123456789012345678901234567890n;
console.log(big);

console.log(9007199254740991n + 3n);   // exact
```

Look at the first two results. **They are the same number.** JavaScript's `number` type cannot tell the difference between adding 1 and adding 2 at that size: it has run out of precision and rounds both to the same value.

The last line does the same size of arithmetic with `BigInt` and stays exact. That is the entire point of the type.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **BigInt** | A type for integers of arbitrary length, written with a trailing `n` |
| **`2^53 - 1`** | `9007199254740991`: the largest integer `number` represents exactly |
| **precision** | How exactly a value is stored; lost precision means a silently wrong answer |
| **arbitrary length** | No fixed upper limit on the size of the integer |
