## Why documentation matters

**Read after `1.3.4` (Comments), before you start naming things in `1.3.6`.**

Documentation means the comments inside the code, plus notes like a README that explain what the
code does and how to use it. Code says *what the computer will do*. Documentation says *what the
author was trying to do* — and those are not the same thing.

What you'll learn from it:

- Code records the decision; documentation records the **reason** for it.
- The reader you are writing for is usually a teammate, or yourself in six months.
- Undocumented code is not faster to write. It is faster to write **once**, and slower every time after.

## The six-months-later problem

Here is the case that convinces most people, because it happens to everyone eventually.

You write a program. It works. Three lines in the middle look strange, but you had a good reason —
you remember it clearly. You come back six months later. The code is unchanged. The reason is gone.
You are now a stranger reading your own work, and you cannot tell whether those three lines are
load-bearing or leftovers. Delete them and something breaks in a way you will not notice for a week.

One comment saying *why* those lines exist would have cost fifteen seconds.

**Try it:** run this, then ask which version you could safely change six months from now.

```js live plain
let price = 20;
let shipping = 7;

// Free shipping over 50 - the store owner asked for this, do not remove
let total = price > 50 ? price : price + shipping;

console.log("Total: " + total);
```

Without that comment the line still runs correctly, and the next person to read it cannot tell
whether the rule is deliberate or a bug.

## What documentation is not

It is not a retelling of the code. `let total = price * quantity;` does not need a comment saying
"multiplies price by quantity" — the line already says that, and now there are two things to keep in
step instead of one. Comment the **reason**, the constraint, the thing a reader could not work out
from the code alone.

---

## Short glossary (quick reference)

| Term | Meaning |
|---|---|
| documentation | Comments in the code plus outside notes explaining what it does and how to use it |
| README | A file at the top of a project explaining what it is and how to run it |
