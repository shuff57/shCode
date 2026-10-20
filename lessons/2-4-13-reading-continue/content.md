## Skipping a Round with continue

**What you'll learn:**
- What `continue` does, and how it's different from `break`
- That `continue` still lets the loop finish all its rounds
- Where `continue` jumps to when it fires

`break` leaves the loop. `continue` is gentler: it abandons only the **current round** and jumps straight to the next one.

```js live plain
for (let i = 1; i <= 6; i++) {
  if (i % 2 === 0) {
    continue;
  }
  console.log(i);
}
```

When `i` is even, `continue` skips the `console.log` and goes back to the top of the loop for the next value. The loop still runs all six rounds: it just does nothing useful in three of them.

```flow readonly caption="Figure 2.4.13: the for loop above. When i is even, continue skips the log and goes straight to the step that adds 1 to i. The loop still runs all six rounds."
flowchart TD
  A([Start]) --> B[i starts at 1]
  B --> C{i is 6 or less}
  C -- yes --> D{i is even}
  D -- yes --> G[add 1 to i]
  D -- no --> E[/log i/]
  E --> G
  G --> C
  C -- no --> H([End])
```

That's the whole difference from `break`: `break` stops the loop dead. `continue` says "not this one" and moves on to the next round like nothing happened.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **continue** | Ends the current round of a loop and jumps to the next one: the loop itself keeps running |
| **round** / **iteration** | One pass through a loop's body |
| **break vs continue** | `break` leaves the loop entirely; `continue` skips only the current round |
