## Parentheses and operator precedence

**What you'll learn:**
- What "operator precedence" means: which operator JavaScript evaluates first
- Why the whole condition is worked out before `if` or `?` chooses a branch
- Why adding parentheses around a condition is good practice even when not required

**Operator precedence** is the order JavaScript evaluates operators in an expression when there's more than one. Comparison operators (`>`, `<`, `===`) are evaluated *before* `if` or `?` look at the result: the condition is always fully computed down to a single `true`/`false` first.

> **Two operators you have not met yet.** This reading needs `&&` and `||` to show you why precedence matters, and they arrive properly in `2.1.30 Reading: Logical Operators: && || !`. For now, all you need is this: `a && b` is true only when **both** sides are true, and `a || b` is true when **at least one** side is true. They are *logical* operators, not comparison operators — they combine whole conditions rather than comparing two values. If the examples below feel like a lot at once, read 2.1.30 first and come back; nothing here is graded.

```javascript
if (age > 18) {
  // ...
}
```

JavaScript computes `age > 18` completely: producing `true` or `false`, before `if` ever looks at it. The parentheses around `age > 18` aren't required for that to happen; `if` always requires parentheses around its condition anyway, and the comparison inside naturally runs first.

Where precedence actually matters is inside a *compound* condition: combining more than one comparison with `&&` or `||`:

```javascript
if (age >= 13 && age <= 19 || hasException) {
  // ...
}
```

`&&` is evaluated before `||`, so this reads as `(age >= 13 && age <= 19) || hasException`, not `age >= 13 && (age <= 19 || hasException)`. Those are different conditions! Adding the parentheses yourself removes the guesswork:

```javascript
if ((age >= 13 && age <= 19) || hasException) {
  // ...
}
```

**Try it:** Both lines below compute the same result: try removing the inner parentheses from the second line and see that it still works, because `&&` already runs before `||`. Keep the parentheses anyway; a reader shouldn't have to remember the rule.

```js live plain
let age = 25;
let hasException = true;

console.log((age >= 13 && age <= 19) || hasException);
console.log(age >= 13 && age <= 19 || hasException);
```

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **operator precedence** | The order JavaScript evaluates operators when an expression has more than one |
| **compound condition** | A condition built from more than one comparison joined by `&&` or `\|\|` |
| **clarifying parentheses** | Parentheses added to make evaluation order obvious to a reader, even when not strictly required |
