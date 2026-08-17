## Infinite Loops: Three Causes

**What you'll learn:**
- What an infinite loop actually does to a running program
- The three usual reasons a beginner's loop never stops
- Why not every never-ending loop is a mistake

An **infinite loop** is a loop whose condition never becomes false. The program doesn't crash and doesn't print an error — it simply never finishes. In a browser tab, the page stops responding.

Almost every infinite loop a beginner writes comes from one of three causes:

**1. The update is missing.** The counter never changes, so the condition stays true forever.

```js
// BROKEN: i is always 1
let i = 1;
while (i <= 5) {
  console.log(i);
}
```

**2. The update moves the wrong way.** The counter changes, but away from the condition instead of toward it.

```js
// BROKEN: i only gets further from 5
for (let i = 1; i <= 5; i--) {
  console.log(i);
}
```

**3. A `continue` skips the update.** The `while` trap from the last two lessons — the update sits below a `continue` that jumps past it.

Each of these is a live loop with no output you can read. The only fix is to inspect the three parts — start, condition, update — and ask whether the update actually moves the loop toward making the condition false.

**Not every infinite loop is a bug.** `while (true)` with a `break` is one on purpose — you wrote it that way in lesson 2.4.10. The bug isn't "this loop runs forever," it's "this loop runs forever *and I didn't mean it to.*"

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **infinite loop** | A loop whose condition never becomes false, so it never finishes |
| **missing update** | Cause #1 — nothing inside the loop changes the condition variable |
| **wrong-direction update** | Cause #2 — the update moves away from, not toward, making the condition false |
| **skipped update** | Cause #3 — a `continue` in a `while` loop jumps past the update line |
