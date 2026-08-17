## The conditional (ternary) operator ?

**What you'll learn:**
- The syntax `condition ? value1 : value2`
- That `?` is an expression — it produces a value, unlike `if`
- Why `?` is called "ternary": it's the only operator with three operands
- When a ternary is shorter than the equivalent if/else

Sometimes you just need to pick one of two *values* based on a condition. You could write that with `if...else`:

```javascript
let accessAllowed;

if (age > 18) {
  accessAllowed = true;
} else {
  accessAllowed = false;
}
```

The conditional operator `?` — also called the ternary operator, because it takes three operands — does the same thing in one line:

```javascript
let result = condition ? value1 : value2;
```

If `condition` is truthy, the expression evaluates to `value1`. Otherwise it evaluates to `value2`. The example above becomes:

```javascript
let accessAllowed = (age > 18) ? true : false;
```

The key difference from `if`: **`?` produces a value that can sit on the right of an `=`.** `if` runs statements; it never produces a value you can assign. That's why `?` shines when you're picking between two *values* (numbers, strings) rather than running different blocks of code.

**Try it:** Change `age` and re-run to see `price` change.

```js live plain
let age = 8;
let price = (age < 12) ? 10 : 15;
console.log(price);
```

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **conditional (ternary) operator `?`** | `condition ? value1 : value2` — returns `value1` if truthy, otherwise `value2` |
| **ternary** | "Having three parts" — `?` is the only JavaScript operator with three operands |
| **expression** | Code that produces a value (like `?`), as opposed to a statement (like `if`) that just runs code |
