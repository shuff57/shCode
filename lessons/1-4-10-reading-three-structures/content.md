## The three, one at a time

| Structure | What it does | Everyday version | Taught in |
|---|---|---|---|
| **Sequence** | Do this, then this, then this | Following a recipe in order | §1.2: you already have it |
| **Selection** | Choose between paths depending on a condition | "If it's raining, take the bus" | §2.1 (`if`) and §2.3 (`switch`) |
| **Repetition** | Do something more than once | "Keep stirring until it thickens" | §2.2 (loops) |

Two names to expect. Repetition is what the book calls it; when you meet it in Chapter 2 the code word is **loop**, and some books say **iteration**. Same structure, three names. Selection in code is `if`, `else` and `switch`.

Most real programs use all three, nested inside each other: a loop that contains a choice that contains a sequence. That nesting is where programs get their apparent complexity, but there is still nothing in there except these three.

**What you'll learn from it:**
- Sequence runs statements in order; you have been using it all along.
- Selection picks a path based on a condition: `if` / `switch`, Chapter 2.
- Repetition does something more than once: loops, Chapter 2.
- Repetition, loop and iteration all name the same structure.

**Try it:**

All three, in one short program. Change `score` to `45` and run again, only the selection branch changes, and the shape of the program does not.

```js live plain
let score = 88;                       // sequence

if (score >= 60) {                    // selection
  console.log("pass");
} else {
  console.log("retake");
}

for (let i = 1; i <= 3; i = i + 1) {  // repetition
  console.log("star " + i);
}
```

You are not expected to write `if` or `for` yet: Chapter 2 does that properly. Read them here as shapes, and notice you can point at any line and say which of the three it belongs to.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **sequence** | Statements carried out one after another, in order |
| **selection** | Choosing a path depending on a condition (`if`, `switch`) |
| **repetition** | Doing something more than once (loops) |
| **iteration** | Another name for repetition: you will see both |
| **nesting** | Putting one structure inside another: a choice inside a loop |
