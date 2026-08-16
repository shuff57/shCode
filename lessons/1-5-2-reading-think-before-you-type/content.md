## Two difficulties, and typing only solves one

There is a strong temptation, given a programming problem, to start typing immediately. It feels productive. It is usually the slow way.

The reason is that a program has **two separate difficulties**:

1. **Working out what the steps are.** This is thinking. The language you use is irrelevant to it.
2. **Writing those steps in JavaScript.** This is syntax, and it is much easier once step 1 is settled.

Do both at once and every time you get confused you cannot tell which difficulty you are stuck on — the plan or the punctuation. You will spend twenty minutes hunting a missing bracket in a program whose logic was never going to work.

Separating them is what this whole module is about. Most of the tools in it are for step 1, and **none of those are JavaScript.**

The name for the thinking half is **computational thinking**, and it gets its own lesson next.

**What you'll learn from it:**
- A program has two difficulties: working out the steps, and writing them.
- The first one has nothing to do with any programming language.
- Doing both at once hides which one you are stuck on.
- Most of §1.5's tools address the first difficulty.

**Try it:**

Below is a program with a *syntax* problem and a program with a *plan* problem. Run it and notice that only one of them complains.

```js live plain
// Plan problem: this runs perfectly and is wrong.
// It is supposed to print the average of the three scores.
let a = 6;
let b = 9;
let c = 3;
let average = a + b + c / 3;

console.log("average is " + average);
```

`16` — not `6`. Nothing errored, nothing was flagged, and the answer is wrong because the plan (and the precedence) was never checked. No amount of care with semicolons would have caught it.

A syntax problem announces itself. A plan problem does not, and that asymmetry is the whole argument for planning first.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **plan** | What the steps are and what order they go in — settled before any code |
| **syntax** | The punctuation and spelling rules of a particular language |
| **computational thinking** | The name for the thinking half; see 1.5.3 |
| **silent failure** | A program that runs happily and produces the wrong answer |
