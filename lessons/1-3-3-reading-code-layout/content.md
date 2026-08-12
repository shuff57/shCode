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
| **indentation** | Leading spaces that show which code is inside a block; the class uses 2 spaces |
| **semicolon** | The `;` that ends a JavaScript statement |
| **convention** | An agreed-upon habit the team follows, not a rule the language forces |
