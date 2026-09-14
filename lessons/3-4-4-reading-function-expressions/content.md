## Function Expressions

**What you'll learn:**
- What a function expression is and where it is written
- The two ways it is written differently from a declaration
- That the two behave identically when called
- Why the trailing semicolon matters

If a function is a value, you should be able to write one directly where a value goes — on the right-hand side of an `=`. You can. A function written in a value position is a **function expression**: the function itself is unnamed, and you reach it through the variable that holds it.

**Try it:** The right-hand side is a function with no name and a semicolon after the closing brace.

```js live plain
const greet = function () {
  return "Hello!";
};

console.log(greet());
```

Compare the two forms side by side. They do the same job.

```js live plain
// Function DECLARATION — a statement that names a function.
function addDeclared(a, b) {
  return a + b;
}

// Function EXPRESSION — a function value assigned to a variable.
const addExpressed = function (a, b) {
  return a + b;
};

console.log(addDeclared(2, 3));
console.log(addExpressed(2, 3));
```

Both print `5`. Two differences are purely in how they are written:

- The expression has **no name** after `function`. It does not need one — the variable is the name.
- The expression ends with a **semicolon**, because it is an assignment statement like any other. Forgetting it is usually harmless and still worth doing.

There is a third, real difference — *when* the function exists — but that belongs to a later reading. For now, notice the expression can only be called on or after its line.

**Try it:** The `try`/`catch` shows the error a call before the line produces. You will explain it later; for now just watch it fail cleanly.

```js live plain
try {
  console.log(later(2));
} catch (err) {
  console.log(err.name + ": " + err.message);
}

const later = function (n) {
  return n + 1;
};
```

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **function declaration** | The `function name() {}` statement form |
| **function expression** | A function written in a value position, usually assigned to a variable |
| **unnamed function** | A function expression needs no name after `function`; the variable names it |
| **trailing semicolon** | An expression is an assignment, so it ends with `;` |
| **value position** | Anywhere a value is expected — most often the right side of `=` |
