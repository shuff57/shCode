## Nested Loops

**What you'll learn:**
- What a nested loop is and where its body lives
- The order a nested loop actually runs in
- How to count the total work without hand-tracing every line

A loop is a statement, and the body of a loop can hold any statement, including another loop. A loop inside a loop is a **nested loop**.

```js live plain
for (let row = 1; row <= 3; row++) {
  for (let col = 1; col <= 4; col++) {
    console.log("row " + row + ", col " + col);
  }
}
```

Read the order carefully: it's the thing beginners get wrong. The **inner loop runs all the way through for every single round of the outer loop.** The outer loop moves to `row 2` only after the inner loop has finished all four columns for `row 1`.

That gives you a way to count the work: 3 rows × 4 columns = 12 lines of output. **Multiply, do not add.** A nested loop of `m` outer rounds and `n` inner rounds runs the inner body `m × n` times, not `m + n`.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **nested loop** | A loop written inside the body of another loop |
| **outer loop** | The loop that contains the other one: advances once per full pass of the inner loop |
| **inner loop** | The loop that runs completely, start to finish, on every single round of the outer loop |
| **multiply, don't add** | The rule for counting nested-loop work: outer rounds × inner rounds |
