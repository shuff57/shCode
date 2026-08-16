## One type for whole numbers and decimals

The `number` type covers **both** whole numbers (integers) and numbers with a decimal point (floating-point). There is no separate integer type and no separate decimal type — `7` and `7.5` are the same type as each other.

That surprises people coming from other languages, where `int` and `float` (or `double`) are different types you have to choose between. JavaScript does not make you choose.

You do arithmetic with the operators you already know: `*` multiply, `/` divide, `+` add, `-` subtract.

**What you'll learn from it:**
- `number` covers integers and decimals — one type, not two.
- The same variable can hold `123` now and `12.345` later.
- Arithmetic uses `*`, `/`, `+`, `-`.
- Division does not round: `10 / 4` is `2.5`, not `2`.

**Try it:**

```js live plain
let n = 123;
console.log(n);

n = 12.345;
console.log(n);

console.log(10 * 3);
console.log(10 / 4);   // 2.5 — no rounding
console.log(10 - 3);
```

Watch that fourth result. In some languages `10 / 4` on two integers gives `2`, because the answer is forced back into an integer. JavaScript has nowhere to force it back *to* — there is only `number` — so you get `2.5`.

Division has two more surprises waiting: what happens when you divide by zero, and what happens when the maths does not make sense at all. Those are the next lesson.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **number** | The type covering integers and floating-point numbers alike |
| **integer** | A whole number — `123`, `-4`, `0` |
| **floating-point** | A number with a decimal point — `12.345` |
| **arithmetic operator** | `+`, `-`, `*`, `/` — the symbols that do maths |
