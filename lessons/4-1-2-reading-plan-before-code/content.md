## Plan Before You Code

**What you'll learn:**
- Why writing the steps first (as comments) saves debugging time later
- How to decompose a big task into small, concrete pieces
- How to turn plain-English steps into code one at a time
- What "pseudocode" means and how comments serve that role

Professional programmers rarely open a blank file and start typing. Instead they sketch the plan first, often as `//` comments, then fill code in underneath each comment. This keeps them from getting lost and makes bugs easier to spot.

**Try it:** Read the comments first, predict what the code will print, then run it and check.

```js live plain
// Step 1: Set up the numbers we need
var price = 12;
var quantity = 5;
var discountRate = 0.1;

// Step 2: Calculate the subtotal before any discount
var subtotal = price * quantity;
console.log("Subtotal: " + subtotal);

// Step 3: Calculate the discount amount
var discount = subtotal * discountRate;
console.log("Discount: " + discount);

// Step 4: Subtract the discount to get the final total
var total = subtotal - discount;
console.log("Total: " + total);
```

Notice how each comment names exactly one thing to do. If a step feels too big to fit on one comment line, break it into two smaller steps. That is the whole skill.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **pseudocode** | Plain-English description of what code will do, written before the real code |
| **comment (`//`)** | A line JavaScript ignores at runtime: used here as a planning step |
| **decompose** | Break a big problem into smaller, independent pieces |
| **step-by-step plan** | An ordered list of actions where each action is small enough to code in a few lines |
| **top-down design** | Start with the big goal, then keep splitting into smaller sub-tasks until each is trivial |
