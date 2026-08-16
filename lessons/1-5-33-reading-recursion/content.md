## A process that calls itself

**Recursion** is the problem-solving technique where a process calls itself to solve smaller instances of the same problem. It allows an elegant solution to a complex problem by breaking it into smaller, manageable parts — decomposition, applied to a problem that contains a copy of itself.

> **Definition 1.5.7 — Recursion.** A technique in which a function calls itself on a smaller version of the same problem, stopping at a **base case** — an input simple enough to answer directly without calling itself again.

This lesson is a **preview**. Functions arrive properly in Chapter 3, and you are not expected to write recursion this quarter. Read it, run it, and recognise the shape when it turns up.

### Read it as two claims, not as a loop

A recursive sum makes two statements:

1. **The base case.** The sum from 0 to 0 is 0. That is the simplest possible version of the problem and it needs no further work.
2. **The recursive step.** The sum from 0 to `x` is `x` plus the sum from 0 to `x - 1`. This is what makes `x` shrink on every call, until the base case catches it.

### It is deferred, not repeated

It looks like recursion just calls the same function over and over, and that is only half true. What is really happening is a chain of **deferred operations** — `recursiveSum(10)` cannot finish until `recursiveSum(9)` answers, and so on down. Those pending operations are not visible in your code or your output; they are held in memory until the base case lets the chain unwind.

Leave out the base case and the chain never ends. The calls pile up until the browser gives up, which is a **stack overflow**.

**What you'll learn from it:**
- Recursion solves a problem by calling itself on a smaller version.
- The base case is the input simple enough to answer directly — it ends the chain.
- The calls are deferred, waiting in memory, not simply repeated.
- No base case means a stack overflow. 1.5.34 causes one on purpose.

**Try it:**

```js live plain
function recursiveSum(x) {
  // Base case
  if (x === 0) {
    return 0;
  } else {
    // Recursive step
    return x + recursiveSum(x - 1);
  }
}

console.log(recursiveSum(10));
```

`55`. Ten calls were made and nine of them were waiting when the tenth answered.

The same job done with a loop would keep a running total in a variable you can see. Recursion buys **fewer moving parts in the code**, at the cost of some work moving into memory where you cannot see it. Neither is better; they are different places to put the complexity.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **recursion** | A function calling itself on a smaller version of the same problem |
| **base case** | The input simple enough to answer directly, ending the chain |
| **recursive step** | The part that calls itself with a smaller input |
| **stack overflow** | Too many pending calls piled up — what a missing base case causes |
| **iterative** | The loop-based alternative to a recursive solution |
