## Fall-through

**What you'll learn from it:**
- What happens when a matched `case` has no `break`
- Why fall-through doesn't crash your program — it just runs too much of it
- How to spot a missing-`break` bug from its symptom

The `break` statement is not decoration. Without it, JavaScript does something surprising: once a `case` matches, execution keeps going *through* the cases below it, running their code too, without checking any of their values. That's **fall-through**: execution continuing from a matched case into the following cases because no `break` stopped it.

Here's the vending machine from the last reading with every `break` removed:

```js live plain
let selection = "A";

switch (selection) {
  case "A":
    console.log("Dispensing: chips");
  case "B":
    console.log("Dispensing: pretzels");
  case "C":
    console.log("Dispensing: cookies");
  default:
    console.log("Unknown selection. Refunding your money.");
}
```

One customer, one dollar, three snacks and a refund. `case "A"` matched, and from there JavaScript ran every remaining line in the block — including `default`, which never even got asked whether it should.

**Try it:** Run it, then add `break;` after each `console.log` one at a time and watch the output shrink.

The broken version didn't crash and didn't warn you. It ran, printed four lines, and looked like it worked. A missing `break` is a *logic* bug — the tell is always the same: you see output from cases you didn't expect. When a `switch` prints too much, look for the missing `break` **above** the surprising line, not at the surprising line itself.

## The last case is usually safe without one

Many programmers omit `break` on the *final* case in a `switch` — and it's usually harmless, because there's nothing below it to fall into. The block ends there anyway.

**Try it:** Notice `case 3` below has no `break`. Nothing changes, because it's the last case.

```js live plain
let level = 3;

switch (level) {
  case 1:
    console.log("Beginner");
    break;
  case 2:
    console.log("Intermediate");
    break;
  case 3:
    console.log("Advanced");
}
```

Even so, many programmers write the final `break` anyway, as a habit — so that adding a new case later can't silently create a fall-through bug you didn't mean to write.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **Fall-through** | Execution continuing from a matched case into the cases below it because no `break` stopped it |
| **`break`** | Ends the `switch` immediately, preventing fall-through into the next case |
| **Missing-break bug** | A logic bug with no error message — the symptom is extra output from cases that shouldn't have run |
