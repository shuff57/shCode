## Written for someone who has not read your code

Good names and comments help a reader who is already **inside** your code. A **README** is for the person standing outside it, deciding whether to go in at all.

That is why it is a separate file, and why it is written in plain English rather than in code. Its name is shouted in capitals for a reason: it is the file you are meant to read first.

A README answers three questions, in this order:

1. **What is this?** One sentence. What the program does, in words a non-programmer would follow.
2. **How do I run it?** What to open, what to click, what to type.
3. **What should I know before I change it?** Anything surprising: a value you must set, a file that depends on another, a known limitation.

For a ten-line class assignment, three sentences covers all three. For a real project it grows, but the order does not change.

The class style guide requires a README on any multi-project submission, and the first line is the one people actually read. Spend your effort there.

**What you'll learn from it:**
- A README is for someone who has not read the code yet.
- It answers three questions: what is this, how do I run it, what should I know.
- It is written in plain English, not in code.
- Three sentences is a complete README for a small assignment.

**Try it:**

Here is a small program. Read it, then read the three-sentence README under it and notice what the README tells you that the code cannot. (Two things you have not been taught yet, so you are only reading them, not writing them: `TAX_RATE` is in UPPER_SNAKE_CASE because it is set once and never changes: the constant style from `1.3.2`, and `.toFixed(2)` rounds a number to two decimal places, so this program's `64.317825` prints as `64.32` and the total reads like money.)

```js live plain
const TAX_RATE = 0.0725;

let itemPrice = 19.99;
let itemCount = 3;

let subtotal = itemPrice * itemCount;
let total = subtotal + subtotal * TAX_RATE;

console.log(`Subtotal: $${subtotal.toFixed(2)}`);
console.log(`Total with tax: $${total.toFixed(2)}`);
```

> **Receipt Calculator.** This program works out the total price of an order including sales tax. Open `index.html` and the two totals print to the console. The tax rate is set once at the top as `TAX_RATE`: change that line if your county's rate is different.

The code could not have told you that last part. It shows `0.0725` and says nothing about *why you might want to change it*, or that it is the one line a new person is likely to need. That is what a README is for.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **README** | A plain-English file explaining what a project is and how to run it |
| **Markdown** | The simple formatting used in `.md` files: `#` for headings, `-` for lists |
| **plain English** | Language a reader who does not know your code can follow |
| **known limitation** | Something the program does not handle, said out loud rather than discovered |
