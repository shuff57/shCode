## Nested Loops Get Expensive

**What you'll learn:**
- Why nested loops slow down faster than single loops
- How to estimate the total number of rounds before running anything
- What to check first when a nested loop feels slow

You already know the rule from the last reading: a nested loop's inner body runs **outer rounds × inner rounds** times, not outer + inner. That multiplication is also where the cost comes from.

Two nested loops over 1,000 items each is `1,000 × 1,000` — a million rounds. That's a noticeable pause, even for a computer. Three nested loops over 1,000 items each is `1,000 × 1,000 × 1,000` — a billion, and your program appears to hang.

```js live plain
let count = 0;

for (let i = 0; i < 100; i++) {
  for (let j = 0; j < 100; j++) {
    count++;
  }
}

console.log("Inner body ran " + count + " times.");
```

100 outer rounds times 100 inner rounds is 10,000 — small enough to run instantly. Change both `100`s to `10000` and the same shape runs 100 million times instead. Same code, same logic, wildly different cost — because the cost is a multiplication, and multiplication grows fast.

**When a nested loop feels slow, count the multiplication before you look anywhere else.** It's usually not a bug — it's the size of the two ranges multiplying together exactly as it should.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **total rounds** | The number of times a nested loop's inner body runs: outer count × inner count |
| **cost** | How much work a piece of code does — for nested loops, it grows by multiplication, not addition |
