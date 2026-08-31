## Choosing a Loop: for vs while

**What you'll learn:**
- `for` and `while` can write the exact same loop
- The one question that tells you which to reach for
- Why forcing the wrong loop onto a problem makes the code worse, not just different

Section 2.2 taught you both `for` and `while`. They are genuinely interchangeable: here is the same count, twice:

```js live plain
for (let i = 1; i <= 3; i++) {
  console.log("for: " + i);
}

let j = 1;
while (j <= 3) {
  console.log("while: " + j);
  j++;
}
```

Both print the same three lines. The difference is not what they can do: it's what they *say*. A `for` loop gathers the start, the condition, and the update onto one line, so a reader sees all three at once. That's exactly right when you know the count in advance: "do this five times," "count from 1 to 20."

A `while` loop puts nothing on that line but the condition. That's right when you do **not** know the count ahead of time: when the loop runs until something becomes true, and how long that takes depends on the work itself:

```js live plain
let balance = 100;
let years = 0;

while (balance < 200) {
  balance = balance * 1.1;
  years++;
}

console.log("Doubled after " + years + " years.");
```

Nobody writing that loop knew the answer was 8 years before running it. That's the point: the condition decides when to stop, not a counter someone picked in advance.

These two kinds of loop have names. A loop whose repeat count is settled before it runs is **definite**; one that runs until a condition says stop is **indefinite**. The words are worth knowing because they describe the problem, not the keyword: the same task is definite or indefinite before you have chosen `for` or `while` at all.

**The test:** if you can say the number of repetitions out loud *before* running the program, reach for `for`. If the honest answer is "however many it takes," reach for `while`. Using `for` for the second case forces you to invent a counter you don't need. Using `while` for the first scatters the loop's three parts across three separate lines: which is exactly where a forgotten update comes from.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **definite loop** (known-count) | A loop whose number of repetitions is settled before it starts: reach for `for` |
| **indefinite loop** (unknown-count) | A loop that runs until a condition becomes true, with no fixed repeat count: reach for `while` |
| **interchangeable** | `for` and `while` can express the same repetition; they differ in readability, not power |
