## Declaration or Expression?

**What you'll learn:**
- That a function declaration is hoisted and can be called before its line
- That a function expression or arrow is not hoisted
- What a `ReferenceError` before the line means
- A workable rule for choosing between them

One real difference remains between the forms, and it is about *when* the function exists.

A function **declaration** can be called before the line that defines it.

**Try it:** The call sits above the function; it still works, printing `3`.

```js live plain
console.log(declared(2));

function declared(n) {
  return n + 1;
}
```

JavaScript reads the whole file before running it and prepares every function declaration in advance. This is called **hoisting**.

A function **expression** — including an arrow — gets no such treatment.

**Try it:** The same call, above the line, but now the function is an expression. It fails.

```js live plain
try {
  console.log(expressed(2));
} catch (err) {
  console.log(err.name + ": " + err.message);
}

const expressed = (n) => n + 1;
```

It prints `ReferenceError: Cannot access 'expressed' before initialization`. The variable is not filled in until execution reaches that line, so the call above it has nothing to call. This is the same rule that governs any `const` — the function part changes nothing.

### Which should you use?

Both are correct, and real code mixes them. A workable habit:

- **Declaration** for the main, named operations of a program — the ones called from several places, where being callable from anywhere in the file is convenient.
- **Arrow function** for short helpers and for anything passed as a callback, where its brevity pays for itself.

**Try it:** A program using both, each where it fits best.

```js live plain
// The main operation: a declaration, called from several places.
function area(w, h) {
  return w * h;
}

// A helper that takes a callback.
function mapList(values, fn) {
  const out = [];
  for (let i = 0; i < values.length; i++) {
    out.push(fn(values[i]));
  }
  return out;
}

// The callback is an arrow: short, used once.
const areas = mapList([2, 4, 6], (side) => area(side, side));

console.log(areas);
```

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **hoisting** | Preparing function declarations before any code runs |
| **declaration** | Hoisted: callable from above its definition |
| **expression / arrow** | Not hoisted: its variable is empty until that line runs |
| **`ReferenceError`** | The error a call before an expression's line produces |
| **when to choose** | Declaration for main operations; arrow for short helpers and callbacks |
