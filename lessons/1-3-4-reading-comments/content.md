## Single-line comments: `//`

A single-line comment starts with `//`. Everything from `//` to the end of that line is ignored by JavaScript — the computer never sees it.

**What you'll learn from it:**
- `//` turns the rest of a line into a note for human readers.
- You can put a comment on its own line above the code it explains.
- You can put a comment at the end of a line of code.
- The computer runs the program exactly the same whether comments are there or not.

**Try it:**

```js live plain
// This line is a comment — the computer ignores it entirely.
let age = 17; // age in years

// Print a greeting
console.log("Hello! Age: " + age);
```

---

## Block comments: `/* */`

A block comment starts with `/*` and ends with `*/`. Everything in between is ignored, even if it spans many lines. Use block comments when your note is longer than one line.

**What you'll learn from it:**
- `/*` opens a block comment; `*/` closes it.
- Block comments can stretch across as many lines as you need.
- A common use is a header at the top of a file — author name, date, what the file does.
- Like `//`, block comments have zero effect on how the program runs.

**Try it:**

```js live plain
/*
  Program: Greeting
  Purpose: show a name and age in the console
*/

let name = "Jordan";
let score = 95;

console.log(name + " scored " + score);
/* The line above prints the result.
   Nothing else needs to happen here. */
```

---

## Short glossary

| Term | Meaning |
|------|---------|
| **comment** | Text in code that JavaScript ignores; a note for human readers |
| **`//`** | Opens a single-line comment; everything after it on that line is ignored |
| **`/* */`** | Wraps a block comment; everything between `/*` and `*/` is ignored |
| **block comment** | A comment that can span multiple lines |
| **inline comment** | A `//` comment placed on the same line as code, after the statement |
