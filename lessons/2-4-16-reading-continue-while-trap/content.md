## The continue Trap in a while Loop

**What you'll learn:**
- Why `continue` is safe in a `for` loop but risky in a `while` loop
- Where the update has to live in a `while` loop for `continue` to be safe
- How to spot this bug before you run it

`continue` in a `for` loop is always safe. The update — `i++` — lives in the loop header, so `continue` still runs it on the way back around:

```js live plain
for (let i = 1; i <= 6; i++) {
  if (i % 2 === 0) {
    continue;
  }
  console.log(i);
}
```

`continue` in a `while` loop is where this gets dangerous. The update is just a line inside the body — and `continue` jumps straight past any line written *after* it:

```js
// BROKEN — do not run this. It never stops.
let i = 0;
while (i < 5) {
  if (i % 2 === 0) {
    continue;      // jumps back up without ever reaching i++
  }
  console.log(i);
  i++;
}
```

When `i` is `0`, the condition is true, `continue` fires, and `i` is still `0`. Nothing changed, so the next round does exactly the same thing — forever.

**The fix is where you put the update, not whether you have one.** Move it *before* anything that could `continue` past it:

```js live plain
let i = 0;

while (i < 5) {
  i++;
  if (i % 2 === 0) {
    continue;
  }
  console.log(i);
}
```

If you ever use `continue` inside a `while` loop, check that the update happens **before** it, not after.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **update** | The line that moves a loop's condition variable toward becoming false |
| **continue trap** | A `continue` in a `while` loop that jumps past the update, freezing the loop |
| **for's built-in safety** | A `for` loop's update lives in the header, so `continue` can never skip it there |
