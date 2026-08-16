## Functions in the mathematical sense

**Functional programming** organises a program around functions in the mathematical sense: give one the same input and it always returns the same output, and it changes nothing else along the way.

Both halves matter.

- **Same input, same output.** No hidden mood. Called twice with `5`, it answers the same thing twice.
- **Changes nothing else.** It does not quietly edit a list somewhere, or a total somebody else was relying on.

Its distinctive habit follows from the second half: functional code avoids *change*. Rather than modifying a list, a functional program produces a new list and leaves the original alone.

That is the direct opposite of the procedural habit from 1.4.8, where a program is a sequence of deliberate changes. Neither is wrong. They are answers to different worries.

The payoff is that a function depending on nothing but its inputs can be understood **on its own** — you never have to ask what else might have happened first. That is also why such functions are easy to test: there is no "first, set everything up" step.

You meet this style properly in Chapter 3, where you write functions that take values in and hand results back, and §3.7 does exactly the "new list instead of a changed one" move.

**What you'll learn from it:**
- A functional-style function returns the same output for the same input, every time.
- It changes nothing outside itself.
- Rather than modify a list, it produces a new one and leaves the original alone.
- That makes it understandable and testable on its own — Chapter 3 and §3.7.

**Try it:**

`.filter` produces a new list of the items that pass a test. Watch what happens to the original.

```js live plain
let temps = [58, 72, 91, 64, 88, 45];

let hot = temps.filter(function (t) { return t > 70; });

console.log("hot days: ", hot);
console.log("original: ", temps);   // all six — untouched
```

The last line is the point. `temps` still holds all six numbers. Nothing was changed in place; a second list was produced alongside the first. Compare that to 1.4.8, where one variable was changed four times on purpose.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **functional programming** | Organising a program around functions that always give the same output for the same input and change nothing else |
| **pure function** | One that depends only on its inputs and changes nothing outside itself |
| **mutation** | Changing a value in place — what functional style avoids |
| **`.filter()`** | Returns a *new* array of the items that pass a test — §3.7 |
| **side effect** | A change a function makes to something other than its return value |
