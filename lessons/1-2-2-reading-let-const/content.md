## Declaring variables with `let` and `const`

**What you'll learn:**
- How to declare a variable using `let` or `const`
- The difference between `let` (can be reassigned) and `const` (fixed)
- When to choose each one

A **variable** is a named container for a value. In JavaScript you create one with `let` or `const` followed by a name, then `=`, then the value.

```js
let score = 0;
const playerName = "Jordan";
```

Use `let` when the value will change over time. Use `const` when the value should stay the same after it is set. If you try to reassign a `const`, JavaScript throws a `TypeError` immediately.

**Rule of thumb:** default to `const`. Switch to `let` only when you know you will need to change the value.

**Try it:** Run the block below. Then change `score` to `const` and run again — notice the error.

```js live plain
let score = 0;
const playerName = "Jordan";

console.log(playerName + " starts with score " + score);

score = 10;
console.log(playerName + " now has score " + score);
```

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **variable** | A named container for a value |
| **declaration** | The statement that creates a variable (`let x = 5`) |
| **assignment** | Setting a variable's value (`x = 10`) |
| **`let`** | Keyword for a variable whose value can change |
| **`const`** | Keyword for a variable whose value cannot be reassigned |
| **`TypeError`** | Error thrown when you try to reassign a `const` |
