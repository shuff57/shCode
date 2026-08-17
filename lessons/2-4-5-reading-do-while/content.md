## The do...while Loop

**What you'll learn:**
- Why `while` can skip its body entirely
- How `do...while` guarantees the body runs at least once
- The one punctuation detail `do...while` needs that no other loop does

Both loops you've met so far — `for` and `while` — test their condition **before** running the body. If the condition is false at the start, the body never runs at all:

```js live plain
let count = 10;

while (count < 5) {
  console.log("This never prints.");
  count++;
}

console.log("Done. count is still " + count);
```

Sometimes that's wrong. If you're asking a user for input, checking a password, or rolling a die, the body has to run once before there's anything to test. A `do...while` loop puts the condition at the **bottom** instead:

```js live plain
let attempts = 0;

do {
  attempts++;
  console.log("Attempt " + attempts);
} while (attempts < 3);
```

Because the check comes last, the body always runs **at least once** — even if the condition would have been false from the very start.

Note the semicolon after the closing `while (...)`. A `do...while` is the one loop that ends with one; leaving it off is a common slip.

**When to reach for it:** `do...while` is the least-used of the three loops, and that's fine — most of the time you genuinely want the test first. Reach for it when the thing you're testing doesn't exist yet until the body has run once: a value the user hasn't typed, a die that hasn't been rolled, a menu choice that hasn't been made.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **do...while loop** | Runs its body first, then tests the condition — body always runs at least once |
| **body-first / test-first** | Whether a loop checks its condition before or after running its body once |
| **guaranteed first run** | The property that makes `do...while` different — no other loop promises this |
