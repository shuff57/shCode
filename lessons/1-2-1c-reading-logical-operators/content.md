## Logical operators: && || !

**What you'll learn:**
- How `&&` (AND) requires **both** conditions to be true
- How `||` (OR) requires **at least one** condition to be true
- How `!` (NOT) flips a `true` to `false` and vice versa
- How to combine logical operators inside an `if` statement

Logical operators let you combine or flip conditions so you can ask more precise questions in an `if` statement.

| Operator | Name | Reads as | True when |
|----------|------|----------|-----------|
| `&&` | AND | "and" | **both** sides are `true` |
| `\|\|` | OR | "or" | **at least one** side is `true` |
| `!` | NOT | "not" | the value that follows is `false` |

For example: `age >= 13 && age <= 17` is true only when age is between 13 and 17 (both conditions must hold).

**Try it:** Change `age` and `hasTicket` to different values and re-run to see which messages appear.

```js live console
let age = 16;
let hasTicket = true;

// && — both must be true
if (age >= 13 && age <= 17) {
  console.log("You are a teenager.");
}

// || — at least one must be true
if (age < 13 || age > 17) {
  console.log("You are not a teenager.");
}

// ! — flip a boolean
if (!hasTicket) {
  console.log("You need a ticket to enter.");
} else {
  console.log("Welcome in!");
}

// combining && in a real check
if (age >= 13 && hasTicket) {
  console.log("You can attend the teen event.");
}
```

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **`&&` (AND)** | True only when both sides are `true` |
| **`\|\|` (OR)** | True when at least one side is `true` |
| **`!` (NOT)** | Flips `true` to `false` and `false` to `true` |
| **logical operator** | An operator that combines or inverts boolean values |
| **compound condition** | Two or more conditions joined with `&&` or `\|\|` |
