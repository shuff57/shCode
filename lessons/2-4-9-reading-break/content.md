## Leaving Early with break

**What you'll learn:**
- What `break` actually does to a loop
- That `break` means something different here than it did in a switch
- Why `break` never waits for the loop's own condition to catch up

You met `break` in section 2.3, inside a `switch`. There, `break` meant "stop checking cases: I found my match." Inside a **loop**, `break` means something related but not identical: **leave this loop entirely, right now**, and continue with whatever comes after it.

```js live plain
for (let i = 1; i <= 10; i++) {
  if (i === 4) {
    console.log("Stopping at " + i);
    break;
  }
  console.log(i);
}

console.log("After the loop.");
```

The loop was written to count to 10. It got to 4 and stopped. The condition `i <= 10` never became false: `break` didn't wait for it.

**In a switch, `break` ends the `switch` block.** In a loop, `break` ends the **loop**. Same keyword, same idea of "stop right here," but a different "here" depending on what it's sitting inside. If you're inside a loop that's inside a `switch` case, `break` ends the innermost one: the loop, not the switch.

`break` also makes a certain kind of loop possible: one with **no stopping condition of its own**, where the only way out is the `break`.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **break** | Immediately ends the loop (or switch) it is directly inside |
| **leave a loop** | What `break` does inside a `for`/`while`/`do...while`: different from the switch meaning |
| **early exit** | Ending a loop before its own condition would have stopped it |
