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

## Spacing, indentation, and semicolons

Consistent layout makes code easy to scan. The class style: **2 spaces** of indentation inside `{ }`, a **space around operators** (`x = 5`, not `x=5`), and a **semicolon** at the end of each statement.

**What you'll learn from it:**
- Indent the code inside `{ }` by 2 spaces so structure is visible.
- Put spaces around `=`, `+`, `>` and after commas.
- End each statement with a semicolon.
- Messy spacing still runs, but it is much harder for a human to read.

**Try it:**

```js live console
// Cramped and hard to read (but it still runs)
let age=17;if(age>=18){console.log("adult");}else{console.log("minor");}

// Clean: spaces, indentation, semicolons
let years = 17;
if (years >= 18) {
  console.log("adult");
} else {
  console.log("minor");
}
```

---

## Short glossary

| Term | Meaning |
|------|---------|
| **camelCase** | Naming style: start lowercase, capitalize each later word (`firstName`) |
| **descriptive name** | A name that tells the reader what the value means (`unitPrice`, not `p`) |
| **indentation** | Leading spaces that show which code is inside a block; the class uses 2 spaces |
| **semicolon** | The `;` that ends a JavaScript statement |
| **convention** | An agreed-upon habit the team follows, not a rule the language forces |
