## Putting an if inside an if

**What you'll learn:**
- That the block after `if` can hold any code, including another `if`
- Why nesting lets you ask a follow-up question only when the first answer is yes
- How to keep nested code readable with indentation

An `if` block runs whatever code is between its curly braces. Nothing says that code has to be a `console.log`: it can be another `if` statement. That is called **nesting**.

```
if (outerCondition) {
  if (innerCondition) {
    // runs only when BOTH are true
  }
}
```

The inner `if` only runs at all when the outer condition is true. This is different from `age >= 13 && age <= 17`: that checks both conditions at once and picks one path. Nesting checks the first condition, and only *then* decides whether to ask the second question.

**Try it:** Change `isMember` to `false` and re-run. Notice the inner check never even runs: the outer `if` skipped its whole block.

```js live plain
let isMember = true;
let yearsActive = 3;

if (isMember) {
  console.log("Member confirmed.");

  if (yearsActive >= 5) {
    console.log("Eligible for the loyalty discount.");
  } else {
    console.log("Not yet eligible for the loyalty discount.");
  }
} else {
  console.log("Not a member.");
}
```

Each level of nesting gets its own indent: two more spaces than the block it lives in. That indentation is what lets you see, at a glance, which condition a line of code depends on.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **nested if** | An `if` statement written inside the block of another `if` statement |
| **outer condition** | The condition of the `if` that contains the nested one |
| **inner condition** | The condition of the nested `if`, only checked when the outer one is true |
| **indentation** | Extra spacing that shows which block a line belongs to |
