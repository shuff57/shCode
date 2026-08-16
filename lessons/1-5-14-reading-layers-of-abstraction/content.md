## Each layer minds its own job

Real systems stack abstractions on top of each other, so that each layer only has to worry about its own work. Data is represented at different levels to keep the user's side simple while complicated operations happen out of sight.

Think about asking a generative AI tool for help:

| Layer | What it deals with | What it does not |
|---|---|---|
| **Interface** | Your typed prompt, the reply on screen | How any of it is processed |
| **Application logic** | Validating the prompt, routing it | How the model computes a response |
| **Back end** | Processing the prompt, generating a response | How the interface is drawn |

Each layer serves a separate role, and that separation is what makes the whole thing efficient for you *and* for the system. Nobody has to hold all three at once.

You already trust abstraction constantly. You drive a car without knowing how the engine mixes fuel. You send a message without knowing how it is routed. Abstraction is not a programming trick — **it is the only reason any complicated system is usable at all.**

The programming version of this is the whole reason §1.4.5 mattered: high-level languages hide the memory addresses, and you write `5 + 3` instead of moving bytes. You are standing on a layer somebody else built.

**What you'll learn from it:**
- Systems stack abstractions so each layer handles only its own job.
- You do not need to understand a lower layer to use the one above it.
- The separation is what makes complicated systems usable.
- A high-level language is itself a layer of abstraction over the hardware.

**Try it:**

Three layers, visible at once. Each line uses the one below without knowing how it works.

```js live plain
// Bottom layer: the machine adds numbers. You never see this happen.
let prices = [4.50, 2.25, 9.99];

// Middle layer: a language feature that walks a list and totals it.
let total = 0;
for (let i = 0; i < prices.length; i = i + 1) {
  total = total + prices[i];
}

// Top layer: what the person actually asked for.
console.log("Your basket comes to $" + total.toFixed(2));
```

`.toFixed(2)` is a small abstraction all by itself. It turns `16.740000000000002` into `16.74`, and you do not need to know why that first number has a tail on it — only that money wants two decimal places.

Which is exactly the deal: the layer below has a complication, and the layer above gives you a way not to care about it.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **layer of abstraction** | A level that hides the one below it and offers a simpler view |
| **interface** | The layer a user actually touches |
| **back end** | The layer doing the work out of sight |
| **separation of concerns** | Each layer handling only its own job |
