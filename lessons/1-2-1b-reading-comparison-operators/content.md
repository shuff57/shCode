## Comparison operators

**What you'll learn:**
- The six comparison operators and what each one checks
- Why `===` (strict equality) is the right default to use
- Why `==` (loose equality) is risky and can produce surprising results
- How to read a comparison expression as a plain English question

A comparison operator compares two values and gives back `true` or `false`.

| Operator | Meaning | Example | Result |
|----------|---------|---------|--------|
| `===` | strictly equal (same value AND same type) | `5 === 5` | `true` |
| `!==` | strictly not equal | `5 !== 6` | `true` |
| `<` | less than | `3 < 10` | `true` |
| `>` | greater than | `10 > 3` | `true` |
| `<=` | less than or equal | `5 <= 5` | `true` |
| `>=` | greater than or equal | `4 >= 7` | `false` |

### `===` vs `==` — always use `===`

`===` checks that the value **and** the type match. `==` (two equals signs) is the "loose" version — it quietly converts types before comparing, which leads to surprises. Use `===` everywhere; only bring in `==` if you have a specific reason.

**Try it:** Read each line, predict `true` or `false`, then run it and check.

```js live console
console.log(5 === 5);       // same value, same type → true
console.log(5 === "5");     // number vs string → false  (=== is strict)
console.log(5 == "5");      // == converts types → true  (risky!)
console.log(10 > 3);
console.log(10 < 3);
console.log(7 <= 7);
console.log(4 >= 5);
console.log(5 !== 6);
```

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **comparison operator** | A symbol that compares two values and returns `true` or `false` |
| **`===` (strict equality)** | Both value AND type must match |
| **`!==` (strict inequality)** | True when the values or types do not match |
| **`==` (loose equality)** | Converts types before comparing — use `===` instead |
| **`<` / `>`** | Less than / greater than |
| **`<=` / `>=`** | Less than or equal / greater than or equal |
