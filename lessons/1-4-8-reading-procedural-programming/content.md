## Procedural: steps in order, data held separately

**Procedural programming** treats a program as a sequence of instructions carried out in order, grouped into reusable procedures. It is the style you have already been writing: every line of §1.2 and §1.3 was procedural, nobody just said so.

The defining feature is that **data and instructions are separate things**. The variables hold the values. The statements do the work. Nothing owns anything.

That matters because it is the exact thing the next two paradigms change. Object-oriented code bundles them together (1.4.15). Functional code is careful about which instructions are allowed to change data at all (1.4.18).

The word **procedure** is what most languages call a named, reusable group of steps. JavaScript calls it a *function*, and you meet those properly in Chapter 3, so for now, "procedural" mostly means the first half: steps, in order.

**What you'll learn from it:**
- Procedural code is a sequence of instructions carried out in order.
- Data sits in variables; the statements reach in from outside to use it.
- Data and instructions being *separate* is the feature that defines the style.
- A procedure is a named, reusable group of steps: JavaScript calls it a function.

**Try it:**

Four steps, top to bottom, each acting on data held in variables.

```js live plain
let price = 20;
let quantity = 3;
let total = price * quantity;

console.log("Total: " + total);
```

Point at any line and ask: is this *data*, or is this *work*? The first two lines are data. The third is work that produces more data. The fourth is work. In procedural style you can always tell them apart, because they never share a home.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **procedural programming** | Organising a program as a sequence of instructions acting on separately held data |
| **procedure** | A named, reusable group of steps: JavaScript calls it a function |
| **statement** | One instruction the computer carries out |
| **sequence** | Statements running one after another, top to bottom |
