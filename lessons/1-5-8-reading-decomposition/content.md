## One hard task becomes a set of easy ones

**Decomposition** means solving a complex problem by breaking it into smaller, more manageable tasks. You consider each component the hard task needs, until the hard task has been **redefined as a set of easy ones**.

> **Definition 1.5.2: Decomposition.** The analytical process of breaking a complex problem or system into smaller, self-contained parts that can be understood and solved on their own.

The phrase carrying the weight is **self-contained**. A part you can only understand by also holding three other parts in your head has not been decomposed: it has been chopped. The test is whether you could hand one part to someone else, with no further explanation, and get it back working.

In the jam sandwich example, decomposition means identifying every ingredient required and every step the robot must take to end up with a sandwich. Not "make the sandwich" broken into "start making it" and "finish making it": those are not solvable on their own. "Open the jar" is.

**What you'll learn from it:**
- Decomposition breaks a complex problem into smaller parts.
- The parts must be *self-contained*: solvable on their own.
- The test: could you hand one part to someone else with no further explanation?
- The goal is to turn one hard task into several easy ones.

**Try it:**

"Print a receipt" is one task until you take it apart. Each comment below is a part small enough to be obviously right or obviously wrong on its own.

```js live plain
// part 1: know what was bought and how much it costs
let itemName = "Notebook";
let unitPrice = 3.50;
let quantity = 4;

// part 2: work out the cost before tax
let subtotal = unitPrice * quantity;

// part 3: work out the tax
const TAX_RATE = 0.0725;
let tax = subtotal * TAX_RATE;

// part 4: report it
console.log(quantity + " x " + itemName);
console.log("subtotal " + subtotal.toFixed(2));
console.log("tax      " + tax.toFixed(2));
console.log("total    " + (subtotal + tax).toFixed(2));
```

Four parts. Any one of them can be checked without reading the others: part 2 is right if `3.50 × 4` is `14`, and you do not need to know anything about tax to say so.

That is what decomposition buys: instead of one question you cannot answer ("is this receipt program correct?"), you have four you can.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **decomposition** | Breaking a complex problem into smaller, self-contained parts |
| **self-contained** | Understandable and solvable without the other parts |
| **subproblem** | One of the smaller problems a decomposition produces |
| **manageable** | Small enough that you can tell whether it is right |
