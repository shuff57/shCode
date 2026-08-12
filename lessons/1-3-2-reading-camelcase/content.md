## camelCase names that say what they hold

A variable name should tell a reader what the value means. The JavaScript habit is **camelCase**: start lowercase, and capitalize each new word — `firstName`, `totalPrice`, `isOnSale`. A good name like `unitPrice` is worth more than a comment explaining what `p` means.

**What you'll learn from it:**
- camelCase starts lowercase and capitalizes each later word.
- Descriptive names (`unitPrice`) beat short mystery names (`p`).
- The computer runs both versions the same — names are for humans.
- A clear name often removes the need for a comment.

**Try it:**

```js live console
// Mystery names — what does this even calculate?
let p = 29.99;
let q = 3;
let t = p * q;
console.log(t);

// Same math, readable names
let unitPrice = 29.99;
let quantity = 3;
let subtotal = unitPrice * quantity;
console.log("Subtotal: $" + subtotal);
```

---

## Short glossary

| Term | Meaning |
|------|---------|
| **camelCase** | Naming style: start lowercase, capitalize each later word (`firstName`) |
| **descriptive name** | A name that tells the reader what the value means (`unitPrice`, not `p`) |
