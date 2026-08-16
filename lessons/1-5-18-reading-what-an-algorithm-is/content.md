## Three words, all load-bearing

> **Definition 1.5.4 — Algorithm.** A **finite**, **ordered** sequence of **unambiguous** instructions that solves a problem or completes a task.

Every one of those three words rules something out.

| Word | Rules out | What it looks like when broken |
|---|---|---|
| **finite** | Something that never ends | A loop with no way to stop |
| **ordered** | Steps in no particular sequence | Spreading jam before opening the jar |
| **unambiguous** | A step open to interpretation | "Season to taste" — the robot has no taste |

An algorithm is not a program. It is a *plan*, and it exists before any code does. The same plan can be written several different ways, in several different languages, or in no language at all — and it is right or wrong on its own terms, before anything runs.

Algorithms are most commonly written as either **pseudocode** or a **flowchart**. Pseudocode outlines the logic in a mixture of ordinary language and programming ideas, in a clearly ordered written structure. A flowchart shows the flow and direction of decisions visually, as a diagram. Either is fine; it comes down to preference and to what you are trying to see.

**What you'll learn from it:**
- An algorithm is finite, ordered and unambiguous — all three matter.
- It is a plan, not a program; it exists before any code.
- The same algorithm can be expressed many ways.
- The two usual ways of writing one down: pseudocode and a flowchart.

**Try it:**

The same algorithm — "add up the numbers from 1 to 5" — written twice.

```js live plain
// As a plan, in words:
//   1. set total to 0
//   2. set i to 1
//   3. while i is 5 or less: add i to total, then add 1 to i
//   4. print total

// As JavaScript:
let total = 0;
for (let i = 1; i <= 5; i = i + 1) {
  total = total + i;
}
console.log(total);
```

Check the plan against the definition before you check the code. Is it **finite**? Yes — `i` grows every pass, so the condition eventually fails. Is it **ordered**? Yes — swapping steps 1 and 3 breaks it. Is it **unambiguous**? Yes — nothing there needs interpreting.

A plan that passes those three tests will survive being turned into any language. A plan that fails one of them will produce a broken program in every language equally.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **algorithm** | A finite, ordered sequence of unambiguous instructions that solves a problem |
| **finite** | It ends |
| **unambiguous** | No step is open to interpretation |
| **pseudocode** | An algorithm written in plain language, laid out like code |
| **flowchart** | An algorithm drawn as a diagram of shapes and arrows |
