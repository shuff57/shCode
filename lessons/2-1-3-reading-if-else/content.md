## Branching with if / else if / else

**What you'll learn:**
- How `if` checks a condition and runs a block only when it is true
- How `else if` adds more branches to check one by one
- How `else` catches everything that didn't match
- How to chain all three to cover every case

An `if` statement checks a condition (something that is `true` or `false`). If the condition is true, the code inside the curly braces runs. If it is false, that block is skipped.

```
if (condition) {
  // runs when condition is true
} else if (anotherCondition) {
  // runs when the first was false but this one is true
} else {
  // runs when none of the above matched
}
```

JavaScript checks each condition from top to bottom and stops at the **first** one that is true. Only that block runs — the rest are skipped.

**Try it:** Change `score` to different values (95, 70, 55, 40) and re-run to see which branch fires each time.

```js live plain
let score = 85;

if (score >= 90) {
  console.log("Grade: A");
} else if (score >= 80) {
  console.log("Grade: B");
} else if (score >= 70) {
  console.log("Grade: C");
} else if (score >= 60) {
  console.log("Grade: D");
} else {
  console.log("Grade: F");
}
```

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **`if`** | Runs a block only when its condition is `true` |
| **`else if`** | A follow-up condition checked only when the previous branches were all `false` |
| **`else`** | A fallback block that runs when none of the `if`/`else if` conditions matched |
| **condition** | An expression that evaluates to `true` or `false` |
| **branch** | One path through an `if`/`else if`/`else` chain |
| **top-to-bottom evaluation** | JavaScript checks each condition in order and stops at the first `true` |
