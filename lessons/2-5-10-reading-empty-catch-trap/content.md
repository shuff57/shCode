## The Empty catch Trap

**What you'll learn:**
- An empty `catch (err) { }` does not fix the problem: it just hides that anything went wrong
- A silent failure is harder to find than a loud crash, because nothing tells you to go looking
- The fix, minimum: report what happened, even if you can't do anything else about it

Compare these two programs. Both "handle" the same error.

```js live plain
// Says nothing:
try {
  console.log("Total price: $" + itemPrice);
} catch (err) {
  // does nothing
}
console.log("Order placed.");
```

```js live plain
// Reports what happened:
try {
  console.log("Total price: $" + itemPrice);
} catch (err) {
  console.log("Could not calculate the price: order not placed.");
}
console.log("Order placed.");
```

Run both. The first one prints `"Order placed."` with **no warning that the price was never calculated.** As far as anyone watching the output can tell, everything worked. The second program tells the truth: something failed, and here's what.

An empty `catch` block converts a loud, obvious crash into a program that silently produces the wrong answer, and a wrong answer with no error message is the hardest kind of bug to find, because nothing points you toward it.

**If you catch an error, do one of these at minimum:**
- Fix the situation and continue correctly
- Use a sensible default value
- Say what happened, even just with a `console.log`

Silence is never on that list.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **empty catch** | A `catch` block with no code inside it: swallows the error with no trace |
| **silent failure** | A bug that produces a wrong result with no error message pointing to it |
